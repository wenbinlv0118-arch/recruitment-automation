#!/bin/bash

# 强制Zeabur重建脚本
# 通过修改文件时间戳触发完整重建

echo "🔧 强制Zeabur重建触发..."

# 1. 修改关键文件时间戳
touch Dockerfile
touch package.json
touch .env.production

# 2. 添加构建触发器
echo "# 构建时间: $(date)" >> Dockerfile

# 3. 生成新的commit触发部署
git add .
git commit -m "trigger: 强制Zeabur完整重建 - 包含libgbm系统依赖"
git push origin-ssh develop

echo "✅ 强制重建已触发！请等待Zeabur完成完整构建"
echo "⏱️  预计构建时间：3-5分钟"
echo "📝 构建日志中应显示：'libgbm1 is already the newest version'"