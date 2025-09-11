#!/usr/bin/env node
/**
 * 生产环境诊断脚本
 * 检查常见的JavaScript加载问题
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 生产环境诊断开始...');
console.log('=' .repeat(50));

// 1. 检查构建文件
function checkBuildFiles() {
  console.log('\n📁 检查构建文件:');
  
  const buildDir = path.join(__dirname, 'build');
  if (!fs.existsSync(buildDir)) {
    console.log('❌ build 目录不存在');
    return false;
  }
  console.log('✅ build 目录存在');
  
  const indexHtml = path.join(buildDir, 'index.html');
  if (!fs.existsSync(indexHtml)) {
    console.log('❌ index.html 不存在');
    return false;
  }
  console.log('✅ index.html 存在');
  
  const staticDir = path.join(buildDir, 'static');
  if (!fs.existsSync(staticDir)) {
    console.log('❌ static 目录不存在');
    return false;
  }
  console.log('✅ static 目录存在');
  
  const jsDir = path.join(staticDir, 'js');
  if (!fs.existsSync(jsDir)) {
    console.log('❌ static/js 目录不存在');
    return false;
  }
  
  const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js') && !f.endsWith('.map'));
  if (jsFiles.length === 0) {
    console.log('❌ 没有找到JavaScript文件');
    return false;
  }
  console.log(`✅ 找到 ${jsFiles.length} 个JavaScript文件:`, jsFiles);
  
  return true;
}

// 2. 检查index.html中的脚本引用
function checkScriptReferences() {
  console.log('\n📄 检查index.html中的脚本引用:');
  
  const indexPath = path.join(__dirname, 'build', 'index.html');
  const content = fs.readFileSync(indexPath, 'utf8');
  
  const scriptMatches = content.match(/<script[^>]*src=["']([^"']*)["'][^>]*>/g);
  if (!scriptMatches) {
    console.log('❌ 没有找到script标签');
    return false;
  }
  
  console.log('✅ 找到script标签:');
  scriptMatches.forEach(script => {
    console.log('  -', script);
  });
  
  return true;
}

// 3. 检查环境变量配置
function checkEnvironmentConfig() {
  console.log('\n🔧 检查环境变量配置:');
  
  const envProdPath = path.join(__dirname, '.env.production');
  if (!fs.existsSync(envProdPath)) {
    console.log('❌ .env.production 文件不存在');
    return false;
  }
  
  const envContent = fs.readFileSync(envProdPath, 'utf8');
  
  // 检查关键配置
  const requiredVars = [
    'REACT_APP_API_BASE_URL',
    'REACT_APP_SUPABASE_URL',
    'REACT_APP_SUPABASE_ANON_KEY'
  ];
  
  let allPresent = true;
  requiredVars.forEach(varName => {
    if (envContent.includes(varName)) {
      console.log(`✅ ${varName} 已配置`);
    } else {
      console.log(`❌ ${varName} 未配置`);
      allPresent = false;
    }
  });
  
  // 检查URL格式
  const urlMatch = envContent.match(/REACT_APP_SUPABASE_URL=(.+)/);
  if (urlMatch) {
    const url = urlMatch[1].trim();
    if (url.startsWith('hhttps://')) {
      console.log('❌ SUPABASE_URL 有拼写错误 (hhttps)');
      allPresent = false;
    } else if (url.startsWith('https://')) {
      console.log('✅ SUPABASE_URL 格式正确');
    } else {
      console.log('⚠️  SUPABASE_URL 格式可能有问题:', url);
    }
  }
  
  return allPresent;
}

// 4. 检查package.json配置
function checkPackageConfig() {
  console.log('\n📦 检查package.json配置:');
  
  const packagePath = path.join(__dirname, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  // 检查homepage配置
  if (packageJson.homepage) {
    console.log('✅ homepage 已配置:', packageJson.homepage);
  } else {
    console.log('⚠️  homepage 未配置，使用默认根路径');
  }
  
  // 检查构建脚本
  if (packageJson.scripts && packageJson.scripts.build) {
    console.log('✅ build 脚本存在:', packageJson.scripts.build);
  } else {
    console.log('❌ build 脚本不存在');
    return false;
  }
  
  return true;
}

// 5. 生成修复建议
function generateFixSuggestions() {
  console.log('\n🔧 修复建议:');
  console.log('=' .repeat(30));
  
  console.log('\n1. 如果在Zeabur部署，确保:');
  console.log('   - zbpack.json 中 output_dir 设置为 "frontend/build"');
  console.log('   - 环境变量 ZBPACK_SPA=true');
  console.log('   - _redirects 文件存在于 public 目录');
  
  console.log('\n2. 如果JavaScript文件404:');
  console.log('   - 检查静态文件服务配置');
  console.log('   - 确认构建输出目录正确');
  console.log('   - 检查CDN或代理配置');
  
  console.log('\n3. 如果显示noscript内容:');
  console.log('   - 检查浏览器JavaScript是否启用');
  console.log('   - 检查Content-Type是否正确');
  console.log('   - 检查CORS配置');
  
  console.log('\n4. 环境变量问题:');
  console.log('   - 确保所有REACT_APP_前缀的变量都已设置');
  console.log('   - 检查URL格式是否正确');
  console.log('   - 重新构建应用以应用新的环境变量');
}

// 主函数
function main() {
  let allChecksPass = true;
  
  allChecksPass &= checkBuildFiles();
  allChecksPass &= checkScriptReferences();
  allChecksPass &= checkEnvironmentConfig();
  allChecksPass &= checkPackageConfig();
  
  console.log('\n' + '=' .repeat(50));
  if (allChecksPass) {
    console.log('✅ 所有检查通过！');
    console.log('如果仍有问题，可能是部署平台配置问题。');
  } else {
    console.log('❌ 发现问题，请查看上述检查结果。');
  }
  
  generateFixSuggestions();
  
  console.log('\n🔍 诊断完成');
}

if (require.main === module) {
  main();
}

module.exports = {
  checkBuildFiles,
  checkScriptReferences,
  checkEnvironmentConfig,
  checkPackageConfig
};