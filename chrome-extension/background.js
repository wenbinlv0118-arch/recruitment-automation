/**
 * 智能复制助手 - 后台脚本
 * 处理扩展的全局逻辑、快捷键命令和存储管理
 */

// 扩展默认设置
const DEFAULT_SETTINGS = {
  enabled: true,
  debugMode: false,
  showButton: true,
  autoSelect: true
};

/**
 * 日志函数
 */
function log(message, ...args) {
  console.log('[智能复制助手-后台]', message, ...args);
}

/**
 * 获取扩展设置
 */
async function getSettings() {
  try {
    const result = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    return result;
  } catch (error) {
    log('获取设置失败:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * 保存扩展设置
 */
async function saveSettings(settings) {
  try {
    await chrome.storage.sync.set(settings);
    log('设置已保存:', settings);
    return true;
  } catch (error) {
    log('保存设置失败:', error);
    return false;
  }
}

/**
 * 向当前活动标签页发送消息
 */
async function sendMessageToActiveTab(message) {
  try {
    const [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    if (tab) {
      const response = await chrome.tabs.sendMessage(tab.id, message);
      return response;
    }
  } catch (error) {
    log('发送消息到标签页失败:', error);
    return {success: false, error: error.message};
  }
}

/**
 * 处理快捷键命令
 */
chrome.commands.onCommand.addListener(async (command) => {
  log('收到快捷键命令:', command);
  
  switch (command) {
    case 'trigger-copy':
      const settings = await getSettings();
      if (settings.enabled) {
        const response = await sendMessageToActiveTab({
          action: 'trigger-copy'
        });
        log('复制命令执行结果:', response);
      } else {
        log('扩展已禁用，忽略快捷键');
      }
      break;
      
    default:
      log('未知命令:', command);
  }
});

/**
 * 处理来自popup或content script的消息
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  log('收到消息:', request, '来自:', sender);
  
  (async () => {
    try {
      switch (request.action) {
        case 'get-settings':
          const settings = await getSettings();
          sendResponse({success: true, settings});
          break;
          
        case 'save-settings':
          const saved = await saveSettings(request.settings);
          if (saved) {
            // 通知所有标签页更新设置
            const tabs = await chrome.tabs.query({});
            for (const tab of tabs) {
              try {
                await chrome.tabs.sendMessage(tab.id, {
                  action: 'settings-updated',
                  settings: request.settings
                });
              } catch (error) {
                // 忽略无法发送消息的标签页
              }
            }
          }
          sendResponse({success: saved});
          break;
          
        case 'toggle-extension':
          const currentSettings = await getSettings();
          const newSettings = {
            ...currentSettings,
            enabled: !currentSettings.enabled
          };
          const toggleSaved = await saveSettings(newSettings);
          
          if (toggleSaved) {
            // 通知当前标签页
            const response = await sendMessageToActiveTab({
              action: 'toggle-extension',
              enabled: newSettings.enabled
            });
            sendResponse({success: true, enabled: newSettings.enabled, response});
          } else {
            sendResponse({success: false, error: '保存设置失败'});
          }
          break;
          
        case 'trigger-copy-from-popup':
          const copyResponse = await sendMessageToActiveTab({
            action: 'trigger-copy'
          });
          sendResponse(copyResponse);
          break;
          
        default:
          sendResponse({success: false, error: '未知操作'});
      }
    } catch (error) {
      log('处理消息异常:', error);
      sendResponse({success: false, error: error.message});
    }
  })();
  
  // 返回true表示异步响应
  return true;
});

/**
 * 扩展安装或更新时的处理
 */
chrome.runtime.onInstalled.addListener(async (details) => {
  log('扩展安装/更新:', details);
  
  if (details.reason === 'install') {
    // 首次安装，初始化默认设置
    await saveSettings(DEFAULT_SETTINGS);
    log('✅ 扩展首次安装，已初始化默认设置');
    
    // 可以在这里打开欢迎页面
    // chrome.tabs.create({url: 'welcome.html'});
    
  } else if (details.reason === 'update') {
    // 扩展更新，检查设置兼容性
    const currentSettings = await getSettings();
    const updatedSettings = {...DEFAULT_SETTINGS, ...currentSettings};
    await saveSettings(updatedSettings);
    log('✅ 扩展已更新，设置已同步');
  }
});

/**
 * 扩展启动时的处理
 */
chrome.runtime.onStartup.addListener(() => {
  log('✅ 智能复制助手后台脚本已启动');
});

// 初始化日志
log('✅ 智能复制助手后台脚本已加载');