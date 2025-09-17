/**
 * Puppeteer测试脚本
 * 验证Puppeteer在Zeabur环境中的运行情况
 */

const ZhilianServicePuppeteer = require('./src/services/zhilianServicePuppeteer');
const logger = require('./src/utils/logger');

async function testPuppeteer() {
  console.log('🚀 开始Puppeteer测试...');
  
  const service = new ZhilianServicePuppeteer();
  
  try {
    console.log('📋 测试1: 浏览器初始化');
    await service.initializeBrowser();
    console.log('✅ 浏览器初始化成功');
    
    console.log('📋 测试2: 导航到智联招聘');
    await service.navigateToZhaopin();
    console.log('✅ 导航成功');
    
    console.log('📋 测试3: 获取候选人列表');
    const candidates = await service.getCandidateList();
    console.log(`✅ 获取到 ${candidates.length} 个候选人`);
    
    console.log('📋 测试4: 处理候选人');
    if (candidates.length > 0) {
      const results = await service.processCandidates(candidates.slice(0, 2));
      console.log(`✅ 成功处理 ${results.length} 个候选人`);
    }
    
    console.log('📋 测试5: 服务状态');
    const status = service.getStatus();
    console.log('✅ 服务状态正常:', JSON.stringify(status.browser, null, 2));
    
    console.log('🎉 所有Puppeteer测试通过！');
    
  } catch (error) {
    console.error('❌ Puppeteer测试失败:', error);
    process.exit(1);
  } finally {
    await service.close();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testPuppeteer();
}

module.exports = { testPuppeteer };