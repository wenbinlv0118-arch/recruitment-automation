/**
 * Supabase 项目设置脚本
 * 用于初始化 Supabase 项目和数据库
 */

const fs = require('fs');
const path = require('path');
const SupabaseDatabaseManager = require('./database-manager');

class SupabaseSetup {
  constructor() {
    this.dbManager = null;
  }

  /**
   * 检查环境变量配置
   * @returns {boolean} 配置是否完整
   */
  checkEnvironmentVariables() {
    console.log('🔍 检查环境变量配置...');
    
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_ANON_KEY'
    ];
    
    const optionalVars = [
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    let allRequired = true;
    
    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        console.error(`❌ 缺少必需的环境变量: ${varName}`);
        allRequired = false;
      } else {
        console.log(`✅ ${varName}: 已配置`);
      }
    });
    
    optionalVars.forEach(varName => {
      if (process.env[varName]) {
        console.log(`✅ ${varName}: 已配置`);
      } else {
        console.log(`⚠️  ${varName}: 未配置（可选）`);
      }
    });
    
    return allRequired;
  }

  /**
   * 创建环境变量示例文件
   */
  createEnvExample() {
    const envExamplePath = path.join(__dirname, '../.env.supabase.example');
    const envExampleContent = `# Supabase 配置
# 从 Supabase Dashboard > Settings > API 获取这些值

# Supabase 项目 URL
SUPABASE_URL=https://your-project-id.supabase.co

# Supabase 匿名密钥（用于客户端）
SUPABASE_ANON_KEY=your-anon-key

# Supabase 服务角色密钥（用于服务端，可选）
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 数据库直连配置（可选）
SUPABASE_DB_HOST=db.your-project-id.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your-db-password
`;
    
    try {
      fs.writeFileSync(envExamplePath, envExampleContent);
      console.log(`✅ 环境变量示例文件已创建: ${envExamplePath}`);
    } catch (error) {
      console.error('创建环境变量示例文件失败:', error);
    }
  }

  /**
   * 显示设置说明
   */
  showSetupInstructions() {
    console.log('\n📋 Supabase 项目设置说明:');
    console.log('\n1. 创建 Supabase 项目:');
    console.log('   - 访问 https://supabase.com');
    console.log('   - 点击 "New Project"');
    console.log('   - 选择组织和输入项目名称');
    console.log('   - 选择数据库密码和地区');
    console.log('   - 等待项目创建完成');
    
    console.log('\n2. 获取 API 密钥:');
    console.log('   - 进入项目 Dashboard');
    console.log('   - 点击左侧菜单 "Settings" > "API"');
    console.log('   - 复制 "Project URL" 和 "anon public" 密钥');
    console.log('   - （可选）复制 "service_role" 密钥用于服务端操作');
    
    console.log('\n3. 配置环境变量:');
    console.log('   - 复制 .env.supabase.example 为 .env');
    console.log('   - 填入从 Supabase 获取的 URL 和密钥');
    
    console.log('\n4. 执行数据库迁移:');
    console.log('   - 在 Supabase Dashboard 中点击 "SQL Editor"');
    console.log('   - 复制 supabase/migrations/001_initial_schema.sql 的内容');
    console.log('   - 粘贴并执行 SQL 脚本');
    
    console.log('\n5. 验证设置:');
    console.log('   - 运行 node supabase/setup.js test');
    console.log('   - 确认所有测试通过');
  }

  /**
   * 测试数据库连接和基本功能
   * @returns {Promise<boolean>} 测试结果
   */
  async testConnection() {
    console.log('\n🧪 测试 Supabase 连接和功能...');
    
    try {
      this.dbManager = new SupabaseDatabaseManager();
      
      // 测试连接
      const isConnected = await this.dbManager.init();
      if (!isConnected) {
        console.error('❌ 数据库连接失败');
        return false;
      }
      
      // 测试基本查询
      console.log('🔍 测试基本查询...');
      const companies = await this.dbManager.getCompanies();
      console.log(`✅ 成功查询到 ${companies.length} 个公司记录`);
      
      // 测试创建记录（如果没有默认公司）
      if (companies.length === 0) {
        console.log('📝 创建测试公司记录...');
        const testCompany = await this.dbManager.createCompany({
          name: '测试公司',
          description: '这是一个测试公司记录'
        });
        console.log(`✅ 成功创建测试公司: ${testCompany.name}`);
      }
      
      console.log('\n🎉 所有测试通过！Supabase 配置正确。');
      return true;
      
    } catch (error) {
      console.error('❌ 测试失败:', error.message);
      
      // 提供错误诊断
      if (error.message.includes('Invalid API key')) {
        console.log('\n💡 错误诊断: API 密钥无效');
        console.log('   - 检查 SUPABASE_URL 和 SUPABASE_ANON_KEY 是否正确');
        console.log('   - 确认密钥没有多余的空格或换行符');
      } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('\n💡 错误诊断: 数据库表不存在');
        console.log('   - 请在 Supabase Dashboard 中执行迁移脚本');
        console.log('   - 脚本位置: supabase/migrations/001_initial_schema.sql');
      } else if (error.message.includes('network') || error.message.includes('timeout')) {
        console.log('\n💡 错误诊断: 网络连接问题');
        console.log('   - 检查网络连接');
        console.log('   - 确认 Supabase 项目 URL 正确');
      }
      
      return false;
    } finally {
      if (this.dbManager) {
        this.dbManager.close();
      }
    }
  }

  /**
   * 显示迁移脚本内容
   */
  showMigrationScript() {
    const migrationPath = path.join(__dirname, 'migrations/001_initial_schema.sql');
    
    try {
      const migrationContent = fs.readFileSync(migrationPath, 'utf8');
      console.log('\n📄 数据库迁移脚本内容:');
      console.log('=' .repeat(50));
      console.log(migrationContent);
      console.log('=' .repeat(50));
      console.log('\n📋 执行步骤:');
      console.log('1. 复制上面的 SQL 内容');
      console.log('2. 在 Supabase Dashboard > SQL Editor 中粘贴');
      console.log('3. 点击 "Run" 执行脚本');
    } catch (error) {
      console.error('读取迁移脚本失败:', error);
    }
  }

  /**
   * 运行完整设置流程
   * @param {string} command - 命令类型
   */
  async run(command = 'setup') {
    console.log('🚀 Supabase 项目设置工具\n');
    
    switch (command) {
      case 'test':
        if (!this.checkEnvironmentVariables()) {
          console.log('\n请先配置环境变量，然后重新运行测试。');
          return;
        }
        await this.testConnection();
        break;
        
      case 'migration':
        this.showMigrationScript();
        break;
        
      case 'env':
        this.createEnvExample();
        break;
        
      case 'setup':
      default:
        this.createEnvExample();
        this.showSetupInstructions();
        break;
    }
  }
}

// 命令行执行
if (require.main === module) {
  const command = process.argv[2] || 'setup';
  const setup = new SupabaseSetup();
  setup.run(command).catch(console.error);
}

module.exports = SupabaseSetup;