/**
 * 性能指标收集和分析工具
 * 实现延迟测量、帧率统计、内存监控等功能
 */

const os = require('os');
const { performance } = require('perf_hooks');
const logger = require('../src/utils/logger');

class PerformanceMetrics {
  constructor() {
    this.metrics = {
      latency: {
        measurements: [],
        stats: null
      },
      frameRate: {
        measurements: [],
        stats: null
      },
      memory: {
        measurements: [],
        stats: null
      },
      cpu: {
        measurements: [],
        stats: null
      },
      network: {
        measurements: [],
        stats: null
      },
      bandwidth: {
        measurements: [],
        stats: null
      }
    };
    
    this.isMonitoring = false;
    this.monitoringInterval = null;
    this.frameCounter = 0;
    this.lastFrameTime = performance.now();
    this.networkStats = {
      totalRequests: 0,
      totalBytes: 0,
      requestTimes: []
    };
  }

  /**
   * 开始性能监控
   * @param {Object} options - 监控选项
   */
  startMonitoring(options = {}) {
    if (this.isMonitoring) {
      logger.warn('性能监控已在运行中');
      return;
    }

    const {
      interval = 1000, // 监控间隔（毫秒）
      enableMemory = true,
      enableCPU = true,
      enableNetwork = true,
      enableFrameRate = true
    } = options;

    this.isMonitoring = true;
    logger.info('开始性能监控', { interval, enableMemory, enableCPU, enableNetwork });

    // 重置计数器
    this.frameCounter = 0;
    this.lastFrameTime = performance.now();
    this.networkStats = {
      totalRequests: 0,
      totalBytes: 0,
      requestTimes: []
    };

    // 定期收集性能指标
    this.monitoringInterval = setInterval(() => {
      const timestamp = Date.now();
      
      if (enableMemory) {
        this.collectMemoryMetrics(timestamp);
      }
      
      if (enableCPU) {
        this.collectCPUMetrics(timestamp);
      }
      
      if (enableNetwork) {
        this.collectNetworkMetrics(timestamp);
      }
      
      if (enableFrameRate) {
        this.collectFrameRateMetrics(timestamp);
      }
      
    }, interval);
  }

  /**
   * 停止性能监控
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      logger.warn('性能监控未在运行');
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // 计算最终统计
    this.calculateAllStats();
    
    logger.info('性能监控已停止');
  }

  /**
   * 测量操作延迟
   * @param {Function} operation - 要测量的操作
   * @param {string} operationType - 操作类型
   * @param {Object} metadata - 额外元数据
   * @returns {Promise<Object>} 操作结果和延迟信息
   */
  async measureLatency(operation, operationType = 'unknown', metadata = {}) {
    const startTime = performance.now();
    const startTimestamp = Date.now();
    
    let result = null;
    let error = null;
    
    try {
      result = await operation();
    } catch (err) {
      error = err;
    }
    
    const endTime = performance.now();
    const latency = endTime - startTime;
    
    const measurement = {
      operationType,
      latency,
      timestamp: startTimestamp,
      success: !error,
      error: error ? error.message : null,
      metadata
    };
    
    this.metrics.latency.measurements.push(measurement);
    
    logger.debug(`延迟测量: ${operationType}`, {
      latency: `${latency.toFixed(2)}ms`,
      success: !error
    });
    
    if (error) {
      throw error;
    }
    
    return {
      result,
      latency,
      measurement
    };
  }

  /**
   * 记录帧率
   * @param {number} frameTime - 帧时间戳
   */
  recordFrame(frameTime = performance.now()) {
    this.frameCounter++;
    
    const timeSinceLastFrame = frameTime - this.lastFrameTime;
    
    if (timeSinceLastFrame >= 1000) { // 每秒计算一次帧率
      const fps = (this.frameCounter * 1000) / timeSinceLastFrame;
      
      this.metrics.frameRate.measurements.push({
        fps,
        timestamp: Date.now(),
        frameCount: this.frameCounter,
        duration: timeSinceLastFrame
      });
      
      this.frameCounter = 0;
      this.lastFrameTime = frameTime;
    }
  }

