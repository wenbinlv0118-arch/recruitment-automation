const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

// 引入新创建的模块
const { ElementFinder } = require('./src/services/elementFinder');
const { PopupHandler } = require('./src/services/popupHandler');
const { GeetestHandler } = require('./src/services/geetestHandler');

async function testFullFlow() {
  console.log('=== 智联招聘完整流程测试 ===');
  
  // 创建存储目录
  const storageDir = path.join(__dirname, 'test-storage');
  try {
    await fs.mkdir(storageDir, { recursive: true });
  } catch (error) {
    // 目录可能已存在
  }
  
  let browser;
  try {
    // 1. 启动浏览器
    console.log('1. 启动浏览器...');
    browser = await chromium.launch({ 
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-extensions'
      ]
    });
    
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    });
    
    const page = await context.newPage();
    
    // 创建模块实例
    const elementFinder = new ElementFinder(page, storageDir);
    const popupHandler = new PopupHandler(page, storageDir);
    const geetestHandler = new GeetestHandler(page, storageDir);
    
    // 2. 访问智联招聘登录页面
    console.log('2. 访问智联招聘登录页面...');
    await page.goto('https://passport.zhaopin.com/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 保存初始页面截图
    await page.screenshot({ path: path.join(storageDir, 'test_1_initial_page.png') });
    console.log('已保存初始页面截图');
    
    // 3. 自动处理弹窗
    console.log('\n3. 自动处理弹窗...');
    await popupHandler.autoHandlePopups();
    
    // 4. 输入手机号
    console.log('\n4. 输入手机号...');
    const phoneInput = await elementFinder.findElement([
      'input#phone',
      'input[name="phone"]',
      'input[type="tel"]',
      'input[placeholder*="手机"]',
      'input[placeholder*="号码"]'
    ], { timeout: 10000 });
    
    if (phoneInput) {
      await phoneInput.fill('13800138000');
      console.log('已输入手机号');
    } else {
      throw new Error('无法找到手机号输入框');
    }
    
    // 5. 处理极验验证码
    console.log('\n5. 处理极验验证码...');
    const geetestResult = await geetestHandler.handleGeetest();
    if (geetestResult.handled) {
      console.log('极验验证码已处理');
      if (geetestResult.requiresUserAction) {
        console.log('需要用户手动完成极验验证，请在浏览器中操作...');
        await page.waitForTimeout(30000); // 等待用户操作
      }
    } else {
      console.log('未检测到极验验证码');
    }
    
    // 6. 点击用户协议
    console.log('\n6. 点击用户协议...');
    const agreementCheckbox = await elementFinder.findElement([
      'input[type="checkbox"][name*="agreement"]',
      'input[type="checkbox"]:has-text("用户协议")',
      'label:has-text("用户协议") input[type="checkbox"]',
      'text=用户协议 >> input[type="checkbox"]'
    ], { timeout: 5000 });
    
    if (agreementCheckbox) {
      await agreementCheckbox.click();
      console.log('已点击用户协议');
    } else {
      console.log('未找到用户协议复选框');
    }
    
    // 7. 点击发送验证码
    console.log('\n7. 点击发送验证码...');
    const sendCodeButton = await elementFinder.findElement([
      'button:has-text("发送验证码")',
      'button:has-text("获取验证码")',
      'button[type="submit"]',
      'button[class*="send"]'
    ], { timeout: 5000 });
    
    if (sendCodeButton) {
      await sendCodeButton.click();
      console.log('已点击发送验证码按钮');
    } else {
      throw new Error('无法找到发送验证码按钮');
    }
    
    // 8. 等待用户输入验证码
    console.log('\n8. 等待用户输入验证码...');
    console.log('请在浏览器中手动输入验证码，然后按回车继续...');
    
    // 等待用户手动输入验证码
    await page.waitForTimeout(30000); // 等待30秒
    
    // 9. 检查登录状态
    console.log('\n9. 检查登录状态...');
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log('当前URL:', currentUrl);
    
    if (currentUrl.includes('login') || currentUrl.includes('auth')) {
      console.log('仍在登录页面，登录可能失败');
      return;
    }
    
    console.log('登录成功！');
    
    // 10. 查找在线简历按钮
    console.log('\n10. 查找在线简历按钮...');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: path.join(storageDir, 'test_2_after_login.png') });
    console.log('已保存登录后页面截图');
    
    const resumeButton = await elementFinder.findElement([
      'text=在线简历',
      'text=我的简历',
      'text=简历管理',
      'a:has-text("简历")',
      'button:has-text("简历")',
      '[class*="resume"]',
      '[class*="Resume"]'
    ], { timeout: 10000 });

    if (!resumeButton || !(await resumeButton.isVisible())) {
      console.log('未找到在线简历按钮，尝试直接访问简历页面');
      await page.goto('https://i.zhaopin.com/resume');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    } else {
      await resumeButton.click();
      console.log('已点击在线简历按钮');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);
    }
    
    // 11. 保存简历页面截图
    await page.screenshot({ path: path.join(storageDir, 'test_3_resume_page.png') });
    console.log('已保存简历页面截图');
    
    // 12. 查找下载简历按钮
    console.log('\n11. 查找下载简历按钮...');
    const downloadButton = await elementFinder.findElement([
      'text=下载简历',
      'text=下载',
      'text=导出简历',
      'button:has-text("下载")',
      'button:has-text("导出")',
      'a:has-text("下载")',
      '[class*="download"]',
      '[class*="Download"]'
    ], { timeout: 10000 });

    if (!downloadButton || !(await downloadButton.isVisible())) {
      throw new Error('无法找到下载简历按钮');
    }

    await downloadButton.click();
    console.log('已点击下载简历按钮');
    await page.waitForTimeout(2000);
    
    // 13. 选择普通简历
    console.log('\n12. 选择普通简历...');
    const normalResumeButton = await elementFinder.findElement([
      'text=普通简历',
      'text=标准简历',
      'text=基础简历',
      'button:has-text("普通")',
      'button:has-text("标准")',
      '[class*="normal"]',
      '[class*="basic"]'
    ], { timeout: 5000 });

    if (normalResumeButton && await normalResumeButton.isVisible()) {
      await normalResumeButton.click();
      console.log('已点击普通简历按钮');
      await page.waitForTimeout(2000);
    } else {
      console.log('未找到普通简历按钮，可能已经是默认选项');
    }
    
    // 14. 点击立即下载
    console.log('\n13. 点击立即下载...');
    const downloadNowButton = await elementFinder.findElement([
      'text=立即下载',
      'text=下载',
      'text=确认下载',
      'button:has-text("立即下载")',
      'button:has-text("下载")',
      'button:has-text("确认")',
      '[class*="download"]',
      '[class*="confirm"]'
    ], { timeout: 5000 });

    if (!downloadNowButton || !(await downloadNowButton.isVisible())) {
      throw new Error('无法找到立即下载按钮');
    }

    await downloadNowButton.click();
    console.log('已点击立即下载按钮');
    
    // 15. 等待下载完成
    console.log('\n14. 等待下载完成...');
    await page.waitForTimeout(5000);
    
    // 16. 检查下载的文件
    console.log('\n15. 检查下载的文件...');
    const files = await fs.readdir(storageDir);
    const downloadedFiles = files.filter(file => 
      file.endsWith('.pdf') || file.endsWith('.doc') || file.endsWith('.docx')
    );

    if (downloadedFiles.length > 0) {
      console.log(`下载完成！共下载 ${downloadedFiles.length} 个文件:`);
      downloadedFiles.forEach(file => {
        console.log(`  - ${file}`);
      });
    } else {
      console.log('下载流程完成，但未检测到下载文件');
    }
    
    console.log('\n=== 完整流程测试结束 ===');
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testFullFlow();