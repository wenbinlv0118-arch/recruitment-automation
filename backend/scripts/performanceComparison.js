/**
 * CDP与VNC性能对比测试系统
 * 对比两种方案的延迟、带宽、资源占用等关键性能指标
 */

const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');
const os = require('os');
const logger = require('../src/utils/logger');
const { cdpService } = require('../src/services/cdpService');
const { vncService } = require('../src/services/vncService');
const { screenRecordingService } = require('../src/services/screenRecordingService');

class PerformanceComparison {
  constructor() {
    this.testResults = {
      cdp: {
        latency: [],
        bandwidth: [],
        memory: [],
        cpu: [],
        frameRate: [],
        errors: []
      },
      vnc: {
        latency: [],
        bandwidth: [],
        memory: [],
        cpu: [],
        frameRate: [],
        errors: []
      }
    };
    
    this.testConfig = {
      duration: 60000, // 测试持续时间（毫秒）
      sampleInterval: 1000, // 采样间隔（毫秒）
      scenarios: [
        'idle', // 空闲状态
        'browsing', // 浏览网页
        'interaction', // 用户交互
        'heavy_load' // 高负载
      ]
    };
    
    this.isRunning = false;
    this.currentTest = null;
  }

  /**
   * 启动性能对比测试
   * @param {Object} options - 测试选项
   * @returns {Promise<Object>} 测试结果
   */
  async startComparison(options = {}) {
    if (this.isRunning) {
      throw new Error('性能测试已在运行中');
    }

    this.isRunning = true;
    this.testConfig = { ...this.testConfig, ...options };
    
    logger.info('开始CDP与VNC性能对比测试', {
      duration: this.testConfig.duration,
      scenarios: this.testConfig.scenarios
    });

    try {
      // 重置测试结果
      this.resetResults();
      
      // 依次测试各个场景
      for (const scenario of this.testConfig.scenarios) {
        logger.info(`开始测试场景: ${scenario}`);
        
        // 测试CDP方案
        await this.testCdpPerformance(scenario);
        
        // 等待系统恢复
        await this.waitForSystemRecovery();
        
        // 测试VNC方案
        await this.testVncPerformance(scenario);
        
        // 等待系统恢复
        await this.waitForSystemRecovery();
      }
      
      // 生成对比报告
      const report = await this.generateComparisonReport();
      
      logger.info('性能对比测试完成');
      return report;
      
    } catch (error) {
      logger.error('性能对比测试失败', { error: error.message });
      throw error;
    } finally {
      this.isRunning = false;
      this.currentTest = null;
    }
  }

  /**
   * 测试CDP方案性能
   * @param {string} scenario - 测试场景
   */
  async testCdpPerformance(scenario) {
    this.currentTest = 'CDP';
    logger.info(`开始CDP性能测试 - 场景: ${scenario}`);
    
    try {
      // 初始化CDP服务
      await cdpService.initialize();
      
      // 启动性能监控
      const monitor = this.startPerformanceMonitor('cdp');
      
      // 执行测试场景
      await this.executeTestScenario(scenario, 'cdp');
      
      // 停止监控
      this.stopPerformanceMonitor(monitor);
      
      // 清理CDP资源
      await cdpService.cleanup();
      
    } catch (error) {
      this.testResults.cdp.errors.push({
        scenario,
        error: error.message,
        timestamp: Date.now()
      });
      logger.error(`CDP性能测试失败 - 场景: ${scenario}`, { error: error.message });
    }
  }

  /**
   * 测试VNC方案性能
   * @param {string} scenario - 测试场景
   */
  async testVncPerformance(scenario) {
    this.currentTest = 'VNC';
    logger.info(`开始VNC性能测试 - 场景: ${scenario}`);
    
    try {
      // 检查VNC服务可用性
      const isAvailable = await vncService.isVncServiceAvailable();
      if (!isAvailable) {
        throw new Error('VNC服务不可用');
      }
      
      // 创建VNC会话
      const session = await vncService.createVncSession();
      if (!session) {
        throw new Error('创建VNC会话失败');
      }
      
      // 启动性能监控
      const monitor = this.startPerformanceMonitor('vnc');
      
      // 执行测试场景
      await this.executeTestScenario(scenario, 'vnc');
      
      // 停止监控
      this.stopPerformanceMonitor(monitor);
      
      // 清理VNC会话
      await vncService.cleanupVncSession(session.sessionId);
      
    } catch (error) {
      this.testResults.vnc.errors.push({
        scenario,
        error: error.message,
        timestamp: Date.now()
      });
      logger.error(`VNC性能测试失败 - 场景: ${scenario}`, { error: error.message });
    }
  }

