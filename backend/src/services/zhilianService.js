const logger = require('../utils/logger');
const ResumeModel = require('../models/resumeModel');
const memoryMonitor = require('../utils/memoryMonitor');
const browserDisplayConfig = require('../config/browserDisplayConfig');
const { environmentConfig, getBrowserConfig, validateConfig } = require('../config/environmentConfig');

// 加载Puppeteer模块
let puppeteer = null;
try {
  puppeteer = require('puppeteer');
  logger.info('Puppeteer 模块加载成功');
} catch (error) {
  logger.error('Puppeteer 模块加载失败:', error.message);
  throw new Error(`Puppeteer 模块不可用: ${error.message}`);
}

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
 * 基于Puppeteer的自动化候选人浏览和简历处理功能
 */
class ZhilianService {
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
    
    // 简历处理状态跟踪
    this.resumeProcessingStatus = {
      isActive: false,
      step: 'idle',
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
    
    this.lastCandidateListUrl = null;
  }

  /**
   * 使用重试机制启动浏览器
   * @param {Object} launchOptions - 浏览器启动选项
   * @param {number} maxRetries - 最大重试次数
   * @returns {Promise<Browser>} 浏览器实例
   */
  async launchBrowserWithRetry(launchOptions, maxRetries = 3) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const memUsage = process.memoryUsage();
        logger.info(`浏览器启动第 ${attempt} 次尝试 - 内存使用: RSS=${Math.round(memUsage.rss/1024/1024)}MB`);
        