  /**
   * 收集内存指标
   * @param {number} timestamp - 时间戳
   */
  collectMemoryMetrics(timestamp) {
    const memUsage = process.memoryUsage();
    const systemMem = {
      total: os.totalmem(),
      free: os.freemem()
    };
    
    const measurement = {
      timestamp,
      process: {
        rss: memUsage.rss, // 常驻集大小
        heapTotal: memUsage.heapTotal, // 堆总大小
        heapUsed: memUsage.heapUsed, // 已使用堆大小
        external: memUsage.external, // 外部内存
        arrayBuffers: memUsage.arrayBuffers // ArrayBuffer大小
      },
      system: {
        total: systemMem.total,
        free: systemMem.free,
        used: systemMem.total - systemMem.free,
        usagePercent: ((systemMem.total - systemMem.free) / systemMem.total) * 100
      }
    };
    
    this.metrics.memory.measurements.push(measurement);
  }

  /**
   * 收集CPU指标
   * @param {number} timestamp - 时间戳
   */
  collectCPUMetrics(timestamp) {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    
    // 计算CPU使用率
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~(100 * idle / total);
    
    const measurement = {
      timestamp,
      usage, // CPU使用率百分比
      loadAverage: {
        '1min': loadAvg[0],
        '5min': loadAvg[1],
        '15min': loadAvg[2]
      },
      coreCount: cpus.length,
      model: cpus[0].model,
      speed: cpus[0].speed
    };
    
    this.metrics.cpu.measurements.push(measurement);
  }

  /**
   * 收集网络指标
   * @param {number} timestamp - 时间戳
   */
  collectNetworkMetrics(timestamp) {
    const measurement = {
      timestamp,
      totalRequests: this.networkStats.totalRequests,
      totalBytes: this.networkStats.totalBytes,
      averageRequestTime: this.networkStats.requestTimes.length > 0 
        ? this.networkStats.requestTimes.reduce((sum, time) => sum + time, 0) / this.networkStats.requestTimes.length
        : 0,
      requestsPerSecond: this.calculateRequestsPerSecond(),
      bytesPerSecond: this.calculateBytesPerSecond()
    };
    
    this.metrics.network.measurements.push(measurement);
  }

  /**
   * 收集帧率指标
   * @param {number} timestamp - 时间戳
   */
  collectFrameRateMetrics(timestamp) {
    // 帧率指标在recordFrame方法中收集
    // 这里可以添加额外的帧率分析逻辑
  }

  /**
   * 记录网络请求
   * @param {Object} requestInfo - 请求信息
   */
  recordNetworkRequest(requestInfo) {
    const {
      url,
      method = 'GET',
      responseTime,
      responseSize = 0,
      statusCode,
      success = true
    } = requestInfo;
    
    this.networkStats.totalRequests++;
    this.networkStats.totalBytes += responseSize;
    
    if (responseTime) {
      this.networkStats.requestTimes.push(responseTime);
    }
    
    // 保持请求时间数组大小在合理范围内
    if (this.networkStats.requestTimes.length > 1000) {
      this.networkStats.requestTimes = this.networkStats.requestTimes.slice(-500);
    }
  }

  /**
   * 测量带宽使用
   * @param {Function} operation - 网络操作
   * @param {string} operationType - 操作类型
   * @returns {Promise<Object>} 带宽测量结果
   */
  async measureBandwidth(operation, operationType = 'unknown') {
    const startTime = performance.now();
    const startBytes = this.networkStats.totalBytes;
    
    let result = null;
    let error = null;
    
    try {
      result = await operation();
    } catch (err) {
      error = err;
    }
    
    const endTime = performance.now();
    const endBytes = this.networkStats.totalBytes;
    
    const duration = endTime - startTime;
    const bytesTransferred = endBytes - startBytes;
    const bandwidth = duration > 0 ? (bytesTransferred / duration) * 1000 : 0; // bytes/second
    
    const measurement = {
      operationType,
      duration,
      bytesTransferred,
      bandwidth,
      timestamp: Date.now(),
      success: !error
    };
    
    this.metrics.bandwidth.measurements.push(measurement);
    
    if (error) {
      throw error;
    }
    
    return {
      result,
      bandwidth,
      bytesTransferred,
      duration,
      measurement
    };
  }

