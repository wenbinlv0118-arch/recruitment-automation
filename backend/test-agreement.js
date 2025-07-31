const { chromium } = require('playwright');

async function testAgreement() {
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
    
    // 输入手机号
    console.log('输入手机号...');
    const phoneInput = await page.locator('input[placeholder*="手机号"]').first();
    await phoneInput.clear();
    await phoneInput.fill('15675156459');
    console.log('已输入手机号');
    
    // 等待页面验证
    await page.waitForTimeout(2000);
    
    // 查找并勾选用户协议
    console.log('查找用户协议复选框...');
    const agreement = await page.locator('input[type="checkbox"]').first();
    
    if (await agreement.isVisible()) {
      console.log('找到用户协议复选框');
      console.log('当前状态:', await agreement.isChecked());
      
      if (!(await agreement.isChecked())) {
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
          console.log('✅ 成功！页面已自动跳转到登录后页面');
          
          // 保存截图
          await page.screenshot({ path: 'test_agreement_success.png' });
          console.log('已保存成功截图');
          
          // 等待用户查看
          console.log('请在浏览器中查看页面状态...');
          await page.waitForTimeout(10000);
          
        } else {
          console.log('❌ 页面未跳转，仍在登录页面');
          
          // 保存截图
          await page.screenshot({ path: 'test_agreement_no_jump.png' });
          console.log('已保存未跳转截图');
        }
      } else {
        console.log('用户协议已经勾选');
      }
    } else {
      console.log('未找到用户协议复选框');
    }
    
  } catch (error) {
    console.error('测试过程中出错:', error);
  } finally {
    await browser.close();
  }
}

testAgreement(); 