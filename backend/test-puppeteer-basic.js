#!/usr/bin/env node

/**
 * 基础Puppeteer测试脚本
 * 验证Puppeteer在本地环境的基本功能
 */

const puppeteer = require('puppeteer');

async function testBasicFunctionality() {
  console.log('🚀 开始基础Puppeteer功能测试...\n');
  
  let browser = null;
  
  try {
    // 测试1: 启动浏览器
    console.log('📋 测试1: 启动浏览器');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    console.log('✅ 浏览器启动成功');
    
    // 测试2: 创建页面
    console.log('\n📋 测试2: 创建页面');
    const page = await browser.newPage();
    console.log('✅ 页面创建成功');
    
    // 测试3: 访问简单页面
    console.log('\n📋 测试3: 访问测试页面');
    await page.goto('https://httpbin.org/html', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    console.log('✅ 页面访问成功');
    
    // 测试4: 获取页面内容
    console.log('\n📋 测试4: 获取页面内容');
    const title = await page.title();
    const content = await page.content();
    console.log(`✅ 页面标题: ${title}`);
    console.log(`✅ 页面内容长度: ${content.length} 字符`);
    
    // 测试5: 执行JavaScript
    console.log('\n📋 测试5: 执行JavaScript');
    const result = await page.evaluate(() => {
      return {
        url: window.location.href,
        userAgent: navigator.userAgent,
        title: document.title
      };
    });
    console.log('✅ JavaScript执行成功');
    console.log('📊 执行结果:', result);
    
    console.log('\n🎉 所有基础测试通过！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('错误堆栈:', error.stack);
    return false;
  } finally {
    if (browser) {
      await browser.close();
      console.log('\n🔒 浏览器已关闭');
    }
  }
  
  return true;
}

// 运行测试
if (require.main === module) {
  testBasicFunctionality()
    .then(success => {
      if (success) {
        console.log('\n✨ Puppeteer基础功能验证完成！');
        process.exit(0);
      } else {
        console.log('\n💥 Puppeteer基础功能验证失败！');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('测试异常:', error);
      process.exit(1);
    });
}

module.exports = { testBasicFunctionality };