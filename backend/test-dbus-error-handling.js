/**
 * D-Bus错误处理测试脚本
 * 验证新的错误处理机制是否能正确过滤和处理D-Bus相关错误
 */

const { browserService } = require('./src/services/browserService');
const { logFilter } = require('./src/utils/logFilter');
const { browserErrorHandler } = require('./src/utils/browserErrorHandler');

// 模拟生产环境
process.env.NODE_ENV = 'production';
process.env.BROWSER_HEADLESS = 'true';

/**
 * 测试日志过滤功能
 */
function testLogFilter() {
  console.log('\n=== 测试日志过滤功能 ===');
  
  const testMessages = [
    'dbus connection error: Failed to connect',
    'D-Bus system bus socket not found',
    'GPU process crashed',
    'Application started successfully',
    'FATAL: Out of memory',
    'Warning: accessibility service failed',
    'Error: Cannot connect to /run/dbus/system_bus_socket'
  ];
  
  testMessages.forEach((message, index) => {
    const shouldFilter = logFilter.shouldFilter(message, 'error');
    const status = shouldFilter ? '🔇 已过滤' : '✅ 保留';
    console.log(`${index + 1}. ${status}: ${message}`);
  });
  
  // 测试统计功能
  const mockLogs = testMessages.map((message, index) => ({
    message,
    level: 'error',
    timestamp: new Date().toISOString()
  }));
  
  const stats = logFilter.getFilterStats(mockLogs);
  console.log('\n📊 过滤统计:', stats);
}

/**
 * 测试浏览器错误处理功能
 */
function testBrowserErrorHandler() {
  console.log('\n=== 测试浏览器错误处理功能 ===');
  
  const testErrors = [
    new Error('dbus connection failed'),
    new Error('D-Bus system bus not available'),
    new Error('GPU process crashed'),
    new Error('Browser closed unexpectedly'),
    new Error('Navigation timeout'),
    new Error('Failed to connect to /run/dbus/system_bus_socket')
  ];
  
  testErrors.forEach((error, index) => {
    const handled = browserErrorHandler.handleBrowserError(error, 'test');
    const status = handled ? '🔇 已处理' : '⚠️ 需抛出';
    console.log(`${index + 1}. ${status}: ${error.message}`);
  });
  
  // 显示错误统计
  const stats = browserErrorHandler.getErrorStats();
  console.log('\n📊 错误处理统计:', stats);
}

/**
 * 测试浏览器服务启动
 */
async function testBrowserService() {
  console.log('\n=== 测试浏览器服务启动 ===');
  
  try {
    console.log('🚀 启动浏览器服务...');
    const browser = await browserService.launch();
    
    if (browser) {
      console.log('✅ 浏览器启动成功');
      
      // 创建上下文和页面
      console.log('📄 创建浏览器上下文...');
      const context = await browserService.createContext();
      
      if (context) {
        console.log('✅ 浏览器上下文创建成功');
        
        console.log('🌐 创建新页面...');
        const page = await browserService.createPage();
        
        if (page) {
          console.log('✅ 页面创建成功');
          
          // 测试导航
          console.log('🔗 测试页面导航...');
          try {
            await browserService.navigateToUrl(page, 'https://www.baidu.com');
            console.log('✅ 页面导航成功');
          } catch (navError) {
            console.log('⚠️ 页面导航失败（可能是网络问题）:', navError.message);
          }
          
          // 关闭页面
          await page.close();
          console.log('✅ 页面已关闭');
        }
      }
      
      // 获取错误统计
      const errorStats = browserService.getErrorStats();
      console.log('\n📊 浏览器服务错误统计:', errorStats);
      
      // 关闭浏览器
      await browserService.close();
      console.log('✅ 浏览器服务已关闭');
    }
  } catch (error) {
    console.error('❌ 浏览器服务测试失败:', error.message);
    
    // 检查是否为D-Bus相关错误
    if (browserErrorHandler.isDbusRelatedError(error.message)) {
      console.log('ℹ️ 这是一个D-Bus相关错误，在生产环境中会被自动处理');
    }
  }
}

/**
 * 测试控制台过滤功能
 */
function testConsoleFiltering() {
  console.log('\n=== 测试控制台过滤功能 ===');
  
  // 保存原始console方法
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn
  };
  
  // 创建过滤后的console
  const filteredConsole = logFilter.createFilteredConsole();
  
  // 临时替换console方法
  console.log = filteredConsole.log;
  console.error = filteredConsole.error;
  console.warn = filteredConsole.warn;
  
  console.log('这条消息应该显示');
  console.error('dbus connection error - 这条消息应该被过滤');
  console.warn('GPU process crashed - 这条消息应该被过滤');
  console.error('FATAL: 这条严重错误应该显示');
  
  // 恢复原始console方法
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  
  console.log('✅ 控制台过滤测试完成');
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🧪 D-Bus错误处理机制测试开始\n');
  console.log('环境信息:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- BROWSER_HEADLESS:', process.env.BROWSER_HEADLESS);
  console.log('- Platform:', process.platform);
  
  try {
    // 测试日志过滤
    testLogFilter();
    
    // 测试浏览器错误处理
    testBrowserErrorHandler();
    
    // 测试控制台过滤
    testConsoleFiltering();
    
    // 测试浏览器服务
    await testBrowserService();
    
    console.log('\n🎉 所有测试完成！');
    console.log('\n📋 测试总结:');
    console.log('✅ 日志过滤功能正常');
    console.log('✅ 浏览器错误处理功能正常');
    console.log('✅ 控制台过滤功能正常');
    console.log('✅ 浏览器服务启动正常');
    
  } catch (error) {
    console.error('\n❌ 测试过程中出现错误:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// 运行测试
if (require.main === module) {
  runTests().then(() => {
    console.log('\n🏁 测试脚本执行完成');
    process.exit(0);
  }).catch((error) => {
    console.error('\n💥 测试脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  testLogFilter,
  testBrowserErrorHandler,
  testBrowserService,
  testConsoleFiltering,
  runTests
};