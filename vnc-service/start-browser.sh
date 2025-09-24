#!/bin/bash

# 浏览器启动脚本
# 用于在VNC桌面中启动浏览器，包含X11服务就绪检查

# 不使用 set -e，手动处理错误以避免浏览器启动时的非致命错误导致脚本退出

echo "=== 启动浏览器 ==="

# 设置显示环境
export DISPLAY=:1

# 诊断信息
echo "系统诊断信息:"
echo "  - 当前用户: $(whoami)"
echo "  - 当前目录: $(pwd)"
echo "  - DISPLAY: $DISPLAY"
echo "  - 可用内存: $(free -h | grep Mem | awk '{print $7}' || echo '未知')"
echo "  - /tmp 空间: $(df -h /tmp | tail -1 | awk '{print $4}' || echo '未知')"
echo "  - 目标文件存在性: $([ -f '/usr/local/bin/index.html' ] && echo '存在' || echo '不存在')"
echo "  - 用户数据目录权限: $(ls -ld /tmp 2>/dev/null | awk '{print $1}' || echo '未知')"
echo ""

# 等待X11服务就绪
echo "等待X11服务就绪..."
for i in {1..30}; do
    if xdpyinfo -display :1 >/dev/null 2>&1; then
        echo "X11服务已就绪"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "错误: X11服务启动超时"
        # 尝试手动启动Xvfb
        echo "尝试手动启动Xvfb..."
        /usr/bin/Xvfb :1 -screen 0 1280x720x24 -ac +extension GLX +render -noreset -dpi 96 &
        sleep 5
        if xdpyinfo -display :1 >/dev/null 2>&1; then
            echo "手动启动X11服务成功"
            break
        else
            echo "手动启动X11服务失败"
            exit 1
        fi
    fi
    echo "等待X11服务启动... ($i/30)"
    sleep 0.5
done

# 等待窗口管理器就绪
echo "等待窗口管理器就绪..."
sleep 2

# 检查窗口管理器是否运行
if ! pgrep -f fluxbox >/dev/null 2>&1; then
    echo "启动窗口管理器..."
    fluxbox &
    sleep 2
fi

# 检查可用的浏览器并启动
echo "检查可用的浏览器..."

if command -v chromium-browser >/dev/null 2>&1; then
    echo "启动 Chromium 浏览器..."
    
    # 检查目标文件是否存在
    if [ ! -f "/usr/local/bin/index.html" ]; then
        echo "警告: /usr/local/bin/index.html 不存在，使用默认页面"
        TARGET_URL="about:blank"
    else
        TARGET_URL="file:///usr/local/bin/index.html"
    fi
    
    # 创建用户数据目录
    mkdir -p /tmp/chrome-user-data
    chmod 755 /tmp/chrome-user-data
    
    echo "启动参数: chromium-browser --no-sandbox --disable-dev-shm-usage --disable-gpu --window-size=1280,720 --user-data-dir=/tmp/chrome-user-data --no-first-run --no-default-browser-check $TARGET_URL"
    
    # 使用优化的启动参数
    chromium-browser --no-sandbox --disable-dev-shm-usage \
        --disable-gpu --disable-software-rasterizer \
        --disable-background-timer-throttling \
        --disable-backgrounding-occluded-windows \
        --disable-renderer-backgrounding \
        --disable-features=VizDisplayCompositor \
        --memory-pressure-off \
        --max_old_space_size=512 \
        --window-size=1280,720 \
        --user-data-dir=/tmp/chrome-user-data \
        --no-first-run --no-default-browser-check \
        --disable-extensions --disable-plugins \
        --disable-web-security --allow-running-insecure-content \
        "$TARGET_URL" \
        > /var/log/supervisor/browser.log 2>&1 &
    BROWSER_PID=$!
    echo "Chromium 浏览器已启动，PID: $BROWSER_PID"
elif command -v google-chrome-stable >/dev/null 2>&1; then
    echo "启动 Google Chrome 浏览器..."
    
    # 检查目标文件是否存在
    if [ ! -f "/usr/local/bin/index.html" ]; then
        echo "警告: /usr/local/bin/index.html 不存在，使用默认页面"
        TARGET_URL="about:blank"
    else
        TARGET_URL="file:///usr/local/bin/index.html"
    fi
    
    # 创建用户数据目录
    mkdir -p /tmp/chrome-user-data
    chmod 755 /tmp/chrome-user-data
    
    echo "启动参数: google-chrome-stable --no-sandbox --disable-dev-shm-usage --disable-gpu --window-size=1280,720 --user-data-dir=/tmp/chrome-user-data --no-first-run --no-default-browser-check $TARGET_URL"
    
    # 使用优化的启动参数
    google-chrome-stable --no-sandbox --disable-dev-shm-usage \
        --disable-gpu --disable-software-rasterizer \
        --disable-background-timer-throttling \
        --disable-backgrounding-occluded-windows \
        --disable-renderer-backgrounding \
        --disable-features=VizDisplayCompositor \
        --memory-pressure-off \
        --max_old_space_size=512 \
        --window-size=1280,720 \
        --user-data-dir=/tmp/chrome-user-data \
        --no-first-run --no-default-browser-check \
        --disable-extensions --disable-plugins \
        "$TARGET_URL" \
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
    echo "  - google-chrome-stable: $(which google-chrome-stable 2>/dev/null || echo '未找到')"
    echo "  - firefox: $(which firefox 2>/dev/null || echo '未找到')"
    exit 1
fi

# 等待浏览器启动
echo "等待浏览器完全启动..."
sleep 2

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