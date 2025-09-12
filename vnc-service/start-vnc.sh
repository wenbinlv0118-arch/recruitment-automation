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