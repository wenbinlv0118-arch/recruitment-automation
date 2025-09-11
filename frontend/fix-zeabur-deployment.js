#!/usr/bin/env node
/**
 * Zeabur部署修复脚本
 * 自动检查和修复常见的部署配置问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Zeabur部署修复脚本');
console.log('=' .repeat(50));

// 1. 检查并修复package.json中的homepage配置
function fixPackageJsonHomepage() {
  console.log('\n📦 检查package.json配置...');
  
  const packagePath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  let modified = false;
  
  // 添加homepage配置（用于正确的静态资源路径）
  if (!packageJson.homepage) {
    packageJson.homepage = ".";
    modified = true;
    console.log('✅ 添加homepage配置: "."');
  } else {
    console.log('✅ homepage已配置:', packageJson.homepage);
  }
  
  // 确保有正确的构建脚本
  if (!packageJson.scripts.build) {
    packageJson.scripts.build = "react-scripts build";
    modified = true;
    console.log('✅ 添加build脚本');
  }
  
  // 添加serve脚本用于本地测试
  if (!packageJson.scripts.serve) {
    packageJson.scripts.serve = "npx serve -s build -p 3000";
    modified = true;
    console.log('✅ 添加serve脚本');
  }
  
  if (modified) {
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
    console.log('✅ package.json已更新');
  }
  
  return modified;
}

// 2. 检查并修复zbpack.json配置
function fixZbpackConfig() {
  console.log('\n⚙️  检查zbpack.json配置...');
  
  const zbpackPath = path.join(__dirname, '..', 'zbpack.json');
  
  if (!fs.existsSync(zbpackPath)) {
    console.log('❌ zbpack.json不存在');
    return false;
  }
  
  const zbpack = JSON.parse(fs.readFileSync(zbpackPath, 'utf8'));
  let modified = false;
  
  // 检查前端服务配置
  if (zbpack.services && zbpack.services.frontend) {
    const frontend = zbpack.services.frontend;
    
    // 确保正确的配置
    const requiredConfig = {
      environment: "static",
      framework: "react",
      spa: true,
      output_dir: "frontend/build",
      build_command: "cd frontend && npm ci && npm run build"
    };
    
    Object.entries(requiredConfig).forEach(([key, value]) => {
      if (frontend[key] !== value) {
        frontend[key] = value;
        modified = true;
        console.log(`✅ 修复${key}: ${value}`);
      } else {
        console.log(`✅ ${key}配置正确: ${value}`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(zbpackPath, JSON.stringify(zbpack, null, 2));
      console.log('✅ zbpack.json已更新');
    }
  } else {
    console.log('❌ zbpack.json中没有frontend服务配置');
    return false;
  }
  
  return true;
}

// 3. 检查环境变量文件
function checkEnvironmentFiles() {
  console.log('\n🌍 检查环境变量文件...');
  
  const envFiles = ['.env.production', '.env.local', '.env'];
  
  envFiles.forEach(envFile => {
    const envPath = path.join(__dirname, envFile);
    if (fs.existsSync(envPath)) {
      console.log(`✅ ${envFile} 存在`);
      
      const content = fs.readFileSync(envPath, 'utf8');
      
      // 检查必需的环境变量
      const requiredVars = [
        'REACT_APP_API_BASE_URL',
        'REACT_APP_SUPABASE_URL',
        'REACT_APP_SUPABASE_ANON_KEY'
      ];
      
      requiredVars.forEach(varName => {
        if (content.includes(varName)) {
          console.log(`  ✅ ${varName} 已配置`);
        } else {
          console.log(`  ⚠️  ${varName} 未在${envFile}中找到`);
        }
      });
    } else {
      console.log(`⚠️  ${envFile} 不存在`);
    }
  });
}

// 4. 创建部署验证脚本
function createDeploymentVerification() {
  console.log('\n📋 创建部署验证脚本...');
  
  const verifyScript = `#!/bin/bash
# Zeabur部署验证脚本

echo "🔍 验证Zeabur部署配置..."

# 检查构建输出
if [ -d "build" ]; then
  echo "✅ build目录存在"
  
  if [ -f "build/index.html" ]; then
    echo "✅ index.html存在"
  else
    echo "❌ index.html不存在"
    exit 1
  fi
  
  if [ -d "build/static/js" ]; then
    js_files=$(ls build/static/js/*.js 2>/dev/null | wc -l)
    if [ $js_files -gt 0 ]; then
      echo "✅ JavaScript文件存在 ($js_files 个)"
    else
      echo "❌ 没有找到JavaScript文件"
      exit 1
    fi
  else
    echo "❌ static/js目录不存在"
    exit 1
  fi
else
  echo "❌ build目录不存在，请先运行 npm run build"
  exit 1
fi

echo "\n📋 Zeabur部署检查清单:"
echo "1. 在Zeabur控制台中设置以下环境变量:"
echo "   - REACT_APP_API_BASE_URL"
echo "   - REACT_APP_SUPABASE_URL"
echo "   - REACT_APP_SUPABASE_ANON_KEY"
echo "   - ZBPACK_SPA=true"
echo "\n2. 确保前端服务配置:"
echo "   - 服务类型: Static"
echo "   - 框架: React"
echo "   - SPA模式: 启用"
echo "   - 构建命令: cd frontend && npm ci && npm run build"
echo "   - 输出目录: frontend/build"
echo "\n3. 部署后验证:"
echo "   - 访问部署的URL"
echo "   - 检查浏览器开发者工具"
echo "   - 确认JavaScript文件正确加载"
echo "\n✅ 验证完成！"
`;
  
  const scriptPath = path.join(__dirname, 'verify-deployment.sh');
  fs.writeFileSync(scriptPath, verifyScript);
  
  // 设置执行权限
  try {
    fs.chmodSync(scriptPath, '755');
    console.log('✅ 部署验证脚本已创建: verify-deployment.sh');
  } catch (err) {
    console.log('✅ 部署验证脚本已创建: verify-deployment.sh (请手动设置执行权限)');
  }
}

// 5. 生成部署指南
function generateDeploymentGuide() {
  console.log('\n📖 生成部署指南...');
  
  const guide = `# Zeabur部署问题解决指南

## 问题现象
页面显示："您需要启用JavaScript才能运行此应用程序"

## 解决步骤

### 1. 本地验证
\`\`\`bash
# 构建项目
npm run build

# 运行验证脚本
./verify-deployment.sh

# 本地测试
npm run serve
# 或
node test-production-build.js
\`\`\`

### 2. Zeabur配置检查

#### 环境变量设置
在Zeabur控制台 > 服务设置 > 环境变量中添加：
\`\`\`
REACT_APP_API_BASE_URL=https://your-backend.zeabur.app
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
ZBPACK_SPA=true
NODE_ENV=production
\`\`\`

#### 服务配置确认
- **服务类型**: Static
- **框架**: React
- **构建命令**: \`cd frontend && npm ci && npm run build\`
- **输出目录**: \`frontend/build\`
- **SPA模式**: 启用

### 3. 重新部署
1. 保存环境变量配置
2. 触发重新部署
3. 查看构建日志
4. 验证部署结果

### 4. 故障排除

#### 如果JavaScript文件404
- 检查构建日志中的错误
- 确认输出目录配置正确
- 检查静态文件路径

#### 如果环境变量未生效
- 确保变量名有REACT_APP_前缀
- 重新构建项目
- 检查构建时的环境变量注入

#### 如果SPA路由不工作
- 确认_redirects文件存在
- 检查SPA模式是否启用
- 验证路由配置

## 联系支持
如果问题仍然存在，请联系Zeabur技术支持，并提供：
- 构建日志
- 环境变量配置截图
- 浏览器开发者工具的错误信息
`;
  
  const guidePath = path.join(__dirname, 'ZEABUR_DEPLOYMENT_FIX.md');
  fs.writeFileSync(guidePath, guide);
  console.log('✅ 部署指南已创建: ZEABUR_DEPLOYMENT_FIX.md');
}

// 主函数
function main() {
  console.log('开始修复Zeabur部署配置...\n');
  
  let hasChanges = false;
  
  try {
    hasChanges |= fixPackageJsonHomepage();
    hasChanges |= fixZbpackConfig();
    checkEnvironmentFiles();
    createDeploymentVerification();
    generateDeploymentGuide();
    
    console.log('\n' + '=' .repeat(50));
    
    if (hasChanges) {
      console.log('✅ 配置文件已更新！');
      console.log('\n📋 下一步操作:');
  console.log('1. 运行 npm run build 重新构建');
  console.log('2. 运行 ./verify-deployment.sh 验证构建');
  console.log('3. ⚠️  在Zeabur控制台中设置正确的环境变量（使用REACT_APP_前缀）');
  console.log('4. 重新部署前端服务');
  console.log('\n⚠️  重要提醒: React应用必须使用REACT_APP_前缀，不是VITE_前缀！');
    } else {
      console.log('✅ 配置检查完成，没有发现需要修复的问题');
      console.log('\n📋 建议操作:');
      console.log('1. 检查Zeabur控制台中的环境变量设置');
      console.log('2. 查看部署日志中的错误信息');
      console.log('3. 参考 ZEABUR_DEPLOYMENT_FIX.md 进行故障排除');
    }
    
  } catch (error) {
    console.error('❌ 修复过程中出现错误:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  fixPackageJsonHomepage,
  fixZbpackConfig,
  checkEnvironmentFiles
};