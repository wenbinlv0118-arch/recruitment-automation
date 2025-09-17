#!/usr/bin/env node

/**
 * 容器环境Puppeteer测试脚本
 * 专为Zeabur等容器环境优化的测试配置
 */

const puppeteer = require('puppeteer');

async function testContainerEnvironment() {
  console.log('🚀 开始容器环境Puppeteer测试...\n');
  
  let browser = null;
  
  try {
    // 检测是否在容器环境
    const isContainer = process.env.CONTAINER || process.env.ZEABUR || false;
    console.log(`📊 运行环境: ${isContainer ? '容器' : '本地'}`);
    
    // 配置启动参数
    const launchOptions = {
      headless: 'new', // 使用新的无头模式
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
      timeout: 60000
    };
    
    // 如果在容器环境，添加额外配置
    if (isContainer) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';
      launchOptions.args.push('--disable-extensions');
      launchOptions.args.push('--disable-default-apps');
    }
    
    console.log('📋 测试1: 启动浏览器');
    browser = await puppeteer.launch(launchOptions);
    console.log('✅ 浏览器启动成功');
    
    // 获取浏览器版本信息
    const version = await browser.version();
    console.log(`📊 浏览器版本: ${version}`);
    
    console.log('\n📋 测试2: 创建页面');
    const page = await browser.newPage();
    
    // 设置页面超时
    page.setDefaultTimeout(30000);
    page.setDefaultNavigationTimeout(30000);
    
    console.log('✅ 页面创建成功');
    
    console.log('\n📋 测试3: 访问本地页面');
    // 测试访问本地HTML内容
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Puppeteer测试页面</title>
        </head>
        <body>
          <h1>Hello Puppeteer!</h1>
          <p>这是一个测试页面</p>
          <div id="test-element">测试元素</div>
        </body>
      </html>
    `);
    
    const title = await page.title();
    console.log(`✅ 页面标题: ${title}`);
    
    console.log('\n📋 测试4: 元素交互测试');
    const elementText = await page.$eval('#test-element', el => el.textContent);
    console.log(`✅ 元素内容: ${elementText}`);
    
    console.log('\n📋 测试5: JavaScript执行测试');
    const jsResult = await page.evaluate(() => {
      return {
        url: window.location.href,
        userAgent: navigator.userAgent,
        elementCount: document.querySelectorAll('*').length
      };
    });
    console.log('✅ JavaScript执行成功');
    console.log('📊 执行结果:', jsResult);
    
    console.log('\n📋 测试6: 截图测试');
    await page.screenshot({ 
      path: '/tmp/puppeteer-test-screenshot.png',
      fullPage: true 
    });
    console.log('✅ 截图保存成功');
    
    console.log('\n🎉 所有容器环境测试通过！');
    
    return true;
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    
    // 提供详细的错误信息
    if (error.message.includes('executablePath')) {
      console.error('💡 提示: 请确保Chromium已正确安装');
    } else if (error.message.includes('Target closed')) {
      console.error('💡 提示: 可能是浏览器崩溃，请检查内存限制');
    }
    
    return false;
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log('\n🔒 浏览器已关闭');
      } catch (closeError) {
        console.error('关闭浏览器时出错:', closeError.message);
      }
    }
  }
}

// 运行测试
if (require.main === module) {
  testContainerEnvironment()
    .then(success => {
      if (success) {
        console.log('\n✨ Puppeteer容器环境验证完成！');
        process.exit(0);
      } else {
        console.log('\n💥 Puppeteer容器环境验证失败！');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('测试异常:', error);
      process.exit(1);
    });
}

module.exports = { testContainerEnvironment };