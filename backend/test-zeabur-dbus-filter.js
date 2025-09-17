/**
 * Zeabur D-Bus 错误过滤测试
 * 验证日志过滤器在生产环境配置下的工作效果
 */

const { logFilter } = require('./src/utils/logFilter.js');

// 模拟 Zeabur 生产环境
process.env.NODE_ENV = 'production';
process.env.ENABLE_LOG_FILTER = 'true';
process.env.CONTAINER = 'true';
process.env.ZEABUR = 'true';

// 用户报告的实际 D-Bus 错误消息
const zeaburDbusErrors = [
  '[pid=5387][err] [0917/033310.728010:ERROR:dbus/bus.cc:408] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory',
  '[pid=5387][err] [0917/033310.729001:ERROR:dbus/bus.cc:408] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory',
  '[pid=5387][err] [0917/033310.729097:ERROR:dbus/bus.cc:408] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory'
];

// 其他可能的系统错误
const otherSystemErrors = [
  '[pid=5387][err] [0917/033310.730000:ERROR:gpu/ipc/client/gpu_channel_host.cc:123] Failed to send GpuControl.CreateCommandBuffer',
  '[pid=5387][warn] [0917/033310.731000:WARNING:sandbox/linux/seccomp_bpf_helpers.cc:365] Missing expected syscall',
  '[pid=5387][info] [0917/033310.732000:INFO:CONSOLE(1)] "Application started successfully"',
  '[pid=5387][err] [0917/033310.733000:FATAL] Critical application error - this should not be filtered'
];

/**
 * 测试日志过滤器功能
 */
function testLogFilter() {
  console.log('\n=== Zeabur D-Bus 错误过滤测试 ===\n');
  
  // 测试 D-Bus 错误过滤
  console.log('1. 测试 D-Bus 错误过滤:');
  zeaburDbusErrors.forEach((error, index) => {
    const shouldFilter = logFilter.shouldFilter(error, 'error');
    const isDbusError = logFilter.isDbusError(error);
    console.log(`   错误 ${index + 1}: ${shouldFilter ? '✅ 已过滤' : '❌ 未过滤'} (D-Bus: ${isDbusError})`);
  });
  
  // 测试其他系统错误
  console.log('\n2. 测试其他系统错误:');
  otherSystemErrors.forEach((error, index) => {
    const shouldFilter = logFilter.shouldFilter(error, getLogLevel(error));
    const isCritical = logFilter.isCriticalError(error);
    const level = getLogLevel(error);
    console.log(`   错误 ${index + 1} (${level}): ${shouldFilter ? '✅ 已过滤' : '❌ 未过滤'} (严重: ${isCritical})`);
  });
  
  // 综合统计测试
  console.log('\n3. 综合过滤统计:');
  const allLogs = [
    ...zeaburDbusErrors.map(msg => ({ message: msg, level: 'error' })),
    ...otherSystemErrors.map(msg => ({ message: msg, level: getLogLevel(msg) }))
  ];
  
  const stats = logFilter.getFilterStats(allLogs);
  console.log(`   总日志数: ${stats.total}`);
  console.log(`   已过滤: ${stats.filtered}`);
  console.log(`   D-Bus过滤: ${stats.dbusFiltered}`);
  console.log(`   系统警告过滤: ${stats.systemWarningFiltered}`);
  console.log(`   剩余显示: ${stats.remaining}`);
  console.log(`   过滤率: ${stats.filterRate}`);
  
  // 测试过滤后的结果
  console.log('\n4. 过滤后剩余的日志:');
  const filteredLogs = logFilter.filterLogs(allLogs);
  if (filteredLogs.length === 0) {
    console.log('   ✅ 所有系统错误和警告都被正确过滤');
  } else {
    console.log('   剩余日志:');
    filteredLogs.forEach((log, index) => {
      console.log(`   ${index + 1}. [${log.level}] ${log.message}`);
    });
  }
  
  // 验证严重错误不被过滤
  console.log('\n5. 验证严重错误保护:');
  const criticalTest = allLogs.filter(log => logFilter.isCriticalError(log.message));
  if (criticalTest.length > 0) {
    console.log(`   ✅ 发现 ${criticalTest.length} 个严重错误，确保不被过滤`);
    criticalTest.forEach(log => {
      const shouldFilter = logFilter.shouldFilter(log.message, log.level);
      console.log(`   - ${shouldFilter ? '❌ 错误：严重错误被过滤了' : '✅ 正确：严重错误未被过滤'}`);
    });
  }
}

/**
 * 从错误消息中提取日志级别
 */
function getLogLevel(message) {
  if (message.includes('FATAL') || message.includes('CRITICAL')) return 'error';
  if (message.includes('ERROR')) return 'error';
  if (message.includes('WARNING') || message.includes('WARN')) return 'warn';
  if (message.includes('INFO')) return 'info';
  return 'info';
}

/**
 * 测试控制台过滤效果
 */
function testConsoleFiltering() {
  console.log('\n=== 控制台过滤效果测试 ===\n');
  
  console.log('测试前 - 以下D-Bus错误应该在生产环境中被过滤:');
  
  // 模拟生产环境日志输出
  const originalConsoleError = console.error;
  let filteredCount = 0;
  let totalCount = 0;
  
  // 重写console.error来统计过滤效果
  console.error = function(...args) {
    totalCount++;
    const message = args.join(' ');
    if (logFilter.shouldFilter(message, 'error')) {
      filteredCount++;
      // 在测试中显示被过滤的消息
      originalConsoleError(`[已过滤] ${message}`);
    } else {
      originalConsoleError(...args);
    }
  };
  
  // 输出测试错误
  zeaburDbusErrors.forEach(error => {
    console.error(error);
  });
  
  // 恢复原始console.error
  console.error = originalConsoleError;
  
  console.log(`\n过滤统计: ${filteredCount}/${totalCount} 个错误被过滤`);
  
  return filteredCount === totalCount;
}

// 运行测试
if (require.main === module) {
  try {
    testLogFilter();
    const consoleTestPassed = testConsoleFiltering();
    
    console.log('\n=== 测试总结 ===');
    console.log(`环境: NODE_ENV=${process.env.NODE_ENV}`);
    console.log(`日志过滤: ENABLE_LOG_FILTER=${process.env.ENABLE_LOG_FILTER}`);
    console.log(`容器环境: CONTAINER=${process.env.CONTAINER}`);
    console.log(`Zeabur平台: ZEABUR=${process.env.ZEABUR}`);
    console.log(`控制台过滤测试: ${consoleTestPassed ? '✅ 通过' : '❌ 失败'}`);
    
    if (consoleTestPassed) {
      console.log('\n🎉 Zeabur D-Bus 错误过滤配置正确！');
      console.log('建议在 Zeabur 控制台中应用优化后的环境变量配置。');
    } else {
      console.log('\n⚠️  过滤器配置需要调整。');
    }
    
  } catch (error) {
    console.error('测试执行失败:', error);
    process.exit(1);
  }
}

module.exports = {
  testLogFilter,
  testConsoleFiltering,
  zeaburDbusErrors,
  otherSystemErrors
};