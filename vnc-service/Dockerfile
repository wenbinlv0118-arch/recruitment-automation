# VNC远程桌面服务 - 基于Ubuntu 20.04
FROM ubuntu:20.04

# 设置环境变量
ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:1
ENV VNC_PORT=5900
ENV NO_VNC_PORT=6080
ENV VNC_RESOLUTION=1280x720
ENV VNC_PASSWORD=vnc123

# 安装必要软件包
RUN apt-get update && apt-get install -y \
    xvfb \
    x11vnc \
    fluxbox \
    wget \
    curl \
    git \
    python3 \
    python3-pip \
    nodejs \
    npm \
    chromium-browser \
    firefox \
    supervisor \
    net-tools \
    && rm -rf /var/lib/apt/lists/*

# 安装noVNC
RUN git clone https://github.com/novnc/noVNC.git /opt/noVNC && \
    git clone https://github.com/novnc/websockify /opt/noVNC/utils/websockify && \
    ln -s /opt/noVNC/vnc.html /opt/noVNC/index.html

# 创建VNC密码文件
RUN mkdir -p ~/.vnc && \
    x11vnc -storepasswd $VNC_PASSWORD ~/.vnc/passwd

# 创建工作目录
WORKDIR /app

# 复制配置文件
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY start-vnc.sh /usr/local/bin/start-vnc.sh

# 设置执行权限
RUN chmod +x /usr/local/bin/start-vnc.sh

# 创建日志目录
RUN mkdir -p /var/log/supervisor

# 暴露端口
EXPOSE $VNC_PORT $NO_VNC_PORT

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$NO_VNC_PORT/ || exit 1

# 启动服务
CMD ["/usr/local/bin/start-vnc.sh"]