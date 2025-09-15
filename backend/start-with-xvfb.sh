#!/bin/bash

# 启动脚本：在Docker容器中启动Xvfb和Node.js应用
# 用于生产环境的无头浏览器支持

set -e

echo "启动 Xvfb 虚拟显示服务器..."
# 启动 Xvfb 虚拟显示服务器
Xvfb :99 -screen 0 ${XVFB_WHD:-1920x1080x24} -ac +extension GLX +render -noreset &
XVFB_PID=$!

# 等待 Xvfb 启动
sleep 2

echo "Xvfb 已启动，PID: $XVFB_PID"
echo "显示环境: $DISPLAY"
echo "浏览器无头模式: $BROWSER_HEADLESS"

# 清理函数
cleanup() {
    echo "正在关闭 Xvfb..."
    kill $XVFB_PID 2>/dev/null || true
    exit
}

# 设置信号处理
trap cleanup SIGTERM SIGINT

echo "启动 Node.js 应用..."
# 启动 Node.js 应用
npm start &
NODE_PID=$!

# 等待任一进程退出
wait $NODE_PID

# 清理
cleanup