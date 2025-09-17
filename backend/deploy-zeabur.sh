#!/bin/bash

# Zeabur部署脚本
# 确保在Linux容器环境中正确配置Puppeteer

set -e

echo "🚀 开始Zeabur部署准备..."

# 更新系统包
apt-get update

# 安装Puppeteer所需的依赖
apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libxss1 \
  libxtst6 \
  xdg-utils \
  libgbm-dev \
  libxshmfence-dev \
  libglu1-mesa-dev \
  libgles2-mesa-dev \
  xvfb

# 设置环境变量
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
export PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# 安装Node.js依赖
echo "📦 安装Node.js依赖..."
npm install

# 验证Puppeteer安装
echo "🔍 验证Puppeteer配置..."
node -e "
const puppeteer = require('puppeteer');
console.log('✅ Puppeteer版本:', require('puppeteer/package.json').version);
"

# 运行部署就绪检查
echo "🧪 运行部署就绪检查..."
node test-zeabur-ready.js

# 运行Puppeteer迁移检查
echo "🔄 运行Puppeteer迁移检查..."
node check-puppeteer-migration.js

echo "✅ Zeabur部署准备完成！"
echo "🎯 可以开始构建和部署..."