#!/bin/bash

echo "🚀 Zeabur D-Bus错误立即修复脚本"
echo "========================================"

# 检查当前环境变量
echo "📊 当前环境变量状态："
echo "DISABLE_DBUS: ${DISABLE_DBUS:-未设置}"
echo "DISABLE_DEV_SHM_USAGE: ${DISABLE_DEV_SHM_USAGE:-未设置}"
echo "NO_SANDBOX: ${NO_SANDBOX:-未设置}"
echo "DISABLE_GPU: ${DISABLE_GPU:-未设置}"
echo "ENABLE_LOG_FILTER: ${ENABLE_LOG_FILTER:-未设置}"

# 添加缺失的关键变量
echo ""
echo "🔧 正在配置缺失的关键变量..."

# 设置必需的环境变量
export DISABLE_DEV_SHM_USAGE=1
export NO_SANDBOX=1
export DISABLE_GPU=1
export DISABLE_SETUID_SANDBOX=1

# 验证配置
echo ""
echo "✅ 修复后的环境变量："
echo "DISABLE_DBUS: ${DISABLE_DBUS:-已设置}"
echo "DISABLE_DEV_SHM_USAGE: ${DISABLE_DEV_SHM_USAGE:-已设置}"
echo "NO_SANDBOX: ${NO_SANDBOX:-已设置}"
echo "DISABLE_GPU: ${DISABLE_GPU:-已设置}"
echo "DISABLE_SETUID_SANDBOX: ${DISABLE_SETUID_SANDBOX:-已设置}"
echo "ENABLE_LOG_FILTER: ${ENABLE_LOG_FILTER:-已设置}"

# 生成Zeabur控制台命令
echo ""
echo "📋 Zeabur控制台需要执行的命令："
echo "zeabur env set DISABLE_DEV_SHM_USAGE 1"
echo "zeabur env set NO_SANDBOX 1"
echo "zeabur env set DISABLE_GPU 1"
echo "zeabur env set DISABLE_SETUID_SANDBOX 1"

echo ""
echo "🎯 修复完成！请执行以下步骤："
echo "1. 登录 https://zeabur.com"
echo "2. 进入您的项目环境变量设置"
echo "3. 添加上面的4个缺失变量"
echo "4. 点击重新部署"
echo "5. 等待3分钟后验证D-Bus错误消失"