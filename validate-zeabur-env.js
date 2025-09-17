#!/usr/bin/env node

/**
 * Zeabur环境变量验证脚本
 * 验证所有必需的环境变量是否正确配置
 */

const requiredVars = [
    'DISABLE_DBUS',
    'DISABLE_DEV_SHM_USAGE',
    'NO_SANDBOX',
    'DISABLE_GPU',
    'ENABLE_LOG_FILTER',
    'NODE_ENV',
    'BROWSER_HEADLESS'
];

const forbiddenVars = [
    'DISPLAY',
    'XVFB_WHD',
    'DBUS_SESSION_BUS_ADDRESS'
];

console.log('🔍 Zeabur环境变量验证');
console.log('='.repeat(50));

let hasErrors = false;

// 检查必需变量
console.log('\n📋 必需变量检查:');
requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value === '1' || value === 'true' || value === 'production') {
        console.log(`✅ ${varName}=${value}`);
    } else {
        console.log(`❌ ${varName} 未正确设置 (当前值: ${value || 'undefined'})`);
        hasErrors = true;
    }
});

// 检查禁止变量
console.log('\n🚫 禁止变量检查:');
forbiddenVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(`❌ ${varName} 应该被移除 (当前值: ${value})`);
        hasErrors = true;
    } else {
        console.log(`✅ ${varName} 已正确移除`);
    }
});

if (hasErrors) {
    console.log('\n❌ 环境变量配置存在问题，请修复后重新部署');
    process.exit(1);
} else {
    console.log('\n✅ 所有环境变量配置正确');
    process.exit(0);
}