const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs-extra');
const PopupHandler = require('./src/services/popupHandler');

// 模拟Socket.IO事件发射器
class MockSocket {
  constructor() {
    this.events = [];
  }
  
  emit(event, data) {
    this.events.push({ event, data });
    console.log(`[Socket] ${event}:`, data);
  }
}

// 测试弹窗处理功能
async function testPopupHandler() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const socket = new MockSocket();
  
  // 创建测试页面，包含各种弹窗
  const testHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>弹窗测试页面</title>
      <style>
        .modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          padding: 20px;
          border-radius: 8px;
          position: relative;
        }
        .close-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          cursor: pointer;
          font-size: 20px;
        }
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #4CAF50;
          color: white;
          padding: 15px;
          border-radius: 5px;
          z-index: 1001;
        }
        .ad-banner {
          position: fixed;
          bottom: 20px;
          left: 20px;
          background: #ff9800;
          color: white;
          padding: 10px;
          border-radius: 5px;
          z-index: 1002;
        }
        .confirm-dialog {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: white;
          padding: 20px;
          border: 1px solid #ccc;
          border-radius: 8px;
          z-index: 1003;
        }
        .btn {
          margin: 5px;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .btn-primary { background: #007bff; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        .btn-danger { background: #dc3545; color: white; }
      </style>
    </head>
    <body>
      <h1>弹窗处理测试页面</h1>
      <p>这个页面包含各种类型的弹窗，用于测试弹窗处理算法。</p>
      
      <button onclick="showModal()" class="btn btn-primary">显示模态框</button>
      <button onclick="showNotification()" class="btn btn-secondary">显示通知</button>
      <button onclick="showAdBanner()" class="btn btn-danger">显示广告横幅</button>
      <button onclick="showConfirmDialog()" class="btn btn-primary">显示确认对话框</button>
      
      <div id="modal" class="modal" style="display: none;">
        <div class="modal-content">
          <span class="close-btn" onclick="closeModal()">&times;</span>
          <h3>模态框弹窗</h3>
          <p>这是一个模态框弹窗，测试关闭功能。</p>
          <button onclick="closeModal()" class="btn btn-primary">关闭</button>
        </div>
      </div>
      
      <div id="notification" class="notification" style="display: none;">
        <span class="close-btn" onclick="closeNotification()">&times;</span>
        <h4>通知消息</h4>
        <p>这是一个通知弹窗。</p>
      </div>
      
      <div id="ad-banner" class="ad-banner" style="display: none;">
        <span class="close-btn" onclick="closeAdBanner()">&times;</span>
        <h4>广告横幅</h4>
        <p>这是一个广告横幅弹窗。</p>
      </div>
      
      <div id="confirm-dialog" class="confirm-dialog" style="display: none;">
        <h3>确认对话框</h3>
        <p>您确定要执行此操作吗？</p>
        <button onclick="confirmAction()" class="btn btn-primary">确定</button>
        <button onclick="cancelAction()" class="btn btn-secondary">取消</button>
      </div>
      
      <script>
        function showModal() {
          document.getElementById('modal').style.display = 'flex';
        }
        
        function closeModal() {
          document.getElementById('modal').style.display = 'none';
        }
        
        function showNotification() {
          document.getElementById('notification').style.display = 'block';
        }
        
        function closeNotification() {
          document.getElementById('notification').style.display = 'none';
        }
        
        function showAdBanner() {
          document.getElementById('ad-banner').style.display = 'block';
        }
        
        function closeAdBanner() {
          document.getElementById('ad-banner').style.display = 'none';
        }
        
        function showConfirmDialog() {
          document.getElementById('confirm-dialog').style.display = 'block';
        }
        
        function confirmAction() {
          document.getElementById('confirm-dialog').style.display = 'none';
          alert('操作已确认！');
        }
        
        function cancelAction() {
          document.getElementById('confirm-dialog').style.display = 'none';
        }
        
        // 自动显示一些弹窗
        setTimeout(() => {
          showModal();
        }, 1000);
        
        setTimeout(() => {
          showNotification();
        }, 2000);
        
        setTimeout(() => {
          showAdBanner();
        }, 3000);
      </script>
    </body>
    </html>
  `;
  
  // 设置页面内容
  await page.setContent(testHTML);
  
  // 等待页面加载
  await page.waitForLoadState('domcontentloaded');
  
  console.log('测试页面已加载，开始测试弹窗处理...');
  
  // 创建弹窗处理器实例
  const popupHandler = new PopupHandler(page);
  
  // 测试弹窗处理
  console.log('\n=== 开始弹窗处理测试 ===');
  
  // 等待弹窗出现
  await page.waitForTimeout(4000);
  
  // 处理弹窗
  const result = await popupHandler.autoHandlePopups(socket, 'test');
  
  console.log('\n=== 弹窗处理结果 ===');
  console.log('处理成功:', result);
  console.log('Socket事件:', socket.events);
  
  // 等待一段时间观察结果
  await page.waitForTimeout(3000);
  
  await browser.close();
  console.log('测试完成');
}

// 运行测试
testPopupHandler().catch(console.error);