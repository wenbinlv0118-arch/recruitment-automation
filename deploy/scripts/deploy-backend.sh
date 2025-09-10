#!/bin/bash

echo "🚀 开始部署后端到Koyeb..."

# 检查环境变量
if [ ! -f "deploy/config/.env.production" ]; then
    echo "❌ 请先创建 deploy/config/.env.production 文件"
    exit 1
fi

echo "📋 Koyeb部署步骤："
echo "1. 访问 https://app.koyeb.com"
echo "2. 使用GitHub账号注册/登录"
echo "3. 点击 'Create Service'"
echo "4. 选择 'Web Service'"
echo "5. 选择 'GitHub' 作为部署源"
echo "6. 选择您的仓库和 'develop' 分支"
echo "7. 配置如下："
echo "   - Service name: recruitment-backend"
echo "   - Build command: cd backend && npm install"
echo "   - Run command: cd backend && npm start"
echo "   - Port: 3001"
echo "   - Instance type: Nano (免费)"
echo "8. 添加环境变量（从 deploy/config/.env.production 复制）"
echo "9. 点击 'Deploy'"
echo ""
echo "⏳ 部署完成后，复制应用URL并更新前端配置"