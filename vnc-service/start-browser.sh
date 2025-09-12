#!/bin/bash

# 浏览器启动脚本
# 用于在VNC桌面中手动启动浏览器

set -e

echo "=== 启动浏览器 ==="

# 设置显示环境
export DISPLAY=:1

# 检查可用的浏览器并启动
if command -v chromium-browser >/dev/null 2>&1; then
    echo "启动 Chromium 浏览器..."
    chromium-browser --no-sandbox --disable-dev-shm-usage --disable-gpu \
        --disable-software-rasterizer --disable-background-timer-throttling \
        --disable-backgrounding-occluded-windows --disable-renderer-backgrounding \
        --disable-features=TranslateUI --disable-ipc-flooding-protection \
        --window-size=1280,720 --start-maximized &
elif command -v google-chrome >/dev/null 2>&1; then
    echo "启动 Google Chrome 浏览器..."
    google-chrome --no-sandbox --disable-dev-shm-usage --disable-gpu \
        --disable-software-rasterizer --disable-background-timer-throttling \
        --disable-backgrounding-occluded-windows --disable-renderer-backgrounding \
        --disable-features=TranslateUI --disable-ipc-flooding-protection \
        --window-size=1280,720 --start-maximized &
elif command -v firefox >/dev/null 2>&1; then
    echo "启动 Firefox 浏览器..."
    firefox --width=1280 --height=720 &
else
    echo "错误: 未找到可用的浏览器"
    echo "可用命令:"
    echo "  - chromium-browser"
    echo "  - google-chrome"
    echo "  - firefox"
    exit 1
fi

echo "浏览器启动完成！"