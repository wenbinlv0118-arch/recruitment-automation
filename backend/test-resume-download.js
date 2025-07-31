const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs-extra');

async function testResumeDownload() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const page = await browser.newPage();
  const storageDir = path.join(__dirname, '../storage/resumes');
  
  // 确保存储目录存在
  fs.ensureDirSync(storageDir);
  
  try {
    console.log('=== 开始简历下载测试 ===');
    console.log('存储目录:', storageDir);
    
    // 1. 访问登录页面
    console.log('\n1. 访问智联招聘登录页面...');
    await page.goto('https://passport.zhaopin.com/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(8000);
    
    // 保存截图
    await page.screenshot({ path: path.join(storageDir, 'test_1_login_page.png') });
    console.log('已保存登录页面截图');
    
    // 2. 输入手机号
    console.log('\n2. 输入手机号...');
    const phoneInput = await page.locator('input[placeholder*="手机号"]').first();
    await phoneInput.clear();
    await phoneInput.fill('15675156459');
    console.log('已输入手机号: 15675156459');
    
    // 3. 等待页面验证手机号格式
    await page.waitForTimeout(2000);
    
    // 4. 勾选用户协议
    console.log('\n3. 勾选用户协议...');
    const agreement = await page.locator('input[type="checkbox"]').first();
    
    if (await agreement.isVisible() && !(await agreement.isChecked())) {
      console.log('勾选用户协议...');
      await agreement.check();
      console.log('已勾选用户协议');
      
      // 等待页面跳转
      console.log('等待页面跳转...');
      await page.waitForTimeout(5000);
      
      // 检查URL变化
      const currentUrl = page.url();
      console.log('当前URL:', currentUrl);
      
      if (currentUrl.includes('i.zhaopin.com')) {
        console.log('✅ 登录成功！页面已跳转到登录后页面');
        
        // 保存登录后页面截图
        await page.screenshot({ path: path.join(storageDir, 'test_2_after_login.png') });
        console.log('已保存登录后页面截图');
        
        // 5. 查找在线简历按钮
        console.log('\n4. 查找在线简历按钮...');
        await page.waitForTimeout(3000);
        
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
        
        // 6. 保存简历页面截图
        await page.screenshot({ path: path.join(storageDir, 'test_3_resume_page.png') });
        console.log('已保存简历页面截图');
        
        // 7. 查找下载简历按钮
        console.log('\n5. 查找下载简历按钮...');
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
        
        // 8. 选择普通简历
        console.log('\n6. 选择普通简历...');
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
        
        // 9. 点击立即下载
        console.log('\n7. 点击立即下载...');
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
        
        // 10. 等待下载完成
        console.log('\n8. 等待下载完成...');
        await page.waitForTimeout(5000);
        
        // 11. 检查下载的文件
        console.log('\n9. 检查下载的文件...');
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
        
      } else {
        console.log('❌ 登录失败，页面未跳转');
      }
    } else {
      console.log('用户协议已经勾选或未找到');
    }
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  } finally {
    await browser.close();
  }
}

testResumeDownload(); 