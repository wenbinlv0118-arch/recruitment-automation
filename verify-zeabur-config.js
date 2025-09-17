#!/usr/bin/env node

/**
 * Zeabur环境变量配置验证脚本
 * 用于检查D-Bus错误修复所需的环境变量是否正确配置
 */

const fs = require('fs');
const path = require('path');

// 必需的D-Bus修复环境变量
const REQUIRED_DBUS_VARS = {
  'ENABLE_LOG_FILTER': 'true',
  'DISABLE_DBUS': '1',
  'NO_DBUS': '1',
  'DONT_PROMPT_WSL_INSTALL': '1'
};

// 应该移除的有问题变量
const PROBLEMATIC_VARS = [
  'DISPLAY',
  'XVFB_WHD'
];

// 必需的基础环境变量
const REQUIRED_BASE_VARS = [
  'NODE_ENV',
  'BROWSER_HEADLESS',
  'PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS',
  'CONTAINER',
  'ZEABUR'
];

/**
 * 验证环境变量配置
 */
function verifyEnvironmentConfig() {
  console.log('🔍 Zeabur D-Bus错误修复 - 环境变量配置验证\n');
  
  let hasErrors = false;
  let warnings = [];
  
  // 检查必需的D-Bus修复变量
  console.log('📋 检查D-Bus修复环境变量:');
  for (const [varName, expectedValue] of Object.entries(REQUIRED_DBUS_VARS)) {
    const actualValue = process.env[varName];
    if (!actualValue) {
      console.log(`❌ 缺失: ${varName} (应设置为: ${expectedValue})`);
      hasErrors = true;
    } else if (actualValue !== expectedValue) {
      console.log(`⚠️  错误值: ${varName}=${actualValue} (应设置为: ${expectedValue})`);
      hasErrors = true;
    } else {
      console.log(`✅ 正确: ${varName}=${actualValue}`);
    }
  }
  
  // 检查有问题的变量
  console.log('\n🚫 检查应移除的有问题变量:');
  for (const varName of PROBLEMATIC_VARS) {
    const value = process.env[varName];
    if (value) {
      console.log(`❌ 发现有问题变量: ${varName}=${value} (应删除)`);
      hasErrors = true;
    } else {
      console.log(`✅ 已正确移除: ${varName}`);
    }
  }
  
  // 检查基础环境变量
  console.log('\n🔧 检查基础环境变量:');
  for (const varName of REQUIRED_BASE_VARS) {
    const value = process.env[varName];
    if (!value) {
      console.log(`⚠️  缺失: ${varName}`);
      warnings.push(`缺失基础变量: ${varName}`);
    } else {
      console.log(`✅ 存在: ${varName}=${value}`);
    }
  }
  
  // 特殊检查：生产环境配置
  console.log('\n🏭 检查生产环境配置:');
  const nodeEnv = process.env.NODE_ENV;
  const browserHeadless = process.env.BROWSER_HEADLESS;
  const container = process.env.CONTAINER;
  
  if (nodeEnv !== 'production') {
    console.log(`⚠️  NODE_ENV=${nodeEnv} (生产环境应为: production)`);
    warnings.push('NODE_ENV不是production');
  } else {
    console.log(`✅ NODE_ENV=${nodeEnv}`);
  }
  
  if (browserHeadless !== 'true') {
    console.log(`❌ BROWSER_HEADLESS=${browserHeadless} (应设置为: true)`);
    hasErrors = true;
  } else {
    console.log(`✅ BROWSER_HEADLESS=${browserHeadless}`);
  }
  
  if (container !== 'true') {
    console.log(`❌ CONTAINER=${container} (应设置为: true)`);
    hasErrors = true;
  } else {
    console.log(`✅ CONTAINER=${container}`);
  }
  
  // 输出总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 配置验证总结:');
  
  if (!hasErrors && warnings.length === 0) {
    console.log('🎉 配置完全正确！D-Bus错误应该已经被修复。');
    console.log('\n如果仍然看到D-Bus错误，请确保:');
    console.log('1. 在Zeabur控制台中保存了环境变量');
    console.log('2. 重新部署了Backend服务');
    console.log('3. 等待部署完全完成');
  } else {
    if (hasErrors) {
      console.log('❌ 发现配置错误！需要修复以下问题:');
      console.log('\n🔧 修复步骤:');
      console.log('1. 登录Zeabur控制台');
      console.log('2. 进入项目 > Backend服务 > 环境变量');
      console.log('3. 添加/修改上述标记为❌的变量');
      console.log('4. 删除标记为🚫的有问题变量');
      console.log('5. 保存配置并重新部署服务');
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️  警告 (不影响D-Bus修复，但建议检查):');
      warnings.forEach(warning => console.log(`   - ${warning}`));
    }
  }
  
  console.log('\n📋 完整的正确配置请参考: zeabur-env-optimized.txt');
  console.log('🆘 详细修复指南请参考: ZEABUR_URGENT_DBUS_FIX.md');
  
  return !hasErrors;
}

/**
 * 生成Zeabur环境变量配置命令
 */
function generateZeaburConfig() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Zeabur环境变量快速配置命令:');
  console.log('\n复制以下变量到Zeabur控制台:');
  console.log('\n```');
  
  // 输出关键的D-Bus修复变量
  for (const [varName, value] of Object.entries(REQUIRED_DBUS_VARS)) {
    console.log(`${varName}=${value}`);
  }
  
  console.log('BROWSER_HEADLESS=true');
  console.log('CONTAINER=true');
  console.log('ZEABUR=true');
  console.log('NODE_ENV=production');
  console.log('```');
  
  console.log('\n⚠️  确保删除以下变量（如果存在）:');
  PROBLEMATIC_VARS.forEach(varName => {
    console.log(`   - ${varName}`);
  });
}

// 主执行逻辑
if (require.main === module) {
  const isValid = verifyEnvironmentConfig();
  generateZeaburConfig();
  
  process.exit(isValid ? 0 : 1);
}

module.exports = {
  verifyEnvironmentConfig,
  generateZeaburConfig,
  REQUIRED_DBUS_VARS,
  PROBLEMATIC_VARS
};