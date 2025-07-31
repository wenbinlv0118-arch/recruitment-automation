const { chromium } = require('playwright');
const path = require('path');

async function testLogin() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('正在访问智联招聘登录页面...');
    await page.goto('https://passport.zhaopin.com/login');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(8000);
    
    // 保存截图
    await page.screenshot({ path: 'test_login_page.png' });
    console.log('已保存登录页面截图');
    
    // 查找手机号输入框
    const phoneSelectors = [
      'input[placeholder*="手机号"]',
      'input[placeholder*="手机"]',
      'input[type="tel"]',
      'input[name*="phone"]',
      'input[name*="Phone"]'
    ];
    
    let phoneInput = null;
    for (const selector of phoneSelectors) {
      try {
        phoneInput = await page.locator(selector).first();
        if (await phoneInput.isVisible()) {
          console.log(`找到手机号输入框: ${selector}`);
          break;
        }
      } catch (error) {
        console.log(`未找到手机号输入框: ${selector}`);
      }
    }
    
    if (phoneInput && await phoneInput.isVisible()) {
      await phoneInput.clear();
      await phoneInput.fill('15675156459');
      console.log('已输入手机号');
      
      // 等待一下让页面验证手机号格式
      await page.waitForTimeout(2000);
      
      // 尝试勾选用户协议（如果存在）
      try {
        const agreementSelectors = [
          'input[type="checkbox"]',
          '[class*="agreement"]',
          '[class*="protocol"]',
          'text=同意',
          'text=我已阅读'
        ];

        for (const selector of agreementSelectors) {
          try {
            const agreement = await page.locator(selector).first();
            if (await agreement.isVisible() && !(await agreement.isChecked())) {
              await agreement.check();
              console.log('已勾选用户协议');
              break;
            }
          } catch (error) {
            // 继续尝试下一个选择器
          }
        }
      } catch (error) {
        console.log('未找到用户协议选项或已勾选');
      }
      
      // 查找发送验证码按钮
      const codeSelectors = [
        'text=获取验证码',
        'text=发送验证码',
        'text=获取',
        'button:has-text("验证码")',
        'button:has-text("获取")',
        '[class*="sms"]',
        '[class*="send"]'
      ];
      
      let sendCodeButton = null;
      for (const selector of codeSelectors) {
        try {
          sendCodeButton = await page.locator(selector).first();
          if (await sendCodeButton.isVisible()) {
            console.log(`找到发送验证码按钮: ${selector}`);
            break;
          }
        } catch (error) {
          console.log(`未找到发送验证码按钮: ${selector}`);
        }
      }
      
      if (sendCodeButton && await sendCodeButton.isVisible()) {
        // 等待按钮启用
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          try {
            if (await sendCodeButton.isEnabled()) {
              console.log('发送验证码按钮已启用');
              break;
            } else {
              console.log(`发送验证码按钮仍被禁用，等待中... (${attempts + 1}/${maxAttempts})`);
              await page.waitForTimeout(1000);
              attempts++;
            }
          } catch (error) {
            console.log('检查按钮状态时出错，重试中...');
            await page.waitForTimeout(1000);
            attempts++;
          }
        }

        if (attempts >= maxAttempts) {
          console.log('发送验证码按钮长时间未启用，请检查手机号格式或用户协议');
          return;
        }

        await sendCodeButton.click();
        console.log('已点击发送验证码按钮');
        
        // 等待用户手动输入验证码
        console.log('请在浏览器中手动输入验证码进行测试...');
        await page.waitForTimeout(30000); // 等待30秒
        
      } else {
        console.log('未找到发送验证码按钮');
      }
    } else {
      console.log('未找到手机号输入框');
    }
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  } finally {
    await browser.close();
  }
}

testLogin(); 