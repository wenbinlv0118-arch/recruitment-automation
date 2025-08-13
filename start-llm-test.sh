#!/bin/bash

echo "🚀 启动智能招聘自动化系统（LLM功能测试版）..."

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js，请先安装Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: 未找到npm，请先安装npm"
    exit 1
fi

echo "✅ Node.js和npm已安装"

# 检查后端环境变量文件
if [ ! -f "backend/.env" ]; then
    echo "❌ 错误: 后端缺少 .env 文件"
    echo "请先运行 ./fix-env.sh 修复环境变量配置"
    exit 1
fi

# 验证LLM服务配置
echo "🔍 验证LLM服务配置..."
cd backend
if node -e "require('dotenv').config(); if(!process.env.LLM_API_KEY || !process.env.LLM_API_URL) { console.error('❌ LLM环境变量配置不完整'); process.exit(1); } console.log('✅ LLM环境变量配置正确');" 2>/dev/null; then
    echo "✅ LLM服务配置验证通过"
else
    echo "❌ LLM服务配置验证失败"
    echo "请检查 .env 文件中的配置"
    exit 1
fi
cd ..

# 检查并停止占用端口的进程
echo "🔍 检查端口占用情况..."
if lsof -ti:5001 > /dev/null 2>&1; then
    echo "🛑 发现端口5001被占用，正在停止..."
    lsof -ti:5001 | xargs kill -9
    sleep 2
fi

if lsof -ti:3000 > /dev/null 2>&1; then
    echo "🛑 发现端口3000被占用，正在停止..."
    lsof -ti:3000 | xargs kill -9
    sleep 2
fi

# 启动后端服务
echo "🔧 启动后端服务..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# 等待后端服务启动
echo "⏳ 等待后端服务启动..."
sleep 8

# 检查后端服务是否启动成功
if curl -s http://localhost:5001/api/health > /dev/null; then
    echo "✅ 后端服务启动成功 (端口: 5001)"
    
    # 测试LLM服务是否可用
    echo "🧪 测试LLM服务..."
    if curl -s http://localhost:5001/api/health | grep -q "ok"; then
        echo "✅ 后端健康检查通过"
    else
        echo "⚠️  后端服务可能存在问题"
    fi
else
    echo "❌ 后端服务启动失败"
    echo "📋 请检查以下问题："
    echo "   1. 是否已修复 .env 文件配置"
    echo "   2. LLM_API_KEY 是否正确配置"
    echo "   3. 网络连接是否正常"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

# 启动前端服务
echo "🎨 启动前端服务..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

# 等待前端服务启动
echo "⏳ 等待前端服务启动..."
sleep 12

# 检查前端服务是否启动成功
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ 前端服务启动成功 (端口: 3000)"
else
    echo "❌ 前端服务启动失败"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎉 智能招聘自动化系统启动完成！"
echo "📱 前端地址: http://localhost:3000"
echo "🔧 后端地址: http://localhost:5001"
echo ""
echo "🧪 LLM功能测试说明:"
echo "1. 在浏览器中打开 http://localhost:3000"
echo "2. 在聊天界面发送任意消息"
echo "3. 系统应该能正常调用LLM API并返回响应"
echo "4. 如果看到思维链和最终回答，说明LLM功能正常"
echo ""
echo "🔧 故障排除:"
echo "- 如果LLM服务无法使用，请检查后端控制台日志"
echo "- 如果遇到端口占用，请使用 Ctrl+C 停止服务后重新运行"
echo "- 如果仍有问题，请查看 LLM_API_FIX_README.md"
echo ""
echo "按 Ctrl+C 停止服务"

# 等待用户中断
trap "echo ''; echo '🛑 正在停止服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo '✅ 服务已停止'; exit 0" INT

# 保持脚本运行
wait
