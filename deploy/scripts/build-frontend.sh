#!/bin/bash

echo "🏗️ 开始构建前端..."

cd frontend

# 安装依赖
echo "📦 安装依赖..."
npm install

# 复制环境变量
if [ -f "../deploy/config/.env.production" ]; then
    cp ../deploy/config/.env.production .env.production
    echo "✅ 环境变量已配置"
else
    echo "⚠️ 未找到生产环境配置，使用默认配置"
fi

# 构建项目
echo "🔨 构建项目..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ 前端构建成功"
    echo "📁 构建文件位于: frontend/build/"
else
    echo "❌ 前端构建失败"
    exit 1
fi