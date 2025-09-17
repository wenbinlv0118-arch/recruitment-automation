/**
 * 生产环境D-Bus错误过滤测试
 * 测试实际生产环境中出现的D-Bus错误是否能被正确过滤
 */

const { logFilter } = require('./src/utils/logFilter');

/**
 * 测试生产环境实际错误消息
 */
function testProductionErrors() {
  console.log('🧪 测试生产环境实际D-Bus错误过滤\n');
  
  // 用户报告的实际错误消息
  const productionErrors = [
    '[pid=70][err] [0917/031038.411663:ERROR:dbus/bus.cc:408] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory',
    '[pid=70][err] [0917/031038.427143:ERROR:dbus/bus.cc:408] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory',
    '[pid=70][err] [0917/031038.428098:ERROR:dbus/bus.cc:408] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory',
    '[pid=70][err] [0917/031038.721010:WARNING:device/bluetooth/dbus/bluez_dbus_manager.cc:228] Floss manager service not available, cannot set Floss enable/disable.',
    '[pid=70][err] [0917/031038.814594:ERROR:gpu/ipc/client/command_buffer_proxy_impl.cc:127] ContextResult::kTransientFailure: Failed to send GpuControl.CreateCommandBuffer.'
  ];
  
  console.log('📋 测试结果:');
  productionErrors.forEach((error, index) => {
    const shouldFilter = logFilter.shouldFilter(error, 'error');
    const status = shouldFilter ? '🔇 已过滤' : '⚠️ 未过滤';
    const result = shouldFilter ? '✅ 正确' : '❌ 需要修复';
    
    console.log(`${index + 1}. ${status} ${result}`);
    console.log(`   消息: ${error.substring(0, 100)}...`);
    console.log('');
  });
  
  // 统计过滤效果
  const filteredCount = productionErrors.filter(error => 
    logFilter.shouldFilter(error, 'error')
  ).length;
  
  console.log(`📊 过滤统计: ${filteredCount}/${productionErrors.length} 条错误被过滤`);
  
  if (filteredCount === productionErrors.length) {
    console.log('🎉 所有生产环境D-Bus错误都能被正确过滤！');
    return true;
  } else {
    console.log('⚠️ 仍有错误未被过滤，需要进一步优化过滤规则');
    return false;
  }
}

/**
 * 测试过滤器的具体模式匹配
 */
function testPatternMatching() {
  console.log('\n🔍 测试过滤器模式匹配详情\n');
  
  const testCases = [
    {
      message: 'bus.cc:408] Failed to connect',
      expectedFilter: true,
      description: 'bus.cc错误模式'
    },
    {
      message: '/run/dbus/system_bus_socket: No such file',
      expectedFilter: true,
      description: 'system_bus_socket路径模式'
    },
    {
      message: 'bluez_dbus_manager.cc:228] Floss manager service not available',
      expectedFilter: true,
      description: 'bluez_dbus_manager模式'
    },
    {
      message: 'ContextResult::kTransientFailure: Failed to send GpuControl',
      expectedFilter: true,
      description: 'GPU命令缓冲区错误模式'
    },
    {
      message: 'FATAL: Application crashed',
      expectedFilter: false,
      description: '严重错误（不应过滤）'
    }
  ];
  
  testCases.forEach((testCase, index) => {
    const actualFilter = logFilter.shouldFilter(testCase.message, 'error');
    const isCorrect = actualFilter === testCase.expectedFilter;
    const status = isCorrect ? '✅ 正确' : '❌ 错误';
    
    console.log(`${index + 1}. ${status} ${testCase.description}`);
    console.log(`   期望: ${testCase.expectedFilter ? '过滤' : '保留'}, 实际: ${actualFilter ? '过滤' : '保留'}`);
    console.log(`   消息: ${testCase.message}`);
    console.log('');
  });
}

/**
 * 测试控制台过滤效果
 */
function testConsoleFiltering() {
  console.log('\n🖥️ 测试控制台过滤效果\n');
  
  // 模拟生产环境
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  
  // 保存原始console方法
  const originalConsole = {
    error: console.error,
    warn: console.warn,
    log: console.log
  };
  
  // 创建过滤后的console
  const filteredConsole = logFilter.createFilteredConsole();
  
  // 临时替换console方法
  console.error = filteredConsole.error;
  console.warn = filteredConsole.warn;
  console.log = filteredConsole.log;
  
  console.log('开始测试控制台过滤...');
  
  // 测试D-Bus错误（应该被过滤）
  console.error('[pid=70][err] [0917/031038.411663:ERROR:dbus/bus.cc:408] Failed to connect to the bus');
  console.error('[pid=70][err] [0917/031038.721010:WARNING:device/bluetooth/dbus/bluez_dbus_manager.cc:228] Floss manager service not available');
  
  // 测试正常错误（应该显示）
  console.error('这是一个正常的错误消息，应该显示');
  
  // 测试严重错误（应该显示）
  console.error('FATAL: 这是一个严重错误，必须显示');
  
  // 恢复原始console方法
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  console.log = originalConsole.log;
  
  // 恢复环境变量
  process.env.NODE_ENV = originalEnv;
  
  console.log('控制台过滤测试完成');
}

/**
 * 主测试函数
 */
function runTests() {
  console.log('🚀 开始生产环境D-Bus错误过滤测试\n');
  
  try {
    // 测试生产环境实际错误
    const productionTestPassed = testProductionErrors();
    
    // 测试模式匹配
    testPatternMatching();
    
    // 测试控制台过滤
    testConsoleFiltering();
    
    console.log('\n📋 测试总结:');
    if (productionTestPassed) {
      console.log('✅ 生产环境D-Bus错误过滤测试通过');
      console.log('✅ 所有报告的错误都能被正确过滤');
      console.log('✅ 日志过滤器工作正常');
    } else {
      console.log('❌ 生产环境D-Bus错误过滤测试失败');
      console.log('❌ 需要进一步优化过滤规则');
    }
    
    return productionTestPassed;
    
  } catch (error) {
    console.error('\n❌ 测试过程中出现错误:', error.message);
    console.error('Stack trace:', error.stack);
    return false;
  }
}

// 运行测试
if (require.main === module) {
  runTests().then ? runTests().then((success) => {
    console.log('\n🏁 测试完成');
    process.exit(success ? 0 : 1);
  }).catch((error) => {
    console.error('\n💥 测试执行失败:', error);
    process.exit(1);
  }) : (() => {
    const success = runTests();
    console.log('\n🏁 测试完成');
    process.exit(success ? 0 : 1);
  })();
}

module.exports = {
  testProductionErrors,
  testPatternMatching,
  testConsoleFiltering,
  runTests
};