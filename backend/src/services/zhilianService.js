const { chromium } = require('playwright');
const logger = require('../utils/logger');
const ResumeModel = require('../models/resumeModel');
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
   */
  async initializeBrowser() {
    return await this.withErrorHandling(async () => {
      logger.info('正在初始化智联招聘浏览器...');
      
      this.browser = await chromium.launch({
        headless: false, // 显示浏览器界面，便于用户登录
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ],
        viewport: { width: 1920, height: 1080 }
      });
      
      const context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });
      
      this.page = await context.newPage();
      
      // 设置页面超时
      this.page.setDefaultTimeout(30000);
      this.page.setDefaultNavigationTimeout(30000);
      
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
        await this.page.waitForLoadState('networkidle');
        await this.waitForPageFullyLoaded();
      }, '导航到智联招聘网站');
      
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
   * 导航到简历搜索页面
   */
  async navigateToResumeSearch() {
    try {
      logger.info('正在导航到简历搜索页面...');
      
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
        await searchLink.click();
        await this.page.waitForLoadState('networkidle');
      } else {
        // 直接导航到简历搜索页面
        await this.page.goto('https://rd.zhaopin.com/resumepreview', {
          waitUntil: 'networkidle'
        });
      }
      
      await this.waitForPageFullyLoaded();
      logger.info('成功导航到简历搜索页面');
      
    } catch (error) {
      logger.error('导航到简历搜索页面失败:', error);
      throw error;
    }
  }

  /**
   * 开始候选人浏览
   * @param {string} mode - 浏览模式：'search', 'recommended', 'communication'
   * @param {object} filters - 筛选条件
   * @param {number} targetCount - 目标候选人数量
   */
  async startBrowsing(mode = 'search', filters = {}, targetCount = 50) {
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
      
      // 等待页面加载完成
      await this.page.waitForLoadState('networkidle');
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
      
      // 查找工作地点标签并点击
      const locationLabel = await this.page.$('div.keyword-panel-city_label');
      if (!locationLabel) {
        logger.warn('未找到工作地点筛选标签');
        return false;
      }
      
      await locationLabel.click();
      await this.page.waitForTimeout(1000);
      
      // 在输入框中输入地点
      const inputElement = await this.page.$('input.s-input_inner');
      if (!inputElement) {
        logger.warn('未找到地点输入框');
        return false;
      }
      
      await inputElement.fill(location);
      await this.page.waitForTimeout(500);
      
      // 点击确认按钮
      const confirmButton = await this.page.$('button.s-button.s-cascader_footer-button.s-button--primary.s-button--medium');
      if (!confirmButton) {
        logger.warn('未找到地点确认按钮');
        return false;
      }
      
      await confirmButton.click();
      await this.page.waitForTimeout(1000);
      
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
      
      // 查找职位选择器并点击
      const positionSelector = await this.page.$('div.app-job-selector.keyword-panel-job-selector.km-control.km-input.is-normal.km-select.km-select--pure');
      if (!positionSelector) {
        logger.warn('未找到职位选择器');
        return false;
      }
      
      await positionSelector.click();
      await this.page.waitForTimeout(1000);
      
      // 查找并点击对应的职位选项
      const optionSelectors = [
        `text="${position}"`,
        `[data-value="${position}"]`,
        `.option:has-text("${position}")`,
        `.item:has-text("${position}")`,
        `li:has-text("${position}")`,
        `span:has-text("${position}")`,
        `div:has-text("${position}")`
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
      await this.page.waitForLoadState('networkidle');
      
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
              
              await this.page.waitForLoadState('networkidle');
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
  async waitForPageFullyLoaded() {
    try {
      // 等待网络空闲
      await this.page.waitForLoadState('networkidle');
      
      // 额外等待确保页面稳定
      await this.page.waitForTimeout(2000);
      
      // 等待常见的加载指示器消失
      const loadingSelectors = ['.loading', '.spinner', '.loading-mask'];
      for (const selector of loadingSelectors) {
        try {
          await this.page.waitForSelector(selector, { state: 'hidden', timeout: 5000 });
        } catch (e) {
          // 加载指示器可能不存在，继续
        }
      }
      
    } catch (error) {
      logger.warn('等待页面加载完成时出现警告:', error.message);
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
      ...this.browsingStatus,
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
   * 导航到沟通页面
   */
  async navigateToCommunicationPage() {
    try {
      logger.info('正在导航到沟通页面...');
      
      // 智联招聘沟通页面的可能链接
      const communicationUrls = [
        'https://rd.zhaopin.com/communication',
        'https://rd.zhaopin.com/message',
        'https://rd.zhaopin.com/chat',
        'https://rd.zhaopin.com/app/communication'
      ];
      
      // 尝试直接导航到沟通页面
      for (const url of communicationUrls) {
        try {
          await this.page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
          await this.waitForPageFullyLoaded();
          
          // 检查是否成功到达沟通页面
          const hasCommunicationContent = await this.page.$('.communication, .message, .chat, [data-testid="communication"]');
          if (hasCommunicationContent) {
            logger.info('成功导航到沟通页面');
            return;
          }
        } catch (e) {
          logger.warn(`导航到 ${url} 失败: ${e.message}`);
        }
      }
      
      // 如果直接导航失败，尝试通过菜单导航
      const menuLinks = [
        'text="沟通"',
        'text="消息"',
        'text="聊天"',
        '[href*="communication"]',
        '[href*="message"]',
        '.nav-communication'
      ];
      
      for (const selector of menuLinks) {
        try {
          const link = await this.page.$(selector);
          if (link) {
            await link.click();
            await this.waitForPageFullyLoaded();
            logger.info('通过菜单成功导航到沟通页面');
            return;
          }
        } catch (e) {
          continue;
        }
      }
      
      throw new Error('无法导航到沟通页面');
      
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
   * 处理沟通候选人
   * @param {number} targetCount - 目标数量
   */
  async processCommunicationCandidates(targetCount) {
    try {
      logger.info(`开始处理沟通候选人，目标数量: ${targetCount}`);
      
      let processedCount = 0;
      
      while (processedCount < targetCount && this.browsingStatus.isActive) {
        // 检查服务是否已停止
        if (this.isStopped) {
          logger.info('服务已停止，退出沟通候选人处理循环');
          break;
        }
        
        // 等待页面加载完成
        await this.waitForPageFullyLoaded();
        
        // 获取沟通候选人列表
        const candidateElements = await this.getCandidateElements();
        
        if (candidateElements.length === 0) {
          logger.info('没有找到更多沟通候选人');
          break;
        }
        
        // 处理当前页面的候选人
        for (let i = 0; i < candidateElements.length && processedCount < targetCount && this.browsingStatus.isActive; i++) {
          // 检查服务是否已停止
          if (this.isStopped) {
            logger.info('服务已停止，退出收藏候选人处理循环');
            break;
          }
          
          try {
            const candidateInfo = await this.extractCandidateInfo(candidateElements[i], processedCount + 1);
            
            if (candidateInfo) {
              candidateInfo.source = 'communication';
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
                  mode: 'communication'
                });
              }
              
              // 检查是否达到目标数量
              if (processedCount >= targetCount) {
                logger.info(`沟通候选人已达到目标简历数量 ${targetCount}，自动停止采集`);
                this.browsingStatus.isActive = false;
                break;
              }
            }
            
            // 反爬虫延迟
            await this.randomDelay();
            
          } catch (error) {
            logger.error(`处理第 ${i + 1} 个沟通候选人失败:`, error);
            this.browsingStatus.failedCount++;
          }
        }
        
        // 尝试加载更多沟通记录
        const hasMore = await this.loadMoreCommunication();
        if (!hasMore) {
          logger.info('没有更多沟通候选人');
          break;
        }
      }
      
      logger.info(`沟通候选人处理完成，共处理 ${processedCount} 个候选人`);
      
    } catch (error) {
      logger.error('处理沟通候选人失败:', error);
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
  async recoverFromConnectionError() {
    try {
      // 检查服务是否已停止，如果已停止则不执行恢复
      if (this.isStopped) {
        logger.info('服务已停止，跳过浏览器恢复机制');
        return false;
      }
      
      logger.warn('检测到智联招聘连接错误，开始执行恢复机制...');
      
      // 关闭现有浏览器
      await this.closeBrowser();
      
      // 重置状态
      this.currentStatus = 'recovering';
      this.isLoggedIn = false;
      this.page = null;
      this.browser = null;
      
      // 重置浏览状态
      this.browsingStatus.isActive = false;
      this.browsingStatus.candidates = [];
      this.browsingStatus.processedCount = 0;
      this.browsingStatus.collectedCount = 0;
      this.browsingStatus.failedCount = 0;
      
      // 重置简历处理状态
      this.resumeProcessingStatus.isActive = false;
      this.resumeProcessingStatus.resumes = [];
      this.resumeProcessingStatus.processedCount = 0;
      this.resumeProcessingStatus.successCount = 0;
      this.resumeProcessingStatus.failedCount = 0;
      
      // 等待一段时间后重新初始化
      logger.info('等待8秒后重新初始化智联招聘浏览器...');
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // 重新初始化浏览器
      await this.initializeBrowser();
      
      // 重新打开智联招聘网站
      await this.openZhilianWebsite();
      
      // 检查登录状态
      await this.checkLoginStatus();
      
      // 如果需要，重新导航到简历搜索页面
      if (this.lastCandidateListUrl && this.lastCandidateListUrl.includes('zhaopin.com')) {
        logger.info('尝试返回到上次的候选人列表页面...');
        try {
          await this.page.goto(this.lastCandidateListUrl, { waitUntil: 'networkidle', timeout: 30000 });
          await this.waitForPageFullyLoaded();
        } catch (navError) {
          logger.warn('无法返回到上次页面，重新导航到搜索页面:', navError.message);
          await this.navigateToResumeSearch();
        }
      } else {
        await this.navigateToResumeSearch();
      }
      
      logger.info('智联招聘浏览器恢复完成');
      return true;
      
    } catch (error) {
      logger.error('智联招聘连接错误恢复失败:', error);
      this.currentStatus = 'error';
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
   */
  isConnectionError(error) {
    const connectionErrorPatterns = [
      'Target closed',
      'Protocol error',
      'Session closed',
      'Navigation timeout',
      'Connection closed',
      'Browser has been closed',
      'Page has been closed',
      'Execution context was destroyed',
      'Cannot find context with specified id',
      'Target page, context or browser has been closed',
      'elementHandle.click: Target page, context or browser has been closed',
      'Timeout',
      'net::ERR_',
      'Page crashed',
      '页面已关闭或不可用',
      '浏览器连接已断开',
      '候选人元素已从DOM中分离'
    ];
    
    return connectionErrorPatterns.some(pattern => 
      error.message && error.message.includes(pattern)
    );
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
          
          // 确保元素仍然可用
          try {
            await clickableElement.isVisible();
          } catch (error) {
            throw new Error('候选人元素已从DOM中分离或不可见');
          }
          
          // 滚动到元素可见位置
          await clickableElement.scrollIntoViewIfNeeded();
          await this.smartRandomDelay('scroll');
          
          // 模拟人类行为
          await this.simulateHumanBehavior();
          
          // 点击前的智能延迟
          await this.smartRandomDelay('click');
          
          // 点击元素
          await clickableElement.click();
          
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
      
      // 如果没有找到链接，尝试点击整个候选人元素
      return candidateElement;
      
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
        await frontendPage.waitForLoadState('domcontentloaded');
        logger.info(`第 ${index} 个候选人：前端应用加载完成`);
        
        // 2. 导航到简历列表页面
        logger.info(`第 ${index} 个候选人：正在导航到简历列表页面...`);
        await this.navigateToResumeList(frontendPage);
        logger.info(`第 ${index} 个候选人：简历列表页面导航完成`);
        
        // 3. 点击上传简历按钮
        logger.info(`第 ${index} 个候选人：正在点击上传简历按钮...`);
        await this.clickUploadResumeButton(frontendPage);
        logger.info(`第 ${index} 个候选人：上传简历按钮点击完成`);
        
        // 4. 粘贴简历内容到文本框
        logger.info(`第 ${index} 个候选人：正在粘贴简历内容...`);
        await this.pasteResumeContent(frontendPage, resumeContent);
        logger.info(`第 ${index} 个候选人：简历内容粘贴完成`);
        
        // 5. 点击解析简历按钮
        logger.info(`第 ${index} 个候选人：正在点击解析简历按钮...`);
        await this.clickParseResumeButton(frontendPage);
        logger.info(`第 ${index} 个候选人：解析简历按钮点击完成`);
        
        // 6. 等待解析完成并点击确认添加
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
   * 粘贴简历内容到文本框
   * @param {Page} frontendPage - 前端页面对象
   * @param {string} resumeContent - 简历内容
   */
  async pasteResumeContent(frontendPage, resumeContent) {
    await this.safePageOperation(async () => {
      const textareaSelectors = [
        'textarea[placeholder*="简历"]',
        'textarea[placeholder*="内容"]',
        'textarea[name*="content"]',
        'textarea[name*="resume"]',
        '.resume-textarea',
        '.content-textarea',
        'textarea'
      ];
      
      for (const selector of textareaSelectors) {
        try {
          const element = await frontendPage.$(selector);
          if (element) {
            await element.click();
            await element.fill(resumeContent);
            return;
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }
      
      throw new Error('未找到简历内容输入框');
      
    }, '粘贴简历内容');
  }
  
  /**
   * 点击解析简历按钮
   * @param {Page} frontendPage - 前端页面对象
   */
  async clickParseResumeButton(frontendPage) {
    await this.safePageOperation(async () => {
      const parseButtonSelectors = [
        'button:has-text("解析简历")',
        'button:has-text("解析")',
        'button:has-text("分析")',
        '.parse-btn',
        '.analyze-btn',
        'button[class*="parse"]',
        'button[class*="analyze"]'
      ];
      
      for (const selector of parseButtonSelectors) {
        try {
          const element = await frontendPage.$(selector);
          if (element) {
            await element.click();
            return;
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }
      
      throw new Error('未找到解析简历按钮');
      
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
   * 返回智联招聘页面
   */
  async returnToZhilianPage() {
    await this.safePageOperation(async () => {
      // 尝试关闭当前简历页面的弹窗或返回按钮
      await this.closeResumeModal();
      
      if (this.lastCandidateListUrl) {
        await this.page.goto(this.lastCandidateListUrl, { waitUntil: 'networkidle', timeout: 15000 });
      } else {
        // 如果没有记录的URL，尝试返回搜索页面
        await this.navigateToResumeSearch();
      }
      
      await this.waitForPageFullyLoaded();
      
      // 点击前的智能延迟
      await this.smartRandomDelay('click');
      
      // 点击空白位置确保返回候选人列表
      await this.page.click('body', { position: { x: 100, y: 100 } });
      
      // 按照用户要求，智能等待后再继续处理下一个候选人
      logger.info('智能等待后继续处理下一个候选人...');
      await this.smartRandomDelay('navigation');
      
      // 模拟人类查看候选人列表的行为
      await this.simulateHumanBehavior();
      
    }, '返回智联招聘页面');
  }
  
  /**
   * 按顺序处理搜索结果中的候选人（从上往下）
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
        
        // 获取当前页面的候选人元素
        const candidateElements = await this.getCandidateElements();
        
        if (!candidateElements || candidateElements.length === 0) {
          logger.warn('当前页面没有找到候选人元素');
          break;
        }
        
        logger.info(`当前页面找到 ${candidateElements.length} 个候选人`);
        
        // 按顺序从上往下处理每个候选人
        for (let i = 0; i < candidateElements.length && totalProcessed < targetCount; i++) {
          // 检查服务是否已停止
          if (this.isStopped) {
            logger.info('服务已停止，退出候选人处理循环');
            break;
          }
          
          const candidateElement = candidateElements[i];
          const candidateIndex = totalProcessed + 1;
          
          try {
            logger.info(`开始处理第 ${candidateIndex} 个候选人（页面第 ${i + 1} 个）`);
            
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
            
          } catch (error) {
            logger.error(`处理第 ${candidateIndex} 个候选人时出错:`, error);
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
   * 关闭简历弹窗或详情页
   */
  async closeResumeModal() {
    try {
      // 首先尝试按ESC键关闭简历页面（最可靠的方式）
      logger.info('尝试按ESC键关闭简历页面');
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(1000); // 等待关闭动画完成
      
      // 检查是否成功关闭（通过检查简历页面是否还存在）
      try {
        const resumeModal = await this.page.$('.resume-modal, .modal, [class*="resume"][class*="modal"], [class*="detail"][class*="modal"]');
        if (!resumeModal) {
          logger.info('ESC键成功关闭简历页面');
          return;
        }
      } catch (e) {
        // 检查失败，继续尝试其他方式
      }
      
      // 如果ESC键未能关闭，检测并调整页面缩放比例，确保关闭按钮可见
      try {
        const currentZoom = await this.page.evaluate(() => {
          return Math.round(window.devicePixelRatio * 100);
        });
        logger.info(`当前页面缩放比例: ${currentZoom}%`);
        
        // 如果缩放比例为100%，调整为90%以确保关闭按钮可见
        if (currentZoom >= 100) {
          await this.page.evaluate(() => {
            document.body.style.zoom = '0.9';
          });
          logger.info('已将页面缩放调整为90%以确保关闭按钮可见');
          await this.page.waitForTimeout(500); // 等待缩放生效
        }
      } catch (e) {
        logger.warn('调整页面缩放失败:', e.message);
      }
      
      // 尝试点击用户指定的关闭按钮
      try {
        const closeButton = await this.page.$('i.km-icon.sati.sati-times-circle-s');
        if (closeButton) {
          // 使用更准确的可见性检查方法
          const elementInfo = await closeButton.evaluate(el => {
            const rect = el.getBoundingClientRect();
            const style = window.getComputedStyle(el);
            return {
              visible: rect.width > 0 && rect.height > 0,
              display: style.display,
              visibility: style.visibility,
              opacity: style.opacity,
              position: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
              }
            };
          });
          
          logger.info('km-icon关闭按钮状态:', elementInfo);
          
          // 如果按钮有尺寸且不是隐藏状态，尝试点击
          if (elementInfo.visible && 
              elementInfo.display !== 'none' && 
              elementInfo.visibility !== 'hidden' && 
              parseFloat(elementInfo.opacity) > 0) {
            try {
              await closeButton.click();
              logger.info('通过点击km-icon关闭按钮关闭简历页面');
              await this.page.waitForTimeout(500);
              return;
            } catch (clickError) {
              logger.warn('点击km-icon关闭按钮时出错:', clickError.message);
              // 尝试强制点击
              try {
                await closeButton.click({ force: true });
                logger.info('通过强制点击km-icon关闭按钮关闭简历页面');
                await this.page.waitForTimeout(500);
                return;
              } catch (forceClickError) {
                logger.warn('强制点击km-icon关闭按钮也失败:', forceClickError.message);
              }
            }
          } else {
            logger.warn('km-icon关闭按钮存在但状态不可点击');
          }
        } else {
          logger.warn('未找到km-icon关闭按钮');
        }
      } catch (e) {
        logger.warn('点击km-icon关闭按钮失败:', e.message);
      }
      
      // 尝试多种关闭简历页面的方式
      const closeSelectors = [
        '.close-btn',
        '.modal-close',
        '.btn-close',
        '[class*="close"]',
        '[class*="back"]',
        'button:has-text("关闭")',
        'button:has-text("返回")',
        'button:has-text("×")',
        '.icon-close',
        '.fa-close',
        '.fa-times',
        'text="关闭"',
        'text="返回"',
        'text="×"'
      ];
      
      for (const selector of closeSelectors) {
        try {
          const closeButton = await this.page.$(selector);
          if (closeButton) {
            await closeButton.click();
            logger.info(`使用选择器 ${selector} 关闭简历页面`);
            await this.page.waitForTimeout(500);
            return;
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }
      
      // 最后再次尝试按ESC键
      logger.info('所有关闭按钮都失败，再次尝试按ESC键关闭');
      await this.page.keyboard.press('Escape');
      await this.page.waitForTimeout(500);
      
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