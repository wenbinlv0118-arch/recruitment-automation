#!/usr/bin/env node

/**
 * Puppeteer配置验证脚本
 * 验证Puppeteer配置和依赖是否正确设置
 */

const fs = require('fs');
const path = require('path');

function checkPuppeteerConfig() {
  console.log('🔍 开始Puppeteer配置验证...\n');
  
  let hasErrors = false;
  
  try {
    // 1. 检查package.json中的依赖
    console.log('📋 检查1: package.json依赖');
    const packagePath = path.join(__dirname, 'package.json');
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      if (packageJson.dependencies && packageJson.dependencies.puppeteer) {
        console.log(`✅ Puppeteer版本: ${packageJson.dependencies.puppeteer}`);
      } else {
        console.log('❌ 未找到Puppeteer依赖');
        hasErrors = true;
      }
    } else {
      console.log('❌ 未找到package.json');
      hasErrors = true;
    }
    
    // 2. 检查Puppeteer服务文件
    console.log('\n📋 检查2: Puppeteer服务文件');
    const servicePath = path.join(__dirname, 'src', 'services', 'puppeteerService.js');
    if (fs.existsSync(servicePath)) {
      console.log('✅ Puppeteer服务文件存在');
      
      const serviceContent = fs.readFileSync(servicePath, 'utf8');
      
      // 检查关键功能
      const checks = [
        { name: 'initialize方法', pattern: /async initialize\(\)/ },
        { name: 'createPage方法', pattern: /async createPage\(\)/ },
        { name: 'close方法', pattern: /async close\(\)/ },
        { name: '健康检查', pattern: /healthCheck/ },
        { name: '容器优化配置', pattern: /--no-sandbox/ }
      ];
      
      checks.forEach(check => {
        if (check.pattern.test(serviceContent)) {
          console.log(`✅ ${check.name}已定义`);
        } else {
          console.log(`❌ ${check.name}未找到`);
          hasErrors = true;
        }
      });
    } else {
      console.log('❌ Puppeteer服务文件不存在');
      hasErrors = true;
    }
    
    // 3. 检查测试文件
    console.log('\n📋 检查3: 测试文件');
    const testFiles = [
      'test-puppeteer-basic.js',
      'test-puppeteer-container.js',
      'test-service-only.js',
      'test-zeabur-puppeteer.js'
    ];
    
    testFiles.forEach(testFile => {
      const testPath = path.join(__dirname, testFile);
      if (fs.existsSync(testPath)) {
        console.log(`✅ ${testFile}存在`);
      } else {
        console.log(`❌ ${testFile}不存在`);
      }
    });
    
    // 4. 检查环境变量
    console.log('\n📋 检查4: 环境变量');
    const envVars = [
      'ZEABUR',
      'CONTAINER',
      'PUPPETEER_EXECUTABLE_PATH'
    ];
    
    envVars.forEach(envVar => {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar}: ${process.env[envVar]}`);
      } else {
        console.log(`ℹ️  ${envVar}: 未设置`);
      }
    });
    
    // 5. 检查node_modules
    console.log('\n📋 检查5: Node.js模块');
    try {
      const puppeteer = require('puppeteer');
      console.log('✅ Puppeteer模块可加载');
      
      // 检查版本
      const version = require('puppeteer/package.json').version;
      console.log(`✅ Puppeteer版本: ${version}`);
      
    } catch (error) {
      console.log(`❌ Puppeteer模块加载失败: ${error.message}`);
      hasErrors = true;
    }
    
    // 6. 检查目录结构
    console.log('\n📋 检查6: 目录结构');
    const directories = [
      'src/services',
      'src/utils',
      'backend/src/services',
      'node_modules/puppeteer'
    ];
    
    directories.forEach(dir => {
      const dirPath = path.join(__dirname, dir);
      if (fs.existsSync(dirPath)) {
        console.log(`✅ ${dir}目录存在`);
      } else {
        console.log(`ℹ️  ${dir}目录不存在`);
      }
    });
    
    // 总结
    console.log('\n📊 配置验证总结:');
    if (hasErrors) {
      console.log('❌ 发现配置错误，请检查上述问题');
      return false;
    } else {
      console.log('✅ 所有配置检查通过');
      return true;
    }
    
  } catch (error) {
    console.error('❌ 配置验证失败:', error.message);
    return false;
  }
}

// 运行验证
if (require.main === module) {
  const success = checkPuppeteerConfig();
  if (success) {
    console.log('\n🎉 Puppeteer配置验证完成！');
    process.exit(0);
  } else {
    console.log('\n💥 Puppeteer配置验证失败！');
    process.exit(1);
  }
}

module.exports = { checkPuppeteerConfig };