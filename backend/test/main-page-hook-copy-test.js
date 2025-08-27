/**
 * 主页面Hook复制机制测试
 * 测试在主页面（非iframe）环境下的Hook复制功能
 */

const { chromium } = require('playwright');
const DragSelectionService = require('../src/services/dragSelectionService');
const logger = require('../src/utils/logger');

/**
 * 主测试函数
 */
async function testMainPageHookCopyMechanism() {
  console.log('=== 开始测试主页面Hook复制机制 ===\n');
  
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
    
    // 3. 创建主页面测试页面
    console.log('3. 创建主页面测试页面...');
    await createMainPageTestPage(page);
    
    // 4. 测试主页面Hook复制方法
    console.log('4. 测试主页面Hook复制方法...');
    
    const testResult = await testMainPageHookCopy(page, dragSelectionService);
    
    if (testResult.success) {
      console.log('✅ 主页面Hook复制机制测试成功！');
      console.log(`📄 复制的简历内容长度: ${testResult.content.length} 字符`);
      console.log(`📝 内容预览: ${testResult.content.substring(0, 200)}...`);
    } else {
      console.log('❌ 主页面Hook复制机制测试失败');
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
 * 创建主页面测试页面（包含canvas#resume元素）
 */
async function createMainPageTestPage(page) {
  const testHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Boss直聘主页面简历测试</title>
        <style>
            body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background: #f5f5f5; }
            .main-container { width: 100%; max-width: 1200px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 30px; }
            .resume-container { 
                width: 900px; 
                height: 650px; 
                border: 1px solid #ccc; 
                margin: 20px auto;
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
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
        <div class="main-container">
            <div class="header">
                <h1>Boss直聘主页面简历测试</h1>
                <p>测试主页面canvas#resume元素的Hook复制功能</p>
            </div>
            <div class="resume-container">
                <canvas id="resume" width="800" height="600" style="width: 800px; height: 600px;">
                    您的浏览器不支持Canvas元素
                </canvas>
                <div class="resume-text">
李四
高级全栈工程师 | 8年经验 | 硕士

个人信息:
电话: 138****9999
邮箱: lisi@example.com
期望薪资: 35-50K
现居住地: 北京市

工作经历:
2020.05-至今 字节跳动 技术专家/架构师
- 负责抖音后端核心系统架构设计与优化
- 团队规模15人，负责微服务架构升级改造
- 系统性能优化使服务响应时间降低50%
- 主导了分布式缓存系统的重构工作

2018.03-2020.04 美团 高级后端工程师
- 参与美团外卖核心业务系统开发
- 负责订单系统高可用架构设计
- 优化数据库查询性能，QPS提升3倍
- 设计并实现了分布式锁解决方案

2016.07-2018.02 滴滴出行 后端工程师
- 负责出行业务相关后端接口开发
- 参与实时计算平台的搭建与优化
- 设计高并发场景下的数据一致性方案

教育经历:
2014-2016 清华大学 计算机科学与技术 硕士
主要研究方向: 分布式系统、大数据处理

2010-2014 北京理工大学 软件工程 本科
主修课程: 数据结构、算法设计、软件工程等

技能特长:
- 后端技术: Java、Spring Boot、Go、Python
- 数据库: MySQL、Redis、MongoDB、Elasticsearch  
- 架构技能: 微服务、分布式系统、高并发优化
- 中间件: Kafka、RabbitMQ、Dubbo、Zookeeper
- 云平台: AWS、阿里云、Docker、Kubernetes

项目经验:
1. 抖音推荐系统优化（2021-2022）
   - 重构推荐算法服务架构，支持千万级用户
   - 引入实时特征工程，提升推荐准确率15%

2. 美团配送系统重构（2019）  
   - 设计分布式配送调度系统
   - 优化配送路径算法，配送效率提升20%
                </div>
                
                <script>
                    // 确保DOM加载完成
                    document.addEventListener('DOMContentLoaded', function() {
                        // 在canvas上绘制简历内容
                        const canvas = document.getElementById('resume');
                        if (canvas) {
                            const ctx = canvas.getContext('2d');
                            
                            // 设置字体和样式
                            ctx.font = '14px Arial';
                            ctx.fillStyle = '#333';
                            
                            // 绘制简历内容
                            const resumeLines = [
                                '李四',
                                '高级全栈工程师 | 8年经验 | 硕士',
                                '',
                                '个人信息:',
                                '电话: 138****9999',
                                '邮箱: lisi@example.com',
                                '期望薪资: 35-50K',
                                '现居住地: 北京市',
                                '',
                                '工作经历:',
                                '2020.05-至今 字节跳动 技术专家/架构师',
                                '• 负责抖音后端核心系统架构设计与优化',
                                '• 团队规模15人，负责微服务架构升级改造',
                                '• 系统性能优化使服务响应时间降低50%',
                                '',
                                '2018.03-2020.04 美团 高级后端工程师',
                                '• 参与美团外卖核心业务系统开发',
                                '• 负责订单系统高可用架构设计',
                                '',
                                '教育经历:',
                                '2014-2016 清华大学 计算机科学与技术 硕士',
                                '2010-2014 北京理工大学 软件工程 本科'
                            ];
                            
                            resumeLines.forEach((line, index) => {
                                ctx.fillText(line, 20, 30 + (index * 22));
                            });
                            
                            console.log('主页面Canvas简历内容绘制完成');
                        }
                    });
                </script>
            </div>
        </div>
    </body>
    </html>
  `;
  
  await page.setContent(testHTML);
  
  // 等待页面内容加载完成
  await page.waitForTimeout(3000);
  
  // 验证canvas元素是否正确加载
  const canvasCount = await page.locator('canvas#resume').count();
  console.log(`   ✓ 检测到 ${canvasCount} 个canvas#resume元素`);
  
  // 检查canvas是否可见
  const canvasVisible = await page.locator('canvas#resume').isVisible();
  console.log(`   ✓ canvas#resume元素可见性: ${canvasVisible ? '是' : '否'}`);
}

/**
 * 测试主页面Hook复制功能
 */
async function testMainPageHookCopy(page, dragSelectionService) {
  try {
    console.log('   🔍 开始测试主页面Hook复制...');
    
    // 使用优化后的Hook方式复制（主页面模式）
    const copiedContent = await dragSelectionService.copyResumeByHook(page, {
      frameSelector: null, // 主页面不需要iframe切换
      canvasSelector: 'canvas#resume',
      margin: 10,
      dragSteps: 20,
      waitTime: 1000
    });
    
    if (copiedContent && copiedContent.trim()) {
      console.log('   ✅ 主页面Hook复制成功');
      return {
        success: true,
        content: copiedContent,
        method: 'main_page_hook',
        contentLength: copiedContent.length
      };
    } else {
      console.log('   ❌ 主页面Hook复制失败: 未获取到内容');
      return {
        success: false,
        error: '主页面Hook复制未获取到有效内容',
        method: 'main_page_hook'
      };
    }
    
  } catch (error) {
    console.log(`   ❌ 主页面Hook复制失败: ${error.message}`);
    return {
      success: false,
      error: error.message,
      method: 'main_page_hook'
    };
  }
}

/**
 * 运行所有测试
 */
async function runAllMainPageTests() {
  console.log('🚀 开始执行主页面Hook复制机制完整测试套件\n');
  
  const results = [];
  
  // 测试1: 主页面Hook复制机制
  console.log('📋 测试1: 主页面Hook复制机制');
  const test1 = await testMainPageHookCopyMechanism();
  results.push({ test: '主页面Hook复制机制', ...test1 });
  
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
      console.log(`   🎯 方法: ${result.method}`);
    } else {
      console.log(`   💥 错误: ${result.error}`);
    }
  });
  
  console.log(`\n🎯 测试通过率: ${passCount}/${results.length} (${Math.round(passCount/results.length*100)}%)`);
  
  if (passCount === results.length) {
    console.log('🎉 所有测试通过！主页面Hook复制机制工作正常');
  } else {
    console.log('⚠️  部分测试失败，请检查相关功能实现');
  }
  
  return results;
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runAllMainPageTests().catch(console.error);
}

module.exports = {
  testMainPageHookCopyMechanism,
  runAllMainPageTests
};