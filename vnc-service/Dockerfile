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

# 安装Google Chrome（严格验证版本 - Zeabur环境）
RUN echo "=== 开始安装Google Chrome ===" && \
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - || { echo "ERROR: 无法添加Google Chrome GPG密钥"; exit 1; } && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update || { echo "ERROR: 更新软件包列表失败"; exit 1; } && \
    echo "正在安装Google Chrome..." && \
    apt-get install -y --no-install-recommends google-chrome-stable || { echo "ERROR: Google Chrome安装失败"; apt-cache policy google-chrome-stable; exit 1; } && \
    echo "Google Chrome安装完成" && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# 严格验证所有浏览器安装和创建软链接
RUN echo "=== 开始浏览器验证和软链接创建 ===" && \
    # 检查所有浏览器二进制文件是否存在
    echo "检查浏览器二进制文件..." && \
    test -f /usr/bin/chromium-browser || { echo "ERROR: Chromium浏览器二进制文件不存在: /usr/bin/chromium-browser"; ls -la /usr/bin/ | grep -i chrom; exit 1; } && \
    test -f /usr/bin/google-chrome-stable || { echo "ERROR: Google Chrome浏览器二进制文件不存在: /usr/bin/google-chrome-stable"; ls -la /usr/bin/ | grep -i chrome; exit 1; } && \
    test -f /usr/bin/firefox || { echo "ERROR: Firefox浏览器二进制文件不存在: /usr/bin/firefox"; ls -la /usr/bin/ | grep -i firefox; exit 1; } && \
    echo "所有浏览器二进制文件检查通过" && \
    # 创建软链接
    echo "创建浏览器软链接..." && \
    ln -sf /usr/bin/chromium-browser /usr/local/bin/chromium-browser && \
    ln -sf /usr/bin/google-chrome-stable /usr/local/bin/google-chrome && \
    ln -sf /usr/bin/firefox /usr/local/bin/firefox && \
    echo "软链接创建完成" && \
    # 严格验证每个浏览器版本（必须成功）
    echo "验证Google Chrome版本..." && \
    google-chrome-stable --version || { echo "ERROR: Google Chrome版本检查失败"; which google-chrome-stable; file /usr/bin/google-chrome-stable; exit 1; } && \
    echo "验证Chromium版本..." && \
    chromium-browser --version || { echo "ERROR: Chromium版本检查失败"; which chromium-browser; file /usr/bin/chromium-browser; exit 1; } && \
    echo "验证Firefox版本..." && \
    firefox --version || { echo "ERROR: Firefox版本检查失败"; which firefox; file /usr/bin/firefox; exit 1; } && \
    # 验证软链接
    echo "验证软链接..." && \
    test -L /usr/local/bin/google-chrome || { echo "ERROR: Google Chrome软链接创建失败"; exit 1; } && \
    test -L /usr/local/bin/chromium-browser || { echo "ERROR: Chromium软链接创建失败"; exit 1; } && \
    test -L /usr/local/bin/firefox || { echo "ERROR: Firefox软链接创建失败"; exit 1; } && \
    # 最终验证：通过软链接执行版本检查
    echo "通过软链接验证浏览器可执行性..." && \
    /usr/local/bin/google-chrome --version || { echo "ERROR: Google Chrome软链接不可执行"; exit 1; } && \
    /usr/local/bin/chromium-browser --version || { echo "ERROR: Chromium软链接不可执行"; exit 1; } && \
    /usr/local/bin/firefox --version || { echo "ERROR: Firefox软链接不可执行"; exit 1; } && \
    echo "=== 所有浏览器安装验证完成 ==="

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
COPY verify-browsers.sh /usr/local/bin/verify-browsers.sh

# 设置执行权限（合并命令）
RUN chmod +x /usr/local/bin/start-vnc.sh \
              /usr/local/bin/start-browser.sh \
              /usr/local/bin/test-browsers.sh \
              /usr/local/bin/diagnose-browser.sh \
              /usr/local/bin/verify-browsers.sh

# 执行最终的严格浏览器验证（构建时检查）
RUN echo "=== 执行最终浏览器验证 ===" && \
    /usr/local/bin/verify-browsers.sh || { echo "ERROR: 最终浏览器验证失败，停止构建"; exit 1; } && \
    echo "=== 所有浏览器验证通过，构建继续 ==="

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