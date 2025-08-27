/**
 * 剪切板权限测试
 * 测试拖拽选区服务的剪切板权限检查和处理功能
 */

const DragSelectionService = require('../src/services/dragSelectionService');
const logger = require('../src/utils/logger');

/**
 * 模拟Playwright页面对象
 */
class MockPage {
  constructor(options = {}) {
    this.hasPermissionsAPI = options.hasPermissionsAPI !== false;
    this.permissionState = options.permissionState || 'granted';
    this.clipboardReadWorks = options.clipboardReadWorks !== false;
    this.execCommandWorks = options.execCommandWorks !== false;
  }

  async evaluate(fn) {
    // 模拟浏览器环境执行
    const mockNavigator = {
      permissions: this.hasPermissionsAPI ? {
        query: async ({ name }) => {
          if (name === 'clipboard-read') {
            return { state: this.permissionState };
          }
          throw new Error('Unknown permission');
        }
      } : null,
      clipboard: {
        readText: async () => {
          if (this.clipboardReadWorks) {
            return '模拟剪切板内容：张三\n前端开发工程师\n5年经验';
          }
          throw new Error('Clipboard access denied');
        }
      }
    };

    const mockDocument = {
      createElement: (tag) => {
        const element = {
          style: {},
          focus: () => {},
          value: '',
          textContent: '',
          innerText: '',
          contentEditable: false,
          dispatchEvent: () => true
        };
        
        if (tag === 'textarea') {
          element.value = this.execCommandWorks ? '通过execCommand获取的内容' : '';
        } else if (tag === 'div') {
          element.textContent = this.execCommandWorks ? '通过contenteditable获取的内容' : '';
          element.innerText = this.execCommandWorks ? '通过contenteditable获取的内容' : '';
        }
        
        return element;
      },
      body: {
        appendChild: () => {},
        removeChild: () => {}
      },
      execCommand: (command) => {
        return command === 'paste' && this.execCommandWorks;
      }
    };

    const mockConsole = {
      warn: (msg, error) => console.warn(msg, error),
      log: (msg) => console.log(msg)
    };

    // 创建模拟的全局环境
    const mockGlobals = {
      navigator: mockNavigator,
      document: mockDocument,
      console: mockConsole,
      ClipboardEvent: class ClipboardEvent {
        constructor(type, options) {
          this.type = type;
          this.bubbles = options?.bubbles || false;
          this.cancelable = options?.cancelable || false;
        }
      },
      Promise,
      setTimeout
    };

    // 将模拟的全局变量绑定到函数执行上下文
    const fnString = fn.toString();
    const wrappedFn = new Function(
      'navigator', 'document', 'console', 'ClipboardEvent', 'Promise', 'setTimeout',
      `return (${fnString}).call(this);`
    );

    // 执行函数并返回结果
    return await wrappedFn.call(
      mockGlobals,
      mockNavigator,
      mockDocument,
      mockConsole,
      mockGlobals.ClipboardEvent,
      Promise,
      setTimeout
    );
  }

