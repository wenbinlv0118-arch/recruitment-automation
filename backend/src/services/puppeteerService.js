/**
 * Puppeteer服务模块 - 生产环境优化版本
 * 专为Zeabur容器环境设计，解决Playwright依赖问题
 * 支持VNC远程显示服务
 */

const puppeteer = require('puppeteer');
const { vncService } = require('./vncService');
const { getEnvironmentConfig } = require('../config/environmentConfig');

class PuppeteerService {
  constructor() {
    this.browser = null;
    this.isInitialized = false;
    this.vncSession = null;
    this.environmentConfig = getEnvironmentConfig();
  }

  /**
   * 初始化浏览器 - 容器环境优化配置
   */
  async initialize() {
    if (this.isInitialized && this.browser) {
      return this.browser;
    }

    try {
      console.log('🚀 初始化Puppeteer浏览器...');

      // 检查并初始化VNC服务
      if (this.environmentConfig.hasVncService()) {
        console.log('🖥️ 检测到VNC服务，初始化VNC会话...');
        this.vncSession = await vncService.initializeSession();
      }

      const launchOptions = {
        headless: this.environmentConfig.shouldUseHeadless(),
        args: this.environmentConfig.getBrowserArgs(),
        defaultViewport: {
          width: 1920,
          height: 1080
        }
      };

      // 针对Zeabur环境的特殊配置
      if (process.env.ZEABUR_ENVIRONMENT) {
        // 只有在明确设置了PUPPETEER_EXECUTABLE_PATH时才使用自定义路径
        // 否则让Puppeteer自动检测浏览器（支持Playwright安装的浏览器）
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
          launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
          console.log('Zeabur环境使用自定义浏览器路径:', process.env.PUPPETEER_EXECUTABLE_PATH);
        } else {
          console.log('Zeabur环境让Puppeteer自动检测浏览器路径');
        }
        launchOptions.dumpio = false;
        
        // VNC环境下的特殊配置
        if (this.vncSession) {
          console.log('🖥️ 配置VNC显示环境');
          launchOptions.env = {
            ...process.env,
            DISPLAY: this.vncSession.display || ':1'
          };
        }
      }

      this.browser = await puppeteer.launch(launchOptions);
      this.isInitialized = true;

      console.log('✅ Puppeteer浏览器初始化成功');
      return this.browser;

    } catch (error) {
      console.error('❌ 浏览器初始化失败:', error.message);
      throw error;
    }
  }

  /**
   * 创建新页面
   */
  async createPage() {
    if (!this.browser) {
      await this.initialize();
    }

    const page = await this.browser.newPage();
    
    // 设置通用用户代理
    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // 设置超时
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);

    return page;
  }

  /**
   * 导航到指定URL
   */
  async navigateToPage(url, options = {}) {
    const page = await this.createPage();
    
    try {
      await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000,
        ...options
      });

      console.log(`✅ 成功导航到: ${url}`);
      return page;

    } catch (error) {
      console.error(`❌ 导航失败: ${url}`, error.message);
      await page.close();
      throw error;
    }
  }

  /**
   * 等待元素出现
   */
  async waitForSelector(page, selector, timeout = 10000) {
    try {
      await page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      console.error(`❌ 等待元素超时: ${selector}`);
      return false;
    }
  }

  /**
   * 获取文本内容
   */
  async getTextContent(page, selector) {
    try {
      const element = await page.$(selector);
      if (!element) return null;

      const text = await page.evaluate(el => el.textContent.trim(), element);
      return text;

    } catch (error) {
      console.error(`❌ 获取文本失败: ${selector}`, error.message);
      return null;
    }
  }

  /**
   * 获取多个元素的文本
   */
  async getMultipleText(page, selector) {
    try {
      const elements = await page.$$(selector);
      const texts = await Promise.all(
        elements.map(el => page.evaluate(element => element.textContent.trim(), el))
      );
      return texts;

    } catch (error) {
      console.error(`❌ 获取多元素文本失败: ${selector}`, error.message);
      return [];
    }
  }

  /**
   * 点击元素
   */
  async clickElement(page, selector) {
    try {
      await page.click(selector);
      console.log(`✅ 点击元素: ${selector}`);
      return true;

    } catch (error) {
      console.error(`❌ 点击元素失败: ${selector}`, error.message);
      return false;
    }
  }

  /**
   * 输入文本
   */
  async typeText(page, selector, text) {
    try {
      await page.type(selector, text);
      console.log(`✅ 输入文本: ${text}`);
      return true;

    } catch (error) {
      console.error(`❌ 输入文本失败: ${selector}`, error.message);
      return false;
    }
  }

  /**
   * 获取页面HTML
   */
  async getPageHTML(page) {
    try {
      return await page.content();
    } catch (error) {
      console.error('❌ 获取页面HTML失败:', error.message);
      return '';
    }
  }

  /**
   * 截图
   */
  async takeScreenshot(page, filename) {
    try {
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`✅ 截图保存: ${filename}`);
      return true;

    } catch (error) {
      console.error(`❌ 截图失败: ${filename}`, error.message);
      return false;
    }
  }

  /**
   * 关闭浏览器
   */
  async close() {
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        this.isInitialized = false;
        console.log('✅ 浏览器已关闭');
      } catch (error) {
        console.error('❌ 关闭浏览器失败:', error.message);
      }
    }
    
    // 清理VNC会话
    if (this.vncSession) {
      try {
        await vncService.cleanupSession(this.vncSession.id);
        this.vncSession = null;
        console.log('✅ VNC会话已清理');
      } catch (error) {
        console.error('❌ 清理VNC会话失败:', error.message);
      }
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      const testPage = await this.createPage();
      await testPage.goto('https://httpbin.org/status/200');
      await testPage.close();
      return true;
    } catch (error) {
      console.error('❌ 健康检查失败:', error.message);
      return false;
    }
  }
}

// 创建单例实例
const puppeteerService = new PuppeteerService();

module.exports = { PuppeteerService, puppeteerService };