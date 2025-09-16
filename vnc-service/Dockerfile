# VNC远程桌面服务 - 基于Ubuntu 20.04 - Zeabur优化版
FROM ubuntu:20.04

# 设置环境变量
ENV DEBIAN_FRONTEND=noninteractive
ENV DISPLAY=:1
ENV VNC_PORT=5900
ENV NO_VNC_PORT=6080
ENV VNC_RESOLUTION=1280x720
ENV VNC_PASSWORD=vnc123
ENV LANG=zh_CN.UTF-8
ENV LANGUAGE=zh_CN:zh
ENV LC_ALL=zh_CN.UTF-8
# Zeabur环境优化
ENV NODE_ENV=production
ENV ZEABUR=true
ENV CONTAINER=true

# 安装必要软件包（优化安装顺序和减少层数）
RUN apt-get update && apt-get install -y --no-install-recommends \
    # 系统基础包
    ca-certificates \
    gnupg \
    software-properties-common \
    wget \
    curl \
    git \
    supervisor \
    net-tools \
    # X服务和VNC
    xvfb \
    x11vnc \
    fluxbox \
    x11-utils \
    x11-xserver-utils \
    # 开发环境
    python3 \
    python3-pip \
    nodejs \
    npm \
    # 浏览器（先安装依赖）
    chromium-browser \
    firefox \
    # 中文支持
    fonts-noto-cjk \
    fonts-noto-cjk-extra \
    fonts-wqy-zenhei \
    fonts-wqy-microhei \
    language-pack-zh-hans \
    locales \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 配置中文locale
RUN locale-gen zh_CN.UTF-8 && \
    update-locale LANG=zh_CN.UTF-8

# 安装Google Chrome（针对Zeabur环境优化）
RUN wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends google-chrome-stable && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# 创建浏览器软链接以确保路径正确（优化版本）
RUN ln -sf /usr/bin/chromium-browser /usr/local/bin/chromium-browser && \
    ln -sf /usr/bin/google-chrome-stable /usr/local/bin/google-chrome && \
    ln -sf /usr/bin/firefox /usr/local/bin/firefox && \
    # 验证浏览器安装
    google-chrome-stable --version && \
    chromium-browser --version && \
    firefox --version && \
    echo "所有浏览器软链接创建完成"

# 安装noVNC（优化版本）
RUN git clone --depth 1 https://github.com/novnc/noVNC.git /opt/noVNC && \
    git clone --depth 1 https://github.com/novnc/websockify /opt/noVNC/utils/websockify && \
    ln -s /opt/noVNC/vnc.html /opt/noVNC/index.html

# 创建VNC密码文件和目录结构（Zeabur优化）
RUN mkdir -p ~/.vnc /tmp/chrome-user-data /dev/shm /var/log/supervisor && \
    x11vnc -storepasswd $VNC_PASSWORD ~/.vnc/passwd && \
    chmod 755 /tmp/chrome-user-data && \
    chmod 1777 /dev/shm && \
    echo "VNC和目录初始化完成"

# 创建工作目录
WORKDIR /app

# 复制配置文件（优化顺序）
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY start-vnc.sh /usr/local/bin/start-vnc.sh
COPY start-browser.sh /usr/local/bin/start-browser.sh
COPY index.html /usr/local/bin/index.html
COPY test-browsers.sh /usr/local/bin/test-browsers.sh
COPY diagnose-browser.sh /usr/local/bin/diagnose-browser.sh

# 设置执行权限（合并命令）
RUN chmod +x /usr/local/bin/start-vnc.sh \
              /usr/local/bin/start-browser.sh \
              /usr/local/bin/test-browsers.sh \
              /usr/local/bin/diagnose-browser.sh

# 暴露端口（Zeabur环境适配）
EXPOSE $VNC_PORT $NO_VNC_PORT

# 健康检查（优化版本）
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:$NO_VNC_PORT/ || nc -z localhost $VNC_PORT || exit 1

# 创建数据目录和设置权限（Zeabur环境优化）
RUN mkdir -p /data && chown -R root:root /data
VOLUME ["/data"]

# 启动服务
CMD ["/usr/local/bin/start-vnc.sh"]