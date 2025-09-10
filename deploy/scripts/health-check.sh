#!/bin/bash

BACKEND_URL="$1"

if [ -z "$BACKEND_URL" ]; then
    echo "❌ 请提供后端URL: ./health-check.sh <backend-url>"
    exit 1
fi

echo "🔍 检查后端健康状态..."

# 检查健康端点
response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health")

if [ "$response" = "200" ]; then
    echo "✅ 后端服务正常运行"
else
    echo "❌ 后端服务异常，HTTP状态码: $response"
    exit 1
fi

# 检查API端点
api_response=$(curl -s "$BACKEND_URL/api/health")
echo "📊 API响应: $api_response"