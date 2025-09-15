/**
 * 浏览器初始化修复测试脚本
 * 测试智联招聘服务的浏览器启动配置修复效果
 */

const ZhilianService = require('./src/services/zhilianService');
const logger = require('./src/utils/logger');

/**
 * 测试浏览器初始化
 */
async function testBrowserInitialization() {
  console.log('\n=== 开始测试浏览器初始化修复效果 ===\n');
  
  const zhilianService = new ZhilianService();
  
  try {
    // 测试1: 浏览器初始化
    console.log('测试1: 浏览器初始化...');
    await zhilianService.initializeBrowser();
    console.log('✅ 浏览器初始化成功');
    
    // 测试2: 检查浏览器状态
    console.log('\n测试2: 检查浏览器状态...');
    const status = zhilianService.getCurrentStatus();
    console.log('浏览器状态:', {
      initialized: status.initialized,
      hasBrowser: status.hasBrowser,
      hasPage: status.hasPage,
      status: status.status
    });
    
    if (status.initialized && status.hasBrowser && status.hasPage) {
      console.log('✅ 浏览器状态检查通过');
    } else {
      console.log('❌ 浏览器状态检查失败');
      return false;
    }
    
    // 测试3: 页面导航测试
    console.log('\n测试3: 页面导航测试...');
    await zhilianService.openZhilianWebsite();
    console.log('✅ 页面导航成功');
    
    // 测试4: 页面基本功能测试
    console.log('\n测试4: 页面基本功能测试...');
    const pageTitle = await zhilianService.page.title();
    console.log('页面标题:', pageTitle);
    
    if (pageTitle && pageTitle.length > 0) {
      console.log('✅ 页面基本功能正常');
    } else {
      console.log('❌ 页面基本功能异常');
      return false;
    }
    
    // 测试5: 浏览器关闭测试
    console.log('\n测试5: 浏览器关闭测试...');
    await zhilianService.closeBrowser();
    console.log('✅ 浏览器关闭成功');
    
    console.log('\n🎉 所有测试通过！浏览器初始化修复成功！');
    return true;
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误详情:', error);
    
    // 确保清理资源
    try {
      await zhilianService.closeBrowser();
    } catch (cleanupError) {
      console.error('清理资源失败:', cleanupError.message);
    }
    
    return false;
  }
}

/**
 * 测试环境配置
 */
async function testEnvironmentConfig() {
  console.log('\n=== 测试环境配置 ===\n');
  
  try {
    const environmentConfig = require('./src/config/environmentConfig');
    
    // 测试配置验证
    const validation = environmentConfig.validateConfig();
    console.log('配置验证结果:', {
      isValid: validation.isValid,
      issues: validation.issues,
      warnings: validation.warnings
    });
    
    // 测试浏览器配置
    const browserConfig = environmentConfig.getBrowserConfig();
    console.log('浏览器配置:', {
      headless: browserConfig.headless,
      headlessType: typeof browserConfig.headless,
      argsCount: browserConfig.args.length
    });
    
    // 验证 headless 参数类型
    if (typeof browserConfig.headless === 'boolean' || browserConfig.headless === 'new') {
      console.log('✅ Headless 参数类型正确');
    } else {
      console.log('❌ Headless 参数类型错误:', typeof browserConfig.headless);
      return false;
    }
    
    console.log('✅ 环境配置测试通过');
    return true;
    
  } catch (error) {
    console.error('❌ 环境配置测试失败:', error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runAllTests() {
  console.log('智联招聘浏览器初始化修复测试');
  console.log('=====================================');
  
  const results = [];
  
  // 运行环境配置测试
  const envConfigResult = await testEnvironmentConfig();
  results.push({ name: '环境配置测试', passed: envConfigResult });
  
  // 运行浏览器初始化测试
  const browserInitResult = await testBrowserInitialization();
  results.push({ name: '浏览器初始化测试', passed: browserInitResult });
  
  // 输出测试结果摘要
  console.log('\n\n=== 测试结果摘要 ===');
  results.forEach(result => {
    const status = result.passed ? '✅ 通过' : '❌ 失败';
    console.log(`${result.name}: ${status}`);
  });
  
  const allPassed = results.every(result => result.passed);
  console.log(`\n总体结果: ${allPassed ? '🎉 全部通过' : '❌ 存在失败'}`);
  
  if (allPassed) {
    console.log('\n修复成功！生产环境浏览器初始化问题已解决。');
  } else {
    console.log('\n修复未完成，请检查失败的测试项。');
  }
  
  process.exit(allPassed ? 0 : 1);
}

// 运行测试
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  testBrowserInitialization,
  testEnvironmentConfig,
  runAllTests
};