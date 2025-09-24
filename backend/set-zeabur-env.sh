#!/bin/bash

# 设置 Zeabur 部署所需的环境变量
export NODE_ENV=production
export ZEABUR=true
export CONTAINER=true
export BROWSER_HEADLESS=true
export ENABLE_LOG_FILTER=true
export DISABLE_DBUS=1
export NO_DBUS=1
export DONT_PROMPT_WSL_INSTALL=1

echo "✅ Zeabur 环境变量已设置"
echo "NODE_ENV: $NODE_ENV"
echo "ZEABUR: $ZEABUR"
echo "CONTAINER: $CONTAINER"
echo "BROWSER_HEADLESS: $BROWSER_HEADLESS"

# 运行测试
node test-zeabur-ready.js