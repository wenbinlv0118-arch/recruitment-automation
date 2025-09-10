#!/bin/bash

set -e

echo "🚀 智能招聘系统一键部署脚本"
echo "================================"

# 检查必要工具
command -v node >/dev/null 2>&1 || { echo "❌ 请先安装 Node.js"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ 请先安装 Git"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "❌ 请先安装 curl"; exit 1; }

echo "✅ 环境检查通过"

# 创建必要目录
mkdir -p deploy/config
mkdir -p deploy/scripts
mkdir -p deploy/logs

# 检查配置文件
if [ ! -f "deploy/config/.env.production" ]; then
    echo "⚠️ 未找到生产环境配置文件"
    echo "📝 请先完成以下步骤："
    echo "1. 运行: ./deploy/scripts/get-supabase-config.sh"
    echo "2. 创建 deploy/config/.env.production 文件"
    echo "3. 填入所有必要的环境变量"
    exit 1
fi

echo "📋 开始部署流程..."

# 步骤1: 构建前端
echo "🏗️ 步骤1: 构建前端"
./deploy/scripts/build-frontend.sh

# 步骤2: 部署提示
echo "🚀 步骤2: 部署后端"
echo "请按照以下脚本的指引完成后端部署："
./deploy/scripts/deploy-backend.sh

echo ""
read -p "后端部署完成后，请输入后端URL: " BACKEND_URL

if [ -n "$BACKEND_URL" ]; then
    echo "🔍 测试后端连接..."
    ./deploy/scripts/health-check.sh "$BACKEND_URL"
fi

# 步骤3: 前端部署提示
echo "🌐 步骤3: 部署前端"
./deploy/scripts/deploy-frontend.sh

# 步骤4: 域名配置提示
echo "🌍 步骤4: 配置域名"
./deploy/scripts/setup-domain.sh

echo ""
echo "🎉 部署脚本执行完成！"
echo "📝 请按照上述指引完成手动配置步骤"
echo "📊 部署日志保存在: deploy/logs/"