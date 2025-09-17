#!/usr/bin/env node

/**
 * Puppeteer迁移验证脚本
 * 检查所有服务文件是否已正确从Playwright切换到Puppeteer
 */

const fs = require('fs');
const path = require('path');

// 服务文件目录
const servicesDir = path.join(__dirname, 'src', 'services');

// 需要检查的服务文件
const serviceFiles = [
  'zhilianService.js',
  'bossService.js',
  'bossZhipinService.js',
  'puppeteerService.js',
  'lagouService.js',
  '51jobService.js'
];

// 检查项目中的Playwright和Puppeteer使用情况
async function checkMigrationStatus() {
  console.log('🔍 检查Puppeteer迁移状态...\n');
  
  const results = {
    usingPlaywright: [],
    usingPuppeteer: [],
    notFound: [],
    errors: []
  };

  // 检查package.json
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    console.log('📦 依赖检查:');
    console.log(`   Playwright: ${dependencies.playwright ? '❌ 存在' : '✅ 已移除'}`);
    console.log(`   Puppeteer: ${dependencies.puppeteer ? '✅ 存在' : '❌ 不存在'}`);
    console.log();
  }

  // 检查服务文件
  for (const file of serviceFiles) {
    const filePath = path.join(servicesDir, file);
    
    if (!fs.existsSync(filePath)) {
      results.notFound.push(file);
      continue;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 检查Playwright相关代码
      const hasPlaywright = /playwright|chromium|firefox|webkit/i.test(content);
      const hasPuppeteer = /puppeteer/i.test(content);
      
      if (hasPlaywright && !hasPuppeteer) {
        results.usingPlaywright.push(file);
      } else if (hasPuppeteer && !hasPlaywright) {
        results.usingPuppeteer.push(file);
      } else if (hasPlaywright && hasPuppeteer) {
        results.usingPuppeteer.push(file); // 优先Puppeteer
      } else {
        // 检查是否有浏览器相关代码
        const hasBrowserCode = /browser|launch|newPage/i.test(content);
        if (hasBrowserCode) {
          results.usingPuppeteer.push(file);
        }
      }
      
    } catch (error) {
      results.errors.push({ file, error: error.message });
    }
  }

  // 输出结果
  console.log('📋 迁移状态报告:');
  
  if (results.usingPuppeteer.length > 0) {
    console.log('✅ 已切换到Puppeteer:');
    results.usingPuppeteer.forEach(file => console.log(`   - ${file}`));
    console.log();
  }
  
  if (results.usingPlaywright.length > 0) {
    console.log('❌ 仍使用Playwright:');
    results.usingPlaywright.forEach(file => console.log(`   - ${file}`));
    console.log();
  }
  
  if (results.notFound.length > 0) {
    console.log('⚠️  文件未找到:');
    results.notFound.forEach(file => console.log(`   - ${file}`));
    console.log();
  }
  
  if (results.errors.length > 0) {
    console.log('❌ 读取错误:');
    results.errors.forEach(({ file, error }) => console.log(`   - ${file}: ${error}`));
    console.log();
  }

  // 总结
  const totalChecked = results.usingPuppeteer.length + results.usingPlaywright.length;
  console.log(`📊 总计检查: ${totalChecked} 个文件`);
  console.log(`✅ 已迁移: ${results.usingPuppeteer.length} 个文件`);
  console.log(`❌ 未迁移: ${results.usingPlaywright.length} 个文件`);
  
  // 检查是否有Playwright残留
  if (results.usingPlaywright.length === 0) {
    console.log('\n🎉 恭喜！所有服务文件已成功切换到Puppeteer');
    process.exit(0);
  } else {
    console.log('\n⚠️  仍有文件使用Playwright，需要进一步迁移');
    process.exit(1);
  }
}

// 运行检查
if (require.main === module) {
  checkMigrationStatus().catch(console.error);
}

module.exports = { checkMigrationStatus };