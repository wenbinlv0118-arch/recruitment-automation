/**
 * 基于用户验证成功的Hook方案测试脚本
 * 验证优化后的Hook复制机制
 */

const { chromium } = require('playwright');
const DragSelectionService = require('../src/services/dragSelectionService');
const logger = require('../src/utils/logger');

/**
 * 测试优化后的Hook复制机制
 */
async function testOptimizedHookCopyMechanism() {
  console.log('=== 基于用户验证成功的Hook方案测试 ===\n');
  
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
    
    // 3. 创建测试页面，模拟Boss直聘简历
    console.log('3. 创建测试页面，模拟Boss直聘的复制行为...');
    await createBossZhipinSimulationPage(page);
    
    // 4. 测试优化后的Hook复制方法
    console.log('4. 测试优化后的Hook复制方法...');
    
    const testResults = [];
    
    // 测试1: iframe模式
    console.log('\n📋 测试1: iframe模式Hook复制（基于用户验证成功的方案）');
    const iframeResult = await testIframeOptimizedHook(page, dragSelectionService);
    testResults.push({ test: 'iframe模式优化Hook', ...iframeResult });
    
    // 输出测试结果
    console.log('\n📊 优化后Hook测试结果总结:');
    console.log('==========================');
    
    let passCount = 0;
    testResults.forEach((result, index) => {
      const status = result.success ? '✅ 通过' : '❌ 失败';
      console.log(`${index + 1}. ${result.test}: ${status}`);
      if (result.success) {
        passCount++;
        console.log(`   📄 捕获内容长度: ${result.contentLength} 字符`);
        console.log(`   🎯 捕获方法: ${result.method}`);
        console.log(`   📝 内容预览: ${result.content.substring(0, 150)}...`);
        
        // 验证是否包含用户示例中的关键内容
        const hasKeyContent = /在校经历|艺术团|团长|活动管理|团队建设|面试选拔/.test(result.content);
        console.log(`   🔍 关键内容验证: ${hasKeyContent ? '✅ 包含' : '❌ 不包含'}`);
      } else {
        console.log(`   💥 错误: ${result.error}`);
      }
    });
    
    console.log(`\n🎯 测试通过率: ${passCount}/${testResults.length} (${Math.round(passCount/testResults.length*100)}%)`);
    
    if (passCount === testResults.length) {
      console.log('🎉 所有测试通过！基于用户验证的Hook优化方案工作正常！');
      console.log('💡 关键改进：使用window.__grabbed_text变量名，简化Hook逻辑');
    } else {
      console.log('⚠️  部分测试失败，需要进一步优化');
    }
    
    return testResults;
    
  } catch (error) {
    console.error('测试执行过程中发生错误:', error);
    return [{ success: false, error: error.message }];
  } finally {
    console.log('\n🔍 浏览器保持打开状态，可手动验证Hook功能...');
    console.log('可以在浏览器控制台中手动执行用户验证成功的Hook代码进行对比测试');
    // await browser?.close();
  }
}

/**
 * 创建模拟Boss直聘复制行为的测试页面
 */
