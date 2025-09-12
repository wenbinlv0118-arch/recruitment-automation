#!/bin/bash

# 浏览器启动脚本
# 用于在VNC桌面中启动浏览器，包含X11服务就绪检查

# 不使用 set -e，手动处理错误以避免浏览器启动时的非致命错误导致脚本退出

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
    # 使用更简化的启动参数，避免可能导致退出状态2的问题
    chromium-browser --no-sandbox --disable-dev-shm-usage \
        --disable-gpu --disable-software-rasterizer \
        --window-size=1280,720 --start-maximized \
        --user-data-dir=/tmp/chrome-user-data \
        --disable-web-security --disable-features=VizDisplayCompositor \
        --no-first-run --no-default-browser-check \
        file:///usr/local/bin/index.html \
        > /var/log/supervisor/browser.log 2>&1 &
    BROWSER_PID=$!
    echo "Chromium 浏览器已启动，PID: $BROWSER_PID"
elif command -v google-chrome >/dev/null 2>&1; then
    echo "启动 Google Chrome 浏览器..."
    google-chrome --no-sandbox --disable-dev-shm-usage \
        --disable-gpu --disable-software-rasterizer \
        --window-size=1280,720 --start-maximized \
        --user-data-dir=/tmp/chrome-user-data \
        --disable-web-security --disable-features=VizDisplayCompositor \
        --no-first-run --no-default-browser-check \
        file:///usr/local/bin/index.html \
        > /var/log/supervisor/browser.log 2>&1 &
    BROWSER_PID=$!
    echo "Google Chrome 浏览器已启动，PID: $BROWSER_PID"
elif command -v firefox >/dev/null 2>&1; then
    echo "启动 Firefox 浏览器..."
    firefox --width=1280 --height=720 --no-remote \
        file:///usr/local/bin/index.html \
        > /var/log/supervisor/browser.log 2>&1 &
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
sleep 3

# 检查浏览器进程是否正常运行
if kill -0 $BROWSER_PID 2>/dev/null; then
    echo "浏览器启动成功！PID: $BROWSER_PID"
    echo "浏览器日志文件: /var/log/supervisor/browser.log"
    
    # 持续监控浏览器进程
    while kill -0 $BROWSER_PID 2>/dev/null; do
        sleep 10
    done
    
    echo "浏览器进程已退出，PID: $BROWSER_PID"
    # 检查退出状态
    wait $BROWSER_PID
    EXIT_CODE=$?
    echo "浏览器退出状态码: $EXIT_CODE"
    
    # 如果是正常退出，返回0；否则返回1
    if [ $EXIT_CODE -eq 0 ]; then
        exit 0
    else
        echo "浏览器异常退出，查看日志: /var/log/supervisor/browser.log"
        exit 1
    fi
else
    echo "错误: 浏览器启动失败，PID: $BROWSER_PID"
    echo "查看日志文件: /var/log/supervisor/browser.log"
    exit 2
fi