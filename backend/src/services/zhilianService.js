const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs-extra');
const PopupHandler = require('./popupHandler');
const ElementFinder = require('./elementFinder');
const GeetestHandler = require('./geetestHandler');

class ZhilianService {
  constructor() {
    this.browser = null;
    this.page = null;
    this.waitingForCode = false;
    this.isActive = false; // 添加服务状态标识
    this.sessionId = null; // 添加会话标识符
    this.storageDir = path.join(__dirname, '../../storage/resumes');
    fs.ensureDirSync(this.storageDir);
    console.log(`存储目录: ${this.storageDir}`);
    
    // 初始化处理器
    this.popupHandler = null;
    this.elementFinder = null;
    this.geetestHandler = null;
  }

  /**
   * 初始化浏览器和页面设置
   * @param {Object} socket - Socket.IO实例
   */
  async initBrowser(socket) {
    socket.emit('statusUpdate', { status: 'browser_starting', message: '正在启动浏览器...' });

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
  }

  /**
   * 设置页面事件监听器
   * @param {Object} socket - Socket.IO实例
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

    // 监听下载事件
    this.page.on('download', async (download) => {
      const filename = download.suggestedFilename();
      const filePath = path.join(this.storageDir, filename);
      await download.saveAs(filePath);
      socket.emit('statusUpdate', {
        status: 'resume_downloaded',
        message: `简历已下载: ${filename}`,
        filename: filename
      });
    });
  }

  /**
   * 处理登录流程
   * @param {Object} socket - Socket.IO实例
   * @param {Object} data - 包含手机号等登录信息
   */
  async login(socket, data) {
    socket.emit('statusUpdate', { status: 'navigating', message: '正在打开智联招聘网站...' });
    await this.page.goto('https://passport.zhaopin.com/login');
    await this.page.waitForLoadState('networkidle');
    await this.page.screenshot({ path: path.join(this.storageDir, 'debug_homepage.png') });

    // 输入手机号
    socket.emit('statusUpdate', { status: 'inputting_phone', message: '正在输入手机号...' });
    const phone = data.phone || '15675156459';
    const phoneInput = await this.elementFinder.findElement(['input[placeholder*="手机"]', 'input[type="tel"]', 'input[name*="phone"]']);
    if (!phoneInput) throw new Error('无法找到手机号输入框');

    await phoneInput.clear();
    await phoneInput.fill(phone);
    console.log(`已输入手机号: ${phone}`);

    // 处理极验验证码
    socket.emit('statusUpdate', { status: 'checking_geetest', message: '检查验证码...' });
    const hasGeetest = await this.geetestHandler.handleGeetest(socket);
    if (hasGeetest) {
      console.log('极验验证码处理完成，继续执行');
    }

    // 勾选用户协议
    socket.emit('statusUpdate', { status: 'checking_agreement', message: '正在勾选用户协议...' });
    try {
      const agreement = await this.elementFinder.findElement(['input[type="checkbox"]', '[class*="agreement"]']);
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

    // 等待用户输入验证码
    socket.emit('statusUpdate', {
      status: 'waiting_code',
      message: '请手动点击发送验证码按钮，然后输入收到的验证码',
      requiresInput: true
    });

    // 等待页面稳定
    await this.page.waitForTimeout(3000);
  }

  /**
   * 处理登录后的流程，包括检查登录状态和下载简历
   * @param {Object} socket - Socket.IO实例
   */
  async processAfterLogin(socket) {
    // 检查登录状态
    socket.emit('statusUpdate', { status: 'checking_login', message: '正在检查登录状态...' });
    const isLoggedIn = await this.checkLoginStatus();

    if (isLoggedIn) {
      socket.emit('statusUpdate', { status: 'login_success', message: '登录成功！正在分析简历下载入口...' });
      await this.downloadResumes(socket);
    } else {
      const currentUrl = this.page.url();
      if (currentUrl.includes('i.zhaopin.com') || currentUrl.includes('zhaopin.com')) {
        console.log('页面已跳转到智联招聘，可能登录成功，继续执行');
        socket.emit('statusUpdate', { status: 'login_success', message: '检测到页面跳转，继续执行...' });
        await this.downloadResumes(socket);
      } else {
        throw new Error('登录失败，请检查验证码是否正确');
      }
    }
  }

  async startRecruitment(socket, data) {
    try {
      await this.initBrowser(socket);
      await this.login(socket, data);
      await this.processAfterLogin(socket);
    } catch (error) {
      console.error('验证码提交失败:', error);
      throw error;
    } finally {
      this.waitingForCode = false;
    }
  }

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

  // ... existing code ...

  /**
   * 处理登录后的流程，包括检查登录状态和下载简历
   * @param {Object} socket - Socket.IO实例
   */
  async processAfterLogin(socket) {
    // 检查登录状态
    socket.emit('statusUpdate', { status: 'checking_login', message: '正在检查登录状态...' });
    const isLoggedIn = await this.checkLoginStatus();

    if (isLoggedIn) {
      socket.emit('statusUpdate', { status: 'login_success', message: '登录成功！正在导航到在线简历页面...' });
      await this.navigateToOnlineResumePage(socket);
    } else {
      const currentUrl = this.page.url();
      if (currentUrl.includes('i.zhaopin.com') || currentUrl.includes('zhaopin.com')) {
        console.log('页面已跳转到智联招聘，可能登录成功，继续执行');
        socket.emit('statusUpdate', { status: 'login_success', message: '检测到页面跳转，正在导航到在线简历页面...' });
        await this.navigateToOnlineResumePage(socket);
      } else {
        throw new Error('登录失败，请检查验证码是否正确');
      }
    }
  }

  /**
   * 导航到在线简历页面
   * @param {Object} socket - Socket.IO实例
   */
  async navigateToOnlineResumePage(socket) {
    socket.emit('statusUpdate', { status: 'navigating_online_resume', message: '正在导航到在线简历页面...' });
    
    try {
      // 等待页面稳定
      await this.page.waitForTimeout(3000);
      
      // 查找并点击"在线简历"按钮
      const onlineResumeSelectors = [
        'text=在线简历',
        'a:has-text("在线简历")',
        'button:has-text("在线简历")',
        '[class*="online-resume"]',
        '[class*="OnlineResume"]',
        'text=我的简历',
        'a:has-text("我的简历")'
      ];
      
      let onlineResumeButton = null;
      for (const selector of onlineResumeSelectors) {
        try {
          onlineResumeButton = await this.elementFinder.findElement([selector], { 
            timeout: 5000, 
            retryCount: 2 
          });
          if (onlineResumeButton && await onlineResumeButton.isVisible()) {
            console.log(`找到在线简历按钮: ${selector}`);
            break;
          }
        } catch (error) {
          console.log(`未找到在线简历按钮: ${selector}`);
        }
      }
      
      if (!onlineResumeButton) {
        throw new Error('无法找到"在线简历"按钮，请检查页面状态');
      }
      
      // 点击"在线简历"按钮
      await onlineResumeButton.click();
      console.log('已点击"在线简历"按钮');
      
      // 等待页面跳转完成
      await this.page.waitForLoadState('networkidle');
      // 使用更智能的等待方式，监听页面加载事件
      await Promise.race([
        this.page.waitForSelector('body', { timeout: 5000 }),
        new Promise(resolve => setTimeout(resolve, 3000))
      ]);
      
      // 保存调试截图
      await this.page.screenshot({ path: path.join(this.storageDir, 'debug_online_resume_page.png') });
      console.log('已跳转到在线简历页面');
      
      // 处理页面弹窗
      socket.emit('statusUpdate', { status: 'handling_popups', message: '正在处理页面弹窗...' });
      console.log('开始处理页面弹窗');
      
      // 更新页面引用以确保弹窗处理在正确页面
      const pages = this.browser.contexts()[0].pages();
      if (pages.length > 0) {
        this.updatePage(pages[pages.length - 1]);
        console.log('已更新页面引用');
      }
      
      // 弹窗处理功能已被禁用
      // await this.popupHandler.detectPopups();
      // await this.popupHandler.closePopups(socket);
      console.log('页面弹窗处理功能已被禁用');
      
      // 验证页面是否正确加载
      const pageTitle = await this.page.title();
      const pageUrl = this.page.url();
      console.log(`页面标题: ${pageTitle}`);
      console.log(`页面URL: ${pageUrl}`);
      
      socket.emit('statusUpdate', { 
        status: 'online_resume_page_ready', 
        message: '在线简历页面加载完成，准备下载简历' 
      });
      
      // 开始下载简历流程
      await this.downloadOnlineResume(socket);
      
    } catch (error) {
      console.error('导航到在线简历页面时出错:', error);
      socket.emit('statusUpdate', { 
        status: 'navigation_error', 
        message: `导航失败: ${error.message}` 
      });
      throw error;
    }
  }

  /**
   * 下载在线简历
   * @param {Object} socket - Socket.IO实例
   */
  async downloadOnlineResume(socket) {
    try {
      socket.emit('statusUpdate', { status: 'downloading_online_resume', message: '正在查找下载简历按钮...' });
      
      // 使用更智能的等待方式，监听页面加载事件
      await Promise.race([
        this.page.waitForLoadState('domcontentloaded'),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);
      
      // 查找"下载简历"按钮
      const downloadResumeSelectors = [
        'text=下载简历',
        'button:has-text("下载简历")',
        'a:has-text("下载简历")',
        '[class*="download-resume"]',
        '[class*="DownloadResume"]'
      ];
      
      let downloadResumeButton = null;
      for (const selector of downloadResumeSelectors) {
        try {
          downloadResumeButton = await this.elementFinder.findElement([selector], { 
            timeout: 5000, 
            retryCount: 2 
          });
          if (downloadResumeButton && await downloadResumeButton.isVisible()) {
            console.log(`找到下载简历按钮: ${selector}`);
            break;
          }
        } catch (error) {
          console.log(`未找到下载简历按钮: ${selector}`);
        }
      }
      
      if (!downloadResumeButton) {
        throw new Error('无法找到"下载简历"按钮，请检查页面状态');
      }
      
      // 点击"下载简历"按钮
      await downloadResumeButton.click();
      console.log('已点击"下载简历"按钮');
      
      // 使用更智能的等待方式，监听页面加载事件
      await Promise.race([
        this.page.waitForLoadState('domcontentloaded'),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);
      
      // 更新页面引用以确保弹窗处理在正确页面
      const pages = this.browser.contexts()[0].pages();
      if (pages.length > 0) {
        this.updatePage(pages[pages.length - 1]);
        console.log('已更新页面引用');
      }
      
      // 处理简历下载相关的弹窗（选择普通简历类型） - 已禁用
      // await this.popupHandler.handleResumeDownloadPopups(socket);
      
      // 查找"普通简历"下方的"立即下载"按钮
      socket.emit('statusUpdate', { status: 'finding_download_button', message: '正在查找立即下载按钮...' });
      
      const immediateDownloadSelectors = [
        'text=立即下载',
        'button:has-text("立即下载")',
        'a:has-text("立即下载")',
        '[class*="immediate-download"]',
        '[class*="ImmediateDownload"]'
      ];
      
      let immediateDownloadButton = null;
      for (const selector of immediateDownloadSelectors) {
        try {
          immediateDownloadButton = await this.elementFinder.findElement([selector], { 
            timeout: 5000, 
            retryCount: 2 
          });
          if (immediateDownloadButton && await immediateDownloadButton.isVisible()) {
            console.log(`找到立即下载按钮: ${selector}`);
            break;
          }
        } catch (error) {
          console.log(`未找到立即下载按钮: ${selector}`);
        }
      }
      
      if (!immediateDownloadButton) {
        throw new Error('无法找到"立即下载"按钮，请检查页面状态');
      }
      
      // 点击"立即下载"按钮
      socket.emit('statusUpdate', { status: 'clicking_download', message: '正在点击立即下载按钮...' });
      await immediateDownloadButton.click();
      console.log('已点击"立即下载"按钮');
      
      // 使用更智能的等待方式，监听下载事件
      await Promise.race([
        new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('下载超时')), 10000);
          this.page.on('download', (download) => {
            clearTimeout(timeout);
            resolve(download);
          });
        }),
        new Promise(resolve => setTimeout(resolve, 5000))
      ]);
      
      socket.emit('statusUpdate', {
        status: 'download_triggered',
        message: '简历下载已触发，请检查下载文件夹'
      });
      
      console.log('在线简历下载流程完成');
      
    } catch (error) {
      console.error('下载在线简历时出错:', error);
      socket.emit('statusUpdate', { 
        status: 'download_error', 
        message: `下载失败: ${error.message}` 
      });
      throw error;
    }
  }

// ... existing code ...

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
   * 初始化所有处理器
   */
  initHandlers() {
    this.popupHandler = new PopupHandler(this.page, this.storageDir);
    this.elementFinder = new ElementFinder(this.page);
    this.geetestHandler = new GeetestHandler(this.page);
  }

  /**
   * 更新当前页面引用并重新初始化处理器
   * @param {Page} newPage - 新的页面实例
   */
  updatePage(newPage) {
    this.page = newPage;
    this.initHandlers();
    console.log('页面已更新，处理器已重新初始化');
  }
}

module.exports = new ZhilianService();