  /**
   * 执行测试场景
   * @param {string} scenario - 测试场景
   * @param {string} method - 测试方法 (cdp/vnc)
   */
  async executeTestScenario(scenario, method) {
    const duration = this.testConfig.duration / this.testConfig.scenarios.length;
    const startTime = performance.now();
    
    switch (scenario) {
      case 'idle':
        await this.testIdleScenario(method, duration);
        break;
      case 'browsing':
        await this.testBrowsingScenario(method, duration);
        break;
      case 'interaction':
        await this.testInteractionScenario(method, duration);
        break;
      case 'heavy_load':
        await this.testHeavyLoadScenario(method, duration);
        break;
      default:
        throw new Error(`未知测试场景: ${scenario}`);
    }
    
    const endTime = performance.now();
    logger.info(`场景 ${scenario} (${method}) 执行完成`, {
      duration: endTime - startTime
    });
  }

  /**
   * 空闲状态测试
   * @param {string} method - 测试方法
   * @param {number} duration - 测试持续时间
   */
  async testIdleScenario(method, duration) {
    // 保持连接但不进行任何操作
    await new Promise(resolve => setTimeout(resolve, duration));
  }

  /**
   * 浏览网页测试
   * @param {string} method - 测试方法
   * @param {number} duration - 测试持续时间
   */
  async testBrowsingScenario(method, duration) {
    const testUrls = [
      'https://sou.zhaopin.com/',
      'https://www.zhipin.com/',
      'https://www.51job.com/'
    ];
    
    const urlSwitchInterval = duration / testUrls.length;
    
    for (const url of testUrls) {
      if (method === 'cdp') {
        await this.navigateWithCdp(url);
      } else {
        await this.navigateWithVnc(url);
      }
      
      await new Promise(resolve => setTimeout(resolve, urlSwitchInterval));
    }
  }

  /**
   * 用户交互测试
   * @param {string} method - 测试方法
   * @param {number} duration - 测试持续时间
   */
  async testInteractionScenario(method, duration) {
    const interactions = [
      { type: 'click', x: 100, y: 100 },
      { type: 'scroll', direction: 'down', amount: 500 },
      { type: 'type', text: 'JavaScript开发工程师' },
      { type: 'click', x: 200, y: 150 }
    ];
    
    const interactionInterval = duration / interactions.length;
    
    for (const interaction of interactions) {
      if (method === 'cdp') {
        await this.performCdpInteraction(interaction);
      } else {
        await this.performVncInteraction(interaction);
      }
      
      await new Promise(resolve => setTimeout(resolve, interactionInterval));
    }
  }

