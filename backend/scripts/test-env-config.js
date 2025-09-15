#!/usr/bin/env node

/**
 * 环境配置测试脚本
 * 用于验证环境配置模块和环境变量加载是否正确
 */

// 加载环境配置（与主应用相同的方式）
const path = require('path');
const fs = require('fs');

// 检查并加载本地环境配置
const localEnvPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(localEnvPath)) {
  require('dotenv').config({ path: localEnvPath });
  console.log('✅ 已加载本地环境配置: .env.local');
} else {
  // 根据 NODE_ENV 加载对应的环境配置
  const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
  const envPath = path.join(__dirname, `../${envFile}`);
  
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log(`✅ 已加载环境配置: ${envFile}`);
  } else {
    require('dotenv').config();
    console.log('⚠️  已加载默认环境配置');
  }
}

// 导入环境配置模块
const { environmentConfig, getBrowserConfig, validateConfig } = require('../src/config/environmentConfig');

console.log('\n=== 环境配置测试 ===\n');

// 1. 显示当前环境变量
console.log('📋 当前环境变量:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
console.log(`   ZEABUR_ENVIRONMENT: ${process.env.ZEABUR_ENVIRONMENT || 'undefined'}`);
console.log(`   HEADLESS_MODE: ${process.env.HEADLESS_MODE || 'undefined'}`);
console.log(`   DEBUG_MODE: ${process.env.DEBUG_MODE || 'undefined'}`);
console.log(`   PORT: ${process.env.PORT || 'undefined'}`);

// 2. 测试环境配置检测
console.log('\n🔍 环境配置检测:');
environmentConfig.printConfig();

// 3. 获取浏览器配置
console.log('\n🌐 浏览器配置:');
const browserConfig = getBrowserConfig();
console.log(`   无头模式: ${browserConfig.headless}`);
console.log(`   启动参数数量: ${browserConfig.args.length}`);
console.log(`   关键参数: ${browserConfig.args.slice(0, 5).join(', ')}...`);

// 4. 验证配置
console.log('\n✅ 配置验证:');
const validation = validateConfig();
console.log(`   配置有效: ${validation.isValid}`);

if (validation.issues.length > 0) {
  console.log('   ❌ 问题:');
  validation.issues.forEach(issue => console.log(`      - ${issue}`));
}

if (validation.warnings.length > 0) {
  console.log('   ⚠️  警告:');
  validation.warnings.forEach(warning => console.log(`      - ${warning}`));
}

if (validation.isValid && validation.issues.length === 0) {
  console.log('   🎉 所有配置验证通过！');
}

// 5. 环境建议
console.log('\n💡 环境建议:');
const isLocalEnv = fs.existsSync(localEnvPath);
const isProduction = environmentConfig.isProduction();

if (isLocalEnv) {
  console.log('   - 当前为本地环境，可以通过修改 .env.local 文件调整配置');
  console.log('   - 要测试生产环境模式，设置 NODE_ENV=production');
  console.log('   - 要模拟 Zeabur 环境，设置 ZEABUR_ENVIRONMENT=true');
} else if (isProduction) {
  console.log('   - 当前为生产环境，浏览器将以无头模式运行');
  console.log('   - 确保所有必要的环境变量已正确设置');
} else {
  console.log('   - 当前为开发环境，浏览器将显示界面');
  console.log('   - 可以通过设置环境变量调整行为');
}

console.log('\n=== 测试完成 ===\n');