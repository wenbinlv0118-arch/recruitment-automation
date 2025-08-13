#!/bin/bash

echo "🔧 修复环境变量配置问题..."

cd backend

# 检查.env文件是否存在
if [ ! -f ".env" ]; then
    echo "❌ 错误: .env 文件不存在"
    exit 1
fi

echo "✅ 找到 .env 文件"

# 备份原始文件
cp .env .env.backup
echo "📋 已备份原始 .env 文件为 .env.backup"

# 修复环境变量名称
echo "🔧 修复环境变量名称..."

# 将 LLM_BASE_URL 替换为 LLM_API_URL
sed -i '' 's/LLM_BASE_URL=/LLM_API_URL=/g' .env

echo "✅ 已将 LLM_BASE_URL 替换为 LLM_API_URL"

# 验证修复结果
echo "🔍 验证修复结果..."
echo "LLM_API_KEY: $(grep '^LLM_API_KEY=' .env | cut -d'=' -f2)"
echo "LLM_API_URL: $(grep '^LLM_API_URL=' .env | cut -d'=' -f2)"
echo "LLM_MODEL: $(grep '^LLM_MODEL=' .env | cut -d'=' -f2)"

echo ""
echo "🎉 环境变量配置修复完成！"
echo "📝 现在可以重新启动后端服务了"
echo ""
echo "💡 修复内容："
echo "   - 将 LLM_BASE_URL 重命名为 LLM_API_URL"
echo "   - 保持其他配置不变"
echo ""
echo "🔄 如需恢复原始配置，请运行："
echo "   cp .env.backup .env"
