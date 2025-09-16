/**
 * D-Bus "Address does not contain a colon" 错误修复验证脚本
 * 专门验证新的D-Bus配置是否能解决colon错误
 */

const { chromium } = require('playwright');
const { environmentConfig } = require('./src/config/environmentConfig');
const fs = require('fs');
const path = require('path');

/**
 * 检查D-Bus环境变量格式
 */
function checkDbusAddressFormat() {
  console.log('\n=== 检查D-Bus地址格式 ===');
  
  const sessionAddress = process.env.DBUS_SESSION_BUS_ADDRESS;
  const systemAddress = process.env.DBUS_SYSTEM_BUS_ADDRESS;
  
  let formatCorrect = true;
  
  // 检查会话总线地址
  if (sessionAddress === undefined) {
    console.log('❌ DBUS_SESSION_BUS_ADDRESS 未设置');
    formatCorrect = false;
  } else if (sessionAddress === '') {
    console.log('✅ DBUS_SESSION_BUS_ADDRESS 为空字符串（正确禁用格式）');
  } else if (sessionAddress === '/dev/null') {
    console.log('⚠️  DBUS_SESSION_BUS_ADDRESS 为 /dev/null（可能导致colon错误）');
    formatCorrect = false;
  } else if (sessionAddress.includes(':')) {
    console.log(`✅ DBUS_SESSION_BUS_ADDRESS 包含冒号: ${sessionAddress}`);
  } else {
    console.log(`❌ DBUS_SESSION_BUS_ADDRESS 格式错误（无冒号）: ${sessionAddress}`);
    formatCorrect = false;
  }
  
  // 检查系统总线地址
  if (systemAddress === undefined) {
    console.log('❌ DBUS_SYSTEM_BUS_ADDRESS 未设置');
    formatCorrect = false;
  } else if (systemAddress === '') {
    console.log('✅ DBUS_SYSTEM_BUS_ADDRESS 为空字符串（正确禁用格式）');
  } else if (systemAddress === '/dev/null') {
    console.log('⚠️  DBUS_SYSTEM_BUS_ADDRESS 为 /dev/null（可能导致colon错误）');
    formatCorrect = false;
  } else if (systemAddress.includes(':')) {
    console.log(`✅ DBUS_SYSTEM_BUS_ADDRESS 包含冒号: ${systemAddress}`);
  } else {
    console.log(`❌ DBUS_SYSTEM_BUS_ADDRESS 格式错误（无冒号）: ${systemAddress}`);
    formatCorrect = false;
  }
  
  return formatCorrect;
}

/**
 * 检查其他D-Bus相关环境变量
 */
function checkAdditionalDbusVars() {
  console.log('\n=== 检查额外D-Bus禁用变量 ===');
  
  const additionalVars = {
    'NO_DBUS': '1',
    'DISABLE_DBUS': '1',
    'NO_AT_BRIDGE': '1',
    'GSETTINGS_BACKEND': 'memory',
    'GDK_BACKEND': 'x11',
    'DBUS_FATAL_WARNINGS': '0',
    'DBUS_VERBOSE': '0'
  };
  
  let allSet = true;
  
  Object.entries(additionalVars).forEach(([varName, expectedValue]) => {
    const actualValue = process.env[varName];
    if (actualValue === expectedValue) {
      console.log(`✅ ${varName}=${actualValue}`);
    } else {
      console.log(`❌ ${varName}=${actualValue || 'undefined'} (期望: ${expectedValue})`);
      allSet = false;
    }
  });
  
  return allSet;
}

/**
 * 检查浏览器启动参数
 */
function checkEnhancedBrowserArgs() {
  console.log('\n=== 检查增强的浏览器D-Bus禁用参数 ===');
  
  const browserArgs = environmentConfig.getBrowserArgs();
  
  const criticalDbusArgs = [
    '--no-dbus',
    '--disable-dbus',
    '--disable-accessibility',
    '--disable-ipc-flooding-protection',
    '--disable-extensions',
    '--disable-component-extensions-with-background-pages',
    '--disable-background-downloads',
    '--disable-desktop-notifications',
    '--disable-file-system'
  ];
  
  let allArgsPresent = true;
  
  criticalDbusArgs.forEach(arg => {
    if (browserArgs.includes(arg)) {
      console.log(`✅ ${arg}`);
    } else {
      console.log(`❌ ${arg} 缺失`);
      allArgsPresent = false;
    }
  });
  
  console.log(`\n总启动参数数量: ${browserArgs.length}`);
  
  return allArgsPresent;
}

/**
 * 测试浏览器启动并监控特定错误
 */
