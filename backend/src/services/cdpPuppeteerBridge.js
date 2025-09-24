/**
 * CDP与Puppeteer服务集成桥接模块
 * 提供CDP和Puppeteer之间的无缝切换和协作
 */

const puppeteerService = require('./puppeteerService');
const CDPService = require('./cdpService');
const EventEmitter = require('events');

class CDPPuppeteerBridge extends EventEmitter {
  constructor() {
    super();
    this.puppeteerInstance = null;
    this.cdpInstance = null;
    this.currentMode = null; // 'puppeteer' | 'cdp' | null
    this.isInitialized = false;
    this.sharedBrowserInfo = null;
  }

  /**
   * 初始化桥接服务
   * @param {Object} config - 配置选项
   * @param {string} config.mode - 初始模式 ('puppeteer' | 'cdp')
   * @param {Object} config.puppeteerOptions - Puppeteer配置
   * @param {Object} config.cdpOptions - CDP配置
   */
  async initialize(config = {}) {
    try {
      console.log('初始化CDP-Puppeteer桥接服务...');
      
      const { mode = 'puppeteer', puppeteerOptions = {}, cdpOptions = {} } = config;
      
      // 根据模式初始化相应服务
      if (mode === 'puppeteer') {
        await this.initializePuppeteer(puppeteerOptions);
      } else if (mode === 'cdp') {
        await this.initializeCDP(cdpOptions);
      }
      
      this.currentMode = mode;
      this.isInitialized = true;
      
      console.log(`桥接服务初始化完成，当前模式: ${mode}`);
      this.emit('initialized', { mode });
      
    } catch (error) {
      console.error('桥接服务初始化失败:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 初始化Puppeteer服务
   * @param {Object} options - Puppeteer配置选项
   */
  async initializePuppeteer(options = {}) {
    try {
      console.log('初始化Puppeteer服务...');
      
      // 初始化Puppeteer
      await puppeteerService.initialize();
      this.puppeteerInstance = puppeteerService;
      
      // 获取浏览器信息用于后续CDP连接
      const browser = puppeteerService.getBrowser();
      if (browser) {
        const wsEndpoint = browser.wsEndpoint();
        this.sharedBrowserInfo = {
          wsEndpoint,
          browserWSEndpoint: wsEndpoint
        };
        console.log('Puppeteer浏览器WebSocket端点:', wsEndpoint);
      }
      
      console.log('Puppeteer服务初始化完成');
      
    } catch (error) {
      console.error('Puppeteer服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化CDP服务
   * @param {Object} options - CDP配置选项
   */
  async initializeCDP(options = {}) {
    try {
      console.log('初始化CDP服务...');
      
      this.cdpInstance = new CDPService();
      
      // 如果有共享的浏览器信息，使用它连接
      if (this.sharedBrowserInfo && this.sharedBrowserInfo.wsEndpoint) {
        await this.cdpInstance.initialize({
          ...options,
          wsEndpoint: this.sharedBrowserInfo.wsEndpoint
        });
      } else {
        await this.cdpInstance.initialize(options);
      }
      
      // 转发CDP事件
      this.cdpInstance.on('screenFrame', (data) => {
        this.emit('screenFrame', data);
      });
      
      this.cdpInstance.on('connectionStatus', (status) => {
        this.emit('connectionStatus', status);
      });
      
      this.cdpInstance.on('error', (error) => {
        this.emit('error', error);
      });
      
      console.log('CDP服务初始化完成');
      
    } catch (error) {
      console.error('CDP服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 切换到Puppeteer模式
   * @param {Object} options - 切换选项
   */
  async switchToPuppeteer(options = {}) {
    try {
      console.log('切换到Puppeteer模式...');
      
      if (this.currentMode === 'puppeteer') {
        console.log('已经是Puppeteer模式');
        return;
      }
      
      // 如果CDP正在运行，先停止屏幕录制但保持连接
      if (this.cdpInstance && this.currentMode === 'cdp') {
        await this.cdpInstance.stopScreencast();
      }
      
      // 初始化或重用Puppeteer实例
      if (!this.puppeteerInstance) {
        await this.initializePuppeteer(options);
      }
      
      this.currentMode = 'puppeteer';
      
      console.log('已切换到Puppeteer模式');
      this.emit('modeChanged', { mode: 'puppeteer' });
      
    } catch (error) {
      console.error('切换到Puppeteer模式失败:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 切换到CDP模式
   * @param {Object} options - 切换选项
   */
  async switchToCDP(options = {}) {
    try {
      console.log('切换到CDP模式...');
      
      if (this.currentMode === 'cdp') {
        console.log('已经是CDP模式');
        return;
      }
      
      // 初始化或重用CDP实例
      if (!this.cdpInstance) {
        await this.initializeCDP(options);
      }
      
      // 启动屏幕录制
      await this.cdpInstance.startScreencast();
      
      this.currentMode = 'cdp';
      
      console.log('已切换到CDP模式');
      this.emit('modeChanged', { mode: 'cdp' });
      
    } catch (error) {
      console.error('切换到CDP模式失败:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 导航到指定URL（统一接口）
   * @param {string} url - 目标URL
   * @param {Object} options - 导航选项
   */
  async navigateTo(url, options = {}) {
    try {
      console.log(`导航到: ${url} (模式: ${this.currentMode})`);
      
      if (this.currentMode === 'puppeteer' && this.puppeteerInstance) {
        const page = await this.puppeteerInstance.createPage();
        await page.goto(url, options);
        return { success: true, mode: 'puppeteer' };
        
      } else if (this.currentMode === 'cdp' && this.cdpInstance) {
        await this.cdpInstance.navigateTo(url);
        return { success: true, mode: 'cdp' };
        
      } else {
        throw new Error(`无效的模式或未初始化的服务: ${this.currentMode}`);
      }
      
    } catch (error) {
      console.error('导航失败:', error);
      throw error;
    }
  }

  /**
   * 执行JavaScript代码（统一接口）
   * @param {string} script - JavaScript代码
   * @param {Object} options - 执行选项
   */
  async executeScript(script, options = {}) {
    try {
      console.log(`执行脚本 (模式: ${this.currentMode}):`, script.substring(0, 100));
      
      if (this.currentMode === 'puppeteer' && this.puppeteerInstance) {
        const page = this.puppeteerInstance.getCurrentPage();
        if (!page) {
          throw new Error('没有活动的Puppeteer页面');
        }
        const result = await page.evaluate(script);
        return { success: true, result, mode: 'puppeteer' };
        
      } else if (this.currentMode === 'cdp' && this.cdpInstance) {
        const result = await this.cdpInstance.executeScript(script);
        return { success: true, result, mode: 'cdp' };
        
      } else {
        throw new Error(`无效的模式或未初始化的服务: ${this.currentMode}`);
      }
      
    } catch (error) {
      console.error('脚本执行失败:', error);
      throw error;
    }
  }

  /**
   * 模拟点击（统一接口）
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {Object} options - 点击选项
   */
  async click(x, y, options = {}) {
    try {
      console.log(`点击坐标 (${x}, ${y}) (模式: ${this.currentMode})`);
      
      if (this.currentMode === 'puppeteer' && this.puppeteerInstance) {
        const page = this.puppeteerInstance.getCurrentPage();
        if (!page) {
          throw new Error('没有活动的Puppeteer页面');
        }
        await page.mouse.click(x, y, options);
        return { success: true, mode: 'puppeteer' };
        
      } else if (this.currentMode === 'cdp' && this.cdpInstance) {
        await this.cdpInstance.click(x, y, options);
        return { success: true, mode: 'cdp' };
        
      } else {
        throw new Error(`无效的模式或未初始化的服务: ${this.currentMode}`);
      }
      
    } catch (error) {
      console.error('点击操作失败:', error);
      throw error;
    }
  }

  /**
   * 获取页面截图（统一接口）
   * @param {Object} options - 截图选项
   */
  async screenshot(options = {}) {
    try {
      console.log(`获取截图 (模式: ${this.currentMode})`);
      
      if (this.currentMode === 'puppeteer' && this.puppeteerInstance) {
        const page = this.puppeteerInstance.getCurrentPage();
        if (!page) {
          throw new Error('没有活动的Puppeteer页面');
        }
        const screenshot = await page.screenshot(options);
        return { success: true, screenshot, mode: 'puppeteer' };
        
      } else if (this.currentMode === 'cdp' && this.cdpInstance) {
        // CDP模式下通过屏幕录制获取当前帧
        const pageInfo = await this.cdpInstance.getPageInfo();
        return { success: true, pageInfo, mode: 'cdp' };
        
      } else {
        throw new Error(`无效的模式或未初始化的服务: ${this.currentMode}`);
      }
      
    } catch (error) {
      console.error('截图失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前模式
   */
  getCurrentMode() {
    return this.currentMode;
  }

  /**
   * 检查服务是否已初始化
   */
  isReady() {
    return this.isInitialized && this.currentMode !== null;
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      initialized: this.isInitialized,
      currentMode: this.currentMode,
      puppeteerReady: !!this.puppeteerInstance,
      cdpReady: !!this.cdpInstance,
      sharedBrowser: !!this.sharedBrowserInfo
    };
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const status = this.getStatus();
      
      if (!status.initialized) {
        return { healthy: false, message: '服务未初始化' };
      }
      
      if (this.currentMode === 'puppeteer' && this.puppeteerInstance) {
        const puppeteerHealth = await this.puppeteerInstance.healthCheck();
        return {
          healthy: puppeteerHealth.healthy,
          message: puppeteerHealth.message,
          mode: 'puppeteer',
          status
        };
        
      } else if (this.currentMode === 'cdp' && this.cdpInstance) {
        const cdpHealth = await this.cdpInstance.healthCheck();
        return {
          healthy: cdpHealth.healthy,
          message: cdpHealth.message,
          mode: 'cdp',
          status
        };
        
      } else {
        return {
          healthy: false,
          message: '没有活动的服务实例',
          status
        };
      }
      
    } catch (error) {
      console.error('健康检查失败:', error);
      return {
        healthy: false,
        message: '健康检查失败: ' + error.message,
        error: error.message
      };
    }
  }

  /**
   * 关闭桥接服务
   */
  async close() {
    try {
      console.log('关闭CDP-Puppeteer桥接服务...');
      
      // 关闭CDP服务
      if (this.cdpInstance) {
        await this.cdpInstance.close();
        this.cdpInstance = null;
      }
      
      // 关闭Puppeteer服务
      if (this.puppeteerInstance) {
        await this.puppeteerInstance.closeBrowser();
        this.puppeteerInstance = null;
      }
      
      this.currentMode = null;
      this.isInitialized = false;
      this.sharedBrowserInfo = null;
      
      console.log('桥接服务已关闭');
      this.emit('closed');
      
    } catch (error) {
      console.error('关闭桥接服务失败:', error);
      this.emit('error', error);
      throw error;
    }
  }
}

module.exports = CDPPuppeteerBridge;