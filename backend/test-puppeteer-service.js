#!/usr/bin/env node

/**
 * Puppeteer服务测试脚本
 * 验证Puppeteer在Zeabur环境中的基本功能
 */

const puppeteer = require('puppeteer');

// 容器环境优化配置
const PUPPETEER_CONFIG = {
  headless: 'new', // 使用新的无头模式
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding'
  ]
};

class PuppeteerServiceTester {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('🚀 初始化Puppeteer服务...');
    
    try {
      this.browser = await puppeteer.launch(PUPPETEER_CONFIG);
      console.log('✅ 浏览器启动成功');
      
      this.page = await this.browser.newPage();
      console.log('✅ 页面创建成功');
      
      return true;
    } catch (error) {
      console.error('❌ 初始化失败:', error.message);
      return false;
    }
  }

  async testBasicNavigation() {
    console.log('🧪 测试基础导航...');
    
    try {
      await this.page.goto('https://example.com', { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      const title = await this.page.title();
      console.log(`✅ 页面标题: ${title}`);
      
      return title.length > 0;
    } catch (error) {
      console.error('❌ 导航测试失败:', error.message);
      return false;
    }
  }

  async testJavaScriptExecution() {
    console.log('🧪 测试JavaScript执行...');
    
    try {
      const result = await this.page.evaluate(() => {
        return {
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: new Date().toISOString()
        };
      });
      
      console.log('✅ JavaScript执行结果:', result);
      return true;
    } catch (error) {
      console.error('❌ JavaScript执行测试失败:', error.message);
      return false;
    }
  }

  async testScreenshot() {
    console.log('🧪 测试截图功能...');
    
    try {
      await this.page.setViewport({ width: 1280, height: 720 });
      
      // 创建一个简单的测试页面
      await this.page.setContent(`
        <html>
          <head><title>测试页面</title></head>
          <body>
            <h1>Hello Puppeteer!</h1>
            <p>这是测试截图的页面</p>
          </body>
        </html>
      `);
      
      const screenshot = await this.page.screenshot({ 
        encoding: 'base64',
        fullPage: true 
      });
      
      console.log(`✅ 截图成功，大小: ${screenshot.length} 字节`);
      return true;
    } catch (error) {
      console.error('❌ 截图测试失败:', error.message);
      return false;
    }
  }

  async testElementInteraction() {
    console.log('🧪 测试元素交互...');
    
    try {
      await this.page.setContent(`
        <html>
          <body>
            <input type="text" id="test-input" placeholder="输入测试内容" />
            <button id="test-button">点击我</button>
            <div id="result"></div>
          </body>
        </html>
      `);

      await this.page.type('#test-input', '测试输入');
      await this.page.click('#test-button');
      
      const result = await this.page.$eval('#result', el => el.textContent || '无内容');
      console.log('✅ 元素交互测试完成');
      
      return true;
    } catch (error) {
      console.error('❌ 元素交互测试失败:', error.message);
      return false;
    }
  }

  async cleanup() {
    console.log('🧹 清理资源...');
    
    try {
      if (this.page) {
        await this.page.close();
        console.log('✅ 页面已关闭');
      }
      
      if (this.browser) {
        await this.browser.close();
        console.log('✅ 浏览器已关闭');
      }
      
      return true;
    } catch (error) {
      console.error('❌ 清理失败:', error.message);
      return false;
    }
  }

  async runAllTests() {
    console.log('🎯 开始Puppeteer服务测试\n');
    
    const results = [];
    
    try {
      // 初始化
      results.push(await this.initialize());
      
      if (results[0]) {
        // 运行各项测试
        results.push(await this.testBasicNavigation());
        results.push(await this.testJavaScriptExecution());
        results.push(await this.testScreenshot());
        results.push(await this.testElementInteraction());
      }
      
    } catch (error) {
      console.error('❌ 测试过程中出现错误:', error);
      results.push(false);
    } finally {
      await this.cleanup();
    }
    
    const passed = results.filter(r => r === true).length;
    const total = results.length;
    
    console.log('\n📊 测试结果总结:');
    console.log(`✅ 通过: ${passed}/${total}`);
    
    if (passed === total) {
      console.log('🎉 所有测试通过！Puppeteer服务正常');
    } else {
      console.log('⚠️  部分测试失败，请检查配置');
    }
    
    return passed === total;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const tester = new PuppeteerServiceTester();
  tester.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = PuppeteerServiceTester;