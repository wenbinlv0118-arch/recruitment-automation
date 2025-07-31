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
    this.storageDir = path.join(__dirname, '../../storage/resumes');
    fs.ensureDirSync(this.storageDir);
    console.log(`存储目录: ${this.storageDir}`);
    
    // 初始化处理器
    this.popupHandler = null;
    this.elementFinder = null;
    this.geetestHandler = null;
  }

  async startRecruitment(socket, data) {
    try {
      socket.emit('statusUpdate', { status: 'browser_starting', message: '正在启动浏览器...' });

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
      
      // 设置页面错误处理
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

      // 先检查并处理极验验证码
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
          // 尝试多种方式勾选协议
          try {
            await agreement.check();
            console.log('已勾选用户协议');
          } catch (error) {
            console.log('常规勾选失败，尝试JavaScript方式:', error.message);
            // 使用JavaScript直接设置checked属性
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

      // 检查登录状态
      socket.emit('statusUpdate', { status: 'checking_login', message: '正在检查登录状态...' });
      
      // 等待页面稳定
      await this.page.waitForTimeout(3000);
      
      const isLoggedIn = await this.checkLoginStatus();
      if (isLoggedIn) {
        socket.emit('statusUpdate', { status: 'login_success', message: '登录成功！正在分析简历下载入口...' });
        await this.downloadResumes(socket);
      } else {
        // 如果登录检查失败，但页面已经跳转，可能登录成功
        const currentUrl = this.page.url();
        if (currentUrl.includes('i.zhaopin.com') || currentUrl.includes('zhaopin.com')) {
          console.log('页面已跳转到智联招聘，可能登录成功，继续执行');
          socket.emit('statusUpdate', { status: 'login_success', message: '检测到页面跳转，继续执行...' });
          await this.downloadResumes(socket);
        } else {
          throw new Error('登录失败，请检查验证码是否正确');
        }
      }

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

  async downloadResumes(socket) {
    try {
      socket.emit('statusUpdate', { status: 'analyzing', message: '正在分析简历下载入口...' });
      await this.page.waitForTimeout(1000);
      await this.page.screenshot({ path: path.join(this.storageDir, 'debug_after_login.png') });

      // 查找并点击"在线简历"按钮
      socket.emit('statusUpdate', { status: 'finding_resume', message: '正在查找在线简历入口...' });
      const resumeButton = await this.elementFinder.findElement(['text=在线简历', 'text=我的简历', 'a:has-text("简历")']);
      
      if (resumeButton) {
        // 点击在线简历按钮会在新页面打开
        const [newPage] = await Promise.all([
          this.page.context().waitForEvent('page'),
          resumeButton.click()
        ]);
        
        // 更新页面引用并重新初始化处理器
        this.updatePage(newPage);
        await this.page.waitForLoadState('networkidle');
        console.log('已点击在线简历按钮并在新页面打开');
      } else {
        console.log('未找到在线简历按钮，尝试直接访问简历页面');
        await this.page.goto('https://i.zhaopin.com/resume');
        // 更新页面引用并重新初始化处理器
        this.updatePage(this.page);
      }
      
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(3000);
      
      // 专门处理同步弹窗（只处理一次，不使用自动处理）
      console.log('开始处理同步弹窗');
      await this.popupHandler.detectPopups();
      await this.popupHandler.closePopups(socket);
      console.log('同步弹窗处理完成');

      await this.page.screenshot({ path: path.join(this.storageDir, 'debug_resume_page.png') });

      // 查找并点击"下载简历"按钮
      socket.emit('statusUpdate', { status: 'finding_download', message: '正在查找下载简历按钮...' });
      const downloadButton = await this.elementFinder.findElement(['text=下载简历', 'text=下载', 'button:has-text("下载")']);
      if (!downloadButton) throw new Error('无法找到下载简历按钮');

      await downloadButton.click();
      console.log('已点击下载简历按钮');
      await this.page.waitForTimeout(3000); // 增加等待时间确保弹窗出现

      // 不自动关闭弹窗，而是手动处理简历下载弹窗
      // 查找并点击"普通简历"选项
      socket.emit('statusUpdate', { status: 'selecting_resume_type', message: '正在选择简历类型...' });
      const normalResumeButton = await this.elementFinder.findElement(['text=普通简历', 'text=标准简历', 'button:has-text("普通")']);
      if (normalResumeButton) {
        await normalResumeButton.click();
        console.log('已点击普通简历按钮');
        await this.page.waitForTimeout(2000);
      }

      // 查找并点击"立即下载"按钮
      socket.emit('statusUpdate', { status: 'downloading_resume', message: '正在下载简历...' });
      const downloadNowButton = await this.elementFinder.findElement(['text=立即下载', 'text=下载', 'button:has-text("立即下载")']);
      if (!downloadNowButton) throw new Error('无法找到立即下载按钮');

      await downloadNowButton.click();
      console.log('已点击立即下载按钮');

      // 等待下载完成
      socket.emit('statusUpdate', { status: 'download_waiting', message: '正在等待下载完成...' });
      const filesBefore = await fs.readdir(this.storageDir);
      await this.page.waitForTimeout(8000);
      const filesAfter = await fs.readdir(this.storageDir);

      const newFiles = filesAfter.filter(file => !filesBefore.includes(file));
      const downloadedFiles = newFiles.filter(file => file.endsWith('.pdf') || file.endsWith('.doc') || file.endsWith('.docx'));

      if (downloadedFiles.length > 0) {
        socket.emit('statusUpdate', { 
          status: 'completed', 
          message: `简历下载完成！共下载 ${downloadedFiles.length} 个文件: ${downloadedFiles.join(', ')}`
        });
      } else {
        const allResumeFiles = filesAfter.filter(file => file.endsWith('.pdf') || file.endsWith('.doc') || file.endsWith('.docx'));
        if (allResumeFiles.length > 0) {
          socket.emit('statusUpdate', { 
            status: 'completed', 
            message: `简历下载完成！检测到 ${allResumeFiles.length} 个简历文件: ${allResumeFiles.join(', ')}`
          });
        } else {
          socket.emit('statusUpdate', { 
            status: 'download_failed', 
            message: '下载可能失败，请检查浏览器下载设置或手动下载'
          });
        }
      }

    } catch (error) {
      socket.emit('error', { message: `简历下载失败: ${error.message}` });
      console.error('简历下载失败:', error);
    }
  }

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