#!/usr/bin/env node

/**
 * CDP性能测试脚本
 * 测试CDP方案的延迟、帧率、内存使用等性能指标
 */

const CDPService = require('../src/services/cdpService');
const ScreenRecordingService = require('../src/services/screenRecordingService');
const UserInteractionService = require('../src/services/userInteractionService');
const { performance } = require('perf_hooks');
const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * 性能测试器类
 */
class CDPPerformanceTester {
  constructor(options = {}) {
    this.options = {
      testDuration: options.testDuration || 60000, // 测试持续时间（毫秒）
      targetUrl: options.targetUrl || 'https://www.zhipin.com',
      frameRateTarget: options.frameRateTarget || 30, // 目标帧率
      interactionCount: options.interactionCount || 100, // 交互次数
      reportPath: options.reportPath || path.join(__dirname, '../reports'),
      verbose: options.verbose || false
    };
    
    this.cdpService = null;
    this.screenRecordingService = new ScreenRecordingService();
    this.userInteractionService = new UserInteractionService();
    
    this.metrics = {
      startTime: null,
      endTime: null,
      frameCount: 0,
      frameTimestamps: [],
      interactionLatencies: [],
      memoryUsage: [],
      cpuUsage: [],
      networkLatencies: [],
      errors: []
    };
  }

