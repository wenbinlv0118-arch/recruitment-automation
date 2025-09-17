/**
 * 浏览器服务包装器 - 集成D-Bus错误处理的Playwright浏览器服务
 * 提供稳定的浏览器启动和页面操作，自动处理D-Bus和系统错误
 */

const { chromium } = require('playwright');
const { environmentConfig } = require('../config/environmentConfig');
const { browserErrorHandler } = require('../utils/browserErrorHandler');
const logger = require('../utils/logger');

class BrowserService {
  constructor() {
    this.browser = null;
    this.context = null;
    this.config = environmentConfig.getBrowserConfig();
    this.errorHandler = this.config.errorHandler;
    this.retryCount = 0;
    this.maxRetries = this.errorHandler.maxRetries || 3;
  }

  /**
   * 启动浏览器实例
   * @param {Object} options - 额外的启动选项
   * @returns {Promise<Object>} 浏览器实例
   */
  async launch(options = {}) {
    const launchOptions = {
      headless: this.config.headless,
      args: this.config.args,
      timeout: this.config.timeout,
      ...options
    };

    try {
      console.log('[浏览器服务] 启动浏览器...');
      
      if (this.errorHandler.enabled) {
        // 使用错误处理器包装启动过程
        this.browser = await this.errorHandler.handler.wrapBrowserLaunch(
          async (opts) => await chromium.launch(opts),
          launchOptions
        );
      } else {
        this.browser = await chromium.launch(launchOptions);
      }

      console.log('[浏览器服务] 浏览器启动成功');
      this.retryCount = 0; // 重置重试计数
      return this.browser;
    } catch (error) {
      console.error('[浏览器服务] 浏览器启动失败:', error.message);
      
      // 如果启用了错误处理且是可重试的错误
      if (this.errorHandler.enabled && this.shouldRetry(error) && this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`[浏览器服务] 重试启动浏览器 (${this.retryCount}/${this.maxRetries})...`);
        
        // 等待一段时间后重试
        await this.delay(1000 * this.retryCount);
        return this.launch(options);
      }
      
      throw error;
    }
  }

  /**
   * 创建浏览器上下文
   * @param {Object} options - 上下文选项
   * @returns {Promise<Object>} 浏览器上下文
   */
  async createContext(options = {}) {
    if (!this.browser) {
      await this.launch();
    }

    try {
      console.log('[浏览器服务] 创建浏览器上下文...');
      
      const contextOptions = {
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        ...options
      };

      if (this.errorHandler.enabled) {
        this.context = await this.errorHandler.handler.wrapPageOperation(
          async () => await this.browser.newContext(contextOptions),
          'createContext'
        );
      } else {
        this.context = await this.browser.newContext(contextOptions);
      }

      console.log('[浏览器服务] 浏览器上下文创建成功');
      return this.context;
    } catch (error) {
      console.error('[浏览器服务] 创建浏览器上下文失败:', error.message);
      throw error;
    }
  }

  /**
   * 创建新页面
   * @param {Object} context - 浏览器上下文（可选）
   * @returns {Promise<Object>} 页面实例
   */
  async createPage(context = null) {
    const targetContext = context || this.context;
    
    if (!targetContext) {
      await this.createContext();
    }

    try {
      console.log('[浏览器服务] 创建新页面...');
      
      let page;
      if (this.errorHandler.enabled) {
        page = await this.errorHandler.handler.wrapPageOperation(
          async () => await (targetContext || this.context).newPage(),
          'createPage'
        );
      } else {
        page = await (targetContext || this.context).newPage();
      }

      if (page) {
        // 设置页面错误处理
        this.setupPageErrorHandling(page);
        console.log('[浏览器服务] 新页面创建成功');
      }
      
      return page;
    } catch (error) {
      console.error('[浏览器服务] 创建页面失败:', error.message);
      throw error;
    }
  }

  /**
   * 设置页面级别的错误处理
   * @param {Object} page - 页面实例
   */
  setupPageErrorHandling(page) {
    if (!this.errorHandler.enabled) {
      return;
    }

    // 监听页面错误
    page.on('pageerror', (error) => {
      const handled = this.errorHandler.handler.handleBrowserError(error, 'pageError');
      if (!handled) {
        console.error('[浏览器服务] 页面错误:', error.message);
      }
    });

    // 监听控制台错误
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const errorText = msg.text();
        const handled = this.errorHandler.handler.handleBrowserError(
          new Error(errorText), 
          'consoleError'
        );
        if (!handled) {
          console.error('[浏览器服务] 控制台错误:', errorText);
        }
      }
    });

    // 监听请求失败
    page.on('requestfailed', (request) => {
      const error = new Error(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
      const handled = this.errorHandler.handler.handleBrowserError(error, 'requestFailed');
      if (!handled) {
        console.warn('[浏览器服务] 请求失败:', request.url(), request.failure()?.errorText);
      }
    });
  }

  /**
   * 安全导航到指定URL
   * @param {Object} page - 页面实例
   * @param {string} url - 目标URL
   * @param {Object} options - 导航选项
   * @returns {Promise<Object>} 响应对象
   */
  async navigateToUrl(page, url, options = {}) {
    const navigationOptions = {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
      ...options
    };

    try {
      console.log(`[浏览器服务] 导航到: ${url}`);
      
      let response;
      if (this.errorHandler.enabled) {
        response = await this.errorHandler.handler.wrapPageOperation(
          async () => await page.goto(url, navigationOptions),
          'navigate'
        );
      } else {
        response = await page.goto(url, navigationOptions);
      }

      console.log(`[浏览器服务] 导航成功: ${url}`);
      return response;
    } catch (error) {
      console.error(`[浏览器服务] 导航失败: ${url} - ${error.message}`);
      throw error;
    }
  }

  /**
   * 关闭浏览器
   * @returns {Promise<void>}
   */
  async close() {
    try {
      if (this.context) {
        await this.context.close();
        this.context = null;
        console.log('[浏览器服务] 浏览器上下文已关闭');
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        console.log('[浏览器服务] 浏览器已关闭');
      }
    } catch (error) {
      console.error('[浏览器服务] 关闭浏览器时出错:', error.message);
    }
  }

  /**
   * 获取错误统计信息
   * @returns {Object} 错误统计
   */
  getErrorStats() {
    if (this.errorHandler.enabled) {
      return this.errorHandler.handler.getErrorStats();
    }
    return { message: '错误处理未启用' };
  }

  /**
   * 检查是否应该重试
   * @param {Error} error - 错误对象
   * @returns {boolean} 是否应该重试
   */
  shouldRetry(error) {
    const retryablePatterns = [
      /dbus.*error/i,
      /connection.*refused/i,
      /timeout/i,
      /network.*error/i
    ];
    
    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * 延迟执行
   * @param {number} ms - 延迟毫秒数
   * @returns {Promise<void>}
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 检查浏览器是否正在运行
   * @returns {boolean} 浏览器状态
   */
  isRunning() {
    return this.browser !== null && this.browser.isConnected();
  }

  /**
   * 重启浏览器
   * @param {Object} options - 启动选项
   * @returns {Promise<Object>} 新的浏览器实例
   */
  async restart(options = {}) {
    console.log('[浏览器服务] 重启浏览器...');
    await this.close();
    return this.launch(options);
  }
}

// 创建全局实例
const browserService = new BrowserService();

module.exports = {
  BrowserService,
  browserService
};