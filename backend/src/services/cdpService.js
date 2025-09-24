/**
 * CDP (Chrome DevTools Protocol) 代理服务模块
 * 实现与Chrome实例的WebSocket连接和实时屏幕录制
 * 为智能寻聘提供低延迟的浏览器交互体验
 */

const CDP = require('chrome-remote-interface');
const EventEmitter = require('events');
const ScreenRecordingService = require('./screenRecordingService');
const { getEnvironmentConfig } = require('../config/environmentConfig');

class CDPService extends EventEmitter {
  constructor() {
    super();
    this.client = null;
    this.isConnected = false;
    this.isRecording = false;
    this.screenRecordingService = new ScreenRecordingService();
    this.environmentConfig = getEnvironmentConfig();
    this.cdpPort = process.env.CDP_PORT || 9222;
    this.cdpHost = process.env.CDP_HOST || 'localhost';
    
    // 屏幕录制配置
    this.screencastConfig = {
      format: 'jpeg',
      quality: 80,
      maxWidth: 1280,
      maxHeight: 720,
      everyNthFrame: 1
    };
  }

  /**
   * 初始化CDP连接
   */
  async initialize() {
    if (this.isConnected && this.client) {
      return this.client;
    }

    try {
      console.log('🔗 初始化CDP连接...');
      console.log(`CDP连接地址: ${this.cdpHost}:${this.cdpPort}`);

      // 连接到Chrome实例
      this.client = await CDP({
        host: this.cdpHost,
        port: this.cdpPort
      });

      const { Page, Runtime, Input } = this.client;

      // 启用必要的域
      await Page.enable();
      await Runtime.enable();
      await Input.enable();

      this.isConnected = true;
      console.log('✅ CDP连接初始化成功');

      // 设置事件监听器
      this.setupEventListeners();

      return this.client;

    } catch (error) {
      console.error('❌ CDP连接初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    const { Page } = this.client;

    // 监听屏幕录制帧
    Page.screencastFrame((params) => {
      this.handleScreencastFrame(params);
    });

    // 设置屏幕录制服务事件监听
    this.screenRecordingService.on('recording-started', (options) => {
      this.emit('recording-started', options);
    });
    
    this.screenRecordingService.on('recording-stopped', (stats) => {
      this.emit('recording-stopped', stats);
    });
    
    this.screenRecordingService.on('frame-error', (error) => {
      this.emit('frame-error', error);
    });

    // 监听页面加载事件
    Page.loadEventFired(() => {
      this.emit('pageLoaded');
    });

    // 监听导航事件
    Page.frameNavigated((params) => {
      this.emit('frameNavigated', params.frame.url);
    });

    console.log('✅ CDP事件监听器设置完成');
  }

  /**
   * 开始屏幕录制
   */
  async startScreencast(config = {}) {
    if (!this.client) {
      await this.initialize();
    }

    try {
      const { Page } = this.client;
      
      // 合并配置
      const screencastConfig = {
        ...this.screencastConfig,
        ...config
      };

      // 启动CDP屏幕录制
      await Page.startScreencast(screencastConfig);
      
      // 启动屏幕录制服务
      this.screenRecordingService.startRecording({
        frameRate: 30,
        format: screencastConfig.format,
        quality: screencastConfig.quality
      });
      
      this.isRecording = true;
      
      console.log('🎥 屏幕录制已开始');
      console.log('录制配置:', screencastConfig);
      
      this.emit('screencastStarted', screencastConfig);
      return true;

    } catch (error) {
      console.error('❌ 开始屏幕录制失败:', error.message);
      throw error;
    }
  }

  /**
   * 停止屏幕录制
   */
  async stopScreencast() {
    if (!this.client || !this.isRecording) {
      return false;
    }

    try {
      const { Page } = this.client;
      
      // 停止CDP屏幕录制
      await Page.stopScreencast();
      
      // 停止屏幕录制服务
      this.screenRecordingService.stopRecording();
      
      this.isRecording = false;
      
      console.log('⏹️ 屏幕录制已停止');
      this.emit('screencastStopped');
      return true;

    } catch (error) {
      console.error('❌ 停止屏幕录制失败:', error.message);
      return false;
    }
  }

  /**
   * 处理屏幕录制帧
   */
  handleScreencastFrame(params) {
    const { data, metadata, sessionId } = params;
    
    // 确认帧接收
    if (this.client && sessionId) {
      this.client.Page.screencastFrameAck({ sessionId });
    }

    // 通过屏幕录制服务处理帧
    this.screenRecordingService.processFrame({
      data: data,
      metadata: {
        timestamp: Date.now(),
        sessionId: sessionId
      }
    });

    // 发送帧数据事件（保持向后兼容）
    this.emit('screenFrame', {
      image: data,
      metadata: metadata,
      timestamp: Date.now()
    });
  }

  /**
   * 导航到指定URL
   */
  async navigateToUrl(url) {
    if (!this.client) {
      await this.initialize();
    }

    try {
      const { Page } = this.client;
      const result = await Page.navigate({ url });
      
      console.log(`✅ CDP导航到: ${url}`);
      return result;

    } catch (error) {
      console.error(`❌ CDP导航失败: ${url}`, error.message);
      throw error;
    }
  }

  /**
   * 模拟鼠标点击
   */
  async simulateClick(x, y, button = 'left') {
    if (!this.client) {
      await this.initialize();
    }

    try {
      const { Input } = this.client;
      
      // 鼠标按下
      await Input.dispatchMouseEvent({
        type: 'mousePressed',
        x: x,
        y: y,
        button: button,
        clickCount: 1
      });

      // 鼠标释放
      await Input.dispatchMouseEvent({
        type: 'mouseReleased',
        x: x,
        y: y,
        button: button,
        clickCount: 1
      });

      console.log(`✅ CDP点击: (${x}, ${y})`);
      this.emit('userClick', { x, y, button });
      return true;

    } catch (error) {
      console.error(`❌ CDP点击失败: (${x}, ${y})`, error.message);
      return false;
    }
  }

  /**
   * 模拟键盘输入
   */
  async simulateKeyInput(text) {
    if (!this.client) {
      await this.initialize();
    }

    try {
      const { Input } = this.client;
      await Input.insertText({ text });
      
      console.log(`✅ CDP输入文本: ${text}`);
      this.emit('userInput', { text });
      return true;

    } catch (error) {
      console.error(`❌ CDP输入失败: ${text}`, error.message);
      return false;
    }
  }

  /**
   * 模拟滚动
   */
  async simulateScroll(x, y, deltaX = 0, deltaY = 100) {
    if (!this.client) {
      await this.initialize();
    }

    try {
      const { Input } = this.client;
      
      await Input.dispatchMouseEvent({
        type: 'mouseWheel',
        x: x,
        y: y,
        deltaX: deltaX,
        deltaY: deltaY
      });

      console.log(`✅ CDP滚动: (${x}, ${y}) delta(${deltaX}, ${deltaY})`);
      this.emit('userScroll', { x, y, deltaX, deltaY });
      return true;

    } catch (error) {
      console.error(`❌ CDP滚动失败: (${x}, ${y})`, error.message);
      return false;
    }
  }

  /**
   * 获取页面信息
   */
  async getPageInfo() {
    if (!this.client) {
      await this.initialize();
    }

    try {
      const { Page, Runtime } = this.client;
      
      // 获取页面标题
      const titleResult = await Runtime.evaluate({
        expression: 'document.title'
      });
      
      // 获取页面URL
      const urlResult = await Runtime.evaluate({
        expression: 'window.location.href'
      });

      return {
        title: titleResult.result.value,
        url: urlResult.result.value,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('❌ 获取页面信息失败:', error.message);
      return null;
    }
  }

  /**
   * 执行JavaScript代码
   */
  async evaluateScript(expression) {
    if (!this.client) {
      await this.initialize();
    }

    try {
      const { Runtime } = this.client;
      const result = await Runtime.evaluate({ expression });
      
      return result.result.value;

    } catch (error) {
      console.error('❌ 执行脚本失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取连接状态
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isRecording: this.isRecording,
      cdpHost: this.cdpHost,
      cdpPort: this.cdpPort
    };
  }

  /**
   * 添加屏幕录制客户端
   */
  addScreenRecordingClient(client) {
    this.screenRecordingService.addClient(client);
  }

  /**
   * 移除屏幕录制客户端
   */
  removeScreenRecordingClient(client) {
    this.screenRecordingService.removeClient(client);
  }

  /**
   * 获取屏幕录制统计信息
   */
  getScreenRecordingStats() {
    return this.screenRecordingService.getStats();
  }

  /**
   * 关闭CDP连接
   */
  async close() {
    if (this.client) {
      try {
        // 停止屏幕录制
        if (this.isRecording) {
          await this.stopScreencast();
        }

        // 清理屏幕录制服务
        this.screenRecordingService.cleanup();

        // 关闭连接
        await this.client.close();
        this.client = null;
        this.isConnected = false;
        
        console.log('✅ CDP连接已关闭');
        this.emit('disconnected');

      } catch (error) {
        console.error('❌ 关闭CDP连接失败:', error.message);
      }
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      if (!this.isConnected) {
        return false;
      }

      const { Runtime } = this.client;
      await Runtime.evaluate({ expression: '1 + 1' });
      return true;

    } catch (error) {
      console.error('❌ CDP健康检查失败:', error.message);
      return false;
    }
  }
}

// 创建单例实例
const cdpService = new CDPService();

module.exports = { CDPService, cdpService };