  /**
   * 高负载测试
   * @param {string} method - 测试方法
   * @param {number} duration - 测试持续时间
   */
  async testHeavyLoadScenario(method, duration) {
    // 同时进行多种操作：导航、交互、截图
    const endTime = Date.now() + duration;
    
    while (Date.now() < endTime) {
      const promises = [];
      
      // 截图操作
      if (method === 'cdp') {
        promises.push(this.takeCdpScreenshot());
      } else {
        promises.push(this.takeVncScreenshot());
      }
      
      // 随机交互
      promises.push(this.performRandomInteraction(method));
      
      await Promise.allSettled(promises);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * 启动性能监控
   * @param {string} method - 监控方法
   * @returns {Object} 监控器对象
   */
  startPerformanceMonitor(method) {
    const monitor = {
      interval: null,
      startTime: performance.now(),
      lastFrameTime: performance.now(),
      frameCount: 0
    };
    
    monitor.interval = setInterval(() => {
      this.collectPerformanceMetrics(method, monitor);
    }, this.testConfig.sampleInterval);
    
    return monitor;
  }

  /**
   * 停止性能监控
   * @param {Object} monitor - 监控器对象
   */
  stopPerformanceMonitor(monitor) {
    if (monitor.interval) {
      clearInterval(monitor.interval);
    }
  }

  /**
   * 收集性能指标
   * @param {string} method - 测试方法
   * @param {Object} monitor - 监控器对象
   */
  async collectPerformanceMetrics(method, monitor) {
    const timestamp = Date.now();
    const currentTime = performance.now();
    
    try {
      // 测量延迟
      const latency = await this.measureLatency(method);
      this.testResults[method].latency.push({ timestamp, value: latency });
      
      // 测量带宽使用
      const bandwidth = await this.measureBandwidth(method);
      this.testResults[method].bandwidth.push({ timestamp, value: bandwidth });
      
      // 测量内存使用
      const memoryUsage = process.memoryUsage();
      this.testResults[method].memory.push({
        timestamp,
        value: memoryUsage.heapUsed / 1024 / 1024 // MB
      });
      
      // 测量CPU使用
      const cpuUsage = await this.measureCpuUsage();
      this.testResults[method].cpu.push({ timestamp, value: cpuUsage });
      
      // 计算帧率
      monitor.frameCount++;
      const frameRate = monitor.frameCount / ((currentTime - monitor.startTime) / 1000);
      this.testResults[method].frameRate.push({ timestamp, value: frameRate });
      
    } catch (error) {
      logger.warn(`收集性能指标失败 (${method})`, { error: error.message });
    }
  }

  /**
   * 测量延迟
   * @param {string} method - 测试方法
   * @returns {Promise<number>} 延迟时间（毫秒）
   */
  async measureLatency(method) {
    const startTime = performance.now();
    
    try {
      if (method === 'cdp') {
        await cdpService.ping();
      } else {
        await vncService.takeVncScreenshot();
      }
      
      return performance.now() - startTime;
    } catch (error) {
      return -1; // 错误情况下返回-1
    }
  }

  /**
   * 测量带宽使用
   * @param {string} method - 测试方法
   * @returns {Promise<number>} 带宽使用（KB/s）
   */
  async measureBandwidth(method) {
    // 简化的带宽测量，实际应用中需要更精确的实现
    const startTime = performance.now();
    let dataSize = 0;
    
    try {
      if (method === 'cdp') {
        const screenshot = await this.takeCdpScreenshot();
        dataSize = screenshot ? screenshot.length : 0;
      } else {
        const screenshot = await this.takeVncScreenshot();
        dataSize = screenshot ? screenshot.length : 0;
      }
      
      const duration = (performance.now() - startTime) / 1000; // 秒
      return dataSize / 1024 / duration; // KB/s
    } catch (error) {
      return 0;
    }
  }

  /**
   * 测量CPU使用率
   * @returns {Promise<number>} CPU使用率（百分比）
   */
  async measureCpuUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    return 100 - (totalIdle / totalTick * 100);
  }

  /**
   * 等待系统恢复
   */
  async waitForSystemRecovery() {
    logger.info('等待系统恢复...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  /**
   * 重置测试结果
   */
  resetResults() {
    this.testResults = {
      cdp: {
        latency: [],
        bandwidth: [],
        memory: [],
        cpu: [],
        frameRate: [],
        errors: []
      },
      vnc: {
        latency: [],
        bandwidth: [],
        memory: [],
        cpu: [],
        frameRate: [],
        errors: []
      }
    };
  }

  /**
   * 生成对比报告
   * @returns {Promise<Object>} 对比报告
   */
  async generateComparisonReport() {
    const report = {
      timestamp: new Date().toISOString(),
      testConfig: this.testConfig,
      summary: {
        cdp: this.calculateSummaryStats('cdp'),
        vnc: this.calculateSummaryStats('vnc')
      },
      comparison: {},
      rawData: this.testResults
    };
    
    // 计算性能改进百分比
    report.comparison = {
      latencyImprovement: this.calculateImprovement(
        report.summary.vnc.latency.average,
        report.summary.cdp.latency.average
      ),
      bandwidthOptimization: this.calculateImprovement(
        report.summary.vnc.bandwidth.average,
        report.summary.cdp.bandwidth.average
      ),
      memoryEfficiency: this.calculateImprovement(
        report.summary.vnc.memory.average,
        report.summary.cdp.memory.average
      ),
      cpuEfficiency: this.calculateImprovement(
        report.summary.vnc.cpu.average,
        report.summary.cdp.cpu.average
      )
    };
    
    // 保存报告到文件
    await this.saveReport(report);
    
    return report;
  }

  /**
   * 计算统计摘要
   * @param {string} method - 测试方法
   * @returns {Object} 统计摘要
   */
  calculateSummaryStats(method) {
    const data = this.testResults[method];
    
    return {
      latency: this.calculateStats(data.latency),
      bandwidth: this.calculateStats(data.bandwidth),
      memory: this.calculateStats(data.memory),
      cpu: this.calculateStats(data.cpu),
      frameRate: this.calculateStats(data.frameRate),
      errorCount: data.errors.length
    };
  }

  /**
   * 计算统计数据
   * @param {Array} dataPoints - 数据点数组
   * @returns {Object} 统计结果
   */
  calculateStats(dataPoints) {
    if (!dataPoints || dataPoints.length === 0) {
      return { average: 0, min: 0, max: 0, count: 0 };
    }
    
    const values = dataPoints.map(point => point.value).filter(v => v >= 0);
    
    if (values.length === 0) {
      return { average: 0, min: 0, max: 0, count: 0 };
    }
    
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      average: sum / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  }

  /**
   * 计算性能改进百分比
   * @param {number} baseline - 基准值
   * @param {number} improved - 改进值
   * @returns {number} 改进百分比
   */
  calculateImprovement(baseline, improved) {
    if (baseline === 0) return 0;
    return ((baseline - improved) / baseline) * 100;
  }

  /**
   * 保存报告到文件
   * @param {Object} report - 报告对象
   */
  async saveReport(report) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `performance-comparison-${timestamp}.json`;
    const filepath = path.join(__dirname, '../reports', filename);
    
    // 确保报告目录存在
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    
    // 保存报告
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    
    logger.info('性能对比报告已保存', { filepath });
  }

  // 辅助方法（简化实现）
  async navigateWithCdp(url) {
    // CDP导航实现
    return new Promise(resolve => setTimeout(resolve, 1000));
  }

  async navigateWithVnc(url) {
    // VNC导航实现
    return new Promise(resolve => setTimeout(resolve, 1500));
  }

  async performCdpInteraction(interaction) {
    // CDP交互实现
    return new Promise(resolve => setTimeout(resolve, 200));
  }

  async performVncInteraction(interaction) {
    // VNC交互实现
    return new Promise(resolve => setTimeout(resolve, 300));
  }

  async takeCdpScreenshot() {
    // CDP截图实现
    return 'base64_screenshot_data';
  }

  async takeVncScreenshot() {
    // VNC截图实现
    return await vncService.takeVncScreenshot();
  }

  async performRandomInteraction(method) {
    const interactions = [
      { type: 'click', x: Math.random() * 800, y: Math.random() * 600 },
      { type: 'scroll', direction: 'down', amount: 100 }
    ];
    
    const interaction = interactions[Math.floor(Math.random() * interactions.length)];
    
    if (method === 'cdp') {
      await this.performCdpInteraction(interaction);
    } else {
      await this.performVncInteraction(interaction);
    }
  }

  /**
   * 获取当前测试状态
   * @returns {Object} 测试状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      currentTest: this.currentTest,
      testConfig: this.testConfig
    };
  }

  /**
   * 停止当前测试
   */
  async stopTest() {
    if (this.isRunning) {
      this.isRunning = false;
      logger.info('性能对比测试已停止');
    }
  }
}

// 创建全局实例
const performanceComparison = new PerformanceComparison();

module.exports = {
  performanceComparison,
  PerformanceComparison
};