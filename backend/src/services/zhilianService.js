const { chromium } = require('playwright');
const logger = require('../utils/logger');
const ResumeModel = require('../models/resumeModel');
const browserDisplayConfig = require('../config/browserDisplayConfig');
// 简单的简历分析函数
const analyzeResumeQuality = (resumeData) => {
  return {
    score: 75,
    completeness: 80,
    richness: 70
  };
};

const parseResumeContent = (content) => {
  return {
    name: '',
    position: '',
    experience: '',
    education: ''
  };
};

/**
 * 智联招聘服务类
 * 基于Boss直聘架构模式，实现智联招聘的自动化候选人浏览和简历处理功能
 */
class ZhilianService {
  constructor(io = null) {
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
    this.currentStatus = 'not_initialized'; // not_initialized, initialized, logging_in, idle, browsing, processing
    this.io = io; // Socket.IO实例，用于发送实时状态更新
    this.isStopped = false; // 服务停止标志，用于控制浏览器恢复机制
    
    // 候选人浏览状态跟踪
    this.browsingStatus = {
      isActive: false,
      mode: null, // 'search', 'recommended', 'communication', 'favorites'
      candidates: [],
      processedCount: 0,
      collectedCount: 0,
      failedCount: 0,
      currentIndex: 0,
      filters: {},
      startTime: null,
      targetCount: 0,
      currentPage: 1,
      totalPages: 0
    };
    
    // 简历处理状态跟踪
    this.resumeProcessingStatus = {
      isActive: false,
      step: 'idle', // 'collecting', 'quality_check', 'parsing', 'storing', 'completed'
      resumes: [],
      processedCount: 0,
      completedCount: 0,
      failedCount: 0,
      currentIndex: 0,
      settings: {
        minQualityScore: 60,
        autoProcess: true,
        saveFailed: false
      },
      startTime: null,
      progress: {
        collecting: 0,
        qualityCheck: 0,
        parsing: 0,
        storing: 0
      }
    };
    
    // 反爬虫策略配置
    this.antiDetectionConfig = {
      minDelay: 1000,
      maxDelay: 3000,
      scrollDelay: 500,
      clickDelay: 200,
      pageLoadTimeout: 30000
    };
    
    // 记录候选人列表页面URL，用于返回
    this.lastCandidateListUrl = null;
  }

