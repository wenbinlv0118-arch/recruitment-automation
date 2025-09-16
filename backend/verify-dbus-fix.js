/**
 * D-Bus 错误修复验证脚本
 * 验证所有D-Bus禁用配置是否生效，确保不再出现D-Bus连接错误
 */

const { chromium } = require('playwright');
const { environmentConfig } = require('./src/config/environmentConfig');
const fs = require('fs');
const path = require('path');

/**
 * 检查环境变量配置
 */
function checkEnvironmentVariables() {
  console.log('\n=== 检查D-Bus环境变量配置 ===');
  
  const requiredEnvVars = [
    'DBUS_SESSION_BUS_ADDRESS',
    'DBUS_SYSTEM_BUS_ADDRESS',
    'NO_DBUS',
    'DISABLE_DBUS',
    'NO_AT_BRIDGE',
    'GSETTINGS_BACKEND',
    'GDK_BACKEND'
  ];
  
  let allConfigured = true;
  
  requiredEnvVars.forEach(envVar => {
    const value = process.env[envVar];
    if (value) {
      console.log(`✅ ${envVar}=${value}`);
    } else {
      console.log(`❌ ${envVar} 未设置`);
      allConfigured = false;
    }
  });
  
  return allConfigured;
}

/**
 * 检查浏览器启动参数
 */
function checkBrowserArgs() {
  console.log('\n=== 检查浏览器D-Bus禁用参数 ===');
  
  const browserArgs = environmentConfig.getBrowserArgs();
  
  const requiredDbusArgs = [
    '--no-dbus',
    '--disable-dbus',
    '--disable-accessibility',
    '--disable-system-font-check',
    '--disable-sync',
    '--disable-translate',
    '--disable-audio-output',
    '--disable-notifications'
  ];
  
  let allArgsPresent = true;
  
  requiredDbusArgs.forEach(arg => {
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
 * 检查D-Bus相关目录
 */
function checkDbusDirectories() {
  console.log('\n=== 检查D-Bus目录状态 ===');
  
  const dbusPaths = [
    '/run/dbus',
    '/var/run/dbus',
    '/run/dbus/system_bus_socket'
  ];
  
  dbusPaths.forEach(dbusPath => {
    if (fs.existsSync(dbusPath)) {
      console.log(`⚠️  ${dbusPath} 存在（可能导致连接尝试）`);
    } else {
      console.log(`✅ ${dbusPath} 不存在（正常）`);
    }
  });
}

/**
 * 测试浏览器启动（监控错误日志）
 */
async function testBrowserLaunch() {
  console.log('\n=== 测试浏览器启动（监控D-Bus错误） ===');
  
  let browser = null;
  let page = null;
  let dbusErrors = [];
  
  // 捕获控制台错误
  const originalConsoleError = console.error;
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('dbus') || message.includes('D-Bus') || message.includes('bus.cc')) {
      dbusErrors.push(message);
    }
    originalConsoleError.apply(console, args);
  };
  
  try {
    const config = environmentConfig.getBrowserConfig();
    
    console.log('启动浏览器...');
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
    
    // 等待一段时间，观察是否有D-Bus错误
    await page.waitForTimeout(5000);
    
    return dbusErrors;
    
  } catch (error) {
    console.error('❌ 浏览器测试失败:', error.message);
    return dbusErrors;
    
  } finally {
    // 恢复原始console.error
    console.error = originalConsoleError;
    
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
 * 生成修复报告
 */
function generateReport(envCheck, argsCheck, dbusErrors) {
  console.log('\n=== D-Bus 修复验证报告 ===');
  
  const report = {
    timestamp: new Date().toISOString(),
    environmentVariables: envCheck,
    browserArguments: argsCheck,
    dbusErrorsDetected: dbusErrors.length,
    dbusErrors: dbusErrors,
    overallStatus: envCheck && argsCheck && dbusErrors.length === 0 ? 'SUCCESS' : 'NEEDS_ATTENTION'
  };
  
  console.log(`环境变量配置: ${envCheck ? '✅ 通过' : '❌ 失败'}`);
  console.log(`浏览器参数配置: ${argsCheck ? '✅ 通过' : '❌ 失败'}`);
  console.log(`D-Bus错误检测: ${dbusErrors.length === 0 ? '✅ 无错误' : `❌ 发现${dbusErrors.length}个错误`}`);
  
  if (dbusErrors.length > 0) {
    console.log('\n检测到的D-Bus错误:');
    dbusErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  console.log(`\n总体状态: ${report.overallStatus === 'SUCCESS' ? '🎉 修复成功' : '⚠️  需要进一步处理'}`);
  
  // 保存报告到文件
  const reportPath = path.join(__dirname, 'dbus-fix-verification-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n报告已保存到: ${reportPath}`);
  
  return report;
}

/**
 * 主验证函数
 */
async function main() {
  try {
    console.log('🔍 开始D-Bus错误修复验证...');
    
    // 检查环境变量
    const envCheck = checkEnvironmentVariables();
    
    // 检查浏览器参数
    const argsCheck = checkBrowserArgs();
    
    // 检查D-Bus目录
    checkDbusDirectories();
    
    // 测试浏览器启动
    const dbusErrors = await testBrowserLaunch();
    
    // 生成报告
    const report = generateReport(envCheck, argsCheck, dbusErrors);
    
    // 返回结果
    if (report.overallStatus === 'SUCCESS') {
      console.log('\n🎉 D-Bus错误修复验证成功！可以部署到生产环境。');
      process.exit(0);
    } else {
      console.log('\n⚠️  D-Bus错误修复验证未完全通过，请检查上述问题。');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 验证脚本执行失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行验证
if (require.main === module) {
  main();
}

module.exports = {
  checkEnvironmentVariables,
  checkBrowserArgs,
  checkDbusDirectories,
  testBrowserLaunch,
  generateReport
};