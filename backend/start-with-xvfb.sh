#!/bin/bash

# 启动脚本：在Docker容器中启动Xvfb和Node.js应用
# 用于生产环境的无头浏览器支持

set -e

echo "=== 后端服务启动脚本 - Zeabur优化版 ==="

# 禁用D-Bus服务
echo "=== 禁用D-Bus服务 ==="

# 确保D-Bus相关目录不存在或不可访问
rm -rf /run/dbus 2>/dev/null || true
rm -rf /var/run/dbus 2>/dev/null || true

# 设置D-Bus环境变量（修复colon错误）
export DBUS_SESSION_BUS_ADDRESS=""
export DBUS_SYSTEM_BUS_ADDRESS=""
export NO_DBUS=1
export DISABLE_DBUS=1
export NO_AT_BRIDGE=1
export GSETTINGS_BACKEND=memory
export GDK_BACKEND=x11

# 额外的D-Bus禁用变量
export DBUS_FATAL_WARNINGS=0
export DBUS_VERBOSE=0

echo "D-Bus服务已完全禁用"

# 执行 Playwright 验证
echo "执行 Playwright 验证..."
if [ -f "/usr/local/bin/verify-playwright.sh" ]; then
    echo "运行 Playwright 验证脚本..."
    if ! /usr/local/bin/verify-playwright.sh; then
        echo "⚠ Playwright 验证失败，但尝试继续启动..."
        # 记录验证失败，但不停止服务
        echo "警告: Playwright 验证失败，可能影响浏览器自动化功能" > /tmp/playwright-validation-warning.log
    else
        echo "✓ Playwright 验证通过"
    fi
else
    echo "警告: Playwright 验证脚本不存在，跳过验证"
fi

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