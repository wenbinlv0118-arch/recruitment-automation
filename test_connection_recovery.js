/**
 * 连接恢复机制测试脚本
 * 用于验证简历添加失败和连接断开的修复效果
 */

const BossZhipinService = require('./backend/src/services/bossZhipinService');
const logger = require('./backend/src/utils/logger');

async function testConnectionRecovery() {
  const service = new BossZhipinService();
  
  try {
    logger.info('开始测试连接恢复机制...');
    
    // 初始化浏览器
    await service.initializeBrowser();
    logger.info('浏览器初始化成功');
    
    // 模拟连接错误恢复
    logger.info('测试连接错误恢复机制...');
    const recovered = await service.recoverFromConnectionError();
    
    if (recovered) {
      logger.info('✅ 连接恢复机制测试成功');
    } else {
      logger.error('❌ 连接恢复机制测试失败');
    }
    
    // 清理资源
    await service.closeBrowser();
    logger.info('测试完成，浏览器已关闭');
    
  } catch (error) {
    logger.error('测试过程中发生错误:', error);
  }
}

// 运行测试
if (require.main === module) {
  testConnectionRecovery()
    .then(() => {
      logger.info('连接恢复机制测试完成');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('测试失败:', error);
      process.exit(1);
    });
}

module.exports = { testConnectionRecovery };