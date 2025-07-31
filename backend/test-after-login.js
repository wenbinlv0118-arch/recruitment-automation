const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs-extra');

async function testAfterLogin() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const page = await browser.newPage();
  const storageDir = path.join(__dirname, '../storage/resumes');
  
  // 确保存储目录存在
  fs.ensureDirSync(storageDir);
  
  try {
    console.log('=== 测试登录成功后的简历下载流程 ===');
    console.log('存储目录:', storageDir);
    
    // 直接访问登录后的页面（模拟已登录状态）
    console.log('\n1. 访问登录后的页面...');
    await page.goto('https://i.zhaopin.com/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);
    
    // 保存截图
    await page.screenshot({ path: path.join(storageDir, 'test_after_login.png') });
    console.log('已保存登录后页面截图');
    
    // 2. 查找在线简历按钮
    console.log('\n2. 查找在线简历按钮...');
    const resumeSelectors = [
      'text=在线简历',
      'text=我的简历',
      'text=简历管理',
      'a:has-text("简历")',
      'button:has-text("简历")',
      '[class*="resume"]',
      '[class*="Resume"]'
    ];

    let resumeButton = null;
    for (const selector of resumeSelectors) {
      try {
        resumeButton = await page.locator(selector).first();
        if (await resumeButton.isVisible()) {
          console.log(`找到在线简历按钮: ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`未找到在线简历按钮: ${selector}`);
      }
    }

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
    
    // 3. 保存简历页面截图
    await page.screenshot({ path: path.join(storageDir, 'test_resume_page.png') });
    console.log('已保存简历页面截图');
    
    // 4. 查找下载简历按钮
    console.log('\n3. 查找下载简历按钮...');
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
        downloadButton = await page.locator(selector).first();
        if (await downloadButton.isVisible()) {
          console.log(`找到下载简历按钮: ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`未找到下载简历按钮: ${selector}`);
      }
    }

    if (!downloadButton || !(await downloadButton.isVisible())) {
      console.log('❌ 无法找到下载简历按钮');
      return;
    }

    await downloadButton.click();
    console.log('已点击下载简历按钮');
    await page.waitForTimeout(2000);
    
    // 5. 选择普通简历
    console.log('\n4. 选择普通简历...');
    const normalResumeSelectors = [
      'text=普通简历',
      'text=标准简历',
      'text=基础简历',
      'button:has-text("普通")',
      'button:has-text("标准")',
      '[class*="normal"]',
      '[class*="basic"]'
    ];

    let normalResumeButton = null;
    for (const selector of normalResumeSelectors) {
      try {
        normalResumeButton = await page.locator(selector).first();
        if (await normalResumeButton.isVisible()) {
          console.log(`找到普通简历按钮: ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`未找到普通简历按钮: ${selector}`);
      }
    }

    if (normalResumeButton && await normalResumeButton.isVisible()) {
      await normalResumeButton.click();
      console.log('已点击普通简历按钮');
      await page.waitForTimeout(2000);
    } else {
      console.log('未找到普通简历按钮，可能已经是默认选项');
    }
    
    // 6. 点击立即下载
    console.log('\n5. 点击立即下载...');
    const downloadNowSelectors = [
      'text=立即下载',
      'text=下载',
      'text=确认下载',
      'button:has-text("立即下载")',
      'button:has-text("下载")',
      'button:has-text("确认")',
      '[class*="download"]',
      '[class*="confirm"]'
    ];

    let downloadNowButton = null;
    for (const selector of downloadNowSelectors) {
      try {
        downloadNowButton = await page.locator(selector).first();
        if (await downloadNowButton.isVisible()) {
          console.log(`找到立即下载按钮: ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`未找到立即下载按钮: ${selector}`);
      }
    }

    if (!downloadNowButton || !(await downloadNowButton.isVisible())) {
      console.log('❌ 无法找到立即下载按钮');
      return;
    }

    await downloadNowButton.click();
    console.log('已点击立即下载按钮');
    
    // 7. 等待下载完成
    console.log('\n6. 等待下载完成...');
    await page.waitForTimeout(5000);
    
    // 8. 检查下载的文件
    console.log('\n7. 检查下载的文件...');
    const files = await fs.readdir(storageDir);
    const downloadedFiles = files.filter(file => 
      file.endsWith('.pdf') || file.endsWith('.doc') || file.endsWith('.docx')
    );

    if (downloadedFiles.length > 0) {
      console.log(`✅ 下载完成！共下载 ${downloadedFiles.length} 个文件:`);
      downloadedFiles.forEach(file => {
        console.log(`  - ${file}`);
      });
    } else {
      console.log('⚠️ 下载流程完成，但未检测到下载文件');
    }
    
    console.log('\n=== 简历下载测试结束 ===');
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  } finally {
    await browser.close();
  }
}

testAfterLogin(); 