/**
 * Supabase 依赖安装脚本
 * 自动安装 Supabase 相关依赖
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SupabaseInstaller {
  constructor() {
    this.backendPath = path.join(__dirname, 'backend');
    this.frontendPath = path.join(__dirname, 'frontend');
  }

  /**
   * 检查 Node.js 和 npm 版本
   */
  checkPrerequisites() {
    console.log('🔍 检查系统环境...');
    
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      
      console.log(`✅ Node.js 版本: ${nodeVersion}`);
      console.log(`✅ npm 版本: ${npmVersion}`);
      
      // 检查 Node.js 版本（需要 >= 16）
      const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
      if (majorVersion < 16) {
        console.warn('⚠️  建议使用 Node.js 16 或更高版本');
      }
      
      return true;
    } catch (error) {
      console.error('❌ 系统环境检查失败:', error.message);
      return false;
    }
  }

  /**
   * 安装后端依赖
   */
  installBackendDependencies() {
    console.log('\n📦 安装后端 Supabase 依赖...');
    
    const dependencies = [
      '@supabase/supabase-js@^2.39.0',  // Supabase JavaScript 客户端
      'pg@^8.11.0',                     // PostgreSQL 客户端
      'dotenv@^16.3.0'                  // 环境变量管理
    ];
    
    try {
      process.chdir(this.backendPath);
      
      console.log('正在安装依赖包...');
      const installCommand = `npm install ${dependencies.join(' ')}`;
      console.log(`执行命令: ${installCommand}`);
      
      execSync(installCommand, { 
        stdio: 'inherit',
        cwd: this.backendPath
      });
      
      console.log('✅ 后端依赖安装完成');
      return true;
    } catch (error) {
      console.error('❌ 后端依赖安装失败:', error.message);
      return false;
    } finally {
      process.chdir(__dirname);
    }
  }

  /**
   * 安装前端依赖
   */
  installFrontendDependencies() {
    console.log('\n📦 安装前端 Supabase 依赖...');
    
    const dependencies = [
      '@supabase/supabase-js@^2.39.0'   // Supabase JavaScript 客户端
    ];
    
    try {
      if (!fs.existsSync(this.frontendPath)) {
        console.log('⚠️  前端目录不存在，跳过前端依赖安装');
        return true;
      }
      
      process.chdir(this.frontendPath);
      
      console.log('正在安装依赖包...');
      const installCommand = `npm install ${dependencies.join(' ')}`;
      console.log(`执行命令: ${installCommand}`);
      
      execSync(installCommand, { 
        stdio: 'inherit',
        cwd: this.frontendPath
      });
      
      console.log('✅ 前端依赖安装完成');
      return true;
    } catch (error) {
      console.error('❌ 前端依赖安装失败:', error.message);
      return false;
    } finally {
      process.chdir(__dirname);
    }
  }

  /**
   * 更新 package.json 脚本
   */
  updatePackageScripts() {
    console.log('\n📝 更新 package.json 脚本...');
    
    try {
      // 更新后端 package.json
      const backendPackagePath = path.join(this.backendPath, 'package.json');
      if (fs.existsSync(backendPackagePath)) {
        const backendPackage = JSON.parse(fs.readFileSync(backendPackagePath, 'utf8'));
        
        if (!backendPackage.scripts) {
          backendPackage.scripts = {};
        }
        
        // 添加 Supabase 相关脚本
        backendPackage.scripts['supabase:setup'] = 'node ../supabase/setup.js';
        backendPackage.scripts['supabase:test'] = 'node ../supabase/setup.js test';
        backendPackage.scripts['supabase:migrate'] = 'node ../supabase/setup.js migration';
        backendPackage.scripts['db:migrate'] = 'node src/database/migrate.js';
        
        fs.writeFileSync(backendPackagePath, JSON.stringify(backendPackage, null, 2));
        console.log('✅ 后端 package.json 更新完成');
      }
      
      // 更新根目录 package.json（如果存在）
      const rootPackagePath = path.join(__dirname, 'package.json');
      if (fs.existsSync(rootPackagePath)) {
        const rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
        
        if (!rootPackage.scripts) {
          rootPackage.scripts = {};
        }
        
        // 添加 Supabase 相关脚本
        rootPackage.scripts['supabase:setup'] = 'node supabase/setup.js';
        rootPackage.scripts['supabase:test'] = 'node supabase/setup.js test';
        rootPackage.scripts['supabase:install'] = 'node install-supabase.js';
        
        fs.writeFileSync(rootPackagePath, JSON.stringify(rootPackage, null, 2));
        console.log('✅ 根目录 package.json 更新完成');
      }
      
      return true;
    } catch (error) {
      console.error('❌ package.json 更新失败:', error.message);
      return false;
    }
  }

  /**
   * 创建数据库迁移脚本
   */
  createMigrationScript() {
    console.log('\n📄 创建数据库迁移脚本...');
    
    const migrationScriptPath = path.join(this.backendPath, 'src/database/migrate.js');
    const migrationScriptContent = `/**
 * 数据库迁移脚本
 * 用于在 SQLite 和 Supabase 之间迁移数据
 */

const { DatabaseAdapter } = require('./adapter');

async function migrate() {
  console.log('🔄 开始数据库迁移...');
  
  try {
    const adapter = new DatabaseAdapter();
    await adapter.initialize();
    
    if (adapter.isSQLite()) {
      console.log('检测到 SQLite 数据库，开始迁移到 Supabase...');
      const success = await adapter.migrateToSupabase();
      
      if (success) {
        console.log('🎉 迁移完成！');
        console.log('💡 请更新 .env 文件中的 DATABASE_TYPE=supabase');
      } else {
        console.error('❌ 迁移失败');
        process.exit(1);
      }
    } else {
      console.log('✅ 已在使用 Supabase 数据库');
    }
    
    adapter.close();
  } catch (error) {
    console.error('迁移过程中发生错误:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  migrate();
}

module.exports = migrate;
`;
    
    try {
      fs.writeFileSync(migrationScriptPath, migrationScriptContent);
      console.log('✅ 迁移脚本创建完成');
      return true;
    } catch (error) {
      console.error('❌ 迁移脚本创建失败:', error.message);
      return false;
    }
  }

  /**
   * 显示安装后说明
   */
  showPostInstallInstructions() {
    console.log('\n🎉 Supabase 依赖安装完成！');
    console.log('\n📋 接下来的步骤:');
    console.log('\n1. 配置 Supabase 项目:');
    console.log('   npm run supabase:setup');
    console.log('\n2. 测试 Supabase 连接:');
    console.log('   npm run supabase:test');
    console.log('\n3. 查看迁移脚本:');
    console.log('   npm run supabase:migrate');
    console.log('\n4. 迁移现有数据（如果需要）:');
    console.log('   cd backend && npm run db:migrate');
    console.log('\n📚 更多信息请查看:');
    console.log('   - Supabase 文档: https://supabase.com/docs');
    console.log('   - 项目配置文件: .env.example');
  }

  /**
   * 运行完整安装流程
   */
  async install() {
    console.log('🚀 开始安装 Supabase 依赖...\n');
    
    // 检查系统环境
    if (!this.checkPrerequisites()) {
      console.error('❌ 系统环境检查失败，安装中止');
      return false;
    }
    
    // 安装后端依赖
    if (!this.installBackendDependencies()) {
      console.error('❌ 后端依赖安装失败，安装中止');
      return false;
    }
    
    // 安装前端依赖
    if (!this.installFrontendDependencies()) {
      console.error('❌ 前端依赖安装失败，安装中止');
      return false;
    }
    
    // 更新 package.json 脚本
    if (!this.updatePackageScripts()) {
      console.error('❌ package.json 更新失败，安装中止');
      return false;
    }
    
    // 创建迁移脚本
    if (!this.createMigrationScript()) {
      console.error('❌ 迁移脚本创建失败，安装中止');
      return false;
    }
    
    // 显示安装后说明
    this.showPostInstallInstructions();
    
    return true;
  }
}

// 命令行执行
if (require.main === module) {
  const installer = new SupabaseInstaller();
  installer.install().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('安装过程中发生错误:', error);
    process.exit(1);
  });
}

module.exports = SupabaseInstaller;