  /**
   * 计算每秒请求数
   * @returns {number} 每秒请求数
   */
  calculateRequestsPerSecond() {
    const recentMeasurements = this.metrics.network.measurements.slice(-10);
    if (recentMeasurements.length < 2) return 0;
    
    const timeSpan = recentMeasurements[recentMeasurements.length - 1].timestamp - recentMeasurements[0].timestamp;
    const requestCount = recentMeasurements[recentMeasurements.length - 1].totalRequests - recentMeasurements[0].totalRequests;
    
    return timeSpan > 0 ? (requestCount / timeSpan) * 1000 : 0;
  }

  /**
   * 计算每秒字节数
   * @returns {number} 每秒字节数
   */
  calculateBytesPerSecond() {
    const recentMeasurements = this.metrics.network.measurements.slice(-10);
    if (recentMeasurements.length < 2) return 0;
    
    const timeSpan = recentMeasurements[recentMeasurements.length - 1].timestamp - recentMeasurements[0].timestamp;
    const byteCount = recentMeasurements[recentMeasurements.length - 1].totalBytes - recentMeasurements[0].totalBytes;
    
    return timeSpan > 0 ? (byteCount / timeSpan) * 1000 : 0;
  }

  /**
   * 计算所有指标的统计信息
   */
  calculateAllStats() {
    Object.keys(this.metrics).forEach(metricType => {
      this.metrics[metricType].stats = this.calculateStats(this.metrics[metricType].measurements, metricType);
    });
  }

  /**
   * 计算指标统计信息
   * @param {Array} measurements - 测量数据
   * @param {string} metricType - 指标类型
   * @returns {Object} 统计信息
   */
  calculateStats(measurements, metricType) {
    if (!measurements || measurements.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        median: 0,
        p95: 0,
        p99: 0
      };
    }

    let values = [];
    
    // 根据指标类型提取相应的数值
    switch (metricType) {
      case 'latency':
        values = measurements.filter(m => m.success).map(m => m.latency);
        break;
      case 'frameRate':
        values = measurements.map(m => m.fps);
        break;
      case 'memory':
        values = measurements.map(m => m.process.heapUsed);
        break;
      case 'cpu':
        values = measurements.map(m => m.usage);
        break;
      case 'network':
        values = measurements.map(m => m.averageRequestTime).filter(v => v > 0);
        break;
      case 'bandwidth':
        values = measurements.filter(m => m.success).map(m => m.bandwidth);
        break;
      default:
        values = measurements.map(m => m.value || 0);
    }
    
