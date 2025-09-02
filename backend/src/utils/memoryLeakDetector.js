/**
 * 内存泄漏检测器
 * 检测和报告潜在的内存泄漏问题
 */
class MemoryLeakDetector {
  constructor() {
    this.baselineMemory = null;
    this.checkInterval = null;
    this.leakThreshold = 50; // MB
    this.checkCount = 0;
    this.maxChecks = 10;
    this.suspiciousGrowth = [];
  }

  /**
   * 开始内存泄漏检测
   */
  startDetection(intervalMs = 60000) {
    console.log('🔍 开始内存泄漏检测...');
    
    // 设置基线内存使用
    this.setBaseline();
    
    this.checkInterval = setInterval(() => {
      this.checkForLeaks();
    }, intervalMs);
  }

  /**
   * 停止内存泄漏检测
   */
  stopDetection() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🔍 内存泄漏检测已停止');
    }
  }

  /**
   * 设置内存基线
   */
  setBaseline() {
    const memUsage = process.memoryUsage();
    this.baselineMemory = {
      heapUsed: memUsage.heapUsed,
      rss: memUsage.rss,
      external: memUsage.external,
      timestamp: Date.now()
    };
    
    console.log('📊 内存基线已设置:', {
      heapUsed: Math.round(this.baselineMemory.heapUsed / 1024 / 1024) + 'MB',
      rss: Math.round(this.baselineMemory.rss / 1024 / 1024) + 'MB'
    });
  }

  /**
   * 检查内存泄漏
   */
  checkForLeaks() {
    if (!this.baselineMemory) {
      this.setBaseline();
      return;
    }
    
    const currentMemory = process.memoryUsage();
    const heapGrowth = (currentMemory.heapUsed - this.baselineMemory.heapUsed) / 1024 / 1024;
    const rssGrowth = (currentMemory.rss - this.baselineMemory.rss) / 1024 / 1024;
    
    this.checkCount++;
    
    const growthData = {
      timestamp: Date.now(),
      heapGrowth: Math.round(heapGrowth * 100) / 100,
      rssGrowth: Math.round(rssGrowth * 100) / 100,
      checkNumber: this.checkCount
    };
    
    this.suspiciousGrowth.push(growthData);
    
    // 保持最近的检查记录
    if (this.suspiciousGrowth.length > this.maxChecks) {
      this.suspiciousGrowth.shift();
    }
    
    // 检查是否存在持续增长
    if (this.checkCount >= 3) {
      const recentGrowth = this.suspiciousGrowth.slice(-3);
      const consistentGrowth = recentGrowth.every(g => g.heapGrowth > 0);
      const totalGrowth = recentGrowth[recentGrowth.length - 1].heapGrowth;
      
      if (consistentGrowth && totalGrowth > this.leakThreshold) {
        this.reportPotentialLeak(growthData, recentGrowth);
      }
    }
    
    // 定期重置基线（避免误报）
    if (this.checkCount % 20 === 0) {
      console.log('🔄 重置内存基线');
      this.setBaseline();
      this.checkCount = 0;
    }
  }

  /**
   * 报告潜在的内存泄漏
   */
  reportPotentialLeak(currentData, recentGrowth) {
    console.warn('⚠️ 检测到潜在的内存泄漏!');
    console.warn('📊 内存增长趋势:');
    
    recentGrowth.forEach(growth => {
      console.warn(`   检查 #${growth.checkNumber}: 堆内存增长 ${growth.heapGrowth}MB, RSS增长 ${growth.rssGrowth}MB`);
    });
    
    console.warn('🔧 建议操作:');
    console.warn('   1. 检查是否有未释放的事件监听器');
    console.warn('   2. 检查是否有循环引用');
    console.warn('   3. 检查缓存是否正确清理');
    console.warn('   4. 使用 heap dump 进行详细分析');
    
    // 可选：触发垃圾回收
    if (global.gc) {
      console.warn('🗑️ 尝试垃圾回收...');
      global.gc();
    }
  }

  /**
   * 获取内存增长报告
   */
  getGrowthReport() {
    return {
      baseline: this.baselineMemory,
      currentCheck: this.checkCount,
      recentGrowth: [...this.suspiciousGrowth],
      leakThreshold: this.leakThreshold
    };
  }

  /**
   * 生成堆快照（需要额外配置）
   */
  generateHeapSnapshot() {
    try {
      const v8 = require('v8');
      const fs = require('fs');
      const path = require('path');
      
      const snapshotPath = path.join(process.cwd(), `heap-snapshot-${Date.now()}.heapsnapshot`);
      const snapshot = v8.writeHeapSnapshot(snapshotPath);
      
      console.log(`📸 堆快照已生成: ${snapshot}`);
      return snapshot;
    } catch (error) {
      console.error('❌ 生成堆快照失败:', error.message);
      return null;
    }
  }
}

module.exports = new MemoryLeakDetector();