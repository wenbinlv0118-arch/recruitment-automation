/**
 * Boss直聘真实环境测试脚本
 * 测试优化后的Hook复制机制在实际Boss直聘简历页面中的表现
 */

const { chromium } = require('playwright');
const DragSelectionService = require('../src/services/dragSelectionService');
const logger = require('../src/utils/logger');

/**
 * 测试Boss直聘真实环境Hook复制机制
 */
async function testBossZhipinRealEnvironment() {
  console.log('=== Boss直聘真实环境Hook复制测试 ===\n');
  
  let browser = null;
  let page = null;
  
  try {
    // 1. 初始化浏览器和页面
    console.log('1. 初始化浏览器和页面...');
    browser = await chromium.launch({ 
      headless: false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    page = await browser.newPage();
    
    // 设置用户代理，模拟真实浏览器
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // 2. 初始化拖拽选区服务
    console.log('2. 初始化拖拽选区服务...');
    const dragSelectionService = new DragSelectionService();
    await dragSelectionService.initialize();
    
    // 3. 访问Boss直聘首页
    console.log('3. 访问Boss直聘首页...');
    await page.goto('https://www.zhipin.com/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('4. 等待用户操作...');
    console.log('请按照以下步骤操作：');
    console.log('  a) 在浏览器中登录Boss直聘账号');
    console.log('  b) 搜索候选人或进入智能寻聘页面');
    console.log('  c) 点击任意一个候选人，进入简历详情页');
    console.log('  d) 确保简历页面已完全加载');
    console.log('  e) 在此终端按 Enter 键继续测试Hook复制功能');
    
    // 等待用户输入
    await waitForUserInput();
    
    // 4. 检测当前页面环境
    console.log('\n5. 检测当前页面环境...');
    const pageInfo = await detectPageEnvironment(page);
    console.log(`   📊 页面信息:`, pageInfo);
    
    if (!pageInfo.hasCanvas) {
      console.log('⚠️  当前页面没有检测到canvas#resume元素');
      console.log('请确保：');
      console.log('  - 已经进入了候选人的简历详情页面');
      console.log('  - 简历内容已完全加载');
      console.log('  - 简历是以Canvas形式渲染的');
      return { success: false, error: '页面环境不符合测试要求' };
    }
    
    // 5. 测试Hook复制机制
    console.log('\n6. 开始测试优化后的Hook复制机制...');
    const testResult = await testRealResumeHookCopy(page, dragSelectionService, pageInfo);
    
    // 6. 输出测试结果
    console.log('\n📊 Boss直聘真实环境测试结果:');
    console.log('==============================');
    
    if (testResult.success) {
      console.log('✅ 测试成功！');
      console.log(`📄 捕获内容长度: ${testResult.contentLength} 字符`);
      console.log(`🎯 捕获方法: ${testResult.method}`);
      console.log(`⏱️  执行时间: ${testResult.duration}ms`);
      console.log('\n📝 内容预览:');
      console.log('=============');
      console.log(testResult.content.substring(0, 300) + '...');
      
      // 验证内容是否像简历
      const isResumeContent = validateResumeContent(testResult.content);
      console.log(`\n🔍 简历内容验证: ${isResumeContent ? '✅ 通过' : '❌ 失败'}`);
      
      if (isResumeContent) {
        console.log('🎉 Hook复制机制在Boss直聘真实环境中工作正常！');
      } else {
        console.log('⚠️  捕获的内容可能不是简历内容，需要进一步优化');
      }
    } else {
      console.log('❌ 测试失败');
      console.log(`💥 错误: ${testResult.error}`);
      console.log('\n🔧 建议排查：');
      console.log('  - 检查网络连接和页面加载');
      console.log('  - 确认Boss直聘页面结构是否有变化');
      console.log('  - 检查是否有反爬虫机制干扰');
    }
    
    return testResult;
    
  } catch (error) {
    console.error('测试执行过程中发生错误:', error);
    return { success: false, error: error.message };
  } finally {
    console.log('\n🔍 测试完成，浏览器保持打开状态用于手动验证...');
    console.log('你可以手动在页面中尝试选择和复制，观察Hook是否正常工作');
    // await browser?.close();
  }
}

/**
 * 等待用户输入
 */
function waitForUserInput() {
  return new Promise((resolve) => {
    process.stdin.once('data', () => {
      resolve();
    });
  });
}

/**
 * 检测页面环境
 */
async function detectPageEnvironment(page) {
  try {
    const info = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        hasCanvas: !!document.querySelector('canvas#resume'),
        canvasCount: document.querySelectorAll('canvas').length,
        iframeCount: document.querySelectorAll('iframe').length,
        hasResumeIframe: !!document.querySelector('iframe[src*="c-resume"]'),
        documentReady: document.readyState,
        userAgent: navigator.userAgent.substring(0, 100)
      };
    });
    
    return info;
  } catch (error) {
    return {
      error: error.message,
      hasCanvas: false
    };
  }
}

