/**
 * 启动性能监控器
 * 持续监控应用启动性能
 */
class StartupPerformanceMonitor {
  constructor() {
    this.startupHistory = [];
    this.maxHistorySize = 50;
    this.performanceThresholds = {
      excellent: 2000, // 2秒
      good: 5000, // 5秒
      acceptable: 10000, // 10秒
      poor: 15000 // 15秒以上
    };
  }

  /**
   * 记录启动性能
   */
  recordStartupPerformance(metrics) {
    const record = {
      timestamp: new Date(),
      ...metrics,
      rating: this.calculatePerformanceRating(metrics.totalTime)
    };
    
    this.startupHistory.push(record);
    
    // 保持历史记录大小
    if (this.startupHistory.length > this.maxHistorySize) {
      this.startupHistory.shift();
    }
    
    this.logPerformanceRecord(record);
    return record;
  }

  /**
   * 计算性能评级
   */
  calculatePerformanceRating(totalTime) {
    if (totalTime <= this.performanceThresholds.excellent) {
      return 'excellent';
    } else if (totalTime <= this.performanceThresholds.good) {
      return 'good';
    } else if (totalTime <= this.performanceThresholds.acceptable) {
      return 'acceptable';
    } else {
      return 'poor';
    }
  }

  /**
   * 记录性能日志
   */
  logPerformanceRecord(record) {
    const emoji = {
      excellent: '🚀',
      good: '✅',
      acceptable: '⚠️',
      poor: '❌'
    };
    
    console.log(`\n${emoji[record.rating]} 启动性能记录:`);
    console.log(`   总时间: ${record.totalTime}ms`);
    console.log(`   评级: ${record.rating}`);
    console.log(`   时间: ${record.timestamp.toLocaleString()}`);
  }
}

module.exports = new StartupPerformanceMonitor();