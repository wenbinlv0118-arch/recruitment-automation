#!/usr/bin/env node

/**
 * Puppeteer服务模块测试脚本
 * 仅测试服务模块功能，不依赖外部网络
 */

const { PuppeteerService } = require('./src/services/puppeteerService');

async function testPuppeteerService() {
  console.log('🚀 开始Puppeteer服务模块测试...\n');
  
  try {
    // 测试1: 服务初始化
    console.log('📋 测试1: 服务初始化');
    const service = new PuppeteerService();
    console.log('✅ 服务实例创建成功');
    
    // 测试2: 健康检查
    console.log('\n📋 测试2: 健康检查');
    const isHealthy = await service.healthCheck();
    console.log(`✅ 健康检查结果: ${isHealthy ? '健康' : '不健康'}`);
    
    // 测试3: 浏览器初始化
    console.log('\n📋 测试3: 浏览器初始化');
    const initResult = await service.initialize();
    console.log(`✅ 浏览器初始化: ${initResult ? '成功' : '失败'}`);
    
    if (!initResult) {
      console.log('❌ 浏览器初始化失败，跳过后续测试');
      return false;
    }
    
    // 测试4: 页面创建
    console.log('\n📋 测试4: 页面创建');
    const page = await service.createPage();
    console.log('✅ 页面创建成功');
    
    // 测试5: 本地内容测试
    console.log('\n📋 测试5: 本地内容测试');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>服务测试</title>
        </head>
        <body>
          <h1>Puppeteer服务测试</h1>
          <div class="test-item">测试项目1</div>
          <div class="test-item">测试项目2</div>
        </body>
      </html>
    `);
    
    const title = await page.title();
    console.log(`✅ 页面标题: ${title}`);
    
    // 测试6: 元素选择
    console.log('\n📋 测试6: 元素选择');
    const items = await page.$$eval('.test-item', elements => 
      elements.map(el => el.textContent)
    );
    console.log(`✅ 找到元素: ${items.join(', ')}`);
    
    // 测试7: 关闭页面
    console.log('\n📋 测试7: 关闭页面');
    await page.close();
    console.log('✅ 页面关闭成功');
    
    // 测试8: 浏览器关闭
    console.log('\n📋 测试8: 浏览器关闭');
    await service.close();
    console.log('✅ 浏览器关闭成功');
    
    console.log('\n🎉 所有服务模块测试通过！');
    return true;
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误类型:', error.constructor.name);
    
    // 尝试清理资源
    try {
      if (PuppeteerService.instance) {
        await PuppeteerService.instance.close();
      }
    } catch (cleanupError) {
      console.error('清理资源时出错:', cleanupError.message);
    }
    
    return false;
  }
}

// 运行测试
if (require.main === module) {
  testPuppeteerService()
    .then(success => {
      if (success) {
        console.log('\n✨ Puppeteer服务模块验证完成！');
        process.exit(0);
      } else {
        console.log('\n💥 Puppeteer服务模块验证失败！');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('测试异常:', error);
      process.exit(1);
    });
}

module.exports = { testPuppeteerService };