/**
 * 测试真实简历Hook复制
 */
async function testRealResumeHookCopy(page, dragSelectionService, pageInfo) {
  const startTime = Date.now();
  
  try {
    console.log('   🔍 开始在真实Boss直聘环境中测试Hook复制...');
    
    // 根据页面环境选择合适的参数
    const options = {
      frameSelector: pageInfo.hasResumeIframe ? '/web/frame/c-resume/?source=search' : null,
      canvasSelector: 'canvas#resume',
      margin: 15,
      dragSteps: 25,
      waitTime: 2000 // 在真实环境中增加等待时间
    };
    
    console.log('   📋 使用参数:', options);
    
    const copiedContent = await dragSelectionService.copyResumeByHook(page, options);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (copiedContent && copiedContent.trim()) {
      console.log('   ✅ 真实环境Hook复制成功');
      return {
        success: true,
        content: copiedContent,
        contentLength: copiedContent.length,
        method: 'real_environment_hook',
        duration: duration,
        pageInfo: pageInfo
      };
    } else {
      return {
        success: false,
        error: '真实环境Hook复制未获取到有效内容',
        method: 'real_environment_hook',
        duration: duration,
        pageInfo: pageInfo
      };
    }
    
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`   ❌ 真实环境Hook复制失败: ${error.message}`);
    return {
      success: false,
      error: error.message,
      method: 'real_environment_hook',
      duration: duration,
      pageInfo: pageInfo
    };
  }
}

/**
 * 验证是否为简历内容
 */
function validateResumeContent(content) {
  if (!content || content.length < 50) {
    return false;
  }
  
  // 简历内容特征检查
  const resumePatterns = [
    // 中文简历关键词
    /工作经历|教育经历|个人信息|技能特长|项目经验|基本信息|联系方式/i,
    // 英文简历关键词  
    /work\s*experience|education|skills|experience|position|company|employment/i,
    // 日期格式
    /\d{4}[\.-]\d{1,2}[\.-]\d{1,2}|\d{4}年\d{1,2}月/,
    // 邮箱格式
    /@[\w\.-]+\.[a-zA-Z]{2,}/,
    // 手机号格式
    /1[3-9]\d{9}/,
    // 学历关键词
    /本科|硕士|博士|学士|大学|college|university|bachelor|master|phd/i,
    // 公司/职位关键词
    /有限公司|股份|集团|科技|工程师|经理|主管|director|manager|engineer/i
  ];
  
  // 至少匹配2个特征才认为是简历内容
  const matchCount = resumePatterns.filter(pattern => pattern.test(content)).length;
  
  // 排除测试内容
  const testPatterns = [
    /剪贴板测试|测试主页面|clipboard.*test|等待操作|剪贴板状态/i
  ];
  
  const isTestContent = testPatterns.some(pattern => pattern.test(content));
  
  return matchCount >= 2 && !isTestContent;
}

/**
 * 显示使用说明
 */
function showUsageInstructions() {
  console.log('\n📖 使用说明:');
  console.log('============');
  console.log('1. 运行此脚本后，浏览器会自动打开Boss直聘首页');
  console.log('2. 请手动登录你的Boss直聘账号');
  console.log('3. 搜索候选人或进入智能寻聘页面');
  console.log('4. 点击任意候选人进入简历详情页面');
  console.log('5. 确保页面完全加载后，回到终端按Enter键');
  console.log('6. 脚本会自动测试Hook复制功能');
  console.log('7. 测试完成后可以手动验证复制功能是否正常');
  console.log('\n⚠️  注意事项:');
  console.log('- 确保网络连接稳定');
  console.log('- 请使用真实的Boss直聘账号进行测试');
  console.log('- 测试过程中请不要关闭或刷新浏览器页面');
}

// 如果直接运行此文件，显示说明并执行测试
if (require.main === module) {
  showUsageInstructions();
  
  // 等待用户确认
  console.log('\n按 Enter 键开始测试...');
  process.stdin.once('data', () => {
    testBossZhipinRealEnvironment().catch(console.error);
  });
}

module.exports = {
  testBossZhipinRealEnvironment,
  validateResumeContent
};