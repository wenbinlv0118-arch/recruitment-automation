/**
 * Boss直聘服务类 - Puppeteer版本
 * 专为Zeabur容器环境优化，解决Playwright依赖问题
 */

const logger = require('../utils/logger');
const ResumeModel = require('../models/resumeModel');

// 使用Puppeteer替代Playwright
const puppeteer = require('puppeteer');

class BossZhipinService {
  constructor(io = null) {
    this.browser = null;
    this.page = null;
    this.isLoggedIn = false;
    this.currentStatus = 'not_initialized';
    this.io = io;
    this.isStopped = false;
    
    // 候选人浏览状态跟踪
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
  }

  /**
   * 初始化浏览器 - Puppeteer版本
   */
  async initializeBrowser() {
    try {
      logger.info('正在启动 Boss 直聘自动化浏览器...');
      this.currentStatus = 'initializing';
      
      // 检测环境
      const isContainerEnv = process.env.NODE_ENV === 'production' || process.env.ZEABUR || process.env.CONTAINER;
      const shouldUseHeadless = isContainerEnv || process.env.BROWSER_HEADLESS === 'true';
      
      // Puppeteer启动参数 - 使用新的headless模式
      const launchOptions = {
        headless: shouldUseHeadless ? "new" : false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-extensions',
          '--disable-default-apps',
          '--disable-sync',
          '--disable-translate',
          '--hide-scrollbars',
          '--metrics-recording-only',
          '--mute-audio',
          '--no-first-run',
          '--safebrowsing-disable-auto-update',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-features=VizDisplayCompositor',
          '--disable-web-security',
          '--disable-blink-features=AutomationControlled',
          '--disable-popup-blocking',
          '--disable-background-tab-throttling',
          '--autoplay-policy=no-user-gesture-required',
          '--disable-permissions-api',
          '--disable-component-extensions-with-background-pages',
          '--disable-background-networking',
          '--disable-crash-reporter',
          '--max-old-space-size=512',
          '--memory-pressure-off'
        ],
        defaultViewport: {
          width: 1366,
          height: 768
        },
        timeout: 60000
      };

      // 容器环境特殊配置
      if (isContainerEnv) {
        // 只有在明确设置了PUPPETEER_EXECUTABLE_PATH时才使用自定义路径
        // 否则让Puppeteer自动检测浏览器（支持Playwright安装的浏览器）
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
          launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
          logger.info('容器环境使用自定义浏览器路径:', process.env.PUPPETEER_EXECUTABLE_PATH);
        } else {
          logger.info('容器环境让Puppeteer自动检测浏览器路径');
        }
      }

      this.browser = await puppeteer.launch(launchOptions);
      
      // 创建页面
      this.page = await this.browser.newPage();
      
      // 设置用户代理
      const userAgents = [
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ];
      const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      await this.page.setUserAgent(randomUserAgent);
      
      // 设置页面超时
      this.page.setDefaultTimeout(30000);
      this.page.setDefaultNavigationTimeout(30000);
      
      // 隐藏自动化特征
      await this.page.evaluateOnNewDocument(() => {
        delete navigator.__proto__.webdriver;
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
        
        window.chrome = { runtime: {} };
        
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });
        