        const browser = await puppeteer.launch(launchOptions);
        logger.info('浏览器启动成功');
        return browser;
        
      } catch (error) {
        lastError = error;
        logger.error(`浏览器启动第 ${attempt} 次尝试失败: ${error.message}`);
        
        if (attempt === maxRetries) break;
        
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    throw new Error(`浏览器启动失败: ${lastError?.message || '未知错误'}`);
  }

  /**
   * 初始化浏览器 - 使用Puppeteer
   */
  async initializeBrowser() {
    try {
      logger.info('开始初始化Puppeteer浏览器...');
      this.currentStatus = 'initializing';
      
      const config = getBrowserConfig();
      const launchOptions = {
        headless: config.headless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--disable-extensions',
          '--disable-default-apps'
        ],
        timeout: 60000,
        ...config.launchOptions
      };

      // 容器环境特殊处理
      if (process.env.ZEABUR || process.env.CONTAINER) {
        // 只有在明确设置了PUPPETEER_EXECUTABLE_PATH时才使用自定义路径
        // 否则让Puppeteer自动检测浏览器（支持Playwright安装的浏览器）
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
          launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
          logger.info('容器环境使用自定义浏览器路径:', process.env.PUPPETEER_EXECUTABLE_PATH);
        } else {
          logger.info('容器环境让Puppeteer自动检测浏览器路径');
        }
      }

      this.browser = await this.launchBrowserWithRetry(launchOptions);
      
      // 创建初始页面
      this.page = await this.browser.newPage();
      await this.page.setViewport({ width: 1280, height: 720 });
      
      // 设置页面超时
      this.page.setDefaultTimeout(30000);
      this.page.setDefaultNavigationTimeout(30000);
      
      this.currentStatus = 'idle';
      logger.info('Puppeteer浏览器初始化完成');
      
      return true;
      
    } catch (error) {
      logger.error('浏览器初始化失败:', error.message);
      this.currentStatus = 'not_initialized';
      throw error;
    }
  }

  /**
   * 导航到智联招聘网站
   */
  async navigateToZhilian() {
    try {
      if (!this.page) throw new Error('浏览器未初始化');
      
      logger.info('导航到智联招聘网站...');
      await this.page.goto('https://www.zhaopin.com', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // 等待页面加载完成
      await this.page.waitForTimeout(2000);
      logger.info('成功导航到智联招聘网站');
      
      return true;
      
    } catch (error) {
      logger.error('导航失败:', error.message);
      throw error;
    }
  }

  /**
   * 搜索候选人
   */
  async searchCandidates(searchParams) {
    try {
      if (!this.page) throw new Error('浏览器未初始化');
      
      const { keyword, location, experience, education } = searchParams;
      
      logger.info(`开始搜索候选人: ${keyword} in ${location}`);
      
      // 构建搜索URL
      const searchUrl = `https://sou.zhaopin.com/?jl=${location}&kw=${keyword}&et=${experience}&el=${education}`;
      
      await this.page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // 等待搜索结果加载
      await this.page.waitForSelector('.resume-list', { timeout: 10000 });
      
      // 获取候选人列表
      const candidates = await this.page.evaluate(() => {
        const items = document.querySelectorAll('.resume-item');
        return Array.from(items).map(item => ({
          name: item.querySelector('.name')?.textContent?.trim() || '',
          position: item.querySelector('.position')?.textContent?.trim() || '',
          experience: item.querySelector('.experience')?.textContent?.trim() || '',
          education: item.querySelector('.education')?.textContent?.trim() || '',
          url: item.querySelector('a')?.href || ''
        }));
      });
      
      logger.info(`找到 ${candidates.length} 个候选人`);
      return candidates;
      
    } catch (error) {
      logger.error('搜索候选人失败:', error.message);
      throw error;
    }
  }

  /**
   * 处理单个候选人
   */
  async processCandidate(candidateUrl) {
    try {
      if (!this.page) throw new Error('浏览器未初始化');
      
      logger.info(`处理候选人: ${candidateUrl}`);
      
      // 打开新标签页处理候选人
      const newPage = await this.browser.newPage();
      
      try {
        await newPage.goto(candidateUrl, { waitUntil: 'networkidle2' });
        
        // 获取简历信息
        const resumeData = await newPage.evaluate(() => {
          return {
            name: document.querySelector('.candidate-name')?.textContent?.trim() || '',
            position: document.querySelector('.position')?.textContent?.trim() || '',
            experience: document.querySelector('.work-experience')?.textContent?.trim() || '',
            education: document.querySelector('.education-info')?.textContent?.trim() || '',
            skills: Array.from(document.querySelectorAll('.skill')).map(s => s.textContent.trim()),
            summary: document.querySelector('.summary')?.textContent?.trim() || ''
          };
        });
        
        // 保存简历
        await this.saveResume(resumeData);
        
        return resumeData;
        
      } finally {
        await newPage.close();
      }
      
    } catch (error) {
      logger.error('处理候选人失败:', error.message);
      throw error;
    }
  }

  /**
   * 保存简历到数据库
   */
  async saveResume(resumeData) {
    try {
      const resume = {
        ...resumeData,
        source: 'zhilian',
        collectedAt: new Date(),
        quality: analyzeResumeQuality(resumeData)
      };
      
      await ResumeModel.create(resume);
      logger.info(`简历已保存: ${resumeData.name}`);
      
      return resume;
      
    } catch (error) {
      logger.error('保存简历失败:', error.message);
      throw error;
    }
  }

  /**
   * 开始自动浏览候选人
   */
  async startBrowsing(searchParams) {
    try {
      if (!this.browser) {
        await this.initializeBrowser();
      }
      
      this.browsingStatus.isActive = true;
      this.browsingStatus.startTime = new Date();
      this.browsingStatus.mode = 'search';
      
      logger.info('开始自动浏览候选人...');
      
      // 搜索候选人
      const candidates = await this.searchCandidates(searchParams);
      this.browsingStatus.candidates = candidates;
      this.browsingStatus.targetCount = candidates.length;
      
      // 处理每个候选人
      for (let i = 0; i < candidates.length && this.browsingStatus.isActive; i++) {
        const candidate = candidates[i];
        
        try {
          await this.processCandidate(candidate.url);
          this.browsingStatus.processedCount++;
          this.browsingStatus.collectedCount++;
          
          // 发送进度更新
          if (this.io) {
            this.io.emit('browsingProgress', {
              current: i + 1,
              total: candidates.length,
              candidate: candidate.name,
              status: 'processing'
            });
          }
          
          // 随机延迟避免被封
          const delay = Math.random() * 2000 + 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
          
        } catch (error) {
          this.browsingStatus.failedCount++;
          logger.error(`处理候选人失败: ${candidate.name}`, error.message);
        }
      }
      
      this.browsingStatus.isActive = false;
      logger.info('候选人浏览完成');
      
      return {
        total: candidates.length,
        processed: this.browsingStatus.processedCount,
        collected: this.browsingStatus.collectedCount,
        failed: this.browsingStatus.failedCount
      };
      
    } catch (error) {
      this.browsingStatus.isActive = false;
      logger.error('候选人浏览失败:', error.message);
      throw error;
    }
  }

  /**
   * 停止浏览
   */
  async stopBrowsing() {
    this.browsingStatus.isActive = false;
    logger.info('已停止候选人浏览');
  }

  /**
   * 关闭浏览器
   */
  async close() {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      this.currentStatus = 'not_initialized';
      logger.info('浏览器已关闭');
      
    } catch (error) {
      logger.error('关闭浏览器失败:', error.message);
    }
  }

  /**
   * 获取当前状态
   */
  getStatus() {
    return {
      currentStatus: this.currentStatus,
      browsing: this.browsingStatus,
      resumeProcessing: this.resumeProcessingStatus
    };
  }
}

module.exports = ZhilianService;