  async waitForTimeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 测试剪切板权限检查功能
 */
async function testClipboardPermissionCheck() {
  console.log('\n=== 测试剪切板权限检查功能 ===');
  
  try {
    const service = new DragSelectionService();
    await service.initialize();
    
    // 测试场景1: 权限已授予
    console.log('\n场景1: 权限已授予');
    const mockPage1 = new MockPage({
      hasPermissionsAPI: true,
      permissionState: 'granted',
      clipboardReadWorks: true
    });
    
    const hasPermission1 = await service.checkAndRequestClipboardPermission(mockPage1);
    console.log(`权限检查结果: ${hasPermission1}`);
    
    if (hasPermission1) {
      console.log('✅ 权限已授予场景测试通过');
    } else {
      console.log('❌ 权限已授予场景测试失败');
      return false;
    }
    
    // 测试场景2: 权限被拒绝
    console.log('\n场景2: 权限被拒绝');
    const mockPage2 = new MockPage({
      hasPermissionsAPI: true,
      permissionState: 'denied',
      clipboardReadWorks: false
    });
    
    const hasPermission2 = await service.checkAndRequestClipboardPermission(mockPage2);
    console.log(`权限检查结果: ${hasPermission2}`);
    
    if (!hasPermission2) {
      console.log('✅ 权限被拒绝场景测试通过');
    } else {
      console.log('❌ 权限被拒绝场景测试失败');
      return false;
    }
    
    // 测试场景3: 不支持Permissions API
    console.log('\n场景3: 不支持Permissions API');
    const mockPage3 = new MockPage({
      hasPermissionsAPI: false,
      clipboardReadWorks: false
    });
    
    const hasPermission3 = await service.checkAndRequestClipboardPermission(mockPage3);
    console.log(`权限检查结果: ${hasPermission3}`);
    
    if (!hasPermission3) {
      console.log('✅ 不支持Permissions API场景测试通过');
    } else {
      console.log('❌ 不支持Permissions API场景测试失败');
      return false;
    }
    
    console.log('\n✅ 剪切板权限检查功能测试通过');
    return true;
    
  } catch (error) {
    console.error('剪切板权限检查测试失败:', error);
    return false;
  }
}

/**
 * 测试多种剪切板读取方法
 */
async function testClipboardReadMethods() {
  console.log('\n=== 测试多种剪切板读取方法 ===');
  
  try {
    const service = new DragSelectionService();
    await service.initialize();
    
    // 创建模拟页面对象
    const mockPage = new MockPage({
      hasPermissionsAPI: true,
      permissionState: 'granted',
      clipboardReadWorks: true,
      execCommandWorks: true
    });
    
    // 模拟copySelectedContent方法的核心逻辑
    const testCopyContent = async () => {
      let copiedText = '';
      
      try {
        // 方法1: 使用navigator.clipboard API
        copiedText = await mockPage.evaluate(async () => {
          try {
            if (navigator.permissions) {
              const permission = await navigator.permissions.query({ name: 'clipboard-read' });
              if (permission.state === 'denied') {
                throw new Error('剪切板权限被拒绝');
              }
            }
            
            return await navigator.clipboard.readText();
          } catch (error) {
            console.warn('Clipboard API读取失败:', error);
            return '';
          }
        });
        
        if (copiedText) {
          console.log('✅ 方法1 (Clipboard API) 成功:', copiedText.substring(0, 50) + '...');
          return copiedText;
        }
      } catch (error) {
        console.warn('方法1失败:', error.message);
      }
      
      // 方法2: 创建临时输入框并粘贴
      if (!copiedText) {
        try {
          copiedText = await mockPage.evaluate(async () => {
            const textarea = document.createElement('textarea');
            textarea.style.position = 'fixed';
            textarea.style.top = '0';
            textarea.style.left = '0';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            
            const success = document.execCommand('paste');
            const text = success ? textarea.value : '';
            
            document.body.removeChild(textarea);
            return text;
          });
          
          if (copiedText) {
            console.log('✅ 方法2 (execCommand) 成功:', copiedText);
            return copiedText;
          }
        } catch (error) {
          console.warn('方法2失败:', error.message);
        }
      }
      
      // 方法3: 创建contenteditable元素并粘贴
      if (!copiedText) {
        try {
          copiedText = await mockPage.evaluate(async () => {
            const div = document.createElement('div');
            div.contentEditable = true;
            div.style.position = 'fixed';
            div.style.top = '0';
            div.style.left = '0';
            div.style.opacity = '0';
            div.style.pointerEvents = 'none';
            document.body.appendChild(div);
            
            div.focus();
            
            const pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true
            });
            
            div.dispatchEvent(pasteEvent);
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const text = div.textContent || div.innerText || '';
            document.body.removeChild(div);
            return text;
          });
          
          if (copiedText) {
            console.log('✅ 方法3 (contenteditable) 成功:', copiedText);
            return copiedText;
          }
        } catch (error) {
          console.warn('方法3失败:', error.message);
        }
      }
      
      if (!copiedText) {
        throw new Error('所有剪切板读取方法都失败了');
      }
      
      return copiedText;
    };
    
    const result = await testCopyContent();
    
    if (result && result.length > 0) {
      console.log('\n✅ 多种剪切板读取方法测试通过');
      return true;
    } else {
      console.log('\n❌ 多种剪切板读取方法测试失败');
      return false;
    }
    
  } catch (error) {
    console.error('剪切板读取方法测试失败:', error);
    return false;
  }
}

/**
 * 测试权限不足时的降级处理
 */
async function testPermissionFallback() {
  console.log('\n=== 测试权限不足时的降级处理 ===');
  
  try {
    const service = new DragSelectionService();
    await service.initialize();
    
    // 模拟权限不足的情况
    const mockPage = new MockPage({
      hasPermissionsAPI: true,
      permissionState: 'denied',
      clipboardReadWorks: false,
      execCommandWorks: true // 但execCommand仍然可用
    });
    
    // 检查权限
    const hasPermission = await service.checkAndRequestClipboardPermission(mockPage);
    console.log(`权限检查结果: ${hasPermission}`);
    
    if (!hasPermission) {
      console.log('✅ 正确检测到权限不足');
      
      // 即使权限不足，备用方法仍应可用
      const fallbackResult = await mockPage.evaluate(() => {
        const textarea = document.createElement('textarea');
        document.body.appendChild(textarea);
        textarea.focus();
        const success = document.execCommand('paste');
        const text = success ? textarea.value : '';
        document.body.removeChild(textarea);
        return text;
      });
      
      if (fallbackResult) {
        console.log('✅ 备用方法可用:', fallbackResult);
        console.log('\n✅ 权限不足时的降级处理测试通过');
        return true;
      } else {
        console.log('❌ 备用方法也失败');
        return false;
      }
    } else {
      console.log('❌ 权限检测结果不符合预期');
      return false;
    }
    
  } catch (error) {
    console.error('权限降级处理测试失败:', error);
    return false;
  }
}

/**
 * 运行所有测试
 */
async function runTests() {
  console.log('开始剪切板权限测试...');
  console.log('测试范围: 权限检查 + 多种读取方法 + 降级处理');
  
  const results = [];
  
  // 运行各项测试
  results.push(await testClipboardPermissionCheck());
  results.push(await testClipboardReadMethods());
  results.push(await testPermissionFallback());
  
  // 统计结果
  const passedTests = results.filter(result => result === true).length;
  const totalTests = results.length;
  const successRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  console.log('\n=== 测试结果汇总 ===');
  console.log(`通过测试: ${passedTests}/${totalTests}`);
  console.log(`成功率: ${successRate}%`);
  
  if (passedTests === totalTests) {
    console.log('🎉 所有测试通过！剪切板权限功能正常');
  } else {
    console.log('❌ 部分测试失败，需要检查剪切板权限实现');
  }
  
  console.log('\n测试完成');
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  runTests,
  testClipboardPermissionCheck,
  testClipboardReadMethods,
  testPermissionFallback
};