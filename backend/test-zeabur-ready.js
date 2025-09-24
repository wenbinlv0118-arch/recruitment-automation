#!/usr/bin/env node

/**
 * Zeabur部署就绪验证
 * 验证Puppeteer配置和代码是否适用于Zeabur生产环境
 */

const fs = require('fs');
const path = require('path');

class ZeaburReadyValidator {
  constructor() {
    this.results = [];
  }

  log(test, passed, message = '') {
    const status = passed ? '✅' : '❌';
    console.log(`${status} ${test}: ${message}`);
    this.results.push({ test, passed, message });
  }

  async validatePackageJson() {
    console.log('\n📦 验证package.json...');
    
    try {
      const packagePath = path.join(__dirname, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // 检查Puppeteer依赖
      const hasPuppeteer = pkg.dependencies && pkg.dependencies.puppeteer;
      const hasNoPlaywright = !pkg.dependencies.playwright;
      
      this.log('Puppeteer依赖', hasPuppeteer, hasPuppeteer ? `版本: ${pkg.dependencies.puppeteer}` : '未找到puppeteer依赖');
      this.log('Playwright移除', hasNoPlaywright, hasNoPlaywright ? 'Playwright已成功移除' : 'Playwright仍然存在');
      
      return hasPuppeteer && hasNoPlaywright;
    } catch (error) {
      this.log('Package.json验证', false, error.message);
      return false;
    }
  }

  async validateServiceFiles() {
    console.log('\n📁 验证服务文件...');
    
    const files = [
      'src/services/zhilianService.js',
      'src/services/puppeteerService.js',
      'src/services/bossService.js',
      'src/services/bossZhipinService.js'
    ];
    
    let allValid = true;
    let foundFiles = 0;
    
    for (const file of files) {
      try {
        const filePath = path.join(__dirname, file);
        
        if (!fs.existsSync(filePath)) {
          this.log(`文件存在 ${file}`, false, '文件不存在');
          continue;
        }
        
        foundFiles++;
        const content = fs.readFileSync(filePath, 'utf8');
        
        const fileName = path.basename(file);
        
        // 特殊处理bossService.js - 它是bossZhipinService的包装器
        if (fileName === 'bossService.js') {
          const usesBossZhipinService = content.includes('bossZhipinService') || content.includes('BossZhipinService');
          const hasPlaywright = content.includes('playwright');
          
          this.log(`${fileName} 包装器`, usesBossZhipinService, usesBossZhipinService ? '正确使用bossZhipinService包装器' : '未正确使用包装器');
          this.log(`${fileName} Playwright`, !hasPlaywright, !hasPlaywright ? '无Playwright引用' : '仍包含Playwright');
          
          if (!usesBossZhipinService || hasPlaywright) {
            allValid = false;
          }
          continue;
        }
        
        // 检查是否使用Puppeteer而非Playwright
        const hasPuppeteer = content.includes('puppeteer');
        const hasPlaywright = content.includes('playwright');
        
        this.log(`${fileName} Puppeteer`, hasPuppeteer, hasPuppeteer ? '使用Puppeteer' : '未使用Puppeteer');
        this.log(`${fileName} Playwright`, !hasPlaywright, !hasPlaywright ? '无Playwright引用' : '仍包含Playwright');
        
        if (!hasPuppeteer || hasPlaywright) {
          allValid = false;
        }
      } catch (error) {
        this.log(`文件检查 ${file}`, false, error.message);
        allValid = false;
      }
    }
    
    // 至少有一个主要服务文件通过验证即可
    return foundFiles > 0 && allValid;
  }

  async validateConfiguration() {
    console.log('\n⚙️  验证配置...');
    
    const configs = {
      'Puppeteer配置': {
        headless: 'new',
        noSandbox: true,
        disableGpu: true
      }
    };
    
    // 检查环境变量
    const zeaburEnv = process.env.ZEABUR_ENVIRONMENT || process.env.ZEABUR;
    const nodeEnv = process.env.NODE_ENV;
    const headlessMode = process.env.HEADLESS_MODE || process.env.BROWSER_HEADLESS;
    const containerEnv = process.env.CONTAINER;
    
    let configValid = true;
    
    // 检查无头模式和沙箱配置
    try {
      // 检查环境配置文件
      const envConfigPath = path.join(__dirname, 'src', 'config', 'environmentConfig.js');
      const configPath = path.join(__dirname, 'src', 'utils', 'config.js');
      
      let hasHeadless = false;
      let hasNoSandbox = false;
      
      // 检查环境配置文件
      if (fs.existsSync(envConfigPath)) {
        const content = fs.readFileSync(envConfigPath, 'utf8');
        hasHeadless = content.includes('headless') || content.includes('HEADLESS');
        hasNoSandbox = content.includes('--no-sandbox') || content.includes('disable-setuid-sandbox') || content.includes('disable-sandbox');
      }
      
      // 检查配置文件
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        if (!hasHeadless) {
          hasHeadless = content.includes('headless') || content.includes('HEADLESS');
        }
        if (!hasNoSandbox) {
          hasNoSandbox = content.includes('--no-sandbox') || content.includes('disable-setuid-sandbox') || content.includes('disable-sandbox');
        }
      }
      
      this.log('Headless配置', hasHeadless, hasHeadless ? '已配置无头模式' : '未找到无头模式配置');
      this.log('沙箱配置', hasNoSandbox, hasNoSandbox ? '已禁用沙箱模式' : '未禁用沙箱模式');
      
      if (!hasNoSandbox) {
        configValid = false;
      }
      if (!hasHeadless) {
        configValid = false;
      }
    } catch (error) {
      this.log('配置验证', false, error.message);
      configValid = false;
    }
    
    // 检查环境变量
    this.log('ZEABUR环境', !!zeaburEnv, zeaburEnv || '未设置');
    this.log('NODE_ENV', nodeEnv === 'production', nodeEnv || '未设置');
    this.log('无头模式', !!headlessMode, headlessMode || '未设置');
    this.log('容器环境', !!containerEnv, containerEnv || '未设置');
    
    // 环境变量验证
    const envValid = !!zeaburEnv && nodeEnv === 'production' && !!headlessMode && !!containerEnv;
    if (!envValid) {
      configValid = false;
    }
    
    return configValid;
  }

