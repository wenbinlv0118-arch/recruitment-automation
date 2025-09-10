#!/bin/bash

echo "🚀 开始部署后端到Koyeb..."

# 检查环境变量
if [ ! -f "deploy/config/.env.production" ]; then
    echo "❌ 请先创建 deploy/config/.env.production 文件"
    exit 1
fi

echo "📋 Koyeb部署步骤（最新流程）："
echo "1. 访问 https://app.koyeb.com 并使用GitHub登录"
echo "2. 点击 'Create Web Service'"
echo "3. 选择 'GitHub' 作为部署源"
echo "4. 授权并选择您的仓库 'recruitment-automation'"
echo "5. 选择 'main' 或 'develop' 分支"
echo "6. Koyeb会自动检测项目类型和配置"
echo "7. 配置服务设置："
echo "   - App name: recruitment-backend"
echo "   - 如果有Dockerfile，会自动使用Docker构建"
echo "   - 否则使用Buildpack自动检测（Node.js）"
echo "   - Port: 自动检测或设置为3001"
echo "   - Instance: Nano (512MB RAM, 0.1 vCPU)"
echo "8. 添加环境变量（从 deploy/config/.env.production 复制）"
echo "9. 点击 'Deploy' 开始部署"
echo "10. 等待构建和部署完成（通常2-5分钟）"
echo ""
echo "💡 提示：Koyeb现在支持自动检测项目配置，无需手动设置构建命令"
echo "⏳ 部署完成后，复制应用URL并更新前端配置"