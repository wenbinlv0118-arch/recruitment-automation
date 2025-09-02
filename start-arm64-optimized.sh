#!/bin/bash
# ARM64优化启动脚本
# 使用优化的V8参数启动Node.js应用

export NODE_OPTIONS="--max-old-space-size=4096 --expose-gc"

echo "🚀 使用ARM64优化参数启动应用..."
echo "V8参数: $NODE_OPTIONS"

# 启动后端服务
cd backend
npm start &
BACKEND_PID=$!

# 启动前端服务
cd ../frontend
npm start &
FRONTEND_PID=$!

echo "✅ 应用已启动"
echo "后端PID: $BACKEND_PID"
echo "前端PID: $FRONTEND_PID"

# 等待用户输入以停止服务
read -p "按Enter键停止服务..."

kill $BACKEND_PID $FRONTEND_PID
echo "🛑 服务已停止"
