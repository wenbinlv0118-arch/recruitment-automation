/**
 * 启动性能分析器
 * 测量和分析应用启动各阶段的耗时
 */
class StartupPerformanceAnalyzer {
  constructor() {
    this.startTime = Date.now();
    this.checkpoints = new Map();
    this.moduleLoadTimes = new Map();
    this.isAnalyzing = true;
  }

  /**
   * 记录检查点
   */
  checkpoint(name, description = '') {
    if (!this.isAnalyzing) return;
    
    const now = Date.now();
    const elapsed = now - this.startTime;
    
    this.checkpoints.set(name, {
      timestamp: now,
      elapsed,
      description
    });
    
    console.log(`⏱️ [${elapsed}ms] ${name}${description ? ': ' + description : ''}`);
  }

  /**
   * 记录模块加载时间
   */
  recordModuleLoad(moduleName, loadTime) {
    if (!this.isAnalyzing) return;
    
    this.moduleLoadTimes.set(moduleName, loadTime);
  }

  /**
   * 完成启动分析
   */
  finishAnalysis() {
    if (!this.isAnalyzing) return;
    
    this.isAnalyzing = false;
    const totalTime = Date.now() - this.startTime;
    
    console.log('\n📊 启动性能分析完成');
    console.log(`⏱️ 总启动时间: ${totalTime}ms`);
    
    return {
      totalTime,
      checkpoints: Object.fromEntries(this.checkpoints),
      moduleLoadTimes: Object.fromEntries(this.moduleLoadTimes)
    };
  }

  /**
   * 获取启动统计
   */
  getStats() {
    return {
      totalTime: Date.now() - this.startTime,
      checkpoints: Object.fromEntries(this.checkpoints),
      moduleLoadTimes: Object.fromEntries(this.moduleLoadTimes),
      isAnalyzing: this.isAnalyzing
    };
  }
}

// 创建全局实例
const startupAnalyzer = new StartupPerformanceAnalyzer();
startupAnalyzer.checkpoint('analyzer_initialized', '启动性能分析器已初始化');

module.exports = startupAnalyzer;