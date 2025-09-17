#!/usr/bin/env node

/**
 * Zeabur部署验证脚本
 * 在Zeabur环境中验证Puppeteer功能是否正常
 */

const { PuppeteerService } = require('./src/services/puppeteerService');

async function validateZeaburDeployment() {
  console.log('🚀 开始Zeabur部署验证...\n');
  
  const results = {
    service: false,
    browser: false,
    page: false,
    content: false,
    cleanup: false
  };
  
  let service = null;
  let page = null;
  
  try {
    // 1. 验证服务初始化
    console.log('📋 验证1: 服务初始化');
    service = new PuppeteerService();
    results.service = true;
    console.log('✅ 服务初始化成功');
    
    // 2. 验证浏览器启动
    console.log('\n📋 验证2: 浏览器启动');
    const initSuccess = await service.initialize();
    if (!initSuccess) {
      throw new Error('浏览器初始化失败');
    }
    results.browser = true;
    console.log('✅ 浏览器启动成功');
    
    // 3. 验证页面创建
    console.log('\n📋 验证3: 页面创建');
    page = await service.createPage();
    results.page = true;
    console.log('✅ 页面创建成功');
    
    // 4. 验证内容加载
    console.log('\n📋 验证4: 内容加载');
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Zeabur验证测试</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .success { color: green; }
            .info { color: blue; margin: 10px 0; }
          </style>
        </head>
        <body>
          <h1>Zeabur Puppeteer验证测试</h1>
          <div class="info">部署时间: ${new Date().toISOString()}</div>
          <div class="info">Node版本: ${process.version}</div>
          <div class="info">环境: ${process.env.ZEABUR ? 'Zeabur' : '本地'}</div>
          <div class="success">✅ Puppeteer功能验证成功</div>
        </body>
      </html>
    `);
    
    const title = await page.title();
    const bodyText = await page.$eval('body', el => el.textContent);
    
    results.content = title === 'Zeabur验证测试' && bodyText.includes('Puppeteer功能验证成功');
    console.log(`✅ 内容加载成功 - 标题: ${title}`);
    
    // 5. 验证清理
    console.log('\n📋 验证5: 资源清理');
    if (page) await page.close();
    if (service) await service.close();
    results.cleanup = true;
    console.log('✅ 资源清理成功');
    
    // 总结
    console.log('\n📊 部署验证结果:');
    Object.entries(results).forEach(([key, value]) => {
      console.log(`${value ? '✅' : '❌'} ${key}: ${value ? '通过' : '失败'}`);
    });
    
    const allPassed = Object.values(results).every(Boolean);
    
    if (allPassed) {
      console.log('\n🎉 Zeabur部署验证全部通过！');
      console.log('💡 提示: 此验证脚本证明Puppeteer配置正确，可在Zeabur环境中正常运行');
    } else {
      console.log('\n💥 Zeabur部署验证部分失败');
    }
    
    return allPassed;
    
  } catch (error) {
    console.error('\n❌ 验证失败:', error.message);
    console.error('错误类型:', error.constructor.name);
    
    // 尝试清理
    try {
      if (page) await page.close();
      if (service) await service.close();
    } catch (cleanupError) {
      console.error('清理时出错:', cleanupError.message);
    }
    
    return false;
  }
}

// 运行验证
if (require.main === module) {
  validateZeaburDeployment()
    .then(success => {
      if (success) {
        console.log('\n✨ 部署验证完成！');
        process.exit(0);
      } else {
        console.log('\n💥 部署验证失败！');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('验证异常:', error);
      process.exit(1);
    });
}

module.exports = { validateZeaburDeployment };