async function createBossZhipinSimulationPage(page) {
  // iframe内容，模拟Boss直聘的复制行为
  const iframeContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>模拟Boss直聘简历页面</title>
        <style>
            body { margin: 0; padding: 20px; background: #f5f5f5; font-family: Arial, sans-serif; }
            #resume { 
                border: 2px solid #007ACC; 
                cursor: text;
                user-select: none; /* 模拟Boss直聘的不可选择状态 */
                background: white;
                display: block;
            }
            .status-info {
                position: fixed;
                top: 10px;
                right: 10px;
                background: #fff;
                padding: 15px;
                border: 1px solid #ccc;
                font-size: 12px;
                z-index: 1000;
                border-radius: 5px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                max-width: 300px;
            }
            .resume-data {
                display: none; /* 隐藏的简历数据 */
            }
        </style>
    </head>
    <body>
        <div class="status-info">
            <div><strong>Boss直聘模拟页面</strong></div>
            <div id="copy-status">等待复制操作...</div>
            <div id="hook-status">Hook状态: 未激活</div>
        </div>
        
        <canvas id="resume" width="800" height="600" style="width: 800px; height: 600px;">
            您的浏览器不支持Canvas元素
        </canvas>
        
        <!-- 隐藏的简历数据，模拟Boss直聘的实际存储方式 -->
        <div class="resume-data" id="resume-data">
在校经历：
校艺术团声乐队 团长 

活动管理：  
策划执行3场校级晚会（最大规模800人）。  
创新"线上+线下"模式，参与量比预期的提升。

团队建设：  
面试选拔15名新成员，设计分级培训体系。
建立导师制度，新成员技能提升显著。

组织协调：
跨部门协作，与舞蹈队、器乐队联合演出。
负责演出现场调度，确保活动顺利进行。

荣誉成就：
获评"优秀学生干部"，团队获"年度最佳社团"。
个人获校园文化贡献奖，活动参与度提升40%。

技能收获：
提升了领导力、沟通能力和团队协作能力。
掌握了活动策划、项目管理和危机处理技能。
        </div>
        
        <script>
            let hasSimulatedBossZhipinBehavior = false;
            
            function simulateBossZhipinCopyBehavior() {
                if (hasSimulatedBossZhipinBehavior) return;
                hasSimulatedBossZhipinBehavior = true;
                
                const canvas = document.getElementById('resume');
                const resumeData = document.getElementById('resume-data').textContent.trim();
                const copyStatus = document.getElementById('copy-status');
                const hookStatus = document.getElementById('hook-status');
                
                // 检测是否有外部Hook
                let hasExternalHook = false;
                const originalWriteText = navigator.clipboard.writeText;
                
                // 检查是否被Hook了
                if (navigator.clipboard.writeText.toString().includes('__grabbed_text') || 
                    navigator.clipboard.writeText.toString().includes('Hook') ||
                    navigator.clipboard.writeText !== originalWriteText) {
                    hasExternalHook = true;
                    hookStatus.textContent = 'Hook状态: ✅ 检测到外部Hook';
                } else {
                    hookStatus.textContent = 'Hook状态: ❌ 未检测到Hook';
                }
                
                // 模拟Boss直聘：监听canvas上的拖拽操作
                let isDragging = false;
                
                canvas.addEventListener('mousedown', function(e) {
                    isDragging = true;
                    copyStatus.textContent = '开始拖拽选区...';
                });
                
                canvas.addEventListener('mousemove', function(e) {
                    if (isDragging) {
                        copyStatus.textContent = '正在拖拽选区...';
                    }
                });
                
                canvas.addEventListener('mouseup', function(e) {
                    if (isDragging) {
                        isDragging = false;
                        copyStatus.textContent = '拖拽完成，等待复制操作...';
                    }
                });
                
                // 模拟Boss直聘：监听复制事件，主动写入剪贴板
                document.addEventListener('copy', function(event) {
                    copyStatus.textContent = '检测到复制操作，正在写入剪贴板...';
                    
                    // 模拟Boss直聘的行为：主动将简历数据写入剪贴板
                    setTimeout(() => {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(resumeData).then(() => {
                                copyStatus.textContent = '✅ Boss直聘已将简历数据写入剪贴板';
                                console.log('🎯 [模拟Boss直聘] 已将简历数据写入剪贴板，长度:', resumeData.length);
                                console.log('📄 [模拟Boss直聘] 内容预览:', resumeData.substring(0, 100) + '...');
                                
                                if (hasExternalHook) {
                                    hookStatus.textContent = 'Hook状态: ✅ 应该已捕获内容';
                                }
                            }).catch(err => {
                                copyStatus.textContent = '❌ 剪贴板写入失败';
                                console.error('剪贴板写入失败:', err);
                            });
                        }
                    }, 50); // 模拟Boss直聘的50ms延迟写入
                });
                
                // 监听键盘事件
                document.addEventListener('keydown', function(event) {
                    if (event.ctrlKey && event.key === 'c') {
                        copyStatus.textContent = '检测到Ctrl+C，触发复制行为...';
                    }
                });
                
                console.log('🎯 Boss直聘复制行为模拟已设置完成');
            }
            
            // 页面加载完成后设置行为
            document.addEventListener('DOMContentLoaded', function() {
                // 绘制canvas内容
                const canvas = document.getElementById('resume');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.font = '16px Arial';
                    ctx.fillStyle = '#333';
                    
                    const lines = [
                        '在校经历',
                        '校艺术团声乐队 团长',
                        '',
                        '📋 活动管理:',
                        '策划执行3场校级晚会（最大规模800人）',
                        '创新"线上+线下"模式，参与量提升显著',
                        '',
                        '👥 团队建设:',
                        '面试选拔15名新成员',
                        '设计分级培训体系',
                        '',
                        '🏆 荣誉成就:',
                        '获评"优秀学生干部"',
                        '团队获"年度最佳社团"',
                        '',
                        '💪 技能收获:',
                        '提升领导力、沟通能力和团队协作能力'
                    ];
                    
                    lines.forEach((line, i) => {
                        ctx.fillText(line, 30, 40 + i * 30);
                    });
                    
                    console.log('📊 Canvas简历内容绘制完成');
                }
                
                // 延迟1秒后设置Boss直聘行为，确保外部Hook有时间注入
                setTimeout(() => {
                    simulateBossZhipinCopyBehavior();
                }, 1000);
            });
        <\/script>
    </body>
    </html>
  `;
  
  // 主页面HTML
  const mainHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>基于用户验证的Hook优化测试</title>
        <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f8f9fa; }
            .container { max-width: 1200px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; padding: 20px; background: white; border-radius: 8px; }
            .iframe-container { 
                width: 900px; 
                height: 650px; 
                border: 2px solid #007ACC; 
                margin: 20px auto; 
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            iframe { width: 100%; height: 100%; border: none; }
            .optimization-info {
                background: #e8f5e8;
                padding: 15px;
                margin: 20px auto;
                max-width: 900px;
                border-radius: 8px;
                border-left: 4px solid #28a745;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎯 基于用户验证成功的Hook优化测试</h1>
                <p>测试采用用户手工验证成功的Hook方案</p>
            </div>
            
            <div class="optimization-info">
                <h3>🔧 关键优化点:</h3>
                <ul>
                    <li>✅ <strong>采用用户验证成功的Hook代码结构</strong></li>
                    <li>✅ <strong>使用window.__grabbed_text变量名</strong></li>
                    <li>✅ <strong>简化Hook逻辑，减少复杂性</strong></li>
                    <li>✅ <strong>模拟Boss直聘真实的复制行为</strong></li>
                    <li>✅ <strong>增强简历内容特征验证</strong></li>
                </ul>
                <div style="background: #f0f8f0; padding: 10px; margin-top: 10px; border-radius: 4px;">
                    <strong>用户验证成功的内容示例:</strong><br>
                    "在校经历：校艺术团声乐队 团长 活动管理：策划执行3场校级晚会..."
                </div>
            </div>
            
            <div class="iframe-container">
                <iframe src="data:text/html;charset=utf-8,${encodeURIComponent(iframeContent)}" 
                        id="resumeIframe">
                </iframe>
            </div>
        </div>
    </body>
    </html>
  `;
  
  await page.setContent(mainHTML);
  await page.waitForTimeout(3000);
  
  console.log('   ✓ Boss直聘模拟测试页面创建完成');
}

