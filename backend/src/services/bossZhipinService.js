const { chromium } = require('playwright');
const logger = require('../utils/logger');
const { resolveActionElement } = require('../utils/selectorResolver');
const CanvasOcrService = require('./canvasOcrService');
const DragSelectionService = require('./dragSelectionService');
const resourcePreloader = require('./resourcePreloader');
const browserDisplayConfig = require('../config/browserDisplayConfig');

class BossZhipinService {
  constructor(io = null) {
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
    this.currentStatus = 'idle'; // idle, navigating, logging_in, browsing
    this.popupHandler = null;
    this.io = io; // Socket.IO实例，用于发送页面切换保护消息
    
    // 候选人浏览状态跟踪
    this.browsingStatus = {
      isActive: false,
      mode: null, // 'recommended', 'search', 'communication'
      candidates: [],
      processedCount: 0,
      likedCount: 0,
      dislikedCount: 0,
      currentIndex: 0,
      filters: {},
      startTime: null
    };
    
    // 简历处理状态跟踪
    this.resumeProcessingStatus = {
      isActive: false,
      resumes: [],
      processingCount: 0,
      completedCount: 0,
      failedCount: 0,
      currentIndex: 0,
      settings: {},
      startTime: null,
      currentStatus: 'idle' // 'idle', 'collecting', 'quality_checking', 'parsing', 'storing', 'completed'
    };
    
    // 页面切换调度器
    this.pageSwitchTimeout = null;
    
    // Canvas截图和OCR服务
    this.canvasOcrService = new CanvasOcrService();
    
    // 拖拽选区复制服务
    this.dragSelectionService = new DragSelectionService();

    // 初始化并发锁，防止重复初始化导致的竞态
    this._initLock = false;
  }

  /**
   * 执行候选人浏览任务 - 按照文档规范流程
   */
  /**
   * 执行候选人浏览任务
   * @param {string} mode - 浏览模式：'recommended'、'search'、'communication'
   * @param {object} filters - 搜索筛选条件（仅在search模式下使用）
   * @param {number} targetCount - 目标浏览候选人数量
   */
  async executeBrowsingTask(mode, filters, targetCount = 3) {
    try {
      logger.info(`开始执行候选人浏览任务，模式: ${mode}`);
      
      // 检查浏览器状态
      if (!this.browser || !this.page) {
        logger.info('浏览器未初始化，正在初始化...');
        await this.initializeBrowser();
        await this.openBossZhipinWebsite();
      }
      
      // 检查登录状态
      const isLoggedIn = await this.checkLoginStatus();
      if (!isLoggedIn) {
        logger.warn('用户尚未登录，无法执行浏览任务');
        this.browsingStatus.isActive = false;
        this.currentStatus = 'waiting_login';
        return;
      }
      
      if (mode === 'recommended') {
        // 推荐牛人流程：直接在当前页面查找并点击"推荐牛人"按钮
        await this.browseRecommendedCandidates(targetCount);
      } else if (mode === 'search') {
        // 搜索牛人流程：直接在当前页面点击"搜索牛人"按钮，不需要额外导航
        await this.searchCandidates(filters, targetCount);
      } else if (mode === 'communication') {
        // 沟通版块浏览：直接在当前页面查找并点击"沟通"按钮
        await this.browseCommunicationCandidates(targetCount);
      }
      
      // 浏览完成
      this.browsingStatus.isActive = false;
      this.currentStatus = 'idle';
      logger.info('候选人浏览任务完成');
      
    } catch (error) {
      logger.error('候选人浏览任务失败:', error);
      this.browsingStatus.isActive = false;
      this.currentStatus = 'idle';
      throw error;
    }
  }

  /**
   * 初始化浏览器
   */
  /**
   * 初始化浏览器 - 增强反爬虫对策
   * 说明：
   * - 启动前检测 Playwright Chromium 是否安装，缺失则安装
   * - 启动失败时自动安装并重试一次
   * - 应用显示配置中的额外请求头到上下文
   */
  async initializeBrowser() {
    try {
      logger.info('正在启动 Boss 直聘自动化浏览器...');
      const displayConfig = browserDisplayConfig.bossZhipin;
      
      // 记录 Playwright 浏览器目录，便于诊断
      const pwPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
      if (pwPath) {
        logger.info(`Playwright 浏览器目录: ${pwPath}`);
      }
      
      // 确保浏览器资源已安装
      const installed = await resourcePreloader.isPlaywrightChromiumInstalled();
      if (!installed) {
        logger.info('检测到未安装 Playwright Chromium，开始安装...');
        await resourcePreloader.installPlaywrightChromium();
      }
      
      // 启动浏览器，失败时自动安装并重试一次
      const launchOptions = {
        headless: false, // 开发阶段使用有头模式，便于调试
        slowMo: 500, // 适度放慢操作速度
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled', // 禁用自动化控制检测
          '--disable-features=VizDisplayCompositor',
          '--disable-web-security',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--disable-popup-blocking', // 禁用弹窗阻止，确保新标签页能正常打开
          '--disable-background-tab-throttling', // 禁用后台标签页限制
          '--autoplay-policy=no-user-gesture-required', // 允许自动播放
          '--disable-permissions-api', // 禁用权限API检查
          '--disable-features=VizDisplayCompositor,VizHitTestSurfaceLayer', // 禁用显示合成器
          '--enable-automation', // 启用自动化模式
          '--disable-component-extensions-with-background-pages', // 禁用后台扩展
          '--disable-default-apps', // 禁用默认应用
          '--disable-extensions', // 禁用扩展
          '--disable-background-networking', // 禁用后台网络
          '--disable-sync', // 禁用同步
          '--metrics-recording-only', // 仅记录指标
          '--no-default-browser-check', // 不检查默认浏览器
          '--no-first-run', // 不显示首次运行界面
          '--safebrowsing-disable-auto-update', // 禁用安全浏览自动更新
          '--enable-features=UseOzonePlatform', // 启用Ozone平台
          '--use-fake-ui-for-media-stream', // 使用虚假UI处理媒体流
          '--use-fake-device-for-media-stream', // 使用虚假设备处理媒体流
          '--disable-features=MediaRouter', // 禁用媒体路由
          '--disable-ipc-flooding-protection', // 禁用IPC洪水保护
          // 统一显示参数
          ...displayConfig.launchArgs
        ]
      };
      try {
        this.browser = await chromium.launch(launchOptions);
      } catch (err) {
        logger.warn(`Chromium 启动失败，尝试安装后重试：${err?.message || err}`);
        await resourcePreloader.installPlaywrightChromium();
        this.browser = await chromium.launch(launchOptions);
      }

      // 准备随机用户代理
      const userAgents = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ];
      const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

      // 创建浏览器上下文，应用显示配置与请求头
      const context = await this.browser.newContext({
        ...displayConfig.contextOptions,
        permissions: ['clipboard-read', 'clipboard-write'], // 自动授权剪贴板权限
        extraHTTPHeaders: displayConfig?.pageOptions?.extraHTTPHeaders,
        userAgent: randomUserAgent
      });
      
      // 使用配置好的上下文创建页面
      this.page = await context.newPage();
      
      // 设置随机视口大小，模拟真实用户（页面级覆盖）
      const viewports = [
        { width: 1366, height: 768 },
        { width: 1920, height: 1080 },
        { width: 1440, height: 900 },
        { width: 1280, height: 800 }
      ];
      const randomViewport = viewports[Math.floor(Math.random() * viewports.length)];
      await this.page.setViewportSize(randomViewport);
      