        Object.defineProperty(navigator, 'languages', {
          get: () => ['zh-CN', 'zh', 'en'],
        });
      });

      this.currentStatus = 'idle';
      logger.info('Boss 直聘自动化浏览器启动成功');
      return true;
      
    } catch (error) {
      logger.error('启动 Boss 直聘自动化浏览器失败:', error);
      this.currentStatus = 'not_initialized';
      throw error;
    }
  }

  /**
   * 导航到Boss直聘网站
   */
  async navigateToBossZhipin() {
    try {
      if (!this.page) throw new Error('浏览器未初始化');
      
      logger.info('导航到Boss直聘网站...');
      await this.page.goto('https://www.zhipin.com', { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // 等待页面加载
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      logger.info('成功导航到Boss直聘');
      return true;
      
    } catch (error) {
      logger.error('导航到Boss直聘失败:', error);
      throw error;
    }
  }

  /**
   * 搜索候选人
   */
  async searchCandidates(searchParams) {
    try {
      if (!this.page) throw new Error('浏览器未初始化');
      
      const { keyword, city, experience, education } = searchParams;
      
      logger.info(`开始搜索候选人: ${keyword} ${city}`);
      
      // 构建搜索URL
      let searchUrl = `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(keyword)}`;
      if (city) searchUrl += `&city=${encodeURIComponent(city)}`;
      
      await this.page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // 等待搜索结果加载
      await this.page.waitForSelector('.job-list', { timeout: 10000 });
      
      // 获取候选人列表
      const candidates = await this.extractCandidatesFromPage();
      
      logger.info(`搜索完成，找到 ${candidates.length} 个候选人`);
      return candidates;
      
    } catch (error) {
      logger.error('搜索候选人失败:', error);
      throw error;
    }
  }

  /**
   * 从页面提取候选人信息
   */
  async extractCandidatesFromPage() {
    try {
      return await this.page.evaluate(() => {
        const candidates = [];
        const jobCards = document.querySelectorAll('.job-card-wrapper');
        
        jobCards.forEach(card => {
          try {
            const title = card.querySelector('.job-name')?.textContent?.trim();
            const company = card.querySelector('.company-name')?.textContent?.trim();
            const salary = card.querySelector('.salary')?.textContent?.trim();
            const location = card.querySelector('.job-area')?.textContent?.trim();
            const experience = card.querySelector('.job-pub-time')?.textContent?.trim();
            
            if (title && company) {
              candidates.push({
                title,
                company,
                salary,
                location,
                experience,
                source: 'boss_zhipin',
                collectedAt: new Date().toISOString()
              });
            }
          } catch (e) {
            console.error('解析职位卡片失败:', e);
          }
        });
        
        return candidates;
      });
    } catch (error) {
      logger.error('提取候选人信息失败:', error);
      return [];
    }
  }

  /**
   * 浏览候选人列表
   */
  async browseCandidates(searchParams, options = {}) {
    try {
      if (this.browsingStatus.isActive) {
        logger.warn('已有浏览任务在进行中');
        return { success: false, message: '已有浏览任务在进行中' };
      }

      await this.initializeBrowser();
      await this.navigateToBossZhipin();

      this.browsingStatus = {
        isActive: true,
        mode: 'browse',
        candidates: [],
        processedCount: 0,
        collectedCount: 0,
        failedCount: 0,
        currentIndex: 0,
        filters: searchParams,
        startTime: new Date(),
        targetCount: options.targetCount || 50,
        currentPage: 1,
        totalPages: 0
      };

      this.isStopped = false;

      // 开始搜索
      const candidates = await this.searchCandidates(searchParams);
      
      this.browsingStatus.candidates = candidates;
      this.browsingStatus.processedCount = candidates.length;
      this.browsingStatus.collectedCount = candidates.length;

      // 保存到数据库
      if (options.saveToDatabase !== false) {
        await this.saveCandidatesToDatabase(candidates);
      }

      this.browsingStatus.isActive = false;
      
      return {
        success: true,
        candidates: candidates,
        total: candidates.length,
        message: `成功浏览 ${candidates.length} 个候选人`
      };

    } catch (error) {
      logger.error('浏览候选人失败:', error);
      this.browsingStatus.isActive = false;
      throw error;
    }
  }

  /**
   * 保存候选人到数据库
   */
  async saveCandidatesToDatabase(candidates) {
    try {
      if (!candidates || candidates.length === 0) return;

      const ResumeModel = require('../models/resumeModel');
      const savedCount = await ResumeModel.batchInsert(candidates);
      
      logger.info(`已保存 ${savedCount} 个候选人到数据库`);
      return savedCount;
      
    } catch (error) {
      logger.error('保存候选人到数据库失败:', error);
      throw error;
    }
  }

  /**
   * 停止当前任务
   */
  async stopCurrentTask() {
    this.isStopped = true;
    this.browsingStatus.isActive = false;
    this.resumeProcessingStatus.isActive = false;
    
    if (this.browser) {
      try {
        await this.browser.close();
        this.browser = null;
        this.page = null;
      } catch (error) {
        logger.error('关闭浏览器失败:', error);
      }
    }
    
    logger.info('已停止当前任务');
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      browserStatus: this.currentStatus,
      browsingStatus: this.browsingStatus,
      resumeProcessingStatus: this.resumeProcessingStatus,
      isInitialized: this.browser !== null
    };
  }

  /**
   * 清理资源
   */
  async cleanup() {
    await this.stopCurrentTask();
    logger.info('BossZhipinService 资源已清理');
  }
}

module.exports = BossZhipinService;
