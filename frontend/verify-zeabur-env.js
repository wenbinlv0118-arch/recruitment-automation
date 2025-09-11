#!/usr/bin/env node

/**
 * Zeabur环境变量验证脚本
 * 用于验证部署后的环境变量是否正确加载
 */

const https = require('https');
const http = require('http');
const url = require('url');

/**
 * 检查网站是否可访问
 */
function checkWebsite(siteUrl) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(siteUrl);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.path,
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EnvChecker/1.0)'
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * 检查HTML中是否包含JavaScript错误提示
 */
function checkForJSErrors(html) {
  const errors = [];
  
  // 检查常见的JavaScript禁用提示
  if (html.includes('您需要启用JavaScript才能运行此应用程序') || 
      html.includes('You need to enable JavaScript to run this app')) {
    errors.push('发现JavaScript禁用提示');
  }
  
  // 检查是否有React应用的根元素
  if (!html.includes('id="root"')) {
    errors.push('未找到React根元素');
  }
  
  // 检查是否有构建后的JS文件引用
  const jsFiles = html.match(/src="[^"]*\.js"/g);
  if (!jsFiles || jsFiles.length === 0) {
    errors.push('未找到JavaScript文件引用');
  }
  
  return errors;
}

/**
 * 检查环境变量是否正确注入
 */
function checkEnvInjection(html) {
  const issues = [];
  
  // 在生产构建中，环境变量会被直接替换到代码中
  // 检查是否还有未替换的环境变量引用
  if (html.includes('process.env.VITE_')) {
    issues.push('发现未替换的VITE_环境变量');
  }
  
  // 检查是否有正确的API URL
  if (html.includes('recruitment-automation-backend.zeabur.app')) {
    console.log('✅ 发现正确的API URL配置');
  } else {
    issues.push('未发现预期的API URL配置');
  }
  
  return issues;
}

/**
 * 主验证函数
 */
async function verifyDeployment() {
  console.log('🔍 Zeabur部署环境变量验证');
  console.log('=' .repeat(50));
  
  // 这里需要用户提供实际的Zeabur部署URL
  const deploymentUrl = process.argv[2] || 'https://your-frontend.zeabur.app';
  
  if (deploymentUrl === 'https://your-frontend.zeabur.app') {
    console.log('❌ 请提供实际的Zeabur部署URL');
    console.log('用法: node verify-zeabur-env.js https://your-frontend.zeabur.app');
    process.exit(1);
  }
  
  console.log(`🌐 检查部署URL: ${deploymentUrl}`);
  
  try {
    // 检查网站可访问性
    console.log('\n📡 检查网站可访问性...');
    const response = await checkWebsite(deploymentUrl);
    
    console.log(`✅ HTTP状态码: ${response.statusCode}`);
    
    if (response.statusCode !== 200) {
      console.log('❌ 网站返回非200状态码');
      process.exit(1);
    }
    
    // 检查HTML内容
    console.log('\n🔍 分析HTML内容...');
    const jsErrors = checkForJSErrors(response.body);
    const envIssues = checkEnvInjection(response.body);
    
    // 报告结果
    console.log('\n📊 检查结果:');
    
    if (jsErrors.length === 0) {
      console.log('✅ 未发现JavaScript错误');
    } else {
      console.log('❌ JavaScript问题:');
      jsErrors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (envIssues.length === 0) {
      console.log('✅ 环境变量配置正常');
    } else {
      console.log('❌ 环境变量问题:');
      envIssues.forEach(issue => console.log(`   - ${issue}`));
    }
    
    // 总结
    const totalIssues = jsErrors.length + envIssues.length;
    
    console.log('\n' + '='.repeat(50));
    
    if (totalIssues === 0) {
      console.log('🎉 验证通过！部署看起来正常。');
      console.log('\n💡 建议进一步测试:');
      console.log('1. 在浏览器中打开网站并测试功能');
      console.log('2. 检查浏览器控制台是否有错误');
      console.log('3. 测试API调用是否正常');
    } else {
      console.log(`❌ 发现 ${totalIssues} 个问题需要修复`);
      console.log('\n🔧 建议修复步骤:');
      console.log('1. 检查Zeabur环境变量配置');
      console.log('2. 确认使用REACT_APP_前缀而不是VITE_前缀');
      console.log('3. 重新部署应用');
      console.log('4. 参考 ZEABUR_ENV_FIX.md 文档');
      process.exit(1);
    }
    
  } catch (error) {
    console.log(`❌ 检查失败: ${error.message}`);
    console.log('\n可能的原因:');
    console.log('1. 网站无法访问');
    console.log('2. 网络连接问题');
    console.log('3. 部署尚未完成');
    process.exit(1);
  }
}

/**
 * 显示使用帮助
 */
function showHelp() {
  console.log('Zeabur环境变量验证工具');
  console.log('');
  console.log('用法:');
  console.log('  node verify-zeabur-env.js <部署URL>');
  console.log('');
  console.log('示例:');
  console.log('  node verify-zeabur-env.js https://my-app.zeabur.app');
  console.log('');
  console.log('功能:');
  console.log('  - 检查网站可访问性');
  console.log('  - 验证JavaScript是否正常加载');
  console.log('  - 检查环境变量是否正确注入');
  console.log('  - 提供修复建议');
}

if (require.main === module) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showHelp();
  } else {
    verifyDeployment();
  }
}

module.exports = {
  checkWebsite,
  checkForJSErrors,
  checkEnvInjection,
  verifyDeployment
};