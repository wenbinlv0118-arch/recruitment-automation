#!/bin/bash

echo "🔍 部署验证脚本"
echo "==============="

FRONTEND_URL="$1"
BACKEND_URL="$2"

if [ -z "$FRONTEND_URL" ] || [ -z "$BACKEND_URL" ]; then
    echo "❌ 用法: ./verify-deployment.sh <frontend-url> <backend-url>"
    echo "📝 示例: ./verify-deployment.sh https://your-domain.eu.org https://your-backend.koyeb.app"
    exit 1
fi

echo "🌐 验证前端: $FRONTEND_URL"
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$frontend_status" = "200" ]; then
    echo "✅ 前端访问正常"
else
    echo "❌ 前端访问异常，状态码: $frontend_status"
fi

echo "🚀 验证后端: $BACKEND_URL"
backend_status=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health")
if [ "$backend_status" = "200" ]; then
    echo "✅ 后端服务正常"
else
    echo "❌ 后端服务异常，状态码: $backend_status"
fi

echo "🔗 验证API连接"
api_response=$(curl -s "$BACKEND_URL/api/health" | head -c 100)
if [ -n "$api_response" ]; then
    echo "✅ API响应正常: $api_response"
else
    echo "❌ API无响应"
fi

echo "🌍 验证CORS配置"
cors_test=$(curl -s -H "Origin: $FRONTEND_URL" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: Content-Type" -X OPTIONS "$BACKEND_URL/api/health")
echo "📊 CORS测试完成"

echo ""
echo "🎯 验证完成"
echo "📝 如有问题，请检查："
echo "1. 环境变量配置是否正确"
echo "2. 域名DNS是否生效"
echo "3. 服务是否正常启动"