    if (values.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        median: 0,
        p95: 0,
        p99: 0
      };
    }
    
    values.sort((a, b) => a - b);
    
    const count = values.length;
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / count;
    const min = values[0];
    const max = values[count - 1];
    const median = this.calculatePercentile(values, 50);
    const p95 = this.calculatePercentile(values, 95);
    const p99 = this.calculatePercentile(values, 99);
    
    return {
      count,
      average,
      min,
      max,
      median,
      p95,
      p99,
      sum
    };
  }

  /**
   * 计算百分位数
   * @param {Array} sortedValues - 已排序的数值数组
   * @param {number} percentile - 百分位数 (0-100)
   * @returns {number} 百分位数值
   */
  calculatePercentile(sortedValues, percentile) {
    if (sortedValues.length === 0) return 0;
    if (sortedValues.length === 1) return sortedValues[0];
    
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedValues[lower];
    }
    
    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  /**
   * 获取性能报告
   * @param {Object} options - 报告选项
   * @returns {Object} 性能报告
   */
  getPerformanceReport(options = {}) {
    const {
      includeRawData = false,
      timeRange = null // { start: timestamp, end: timestamp }
    } = options;
    
    // 如果指定了时间范围，过滤数据
    let filteredMetrics = this.metrics;
    if (timeRange) {
      filteredMetrics = this.filterMetricsByTimeRange(this.metrics, timeRange);
    }
    
    // 重新计算统计信息
    const report = {
      timestamp: Date.now(),
      timeRange,
      summary: {},
      details: {}
    };
    
    Object.keys(filteredMetrics).forEach(metricType => {
      const stats = this.calculateStats(filteredMetrics[metricType].measurements, metricType);
      
      report.summary[metricType] = {
        count: stats.count,
        average: stats.average,
        p95: stats.p95
      };
      
      report.details[metricType] = {
        stats,
        measurements: includeRawData ? filteredMetrics[metricType].measurements : []
      };
    });
    
    return report;
  }

  /**
   * 按时间范围过滤指标
   * @param {Object} metrics - 原始指标
   * @param {Object} timeRange - 时间范围
   * @returns {Object} 过滤后的指标
   */
  filterMetricsByTimeRange(metrics, timeRange) {
    const filtered = {};
    
    Object.keys(metrics).forEach(metricType => {
      filtered[metricType] = {
        measurements: metrics[metricType].measurements.filter(m => 
          m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
        ),
        stats: null
      };
    });
    
    return filtered;
  }

  /**
   * 重置所有指标
   */
  reset() {
    Object.keys(this.metrics).forEach(metricType => {
      this.metrics[metricType].measurements = [];
      this.metrics[metricType].stats = null;
    });
    
    this.frameCounter = 0;
    this.lastFrameTime = performance.now();
    this.networkStats = {
      totalRequests: 0,
      totalBytes: 0,
      requestTimes: []
    };
    
    logger.info('性能指标已重置');
  }

  /**
   * 导出指标数据
   * @param {string} format - 导出格式 (json/csv)
   * @returns {string} 导出的数据
   */
  exportMetrics(format = 'json') {
    const report = this.getPerformanceReport({ includeRawData: true });
    
    if (format === 'json') {
      return JSON.stringify(report, null, 2);
    } else if (format === 'csv') {
      return this.convertToCSV(report);
    } else {
      throw new Error(`不支持的导出格式: ${format}`);
    }
  }

  /**
   * 转换为CSV格式
   * @param {Object} report - 性能报告
   * @returns {string} CSV数据
   */
  convertToCSV(report) {
    const csvLines = [];
    
    // 添加标题行
    csvLines.push('MetricType,Timestamp,Value,Additional');
    
    // 添加数据行
    Object.keys(report.details).forEach(metricType => {
      const measurements = report.details[metricType].measurements;
      measurements.forEach(measurement => {
        const timestamp = measurement.timestamp;
        let value = '';
        let additional = '';
        
        switch (metricType) {
          case 'latency':
            value = measurement.latency;
            additional = `${measurement.operationType},${measurement.success}`;
            break;
          case 'frameRate':
            value = measurement.fps;
            additional = `${measurement.frameCount}`;
            break;
          case 'memory':
            value = measurement.process.heapUsed;
            additional = `${measurement.process.heapTotal},${measurement.system.usagePercent}`;
            break;
          case 'cpu':
            value = measurement.usage;
            additional = `${measurement.loadAverage['1min']}`;
            break;
          case 'network':
            value = measurement.averageRequestTime;
            additional = `${measurement.totalRequests},${measurement.totalBytes}`;
            break;
          case 'bandwidth':
            value = measurement.bandwidth;
            additional = `${measurement.bytesTransferred},${measurement.duration}`;
            break;
        }
        
        csvLines.push(`${metricType},${timestamp},${value},"${additional}"`);
      });
    });
    
    return csvLines.join('\n');
  }
}

// 创建全局实例
const performanceMetrics = new PerformanceMetrics();

module.exports = {
  performanceMetrics,
  PerformanceMetrics
};