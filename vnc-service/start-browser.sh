#!/bin/bash

# 浏览器启动脚本
# 用于在VNC桌面中启动浏览器，包含X11服务就绪检查

set -e

echo "=== 启动浏览器 ==="

# 设置显示环境
export DISPLAY=:1

# 等待X11服务就绪
echo "等待X11服务就绪..."
for i in {1..30}; do
    if xdpyinfo -display :1 >/dev/null 2>&1; then
        echo "X11服务已就绪"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "错误: X11服务启动超时"
        exit 1
    fi
    echo "等待X11服务启动... ($i/30)"
    sleep 2
done

# 等待窗口管理器就绪
echo "等待窗口管理器就绪..."
sleep 5

# 检查可用的浏览器并启动
echo "检查可用的浏览器..."

if command -v chromium-browser >/dev/null 2>&1; then
    echo "启动 Chromium 浏览器..."
    chromium-browser --no-sandbox --disable-dev-shm-usage --disable-gpu \
        --disable-software-rasterizer --disable-background-timer-throttling \
        --disable-backgrounding-occluded-windows --disable-renderer-backgrounding \
        --disable-features=TranslateUI --disable-ipc-flooding-protection \
        --remote-debugging-port=9222 --window-size=1280,720 --start-maximized \
        --disable-web-security --disable-features=VizDisplayCompositor \
        --user-data-dir=/tmp/chrome-user-data 2>&1 | tee -a /var/log/supervisor/browser.log &
    BROWSER_PID=$!
    echo "Chromium 浏览器已启动，PID: $BROWSER_PID"
elif command -v google-chrome >/dev/null 2>&1; then
    echo "启动 Google Chrome 浏览器..."
    google-chrome --no-sandbox --disable-dev-shm-usage --disable-gpu \
        --disable-software-rasterizer --disable-background-timer-throttling \
        --disable-backgrounding-occluded-windows --disable-renderer-backgrounding \
        --disable-features=TranslateUI --disable-ipc-flooding-protection \
        --remote-debugging-port=9222 --window-size=1280,720 --start-maximized \
        --disable-web-security --disable-features=VizDisplayCompositor \
        --user-data-dir=/tmp/chrome-user-data 2>&1 | tee -a /var/log/supervisor/browser.log &
    BROWSER_PID=$!
    echo "Google Chrome 浏览器已启动，PID: $BROWSER_PID"
elif command -v firefox >/dev/null 2>&1; then
    echo "启动 Firefox 浏览器..."
    firefox --width=1280 --height=720 2>&1 | tee -a /var/log/supervisor/browser.log &
    BROWSER_PID=$!
    echo "Firefox 浏览器已启动，PID: $BROWSER_PID"
else
    echo "错误: 未找到可用的浏览器"
    echo "已安装的浏览器检查结果:"
    echo "  - chromium-browser: $(which chromium-browser 2>/dev/null || echo '未找到')"
    echo "  - google-chrome: $(which google-chrome 2>/dev/null || echo '未找到')"
    echo "  - firefox: $(which firefox 2>/dev/null || echo '未找到')"
    exit 1
fi

# 等待浏览器启动
echo "等待浏览器完全启动..."
sleep 5

# 检查浏览器进程是否正常运行
if kill -0 $BROWSER_PID 2>/dev/null; then
    echo "浏览器启动成功！PID: $BROWSER_PID"
    # 保持脚本运行，监控浏览器进程
    wait $BROWSER_PID
else
    echo "错误: 浏览器启动失败"
    exit 2
fi