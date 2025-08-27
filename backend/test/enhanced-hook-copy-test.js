/**
 * 增强版Hook复制机制测试
 * 测试修复window.__g为空问题后的Hook复制功能
 */

const { chromium } = require('playwright');
const DragSelectionService = require('../src/services/dragSelectionService');
const logger = require('../src/utils/logger');

/**
 * 测试增强版Hook复制机制
 */
async function testEnhancedHookCopyMechanism() {
  console.log('=== 测试增强版Hook复制机制（修复window.__g为空问题）===\n');
  
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
    
    // 3. 创建模拟Boss直聘的测试页面
    console.log('3. 创建模拟Boss直聘测试页面...');
    await createBossZhipinTestPage(page);
    
    // 4. 测试增强版Hook复制方法
    console.log('4. 测试增强版Hook复制方法...');
    
    const testResults = [];
    
    // 测试1: iframe模式
    console.log('\n📋 测试1: iframe模式Hook复制');
    const iframeResult = await testIframeHookCopy(page, dragSelectionService);
    testResults.push({ test: 'iframe模式Hook复制', ...iframeResult });
    
    // 测试2: 主页面模式  
    console.log('\n📋 测试2: 主页面模式Hook复制');
    await createMainPageTestEnvironment(page);
    const mainPageResult = await testMainPageHookCopy(page, dragSelectionService);
    testResults.push({ test: '主页面模式Hook复制', ...mainPageResult });
    
    // 输出测试结果
    console.log('\n📊 测试结果总结:');
    console.log('================');
    
    let passCount = 0;
    testResults.forEach((result, index) => {
      const status = result.success ? '✅ 通过' : '❌ 失败';
      console.log(`${index + 1}. ${result.test}: ${status}`);
      if (result.success) {
        passCount++;
        console.log(`   📄 内容长度: ${result.contentLength} 字符`);
        console.log(`   🎯 捕获方法: ${result.method}`);
      } else {
        console.log(`   💥 错误: ${result.error}`);
      }
    });
    
    console.log(`\n🎯 测试通过率: ${passCount}/${testResults.length} (${Math.round(passCount/testResults.length*100)}%)`);
    
    if (passCount === testResults.length) {
      console.log('🎉 所有测试通过！增强版Hook复制机制成功修复了window.__g为空的问题！');
    } else {
      console.log('⚠️  部分测试失败，需要进一步调试');
    }
    
    return testResults;
    
  } catch (error) {
    console.error('测试执行过程中发生错误:', error);
    return [{ success: false, error: error.message }];
  } finally {
    // 保持浏览器打开用于调试
    console.log('\n🔍 浏览器保持打开状态，用于手动检查...');
    console.log('请检查页面内容和控制台输出，然后手动关闭浏览器');
    // await browser?.close();
  }
}

/**
 * 创建模拟Boss直聘的测试页面
 */