async function testBrowserForColonErrors() {
  console.log('\n=== 测试浏览器启动（专门监控colon错误） ===');
  
  let browser = null;
  let page = null;
  let colonErrors = [];
  let allDbusErrors = [];
  
  // 捕获所有输出流
  const originalStderr = process.stderr.write;
  const originalStdout = process.stdout.write;
  
  process.stderr.write = function(chunk, encoding, callback) {
    const message = chunk.toString();
    if (message.includes('Address does not contain a colon')) {
      colonErrors.push(message.trim());
    }
    if (message.includes('dbus') || message.includes('D-Bus') || message.includes('bus.cc')) {
      allDbusErrors.push(message.trim());
    }
    return originalStderr.call(this, chunk, encoding, callback);
  };
  
  process.stdout.write = function(chunk, encoding, callback) {
    const message = chunk.toString();
    if (message.includes('Address does not contain a colon')) {
      colonErrors.push(message.trim());
    }
    if (message.includes('dbus') || message.includes('D-Bus') || message.includes('bus.cc')) {
      allDbusErrors.push(message.trim());
    }
    return originalStdout.call(this, chunk, encoding, callback);
  };
  
  try {
    const config = environmentConfig.getBrowserConfig();
    
    console.log('启动浏览器（监控colon错误）...');
    browser = await chromium.launch({
      headless: config.headless,
      args: config.args,
      timeout: 30000
    });
    
    console.log('✅ 浏览器启动成功');
    
    // 创建页面并测试基本功能
    const context = await browser.newContext();
    page = await context.newPage();
    
    console.log('测试页面导航...');
    await page.goto('https://www.baidu.com', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    const title = await page.title();
    console.log(`✅ 页面导航成功: ${title}`);
    
    // 等待足够时间观察错误
    console.log('等待10秒观察D-Bus错误...');
    await page.waitForTimeout(10000);
    
    return { colonErrors, allDbusErrors };
    
  } catch (error) {
    console.error('❌ 浏览器测试失败:', error.message);
    return { colonErrors, allDbusErrors, error: error.message };
    
  } finally {
    // 恢复原始输出流
    process.stderr.write = originalStderr;
    process.stdout.write = originalStdout;
    
    // 清理资源
    try {
      if (page) await page.close();
      if (browser) await browser.close();
    } catch (cleanupError) {
      console.error('清理资源时出错:', cleanupError.message);
    }
  }
}

/**
 * 生成验证报告
 */
function generateReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    dbusAddressFormat: results.addressFormat,
    additionalDbusVars: results.additionalVars,
    enhancedBrowserArgs: results.browserArgs,
    colonErrorsDetected: results.testResults.colonErrors.length,
    colonErrors: results.testResults.colonErrors,
    allDbusErrorsDetected: results.testResults.allDbusErrors.length,
    allDbusErrors: results.testResults.allDbusErrors,
    browserTestError: results.testResults.error || null,
    overallStatus: results.addressFormat && results.additionalVars && results.browserArgs && results.testResults.colonErrors.length === 0 ? 'SUCCESS' : 'NEEDS_ATTENTION',
    recommendations: []
  };
  
  // 添加建议
  if (!results.addressFormat) {
    report.recommendations.push('修复D-Bus地址格式，使用空字符串或包含冒号的格式');
  }
  if (!results.additionalVars) {
    report.recommendations.push('设置所有必需的D-Bus禁用环境变量');
  }
  if (!results.browserArgs) {
    report.recommendations.push('添加缺失的浏览器D-Bus禁用参数');
  }
  if (results.testResults.colonErrors.length > 0) {
    report.recommendations.push('仍然检测到colon错误，需要进一步调查');
  }
  
  return report;
}

/**
 * 主验证函数
 */
async function main() {
  console.log('\n🔍 D-Bus Colon错误修复验证开始...');
  console.log('=' .repeat(50));
  
  const results = {
    addressFormat: checkDbusAddressFormat(),
    additionalVars: checkAdditionalDbusVars(),
    browserArgs: checkEnhancedBrowserArgs(),
    testResults: await testBrowserForColonErrors()
  };
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 验证结果汇总:');
  console.log(`✅ D-Bus地址格式: ${results.addressFormat ? '通过' : '失败'}`);
  console.log(`✅ 额外环境变量: ${results.additionalVars ? '通过' : '失败'}`);
  console.log(`✅ 增强浏览器参数: ${results.browserArgs ? '通过' : '失败'}`);
  console.log(`✅ Colon错误检测: ${results.testResults.colonErrors.length === 0 ? '无错误' : `发现${results.testResults.colonErrors.length}个错误`}`);
  console.log(`✅ 所有D-Bus错误: ${results.testResults.allDbusErrors.length === 0 ? '无错误' : `发现${results.testResults.allDbusErrors.length}个错误`}`);
  
  const report = generateReport(results);
  
  // 保存报告
  const reportPath = path.join(__dirname, 'dbus-colon-fix-verification-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  console.log(`\n📄 详细报告已保存: ${reportPath}`);
  
  if (report.overallStatus === 'SUCCESS') {
    console.log('\n🎉 总体状态: Colon错误修复成功！');
    process.exit(0);
  } else {
    console.log('\n⚠️  总体状态: 需要进一步处理');
    if (report.recommendations.length > 0) {
      console.log('\n建议:');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    process.exit(1);
  }
}

// 运行验证
if (require.main === module) {
  main().catch(error => {
    console.error('验证过程中发生错误:', error);
    process.exit(1);
  });
}

module.exports = { main, checkDbusAddressFormat, checkAdditionalDbusVars, checkEnhancedBrowserArgs };