      // 设置页面额外请求头（不重复上下文已设置的语言与编码）
      await this.page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      });
      
      // 隐藏自动化特征
      await this.page.addInitScript(() => {
        // 删除webdriver属性
        delete navigator.__proto__.webdriver;
        
        // 重写navigator.webdriver
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
        
        // 重写chrome属性
        window.chrome = {
          runtime: {},
        };
        
        // 重写permissions属性，自动授权剪贴板权限
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => {
          if (parameters.name === 'clipboard-read' || parameters.name === 'clipboard-write') {
            return Promise.resolve({ state: 'granted' }); // 剪贴板权限自动授权
          }
          if (parameters.name === 'notifications') {
            return Promise.resolve({ state: 'denied' });
          }
          return originalQuery(parameters);
        };
        
        // 重写plugins长度
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
        
        // 重写languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['zh-CN', 'zh', 'en'],
        });
        
        // 确保剪贴板API可用
        if (!navigator.clipboard) {
          navigator.clipboard = {
            readText: () => Promise.resolve(''),
            writeText: (text) => Promise.resolve()
          };
        }
      });

      // 设置弹窗处理 - 已禁用
      // await this.setupPopupHandling();

      logger.info('Boss 直聘自动化浏览器启动成功');
      return true;
    } catch (error) {
      logger.error('启动 Boss 直聘自动化浏览器失败:', error);
      throw error;
    }
  }

  /**
   * 设置弹窗处理 - 已禁用
   */
  async setupPopupHandling() {
    // 弹窗处理功能已被禁用
    logger.info('弹窗处理功能已被禁用');
    return;
    
    /* 已禁用的弹窗处理代码
    try {
      // 监听页面弹窗事件
      this.page.on('dialog', async (dialog) => {
        logger.info(`检测到弹窗: ${dialog.type()} - ${dialog.message()}`);
        await dialog.dismiss(); // 自动关闭弹窗
      });

      // 监听新页面打开事件
      this.page.on('popup', async (popup) => {
        logger.info('检测到新页面弹窗，正在关闭...');
        await popup.close();
      });

      // 监听页面跳转事件
      this.page.on('framenavigated', async (frame) => {
        if (frame === this.page.mainFrame()) {
          logger.info('页面发生跳转，重新设置弹窗处理...');
          await this.setupPopupHandling();
        }
      });

      logger.info('弹窗处理设置完成');
    } catch (error) {
      logger.error('设置弹窗处理失败:', error);
    }
    */
  }

  /**
   * 智能关闭弹窗 - 已禁用
   */
  async closePopups() {
    // 弹窗处理功能已被禁用
    logger.info('弹窗处理功能已被禁用');
    return false;
    
    /* 已禁用的弹窗处理代码
    try {
      if (!this.page) {
        return false;
      }

      logger.info('正在检查并关闭弹窗...');
      let popupCount = 0;

      // 1. 关闭常见的模态弹窗
      const modalSelectors = [
        '[class*="modal"]',
        '[class*="popup"]',
        '[class*="dialog"]',
        '[class*="overlay"]',
        '[class*="mask"]',
        '.ant-modal',
        '.ant-popover',
        '.ant-tooltip',
        '.el-dialog',
        '.el-popover',
        '.el-tooltip'
      ];

      for (const selector of modalSelectors) {
        try {
          const modals = await this.page.locator(selector).all();
          for (const modal of modals) {
            const isVisible = await modal.isVisible();
            if (isVisible) {
              // 尝试点击关闭按钮
              const closeButtons = await modal.locator('[class*="close"], [class*="cancel"], .close, .cancel, .ant-modal-close, .el-dialog__close').all();
              if (closeButtons.length > 0) {
                await closeButtons[0].click();
                popupCount++;
                logger.info(`关闭弹窗: ${selector}`);
              }
            }
          }
        } catch (error) {
          // 忽略单个选择器的错误
        }
      }

      // 2. 关闭通知提示
      const notificationSelectors = [
        '[class*="notification"]',
        '[class*="message"]',
        '[class*="toast"]',
        '.ant-notification',
        '.ant-message',
        '.el-notification',
        '.el-message'
      ];

      for (const selector of notificationSelectors) {
        try {
          const notifications = await this.page.locator(selector).all();
          for (const notification of notifications) {
            const isVisible = await notification.isVisible();
            if (isVisible) {
              await notification.click();
              popupCount++;
              logger.info(`关闭通知: ${selector}`);
            }
          }
        } catch (error) {
          // 忽略单个选择器的错误
        }
      }

      // 3. 关闭广告弹窗
      const adSelectors = [
        '[class*="ad"]',
        '[class*="banner"]',
        '[class*="promotion"]',
        '.ad-close',
        '.banner-close',
        '.promotion-close'
      ];

      for (const selector of adSelectors) {
        try {
          const ads = await this.page.locator(selector).all();
          for (const ad of ads) {
            const isVisible = await ad.isVisible();
            if (isVisible) {
              await ad.click();
              popupCount++;
              logger.info(`关闭广告: ${selector}`);
            }
          }
        } catch (error) {
          // 忽略单个选择器的错误
        }
      }

      // 4. 处理 ESC 键关闭弹窗
      try {
        await this.page.keyboard.press('Escape');
        logger.info('尝试使用 ESC 键关闭弹窗');
      } catch (error) {
        // 忽略 ESC 键错误
      }

      if (popupCount > 0) {
        logger.info(`成功关闭 ${popupCount} 个弹窗`);
      } else {
        logger.info('未发现需要关闭的弹窗');
      }

      return popupCount > 0;
    } catch (error) {
      logger.error('关闭弹窗失败:', error);
      return false;
    }
    */
  }

  /**
   * 确保页面就绪（关闭弹窗并等待页面稳定）
   */
  async ensurePageReady() {
    try {
      if (!this.page) {
        return false;
      }

      logger.info('确保页面就绪...');
      
      // 等待页面加载完成
      await this.page.waitForLoadState('networkidle', { timeout: 10000 });
      
      // 关闭弹窗 - 已禁用
      // await this.closePopups();
      
      // 等待页面稳定
      await this.page.waitForTimeout(1000);
      
      logger.info('页面已就绪');
      return true;
    } catch (error) {
      logger.error('确保页面就绪失败:', error);
      return false;
    }
  }

  /**
   * 打开 Boss 直聘官网
   */
  async openBossZhipinWebsite() {
    try {
      if (!this.page) {
        throw new Error('浏览器未初始化');
      }

      logger.info('正在打开 Boss 直聘官网...');
      this.currentStatus = 'navigating';
      
      // 打开 Boss 直聘官网
      await this.page.goto('https://www.zhipin.com/', {
        waitUntil: 'networkidle',
        timeout: 30000
      });

      // 等待页面加载完成
      await this.page.waitForLoadState('domcontentloaded');
      
      // 确保页面就绪
      await this.ensurePageReady();
      
      logger.info('Boss 直聘官网打开成功');
      this.currentStatus = 'idle';
      return true;
    } catch (error) {
      logger.error('打开 Boss 直聘官网失败:', error);
      this.currentStatus = 'idle';
      throw error;
    }
  }

  /**
   * 确保启动前处于干净可用状态（函数级注释）
   * 为什么：
   * - 用户“停止服务”后再次“启动”，可能残留定时器或已关闭的页面句柄，导致初始化失败
   * - 在启动前统一清理脏状态，并在需要时重建浏览器/页面，提升可恢复性
   */
  async ensureCleanStart() {
    // 简单并发锁，避免重复进入
    let spinCount = 0;
    while (this._initLock && spinCount < 10) {
      await this.page?.waitForTimeout?.(300).catch(() => new Promise(r => setTimeout(r, 300)));
      spinCount++;
    }
    this._initLock = true;

    try {
      // 停止残留浏览任务并清理页面切换定时器
      if (this.browsingStatus?.isActive) this.browsingStatus.isActive = false;
      if (this.pageSwitchTimeout) {
        clearTimeout(this.pageSwitchTimeout);
        this.pageSwitchTimeout = null;
      }

      // 处理断开连接或已关闭页面的情况
      const pageClosed = !!(this.page && typeof this.page.isClosed === 'function' && this.page.isClosed());
      const browserDisconnected = !!(this.browser && typeof this.browser.isConnected === 'function' && !this.browser.isConnected());

      if (!this.browser || !this.page || pageClosed || browserDisconnected) {
        try {
          // 尽量彻底清理，避免旧上下文残留
          if (this.browser || this.page) {
            await this.closeBrowser();
          }
        } catch (e) {
          logger.warn('关闭旧浏览器/页面时出现问题，继续重建:', e?.message || e);
        }

        await this.initializeBrowser();
        await this.openBossZhipinWebsite();
      } else {
        // 已有有效页面，确保页面就绪
        try {
          await this.ensurePageReady();
        } catch (e) {
          logger.warn('页面就绪检查失败，尝试重建页面:', e?.message || e);
          await this.closeBrowser().catch(() => {});
          await this.initializeBrowser();
          await this.openBossZhipinWebsite();
        }
      }

      this.currentStatus = 'idle';
      return true;
    } finally {
      this._initLock = false;
    }
  }

  /**
   * 导航到招聘页面（点击"我要招聘"）
   */
  async navigateToRecruitmentPage() {
    try {
      if (!this.page) {
        throw new Error('浏览器未初始化');
      }

      logger.info('正在导航到招聘页面...');
      this.currentStatus = 'navigating';
      
      // 确保页面就绪
      await this.ensurePageReady();
      
      // 查找"我要招聘"按钮
      const recruitmentButton = await this.page.locator('text=我要招聘').first();
      
      if (!recruitmentButton) {
        throw new Error('未找到"我要招聘"按钮');
      }

      // 点击"我要招聘"按钮
      await recruitmentButton.click();
      
      // 等待页面跳转
      await this.page.waitForLoadState('networkidle');
      
      // 确保新页面就绪
      await this.ensurePageReady();
      
      logger.info('成功导航到招聘页面');
      this.currentStatus = 'idle';
      return true;
    } catch (error) {
      logger.error('导航到招聘页面失败:', error);
      this.currentStatus = 'idle';
      throw error;
    }
  }

  /**
   * 选择 App 扫码登录方式
   */
  async selectAppLoginMethod() {
    try {
      if (!this.page) {
        throw new Error('浏览器未初始化');
      }

      logger.info('正在选择 App 扫码登录方式...');
      this.currentStatus = 'logging_in';
      
      // 确保页面就绪
      await this.ensurePageReady();
      
      // 查找 App 扫码登录选项
      const appLoginOption = await this.page.locator('text=App扫码登录').first();
      
      if (!appLoginOption) {
        throw new Error('未找到 App 扫码登录选项');
      }

      // 点击 App 扫码登录
      await appLoginOption.click();
      
      // 等待登录页面加载
      await this.page.waitForLoadState('networkidle');
      
      // 确保新页面就绪
      await this.ensurePageReady();
      
      logger.info('已选择 App 扫码登录方式，等待用户扫码...');
      this.currentStatus = 'logging_in';
      return true;
    } catch (error) {
      logger.error('选择 App 扫码登录方式失败:', error);
      this.currentStatus = 'idle';
      throw error;
    }
  }

  /**
   * 检测登录状态
   */
  async checkLoginStatus() {
    try {
      if (!this.page) {
        logger.warn('页面未初始化，无法检查登录状态');
        return false;
      }

      // 确保页面就绪
      await this.ensurePageReady();
      
      const currentUrl = this.page.url();
      logger.info(`检查登录状态 - 当前URL: ${currentUrl}`);

      // 多重验证登录状态
      const loginChecks = [
        // 检查用户头像
        this.page.locator('.user-avatar, .header-avatar, [class*="user-avatar"], [class*="header-avatar"]').first(),
        // 检查用户名显示
        this.page.locator('.user-name, .header-username, [class*="user-name"], [class*="username"]').first(),
        // 检查Boss直聘特定的登录标识
        this.page.locator('[data-testid="user-info"], .user-info, .login-user').first(),
        // 检查是否有"我的"菜单
        this.page.locator('text=我的简历, text=消息中心, text=我的收藏').first()
      ];

      // 检查登录按钮是否消失
      const loginButton = await this.page.locator('text=登录, .login-btn, [class*="login"]').first();
      const hasLoginButton = await loginButton.isVisible().catch(() => false);
      logger.info(`登录按钮可见性: ${hasLoginButton}`);
      
      // 检查任一登录标识元素是否存在
      let isLoggedIn = false;
      let loginIndicators = 0;
      for (let i = 0; i < loginChecks.length; i++) {
        try {
          const isVisible = await loginChecks[i].isVisible({ timeout: 1000 });
          if (isVisible) {
            isLoggedIn = true;
            loginIndicators++;
            logger.info(`登录指示器 ${i + 1} 检测到`);
          }
        } catch (error) {
          // 继续检查下一个元素
          continue;
        }
      }
      
      logger.info(`登录指示器总数: ${loginIndicators}`);
      
      // 如果没有登录按钮且有用户信息元素，则认为已登录
      if (!hasLoginButton && isLoggedIn) {
        this.isLoggedIn = true;
        this.currentStatus = 'idle';
        logger.info('用户已登录 - 检测到用户信息元素');
        return true;
      }
      
      // 检查URL是否包含登录后的特征
      const isLoggedInUrl = currentUrl.includes('/web/user/') || currentUrl.includes('/web/boss/');
      logger.info(`URL登录检查: ${isLoggedInUrl}`);
      
      if (isLoggedInUrl) {
        this.isLoggedIn = true;
        this.currentStatus = 'idle';
        logger.info('用户已登录 - URL验证');
        return true;
      }

      this.isLoggedIn = false;
      logger.info(`用户尚未登录 (指示器:${loginIndicators}, 登录按钮:${hasLoginButton}, URL验证:${isLoggedInUrl})`);
      return false;
    } catch (error) {
      logger.error('检测登录状态失败:', error);
      return false;
    }
  }

  /**
   * 等待用户扫码登录
   */
  async waitForUserLogin(timeout = 300000) { // 5分钟超时
    try {
      if (!this.page) {
        throw new Error('浏览器未初始化');
      }

      logger.info('等待用户扫码登录...');
      
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeout) {
        // 确保页面就绪
        await this.ensurePageReady();
        
        // 检查登录状态
        const isLoggedIn = await this.checkLoginStatus();
        
        if (isLoggedIn) {
          logger.info('用户登录成功！');
          this.currentStatus = 'idle';
          return true;
        }
        
        // 等待5秒后再次检查
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 检查是否超时
        if (Date.now() - startTime >= timeout) {
          throw new Error('等待用户登录超时');
        }
      }
      
      throw new Error('等待用户登录超时');
    } catch (error) {
      logger.error('等待用户登录失败:', error);
      this.currentStatus = 'idle';
      throw error;
    }
  }

  /**
   * 获取当前状态
   */
  getCurrentStatus() {
    return {
      status: this.currentStatus,
      isLoggedIn: this.isLoggedIn,
      hasBrowser: !!this.browser,
      hasPage: !!this.page
    };
  }

  /**
   * 启动候选人浏览
   */
  async startBrowsing(mode, filters = {}, targetCount = 3) {
    try {
      // 启动前保证环境干净，避免初始化失败
      await this.ensureCleanStart();
      this.currentStatus = 'browsing';
      
      // 初始化浏览状态
      this.browsingStatus = {
        isActive: true,
        mode: mode,
        candidates: [],
        processedCount: 0,
        likedCount: 0,
        dislikedCount: 0,
        currentIndex: 0,
        filters: filters,
        targetCount: targetCount,
        startTime: new Date().toISOString()
      };
      
      logger.info(`开始候选人浏览，模式: ${mode}`, filters);
      
      // 异步执行浏览任务，不阻塞响应
      this.executeBrowsingTask(mode, filters, targetCount).catch(error => {
        logger.error('候选人浏览任务执行失败:', error);
        this.browsingStatus.isActive = false;
        this.currentStatus = 'idle';
      });
      
      return true;
    } catch (error) {
      logger.error('启动候选人浏览失败:', error);
      this.currentStatus = 'idle';
      this.browsingStatus.isActive = false;
      throw error;
    }
  }

  /**
   * 浏览推荐牛人 - 按照文档规范流程
   * @param {number} targetCount - 目标浏览候选人数量
   */
  async browseRecommendedCandidates(targetCount = 3) {
    try {
      logger.info('开始浏览推荐牛人...');
      
      // 确保页面就绪
      await this.ensurePageReady();
      
      // 尝试多种方式查找并点击"推荐牛人"按钮，直接在当前页面操作
      const recommendedSelectors = [
        'text=推荐牛人',
        '[data-testid="recommended-talents"]',
        '.recommend-talent',
        'a[href*="recommend"]',
        'button:has-text("推荐牛人")',
        '.nav-item:has-text("推荐牛人")'
      ];
      
      let clicked = false;
      for (const selector of recommendedSelectors) {
        try {
          const element = this.page.locator(selector).first();
          if (await element.isVisible({ timeout: 2000 })) {
            await element.click();
            logger.info(`成功点击推荐牛人按钮: ${selector}`);
            clicked = true;
            break;
          }
        } catch (error) {
          // 继续尝试下一个选择器
          continue;
        }
      }
      
      if (!clicked) {
        logger.warn('未找到推荐牛人按钮，尝试在当前页面查找候选人列表');
      }
      
      await this.page.waitForTimeout(2000);
      
      // 按照文档要求：按顺序从上到下依次点击候选人卡片
      await this.browseRecommendedCandidateList(targetCount);
      
    } catch (error) {
      logger.error('浏览推荐牛人失败:', error);
      throw error;
    }
  }

  /**
   * 搜索牛人 - 完整流程实现
   * @param {object} filters - 筛选条件对象
   * @param {number} targetCount - 目标浏览候选人数量
   */
  async searchCandidates(filters, targetCount = 3) {
    try {
      logger.info('开始搜索牛人...', filters);
      // 页面就绪
      await this.ensurePageReady();

      // 更稳健的导航到搜索/人才版块
      const navSuccess = await this.navigateToTalentSearchPage();
      if (!navSuccess) {
        logger.warn('未能通过导航显式进入搜索版块，尝试继续检测 iframe 与页面级降级方案');
      }

      // 等待 iframe 加载（若存在）
      await this.waitForIframeLoad();

      // 获取搜索相关 iframe（内容特征驱动）
      const iframe = await this.getSearchIframe();

      if (iframe) {
        // 在 iframe 中应用筛选与搜索
        await this.applyFiltersInIframe(iframe, filters);
        await this.executeSearchInIframe(iframe);
        await this.processSearchResults(iframe, targetCount);
      } else {
        // 未检测到 iframe，执行页面级降级搜索与处理
        logger.warn('未找到搜索页面 iframe，执行页面级搜索降级流程');
        await this.applySearchFiltersLegacy(filters);
        await this.browseRecommendedCandidateList(targetCount);
      }
      
    } catch (error) {
      logger.error('搜索牛人失败:', error);
      throw error;
    }
  }

  /**
   * 导航到搜索/人才版块（更稳健的多策略）
   * 说明：
   * - 优先直接点击“搜索牛人/人才搜索”等入口
   * - 若入口在“智能寻聘/智能招聘/人才库”等菜单下，则先展开再点击
   * - 导航后不强依赖 URL，仅通过后续 iframe/内容特征进一步确认
   * @returns {Promise<boolean>} 是否成功触发到目标版块的入口点击
   */
  async navigateToTalentSearchPage() {
    try {
      logger.info('开始导航到搜索/人才版块...');
      await this.ensurePageReady();

      // 先使用解析器尝试根据别名与多策略解析（更稳健）
      try {
        const loc = await resolveActionElement(this.page, 'boss', 'search');
        if (loc) {
          await loc.click();
          await this.page.waitForTimeout(1500);
          logger.info('通过解析器成功点击搜索/人才入口');
          return true;
        }
      } catch (e) {
        logger.warn('解析器未找到搜索入口，回退到内置选择器:', e?.message || e);
      }

      // 直接入口选择器
      const directSelectors = [
        'text=搜索牛人',
        'text=人才搜索',
        'text=候选人搜索',
        'text=搜牛人',
        '.nav-item:has-text("搜索牛人")',
        'a:has-text("搜索牛人")',
        'a[href*="talent"], a[href*="search"]'
      ];

      // 菜单入口选择器（先展开再找入口）
      const menuSelectors = [
        'text=智能寻聘',
        'text=智能招聘',
        'text=招聘工作台',
        'text=人才库'
      ];

      let clicked = false;

      // 直接尝试点击入口
      for (const selector of directSelectors) {
        try {
          const el = this.page.locator(selector).first();
          if (await el.isVisible()) {
            await el.click();
            clicked = true;
            logger.info(`已点击搜索入口: ${selector}`);
            break;
          }
        } catch (_) {
          // 忽略并继续
        }
      }

      // 若未点击成功，尝试展开菜单后再找入口
      if (!clicked) {
        for (const menu of menuSelectors) {
          try {
            const menuEl = this.page.locator(menu).first();
            if (await menuEl.isVisible()) {
              await menuEl.click();
              await this.page.waitForTimeout(1000);

              // 展开后再次尝试直接入口
              for (const selector of directSelectors) {
                try {
                  const el = this.page.locator(selector).first();
                  if (await el.isVisible()) {
                    await el.click();
                    clicked = true;
                    logger.info(`在菜单下点击搜索入口: ${selector}`);
                    break;
                  }
                } catch (_) {}
              }
            }
            if (clicked) break;
          } catch (_) {}
        }
      }

      // 导航后的短暂稳定等待
      await this.page.waitForTimeout(1500);
      return clicked;
    } catch (error) {
      logger.error('导航到搜索/人才版块失败:', error);
      return false;
    }
  }

  /**
   * 导航到沟通页面
   * @returns {Promise<boolean>} 导航是否成功
   */
  async navigateToCommunicationPage() {
    try {
      logger.info('开始导航到沟通页面...');
      // 先使用解析器尝试根据别名与多策略解析（更稳健）
      try {
        const loc = await resolveActionElement(this.page, 'boss', 'communicate');
        if (loc) {
          await loc.click();
          await this.page.waitForTimeout(2000);
        } else {
          // 兜底：直接点击“沟通”文本
          await this.page.click('text=沟通');
          await this.page.waitForTimeout(2000);
        }
      } catch (e) {
        logger.warn('解析器未定位沟通入口，使用兜底文本点击:', e?.message || e);
        await this.page.click('text=沟通');
        await this.page.waitForTimeout(2000);
      }
      
      // 选择"全部"选项
      await this.page.click('text=全部');
      await this.page.waitForTimeout(1000);
      
      // 选择"未读"选项
      await this.page.click('text=未读');
      await this.page.waitForTimeout(2000);
      
      logger.info('成功导航到沟通页面');
      return true;
      
    } catch (error) {
      logger.error('导航到沟通页面失败:', error);
      return false;
    }
  }

  /**
   * 浏览沟通版块候选人 - 按照文档规范流程
   * @param {number} targetCount - 目标浏览候选人数量
   */
  async browseCommunicationCandidates(targetCount = 3) {
    try {
      logger.info('开始浏览沟通版块候选人...');
      
      // 使用导航方法导航到沟通页面
      const navigationSuccess = await this.navigateToCommunicationPage();
      if (!navigationSuccess) {
        throw new Error('导航到沟通页面失败');
      }
      
      // 按照文档规范：后续操作与推荐牛人流程保持一致
      await this.browseRecommendedCandidateList(targetCount);
      
    } catch (error) {
      logger.error('浏览沟通版块候选人失败:', error);
      throw error;
    }
  }

  /**
   * 按照文档规范浏览推荐候选人列表
   * 系统识别页面上的候选人卡片，按顺序从上到下依次点击候选人卡片
   * 当页面候选人浏览完毕时，自动向下滚动刷新更多候选人
   */
  async browseRecommendedCandidateList(targetCount = 3) {
    try {
      let candidateCount = 0;
      const maxCandidates = targetCount; // 目标浏览数量
      let previousGreetButtonCount = 0;
      
      while (candidateCount < maxCandidates) {
        // 使用用户提供的准确候选人卡片选择器
        const candidateSelectors = [
          'div[data-v-355e62b0][data-v-5b6c77c0][data-v-b753c1ac].candidate-card-wrap',  // 用户提供的准确选择器
          '.candidate-card-wrap',  // 备用选择器
          'div.candidate-card-wrap',
          '[class*="candidate-card"]'
        ];
        
        let candidateCards = [];
        for (const selector of candidateSelectors) {
          try {
            const cards = await this.page.$$(selector);
            if (cards.length > 0) {
              candidateCards = cards;
              logger.info(`找到 ${cards.length} 个候选人卡片，使用选择器: ${selector}`);
              break;
            }
          } catch (error) {
            continue;
          }
        }
        
        if (candidateCards.length === 0) {
          logger.info('没有找到候选人卡片，开始分析页面结构...');
          await this.analyzePageStructure();
          await this.scrollToLoadMoreCandidates();
          continue;
        }
        
        // 按顺序从上到下依次处理候选人卡片
        const newCards = candidateCards.slice(previousGreetButtonCount);
        if (newCards.length === 0) {
          logger.info('当前页面候选人卡片浏览完毕，自动向下滚动刷新更多候选人...');
          await this.scrollToLoadMoreCandidates();
          
          // 检查是否有新的候选人卡片加载
          const updatedCards = await this.page.$$('.candidate-card-wrap, [class*="candidate-card"]');
          if (updatedCards.length <= candidateCards.length) {
            logger.info('已浏览完所有候选人');
            break;
          }
          previousGreetButtonCount = candidateCards.length;
          continue;
        }
        
        // 按顺序从上到下依次处理候选人卡片
        for (const card of newCards) {
          if (candidateCount >= maxCandidates) break;
          
          try {
            logger.info(`正在采集第 ${candidateCount + 1} 份简历...`);
            
            // 在候选人卡片内查找"打招呼"按钮
            const greetButton = await card.$('button:has-text("打招呼"), a:has-text("打招呼"), [class*="greet"], [class*="chat"]');
            
            if (greetButton) {
              // 获取"打招呼"按钮的位置
              const buttonBox = await greetButton.boundingBox();
              if (buttonBox) {
                // 点击"打招呼"按钮下方一点的空白位置
                const clickX = buttonBox.x + buttonBox.width / 2;
                const clickY = buttonBox.y + buttonBox.height + 20; // 按钮下方20像素处
                
                logger.info(`点击"打招呼"按钮下方位置: (${clickX}, ${clickY})`);
                await this.page.mouse.click(clickX, clickY);
              } else {
                // 如果无法获取按钮位置，直接点击卡片
                logger.info('无法获取"打招呼"按钮位置，直接点击候选人卡片');
                await card.click();
              }
            } else {
              // 如果找不到"打招呼"按钮，直接点击卡片
              logger.info('未找到"打招呼"按钮，直接点击候选人卡片');
              await card.click();
            }
            
            await this.page.waitForTimeout(2000);
            
            // 检查是否成功打开候选人详情页面
            const isDetailPage = await this.page.evaluate(() => {
              return window.location.href.includes('/geek/') || 
                     document.querySelector('.geek-detail, .candidate-detail, [class*="detail"]') !== null;
            });
            
            if (isDetailPage) {
              logger.info('成功打开候选人详情页面');
              
              // 等待简历页面加载
              await this.waitForResumePageLoad();
              
              // 提取简历内容
              const resumeContent = await this.extractResumeContentFromPage();
              
              if (resumeContent) {
                logger.info(`成功提取第 ${candidateCount + 1} 个候选人的简历内容`);
                
                // 上传简历到应用（包含确认添加逻辑）
                await this.uploadResumeToApp(resumeContent, candidateCount);
                
                candidateCount++;
                logger.info(`已成功处理第 ${candidateCount} 个候选人，目标: ${maxCandidates}`);
              } else {
                logger.warn(`第 ${candidateCount + 1} 个候选人简历内容提取失败`);
              }
              
              // 返回列表页
              await this.page.goBack();
              await this.page.waitForTimeout(2000);
            } else {
              logger.warn('未能打开候选人详情页面');
            }
            
          } catch (error) {
            logger.error(`处理候选人 ${candidateCount + 1} 失败:`, error);
            continue;
          }
        }
        
        // 更新已处理的候选人卡片计数
        previousGreetButtonCount = candidateCards.length;
      }
      
      logger.info(`简历采集完成，共采集 ${candidateCount} 份简历`);
      
    } catch (error) {
      logger.error('浏览推荐候选人列表失败:', error);
      throw error;
    }
  }

  /**
   * 分析页面结构，帮助定位候选人卡片 - 增强反爬虫对策
   */
  async analyzePageStructure() {
    try {
      logger.info('开始分析页面结构...');
      
      // 获取页面URL
      const currentUrl = this.page.url();
      logger.info(`当前页面URL: ${currentUrl}`);
      
      // 模拟人类行为 - 随机鼠标移动
      await this.simulateHumanBehavior();
      
      // 等待页面完全加载，使用多种策略
      await this.waitForPageFullyLoaded();
      
      // 尝试触发页面内容加载
      await this.triggerContentLoading();
      
      // 首先检测是否有iframe
      const iframeAnalysis = await this.detectAndAnalyzeIframes();
      
      // 如果在iframe中找到了候选人卡片，优先使用iframe结果
      if (iframeAnalysis.hasIframes && iframeAnalysis.candidateCards && iframeAnalysis.candidateCards.length > 0) {
        logger.info('使用iframe中的候选人卡片数据');
        
        // 开始自动化处理iframe中的候选人卡片
        await this.processCandidateCardsInIframe(iframeAnalysis.relevantFrame, iframeAnalysis.candidateCards);
        
        const result = {
          success: true,
          pageType: 'iframe_candidates',
          candidateCount: iframeAnalysis.candidateCards.length,
          iframeSrc: iframeAnalysis.iframeSrc,
          candidateElements: iframeAnalysis.candidateCards,
          frame: iframeAnalysis.relevantFrame,
          message: `在iframe中发现 ${iframeAnalysis.candidateCards.length} 个候选人卡片`
        };
        
        logger.info('页面结构分析完成（iframe模式）:', result.message);
        return result;
      }
      
      // 如果没有找到相关iframe或iframe中没有候选人卡片，继续常规页面分析
      logger.info('继续常规页面分析...');
      
      // 分析页面中可能的候选人相关元素
      const pageAnalysis = await this.page.evaluate(() => {
        const analysis = {
          title: document.title,
          url: window.location.href,
          possibleCandidateElements: [],
          allDivs: [],
          pageContent: {
            hasRecommendButton: false,
            hasUserList: false,
            hasCandidateList: false,
            mainContent: ''
          }
        };
        
        // 检查页面是否有推荐相关按钮或内容
        const recommendButtons = document.querySelectorAll('*');
        for (let element of recommendButtons) {
          const text = element.textContent || '';
          if (text.includes('推荐') || text.includes('牛人') || text.includes('候选人')) {
            analysis.pageContent.hasRecommendButton = true;
            break;
          }
        }
        
        // 获取页面主要内容区域的文本
        const mainContent = document.querySelector('body');
        if (mainContent) {
          analysis.pageContent.mainContent = mainContent.textContent.substring(0, 500);
        }
        
        // 查找所有div元素，记录前20个的类名
        const allDivElements = document.querySelectorAll('div');
        analysis.allDivs = Array.from(allDivElements).slice(0, 20).map(div => ({
          className: div.className,
          id: div.id,
          textContent: (div.textContent || '').substring(0, 50)
        }));
        
        // 查找可能包含候选人信息的元素 - 扩展选择器
        const possibleSelectors = [
          // 主要候选人卡片根节点（用户指定的锚点）
          '<li data-vb753c1ac class="card-item">',
          'li[data-v-b753c1ac].card-item',
          'li.card-item[data-v-b753c1ac]',
          
          // Boss直聘特定选择器
          'div.candidate-card-wrap',
          '.candidate-card-wrap',
          'div[data-v-355e62b0]',
          'div[data-v-5b6c77c0]',
          'div[data-v-b753c1ac]',
          'div[data-v-355e62b0][data-v-5b6c77c0][data-v-b753c1ac]',
          
          // 通用候选人相关选择器
          'div[class*="candidate"]',
          'div[class*="user"]',
          'div[class*="talent"]',
          'div[class*="geek"]',
          'div[class*="card"]',
          'div[class*="item"]',
          'div[class*="list"]',
          'div[class*="person"]',
          'div[class*="resume"]',
          'div[class*="profile"]',
          
          // 列表项选择器
          'li[class*="user"]',
          'li[class*="talent"]',
          'li[class*="geek"]',
          'li[class*="candidate"]',
          'li[class*="item"]',
          
          // 链接选择器
          'a[class*="user"]',
          'a[class*="talent"]',
          'a[class*="candidate"]',
          'a[class*="geek"]',
          
          // 属性选择器
          '[ka*="user"]',
          '[ka*="card"]',
          '[ka*="talent"]',
          '[data-ka*="user"]',
          '[data-ka*="card"]',
          
          // Vue组件选择器（具体的data-v属性）
          '[data-v-355e62b0]',
          '[data-v-5b6c77c0]',
          '[data-v-b753c1ac]',
          'div[data-v-355e62b0][class*="card"]',
          'div[data-v-5b6c77c0][class*="wrap"]',
          'div[data-v-b753c1ac][class*="wrap"]',
          
          // 通用容器选择器
          '.user-card',
          '.talent-card',
          '.resume-card',
          '.profile-card'
        ];
        
        possibleSelectors.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              analysis.possibleCandidateElements.push({
                selector: selector,
                count: elements.length,
                sampleClasses: Array.from(elements).slice(0, 3).map(el => el.className),
                sampleText: Array.from(elements).slice(0, 3).map(el => (el.textContent || '').substring(0, 50))
              });
            }
          } catch (error) {
            // 忽略错误，继续分析
          }
        });
        
        return analysis;
      });
      
      logger.info('页面分析结果:', JSON.stringify(pageAnalysis, null, 2));
      
      // 记录页面内容信息
      logger.info('页面内容分析:');
      logger.info(`- 是否有推荐相关内容: ${pageAnalysis.pageContent.hasRecommendButton}`);
      logger.info(`- 页面主要内容: ${pageAnalysis.pageContent.mainContent}`);
      
      // 记录所有div元素信息
      logger.info('页面div元素分析:');
      pageAnalysis.allDivs.forEach((div, index) => {
        logger.info(`- Div ${index + 1}: 类名="${div.className}", ID="${div.id}", 内容="${div.textContent}"`);
      });
      
      // 如果找到可能的候选人元素，记录详细信息并开始自动化处理
      if (pageAnalysis.possibleCandidateElements.length > 0) {
        logger.info('发现可能的候选人元素:');
        pageAnalysis.possibleCandidateElements.forEach(element => {
          logger.info(`- 选择器: ${element.selector}, 数量: ${element.count}`);
          logger.info(`  示例类名: ${element.sampleClasses.join(', ')}`);
          logger.info(`  示例文本: ${element.sampleText.join(', ')}`);
        });
        
        // 开始自动化处理候选人卡片
        await this.processCandidateCards(pageAnalysis.possibleCandidateElements);
        
      } else {
        logger.warn('未发现明显的候选人元素，尝试重新分析...');
        
        // 重试机制 - 再次尝试分析
        await this.retryPageAnalysis();
      }
      
      // 额外的页面状态检查
      await this.checkPageState();
      
    } catch (error) {
      logger.error('页面结构分析失败:', error);
      // 尝试恢复
      await this.recoverFromAnalysisFailure();
    }
  }
  
  /**
   * 自动化处理候选人卡片
   */
  async processCandidateCards(candidateElements) {
    try {
      logger.info('开始自动化处理候选人卡片...');
      
      // 检查是否已停止浏览
      if (!this.browsingStatus.isActive) {
        logger.info('浏览已停止，终止候选人卡片处理');
        return;
      }
      
      // 选择最有可能的候选人卡片选择器
      const bestSelector = this.selectBestCandidateSelector(candidateElements);
      if (!bestSelector) {
        logger.warn('未找到合适的候选人卡片选择器');
        return;
      }
      
      logger.info(`使用选择器: ${bestSelector.selector}`);
      
      // 获取所有候选人卡片
      const candidateCards = await this.page.$$(bestSelector.selector);
      logger.info(`找到 ${candidateCards.length} 个候选人卡片`);
      
      // 限制处理数量，避免过度操作
      const maxCards = Math.min(candidateCards.length, 5);
      logger.info(`将处理前 ${maxCards} 个候选人卡片`);
      
      // 依次处理每个候选人卡片
      for (let i = 0; i < maxCards; i++) {
        // 在每次处理前检查是否已停止浏览
        if (!this.browsingStatus.isActive) {
          logger.info('浏览已停止，终止候选人卡片处理');
          break;
        }
        
        try {
          logger.info(`处理第 ${i + 1} 个候选人卡片...`);
          await this.processSingleCandidateCard(candidateCards[i], i);
          
          // 处理间隔，避免操作过快
          await this.page.waitForTimeout(2000);
          
        } catch (error) {
          logger.error(`处理第 ${i + 1} 个候选人卡片失败:`, error.message);
          continue;
        }
      }
      
      logger.info('候选人卡片自动化处理完成');
      
    } catch (error) {
      logger.error('候选人卡片处理失败:', error);
    }
  }
  
  /**
   * 选择最佳的候选人卡片选择器
   */
  selectBestCandidateSelector(candidateElements) {
    // 优先选择包含'card-item'的选择器
    const cardItemSelector = candidateElements.find(el => 
      el.selector.includes('card-item') && el.count > 0
    );
    
    if (cardItemSelector) {
      return cardItemSelector;
    }
    
    // 其次选择数量最多的选择器
    return candidateElements.reduce((best, current) => {
      return current.count > best.count ? current : best;
    }, candidateElements[0]);
  }
  
  /**
   * 处理单个候选人卡片
   */
  async processSingleCandidateCard(cardElement, index) {
    try {
      logger.info(`点击第 ${index + 1} 个候选人卡片...`);
      
      // 滚动到卡片位置
      await cardElement.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(1000);
      
      // 点击候选人卡片
      await cardElement.click();
      await this.page.waitForTimeout(3000);
      
      // 等待简历页面加载
      await this.waitForResumePageLoad();
      
      // 复制简历内容
      const resumeContent = await this.extractResumeContentFromPage();
      
      if (resumeContent) {
        logger.info(`成功提取第 ${index + 1} 个候选人的简历内容`);
        
        // 上传简历到应用
        await this.uploadResumeToApp(resumeContent, index);
        
      } else {
        logger.warn(`第 ${index + 1} 个候选人简历内容提取失败`);
      }
      
      // 返回到候选人列表页面
      await this.returnToCandidateList();
      
    } catch (error) {
      logger.error(`处理单个候选人卡片失败:`, error.message);
      throw error;
    }
  }
  
  /**
   * 等待简历页面加载
   */
  async waitForResumePageLoad() {
    try {
      // 等待页面跳转或弹窗出现
      await this.page.waitForTimeout(2000);
      
      // 检查是否有简历相关内容
      const resumeIndicators = [
        '.resume-content',
        '.profile-content',
        '.user-detail',
        '[class*="resume"]',
        '[class*="profile"]',
        '[class*="detail"]'
      ];
      
      for (const selector of resumeIndicators) {
        try {
          await this.page.waitForSelector(selector, { timeout: 3000 });
          logger.info(`简历页面加载完成，找到元素: ${selector}`);
          return;
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }
      
      logger.info('简历页面加载完成（通用等待）');
      
    } catch (error) {
      logger.warn('等待简历页面加载失败:', error.message);
    }
  }
  
  /**
   * 从页面提取简历内容（优先使用Hook方式）
   */
  async extractResumeContentFromPage() {
    try {
      logger.info('开始从主页面提取简历内容（优先使用Hook方式）');
      
      // 方法1：优先尝试Hook方式复制（针对Canvas简历）
      try {
        logger.info('尝试使用Hook方式复制主页面Canvas简历');
        
        // 检查页面中是否有canvas#resume元素
        const hasCanvas = await this.page.locator('canvas#resume').count();
        if (hasCanvas > 0) {
          logger.info('发现主页面canvas#resume元素，使用Hook方式复制');
          
          const hookText = await this.dragSelectionService.copyResumeByHook(this.page, {
            frameSelector: null, // 主页面不需要iframe切换
            canvasSelector: 'canvas#resume',
            margin: 5,
            dragSteps: 30,
            waitTime: 500
          });
          
          if (hookText && hookText.trim()) {
            logger.info(`主页面Hook方式复制成功，获取到 ${hookText.length} 个字符的内容`);
            return hookText;
          } else {
            logger.warn('主页面Hook方式复制未获取到有效内容');
          }
        } else {
          logger.info('主页面未发现canvas#resume元素，跳过Hook方式');
        }
      } catch (hookError) {
        logger.warn('主页面Hook方式复制失败:', hookError.message);
      }
      
      // 方法2：使用传统的选择器方式提取简历内容
      logger.info('使用传统选择器方式提取简历内容');
      const resumeContent = await this.page.evaluate(() => {
        // 优先检测resume-detail-wrap组件（在线简历内容）
        const resumeDetailWrap = document.querySelector('.resume-detail-wrap');
        if (resumeDetailWrap) {
          // 克隆元素以避免修改原DOM
          const clonedElement = resumeDetailWrap.cloneNode(true);
          
          // 移除不需要的组件内容
          const excludeSelectors = [
            '.resume-warning',
            '.resume-anonymous-geek-card.v2'
          ];
          
          excludeSelectors.forEach(selector => {
            const elementsToRemove = clonedElement.querySelectorAll(selector);
            elementsToRemove.forEach(el => el.remove());
          });
          
          const content = clonedElement.textContent.trim();
          if (content.length > 100) {
            return {
              content: content,
              source: '.resume-detail-wrap (在线简历)'
            };
          }
        }
        
        // 尝试其他方式获取简历内容
        const contentSelectors = [
          '.resume-content',
          '.profile-content', 
          '.user-detail',
          '.candidate-detail',
          '.talent-detail',
          'main',
          '.main-content',
          '[class*="content"]'
        ];
        
        for (const selector of contentSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim().length > 100) {
            return {
              content: element.textContent.trim(),
              source: selector
            };
          }
        }
        
        // 如果没有找到特定容器，获取body内容
        const bodyContent = document.body.textContent.trim();
        if (bodyContent.length > 100) {
          return {
            content: bodyContent,
            source: 'body'
          };
        }
        
        return null;
      });
      
      if (resumeContent) {
        logger.info(`简历内容提取成功，来源: ${resumeContent.source}，长度: ${resumeContent.content.length}`);
        return resumeContent.content;
      }
      
      return null;
      
    } catch (error) {
      logger.error('提取简历内容失败:', error);
      return null;
    }
  }
  
  /**
   * 从主页面的canvas#resume元素中提取文字内容
   */

  
  /**
   * 上传简历到应用
   */
  async uploadResumeToApp(resumeContent, candidateIndex) {
    try {
      logger.info(`开始上传第 ${candidateIndex + 1} 个候选人的简历到应用...`);
      
      // 检查是否已停止浏览
      if (!this.browsingStatus.isActive) {
        logger.info('浏览已停止，终止简历上传');
        return;
      }
      
      // 检查浏览器连接状态，如果断开则尝试重启
      if (!this.browser || !this.browser.isConnected()) {
        logger.warn('浏览器连接已断开，尝试重新初始化浏览器...');
        try {
          await this.initializeBrowser();
          logger.info('浏览器重新初始化成功');
        } catch (restartError) {
          logger.error('浏览器重启失败:', restartError);
          return;
        }
      }
      
      // 检查是否已有应用页面，如果没有则在同一浏览器窗口中创建新标签页
      if (!this.appPage || this.appPage.isClosed()) {
        // 直接使用浏览器创建新页面，确保在同一窗口的不同标签页中
        this.appPage = await this.browser.newPage();
        
        // 设置页面不会被自动关闭
        this.appPage.on('close', () => {
          logger.warn('应用页面被意外关闭，将在下次使用时重新创建');
          this.appPage = null;
        });
        
        // 导航到应用页面，添加超时控制
        await this.appPage.goto('http://localhost:3000', { 
          waitUntil: 'networkidle',
          timeout: 15000
        });
        await this.appPage.waitForTimeout(1500);
        logger.info('在同一浏览器窗口中创建应用页面并导航到 http://localhost:3000');
      } else {
        // 如果应用页面已存在，切换到应用页面并刷新到首页
        try {
          await this.appPage.bringToFront();
          // 检查当前URL，如果不在首页则导航到首页
          const currentUrl = this.appPage.url();
          if (!currentUrl.includes('localhost:3000') || currentUrl !== 'http://localhost:3000/') {
            await this.appPage.goto('http://localhost:3000', { 
              waitUntil: 'networkidle',
              timeout: 10000
            });
          }
          await this.appPage.waitForTimeout(1000);
          logger.info('切换到现有应用页面');
        } catch (navError) {
          logger.warn('切换到应用页面失败，尝试重新创建页面:', navError.message);
          this.appPage = await this.browser.newPage();
          
          // 设置页面关闭监听
          this.appPage.on('close', () => {
            logger.warn('应用页面被意外关闭，将在下次使用时重新创建');
            this.appPage = null;
          });
          
          await this.appPage.goto('http://localhost:3000', { 
            waitUntil: 'networkidle',
            timeout: 15000
          });
          await this.appPage.waitForTimeout(1500);
          logger.info('重新创建应用页面成功');
        }
      }
      
      // 点击简历列表菜单项
      try {
        const resumeListButton = await this.appPage.$('text=简历列表');
        if (resumeListButton) {
          await resumeListButton.click();
          await this.appPage.waitForTimeout(1000);
          logger.info('成功导航到简历列表页面');
        }
      } catch (menuError) {
        logger.warn('点击简历列表菜单失败:', menuError.message);
      }
      
      // 点击上传简历按钮
      const uploadButton = await this.appPage.$('text=上传简历');
      if (uploadButton) {
        await uploadButton.click();
        await this.appPage.waitForTimeout(1000);
        logger.info('点击上传简历按钮');
      }
      
      // 选择文本粘贴选项
      const textPasteOption = await this.appPage.$('text=文本粘贴');
      if (textPasteOption) {
        await textPasteOption.click();
        await this.appPage.waitForTimeout(500);
        logger.info('选择文本粘贴选项');
      }
      
      // 在简历文本区域粘贴内容
      const resumeTextArea = await this.appPage.$('textarea[placeholder*="简历文本"], textarea[placeholder*="粘贴"], .ant-input');
      if (resumeTextArea) {
        await resumeTextArea.fill(resumeContent);
        await this.appPage.waitForTimeout(500);
        logger.info('简历内容已粘贴到文本区域');
      }
      
      // 选择简历来源为Boss直聘
      try {
        const sourceDropdown = await this.appPage.$('.ant-select-selector');
        if (sourceDropdown) {
          await sourceDropdown.click();
          await this.appPage.waitForTimeout(500);
          
          // 选择Boss直聘选项
          const bossZhipinOption = await this.appPage.$('text=Boss直聘');
          if (bossZhipinOption) {
            await bossZhipinOption.click();
            await this.appPage.waitForTimeout(500);
            logger.info('选择简历来源为Boss直聘');
          }
        }
      } catch (sourceError) {
        logger.warn('选择简历来源失败:', sourceError.message);
      }
      
      // 点击解析文本按钮
      const parseButton = await this.appPage.$('text=解析文本');
      if (parseButton) {
        await parseButton.click();
        await this.appPage.waitForTimeout(2000); // 减少等待时间
        logger.info('点击解析文本按钮，等待解析完成');
        
        // 调用确认添加逻辑，确保简历成功入库
        const addSuccess = await this.clickConfirmWithRetry(this.appPage);
        if (addSuccess) {
          logger.info(`第 ${candidateIndex + 1} 个候选人的简历添加成功`);
          // 等待一下确保操作完全完成
          await this.appPage.waitForTimeout(1500);
        } else {
          logger.error(`第 ${candidateIndex + 1} 个候选人的简历添加失败`);
        }
      } else {
        logger.error('未找到解析文本按钮');
      }
      
      logger.info(`第 ${candidateIndex + 1} 个候选人的简历处理完成`);
      
      // 简历处理完成后，应用页面和Boss直聘页面都保持打开状态，便于后续操作
      
    } catch (error) {
      logger.error('上传简历到应用失败:', error);
      
      // 检查是否是连接相关错误
      if (error.message.includes('Target closed') ||
          error.message.includes('Protocol error') ||
          error.message.includes('Session closed') ||
          error.message.includes('Navigation timeout')) {
        logger.error('检测到连接或超时问题，尝试恢复连接');
        await this.recoverFromConnectionError();
      }
    }
  }
  
  /**
   * 返回到候选人列表页面
   */
  async returnToCandidateList() {
    try {
      // 检查是否已停止浏览
      if (!this.browsingStatus.isActive) {
        logger.info('浏览已停止，终止返回操作');
        return;
      }
      
      // 优先尝试点击空白位置返回
      try {
        // 点击页面左上角空白区域
        await this.page.click('body', { position: { x: 50, y: 50 } });
        await this.page.waitForTimeout(1000);
        
        // 检查是否成功返回到列表页面
        const listIndicators = [
          '.card-item',
          '[class*="candidate"]',
          '[class*="list"]'
        ];
        
        for (const selector of listIndicators) {
          const elements = await this.page.$$(selector);
          if (elements.length > 1) {
            logger.info('通过点击空白位置成功返回候选人列表');
            return;
          }
        }
      } catch (error) {
        logger.warn('点击空白位置返回失败，尝试其他方式:', error.message);
      }
      
      // 尝试点击返回按钮
      const backButtons = [
        '.back-btn',
        '.return-btn', 
        '[class*="back"]',
        '[class*="return"]',
        '.close-btn',
        '[class*="close"]'
      ];
      
      for (const selector of backButtons) {
        try {
          const backBtn = await this.page.$(selector);
          if (backBtn) {
            await backBtn.click();
            await this.page.waitForTimeout(2000);
            logger.info('通过返回按钮返回候选人列表');
            return;
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }
      
      // 尝试按ESC键关闭
      try {
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(1000);
        logger.info('通过ESC键返回候选人列表');
        return;
      } catch (error) {
        logger.warn('ESC键返回失败:', error.message);
      }
      
      // 最后使用浏览器后退
      await this.page.goBack();
      await this.page.waitForTimeout(2000);
      logger.info('通过浏览器后退返回候选人列表');
      
    } catch (error) {
      logger.error('返回候选人列表失败:', error);
    }
  }
  
  /**
   * 处理iframe中的候选人卡片
   */
  async processCandidateCardsInIframe(frame, candidateCards) {
    try {
      logger.info('开始处理iframe中的候选人卡片...');
      
      // 检查是否已停止浏览
      if (!this.browsingStatus.isActive) {
        logger.info('浏览已停止，终止iframe中候选人卡片处理');
        return;
      }
      
      if (!frame) {
        logger.error('iframe frame对象无效');
        return;
      }
      
      // 限制处理数量
      const maxCards = Math.min(candidateCards.length, 5);
      logger.info(`将处理iframe中前 ${maxCards} 个候选人卡片`);
      
      // 在iframe中查找实际的卡片元素
      const cardElements = await frame.$$('li.card-item');
      
      for (let i = 0; i < Math.min(maxCards, cardElements.length); i++) {
        // 在每次处理前检查是否已停止浏览
        if (!this.browsingStatus.isActive) {
          logger.info('浏览已停止，终止iframe中候选人卡片处理');
          break;
        }
        
        try {
          logger.info(`处理iframe中第 ${i + 1} 个候选人卡片...`);
          await this.processSingleCandidateCardInIframe(frame, cardElements[i], i);
          
          // 处理间隔
          await this.page.waitForTimeout(2000);
          
        } catch (error) {
          logger.error(`处理iframe中第 ${i + 1} 个候选人卡片失败:`, error.message);
          continue;
        }
      }
      
      logger.info('iframe中候选人卡片处理完成');
      
    } catch (error) {
      logger.error('处理iframe中候选人卡片失败:', error);
    }
  }
  
  /**
   * 处理iframe中的单个候选人卡片
   */
  async processSingleCandidateCardInIframe(frame, cardElement, index) {
    try {
      logger.info(`点击iframe中第 ${index + 1} 个候选人卡片...`);
      
      // 在iframe中滚动到卡片位置
      await cardElement.scrollIntoViewIfNeeded();
      await frame.waitForTimeout(1000);
      
      // 点击候选人卡片
      await cardElement.click();
      await frame.waitForTimeout(3000);
      
      // 等待简历页面在iframe中加载
      await this.waitForResumePageLoadInIframe(frame);
      
      // 从iframe中提取简历内容
      const resumeContent = await this.extractResumeContentFromIframe(frame);
      
      if (resumeContent) {
        logger.info(`成功从iframe提取第 ${index + 1} 个候选人的简历内容`);
        
        // 上传简历到应用
        await this.uploadResumeToApp(resumeContent, index);
        
      } else {
        logger.warn(`iframe中第 ${index + 1} 个候选人简历内容提取失败`);
      }
      
      // 在iframe中返回到候选人列表
      await this.returnToCandidateListInIframe(frame);
      
    } catch (error) {
      logger.error(`处理iframe中单个候选人卡片失败:`, error.message);
      throw error;
    }
  }
  
  /**
   * 等待iframe中简历页面加载
   */
  async waitForResumePageLoadInIframe(frame) {
    try {
      await frame.waitForTimeout(2000);
      
      const resumeIndicators = [
        '.resume-content',
        '.profile-content',
        '.user-detail',
        '[class*="resume"]',
        '[class*="profile"]',
        '[class*="detail"]'
      ];
      
      for (const selector of resumeIndicators) {
        try {
          await frame.waitForSelector(selector, { timeout: 3000 });
          logger.info(`iframe简历页面加载完成，找到元素: ${selector}`);
          return;
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }
      
      logger.info('iframe简历页面加载完成（通用等待）');
      
    } catch (error) {
      logger.warn('等待iframe简历页面加载失败:', error.message);
    }
  }
  
  /**
   * 从iframe中提取简历内容
   */
  async extractResumeContentFromIframe(frame) {
    try {
      // 首先尝试提取canvas#resume中的文字内容
      const canvasContent = await this.extractCanvasResumeContent(frame);
      if (canvasContent) {
        logger.info(`从canvas#resume提取简历内容成功，长度: ${canvasContent.length}`);
        return canvasContent;
      }
      
      // 如果canvas提取失败，使用原有的选择器方式
      const resumeContent = await frame.evaluate(() => {
        // 优先检测resume-detail-wrap组件（在线简历内容）
        const resumeDetailWrap = document.querySelector('.resume-detail-wrap');
        if (resumeDetailWrap) {
          // 克隆元素以避免修改原DOM
          const clonedElement = resumeDetailWrap.cloneNode(true);
          
          // 移除不需要的组件内容
          const excludeSelectors = [
            '.resume-warning',
            '.resume-anonymous-geek-card.v2'
          ];
          
          excludeSelectors.forEach(selector => {
            const elementsToRemove = clonedElement.querySelectorAll(selector);
            elementsToRemove.forEach(el => el.remove());
          });
          
          const content = clonedElement.textContent.trim();
          if (content.length > 100) {
            return {
              content: content,
              source: '.resume-detail-wrap (iframe在线简历)'
            };
          }
        }
        
        // 尝试其他方式获取简历内容
        const contentSelectors = [
          '.resume-content',
          '.profile-content', 
          '.user-detail',
          '.candidate-detail',
          '.talent-detail',
          'main',
          '.main-content',
          '[class*="content"]'
        ];
        
        for (const selector of contentSelectors) {
          const element = document.querySelector(selector);
          if (element && element.textContent.trim().length > 100) {
            return {
              content: element.textContent.trim(),
              source: selector
            };
          }
        }
        
        const bodyContent = document.body.textContent.trim();
        if (bodyContent.length > 100) {
          return {
            content: bodyContent,
            source: 'body'
          };
        }
        
        return null;
      });
      
      if (resumeContent) {
        logger.info(`iframe简历内容提取成功，来源: ${resumeContent.source}，长度: ${resumeContent.content.length}`);
        return resumeContent.content;
      }
      
      return null;
      
    } catch (error) {
      logger.error('从iframe提取简历内容失败:', error);
      return null;
    }
  }
  
  /**
   * 查找包含简历内容的特定iframe
   */
  async findResumeIframe(page) {
    try {
      // 查找所有iframe元素
      const iframes = await page.$$('iframe');
      
      for (const iframe of iframes) {
        // 获取iframe的src属性
        const src = await iframe.getAttribute('src');
        
        if (src && src.includes('/web/frame/c-resume/?source=search')) {
          logger.info(`找到简历iframe，src: ${src}`);
          
          // 获取iframe的contentFrame
          const frame = await iframe.contentFrame();
          if (frame) {
            // 等待iframe内容加载
            await frame.waitForTimeout(1000);
            return frame;
          }
        }
      }
      
      logger.warn('未找到包含简历内容的iframe');
      return null;
      
    } catch (error) {
      logger.error('查找简历iframe失败:', error);
      return null;
    }
  }

  /**
   * 从canvas#resume元素中提取文字内容（优先使用Hook方式）
   */
  async extractCanvasResumeContent(frame) {
    try {
      logger.info('开始从canvas#resume提取简历内容（优先使用Hook方式）');
      
      // 方法1：优先使用Hook方式复制（推荐）
      try {
        logger.info('开始使用Hook方式复制技术');
        
        const hookText = await this.dragSelectionService.copyResumeByHook(this.page, {
          frameSelector: '/web/frame/c-resume/?source=search',
          canvasSelector: 'canvas#resume',
          margin: 5,
          dragSteps: 30,
          waitTime: 500
        });
        
        if (hookText && hookText.trim()) {
          logger.info(`Hook方式复制成功，获取到 ${hookText.length} 个字符的内容`);
          return hookText;
        } else {
          logger.warn('Hook方式复制未获取到有效内容');
          throw new Error('Hook方式复制未获取到有效内容');
        }
      } catch (hookError) {
        logger.warn('Hook方式复制失败，尝试传统拖拽选区方式:', hookError);
        
        // 方法2：备选使用传统拖拽选区复制
        try {
          logger.info('开始使用传统拖拽选区复制技术');
          
          const dragText = await this.dragSelectionService.copyResumeByDragSelection(this.page, {
            frameSelector: 'iframe[src*="c-resume"]',
            canvasSelector: 'canvas#resume',
            margin: 5,
            dragSteps: 30,
            waitTime: 500,
            checkPermissions: true
          });
          
          if (dragText && dragText.trim()) {
            logger.info(`传统拖拽选区复制成功，获取到 ${dragText.length} 个字符的内容`);
            return dragText;
          } else {
            logger.warn('传统拖拽选区复制未获取到有效内容');
            throw new Error('传统拖拽选区复制未获取到有效内容');
          }
        } catch (dragError) {
          logger.error('传统拖拽选区复制也失败:', dragError);
          throw dragError;
        }
      }
      
      // 已禁用传统方法和OCR识别
      // logger.info('拖拽选区复制失败，开始使用传统方法获取文本数据');
      
      /*
      // 传统方法和OCR识别已被禁用
      // 如需启用，请取消以下代码的注释
      
      const canvasContent = await frame.evaluate(() => {
        // 查找canvas#resume元素
        const canvas = document.querySelector('canvas#resume');
        if (!canvas) {
          return null;
        }
        
        // 检查canvas是否有相关的文本数据属性
        const textData = canvas.getAttribute('data-text') || 
                        canvas.getAttribute('data-content') ||
                        canvas.getAttribute('data-resume');
        
        if (textData) {
          return { type: 'attribute', content: textData };
        }
        
        // 检查canvas父元素或兄弟元素是否包含文本内容
        const parent = canvas.parentElement;
        if (parent) {
          // 查找隐藏的文本元素
          const hiddenText = parent.querySelector('[style*="display: none"]') ||
                           parent.querySelector('[style*="visibility: hidden"]') ||
                           parent.querySelector('.sr-only') ||
                           parent.querySelector('.visually-hidden');
          
          if (hiddenText && hiddenText.textContent.trim()) {
            return { type: 'hidden', content: hiddenText.textContent.trim() };
          }
          
          // 查找data属性中的文本
          const dataText = parent.getAttribute('data-text') ||
                          parent.getAttribute('data-content') ||
                          parent.getAttribute('data-resume');
          
          if (dataText) {
            return { type: 'parent_attribute', content: dataText };
          }
        }
        
        // 检查是否有相关的script标签包含简历数据
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
          const scriptContent = script.textContent || script.innerHTML;
          if (scriptContent.includes('resume') || scriptContent.includes('简历')) {
            // 尝试解析JSON数据
            try {
              const jsonMatch = scriptContent.match(/\{[^}]*".*?resume.*?"[^}]*\}/gi);
              if (jsonMatch) {
                for (const match of jsonMatch) {
                  const data = JSON.parse(match);
                  if (data.content || data.text || data.resume) {
                    return { type: 'script', content: data.content || data.text || data.resume };
                  }
                }
              }
            } catch (e) {
              // 忽略JSON解析错误
            }
          }
        }
        
        return null;
      });
      
      // 如果传统方法获取到了内容，直接返回
      if (canvasContent && canvasContent.content) {
        logger.info(`通过${canvasContent.type}方法获取到简历内容`);
        return canvasContent.content;
      }
      
      // 第三优先级：传统方法失败，使用OCR技术截图识别
      logger.info('传统方法未获取到内容，开始使用OCR技术识别canvas内容');
      
      try {
        // 使用OCR服务截图并识别文字
        const ocrText = await this.canvasOcrService.captureAndRecognizeCanvas(frame, 'canvas#resume');
        
        if (ocrText && ocrText.trim()) {
          logger.info(`OCR识别成功，获取到 ${ocrText.length} 个字符的内容`);
          return ocrText;
        } else {
          logger.warn('OCR识别未获取到有效内容');
        }
      } catch (ocrError) {
        logger.error('OCR识别失败:', ocrError);
      }
      
      logger.warn('所有简历识别方式均失败，返回空内容');
      return null;
      */
      
      // 当前仅使用拖拽选区复制技术，传统方法和OCR已禁用
      logger.warn('拖拽选区复制失败，传统方法和OCR已被禁用');
      return null;
      
    } catch (error) {
      logger.error('从canvas#resume提取内容失败:', error);
      return null;
    }
  }




  



  
  /**
   * 在iframe中返回到候选人列表
   */
  async returnToCandidateListInIframe(frame) {
    try {
      const backButtons = [
        '.back-btn',
        '.return-btn', 
        '[class*="back"]',
        '[class*="return"]'
      ];
      
      for (const selector of backButtons) {
        try {
          const backBtn = await frame.$(selector);
          if (backBtn) {
            await backBtn.click();
            await frame.waitForTimeout(2000);
            logger.info('通过返回按钮返回iframe候选人列表');
            return;
          }
        } catch (error) {
          // 继续尝试下一个选择器
        }
      }
      
      // iframe中可能需要特殊的返回处理
      logger.info('iframe中未找到返回按钮，等待页面自动刷新');
      await frame.waitForTimeout(2000);
      
    } catch (error) {
      logger.error('iframe中返回候选人列表失败:', error);
    }
  }
  
  /**
   * 检测和分析iframe
   */
  async detectAndAnalyzeIframes() {
    try {
      logger.info('检测页面中的iframe...');
      
      // 等待iframe加载
      await this.page.waitForTimeout(2000);
      
      // 查找所有iframe
      const iframes = await this.page.$$('iframe');
      logger.info(`发现 ${iframes.length} 个iframe`);
      
      if (iframes.length === 0) {
        logger.info('未发现iframe，继续常规页面分析');
        return { hasIframes: false };
      }
      
      // 分析每个iframe
      for (let i = 0; i < iframes.length; i++) {
        const iframe = iframes[i];
        
        try {
          // 获取iframe的src属性
          const src = await iframe.getAttribute('src');
          logger.info(`iframe ${i + 1} src: ${src}`);
          
          // 检查src是否包含候选人相关关键字
          if (src && this.isRelevantIframe(src)) {
            logger.info(`发现相关iframe: ${src}`);
            
            // 等待iframe内容加载
            await this.page.waitForTimeout(3000);
            
            // 获取iframe的frame对象
            const frame = await iframe.contentFrame();
            if (frame) {
              logger.info('成功获取iframe frame对象');
              
              // 在iframe内查找候选人卡片
              const candidateCards = await this.findCandidateCardsInFrame(frame);
              
              if (candidateCards.length > 0) {
                logger.info(`在iframe中发现 ${candidateCards.length} 个候选人卡片`);
                return {
                  hasIframes: true,
                  relevantFrame: frame,
                  candidateCards: candidateCards,
                  iframeSrc: src
                };
              }
            }
          }
        } catch (error) {
          logger.warn(`分析iframe ${i + 1} 时出错:`, error.message);
        }
      }
      
      return { hasIframes: true, relevantFrame: null };
      
    } catch (error) {
      logger.error('iframe检测失败:', error);
      return { hasIframes: false };
    }
  }
  
  /**
   * 判断iframe是否相关（包含候选人列表或详情页）
   */
  isRelevantIframe(src) {
    const keywords = [
      'geek', 'talent', 'candidate', 'resume', 'user',
      '牛人', '候选人', '简历', '人才',
      'recommend', 'list', 'detail'
    ];
    
    return keywords.some(keyword => 
      src.toLowerCase().includes(keyword.toLowerCase())
    );
  }
  
  /**
   * 在iframe中查找候选人卡片
   */
  async findCandidateCardsInFrame(frame) {
    try {
      // 等待iframe内容加载
      await frame.waitForTimeout(2000);
      
      // 在iframe中查找候选人卡片
      const candidateCards = await frame.evaluate(() => {
        const cards = [];
        
        // 主要选择器：li.card-item
        const cardItems = document.querySelectorAll('li.card-item');
        
        cardItems.forEach((card, index) => {
          cards.push({
            index: index,
            className: card.className,
            textContent: (card.textContent || '').substring(0, 100),
            hasDataV: card.hasAttribute('data-v-b753c1ac')
          });
        });
        
        return cards;
      });
      
      logger.info(`iframe中找到 ${candidateCards.length} 个候选人卡片`);
      return candidateCards;
      
    } catch (error) {
      logger.warn('在iframe中查找候选人卡片失败:', error.message);
      return [];
    }
  }
  
  /**
   * 重试页面分析
   */
  async retryPageAnalysis() {
    try {
      logger.info('开始重试页面分析...');
      
      // 刷新页面
      await this.page.reload({ waitUntil: 'networkidle' });
      await this.page.waitForTimeout(3000);
      
      // 再次模拟人类行为
      await this.simulateHumanBehavior();
      
      // 尝试不同的页面交互
      await this.tryDifferentInteractions();
      
    } catch (error) {
      logger.error('重试页面分析失败:', error);
    }
  }
  
  /**
   * 尝试不同的页面交互
   */
  async tryDifferentInteractions() {
    try {
      // 尝试点击不同的标签或按钮
      const interactionSelectors = [
        'a[href*="recommend"]',
        'button[class*="recommend"]',
        'div[class*="tab"]',
        'li[class*="tab"]',
        '.nav-item',
        '.menu-item'
      ];
      
      for (const selector of interactionSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            await this.page.waitForTimeout(2000);
            break;
          }
        } catch (error) {
          // 继续尝试下一个
        }
      }
      
    } catch (error) {
      logger.warn('页面交互尝试失败:', error);
    }
  }
  
  /**
   * 检查页面状态
   */
  async checkPageState() {
    try {
      const pageState = await this.page.evaluate(() => {
        return {
          readyState: document.readyState,
          hasJavaScript: typeof window.jQuery !== 'undefined' || typeof window.Vue !== 'undefined',
          totalElements: document.querySelectorAll('*').length,
          hasAsyncContent: document.querySelectorAll('[data-v-355e62b0], [data-v-5b6c77c0], [data-v-b753c1ac]').length > 0,
          currentUrl: window.location.href,
          pageTitle: document.title
        };
      });
      
      logger.info('页面状态检查:', JSON.stringify(pageState, null, 2));
      
    } catch (error) {
      logger.warn('页面状态检查失败:', error);
    }
  }
  
  /**
   * 从分析失败中恢复
   */
  async recoverFromAnalysisFailure() {
    try {
      logger.info('尝试从分析失败中恢复...');
      
      // 清除可能的弹窗
      await this.closePopups();
      
      // 等待更长时间
      await this.page.waitForTimeout(5000);
      
      // 尝试重新导航
      const currentUrl = this.page.url();
      if (!currentUrl.includes('web.boss.zhipin.com')) {
        await this.navigateToRecruitmentPage();
      }
      
    } catch (error) {
      logger.error('恢复失败:', error);
    }
  }

  /**
   * 模拟人类行为 - 随机鼠标移动和滚动
   */
  async simulateHumanBehavior() {
    try {
      // 随机鼠标移动
      const viewport = await this.page.viewportSize();
      const randomX = Math.floor(Math.random() * viewport.width);
      const randomY = Math.floor(Math.random() * viewport.height);
      
      await this.page.mouse.move(randomX, randomY, { steps: 10 });
      await this.page.waitForTimeout(Math.random() * 1000 + 500);
      
      // 随机小幅滚动
      await this.page.mouse.wheel(0, Math.random() * 200 - 100);
      await this.page.waitForTimeout(Math.random() * 500 + 200);
      
    } catch (error) {
      logger.warn('模拟人类行为失败:', error);
    }
  }
  
  /**
   * 等待页面完全加载 - 多种策略
   */
  async waitForPageFullyLoaded() {
    try {
      // 策略1: 等待网络空闲
      await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      
      // 策略2: 等待DOM内容加载
      await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => {});
      
      // 策略3: 等待特定时间
      await this.page.waitForTimeout(3000);
      
      // 策略4: 等待页面中有内容出现
      await this.page.waitForFunction(() => {
        return document.querySelectorAll('div').length > 10;
      }, { timeout: 5000 }).catch(() => {});
      
    } catch (error) {
      logger.warn('等待页面加载失败:', error);
    }
  }
  
  /**
   * 尝试触发页面内容加载
   */
  async triggerContentLoading() {
    try {
      // 滚动到页面顶部
      await this.page.evaluate(() => window.scrollTo(0, 0));
      await this.page.waitForTimeout(1000);
      
      // 缓慢滚动到页面中部
      await this.page.evaluate(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollTo(0, scrollHeight / 3);
      });
      await this.page.waitForTimeout(2000);
      
      // 尝试点击可能的加载按钮或区域
      const loadTriggers = [
        'button[class*="load"]',
        'div[class*="load"]',
        'a[class*="more"]',
        '.load-more',
        '.show-more'
      ];
      
      for (const selector of loadTriggers) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            await this.page.waitForTimeout(1000);
            break;
          }
        } catch (error) {
          // 忽略错误，继续尝试下一个
        }
      }
      
    } catch (error) {
      logger.warn('触发内容加载失败:', error);
    }
  }

  /**
   * 滚动页面加载更多候选人
   */
  async scrollToLoadMoreCandidates() {
    try {
      // 当页面候选人浏览完毕时，自动向下滚动刷新更多候选人
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await this.page.waitForTimeout(3000); // 等待新内容加载
      
      // 检查是否有加载更多按钮
      const loadMoreButton = await this.page.$('button:has-text("加载更多"), button:has-text("更多")');
      if (loadMoreButton) {
        await loadMoreButton.click();
        await this.page.waitForTimeout(2000);
      }
      
    } catch (error) {
      logger.error('滚动加载更多候选人失败:', error);
    }
  }

  /**
   * 应用搜索筛选条件
   */
  /**
   * 应用搜索筛选条件（旧版本，保留兼容性）
   * @param {object} filters - 筛选条件对象
   */
  async applySearchFiltersLegacy(filters) {
    try {
      logger.info('应用搜索筛选条件:', filters);
      
      // 等待页面加载完成
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);
      
      // 学历要求筛选
      if (filters.education && filters.education !== '') {
        logger.info(`设置学历要求筛选: ${filters.education}`);
        try {
          const educationSelectors = [
            'text=学历',
            'text=学历要求',
            'text=最低学历',
            '.filter-education',
            '[data-filter="education"]'
          ];
          
          for (const selector of educationSelectors) {
            const element = await this.page.$(selector);
            if (element) {
              await element.click();
              await this.page.waitForTimeout(500);
              
              const optionElement = await this.page.$(`text=${filters.education}`);
              if (optionElement) {
                await optionElement.click();
                await this.page.waitForTimeout(500);
                logger.info(`学历要求筛选设置成功: ${filters.education}`);
                break;
              }
            }
          }
        } catch (error) {
          logger.warn('学历要求筛选设置失败:', error.message);
        }
      }
      
      // 院校要求筛选
      if (filters.university && filters.university !== '') {
        logger.info(`设置院校要求筛选: ${filters.university}`);
        try {
          const universitySelectors = [
            'text=院校',
            'text=院校要求',
            'text=毕业院校',
            'text=学校类型',
            '.filter-university',
            '[data-filter="university"]'
          ];
          
          for (const selector of universitySelectors) {
            const element = await this.page.$(selector);
            if (element) {
              await element.click();
              await this.page.waitForTimeout(500);
              
              const optionElement = await this.page.$(`text=${filters.university}`);
              if (optionElement) {
                await optionElement.click();
                await this.page.waitForTimeout(500);
                logger.info(`院校要求筛选设置成功: ${filters.university}`);
                break;
              }
            }
          }
        } catch (error) {
          logger.warn('院校要求筛选设置失败:', error.message);
        }
      }
      
      // 经验要求筛选
      if (filters.experience && filters.experience !== '') {
        logger.info(`设置经验要求筛选: ${filters.experience}`);
        try {
          const experienceSelectors = [
            'text=工作经验',
            'text=经验要求',
            'text=工作年限',
            '.filter-experience',
            '[data-filter="experience"]'
          ];
          
          for (const selector of experienceSelectors) {
            const element = await this.page.$(selector);
            if (element) {
              await element.click();
              await this.page.waitForTimeout(500);
              
              const optionElement = await this.page.$(`text=${filters.experience}`);
              if (optionElement) {
                await optionElement.click();
                await this.page.waitForTimeout(500);
                logger.info(`经验要求筛选设置成功: ${filters.experience}`);
                break;
              }
            }
          }
        } catch (error) {
          logger.warn('经验要求筛选设置失败:', error.message);
        }
      }
      
      // 年龄要求筛选
      if (filters.age && filters.age !== '') {
        logger.info(`设置年龄要求筛选: ${filters.age}`);
        try {
          const ageSelectors = [
            'text=年龄',
            'text=年龄要求',
            'text=年龄范围',
            '.filter-age',
            '[data-filter="age"]'
          ];
          
          for (const selector of ageSelectors) {
            const element = await this.page.$(selector);
            if (element) {
              await element.click();
              await this.page.waitForTimeout(500);
              
              const optionElement = await this.page.$(`text=${filters.age}`);
              if (optionElement) {
                await optionElement.click();
                await this.page.waitForTimeout(500);
                logger.info(`年龄要求筛选设置成功: ${filters.age}`);
                break;
              }
            }
          }
        } catch (error) {
          logger.warn('年龄要求筛选设置失败:', error.message);
        }
      }
      
      logger.info('筛选条件应用完成');
      
    } catch (error) {
      logger.error('应用搜索筛选条件失败:', error);
      throw error;
    }
  }
  


  /**
   * 等待iframe加载完成
   */
  async waitForIframeLoad() {
    try {
      logger.info('等待iframe加载完成...');
      await this.page.waitForTimeout(3000);
      
      // 等待iframe元素出现
      await this.page.waitForSelector('iframe', { timeout: 10000 });
      logger.info('iframe加载完成');
      
    } catch (error) {
      logger.warn('等待iframe加载超时:', error.message);
    }
  }

  /**
   * 获取搜索页面的iframe
   */
  async getSearchIframe() {
    try {
      logger.info('获取搜索页面iframe...');
      
      const iframes = await this.page.$$('iframe');
      logger.info(`发现 ${iframes.length} 个iframe`);
      
      for (let i = 0; i < iframes.length; i++) {
        const iframe = iframes[i];
        const src = await iframe.getAttribute('src');
        logger.info(`iframe ${i + 1} src: ${src}`);
        
        // 优先使用内容特征判断（筛选区 / 结果卡片）
        const frame = await iframe.contentFrame();
        if (frame) {
          try {
            const hasFilter = await frame.$('div.check-params-options-content, div.check-params-options-content-1015gray, div.check-param-options-content-1013gray');
            const hasCards = await frame.$('div.card-container, .candidate-card-wrap, li.card-item');
            if (hasFilter || hasCards) {
              logger.info('通过内容特征匹配到搜索相关iframe');
              return frame;
            }
          } catch (_) {}
        }

        // 次要策略：根据 src 关键词匹配
        if (src && (src.includes('geek') || src.includes('search') || src.includes('talent'))) {
          const bySrc = await iframe.contentFrame();
          if (bySrc) {
            logger.info('通过src关键词匹配到搜索相关iframe');
            return bySrc;
          }
        }
      }
      
      // 如果没找到特定的iframe，返回第一个
      if (iframes.length > 0) {
        const frame = await iframes[0].contentFrame();
        if (frame) {
          logger.info('使用第一个iframe');
          return frame;
        }
      }
      
      return null;
      
    } catch (error) {
      logger.error('获取搜索iframe失败:', error);
      return null;
    }
  }

  /**
   * 在iframe中应用筛选条件
   */
  async applyFiltersInIframe(frame, filters) {
    try {
      logger.info('在iframe中应用筛选条件:', filters);
      
      // 等待筛选区域加载
      await frame.waitForTimeout(2000);
      
      // 定位筛选区域
      const filterContainer = await frame.$('div.check-params-options-content, div.check-params-options-content-1015gray, div.check-param-options-content-1013gray');
      if (!filterContainer) {
        logger.warn('未找到筛选区域容器');
        return;
      }
      
      logger.info('找到筛选区域容器');
      
      // 应用学历筛选
      if (filters.education && filters.education !== '不限') {
        await this.applyFilterOption(frame, filters.education, '学历');
      }
      
      // 应用院校筛选
      if (filters.university && filters.university !== '不限') {
        await this.applyFilterOption(frame, filters.university, '院校');
      }
      
      // 应用经验筛选
      if (filters.experience && filters.experience !== '不限') {
        await this.applyFilterOption(frame, filters.experience, '经验');
      }
      
      // 应用年龄筛选
      if (filters.age && filters.age !== '不限') {
        await this.applyFilterOption(frame, filters.age, '年龄');
      }
      
      logger.info('筛选条件应用完成');
      
    } catch (error) {
      logger.error('在iframe中应用筛选条件失败:', error);
    }
  }

  /**
   * 应用单个筛选选项
   */
  async applyFilterOption(frame, optionText, filterType) {
    try {
      logger.info(`应用${filterType}筛选: ${optionText}`);
      
      // 等待页面稳定
      await frame.waitForTimeout(1000);
      
      // 多种选择器策略查找筛选选项
      const selectors = [
        `text=${optionText}`,
        `[title="${optionText}"]`,
        `span:has-text("${optionText}")`,
        `div:has-text("${optionText}")`,
        `li:has-text("${optionText}")`,
        `a:has-text("${optionText}")`
      ];
      
      let optionElement = null;
      for (const selector of selectors) {
        try {
          optionElement = await frame.$(selector);
          if (optionElement) {
            // 检查元素是否可见
            const isVisible = await optionElement.isVisible();
            if (isVisible) {
              break;
            } else {
              optionElement = null;
            }
          }
        } catch (e) {
          // 继续尝试下一个选择器
          continue;
        }
      }
      
      if (optionElement) {
        // 滚动到元素可见位置
        await optionElement.scrollIntoViewIfNeeded();
        await frame.waitForTimeout(500);
        
        // 点击元素
        await optionElement.click();
        await frame.waitForTimeout(1000);
        logger.info(`${filterType}筛选应用成功: ${optionText}`);
      } else {
        logger.warn(`未找到${filterType}筛选选项: ${optionText}`);
      }
      
    } catch (error) {
      logger.warn(`应用${filterType}筛选失败:`, error.message);
    }
  }

  /**
   * 在iframe中执行搜索
   */
  async executeSearchInIframe(frame) {
    try {
      logger.info('在iframe中执行搜索...');
      
      // 查找搜索图标并点击
      const searchIcon = await frame.$('i.icon-search');
      if (searchIcon) {
        await searchIcon.click();
        await frame.waitForTimeout(3000);
        logger.info('搜索执行成功');
      } else {
        logger.warn('未找到搜索图标，尝试其他搜索按钮');
        const searchButton = await frame.$('button[type="submit"], .search-btn, button:has-text("搜索")');
        if (searchButton) {
          await searchButton.click();
          await frame.waitForTimeout(3000);
          logger.info('搜索执行成功');
        } else {
          logger.error('未找到任何搜索按钮');
        }
      }
      
    } catch (error) {
       logger.error('在iframe中执行搜索失败:', error);
     }
   }

  /**
   * 处理搜索结果中的候选人
   */
  async processSearchResults(frame, targetCount = 3) {
    try {
      logger.info('开始处理搜索结果中的候选人...');
      
      // 等待搜索结果加载
      await frame.waitForTimeout(3000);
      
      // 查找候选人卡片
      const candidateCards = await frame.$$('div.card-container');
      logger.info(`找到 ${candidateCards.length} 个候选人卡片`);
      
      const processCount = Math.min(candidateCards.length, targetCount);
      
      for (let i = 0; i < processCount; i++) {
        try {
          logger.info(`处理第 ${i + 1} 个候选人...`);
          
          // 点击候选人卡片
          await candidateCards[i].click();
          await frame.waitForTimeout(2000);
          
          // 提取并导入简历
          await this.extractAndImportResume(frame, i + 1);
          
          // 关闭简历页面，返回列表
          await this.closeResumeAndReturnToList(frame);
          
          // 等待页面稳定
          await frame.waitForTimeout(1000);
          
        } catch (error) {
          logger.error(`处理第 ${i + 1} 个候选人失败:`, error.message);
          continue;
        }
      }
      
      logger.info('搜索结果处理完成');
      
    } catch (error) {
      logger.error('处理搜索结果失败:', error);
    }
  }

  /**
   * 提取并导入简历
   */
  async extractAndImportResume(frame, candidateIndex) {
    try {
      logger.info(`提取第 ${candidateIndex} 个候选人简历...`);
      
      // 等待在线简历加载
      await frame.waitForTimeout(2000);
      
      const page = frame.page();
      let resumeContent = null;
      
      // 首先查找包含简历内容的特定iframe
      const resumeIframe = await this.findResumeIframe(page);
      if (resumeIframe) {
        logger.info('找到简历iframe，开始提取iframe中的简历内容');
        resumeContent = await this.extractResumeContentFromIframe(resumeIframe);
        
        if (resumeContent) {
          logger.info(`从iframe提取简历内容成功，长度: ${resumeContent.length}`);
        } else {
          logger.warn('在简历iframe中提取简历内容失败');
        }
      } else {
        logger.warn('未找到简历iframe，尝试从主页面提取简历内容');
      }
      
      // 如果iframe提取失败，尝试从主页面提取
      if (!resumeContent) {
        logger.info('开始从主页面提取简历内容');
        resumeContent = await this.extractResumeContentFromPage();
        
        if (resumeContent) {
          logger.info(`从主页面提取简历内容成功，长度: ${resumeContent.length}`);
        } else {
          logger.warn('从主页面提取简历内容也失败');
        }
      }
      
      if (!resumeContent) {
        logger.error('所有简历提取方法都失败，无法获取简历内容');
        return;
      }
      
      // 复制简历内容到剪贴板
      await this.copyToClipboard(resumeContent);
      
      // 打开应用前端并导入简历
      await this.importResumeToApp(resumeContent, candidateIndex);
      
    } catch (error) {
      logger.error('提取并导入简历失败:', error);
    }
  }

  /**
   * 复制内容到剪贴板
   */
  async copyToClipboard(content) {
    try {
      await this.page.evaluate((text) => {
        navigator.clipboard.writeText(text);
      }, content);
      logger.info('内容已复制到剪贴板');
    } catch (error) {
      logger.warn('复制到剪贴板失败:', error.message);
    }
  }

  /**
   * 导入简历到应用
   */
  async importResumeToApp(resumeContent, candidateIndex) {
    try {
      logger.info(`导入第 ${candidateIndex} 个候选人简历到应用...`);
      
      // 打开新标签页到应用前端
      const appPage = await this.browser.newPage();
      await appPage.goto('http://localhost:3000');
      await appPage.waitForTimeout(2000);
      
      // 定位到"简历列表"
      await appPage.click('text=简历列表');
      await appPage.waitForTimeout(1000);
      
      // 点击"上传简历"按钮
      await appPage.click('text=上传简历');
      await appPage.waitForTimeout(1000);
      
      // 定位Boss直聘简历文本框并粘贴内容
      const textArea = await appPage.$('textarea, .boss-resume-input, [placeholder*="Boss"], [placeholder*="简历"]');
      if (textArea) {
        await textArea.fill(resumeContent);
        await appPage.waitForTimeout(500);
        
        // 点击"解析Boss直聘简历"按钮
        await appPage.click('text=解析Boss直聘简历');
        
        // 等待解析开始（给系统一些时间开始处理）
        await appPage.waitForTimeout(3000);
        
        // 点击"确认添加"按钮，带重试机制（持续检测直到按钮可用）
        const addSuccess = await this.clickConfirmWithRetry(appPage);
        
        if (addSuccess) {
          logger.info(`第 ${candidateIndex} 个候选人简历添加成功`);
          // 等待一下确保操作完全完成
          await appPage.waitForTimeout(2000);
        } else {
          logger.error(`第 ${candidateIndex} 个候选人简历添加失败，已达到最大重试次数`);
          // 即使失败也要关闭页面，避免资源泄露
        }
      } else {
        logger.warn('未找到简历输入框');
      }
      
      // 关闭应用页面
      await appPage.close();
      
    } catch (error) {
      logger.error('导入简历到应用失败:', error);
    }
  }

  /**
   * 带重试机制的确认添加按钮点击
   * 检测"确认添加"按钮是否可用，当出现可点击按钮时立即点击，等待2秒后视为成功
   */
  async clickConfirmWithRetry(page) {
    logger.info('开始确认添加重试机制，持续检测直到按钮可用');
    
    let attemptCount = 0;
    while (true) {
      attemptCount++;
      try {
        logger.info(`第 ${attemptCount} 次尝试检测确认添加按钮状态...`);
        
        // 检查页面连接状态
        if (page.isClosed()) {
          logger.error('页面已关闭，无法继续操作');
          return false;
        }
        
        // 多种选择器策略查找确认添加按钮
        const confirmSelectors = [
          'text=确认添加',
          'button:has-text("确认添加")',
          '[class*="confirm"][class*="add"]',
          'button[type="submit"]',
          '.confirm-btn',
          '.add-btn'
        ];
        
        let confirmButton = null;
        for (const selector of confirmSelectors) {
          try {
            confirmButton = await page.$(selector);
            if (confirmButton) {
              const isVisible = await confirmButton.isVisible();
              const isEnabled = await confirmButton.isEnabled();
              if (isVisible && isEnabled) {
                logger.info(`检测到可用的确认添加按钮: ${selector}，简历解析已完成，立即点击`);
                
                // 立即点击确认添加按钮
                await confirmButton.click();
                logger.info('已点击确认添加按钮，等待2秒后视为本次简历添加成功');
                
                // 等待2秒后视为成功，准备返回Boss直聘
                await page.waitForTimeout(2000);
                logger.info('简历添加成功，准备返回Boss直聘继续下一个候选人');
                
                // 使用Promise延迟切换页面，避免在关键时刻触发连接断开
                this.schedulePageSwitch();
                
                return true;
              } else {
                // 按钮存在但不可用，记录状态并继续检测
                const visibleStatus = isVisible ? '可见' : '不可见';
                const enabledStatus = isEnabled ? '可用' : '不可用';
                logger.debug(`确认添加按钮状态: ${visibleStatus}, ${enabledStatus}`);
                confirmButton = null;
              }
            }
          } catch (e) {
            // 继续尝试下一个选择器
            continue;
          }
        }
        
        if (!confirmButton) {
          logger.debug(`第 ${attemptCount} 次检测：确认添加按钮尚未可用，简历仍在解析中`);
        }
        
        // 短暂等待后继续检测（减少等待时间，提高响应速度）
        await page.waitForTimeout(1000);
        
      } catch (error) {
        logger.warn(`第 ${attemptCount} 次检测确认添加按钮失败:`, error.message);
        
        // 检查是否是连接相关错误
        if (error.message.includes('Target closed') || 
            error.message.includes('Protocol error') ||
            error.message.includes('Session closed')) {
          logger.error('检测到连接断开，尝试恢复连接');
          const recovered = await this.recoverFromConnectionError();
          if (!recovered) {
            logger.error('连接恢复失败，停止重试');
            return false;
          }
          // 恢复成功后继续重试
          continue;
        }
        
        // 出错时也短暂等待
        await page.waitForTimeout(1000);
      }
    }
  }



  /**
   * 安全地调度页面切换，避免在WebSocket连接敏感期间进行操作
   */
  schedulePageSwitch() {
    // 清除之前的调度
    if (this.pageSwitchTimeout) {
      clearTimeout(this.pageSwitchTimeout);
    }
    
    // 激活页面切换保护机制
    if (this.io) {
      this.io.emit('activatePageSwitchProtection');
      logger.info('已发送页面切换保护激活信号');
    }
    
    // 使用更长的延迟，确保WebSocket连接稳定
    this.pageSwitchTimeout = setTimeout(async () => {
      try {
        logger.info('开始执行调度的页面切换...');
        
        // 检查连接状态，只有在连接稳定时才进行切换
        if (this.browser && this.browser.isConnected()) {
          await this.switchToBossZhipinPageSafely();
          logger.info('调度的页面切换已完成');
        } else {
          logger.warn('浏览器连接不稳定，跳过页面切换');
        }
      } catch (error) {
        logger.warn('调度的页面切换失败，但不影响后续流程:', error.message);
      } finally {
        this.pageSwitchTimeout = null;
      }
    }, 3000); // 增加到3秒延迟
  }

  /**
   * 安全的页面切换实现
   */
  async switchToBossZhipinPageSafely() {
    try {
      if (this.page && !this.page.isClosed()) {
        logger.info('正在安全切换回Boss直聘页面...');
        
        // 检查页面状态
        const pageState = await this.page.evaluate(() => {
          return {
            hidden: document.hidden,
            visibilityState: document.visibilityState,
            readyState: document.readyState
          };
        });
        
        logger.info('页面状态检查:', pageState);
        
        // 只有在页面完全加载且不可见时才进行切换
        if (pageState.readyState === 'complete' && pageState.hidden) {
          await this.page.bringToFront();
          await this.page.waitForTimeout(500);
          logger.info('已安全切换回Boss直聘页面');
        } else {
          logger.info('页面已可见或未完全加载，跳过切换操作');
        }
      } else {
        logger.warn('Boss直聘页面不可用，需要重新初始化');
        await this.reinitializeBossZhipinPage();
      }
    } catch (error) {
      logger.error('安全页面切换失败:', error.message);
      // 不抛出异常，避免影响后续流程
    }
  }

  /**
   * 重新初始化Boss直聘页面
   */
  async reinitializeBossZhipinPage() {
    try {
      if (this.browser && this.browser.isConnected()) {
        this.page = await this.browser.newPage();
        await this.openBossZhipinWebsite();
        logger.info('Boss直聘页面已重新初始化');
      } else {
        logger.warn('浏览器连接不可用，无法重新初始化页面');
      }
    } catch (error) {
      logger.error('重新初始化Boss直聘页面失败:', error.message);
    }
  }

  /**
   * 切换回Boss直聘页面（旧版本，保持兼容性）
   */
  async switchToBossZhipinPage() {
    try {
      if (this.page && !this.page.isClosed()) {
        // 温和的页面切换，避免触发连接断开
        logger.info('正在切换回Boss直聘页面...');
        
        // 使用更温和的方式切换页面，避免强制前置
        try {
          // 先检查页面是否可见
          const isVisible = await this.page.evaluate(() => {
            return !document.hidden;
          });
          
          if (!isVisible) {
            // 只有在页面不可见时才进行切换
            await this.page.bringToFront();
          }
          
          // 减少等待时间，避免长时间阻塞
          await this.page.waitForTimeout(200);
          logger.info('已切换回Boss直聘页面');
        } catch (switchError) {
          logger.warn('页面切换过程中出现问题，但继续执行:', switchError.message);
        }
      } else {
        logger.warn('Boss直聘页面不可用，需要重新初始化');
        // 如果Boss直聘页面不可用，尝试重新创建
        if (this.browser && this.browser.isConnected()) {
          this.page = await this.browser.newPage();
          await this.openBossZhipinWebsite();
          logger.info('Boss直聘页面已重新创建');
        }
      }
    } catch (error) {
      logger.error('切换回Boss直聘页面失败:', error.message);
      // 即使切换失败也不抛出异常，避免影响后续流程
    }
  }

  /**
   * 关闭简历页面并返回列表
   */
  async closeResumeAndReturnToList(frame) {
    try {
      logger.info('关闭简历页面...');
      
      // 在主页面中查找关闭按钮（不在iframe中）
      const page = frame.page();
      const closeSelectors = [
        'i.icon-close',
        '.close-btn',
        '[class*="close"]',
        'button[title="关闭"]',
        'button[aria-label="关闭"]',
        '.modal-close',
        '.dialog-close',
        'i[class*="close"]',
        'span[class*="close"]'
      ];
      
      let closeButton = null;
      for (const selector of closeSelectors) {
        try {
          closeButton = await page.$(selector);
          if (closeButton) {
            const isVisible = await closeButton.isVisible();
            if (isVisible) {
              break;
            } else {
              closeButton = null;
            }
          }
        } catch (e) {
          // 继续尝试下一个选择器
          continue;
        }
      }
      
      if (closeButton) {
        await closeButton.click();
        await page.waitForTimeout(1000);
        logger.info('简历页面已关闭');
      } else {
        logger.warn('未找到关闭按钮，尝试按ESC键');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
      }
      
    } catch (error) {
      logger.error('关闭简历页面失败:', error);
    }
  }

  /**
   * 处理候选人详情
   */
  async processCandidateDetail() {
    try {
      // 获取候选人基本信息
      const candidateInfo = await this.extractCandidateInfo();
      
      // 检查简历质量
      const qualityScore = await this.assessResumeQuality(candidateInfo);
      
      // 更新浏览状态
      this.browsingStatus.processedCount++;
      this.browsingStatus.currentIndex++;
      
      // 添加候选人到列表
      const candidate = {
        ...candidateInfo,
        qualityScore,
        processedAt: new Date().toISOString(),
        action: null
      };
      
      // 如果质量分数达到标准，自动收藏
      if (qualityScore >= 70) {
        await this.favoriteCandidate();
        candidate.action = 'liked';
        this.browsingStatus.likedCount++;
        logger.info(`候选人 ${candidateInfo.name} 质量分数: ${qualityScore}，已自动收藏`);
      } else {
        candidate.action = 'skipped';
        this.browsingStatus.dislikedCount++;
        logger.info(`候选人 ${candidateInfo.name} 质量分数: ${qualityScore}，跳过`);
      }
      
      this.browsingStatus.candidates.push(candidate);
      
    } catch (error) {
      logger.error('处理候选人详情失败:', error);
    }
  }

  /**
   * 提取候选人信息
   */
  async extractCandidateInfo() {
    try {
      const info = await this.page.evaluate(() => {
        const name = document.querySelector('.candidate-name, [class*="name"]')?.textContent?.trim() || '';
        const position = document.querySelector('.candidate-position, [class*="position"]')?.textContent?.trim() || '';
        const company = document.querySelector('.candidate-company, [class*="company"]')?.textContent?.trim() || '';
        const experience = document.querySelector('.candidate-experience, [class*="experience"]')?.textContent?.trim() || '';
        const education = document.querySelector('.candidate-education, [class*="education"]')?.textContent?.trim() || '';
        const location = document.querySelector('.candidate-location, [class*="location"]')?.textContent?.trim() || '';
        const salary = document.querySelector('.candidate-salary, [class*="salary"]')?.textContent?.trim() || '';
        
        return { name, position, company, experience, education, location, salary };
      });
      
      return info;
    } catch (error) {
      logger.error('提取候选人信息失败:', error);
      return {};
    }
  }

  /**
   * 评估简历质量
   */
  async assessResumeQuality(candidateInfo) {
    try {
      let score = 0;
      
      // 基本信息完整性 (30分)
      if (candidateInfo.name) score += 10;
      if (candidateInfo.position) score += 10;
      if (candidateInfo.experience) score += 10;
      
      // 工作经验 (40分)
      if (candidateInfo.experience) {
        const expYears = parseInt(candidateInfo.experience.match(/\d+/)?.[0] || '0');
        if (expYears >= 3) score += 20;
        else if (expYears >= 1) score += 15;
        else score += 10;
      }
      
      // 教育背景 (20分)
      if (candidateInfo.education) {
        if (candidateInfo.education.includes('本科')) score += 15;
        else if (candidateInfo.education.includes('硕士')) score += 20;
        else if (candidateInfo.education.includes('博士')) score += 20;
        else score += 10;
      }
      
      // 地区匹配 (10分)
      if (candidateInfo.location && candidateInfo.location.includes('北京')) score += 10;
      
      return Math.min(score, 100);
    } catch (error) {
      logger.error('评估简历质量失败:', error);
      return 0;
    }
  }

  /**
   * 收藏候选人
   */
  async favoriteCandidate() {
    try {
      // 点击收藏按钮
      const favoriteBtn = await this.page.$('.favorite-btn, [class*="favorite"], [class*="star"]');
      if (favoriteBtn) {
        await favoriteBtn.click();
        await this.page.waitForTimeout(1000);
        logger.info('候选人收藏成功');
      }
    } catch (error) {
      logger.error('收藏候选人失败:', error);
    }
  }

  /**
   * 停止候选人浏览
   */
  async stopBrowsing() {
    try {
      this.browsingStatus.isActive = false;
      this.currentStatus = 'idle';
      // 额外清理可能的页面切换定时器，避免影响下次启动
      if (this.pageSwitchTimeout) {
        clearTimeout(this.pageSwitchTimeout);
        this.pageSwitchTimeout = null;
      }
      logger.info('候选人浏览已停止，定时器已清理');
      return true;
    } catch (error) {
      logger.error('停止候选人浏览失败:', error);
      throw error;
    }
  }

  /**
   * 重置候选人浏览状态
   */
  async resetBrowsingStatus() {
    try {
      logger.info('正在重置Boss直聘候选人浏览状态...');
      
      // 停止当前浏览
      this.browsingStatus.isActive = false;
      this.currentStatus = 'idle';
      
      // 重置所有浏览状态数据
      this.browsingStatus = {
        isActive: false,
        mode: null,
        candidates: [],
        processedCount: 0,
        likedCount: 0,
        dislikedCount: 0,
        currentIndex: 0,
        filters: {},
        startTime: null,
        targetCount: 0
      };
      
      logger.info('Boss直聘候选人浏览状态已重置');
      return true;
      
    } catch (error) {
      logger.error('重置候选人浏览状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取候选人浏览状态
   */
  getBrowsingStatus() {
    return {
      status: this.browsingStatus.isActive ? 'browsing' : 'idle',
      mode: this.browsingStatus.mode,
      candidates: this.browsingStatus.candidates.slice(-10), // 只返回最近10个候选人
      processedCount: this.browsingStatus.processedCount,
      likedCount: this.browsingStatus.likedCount,
      dislikedCount: this.browsingStatus.dislikedCount,
      currentIndex: this.browsingStatus.currentIndex,
      filters: this.browsingStatus.filters,
      targetCount: this.browsingStatus.targetCount,
      startTime: this.browsingStatus.startTime,
      isActive: this.browsingStatus.isActive
    };
  }

  /**
   * 启动简历处理
   */
  async startResumeProcessing(settings = {}) {
    try {
      this.currentStatus = 'processing_resumes';
      
      // 初始化简历处理状态
      this.resumeProcessingStatus = {
        isActive: true,
        resumes: [],
        processingCount: 0,
        completedCount: 0,
        failedCount: 0,
        currentIndex: 0,
        settings: settings,
        startTime: new Date().toISOString(),
        currentStatus: 'collecting'
      };
      
      logger.info('开始简历处理...', settings);
      
      // 异步执行简历处理任务，不阻塞响应
      this.executeResumeProcessingTask(settings).catch(error => {
        logger.error('简历处理任务执行失败:', error);
        this.resumeProcessingStatus.isActive = false;
        this.resumeProcessingStatus.currentStatus = 'idle';
        this.currentStatus = 'idle';
      });
      
      return true;
      
    } catch (error) {
      logger.error('启动简历处理失败:', error);
      this.currentStatus = 'idle';
      this.resumeProcessingStatus.isActive = false;
      throw error;
    }
  }

  /**
   * 执行简历处理任务
   */
  async executeResumeProcessingTask(settings) {
    try {
      // 阶段1: 收集收藏的候选人
      this.resumeProcessingStatus.currentStatus = 'collecting';
      logger.info('开始收集收藏的候选人...');
      const favoriteCandidates = await this.getFavoriteCandidates();
      
      // 阶段2: 质量检测和处理
      this.resumeProcessingStatus.currentStatus = 'quality_checking';
      logger.info(`开始处理 ${favoriteCandidates.length} 个候选人的简历...`);
      
      for (let i = 0; i < favoriteCandidates.length; i++) {
        const candidate = favoriteCandidates[i];
        this.resumeProcessingStatus.currentIndex = i;
        
        try {
          // 阶段3: 解析简历内容
          this.resumeProcessingStatus.currentStatus = 'parsing';
          await this.processResume(candidate, settings);
          
          // 阶段4: 存储到数据库
          this.resumeProcessingStatus.currentStatus = 'storing';
          this.resumeProcessingStatus.completedCount++;
          
        } catch (error) {
          logger.error(`处理候选人 ${candidate.name} 的简历失败:`, error);
          this.resumeProcessingStatus.failedCount++;
        }
        
        this.resumeProcessingStatus.processingCount++;
      }
      
      // 处理完成
      this.resumeProcessingStatus.currentStatus = 'completed';
      this.resumeProcessingStatus.isActive = false;
      this.currentStatus = 'idle';
      logger.info('简历处理任务完成');
      
    } catch (error) {
      logger.error('简历处理任务失败:', error);
      this.resumeProcessingStatus.isActive = false;
      this.resumeProcessingStatus.currentStatus = 'idle';
      this.currentStatus = 'idle';
      throw error;
    }
  }

  /**
   * 获取收藏的候选人列表
   */
  async getFavoriteCandidates() {
    try {
      // 导航到收藏页面
      await this.page.click('text=收藏');
      await this.page.waitForTimeout(2000);
      
      // 获取收藏列表
      const candidates = await this.page.evaluate(() => {
        const items = document.querySelectorAll('.favorite-item, [class*="favorite"], [class*="collected"]');
        return Array.from(items).map(item => {
          const name = item.querySelector('.name, [class*="name"]')?.textContent?.trim() || '';
          const position = item.querySelector('.position, [class*="position"]')?.textContent?.trim() || '';
          const company = item.querySelector('.company, [class*="company"]')?.textContent?.trim() || '';
          
          return { name, position, company };
        });
      });
      
      return candidates;
    } catch (error) {
      logger.error('获取收藏候选人列表失败:', error);
      return [];
    }
  }

  /**
   * 处理单个简历
   */
  async processResume(candidate, settings) {
    try {
      logger.info(`开始处理候选人 ${candidate.name} 的简历...`);
      
      // 点击候选人查看详情
      await this.page.click(`text=${candidate.name}`);
      await this.page.waitForTimeout(2000);
      
      // 提取简历内容
      const resumeContent = await this.extractResumeContent();
      
      // 评估简历质量
      const qualityScore = await this.assessResumeQuality(candidate);
      
      // 创建简历记录
      const resume = {
        id: `resume_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        candidateInfo: candidate,
        content: resumeContent,
        qualityScore: qualityScore,
        status: 'processing',
        processedAt: new Date().toISOString(),
        saved: false
      };
      
      // 如果质量分数达到标准，自动处理
      if (qualityScore >= (settings.minQualityScore || 70)) {
        await this.saveResumeToDatabase(candidate, resumeContent, qualityScore);
        resume.status = 'completed';
        resume.saved = true;
        logger.info(`简历 ${candidate.name} 已自动入库`);
      } else {
        resume.status = 'skipped';
        logger.info(`简历 ${candidate.name} 质量分数不足，需要人工审核`);
      }
      
      // 添加到简历列表
      this.resumeProcessingStatus.resumes.push(resume);
      
    } catch (error) {
      logger.error(`处理简历 ${candidate.name} 失败:`, error);
      
      // 添加失败记录
      const failedResume = {
        id: `resume_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        candidateInfo: candidate,
        content: null,
        qualityScore: 0,
        status: 'failed',
        processedAt: new Date().toISOString(),
        saved: false,
        error: error.message
      };
      
      this.resumeProcessingStatus.resumes.push(failedResume);
      throw error;
    }
  }

  /**
   * 提取简历内容
   */
  async extractResumeContent() {
    try {
      const content = await this.page.evaluate(() => {
        // 优先检测resume-detail-wrap组件（在线简历内容）
        const resumeDetailWrap = document.querySelector('.resume-detail-wrap');
        if (resumeDetailWrap) {
          // 克隆元素以避免修改原DOM
          const clonedElement = resumeDetailWrap.cloneNode(true);
          
          // 移除不需要的组件内容
          const excludeSelectors = [
            '.resume-warning',
            '.resume-anonymous-geek-card.v2'
          ];
          
          excludeSelectors.forEach(selector => {
            const elementsToRemove = clonedElement.querySelectorAll(selector);
            elementsToRemove.forEach(el => el.remove());
          });
          
          const content = clonedElement.textContent.trim();
          if (content.length > 0) {
            return content;
          }
        }
        
        // 备用选择器
        const resumeElement = document.querySelector('.resume-content, [class*="resume"], [class*="profile"]');
        return resumeElement ? resumeElement.textContent.trim() : '';
      });
      
      return content;
    } catch (error) {
      logger.error('提取简历内容失败:', error);
      return '';
    }
  }

  /**
   * 保存简历到数据库
   */
  async saveResumeToDatabase(candidate, content, qualityScore) {
    try {
      // 这里应该调用数据库服务保存简历
      // 暂时记录日志
      logger.info(`保存简历到数据库: ${candidate.name}`, {
        position: candidate.position,
        company: candidate.company,
        contentLength: content.length,
        qualityScore
      });
      
      // TODO: 集成实际的数据库保存逻辑
      
    } catch (error) {
      logger.error('保存简历到数据库失败:', error);
    }
  }

  /**
   * 停止简历处理
   */
  async stopResumeProcessing() {
    try {
      this.resumeProcessingStatus.isActive = false;
      this.resumeProcessingStatus.currentStatus = 'idle';
      this.currentStatus = 'idle';
      logger.info('简历处理已停止');
      return true;
    } catch (error) {
      logger.error('停止简历处理失败:', error);
      throw error;
    }
  }

  /**
   * 获取简历处理状态
   */
  getResumeProcessingStatus() {
    return {
      status: this.resumeProcessingStatus.currentStatus,
      resumes: this.resumeProcessingStatus.resumes.slice(-10), // 只返回最近10个简历
      processingCount: this.resumeProcessingStatus.processingCount,
      completedCount: this.resumeProcessingStatus.completedCount,
      failedCount: this.resumeProcessingStatus.failedCount,
      currentIndex: this.resumeProcessingStatus.currentIndex,
      settings: this.resumeProcessingStatus.settings,
      startTime: this.resumeProcessingStatus.startTime,
      isActive: this.resumeProcessingStatus.isActive
    };
  }

  /**
   * 关闭浏览器
   */
  async closeBrowser() {
    try {
      // 清理页面切换定时器
      if (this.pageSwitchTimeout) {
        clearTimeout(this.pageSwitchTimeout);
        this.pageSwitchTimeout = null;
        logger.info('页面切换定时器已清理');
      }
      
      if (this.browser) {
        // 关闭应用页面
        if (this.appPage && !this.appPage.isClosed()) {
          await this.appPage.close();
          this.appPage = null;
          logger.info('应用页面已关闭');
        }
        
        await this.browser.close();
        this.browser = null;
        this.page = null;
        
        // 清理OCR服务
        if (this.canvasOcrService) {
          await this.canvasOcrService.destroy();
          logger.info('OCR服务已清理');
        }
        
        // 清理拖拽选区服务
        if (this.dragSelectionService) {
          await this.dragSelectionService.cleanup();
          logger.info('拖拽选区服务已清理');
        }
        

        this.isLoggedIn = false;
        this.currentStatus = 'idle';
        this.popupHandler = null;
        logger.info('Boss直聘自动化浏览器已关闭，所有页面和上下文已清理');
      }
    } catch (error) {
      logger.error('关闭浏览器失败:', error);
    }
  }

  /**
   * 连接错误恢复机制
   * 检测到连接断开或严重错误时，重置浏览器状态并重新初始化
   */
  async recoverFromConnectionError() {
    try {
      logger.warn('检测到连接错误，开始执行恢复机制...');
      
      // 关闭现有浏览器
      await this.closeBrowser();
      
      // 重置状态
      this.currentStatus = 'recovering';
      this.isLoggedIn = false;
      this.page = null;
      this.appPage = null;
      this.browser = null;
      
      // 等待一段时间后重新初始化
      logger.info('等待5秒后重新初始化浏览器...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 重新初始化浏览器
      await this.initializeBrowser();
      
      logger.info('浏览器恢复完成');
      return true;
      
    } catch (error) {
      logger.error('连接错误恢复失败:', error);
      this.currentStatus = 'error';
      return false;
    }
  }

  /**
   * 执行完整的初始化流程
   */
  async initializeFullProcess() {
    try {
      logger.info('开始执行 Boss 直聘自动化初始化流程...');
      
      // 1. 初始化浏览器
      await this.initializeBrowser();
      
      // 2. 打开官网
      await this.openBossZhipinWebsite();
      
      // 3. 导航到招聘页面
      await this.navigateToRecruitmentPage();
      
      // 4. 选择 App 扫码登录
      await this.selectAppLoginMethod();
      
      logger.info('Boss 直聘自动化初始化流程完成，等待用户扫码登录...');
      return true;
    } catch (error) {
      logger.error('Boss 直聘自动化初始化流程失败:', error);
      throw error;
    }
  }
}

module.exports = BossZhipinService;
