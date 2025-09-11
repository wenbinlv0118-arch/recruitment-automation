#!/usr/bin/env node

/**
 * 环境变量检查脚本
 * 用于验证React应用的环境变量配置是否正确
 */

const fs = require('fs');
const path = require('path');

/**
 * 检查环境变量文件中的配置
 */
function checkEnvFile(filePath) {
  console.log(`\n🔍 检查 ${filePath}:`);
  
  if (!fs.existsSync(filePath)) {
    console.log('❌ 文件不存在');
    return { valid: false, issues: ['文件不存在'] };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  
  const issues = [];
  const validVars = [];
  const invalidVars = [];

  lines.forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
      if (key.startsWith('VITE_')) {
        invalidVars.push(key);
        issues.push(`❌ ${key} - 应该使用 REACT_APP_ 前缀`);
      } else if (key.startsWith('REACT_APP_')) {
        validVars.push(key);
        console.log(`✅ ${key}`);
      } else if (['NODE_ENV', 'ZBPACK_SPA'].includes(key)) {
        validVars.push(key);
        console.log(`✅ ${key}`);
      }
    }
  });

  if (invalidVars.length > 0) {
    console.log('\n⚠️  发现问题:');
    issues.forEach(issue => console.log(issue));
  }

  return {
    valid: invalidVars.length === 0,
    issues,
    validVars,
    invalidVars
  };
}

/**
 * 生成正确的环境变量配置示例
 */
function generateCorrectConfig() {
  console.log('\n📝 正确的Zeabur环境变量配置:');
  console.log('```');
  console.log('# React应用环境变量（必须使用REACT_APP_前缀）');
  console.log('REACT_APP_API_BASE_URL=https://recruitment-automation-backend.zeabur.app');
  console.log('REACT_APP_SUPABASE_URL=https://your-project.supabase.co');
  console.log('REACT_APP_SUPABASE_ANON_KEY=your-anon-key');
  console.log('');
  console.log('# Zeabur部署配置');
  console.log('ZBPACK_SPA=true');
  console.log('NODE_ENV=production');
  console.log('```');
}

/**
 * 检查代码中使用的环境变量
 */
function checkCodeUsage() {
  console.log('\n🔍 检查代码中的环境变量使用:');
  
  const srcDir = path.join(process.cwd(), 'src');
  if (!fs.existsSync(srcDir)) {
    console.log('❌ src目录不存在');
    return;
  }

  const jsFiles = [];
  
  function findJsFiles(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        findJsFiles(filePath);
      } else if (file.match(/\.(js|jsx|ts|tsx)$/)) {
        jsFiles.push(filePath);
      }
    });
  }

  findJsFiles(srcDir);
  
  const envUsage = new Set();
  const viteUsage = new Set();
  
  jsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    
    // 查找 process.env.REACT_APP_ 使用
    const reactAppMatches = content.match(/process\.env\.REACT_APP_\w+/g);
    if (reactAppMatches) {
      reactAppMatches.forEach(match => envUsage.add(match));
    }
    
    // 查找 process.env.VITE_ 使用（错误的）
    const viteMatches = content.match(/process\.env\.VITE_\w+/g);
    if (viteMatches) {
      viteMatches.forEach(match => viteUsage.add(match));
    }
  });

  if (envUsage.size > 0) {
    console.log('✅ 发现正确的环境变量使用:');
    Array.from(envUsage).forEach(env => {
      console.log(`   ${env}`);
    });
  }

  if (viteUsage.size > 0) {
    console.log('❌ 发现错误的环境变量使用:');
    Array.from(viteUsage).forEach(env => {
      console.log(`   ${env} - 应该改为 ${env.replace('VITE_', 'REACT_APP_')}`);
    });
  }

  return { reactApp: Array.from(envUsage), vite: Array.from(viteUsage) };
}

/**
 * 主函数
 */
function main() {
  console.log('🔧 React应用环境变量检查工具');
  console.log('=' .repeat(50));

  // 检查各种环境变量文件
  const envFiles = [
    '.env',
    '.env.local',
    '.env.production',
    '.env.production.local'
  ];

  let hasIssues = false;
  
  envFiles.forEach(file => {
    const result = checkEnvFile(file);
    if (!result.valid) {
      hasIssues = true;
    }
  });

  // 检查代码使用
  const codeUsage = checkCodeUsage();
  if (codeUsage && codeUsage.vite.length > 0) {
    hasIssues = true;
  }

  // 生成配置示例
  generateCorrectConfig();

  console.log('\n' + '='.repeat(50));
  
  if (hasIssues) {
    console.log('❌ 发现环境变量配置问题！');
    console.log('\n🔧 修复步骤:');
    console.log('1. 在Zeabur控制台中删除所有VITE_前缀的环境变量');
    console.log('2. 添加正确的REACT_APP_前缀环境变量');
    console.log('3. 如果代码中使用了VITE_变量，需要修改为REACT_APP_');
    console.log('4. 重新部署应用');
    process.exit(1);
  } else {
    console.log('✅ 环境变量配置检查通过！');
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  checkEnvFile,
  checkCodeUsage,
  generateCorrectConfig
};