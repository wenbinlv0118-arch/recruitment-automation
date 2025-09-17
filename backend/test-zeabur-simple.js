#!/usr/bin/env node

/**
 * 简化的Zeabur环境Puppeteer测试
 * 使用更稳定的配置避免Mac兼容性问题
 */

const puppeteer = require('puppeteer');

async function testZeaburSimple() {
  console.log('🧪 开始简化Zeabur Puppeteer测试...');
  
  let browser = null;
  
  try {
    // 使用更稳定的配置
    console.log('🔧 启动浏览器...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-extensions',
        '--disable-default-apps',
        '--disable-plugins',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
        '--disable-ipc-flooding-protection'
      ],
      // 使用系统Chrome而不是下载的Chromium
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
    });
    
    console.log('✅ 浏览器启动成功');
    
    // 测试1: 创建页面
    console.log('\n📋 测试1: 创建页面');
    const page = await browser.newPage();
    console.log('✅ 页面创建成功');
    
    // 测试2: 本地内容测试
    console.log('\n📋 测试2: 本地内容测试');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Zeabur测试</title>
        </head>
        <body>
          <h1>Zeabur环境测试</h1>
          <div id="test">测试内容</div>
          <script>
            document.getElementById('test').textContent = 'JavaScript执行成功';
          </script>
        </body>
      </html>
    `);
    
    // 验证内容
    const title = await page.title();
    const testContent = await page.$eval('#test', el => el.textContent);
    
    console.log(`✅ 页面标题: ${title}`);
    console.log(`✅ 测试内容: ${testContent}`);
    
    if (title === 'Zeabur测试' && testContent === 'JavaScript执行成功') {
      console.log('✅ 本地内容测试通过');
    } else {
      throw new Error('内容验证失败');
    }
    
    // 测试3: 截图功能
    console.log('\n📋 测试3: 截图功能');
    const screenshot = await page.screenshot({ 
      type: 'png',
      encoding: 'base64',
      fullPage: true 
    });
    
    if (screenshot && screenshot.length > 100) {
      console.log('✅ 截图功能正常');
    } else {
      throw new Error('截图失败');
    }
    
    // 测试4: 页面关闭
    console.log('\n📋 测试4: 页面关闭');
    await page.close();
    console.log('✅ 页面关闭成功');
    
    console.log('\n🎉 所有测试通过！Puppeteer配置正确');
    return true;
    
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    
    // 提供更详细的错误信息
    if (error.message.includes('Target closed')) {
      console.error('💡 提示: 这可能是架构兼容性问题，在Linux容器中应该正常');
    } else if (error.message.includes('chrome')) {
      console.error('💡 提示: 检查Chrome/Chromium是否安装正确');
    }
    
    return false;
    
  } finally {
    if (browser) {
      console.log('\n🧹 清理资源...');
      await browser.close();
      console.log('✅ 浏览器已关闭');
    }
  }
}

// 运行测试
if (require.main === module) {
  testZeaburSimple().then(success => {
    console.log(`\n🎯 测试结果: ${success ? '通过' : '失败'}`);
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testZeaburSimple };