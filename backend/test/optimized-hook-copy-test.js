/**
 * 优化后Hook复制机制测试
 * 测试基于用户优化建议的iframe切换 + Hook注入 + 拖拽选区 + Ctrl+C复制流程
 */

const { chromium } = require('playwright');
const DragSelectionService = require('../src/services/dragSelectionService');
const logger = require('../src/utils/logger');

/**
 * 主测试函数
 */
async function testOptimizedHookCopyMechanism() {
  console.log('=== 开始测试优化后的Hook复制机制 ===\n');
  
  let browser = null;
  let page = null;
  
  try {
    // 1. 初始化浏览器和页面
    console.log('1. 初始化浏览器和页面...');
    browser = await chromium.launch({ headless: false });
    page = await browser.newPage();
    
    // 2. 初始化拖拽选区服务
    console.log('2. 初始化拖拽选区服务...');
    const dragSelectionService = new DragSelectionService();
    await dragSelectionService.initialize();
    
    // 3. 创建测试页面模拟Boss直聘简历iframe结构
    console.log('3. 创建测试页面...');
    await createTestPage(page);
    
    // 4. 测试优化后的Hook复制方法
    console.log('4. 测试优化后的Hook复制方法...');
    
    const testResult = await testHookCopyWithIframe(page, dragSelectionService);
    
    if (testResult.success) {
      console.log('✅ 优化后Hook复制机制测试成功！');
      console.log(`📄 复制的简历内容长度: ${testResult.content.length} 字符`);
      console.log(`📝 内容预览: ${testResult.content.substring(0, 200)}...`);
    } else {
      console.log('❌ 优化后Hook复制机制测试失败');
      console.log(`💥 错误信息: ${testResult.error}`);
    }
    
    return testResult;
    
  } catch (error) {
    console.error('测试执行过程中发生错误:', error);
    return { success: false, error: error.message };
  } finally {
    // 清理资源
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * 创建测试页面，模拟Boss直聘简历iframe结构
 */
async function createTestPage(page) {
  // 先创建iframe的HTML内容
  const iframeContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>简历内容</title>
        <style>
            body { margin: 0; padding: 0; background: #f5f5f5; }
            #resume { 
                border: 1px solid #ddd; 
                cursor: text;
                user-select: text;
                -webkit-user-select: text;
                background: white;
            }
            .resume-text {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                opacity: 0;
                user-select: text;
                font-size: 14px;
                line-height: 1.5;
                padding: 20px;
                box-sizing: border-box;
                white-space: pre-wrap;
                pointer-events: auto;
            }
        </style>
    </head>
    <body>
        <canvas id="resume" width="800" height="600" style="width: 800px; height: 600px;">
            您的浏览器不支持Canvas元素
        </canvas>
        <div class="resume-text">
张三
前端开发工程师 | 5年经验 | 本科

个人信息:
电话: 138****8888
邮箱: zhangsan@example.com
期望薪资: 20-30K

工作经历:
2021.03-至今 阿里巴巴集团 高级前端工程师
- 负责淘宝前端架构设计和开发
- 参与多个核心业务系统的重构和优化
- 团队技术栈升级和性能优化工作

2019.06-2021.02 腾讯科技 前端工程师  
- 负责微信小程序平台功能开发
- 参与用户增长相关产品的前端实现
- 性能优化使页面加载速度提升40%

教育经历:
2015-2019 清华大学 计算机科学与技术 本科
主修课程: 数据结构与算法、操作系统、计算机网络等

技能特长:
- 前端技术: React、Vue、TypeScript、Webpack等
- 后端技术: Node.js、Python、MySQL等  
- 其他技能: 小程序开发、性能优化、架构设计
        </div>
        
        <script>
            // 确保DOM加载完成
            document.addEventListener('DOMContentLoaded', function() {
                // 在canvas上绘制简历内容
                const canvas = document.getElementById('resume');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    
                    // 设置字体和样式
                    ctx.font = '16px Arial';
                    ctx.fillStyle = '#333';
                    
                    // 绘制简历内容
                    const resumeLines = [
                        '张三',
                        '前端开发工程师 | 5年经验 | 本科',
                        '',
                        '个人信息:',
                        '电话: 138****8888',
                        '邮箱: zhangsan@example.com',
                        '期望薪资: 20-30K',
                        '',
                        '工作经历:',
                        '2021.03-至今 阿里巴巴集团 高级前端工程师',
                        '• 负责淘宝前端架构设计和开发',
                        '• 参与多个核心业务系统的重构和优化',
                        '',
                        '教育经历:',
                        '2015-2019 清华大学 计算机科学与技术 本科'
                    ];
                    
                    resumeLines.forEach((line, index) => {
                        ctx.fillText(line, 20, 30 + (index * 25));
                    });
                    
                    console.log('Canvas简历内容绘制完成');
                }
            });
        <\/script>
    </body>
    </html>
  `;
  
  // 将iframe内容编码为data URL
  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(iframeContent);
  
  const testHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Boss直聘简历测试页面</title>
        <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
            .main-container { width: 100%; height: 100vh; }
            .iframe-container { width: 900px; height: 650px; border: 1px solid #ccc; margin: 20px auto; }
            iframe { width: 100%; height: 100%; border: none; }
        </style>
    </head>
    <body>
        <div class="main-container">
            <h1>Boss直聘简历页面测试</h1>
            <div class="iframe-container">
                <iframe src="${dataUrl}" id="resumeIframe"></iframe>
            </div>
        </div>
    </body>
    </html>
  `;
  
  await page.setContent(testHTML);
  
  // 等待iframe内容加载完成
  await page.waitForTimeout(3000);
  
  // 验证iframe是否正确加载
  const iframeCount = await page.locator('iframe').count();
  console.log(`   ✓ 检测到 ${iframeCount} 个iframe`);
  
  // 检查iframe的src属性
  const iframeSrc = await page.locator('iframe').first().getAttribute('src');
  console.log(`   ✓ iframe src包含内容: ${iframeSrc ? '是' : '否'}`);
}

/**
 * 测试Hook复制与iframe集成
 */
async function testHookCopyWithIframe(page, dragSelectionService) {
  try {
    console.log('   🔍 开始测试iframe中的Hook复制...');
    
    // 使用优化后的Hook方式复制
    const copiedContent = await dragSelectionService.copyResumeByHook(page, {
      frameSelector: '/web/frame/c-resume/?source=search',
      canvasSelector: 'canvas#resume',
      margin: 10,
      dragSteps: 20,
      waitTime: 1000
    });
    
    if (copiedContent && copiedContent.trim()) {
      console.log('   ✅ Hook复制成功');
      return {
        success: true,
        content: copiedContent,
        method: 'optimized_hook',
        contentLength: copiedContent.length
      };
    } else {
      console.log('   ❌ Hook复制失败: 未获取到内容');
      return {
        success: false,
        error: 'Hook复制未获取到有效内容',
        method: 'optimized_hook'
      };
    }
    
  } catch (error) {
    console.log(`   ❌ Hook复制失败: ${error.message}`);
    return {
      success: false,
      error: error.message,
      method: 'optimized_hook'
    };
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('🚀 开始执行优化后Hook复制机制完整测试套件\n');
  
  const results = [];
  
  // 测试1: 基础Hook复制机制
  console.log('📋 测试1: 基础Hook复制机制');
  const test1 = await testOptimizedHookCopyMechanism();
  results.push({ test: '基础Hook复制机制', ...test1 });
  
  // 输出测试总结
  console.log('\n📊 测试结果总结:');
  console.log('================');
  
  let passCount = 0;
  results.forEach((result, index) => {
    const status = result.success ? '✅ 通过' : '❌ 失败';
    console.log(`${index + 1}. ${result.test}: ${status}`);
    if (result.success) {
      passCount++;
      console.log(`   📄 内容长度: ${result.contentLength} 字符`);
    } else {
      console.log(`   💥 错误: ${result.error}`);
    }
  });
  
  console.log(`\n🎯 测试通过率: ${passCount}/${results.length} (${Math.round(passCount/results.length*100)}%)`);
  
  if (passCount === results.length) {
    console.log('🎉 所有测试通过！优化后的Hook复制机制工作正常');
  } else {
    console.log('⚠️  部分测试失败，请检查相关功能实现');
  }
  
  return results;
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testOptimizedHookCopyMechanism,
  runAllTests
};