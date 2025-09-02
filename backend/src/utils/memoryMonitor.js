/**
 * 内存监控器
 * 实时监控应用内存使用情况
 */
class MemoryMonitor {
  constructor() {
    this.monitoringInterval = null;
    this.memoryHistory = [];
    this.maxHistorySize = 100; // 保留最近100次记录
    this.alertThresholds = {
      heapUsed: 500, // MB
      rss: 1000, // MB
      external: 100 // MB
    };
  }

  /**
   * 开始内存监控
   */
  startMonitoring(intervalMs = 10000) {
    console.log(`📊 开始内存监控，间隔: ${intervalMs}ms`);
    
    this.monitoringInterval = setInterval(() => {
      this.recordMemoryUsage();
    }, intervalMs);
  }

  /**
   * 停止内存监控
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('📊 内存监控已停止');
    }
  }

  /**
   * 记录内存使用情况
   */
  recordMemoryUsage() {
    const memUsage = process.memoryUsage();
    const timestamp = new Date();
    
    const record = {
      timestamp,
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100, // MB
      rss: Math.round(memUsage.rss / 1024 / 1024 * 100) / 100, // MB
      external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100, // MB
      arrayBuffers: Math.round(memUsage.arrayBuffers / 1024 / 1024 * 100) / 100 // MB
    };
    
    // 添加到历史记录
    this.memoryHistory.push(record);
    
    // 保持历史记录大小
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }
    
    // 检查内存警告
    this.checkMemoryAlerts(record);
    
    return record;
  }

  /**
   * 检查内存警告
   */
  checkMemoryAlerts(record) {
    const alerts = [];
    
    if (record.heapUsed > this.alertThresholds.heapUsed) {
      alerts.push(`堆内存使用过高: ${record.heapUsed}MB`);
    }
    
    if (record.rss > this.alertThresholds.rss) {
      alerts.push(`RSS内存使用过高: ${record.rss}MB`);
    }
    
    if (record.external > this.alertThresholds.external) {
      alerts.push(`外部内存使用过高: ${record.external}MB`);
    }
    
    if (alerts.length > 0) {
      console.warn('⚠️ 内存使用警告:');
      alerts.forEach(alert => console.warn(`   - ${alert}`));
    }
  }

  /**
   * 获取内存使用统计
   */
  getMemoryStats() {
    if (this.memoryHistory.length === 0) {
      return null;
    }
    
    const latest = this.memoryHistory[this.memoryHistory.length - 1];
    const oldest = this.memoryHistory[0];
    
    const heapUsedValues = this.memoryHistory.map(r => r.heapUsed);
    const rssValues = this.memoryHistory.map(r => r.rss);
    
    return {
      current: latest,
      trend: {
        heapUsed: {
          min: Math.min(...heapUsedValues),
          max: Math.max(...heapUsedValues),
          avg: heapUsedValues.reduce((a, b) => a + b, 0) / heapUsedValues.length
        },
        rss: {
          min: Math.min(...rssValues),
          max: Math.max(...rssValues),
          avg: rssValues.reduce((a, b) => a + b, 0) / rssValues.length
        }
      },
      duration: latest.timestamp - oldest.timestamp,
      recordCount: this.memoryHistory.length
    };
  }

  /**
   * 获取内存使用历史
   */
  getMemoryHistory() {
    return [...this.memoryHistory];
  }

  /**
   * 设置警告阈值
   */
  setAlertThresholds(thresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
    console.log('📊 内存警告阈值已更新:', this.alertThresholds);
  }
}

module.exports = new MemoryMonitor();