  /**
   * 运行性能测试
   */
  async runTest() {
    try {
      console.log('🚀 开始CDP性能测试...');
      console.log(`测试时长: ${this.options.testDuration / 1000}秒`);
      console.log(`目标URL: ${this.options.targetUrl}`);
      console.log(`目标帧率: ${this.options.frameRateTarget}FPS`);
      
      // 初始化服务
      await this.initializeServices();
      
      // 开始监控
      this.startMonitoring();
      
      // 运行测试场景
      await this.runTestScenarios();
      
      // 停止监控
      this.stopMonitoring();
      
      // 生成报告
      const report = await this.generateReport();
      
      // 保存报告
      await this.saveReport(report);
      
      console.log('✅ 性能测试完成!');
      console.log(`📊 报告已保存到: ${this.getReportPath()}`);
      
      return report;
      
    } catch (error) {
      console.error('❌ 性能测试失败:', error);
      this.metrics.errors.push({
        timestamp: Date.now(),
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * 初始化服务
   */
  async initializeServices() {
    console.log('🔧 初始化CDP服务...');
    
    // 初始化CDP服务
    this.cdpService = new CDPService();
    await this.cdpService.initialize();
    
    // 设置事件监听
    this.cdpService.on('screenFrame', (frameData) => {
      this.recordFrame(frameData);
    });
    
    this.cdpService.on('error', (error) => {
      this.metrics.errors.push({
        timestamp: Date.now(),
        error: error.message,
        type: 'cdp_error'
      });
    });
    
    // 启动屏幕录制
    await this.cdpService.startScreencast();
    
    // 导航到目标页面
    const navigationStart = performance.now();
    await this.cdpService.navigateTo(this.options.targetUrl);
    const navigationEnd = performance.now();
    
    this.metrics.networkLatencies.push({
      type: 'navigation',
      latency: navigationEnd - navigationStart,
      timestamp: Date.now()
    });
    
    console.log(`📄 页面导航完成，耗时: ${(navigationEnd - navigationStart).toFixed(2)}ms`);
  }

  /**
   * 开始监控
   */
  startMonitoring() {
    console.log('📊 开始性能监控...');
    
    this.metrics.startTime = Date.now();
    
    // 内存和CPU监控
    this.monitoringInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      this.metrics.memoryUsage.push({
        timestamp: Date.now(),
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external
      });
      
      this.metrics.cpuUsage.push({
        timestamp: Date.now(),
        user: cpuUsage.user,
        system: cpuUsage.system
      });
      
    }, 1000); // 每秒记录一次
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    console.log('⏹️  停止性能监控...');
    
    this.metrics.endTime = Date.now();
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  /**
   * 运行测试场景
   */
  async runTestScenarios() {
    console.log('🎯 运行测试场景...');
    
    const testDuration = this.options.testDuration;
    const startTime = Date.now();
    
    // 场景1: 基础屏幕录制测试
    await this.testBasicScreenRecording(testDuration * 0.3);
    
    // 场景2: 用户交互测试
    await this.testUserInteractions(testDuration * 0.4);
    
    // 场景3: 高负载测试
    await this.testHighLoad(testDuration * 0.3);
    
    const endTime = Date.now();
    console.log(`✅ 测试场景完成，总耗时: ${(endTime - startTime) / 1000}秒`);
  }

  /**
   * 基础屏幕录制测试
   */
  async testBasicScreenRecording(duration) {
    console.log('📹 测试基础屏幕录制...');
    
    const startTime = Date.now();
    let frameCount = 0;
    
    while (Date.now() - startTime < duration) {
      await this.sleep(1000 / this.options.frameRateTarget);
      frameCount++;
      
      if (frameCount % 100 === 0 && this.options.verbose) {
        console.log(`  已录制 ${frameCount} 帧`);
      }
    }
    
    console.log(`📹 基础录制测试完成，预期帧数: ${frameCount}`);
  }

  /**
   * 用户交互测试
   */
  async testUserInteractions(duration) {
    console.log('🖱️  测试用户交互...');
    
    const startTime = Date.now();
    const interactionInterval = duration / this.options.interactionCount;
    let interactionCount = 0;
    
    while (Date.now() - startTime < duration && interactionCount < this.options.interactionCount) {
      const interactionStart = performance.now();
      
      try {
        // 随机生成交互
        const interactionType = Math.random();
        
        if (interactionType < 0.5) {
          // 点击交互
          const x = Math.floor(Math.random() * 1920);
          const y = Math.floor(Math.random() * 1080);
          await this.cdpService.click(x, y);
          
        } else if (interactionType < 0.8) {
          // 鼠标移动
          const x = Math.floor(Math.random() * 1920);
          const y = Math.floor(Math.random() * 1080);
          await this.cdpService.mouseMove(x, y);
          
        } else {
          // 滚动
          const deltaY = Math.floor(Math.random() * 200) - 100;
          await this.cdpService.scroll(960, 540, 0, deltaY);
        }
        
        const interactionEnd = performance.now();
        const latency = interactionEnd - interactionStart;
        
        this.metrics.interactionLatencies.push({
          type: interactionType < 0.5 ? 'click' : (interactionType < 0.8 ? 'mousemove' : 'scroll'),
          latency: latency,
          timestamp: Date.now()
        });
        
        interactionCount++;
        
        if (interactionCount % 20 === 0 && this.options.verbose) {
          console.log(`  已完成 ${interactionCount} 次交互，平均延迟: ${latency.toFixed(2)}ms`);
        }
        
      } catch (error) {
        this.metrics.errors.push({
          timestamp: Date.now(),
          error: error.message,
          type: 'interaction_error'
        });
      }
      
      await this.sleep(interactionInterval);
    }
    
    console.log(`🖱️  交互测试完成，总交互次数: ${interactionCount}`);
  }

  /**
   * 高负载测试
   */
  async testHighLoad(duration) {
    console.log('⚡ 测试高负载场景...');
    
    const startTime = Date.now();
    
    // 模拟多个并发操作
    const promises = [];
    
    // 并发执行JavaScript
    for (let i = 0; i < 5; i++) {
      promises.push(this.executeJavaScriptLoad());
    }
    
    // 并发页面导航
    promises.push(this.executeNavigationLoad());
    
    // 等待所有操作完成或超时
    try {
      await Promise.race([
        Promise.all(promises),
        this.sleep(duration)
      ]);
    } catch (error) {
      this.metrics.errors.push({
        timestamp: Date.now(),
        error: error.message,
        type: 'high_load_error'
      });
    }
    
    console.log(`⚡ 高负载测试完成`);
  }

  /**
   * 执行JavaScript负载测试
   */
  async executeJavaScriptLoad() {
    const scripts = [
      'document.querySelectorAll("*").length',
      'window.scrollTo(0, document.body.scrollHeight)',
      'document.body.style.backgroundColor = "#f0f0f0"',
      'Array.from({length: 1000}, (_, i) => i).reduce((a, b) => a + b, 0)'
    ];
    
    for (const script of scripts) {
      try {
        const start = performance.now();
        await this.cdpService.executeScript(script);
        const end = performance.now();
        
        this.metrics.networkLatencies.push({
          type: 'javascript',
          latency: end - start,
          timestamp: Date.now()
        });
        
      } catch (error) {
        this.metrics.errors.push({
          timestamp: Date.now(),
          error: error.message,
          type: 'javascript_error'
        });
      }
      
      await this.sleep(100);
    }
  }

  /**
   * 执行导航负载测试
   */
  async executeNavigationLoad() {
    const urls = [
      'https://www.zhipin.com/job_detail/',
      'https://www.zhipin.com/web/geek/job',
      'https://www.zhipin.com/web/user/safe/settings'
    ];
    
    for (const url of urls) {
      try {
        const start = performance.now();
        await this.cdpService.navigateTo(url);
        const end = performance.now();
        
        this.metrics.networkLatencies.push({
          type: 'navigation_load',
          latency: end - start,
          timestamp: Date.now()
        });
        
        await this.sleep(2000); // 等待页面加载
        
      } catch (error) {
        this.metrics.errors.push({
          timestamp: Date.now(),
          error: error.message,
          type: 'navigation_error'
        });
      }
    }
  }

  /**
   * 记录帧数据
   */
  recordFrame(frameData) {
    this.metrics.frameCount++;
    this.metrics.frameTimestamps.push(Date.now());
    
    if (this.metrics.frameCount % 100 === 0 && this.options.verbose) {
      const fps = this.calculateCurrentFPS();
      console.log(`📊 已录制 ${this.metrics.frameCount} 帧，当前FPS: ${fps.toFixed(2)}`);
    }
  }

  /**
   * 计算当前FPS
   */
  calculateCurrentFPS() {
    if (this.metrics.frameTimestamps.length < 2) return 0;
    
    const recentFrames = this.metrics.frameTimestamps.slice(-30); // 最近30帧
    if (recentFrames.length < 2) return 0;
    
    const timeSpan = recentFrames[recentFrames.length - 1] - recentFrames[0];
    return (recentFrames.length - 1) * 1000 / timeSpan;
  }

  /**
   * 生成性能报告
   */
  async generateReport() {
    console.log('📋 生成性能报告...');
    
    const totalDuration = this.metrics.endTime - this.metrics.startTime;
    const averageFPS = this.metrics.frameCount * 1000 / totalDuration;
    
    // 计算延迟统计
    const interactionLatencies = this.metrics.interactionLatencies.map(i => i.latency);
    const networkLatencies = this.metrics.networkLatencies.map(n => n.latency);
    
    // 计算内存使用统计
    const memoryUsages = this.metrics.memoryUsage.map(m => m.heapUsed);
    const maxMemory = Math.max(...memoryUsages);
    const avgMemory = memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length;
    
    const report = {
      testInfo: {
        duration: totalDuration,
        targetUrl: this.options.targetUrl,
        targetFPS: this.options.frameRateTarget,
        timestamp: new Date().toISOString()
      },
      
      performance: {
        frameRate: {
          actual: averageFPS,
          target: this.options.frameRateTarget,
          efficiency: (averageFPS / this.options.frameRateTarget) * 100,
          totalFrames: this.metrics.frameCount
        },
        
        latency: {
          interaction: {
            count: interactionLatencies.length,
            average: this.calculateAverage(interactionLatencies),
            median: this.calculateMedian(interactionLatencies),
            p95: this.calculatePercentile(interactionLatencies, 95),
            max: Math.max(...interactionLatencies, 0)
          },
          
          network: {
            count: networkLatencies.length,
            average: this.calculateAverage(networkLatencies),
            median: this.calculateMedian(networkLatencies),
            p95: this.calculatePercentile(networkLatencies, 95),
            max: Math.max(...networkLatencies, 0)
          }
        },
        
        memory: {
          max: maxMemory,
          average: avgMemory,
          samples: memoryUsages.length
        },
        
        errors: {
          total: this.metrics.errors.length,
          byType: this.groupErrorsByType()
        }
      },
      
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpuCount: os.cpus().length
      },
      
      rawMetrics: this.metrics
    };
    
    // 性能评估
    report.assessment = this.assessPerformance(report);
    
    return report;
  }

  /**
   * 评估性能
   */
  assessPerformance(report) {
    const assessment = {
      overall: 'good',
      issues: [],
      recommendations: []
    };
    
    // 帧率评估
    if (report.performance.frameRate.efficiency < 80) {
      assessment.issues.push('帧率低于目标值的80%');
      assessment.recommendations.push('考虑降低屏幕录制质量或优化渲染性能');
      assessment.overall = 'poor';
    } else if (report.performance.frameRate.efficiency < 90) {
      assessment.issues.push('帧率略低于目标值');
      assessment.overall = 'fair';
    }
    
    // 交互延迟评估
    if (report.performance.latency.interaction.average > 100) {
      assessment.issues.push('交互延迟过高');
      assessment.recommendations.push('优化用户交互处理逻辑');
      assessment.overall = 'poor';
    }
    
    // 网络延迟评估
    if (report.performance.latency.network.average > 1000) {
      assessment.issues.push('网络操作延迟过高');
      assessment.recommendations.push('优化网络请求或考虑本地缓存');
      if (assessment.overall === 'good') assessment.overall = 'fair';
    }
    
    // 内存使用评估
    if (report.performance.memory.max > 500 * 1024 * 1024) { // 500MB
      assessment.issues.push('内存使用过高');
      assessment.recommendations.push('优化内存管理，考虑实现内存回收机制');
      if (assessment.overall === 'good') assessment.overall = 'fair';
    }
    
    // 错误率评估
    const errorRate = report.performance.errors.total / (report.testInfo.duration / 1000);
    if (errorRate > 1) { // 每秒超过1个错误
      assessment.issues.push('错误率过高');
      assessment.recommendations.push('加强错误处理和异常恢复机制');
      assessment.overall = 'poor';
    }
    
    return assessment;
  }

  /**
   * 保存报告
   */
  async saveReport(report) {
    const reportDir = this.options.reportPath;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = path.join(reportDir, `cdp-performance-${timestamp}.json`);
    
    // 确保报告目录存在
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    // 保存JSON报告
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    // 生成简化的文本报告
    const textReport = this.generateTextReport(report);
    const textFile = path.join(reportDir, `cdp-performance-${timestamp}.txt`);
    fs.writeFileSync(textFile, textReport);
    
    console.log(`📄 JSON报告: ${reportFile}`);
    console.log(`📄 文本报告: ${textFile}`);
  }

  /**
   * 生成文本报告
   */
  generateTextReport(report) {
    return `
CDP性能测试报告
================

测试信息:
- 测试时长: ${(report.testInfo.duration / 1000).toFixed(2)}秒
- 目标URL: ${report.testInfo.targetUrl}
- 目标帧率: ${report.testInfo.targetFPS}FPS
- 测试时间: ${report.testInfo.timestamp}

性能指标:
- 实际帧率: ${report.performance.frameRate.actual.toFixed(2)}FPS
- 帧率效率: ${report.performance.frameRate.efficiency.toFixed(2)}%
- 总帧数: ${report.performance.frameRate.totalFrames}

延迟统计:
- 交互延迟 (平均): ${report.performance.latency.interaction.average.toFixed(2)}ms
- 交互延迟 (P95): ${report.performance.latency.interaction.p95.toFixed(2)}ms
- 网络延迟 (平均): ${report.performance.latency.network.average.toFixed(2)}ms
- 网络延迟 (P95): ${report.performance.latency.network.p95.toFixed(2)}ms

内存使用:
- 最大内存: ${(report.performance.memory.max / 1024 / 1024).toFixed(2)}MB
- 平均内存: ${(report.performance.memory.average / 1024 / 1024).toFixed(2)}MB

错误统计:
- 总错误数: ${report.performance.errors.total}
- 错误类型: ${Object.keys(report.performance.errors.byType).join(', ')}

性能评估:
- 总体评价: ${report.assessment.overall}
- 发现问题: ${report.assessment.issues.length > 0 ? report.assessment.issues.join('; ') : '无'}
- 优化建议: ${report.assessment.recommendations.length > 0 ? report.assessment.recommendations.join('; ') : '无'}

系统信息:
- 平台: ${report.systemInfo.platform}
- 架构: ${report.systemInfo.arch}
- Node版本: ${report.systemInfo.nodeVersion}
- CPU核心数: ${report.systemInfo.cpuCount}
- 总内存: ${(report.systemInfo.totalMemory / 1024 / 1024 / 1024).toFixed(2)}GB
`;
  }

  /**
   * 工具函数
   */
  calculateAverage(arr) {
    return arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  calculateMedian(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  calculatePercentile(arr, percentile) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  groupErrorsByType() {
    const groups = {};
    for (const error of this.metrics.errors) {
      const type = error.type || 'unknown';
      groups[type] = (groups[type] || 0) + 1;
    }
    return groups;
  }

  getReportPath() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return path.join(this.options.reportPath, `cdp-performance-${timestamp}.json`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 清理资源
   */
  async cleanup() {
    console.log('🧹 清理测试资源...');
    
    try {
      if (this.cdpService) {
        await this.cdpService.stopScreencast();
        await this.cdpService.close();
      }
      
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
      }
      
    } catch (error) {
      console.warn('清理资源时出现警告:', error.message);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--duration':
        options.testDuration = parseInt(args[++i]) * 1000;
        break;
      case '--url':
        options.targetUrl = args[++i];
        break;
      case '--fps':
        options.frameRateTarget = parseInt(args[++i]);
        break;
      case '--interactions':
        options.interactionCount = parseInt(args[++i]);
        break;
      case '--report-path':
        options.reportPath = args[++i];
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        console.log(`
CDP性能测试脚本

用法: node cdpPerformanceTest.js [选项]

选项:
  --duration <秒>        测试持续时间 (默认: 60)
  --url <URL>           目标URL (默认: https://www.zhipin.com)
  --fps <帧率>          目标帧率 (默认: 30)
  --interactions <次数>  交互次数 (默认: 100)
  --report-path <路径>   报告保存路径
  --verbose             详细输出
  --help                显示帮助信息
`);
        process.exit(0);
        break;
    }
  }
  
  const tester = new CDPPerformanceTester(options);
  
  try {
    const report = await tester.runTest();
    
    // 输出简要结果
    console.log('\n📊 测试结果摘要:');
    console.log(`帧率: ${report.performance.frameRate.actual.toFixed(2)}FPS (效率: ${report.performance.frameRate.efficiency.toFixed(2)}%)`);
    console.log(`交互延迟: ${report.performance.latency.interaction.average.toFixed(2)}ms (平均)`);
    console.log(`内存使用: ${(report.performance.memory.max / 1024 / 1024).toFixed(2)}MB (峰值)`);
    console.log(`错误数量: ${report.performance.errors.total}`);
    console.log(`性能评价: ${report.assessment.overall}`);
    
    if (report.assessment.issues.length > 0) {
      console.log('\n⚠️  发现的问题:');
      report.assessment.issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
    if (report.assessment.recommendations.length > 0) {
      console.log('\n💡 优化建议:');
      report.assessment.recommendations.forEach(rec => console.log(`  - ${rec}`));
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = CDPPerformanceTester;