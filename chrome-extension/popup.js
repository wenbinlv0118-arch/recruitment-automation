/**
 * 智能复制助手 - 弹出页面脚本
 * 处理用户界面交互和扩展控制
 */

(function() {
  'use strict';
  
  // DOM元素
  let enableToggle, statusBadge, copyBtn, testBtn, copyShortcut;
  let currentSettings = {};
  
  /**
   * 日志函数
   */
  function log(message, ...args) {
    console.log('[智能复制助手-弹窗]', message, ...args);
  }
  
  /**
   * 显示通知
   */
  function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }
  
  /**
   * 更新UI状态
   */
  function updateUI(settings) {
    currentSettings = settings;
    
    // 更新开关状态
    enableToggle.checked = settings.enabled;
    
    // 更新状态徽章
    if (settings.enabled) {
      statusBadge.textContent = '已启用';
      statusBadge.className = 'status-badge status-enabled';
    } else {
      statusBadge.textContent = '已禁用';
      statusBadge.className = 'status-badge status-disabled';
    }
    
    // 更新按钮状态
    copyBtn.disabled = !settings.enabled;
    testBtn.disabled = !settings.enabled;
    
    log('UI状态已更新:', settings);
  }
  
  /**
   * 设置按钮加载状态
   */
  function setButtonLoading(button, loading) {
    const loadingEl = button.querySelector('.loading');
    const textEl = button.querySelector('span:last-child');
    
    if (loading) {
      button.disabled = true;
      loadingEl.style.display = 'block';
      textEl.style.opacity = '0.7';
    } else {
      button.disabled = !currentSettings.enabled;
      loadingEl.style.display = 'none';
      textEl.style.opacity = '1';
    }
  }
  
  /**
   * 获取扩展设置
   */
  async function loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'get-settings'
      });
      
      if (response.success) {
        updateUI(response.settings);
      } else {
        showNotification('加载设置失败', 'error');
      }
    } catch (error) {
      log('加载设置异常:', error);
      showNotification('加载设置异常', 'error');
    }
  }
  
  /**
   * 保存扩展设置
   */
  async function saveSettings(newSettings) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'save-settings',
        settings: newSettings
      });
      
      if (response.success) {
        updateUI(newSettings);
        showNotification('设置已保存');
      } else {
        showNotification('保存设置失败', 'error');
      }
    } catch (error) {
      log('保存设置异常:', error);
      showNotification('保存设置异常', 'error');
    }
  }
  
  /**
   * 切换扩展启用状态
   */
  async function toggleExtension() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'toggle-extension'
      });
      
      if (response.success) {
        currentSettings.enabled = response.enabled;
        updateUI(currentSettings);
        showNotification(response.enabled ? '扩展已启用' : '扩展已禁用');
      } else {
        showNotification('切换状态失败', 'error');
        // 恢复开关状态
        enableToggle.checked = currentSettings.enabled;
      }
    } catch (error) {
      log('切换扩展异常:', error);
      showNotification('切换扩展异常', 'error');
      enableToggle.checked = currentSettings.enabled;
    }
  }
  
  /**
   * 触发复制操作
   */
  async function triggerCopy() {
    if (!currentSettings.enabled) {
      showNotification('扩展未启用', 'error');
      return;
    }
    
    setButtonLoading(copyBtn, true);
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'trigger-copy-from-popup'
      });
      
      if (response && response.success) {
        showNotification('复制成功！');
      } else {
        showNotification('复制失败', 'error');
      }
    } catch (error) {
      log('触发复制异常:', error);
      showNotification('复制操作异常', 'error');
    } finally {
      setButtonLoading(copyBtn, false);
    }
  }
  
  /**
   * 测试扩展功能
   */
  async function testExtension() {
    if (!currentSettings.enabled) {
      showNotification('扩展未启用', 'error');
      return;
    }
    
    setButtonLoading(testBtn, true);
    
    try {
      // 模拟测试流程
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 检查内容脚本是否正常工作
      const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
      if (tab) {
        const response = await chrome.tabs.sendMessage(tab.id, {
          action: 'ping'
        });
        
        if (response) {
          showNotification('功能测试通过！');
        } else {
          showNotification('内容脚本未响应', 'error');
        }
      } else {
        showNotification('无法获取当前标签页', 'error');
      }
    } catch (error) {
      log('测试功能异常:', error);
      showNotification('功能测试失败', 'error');
    } finally {
      setButtonLoading(testBtn, false);
    }
  }
  
  /**
   * 检测操作系统并更新快捷键显示
   */
  function updateShortcutDisplay() {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    copyShortcut.textContent = isMac ? 'Cmd+Shift+C' : 'Ctrl+Shift+C';
  }
  
  /**
   * 初始化事件监听器
   */
  function initEventListeners() {
    // 扩展开关
    enableToggle.addEventListener('change', toggleExtension);
    
    // 复制按钮
    copyBtn.addEventListener('click', triggerCopy);
    
    // 测试按钮
    testBtn.addEventListener('click', testExtension);
    
    // 键盘快捷键
    document.addEventListener('keydown', (event) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifierKey = isMac ? event.metaKey : event.ctrlKey;
      
      if (modifierKey && event.shiftKey && event.code === 'KeyC') {
        event.preventDefault();
        triggerCopy();
      }
    });
    
    log('事件监听器已初始化');
  }
  
  /**
   * 初始化弹出页面
   */
  async function initPopup() {
    log('弹出页面初始化开始...');
    
    // 获取DOM元素
    enableToggle = document.getElementById('enableToggle');
    statusBadge = document.getElementById('statusBadge');
    copyBtn = document.getElementById('copyBtn');
    testBtn = document.getElementById('testBtn');
    copyShortcut = document.getElementById('copyShortcut');
    
    // 更新快捷键显示
    updateShortcutDisplay();
    
    // 初始化事件监听器
    initEventListeners();
    
    // 加载设置
    await loadSettings();
    
    log('✅ 弹出页面初始化完成');
  }
  
  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPopup);
  } else {
    initPopup();
  }
  
})();