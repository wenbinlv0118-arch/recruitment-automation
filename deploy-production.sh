#!/bin/bash
# 生产环境部署脚本
# 自动生成于 2025/9/8 17:52:04

set -e

echo "🚀 开始部署到生产环境..."

# 检查依赖
echo "📦 检查依赖..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi

# 安装依赖
echo "📦 安装前端依赖..."
cd frontend
npm ci

echo "📦 安装后端依赖..."
cd ../backend
npm ci

cd ..

# 生成环境变量
echo "⚙️  生成环境变量..."
node deployment-config.js generate-env production

# 构建前端
echo "🏗️  构建前端..."
cd frontend
npm run build

# 部署
echo "🚀 开始部署..."
if [ "vercel" = "vercel" ]; then
    echo "部署到 Vercel..."
    npx vercel --prod
elif [ "vercel" = "netlify" ]; then
    echo "部署到 Netlify..."
    npx netlify deploy --prod
fi

echo "✅ 部署完成！"
echo "🌐 前端地址: https://your-app.vercel.app"
echo "⚙️  后端地址: https://your-functions.netlify.app"
