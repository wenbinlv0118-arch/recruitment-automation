/**
 * 剪贴板Hook机制专门测试
 * 测试针对Boss直聘主动写入剪贴板内容的优化Hook捕获机制
 */

const { chromium } = require('playwright');
const DragSelectionService = require('../src/services/dragSelectionService');
const logger = require('../src/utils/logger');

/**
 * 测试剪贴板Hook捕获机制
 */
async function testClipboardHookMechanism() {
  console.log('=== 测试优化的剪贴板Hook捕获机制 ===\n');
  
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
    
    // 3. 创建模拟Boss直聘剪贴板写入的测试页面
    console.log('3. 创建模拟Boss直聘剪贴板写入测试页面...');
    await createClipboardTestPage(page);
    
    // 4. 测试各种剪贴板Hook捕获场景
    const testResults = [];
    
    // 测试1: iframe模式剪贴板Hook
    console.log('\n📋 测试1: iframe模式剪贴板Hook捕获');
    const iframeResult = await testIframeClipboardHook(page, dragSelectionService);
    testResults.push({ test: 'iframe模式剪贴板Hook', ...iframeResult });
    
    // 测试2: 主页面模式剪贴板Hook  
    console.log('\n📋 测试2: 主页面模式剪贴板Hook捕获');
    await createMainPageClipboardTest(page);
    const mainPageResult = await testMainPageClipboardHook(page, dragSelectionService);
    testResults.push({ test: '主页面模式剪贴板Hook', ...mainPageResult });
    
    // 输出测试结果
    console.log('\n📊 剪贴板Hook测试结果总结:');
    console.log('==========================');
    
    let passCount = 0;
    testResults.forEach((result, index) => {
      const status = result.success ? '✅ 通过' : '❌ 失败';
      console.log(`${index + 1}. ${result.test}: ${status}`);
      if (result.success) {
        passCount++;
        console.log(`   📄 捕获内容长度: ${result.contentLength} 字符`);
        console.log(`   🎯 捕获方法: ${result.method}`);
        console.log(`   📝 内容预览: ${result.content.substring(0, 100)}...`);
      } else {
        console.log(`   💥 错误: ${result.error}`);
      }
    });
    
    console.log(`\n🎯 测试通过率: ${passCount}/${testResults.length} (${Math.round(passCount/testResults.length*100)}%)`);
    
    if (passCount === testResults.length) {
      console.log('🎉 所有剪贴板Hook测试通过！优化的剪贴板捕获机制工作正常！');
    } else {
      console.log('⚠️  部分测试失败，需要进一步优化剪贴板Hook机制');
    }
    
    return testResults;
    
  } catch (error) {
    console.error('测试执行过程中发生错误:', error);
    return [{ success: false, error: error.message }];
  } finally {
    // 保持浏览器打开用于调试
    console.log('\n🔍 浏览器保持打开状态，可手动测试剪贴板功能...');
    console.log('请在页面中手动点击canvas区域并按Ctrl+C，观察Hook是否能捕获内容');
    // await browser?.close();
  }
}

/**
 * 创建模拟Boss直聘剪贴板写入的测试页面
 */
