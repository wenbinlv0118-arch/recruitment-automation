const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * 性能监控器
 * 实时监控系统性能指标
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      cpu: [],
      memory: [],
      response_times: []
    };
    this.logFile = path.join(__dirname, 'performance.log');
    this.isRunning = false;
  }

  /**
   * 启动性能监控
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ 性能监控已在运行中');
      return;
    }

    this.isRunning = true;
    console.log('🚀 启动性能监控...');
    
    // 每5秒收集一次指标
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, 5000);

    // 每分钟生成一次报告
    this.reportIntervalId = setInterval(() => {
      this.generateReport();
    }, 60000);

    // 优雅关闭
    process.on('SIGINT', () => {
      this.stop();
    });
  }

  /**
   * 停止性能监控
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    clearInterval(this.intervalId);
    clearInterval(this.reportIntervalId);
    
    this.generateFinalReport();
    console.log('🛑 性能监控已停止');
    process.exit(0);
  }

  /**
   * 收集性能指标
   */
  collectMetrics() {
    const timestamp = Date.now();
    
    // CPU使用率
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (let type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    
    this.metrics.cpu.push({
      timestamp,
      value: usage
    });

    // 内存使用情况
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    this.metrics.memory.push({
      timestamp,
      heap_used: memUsage.heapUsed / 1024 / 1024, // MB
      heap_total: memUsage.heapTotal / 1024 / 1024, // MB
      rss: memUsage.rss / 1024 / 1024, // MB
      external: memUsage.external / 1024 / 1024, // MB
      system_used: usedMem / 1024 / 1024, // MB
      system_total: totalMem / 1024 / 1024, // MB
      system_percent: (usedMem / totalMem) * 100
    });

    // 保持最近100个数据点
    if (this.metrics.cpu.length > 100) {
      this.metrics.cpu = this.metrics.cpu.slice(-100);
    }
    if (this.metrics.memory.length > 100) {
      this.metrics.memory = this.metrics.memory.slice(-100);
    }
  }

  /**
   * 生成性能报告
   */
  generateReport() {
    const timestamp = new Date().toISOString();
    const report = {
      timestamp,
      cpu_avg: this.calculateAverage(this.metrics.cpu),
      memory_stats: this.calculateMemoryStats()
    };

    const logEntry = `[${timestamp}] CPU: ${report.cpu_avg}% | Memory: ${report.memory_stats.current_heap_mb}MB
`;
    fs.appendFileSync(this.logFile, logEntry);

    console.log(`📊 [${timestamp}] CPU: ${report.cpu_avg}% | Heap: ${report.memory_stats.current_heap_mb}MB | RSS: ${report.memory_stats.current_rss_mb}MB`);
  }

  /**
   * 计算平均值
   */
  calculateAverage(data) {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, item) => acc + item.value, 0);
    return (sum / data.length).toFixed(2);
  }

  /**
   * 计算内存统计
   */
  calculateMemoryStats() {
    if (this.metrics.memory.length === 0) return {};

    const latest = this.metrics.memory[this.metrics.memory.length - 1];
    const avg_heap = this.metrics.memory.reduce((acc, item) => acc + item.heap_used, 0) / this.metrics.memory.length;
    
    return {
      current_heap_mb: latest.heap_used.toFixed(2),
      current_rss_mb: latest.rss.toFixed(2),
      avg_heap_mb: avg_heap.toFixed(2),
      system_memory_percent: latest.system_percent.toFixed(2)
    };
  }

  /**
   * 生成最终报告
   */
  generateFinalReport() {
    const report = {
      session_duration: process.uptime(),
      total_samples: this.metrics.cpu.length,
      avg_cpu: this.calculateAverage(this.metrics.cpu),
      memory_stats: this.calculateMemoryStats(),
      peak_memory: Math.max(...this.metrics.memory.map(m => m.heap_used)).toFixed(2)
    };

    console.log('📋 最终性能报告:', JSON.stringify(report, null, 2));

    const finalLogEntry = `
=== SESSION SUMMARY ===
${JSON.stringify(report, null, 2)}

`;
    fs.appendFileSync(this.logFile, finalLogEntry);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const monitor = new PerformanceMonitor();
  monitor.start();
  
  console.log('性能监控已启动，按 Ctrl+C 停止');
}

module.exports = PerformanceMonitor;
