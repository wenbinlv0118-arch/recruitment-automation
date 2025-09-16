#!/bin/bash

# VNC远程桌面服务启动脚本
# 用于在Docker容器中启动VNC服务器和noVNC Web客户端

set -e

echo "=== VNC远程桌面服务启动 ==="
echo "VNC端口: $VNC_PORT"
echo "noVNC Web端口: $NO_VNC_PORT"
echo "分辨率: $VNC_RESOLUTION"
echo "显示器: $DISPLAY"

# 设置显示环境
export DISPLAY=:1

# 创建必要的目录
mkdir -p /tmp/.X11-unix
chmod 1777 /tmp/.X11-unix

# 创建VNC密码文件（如果不存在）
if [ ! -f ~/.vnc/passwd ]; then
    mkdir -p ~/.vnc
    echo "创建VNC密码文件..."
    x11vnc -storepasswd $VNC_PASSWORD ~/.vnc/passwd
fi

# 检查和配置浏览器（严格验证版本）
echo "执行浏览器验证..."
if [ -f "/usr/local/bin/verify-browsers.sh" ]; then
    echo "运行浏览器验证脚本..."
    if ! /usr/local/bin/verify-browsers.sh; then
        echo "✗ 浏览器验证失败，但尝试继续启动..."
        # 记录验证失败，但不停止服务
        echo "警告: 浏览器验证失败，可能影响浏览器自动化功能" > /var/log/browser-validation-warning.log
    else
        echo "✓ 浏览器验证通过"
    fi
else
    echo "警告: 浏览器验证脚本不存在，跳过验证"
fi

echo "检查浏览器可用性..."
if command -v chromium-browser >/dev/null 2>&1; then
    echo "✓ 找到 chromium-browser"
    BROWSER_CMD="chromium-browser"
elif command -v google-chrome >/dev/null 2>&1; then
    echo "✓ 找到 google-chrome"
    BROWSER_CMD="google-chrome"
elif command -v firefox >/dev/null 2>&1; then
    echo "✓ 找到 firefox"
    BROWSER_CMD="firefox"
else
    echo "⚠ 未找到可用的浏览器，尝试安装..."
    apt-get update && apt-get install -y chromium-browser
    BROWSER_CMD="chromium-browser"
fi

echo "使用浏览器: $BROWSER_CMD"

# 检查端口是否可用
echo "检查端口可用性..."
if netstat -tuln | grep -q ":$VNC_PORT "; then
    echo "警告: VNC端口 $VNC_PORT 已被占用"
fi

if netstat -tuln | grep -q ":$NO_VNC_PORT "; then
    echo "警告: noVNC端口 $NO_VNC_PORT 已被占用"
fi

# 启动supervisor管理所有服务
echo "启动supervisor服务管理器..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf