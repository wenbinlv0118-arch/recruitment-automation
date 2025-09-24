/**
 * CDP服务使用示例
 * 演示如何使用CDP服务进行远程浏览器控制
 */

const CDPService = require('../src/services/cdpService');
const ScreenRecordingService = require('../src/services/screenRecordingService');
const UserInteractionService = require('../src/services/userInteractionService');
const CDPHealthMonitor = require('../src/services/cdpHealthMonitor');
const CDPErrorHandler = require('../src/services/cdpErrorHandler');
const { getCDPConfig } = require('../src/services/cdpConfig');

/**
 * CDP服务示例类
 */
class CDPExample {
  constructor() {
    this.config = getCDPConfig();
    this.services = {};
    this.isRunning = false;
  }

  /**
   * 初始化所有服务
   */
  async initialize() {
    try {
      console.log('🚀 初始化CDP服务...');
      
      // 初始化错误处理器
      this.services.errorHandler = new CDPErrorHandler({
        maxRetries: 3,
        retryDelay: 1000,
        enableCircuitBreaker: true,
        enableLogging: true
      });
      
      // 初始化CDP服务
      this.services.cdpService = new CDPService({
        host: this.config.websocket.host,
        port: this.config.websocket.port,
        timeout: this.config.websocket.timeout,
        errorHandler: this.services.errorHandler
      });
      
      // 初始化屏幕录制服务
      this.services.screenRecording = new ScreenRecordingService({
        frameRate: this.config.screencast.frameRate,
        quality: this.config.screencast.quality,
        bufferSize: this.config.screencast.bufferSize,
        enableFrameEnhancement: true
      });
      
      // 初始化用户交互服务
      this.services.userInteraction = new UserInteractionService({
        enableLogging: true,
        maxQueueSize: 100
      });
      
      // 初始化健康监控
      this.services.healthMonitor = new CDPHealthMonitor({
        checkInterval: 5000,
        alertThresholds: {
          cpuUsage: 80,
          memoryUsage: 80,
          responseTime: 1000,
          frameRate: 20,
          errorRate: 5
        },
        enableAlerts: true,
        enableLogging: true
      });
      
      // 设置事件监听
      this.setupEventListeners();
      
      console.log('✅ CDP服务初始化完成');
      
    } catch (error) {
      console.error('❌ CDP服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    // CDP服务事件
    this.services.cdpService.on('connected', () => {
      console.log('🔗 CDP连接已建立');
    });
    
    this.services.cdpService.on('disconnected', () => {
      console.log('🔌 CDP连接已断开');
    });
    
    this.services.cdpService.on('error', (error) => {
      console.error('❌ CDP服务错误:', error.message);
    });
    
    // 屏幕录制事件
    this.services.screenRecording.on('frame', (frameData) => {
      console.log(`📺 收到新帧: ${frameData.size} bytes`);
    });
    
    this.services.screenRecording.on('performance', (stats) => {
      console.log(`📊 屏幕录制性能: ${stats.frameRate}fps, ${stats.clients}个客户端`);
    });
    
    // 用户交互事件
    this.services.userInteraction.on('interaction', (data) => {
      console.log(`🖱️ 用户交互: ${data.type} (${data.latency}ms)`);
    });
    
    // 健康监控事件
    this.services.healthMonitor.on('health_status_changed', (status) => {
      console.log(`💊 健康状态变化: ${status.previous} -> ${status.current}`);
    });
    
    this.services.healthMonitor.on('alert_triggered', (alert) => {
      console.warn(`🚨 告警触发: ${alert.message}`);
    });
    
    this.services.healthMonitor.on('alert_cleared', (alert) => {
      console.log(`✅ 告警清除: ${alert.message}`);
    });
    
    // 错误处理事件
    this.services.errorHandler.on('error', (error) => {
      console.error(`🔥 错误处理: ${error.message}`);
    });
    
    this.services.errorHandler.on('recovery', (info) => {
      console.log(`🔄 错误恢复: ${info.message}`);
    });
  }

  /**
   * 启动CDP会话
   */
  async start() {
    try {
      console.log('🎬 启动CDP会话...');
      
      // 注册服务到健康监控
      this.services.healthMonitor.registerService('cdpService', this.services.cdpService);
      this.services.healthMonitor.registerService('screenRecordingService', this.services.screenRecording);
      this.services.healthMonitor.registerService('userInteractionService', this.services.userInteraction);
      this.services.healthMonitor.registerService('errorHandler', this.services.errorHandler);
      
      // 开始健康监控
      this.services.healthMonitor.startMonitoring();
      
      // 连接CDP
      await this.services.cdpService.connect();
      
      // 启用用户交互
      this.services.userInteraction.enable();
      
      this.isRunning = true;
      console.log('✅ CDP会话启动成功');
      
    } catch (error) {
      console.error('❌ CDP会话启动失败:', error);
      throw error;
    }
  }

  /**
   * 导航到指定URL
   */
  async navigateToUrl(url) {
    try {
      console.log(`🌐 导航到: ${url}`);
      
      await this.services.cdpService.navigate(url);
      
      // 等待页面加载
      await this.waitForPageLoad();
      
      console.log('✅ 页面导航完成');
      
    } catch (error) {
      console.error('❌ 页面导航失败:', error);
      throw error;
    }
  }

  /**
   * 开始屏幕录制
   */
  async startScreenRecording() {
    try {
      console.log('📹 开始屏幕录制...');
      
      await this.services.cdpService.startScreencast({
        format: this.config.screencast.format,
        quality: this.config.screencast.quality,
        maxWidth: this.config.screencast.maxWidth,
        maxHeight: this.config.screencast.maxHeight
      });
      
      console.log('✅ 屏幕录制已开始');
      
    } catch (error) {
      console.error('❌ 屏幕录制启动失败:', error);
      throw error;
    }
  }

  /**
   * 停止屏幕录制
   */
  async stopScreenRecording() {
    try {
      console.log('⏹️ 停止屏幕录制...');
      
      await this.services.cdpService.stopScreencast();
      
      console.log('✅ 屏幕录制已停止');
      
    } catch (error) {
      console.error('❌ 屏幕录制停止失败:', error);
      throw error;
    }
  }

  /**
   * 模拟用户交互
   */
  async simulateUserInteractions() {
    try {
      console.log('🖱️ 模拟用户交互...');
      
      // 模拟鼠标移动
      await this.services.userInteraction.handleMouseMove({
        x: 100,
        y: 100
      });
      
      await this.sleep(500);
      
      // 模拟点击
      await this.services.userInteraction.handleClick({
        x: 100,
        y: 100,
        button: 'left'
      });
      
      await this.sleep(500);
      
      // 模拟键盘输入
      await this.services.userInteraction.handleKeyboard({
        type: 'keyDown',
        key: 'Tab'
      });
      
      await this.sleep(100);
      
      await this.services.userInteraction.handleKeyboard({
        type: 'keyUp',
        key: 'Tab'
      });
      
      await this.sleep(500);
      
      // 模拟滚动
      await this.services.userInteraction.handleScroll({
        x: 0,
        y: 0,
        deltaX: 0,
        deltaY: -100
      });
      
      console.log('✅ 用户交互模拟完成');
      
    } catch (error) {
      console.error('❌ 用户交互模拟失败:', error);
      throw error;
    }
  }

  /**
   * 执行JavaScript代码
   */
  async executeScript(script) {
    try {
      console.log(`📜 执行脚本: ${script}`);
      
      const result = await this.services.cdpService.evaluateScript(script);
      
      console.log('✅ 脚本执行结果:', result);
      return result;
      
    } catch (error) {
      console.error('❌ 脚本执行失败:', error);
      throw error;
    }
  }

  /**
   * 获取页面信息
   */
  async getPageInfo() {
    try {
      console.log('📄 获取页面信息...');
      
      const pageInfo = await this.services.cdpService.getPageInfo();
      
      console.log('✅ 页面信息:', pageInfo);
      return pageInfo;
      
    } catch (error) {
      console.error('❌ 获取页面信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取性能统计
   */
  getPerformanceStats() {
    console.log('📊 获取性能统计...');
    
    const stats = {
      cdp: this.services.cdpService.getStats ? this.services.cdpService.getStats() : {},
      screenRecording: this.services.screenRecording.getStats(),
      userInteraction: this.services.userInteraction.getStats(),
      health: this.services.healthMonitor.getHealthStatus(),
      metrics: this.services.healthMonitor.getMetrics()
    };
    
    console.log('✅ 性能统计:', JSON.stringify(stats, null, 2));
    return stats;
  }

  /**
   * 获取健康状态
   */
  getHealthStatus() {
    console.log('💊 获取健康状态...');
    
    const health = this.services.healthMonitor.getHealthStatus();
    
    console.log('✅ 健康状态:', JSON.stringify(health, null, 2));
    return health;
  }

  /**
   * 等待页面加载完成
   */
  async waitForPageLoad(timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const readyState = await this.services.cdpService.evaluateScript('document.readyState');
        if (readyState === 'complete') {
          return;
        }
      } catch (error) {
        // 忽略错误，继续等待
      }
      
      await this.sleep(100);
    }
    
    throw new Error('页面加载超时');
  }

  /**
   * 休眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 停止CDP会话
   */
  async stop() {
    try {
      console.log('🛑 停止CDP会话...');
      
      if (this.services.healthMonitor) {
        this.services.healthMonitor.stopMonitoring();
      }
      
      if (this.services.userInteraction) {
        this.services.userInteraction.disable();
      }
      
      if (this.services.cdpService) {
        await this.services.cdpService.disconnect();
      }
      
      this.isRunning = false;
      console.log('✅ CDP会话已停止');
      
    } catch (error) {
      console.error('❌ CDP会话停止失败:', error);
      throw error;
    }
  }

  /**
   * 清理资源
   */
  async cleanup() {
    try {
      console.log('🧹 清理资源...');
      
      if (this.services.healthMonitor) {
        this.services.healthMonitor.destroy();
      }
      
      if (this.services.screenRecording) {
        this.services.screenRecording.cleanup();
      }
      
      if (this.services.userInteraction) {
        this.services.userInteraction.cleanup();
      }
      
      if (this.services.errorHandler) {
        this.services.errorHandler.cleanup();
      }
      
      if (this.services.cdpService) {
        this.services.cdpService.close();
      }
      
      console.log('✅ 资源清理完成');
      
    } catch (error) {
      console.error('❌ 资源清理失败:', error);
    }
  }
}

/**
 * 运行基础示例
 */
async function runBasicExample() {
  const example = new CDPExample();
  
  try {
    // 初始化服务
    await example.initialize();
    
    // 启动会话
    await example.start();
    
    // 导航到测试页面
    await example.navigateToUrl('https://example.com');
    
    // 开始屏幕录制
    await example.startScreenRecording();
    
    // 获取页面信息
    await example.getPageInfo();
    
    // 执行JavaScript
    await example.executeScript('document.title');
    
    // 模拟用户交互
    await example.simulateUserInteractions();
    
    // 等待一段时间观察
    console.log('⏳ 等待10秒观察运行状态...');
    await example.sleep(10000);
    
    // 获取性能统计
    example.getPerformanceStats();
    
    // 获取健康状态
    example.getHealthStatus();
    
    // 停止屏幕录制
    await example.stopScreenRecording();
    
  } catch (error) {
    console.error('❌ 示例运行失败:', error);
  } finally {
    // 停止会话
    await example.stop();
    
    // 清理资源
    await example.cleanup();
  }
}

/**
 * 运行性能测试示例
 */
async function runPerformanceExample() {
  const example = new CDPExample();
  
  try {
    console.log('🏃‍♂️ 开始性能测试示例...');
    
    await example.initialize();
    await example.start();
    
    // 导航到复杂页面
    await example.navigateToUrl('https://www.google.com');
    await example.startScreenRecording();
    
    // 执行多次交互测试性能
    const interactions = 50;
    const startTime = Date.now();
    
    for (let i = 0; i < interactions; i++) {
      await example.services.userInteraction.handleMouseMove({
        x: Math.random() * 800,
        y: Math.random() * 600
      });
      
      if (i % 10 === 0) {
        await example.services.userInteraction.handleClick({
          x: Math.random() * 800,
          y: Math.random() * 600,
          button: 'left'
        });
      }
      
      await example.sleep(50);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`✅ 性能测试完成: ${interactions}次交互，耗时${duration}ms，平均${(duration/interactions).toFixed(2)}ms/次`);
    
    // 获取详细性能统计
    const stats = example.getPerformanceStats();
    
    await example.stopScreenRecording();
    
  } catch (error) {
    console.error('❌ 性能测试失败:', error);
  } finally {
    await example.stop();
    await example.cleanup();
  }
}

/**
 * 运行错误处理示例
 */
async function runErrorHandlingExample() {
  const example = new CDPExample();
  
  try {
    console.log('🔥 开始错误处理示例...');
    
    await example.initialize();
    await example.start();
    
    // 故意导航到无效URL测试错误处理
    try {
      await example.navigateToUrl('https://invalid-url-that-does-not-exist.com');
    } catch (error) {
      console.log('✅ 错误处理正常工作:', error.message);
    }
    
    // 尝试执行无效JavaScript
    try {
      await example.executeScript('invalidFunction()');
    } catch (error) {
      console.log('✅ JavaScript错误处理正常工作:', error.message);
    }
    
    // 观察错误恢复
    await example.sleep(5000);
    
    // 尝试正常操作
    await example.navigateToUrl('https://example.com');
    console.log('✅ 错误恢复成功');
    
  } catch (error) {
    console.error('❌ 错误处理示例失败:', error);
  } finally {
    await example.stop();
    await example.cleanup();
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const example = args[0] || 'basic';
  
  console.log(`🎯 运行CDP示例: ${example}`);
  
  switch (example) {
    case 'basic':
      await runBasicExample();
      break;
    case 'performance':
      await runPerformanceExample();
      break;
    case 'error':
      await runErrorHandlingExample();
      break;
    default:
      console.log('❓ 未知示例类型，运行基础示例');
      await runBasicExample();
  }
  
  console.log('🎉 示例运行完成');
  process.exit(0);
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('💥 未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 处理进程退出
process.on('SIGINT', async () => {
  console.log('\n👋 收到退出信号，正在清理...');
  process.exit(0);
});

// 如果直接运行此文件
if (require.main === module) {
  main().catch(error => {
    console.error('💥 主函数执行失败:', error);
    process.exit(1);
  });
}

module.exports = CDPExample;