/**
 * 测试iframe模式优化Hook复制
 */
async function testIframeOptimizedHook(page, dragSelectionService) {
  try {
    console.log('   🔍 开始测试iframe模式优化Hook复制...');
    
    const copiedContent = await dragSelectionService.copyResumeByHook(page, {
      frameSelector: '/web/frame/c-resume/?source=search',
      canvasSelector: 'canvas#resume',
      margin: 10,
      dragSteps: 20,
      waitTime: 2000 // 增加等待时间，确保Boss直聘有时间写入
    });
    
    if (copiedContent && copiedContent.trim()) {
      console.log('   ✅ iframe模式优化Hook复制成功');
      
      // 检查是否包含用户验证成功的关键内容
      const hasUserVerifiedContent = /在校经历|艺术团|团长|活动管理|团队建设|面试选拔/.test(copiedContent);
      
      return {
        success: true,
        content: copiedContent,
        contentLength: copiedContent.length,
        method: 'iframe_optimized_hook',
        hasUserContent: hasUserVerifiedContent
      };
    } else {
      return {
        success: false,
        error: 'iframe模式优化Hook复制未获取到有效内容',
        method: 'iframe_optimized_hook'
      };
    }
    
  } catch (error) {
    console.log(`   ❌ iframe模式优化Hook复制失败: ${error.message}`);
    return {
      success: false,
      error: error.message,
      method: 'iframe_optimized_hook'
    };
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  console.log('🚀 启动基于用户验证成功的Hook优化测试...\n');
  console.log('💡 本测试基于用户手工验证成功的Hook方案：');
  console.log('   - 使用window.__grabbed_text变量');
  console.log('   - 简化Hook逻辑');
  console.log('   - 模拟Boss直聘真实复制行为\n');
  
  testOptimizedHookCopyMechanism().catch(console.error);
}

module.exports = {
  testOptimizedHookCopyMechanism
};