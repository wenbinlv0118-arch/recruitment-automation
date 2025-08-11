const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs-extra');
const PopupHandler = require('./popupHandler');
const ElementFinder = require('./elementFinder');
const GeetestHandler = require('./geetestHandler');

class CompanySearchService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.isActive = false;
    this.sessionId = null;
    this.storageDir = path.join(__dirname, '../../storage/company-search');
    
    // 确保存储目录存在
    fs.ensureDirSync(this.storageDir);
    console.log(`公司搜索存储目录: ${this.storageDir}`);
    
    // 初始化处理器
    this.popupHandler = null;
    this.elementFinder = null;
    this.geetestHandler = null;
    
    // 搜索配置
    this.searchConfig = {
      timeout: 45000,
      slowMo: 1000,
      headless: false
    };
  }

  /**
   * 启动公司搜索流程
   */
  async startCompanySearch(socket, data) {
    try {
      // 检查服务状态
      if (this.isActive) {
        throw new Error('公司搜索功能正在运行中');
      }

      // 检查智能寻聘是否在运行（需要引入zhilianService）
      const zhilianService = require('./zhilianService');
      if (zhilianService.isActive) {
        throw new Error('智能寻聘功能正在运行，请稍后再试');
      }

      this.isActive = true;
      this.sessionId = `company-search-${Date.now()}`;
      
      socket.emit('companySearchStatus', { 
        status: 'starting', 
        message: '正在启动公司搜索服务...',
        sessionId: this.sessionId
      });

      // 启动浏览器
      await this.startBrowser(socket);
      
      // 执行登录流程
      await this.performLogin(socket, data);
      
      // 导航到搜索页面
      await this.navigateToSearchPage(socket);
      
      // 检查是否有筛选条件
      if (data.filters && Object.keys(data.filters).length > 0) {
        socket.emit('companySearchStatus', { 
          status: 'applying_filters', 
          message: '正在应用筛选条件...',
          sessionId: this.sessionId
        });
        
        // 自动应用筛选条件并执行搜索
        await this.executeSearch(socket, data.filters);
      } else {
        // 等待用户配置筛选条件
        socket.emit('companySearchStatus', { 
          status: 'waiting_filter_config', 
          message: '请配置公司筛选条件',
          requiresFilterConfig: true,
          sessionId: this.sessionId
        });
      }

    } catch (error) {
      console.error('启动公司搜索失败:', error);
      socket.emit('companySearchError', { 
        message: `启动失败: ${error.message}`,
        sessionId: this.sessionId
      });
      await this.cleanup();
    }
  }

  /**
   * 启动浏览器
   */
  async startBrowser(socket) {
    try {
      socket.emit('companySearchStatus', { 
        status: 'browser_starting', 
        message: '正在启动浏览器...',
        sessionId: this.sessionId
      });

      this.browser = await chromium.launch({
        headless: false,
        slowMo: 1000,
        args: [
          '--disable-extensions',
          '--disable-plugins',
          '--disable-dev-shm-usage',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=TranslateUI',
          '--disable-ipc-flooding-protection',
          '--window-size=1920,1080',
          '--start-maximized',
          '--disable-web-security',
          '--allow-running-insecure-content',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      // 创建新的上下文，设置更好的窗口管理
      const context = await this.browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai',
        permissions: ['geolocation', 'notifications'],
        extraHTTPHeaders: {
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        }
      });

      this.page = await context.newPage();
      await this.page.context().setDefaultTimeout(30000);

      // 初始化处理器
      this.initHandlers();

      // 设置页面事件监听器
      this.setupPageEventListeners(socket);

      socket.emit('companySearchStatus', { 
        status: 'browser_ready', 
        message: '浏览器启动完成，准备开始搜索',
        sessionId: this.sessionId
      });

    } catch (error) {
      console.error('启动浏览器失败:', error);
      throw new Error(`启动浏览器失败: ${error.message}`);
    }
  }

  /**
   * 执行登录流程
   */
  async performLogin(socket, data) {
    try {
      socket.emit('companySearchStatus', { 
        status: 'navigating', 
        message: '正在打开智联招聘登录页面...',
        sessionId: this.sessionId
      });

      await this.page.goto('https://passport.zhaopin.com/login');
      await this.page.waitForLoadState('networkidle');
      await this.page.screenshot({ path: path.join(this.storageDir, 'login_page.png') });

      // 输入手机号
      socket.emit('companySearchStatus', { 
        status: 'inputting_phone', 
        message: '正在输入手机号...',
        sessionId: this.sessionId
      });

      const phone = data.phone || '15675156459';
      const phoneInput = await this.elementFinder.findElement([
        'input[placeholder*="手机"]', 
        'input[type="tel"]', 
        'input[name*="phone"]'
      ]);
      
      if (!phoneInput) throw new Error('无法找到手机号输入框');
      
      await phoneInput.clear();
      await phoneInput.fill(phone);
      console.log(`已输入手机号: ${phone}`);

      // 处理极验验证码
      socket.emit('companySearchStatus', { 
        status: 'checking_geetest', 
        message: '检查验证码...',
        sessionId: this.sessionId
      });

      const hasGeetest = await this.geetestHandler.handleGeetest(socket);
      if (hasGeetest) {
        console.log('极验验证码处理完成');
      }

      // 勾选用户协议
      socket.emit('companySearchStatus', { 
        status: 'checking_agreement', 
        message: '正在勾选用户协议...',
        sessionId: this.sessionId
      });

      await this.checkAgreement();

      // 等待用户输入验证码
      socket.emit('companySearchStatus', { 
        status: 'waiting_code', 
        message: '请手动点击发送验证码按钮，然后输入收到的验证码',
        requiresInput: true,
        sessionId: this.sessionId
      });

      // 等待登录完成
      await this.waitForLogin(socket);

    } catch (error) {
      throw new Error(`登录失败: ${error.message}`);
    }
  }

  /**
   * 检查并勾选用户协议
   */
  async checkAgreement() {
    try {
      const agreement = await this.elementFinder.findElement([
        'input[type="checkbox"]', 
        '[class*="agreement"]'
      ]);
      
      if (agreement && !(await agreement.isChecked())) {
        try {
          await agreement.check();
          console.log('已勾选用户协议');
        } catch (error) {
          console.log('常规勾选失败，尝试JavaScript方式:', error.message);
          await this.page.evaluate((element) => {
            try {
              element.checked = true;
              element.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            } catch (error) {
              console.error('JavaScript执行错误:', error);
              return false;
            }
          }, agreement);
          console.log('通过JavaScript勾选用户协议');
        }
      }
    } catch (error) {
      console.log('勾选用户协议时出错，继续执行:', error.message);
    }
  }

  /**
   * 等待登录完成
   */
  async waitForLogin(socket) {
    try {
      socket.emit('companySearchStatus', { 
        status: 'checking_login', 
        message: '正在检查登录状态...',
        sessionId: this.sessionId
      });
      
      await this.page.waitForTimeout(3000);
      
      const isLoggedIn = await this.checkLoginStatus();
      if (isLoggedIn) {
        socket.emit('companySearchStatus', { 
          status: 'login_success', 
          message: '登录成功！正在准备公司搜索...',
          sessionId: this.sessionId
        });
      } else {
        const currentUrl = this.page.url();
        if (currentUrl.includes('i.zhaopin.com') || currentUrl.includes('zhaopin.com')) {
          console.log('页面已跳转，可能登录成功');
          socket.emit('companySearchStatus', { 
            status: 'login_success', 
            message: '检测到页面跳转，继续执行...',
            sessionId: this.sessionId
          });
        } else {
          throw new Error('登录失败，请检查验证码是否正确');
        }
      }
    } catch (error) {
      throw new Error(`登录状态检查失败: ${error.message}`);
    }
  }

  /**
   * 检查登录状态
   */
  async checkLoginStatus() {
    try {
      const currentUrl = this.page.url();
      if (currentUrl.includes('i.zhaopin.com')) {
        console.log('已跳转到登录后页面，登录成功');
        return true;
      }

      const loginIndicators = ['.user-avatar', '.avatar', '[class*="user"]', 'text=我的', 'text=个人中心'];
      for (const selector of loginIndicators) {
        const element = await this.elementFinder.findElement([selector]);
        if (element) return true;
      }

      console.log('未找到明确的登录标识，登录可能失败');
      return false;
    } catch (error) {
      console.error('检查登录状态时出错:', error);
      return false;
    }
  }

  /**
   * 导航到搜索页面
   */
  async navigateToSearchPage(socket) {
    try {
      socket.emit('companySearchStatus', { 
        status: 'navigating_search', 
        message: '正在导航到职位搜索页面...',
        sessionId: this.sessionId
      });

      // 导航到智联招聘职位搜索页面
      await this.page.goto('https://sou.zhaopin.com/');
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(3000);
      
      // 处理可能的弹窗
      await this.popupHandler.detectPopups();
      await this.popupHandler.closePopups(socket);
      
      // 等待页面完全加载
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(2000);
      
      // 尝试查找搜索框，确认页面已正确加载
      const searchBoxSelectors = [
        'input[placeholder*="搜索"]',
        'input[placeholder*="Search"]',
        'input[type="text"]',
        '.search-input',
        '.search-box input',
        '[class*="search"] input'
      ];
      
      let searchBoxFound = false;
      for (const selector of searchBoxSelectors) {
        try {
          const searchBox = await this.page.$(selector);
          if (searchBox) {
            console.log(`找到搜索框: ${selector}`);
            searchBoxFound = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!searchBoxFound) {
        console.warn('未找到搜索框，页面可能未完全加载');
        // 等待更长时间
        await this.page.waitForTimeout(3000);
      }
      
      await this.page.screenshot({ path: path.join(this.storageDir, 'search_page.png') });
      
      socket.emit('companySearchStatus', { 
        status: 'search_page_ready', 
        message: '搜索页面准备完成',
        sessionId: this.sessionId
      });

    } catch (error) {
      throw new Error(`导航到搜索页面失败: ${error.message}`);
    }
  }

  /**
   * 执行搜索并应用筛选条件
   */
  async executeSearch(socket, filterConfig) {
    try {
      socket.emit('companySearchStatus', { 
        status: 'applying_filters', 
        message: '正在应用筛选条件...',
        sessionId: this.sessionId
      });

      // 确保页面已完全加载
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(3000);
      
              // 应用筛选条件
        await this.applyFilters(socket, filterConfig);
      
      // 等待筛选条件生效
      await this.page.waitForTimeout(2000);
      
      // 执行搜索
      await this.performSearch();
      
      // 等待搜索结果加载
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(3000);
      
      // 提取搜索结果
      const companies = await this.extractCompanyResults();
      
      // 使用AI分析推荐
      const recommendations = await this.analyzeAndRecommend(companies, filterConfig);
      
      socket.emit('companySearchResults', {
        status: 'completed',
        companies: companies,
        recommendations: recommendations,
        sessionId: this.sessionId
      });

      return { companies, recommendations };

    } catch (error) {
      console.error('执行搜索失败:', error);
      socket.emit('companySearchError', { 
        message: `搜索失败: ${error.message}`,
        sessionId: this.sessionId
      });
      throw error;
    }
  }

  /**
   * 应用筛选条件
   */
  async applyFilters(socket, filterConfig) {
    try {
      const { 
        industry, 
        location, 
        companySize, 
        salaryRange, 
        experience, 
        education, 
        companyNature, 
        fundingStage, 
        publishTime, 
        jobType, 
        benefits 
      } = filterConfig;
      
      console.log('开始应用筛选条件:', filterConfig);
      
      // 等待页面完全加载
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(3000);
      
      // 首先分析页面结构，找到实际的筛选器
      const pageStructure = await this.analyzePageStructure();
      console.log('页面结构分析结果:', pageStructure);
      
      // 获取页面筛选器信息
      const filterInfo = await this.getPageFilterInfo();
      if (filterInfo) {
        console.log('页面筛选器信息:', {
          elements: filterInfo.filterElements.length,
          texts: filterInfo.filterTexts.slice(0, 5),
          classes: filterInfo.filterClasses.slice(0, 5)
        });
      }
      
      // 等待筛选器容器加载 - 使用更智能的选择器策略
      const filterContainer = await this.findFilterContainer();
      
      if (!filterContainer) {
        console.warn('未找到筛选器容器，尝试直接应用筛选器');
      }
      
      // 应用行业筛选
      if (industry && industry.length > 0) {
        socket.emit('company_search_progress', {
          type: 'filter_progress',
          message: `正在应用行业筛选: ${industry.join(', ')}`,
          sessionId: this.sessionId
        });
        
        const industrySuccess = await this.retryFilterApplication('industry', industry, pageStructure);
        if (!industrySuccess) {
          console.warn('行业筛选应用失败');
        }
      }
      
      // 应用地区筛选
      if (location && location.length > 0) {
        socket.emit('company_search_progress', {
          type: 'filter_progress',
          message: `正在应用地区筛选: ${location.join(', ')}`,
          sessionId: this.sessionId
        });
        
        const locationSuccess = await this.retryFilterApplication('location', location, pageStructure);
        if (!locationSuccess) {
          console.warn('地区筛选应用失败');
        }
      }
      
      // 应用公司规模筛选
      if (companySize && companySize.length > 0) {
        socket.emit('company_search_progress', {
          type: 'filter_progress',
          message: `正在应用公司规模筛选: ${companySize.join(', ')}`,
          sessionId: this.sessionId
        });
        
        const sizeSuccess = await this.retryFilterApplication('company-size', companySize, pageStructure);
        if (!sizeSuccess) {
          console.warn('公司规模筛选应用失败');
        }
      }
      
      // 应用薪资范围筛选
      if (salaryRange && salaryRange.length > 0) {
        socket.emit('company_search_progress', {
          type: 'filter_progress',
          message: `正在应用薪资范围筛选: ${salaryRange.join(', ')}`,
          sessionId: this.sessionId
        });
        
        const salarySuccess = await this.retryFilterApplication('salary-range', salaryRange, pageStructure);
        if (!salarySuccess) {
          console.warn('薪资范围筛选应用失败');
        }
      }
      
      // 应用经验要求筛选
      if (experience && experience.length > 0) {
        socket.emit('company_search_progress', {
          type: 'filter_progress',
          message: `正在应用经验要求筛选: ${experience.join(', ')}`,
          sessionId: this.sessionId
        });
        
        const expSuccess = await this.retryFilterApplication('experience', experience, pageStructure);
        if (!expSuccess) {
          console.warn('经验要求筛选应用失败');
        }
      }
      
      // 应用学历要求筛选
      if (education && education.length > 0) {
        socket.emit('company_search_progress', {
          type: 'filter_progress',
          message: `正在应用学历要求筛选: ${education.join(', ')}`,
          sessionId: this.sessionId
        });
        
        const eduSuccess = await this.retryFilterApplication('education', education, pageStructure);
        if (!eduSuccess) {
          console.warn('学历要求筛选应用失败');
        }
      }
      
      // 应用公司性质筛选
      if (companyNature && companyNature.length > 0) {
        socket.emit('company_search_progress', {
          type: 'filter_progress',
          message: `正在应用公司性质筛选: ${companyNature.join(', ')}`,
          sessionId: this.sessionId
        });
        
        const natureSuccess = await this.retryFilterApplication('company-nature', companyNature, pageStructure);
        if (!natureSuccess) {
          console.warn('公司性质筛选应用失败');
        }
      }
      
      // 应用融资阶段筛选
      if (fundingStage && fundingStage.length > 0) {
        socket.emit('company_search_progress', {
          type: 'filter_progress',
          message: `正在应用融资阶段筛选: ${fundingStage.join(', ')}`,
          sessionId: this.sessionId
        });
        
        const fundingSuccess = await this.retryFilterApplication('funding-stage', fundingStage, pageStructure);
        if (!fundingSuccess) {
          console.warn('融资阶段筛选应用失败');
        }
      }
      
      // 应用发布时间筛选
      if (publishTime && publishTime.length > 0) {
        socket.emit('company_search_progress', {
          type: 'filter_progress',
          message: `正在应用发布时间筛选: ${publishTime.join(', ')}`,
          sessionId: this.sessionId
        });
        
        const timeSuccess = await this.retryFilterApplication('publish-time', publishTime, pageStructure);
        if (!timeSuccess) {
          console.warn('发布时间筛选应用失败');
        }
      }
      
      // 应用职位类型筛选
      if (jobType && jobType.length > 0) {
        socket.emit('company_search_progress', {
          type: 'filter_progress',
          message: `正在应用职位类型筛选: ${jobType.join(', ')}`,
          sessionId: this.sessionId
        });
        
        const typeSuccess = await this.retryFilterApplication('job-type', jobType, pageStructure);
        if (!typeSuccess) {
          console.warn('职位类型筛选应用失败');
        }
      }
      
      // 应用福利待遇筛选
      if (benefits && benefits.length > 0) {
        socket.emit('company_search_progress', {
          type: 'filter_progress',
          message: `正在应用福利待遇筛选: ${benefits.join(', ')}`,
          sessionId: this.sessionId
        });
        
        const benefitsSuccess = await this.retryFilterApplication('benefits', benefits, pageStructure);
        if (!benefitsSuccess) {
          console.warn('福利待遇筛选应用失败');
        }
      }
      
      // 等待所有筛选器应用完成
      await this.page.waitForTimeout(3000);
      
      // 尝试点击搜索按钮
      await this.clickSearchButton();
      
      socket.emit('company_search_progress', {
        type: 'filter_complete',
        message: '筛选条件应用完成，正在搜索...',
        sessionId: this.sessionId
      });
      
      console.log('所有筛选条件应用完成');
      
    } catch (error) {
      console.error('应用筛选条件失败:', error);
      socket.emit('company_search_progress', {
        type: 'filter_error',
        message: `筛选条件应用失败: ${error.message}`,
        sessionId: this.sessionId
      });
      throw error;
    }
  }

  /**
   * 分析页面结构，找到实际的筛选器元素
   */
  async analyzePageStructure() {
    try {
      console.log('开始分析页面结构...');
      
      // 获取页面所有文本内容，分析筛选器结构
      const pageText = await this.page.evaluate(() => {
        const allElements = document.querySelectorAll('*');
        const filterElements = [];
        
        // 查找可能包含筛选器文本的元素
        const filterKeywords = [
          '行业', '地区', '规模', '薪资', '经验', '学历', '性质', '融资', '时间', '类型', '福利',
          'Industry', 'Location', 'Size', 'Salary', 'Experience', 'Education', 'Nature', 'Funding', 'Time', 'Type', 'Benefits'
        ];
        
        allElements.forEach(element => {
          const text = element.textContent?.trim();
          if (text && filterKeywords.some(keyword => text.includes(keyword))) {
            // 分析元素的属性
            const attributes = {};
            for (let attr of element.attributes) {
              attributes[attr.name] = attr.value;
            }
            
            filterElements.push({
              tagName: element.tagName,
              className: element.className,
              id: element.id,
              text: text,
              attributes: attributes,
              xpath: getXPath(element)
            });
          }
        });
        
        // 获取XPath的辅助函数
        function getXPath(element) {
          if (element.id !== '') {
            return `//*[@id="${element.id}"]`;
          }
          if (element === document.body) {
            return '/html/body';
          }
          let ix = 0;
          let siblings = element.parentNode.childNodes;
          for (let sibling of siblings) {
            if (sibling === element) {
              return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
            }
            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
              ix++;
            }
          }
        }
        
        return filterElements;
      });
      
      console.log('页面筛选器元素分析:', pageText);
      
      // 分析筛选器的层级结构
      const filterStructure = await this.page.evaluate(() => {
        const structure = {};
        
        // 查找筛选器容器
        const containers = [
          '.filter-container', '.filter-wrapper', '.filter-panel',
          '.search-filter', '.filter-box', '[class*="filter"]',
          '.zppp-filter', '.filter-list', '.filter-item',
          '.filter-options', '.search-options', '.filter-section',
          '.search-conditions', '.condition-list', '.condition-item'
        ];
        
        containers.forEach(selector => {
          try {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
              structure[selector] = {
                count: elements.length,
                elements: Array.from(elements).map(el => ({
                  tagName: el.tagName,
                  className: el.className,
                  text: el.textContent?.trim(),
                  children: el.children.length
                }))
              };
            }
          } catch (e) {
            // 忽略选择器错误
          }
        });
        
        return structure;
      });
      
      console.log('筛选器容器结构:', filterStructure);
      
      return {
        filterElements: pageText,
        filterStructure: filterStructure
      };
      
    } catch (error) {
      console.error('分析页面结构失败:', error);
      return { filterElements: [], filterStructure: {} };
    }
  }

  /**
   * 智能查找筛选器容器
   */
  async findFilterContainer() {
    const containerSelectors = [
      '.filter-container',
      '.filter-wrapper',
      '.filter-panel',
      '.filter-section',
      '.filter-area',
      '.filter-box',
      '.filter-list',
      '.filter-group',
      '[class*="filter"]',
      '[id*="filter"]',
      '.search-filter',
      '.job-filter',
      '.company-filter',
      '.filter-content'
    ];

    for (const selector of containerSelectors) {
      try {
        const container = await this.page.$(selector);
        if (container && await container.isVisible()) {
          console.log(`找到筛选器容器: ${selector}`);
          return container;
        }
      } catch (e) {
        continue;
      }
    }

    // 如果找不到专门的筛选器容器，尝试查找包含筛选选项的页面区域
    const fallbackSelectors = [
      'body',
      '.main-content',
      '.content-wrapper',
      '.page-content'
    ];

    for (const selector of fallbackSelectors) {
      try {
        const element = await this.page.$(selector);
        if (element) {
          console.log(`使用备用容器: ${selector}`);
          return element;
        }
      } catch (e) {
        continue;
      }
    }

    return null;
  }

  /**
   * 分析页面结构，识别筛选器元素
   */
  async analyzePageStructure() {
    console.log('开始分析页面结构...');
    
    try {
      // 等待页面完全加载
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(2000);
      
      // 分析页面中的筛选器相关元素
      const pageStructure = await this.page.evaluate(() => {
        const structure = {
          filterElements: [],
          textContent: [],
          attributes: [],
          classNames: [],
          dataAttributes: []
        };
        
        // 查找所有可能的筛选器元素
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach((element, index) => {
          if (index > 1000) return; // 限制分析的元素数量
          
          const tagName = element.tagName.toLowerCase();
          const className = element.className;
          const id = element.id;
          const text = element.textContent?.trim();
          
          // 检查是否包含筛选相关的关键词
          const filterKeywords = [
            '筛选', 'filter', '选择', 'select', '选项', 'option',
            '行业', 'industry', '地区', 'location', '城市', 'city',
            '规模', 'size', '薪资', 'salary', '经验', 'experience',
            '学历', 'education', '性质', 'nature', '融资', 'funding'
          ];
          
          const hasFilterKeyword = filterKeywords.some(keyword => 
            (className && className.toLowerCase().includes(keyword.toLowerCase())) ||
            (id && id.toLowerCase().includes(keyword.toLowerCase())) ||
            (text && text.toLowerCase().includes(keyword.toLowerCase()))
          );
          
          if (hasFilterKeyword && element.offsetWidth > 0 && element.offsetHeight > 0) {
            structure.filterElements.push({
              tagName,
              className,
              id,
              text: text?.substring(0, 100),
              rect: element.getBoundingClientRect(),
              attributes: Array.from(element.attributes).map(attr => ({
                name: attr.name,
                value: attr.value
              }))
            });
          }
        });
        
        // 收集页面文本内容
        const textNodes = document.querySelectorAll('body *');
        textNodes.forEach(node => {
          if (node.textContent && node.textContent.trim().length > 2) {
            structure.textContent.push({
              text: node.textContent.trim().substring(0, 50),
              tagName: node.tagName.toLowerCase(),
              className: node.className
            });
          }
        });
        
        return structure;
      });
      
      console.log('页面结构分析完成:', {
        filterElementsCount: pageStructure.filterElements.length,
        textContentCount: pageStructure.textContent.length
      });
      
      return pageStructure;
      
    } catch (error) {
      console.error('页面结构分析失败:', error);
      return null;
    }
  }

  /**
   * 根据页面结构动态生成选择器
   */
  async generateDynamicSelectors(filterType, pageStructure) {
    if (!pageStructure || !pageStructure.filterElements) {
      return this.getStaticSelectors(filterType);
    }
    
    const dynamicSelectors = [];
    const filterElements = pageStructure.filterElements;
    
    // 根据筛选器类型和页面结构生成选择器
    const typeKeywords = this.getFilterTypeKeywords(filterType);
    
    filterElements.forEach(element => {
      const { className, id, text, attributes } = element;
      
      // 检查元素是否与当前筛选器类型匹配
      const isMatch = typeKeywords.some(keyword => {
        return (className && className.toLowerCase().includes(keyword.toLowerCase())) ||
               (id && id.toLowerCase().includes(keyword.toLowerCase())) ||
               (text && text.toLowerCase().includes(keyword.toLowerCase()));
      });
      
      if (isMatch) {
        // 生成精确的选择器
        if (id) {
          dynamicSelectors.push(`#${id}`);
        }
        if (className) {
          const classes = className.split(' ').filter(c => c.trim());
          classes.forEach(cls => {
            if (cls.trim()) {
              dynamicSelectors.push(`.${cls.trim()}`);
            }
          });
        }
        
        // 基于属性生成选择器
        attributes.forEach(attr => {
          if (attr.name === 'data-type' || attr.name === 'data-key') {
            dynamicSelectors.push(`[${attr.name}="${attr.value}"]`);
          }
        });
      }
    });
    
    // 合并动态选择器和静态选择器
    const staticSelectors = this.getStaticSelectors(filterType);
    const allSelectors = [...new Set([...dynamicSelectors, ...staticSelectors])];
    
    console.log(`为 ${filterType} 生成 ${allSelectors.length} 个选择器:`, allSelectors.slice(0, 5));
    
    return allSelectors;
  }

  /**
   * 获取筛选器类型的关键词
   */
  getFilterTypeKeywords(filterType) {
    const keywordMap = {
      'industry': ['行业', 'industry', '所属行业', '公司行业'],
      'location': ['地区', 'location', '城市', 'city', '工作地点'],
      'company-size': ['规模', 'size', '公司规模', '企业规模'],
      'salary-range': ['薪资', 'salary', '工资', '薪资范围'],
      'experience': ['经验', 'experience', '工作经验', '工作年限'],
      'education': ['学历', 'education', '教育', '学历要求'],
      'company-nature': ['性质', 'nature', '公司性质', '企业性质'],
      'funding-stage': ['融资', 'funding', '投资', '融资阶段'],
      'publish-time': ['时间', 'time', '发布时间', '更新时间'],
      'job-type': ['类型', 'type', '职位类型', '工作类型'],
      'benefits': ['福利', 'benefits', '待遇', '员工福利']
    };
    
    return keywordMap[filterType] || [filterType];
  }

  /**
   * 获取静态选择器
   */
  getStaticSelectors(filterType) {
    const selectors = {
      'industry': [
        '.filter-item[data-type="industry"]',
        '.industry-filter .filter-item',
        '[data-key="industry"] .filter-item',
        '.filter-item:has-text("行业")',
        '.filter-item:has-text("Industry")',
        '[class*="industry"] .filter-item',
        '.filter-item[data-label*="行业"]',
        '.filter-item:has-text("所属行业")',
        '.filter-item:has-text("公司行业")',
        '[data-type="industry"]',
        '[data-key="industry"]',
        '.industry-option',
        '.industry-item'
      ],
      'location': [
        '.filter-item[data-type="location"]',
        '.location-filter .filter-item',
        '[data-key="city"] .filter-item',
        '.filter-item:has-text("地区")',
        '.filter-item:has-text("Location")',
        '[class*="location"] .filter-item',
        '.filter-item[data-label*="地区"]',
        '.filter-item:has-text("工作地点")',
        '.filter-item:has-text("城市")',
        '[data-type="city"]',
        '[data-key="city"]',
        '.city-option',
        '.city-item',
        '.location-option'
      ],
      'company-size': [
        '.filter-item[data-type="company-size"]',
        '.company-size-filter .filter-item',
        '[data-key="company-size"] .filter-item',
        '.filter-item:has-text("公司规模")',
        '.filter-item:has-text("规模")',
        '[class*="company-size"] .filter-item',
        '.filter-item[data-label*="规模"]',
        '.filter-item:has-text("企业规模")',
        '[data-type="company-size"]',
        '[data-key="company-size"]',
        '.company-size-option',
        '.size-option'
      ],
      'salary-range': [
        '.filter-item[data-type="salary"]',
        '.salary-filter .filter-item',
        '[data-key="salary"] .filter-item',
        '.filter-item:has-text("薪资")',
        '.filter-item:has-text("工资")',
        '[class*="salary"] .filter-item',
        '.filter-item[data-label*="薪资"]',
        '.filter-item:has-text("薪资范围")',
        '[data-type="salary"]',
        '[data-key="salary"]',
        '.salary-option',
        '.salary-range-option'
      ],
      'experience': [
        '.filter-item[data-type="experience"]',
        '.experience-filter .filter-item',
        '[data-key="experience"] .filter-item',
        '.filter-item:has-text("经验")',
        '.filter-item:has-text("工作经验")',
        '[class*="experience"] .filter-item',
        '.filter-item[data-label*="经验"]',
        '.filter-item:has-text("工作年限")',
        '[data-type="experience"]',
        '[data-key="experience"]',
        '.experience-option',
        '.work-experience-option'
      ],
      'education': [
        '.filter-item[data-type="education"]',
        '.education-filter .filter-item',
        '[data-key="education"] .filter-item',
        '.filter-item:has-text("学历")',
        '.filter-item:has-text("教育")',
        '[class*="education"] .filter-item',
        '.filter-item[data-label*="学历"]',
        '.filter-item:has-text("学历要求")',
        '[data-type="education"]',
        '[data-key="education"]',
        '.education-option',
        '.degree-option'
      ],
      'company-nature': [
        '.filter-item[data-type="company-nature"]',
        '.company-nature-filter .filter-item',
        '[data-key="company-nature"] .filter-item',
        '.filter-item:has-text("公司性质")',
        '.filter-item:has-text("企业性质")',
        '[class*="company-nature"] .filter-item',
        '.filter-item[data-label*="性质"]',
        '.filter-item:has-text("企业类型")',
        '[data-type="company-nature"]',
        '[data-key="company-nature"]',
        '.company-nature-option',
        '.nature-option'
      ],
      'funding-stage': [
        '.filter-item[data-type="funding"]',
        '.funding-filter .filter-item',
        '[data-key="funding"] .filter-item',
        '.filter-item:has-text("融资")',
        '.filter-item:has-text("投资")',
        '[class*="funding"] .filter-item',
        '.filter-item[data-label*="融资"]',
        '.filter-item:has-text("融资阶段")',
        '[data-type="funding"]',
        '[data-key="funding"]',
        '.funding-option',
        '.funding-stage-option'
      ],
      'publish-time': [
        '.filter-item[data-type="publish-time"]',
        '.publish-time-filter .filter-item',
        '[data-key="publish-time"] .filter-item',
        '.filter-item:has-text("发布时间")',
        '.filter-item:has-text("发布")',
        '[class*="publish-time"] .filter-item',
        '.filter-item[data-label*="时间"]',
        '.filter-item:has-text("更新时间")',
        '[data-type="publish-time"]',
        '[data-key="publish-time"]',
        '.publish-time-option',
        '.time-option'
      ],
      'job-type': [
        '.filter-item[data-type="job-type"]',
        '.job-type-filter .filter-item',
        '[data-key="job-type"] .filter-item',
        '.filter-item:has-text("职位类型")',
        '.filter-item:has-text("工作类型")',
        '[class*="job-type"] .filter-item',
        '.filter-item[data-label*="类型"]',
        '.filter-item:has-text("岗位类型")',
        '[data-type="job-type"]',
        '[data-key="job-type"]',
        '.job-type-option',
        '.type-option'
      ],
      'benefits': [
        '.filter-item[data-type="benefits"]',
        '.benefits-filter .filter-item',
        '[data-key="benefits"] .filter-item',
        '.filter-item:has-text("福利")',
        '.filter-item:has-text("待遇")',
        '[class*="benefits"] .filter-item',
        '.filter-item[data-label*="福利"]',
        '.filter-item:has-text("员工福利")',
        '[data-type="benefits"]',
        '[data-key="benefits"]',
        '.benefits-option',
        '.welfare-option'
      ]
    };
    
    return selectors[filterType] || [];
  }

  /**
   * 生成通用选择器
   */
  async generateGenericSelectors(filterType) {
    const selectors = [
      `.filter-item:has-text("${filterType}")`,
      `[data-type*="${filterType}"]`,
      `[data-key*="${filterType}"]`,
      `[class*="${filterType}"]`,
      `[id*="${filterType}"]`,
      `[title*="${filterType}"]`,
      `[aria-label*="${filterType}"]`,
      `[placeholder*="${filterType}"]`
    ];
    
    // 根据筛选器类型添加特定的通用选择器
    const typeSpecificSelectors = {
      'industry': [
        '[class*="industry"]',
        '[id*="industry"]',
        '.industry-filter',
        '.industry-select'
      ],
      'location': [
        '[class*="location"]',
        '[class*="city"]',
        '[id*="location"]',
        '[id*="city"]',
        '.location-filter',
        '.city-filter'
      ],
      'company-size': [
        '[class*="size"]',
        '[class*="scale"]',
        '[id*="size"]',
        '[id*="scale"]',
        '.size-filter',
        '.scale-filter'
      ],
      'salary-range': [
        '[class*="salary"]',
        '[class*="wage"]',
        '[id*="salary"]',
        '[id*="wage"]',
        '.salary-filter',
        '.wage-filter'
      ],
      'experience': [
        '[class*="experience"]',
        '[class*="exp"]',
        '[id*="experience"]',
        '[id*="exp"]',
        '.experience-filter',
        '.exp-filter'
      ],
      'education': [
        '[class*="education"]',
        '[class*="degree"]',
        '[id*="education"]',
        '[id*="degree"]',
        '.education-filter',
        '.degree-filter'
      ],
      'company-nature': [
        '[class*="nature"]',
        '[class*="type"]',
        '[id*="nature"]',
        '[id*="type"]',
        '.nature-filter',
        '.type-filter'
      ],
      'funding-stage': [
        '[class*="funding"]',
        '[class*="investment"]',
        '[id*="funding"]',
        '[id*="investment"]',
        '.funding-filter',
        '.investment-filter'
      ]
    };
    
    const specificSelectors = typeSpecificSelectors[filterType] || [];
    return [...selectors, ...specificSelectors];
  }

  /**
   * 选择筛选选项
   */
  async selectFilterOption(filterType, options, pageStructure) {
    try {
      console.log(`开始选择${filterType}筛选选项:`, options);
      
      // 基于页面结构分析，动态生成选择器
      const dynamicSelectors = await this.generateDynamicSelectors(filterType, pageStructure);
      
      // 合并静态选择器和动态选择器
      const allSelectors = [
        ...dynamicSelectors,
        ...this.getStaticSelectors(filterType)
      ];
      
      console.log(`${filterType}筛选器选择器列表:`, allSelectors);
      
      let filterElement = null;
      let usedSelector = '';

      // 查找筛选器元素
      for (const selector of allSelectors) {
        try {
          filterElement = await this.page.$(selector);
          if (filterElement && await filterElement.isVisible()) {
            usedSelector = selector;
            console.log(`找到${filterType}筛选器: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!filterElement) {
        console.warn(`未找到${filterType}筛选器，尝试通用选择器`);
        // 尝试通用选择器
        const genericSelectors = await this.generateGenericSelectors(filterType);
        
        for (const selector of genericSelectors) {
          try {
            filterElement = await this.page.$(selector);
            if (filterElement && await filterElement.isVisible()) {
              usedSelector = selector;
              console.log(`通过通用选择器找到${filterType}筛选器: ${selector}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }

      if (!filterElement) {
        throw new Error(`无法找到${filterType}筛选器`);
      }

      // 高亮显示找到的筛选器
      await this.page.evaluate((element) => {
        element.style.border = '3px solid #1890ff';
        element.style.backgroundColor = '#e6f7ff';
        element.style.transition = 'all 0.3s ease';
      }, filterElement);

      // 等待用户看到高亮效果
      await this.page.waitForTimeout(1000);

      // 尝试展开筛选器选项
      await this.expandFilterOptions(filterElement, filterType);

      // 查找并选择对应的选项
      for (const option of options) {
        try {
          await this.selectSingleOption(option, filterType, usedSelector);
        } catch (error) {
          console.error(`选择选项 ${option} 失败:`, error);
          // 继续尝试下一个选项
        }
      }

      console.log(`${filterType}筛选选项选择完成`);

    } catch (error) {
      console.error(`选择${filterType}筛选选项失败:`, error);
      throw error;
    }
  }

  /**
   * 展开筛选器选项
   */
  async expandFilterOptions(filterElement, filterType) {
    try {
      console.log(`尝试展开${filterType}筛选器选项...`);
      
      // 方法1：点击展开
      try {
        await filterElement.click();
        await this.page.waitForTimeout(1000);
        console.log(`通过点击展开${filterType}筛选器`);
        return;
      } catch (e) {
        console.log(`点击展开失败:`, e.message);
      }
      
      // 方法2：查找展开按钮
      const expandSelectors = [
        '.expand-btn',
        '.toggle-btn',
        '.dropdown-btn',
        '.arrow-down',
        '.icon-arrow',
        '[class*="expand"]',
        '[class*="toggle"]',
        '[class*="arrow"]'
      ];
      
      for (const selector of expandSelectors) {
        try {
          const expandBtn = await filterElement.$(selector);
          if (expandBtn && await expandBtn.isVisible()) {
            await expandBtn.click();
            await this.page.waitForTimeout(1000);
            console.log(`通过展开按钮展开${filterType}筛选器`);
            return;
          }
        } catch (e) {
          continue;
        }
      }
      
      // 方法3：查找下拉箭头
      const arrowSelectors = [
        'svg',
        '.icon',
        '[class*="icon"]',
        '[class*="arrow"]',
        '[class*="caret"]'
      ];
      
      for (const selector of arrowSelectors) {
        try {
          const arrow = await filterElement.$(selector);
          if (arrow && await arrow.isVisible()) {
            await arrow.click();
            await this.page.waitForTimeout(1000);
            console.log(`通过箭头展开${filterType}筛选器`);
            return;
          }
        } catch (e) {
          continue;
        }
      }
      
      // 方法4：悬停展开
      try {
        await filterElement.hover();
        await this.page.waitForTimeout(1000);
        console.log(`通过悬停展开${filterType}筛选器`);
        return;
      } catch (e) {
        console.log(`悬停展开失败:`, e.message);
      }
      
      console.log(`${filterType}筛选器可能已经展开或不需要展开`);
      
    } catch (error) {
      console.error(`展开${filterType}筛选器选项失败:`, error);
    }
  }

  /**
   * 选择单个选项
   */
  async selectSingleOption(option, filterType, usedSelector) {
    try {
      console.log(`尝试选择选项: ${option}`);
      
      // 查找选项元素
      const optionSelectors = [
        `text="${option}"`,
        `[data-value="${option}"]`,
        `[title="${option}"]`,
        `[aria-label="${option}"]`,
        `.option-item:has-text("${option}")`,
        `.filter-option:has-text("${option}")`,
        `[class*="option"]:has-text("${option}")`,
        `[class*="item"]:has-text("${option}")`,
        `[class*="choice"]:has-text("${option}")`
      ];

      let optionElement = null;
      for (const selector of optionSelectors) {
        try {
          optionElement = await this.page.$(selector);
          if (optionElement && await optionElement.isVisible()) {
            console.log(`找到选项: ${option}, 选择器: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (optionElement && await optionElement.isVisible()) {
        // 高亮显示要选择的选项
        await this.page.evaluate((element) => {
          element.style.border = '2px solid #52c41a';
          element.style.backgroundColor = '#f6ffed';
          element.style.transition = 'all 0.3s ease';
        }, optionElement);

        // 等待用户看到高亮效果
        await this.page.waitForTimeout(800);

        // 点击选择选项
        await optionElement.click();
        console.log(`已选择选项: ${option}`);
        
        // 等待选择生效
        await this.page.waitForTimeout(500);

        // 移除高亮
        await this.page.evaluate((element) => {
          element.style.border = '';
          element.style.backgroundColor = '';
        }, optionElement);
        
      } else {
        console.warn(`未找到选项: ${option}`);
      }
      
    } catch (error) {
      console.error(`选择选项 ${option} 失败:`, error);
      throw error;
    }
  }

  /**
   * 生成通用选择器
   */
  async generateGenericSelectors(filterType) {
    const selectors = [
      `.filter-item:has-text("${filterType}")`,
      `[data-type*="${filterType}"]`,
      `[data-key*="${filterType}"]`,
      `[class*="${filterType}"]`,
      `[id*="${filterType}"]`,
      `[title*="${filterType}"]`,
      `[aria-label*="${filterType}"]`,
      `[placeholder*="${filterType}"]`
    ];
    
    // 根据筛选器类型添加特定的通用选择器
    const typeSpecificSelectors = {
      'industry': [
        '[class*="industry"]',
        '[id*="industry"]',
        '.industry-filter',
        '.industry-select'
      ],
      'location': [
        '[class*="location"]',
        '[class*="city"]',
        '[id*="location"]',
        '[id*="city"]',
        '.location-filter',
        '.city-filter'
      ],
      'company-size': [
        '[class*="size"]',
        '[class*="scale"]',
        '[id*="size"]',
        '[id*="scale"]',
        '.size-filter',
        '.scale-filter'
      ],
      'salary-range': [
        '[class*="salary"]',
        '[class*="wage"]',
        '[id*="salary"]',
        '[id*="wage"]',
        '.salary-filter',
        '.wage-filter'
      ],
      'experience': [
        '[class*="experience"]',
        '[class*="exp"]',
        '[id*="experience"]',
        '[id*="exp"]',
        '.experience-filter',
        '.exp-filter'
      ],
      'education': [
        '[class*="education"]',
        '[class*="degree"]',
        '[id*="education"]',
        '[id*="degree"]',
        '.education-filter',
        '.degree-filter'
      ],
      'company-nature': [
        '[class*="nature"]',
        '[class*="type"]',
        '[id*="nature"]',
        '[id*="type"]',
        '.nature-filter',
        '.type-filter'
      ],
      'funding-stage': [
        '[class*="funding"]',
        '[class*="investment"]',
        '[id*="funding"]',
        '[id*="investment"]',
        '.funding-filter',
        '.investment-filter'
      ]
    };
    
    const specificSelectors = typeSpecificSelectors[filterType] || [];
    return [...selectors, ...specificSelectors];
  }

  /**
   * 执行搜索
   */
  async performSearch() {
    try {
      console.log('开始执行搜索...');
      
      // 等待页面稳定
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);
      
      // 尝试多种搜索按钮选择器 - 更新为智联招聘实际的选择器
      const searchButtonSelectors = [
        // 标准搜索按钮
        '.search-btn',
        '.search-button',
        'button[type="submit"]',
        'input[type="submit"]',
        // 智联招聘特定的选择器
        '.zppp-search-btn',
        '.search-submit',
        '.btn-search',
        '.search-submit-btn',
        // 通用选择器
        '[class*="search"]',
        'button:has-text("搜索")',
        'button:has-text("Search")',
        'button:has-text("查找")',
        'button:has-text("查询")',
        // 图标按钮
        '[class*="search-icon"]',
        '[class*="search-svg"]',
        // 表单提交
        'form button',
        'form input[type="submit"]'
      ];
      
      let searchButton = null;
      for (const selector of searchButtonSelectors) {
        try {
          searchButton = await this.page.$(selector);
          if (searchButton) {
            console.log(`找到搜索按钮: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (searchButton) {
        // 滚动到搜索按钮
        await searchButton.scrollIntoViewIfNeeded();
        await this.page.waitForTimeout(500);
        
        // 检查按钮状态
        const isVisible = await searchButton.isVisible();
        const isEnabled = await searchButton.isEnabled();
        
        if (isVisible && isEnabled) {
          // 点击搜索按钮
          await searchButton.click();
          console.log('已点击搜索按钮');
          
          // 等待搜索执行
          await this.page.waitForTimeout(3000);
        } else {
          console.warn(`搜索按钮不可点击 (visible: ${isVisible}, enabled: ${isEnabled})`);
          // 尝试JavaScript点击
          await this.page.evaluate((button) => {
            button.click();
          }, searchButton);
          console.log('通过JavaScript点击搜索按钮');
          await this.page.waitForTimeout(3000);
        }
      } else {
        console.log('未找到搜索按钮，尝试按回车键执行搜索');
        // 尝试按回车键执行搜索
        await this.page.keyboard.press('Enter');
        await this.page.waitForTimeout(3000);
      }
      
      // 等待搜索结果加载 - 更新为智联招聘实际的选择器
      const resultSelectors = [
        // 公司列表选择器
        '.company-list',
        '.company-item',
        '.job-list',
        '.job-item',
        // 搜索结果选择器
        '.result-list',
        '.result-item',
        '.search-result',
        '.search-item',
        // 智联招聘特定的选择器
        '.zppp-company-list',
        '.zppp-job-list',
        // 通用选择器
        '[class*="list"]',
        '[class*="result"]',
        '.list-container',
        '.search-container'
      ];
      
      let resultsLoaded = false;
      for (const selector of resultSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 10000 });
          console.log(`搜索结果已加载: ${selector}`);
          resultsLoaded = true;
          break;
        } catch (e) {
          continue;
        }
      }
      
      if (!resultsLoaded) {
        console.warn('未检测到搜索结果加载，但继续执行');
        // 等待更长时间，可能页面结构不同
        await this.page.waitForTimeout(5000);
      }
      
      // 等待页面完全加载
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);
      
      console.log('搜索执行完成');
      
    } catch (error) {
      console.error('执行搜索失败:', error);
      throw new Error(`执行搜索失败: ${error.message}`);
    }
  }

  /**
   * 提取公司搜索结果
   */
  async extractCompanyResults() {
    try {
      console.log('开始提取公司搜索结果...');
      
      // 等待页面稳定
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(2000);
      
      // 尝试多种公司列表选择器 - 更新为智联招聘实际的选择器
      const companyListSelectors = [
        // 公司列表选择器
        '.company-list',
        '.company-item',
        '.company-card',
        '.company-box',
        // 职位列表选择器（可能包含公司信息）
        '.job-list',
        '.job-item',
        '.job-card',
        '.job-box',
        // 搜索结果选择器
        '.result-list',
        '.result-item',
        '.search-result',
        '.search-item',
        // 智联招聘特定的选择器
        '.zppp-company-list',
        '.zppp-job-list',
        '.zppp-company-item',
        '.zppp-job-item',
        // 通用选择器
        '[class*="company"]',
        '[class*="job"]',
        '[class*="result"]',
        '.list-container .item',
        '.search-container .item',
        // 备选选择器
        '.item',
        '.card',
        '.box',
        '[class*="item"]',
        '[class*="card"]',
        '[class*="box"]'
      ];
      
      let companyList = null;
      for (const selector of companyListSelectors) {
        try {
          companyList = await this.page.$$(selector);
          if (companyList && companyList.length > 0) {
            console.log(`找到公司列表: ${selector}, 共 ${companyList.length} 项`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      if (!companyList || companyList.length === 0) {
        console.warn('未找到公司列表，尝试其他方式');
        // 尝试查找任何包含公司信息的元素
        companyList = await this.page.$$('[class*="item"], [class*="card"], [class*="box"], .result, .search-item');
        if (companyList && companyList.length > 0) {
          console.log(`找到备选列表: 共 ${companyList.length} 项`);
        }
      }
      
      if (!companyList || companyList.length === 0) {
        console.warn('未找到任何搜索结果');
        return [];
      }
      
      // 限制提取数量，避免过多
      const maxResults = Math.min(companyList.length, 20);
      const companies = [];
      
      for (let i = 0; i < maxResults; i++) {
        try {
          const companyInfo = await this.extractCompanyInfo(companyList[i], i);
          if (companyInfo && companyInfo.name) {
            companies.push(companyInfo);
          }
        } catch (error) {
          console.error(`提取第 ${i + 1} 个公司信息失败:`, error);
          continue;
        }
      }
      
      console.log(`成功提取 ${companies.length} 家公司信息`);
      return companies;
      
    } catch (error) {
      console.error('提取公司搜索结果失败:', error);
      return [];
    }
  }

  /**
   * 提取单个公司信息
   */
  async extractCompanyInfo(element, index) {
    try {
      // 尝试多种选择器提取公司名称
      const nameSelectors = [
        // 公司名称选择器
        '.company-name',
        '.company-title',
        '.company-title',
        '.company',
        '.job-company',
        '.position-company',
        // 智联招聘特定的选择器
        '.zppp-company-name',
        '.zppp-job-company',
        // 通用选择器
        '[class*="company"]',
        '[class*="name"]',
        'h3',
        'h4',
        '.title',
        '.name',
        // 备选选择器
        'strong',
        'b',
        '[class*="title"]'
      ];
      
      let companyName = '';
      for (const selector of nameSelectors) {
        try {
          const nameElement = await element.$(selector);
          if (nameElement) {
            companyName = await nameElement.textContent();
            if (companyName && companyName.trim()) {
              companyName = companyName.trim();
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      // 如果没有找到公司名称，尝试从整个元素文本中提取
      if (!companyName) {
        try {
          const fullText = await element.textContent();
          if (fullText) {
            // 尝试提取第一个看起来像公司名称的文本
            const lines = fullText.split('\n').map(line => line.trim()).filter(line => line);
            for (const line of lines) {
              if (line.length > 2 && line.length < 50 && !line.includes('￥') && !line.includes('k') && !line.includes('年')) {
                companyName = line;
                break;
              }
            }
          }
        } catch (e) {
          // 忽略错误
        }
      }
      
      // 提取职位信息
      const jobSelectors = [
        // 职位选择器
        '.job-title',
        '.position-title',
        '.job-name',
        '.position',
        '.job-position',
        '.position-name',
        // 智联招聘特定的选择器
        '.zppp-job-title',
        '.zppp-position-title',
        // 通用选择器
        '[class*="job"]',
        '[class*="position"]',
        '.title',
        'h3',
        'h4',
        // 备选选择器
        'strong',
        'b'
      ];
      
      let jobTitle = '';
      for (const selector of jobSelectors) {
        try {
          const jobElement = await element.$(selector);
          if (jobElement) {
            jobTitle = await jobElement.textContent();
            if (jobTitle && jobTitle.trim()) {
              jobTitle = jobTitle.trim();
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      // 提取其他信息
      const companyInfo = {
        id: `company-${index}`,
        name: companyName || `公司${index + 1}`,
        jobTitle: jobTitle || '职位信息待补充',
        size: await this.extractText(element, ['.company-size', '.size', '[class*="size"]', '.company-scale']),
        location: await this.extractText(element, ['.location', '.city', '[class*="location"]', '[class*="city"]', '.work-location']),
        salary: await this.extractText(element, ['.salary', '.pay', '[class*="salary"]', '[class*="pay"]', '.compensation']),
        industry: await this.extractText(element, ['.industry', '.business', '[class*="industry"]', '[class*="business"]', '.company-industry']),
        link: await this.extractLink(element),
        description: await this.extractText(element, ['.description', '.desc', '.summary', '[class*="description"]', '[class*="desc"]', '.job-desc'])
      };
      
      // 清理数据
      Object.keys(companyInfo).forEach(key => {
        if (typeof companyInfo[key] === 'string') {
          companyInfo[key] = companyInfo[key].replace(/\s+/g, ' ').trim();
        }
      });
      
      return companyInfo;
      
    } catch (error) {
      console.error(`提取公司信息失败 [${index}]:`, error);
      return {
        id: `company-${index}`,
        name: `公司${index + 1}`,
        jobTitle: '职位信息待补充',
        error: error.message
      };
    }
  }
  
  /**
   * 辅助方法：提取文本内容
   */
  async extractText(element, selectors) {
    for (const selector of selectors) {
      try {
        const textElement = await element.$(selector);
        if (textElement) {
          const text = await textElement.textContent();
          if (text && text.trim()) {
            return text.trim();
          }
        }
      } catch (e) {
        continue;
      }
    }
    return '';
  }
  
  /**
   * 辅助方法：提取链接
   */
  async extractLink(element) {
    try {
      const linkElement = await element.$('a');
      if (linkElement) {
        const href = await linkElement.getAttribute('href');
        if (href) {
          return href.startsWith('http') ? href : `https://sou.zhaopin.com${href}`;
        }
      }
    } catch (e) {
      // 忽略错误
    }
    return '';
  }

  /**
   * 使用AI分析并推荐公司
   */
  async analyzeAndRecommend(companies, filterConfig) {
    try {
      if (!companies || companies.length === 0) {
        console.log('没有公司数据需要分析');
        return [];
      }
      
      console.log(`开始分析 ${companies.length} 家公司...`);
      
      // 构建分析提示词
      const prompt = this.buildAnalysisPrompt(companies, filterConfig);
      
      try {
        // 尝试使用LLM服务进行分析
        const llmService = require('./llmService');
        if (llmService && llmService.chatWithLLM) {
          const analysis = await llmService.chatWithLLM(prompt);
          return this.parseAIRecommendations(analysis, companies);
        }
      } catch (llmError) {
        console.warn('LLM服务不可用，使用基础排序:', llmError.message);
      }
      
      // 如果LLM服务不可用，使用基础排序
      return this.basicSorting(companies, filterConfig);
      
    } catch (error) {
      console.error('AI分析推荐失败:', error);
      // 返回基础排序结果
      return this.basicSorting(companies, filterConfig);
    }
  }

  /**
   * 构建AI分析提示词
   */
  buildAnalysisPrompt(companies, filterConfig) {
    const filterSummary = Object.entries(filterConfig)
      .filter(([key, value]) => value && value.length > 0)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
      .join(', ');
    
    return `请分析以下公司信息，并根据筛选条件"${filterSummary}"进行智能推荐。

公司信息：
${companies.map((company, index) => `
${index + 1}. ${company.name}
   职位：${company.jobTitle}
   规模：${company.size || '未知'}
   地区：${company.location || '未知'}
   薪资：${company.salary || '未知'}
   行业：${company.industry || '未知'}
`).join('')}

请根据筛选条件，为每家公司提供：
1. 推荐指数（1-100分）
2. 推荐排名
3. 推荐理由（简要说明为什么推荐这家公司）

请以JSON格式返回结果，格式如下：
{
  "recommendations": [
    {
      "name": "公司名称",
      "score": 85,
      "rank": 1,
      "reason": "推荐理由"
    }
  ]
}`;
  }

  /**
   * 解析AI推荐结果
   */
  parseAIRecommendations(analysis, companies) {
    try {
      // 尝试解析JSON格式的推荐结果
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        if (result.recommendations && Array.isArray(result.recommendations)) {
          return result.recommendations;
        }
      }
      
      // 如果解析失败，尝试从文本中提取信息
      const recommendations = [];
      for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        recommendations.push({
          name: company.name,
          score: Math.max(60, 100 - i * 5), // 基础分数递减
          rank: i + 1,
          reason: `根据筛选条件匹配度排名第${i + 1}位`
        });
      }
      
      return recommendations;
      
    } catch (error) {
      console.error('解析AI推荐结果失败:', error);
      // 返回基础推荐
      return this.basicSorting(companies, {});
    }
  }

  /**
   * 基础排序和推荐
   */
  basicSorting(companies, filterConfig) {
    try {
      const recommendations = [];
      
      // 根据筛选条件计算匹配度
      for (let i = 0; i < companies.length; i++) {
        const company = companies[i];
        let score = 70; // 基础分数
        
        // 根据筛选条件加分
        if (filterConfig.industry && filterConfig.industry.length > 0) {
          if (company.industry && filterConfig.industry.some(ind => 
            company.industry.includes(ind) || ind.includes(company.industry))) {
            score += 15;
          }
        }
        
        if (filterConfig.location && filterConfig.location.length > 0) {
          if (company.location && filterConfig.location.some(loc => 
            company.location.includes(loc) || loc.includes(company.location))) {
            score += 10;
          }
        }
        
        if (filterConfig.companySize && filterConfig.companySize.length > 0) {
          if (company.size && filterConfig.companySize.some(size => 
            company.size.includes(size) || size.includes(company.size))) {
            score += 10;
          }
        }
        
        if (filterConfig.salaryRange && filterConfig.salaryRange.length > 0) {
          if (company.salary && filterConfig.salaryRange.some(salary => 
            company.salary.includes(salary) || salary.includes(company.salary))) {
            score += 10;
          }
        }
        
        if (filterConfig.experience && filterConfig.experience.length > 0) {
          // 经验要求通常在职位描述中
          if (company.jobTitle && filterConfig.experience.some(exp => 
            company.jobTitle.includes(exp) || exp.includes(company.jobTitle))) {
            score += 5;
          }
        }
        
        // 确保分数在合理范围内
        score = Math.min(100, Math.max(50, score));
        
        recommendations.push({
          name: company.name,
          score: score,
          rank: i + 1,
          reason: `匹配度评分：${score}分，根据筛选条件智能推荐`
        });
      }
      
      // 按分数排序
      recommendations.sort((a, b) => b.score - a.score);
      
      // 重新分配排名
      recommendations.forEach((rec, index) => {
        rec.rank = index + 1;
      });
      
      return recommendations;
      
    } catch (error) {
      console.error('基础排序失败:', error);
      // 返回最简单的推荐
      return companies.map((company, index) => ({
        name: company.name,
        score: Math.max(60, 100 - index * 5),
        rank: index + 1,
        reason: `默认推荐排名第${index + 1}位`
      }));
    }
  }

  /**
   * 设置页面事件监听
   */
  setupPageEventListeners(socket) {
    this.page.on('pageerror', (error) => {
      console.log('页面错误:', error.message);
    });
    
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('控制台错误:', msg.text());
      }
    });
  }

  /**
   * 初始化所有处理器
   */
  initHandlers() {
    this.popupHandler = new PopupHandler(this.page, this.storageDir);
    this.elementFinder = new ElementFinder(this.page);
    this.geetestHandler = new GeetestHandler(this.page);
  }

  /**
   * 清理资源
   */
  async cleanup() {
    try {
      if (this.page) await this.page.close();
      if (this.browser) await this.browser.close();
      
      this.browser = null;
      this.page = null;
      this.isActive = false;
      this.sessionId = null;
      
      console.log('公司搜索服务资源已清理');
    } catch (error) {
      console.error('清理资源时出错:', error);
    }
  }

  /**
   * 获取服务状态
   */
  getStatus() {
    return {
      isActive: this.isActive,
      sessionId: this.sessionId,
      browser: !!this.browser,
      page: !!this.page
    };
  }

  /**
   * 检查是否与其他服务冲突
   */
  async checkConflicts() {
    try {
      const zhilianService = require('./zhilianService');
      return {
        hasConflict: zhilianService.isActive,
        conflictService: '智能寻聘',
        message: '智能寻聘功能正在运行，请稍后再试'
      };
    } catch (error) {
      return {
        hasConflict: false,
        conflictService: null,
        message: null
      };
    }
  }

  /**
   * 验证筛选器是否成功应用
   */
  async verifyFilterApplied(filterType, expectedOptions) {
    try {
      console.log(`验证${filterType}筛选器是否成功应用...`);
      
      // 等待页面更新
      await this.page.waitForTimeout(2000);
      
      // 检查筛选器状态
      const filterStatus = await this.page.evaluate((type, options) => {
        // 查找筛选器元素
        const filterSelectors = [
          `[data-type="${type}"]`,
          `[data-key="${type}"]`,
          `[class*="${type}"]`,
          `[id*="${type}"]`
        ];
        
        let filterElement = null;
        for (const selector of filterSelectors) {
          const element = document.querySelector(selector);
          if (element) {
            filterElement = element;
            break;
          }
        }
        
        if (!filterElement) {
          return { success: false, reason: '找不到筛选器元素' };
        }
        
        // 检查是否有选中的选项
        const selectedSelectors = [
          '.selected',
          '.active',
          '[class*="selected"]',
          '[class*="active"]',
          '[class*="checked"]'
        ];
        
        let hasSelected = false;
        for (const selector of selectedSelectors) {
          const selected = filterElement.querySelector(selector);
          if (selected) {
            hasSelected = true;
            break;
          }
        }
        
        // 检查文本内容是否包含期望的选项
        const textContent = filterElement.textContent || '';
        const hasExpectedText = options.some(option => 
          textContent.includes(option)
        );
        
        return {
          success: hasSelected || hasExpectedText,
          hasSelected,
          hasExpectedText,
          textContent: textContent.substring(0, 100)
        };
        
      }, filterType, expectedOptions);
      
      console.log(`${filterType}筛选器验证结果:`, filterStatus);
      
      return filterStatus.success;
      
    } catch (error) {
      console.error(`验证${filterType}筛选器失败:`, error);
      return false;
    }
  }

  /**
   * 智能重试筛选器应用
   */
  async retryFilterApplication(filterType, options, pageStructure, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`第${attempt}次尝试应用${filterType}筛选器...`);
        
        // 应用筛选器
        await this.selectFilterOption(filterType, options, pageStructure);
        
        // 验证是否成功
        const isSuccess = await this.verifyFilterApplied(filterType, options);
        
        if (isSuccess) {
          console.log(`${filterType}筛选器应用成功！`);
          return true;
        } else {
          console.warn(`第${attempt}次尝试失败，筛选器未正确应用`);
          
          if (attempt < maxRetries) {
            // 等待后重试
            await this.page.waitForTimeout(2000);
            
            // 尝试刷新筛选器状态
            await this.refreshFilterState(filterType);
          }
        }
        
      } catch (error) {
        console.error(`第${attempt}次尝试应用${filterType}筛选器失败:`, error);
        
        if (attempt < maxRetries) {
          await this.page.waitForTimeout(2000);
        }
      }
    }
    
    console.error(`${filterType}筛选器应用失败，已尝试${maxRetries}次`);
    return false;
  }

  /**
   * 刷新筛选器状态
   */
  async refreshFilterState(filterType) {
    try {
      console.log(`刷新${filterType}筛选器状态...`);
      
      // 尝试重置筛选器
      const resetSelectors = [
        '.reset-btn',
        '.clear-btn',
        '[class*="reset"]',
        '[class*="clear"]',
        '[title*="重置"]',
        '[title*="清除"]'
      ];
      
      for (const selector of resetSelectors) {
        try {
          const resetBtn = await this.page.$(selector);
          if (resetBtn && await resetBtn.isVisible()) {
            await resetBtn.click();
            await this.page.waitForTimeout(1000);
            console.log(`已重置筛选器状态`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      // 等待页面稳定
      await this.page.waitForTimeout(1000);
      
    } catch (error) {
      console.error(`刷新${filterType}筛选器状态失败:`, error);
    }
  }

  /**
   * 获取页面筛选器信息
   */
  async getPageFilterInfo() {
    try {
      console.log('获取页面筛选器信息...');
      
      const filterInfo = await this.page.evaluate(() => {
        const info = {
          filterElements: [],
          filterTexts: [],
          filterClasses: [],
          filterIds: []
        };
        
        // 查找所有可能的筛选器元素
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach((element, index) => {
          if (index > 2000) return; // 限制分析的元素数量
          
          const tagName = element.tagName.toLowerCase();
          const className = element.className;
          const id = element.id;
          const text = element.textContent?.trim();
          
          // 检查是否包含筛选相关的关键词
          const filterKeywords = [
            '筛选', 'filter', '选择', 'select', '选项', 'option',
            '行业', 'industry', '地区', 'location', '城市', 'city',
            '规模', 'size', '薪资', 'salary', '经验', 'experience',
            '学历', 'education', '性质', 'nature', '融资', 'funding',
            '条件', 'condition', '搜索', 'search'
          ];
          
          const hasFilterKeyword = filterKeywords.some(keyword => 
            (className && className.toLowerCase().includes(keyword.toLowerCase())) ||
            (id && id.toLowerCase().includes(keyword.toLowerCase())) ||
            (text && text.toLowerCase().includes(keyword.toLowerCase()))
          );
          
          if (hasFilterKeyword && element.offsetWidth > 0 && element.offsetHeight > 0) {
            info.filterElements.push({
              tagName,
              className,
              id,
              text: text?.substring(0, 100),
              rect: element.getBoundingClientRect(),
              attributes: Array.from(element.attributes).map(attr => ({
                name: attr.name,
                value: attr.value
              }))
            });
            
            if (text) info.filterTexts.push(text.substring(0, 50));
            if (className) info.filterClasses.push(className);
            if (id) info.filterIds.push(id);
          }
        });
        
        return info;
      });
      
      console.log('页面筛选器信息:', {
        elementsCount: filterInfo.filterElements.length,
        textsCount: filterInfo.filterTexts.length,
        classesCount: filterInfo.filterClasses.length,
        idsCount: filterInfo.filterIds.length
      });
      
      return filterInfo;
      
    } catch (error) {
      console.error('获取页面筛选器信息失败:', error);
      return null;
    }
  }
}

module.exports = CompanySearchService;
