/**
 * 页面保护修复验证脚本
 * 
 * 此脚本用于验证简历添加成功后页面不会被意外关闭的修复
 */

const BossZhipinService = require('./backend/src/services/bossZhipinService');
const logger = require('./backend/src/utils/logger');

async function testPageProtection() {
  logger.info('🔧 开始页面保护修复验证测试...');
  
  const service = new BossZhipinService();
  
  try {
    // 1. 初始化浏览器
    logger.info('1. 初始化浏览器...');
    await service.initializeBrowser();
    
    // 2. 检查初始状态
    const initialStatus = service.getCurrentStatus();
    logger.info('2. 初始状态检查:', {
      hasBrowser: initialStatus.hasBrowser,
      hasPage: initialStatus.hasPage,
      status: initialStatus.status
    });
    
    // 3. 模拟简历处理完成后的状态
    logger.info('3. 模拟简历处理完成...');
    
    // 模拟设置浏览状态为活跃
    service.browsingStatus.isActive = true;
    
    // 等待一段时间，检查页面是否保持打开
    logger.info('4. 等待10秒，检查页面状态...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // 5. 检查页面状态
    const finalStatus = service.getCurrentStatus();
    logger.info('5. 最终状态检查:', {
      hasBrowser: finalStatus.hasBrowser,
      hasPage: finalStatus.hasPage,
      status: finalStatus.status
    });
    
    // 6. 验证结果
    if (finalStatus.hasBrowser && finalStatus.hasPage) {
      logger.info('✅ 页面保护修复验证成功：页面保持打开状态');
    } else {
      logger.error('❌ 页面保护修复验证失败：页面被意外关闭');
    }
    
  } catch (error) {
    logger.error('测试过程中发生错误:', error);
  } finally {
    // 清理资源
    try {
      await service.closeBrowser();
      logger.info('🧹 测试清理完成');
    } catch (cleanupError) {
      logger.warn('清理过程中发生错误:', cleanupError);
    }
  }
}

// 运行测试
if (require.main === module) {
  testPageProtection().catch(console.error);
}

module.exports = { testPageProtection };