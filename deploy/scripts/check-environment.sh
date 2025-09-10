#!/bin/bash

echo "🔍 环境检查脚本"
echo "================="

# 检查Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js: $NODE_VERSION"
else
    echo "❌ Node.js 未安装"
    echo "📥 安装方法: https://nodejs.org/"
fi

# 检查npm
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm: $NPM_VERSION"
else
    echo "❌ npm 未安装"
fi

# 检查Git
if command -v git >/dev/null 2>&1; then
    GIT_VERSION=$(git --version)
    echo "✅ Git: $GIT_VERSION"
else
    echo "❌ Git 未安装"
    echo "📥 安装方法: https://git-scm.com/"
fi

# 检查curl
if command -v curl >/dev/null 2>&1; then
    echo "✅ curl: 已安装"
else
    echo "❌ curl 未安装"
fi

# 检查项目依赖
echo ""
echo "📦 检查项目依赖..."

if [ -f "frontend/package.json" ]; then
    echo "✅ 前端项目配置存在"
    cd frontend
    if [ -d "node_modules" ]; then
        echo "✅ 前端依赖已安装"
    else
        echo "⚠️ 前端依赖未安装，运行: cd frontend && npm install"
    fi
    cd ..
else
    echo "❌ 前端项目配置不存在"
fi

if [ -f "backend/package.json" ]; then
    echo "✅ 后端项目配置存在"
    cd backend
    if [ -d "node_modules" ]; then
        echo "✅ 后端依赖已安装"
    else
        echo "⚠️ 后端依赖未安装，运行: cd backend && npm install"
    fi
    cd ..
else
    echo "❌ 后端项目配置不存在"
fi

echo ""
echo "🎯 环境检查完成"