const { chromium } = require('playwright');

/**
 * 使用Playwright Chromium测试前端URL状态
 */
async function testFrontendStatus() {
  let browser;
  let page;
  
  try {
    console.log('启动Chromium浏览器...');
    browser = await chromium.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    page = await browser.newPage();
    
    // 设置超时时间
    page.setDefaultTimeout(30000);
    
    const frontendUrl = 'https://recruitment-automation-frontend.vercel.app';
    console.log(`导航到前端URL: ${frontendUrl}`);
    
    // 监听页面错误
    page.on('pageerror', (error) => {
      console.error('页面错误:', error.message);
    });
    
    // 监听控制台消息
    page.on('console', (msg) => {
      console.log(`控制台 [${msg.type()}]:`, msg.text());
    });
    
    // 监听网络请求失败
    page.on('requestfailed', (request) => {
      console.error(`请求失败: ${request.url()} - ${request.failure().errorText}`);
    });
    
    // 尝试导航到页面
    const response = await page.goto(frontendUrl, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    if (response) {
      console.log(`HTTP状态码: ${response.status()}`);
      console.log(`响应头:`, await response.allHeaders());
      
      if (response.ok()) {
        console.log('✅ 前端页面加载成功');
        
        // 等待页面完全加载
        await page.waitForLoadState('domcontentloaded');
        
        // 检查页面标题
        const title = await page.title();
        console.log(`页面标题: ${title}`);
        
        // 检查是否有API错误
        const errorElements = await page.$$('[class*="error"], [class*="Error"]');
        if (errorElements.length > 0) {
          console.log('⚠️ 页面中发现错误元素');
        }
        
        // 截图保存
        await page.screenshot({ path: 'frontend-status.png', fullPage: true });
        console.log('📸 页面截图已保存为 frontend-status.png');
        
      } else {
        console.error(`❌ HTTP错误: ${response.status()} ${response.statusText()}`);
      }
    } else {
      console.error('❌ 无法获取响应');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    
    if (error.message.includes('net::ERR_CONNECTION_TIMED_OUT')) {
      console.log('🔍 连接超时 - 可能的原因:');
      console.log('  1. Vercel部署URL无效或已过期');
      console.log('  2. 网络连接问题');
      console.log('  3. DNS解析问题');
    }
    
  } finally {
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
  }
}

// 运行测试
testFrontendStatus().catch(console.error);