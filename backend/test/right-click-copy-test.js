/**
 * 右键复制功能测试
 * 测试拖拽选区后在结束位置右键点击复制按钮的新功能
 */

const { chromium } = require('playwright');
const DragSelectionService = require('../src/services/dragSelectionService');
const logger = require('../src/utils/logger');

/**
 * 测试新的右键复制功能
 */
async function testRightClickCopyFunction() {
  console.log('=== 测试新的右键复制功能（第一优先级）===\n');
  
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
    
    // 3. 创建测试页面
    console.log('3. 创建模拟Boss直聘右键菜单测试页面...');
    await createRightClickTestPage(page);
    
    // 4. 测试右键复制功能
    console.log('4. 测试新的右键复制功能...');
    
    const result = await dragSelectionService.copyResumeByHook(page, {
      frameSelector: '/web/frame/c-resume/?source=search',
      canvasSelector: 'canvas#resume',
      margin: 10,
      dragSteps: 20,
      waitTime: 2000
    });
    
    if (result && result.trim()) {
      console.log('✅ 右键复制功能测试成功！');
      console.log(`📄 捕获内容长度: ${result.length} 字符`);
      console.log(`📝 内容预览: ${result.substring(0, 200)}...`);
      
      // 检查是否使用了右键复制功能
      const hasRightClickContent = /李四|高级前端工程师|字节跳动/.test(result);
      console.log(`🖱️ 右键复制功能: ${hasRightClickContent ? '✅ 成功使用' : '❌ 未使用'}`);
      
      return { success: true, content: result, rightClickUsed: hasRightClickContent };
    } else {
      console.log('❌ 右键复制功能测试失败');
      return { success: false, error: '未获取到有效内容' };
    }
    
  } catch (error) {
    console.error('测试执行过程中发生错误:', error);
    return { success: false, error: error.message };
  } finally {
    console.log('\n🔍 浏览器保持打开状态，可手动验证右键复制功能...');
    console.log('请在Canvas上手动拖拽选区，然后在结束位置右键点击复制按钮');
  }
}

/**
 * 创建带右键菜单的测试页面
 */
async function createRightClickTestPage(page) {
  const iframeContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Boss直聘右键复制测试</title>
        <style>
            body { margin: 0; padding: 20px; background: #f5f5f5; font-family: Arial, sans-serif; }
            #resume { 
                border: 2px solid #007ACC; 
                cursor: text;
                user-select: none;
                background: white;
                display: block;
            }
            .context-menu {
                position: absolute;
                background: white;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                padding: 8px 0;
                min-width: 120px;
                z-index: 9999;
                display: none;
                font-size: 14px;
            }
            .context-menu-item {
                padding: 8px 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                color: #333;
                border: none;
                background: none;
                width: 100%;
                text-align: left;
            }
            .context-menu-item:hover {
                background: #f0f0f0;
            }
        </style>
    </head>
    <body>
        <canvas id="resume" width="800" height="600">Canvas不支持</canvas>
        
        <!-- 右键菜单 -->
        <div class="context-menu" id="contextMenu">
            <button class="context-menu-item" id="copyBtn">
                📋 复制
            </button>
            <button class="context-menu-item">
                ✂️ 剪切
            </button>
        </div>
        
        <script>
            const canvas = document.getElementById('resume');
            const contextMenu = document.getElementById('contextMenu');
            const copyBtn = document.getElementById('copyBtn');
            
            const resumeData = \`李四
高级前端工程师 | 8年经验 | 硕士学位

联系方式:
电话: 186****8888  
邮箱: lisi@example.com
期望薪资: 30-45K
工作地点: 北京市

工作经历:
2020.03-至今 字节跳动 高级前端工程师/技术专家
• 负责今日头条前端架构升级，支撑日活2亿+用户
• 主导React项目重构，首屏渲染速度提升50%

2017.06-2020.02 阿里巴巴 前端开发工程师  
• 参与淘宝商品详情页前端开发，月PV超10亿
• 负责前端性能优化，页面加载速度提升40%

教育经历:
2013-2015 清华大学 计算机技术 硕士
2009-2013 北京理工大学 软件工程 本科

专业技能:
JavaScript、TypeScript、React、Vue、Node.js、Webpack\`;
            
            // 监听右键点击
            canvas.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                contextMenu.style.display = 'block';
                contextMenu.style.left = e.pageX + 'px';
                contextMenu.style.top = e.pageY + 'px';
                console.log('🖱️ 右键菜单显示');
            });
            
            // 复制按钮点击事件
            copyBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                contextMenu.style.display = 'none';
                
                // 写入剪贴板
                setTimeout(() => {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(resumeData).then(() => {
                            console.log('🎯 通过右键复制将简历数据写入剪贴板，长度:', resumeData.length);
                        });
                    }
                }, 100);
            });
            
            // 点击其他地方隐藏菜单
            document.addEventListener('click', function(e) {
                if (!contextMenu.contains(e.target)) {
                    contextMenu.style.display = 'none';
                }
            });
            
            // 绘制Canvas内容
            document.addEventListener('DOMContentLoaded', function() {
                const ctx = canvas.getContext('2d');
                ctx.font = '16px Arial';
                ctx.fillStyle = '#333';
                
                const lines = [
                    '李四',
                    '高级前端工程师 | 8年经验 | 硕士学位',
                    '',
                    '📞 186****8888    📧 lisi@example.com',
                    '💰 期望薪资: 30-45K    📍 北京市',
                    '',
                    '🏢 工作经历:',
                    '2020.03-至今 字节跳动 高级前端工程师',
                    '• 今日头条前端架构升级，日活2亿+',
                    '• React项目重构，首屏速度提升50%',
                    '',
                    '🎓 教育经历:',
                    '2013-2015 清华大学 计算机技术 硕士',
                    '💻 核心技能: JavaScript、React、Vue'
                ];
                
                lines.forEach((line, i) => {
                    ctx.fillText(line, 30, 40 + i * 28);
                });
            });
        <\/script>
    </body>
    </html>
  `;
  
  const mainHTML = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>右键复制功能测试</title>
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
                overflow: hidden;
            }
            iframe { width: 100%; height: 100%; border: none; }
            .feature-info {
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
                <h1>🎯 右键复制功能测试</h1>
                <p>测试拖拽选区结束位置右键点击复制按钮的新功能</p>
            </div>
            
            <div class="feature-info">
                <h3>🚀 新增第一优先级功能:</h3>
                <ul>
                    <li>✅ 拖拽选区从左上角到右下角</li>
                    <li>✅ 在拖拽结束位置（右下角）右键点击</li>
                    <li>✅ 自动识别和点击"复制"按钮</li>
                    <li>✅ 设置为第一优先级，成功后跳过其他方法</li>
                </ul>
            </div>
            
            <div class="iframe-container">
                <iframe src="data:text/html;charset=utf-8,${encodeURIComponent(iframeContent)}"></iframe>
            </div>
        </div>
    </body>
    </html>
  `;
  
  await page.setContent(mainHTML);
  await page.waitForTimeout(3000);
  console.log('   ✓ 右键复制测试页面创建完成');
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  console.log('🚀 启动右键复制功能测试...\n');
  console.log('💡 本测试验证新的第一优先级功能：');
  console.log('   - 拖拽选区后在结束位置右键点击');
  console.log('   - 自动查找并点击复制按钮');
  console.log('   - 捕获Boss直聘写入的简历内容\n');
  
  testRightClickCopyFunction().catch(console.error);
}

module.exports = {
  testRightClickCopyFunction
};