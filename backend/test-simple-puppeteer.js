#!/usr/bin/env node

/**
 * 简化的Puppeteer测试
 * 仅验证基本功能，不依赖外部网络
 */

const puppeteer = require('puppeteer');

async function testPuppeteer() {
  console.log('🧪 开始简化Puppeteer测试...\n');
  
  let browser = null;
  let page = null;
  
  try {
    // 配置
    const config = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    };

    console.log('1️⃣ 启动浏览器...');
    browser = await puppeteer.launch(config);
    console.log('✅ 浏览器启动成功');

    console.log('2️⃣ 创建页面...');
    page = await browser.newPage();
    console.log('✅ 页面创建成功');

    console.log('3️⃣ 设置内容...');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head><title>测试页面</title></head>
        <body>
          <h1>Hello Puppeteer</h1>
          <p>这是一个测试页面</p>
        </body>
      </html>
    `);
    console.log('✅ 内容设置成功');

    console.log('4️⃣ 获取标题...');
    const title = await page.title();
    console.log(`✅ 页面标题: "${title}"`);

    console.log('5️⃣ 执行JavaScript...');
    const result = await page.evaluate(() => {
      return {
        title: document.title,
        bodyText: document.body.textContent.trim(),
        timestamp: new Date().toISOString()
      };
    });
    console.log('✅ JavaScript执行结果:', result);

    console.log('\n🎉 所有测试通过！');
    return true;

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    return false;
  } finally {
    if (page) await page.close();
    if (browser) await browser.close();
    console.log('✅ 资源已清理');
  }
}

// 运行测试
if (require.main === module) {
  testPuppeteer().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = testPuppeteer;