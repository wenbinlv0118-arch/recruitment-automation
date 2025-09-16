/**
 * D-Bus 错误修复测试脚本
 * 测试浏览器启动配置是否成功解决 D-Bus 连接错误
 */

const { chromium } = require('playwright');
const logger = require('./src/utils/logger');
const { environmentConfig } = require('./src/config/environmentConfig');

/**
 * 测试浏览器启动配置
 */
async function testDBusFix() {
  console.log('\n=== D-Bus 错误修复测试 ===\n');
  
  let browser = null;
  let page = null;
  
  try {
    // 获取环境配置
    const config = environmentConfig.getConfig();
    const browserArgs = environmentConfig.getBrowserArgs();
    
    console.log('环境信息:');
    console.log(`- 平台: ${config.platform}`);
    console.log(`- 环境: ${config.environment}`);
    console.log(`- 无头模式: ${config.shouldUseHeadless}`);
    console.log(`- 启动参数数量: ${browserArgs.length}`);
    
    // 检查 D-Bus 相关参数
    const dbusArgs = browserArgs.filter(arg => 
      arg.includes('dbus') || 
      arg.includes('font') ||
      arg.includes('system')
    );
    
    console.log('\nD-Bus 相关参数:');
    dbusArgs.forEach(arg => console.log(`- ${arg}`));
    
    // 测试浏览器启动
    console.log('\n正在启动浏览器...');
    
    const launchOptions = {
      headless: config.shouldUseHeadless,
      args: browserArgs,
      timeout: 30000
    };
    
    browser = await chromium.launch(launchOptions);
    console.log('✅ 浏览器启动成功');
    
    // 创建页面
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    page = await context.newPage();
    console.log('✅ 页面创建成功');
    
    // 测试页面导航
    console.log('\n正在测试页面导航...');
    await page.goto('https://www.zhaopin.com', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    const title = await page.title();
    console.log(`✅ 页面导航成功: ${title}`);
    
    // 测试基本功能
    console.log('\n正在测试基本功能...');
    const url = page.url();
    console.log(`当前URL: ${url}`);
    
    // 等待页面完全加载
    await page.waitForTimeout(3000);
    
    console.log('\n=== 测试结果 ===');
    console.log('✅ 所有测试通过');
    console.log('✅ D-Bus 错误修复成功');
    console.log('✅ 浏览器可以正常启动和运行');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ 测试失败:');
    console.error(`错误信息: ${error.message}`);
    
    // 检查是否仍然存在 D-Bus 错误
    if (error.message.includes('dbus') || error.message.includes('D-Bus')) {
      console.error('❌ D-Bus 错误仍然存在，需要进一步修复');
    }
    
    return false;
    
  } finally {
    // 清理资源
    try {
      if (page) {
        await page.close();
        console.log('页面已关闭');
      }
      if (browser) {
        await browser.close();
        console.log('浏览器已关闭');
      }
    } catch (cleanupError) {
      console.error('清理资源时出错:', cleanupError.message);
    }
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    const success = await testDBusFix();
    
    if (success) {
      console.log('\n🎉 D-Bus 错误修复验证成功！');
      process.exit(0);
    } else {
      console.log('\n❌ D-Bus 错误修复验证失败！');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n💥 测试脚本执行失败:', error.message);
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main();
}

module.exports = { testDBusFix };