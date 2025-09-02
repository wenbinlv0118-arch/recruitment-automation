const { chromium } = require('playwright');
const browserDisplayConfig = require('./src/config/browserDisplayConfig');

/**
 * 测试智联招聘页面显示问题
 * 检查页面底部内容是否可以正常显示和滚动
 */
async function testZhilianDisplay() {
  console.log('开始测试智联招聘页面显示问题...');
  
  let browser = null;
  let page = null;
  
  try {
    // 1. 获取智联招聘显示配置
    console.log('\n1. 获取智联招聘显示配置...');
    const displayConfig = browserDisplayConfig.zhilian;
    console.log('✅ 显示配置加载成功');
    console.log('视口尺寸:', displayConfig.contextOptions.viewport);
    console.log('设备缩放比例:', displayConfig.contextOptions.deviceScaleFactor);
    
    // 2. 启动浏览器
    console.log('\n2. 启动浏览器...');
    const baseArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage'
    ];
    
    const allArgs = [...baseArgs, ...displayConfig.launchArgs];
    console.log('启动参数数量:', allArgs.length);
    
    browser = await chromium.launch({
      headless: false,
      args: allArgs,
      viewport: displayConfig.contextOptions.viewport
    });
    console.log('✅ 浏览器启动成功');
    
    // 3. 创建上下文和页面
    console.log('\n3. 创建浏览器上下文...');
    const context = await browser.newContext({
      ...displayConfig.contextOptions,
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    page = await context.newPage();
    console.log('✅ 页面创建成功');
    
    // 4. 打开智联招聘网站
    console.log('\n4. 打开智联招聘网站...');
    await page.goto('https://www.zhaopin.com', { waitUntil: 'networkidle' });
    console.log('✅ 智联招聘网站打开成功');
    
    // 5. 检查页面尺寸
    console.log('\n5. 检查页面尺寸...');
    const pageSize = await page.evaluate(() => {
      return {
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        documentHeight: document.documentElement.scrollHeight,
        viewportWidth: document.documentElement.clientWidth,
        viewportHeight: document.documentElement.clientHeight
      };
    });
    
    console.log('窗口尺寸:', `${pageSize.windowWidth}x${pageSize.windowHeight}`);
    console.log('文档尺寸:', `${pageSize.documentWidth}x${pageSize.documentHeight}`);
    console.log('视口尺寸:', `${pageSize.viewportWidth}x${pageSize.viewportHeight}`);
    
    // 6. 测试滚动功能
    console.log('\n6. 测试页面滚动功能...');
    
    // 获取初始滚动位置
    const initialScroll = await page.evaluate(() => window.pageYOffset);
    console.log('初始滚动位置:', initialScroll);
    
    // 滚动到页面底部
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // 等待滚动完成
    await page.waitForTimeout(2000);
    
    // 获取滚动后位置
    const finalScroll = await page.evaluate(() => window.pageYOffset);
    console.log('滚动后位置:', finalScroll);
    
    if (finalScroll > initialScroll) {
      console.log('✅ 页面可以正常滚动');
    } else {
      console.log('❌ 页面无法滚动');
    }
    
    // 7. 检查页面底部元素是否可见
    console.log('\n7. 检查页面底部元素...');
    
    const footerElements = await page.evaluate(() => {
      const footers = document.querySelectorAll('footer, .footer, [class*="footer"], [id*="footer"]');
      const results = [];
      
      footers.forEach((footer, index) => {
        const rect = footer.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        
        results.push({
          index,
          tagName: footer.tagName,
          className: footer.className,
          isVisible,
          top: rect.top,
          bottom: rect.bottom,
          height: rect.height
        });
      });
      
      return results;
    });
    
    if (footerElements.length > 0) {
      console.log('找到页脚元素数量:', footerElements.length);
      footerElements.forEach(footer => {
        console.log(`页脚 ${footer.index}: ${footer.tagName}.${footer.className}`);
        console.log(`  位置: top=${footer.top}, bottom=${footer.bottom}, height=${footer.height}`);
        console.log(`  可见性: ${footer.isVisible ? '可见' : '不可见'}`);
      });
    } else {
      console.log('未找到页脚元素');
    }
    
    // 8. 测试不同滚动位置的可见性
    console.log('\n8. 测试不同滚动位置...');
    
    // 滚动到顶部
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);
    console.log('已滚动到顶部');
    
    // 滚动到中间
    await page.evaluate(() => {
      const middlePosition = document.body.scrollHeight / 2;
      window.scrollTo(0, middlePosition);
    });
    await page.waitForTimeout(1000);
    console.log('已滚动到中间位置');
    
    // 再次滚动到底部
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(2000);
    console.log('已滚动到底部');
    
    // 9. 检查最终状态
    console.log('\n9. 检查最终页面状态...');
    const finalState = await page.evaluate(() => {
      return {
        scrollTop: window.pageYOffset,
        scrollHeight: document.body.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        canScrollMore: window.pageYOffset + window.innerHeight < document.body.scrollHeight
      };
    });
    
    console.log('最终滚动位置:', finalState.scrollTop);
    console.log('页面总高度:', finalState.scrollHeight);
    console.log('可视区域高度:', finalState.clientHeight);
    console.log('是否还能继续滚动:', finalState.canScrollMore);
    
    if (!finalState.canScrollMore) {
      console.log('✅ 已成功滚动到页面底部，所有内容都可以访问');
    } else {
      console.log('⚠️ 可能还有内容无法访问');
    }
    
    console.log('\n✅ 智联招聘页面显示测试完成');
    console.log('请手动检查浏览器中的页面显示效果');
    
    // 保持浏览器打开以便手动检查
    console.log('\n浏览器将保持打开状态，按任意键关闭...');
    await new Promise(resolve => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.on('data', () => {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        resolve();
      });
    });
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    console.error('错误详情:', error.stack);
  } finally {
    // 清理资源
    if (page) {
      await page.close();
    }
    if (browser) {
      await browser.close();
    }
    console.log('\n🧹 资源清理完成');
  }
}

// 运行测试
if (require.main === module) {
  testZhilianDisplay().catch(console.error);
}

module.exports = testZhilianDisplay;