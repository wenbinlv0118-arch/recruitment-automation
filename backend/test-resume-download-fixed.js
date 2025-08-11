const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs-extra');

/**
 * 测试修复后的简历下载功能
 */
async function testFixedResumeDownload() {
  let browser = null;
  const storageDir = path.join(__dirname, 'storage');
  
  try {
    console.log('=== 开始测试修复后的简历下载功能 ===');
    
    // 1. 确保存储目录存在
    await fs.ensureDir(storageDir);
    
    // 2. 启动浏览器
    console.log('\n1. 启动浏览器...');
    browser = await chromium.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      acceptDownloads: true,
      downloadsPath: storageDir
    });
    
    const page = await context.newPage();
    
    // 3. 访问智联招聘登录页面
    console.log('\n2. 访问智联招聘登录页面...');
    await page.goto('https://i.zhaopin.com/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // 保存登录页面截图
    await page.screenshot({ path: path.join(storageDir, 'test_1_login_page.png') });
    console.log('已保存登录页面截图');
    
    // 4. 输入手机号
    console.log('\n3. 输入手机号...');
    const phoneInput = await page.locator('input[placeholder*="手机"], input[type="tel"], input[name*="phone"]').first();
    if (!phoneInput) {
      throw new Error('无法找到手机号输入框');
    }
    
    await phoneInput.clear();
    await phoneInput.fill('15675156459');
    console.log('已输入手机号: 15675156459');
    
    // 5. 勾选用户协议
    console.log('\n4. 勾选用户协议...');
    const agreement = await page.locator('input[type="checkbox"], [class*="agreement"]').first();
    if (agreement && !(await agreement.isChecked())) {
      await agreement.check();
      console.log('已勾选用户协议');
    } else {
      console.log('用户协议已经勾选或未找到');
    }
    
    // 6. 等待用户手动登录
    console.log('\n5. 请手动完成登录验证...');
    console.log('等待页面跳转到主页面...');
    
    // 等待页面跳转或URL变化
    await page.waitForFunction(() => {
      return window.location.href.includes('i.zhaopin.com') && 
             !window.location.href.includes('login') &&
             !window.location.href.includes('auth');
    }, { timeout: 120000 }); // 2分钟超时
    
    console.log('登录成功，页面已跳转');
    await page.waitForTimeout(3000);
    
    // 保存主页面截图
    await page.screenshot({ path: path.join(storageDir, 'test_2_main_page.png') });
    console.log('已保存主页面截图');
    
    // 7. 导航到简历页面
    console.log('\n6. 导航到简历页面...');
    await page.goto('https://i.zhaopin.com/resume');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    // 保存简历页面截图
    await page.screenshot({ path: path.join(storageDir, 'test_3_resume_page.png') });
    console.log('已保存简历页面截图');
    
    // 8. 测试简历下载功能
    console.log('\n7. 测试简历下载功能...');
    
    // 查找简历项目
    const resumeElements = await page.$$('[class*="resume-item"]');
    console.log(`找到${resumeElements.length}份简历`);
    
    if (resumeElements.length === 0) {
      console.log('未找到简历项目，测试结束');
      return;
    }
    
    // 测试下载第一份简历
    const firstResume = resumeElements[0];
    console.log('测试下载第一份简历...');
    
    // 查找下载按钮
    const downloadSelectors = [
      'text=下载简历',
      'text=下载',
      'text=导出简历',
      'button:has-text("下载")',
      'button:has-text("导出")',
      'a:has-text("下载")',
      '[class*="download"]',
      '[class*="Download"]'
    ];
    
    let downloadButton = null;
    for (const selector of downloadSelectors) {
      try {
        downloadButton = await firstResume.locator(selector).first();
        if (await downloadButton.isVisible()) {
          console.log(`找到下载按钮: ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`未找到下载按钮: ${selector}`);
      }
    }
    
    if (!downloadButton || !(await downloadButton.isVisible())) {
      console.log('❌ 无法找到下载按钮');
      return;
    }
    
    // 点击下载按钮
    await downloadButton.click();
    console.log('已点击下载按钮');
    await page.waitForTimeout(3000);
    
    // 保存下载弹窗截图
    await page.screenshot({ path: path.join(storageDir, 'test_4_download_popup.png') });
    console.log('已保存下载弹窗截图');
    
    // 9. 检查下载的文件
    console.log('\n8. 检查下载的文件...');
    await page.waitForTimeout(5000);
    
    const files = await fs.readdir(storageDir);
    const downloadedFiles = files.filter(file => 
      file.endsWith('.pdf') || file.endsWith('.doc') || file.endsWith('.docx')
    );
    
    if (downloadedFiles.length > 0) {
      console.log(`✅ 下载测试成功！共下载 ${downloadedFiles.length} 个文件:`);
      downloadedFiles.forEach(file => {
        console.log(`  - ${file}`);
      });
    } else {
      console.log('⚠️ 下载测试完成，但未检测到下载文件');
      console.log('可能原因：文件下载到其他位置、下载失败、或需要手动确认');
    }
    
    console.log('\n=== 修复后的简历下载测试结束 ===');
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 运行测试
testFixedResumeDownload();
