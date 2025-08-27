/**
 * 拖拽选区集成测试
 * 测试Boss直聘服务中拖拽选区功能的集成
 */

const BossZhipinService = require('../src/services/bossZhipinService');
const logger = require('../src/utils/logger');

/**
 * 模拟测试拖拽选区功能集成
 */
async function testDragSelectionIntegration() {
  console.log('\n=== 拖拽选区集成测试 ===');
  
  try {
    // 创建Boss直聘服务实例
    const bossService = new BossZhipinService();
    
    // 验证拖拽选区服务是否正确初始化
    if (!bossService.dragSelectionService) {
      throw new Error('拖拽选区服务未正确初始化');
    }
    
    console.log('✓ 拖拽选区服务初始化成功');
    
    // 模拟page对象（用于拖拽选区服务）
    const mockPage = {
      evaluate: async (fn) => {
        // 模拟获取选中文本
        if (fn.toString().includes('getSelection')) {
          return '模拟简历内容：\n姓名：张三\n职位：前端工程师\n经验：3年\n技能：JavaScript, React, Vue';
        }
        return null;
      },
      locator: (selector) => ({
        boundingBox: async () => ({ x: 100, y: 100, width: 800, height: 600 }),
        waitFor: async () => {},
        isVisible: async () => true
      }),
      frameLocator: (selector) => ({
        first: () => ({
          locator: (canvasSelector) => ({
            boundingBox: async () => ({ x: 100, y: 100, width: 800, height: 600 }),
            waitFor: async () => {}
          })
        })
      }),
      mouse: {
        move: async (x, y, options) => console.log(`模拟鼠标移动到 (${x}, ${y})`),
        down: async () => console.log('模拟鼠标按下'),
        up: async () => console.log('模拟鼠标释放')
      },
      keyboard: {
        press: async (key) => console.log(`模拟按键: ${key}`)
      },
      waitForTimeout: async (ms) => console.log(`等待 ${ms}ms`)
    };
    
    // 模拟frame对象（保持向后兼容）
    const mockFrame = {
      evaluate: async (fn) => {
        // 模拟canvas元素存在但传统方法和OCR都失败的情况
        return null;
      },
      locator: (selector) => ({
        boundingBox: async () => ({ x: 100, y: 100, width: 800, height: 600 }),
        isVisible: async () => true
      })
    };
    
    // 测试extractCanvasResumeContent方法中的拖拽选区功能
    console.log('\n测试拖拽选区作为第一优先级识别方式...');
    
    // 模拟拖拽选区服务的copyResumeByDragSelection方法
    bossService.dragSelectionService.copyResumeByDragSelection = async (page, options) => {
      console.log(`执行拖拽选区复制简历`);
      return '模拟拖拽选区获取的简历内容：\n姓名：李四\n职位：后端工程师\n经验：5年\n技能：Node.js, Python, MySQL';
    };
    
    // 模拟传统方法和OCR服务（不应该被调用）
    bossService.canvasOcrService.captureAndRecognizeCanvas = async () => {
      console.log('OCR方法被调用（不应该执行）');
      return 'OCR获取的内容';
    };
    
    // 设置mockPage到bossService中，以便extractCanvasResumeContent可以使用
    bossService.page = mockPage;
    
    // 调用extractCanvasResumeContent方法
    const result = await bossService.extractCanvasResumeContent(mockFrame);
    
    if (result && result.includes('拖拽选区获取')) {
      console.log('✓ 拖拽选区作为第一优先级识别方式测试通过');
      console.log(`获取内容长度: ${result.length} 字符`);
    } else {
      throw new Error('拖拽选区识别失败');
    }
    
    // 测试清理功能
    console.log('\n测试服务清理功能...');
    
    // 模拟拖拽选区服务的cleanup方法
    bossService.dragSelectionService.cleanup = async () => {
      console.log('拖拽选区服务清理完成');
    };
    
    // 模拟OCR服务的destroy方法
    bossService.canvasOcrService.destroy = async () => {
      console.log('OCR服务清理完成');
    };
    
    // 调用closeBrowser方法测试清理逻辑
    await bossService.closeBrowser();
    
    console.log('✓ 服务清理功能测试通过');
    
    return true;
    
  } catch (error) {
    console.error('✗ 拖拽选区集成测试失败:', error.message);
    return false;
  }
}

/**
 * 测试拖拽选区优先级
 */
async function testDragSelectionPriority() {
  console.log('\n=== 拖拽选区优先级测试 ===');
  
  try {
    const bossService = new BossZhipinService();
    
    // 模拟page对象
    const mockPage = {
      evaluate: async (fn) => {
        if (fn.toString().includes('getSelection')) {
          return '拖拽选区获取的内容';
        }
        return null;
      },
      locator: (selector) => ({
        boundingBox: async () => ({ x: 100, y: 100, width: 800, height: 600 }),
        waitFor: async () => {}
      }),
      frameLocator: (selector) => ({
        first: () => ({
          locator: (canvasSelector) => ({
            boundingBox: async () => ({ x: 100, y: 100, width: 800, height: 600 }),
            waitFor: async () => {}
          })
        })
      }),
      mouse: {
        move: async (x, y, options) => {},
        down: async () => {},
        up: async () => {}
      },
      keyboard: {
        press: async (key) => {}
      },
      waitForTimeout: async (ms) => {}
    };
    
    // 模拟frame对象
    const mockFrame = {
      evaluate: async (fn) => {
        // 传统方法调用
        if (fn.toString().includes('canvas#resume')) {
          return { type: 'attribute', content: '传统方法获取的简历内容' };
        }
        return null;
      }
    };
    
    // 模拟各种服务方法
    bossService.canvasOcrService.captureAndRecognizeCanvas = async () => {
      console.log('OCR方法被调用（不应该执行）');
      return 'OCR获取的内容';
    };
    
    bossService.dragSelectionService.copyResumeByDragSelection = async () => {
      console.log('拖拽选区方法被调用（应该首先执行）');
      return '拖拽选区获取的内容';
    };
    
    // 设置mockPage到bossService中
    bossService.page = mockPage;
    
    // 测试优先级：拖拽选区成功时，不应调用其他方法
    const result = await bossService.extractCanvasResumeContent(mockFrame);
    
    if (result === '拖拽选区获取的内容') {
      console.log('✓ 优先级测试通过：拖拽选区优先级最高');
    } else {
      throw new Error('优先级测试失败：拖拽选区应该优先执行');
    }
    
    return true;
    
  } catch (error) {
    console.error('✗ 拖拽选区优先级测试失败:', error.message);
    return false;
  }
}

/**
 * 运行所有测试
 */
async function runAllTests() {
  console.log('开始拖拽选区集成测试...');
  
  const tests = [
    testDragSelectionIntegration,
    testDragSelectionPriority
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    const result = await test();
    if (result) {
      passedTests++;
    }
  }
  
  console.log(`\n=== 测试结果 ===`);
  console.log(`通过: ${passedTests}/${tests.length}`);
  console.log(`成功率: ${(passedTests / tests.length * 100).toFixed(1)}%`);
  
  if (passedTests === tests.length) {
    console.log('🎉 所有拖拽选区集成测试通过！');
  } else {
    console.log('❌ 部分测试失败，请检查实现');
  }
}

// 运行测试
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testDragSelectionIntegration,
  testDragSelectionPriority,
  runAllTests
};