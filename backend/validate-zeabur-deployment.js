#!/usr/bin/env node

/**
 * Zeabur部署验证脚本
 * 验证Puppeteer在Zeabur容器环境中的功能
 * 此脚本模拟Zeabur的Linux容器环境
 */

const puppeteer = require('puppeteer');

// Zeabur容器环境配置
const ZEABUR_CONFIG = {
  headless: 'new',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI',
    '--disable-ipc-flooding-protection',
    '--disable-background-networking',
    '--enable-features=NetworkService,NetworkServiceLogging',
    '--force-color-profile=srgb',
    '--disable-features=VizDisplayCompositor'
  ]
};

class ZeaburDeploymentValidator {
  constructor() {
    this.browser = null;
    this.page = null;
    this.testResults = [];
  }

  async logResult(testName, passed, details = '') {
    const timestamp = new Date().toISOString();
    const result = {
      test: testName,
      passed,
      details,
      timestamp
    };
    
    this.testResults.push(result);
    
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${testName}: ${details}`);
  }

  async validateBrowserLaunch() {
    console.log('\n🔍 验证浏览器启动...');
    
    try {
      this.browser = await puppeteer.launch(ZEABUR_CONFIG);
      const version = await this.browser.version();
      
      await this.logResult('Browser Launch', true, `Chrome版本: ${version}`);
      return true;
    } catch (error) {
      await this.logResult('Browser Launch', false, error.message);
      return false;
    }
  }

  async validatePageCreation() {
    console.log('\n🔍 验证页面创建...');
    
    try {
      if (!this.browser) {
        throw new Error('浏览器未启动');
      }
      
      this.page = await this.browser.newPage();
      await this.logResult('Page Creation', true, '新页面创建成功');
      return true;
    } catch (error) {
      await this.logResult('Page Creation', false, error.message);
      return false;
    }
  }

  async validateBasicNavigation() {
    console.log('\n🔍 验证基础导航...');
    
    try {
      if (!this.page) {
        throw new Error('页面未创建');
      }
      
      await this.page.goto('https://httpbin.org/html', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      const title = await this.page.title();
      const url = this.page.url();
      
      await this.logResult('Basic Navigation', true, `标题: "${title}", URL: ${url}`);
      return true;
    } catch (error) {
      await this.logResult('Basic Navigation', false, error.message);
      return false;
    }
  }

  async validateJavaScriptExecution() {
    console.log('\n🔍 验证JavaScript执行...');
    
    try {
      const result = await this.page.evaluate(() => {
        return {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          url: window.location.href,
          title: document.title,
          timestamp: new Date().toISOString()
        };
      });
      
      await this.logResult('JavaScript Execution', true, 
        `平台: ${result.platform}, 语言: ${result.language}`);
      return true;
    } catch (error) {
      await this.logResult('JavaScript Execution', false, error.message);
      return false;
    }
  }

  async validateContentExtraction() {
    console.log('\n🔍 验证内容提取...');
    
    try {
      // 创建一个测试页面
      await this.page.setContent(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>测试页面</title>
        </head>
        <body>
          <div class="job-listing">
            <h1 class="title">高级前端工程师</h1>
            <p class="company">某科技公司</p>
            <span class="salary">20-30K</span>
            <div class="requirements">
              <span>React</span>
              <span>Node.js</span>
              <span>5年以上</span>
            </div>
          </div>
        </body>
        </html>
      `);

      // 提取职位信息
      const jobData = await this.page.evaluate(() => {
        const title = document.querySelector('.title')?.textContent || '';
        const company = document.querySelector('.company')?.textContent || '';
        const salary = document.querySelector('.salary')?.textContent || '';
        const requirements = Array.from(document.querySelectorAll('.requirements span'))
          .map(el => el.textContent.trim());
        
        return { title, company, salary, requirements };
      });

      await this.logResult('Content Extraction', true, 
        `提取到: ${jobData.title} at ${jobData.company}`);
      return true;
    } catch (error) {
      await this.logResult('Content Extraction', false, error.message);
      return false;
    }
  }

  async validateScreenshot() {
    console.log('\n🔍 验证截图功能...');
    
    try {
      await this.page.setViewport({ width: 1280, height: 720 });
      
      const screenshot = await this.page.screenshot({
        encoding: 'base64',
        fullPage: true
      });

      await this.logResult('Screenshot', true, 
        `截图成功，大小: ${(screenshot.length / 1024).toFixed(2)}KB`);
      return true;
    } catch (error) {
      await this.logResult('Screenshot', false, error.message);
      return false;
    }
  }

  async validateResourceCleanup() {
    console.log('\n🔍 验证资源清理...');
    
    try {
      if (this.page) {
        await this.page.close();
        await this.logResult('Page Cleanup', true, '页面已关闭');
      }
      
      if (this.browser) {
        await this.browser.close();
        await this.logResult('Browser Cleanup', true, '浏览器已关闭');
      }
      
      return true;
    } catch (error) {
      await this.logResult('Resource Cleanup', false, error.message);
      return false;
    }
  }

  async validateDeployment() {
    console.log('🚀 开始Zeabur部署验证...\n');
    
    const tests = [
      () => this.validateBrowserLaunch(),
      () => this.validatePageCreation(),
      () => this.validateBasicNavigation(),
      () => this.validateJavaScriptExecution(),
      () => this.validateContentExtraction(),
      () => this.validateScreenshot(),
      () => this.validateResourceCleanup()
    ];

    let allPassed = true;
    
    for (const test of tests) {
      const result = await test();
      if (!result) {
        allPassed = false;
      }
    }

    console.log('\n📊 验证结果总结:');
    console.log('='.repeat(50));
    
    const passedCount = this.testResults.filter(r => r.passed).length;
    const totalCount = this.testResults.length;
    
    console.log(`总测试数: ${totalCount}`);
    console.log(`通过测试: ${passedCount}`);
    console.log(`失败测试: ${totalCount - passedCount}`);
    
    if (allPassed) {
      console.log('\n🎉 所有验证通过！');
      console.log('✅ Puppeteer在Zeabur环境中运行正常');
      console.log('✅ 可以安全部署到生产环境');
    } else {
      console.log('\n⚠️  部分验证失败');
      console.log('❌ 请检查配置和环境设置');
    }

    // 生成详细报告
    const report = {
      summary: {
        total: totalCount,
        passed: passedCount,
        failed: totalCount - passedCount,
        success: allPassed
      },
      details: this.testResults
    };

    return report;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const validator = new ZeaburDeploymentValidator();
  validator.validateDeployment().then(report => {
    process.exit(report.summary.success ? 0 : 1);
  });
}

module.exports = ZeaburDeploymentValidator;