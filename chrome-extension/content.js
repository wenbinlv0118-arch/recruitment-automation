/**
 * 智能复制助手 - 内容脚本
 * 监听快捷键和按钮点击，执行可信的复制操作
 */

(function() {
  'use strict';
  
  // 扩展状态
  let isEnabled = true;
  let debugMode = false;
  
  // 日志函数
  function log(message, ...args) {
    if (debugMode) {
      console.log('[智能复制助手]', message, ...args);
    }
  }
  
  /**
   * 执行智能复制操作
   */
  function performSmartCopy() {
    if (!isEnabled) {
      log('扩展已禁用，跳过复制操作');
      return false;
    }
    
    try {
      log('开始执行智能复制操作...');
      
      // 方法1: 尝试使用现代剪贴板API
      if (navigator.clipboard && navigator.clipboard.writeText) {
        const selectedText = window.getSelection().toString();
        if (selectedText) {
          navigator.clipboard.writeText(selectedText).then(() => {
            log('✅ 使用Clipboard API复制成功:', selectedText.length + '字符');
            showCopyNotification('复制成功 (Clipboard API)');
          }).catch(err => {
            log('❌ Clipboard API复制失败:', err);
            fallbackCopy();
          });
          return true;
        }
      }
      
      // 方法2: 使用document.execCommand (兜底方案)
      return fallbackCopy();
      
    } catch (error) {
      log('❌ 复制操作异常:', error);
      return false;
    }
  }
  
  /**
   * 兜底复制方案
   */
  function fallbackCopy() {
    try {
      log('使用document.execCommand兜底复制...');
      
      // 确保有选中的内容
      const selection = window.getSelection();
      if (!selection.toString()) {
        // 如果没有选中内容，尝试全选
        document.execCommand('selectAll');
        log('执行全选操作');
      }
      
      // 执行复制命令
      const success = document.execCommand('copy');
      
      if (success) {
        const copiedText = selection.toString();
        log('✅ document.execCommand复制成功:', copiedText.length + '字符');
        showCopyNotification('复制成功 (execCommand)');
        return true;
      } else {
        log('❌ document.execCommand复制失败');
        showCopyNotification('复制失败', 'error');
        return false;
      }
      
    } catch (error) {
      log('❌ document.execCommand异常:', error);
      showCopyNotification('复制异常', 'error');
      return false;
    }
  }
  
  /**
   * 显示复制通知
   */
  function showCopyNotification(message, type = 'success') {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 999999;
      padding: 12px 20px;
      border-radius: 6px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.3s ease;
      background-color: ${type === 'error' ? '#f56565' : '#48bb78'};
    `;
    notification.textContent = message;
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          notification.remove();
        }, 300);
      }
    }, 3000);
  }
  
  /**
   * 键盘事件监听器
   */
  function handleKeydown(event) {
    // 检测Command+Shift+C (Mac) 或 Ctrl+Shift+C (Windows/Linux)
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifierKey = isMac ? event.metaKey : event.ctrlKey;
    
    if (modifierKey && event.shiftKey && event.code === 'KeyC') {
      event.preventDefault();
      event.stopPropagation();
      log('检测到快捷键触发:', isMac ? 'Cmd+Shift+C' : 'Ctrl+Shift+C');
      performSmartCopy();
    }
    
    // 也监听原生的Command+C，在失败时提供备选方案
    if (modifierKey && event.code === 'KeyC' && !event.shiftKey) {
      // 延迟检查复制是否成功
      setTimeout(() => {
        // 这里可以添加检查逻辑，如果原生复制失败，提供备选方案
        log('检测到原生复制快捷键');
      }, 100);
    }
  }
  
  /**
   * 创建复制按钮
   */
  function createCopyButton() {
    const button = document.createElement('button');
    button.id = 'smart-copy-button';
    button.innerHTML = '📋';
    button.title = '智能复制 (Cmd/Ctrl+Shift+C)';
    button.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 999999;
      width: 50px;
      height: 50px;
      border: none;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 20px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    
    // 悬停效果
    button.addEventListener('mouseenter', () => {
      button.style.transform = 'scale(1.1)';
      button.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.transform = 'scale(1)';
      button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    });
    
    // 点击事件
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      log('复制按钮被点击');
      performSmartCopy();
    });
    
    return button;
  }
  
  /**
   * 初始化扩展
   */
  function initExtension() {
    log('智能复制助手初始化开始...');
    
    // 添加键盘监听
    document.addEventListener('keydown', handleKeydown, true);
    
    // 创建复制按钮
    const copyButton = createCopyButton();
    document.body.appendChild(copyButton);
    
    // 监听来自后台脚本的消息
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      switch (request.action) {
        case 'toggle-extension':
          isEnabled = request.enabled;
          copyButton.style.display = isEnabled ? 'flex' : 'none';
          log('扩展状态切换:', isEnabled ? '启用' : '禁用');
          sendResponse({success: true, enabled: isEnabled});
          break;
          
        case 'toggle-debug':
          debugMode = request.debug;
          log('调试模式切换:', debugMode ? '开启' : '关闭');
          sendResponse({success: true, debug: debugMode});
          break;
          
        case 'trigger-copy':
          const result = performSmartCopy();
          sendResponse({success: result});
          break;
          
        default:
          sendResponse({success: false, error: '未知操作'});
      }
    });
    
    log('✅ 智能复制助手初始化完成');
  }
  
  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initExtension);
  } else {
    initExtension();
  }
  
})();