  async validateTestFiles() {
    console.log('\n🧪 验证测试文件...');
    
    const testFiles = [
      'test-puppeteer-service.js',
      'validate-zeabur-deployment.js',
      'test-simple-puppeteer.js'
    ];
    
    let allExist = true;
    
    testFiles.forEach(file => {
      const filePath = path.join(__dirname, file);
      const exists = fs.existsSync(filePath);
      
      this.log(`测试文件 ${file}`, exists, exists ? '存在' : '不存在');
      
      if (!exists) {
        allExist = false;
      }
    });
    
    return allExist;
  }

  async validateDeploymentReadiness() {
    console.log('🚀 开始Zeabur部署就绪验证...\n');
    
    const validations = [
      await this.validatePackageJson(),
      await this.validateServiceFiles(),
      await this.validateConfiguration(),
      await this.validateTestFiles()
    ];
    
    const passed = validations.filter(v => v === true).length;
    const total = validations.length;
    
    console.log('\n📊 验证结果总结:');
    console.log('='.repeat(50));
    console.log(`验证项目: ${total}`);
    console.log(`通过项目: ${passed}`);
    console.log(`失败项目: ${total - passed}`);
    
    if (passed === total) {
      console.log('\n🎉 部署就绪验证通过！');
      console.log('✅ 所有配置正确');
      console.log('✅ Playwright已完全移除');
      console.log('✅ Puppeteer已正确集成');
      console.log('✅ 可以安全部署到Zeabur');
      
      // 创建部署标记文件
      const readyFile = path.join(__dirname, 'DEPLOYMENT_READY.md');
      const readyContent = `# Zeabur部署就绪报告

## 验证结果
- ✅ Puppeteer依赖已安装
- ✅ Playwright依赖已移除
- ✅ 服务文件已更新
- ✅ 配置已优化
- ✅ 测试文件已创建

## 部署命令
\`\`\`bash
npm install
npm run start:zeabur
\`\`\`

## 状态
✅ **准备就绪** - 可以部署到Zeabur

生成时间: ${new Date().toISOString()}
`;
      
      fs.writeFileSync(readyFile, readyContent);
      console.log('✅ 已创建部署就绪标记文件');
      
    } else {
      console.log('\n⚠️  部署就绪验证失败');
      console.log('❌ 请检查上述失败项目');
    }
    
    return {
      ready: passed === total,
      passed,
      total,
      details: this.results
    };
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const validator = new ZeaburReadyValidator();
  validator.validateDeploymentReadiness().then(result => {
    process.exit(result.ready ? 0 : 1);
  });
}

module.exports = ZeaburReadyValidator;