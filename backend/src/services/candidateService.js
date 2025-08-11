const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs-extra');
const PopupHandler = require('./popupHandler');
const ElementFinder = require('./elementFinder');
const GeetestHandler = require('./geetestHandler');

/**
 * 候选人智能服务类
 * 负责通过Playwright操控浏览器筛选候选人、进行对话并获取简历
 */
class CandidateService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.storageDir = path.join(__dirname, '../../storage/resumes');
    fs.ensureDirSync(this.storageDir);
    console.log(`存储目录: ${this.storageDir}`);

    // 初始化处理器
    this.popupHandler = null;
    this.elementFinder = null;
    this.geetestHandler = null;

    // 筛选条件配置
    this.filterConfig = {
      jobTitle: '',
      experience: '',
      education: '',
      location: '',
      salary: '',
      keywords: []
    };
  }

  /**
   * 初始化浏览器和页面
   * @returns {Promise<void>}
   */
  async init() {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: false,
        slowMo: 1000,
        args: [
          '--disable-extensions',
          '--disable-plugins',
          '--disable-dev-shm-usage',
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });
      this.page = await this.browser.newPage();
      await this.page.context().setDefaultTimeout(30000);

      // 初始化处理器
      this.initHandlers();

      // 设置页面事件监听
      this.setupPageEvents();
    }
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
   * 设置页面事件监听
   */
  setupPageEvents() {
    // 页面错误处理
    this.page.on('pageerror', (error) => {
      console.log('页面错误:', error.message);
    });

    // 控制台日志处理
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('控制台错误:', msg.text());
      }
    });

    // 下载事件监听
    this.page.on('download', async (download) => {
      const filename = download.suggestedFilename();
      const filePath = path.join(this.storageDir, filename);
      await download.saveAs(filePath);
      console.log(`简历已下载: ${filename}`);
    });
  }

  /**
   * 设置筛选条件
   * @param {Object} filter - 筛选条件
   * @param {string} filter.jobTitle - 职位名称
   * @param {string} filter.experience - 工作经验
   * @param {string} filter.education - 学历
   * @param {string} filter.location - 工作地点
   * @param {string} filter.salary - 薪资范围
   * @param {Array<string>} filter.keywords - 关键词列表
   */
  setFilterConditions(filter) {
    this.filterConfig = {
      ...this.filterConfig,
      ...filter
    };
    console.log('已设置筛选条件:', this.filterConfig);
  }

  /**
   * 导航到候选人搜索页面
   * @param {Object} socket - Socket.IO实例
   */
  async navigateToSearchPage(socket) {
    socket.emit('statusUpdate', { status: 'navigating', message: '正在打开候选人搜索页面...' });
    await this.page.goto('https://rd5.zhaopin.com/resumelist');
    await this.page.waitForLoadState('networkidle');
    console.log('已导航到候选人搜索页面');
  }

  /**
   * 处理搜索页面弹窗
   * @param {Object} socket - Socket.IO实例
   */
  async handleSearchPagePopups(socket) {
    // 处理可能出现的弹窗
    await this.popupHandler.detectPopups();
    await this.popupHandler.closePopups(socket);
    console.log('已处理搜索页面弹窗');
  }

  /**
   * 筛选候选人
   * @param {Object} socket - Socket.IO实例
   * @returns {Promise<Array>} 筛选出的候选人列表
   */
  async filterCandidates(socket) {
    try {
      socket.emit('statusUpdate', { status: 'filtering', message: '正在筛选候选人...' });

      // 确保已初始化
      await this.init();

      // 导航到搜索页面
      await this.navigateToSearchPage(socket);

      // 处理弹窗
      await this.handleSearchPagePopups(socket);

      // 应用筛选条件
      socket.emit('statusUpdate', { status: 'applying_filters', message: '正在应用筛选条件...' });
      await this.applyFilters(socket);

      // 获取候选人列表
      socket.emit('statusUpdate', { status: 'fetching_candidates', message: '正在获取候选人列表...' });
      const candidates = await this.getCandidateList();

      socket.emit('statusUpdate', { status: 'filter_complete', message: `已筛选出 ${candidates.length} 位候选人` });
      return candidates;
    } catch (error) {
      socket.emit('error', { message: `筛选候选人失败: ${error.message}` });
      console.error('筛选候选人失败:', error);
      return [];
    }
  }

  /**
   * 应用职位名称筛选
   */
  async applyJobTitleFilter() {
    if (this.filterConfig.jobTitle) {
      const jobTitleInput = await this.elementFinder.findElement(['input[name*="jobTitle"]', 'input[placeholder*="职位"]']);
      if (jobTitleInput) {
        await jobTitleInput.fill(this.filterConfig.jobTitle);
        console.log(`已设置职位名称: ${this.filterConfig.jobTitle}`);
      }
    }
  }

  /**
   * 应用工作经验筛选
   */
  async applyExperienceFilter() {
    if (this.filterConfig.experience) {
      const experienceSelect = await this.elementFinder.findElement(['select[name*="experience"]', 'div[role="combobox"]']);
      if (experienceSelect) {
        console.log(`已设置工作经验: ${this.filterConfig.experience}`);
      }
    }
  }

  /**
   * 应用学历筛选
   */
  async applyEducationFilter() {
    if (this.filterConfig.education) {
      const educationSelect = await this.elementFinder.findElement(['select[name*="education"]', 'div[role="combobox"]']);
      if (educationSelect) {
        console.log(`已设置学历: ${this.filterConfig.education}`);
      }
    }
  }

  /**
   * 应用工作地点筛选
   */
  async applyLocationFilter() {
    if (this.filterConfig.location) {
      const locationSelect = await this.elementFinder.findElement(['select[name*="location"]', 'div[role="combobox"]']);
      if (locationSelect) {
        console.log(`已设置工作地点: ${this.filterConfig.location}`);
      }
    }
  }

  /**
   * 应用薪资范围筛选
   */
  async applySalaryFilter() {
    if (this.filterConfig.salary) {
      const salarySelect = await this.elementFinder.findElement(['select[name*="salary"]', 'div[role="combobox"]']);
      if (salarySelect) {
        console.log(`已设置薪资范围: ${this.filterConfig.salary}`);
      }
    }
  }

  /**
   * 应用关键词筛选
   */
  async applyKeywordsFilter() {
    if (this.filterConfig.keywords && this.filterConfig.keywords.length > 0) {
      const keywordInput = await this.elementFinder.findElement(['textarea[name*="keyword"]', 'input[placeholder*="关键词"]']);
      if (keywordInput) {
        await keywordInput.fill(this.filterConfig.keywords.join(','));
        console.log(`已设置关键词: ${this.filterConfig.keywords.join(',')}`);
      }
    }
  }

  /**
   * 应用筛选条件
   * @param {Object} socket - Socket.IO实例
   * @returns {Promise<void>}
   */
  async applyFilters(socket) {
    try {
      // 应用各筛选条件
      await this.applyJobTitleFilter();
      await this.applyExperienceFilter();
      await this.applyEducationFilter();
      await this.applyLocationFilter();
      await this.applySalaryFilter();
      await this.applyKeywordsFilter();

      // 点击搜索按钮
      const searchButton = await this.elementFinder.findElement(['button[type="submit"]', 'button:has-text("搜索")', 'text=搜索']);
      if (searchButton) {
        await searchButton.click();
        console.log('已点击搜索按钮');
        await this.page.waitForLoadState('networkidle');
      }
    } catch (error) {
      console.error('应用筛选条件时出错:', error);
      throw error;
    }
  }

  /**
   * 获取候选人列表
   * @returns {Promise<Array>} 候选人列表
   */
  async getCandidateList() {
    try {
      // 等待搜索结果加载
      await this.page.waitForTimeout(3000);

      // 查找候选人条目
      const candidateItems = await this.page.locator('.resume-list-item').all();
      console.log(`找到 ${candidateItems.length} 个候选人`);

      const candidates = [];
      for (const item of candidateItems) {
        try {
          // 提取候选人基本信息
          const name = await item.locator('.name').textContent();
          const jobTitle = await item.locator('.job-title').textContent();
          const experience = await item.locator('.experience').textContent();
          const education = await item.locator('.education').textContent();
          const location = await item.locator('.location').textContent();

          // 获取简历链接或ID
          const resumeLink = await item.locator('a').getAttribute('href');
          const resumeId = resumeLink ? resumeLink.match(/resumeId=(\d+)/)[1] : null;

          candidates.push({
            name: name?.trim() || '未知',
            jobTitle: jobTitle?.trim() || '未知',
            experience: experience?.trim() || '未知',
            education: education?.trim() || '未知',
            location: location?.trim() || '未知',
            resumeId: resumeId || '未知',
            resumeLink: resumeLink || '未知'
          });
        } catch (error) {
          console.error('提取候选人信息时出错:', error);
          // 继续处理下一个候选人
        }
      }

      return candidates;
    } catch (error) {
      console.error('获取候选人列表时出错:', error);
      return [];
    }
  }

  /**
   * 导航到候选人详情页
   * @param {Object} socket - Socket.IO实例
   * @param {string} resumeId - 候选人简历ID
   */
  async navigateToCandidateDetail(socket, resumeId) {
    const resumeUrl = `https://rd5.zhaopin.com/resumedetail?resumeId=${resumeId}`;
    await this.page.goto(resumeUrl);
    await this.page.waitForLoadState('networkidle');
    console.log(`已导航到候选人 ${resumeId} 详情页`);

    // 处理弹窗
    await this.popupHandler.detectPopups();
    await this.popupHandler.closePopups(socket);
  }

  /**
   * 点击联系按钮
   */
  async clickContactButton() {
    const contactButton = await this.elementFinder.findElement(['button:has-text("联系")', 'button:has-text("沟通")', 'text=联系']);
    if (!contactButton) throw new Error('无法找到联系按钮');
    await contactButton.click();
    console.log('已点击联系按钮');
    await this.page.waitForTimeout(3000);
  }

  /**
   * 发送消息给候选人
   * @param {string} message - 要发送的消息
   */
  async sendMessageToCandidate(message) {
    // 查找消息输入框
    const messageInput = await this.elementFinder.findElement(['textarea[placeholder*="输入消息"]', 'input[placeholder*="输入消息"]']);
    if (!messageInput) throw new Error('无法找到消息输入框');

    // 输入消息
    await messageInput.fill(message);
    console.log(`已输入消息: ${message}`);

    // 查找发送按钮
    const sendButton = await this.elementFinder.findElement(['button:has-text("发送")', 'text=发送']);
    if (!sendButton) throw new Error('无法找到发送按钮');

    // 发送消息
    await sendButton.click();
    console.log('已发送消息');
    await this.page.waitForTimeout(2000);
  }

  /**
   * 与候选人进行对话
   * @param {Object} socket - Socket.IO实例
   * @param {string} resumeId - 候选人简历ID
   * @param {string} message - 要发送的消息
   * @returns {Promise<Object>} 对话结果
   */
  async talkWithCandidate(socket, resumeId, message) {
    try {
      socket.emit('statusUpdate', { status: 'talking', message: `正在与候选人 ${resumeId} 对话...` });

      // 确保已初始化
      await this.init();

      // 导航到候选人详情页
      await this.navigateToCandidateDetail(socket, resumeId);

      // 点击联系按钮
      await this.clickContactButton();

      // 发送消息
      await this.sendMessageToCandidate(message);

      socket.emit('statusUpdate', { status: 'talk_complete', message: `已与候选人 ${resumeId} 成功对话` });

      return {
        success: true,
        resumeId: resumeId,
        message: message
      };
    } catch (error) {
      socket.emit('error', { message: `与候选人对话失败: ${error.message}` });
      console.error('与候选人对话失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 导航到候选人简历页面
   * @param {Object} socket - Socket.IO实例
   * @param {string} resumeId - 候选人简历ID
   */
  async navigateToResumePage(socket, resumeId) {
    const resumeUrl = `https://rd5.zhaopin.com/resumedetail?resumeId=${resumeId}`;
    await this.page.goto(resumeUrl);
    await this.page.waitForLoadState('networkidle');
    socket.emit('statusUpdate', { status: 'viewing_resume', message: `正在查看候选人 ${resumeId} 的简历...` });
    console.log(`已导航到候选人 ${resumeId} 的简历页面`);

    // 处理弹窗
    await this.popupHandler.detectPopups();
    await this.popupHandler.closePopups(socket);
  }

  /**
   * 查找并点击下载简历按钮
   */
  async findAndClickDownloadButton() {
    const downloadButton = await this.elementFinder.findElement(['button:has-text("下载简历")', 'button:has-text("下载")', 'text=下载简历']);
    if (!downloadButton) throw new Error('无法找到下载简历按钮');
    await downloadButton.click();
    console.log('已点击下载简历按钮');
    await this.page.waitForTimeout(5000); // 等待下载开始
  }

  /**
   * 处理简历下载结果
   * @param {Object} socket - Socket.IO实例
   * @param {string} resumeId - 候选人简历ID
   * @returns {Object} 下载结果
   */
  async processDownloadResult(socket, resumeId) {
    const files = await fs.readdir(this.storageDir);
    const resumeFiles = files.filter(file => file.includes(resumeId) || file.endsWith('.pdf') || file.endsWith('.doc') || file.endsWith('.docx'));

    if (resumeFiles.length > 0) {
      const latestFile = resumeFiles[resumeFiles.length - 1];
      socket.emit('statusUpdate', { status: 'resume_downloaded', message: `候选人 ${resumeId} 的简历已下载: ${latestFile}` });
      return {
        success: true,
        resumeId: resumeId,
        filename: latestFile,
        filePath: path.join(this.storageDir, latestFile)
      };
    } else {
      socket.emit('statusUpdate', { status: 'resume_download_failed', message: `候选人 ${resumeId} 的简历下载失败` });
      return {
        success: false,
        error: '简历下载失败'
      };
    }
  }

  /**
   * 获取候选人简历
   * @param {Object} socket - Socket.IO实例
   * @param {string} resumeId - 候选人简历ID
   * @returns {Promise<Object>} 简历获取结果
   */
  async getCandidateResume(socket, resumeId) {
    try {
      socket.emit('statusUpdate', { status: 'fetching_resume', message: `正在获取候选人 ${resumeId} 的简历...` });

      // 确保已初始化
      await this.init();

      // 导航到简历页面
      await this.navigateToResumePage(socket, resumeId);

      // 查找并点击下载按钮
      await this.findAndClickDownloadButton();

      // 处理下载结果
      return await this.processDownloadResult(socket, resumeId);
    } catch (error) {
      socket.emit('error', { message: `获取候选人简历失败: ${error.message}` });
      console.error('获取候选人简历失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 清理资源
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      if (this.page) await this.page.close();
      if (this.browser) await this.browser.close();
      console.log('浏览器已关闭');
    } catch (error) {
      console.error('清理资源时出错:', error);
    }
  }

  /**
   * 提交验证码
   * @param {Object} socket - Socket.IO实例
   * @param {string} code - 验证码
   * @returns {Promise<void>}
   */
  async submitVerificationCode(socket, code) {
    try {
      if (!this.page) {
        throw new Error('页面未初始化');
      }

      socket.emit('statusUpdate', { status: 'submitting_code', message: '正在提交验证码...' });

      // 查找验证码输入框
      const codeInput = await this.elementFinder.findElement(['input[placeholder*="验证码"]', 'input[type="text"]', 'input[name*="code"]']);
      if (!codeInput) {
        throw new Error('无法找到验证码输入框');
      }

      // 输入验证码
      await codeInput.fill(code);
      console.log(`已输入验证码: ${code}`);

      // 查找登录按钮
      const loginButton = await this.elementFinder.findElement(['button:has-text("登录")', 'button:has-text("提交")', 'text=登录']);
      if (!loginButton) {
        throw new Error('无法找到登录按钮');
      }

      // 点击登录按钮
      await loginButton.click();
      console.log('已点击登录按钮');
      await this.page.waitForLoadState('networkidle');

      // 检查登录状态
      const isLoggedIn = await this.checkLoginStatus();
      if (isLoggedIn) {
        socket.emit('statusUpdate', { status: 'login_success', message: '登录成功！' });
      } else {
        throw new Error('登录失败，请检查验证码是否正确');
      }
    } catch (error) {
      console.error('验证码提交失败:', error);
      throw error;
    }
  }

  /**
   * 检查登录状态
   * @returns {Promise<boolean>}
   */
  async checkLoginStatus() {
    try {
      if (!this.page) {
        return false;
      }

      const currentUrl = this.page.url();
      if (currentUrl.includes('i.zhaopin.com') || currentUrl.includes('rd5.zhaopin.com')) {
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
}

module.exports = new CandidateService();