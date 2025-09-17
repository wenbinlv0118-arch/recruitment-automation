/**
 * 简化版Puppeteer测试脚本
 * 专注于验证Puppeteer在容器环境中的基本功能
 */

const puppeteer = require('puppeteer');

async function testPuppeteerBasic() {
  console.log('🧪 开始Puppeteer基础测试...');
  
  let browser;
  try {
    // 使用容器环境友好的配置
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
      ]
    });

    console.log('✅ 浏览器启动成功');

    // 创建新页面
    const page = await browser.newPage();
    console.log('✅ 页面创建成功');

    // 设置用户代理
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    // 访问简单页面进行测试
    await page.goto('https://httpbin.org/html', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });

    console.log('✅ 页面加载成功');

    // 获取页面标题
    const title = await page.title();
    console.log(`✅ 页面标题: ${title}`);

    // 获取页面内容
    const content = await page.evaluate(() => {
      return document.body.innerText;
    });

    console.log('✅ 内容获取成功');
    console.log(`📄 页面内容预览: ${content.substring(0, 100)}...`);

    // 测试截图功能
    await page.screenshot({ path: '/tmp/puppeteer-test.png' });
    console.log('✅ 截图成功');

    console.log('🎉 Puppeteer基础测试通过！');
    return true;

  } catch (error) {
    console.error('❌ Puppeteer测试失败:', error.message);
    return false;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// 执行测试
if (require.main === module) {
  testPuppeteerBasic().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testPuppeteerBasic };