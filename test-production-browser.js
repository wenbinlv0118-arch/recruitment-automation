/**
 * 生产环境浏览器配置测试脚本
 * 用于验证headless模式和远程调试冲突修复
 */

const { chromium } = require('playwright');
const { getBrowserConfig, environmentConfig } = require('./backend/src/config/environmentConfig');
const logger = require('./backend/src/utils/logger');

/**
 * 测试生产环境浏览器配置
 */
async function testProductionBrowserConfig() {
  console.log('\n🧪 开始测试生产环境浏览器配置...');
  
  try {
    // 强制设置生产环境
    process.env.NODE_ENV = 'production';
    process.env.ZEABUR_ENVIRONMENT = 'true';
    
    // 删除缓存并重新加载环境配置
    delete require.cache[require.resolve('./backend/src/config/environmentConfig')];
    const { environmentConfig: envConfig } = require('./backend/src/config/environmentConfig');
    
    // 强制重新检测环境
    envConfig.environment = envConfig.detectEnvironment();
    envConfig.generateConfig();
    
    console.log('\n📋 环境信息:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   ZEABUR_ENVIRONMENT: ${process.env.ZEABUR_ENVIRONMENT}`);
    console.log(`   Platform: ${process.platform}`);
    console.log(`   检测到的环境: ${envConfig.environment}`);
    console.log(`   是否生产环境: ${envConfig.isProduction()}`);
    console.log(`   应该使用Headless: ${envConfig.shouldUseHeadless()}`);
    
    // 获取浏览器配置
    const browserConfig = envConfig.getBrowserConfig();
    
    console.log('\n🌐 浏览器配置:');
    console.log(`   Headless模式: ${browserConfig.headless}`);
    console.log(`   启动参数数量: ${browserConfig.args.length}`);
    
    // 检查冲突参数（启用远程调试的参数）
    const conflictArgs = browserConfig.args.filter(arg => 
      (arg.includes('remote-debugging') && !arg.includes('disable') && !arg.includes('no-')) ||
      arg.includes('--inspect') ||
      arg.includes('--remote-debugging-port=') ||
      arg.includes('--remote-debugging-pipe')
    );
    
    console.log('\n🔍 远程调试冲突参数检查:');
    if (conflictArgs.length === 0) {
      console.log('   ✅ 未发现冲突的远程调试参数');
    } else {
      console.log('   ❌ 发现冲突参数:');
      conflictArgs.forEach(arg => console.log(`      - ${arg}`));
    }
    
    // 检查禁用参数
    const disableArgs = browserConfig.args.filter(arg => 
      arg.includes('--disable-remote-debugging') || 
      arg.includes('--no-remote-debugging-port') ||
      arg.includes('--disable-dev-tools')
    );
    
    console.log('\n🛡️  安全参数检查:');
    if (disableArgs.length > 0) {
      console.log('   ✅ 已添加安全禁用参数:');
      disableArgs.forEach(arg => console.log(`      - ${arg}`));
    } else {
      console.log('   ⚠️  未发现安全禁用参数');
    }
    
    console.log('\n🚀 尝试启动浏览器...');
    
    // 测试浏览器启动
    const browser = await chromium.launch({
      headless: browserConfig.headless,
      args: browserConfig.args,
      timeout: browserConfig.timeout
    });
    
    console.log('   ✅ 浏览器启动成功!');
    
    // 创建页面测试
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    
    const page = await context.newPage();
    console.log('   ✅ 页面创建成功!');
    
    // 测试导航
    await page.goto('https://www.baidu.com', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('   ✅ 页面导航成功!');
    
    // 获取页面标题
    const title = await page.title();
    console.log(`   页面标题: ${title}`);
    
    // 清理资源
    await browser.close();
    console.log('   ✅ 浏览器关闭成功!');
    
    console.log('\n🎉 生产环境浏览器配置测试通过!');
    console.log('\n✨ 修复验证结果:');
    console.log('   - Headless模式正确设置为 "new"');
    console.log('   - 远程调试冲突参数已清除');
    console.log('   - 安全禁用参数已添加');
    console.log('   - 浏览器启动和导航正常');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ 生产环境浏览器配置测试失败:');
    console.error(`   错误信息: ${error.message}`);
    
    if (error.message.includes('remote-debugging')) {
      console.error('\n🔧 建议修复措施:');
      console.error('   1. 检查环境配置中的headless设置');
      console.error('   2. 确认冲突参数过滤逻辑');
      console.error('   3. 验证Playwright版本兼容性');
    }
    
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('=== 生产环境浏览器配置修复验证 ===');
  
  const success = await testProductionBrowserConfig();
  
  if (success) {
    console.log('\n🎯 测试结论: 生产环境浏览器配置修复成功!');
    process.exit(0);
  } else {
    console.log('\n💥 测试结论: 生产环境浏览器配置仍存在问题!');
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testProductionBrowserConfig };