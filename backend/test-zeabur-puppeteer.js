/**
 * Zeabur环境Puppeteer测试脚本
 * 验证Puppeteer在容器环境中的运行情况
 */

const { puppeteerService } = require('./src/services/puppeteerService');

async function testZeaburPuppeteer() {
  console.log('🧪 开始Zeabur环境Puppeteer测试...');
  
  try {
    // 测试1: 浏览器初始化
    console.log('\n📋 测试1: 浏览器初始化');
    await puppeteerService.initialize();
    console.log('✅ 浏览器初始化成功');

    // 测试2: 创建页面
    console.log('\n📋 测试2: 创建页面');
    const page = await puppeteerService.createPage();
    console.log('✅ 页面创建成功');

    // 测试3: 访问简单页面
    console.log('\n📋 测试3: 访问测试页面');
    await page.goto('https://httpbin.org/html', { 
      waitUntil: 'domcontentloaded',
      timeout: 15000 
    });
    console.log('✅ 页面访问成功');

    // 测试4: 获取页面信息
    console.log('\n📋 测试4: 获取页面信息');
    const title = await page.title();
    const url = page.url();
    console.log(`✅ 页面标题: ${title}`);
    console.log(`✅ 当前URL: ${url}`);

    // 测试5: 执行JavaScript
    console.log('\n📋 测试5: 执行JavaScript');
    const pageContent = await page.evaluate(() => {
      return {
        title: document.title,
        bodyText: document.body.innerText.substring(0, 100),
        links: document.querySelectorAll('a').length
      };
    });
    console.log('✅ JavaScript执行成功');
    console.log(`📄 内容预览: ${pageContent.bodyText}...`);

    // 测试6: 截图测试
    console.log('\n📋 测试6: 截图测试');
    await puppeteerService.takeScreenshot(page, '/tmp/zeabur-test.png');
    console.log('✅ 截图保存成功');

    // 关闭页面
    await page.close();

    // 测试7: 健康检查
    console.log('\n📋 测试7: 健康检查');
    const health = await puppeteerService.healthCheck();
    console.log(`✅ 健康检查结果: ${health ? '通过' : '失败'}`);

    console.log('\n🎉 所有测试通过！Puppeteer在Zeabur环境运行正常');
    return true;

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
    return false;
  } finally {
    await puppeteerService.close();
  }
}

// 运行测试
if (require.main === module) {
  testZeaburPuppeteer().then(success => {
    console.log(`\n🎯 测试最终结果: ${success ? '成功' : '失败'}`);
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testZeaburPuppeteer };