  /**
   * 初始化浏览器 - 针对智联招聘优化
   * 使用统一的显示配置解决 Chromium 和 Chrome 显示差异问题
   */
  async initializeBrowser() {
    return await this.withErrorHandling(async () => {
      logger.info('正在初始化智联招聘浏览器...');
      
      // 获取智联招聘专用的显示配置
      const displayConfig = browserDisplayConfig.zhilian;
      
      // 基础启动参数
      const baseArgs = [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        '--autoplay-policy=no-user-gesture-required', // 允许自动播放
        '--disable-permissions-api', // 禁用权限API检查
        '--disable-features=VizDisplayCompositor,VizHitTestSurfaceLayer', // 禁用显示合成器
        '--disable-component-extensions-with-background-pages', // 禁用后台扩展
        '--disable-default-apps', // 禁用默认应用
        '--disable-extensions', // 禁用扩展
        '--disable-background-networking', // 禁用后台网络
        '--disable-sync', // 禁用同步
        '--metrics-recording-only', // 仅记录指标
        '--no-default-browser-check', // 不检查默认浏览器
        '--safebrowsing-disable-auto-update', // 禁用安全浏览自动更新
        '--use-fake-ui-for-media-stream', // 使用虚假UI处理媒体流
        '--use-fake-device-for-media-stream', // 使用虚假设备处理媒体流
        '--disable-features=MediaRouter', // 禁用媒体路由
        '--disable-ipc-flooding-protection' // 禁用IPC洪水保护
      ];
      
      // 合并显示优化参数
      const allArgs = [...baseArgs, ...displayConfig.launchArgs];
      
      logger.info('浏览器启动参数已优化，包含显示统一配置');
      
      // 根据环境决定是否使用无头模式
      const isProduction = process.env.NODE_ENV === 'production' || process.env.ZEABUR_ENVIRONMENT;
      
      this.browser = await chromium.launch({
        headless: isProduction, // 生产环境使用无头模式，开发环境显示界面
        args: allArgs,
        viewport: displayConfig.contextOptions.viewport,
        // 生产环境禁用远程调试以避免与无头模式冲突
        devtools: !isProduction
      });
      
      // 使用统一的上下文配置
      const context = await this.browser.newContext({
        ...displayConfig.contextOptions,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      this.page = await context.newPage();
      
      // 设置页面超时
      this.page.setDefaultTimeout(30000);
      this.page.setDefaultNavigationTimeout(30000);
      
      // 添加剪贴板权限自动授权脚本
      await this.page.addInitScript(() => {
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
        
        // 确保剪贴板API可用
        if (!navigator.clipboard) {
          navigator.clipboard = {
            readText: () => Promise.resolve(''),
            writeText: (text) => Promise.resolve()
          };
        }
      });
      
      this.currentStatus = 'initialized';
      logger.info('智联招聘浏览器初始化完成');
      
    }, '初始化浏览器');
  }

  /**
   * 打开智联招聘网站
   */
  async openZhilianWebsite() {
    return await this.withErrorHandling(async () => {
      logger.info('正在打开智联招聘网站...');
      this.currentStatus = 'navigating';
      
      await this.safePageOperation(async () => {
        // 打开智联招聘企业版首页
        await this.page.goto('https://rd.zhaopin.com', {
          waitUntil: 'networkidle',
          timeout: 30000
        });
        
        // 等待页面加载完成
        await this.page.waitForLoadState('networkidle', { timeout: 60000 });
        await this.waitForPageFullyLoaded();
      }, '导航到智联招聘网站');
      
      // 检查是否需要登录并自动跳转到智联APP二维码页面
      await this.handleLoginPageRedirect();
      
      // 网站打开后，设置状态为等待登录
      this.currentStatus = 'logging_in';
      logger.info('智联招聘网站打开成功，等待用户登录');
      
    }, '打开智联招聘网站');
  }

  /**
   * 检查登录状态 - 采用多重验证机制
   */
  async checkLoginStatus() {
    return await this.withErrorHandling(async () => {
      if (!this.page) {
        logger.warn('页面未初始化，无法检查登录状态');
        return false;
      }

      // 等待页面稳定
      await this.page.waitForTimeout(2000);
      
      const currentUrl = await this.safePageOperation(async () => {
        return this.page.url();
      }, '获取当前URL');
      
      logger.info(`检查智联招聘登录状态 - 当前URL: ${currentUrl}`);

      // 多重验证登录状态 - 智联招聘特定的元素选择器
      const loginChecks = [
        // 检查用户头像
        this.page.locator('.user-avatar, .header-avatar, [class*="user-avatar"], [class*="header-avatar"], .avatar').first(),
        // 检查用户名显示
        this.page.locator('.user-name, .header-username, [class*="user-name"], [class*="username"], .username').first(),
        // 检查智联招聘特定的登录标识
        this.page.locator('[data-testid="user-info"], .user-info, .login-user, .user-center').first(),
        // 检查是否有"我的"相关菜单
        this.page.locator('text=我的简历, text=消息中心, text=我的收藏, text=个人中心').first(),
        // 检查智联招聘特有的用户信息区域
        this.page.locator('.user-panel, .user-dropdown, [class*="user-panel"], [class*="user-dropdown"]').first(),
        // 检查推荐页面特有的用户信息元素
        this.page.locator('.header-user, .top-user, [class*="header-user"], [class*="top-user"]').first(),
        // 检查导航栏中的用户相关元素
        this.page.locator('.nav-user, .navbar-user, [class*="nav-user"], [class*="navbar-user"]').first(),
        // 检查任何包含用户信息的容器
        this.page.locator('[class*="user"][class*="info"], [class*="user"][class*="profile"]').first()
      ];

      // 检查登录按钮是否消失
      const hasLoginButton = await this.safePageOperation(async () => {
        const loginButton = this.page.locator('text=登录, .login-btn, .btn-login, [class*="login"], [href*="login"]').first();
        return await loginButton.isVisible().catch(() => false);
      }, '检查登录按钮可见性');
      
      logger.info(`登录按钮可见性: ${hasLoginButton}`);
      
      // 检查任一登录标识元素是否存在
      let isLoggedIn = false;
      let loginIndicators = 0;
      for (let i = 0; i < loginChecks.length; i++) {
        try {
          const isVisible = await this.safePageOperation(async () => {
            return await loginChecks[i].isVisible({ timeout: 1000 });
          }, `检查登录指示器${i + 1}`);
          
          if (isVisible) {
            isLoggedIn = true;
            loginIndicators++;
            logger.info(`智联招聘登录指示器 ${i + 1} 检测到`);
          }
        } catch (error) {
          // 继续检查下一个元素
          continue;
        }
      }
      
      logger.info(`智联招聘登录指示器总数: ${loginIndicators}`);
      
      // 如果没有登录按钮且有用户信息元素，则认为已登录
      if (!hasLoginButton && isLoggedIn) {
        this.isLoggedIn = true;
        this.currentStatus = 'idle';
        logger.info('用户已登录智联招聘 - 检测到用户信息元素');
        return true;
      }
      
      // 检查URL是否包含登录后的特征
      const isLoggedInUrl = currentUrl.includes('/personal/') || 
                           currentUrl.includes('/user/') || 
                           currentUrl.includes('/member/') ||
                           currentUrl.includes('/my/') ||
                           currentUrl.includes('rd6.zhaopin.com/app/') ||
                           currentUrl.includes('rd.zhaopin.com/') ||
                           currentUrl.includes('/app/recommend') ||
                           currentUrl.includes('/app/position');
      logger.info(`智联招聘URL登录检查: ${isLoggedInUrl}`);
      
      if (isLoggedInUrl) {
        this.isLoggedIn = true;
        this.currentStatus = 'idle';
        logger.info('用户已登录智联招聘 - URL验证');
        return true;
      }

      this.isLoggedIn = false;
      this.currentStatus = 'waiting_login';
      logger.info(`用户尚未登录智联招聘 (指示器:${loginIndicators}, 登录按钮:${hasLoginButton}, URL验证:${isLoggedInUrl})`);
      return false;
      
    }, '检查登录状态', 2); // 减少重试次数，因为登录状态检查相对简单
  }

  /**
   * 等待用户登录完成
   */
  async waitForLogin(timeout = 300000) { // 5分钟超时
    try {
      logger.info('等待用户完成智联招聘登录...');
      this.currentStatus = 'waiting_login';
      
      const startTime = Date.now();
      
      while (Date.now() - startTime < timeout) {
        const isLoggedIn = await this.checkLoginStatus();
        if (isLoggedIn) {
          logger.info('用户登录成功');
          return true;
        }
        
        // 每5秒检查一次
        await this.page.waitForTimeout(5000);
      }
      
      throw new Error('登录超时，请重新尝试');
      
    } catch (error) {
      logger.error('等待登录失败:', error);
      this.currentStatus = 'error';
      throw error;
    }
  }

  /**
   * 智能识别页面状态 - 快速区分登录页面、二维码页面和已登录状态
   */
  async detectPageStatus() {
    return await this.safePageOperation(async () => {
      const currentUrl = this.page.url();
      
      // 检查是否已登录（URL特征）
      const loggedInUrlPatterns = [
        '/personal/', '/user/', '/member/', '/my/',
        'rd6.zhaopin.com/app/', 'rd.zhaopin.com/',
        '/app/recommend', '/app/position'
      ];
      
      if (loggedInUrlPatterns.some(pattern => currentUrl.includes(pattern))) {
        return { status: 'logged_in', reason: 'URL特征匹配' };
      }
      
      // 检查是否有二维码（快速检测）
      const qrSelectors = [
        '.qr-code', '[class*="qr"]', '[class*="code"]', 
        'img[src*="qr"]', 'canvas[class*="qr"]', '.scan-code',
        '.app-qr', '[id*="qr"]', '[data-type="qr"]',
        '.qrcode-container', '.login-qr'
      ];
      
      for (const selector of qrSelectors) {
        try {
          const isVisible = await this.page.locator(selector).first().isVisible({ timeout: 500 }).catch(() => false);
          if (isVisible) {
            return { status: 'qr_page', reason: `检测到二维码元素: ${selector}` };
          }
        } catch (error) {
          continue;
        }
      }
      
      // 检查是否在登录页面
      const isLoginPage = currentUrl.includes('passport.zhaopin.com') || 
                         currentUrl.includes('login') ||
                         await this.page.locator('text=登录, .login-title, .login-form, [class*="login"]')
                           .first().isVisible({ timeout: 1000 }).catch(() => false);
      
      if (isLoginPage) {
        return { status: 'login_page', reason: '检测到登录页面元素' };
      }
      
      // 检查是否已登录（用户信息元素）
      const userInfoSelectors = [
        '.user-avatar', '.header-avatar', '.user-name', '.header-username',
        '[data-testid="user-info"]', '.user-info', '.login-user'
      ];
      
      for (const selector of userInfoSelectors) {
        try {
          const isVisible = await this.page.locator(selector).first().isVisible({ timeout: 500 }).catch(() => false);
          if (isVisible) {
            return { status: 'logged_in', reason: `检测到用户信息元素: ${selector}` };
          }
        } catch (error) {
          continue;
        }
      }
      
      return { status: 'unknown', reason: '无法确定页面状态' };
    }, '检测页面状态');
  }

  /**
   * 处理登录页面重定向 - 自动跳转到智联APP二维码页面
   */
  async handleLoginPageRedirect() {
    return await this.withErrorHandling(async () => {
      logger.info('检查登录页面并尝试跳转到智联APP二维码页面...');
      
      // 等待页面稳定
      await this.page.waitForTimeout(1500); // 进一步减少等待时间
      
      // 使用智能页面状态识别
      const pageStatus = await this.detectPageStatus();
      logger.info(`页面状态检测结果: ${pageStatus.status} - ${pageStatus.reason}`);
      
      // 根据页面状态决定操作
      switch (pageStatus.status) {
        case 'logged_in':
          logger.info('用户已登录，跳过登录页面重定向');
          return;
          
        case 'qr_page':
          logger.info('当前页面已显示二维码，跳过登录选项查找');
          return;
          
        case 'login_page':
          logger.info('检测到登录页面，开始查找智联APP登录选项...');
          break;
          
        default:
          logger.info('页面状态未知，尝试查找登录选项...');
          break;
      }
      
      logger.info('检测到登录页面，开始查找智联APP登录选项...');
      
      // 查找智联APP登录相关的元素 - 扩展选择器列表
       const appLoginSelectors = [
         'text=智联APP',
         'text=智联招聘APP', 
         'text=APP扫码',
         'text=APP登录',
         'text=扫码登录',
         'text=二维码登录',
         '[class*="app"][class*="login"]',
         '[class*="qr"][class*="app"]',
         '[class*="scan"][class*="login"]',
         '.tab-item:has-text("APP")',
         '.login-tab:has-text("APP")',
         '.tab:has-text("扫码")',
         '.tab:has-text("二维码")',
         '[data-tab="app"]',
         '[data-tab="qr"]',
         '[data-tab="scan"]',
         '[data-type="app"]',
         '[data-type="qr"]',
         'button:has-text("APP")',
         'button:has-text("扫码")',
         'a:has-text("APP登录")',
         'a:has-text("扫码登录")'
       ];
      
      let appLoginElement = null;
      const maxRetries = 2; // 减少重试次数
      let retryCount = 0;
      
      // 重试机制：尝试找到智联APP登录元素
      while (retryCount < maxRetries && !appLoginElement) {
        if (retryCount === 0) {
          logger.info('查找智联APP登录元素...');
        } else {
          logger.info('重试查找智联APP登录元素...');
        }
        
        for (const selector of appLoginSelectors) {
          try {
            const element = this.page.locator(selector).first();
            const isVisible = await element.isVisible({ timeout: 1500 }).catch(() => false);
            if (isVisible) {
              // 检查元素是否可点击
              const isEnabled = await element.isEnabled().catch(() => false);
              if (isEnabled) {
                appLoginElement = element;
                logger.info('找到可用的智联APP登录选项');
                break;
              }
            }
          } catch (error) {
            // 继续尝试下一个选择器
            continue;
          }
        }
        
        if (!appLoginElement) {
          retryCount++;
          if (retryCount < maxRetries) {
            await this.page.waitForTimeout(1000);
          }
        }
      }
      
      if (appLoginElement) {
        let clickSuccess = false;
        const maxClickRetries = 2;
        
        for (let clickAttempt = 0; clickAttempt < maxClickRetries && !clickSuccess; clickAttempt++) {
          try {
            if (clickAttempt === 0) {
              logger.info('点击智联APP登录选项...');
            } else {
              logger.info('重试点击智联APP登录选项...');
            }
            
            // 确保元素在视口中
            await appLoginElement.scrollIntoViewIfNeeded().catch(() => {});
            await this.page.waitForTimeout(300);
            
            // 点击元素
            await appLoginElement.click({ force: true });
            
            // 等待页面响应
            await this.page.waitForTimeout(2000);
            
            // 验证是否成功跳转到APP二维码页面 - 扩展二维码选择器
            const qrSelectors = [
              '.qr-code',
              '[class*="qr"]',
              '[class*="code"]', 
              'img[src*="qr"]',
              'canvas[class*="qr"]',
              '.scan-code',
              '.app-qr',
              '[id*="qr"]',
              '[data-type="qr"]',
              '.qrcode-container',
              '.login-qr'
            ];
            
            let hasQRCode = false;
            for (const qrSelector of qrSelectors) {
              try {
                const qrElement = this.page.locator(qrSelector).first();
                const isVisible = await qrElement.isVisible({ timeout: 1500 }).catch(() => false);
                if (isVisible) {
                  hasQRCode = true;
                  logger.info('检测到二维码元素');
                  break;
                }
              } catch (error) {
                continue;
              }
            }
            
            if (hasQRCode) {
              logger.info('成功跳转到智联APP二维码登录页面');
              clickSuccess = true;
            } else {
              // 检查是否有其他登录相关的变化
              const currentUrl = this.page.url();
              const hasLoginChange = currentUrl.includes('login') || currentUrl.includes('passport') || currentUrl.includes('app');
              
              if (hasLoginChange && clickAttempt < maxClickRetries - 1) {
                logger.warn('页面有变化但未检测到二维码，重试中...');
                await this.page.waitForTimeout(2000);
              } else {
                logger.warn('未检测到二维码，可能跳转失败');
              }
            }
          } catch (clickError) {
            if (clickAttempt === 0) {
              logger.error('点击智联APP登录选项时出错:', clickError.message);
            } else {
              logger.error('重试点击时出错:', clickError.message);
            }
            if (clickAttempt < maxClickRetries - 1) {
              await this.page.waitForTimeout(2000);
            }
          }
        }
        
        if (!clickSuccess) {
          logger.warn('多次尝试后仍未成功跳转到智联APP二维码页面');
        }
      } else {
        logger.info('未找到智联APP登录选项，可能页面结构已变化或默认就是APP登录页面');
        
        // 检查是否已经在二维码页面
        const hasQRCode = await this.safePageOperation(async () => {
          const qrElements = this.page.locator('.qr-code, [class*="qr"], [class*="code"], img[src*="qr"]');
          return await qrElements.first().isVisible({ timeout: 3000 }).catch(() => false);
        }, '检查当前页面二维码');
        
        if (hasQRCode) {
          logger.info('当前页面已显示二维码，无需跳转');
        } else {
          logger.warn('未检测到二维码，用户可能需要手动选择登录方式');
        }
      }
      
    }, '处理登录页面重定向', 2);
  }

  /**
   * 导航到简历搜索页面 - 优化版本
   * 改进页面导航逻辑和错误处理机制
   */
  async navigateToResumeSearch() {
    try {
      logger.info('正在导航到简历搜索页面...');
      
      // 首先检查当前页面状态
      if (!this.page || this.page.isClosed()) {
        throw new Error('页面不可用，无法导航');
      }
      
      const currentUrl = this.page.url();
      logger.info(`当前页面URL: ${currentUrl}`);
      
      // 如果已经在搜索页面，直接返回
      if (currentUrl.includes('resume') || currentUrl.includes('search')) {
        logger.info('已经在简历搜索页面，跳过导航');
        return;
      }
      
      // 查找简历搜索相关的链接或按钮
      const searchLinks = [
        'a[href*="resume"]',
        'a[href*="search"]',
        '.nav-item:has-text("简历")',
        '.menu-item:has-text("简历")',
        '[data-menu="resume"]'
      ];
      
      let searchLink = null;
      for (const selector of searchLinks) {
        try {
          searchLink = await this.page.$(selector);
          if (searchLink) {
            logger.info(`找到简历搜索链接: ${selector}`);
            break;
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }
      
      if (searchLink) {
        // 点击搜索链接
        await searchLink.click();
        logger.info('已点击搜索链接，等待页面响应...');
        
        // 使用更短的超时时间等待页面开始加载
        try {
          await this.page.waitForLoadState('domcontentloaded', { timeout: 60000 });
          logger.info('页面DOM加载完成');
        } catch (domError) {
          logger.warn('DOM加载超时，但继续尝试:', domError.message);
        }
        
        // 短暂等待页面稳定
        await this.page.waitForTimeout(2000);
        
      } else {
        logger.warn('未找到搜索链接，尝试直接导航');
        
        // 直接导航到简历搜索页面
        try {
          await this.page.goto('https://rd.zhaopin.com/resumepreview', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
          });
          logger.info('直接导航成功');
        } catch (gotoError) {
          logger.error('直接导航也失败:', gotoError.message);
          throw gotoError;
        }
      }
      
      // 验证导航是否成功
      const newUrl = this.page.url();
      logger.info(`导航后页面URL: ${newUrl}`);
      
      // 调用优化后的页面加载等待方法
      await this.waitForPageFullyLoaded();
      logger.info('成功导航到简历搜索页面');
      
    } catch (error) {
      logger.error('导航到简历搜索页面失败:', error);
      
      // 增强错误处理：检查页面是否仍然可用
      if (this.page && !this.page.isClosed()) {
        try {
          const currentUrl = this.page.url();
          logger.info(`错误发生时的页面URL: ${currentUrl}`);
          
          // 如果已经在简历相关页面，可能导航实际上是成功的
          if (currentUrl.includes('resume') || currentUrl.includes('search') || currentUrl.includes('zhaopin.com')) {
            logger.warn('虽然导航过程中出现错误，但似乎已经在正确的页面上，继续执行');
            return; // 不抛出错误，继续执行
          }
        } catch (urlError) {
          logger.warn('无法获取当前页面URL:', urlError.message);
        }
      }
      
      throw error;
    }
  }

  /**
   * 开始候选人浏览
   * @param {string} mode - 浏览模式：'search', 'recommended', 'communication'
   * @param {object} filters - 筛选条件
   * @param {number} targetCount - 目标候选人数量
   */
  async startBrowsing(mode, filters = {}, targetCount = 50) {
    // 首先重置停止标志，确保服务可以正常启动
    this.isStopped = false;
    
    return await this.withErrorHandling(async () => {
      logger.info(`开始智联招聘候选人浏览，模式: ${mode}，目标数量: ${targetCount}`);
      
      // 验证和重置状态
      this.validateAndResetState();
      
      // 检查浏览器状态
      if (!this.browser || !this.page) {
        await this.initializeBrowser();
        await this.openZhilianWebsite();
      }
      
      // 检查登录状态
      const isLoggedIn = await this.checkLoginStatus();
      if (!isLoggedIn) {
        throw new Error('用户尚未登录智联招聘');
      }
      
      // 初始化浏览状态
      this.browsingStatus = {
        isActive: true,
        mode: mode,
        candidates: [],
        processedCount: 0,
        collectedCount: 0,
        failedCount: 0,
        currentIndex: 0,
        filters: filters,
        startTime: new Date(),
        targetCount: targetCount,
        currentPage: 1,
        totalPages: 0
      };
      
      this.currentStatus = 'browsing';
      this.isStopped = false; // 重置停止标志，允许浏览器恢复机制正常工作
      
      // 根据模式执行不同的浏览策略
      switch (mode) {
        case 'search':
          await this.browseSearchCandidates(filters, targetCount);
          break;
        case 'recommended':
          await this.browseRecommendedCandidates(targetCount);
          break;
        case 'communication':
          await this.browseCommunicationCandidates(targetCount);
          break;
        case 'favorites':
          await this.browseFavoriteCandidates(targetCount);
          break;
        default:
          throw new Error(`不支持的浏览模式: ${mode}`);
      }
      
      this.browsingStatus.isActive = false;
      this.currentStatus = 'idle';
      logger.info(`智联招聘候选人浏览完成，共收集 ${this.browsingStatus.collectedCount} 个候选人`);
      
    }, `启动${mode}模式浏览`, 2);
  }

  /**
   * 浏览搜索候选人
   * @param {object} filters - 筛选条件
   * @param {number} targetCount - 目标数量
   */
  async browseSearchCandidates(filters, targetCount = 50) {
    try {
      logger.info('开始浏览搜索候选人，筛选条件:', filters);
      
      // 导航到简历搜索页面
      await this.navigateToResumeSearch();
      
      // 重要：在查看候选人之前，必须先完成所有筛选条件的配置
      logger.info('配置筛选条件中，在此期间不查看候选人信息...');
      await this.applySearchFilters(filters);
      
      // 筛选条件配置完成后，使用智能随机延迟等待页面更新
      logger.info('筛选条件配置完成，智能等待页面更新...');
      await this.smartRandomDelay('navigation');
      
      // 等待页面完全加载
      await this.waitForPageFullyLoaded();
      
      // 再次智能延迟，确保筛选后的候选人完全加载
      logger.info('智能等待，确保筛选后的候选人加载完成...');
      await this.smartRandomDelay('navigation');
      
      // 模拟人类查看筛选结果的行为
      await this.simulateHumanBehavior();
      
      // 按照页面顺序从上往下处理候选人
      logger.info('开始按顺序处理候选人，从上往下点击...');
      await this.processSearchResultsSequentially(targetCount);
      
      logger.info(`搜索候选人浏览完成，共处理 ${this.browsingStatus.processedCount} 个候选人`);
      
    } catch (error) {
      logger.error('浏览搜索候选人失败:', error);
      throw error;
    }
  }
  
  /**
   * 浏览推荐候选人
   * @param {number} targetCount - 目标数量
   */
  async browseRecommendedCandidates(targetCount = 50) {
    try {
      logger.info('开始浏览推荐候选人');
      
      // 导航到推荐页面
      await this.navigateToRecommendedPage();
      
      // 处理推荐候选人
      await this.processRecommendedCandidates(targetCount);
      
      logger.info(`推荐候选人浏览完成，共处理 ${this.browsingStatus.processedCount} 个候选人`);
      
    } catch (error) {
      logger.error('浏览推荐候选人失败:', error);
      throw error;
    }
  }
  
  /**
   * 浏览沟通候选人
   * @param {number} targetCount - 目标数量
   */
  async browseCommunicationCandidates(targetCount = 50) {
    try {
      logger.info('开始浏览沟通候选人');
      
      // 导航到沟通页面
      await this.navigateToCommunicationPage();
      
      // 处理沟通候选人
      await this.processCommunicationCandidates(targetCount);
      
      logger.info(`沟通候选人浏览完成，共处理 ${this.browsingStatus.processedCount} 个候选人`);
      
    } catch (error) {
      logger.error('浏览沟通候选人失败:', error);
      throw error;
    }
  }

  /**
   * 浏览收藏候选人
   * @param {number} targetCount - 目标数量
   */
  async browseFavoriteCandidates(targetCount = 50) {
    try {
      logger.info('开始浏览收藏候选人');
      
      // 导航到收藏页面
      await this.navigateToFavoritesPage();
      
      // 处理收藏候选人
      await this.processFavoriteCandidates(targetCount);
      
      logger.info(`收藏候选人浏览完成，共处理 ${this.browsingStatus.processedCount} 个候选人`);
      
    } catch (error) {
      logger.error('浏览收藏候选人失败:', error);
      throw error;
    }
  }

  /**
   * 应用搜索筛选条件
   * @param {object} filters - 筛选条件
   */
  async applySearchFilters(filters) {
    try {
      logger.info('开始应用搜索筛选条件:', filters);
      
      // 等待页面基本加载完成，使用更短的超时时间和容错处理
      try {
        await this.page.waitForLoadState('domcontentloaded', { timeout: 10000 });
        logger.info('页面DOM加载完成');
      } catch (loadError) {
        logger.warn('页面加载等待超时，但继续执行:', loadError.message);
      }
      
      await this.page.waitForTimeout(2000);
      
      // 关键词搜索
      if (filters.keywords) {
        const searchInputSelectors = [
          'input[type="text"]', 
          '.search-input', 
          '#searchInput',
          '[placeholder*="关键词"]',
          '[placeholder*="搜索"]',
          '.keyword-input',
          '.search-box input'
        ];
        
        for (const selector of searchInputSelectors) {
          try {
            const searchInput = await this.page.$(selector);
            if (searchInput) {
              await searchInput.fill(filters.keywords);
              logger.info(`设置关键词: ${filters.keywords}`);
              break;
            }
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }
      }
      
      // 第一步：配置工作地点
      if (filters.location && filters.location !== '不限') {
        const locationResult = await this.configureLocationFilter(filters.location);
        if (!locationResult) {
          logger.warn('工作地点配置失败，继续执行其他筛选条件');
        }
        await this.page.waitForTimeout(1000);
      }
      
      // 第二步：配置寻聘职位
      if (filters.position && filters.position !== '不限') {
        const positionResult = await this.configurePositionFilter(filters.position);
        if (!positionResult) {
          logger.warn('寻聘职位配置失败，继续执行其他筛选条件');
        }
        await this.page.waitForTimeout(1000);
      }
      
      // 第三步：配置筛选面板中的条件（学历、年龄、经验、院校）
      const panelFilters = {
        education: filters.education,
        age: filters.age,
        experience: filters.experience,
        university: filters.university
      };
      
      // 检查是否有需要配置的筛选面板条件
      const hasPanelFilters = Object.values(panelFilters).some(value => value && value !== '不限');
      
      if (hasPanelFilters) {
        const panelResult = await this.configureFilterPanel(panelFilters);
        if (!panelResult) {
          logger.warn('筛选面板配置失败，但继续执行');
        }
        await this.page.waitForTimeout(1000);
      }
      
      logger.info('筛选条件应用完成');
      
    } catch (error) {
      logger.error('应用搜索筛选条件失败:', error);
      throw error;
    }
  }

  /**
   * 配置工作地点筛选
   * @param {string} location - 工作地点
   */
  async configureLocationFilter(location) {
    try {
      logger.info(`配置工作地点筛选: ${location}`);
      
      // 先定位到关键词面板组件
      const keywordPanel = await this.page.$('div.keyword-panel.sticky-pane');
      if (!keywordPanel) {
        logger.warn('未找到关键词面板组件');
        return false;
      }
      
      // 定位到面板包装器
      const panelWrapper = await keywordPanel.$('div.keyword-panel__wrapper');
      if (!panelWrapper) {
        logger.warn('未找到面板包装器组件');
        return false;
      }
      
      // 定位到工作地点配置组件并点击
      const locationComponent = await panelWrapper.$('div.keyword-panel-city.keyword-panel__city');
      if (!locationComponent) {
        logger.warn('未找到工作地点配置组件');
        return false;
      }
      
      await locationComponent.click();
      await this.page.waitForTimeout(2000);
      
      // 识别弹窗头部组件
      const dialogHeader = await this.page.$('div.s-dialog__header');
      if (!dialogHeader) {
        logger.warn('未找到地点配置弹窗');
        return false;
      }
      
      // 检查并清除现有地点配置
      logger.info('检查并清除现有地点配置...');
      try {
        const existingTags = await this.page.$$('ul.s-tags li.s-tags__item');
        logger.info(`找到 ${existingTags.length} 个现有地点配置`);
        
        for (let i = 0; i < existingTags.length; i++) {
          try {
            const closeButton = await existingTags[i].$('i.s-tags__close.s-icon.s-icon-guanbi');
            if (closeButton) {
              await closeButton.click();
              await this.page.waitForTimeout(500);
              logger.info(`已清除第 ${i + 1} 个现有地点配置`);
            }
          } catch (error) {
            logger.warn(`清除第 ${i + 1} 个地点配置失败:`, error.message);
          }
        }
      } catch (error) {
        logger.warn('清除现有地点配置失败:', error.message);
      }
      
      // 识别搜索输入框并点击
      const searchInput = await this.page.$('input[placeholder="搜索城市名/区县"]');
      if (!searchInput) {
        logger.warn('未找到地点搜索输入框');
        return false;
      }
      
      await searchInput.click();
      await this.page.waitForTimeout(500);
      
      // 清空输入框并输入工作地点
      await searchInput.fill('');
      await searchInput.type(location);
      await this.page.waitForTimeout(2000);
      
      // 等待并点击下拉列表中的第一个选项
      try {
        // 优先尝试点击mark.search-mark元素
        await this.page.waitForSelector('mark.search-mark', { timeout: 5000 });
        const firstOption = await this.page.$('mark.search-mark');
        if (firstOption) {
          await firstOption.click();
          await this.page.waitForTimeout(1000);
          logger.info('已点击下拉列表第一个选项 (mark.search-mark)');
        } else {
          throw new Error('未找到mark.search-mark选项');
        }
      } catch (error) {
        logger.warn('点击mark.search-mark选项失败:', error.message);
        
        // 尝试其他可能的选择器
        const alternativeSelectors = [
          'div.s-cascader__menu .s-cascader__menu-item:first-child',
          'div.s-cascader__menu li:first-child',
          '.cascader-option:first-child',
          '[class*="option"]:first-child'
        ];
        
        let optionClicked = false;
        for (const selector of alternativeSelectors) {
          try {
            const option = await this.page.$(selector);
            if (option) {
              await option.click();
              await this.page.waitForTimeout(1000);
              logger.info(`使用备用选择器点击选项: ${selector}`);
              optionClicked = true;
              break;
            }
          } catch (altError) {
            continue;
          }
        }
        
        if (!optionClicked) {
          logger.warn('未能点击任何下拉选项，继续执行确认操作');
        }
      }
      
      // 识别确认按钮区域
      const cascaderFooter = await this.page.$('div.s-cascader__footer');
      if (!cascaderFooter) {
        logger.warn('未找到确认按钮区域');
        return false;
      }
      
      // 点击确认按钮
      const confirmButton = await cascaderFooter.$('button.s-button.s-cascader__footer-button.s-button--primary.s-button--medium');
      if (!confirmButton) {
        logger.warn('未找到地点确认按钮');
        return false;
      }
      
      // 检查按钮文本确认选择状态
      const buttonText = await confirmButton.textContent();
      logger.info(`确认按钮文本: ${buttonText}`);
      
      await confirmButton.click();
      await this.page.waitForTimeout(2000);
      
      logger.info(`成功配置工作地点: ${location}`);
      return true;
      
    } catch (error) {
      logger.error(`配置工作地点筛选失败:`, error);
      return false;
    }
  }

  /**
   * 配置寻聘职位筛选
   * @param {string} position - 职位名称
   */
  async configurePositionFilter(position) {
    try {
      logger.info(`配置寻聘职位筛选: ${position}`);
      
      // 先定位到关键词面板组件
      const keywordPanel = await this.page.$('div.keyword-panel.sticky-pane');
      if (!keywordPanel) {
        logger.warn('未找到关键词面板组件');
        return false;
      }
      
      // 定位到面板包装器
      const panelWrapper = await keywordPanel.$('div.keyword-panel__wrapper');
      if (!panelWrapper) {
        logger.warn('未找到面板包装器组件');
        return false;
      }
      
      // 定位到寻聘职位组件并点击
      const positionComponent = await panelWrapper.$('div.keyword-input-tag__prepend');
      if (!positionComponent) {
        logger.warn('未找到寻聘职位组件');
        return false;
      }
      
      await positionComponent.click();
      await this.page.waitForTimeout(1000);
      
      // 等待职位选择窗口出现
      const selectDropdown = await this.page.$('div.km-select__dropdown');
      if (!selectDropdown) {
        logger.warn('未找到职位选择窗口');
        return false;
      }
      
      // 在下拉窗口中查找匹配的职位文本并点击
      const optionSelectors = [
        `div.km-select__dropdown >> text="${position}"`,
        `div.km-select__dropdown >> span:has-text("${position}")`,
        `div.km-select__dropdown >> div:has-text("${position}")`,
        `div.km-select__dropdown >> li:has-text("${position}")`,
        `div.km-select__dropdown >> [data-value="${position}"]`
      ];
      
      for (const selector of optionSelectors) {
        try {
          const optionElement = await this.page.$(selector);
          if (optionElement) {
            await optionElement.click();
            await this.page.waitForTimeout(1000);
            logger.info(`成功配置寻聘职位: ${position}`);
            return true;
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }
      
      logger.warn(`未找到职位选项: ${position}`);
      return false;
      
    } catch (error) {
      logger.error(`配置寻聘职位筛选失败:`, error);
      return false;
    }
  }

  /**
   * 配置筛选面板中的条件（学历、年龄、经验、院校）
   * @param {object} filters - 筛选条件对象
   */
  async configureFilterPanel(filters) {
    try {
      logger.info('配置筛选面板条件:', filters);
      
      // 查找筛选面板
      const filterPanel = await this.page.$('div.filter-panel-new');
      if (!filterPanel) {
        logger.warn('未找到筛选面板');
        return false;
      }
      
      // 配置学历要求
      if (filters.education && filters.education !== '不限') {
        await this.selectFilterInPanel(filterPanel, 'education', filters.education, '学历');
      }
      
      // 配置年龄要求
      if (filters.age && filters.age !== '不限') {
        await this.selectFilterInPanel(filterPanel, 'age', filters.age, '年龄');
      }
      
      // 配置经验要求
      if (filters.experience && filters.experience !== '不限') {
        await this.selectFilterInPanel(filterPanel, 'experience', filters.experience, '经验');
      }
      
      // 配置院校要求
      if (filters.university && filters.university !== '不限') {
        await this.selectFilterInPanel(filterPanel, 'university', filters.university, '院校');
      }
      
      logger.info('筛选面板条件配置完成');
      return true;
      
    } catch (error) {
      logger.error('配置筛选面板失败:', error);
      return false;
    }
  }

  /**
   * 在筛选面板中选择特定筛选条件
   * @param {object} filterPanel - 筛选面板元素
   * @param {string} filterType - 筛选类型
   * @param {string} value - 筛选值
   * @param {string} label - 筛选标签
   */
  async selectFilterInPanel(filterPanel, filterType, value, label) {
    try {
      logger.info(`在筛选面板中设置${label}筛选: ${value}`);
      
      // 在筛选面板内查找对应的筛选器
      const filterSelectors = [
        `[data-filter="${filterType}"]`,
        `.filter-${filterType}`,
        `.${filterType}-filter`,
        `[class*="${filterType}"]`,
        `.filter-item:has-text("${label}")`,
        `div:has-text("${label}") + div`,
        `span:has-text("${label}") + span`
      ];
      
      for (const selector of filterSelectors) {
        try {
          const filterElement = await filterPanel.$(selector);
          if (filterElement) {
            await filterElement.click();
            await this.page.waitForTimeout(1000);
            
            // 查找并点击对应的选项值
            const optionSelectors = [
              `text="${value}"`,
              `[data-value="${value}"]`,
              `.option:has-text("${value}")`,
              `.item:has-text("${value}")`,
              `li:has-text("${value}")`,
              `span:has-text("${value}")`,
              `div:has-text("${value}")`
            ];
            
            for (const optionSelector of optionSelectors) {
              try {
                const optionElement = await this.page.$(optionSelector);
                if (optionElement) {
                  await optionElement.click();
                  await this.page.waitForTimeout(1000);
                  logger.info(`成功设置${label}筛选: ${value}`);
                  return true;
                }
              } catch (e) {
                // 继续尝试下一个选项选择器
              }
            }
            break;
          }
        } catch (e) {
          // 继续尝试下一个筛选选择器
        }
      }
      
      logger.warn(`未找到${label}筛选选项: ${value}`);
      return false;
      
    } catch (error) {
      logger.error(`在筛选面板中选择${label}筛选失败:`, error);
      return false;
    }
  }

  /**
   * 在主页面选择筛选选项（保留原方法以兼容性）
   * @param {string} filterType - 筛选类型
   * @param {string} value - 筛选值
   */
  async selectFilterOptionInMainPage(filterType, value) {
    try {
      logger.info(`在主页面设置${filterType}筛选: ${value}`);
      
      // 根据筛选类型调用对应的新方法
      switch (filterType) {
        case 'location':
          return await this.configureLocationFilter(value);
        case 'position':
          return await this.configurePositionFilter(value);
        case 'education':
        case 'age':
        case 'experience':
        case 'university':
          const filters = { [filterType]: value };
          return await this.configureFilterPanel(filters);
        default:
          logger.warn(`未知的筛选类型: ${filterType}`);
          return false;
      }
      
    } catch (error) {
      logger.error(`在主页面选择筛选选项失败 (${filterType}: ${value}):`, error);
      return false;
    }
  }

  /**
   * 选择筛选选项 - 保留原方法以兼容性
   * @param {string} filterType - 筛选类型
   * @param {string} value - 筛选值
   */
  async selectFilterOption(filterType, value) {
    // 直接调用主页面方法
    return await this.selectFilterOptionInMainPage(filterType, value);
  }

  /**
   * 在主页面执行搜索
   */
  async executeSearch() {
    try {
      logger.info('在主页面执行搜索...');
      
      // 智联招聘主页面搜索按钮选择器
      const searchButtons = [
        '.search-btn',
        '.btn-search', 
        'button[type="submit"]',
        '.submit-btn',
        '.search-button',
        '.btn-primary',
        'text="搜索"',
        'text="查找"',
        'text="搜索简历"',
        '[class*="search"]',
        '[class*="submit"]',
        'button:has-text("搜索")',
        'button:has-text("查找")',
        'input[type="submit"]',
        '.search-form button',
        '.search-box button'
      ];
      
      let searchButton = null;
      for (const selector of searchButtons) {
        try {
          searchButton = await this.page.$(selector);
          if (searchButton) {
            logger.info(`找到主页面搜索按钮: ${selector}`);
            break;
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }
      
      if (searchButton) {
        // 点击前的智能延迟和人类行为模拟
        await this.smartRandomDelay('click');
        await this.simulateHumanBehavior();
        
        await searchButton.click();
        logger.info('点击搜索按钮');
      } else {
        // 尝试按回车键执行搜索
        logger.info('未找到搜索按钮，尝试按回车键');
        await this.smartRandomDelay('input');
        await this.page.keyboard.press('Enter');
      }
      
      // 搜索后的导航延迟
      await this.smartRandomDelay('navigation');
      
      // 等待搜索结果加载
      logger.info('等待搜索结果加载...');
      await this.page.waitForLoadState('networkidle', { timeout: 60000 });
      
      // 智能延迟确保筛选结果完全加载
      logger.info('智能等待确保筛选结果完全加载...');
      await this.smartRandomDelay('navigation');
      
      await this.waitForPageFullyLoaded();
      
      logger.info('搜索执行完成，页面加载完毕');
      
      // 按照用户要求，智能等待确保筛选后的候选人加载成功
      logger.info('智能等待，确保筛选后的候选人加载完成...');
      await this.smartRandomDelay('navigation');
      
      // 模拟人类查看搜索结果的行为
      await this.simulateHumanBehavior();
      
      logger.info('主页面搜索执行完成');
      
    } catch (error) {
      logger.error('在主页面执行搜索失败:', error);
      throw error;
    }
  }

  /**
   * 处理搜索结果
   * @param {number} targetCount - 目标处理数量
   */
  async processSearchResults(targetCount) {
    try {
      logger.info(`开始处理搜索结果，目标数量: ${targetCount}`);
      
      let processedCount = 0;
      let currentPage = 1;
      
      while (processedCount < targetCount && this.browsingStatus.isActive) {
        logger.info(`处理第 ${currentPage} 页搜索结果`);
        
        // 等待页面加载完成
        await this.waitForPageFullyLoaded();
        
        // 获取当前页面的候选人列表
        const candidateElements = await this.getCandidateElements();
        
        if (candidateElements.length === 0) {
          logger.info('没有找到更多候选人，搜索结束');
          break;
        }
        
        // 处理当前页面的候选人
        for (let i = 0; i < candidateElements.length && processedCount < targetCount && this.browsingStatus.isActive; i++) {
          // 检查服务是否已停止
          if (this.isStopped) {
            logger.info('服务已停止，退出推荐候选人处理循环');
            break;
          }
          
          try {
            // 新的简历处理流程：点击候选人卡片→打开在线简历→复制内容→前端处理
            const resumeProcessed = await this.processResumeWithFrontend(candidateElements[i], processedCount + 1);
            
            if (resumeProcessed) {
              processedCount++;
              this.browsingStatus.processedCount = processedCount;
              this.browsingStatus.collectedCount++;
              
              // 发送进度更新
              if (this.io) {
                this.io.emit('zhilianBrowsingProgress', {
                  processed: processedCount,
                  target: targetCount,
                  collected: this.browsingStatus.collectedCount,
                  failed: this.browsingStatus.failedCount,
                  currentPage: currentPage
                });
              }
              
              // 检查是否达到目标数量
              if (processedCount >= targetCount) {
                logger.info(`已达到目标简历数量 ${targetCount}，自动停止采集`);
                this.browsingStatus.isActive = false;
                break;
              }
            }
            
            // 反爬虫延迟
            await this.randomDelay();
            
          } catch (error) {
            logger.error(`处理第 ${i + 1} 个候选人失败:`, error);
            this.browsingStatus.failedCount++;
          }
        }
        
        // 尝试翻到下一页
        if (processedCount < targetCount && this.browsingStatus.isActive) {
          const hasNextPage = await this.goToNextPage();
          if (!hasNextPage) {
            logger.info('已到达最后一页，搜索结束');
            break;
          }
          currentPage++;
          this.browsingStatus.currentPage = currentPage;
        }
      }
      
      logger.info(`搜索结果处理完成，共处理 ${processedCount} 个候选人`);
      
    } catch (error) {
      logger.error('处理搜索结果失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前页面候选人数量（不获取元素引用，避免DOM分离问题）
   */
  async getCandidateCount() {
    try {
      // 智联招聘主页面候选人列表选择器
      const candidateSelectors = [
        'div.search-resume-item.resume-item-exp',
        '.search-resume-item',
        '.resume-item',
        '.resume-card', 
        '.candidate-item',
        '.search-result-item',
        '.list-item',
        '.resume-list-item'
      ];
      
      // 尝试每个选择器
      for (const selector of candidateSelectors) {
        try {
          const count = await this.page.$$eval(selector, elements => elements.length);
          if (count > 0) {
            logger.info(`找到 ${count} 个候选人元素 (${selector})`);
            return count;
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }
      
      return 0;
    } catch (error) {
      logger.error('获取候选人数量失败:', error);
      return 0;
    }
  }
  
  /**
   * 获取指定索引的候选人元素（即时获取，避免DOM元素分离问题）
   * @param {number} index - 候选人索引（0开始）
   */
  async getCurrentCandidateElement(index) {
    try {
      // 智联招聘主页面候选人列表选择器
      const candidateSelectors = [
        'div.search-resume-item.resume-item-exp',
        '.search-resume-item',
        '.resume-item',
        '.resume-card', 
        '.candidate-item',
        '.search-result-item',
        '.list-item',
        '.resume-list-item'
      ];
      
      // 尝试每个选择器
      for (const selector of candidateSelectors) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > index) {
            // 验证元素是否仍然有效
            const isAttached = await elements[index].evaluate(el => el.isConnected);
            if (isAttached) {
              logger.info(`成功获取第 ${index + 1} 个候选人元素 (${selector})`);
              return elements[index];
            } else {
              logger.warn(`第 ${index + 1} 个候选人元素已从 DOM 中分离`);
            }
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }
      
      logger.warn(`无法获取第 ${index + 1} 个候选人元素`);
      return null;
    } catch (error) {
      logger.error(`获取第 ${index + 1} 个候选人元素失败:`, error);
      return null;
    }
  }

  /**
   * 获取候选人元素列表
   */
  /**
   * 在主页面获取候选人元素列表
   */
  async getCandidateElements() {
    try {
      logger.info('在主页面查找候选人元素...');
      
      // 首先分析页面结构
      const pageAnalysis = await this.analyzePage();
      
      // 智联招聘主页面候选人列表选择器（扩展版）
      const candidateSelectors = [
        // 用户定义的精确选择器（优先使用）
        'div.search-resume-item.resume-item-exp',
        
        // 智联招聘特定选择器
        '.search-resume-item',
        '.resume-item',
        '.resume-card', 
        '.candidate-item',
        '.search-result-item',
        '.list-item',
        '.resume-list-item',
        '.talent-card',
        '.talent-item',
        '.person-card',
        '.person-item',
        '.user-card',
        '.user-item',
        
        // 通用候选人相关选择器
        '[data-testid="resume-item"]',
        '[data-testid="candidate-item"]',
        '[data-testid="talent-card"]',
        '[class*="resume"]',
        '[class*="candidate"]',
        '[class*="talent"]',
        '[class*="person"]',
        '[class*="user"]',
        '[class*="card"]',
        '[class*="item"]',
        
        // 列表项选择器
        'li[class*="resume"]',
        'li[class*="candidate"]',
        'li[class*="talent"]',
        'li[class*="person"]',
        'li[class*="user"]',
        'li[class*="card"]',
        'li[class*="item"]',
        
        // div容器选择器
        'div[class*="resume"]',
        'div[class*="candidate"]',
        'div[class*="talent"]',
        'div[class*="person"]',
        'div[class*="user"]',
        'div[class*="card"]',
        
        // 通用选择器
        '.card',
        '.item',
        'li',
        'article'
      ];
      
      // 尝试每个选择器
      for (const selector of candidateSelectors) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            // 验证元素是否包含候选人信息
            const validElements = await this.validateCandidateElements(elements, selector);
            if (validElements.length > 0) {
              logger.info(`找到 ${validElements.length} 个有效候选人元素 (${selector})`);
              return validElements;
            }
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }
      
      // 如果没有找到，尝试动态分析
      const dynamicElements = await this.findCandidateElementsDynamically();
      if (dynamicElements.length > 0) {
        logger.info(`通过动态分析找到 ${dynamicElements.length} 个候选人元素`);
        return dynamicElements;
      }
      
      logger.warn('未找到候选人元素，开始详细分析页面结构...');
      
      // 输出页面分析结果
      logger.info('页面分析结果:', JSON.stringify(pageAnalysis, null, 2));
      
      // 尝试获取页面的基本信息
      const pageInfo = await this.page.evaluate(() => {
        return {
          url: window.location.href,
          title: document.title,
          bodyText: document.body ? document.body.textContent.substring(0, 500) : 'No body',
          elementCount: document.querySelectorAll('*').length,
          divCount: document.querySelectorAll('div').length,
          liCount: document.querySelectorAll('li').length
        };
      });
      
      logger.info('页面基本信息:', pageInfo);
      
      return [];
      
    } catch (error) {
      logger.error('获取候选人元素失败:', error);
      return [];
    }
  }

  /**
   * 提取候选人信息
   * @param {object} candidateElement - 候选人元素
   * @param {number} index - 索引
   */
  /**
   * 分析页面结构
   */
  async analyzePage() {
    try {
      return await this.page.evaluate(() => {
        const analysis = {
          url: window.location.href,
          title: document.title,
          possibleCandidateElements: [],
          allClasses: [],
          allIds: []
        };
        
        // 收集所有类名和ID
        const allElements = document.querySelectorAll('*');
        const classSet = new Set();
        const idSet = new Set();
        
        Array.from(allElements).forEach(el => {
          if (el.className && typeof el.className === 'string') {
            el.className.split(' ').forEach(cls => {
              if (cls.trim()) classSet.add(cls.trim());
            });
          }
          if (el.id) idSet.add(el.id);
        });
        
        analysis.allClasses = Array.from(classSet).slice(0, 100);
        analysis.allIds = Array.from(idSet).slice(0, 50);
        
        return analysis;
      });
    } catch (error) {
      logger.error('页面分析失败:', error);
      return { possibleCandidateElements: [], allClasses: [], allIds: [] };
    }
  }
  
  /**
   * 验证候选人元素是否有效
   */
  async validateCandidateElements(elements, selector) {
    try {
      const validElements = [];
      
      for (let i = 0; i < Math.min(elements.length, 10); i++) {
        const element = elements[i];
        try {
          const text = await element.textContent();
          
          // 检查是否包含候选人相关信息
          const hasPersonInfo = text && (
            text.includes('年') || text.includes('岁') || text.includes('经验') ||
            text.includes('学历') || text.includes('薪资') || text.includes('工作') ||
            text.includes('简历') || text.includes('求职') || text.includes('期望') ||
            text.includes('本科') || text.includes('硕士') || text.includes('专科') ||
            text.includes('k') || text.includes('K') || text.includes('万') ||
            /\d+年/.test(text) || /\d+岁/.test(text)
          );
          
          if (hasPersonInfo && text.length > 20 && text.length < 2000) {
            validElements.push(element);
          }
        } catch (e) {
          // 跳过无效元素
        }
      }
      
      // 如果验证的元素中有超过30%是有效的，则认为整个选择器有效
      if (validElements.length > 0 && validElements.length / Math.min(elements.length, 10) > 0.3) {
        return elements;
      }
      
      return [];
    } catch (error) {
      logger.error('验证候选人元素失败:', error);
      return [];
    }
  }
  
  /**
   * 动态查找候选人元素
   */
  async findCandidateElementsDynamically() {
    try {
      return await this.page.evaluate(() => {
        const candidateKeywords = [
          '年', '岁', '经验', '学历', '薪资', '工作', '简历', '求职', '期望',
          '本科', '硕士', '专科', 'k', 'K', '万'
        ];
        
        const allElements = document.querySelectorAll('div, li, article, section');
        const candidateElements = [];
        
        Array.from(allElements).forEach(el => {
          const text = el.textContent || '';
          
          // 检查文本长度和关键词
          if (text.length > 50 && text.length < 1000) {
            let keywordCount = 0;
            candidateKeywords.forEach(keyword => {
              if (text.includes(keyword)) keywordCount++;
            });
            
            // 如果包含3个或以上关键词，认为是候选人元素
            if (keywordCount >= 3) {
              candidateElements.push(el);
            }
          }
        });
        
        return candidateElements.slice(0, 20); // 限制数量
      });
    } catch (error) {
      logger.error('动态查找候选人元素失败:', error);
      return [];
    }
  }
  
  async extractCandidateInfo(candidateElement, index) {
    try {
      logger.info(`正在提取第 ${index} 个候选人信息...`);
      
      const candidateInfo = {
        platform: 'zhilian',
        index: index,
        name: '',
        position: '',
        company: '',
        location: '',
        experience: '',
        education: '',
        salary: '',
        age: '',
        lastActive: '',
        skills: [],
        summary: '',
        contactInfo: {},
        resumeUrl: '',
        avatarUrl: '',
        collectedAt: new Date(),
        source: 'browsing'
      };
      
      // 获取候选人元素的文本内容用于解析
      const elementText = (await candidateElement.textContent()) || '';
      const elementHTML = (await candidateElement.innerHTML()) || '';
      
      // 提取姓名 - 使用多种策略
      try {
        // 策略1: 查找子元素
        const nameSelectors = ['.name', '.candidate-name', '.resume-name', '[data-testid="name"]', 'h3', 'h4', '.title'];
        for (const selector of nameSelectors) {
          try {
            const nameElement = await candidateElement.$(selector);
            if (nameElement) {
              const nameText = await nameElement.textContent();
              if (nameText && nameText.trim()) {
                candidateInfo.name = nameText.trim();
                break;
              }
            }
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }
        
        // 策略2: 从文本中提取（如果没有找到专门的姓名元素）
        if (!candidateInfo.name && elementText) {
          const lines = elementText.split('\n').map(line => line.trim()).filter(line => line);
          if (lines.length > 0) {
            // 通常第一行或包含中文姓名的行
            for (const line of lines.slice(0, 3)) {
              if (line.length >= 2 && line.length <= 10 && /[\u4e00-\u9fa5]/.test(line)) {
                candidateInfo.name = line;
                break;
              }
            }
          }
        }
      } catch (e) {
        logger.warn(`提取姓名失败: ${e.message}`);
      }
      
      // 提取职位
      try {
        const positionSelectors = ['.position', '.job-title', '.resume-position', '[data-testid="position"]', '.job', '.role'];
        for (const selector of positionSelectors) {
          try {
            const positionElement = await candidateElement.$(selector);
            if (positionElement) {
              const positionText = await positionElement.textContent();
              if (positionText && positionText.trim()) {
                candidateInfo.position = positionText.trim();
                break;
              }
            }
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }
      } catch (e) {
        logger.warn(`提取职位失败: ${e.message}`);
      }
      
      // 提取公司
      try {
        const companySelectors = ['.company', '.company-name', '.resume-company', '[data-testid="company"]', '.corp'];
        for (const selector of companySelectors) {
          try {
            const companyElement = await candidateElement.$(selector);
            if (companyElement) {
              const companyText = await companyElement.textContent();
              if (companyText && companyText.trim()) {
                candidateInfo.company = companyText.trim();
                break;
              }
            }
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }
      } catch (e) {
        logger.warn(`提取公司失败: ${e.message}`);
      }
      
      // 提取地区
      try {
        const locationSelectors = ['.location', '.work-location', '.resume-location', '[data-testid="location"]', '.city', '.area'];
        for (const selector of locationSelectors) {
          try {
            const locationElement = await candidateElement.$(selector);
            if (locationElement) {
              const locationText = await locationElement.textContent();
              if (locationText && locationText.trim()) {
                candidateInfo.location = locationText.trim();
                break;
              }
            }
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }
      } catch (e) {
        logger.warn(`提取地区失败: ${e.message}`);
      }
      
      // 提取工作经验
      try {
        const experienceSelectors = ['.experience', '.work-experience', '.resume-experience', '[data-testid="experience"]', '.exp', '.years'];
        for (const selector of experienceSelectors) {
          try {
            const experienceElement = await candidateElement.$(selector);
            if (experienceElement) {
              const experienceText = await experienceElement.textContent();
              if (experienceText && experienceText.trim()) {
                candidateInfo.experience = experienceText.trim();
                break;
              }
            }
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }
      } catch (e) {
        logger.warn(`提取工作经验失败: ${e.message}`);
      }
      
      // 提取学历
      try {
        const educationSelectors = ['.education', '.degree', '.resume-education', '[data-testid="education"]', '.edu', '.academic'];
        for (const selector of educationSelectors) {
          try {
            const educationElement = await candidateElement.$(selector);
            if (educationElement) {
              const educationText = await educationElement.textContent();
              if (educationText && educationText.trim()) {
                candidateInfo.education = educationText.trim();
                break;
              }
            }
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }
      } catch (e) {
        logger.warn(`提取学历失败: ${e.message}`);
      }
      
      // 提取期望薪资
      try {
        const salarySelectors = ['.salary', '.expected-salary', '.resume-salary', '[data-testid="salary"]', '.pay', '.wage', '.income'];
        for (const selector of salarySelectors) {
          try {
            const salaryElement = await candidateElement.$(selector);
            if (salaryElement) {
              const salaryText = await salaryElement.textContent();
              if (salaryText && salaryText.trim()) {
                candidateInfo.salary = salaryText.trim();
                break;
              }
            }
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }
      } catch (e) {
        logger.warn(`提取期望薪资失败: ${e.message}`);
      }
      
      // 提取简历链接
      try {
        const linkSelectors = ['a[href*="resume"]', 'a[href*="detail"]', 'a[href*="view"]', 'a'];
        for (const selector of linkSelectors) {
          try {
            const linkElement = await candidateElement.$(selector);
            if (linkElement) {
              const href = await linkElement.getAttribute('href');
              if (href && (href.includes('resume') || href.includes('detail') || href.includes('view'))) {
                candidateInfo.resumeUrl = href;
                break;
              }
            }
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }
      } catch (e) {
        logger.warn(`提取简历链接失败: ${e.message}`);
      }
      
      // 如果没有提取到关键信息，记录元素的文本内容用于调试
      if (!candidateInfo.name && !candidateInfo.position) {
        logger.warn(`候选人信息提取不完整，元素文本: ${elementText.substring(0, 200)}`);
      }
      
      // 清理提取的文本
      Object.keys(candidateInfo).forEach(key => {
        if (typeof candidateInfo[key] === 'string') {
          candidateInfo[key] = candidateInfo[key].trim().replace(/\s+/g, ' ');
        }
      });
      
      logger.info(`第 ${index} 个候选人信息提取完成: ${candidateInfo.name} - ${candidateInfo.position}`);
      return candidateInfo;
      
    } catch (error) {
      logger.error(`提取第 ${index} 个候选人信息失败:`, error);
      return null;
    }
  }

  /**
   * 翻到下一页
   */
  async goToNextPage() {
    try {
      // 查找下一页按钮
      const nextPageSelectors = [
        '.next-page',
        '.btn-next',
        'text="下一页"',
        'text="下页"',
        '.pagination .next',
        '[aria-label="下一页"]'
      ];
      
      for (const selector of nextPageSelectors) {
        try {
          const nextButton = await this.page.$(selector);
          if (nextButton) {
            const isDisabled = await nextButton.getAttribute('disabled');
            if (!isDisabled) {
              // 点击前的智能延迟和人类行为模拟
              await this.smartRandomDelay('click');
              await this.simulateHumanBehavior();
              
              await nextButton.click();
              
              // 页面导航后的智能延迟
              await this.smartRandomDelay('navigation');
              
              await this.page.waitForLoadState('networkidle', { timeout: 60000 });
              await this.waitForPageFullyLoaded();
              
              // 模拟人类查看新页面的行为
              await this.simulateHumanBehavior();
              
              logger.info('成功翻到下一页');
              return true;
            }
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }
      
      logger.info('没有找到下一页按钮或已到最后一页');
      return false;
      
    } catch (error) {
      logger.error('翻页失败:', error);
      return false;
    }
  }

  /**
   * 等待页面完全加载
   */
  /**
   * 等待页面完全加载
   * 优化了超时处理和重试机制
   */
  /**
   * 等待页面完全加载 - 优化版本
   * 改进超时处理和错误恢复机制，避免在页面导航后卡住
   */
  /**
   * 等待页面完全加载 - 智联招聘优化版本
   * 采用多层次检测机制，减少误判和超时问题
   */
  async waitForPageFullyLoaded() {
    try {
      logger.info('等待智联招聘页面完全加载...');
      
      // 首先检查页面是否可用
      if (!this.page || this.page.isClosed()) {
        logger.warn('页面不可用，跳过加载等待');
        return;
      }
      
      // 获取当前页面URL用于调试
      let currentUrl = 'unknown';
      try {
        currentUrl = this.page.url();
        logger.info(`当前页面URL: ${currentUrl}`);
      } catch (urlError) {
        logger.warn('无法获取当前页面URL:', urlError.message);
      }
      
      // 第一阶段：快速检测智联招聘特定的页面加载完成标识
      const isZhilianPageReady = await this.checkZhilianPageReadyState();
      if (isZhilianPageReady) {
        logger.info('✅ 智联招聘页面特定标识检测通过，页面已加载完成');
        return;
      }
      
      // 第二阶段：使用较短的网络空闲检测，避免长时间等待
      try {
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }); // 从60秒减少到15秒
        logger.info('页面网络空闲状态达成');
      } catch (networkIdleError) {
        logger.warn('网络空闲状态超时(15s)，尝试DOM加载检测:', networkIdleError.message);
        
        // 第三阶段：确保DOM加载完成
        try {
          await this.page.waitForLoadState('domcontentloaded', { timeout: 5000 });
          logger.info('DOM内容加载完成');
        } catch (domError) {
          logger.warn('DOM加载状态也超时(5s)，进行智能检测:', domError.message);
          
          // 第四阶段：智能检测页面是否实际可用
          const isPageUsable = await this.checkPageUsability();
          if (isPageUsable) {
            logger.info('✅ 页面可用性检测通过，继续执行');
          } else {
            logger.warn('⚠️ 页面可用性检测失败，但继续执行');
          }
        }
      }
      
      // 第五阶段：等待智联招聘特定的加载指示器消失
      await this.waitForZhilianLoadingIndicators();
      
      // 第六阶段：最终页面状态验证
      await this.validateFinalPageState();
      
      logger.info('✅ 智联招聘页面加载完成');
      
    } catch (error) {
      logger.warn('等待页面加载完成时出现警告:', error.message);
      // 即使出现错误也不抛出，允许继续执行
      await this.logPageDebugInfo();
    }
  }

  /**
   * 检查智联招聘页面特定的加载完成标识
   * @returns {boolean} 页面是否已准备就绪
   */
  async checkZhilianPageReadyState() {
    try {
      // 检查智联招聘特定的页面元素是否已加载
      const zhilianIndicators = [
        // 候选人列表页面标识
        '.resume-list, .candidate-list, [class*="resume-list"], [class*="candidate-list"]',
        // 搜索结果页面标识
        '.search-result, .result-list, [class*="search-result"], [class*="result-list"]',
        // 推荐页面标识
        '.recommend-list, .recommend-content, [class*="recommend"]',
        // 智联招聘通用内容区域
        '.main-content, .content-wrapper, [class*="main-content"], [class*="content-wrapper"]',
        // 页面导航或头部
        '.header, .nav, .navbar, [class*="header"], [class*="nav"]'
      ];
      
      for (const selector of zhilianIndicators) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            const isVisible = await element.isVisible();
            if (isVisible) {
              logger.info(`✅ 智联招聘页面标识检测成功: ${selector}`);
              return true;
            }
          }
        } catch (e) {
          // 继续检查下一个标识
          continue;
        }
      }
      
      return false;
    } catch (error) {
      logger.warn('智联招聘页面标识检测失败:', error.message);
      return false;
    }
  }
  
  /**
   * 检查页面可用性
   * @returns {boolean} 页面是否可用
   */
  async checkPageUsability() {
    try {
      // 检查页面基本响应性
      const readyState = await this.page.evaluate(() => document.readyState);
      logger.info(`页面readyState: ${readyState}`);
      
      // 检查页面是否有基本的可交互元素
      const hasInteractiveElements = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button, a, input, [role="button"]');
        const visibleButtons = Array.from(buttons).filter(btn => {
          const style = window.getComputedStyle(btn);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        return visibleButtons.length > 0;
      });
      
      logger.info(`页面可交互元素检测: ${hasInteractiveElements}`);
      
      // 检查页面是否有内容
      const hasContent = await this.page.evaluate(() => {
        const bodyText = document.body.innerText.trim();
        return bodyText.length > 100; // 页面应该有一定的文本内容
      });
      
      logger.info(`页面内容检测: ${hasContent}`);
      
      return readyState === 'complete' && hasInteractiveElements && hasContent;
    } catch (error) {
      logger.warn('页面可用性检测失败:', error.message);
      return false;
    }
  }
  
  /**
   * 等待智联招聘特定的加载指示器消失
   */
  async waitForZhilianLoadingIndicators() {
    try {
      // 智联招聘特定的加载指示器
      const zhilianLoadingSelectors = [
        // 通用加载指示器
        '.loading', '.spinner', '.loading-mask', '.ant-spin',
        // 智联招聘特定的加载指示器
        '.zp-loading', '.zhilian-loading', '[class*="loading"]',
        // 骨架屏或占位符
        '.skeleton', '.placeholder', '[class*="skeleton"], [class*="placeholder"]',
        // 数据加载中的提示
        '.data-loading', '.content-loading', '[class*="data-loading"]'
      ];
      
      let foundLoadingIndicator = false;
      
      for (const selector of zhilianLoadingSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            const isVisible = await element.isVisible();
            if (isVisible) {
              foundLoadingIndicator = true;
              logger.info(`等待加载指示器消失: ${selector}`);
              await this.page.waitForSelector(selector, { state: 'hidden', timeout: 5000 });
              logger.info(`✅ 加载指示器已消失: ${selector}`);
            }
          }
        } catch (e) {
          // 加载指示器可能不存在或已经消失，继续
        }
      }
      
      if (!foundLoadingIndicator) {
        logger.info('未发现活跃的加载指示器');
      }
      
      // 短暂等待确保页面稳定
      await this.page.waitForTimeout(500);
      
    } catch (error) {
      logger.warn('等待加载指示器时出现警告:', error.message);
    }
  }
  
  /**
   * 验证最终页面状态
   */
  async validateFinalPageState() {
    try {
      // 检查页面响应性
      const readyState = await this.page.evaluate(() => document.readyState);
      logger.info(`最终页面状态检查 - readyState: ${readyState}`);
      
      // 检查页面是否有错误信息
      const hasError = await this.page.evaluate(() => {
        const errorSelectors = ['.error', '.error-message', '[class*="error"]', '.not-found', '[class*="404"]'];
        return errorSelectors.some(selector => {
          try {
            const element = document.querySelector(selector);
            return element && element.offsetParent !== null; // 检查元素是否可见
          } catch (e) {
            return false; // 如果选择器无效，返回false
          }
        });
      });
      
      if (hasError) {
        logger.warn('⚠️ 页面可能包含错误信息');
      } else {
        logger.info('✅ 页面状态验证通过');
      }
      
    } catch (error) {
      logger.warn('最终页面状态验证失败:', error.message);
    }
  }
  
  /**
   * 记录页面调试信息
   */
  async logPageDebugInfo() {
    try {
      if (this.page && !this.page.isClosed()) {
        const currentUrl = this.page.url();
        const readyState = await this.page.evaluate(() => document.readyState);
        const title = await this.page.title();
        
        logger.info(`📊 页面调试信息:`);
        logger.info(`   URL: ${currentUrl}`);
        logger.info(`   Title: ${title}`);
        logger.info(`   ReadyState: ${readyState}`);
        
        // 检查页面是否有内容
        const contentInfo = await this.page.evaluate(() => {
          return {
            bodyTextLength: document.body.innerText.trim().length,
            elementCount: document.querySelectorAll('*').length,
            hasImages: document.querySelectorAll('img').length > 0,
            hasButtons: document.querySelectorAll('button, [role="button"]').length > 0
          };
        });
        
        logger.info(`   内容长度: ${contentInfo.bodyTextLength}`);
        logger.info(`   元素数量: ${contentInfo.elementCount}`);
        logger.info(`   包含图片: ${contentInfo.hasImages}`);
        logger.info(`   包含按钮: ${contentInfo.hasButtons}`);
      }
    } catch (statusError) {
      logger.warn('无法获取页面调试信息:', statusError.message);
    }
  }

  /**
   * 停止候选人浏览
   */
  async stopBrowsing() {
    try {
      logger.info('正在停止智联招聘候选人浏览...');
      
      this.browsingStatus.isActive = false;
      this.currentStatus = 'idle';
      this.isStopped = true; // 设置停止标志，阻止浏览器恢复机制
      
      // 发送停止通知
      if (this.io) {
        this.io.emit('zhilianBrowsingStatus', {
          status: 'stopped',
          message: '候选人浏览已停止',
          data: this.getBrowsingStatus()
        });
      }
      
      logger.info('智联招聘候选人浏览已停止');
      
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
      logger.info('正在重置智联招聘候选人浏览状态...');
      
      // 停止当前浏览
      this.browsingStatus.isActive = false;
      this.currentStatus = 'idle';
      this.isStopped = false; // 重置停止标志，允许重新启动服务
      
      // 重置所有浏览状态数据
      this.browsingStatus = {
        isActive: false,
        mode: null,
        candidates: [],
        processedCount: 0,
        collectedCount: 0,
        failedCount: 0,
        currentIndex: 0,
        filters: {},
        startTime: null,
        targetCount: 0,
        currentPage: 1,
        totalPages: 0
      };
      
      // 发送重置通知
      if (this.io) {
        this.io.emit('zhilianBrowsingStatus', {
          status: 'reset',
          message: '候选人浏览状态已重置',
          data: this.getBrowsingStatus()
        });
      }
      
      logger.info('智联招聘候选人浏览状态已重置');
      
    } catch (error) {
      logger.error('重置候选人浏览状态失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前状态
   */
  /**
   * 获取当前服务状态 - 返回前端期望的数据结构
   */
  getCurrentStatus() {
    const isInitialized = this.browser !== null;
    
    return {
      // 前端期望的字段
      initialized: isInitialized,
      loggedIn: this.isLoggedIn,
      status: this.currentStatus,
      
      // 浏览器和页面状态
      hasBrowser: isInitialized,
      hasPage: this.page !== null,
      
      // 详细状态信息
      browser: {
        isOpen: isInitialized,
        currentUrl: this.page ? null : null // 避免异步调用
      },
      page: {
        isReady: this.page !== null,
        title: null // 避免异步调用
      },
      
      // 浏览和简历处理状态
      browsing: this.getBrowsingStatus(),
      resumeProcessing: this.getResumeProcessingStatus()
    };
  }
  
  /**
   * 获取简历处理状态
   */
  getResumeProcessingStatus() {
    return {
      ...this.resumeProcessingStatus,
      duration: this.resumeProcessingStatus.startTime ? 
        Date.now() - this.resumeProcessingStatus.startTime.getTime() : 0
    };
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
      likedCount: this.browsingStatus.collectedCount, // 使用collectedCount作为likedCount
      dislikedCount: this.browsingStatus.failedCount, // 使用failedCount作为dislikedCount
      currentIndex: this.browsingStatus.currentIndex,
      filters: this.browsingStatus.filters,
      targetCount: this.browsingStatus.targetCount,
      startTime: this.browsingStatus.startTime,
      isActive: this.browsingStatus.isActive,
      duration: this.browsingStatus.startTime ? 
        Date.now() - this.browsingStatus.startTime.getTime() : 0
    };
  }

  /**
   * 导航到推荐页面
   */
  async navigateToRecommendedPage() {
    try {
      logger.info('正在导航到推荐页面...');
      
      // 智联招聘推荐页面的可能链接
      const recommendedUrls = [
        'https://rd.zhaopin.com/recommend',
        'https://rd.zhaopin.com/talent/recommend',
        'https://rd.zhaopin.com/app/recommend'
      ];
      
      // 尝试直接导航到推荐页面
      for (const url of recommendedUrls) {
        try {
          await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
          await this.waitForPageFullyLoaded();
          
          // 检查是否成功到达推荐页面
          const hasRecommendedContent = await this.page.$('.recommend, .talent-recommend, [data-testid="recommend"]');
          if (hasRecommendedContent) {
            logger.info('成功导航到推荐页面');
            return;
          }
        } catch (e) {
          logger.warn(`导航到 ${url} 失败: ${e.message}`);
        }
      }
      
      // 如果直接导航失败，尝试通过菜单导航
      const menuLinks = [
        'text="推荐"',
        'text="人才推荐"',
        '[href*="recommend"]',
        '.nav-recommend'
      ];
      
      for (const selector of menuLinks) {
        try {
          const link = await this.page.$(selector);
          if (link) {
            await link.click();
            await this.waitForPageFullyLoaded();
            logger.info('通过菜单成功导航到推荐页面');
            return;
          }
        } catch (e) {
          continue;
        }
      }
      
      throw new Error('无法导航到推荐页面');
      
    } catch (error) {
      logger.error('导航到推荐页面失败:', error);
      throw error;
    }
  }
  
  /**
   * 导航到沟通页面 - 优先通过点击导航栏按钮
   */
  /**
   * 导航到沟通页面 - 仅通过点击"互动"按钮
   */
  async navigateToCommunicationPage() {
    try {
      logger.info('正在导航到沟通页面...');
      
      // 只尝试点击"互动"按钮导航
      const interactionSelector = 'text="互动"';
      
      logger.info(`尝试点击互动按钮: ${interactionSelector}`);
      const navElement = await this.page.$(interactionSelector);
      
      if (navElement) {
        // 检查元素是否可见和可点击
        const isVisible = await navElement.isVisible();
        const isEnabled = await navElement.isEnabled();
        
        if (isVisible && isEnabled) {
          logger.info('找到可点击的互动按钮');
          
          // 滚动到元素位置确保可见
          await navElement.scrollIntoViewIfNeeded();
          await this.page.waitForTimeout(500);
          
          // 点击互动按钮
          await navElement.click();
          
          // 短暂等待确保点击生效
          await this.page.waitForTimeout(1000);
          
          // 增加5秒等待时间让页面完全加载，防止出现未发现候选人终止寻聘的情况
          logger.info('等待5秒让互动页面完全加载...');
          await this.page.waitForTimeout(5000);
          
          // 成功点击互动按钮后直接认为导航成功
          logger.info('成功点击互动按钮，导航完成');
          return;
        } else {
          throw new Error('互动按钮不可见或不可点击');
        }
      } else {
        throw new Error('未找到互动按钮');
      }
      
    } catch (error) {
      logger.error('导航到沟通页面失败:', error);
      throw error;
    }
  }

  /**
   * 导航到收藏页面
   */
  async navigateToFavoritesPage() {
    try {
      logger.info('正在导航到收藏页面...');
      
      // 智联招聘收藏页面的可能链接
      const favoritesUrls = [
        'https://rd.zhaopin.com/favorites',
        'https://rd.zhaopin.com/collection',
        'https://rd.zhaopin.com/bookmark',
        'https://rd.zhaopin.com/app/favorites'
      ];
      
      // 尝试直接导航到收藏页面
      for (const url of favoritesUrls) {
        try {
          await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
          await this.waitForPageFullyLoaded();
          
          // 检查是否成功到达收藏页面
          const hasFavoritesContent = await this.page.$('.favorites, .collection, .bookmark, [data-testid="favorites"]');
          if (hasFavoritesContent) {
            logger.info('成功导航到收藏页面');
            return;
          }
        } catch (e) {
          logger.warn(`导航到 ${url} 失败: ${e.message}`);
        }
      }
      
      // 如果直接导航失败，尝试通过菜单导航
      const menuLinks = [
        'text="收藏"',
        'text="我的收藏"',
        'text="收藏夹"',
        '[href*="favorites"]',
        '[href*="collection"]',
        '.nav-favorites'
      ];
      
      for (const selector of menuLinks) {
        try {
          const link = await this.page.$(selector);
          if (link) {
            await link.click();
            await this.waitForPageFullyLoaded();
            logger.info('通过菜单成功导航到收藏页面');
            return;
          }
        } catch (e) {
          continue;
        }
      }
      
      throw new Error('无法导航到收藏页面');
      
    } catch (error) {
      logger.error('导航到收藏页面失败:', error);
      throw error;
    }
  }
  
  /**
   * 处理推荐候选人
   * @param {number} targetCount - 目标数量
   */
  async processRecommendedCandidates(targetCount) {
    try {
      logger.info(`开始处理推荐候选人，目标数量: ${targetCount}`);
      
      let processedCount = 0;
      
      while (processedCount < targetCount && this.browsingStatus.isActive) {
        // 检查服务是否已停止
        if (this.isStopped) {
          logger.info('服务已停止，退出推荐候选人处理循环');
          break;
        }
        
        // 等待页面加载完成
        await this.waitForPageFullyLoaded();
        
        // 获取推荐候选人列表
        const candidateElements = await this.getCandidateElements();
        
        if (candidateElements.length === 0) {
          logger.info('没有找到更多推荐候选人');
          break;
        }
        
        // 处理当前页面的候选人
        for (let i = 0; i < candidateElements.length && processedCount < targetCount && this.browsingStatus.isActive; i++) {
          // 检查服务是否已停止
          if (this.isStopped) {
            logger.info('服务已停止，退出沟通候选人处理循环');
            break;
          }
          
          try {
            const candidateInfo = await this.extractCandidateInfo(candidateElements[i], processedCount + 1);
            
            if (candidateInfo) {
              candidateInfo.source = 'recommended';
              this.browsingStatus.candidates.push(candidateInfo);
              this.browsingStatus.collectedCount++;
              processedCount++;
              this.browsingStatus.processedCount = processedCount;
              
              // 发送进度更新
              if (this.io) {
                this.io.emit('zhilianBrowsingProgress', {
                  processed: processedCount,
                  target: targetCount,
                  collected: this.browsingStatus.collectedCount,
                  failed: this.browsingStatus.failedCount,
                  mode: 'recommended'
                });
              }
              
              // 检查是否达到目标数量
              if (processedCount >= targetCount) {
                logger.info(`推荐候选人已达到目标简历数量 ${targetCount}，自动停止采集`);
                this.browsingStatus.isActive = false;
                break;
              }
            }
            
            // 反爬虫延迟
            await this.randomDelay();
            
          } catch (error) {
            logger.error(`处理第 ${i + 1} 个推荐候选人失败:`, error);
            this.browsingStatus.failedCount++;
          }
        }
        
        // 尝试加载更多推荐
        const hasMore = await this.loadMoreRecommended();
        if (!hasMore) {
          logger.info('没有更多推荐候选人');
          break;
        }
      }
      
      logger.info(`推荐候选人处理完成，共处理 ${processedCount} 个候选人`);
      
    } catch (error) {
      logger.error('处理推荐候选人失败:', error);
      throw error;
    }
  }
  
  /**
   * 处理沟通候选人 - 完整的互动模块简历收集流程
   * @param {number} targetCount - 目标数量
   */
  async processCommunicationCandidates(targetCount) {
    try {
      logger.info(`开始处理沟通候选人，目标数量: ${targetCount}`);
      
      // 第一步：验证导航成功
      const navigationSuccess = await this.validateCommunicationPageNavigation();
      if (!navigationSuccess) {
        logger.warn('导航验证未完全成功，但继续执行流程');
      }
      
      // 第二步：识别主投候选人列表
      const candidateList = await this.getCommunicationCandidateList();
      if (!candidateList) {
        throw new Error('未找到主投候选人列表');
      }
      
      let processedCount = 0;
      
      // 第三步：按配置人数从上往下依次点击候选人卡片
      while (processedCount < targetCount && this.browsingStatus.isActive) {
        // 检查服务是否已停止
        if (this.isStopped) {
          logger.info('服务已停止，退出沟通候选人处理循环');
          break;
        }
        
        // 获取候选人卡片列表
        const candidateCards = await this.getCommunicationCandidateCards();
        
        if (candidateCards.length === 0) {
          logger.info('没有找到更多候选人卡片');
          break;
        }
        
        // 处理当前页面的候选人卡片
        for (let i = 0; i < candidateCards.length && processedCount < targetCount && this.browsingStatus.isActive; i++) {
          // 检查服务是否已停止
          if (this.isStopped) {
            logger.info('服务已停止，退出候选人处理循环');
            break;
          }
          
          try {
            logger.info(`开始处理第 ${processedCount + 1} 个候选人`);
            
            // 点击候选人卡片
            await this.clickCandidateCard(candidateCards[i], i);
            
            // 处理候选人简历收集（对话框会自动出现，无需等待）
            // 确保当前候选人处理完成后再继续下一个
            const resumeResult = await this.processCandidateResume(i + 1);
            
            if (resumeResult && resumeResult.success) {
              processedCount++;
              this.browsingStatus.processedCount = processedCount;
              this.browsingStatus.collectedCount++;
              
              logger.info(`成功收集第 ${processedCount} 个候选人简历`);
            } else {
              this.browsingStatus.failedCount++;
              logger.warn(`第 ${i + 1} 个候选人简历收集失败: ${resumeResult ? resumeResult.error : '未知错误'}`);
            }
            
            // 等待简历处理完全完成后再继续下一个候选人
            await this.page.waitForTimeout(1000);
            
            // 发送进度更新
            if (this.io) {
              this.io.emit('zhilianBrowsingProgress', {
                processed: processedCount,
                target: targetCount,
                collected: this.browsingStatus.collectedCount,
                failed: this.browsingStatus.failedCount,
                mode: 'communication'
              });
            }
            
            // 检查是否达到目标数量
            if (processedCount >= targetCount) {
              logger.info(`已达到目标简历数量 ${targetCount}，自动停止采集`);
              this.browsingStatus.isActive = false;
              break;
            }
            
            // 反爬虫延迟
            await this.randomDelay();
            
          } catch (error) {
            logger.error(`处理第 ${i + 1} 个候选人失败:`, error);
            this.browsingStatus.failedCount++;
          }
        }
        
        // 如果还没达到目标数量，尝试加载更多候选人
        if (processedCount < targetCount) {
          const hasMore = await this.loadMoreCommunication();
          if (!hasMore) {
            logger.info('没有更多候选人');
            break;
          }
        }
      }
      
      logger.info(`沟通候选人处理完成，共处理 ${processedCount} 个候选人`);
      
    } catch (error) {
      logger.error('处理沟通候选人失败:', error);
      throw error;
    }
  }

  /**
   * 验证沟通页面导航成功
   */
  async validateCommunicationPageNavigation() {
    try {
      logger.info('验证沟通页面导航成功...');
      
      // 等待页面加载完成（2秒）
      await this.page.waitForTimeout(2000);
      
      // 首先尝试查找并点击"沟通"按钮
      const communicationButtonSelectors = [
        'a[href*="communication"]',
        'button:has-text("沟通")',
        '[data-testid="communication"]',
        '.communication-btn',
        'a:has-text("沟通")',
        '[title="沟通"]',
        '.nav-item:has-text("沟通")',
        'li:has-text("沟通") a'
      ];
      
      let communicationButtonFound = false;
      
      for (const selector of communicationButtonSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button) {
            const isVisible = await button.isVisible();
            if (isVisible) {
              logger.info(`找到沟通按钮: ${selector}`);
              await button.click();
              logger.info('成功点击沟通按钮');
              communicationButtonFound = true;
              
              // 点击后短暂等待页面响应
              await this.page.waitForTimeout(2000);
              break;
            }
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }
      
      if (communicationButtonFound) {
        logger.info('通过点击沟通按钮成功导航到沟通页面');
        return true;
      }
      
      // 如果没有找到沟通按钮，检查是否已经在沟通页面
      const currentUrl = this.page.url();
      logger.info(`当前页面URL: ${currentUrl}`);
      
      const urlIndicators = ['communication', 'message', 'chat', '互动', 'im'];
      const hasUrlIndicator = urlIndicators.some(indicator => currentUrl.includes(indicator));
      logger.info(`URL指示器检查结果: ${hasUrlIndicator}`);
      
      // 检查页面是否包含沟通相关元素
      const communicationElements = [
        '.im-session-list',
        '.communication-page', 
        '.message-list',
        '.chat-container',
        '.im-container',
        '.session-list',
        '.chat-list'
      ];
      
      let hasValidElement = false;
      let foundElements = [];
      
      for (const selector of communicationElements) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            hasValidElement = true;
            foundElements.push(selector);
            logger.info(`找到沟通页面元素: ${selector}`);
          }
        } catch (e) {
          // 忽略单个选择器的错误
        }
      }
      
      logger.info(`找到的沟通页面元素: ${foundElements.join(', ')}`);
      
      // 如果URL或页面元素表明已在沟通页面，认为导航成功
      if (hasUrlIndicator || hasValidElement) {
        logger.info('已在沟通页面，导航验证成功');
        return true;
      }
      
      // 如果都没找到，记录详细信息但不抛出错误
      logger.warn('未找到沟通按钮且不在沟通页面，但继续执行');
      logger.warn(`当前URL: ${currentUrl}`);
      logger.warn(`URL指示器: ${hasUrlIndicator}`);
      logger.warn(`页面元素: ${hasValidElement}`);
      
      return true;
      
    } catch (error) {
      logger.error('验证沟通页面导航失败:', error);
      logger.warn('导航验证失败，但继续执行流程');
      return true;
    }
  }

  /**
   * 获取主投候选人列表
   */
  async getCommunicationCandidateList() {
    try {
      logger.info('识别主投候选人列表...');
      
      // 等待候选人列表加载
      await this.page.waitForTimeout(2000);
      
      // 查找主投候选人列表容器
      const listSelectors = [
        'div.im-session-list',
        '.candidate-list',
        '.communication-list',
        '.message-session-list',
        '.chat-list'
      ];
      
      for (const selector of listSelectors) {
        const listElement = await this.page.$(selector);
        if (listElement) {
          logger.info(`找到候选人列表: ${selector}`);
          return listElement;
        }
      }
      
      logger.warn('未找到主投候选人列表');
      return null;
      
    } catch (error) {
      logger.error('获取主投候选人列表失败:', error);
      return null;
    }
  }

  /**
   * 获取候选人卡片列表
   */
  async getCommunicationCandidateCards() {
    try {
      logger.info('获取候选人卡片列表...');
      
      // 候选人卡片选择器
      const cardSelectors = [
        'div.im-session-item.km-list__item',
        '.candidate-card',
        '.session-item',
        '.communication-item',
        '.message-item'
      ];
      
      let candidateCards = [];
      
      for (const selector of cardSelectors) {
        candidateCards = await this.page.$$(selector);
        if (candidateCards.length > 0) {
          logger.info(`找到 ${candidateCards.length} 个候选人卡片 (${selector})`);
          break;
        }
      }
      
      return candidateCards;
      
    } catch (error) {
      logger.error('获取候选人卡片列表失败:', error);
      return [];
    }
  }

  /**
   * 点击候选人卡片
   * @param {Object} cardElement - 候选人卡片元素
   * @param {number} index - 卡片索引
   */
  async clickCandidateCard(cardElement, index) {
    try {
      logger.info(`点击第 ${index + 1} 个候选人卡片...`);
      
      // 滚动到卡片位置
      await cardElement.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(500);
      
      // 检查卡片是否可见和可点击
      const isVisible = await cardElement.isVisible();
      const isEnabled = await cardElement.isEnabled();
      
      if (!isVisible || !isEnabled) {
        throw new Error(`候选人卡片不可点击 (visible: ${isVisible}, enabled: ${isEnabled})`);
      }
      
      // 点击卡片
      await cardElement.click();
      
      // 等待点击响应
      await this.page.waitForTimeout(1000);
      
      logger.info(`成功点击第 ${index + 1} 个候选人卡片`);
      
    } catch (error) {
      logger.error(`点击候选人卡片失败:`, error);
      throw error;
    }
  }

  /**
   * 等待对话框出现
   */
  async waitForChatDialog() {
    try {
      logger.info('等待对话框出现...');
      
      // 对话框选择器
      const dialogSelectors = [
        '.chat-dialog',
        '.message-dialog',
        '.communication-dialog',
        '.im-dialog',
        '.conversation-panel'
      ];
      
      let dialogFound = false;
      
      for (const selector of dialogSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          logger.info(`对话框已出现: ${selector}`);
          dialogFound = true;
          break;
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }
      
      if (!dialogFound) {
        logger.warn('未检测到对话框，继续执行后续操作');
      }
      
      // 额外等待确保对话框完全加载
      await this.page.waitForTimeout(1500);
      
    } catch (error) {
      logger.error('等待对话框失败:', error);
      // 不抛出错误，继续执行
    }
  }

  /**
   * 处理单个候选人的简历收集
   * @param {number} index - 候选人索引
   */
  async processCandidateResume(index) {
    try {
      logger.info(`开始处理第 ${index} 个候选人的简历收集...`);
      
      // 检查是否存在附件简历
      const hasAttachment = await this.checkAttachmentResume();
      
      if (hasAttachment) {
        logger.info('发现附件简历，开始处理...');
        await this.downloadAttachmentResume();
        logger.info(`第 ${index} 个候选人简历收集完成`);
        return { success: true, message: '附件简历处理成功' };
      } else {
        logger.info('未发现附件简历，尝试索要简历...');
        
        try {
          // 点击索要简历按钮并处理确认弹窗
          await this.requestAttachmentResume();
          
          // 等待候选人可能的自动回复（增加等待时间以确保自动发送完成）
          logger.info('等待候选人自动发送附件简历...');
          await this.page.waitForTimeout(5000);
          
          // 再次检查是否有附件简历
          const hasNewAttachment = await this.checkAttachmentResume();
          if (hasNewAttachment) {
            logger.info('候选人发送了附件简历，开始处理...');
            await this.downloadAttachmentResume();
            logger.info(`第 ${index} 个候选人简历收集完成`);
            return { success: true, message: '索要简历成功并处理完成' };
          } else {
            logger.info('候选人未发送附件简历，结束当前候选人操作');
            return { success: false, error: '候选人未发送附件简历' };
          }
        } catch (error) {
          logger.error('索要附件简历过程失败:', error);
          return { success: false, error: `索要简历失败: ${error.message}` };
        }
      }
      
    } catch (error) {
      logger.error(`处理第 ${index} 个候选人简历收集失败:`, error);
      return { success: false, error: `简历处理失败: ${error.message}` };
    }
  }

  /**
   * 检查是否存在附件简历
   */
  async checkAttachmentResume() {
    try {
      logger.info('检查是否存在附件简历...');
      
      // 附件简历选择器
      const attachmentSelectors = [
        'div.im-message__bubble-inner.im-attachment-card',
        '.attachment-card',
        '.resume-attachment',
        '.file-attachment',
        '.message-attachment'
      ];
      
      for (const selector of attachmentSelectors) {
        const attachmentElement = await this.page.$(selector);
        if (attachmentElement) {
          logger.info(`找到附件简历: ${selector}`);
          return true;
        }
      }
      
      logger.info('未找到附件简历');
      return false;
      
    } catch (error) {
      logger.error('检查附件简历失败:', error);
      return false;
    }
  }

  /**
   * 下载附件简历 - 基于URL下载方式
   */
  async downloadAttachmentResume() {
    try {
      logger.info('开始处理附件简历...');
      
      // 首先找到附件简历组件
      const attachmentCard = await this.page.$('div.im-message__bubble-inner.im-attachment-card');
      if (!attachmentCard) {
        throw new Error('未找到附件简历组件');
      }
      
      // 在附件简历组件内部查找查看简历按钮
      const viewButtonSelectors = [
        'div.km-ripple',  // 在附件卡片内部的按钮
        '.view-resume-btn',
        '.attachment-view',
        '.resume-view',
        '.file-view',
        'button',  // 任何按钮
        'a'        // 任何链接
      ];
      
      let targetButton = null;
      let targetSelector = null;
      
      // 先找到要点击的按钮，但不立即点击
      for (const selector of viewButtonSelectors) {
        const viewButton = await attachmentCard.$(selector);
        if (viewButton) {
          const isVisible = await viewButton.isVisible();
          if (isVisible) {
            targetButton = viewButton;
            targetSelector = selector;
            logger.info(`找到可点击的查看按钮: ${selector}`);
            break;
          }
        }
      }
      
      // 如果没找到具体按钮，使用整个附件卡片
      if (!targetButton) {
        targetButton = attachmentCard;
        targetSelector = '整个附件卡片';
        logger.info('未找到具体按钮，将点击整个附件卡片');
      }
      
      // 在点击之前就开始监听新页面
      logger.info('开始监听新页面，准备点击按钮...');
      const newPagePromise = this.waitForNewPage();
      
      // 等待一小段时间确保监听器已设置
      await this.page.waitForTimeout(100);
      
      // 现在点击按钮
      logger.info(`点击查看按钮: ${targetSelector}`);
      await targetButton.click();
      
      // 等待新页面检测结果
      logger.info('等待新页面检测结果...');
      const newPage = await newPagePromise;
      
      let result;
      if (newPage) {
        logger.info('成功检测到新页面，开始基于URL下载简历');
        // 使用新的URL下载方式处理简历
        result = await this.downloadResumeFromURL(newPage);
      } else {
        logger.warn('未检测到新页面，尝试在当前页面获取下载链接');
        // 在当前页面尝试获取下载链接
        result = await this.downloadResumeFromCurrentPage();
      }
      
      if (result && result.success) {
        logger.info('附件简历下载处理完成');
        return { success: true };
      } else {
        logger.error('附件简历下载处理失败:', result ? result.error : '未知错误');
        return { success: false, error: result ? result.error : '下载处理失败' };
      }
      
    } catch (error) {
      logger.error('处理附件简历失败:', error);
      throw error;
    }
  }

  /**
   * 基于URL下载简历文件 - 新页面方式
   */
  async downloadResumeFromURL(newPage) {
    try {
      logger.info('开始从新页面获取简历下载URL...');
      
      // 等待页面完全加载
      await newPage.waitForLoadState('domcontentloaded', { timeout: 10000 });
      await newPage.waitForTimeout(2000);
      
      const pageUrl = await newPage.url();
      logger.info(`新页面URL: ${pageUrl}`);
      
      // 检查URL是否为智联招聘附件简历格式
      if (this.isZhilianAttachmentURL(pageUrl)) {
        logger.info('识别为智联招聘附件简历URL，开始下载处理...');
        
        // 直接使用URL进行文件下载和处理
        const downloadResult = await this.processAttachmentURL(pageUrl, newPage);
        
        // 关闭新页面
        await newPage.close();
        
        return downloadResult;
      } else {
        logger.warn('新页面URL不是预期的附件简历格式，尝试在页面中查找下载链接');
        
        // 在页面中查找下载链接
        const downloadLink = await this.findDownloadLinkInPage(newPage);
        
        if (downloadLink) {
          logger.info(`找到下载链接: ${downloadLink}`);
          const downloadResult = await this.processAttachmentURL(downloadLink, newPage);
          await newPage.close();
          return downloadResult;
        } else {
          logger.error('未找到有效的下载链接');
          await newPage.close();
          return { success: false, error: '未找到下载链接' };
        }
      }
      
    } catch (error) {
      logger.error('从新页面下载简历失败:', error);
      try {
        await newPage.close();
      } catch (closeError) {
        logger.error('关闭新页面失败:', closeError);
      }
      return { success: false, error: error.message };
    }
  }

  /**
   * 从当前页面获取下载链接
   */
  async downloadResumeFromCurrentPage() {
    try {
      logger.info('尝试从当前页面获取下载链接...');
      
      // 等待页面稳定
      await this.page.waitForTimeout(2000);
      
      // 在当前页面查找下载链接
      const downloadLink = await this.findDownloadLinkInPage(this.page);
      
      if (downloadLink) {
        logger.info(`在当前页面找到下载链接: ${downloadLink}`);
        return await this.processAttachmentURL(downloadLink, this.page);
      } else {
        logger.error('在当前页面未找到下载链接');
        return { success: false, error: '未找到下载链接' };
      }
      
    } catch (error) {
      logger.error('从当前页面获取下载链接失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 检查URL是否为智联招聘附件简历格式
   */
  isZhilianAttachmentURL(url) {
    const zhilianPatterns = [
      /zhaopin\.com.*\/resume/i,
      /zhaopin\.com.*\/attachment/i,
      /zhaopin\.com.*\/download/i,
      /zhaopin\.com.*\/file/i,
      /resume.*zhaopin/i,
      /attachment.*zhaopin/i
    ];
    
    return zhilianPatterns.some(pattern => pattern.test(url));
  }

  /**
   * 在页面中查找下载链接
   */
  async findDownloadLinkInPage(page) {
    try {
      logger.info('在页面中查找下载链接...');
      
      // 查找下载链接的选择器
      const downloadLinkSelectors = [
        'a[href*="download"]',
        'a[href*="attachment"]',
        'a[href*="resume"]',
        'a[href*="file"]',
        'a[download]',
        '.download-link',
        '.attachment-link',
        '.resume-link'
      ];
      
      for (const selector of downloadLinkSelectors) {
        const linkElement = await page.$(selector);
        if (linkElement) {
          const href = await linkElement.getAttribute('href');
          if (href && (href.startsWith('http') || href.startsWith('//'))) {
            logger.info(`找到下载链接: ${selector} -> ${href}`);
            return href.startsWith('//') ? `https:${href}` : href;
          }
        }
      }
      
      // 如果没找到直接的下载链接，尝试获取当前页面URL作为下载源
      const currentUrl = await page.url();
      if (this.isZhilianAttachmentURL(currentUrl)) {
        logger.info('使用当前页面URL作为下载源');
        return currentUrl;
      }
      
      logger.warn('未找到任何下载链接');
      return null;
      
    } catch (error) {
      logger.error('查找下载链接失败:', error);
      return null;
    }
  }

  /**
   * 处理附件URL - 下载并上传到前端
   */
  async processAttachmentURL(url, page) {
    try {
      logger.info(`开始处理附件URL: ${url}`);
      
      // 使用页面的上下文进行文件下载
      const downloadPath = await this.downloadFileFromURL(url, page);
      
      if (downloadPath) {
        logger.info(`文件下载成功: ${downloadPath}`);
        
        // 通过API直接上传文件到简历库
        try {
          const uploadResult = await this.uploadResumeViaAPI(downloadPath, '智联招聘');
          
          if (uploadResult.success) {
            logger.info('简历文件API上传成功');
            
            // 清理下载的临时文件
            try {
              const fs = require('fs').promises;
              await fs.unlink(downloadPath);
              logger.info(`临时文件已清理: ${downloadPath}`);
            } catch (cleanupError) {
              logger.warn(`清理临时文件失败: ${cleanupError.message}`);
            }
            
            return { success: true, message: '简历文件下载、上传和解析成功', data: uploadResult.data };
          } else {
            logger.error('简历文件API上传失败:', uploadResult.error);
            return { success: false, error: `API上传失败: ${uploadResult.error}` };
          }
        } catch (apiError) {
          logger.error('API上传过程中发生错误:', apiError);
          
          // API调用失败时，回退到UI自动化方式
          logger.info('API上传失败，尝试回退到UI自动化上传...');
          try {
            const uploadResult = await this.uploadFileToFrontend(downloadPath);
            
            if (uploadResult.success) {
              logger.info('UI自动化上传成功');
              return { success: true, message: '简历文件下载并上传成功（通过UI自动化）' };
            } else {
              logger.error('UI自动化上传也失败:', uploadResult.error);
              return { success: false, error: `所有上传方式都失败 - API: ${apiError.message}, UI: ${uploadResult.error}` };
            }
          } catch (uiError) {
            logger.error('UI自动化上传失败:', uiError);
            return { success: false, error: `所有上传方式都失败 - API: ${apiError.message}, UI: ${uiError.message}` };
          }
        }
      } else {
        logger.error('文件下载失败');
        return { success: false, error: '文件下载失败' };
      }
      
    } catch (error) {
      logger.error('处理附件URL失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 从URL下载文件
   */
  /**
   * 从URL下载文件 - 增强版错误处理和重试机制
   */
  async downloadFileFromURL(url, page, maxRetries = 3) {
    const fs = require('fs');
    const path = require('path');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`开始下载文件 (尝试 ${attempt}/${maxRetries}): ${url}`);
        
        // 设置下载路径
        const downloadDir = path.join(process.cwd(), 'downloads');
        logger.info(`下载目录: ${downloadDir}`);
        
        // 确保下载目录存在
        if (!fs.existsSync(downloadDir)) {
          logger.info('创建下载目录...');
          fs.mkdirSync(downloadDir, { recursive: true });
        }
        
        // 生成文件名
        const timestamp = Date.now();
        const fileName = `resume_${timestamp}.pdf`; // 假设是PDF文件
        const filePath = path.join(downloadDir, fileName);
        logger.info(`目标文件路径: ${filePath}`);
        
        // 使用页面上下文下载文件，增加超时设置
        logger.info('开始发送HTTP请求...');
        const response = await page.context().request.get(url, {
          timeout: 30000 // 30秒超时
        });
        
        logger.info(`HTTP响应状态: ${response.status()} ${response.statusText()}`);
        
        if (response.ok()) {
          logger.info('开始获取响应内容...');
          const buffer = await response.body();
          logger.info(`响应内容大小: ${buffer.length} bytes`);
          
          // 验证文件大小
          if (buffer.length === 0) {
            throw new Error('下载的文件为空');
          }
          
          logger.info('开始写入文件...');
          fs.writeFileSync(filePath, buffer);
          logger.info('文件写入完成');
          
          // 验证文件是否成功写入
          if (!fs.existsSync(filePath)) {
            throw new Error('文件写入失败 - 文件不存在');
          }
          
          const fileStats = fs.statSync(filePath);
          const fileSize = fileStats.size;
          logger.info(`文件下载完成: ${filePath} (大小: ${fileSize} bytes)`);
          
          // 额外验证：检查文件是否可读
          try {
            fs.accessSync(filePath, fs.constants.R_OK);
            logger.info('文件可读性验证通过');
          } catch (accessError) {
            logger.error('文件可读性验证失败:', accessError.message);
            throw new Error(`文件不可读: ${accessError.message}`);
          }
          
          return filePath;
        } else {
          throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
        }
        
      } catch (error) {
        logger.error(`下载文件失败 (尝试 ${attempt}/${maxRetries}):`, error.message);
        logger.error('错误详情:', error.stack);
        
        if (attempt === maxRetries) {
          logger.error('所有下载尝试均失败');
          return null;
        }
        
        // 等待后重试
        const retryDelay = attempt * 2000; // 递增延迟
        logger.info(`等待 ${retryDelay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    return null;
  }

  /**
   * 上传文件到前端应用 - 增强版错误处理和重试机制
   */
  async uploadFileToFrontend(filePath, maxRetries = 3) {
    const fs = require('fs');
    let frontendPage = null;
    
    // 验证文件是否存在
    if (!fs.existsSync(filePath)) {
      logger.error(`文件不存在: ${filePath}`);
      return { success: false, error: '文件不存在' };
    }
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`开始上传文件到前端 (尝试 ${attempt}/${maxRetries}): ${filePath}`);
        
        // 打开新标签页到前端应用
        frontendPage = await this.browser.newPage();
        await frontendPage.goto('http://localhost:3000', {
          waitUntil: 'domcontentloaded',
          timeout: 30000
        });
        
        // 导航到简历列表页面
        await this.navigateToResumeList(frontendPage);
        
        // 点击上传简历按钮
        await this.clickUploadResumeButton(frontendPage);
        
        // 等待弹窗打开并切换到文件上传Tab
        await frontendPage.waitForTimeout(2000);
        await this.switchToFileUploadTab(frontendPage);
        
        // 等待文件上传区域出现
        logger.info('等待文件上传区域出现...');
        
        // 尝试多种方式找到文件上传区域
        const uploadSelectors = [
          // 根据用户提供的HTML结构，优先匹配这些选择器
          'span.ant-upload.ant-upload-btn[tabindex="0"][role="button"] input[type="file"]',
          'span.ant-upload.ant-upload-btn input[name="file"][type="file"]',
          'span.ant-upload.ant-upload-btn input[accept=".pdf,.doc,.docx"]',
          '.ant-upload-drag-container input[type="file"]',
          // 原有的选择器作为备选
          'span.ant-upload.ant-upload-btn input[type="file"]',
          'span[role="button"].ant-upload input[type="file"]',
          'input[type="file"][accept*=".pdf"]',
          'input[type="file"]'
        ];
        
        let fileInput = null;
        for (const selector of uploadSelectors) {
          try {
            await frontendPage.waitForSelector(selector, { timeout: 5000 });
            fileInput = await frontendPage.$(selector);
            if (fileInput) {
              logger.info(`找到文件上传输入框: ${selector}`);
              break;
            }
          } catch (e) {
            logger.debug(`选择器 ${selector} 未找到文件输入框`);
            continue;
          }
        }
        
        if (!fileInput) {
          // 如果找不到input元素，尝试点击span容器来触发文件选择
          logger.info('未找到input元素，尝试点击上传容器...');
          const containerSelectors = [
            'span.ant-upload.ant-upload-btn[tabindex="0"][role="button"]',
            'span.ant-upload.ant-upload-btn',
            '.ant-upload-drag-container',
            '.ant-upload'
          ];
          
          let uploadContainer = null;
          for (const selector of containerSelectors) {
            try {
              await frontendPage.waitForSelector(selector, { timeout: 3000 });
              uploadContainer = await frontendPage.$(selector);
              if (uploadContainer) {
                logger.info(`找到上传容器: ${selector}`);
                // 点击容器来触发文件选择对话框
                await uploadContainer.click();
                await frontendPage.waitForTimeout(1000);
                
                // 再次尝试查找input元素
                for (const inputSelector of uploadSelectors) {
                  try {
                    fileInput = await frontendPage.$(inputSelector);
                    if (fileInput) {
                      logger.info(`点击后找到文件输入框: ${inputSelector}`);
                      break;
                    }
                  } catch (e) {
                    continue;
                  }
                }
                if (fileInput) break;
              }
            } catch (e) {
              continue;
            }
          }
          
          if (!fileInput) {
            throw new Error('未找到文件上传输入框，已尝试点击容器');
          }
        }
        
        // 上传文件
        logger.info(`开始上传文件: ${filePath}`);
        await fileInput.setInputFiles(filePath);
        logger.info('文件已选择，等待上传处理...');
        await frontendPage.waitForTimeout(3000); // 增加等待时间
        
        // 等待文件上传完成和确认添加按钮出现
        const confirmResult = await this.waitAndConfirmAdd(frontendPage);
        if (!confirmResult) {
          throw new Error('确认添加操作失败');
        }
        
        // 关闭前端页面
        await frontendPage.close();
        frontendPage = null;
        
        // 清理下载的文件
        try {
          fs.unlinkSync(filePath);
          logger.info('临时文件已清理');
        } catch (cleanupError) {
          logger.warn('清理临时文件失败:', cleanupError);
        }
        
        logger.info('文件上传到前端完成');
        return { success: true };
        
      } catch (error) {
        logger.error(`上传文件到前端失败 (尝试 ${attempt}/${maxRetries}):`, error.message);
        
        // 确保页面被关闭
        if (frontendPage) {
          try {
            await frontendPage.close();
          } catch (closeError) {
            logger.warn('关闭前端页面失败:', closeError);
          }
          frontendPage = null;
        }
        
        if (attempt === maxRetries) {
          logger.error('所有上传尝试均失败');
          // 清理临时文件
          try {
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              logger.info('临时文件已清理');
            }
          } catch (cleanupError) {
            logger.warn('清理临时文件失败:', cleanupError);
          }
          return { success: false, error: error.message };
        }
        
        // 等待后重试
        const retryDelay = attempt * 3000; // 递增延迟
        logger.info(`等待 ${retryDelay}ms 后重试...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    return { success: false, error: '未知错误' };
  }

  /**
   * 等待新页面打开 - 增强版检测机制
   */
  async waitForNewPage() {
    try {
      logger.info('开始检测新页面打开...');
      
      // 记录当前页面数量
      const initialPages = this.browser.contexts()[0].pages();
      const initialPageCount = initialPages.length;
      logger.info(`当前页面数量: ${initialPageCount}`);
      
      // 设置多重检测机制
      const detectionPromise = new Promise((resolve) => {
        const timeout = setTimeout(() => {
          logger.warn('新页面检测超时，返回null');
          resolve(null);
        }, 15000); // 增加到15秒超时
        
        let resolved = false;
        
        // 方法1: 监听targetcreated事件
        const targetHandler = async (target) => {
          if (resolved) return;
          if (target.type() === 'page') {
            logger.info('通过targetcreated事件检测到新页面');
            clearTimeout(timeout);
            resolved = true;
            try {
              const newPage = await target.page();
              resolve(newPage);
            } catch (error) {
              logger.error('获取新页面失败:', error);
              resolve(null);
            }
          }
        };
        
        this.browser.on('targetcreated', targetHandler);
        
        // 方法2: 轮询检测页面数量变化
        const pollInterval = setInterval(async () => {
          if (resolved) {
            clearInterval(pollInterval);
            return;
          }
          
          try {
            const currentPages = this.browser.contexts()[0].pages();
            const currentPageCount = currentPages.length;
            
            if (currentPageCount > initialPageCount) {
              logger.info(`通过轮询检测到新页面 (${initialPageCount} -> ${currentPageCount})`);
              clearTimeout(timeout);
              clearInterval(pollInterval);
              resolved = true;
              
              // 获取最新的页面
              const newPage = currentPages[currentPages.length - 1];
              resolve(newPage);
            }
          } catch (error) {
            logger.error('轮询检测页面失败:', error);
          }
        }, 500); // 每500ms检测一次
        
        // 清理函数
        const cleanup = () => {
          this.browser.off('targetcreated', targetHandler);
          clearInterval(pollInterval);
          clearTimeout(timeout);
        };
        
        // 确保清理资源
        setTimeout(cleanup, 15000);
      });
      
      const newPage = await detectionPromise;
      
      if (newPage) {
        try {
          // 等待新页面加载完成
          await newPage.waitForLoadState('domcontentloaded', { timeout: 10000 });
          await newPage.waitForTimeout(1000); // 额外等待确保页面稳定
          
          const newPageUrl = await newPage.url();
          logger.info(`新页面已打开并加载完成: ${newPageUrl}`);
          return newPage;
        } catch (loadError) {
          logger.error('新页面加载失败:', loadError);
          return newPage; // 即使加载失败也返回页面对象
        }
      }
      
      logger.warn('未检测到新页面打开');
      return null;
      
    } catch (error) {
      logger.error('等待新页面失败:', error);
      return null;
    }
  }

  /**
   * 在新页面中处理简历
   */
  async processResumeInNewPage(newPage) {
    try {
      logger.info('在新页面中处理简历...');
      
      // 通过URL下载简历内容
      logger.info('开始通过URL下载简历内容...');
      const resumeContent = await this.downloadResumeFromURL(newPage);
      
      if (!resumeContent) {
        logger.error('未能获取到简历内容');
        return { success: false, error: '获取简历内容失败' };
      }
      
      // 关闭新页面
      try {
        await newPage.close();
        logger.info('新页面已关闭');
      } catch (closeError) {
        logger.warn('关闭新页面时出错:', closeError.message);
      }
      
      // 上传简历内容到前端应用进行解析
      logger.info('开始上传简历内容到前端应用...');
      const uploadResult = await this.uploadResumeToApp(resumeContent);
      
      if (uploadResult) {
        logger.info('简历上传和解析成功');
        return { success: true };
      } else {
        logger.error('简历上传到前端应用失败');
        return { success: false, error: '简历上传失败' };
      }
      
    } catch (error) {
      logger.error('在新页面处理简历失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 在当前页面处理简历（兜底逻辑）
   */
  async processResumeInCurrentPage() {
    try {
      logger.info('在当前页面处理简历...');
      
      // 等待页面跳转或内容加载
      await this.page.waitForTimeout(3000);
      
      // 通过URL下载简历内容
      logger.info('开始通过URL下载简历内容...');
      const resumeContent = await this.downloadResumeFromCurrentPage();
      
      if (!resumeContent) {
        logger.error('未能获取到简历内容');
        return { success: false, error: '获取简历内容失败' };
      }
      
      // 上传简历内容到前端应用进行解析
      logger.info('开始上传简历内容到前端应用...');
      const uploadResult = await this.uploadResumeToApp(resumeContent);
      
      if (uploadResult) {
        logger.info('简历上传和解析成功');
        return { success: true };
      } else {
        logger.error('简历上传到前端应用失败');
        return { success: false, error: '简历上传失败' };
      }
      
    } catch (error) {
      logger.error('在当前页面处理简历失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 上传简历内容到前端应用进行解析（参考Boss直聘实现）
   */
  async uploadResumeToApp(resumeContent) {
    try {
      logger.info('开始上传简历内容到前端应用进行解析...');
      
      // 检查浏览器连接状态
      if (!this.browser || !this.browser.isConnected()) {
        logger.error('浏览器连接已断开，无法打开前端应用');
        return false;
      }
      
      // 创建新页面访问前端应用
      const frontendPage = await this.browser.newPage();
      
      try {
        logger.info('正在访问前端应用...');
        await frontendPage.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
        await frontendPage.waitForLoadState('domcontentloaded', { timeout: 10000 });
        logger.info('前端应用加载完成');
        
        // 导航到简历列表页面
        logger.info('正在导航到简历列表页面...');
        await this.navigateToResumeList(frontendPage);
        logger.info('简历列表页面导航完成');
        
        // 点击上传简历按钮
        logger.info('正在点击上传简历按钮...');
        await this.clickUploadResumeButton(frontendPage);
        logger.info('上传简历按钮点击完成');
        
        // 选择文本粘贴选项
        logger.info('正在选择文本粘贴选项...');
        const textPasteOption = await frontendPage.$('button:has-text("文本粘贴"), .text-paste-option, [data-option="text"]');
        if (textPasteOption) {
          await textPasteOption.click();
          await frontendPage.waitForTimeout(1000);
          logger.info('文本粘贴选项已选择');
        }
        
        // 在简历文本区域粘贴内容
        logger.info('正在粘贴简历内容...');
        await this.pasteResumeContent(frontendPage, resumeContent);
        logger.info('简历内容粘贴完成');
        
        // 选择简历来源为智联招聘
        logger.info('正在选择简历来源...');
        const sourceSelect = await frontendPage.$('select[name*="source"], .source-select');
        if (sourceSelect) {
          await sourceSelect.selectOption({ label: '智联招聘' });
          logger.info('简历来源已设置为智联招聘');
        }
        
        // 点击解析文本按钮
        logger.info('正在点击解析文本按钮...');
        await this.clickParseResumeButton(frontendPage);
        logger.info('解析文本按钮点击完成');
        
        // 等待解析完成并确认添加
        logger.info('正在等待解析完成并确认添加...');
        const addConfirmed = await this.clickConfirmWithRetry(frontendPage);
        
        if (addConfirmed) {
          logger.info('简历已成功添加到系统');
          return true;
        } else {
          logger.warn('简历添加失败');
          return false;
        }
        
      } catch (error) {
        logger.error('前端应用处理过程中发生错误:', error);
        return false;
      } finally {
        // 关闭前端页面
        try {
          logger.info('正在关闭前端页面...');
          await frontendPage.close();
          logger.info('前端页面已关闭');
        } catch (closeError) {
          logger.warn('关闭前端页面时出错:', closeError.message);
        }
      }
      
    } catch (error) {
      logger.error('上传简历到前端应用失败:', error);
      return false;
    }
  }
  
  /**
   * 持续检测并点击确认添加按钮（参考Boss直聘实现）
   */
  async clickConfirmWithRetry(frontendPage) {
    try {
      logger.info('开始持续检测确认添加按钮...');
      
      // 等待解析开始
      await frontendPage.waitForTimeout(2000);
      
      // 确认添加按钮选择器
      const confirmButtonSelectors = [
        'button:has-text("确认添加")',
        'button:has-text("确认")',
        'button:has-text("添加")',
        'button:has-text("保存")',
        '.confirm-btn',
        '.add-btn',
        '.save-btn',
        'button[class*="confirm"]',
        'button[class*="save"]'
      ];
      
      // 持续监控确认添加按钮
      let attempt = 0;
      const maxAttempts = 120; // 最多等待60秒（每次500ms）
      
      while (attempt < maxAttempts) {
        // 检查服务是否已停止
        if (this.isStopped) {
          logger.info('服务已停止，终止等待确认添加');
          return false;
        }
        
        attempt++;
        
        // 检查所有可能的确认按钮选择器
        for (const selector of confirmButtonSelectors) {
          try {
            const confirmButton = await frontendPage.$(selector);
            if (confirmButton) {
              const isVisible = await confirmButton.isVisible();
              const isEnabled = await confirmButton.isEnabled();
              
              if (isVisible && isEnabled) {
                logger.info(`找到激活状态的确认按钮: ${selector}，立即点击`);
                
                // 立即点击确认按钮
                await confirmButton.click();
                logger.info('确认添加按钮点击成功');
                
                // 点击成功后等待2秒钟
                await frontendPage.waitForTimeout(2000);
                
                // 调度页面切换（如果需要）
                try {
                  const backButton = await frontendPage.$('button:has-text("返回"), .back-btn, [data-action="back"]');
                  if (backButton) {
                    await backButton.click();
                    logger.info('已点击返回按钮');
                  }
                } catch (e) {
                  // 忽略返回按钮点击失败
                }
                
                logger.info('简历添加完成');
                return true;
              }
            }
          } catch (e) {
            // 继续检查其他选择器
          }
        }
        
        // 检查页面是否有错误信息
        try {
          const errorElements = await frontendPage.$$('.error, .alert-danger, [class*="error"]');
          if (errorElements.length > 0) {
            const errorText = await errorElements[0].textContent();
            logger.warn(`页面显示错误信息: ${errorText}`);
            return false;
          }
        } catch (e) {
          // 忽略错误检查失败
        }
        
        // 每次检查间隔500毫秒
        await frontendPage.waitForTimeout(500);
        
        // 每20次检查输出一次状态日志
        if (attempt % 20 === 0) {
          logger.info(`已持续监控 ${attempt} 次，继续等待确认按钮激活...`);
        }
      }
      
      logger.warn('等待确认添加按钮超时');
      return false;
      
    } catch (error) {
      logger.error('点击确认添加失败:', error);
      return false;
    }
  }
  
  /**
   * 检查页面是否有下载按钮
   */
  async checkDownloadButton(page) {
    try {
      const downloadButtonSelectors = [
        'button:has-text("下载")',
        'a:has-text("下载")',
        '.download-btn',
        '.btn-download',
        '[data-action="download"]',
        'button[title*="下载"]',
        'a[href*="download"]',
        '[class*="download"]',
        '[id*="download"]'
      ];
      
      for (const selector of downloadButtonSelectors) {
        const downloadButton = await page.$(selector);
        if (downloadButton) {
          const isVisible = await downloadButton.isVisible();
          if (isVisible) {
            logger.info(`找到下载按钮: ${selector}`);
            return true;
          }
        }
      }
      
      return false;
      
    } catch (error) {
      logger.error('检查下载按钮失败:', error);
      return false;
    }
  }
  
  /**
   * 获取简历内容（从当前页面提取文本）
   */
  /**
   * 获取简历内容 - 使用全选复制方式
   * @param {Page} page - Playwright页面对象
   * @returns {string|null} 简历内容
   */


  /**
   * 下载简历文件方式
   */
  async downloadResumeFile(page) {
    try {
      logger.info('开始下载简历文件...');
      
      // 查找并点击下载按钮
      const downloadButtonSelectors = [
        'button:has-text("下载")',
        'a:has-text("下载")',
        '.download-btn',
        '.btn-download',
        '[data-action="download"]',
        'button[title*="下载"]',
        'a[href*="download"]'
      ];
      
      let downloadButtonClicked = false;
      
      for (const selector of downloadButtonSelectors) {
        const downloadButton = await page.$(selector);
        if (downloadButton) {
          const isVisible = await downloadButton.isVisible();
          if (isVisible) {
            logger.info(`点击下载按钮: ${selector}`);
            await downloadButton.click();
            downloadButtonClicked = true;
            break;
          }
        }
      }
      
      if (!downloadButtonClicked) {
        throw new Error('未找到可点击的下载按钮');
      }
      
      // 等待下载完成
      await page.waitForTimeout(3000);
      
      // 获取最新下载的文件路径
      const downloadPath = await this.getLatestDownloadedFile();
      
      if (downloadPath) {
        // 通过API直接上传文件到简历库
        try {
          const uploadResult = await this.uploadResumeViaAPI(downloadPath, '智联招聘');
          
          if (uploadResult.success) {
            logger.info('简历文件API上传成功');
            
            // 清理下载的临时文件
            try {
              const fs = require('fs').promises;
              await fs.unlink(downloadPath);
              logger.info(`临时文件已清理: ${downloadPath}`);
            } catch (cleanupError) {
              logger.warn(`清理临时文件失败: ${cleanupError.message}`);
            }
          } else {
            logger.error('简历文件API上传失败，尝试UI自动化上传');
            await this.uploadResumeToFrontend();
          }
        } catch (apiError) {
          logger.error('API上传失败，回退到UI自动化上传:', apiError);
          await this.uploadResumeToFrontend();
        }
      } else {
        logger.warn('未找到下载的文件，使用UI自动化上传');
        await this.uploadResumeToFrontend();
      }
      
    } catch (error) {
      logger.error('下载简历文件失败:', error);
      throw error;
    }
  }

  /**
   * 复制简历内容方式
   */


  /**
   * 上传简历文件到前端应用
   */
  async uploadResumeToFrontend() {
    try {
      logger.info('打开前端应用上传简历文件...');
      
      // 打开新标签页到前端应用
      const frontendPage = await this.browser.newPage();
      await frontendPage.goto('http://localhost:3000');
      await frontendPage.waitForLoadState('domcontentloaded', { timeout: 10000 });
      
      // 导航到简历列表页面
      await this.navigateToResumeList(frontendPage);
      
      // 点击上传简历按钮
      await this.clickUploadResumeButton(frontendPage);
      
      // 等待文件上传完成和确认添加按钮出现
      await this.waitAndConfirmAdd(frontendPage);
      
      // 关闭前端页面
      await frontendPage.close();
      
      logger.info('简历文件上传完成');
      
    } catch (error) {
      logger.error('上传简历文件到前端失败:', error);
      throw error;
    }
  }

  /**
   * 粘贴简历内容到前端应用
   */


  /**
   * 向候选人索要附件简历
   */
  async requestAttachmentResume() {
    try {
      logger.info('向候选人索要附件简历...');
      
      // 索要简历按钮选择器
      const requestButtonSelectors = [
        'div.newest-attach-resume',
        '.request-resume-btn',
        '.ask-resume',
        '.request-attachment',
        '[data-action="request-resume"]'
      ];
      
      let requestButtonClicked = false;
      
      for (const selector of requestButtonSelectors) {
        const requestButton = await this.page.$(selector);
        if (requestButton) {
          logger.info(`点击索要简历按钮: ${selector}`);
          await requestButton.click();
          requestButtonClicked = true;
          break;
        }
      }
      
      if (!requestButtonClicked) {
        throw new Error('未找到索要简历按钮');
      }
      
      // 等待弹窗出现并识别弹窗组件
      logger.info('等待弹窗出现...');
      await this.page.waitForTimeout(2000);
      
      // 先识别弹窗组件
      const modalSelectors = [
        'div.km-modal.km-modal--open.km-modal--v-centered.km-modal--message-box.km-modal--normal',
        'div.km-modal.km-modal--open',
        '.km-modal--message-box',
        '.modal-dialog',
        '.ant-modal',
        '[role="dialog"]'
      ];
      
      let modalElement = null;
      
      for (const selector of modalSelectors) {
        try {
          modalElement = await this.page.$(selector);
          if (modalElement) {
            logger.info(`找到弹窗组件: ${selector}`);
            break;
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }
      
      if (!modalElement) {
        logger.warn('未找到弹窗组件，尝试直接查找确认按钮');
      }
      
      // 在弹窗内部查找确认按钮
      let confirmButtonClicked = false;
      
      if (modalElement) {
        // 在弹窗内部查找确认按钮 - 优先查找包含"要附件简历"文本的按钮
        logger.info('在弹窗内部查找确认按钮...');
        
        // 首先尝试查找包含"要附件简历"文本的按钮
        try {
          const textBasedButton = await modalElement.$('text="要附件简历"');
          if (textBasedButton) {
            logger.info('在弹窗内找到包含"要附件简历"文本的按钮');
            await textBasedButton.click();
            confirmButtonClicked = true;
          }
        } catch (e) {
          logger.debug('未找到包含"要附件简历"文本的按钮，尝试其他选择器');
        }
        
        // 如果没有找到文本按钮，尝试其他选择器
        if (!confirmButtonClicked) {
          const otherConfirmSelectors = [
            'button:has-text("要附件简历")',
            '[data-text="要附件简历"]',
            'div.km-ripple', // 保留原有选择器作为兜底
            '.confirm-btn',
            '.modal-confirm',
            'button:has-text("确定")',
            'button:has-text("确认")',
            '.btn-confirm',
            '.ant-btn-primary'
          ];
          
          for (const selector of otherConfirmSelectors) {
            try {
              const confirmButton = await modalElement.$(selector);
              if (confirmButton) {
                logger.info(`在弹窗内找到确认按钮: ${selector}`);
                await confirmButton.click();
                confirmButtonClicked = true;
                break;
              }
            } catch (e) {
              // 继续尝试下一个选择器
            }
          }
        }
      } else {
        // 如果没有找到弹窗，尝试在整个页面查找确认按钮（兜底逻辑）
        logger.info('在整个页面查找确认按钮...');
        
        const confirmButtonSelectors = [
          'text="要附件简历"',
          'button:has-text("要附件简历")',
          '[data-text="要附件简历"]',
          'div.km-ripple', // 保留原有选择器作为兜底
          '.confirm-btn',
          '.modal-confirm',
          'button:has-text("确定")',
          'button:has-text("确认")',
          '.btn-confirm'
        ];
        
        for (const selector of confirmButtonSelectors) {
          try {
            const confirmButton = await this.page.$(selector);
            if (confirmButton) {
              logger.info(`在页面中找到确认按钮: ${selector}`);
              await confirmButton.click();
              confirmButtonClicked = true;
              break;
            }
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }
      }
      
      if (!confirmButtonClicked) {
        logger.warn('未找到确认按钮，可能请求已自动发送');
      }
      
      // 等待请求发送
      await this.page.waitForTimeout(1000);
      
      logger.info('简历索要请求已发送');
      
    } catch (error) {
      logger.error('索要附件简历失败:', error);
      throw error;
    }
  }

  /**
   * 处理收藏候选人
   * @param {number} targetCount - 目标数量
   */
  async processFavoriteCandidates(targetCount) {
    try {
      logger.info(`开始处理收藏候选人，目标数量: ${targetCount}`);
      
      let processedCount = 0;
      
      while (processedCount < targetCount && this.browsingStatus.isActive) {
        // 检查服务是否已停止
        if (this.isStopped) {
          logger.info('服务已停止，退出收藏候选人处理循环');
          break;
        }
        
        // 等待页面加载完成
        await this.waitForPageFullyLoaded();
        
        // 获取收藏候选人列表
        const candidateElements = await this.getCandidateElements();
        
        if (candidateElements.length === 0) {
          logger.info('没有找到更多收藏候选人');
          break;
        }
        
        // 处理当前页面的候选人
        for (let i = 0; i < candidateElements.length && processedCount < targetCount && this.browsingStatus.isActive; i++) {
          try {
            const candidateInfo = await this.extractCandidateInfo(candidateElements[i], processedCount + 1);
            
            if (candidateInfo) {
              candidateInfo.source = 'favorites';
              this.browsingStatus.candidates.push(candidateInfo);
              this.browsingStatus.collectedCount++;
              processedCount++;
              this.browsingStatus.processedCount = processedCount;
              
              // 发送进度更新
              if (this.io) {
                this.io.emit('zhilianBrowsingProgress', {
                  processed: processedCount,
                  target: targetCount,
                  collected: this.browsingStatus.collectedCount,
                  failed: this.browsingStatus.failedCount,
                  mode: 'favorites'
                });
              }
              
              // 检查是否达到目标数量
              if (processedCount >= targetCount) {
                logger.info(`收藏候选人已达到目标简历数量 ${targetCount}，自动停止采集`);
                this.browsingStatus.isActive = false;
                break;
              }
            }
            
            // 反爬虫延迟
            await this.randomDelay();
            
          } catch (error) {
            logger.error(`处理第 ${i + 1} 个收藏候选人失败:`, error);
            this.browsingStatus.failedCount++;
          }
        }
        
        // 尝试加载更多收藏
        const hasMore = await this.loadMoreFavorites();
        if (!hasMore) {
          logger.info('没有更多收藏候选人');
          break;
        }
      }
      
      logger.info(`收藏候选人处理完成，共处理 ${processedCount} 个候选人`);
      
    } catch (error) {
      logger.error('处理收藏候选人失败:', error);
      throw error;
    }
  }
  
  /**
   * 加载更多推荐
   */
  async loadMoreRecommended() {
    try {
      const loadMoreButtons = [
        '.load-more',
        '.btn-load-more',
        'text="加载更多"',
        'text="查看更多"',
        '.more-btn'
      ];
      
      for (const selector of loadMoreButtons) {
        try {
          const button = await this.page.$(selector);
          if (button && await button.isVisible()) {
            await button.click();
            await this.waitForPageFullyLoaded();
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      
      // 尝试滚动加载
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await this.page.waitForTimeout(2000);
      
      return false;
      
    } catch (error) {
      logger.warn('加载更多推荐失败:', error.message);
      return false;
    }
  }
  
  /**
   * 加载更多沟通记录
   */
  async loadMoreCommunication() {
    try {
      const loadMoreButtons = [
        '.load-more',
        '.btn-load-more',
        'text="加载更多"',
        'text="查看更多"',
        '.more-btn'
      ];
      
      for (const selector of loadMoreButtons) {
        try {
          const button = await this.page.$(selector);
          if (button && await button.isVisible()) {
            await button.click();
            await this.waitForPageFullyLoaded();
            return true;
          }
        } catch (e) {
          continue;
        }
      }
      
      // 尝试滚动加载
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await this.page.waitForTimeout(2000);
      
      return false;
      
    } catch (error) {
      logger.warn('加载更多沟通记录失败:', error.message);
      return false;
    }
  }

  /**
   * 加载更多收藏候选人
   * @returns {boolean} 是否成功加载更多
   */
  async loadMoreFavorites() {
    try {
      // 尝试点击加载更多按钮
      const loadMoreSelectors = [
        '.load-more',
        '.more-btn',
        '.next-page',
        'button[class*="more"]',
        'a[class*="more"]',
        '.pagination .next'
      ];
      
      for (const selector of loadMoreSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button) {
            const isVisible = await button.isVisible();
            const isEnabled = await button.isEnabled();
            
            if (isVisible && isEnabled) {
              await button.click();
              await this.waitForPageFullyLoaded();
              logger.info('成功加载更多收藏候选人');
              return true;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      // 尝试滚动到底部触发自动加载
      await this.page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      
      await this.page.waitForTimeout(2000);
      
      return false;
    } catch (error) {
      logger.error('加载更多收藏候选人失败:', error);
      return false;
    }
  }

  /**
   * 随机延迟（反爬虫策略）
   */
  async randomDelay() {
    const delay = Math.random() * (this.antiDetectionConfig.maxDelay - this.antiDetectionConfig.minDelay) + this.antiDetectionConfig.minDelay;
    await this.page.waitForTimeout(delay);
  }
  
  /**
   * 自定义随机延迟
   * @param {number} min - 最小延迟时间（毫秒）
   * @param {number} max - 最大延迟时间（毫秒）
   */
  async randomDelayCustom(min = 1000, max = 3000) {
    const delay = Math.random() * (max - min) + min;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * 模拟人类行为 - 随机鼠标移动和滚动（从Boss直聘复用）
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
   * 智能随机延迟 - 根据操作类型调整延迟时间
   * @param {string} operationType - 操作类型：'click', 'scroll', 'input', 'navigation'
   */
  async smartRandomDelay(operationType = 'default') {
    let min, max;
    
    switch (operationType) {
      case 'click':
        min = 800;
        max = 2000;
        break;
      case 'scroll':
        min = 500;
        max = 1500;
        break;
      case 'input':
        min = 300;
        max = 800;
        break;
      case 'navigation':
        min = 2000;
        max = 4000;
        break;
      default:
        min = this.antiDetectionConfig.minDelay;
        max = this.antiDetectionConfig.maxDelay;
    }
    
    const delay = Math.random() * (max - min) + min;
    await this.page.waitForTimeout(delay);
    
    // 30%的概率执行人类行为模拟
    if (Math.random() < 0.3) {
      await this.simulateHumanBehavior();
    }
  }
  
  /**
   * 关闭浏览器
   */
  async closeBrowser() {
    try {
      logger.info('正在关闭智联招聘浏览器...');
      
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      this.isLoggedIn = false;
      this.currentStatus = 'idle';
      this.browsingStatus.isActive = false;
      this.resumeProcessingStatus.isActive = false;
      
      logger.info('智联招聘浏览器已关闭');
      
    } catch (error) {
      logger.error('关闭浏览器失败:', error);
      throw error;
    }
  }

  /**
   * 连接错误恢复机制
   * 检测到连接断开或严重错误时，重置浏览器状态并重新初始化
   */
  /**
   * 从连接错误中恢复
   * 优化了恢复策略，减少过于激进的重置
   */
  async recoverFromConnectionError() {
    try {
      // 检查服务是否已停止，如果已停止则不执行恢复
      if (this.isStopped) {
        logger.info('服务已停止，跳过浏览器恢复机制');
        return false;
      }
      
      logger.warn('检测到智联招聘连接错误，开始执行恢复机制...');
      
      // 首先尝试轻量级恢复：检查浏览器和页面是否仍然可用
      if (this.browser && this.browser.isConnected() && this.page && !this.page.isClosed()) {
        logger.info('尝试轻量级恢复：检查页面响应性...');
        try {
          // 测试页面是否响应
          await this.page.evaluate(() => document.readyState);
          const currentUrl = this.page.url();
          logger.info(`页面仍然响应，当前URL: ${currentUrl}`);
          
          // 如果页面响应且在正确域名，可能不需要完全重置
          if (currentUrl.includes('zhaopin.com')) {
            logger.info('页面状态良好，跳过完全重置');
            return true;
          }
        } catch (testError) {
          logger.warn('页面响应性测试失败，继续完全恢复:', testError.message);
        }
      }
      
      // 执行完全恢复
      logger.info('执行完全浏览器恢复...');
      
      // 关闭现有浏览器
      await this.closeBrowser();
      
      // 重置基本状态，但保留重要的业务数据
      this.currentStatus = 'recovering';
      this.isLoggedIn = false;
      this.page = null;
      this.browser = null;
      
      // 保存当前浏览状态的备份
      const browsingBackup = {
        candidates: [...(this.browsingStatus.candidates || [])],
        processedCount: this.browsingStatus.processedCount,
        collectedCount: this.browsingStatus.collectedCount,
        mode: this.browsingStatus.mode
      };
      
      // 重置浏览状态，但保留已收集的候选人数据
      this.browsingStatus.isActive = false;
      // 不清空candidates，保留已收集的数据
      
      // 重置简历处理状态，但保留已处理的简历
      this.resumeProcessingStatus.isActive = false;
      // 不清空resumes，保留已处理的数据
      
      // 等待较短时间后重新初始化（从8秒减少到5秒）
      logger.info('等待5秒后重新初始化智联招聘浏览器...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // 重新初始化浏览器
      await this.initializeBrowser();
      
      // 重新打开智联招聘网站
      await this.openZhilianWebsite();
      
      // 检查登录状态
      await this.checkLoginStatus();
      
      // 智能导航恢复
      if (this.lastCandidateListUrl && this.lastCandidateListUrl.includes('zhaopin.com')) {
        logger.info('尝试返回到上次的候选人列表页面...');
        try {
          await this.page.goto(this.lastCandidateListUrl, { 
            waitUntil: 'domcontentloaded', // 使用更宽松的等待条件
            timeout: 45000 
          });
          await this.waitForPageFullyLoaded();
        } catch (navError) {
          logger.warn('无法返回到上次页面，重新导航到搜索页面:', navError.message);
          try {
            await this.navigateToResumeSearch();
          } catch (searchNavError) {
            logger.error('导航到搜索页面也失败:', searchNavError.message);
            // 即使导航失败，也不抛出错误，允许后续操作继续
          }
        }
      } else {
        try {
          await this.navigateToResumeSearch();
        } catch (searchNavError) {
          logger.warn('导航到搜索页面失败，但恢复过程继续:', searchNavError.message);
        }
      }
      
      // 恢复浏览状态（如果有备份数据）
      if (browsingBackup.candidates.length > 0) {
        logger.info(`恢复 ${browsingBackup.candidates.length} 个已收集的候选人数据`);
        this.browsingStatus.candidates = browsingBackup.candidates;
        this.browsingStatus.collectedCount = browsingBackup.collectedCount;
        this.browsingStatus.mode = browsingBackup.mode;
      }
      
      logger.info('智联招聘浏览器恢复完成');
      return true;
      
    } catch (error) {
      logger.error('智联招聘连接错误恢复失败:', error);
      this.currentStatus = 'error';
      
      // 即使恢复失败，也尝试基本的状态重置
      try {
        this.browser = null;
        this.page = null;
        this.isLoggedIn = false;
      } catch (resetError) {
        logger.error('基本状态重置也失败:', resetError);
      }
      
      return false;
    }
  }

  /**
   * 确保浏览器和页面处于就绪状态
   */
  async ensureBrowserAndPageReady() {
    try {
      // 检查浏览器状态
      if (!this.browser || !this.browser.isConnected()) {
        logger.warn('浏览器未连接，重新初始化...');
        await this.recoverFromConnectionError();
        return;
      }
      
      // 检查页面状态
      if (!this.page || this.page.isClosed()) {
        logger.warn('页面已关闭，重新初始化...');
        await this.recoverFromConnectionError();
        return;
      }
      
      // 检查页面响应性
      try {
        await this.page.evaluate(() => document.readyState);
      } catch (e) {
        logger.warn('页面无响应，重新初始化...');
        await this.recoverFromConnectionError();
        return;
      }
      
      logger.debug('浏览器和页面状态正常');
      
    } catch (error) {
      logger.error('检查浏览器状态时出错:', error);
      throw error;
    }
  }

  /**
   * 错误处理包装器
   * 为关键操作提供统一的错误处理和重试机制
   */
  async withErrorHandling(operation, operationName, maxRetries = 3) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // 检查服务是否已停止
      if (this.isStopped) {
        logger.info(`服务已停止，终止操作: ${operationName}`);
        throw new Error(`服务已停止，操作 ${operationName} 被终止`);
      }
      
      try {
        logger.info(`执行智联招聘操作: ${operationName} (尝试 ${attempt}/${maxRetries})`);
        const result = await operation();
        
        if (attempt > 1) {
          logger.info(`智联招聘操作 ${operationName} 在第 ${attempt} 次尝试后成功`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        logger.warn(`智联招聘操作 ${operationName} 第 ${attempt} 次尝试失败:`, error.message);
        
        // 再次检查服务是否已停止
        if (this.isStopped) {
          logger.info(`服务已停止，终止操作: ${operationName}`);
          throw new Error(`服务已停止，操作 ${operationName} 被终止`);
        }
        
        // 检查是否是连接相关错误
        if (this.isConnectionError(error)) {
          logger.warn('检测到智联招聘连接错误，尝试恢复连接');
          const recovered = await this.recoverFromConnectionError();
          
          if (!recovered && attempt === maxRetries) {
            throw new Error(`智联招聘连接恢复失败，操作 ${operationName} 终止`);
          }
        }
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // 指数退避，最大10秒
          logger.info(`等待 ${delay}ms 后重试智联招聘操作...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // 所有重试都失败了
    logger.error(`智联招聘操作 ${operationName} 在 ${maxRetries} 次尝试后仍然失败`);
    throw lastError;
  }

  /**
   * 检查是否是连接相关错误
   * 优化了错误判断逻辑，减少误判
   */
  isConnectionError(error) {
    if (!error || !error.message) {
      return false;
    }
    
    const errorMessage = error.message.toLowerCase();
    
    // 严重的连接错误，需要立即恢复
    const criticalConnectionErrors = [
      'target closed',
      'protocol error',
      'session closed',
      'browser has been closed',
      'page has been closed',
      'execution context was destroyed',
      'cannot find context with specified id',
      'target page, context or browser has been closed',
      'page crashed',
      '浏览器连接已断开',
      '页面已关闭或不可用'
    ];
    
    // 检查是否是严重连接错误
    const isCriticalError = criticalConnectionErrors.some(pattern => 
      errorMessage.includes(pattern)
    );
    
    if (isCriticalError) {
      logger.warn(`检测到严重连接错误: ${error.message}`);
      return true;
    }
    
    // 超时错误需要更谨慎的判断
    const timeoutPatterns = [
      'navigation timeout',
      'timeout',
      'waiting for selector',
      'waiting for function'
    ];
    
    const isTimeoutError = timeoutPatterns.some(pattern => 
      errorMessage.includes(pattern)
    );
    
    if (isTimeoutError) {
      // 对于超时错误，检查是否是页面加载相关的超时
      const pageLoadTimeouts = [
        'navigation timeout',
        'waiting for load state',
        'page.goto',
        'waitforloadstate'
      ];
      
      const isPageLoadTimeout = pageLoadTimeouts.some(pattern => 
        errorMessage.includes(pattern)
      );
      
      if (isPageLoadTimeout) {
        logger.warn(`检测到页面加载超时，但不触发连接恢复: ${error.message}`);
        return false; // 页面加载超时不需要连接恢复
      }
      
      // 其他超时错误可能需要恢复
      logger.warn(`检测到超时错误: ${error.message}`);
      return true;
    }
    
    // 网络错误
    const networkErrors = [
      'net::err_',
      'connection closed',
      'connection refused',
      'connection reset'
    ];
    
    const isNetworkError = networkErrors.some(pattern => 
      errorMessage.includes(pattern)
    );
    
    if (isNetworkError) {
      logger.warn(`检测到网络错误: ${error.message}`);
      return true;
    }
    
    // DOM相关错误通常不需要连接恢复
    const domErrors = [
      '候选人元素已从dom中分离',
      'element is not attached',
      'element not found',
      'no such element',
      'stale element'
    ];
    
    const isDomError = domErrors.some(pattern => 
      errorMessage.includes(pattern)
    );
    
    if (isDomError) {
      logger.info(`检测到DOM错误，不需要连接恢复: ${error.message}`);
      return false;
    }
    
    // 默认不触发连接恢复
    return false;
  }

  /**
   * 安全执行页面操作
   * 在执行页面操作前检查页面状态
   */
  async safePageOperation(operation, operationName) {
    try {
      // 检查页面是否可用
      if (!this.page || this.page.isClosed()) {
        throw new Error('智联招聘页面不可用或已关闭');
      }
      
      // 检查浏览器是否可用
      if (!this.browser || !this.browser.isConnected()) {
        throw new Error('智联招聘浏览器不可用或连接已断开');
      }
      
      // 检查页面是否响应
      try {
        await this.page.evaluate(() => document.readyState);
      } catch (evalError) {
        throw new Error('页面无法响应JavaScript执行');
      }
      
      return await operation();
      
    } catch (error) {
      logger.error(`智联招聘安全页面操作 ${operationName} 失败:`, error);
      
      // 如果是连接错误，标记需要恢复但不在此处执行
      if (this.isConnectionError(error)) {
        logger.warn(`检测到连接错误，操作 ${operationName} 将触发恢复机制`);
      }
      
      throw error;
    }
  }

  /**
   * 验证页面状态
   * 确保页面和浏览器处于可用状态
   */
  async validatePageState() {
    try {
      if (!this.page || this.page.isClosed()) {
        throw new Error('页面已关闭或不可用');
      }
      
      if (!this.browser || !this.browser.isConnected()) {
        throw new Error('浏览器连接已断开');
      }
      
      // 检查页面是否响应
      await this.page.evaluate(() => document.readyState);
      
    } catch (error) {
      logger.error('页面状态验证失败:', error);
      throw error;
    }
  }
  
  /**
   * 验证页面跳转
   * 确保页面成功跳转到新页面
   */
  async validatePageTransition(originalUrl) {
    try {
      // 等待页面URL发生变化或出现简历相关内容
      const maxWaitTime = 10000;
      const startTime = Date.now();
      
      while (Date.now() - startTime < maxWaitTime) {
        const currentUrl = this.page.url();
        
        // 检查URL是否发生变化
        if (currentUrl !== originalUrl) {
          logger.info(`页面成功跳转: ${originalUrl} -> ${currentUrl}`);
          return true;
        }
        
        // 检查是否出现简历相关内容（弹窗形式）
        const resumeContent = await this.page.$('.resume-content, .cv-content, .detail-content, .resume-detail, .candidate-detail, div.new-resume-detail--inner');
        if (resumeContent) {
          logger.info('检测到简历内容弹窗');
          return true;
        }
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      logger.warn('页面跳转验证超时，但继续尝试提取内容');
      return false;
      
    } catch (error) {
      logger.error('页面跳转验证失败:', error);
      throw error;
    }
  }
  
  /**
   * 状态验证和重置
   * 确保服务状态的一致性
   */
  validateAndResetState() {
    try {
      // 如果浏览器或页面不可用，重置相关状态
      if (!this.browser || !this.browser.isConnected() || !this.page || this.page.isClosed()) {
        logger.warn('检测到智联招聘浏览器或页面状态异常，重置状态');
        
        this.browser = null;
        this.page = null;
        this.isLoggedIn = false;
        this.currentStatus = 'idle';
        
        // 停止活跃的任务
        if (this.browsingStatus.isActive) {
          this.browsingStatus.isActive = false;
          logger.warn('由于状态异常，停止智联招聘候选人浏览任务');
        }
        
        if (this.resumeProcessingStatus.isActive) {
          this.resumeProcessingStatus.isActive = false;
          logger.warn('由于状态异常，停止智联招聘简历处理任务');
        }
      }
      
      // 验证状态一致性
      if (this.browsingStatus.isActive && this.currentStatus === 'idle') {
        logger.warn('检测到智联招聘状态不一致：浏览任务活跃但服务状态为空闲');
        this.currentStatus = 'browsing';
      }
      
      if (this.resumeProcessingStatus.isActive && this.currentStatus === 'idle') {
        logger.warn('检测到智联招聘状态不一致：简历处理任务活跃但服务状态为空闲');
        this.currentStatus = 'processing';
      }
      
    } catch (error) {
      logger.error('智联招聘状态验证和重置失败:', error);
    }
  }

  /**
   * 增强的错误日志记录
   * 提供更详细的错误信息和上下文
   */
  logError(error, context = {}) {
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context: {
        currentStatus: this.currentStatus,
        isLoggedIn: this.isLoggedIn,
        browsingActive: this.browsingStatus.isActive,
        resumeProcessingActive: this.resumeProcessingStatus.isActive,
        pageUrl: this.page ? this.page.url() : 'N/A',
        ...context
      }
    };
    
    logger.error('智联招聘服务错误详情:', errorInfo);
    
    // 如果有Socket.IO实例，发送错误事件
    if (this.io) {
      this.io.emit('zhilianError', {
        error: error.message,
        context: errorInfo.context,
        timestamp: errorInfo.timestamp
      });
    }
  }

  /**
   * 启动简历处理流程
   * @param {Object} options - 处理选项
   */
  async startResumeProcessing(options = {}) {
    return await this.withErrorHandling(async () => {
      logger.info('开始启动智联招聘简历处理流程...');
      
      // 验证和重置状态
      this.validateAndResetState();
      
      // 初始化简历处理状态
      this.resumeProcessingStatus = {
        isActive: true,
        startTime: new Date(),
        totalCandidates: 0,
        processedCount: 0,
        successCount: 0,
        failedCount: 0,
        currentStep: 'collecting',
        progress: 0,
        resumes: [],
        errors: []
      };
      
      this.isStopped = false; // 重置停止标志，允许浏览器恢复机制正常工作
      
      // 收集候选人
      const candidates = await this.collectCandidatesForProcessing();
      this.resumeProcessingStatus.totalCandidates = candidates.length;
      
      if (candidates.length === 0) {
        logger.warn('没有找到需要处理的候选人');
        this.resumeProcessingStatus.isActive = false;
        return;
      }
      
      logger.info(`找到 ${candidates.length} 个候选人需要处理简历`);
      
      // 处理每个候选人的简历
      for (let i = 0; i < candidates.length && this.resumeProcessingStatus.isActive; i++) {
        try {
          const candidate = candidates[i];
          this.resumeProcessingStatus.currentStep = `processing_${i + 1}`;
          
          // 处理单个简历
          const resumeData = await this.processSingleResume(candidate, i + 1);
          
          if (resumeData) {
            // 质量检测
            const qualityScore = await analyzeResumeQuality(resumeData);
            resumeData.qualityScore = qualityScore;
            
            // 解析简历内容
            const parsedContent = await parseResumeContent(resumeData.content);
            resumeData.parsedContent = parsedContent;
            
            // 保存到数据库
            const savedResume = await this.saveResumeToDatabase(resumeData);
            
            this.resumeProcessingStatus.resumes.push(savedResume);
            this.resumeProcessingStatus.successCount++;
            
            logger.info(`成功处理第 ${i + 1} 个简历: ${candidate.name}`);
          }
          
        } catch (error) {
          logger.error(`处理第 ${i + 1} 个简历失败:`, error);
          this.resumeProcessingStatus.failedCount++;
          this.resumeProcessingStatus.errors.push({
            candidateIndex: i + 1,
            error: error.message,
            timestamp: new Date()
          });
        }
        
        this.resumeProcessingStatus.processedCount++;
        this.resumeProcessingStatus.progress = Math.round((this.resumeProcessingStatus.processedCount / this.resumeProcessingStatus.totalCandidates) * 100);
        
        // 发送进度更新
        if (this.io) {
          this.io.emit('zhilianResumeProcessingProgress', {
            processed: this.resumeProcessingStatus.processedCount,
            total: this.resumeProcessingStatus.totalCandidates,
            success: this.resumeProcessingStatus.successCount,
            failed: this.resumeProcessingStatus.failedCount,
            progress: this.resumeProcessingStatus.progress,
            currentStep: this.resumeProcessingStatus.currentStep
          });
        }
        
        // 反爬虫延迟
        await this.randomDelay();
      }
      
      this.resumeProcessingStatus.isActive = false;
      this.resumeProcessingStatus.currentStep = 'completed';
      
      logger.info(`智联招聘简历处理完成，成功: ${this.resumeProcessingStatus.successCount}，失败: ${this.resumeProcessingStatus.failedCount}`);
      
    }, '启动简历处理流程', 2);
  }
  
  /**
   * 收集需要处理的候选人
   */
  async collectCandidatesForProcessing() {
    try {
      logger.info('开始收集需要处理的候选人...');
      
      // 从浏览状态中获取候选人
      let candidates = [];
      
      if (this.browsingStatus.candidates && this.browsingStatus.candidates.length > 0) {
        candidates = this.browsingStatus.candidates.filter(candidate => 
          candidate.resumeUrl && !candidate.processed
        );
      }
      
      // 如果没有候选人，尝试从收藏夹获取
      if (candidates.length === 0) {
        candidates = await this.collectFavoriteCandidates();
      }
      
      logger.info(`收集到 ${candidates.length} 个候选人`);
      return candidates;
      
    } catch (error) {
      logger.error('收集候选人失败:', error);
      return [];
    }
  }
  
  /**
   * 收集收藏的候选人
   */
  async collectFavoriteCandidates() {
    try {
      logger.info('开始收集收藏的候选人...');
      
      // 导航到收藏页面
      const favoriteUrls = [
        'https://rd.zhaopin.com/favorite',
        'https://rd.zhaopin.com/collection',
        'https://rd.zhaopin.com/app/favorite'
      ];
      
      let navigated = false;
      for (const url of favoriteUrls) {
        try {
          await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
          await this.waitForPageFullyLoaded();
          
          const hasFavoriteContent = await this.page.$('.favorite, .collection, [data-testid="favorite"]');
          if (hasFavoriteContent) {
            navigated = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!navigated) {
        logger.warn('无法导航到收藏页面');
        return [];
      }
      
      // 获取收藏的候选人
      const candidateElements = await this.getCandidateElements();
      const candidates = [];
      
      for (let i = 0; i < candidateElements.length; i++) {
        try {
          const candidateInfo = await this.extractCandidateInfo(candidateElements[i], i + 1);
          if (candidateInfo && candidateInfo.resumeUrl) {
            candidateInfo.source = 'favorite';
            candidates.push(candidateInfo);
          }
        } catch (error) {
          logger.warn(`提取第 ${i + 1} 个收藏候选人信息失败:`, error.message);
        }
      }
      
      logger.info(`从收藏页面收集到 ${candidates.length} 个候选人`);
      return candidates;
      
    } catch (error) {
      logger.error('收集收藏候选人失败:', error);
      return [];
    }
  }
  
  /**
   * 处理单个简历
   * @param {Object} candidate - 候选人信息
   * @param {number} index - 索引
   */
  async processSingleResume(candidate, index) {
    return await this.withErrorHandling(async () => {
      logger.info(`开始处理第 ${index} 个简历: ${candidate.name}`);
      
      // 访问简历详情页
      if (candidate.resumeUrl) {
        await this.safePageOperation(async () => {
          await this.page.goto(candidate.resumeUrl, { waitUntil: 'networkidle', timeout: 30000 });
          await this.waitForPageFullyLoaded();
        }, `访问简历详情页-${index}`);
      }
      
      // 提取简历内容
      const resumeContent = await this.extractResumeContent();
      
      if (!resumeContent) {
        throw new Error('无法提取简历内容');
      }
      
      // 构建简历数据
      const resumeData = {
        platform: 'zhilian',
        candidateId: candidate.id || `zhilian_${Date.now()}_${index}`,
        name: candidate.name,
        position: candidate.position,
        company: candidate.company,
        location: candidate.location,
        experience: candidate.experience,
        education: candidate.education,
        salary: candidate.salary,
        source: candidate.source || 'search',
        resumeUrl: candidate.resumeUrl,
        content: resumeContent,
        extractedAt: new Date(),
        rawData: candidate
      };
      
      return resumeData;
      
    }, `处理第${index}个简历`, 2);
  }
  
  /**
   * 新的简历处理流程：与前端应用集成
   * @param {ElementHandle} candidateElement - 候选人元素
   * @param {number} index - 候选人索引
   * @returns {boolean} - 是否处理成功
   */
  async processResumeWithFrontend(candidateElement, index) {
    return await this.withErrorHandling(async () => {
      logger.info(`开始处理第 ${index} 个候选人简历`);
      
      // 1. 点击候选人卡片打开在线简历
      const resumeContent = await this.clickCandidateAndGetResume(candidateElement, index);
      
      if (!resumeContent) {
        logger.warn(`第 ${index} 个候选人简历内容为空`);
        return false;
      }
      
      // 2. 切换到前端应用并处理简历
      const frontendProcessed = await this.processThroughFrontend(resumeContent, index);
      
      if (!frontendProcessed) {
        logger.warn(`第 ${index} 个候选人前端处理失败`);
        return false;
      }
      
      // 3. 返回智联招聘页面
      await this.returnToZhilianPage();
      
      logger.info(`第 ${index} 个候选人简历处理完成`);
      return true;
      
    }, `处理第${index}个候选人简历`, 2);
  }
  
  /**
   * 点击候选人卡片并获取在线简历内容
   * @param {ElementHandle} candidateElement - 候选人元素
   * @param {number} index - 候选人索引
   * @returns {string|null} - 简历内容
   */
  async clickCandidateAndGetResume(candidateElement, index) {
    return await this.withErrorHandling(async () => {
      // 验证页面状态
      await this.validatePageState();
      
      // 查找候选人卡片中的可点击链接
      const clickableElement = await this.findClickableResumeLink(candidateElement);
      
      if (!clickableElement) {
        logger.warn(`第 ${index} 个候选人没有找到可点击的简历链接`);
        return null;
      }
      
      // 记录当前页面URL，用于后续返回
      const currentUrl = this.page.url();
      this.lastCandidateListUrl = currentUrl;
      
      // 点击打开简历详情页 - 增强错误处理
      try {
        // 在点击前进行全面的状态检查
        await this.ensureBrowserAndPageReady();
        
        await this.safePageOperation(async () => {
          // 再次验证页面和元素状态
          await this.validatePageState();
          
          // **重要修复**: 在点击前重新验证和获取可点击元素，防止DOM分离
          let activeClickableElement = clickableElement;
          
          // 检查元素是否仍然附加到DOM
          try {
            const isAttached = await clickableElement.evaluate(el => el.isConnected);
            if (!isAttached) {
              logger.warn(`第${index}个候选人的可点击元素已从DOM分离，重新获取...`);
              
              // 重新获取候选人元素
              const freshCandidateElement = await this.getCurrentCandidateElement(index - 1); // index-1因为getCurrentCandidateElement是0开始的
              if (!freshCandidateElement) {
                throw new Error('无法重新获取候选人元素');
              }
              
              // 重新查找可点击链接
              activeClickableElement = await this.findClickableResumeLink(freshCandidateElement);
              if (!activeClickableElement) {
                throw new Error('无法重新获取可点击元素');
              }
              
              logger.info(`第${index}个候选人：成功重新获取可点击元素`);
            }
            
            // 再次验证元素可见性
            await activeClickableElement.isVisible();
            
          } catch (error) {
            logger.error(`第${index}个候选人元素验证失败:`, error.message);
            throw new Error(`候选人元素已从DOM中分离或不可见: ${error.message}`);
          }
          
          // 滚动到元素可见位置
          await activeClickableElement.scrollIntoViewIfNeeded();
          await this.smartRandomDelay('scroll');
          
          // 模拟人类行为
          await this.simulateHumanBehavior();
          
          // 点击前的智能延迟
          await this.smartRandomDelay('click');
          
          // 点击元素（使用重新验证后的元素）
          await activeClickableElement.click();
          
          // 点击后的导航延迟
          await this.smartRandomDelay('navigation');
          
          // 等待页面响应
          await this.page.waitForLoadState('networkidle', { timeout: 20000 });
          
        }, `点击第${index}个候选人简历链接`);
        
        // 验证页面是否成功跳转
        await this.validatePageTransition(currentUrl);
        
        // 等待简历页面加载完成
        await this.waitForPageFullyLoaded();
        
        // 提取简历内容
        const resumeContent = await this.extractResumeContent();
        
        return resumeContent;
        
      } catch (clickError) {
        logger.error(`点击第${index}个候选人时发生错误:`, clickError.message);
        
        // 如果是连接错误，立即尝试恢复
        if (this.isConnectionError(clickError)) {
          logger.warn('检测到连接错误，尝试恢复浏览器状态...');
          await this.recoverFromConnectionError();
          throw clickError;
        }
        
        // 其他错误，尝试跳过这个候选人
        logger.warn(`跳过第${index}个候选人，继续处理下一个`);
        return null;
      }
      
    }, `点击并获取第${index}个候选人简历`, 3);
  }
  
  /**
   * 查找候选人元素中的可点击简历链接
   * @param {ElementHandle} candidateElement - 候选人元素
   * @returns {ElementHandle|null} - 可点击的元素
   */
  async findClickableResumeLink(candidateElement) {
    try {
      // 首先验证候选人元素是否仍然有效
      try {
        const isAttached = await candidateElement.evaluate(el => el.isConnected);
        if (!isAttached) {
          logger.warn('候选人元素已从DOM中分离，无法查找可点击链接');
          return null;
        }
      } catch (error) {
        logger.warn('验证候选人元素时出错:', error.message);
        return null;
      }
      
      // 常见的简历链接选择器
      const linkSelectors = [
        'a[href*="resume"]',
        'a[href*="talent"]', 
        'a[href*="person"]',
        'a[href*="candidate"]',
        '.resume-link',
        '.talent-link',
        '.person-link',
        '.candidate-link',
        'a',  // 最后尝试任何链接
      ];
      
      for (const selector of linkSelectors) {
        try {
          const element = await candidateElement.$(selector);
          if (element) {
            // 验证元素是否仍然附加到DOM
            const isElementAttached = await element.evaluate(el => el.isConnected);
            if (!isElementAttached) {
              continue; // 继续查找下一个
            }
            
            // 检查链接是否有效
            const href = await element.getAttribute('href');
            if (href && (href.includes('resume') || href.includes('talent') || href.includes('person') || href.includes('candidate'))) {
              return element;
            }
            // 如果是通用链接，也尝试使用
            if (href && href.startsWith('http')) {
              return element;
            }
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }
      
      // 如果没有找到链接，验证整个候选人元素是否仍然有效
      try {
        const isCandidateAttached = await candidateElement.evaluate(el => el.isConnected);
        if (isCandidateAttached) {
          return candidateElement;
        } else {
          logger.warn('候选人元素已从DOM中分离，无法作为可点击元素');
          return null;
        }
      } catch (error) {
        logger.warn('验证候选人元素最终状态时出错:', error.message);
        return null;
      }
      
    } catch (error) {
      logger.error('查找可点击简历链接失败:', error);
      return null;
    }
  }
  
  /**
   * 通过前端应用处理简历
   * @param {string} resumeContent - 简历内容
   * @param {number} index - 候选人索引
   * @returns {boolean} - 是否处理成功
   */
  async processThroughFrontend(resumeContent, index) {
    return await this.withErrorHandling(async () => {
      logger.info(`开始通过前端应用处理第 ${index} 个候选人简历`);
      
      // 1. 打开新标签页访问前端应用
      const frontendPage = await this.browser.newPage();
      
      try {
        logger.info(`第 ${index} 个候选人：正在访问前端应用...`);
        // 访问前端应用
        await frontendPage.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
        await frontendPage.waitForLoadState('domcontentloaded', { timeout: 10000 });
        logger.info(`第 ${index} 个候选人：前端应用加载完成`);
        
        // 2. 导航到简历列表页面
        logger.info(`第 ${index} 个候选人：正在导航到简历列表页面...`);
        await this.navigateToResumeList(frontendPage);
        logger.info(`第 ${index} 个候选人：简历列表页面导航完成`);
        
        // 3. 点击上传简历按钮
        logger.info(`第 ${index} 个候选人：正在点击上传简历按钮...`);
        await this.clickUploadResumeButton(frontendPage);
        logger.info(`第 ${index} 个候选人：上传简历按钮点击完成`);
        
        // 4. 点击Boss直聘简历解析Tab
        logger.info(`第 ${index} 个候选人：正在切换到Boss直聘简历解析Tab...`);
        await this.clickBossZhipinTab(frontendPage);
        logger.info(`第 ${index} 个候选人：Boss直聘简历解析Tab切换完成`);
        
        // 5. 粘贴简历内容到文本框
        logger.info(`第 ${index} 个候选人：正在粘贴简历内容...`);
        await this.pasteResumeContent(frontendPage, resumeContent);
        logger.info(`第 ${index} 个候选人：简历内容粘贴完成`);
        
        // 6. 点击解析简历按钮
        logger.info(`第 ${index} 个候选人：正在点击解析简历按钮...`);
        await this.clickParseResumeButton(frontendPage);
        logger.info(`第 ${index} 个候选人：解析简历按钮点击完成`);
        
        // 7. 等待解析完成并点击确认添加
        logger.info(`第 ${index} 个候选人：正在等待解析完成并确认添加...`);
        const addConfirmed = await this.waitAndConfirmAdd(frontendPage);
        
        if (addConfirmed) {
          logger.info(`第 ${index} 个候选人简历已成功添加到系统`);
          // 发送成功消息到前端
          if (this.io) {
            this.io.emit('candidateProcessed', {
              index: index,
              status: 'success',
              message: `第 ${index} 个候选人简历已成功添加`
            });
          }
          return true;
        } else {
          logger.warn(`第 ${index} 个候选人简历添加失败`);
          // 发送失败消息到前端
          if (this.io) {
            this.io.emit('candidateProcessed', {
              index: index,
              status: 'failed',
              message: `第 ${index} 个候选人简历添加失败`
            });
          }
          return false;
        }
        
      } catch (error) {
        logger.error(`第 ${index} 个候选人前端处理过程中发生错误:`, error);
        // 发送错误消息到前端
        if (this.io) {
          this.io.emit('candidateProcessed', {
            index: index,
            status: 'error',
            message: `第 ${index} 个候选人处理出错: ${error.message}`
          });
        }
        throw error;
      } finally {
        // 关闭前端页面
        try {
          logger.info(`第 ${index} 个候选人：正在关闭前端页面...`);
          await frontendPage.close();
          logger.info(`第 ${index} 个候选人：前端页面已关闭`);
          
          // 确认主要页面仍然打开
          if (this.page && !this.page.isClosed()) {
            logger.info(`第 ${index} 个候选人：智联招聘主页面保持打开状态`);
          } else {
            logger.warn(`第 ${index} 个候选人：检测到主页面被关闭!`);
          }
        } catch (closeError) {
          logger.warn(`第 ${index} 个候选人：关闭前端页面时出错:`, closeError.message);
        }
      }
      
    }, `前端处理第${index}个候选人简历`, 2);
  }
  
  /**
   * 导航到简历列表页面
   * @param {Page} frontendPage - 前端页面对象
   */
  async navigateToResumeList(frontendPage) {
    await this.safePageOperation(async () => {
      // 查找并点击简历管理菜单
      const resumeMenuSelectors = [
        'a[href*="resume"]',
        'a[href*="/resumes"]',
        '.menu-item:has-text("简历")',
        '.nav-item:has-text("简历")',
        'text=简历管理',
        'text=简历列表'
      ];
      
      for (const selector of resumeMenuSelectors) {
        try {
          const element = await frontendPage.$(selector);
          if (element) {
            await element.click();
            await frontendPage.waitForLoadState('networkidle', { timeout: 10000 });
            return;
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }
      
      // 如果没有找到菜单，尝试直接访问简历页面
      await frontendPage.goto('http://localhost:3000/resumes', { waitUntil: 'networkidle' });
      
    }, '导航到简历列表页面');
  }
  
  /**
   * 点击上传简历按钮
   * @param {Page} frontendPage - 前端页面对象
   */
  async clickUploadResumeButton(frontendPage) {
    await this.safePageOperation(async () => {
      const uploadButtonSelectors = [
        'button:has-text("上传简历")',
        'button:has-text("添加简历")',
        'button:has-text("新增简历")',
        '.upload-btn',
        '.add-resume-btn',
        '.btn-upload',
        'button[class*="upload"]',
        'button[class*="add"]'
      ];
      
      for (const selector of uploadButtonSelectors) {
        try {
          const element = await frontendPage.$(selector);
          if (element) {
            await element.click();
            await frontendPage.waitForTimeout(1000); // 等待弹窗打开
            return;
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }
      
      throw new Error('未找到上传简历按钮');
      
    }, '点击上传简历按钮');
  }
  
  /**
   * 切换到文件上传Tab
   * @param {Page} frontendPage - 前端页面对象
   */
  async switchToFileUploadTab(frontendPage) {
    await this.safePageOperation(async () => {
      logger.info('正在切换到文件上传Tab...');
      
      // 等待页面稳定
      await frontendPage.waitForTimeout(500);
      
      const tabSelectors = [
        // 优先使用用户提供的精确选择器
        'div[role="tab"][class="ant-tabs-tab-btn"][id*="tab-file"]',
        'div.ant-tabs-tab-btn[role="tab"]:has-text("文件上传")',
        'div[role="tab"].ant-tabs-tab-btn:has-text("文件上传")',
        // 通用选择器
        'div[role="tab"]:has-text("文件上传")',
        '.ant-tabs-tab:has-text("文件上传")',
        'div:has-text("文件上传")',
        'button:has-text("文件上传")',
        'a:has-text("文件上传")',
        'div:has-text("上传")',
        'button:has-text("上传")',
        'div[role="tab"]:has-text("上传")',
        '.ant-tabs-tab:has-text("上传")',
        '[data-tab="file"]',
        '[data-tab="upload"]',
        '.tab-file',
        '.upload-tab'
      ];
      
      for (const selector of tabSelectors) {
        try {
          const element = await frontendPage.$(selector);
          if (element) {
            // 检查元素是否可见和可点击
            const isVisible = await element.isVisible();
            if (isVisible) {
              logger.info(`找到文件上传Tab: ${selector}`);
              await element.click();
              await frontendPage.waitForTimeout(1000); // 等待Tab切换完成
              
              // 验证Tab是否已切换（检查aria-selected属性）
              const isSelected = await element.getAttribute('aria-selected');
              if (isSelected === 'true') {
                logger.info('文件上传Tab切换完成，已激活');
              } else {
                logger.info('文件上传Tab已点击，等待激活状态更新');
              }
              return;
            }
          }
        } catch (e) {
          logger.debug(`选择器 ${selector} 未找到元素: ${e.message}`);
          // 继续尝试下一个选择器
        }
      }
      
      logger.warn('未找到文件上传Tab，可能已经在正确的Tab上');
      
    }, '切换到文件上传Tab');
  }

  /**
   * 点击Boss直聘简历解析Tab
   * @param {Page} frontendPage - 前端页面对象
   */
  async clickBossZhipinTab(frontendPage) {
    await this.safePageOperation(async () => {
      logger.info('正在查找Boss直聘简历解析Tab...');
      
      // 等待页面稳定
      await frontendPage.waitForTimeout(500);
      
      const tabSelectors = [
        'div:has-text("Boss直聘简历解析")',
        'button:has-text("Boss直聘简历解析")',
        'a:has-text("Boss直聘简历解析")',
        'div[role="tab"]:has-text("Boss直聘简历解析")',
        '.ant-tabs-tab:has-text("Boss直聘简历解析")',
        'div:has-text("Boss直聘")',
        'button:has-text("Boss直聘")',
        'div[role="tab"]:has-text("Boss直聘")',
        '.ant-tabs-tab:has-text("Boss直聘")',
        'div[role="tab"]:has-text("Boss")',
        'div[role="tab"]:has-text("直聘")',
        '.ant-tabs-tab:has-text("Boss")',
        '.ant-tabs-tab:has-text("直聘")',
        '[data-tab="boss"]',
        '[data-tab="bosszhipin"]',
        '.tab-boss',
        '.boss-tab'
      ];
      
      for (const selector of tabSelectors) {
        try {
          const element = await frontendPage.$(selector);
          if (element) {
            const isVisible = await element.isVisible();
            const isEnabled = await element.isEnabled();
            
            logger.debug(`检查Tab: ${selector}, visible: ${isVisible}, enabled: ${isEnabled}`);
            
            if (isVisible && isEnabled) {
              await element.click();
              logger.info(`成功点击Boss直聘简历解析Tab: ${selector}`);
              // 等待Tab切换完成
              await frontendPage.waitForTimeout(1500);
              return;
            } else {
              logger.debug(`Tab不可用: ${selector}, visible: ${isVisible}, enabled: ${isEnabled}`);
            }
          }
        } catch (e) {
          logger.debug(`选择器 ${selector} 查找失败: ${e.message}`);
        }
      }
      
      throw new Error('未找到Boss直聘简历解析Tab');
      
    }, '点击Boss直聘简历解析Tab');
  }
  
  /**
   * 粘贴简历内容到文本框
   * @param {Page} frontendPage - 前端页面对象
   * @param {string} resumeContent - 简历内容
   */
  async pasteResumeContent(frontendPage, resumeContent) {
    await this.safePageOperation(async () => {
      // Boss直聘Tab专用的文本框选择器
      const bossTextareaSelectors = [
        'textarea[placeholder*="Boss"]',
        'textarea[placeholder*="直聘"]',
        'textarea[placeholder*="粘贴Boss直聘简历内容"]',
        'textarea[placeholder*="请粘贴简历内容"]',
        '.boss-resume-textarea',
        '.boss-textarea',
        'div[data-tab="boss"] textarea',
        'div[data-tab="bosszhipin"] textarea'
      ];
      
      // 通用文本框选择器作为备选
      const generalTextareaSelectors = [
        'textarea[placeholder*="简历"]',
        'textarea[placeholder*="内容"]',
        'textarea[name*="content"]',
        'textarea[name*="resume"]',
        '.resume-textarea',
        '.content-textarea',
        'textarea'
      ];
      
      // 合并选择器，优先使用Boss直聘专用选择器
      const allSelectors = [...bossTextareaSelectors, ...generalTextareaSelectors];
      
      for (const selector of allSelectors) {
        try {
          const element = await frontendPage.$(selector);
          if (element) {
            const isVisible = await element.isVisible();
            const isEnabled = await element.isEnabled();
            
            if (isVisible && isEnabled) {
              await element.click();
              // 清空现有内容
              await element.fill('');
              // 粘贴新内容
              await element.fill(resumeContent);
              logger.info(`成功在Boss直聘Tab中粘贴简历内容，使用选择器: ${selector}`);
              // 等待内容填充完成
              await frontendPage.waitForTimeout(500);
              return;
            } else {
              logger.debug(`文本框不可用: ${selector}, visible: ${isVisible}, enabled: ${isEnabled}`);
            }
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }
      
      throw new Error('未找到Boss直聘Tab中的简历内容输入框');
      
    }, '在Boss直聘Tab中粘贴简历内容');
  }
  
  /**
   * 点击解析简历按钮
   * @param {Page} frontendPage - 前端页面对象
   */
  async clickParseResumeButton(frontendPage) {
    await this.safePageOperation(async () => {
      logger.info('正在查找并点击解析Boss直聘简历按钮...');
      
      // 等待页面稳定
      await frontendPage.waitForTimeout(1000);
      
      const parseButtonSelectors = [
        'button:has-text("解析Boss直聘简历")',
        'button:has-text("解析简历")',
        'button:has-text("解析文本")',
        'button:has-text("解析")',
        'button:has-text("分析")',
        '.parse-btn',
        '.analyze-btn',
        'button[class*="parse"]',
        'button[class*="analyze"]',
        'button[type="submit"]'
      ];
      
      for (const selector of parseButtonSelectors) {
        try {
          const element = await frontendPage.$(selector);
          if (element) {
            // 检查按钮是否可见和可点击
            const isVisible = await element.isVisible();
            const isEnabled = await element.isEnabled();
            
            logger.debug(`检查按钮: ${selector}, visible: ${isVisible}, enabled: ${isEnabled}`);
            
            if (isVisible && isEnabled) {
              await element.click();
              logger.info(`成功点击解析按钮: ${selector}`);
              return;
            } else {
              logger.debug(`按钮不可用: ${selector}, visible: ${isVisible}, enabled: ${isEnabled}`);
            }
          }
        } catch (e) {
          logger.debug(`选择器 ${selector} 查找失败: ${e.message}`);
        }
      }
      
      throw new Error('未找到可用的解析简历按钮');
      
    }, '点击解析简历按钮');
  }
  
  /**
   * 等待解析完成并点击确认添加
   * @param {Page} frontendPage - 前端页面对象
   * @returns {boolean} - 是否成功确认添加
   */
  async waitAndConfirmAdd(frontendPage) {
    try {
      logger.info('开始等待解析完成并确认添加...');
      
      // 等待解析开始
      await frontendPage.waitForTimeout(2000);
      
      // 确认添加按钮选择器
      const confirmButtonSelectors = [
        'button:has-text("确认添加")',
        'button:has-text("确认")',
        'button:has-text("添加")',
        'button:has-text("保存")',
        '.confirm-btn',
        '.add-btn',
        '.save-btn',
        'button[class*="confirm"]',
        'button[class*="save"]'
      ];
      
      // 持续监控确认添加按钮，不设置重试次数上限
      let attempt = 0;
      
      while (true) {
        // 检查服务是否已停止
        if (this.isStopped) {
          logger.info('服务已停止，终止等待确认添加');
          return false;
        }
        
        attempt++;
        logger.info(`持续监控确认按钮状态，第 ${attempt} 次检查`);
        
        // 检查所有可能的确认按钮选择器
        for (const selector of confirmButtonSelectors) {
          try {
            const confirmButton = await frontendPage.$(selector);
            if (confirmButton) {
              const isVisible = await confirmButton.isVisible();
              const isEnabled = await confirmButton.isEnabled();
              
              if (isVisible && isEnabled) {
                logger.info(`找到激活状态的确认按钮: ${selector}，立即点击`);
                
                // 立即点击确认按钮
                await confirmButton.click();
                logger.info('确认添加按钮点击成功');
                
                // 点击成功后等待2秒钟
                await frontendPage.waitForTimeout(2000);
                logger.info('简历添加完成，准备返回智联招聘');
                
                return true;
              }
            }
          } catch (e) {
            // 继续检查其他选择器
          }
        }
        
        // 检查页面是否有错误信息
        try {
          const errorElements = await frontendPage.$$('.error, .alert-danger, [class*="error"]');
          if (errorElements.length > 0) {
            const errorText = await errorElements[0].textContent();
            logger.warn(`页面显示错误信息: ${errorText}`);
            return false;
          }
        } catch (e) {
          // 忽略错误检查失败
        }
        
        // 每次检查间隔500毫秒，提高响应速度
        await frontendPage.waitForTimeout(500);
        
        // 每50次检查输出一次状态日志，避免日志过多
        if (attempt % 50 === 0) {
          logger.info(`已持续监控 ${attempt} 次，继续等待确认按钮激活...`);
        }
      }
      
    } catch (error) {
      logger.error('等待确认添加失败:', error);
      return false;
    }
  }
  
  /**
   * 返回智联招聘候选人列表页面
   * 修复：确保只使用ESC键返回，禁止跳转到首页，保持在人才搜索页面
   */
  async returnToZhilianPage() {
    await this.safePageOperation(async () => {
      logger.info('开始返回智联招聘候选人列表页面（仅ESC键模式）...');
      
      // 获取当前URL，确保在人才搜索页面
      const currentUrl = await this.page.url();
      if (!currentUrl.includes('rd6.zhaopin.com/app/search')) {
        logger.warn(`当前不在人才搜索页面: ${currentUrl}，但继续ESC键操作`);
      }
      
      // 严格限制：只使用ESC键返回，禁止任何页面跳转
      let escAttempts = 0;
      const maxEscAttempts = 3;
      
      while (escAttempts < maxEscAttempts) {
        escAttempts++;
        logger.info(`第 ${escAttempts} 次尝试ESC键返回...`);
        
        // 仅使用ESC键，禁止任何其他导航操作
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(1500);
        
        // 验证是否成功返回候选人列表
        const isBackToList = await this.checkResumeModalClosed();
        if (isBackToList) {
          logger.info(`✅ 第 ${escAttempts} 次ESC键成功返回候选人列表`);
          break;
        }
        
        if (escAttempts === maxEscAttempts) {
          logger.warn(`⚠️ 已达到最大ESC键尝试次数(${maxEscAttempts})，但继续处理`);
        }
      }
      
      // 验证当前页面状态
      const finalUrl = await this.page.url();
      if (finalUrl.includes('rd6.zhaopin.com/app/search')) {
        logger.info('✅ 成功保持在人才搜索页面，筛选条件完整保留');
      } else {
        logger.warn(`⚠️ 页面URL可能发生变化: ${finalUrl}，但ESC键操作已完成`);
      }
      
      // 等待页面状态完全稳定
      await this.waitForPageFullyLoaded();
      
      // 轻微点击空白区域确保页面焦点，但不触发导航
      await this.page.click('body', { position: { x: 50, y: 50 } });
      await this.smartRandomDelay('click');
      
      logger.info('✅ 返回操作完成，准备继续处理下一个候选人');
      
    }, '返回智联招聘页面');
  }
  
  /**
   * 按顺序处理搜索结果中的候选人（从上往下） - 修复版本
   * @param {number} targetCount - 目标简历数量
   */
  async processSearchResultsSequentially(targetCount) {
    try {
      logger.info(`开始按顺序处理搜索结果，目标数量: ${targetCount}`);
      
      let currentPage = 1;
      let totalProcessed = 0;
      
      while (totalProcessed < targetCount) {
        // 检查服务是否已停止
        if (this.isStopped) {
          logger.info('服务已停止，退出候选人处理循环');
          break;
        }
        
        logger.info(`处理第 ${currentPage} 页候选人...`);
        
        // 等待页面加载完成
        await this.waitForPageFullyLoaded();
        
        // **关键修复**：先获取候选人数量，而不是直接获取元素引用
        const candidateCount = await this.getCandidateCount();
        
        if (candidateCount === 0) {
          logger.warn('当前页面没有找到候选人元素');
          break;
        }
        
        logger.info(`当前页面找到 ${candidateCount} 个候选人`);
        
        // **关键修复**：按顺序从上往下处理每个候选人，每次都重新获取元素
        for (let i = 0; i < candidateCount && totalProcessed < targetCount; i++) {
          // 检查服务是否已停止
          if (this.isStopped) {
            logger.info('服务已停止，退出候选人处理循环');
            break;
          }
          
          const candidateIndex = totalProcessed + 1;
          
          try {
            logger.info(`开始处理第 ${candidateIndex} 个候选人（页面第 ${i + 1} 个）`);
            
            // **关键修复**：每次都重新获取当前候选人元素，避免DOM分离问题
            const candidateElement = await this.getCurrentCandidateElement(i);
            
            if (!candidateElement) {
              logger.warn(`第 ${candidateIndex} 个候选人：无法获取元素，跳过`);
              continue;
            }
            
            // 处理单个候选人：点击、复制简历、解析、入库
            const success = await this.processResumeWithFrontend(candidateElement, candidateIndex);
            
            if (success) {
              totalProcessed++;
              this.browsingStatus.processedCount = totalProcessed;
              
              // 发送进度更新
              if (this.io) {
                this.io.emit('browsingProgress', {
                  current: totalProcessed,
                  target: targetCount,
                  percentage: Math.round((totalProcessed / targetCount) * 100)
                });
              }
              
              logger.info(`第 ${candidateIndex} 个候选人处理完成，总进度: ${totalProcessed}/${targetCount}`);
              
              // 检查是否达到目标数量
              if (totalProcessed >= targetCount) {
                logger.info(`已达到目标简历数量 ${targetCount}，停止采集`);
                break;
              }
            } else {
              logger.warn(`第 ${candidateIndex} 个候选人处理失败，继续下一个`);
            }
            
            // 处理完一个候选人后，等待页面稳定
            await this.page.waitForTimeout(1000);
            
          } catch (error) {
            logger.error(`处理第 ${candidateIndex} 个候选人时出错:`, error);
            
            // 如果是DOM分离错误，等待页面稳定后继续
            if (error.message.includes('not attached to the DOM')) {
              logger.warn('检测到DOM元素分离，等待页面稳定后继续');
              await this.waitForPageFullyLoaded();
            }
            
            // 继续处理下一个候选人
          }
        }
        
        // 如果还没达到目标数量，尝试翻页
        if (totalProcessed < targetCount) {
          const hasNextPage = await this.goToNextPage();
          if (!hasNextPage) {
            logger.info('没有更多页面，停止处理');
            break;
          }
          currentPage++;
        }
      }
      
      logger.info(`搜索结果处理完成，共处理 ${totalProcessed} 个候选人`);
      
    } catch (error) {
      logger.error('按顺序处理搜索结果失败:', error);
      throw error;
    }
  }
  
  /**
   * 检查简历模态框是否已关闭（增强版检测）
   * @returns {boolean} 简历页面是否已关闭
   */
  async checkResumeModalClosed() {
    try {
      logger.info('检查简历页面是否已关闭...');
      
      // 方法1: 检查是否返回候选人列表页面
      const candidateListIndicators = await this.page.evaluate(() => {
        // 检查常见的候选人列表元素
        const listIndicators = [
          'div.search-resume-item.resume-item-exp', // 主要的候选人列表选择器
          '.search-resume-item',
          '.resume-item',
          '.candidate-item',
          '.search-result-item'
        ];
        
        let foundIndicators = 0;
        for (const selector of listIndicators) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            foundIndicators++;
          }
        }
        
        return {
          hasListElements: foundIndicators > 0,
          listElementCount: foundIndicators,
          url: window.location.href,
          title: document.title
        };
      });
      
      // 方法2: 检查简历详情元素是否仍然存在
      const resumeDetailElements = await this.page.evaluate(() => {
        const resumeSelectors = [
          'div.new-resume-detail--inner', // 主要的简历详情选择器
          '.resume-modal',
          '.modal',
          '[class*="resume"][class*="modal"]',
          '[class*="detail"][class*="modal"]',
          '.resume-content',
          '.cv-content',
          '.detail-content',
          '.resume-detail',
          '.candidate-detail'
        ];
        
        let foundResumeElements = 0;
        const foundSelectors = [];
        
        for (const selector of resumeSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            // 进一步检查元素是否可见
            for (const element of elements) {
              const rect = element.getBoundingClientRect();
              const style = window.getComputedStyle(element);
              const isVisible = rect.width > 0 && rect.height > 0 && 
                               style.display !== 'none' && 
                               style.visibility !== 'hidden' && 
                               parseFloat(style.opacity) > 0;
              if (isVisible) {
                foundResumeElements++;
                foundSelectors.push(selector);
                break; // 找到一个可见的就跳出
              }
            }
          }
        }
        
        return {
          hasResumeElements: foundResumeElements > 0,
          resumeElementCount: foundResumeElements,
          foundSelectors: foundSelectors
        };
      });
      
      // 方法3: 检查URL是否还在简历详情页面
      const currentUrl = this.page.url();
      const isResumeDetailUrl = currentUrl.includes('/resume/') || 
                               currentUrl.includes('/talent/') || 
                               currentUrl.includes('/candidate/') ||
                               currentUrl.includes('/detail/');
      
      logger.info('简历页面关闭检测结果:', {
        candidateList: candidateListIndicators,
        resumeDetails: resumeDetailElements,
        currentUrl: currentUrl,
        isResumeDetailUrl: isResumeDetailUrl
      });
      
      // 关闭成功的条件：
      // 1. 有候选人列表元素 且 没有简历详情元素
      // 2. 或者 URL不在简历详情页面 且 有候选人列表元素
      const isClosedSuccessfully = (
        (candidateListIndicators.hasListElements && !resumeDetailElements.hasResumeElements) ||
        (!isResumeDetailUrl && candidateListIndicators.hasListElements)
      );
      
      if (isClosedSuccessfully) {
        logger.info('✅ 简历页面已成功关闭，当前在候选人列表页面');
      } else {
        logger.warn('⚠️  简历页面仍然打开，需要继续尝试关闭');
      }
      
      return isClosedSuccessfully;
      
    } catch (error) {
      logger.error('检查简历页面关闭状态失败:', error);
      return false; // 发生错误时认为未关闭
    }
  }
  
  /**
   * 关闭简历弹窗或详情页 - 严格限制只使用ESC键
   */
  async closeResumeModal() {
    try {
      // 严格限制：只使用ESC键关闭简历页面，避免任何其他操作
      logger.info('正在使用ESC键关闭简历页面...');
      
      // 最多尝试3次ESC键，每次间隔1秒
      for (let i = 0; i < 3; i++) {
        await this.page.keyboard.press('Escape');
        await this.page.waitForTimeout(1000);
        
        // 检查是否成功关闭
        const isClosedSuccessfully = await this.checkResumeModalClosed();
        if (isClosedSuccessfully) {
          logger.info(`✅ ESC键成功关闭简历页面（第${i+1}次尝试）`);
          return;
        }
        
        logger.info(`ESC键尝试${i+1}次未成功，继续尝试...`);
      }
      
      logger.warn('⚠️  ESC键多次尝试后仍未成功关闭简历页面');
      
    } catch (error) {
      logger.warn('关闭简历页面失败:', error.message);
    }
  }
  
  /**
   * 提取简历内容
   */
  async extractResumeContent() {
    return await this.withErrorHandling(async () => {
      // 等待简历内容加载
      await this.safePageOperation(async () => {
        await this.page.waitForSelector('div.new-resume-detail--inner, .resume-content, .cv-content, .detail-content', { timeout: 10000 });
      }, '等待简历内容加载');
      
      // 提取简历文本内容
      const content = await this.safePageOperation(async () => {
        return await this.page.evaluate(() => {
          const contentSelectors = [
            // 用户定义的精确选择器（优先使用）
            'div.new-resume-detail--inner',
            
            // 原有选择器
            '.resume-content',
            '.cv-content', 
            '.detail-content',
            '.resume-detail',
            '.candidate-detail'
          ];
          
          for (const selector of contentSelectors) {
            const element = document.querySelector(selector);
            if (element) {
              return element.innerText || element.textContent;
            }
          }
          
          // 如果没有找到特定容器，提取整个页面的文本
          return document.body.innerText || document.body.textContent;
        });
      }, '提取简历文本内容');
      
      return content;
      
    }, '提取简历内容', 2);
  }
  
  /**
   * 保存简历到数据库
   * @param {Object} resumeData - 简历数据
   */
  async saveResumeToDatabase(resumeData) {
    try {
      const resume = new ResumeModel(resumeData);
      const savedResume = await resume.save();
      
      logger.info(`简历已保存到数据库: ${resumeData.name}`);
      return savedResume;
      
    } catch (error) {
      logger.error('保存简历到数据库失败:', error);
      throw error;
    }
  }
  
  /**
   * 停止简历处理
   */
  async stopResumeProcessing() {
    try {
      logger.info('正在停止智联招聘简历处理...');
      
      this.resumeProcessingStatus.isActive = false;
      this.resumeProcessingStatus.currentStep = 'stopped';
      this.isStopped = true; // 设置停止标志，阻止浏览器恢复机制
      
      logger.info('智联招聘简历处理已停止');
      
    } catch (error) {
      logger.error('停止简历处理失败:', error);
      throw error;
    }
  }
  
  /**
   * 设置剪贴板权限为允许
   * @param {Object} page - Playwright页面对象
   */


  /**
   * 尝试右键复制操作
   * @param {Object} page - Playwright页面对象
   * @returns {string|null} 复制的内容或null
   */


  /**
   * 通过直接API调用上传简历文件（带重试机制）
   * @param {string} filePath - 简历文件路径
   * @param {string} source - 简历来源，默认为'智联招聘'
   * @param {number} maxRetries - 最大重试次数，默认为3
   * @returns {Object} 上传结果
   */
  async uploadResumeViaAPI(filePath, source = '智联招聘', maxRetries = 3) {
    const fs = require('fs').promises;
    const FormData = require('form-data');
    const axios = require('axios');
    const path = require('path');
    
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`开始通过API上传简历文件 (尝试 ${attempt}/${maxRetries}): ${filePath}`);
        
        // 检查文件是否存在
        try {
          await fs.access(filePath);
        } catch (error) {
          throw new Error(`简历文件不存在: ${filePath}`);
        }
        
        // 读取文件
        const fileBuffer = await fs.readFile(filePath);
        const fileName = path.basename(filePath);
        
        // 验证文件大小（最大10MB）
        const maxFileSize = 10 * 1024 * 1024; // 10MB
        if (fileBuffer.length > maxFileSize) {
          throw new Error(`文件过大: ${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB，最大支持10MB`);
        }
        
        logger.info(`文件读取成功，大小: ${(fileBuffer.length / 1024).toFixed(2)}KB`);
        
        // 构造FormData
        const formData = new FormData();
        formData.append('file', fileBuffer, {
          filename: fileName,
          contentType: this.getContentType(fileName)
        });
        formData.append('source', source);
        
        // 调用后端API，根据尝试次数调整超时时间
        const timeout = Math.min(300000 + (attempt - 1) * 15000, 300000); // 300s到300s，优化简历解析超时
        const response = await axios.post('http://localhost:5001/api/resume-library/upload', formData, {
          headers: {
            ...formData.getHeaders(),
            'Content-Length': formData.getLengthSync()
          },
          timeout,
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        });
        
        if (response.data && response.data.success) {
          logger.info('简历文件API上传成功:', {
            filename: response.data.data.filename,
            resumeId: response.data.data.resumeId,
            parseStatus: response.data.data.parseStatus,
            qualityScore: response.data.data.qualityScore,
            attempt: attempt
          });
          
          return {
            success: true,
            data: response.data.data,
            message: `简历上传和解析成功 (尝试 ${attempt}/${maxRetries})`
          };
        } else {
          throw new Error(response.data?.error || '服务器返回失败状态');
        }
        
      } catch (error) {
        lastError = error;
        logger.warn(`API上传简历文件失败 (尝试 ${attempt}/${maxRetries}):`, error.message);
        
        // 对于某些错误类型，不进行重试
        if (error.message.includes('文件不存在') || 
            error.message.includes('文件过大') ||
            (error.response && error.response.status === 400)) {
          logger.error('遇到不可重试的错误，停止重试');
          break;
        }
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt < maxRetries) {
          const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // 指数退避，最大5秒
          logger.info(`等待 ${waitTime}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // 所有重试都失败了
    logger.error(`API上传简历文件最终失败，已尝试 ${maxRetries} 次:`, lastError);
    
    if (lastError.code === 'ECONNREFUSED') {
      throw new Error('无法连接到后端服务，请确保后端服务正在运行');
    } else if (lastError.code === 'ETIMEDOUT' || lastError.code === 'ENOTFOUND') {
      throw new Error('网络连接超时或DNS解析失败');
    } else if (lastError.response) {
      throw new Error(`服务器错误: ${lastError.response.status} - ${lastError.response.data?.error || lastError.response.statusText}`);
    } else {
      throw new Error(`上传失败: ${lastError.message}`);
    }
  }
  
  /**
   * 根据文件扩展名获取Content-Type
   * @param {string} fileName - 文件名
   * @returns {string} Content-Type
   */
  getContentType(fileName) {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return 'application/pdf';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      default:
        return 'application/octet-stream';
    }
  }
  
  /**
   * 获取最新下载的文件路径
   * @returns {string|null} 最新下载的文件路径或null
   */
  async getLatestDownloadedFile() {
    const fs = require('fs').promises;
    const path = require('path');
    
    try {
      // 检查下载目录是否存在
      if (!await this.directoryExists(this.downloadDir)) {
        logger.warn(`下载目录不存在: ${this.downloadDir}`);
        return null;
      }
      
      // 读取下载目录中的所有文件
      const files = await fs.readdir(this.downloadDir);
      
      if (files.length === 0) {
        logger.warn('下载目录中没有文件');
        return null;
      }
      
      // 过滤出简历文件（pdf, doc, docx）
      const resumeFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.pdf', '.doc', '.docx'].includes(ext);
      });
      
      if (resumeFiles.length === 0) {
        logger.warn('下载目录中没有简历文件');
        return null;
      }
      
      // 获取文件的修改时间并排序
      const fileStats = await Promise.all(
        resumeFiles.map(async (file) => {
          const filePath = path.join(this.downloadDir, file);
          const stats = await fs.stat(filePath);
          return {
            path: filePath,
            mtime: stats.mtime
          };
        })
      );
      
      // 按修改时间降序排序，获取最新的文件
      fileStats.sort((a, b) => b.mtime - a.mtime);
      const latestFile = fileStats[0];
      
      logger.info(`找到最新下载的文件: ${latestFile.path}`);
      return latestFile.path;
      
    } catch (error) {
      logger.error('获取最新下载文件失败:', error);
      return null;
    }
  }

  /**
   * 初始化完整流程
   */
  async initializeFullProcess() {
    try {
      logger.info('开始初始化智联招聘完整流程...');
      
      // 初始化浏览器
      await this.initializeBrowser();
      
      // 打开智联招聘网站
      await this.openZhilianWebsite();
      
      // 检查登录状态
      await this.checkLoginStatus();
      
      logger.info('智联招聘完整流程初始化完成');
      
    } catch (error) {
      logger.error('初始化智联招聘完整流程失败:', error);
      throw error;
    }
  }
}

module.exports = ZhilianService;