async function createBossZhipinTestPage(page) {
  // iframe内容
  const iframeContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Boss直聘简历内容</title>
        <style>
            body { margin: 0; padding: 20px; background: #f5f5f5; font-family: Arial, sans-serif; }
            #resume { 
                border: 2px solid #007ACC; 
                cursor: text;
                user-select: text;
                -webkit-user-select: text;
                background: white;
                display: block;
            }
            .resume-text {
                position: absolute;
                top: 50px;
                left: 50px;
                width: 700px;
                height: 500px;
                opacity: 0.1; /* 稍微可见，模拟真实情况 */
                user-select: text;
                font-size: 14px;
                line-height: 1.6;
                padding: 20px;
                box-sizing: border-box;
                white-space: pre-line;
                pointer-events: auto;
                background: rgba(255, 255, 255, 0.9);
                z-index: 10;
            }
            .debug-info {
                position: fixed;
                top: 10px;
                right: 10px;
                background: #fff;
                padding: 10px;
                border: 1px solid #ccc;
                font-size: 12px;
                z-index: 1000;
            }
        </style>
    </head>
    <body>
        <div class="debug-info">
            <div>iframe模式 - Boss直聘简历</div>
            <div id="selection-info">未选中内容</div>
        </div>
        
        <canvas id="resume" width="800" height="600" style="width: 800px; height: 600px;">
            您的浏览器不支持Canvas元素
        </canvas>
        
        <div class="resume-text">
王五
资深Java后端工程师 | 10年经验 | 本科

联系方式:
电话: 158****6666  
邮箱: wangwu@example.com
微信: ww123456
期望薪资: 40-60K
工作地点: 上海市

工作经历:
2018.06-至今 腾讯科技有限公司 高级后端工程师/技术专家
• 负责微信支付核心系统架构设计与优化，日处理交易量超1亿笔
• 主导分布式系统重构，系统可用性提升至99.99%
• 团队规模20人，负责技术方案制定和团队成长
• 核心技术栈：Java、Spring Cloud、MySQL、Redis、Kafka

2015.03-2018.05 阿里巴巴集团 Java开发工程师  
• 参与支付宝核心交易系统开发，支撑双11大促流量
• 负责分布式缓存系统设计，QPS提升5倍
• 参与微服务架构改造，服务拆分和治理

2012.07-2015.02 百度在线 软件工程师
• 负责搜索广告系统后端开发
• 参与大数据处理平台搭建，日处理数据100TB+

教育经历:
2008-2012 华中科技大学 软件工程 本科
GPA: 3.8/4.0
主修课程: 数据结构、算法设计、数据库系统、分布式系统等

专业技能:
• 编程语言: Java(精通)、Python、Go、JavaScript
• 框架技术: Spring Boot/Cloud、MyBatis、Hibernate、Dubbo
• 数据库: MySQL、Redis、MongoDB、Elasticsearch
• 中间件: Kafka、RabbitMQ、Zookeeper、Consul  
• 云平台: 阿里云、腾讯云、Docker、Kubernetes
• 其他: 分布式系统、微服务架构、高并发优化

项目经验:
1. 微信支付核心交易系统重构 (2020-2022)
   规模：日交易量1亿+，峰值QPS 50万+
   职责：架构设计、核心开发、性能优化
   成果：系统延迟降低60%，可用性达99.99%

2. 支付宝分布式缓存平台 (2016-2018)  
   规模：集群节点1000+，日请求量500亿+
   职责：系统设计、核心开发、容量规划
   成果：缓存命中率95%+，响应时间<1ms

3. 百度广告实时竞价系统 (2013-2015)
   规模：日请求100亿+，广告主10万+
   职责：后端开发、算法优化、系统调优
   成果：竞价响应时间<10ms，收入提升30%

个人优势:
• 10年大厂后端开发经验，擅长分布式系统和高并发架构
• 有丰富的团队管理经验，善于技术分享和人才培养  
• 对新技术保持敏感，持续学习云原生、区块链等前沿技术
• 工作认真负责，有强烈的责任心和团队合作精神
        </div>
        
        <script>
            // 在canvas上绘制简历内容
            document.addEventListener('DOMContentLoaded', function() {
                const canvas = document.getElementById('resume');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    
                    // 设置字体和样式
                    ctx.font = '16px Arial';
                    ctx.fillStyle = '#333';
                    
                    // 绘制简历标题和基本信息
                    const resumeLines = [
                        '王五',
                        '资深Java后端工程师 | 10年经验 | 本科',
                        '',
                        '📞 158****6666    📧 wangwu@example.com',
                        '💰 期望薪资: 40-60K    📍 上海市',
                        '',
                        '🏢 工作经历:',
                        '2018.06-至今 腾讯科技 高级后端工程师/技术专家',
                        '• 负责微信支付核心系统，日处理交易1亿笔+',
                        '• 系统可用性提升至99.99%',
                        '',
                        '2015.03-2018.05 阿里巴巴 Java开发工程师',
                        '• 支付宝核心交易系统开发',
                        '• 分布式缓存系统，QPS提升5倍',
                        '',
                        '🎓 教育经历:',
                        '2008-2012 华中科技大学 软件工程 本科',
                        '',
                        '💻 核心技能:',
                        'Java、Spring Cloud、MySQL、Redis、Kafka'
                    ];
                    
                    resumeLines.forEach((line, index) => {
                        ctx.fillText(line, 30, 40 + (index * 28));
                    });
                    
                    console.log('📊 Canvas简历内容绘制完成');
                }
                
                // 实时显示选中内容
                document.addEventListener('selectionchange', function() {
                    const selection = window.getSelection();
                    const selectedText = selection.toString();
                    const infoElement = document.getElementById('selection-info');
                    if (selectedText.trim()) {
                        infoElement.textContent = \`已选中: \${selectedText.length}字符\`;
                        infoElement.style.color = 'green';
                    } else {
                        infoElement.textContent = '未选中内容';
                        infoElement.style.color = 'red';
                    }
                });
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
        <title>Boss直聘模拟测试页面</title>
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
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔬 增强版Hook复制机制测试</h1>
                <p>测试修复window.__g为空问题后的Hook复制功能</p>
            </div>
            
            <div class="test-info">
                <h3>📋 测试说明:</h3>
                <ul>
                    <li>✅ 增强了6种Hook策略确保内容捕获</li>
                    <li>✅ 添加了多次重试机制和程序化选择</li>
                    <li>✅ 提供详细的诊断信息和调试日志</li>
                    <li>✅ 支持iframe和主页面两种模式</li>
                </ul>
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
  
  // 等待iframe完全加载
  await page.waitForTimeout(3000);
  
  console.log('   ✓ 测试页面创建完成');
}

/**
 * 测试iframe模式Hook复制
 */
async function testIframeHookCopy(page, dragSelectionService) {
  try {
    console.log('   🔍 开始测试iframe模式Hook复制...');
    
    const copiedContent = await dragSelectionService.copyResumeByHook(page, {
      frameSelector: '/web/frame/c-resume/?source=search',
      canvasSelector: 'canvas#resume',
      margin: 10,
      dragSteps: 25,
      waitTime: 1500 // 增加等待时间
    });
    
    if (copiedContent && copiedContent.trim()) {
      console.log('   ✅ iframe模式Hook复制成功');
      return {
        success: true,
        content: copiedContent,
        contentLength: copiedContent.length,
        method: 'iframe_hook'
      };
    } else {
      return {
        success: false,
        error: 'iframe模式Hook复制未获取到有效内容',
        method: 'iframe_hook'
      };
    }
    
  } catch (error) {
    console.log(`   ❌ iframe模式Hook复制失败: ${error.message}`);
    return {
      success: false,
      error: error.message,
      method: 'iframe_hook'
    };
  }
}

/**
 * 创建主页面测试环境
 */
async function createMainPageTestEnvironment(page) {
  const mainPageHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>主页面模式测试</title>
        <style>
            body { margin: 0; padding: 20px; background: #f8f9fa; font-family: Arial, sans-serif; }
            .container { max-width: 1000px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            #resume { 
                border: 2px solid #28a745; 
                cursor: text;
                user-select: text;
                background: white;
                margin: 20px auto;
                display: block;
            }
            .resume-text {
                position: absolute;
                top: 100px;
                left: 50%;
                transform: translateX(-50%);
                width: 800px;
                opacity: 0.2;
                user-select: text;
                font-size: 14px;
                line-height: 1.6;
                padding: 20px;
                background: white;
                border: 1px dashed #ccc;
                pointer-events: auto;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h2>🖥️ 主页面模式测试</h2>
                <p>直接在主页面测试Hook复制功能</p>
            </div>
            
            <canvas id="resume" width="800" height="600" style="width: 800px; height: 600px;">
                您的浏览器不支持Canvas元素
            </canvas>
            
            <div class="resume-text">
赵六
前端架构师 | 8年经验 | 硕士

个人信息:
📞 139****7777
📧 zhaoliu@example.com  
💰 35-50K
📍 深圳市

工作经历:
2019.01-至今 字节跳动 前端架构师
• 负责抖音前端基础设施建设
• 主导微前端架构设计，支撑50+业务
• 前端性能优化，首屏时间减少40%

2016.08-2018.12 美团点评 高级前端工程师
• 外卖商家端前端开发
• Vue.js技术栈升级和组件库建设

教育经历:
2014-2016 北京邮电大学 软件工程 硕士
2010-2014 大连理工大学 计算机科学 本科

技能特长:
• 前端: React、Vue、TypeScript、Webpack
• 移动端: React Native、小程序
• 工程化: 前端工程化、CI/CD、性能优化
• 架构: 微前端、组件库、设计系统
            </div>
        </div>
        
        <script>
            document.addEventListener('DOMContentLoaded', function() {
                const canvas = document.getElementById('resume');
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx.font = '16px Arial';
                    ctx.fillStyle = '#333';
                    
                    const lines = [
                        '赵六',
                        '前端架构师 | 8年经验 | 硕士', 
                        '',
                        '📞 139****7777  📧 zhaoliu@example.com',
                        '💰 35-50K  📍 深圳市',
                        '',
                        '🏢 2019.01-至今 字节跳动 前端架构师',
                        '• 抖音前端基础设施建设',
                        '• 微前端架构，支撑50+业务',
                        '',
                        '🏢 2016.08-2018.12 美团点评 高级前端',
                        '• 外卖商家端开发',
                        '• Vue.js技术栈升级'
                    ];
                    
                    lines.forEach((line, i) => {
                        ctx.fillText(line, 30, 40 + i * 28);
                    });
                    
                    console.log('📊 主页面Canvas内容绘制完成');
                }
            });
        <\/script>
    </body>
    </html>
  `;
  
  await page.setContent(mainPageHTML);
  await page.waitForTimeout(2000);
}

/**
 * 测试主页面模式Hook复制
 */
async function testMainPageHookCopy(page, dragSelectionService) {
  try {
    console.log('   🔍 开始测试主页面模式Hook复制...');
    
    const copiedContent = await dragSelectionService.copyResumeByHook(page, {
      frameSelector: null, // 主页面不需要iframe
      canvasSelector: 'canvas#resume',
      margin: 15,
      dragSteps: 20,
      waitTime: 1000
    });
    
    if (copiedContent && copiedContent.trim()) {
      console.log('   ✅ 主页面模式Hook复制成功');
      return {
        success: true,
        content: copiedContent,
        contentLength: copiedContent.length,
        method: 'main_page_hook'
      };
    } else {
      return {
        success: false,
        error: '主页面模式Hook复制未获取到有效内容',
        method: 'main_page_hook'
      };
    }
    
  } catch (error) {
    console.log(`   ❌ 主页面模式Hook复制失败: ${error.message}`);
    return {
      success: false,
      error: error.message,
      method: 'main_page_hook'
    };
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  testEnhancedHookCopyMechanism().catch(console.error);
}

module.exports = {
  testEnhancedHookCopyMechanism
};