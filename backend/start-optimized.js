#!/usr/bin/env node

/**
 * 优化的应用启动脚本
 * 包含内存优化和监控功能
 */

// 导入优化工具
const gcOptimizer = require('./src/utils/gcOptimizer');
const memoryMonitor = require('./src/utils/memoryMonitor');
const memoryLeakDetector = require('./src/utils/memoryLeakDetector');

// 设置进程标题
process.title = 'recruitment-automation-optimized';

// 启动内存监控
memoryMonitor.startMonitoring(10000); // 每10秒监控一次

// 启动内存泄漏检测
memoryLeakDetector.startDetection(60000); // 每分钟检测一次

// 设置内存警告阈值
memoryMonitor.setAlertThresholds({
  heapUsed: 400, // 400MB
  rss: 800, // 800MB
  external: 100 // 100MB
});

// 优雅关闭处理
process.on('SIGINT', () => {
  console.log('
🛑 收到关闭信号，正在优雅关闭...');
  
  // 停止监控
  memoryMonitor.stopMonitoring();
  memoryLeakDetector.stopDetection();
  
  // 输出最终内存统计
  const finalStats = memoryMonitor.getMemoryStats();
  if (finalStats) {
    console.log('📊 最终内存统计:', finalStats.current);
  }
  
  const gcStats = gcOptimizer.getGCStats();
  console.log('🗑️ 垃圾回收统计:', gcStats);
  
  // 强制垃圾回收
  gcOptimizer.forceGC();
  
  process.exit(0);
});

// 未捕获异常处理
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  
  // 生成堆快照用于调试
  memoryLeakDetector.generateHeapSnapshot();
  
  process.exit(1);
});

// 未处理的Promise拒绝
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  console.error('Promise:', promise);
});

// 内存使用警告
process.on('warning', (warning) => {
  if (warning.name === 'MaxListenersExceededWarning') {
    console.warn('⚠️ 事件监听器数量超出限制:', warning.message);
  }
});

// 启动主应用
console.log('🚀 启动优化版本的招聘自动化系统...');
console.log('📊 内存监控已启用');
console.log('🔍 内存泄漏检测已启用');
console.log('🗑️ 垃圾回收优化已启用');

// 导入并启动主应用
require('./src/index.js');