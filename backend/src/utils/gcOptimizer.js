/**
 * 垃圾回收优化器
 * 提供内存管理和垃圾回收优化功能
 */
class GarbageCollectionOptimizer {
  constructor() {
    this.gcStats = {
      collections: 0,
      totalTime: 0,
      lastCollection: null
    };
    
    // 启用垃圾回收监控
    this.enableGCMonitoring();
  }

  /**
   * 启用垃圾回收监控
   */
  enableGCMonitoring() {
    if (global.gc) {
      console.log('✅ 垃圾回收监控已启用');
      
      // 定期触发垃圾回收（在低负载时）
      setInterval(() => {
        this.performOptimalGC();
      }, 30000); // 每30秒检查一次
      
    } else {
      console.warn('⚠️ 垃圾回收监控未启用，请使用 --expose-gc 参数启动应用');
    }
  }

  /**
   * 执行优化的垃圾回收
   */
  performOptimalGC() {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
    const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;
    
    // 当堆内存使用率超过70%时触发垃圾回收
    if (heapUsagePercent > 70 && global.gc) {
      const startTime = Date.now();
      global.gc();
      const gcTime = Date.now() - startTime;
      
      this.gcStats.collections++;
      this.gcStats.totalTime += gcTime;
      this.gcStats.lastCollection = new Date();
      
      console.log(`🗑️ 垃圾回收完成: 耗时 ${gcTime}ms, 内存使用率从 ${heapUsagePercent.toFixed(1)}% 降低`);
    }
  }

  /**
   * 获取垃圾回收统计
   */
  getGCStats() {
    return {
      ...this.gcStats,
      averageGCTime: this.gcStats.collections > 0 ? 
        (this.gcStats.totalTime / this.gcStats.collections).toFixed(2) : 0
    };
  }

  /**
   * 强制执行垃圾回收
   */
  forceGC() {
    if (global.gc) {
      const startTime = Date.now();
      global.gc();
      const gcTime = Date.now() - startTime;
      console.log(`🗑️ 强制垃圾回收完成: 耗时 ${gcTime}ms`);
      return gcTime;
    } else {
      console.warn('⚠️ 垃圾回收不可用，请使用 --expose-gc 参数启动应用');
      return null;
    }
  }
}

module.exports = new GarbageCollectionOptimizer();