async function createClipboardTestPage(page) {
  // iframe内容，模拟Boss直聘的剪贴板写入行为
  const iframeContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Boss直聘剪贴板测试</title>
        <style>
            body { margin: 0; padding: 20px; background: #f5f5f5; font-family: Arial, sans-serif; }
            #resume { 
                border: 2px solid #007ACC; 
                cursor: text;
                user-select: none; /* 模拟Boss直聘的不可选择状态 */
                background: white;
                display: block;
            }
            .clipboard-info {
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
            }
            .resume-data {
                display: none; /* 隐藏的简历数据，模拟Boss直聘的数据存储 */
            }
        </style>
    </head>
    <body>
        <div class="clipboard-info">
            <div><strong>剪贴板测试页面</strong></div>
            <div id="copy-status">等待复制操作...</div>
            <div id="clipboard-content">剪贴板内容: 无</div>
        </div>
        
        <canvas id="resume" width="800" height="600" style="width: 800px; height: 600px;">
            您的浏览器不支持Canvas元素
        </canvas>
        
        <!-- 隐藏的简历数据，模拟Boss直聘的实际存储方式 -->
        <div class="resume-data" id="resume-data">
李明
高级Python后端工程师 | 8年经验 | 本科

个人信息:
电话: 138****5555
邮箱: liming@example.com
期望薪资: 30-45K
工作地点: 北京市朝阳区

工作经历:
2018.01-至今 京东科技 高级后端工程师/技术专家
• 负责京东电商核心交易系统后端架构设计与开发
• 主导微服务架构升级，支撑双11等大促活动
• 系统性能优化，接口响应时间减少50%
• 团队规模15人，负责新人培训和技术规范制定

2015.06-2017.12 美团 Python开发工程师
• 参与美团外卖核心业务系统开发
• 负责订单系统高可用架构设计和实现
• 参与分布式任务调度系统建设

2013.07-2015.05 百度 软件工程师
• 负责百度搜索广告系统后端开发
• 参与大数据处理平台搭建和优化
• 负责实时数据同步系统设计

教育经历:
2009-2013 北京理工大学 计算机科学与技术 本科
主要课程: 数据结构、算法设计、操作系统、计算机网络、数据库系统

专业技能:
• 编程语言: Python(精通)、Java、Go、JavaScript
• Web框架: Django、Flask、FastAPI、Tornado
• 数据库: MySQL、Redis、MongoDB、PostgreSQL
• 云服务: AWS、阿里云、Docker、Kubernetes
• 消息队列: Kafka、RabbitMQ、Celery
• 其他: 分布式系统、微服务架构、性能调优

项目经验:
1. 京东交易系统重构 (2020-2022)
   项目规模: 日订单量1000万+，峰值QPS 10万+
   技术栈: Python、Django、Redis、MySQL、Kafka
   职责: 核心模块设计开发、性能优化、架构演进
   成果: 系统稳定性99.99%，接口响应时间<100ms

2. 美团配送调度系统 (2016-2017)
   项目规模: 覆盖200+城市，日配送订单500万+
   技术栈: Python、Flask、Redis、MongoDB
   职责: 调度算法优化、实时数据处理
   成果: 配送效率提升25%，用户满意度95%+

个人优势:
• 8年互联网大厂后端开发经验，精通Python生态
• 有丰富的大型分布式系统设计和优化经验
• 具备良好的团队协作能力和技术领导力
• 对新技术保持敏感，持续学习和实践
        </div>
        
        <script>
            // 模拟Boss直聘的剪贴板写入机制
            let hasSetupClipboardBehavior = false;
            
            function setupBossZhipinClipboardBehavior() {
                if (hasSetupClipboardBehavior) return;
                hasSetupClipboardBehavior = true;
                
                const canvas = document.getElementById('resume');
                const resumeData = document.getElementById('resume-data').textContent.trim();
                const copyStatus = document.getElementById('copy-status');
                const clipboardContent = document.getElementById('clipboard-content');
                
                // 模拟Boss直聘：监听canvas上的点击和键盘事件
                canvas.addEventListener('click', function() {
                    copyStatus.textContent = 'Canvas已点击，等待复制操作...';
                });
                
                // 模拟Boss直聘：监听复制事件，主动写入剪贴板
                document.addEventListener('copy', function(event) {
                    copyStatus.textContent = '检测到复制操作，正在写入剪贴板...';
                    
                    // 模拟Boss直聘的行为：主动将简历数据写入剪贴板
                    setTimeout(() => {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(resumeData).then(() => {
                                copyStatus.textContent = '✅ 已成功写入剪贴板';
                                clipboardContent.textContent = \`剪贴板内容: \${resumeData.substring(0, 50)}...\`;
                                console.log('📋 模拟Boss直聘：已将简历数据写入剪贴板，长度:', resumeData.length);
                            }).catch(err => {
                                copyStatus.textContent = '❌ 剪贴板写入失败';
                                console.error('剪贴板写入失败:', err);
                            });
                        }
                    }, 10); // 模拟Boss直聘的延迟写入
                });
                
                // 监听键盘事件
                document.addEventListener('keydown', function(event) {
                    if (event.ctrlKey && event.key === 'c') {
                        copyStatus.textContent = '检测到Ctrl+C，触发剪贴板写入...';
                    }
                });
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
                        '李明',
                        '高级Python后端工程师 | 8年经验 | 本科',
                        '',
                        '📞 138****5555  📧 liming@example.com',
                        '💰 30-45K  📍 北京市朝阳区',
                        '',
                        '🏢 2018.01-至今 京东科技 高级后端工程师',
                        '• 负责京东电商核心交易系统开发',
                        '• 微服务架构升级，支撑双11大促',
                        '',
                        '🏢 2015.06-2017.12 美团 Python工程师',
                        '• 美团外卖核心业务系统开发',
                        '• 订单系统高可用架构设计',
                        '',
                        '🎓 2009-2013 北京理工大学 计算机科学本科',
                        '',
                        '💻 Python、Django、Redis、MySQL、Kafka'
                    ];
                    
                    lines.forEach((line, i) => {
                        ctx.fillText(line, 30, 40 + i * 28);
                    });
                    
                    console.log('📊 Canvas简历内容绘制完成');
                }
                
                // 设置Boss直聘剪贴板行为
                setupBossZhipinClipboardBehavior();
                console.log('🎯 Boss直聘剪贴板模拟行为已设置');
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
        <title>剪贴板Hook测试页面</title>
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
            .test-info {
                background: white;
                padding: 15px;
                margin: 20px auto;
                max-width: 900px;
                border-radius: 8px;
                border-left: 4px solid #007ACC;
            }
            .instructions {
                background: #e8f4f8;
                padding: 15px;
                margin: 20px auto;
                max-width: 900px;
                border-radius: 8px;
                border: 1px solid #b3d9e8;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔬 剪贴板Hook捕获机制测试</h1>
                <p>测试针对Boss直聘主动写入剪贴板内容的优化Hook机制</p>
            </div>
            
            <div class="test-info">
                <h3>📋 优化重点:</h3>
                <ul>
                    <li>🎯 <strong>剪贴板API劫持</strong>：优先捕获navigator.clipboard.writeText调用</li>
                    <li>📊 <strong>增强copy事件处理</strong>：支持clipboardData直接访问和延迟检查</li>
                    <li>⏰ <strong>高频剪贴板监听</strong>：每200ms检查剪贴板内容变化</li>
                    <li>🔄 <strong>多重等待验证</strong>：复制后多次检查确保内容捕获</li>
                </ul>
            </div>
            
            <div class="instructions">
                <h3>🧪 测试说明:</h3>
                <p>本测试模拟Boss直聘的行为：</p>
                <ol>
                    <li>Canvas内容不可直接选择（user-select: none）</li>
                    <li>当检测到复制操作时，主动将简历数据写入剪贴板</li>
                    <li>测试Hook机制是否能捕获这种主动写入的内容</li>
                </ol>
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
  
  console.log('   ✓ 剪贴板测试页面创建完成');
}

/**
 * 测试iframe模式剪贴板Hook捕获
 */
async function testIframeClipboardHook(page, dragSelectionService) {
  try {
    console.log('   🔍 开始测试iframe模式剪贴板Hook捕获...');
    
    const copiedContent = await dragSelectionService.copyResumeByHook(page, {
      frameSelector: '/web/frame/c-resume/?source=search',
      canvasSelector: 'canvas#resume',
      margin: 10,
      dragSteps: 20,
      waitTime: 2000 // 增加等待时间，确保剪贴板写入完成
    });
    
    if (copiedContent && copiedContent.trim()) {
      console.log('   ✅ iframe模式剪贴板Hook捕获成功');
      return {
        success: true,
        content: copiedContent,
        contentLength: copiedContent.length,
        method: 'iframe_clipboard_hook'
      };
    } else {
      return {
        success: false,
        error: 'iframe模式剪贴板Hook未捕获到有效内容',
        method: 'iframe_clipboard_hook'
      };
    }
    
  } catch (error) {
    console.log(`   ❌ iframe模式剪贴板Hook捕获失败: ${error.message}`);
    return {
      success: false,
      error: error.message,
      method: 'iframe_clipboard_hook'
    };
  }
}

/**
 * 创建主页面剪贴板测试环境
 */
async function createMainPageClipboardTest(page) {
  const mainPageHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>主页面剪贴板测试</title>
        <style>
            body { margin: 0; padding: 20px; background: #f8f9fa; font-family: Arial, sans-serif; }
            .container { max-width: 1000px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            #resume { 
                border: 2px solid #28a745; 
                cursor: pointer;
                user-select: none; /* 模拟不可选择 */
                background: white;
                margin: 20px auto;
                display: block;
            }
            .clipboard-status {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #fff;
                padding: 15px;
                border: 1px solid #ccc;
                border-radius: 5px;
                font-size: 12px;
                z-index: 1000;
            }
            .resume-data { display: none; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>🖥️ 主页面剪贴板Hook测试</h2>
                <p>测试主页面环境下的剪贴板Hook捕获</p>
            </div>
            
            <div class="clipboard-status">
                <div><strong>剪贴板状态</strong></div>
                <div id="status">等待操作...</div>
            </div>
            
            <canvas id="resume" width="800" height="600" style="width: 800px; height: 600px;">
                您的浏览器不支持Canvas元素
            </canvas>
            
            <div class="resume-data" id="resume-data">
陈小雨
前端技术专家 | 6年经验 | 硕士

联系方式:
📞 159****8888
📧 chenxiaoyu@example.com
💰 25-40K
📍 上海市浦东新区

工作经历:
2020.03-至今 阿里巴巴 前端技术专家
• 负责淘宝前端基础设施建设和性能优化
• 主导组件库设计，支撑50+业务线
• 前端工程化体系建设，开发效率提升40%

2018.08-2020.02 腾讯 高级前端工程师
• 微信小程序平台核心功能开发
• 负责小程序性能监控和优化工具
• 参与小程序框架底层架构设计

教育经历:
2016-2018 复旦大学 软件工程 硕士
2012-2016 上海交通大学 计算机科学 本科

技能专长:
• 前端: React、Vue、TypeScript、Webpack、Vite
• 移动端: React Native、小程序、Flutter
• 工程化: 前端工程化、CI/CD、性能优化、监控
• 架构: 微前端、组件库、设计系统
            </div>
        </div>
        
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                const canvas = document.getElementById('resume');
                const resumeData = document.getElementById('resume-data').textContent.trim();
                const status = document.getElementById('status');
                
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.font = '16px Arial';
                    ctx.fillStyle = '#333';
                    
                    const lines = [
                        '陈小雨',
                        '前端技术专家 | 6年经验 | 硕士', 
                        '',
                        '📞 159****8888  📧 chenxiaoyu@example.com',
                        '💰 25-40K  📍 上海市浦东新区',
                        '',
                        '🏢 2020.03-至今 阿里巴巴 前端技术专家',
                        '• 淘宝前端基础设施建设',
                        '• 组件库设计，支撑50+业务',
                        '',
                        '🏢 2018.08-2020.02 腾讯 高级前端',
                        '• 微信小程序平台开发',
                        '• 性能监控和优化工具'
                    ];
                    
                    lines.forEach((line, i) => {
                        ctx.fillText(line, 30, 40 + i * 28);
                    });
                    
                    console.log('📊 主页面Canvas内容绘制完成');
                }
                
                // 模拟Boss直聘主页面的剪贴板行为
                canvas.addEventListener('click', function() {
                    status.textContent = 'Canvas已点击';
                });
                
                document.addEventListener('copy', function(event) {
                    status.textContent = '复制中...';
                    setTimeout(() => {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(resumeData).then(() => {
                                status.textContent = '✅ 剪贴板已更新';
                                console.log('📋 主页面：已将简历数据写入剪贴板');
                            });
                        }
                    }, 10);
                });
                
                document.addEventListener('keydown', function(event) {
                    if (event.ctrlKey && event.key === 'c') {
                        status.textContent = 'Ctrl+C detected';
                    }
                });
            });
        <\/script>
    </body>
    </html>
  `;
  
  await page.setContent(mainPageHTML);
  await page.waitForTimeout(2000);
}

/**
 * 测试主页面剪贴板Hook捕获
 */
async function testMainPageClipboardHook(page, dragSelectionService) {
  try {
    console.log('   🔍 开始测试主页面剪贴板Hook捕获...');
    
    const copiedContent = await dragSelectionService.copyResumeByHook(page, {
      frameSelector: null, // 主页面不需要iframe
      canvasSelector: 'canvas#resume',
      margin: 15,
      dragSteps: 20,
      waitTime: 1500
    });
    
    if (copiedContent && copiedContent.trim()) {
      console.log('   ✅ 主页面剪贴板Hook捕获成功');
      return {
        success: true,
        content: copiedContent,
        contentLength: copiedContent.length,
        method: 'main_page_clipboard_hook'
      };
    } else {
      return {
        success: false,
        error: '主页面剪贴板Hook未捕获到有效内容',
        method: 'main_page_clipboard_hook'
      };
    }
    
  } catch (error) {
    console.log(`   ❌ 主页面剪贴板Hook捕获失败: ${error.message}`);
    return {
      success: false,
      error: error.message,
      method: 'main_page_clipboard_hook'
    };
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testClipboardHookMechanism().catch(console.error);
}

module.exports = {
  testClipboardHookMechanism
};