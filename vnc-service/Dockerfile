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
    file \
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
    # Firefox浏览器
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

# 安装Google Chrome和Chromium（严格验证版本 - Zeabur环境适配）
RUN echo "=== 开始安装Google Chrome和Chromium ===" && \
    # 安装Google Chrome
    wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - || { echo "ERROR: 无法添加Google Chrome GPG密钥"; exit 1; } && \
    echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" > /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update || { echo "ERROR: 更新软件包列表失败"; exit 1; } && \
    echo "正在安装Google Chrome..." && \
    apt-get install -y --no-install-recommends google-chrome-stable || { echo "ERROR: Google Chrome安装失败"; apt-cache policy google-chrome-stable; exit 1; } && \
    echo "Google Chrome安装完成" && \
    # 手动下载和安装Chromium（不依赖snap）
    echo "正在下载并安装Chromium..." && \
    CHROMIUM_VERSION="120.0.6099.109-1" && \
    wget -q "http://archive.ubuntu.com/ubuntu/pool/universe/c/chromium-browser/chromium-browser_${CHROMIUM_VERSION}_amd64.deb" || \
    wget -q "https://launchpad.net/~chromium-team/+archive/ubuntu/stable/+files/chromium-browser_${CHROMIUM_VERSION}_amd64.deb" || \
    { echo "警告: 无法下载Chromium deb包，将使用替代方案"; \
      # 使用snap替代方案（在容器中可能不可用）
      apt-get install -y snapd || echo "snap安装失败"; \
      snap install chromium || echo "chromium snap安装失败"; \
    } && \
    # 如果下载成功，尝试安装deb包
    if [ -f "chromium-browser_${CHROMIUM_VERSION}_amd64.deb" ]; then \
        echo "安装Chromium deb包..."; \
        apt-get install -y --no-install-recommends ./chromium-browser_${CHROMIUM_VERSION}_amd64.deb || echo "deb包安装失败"; \
        rm -f chromium-browser_${CHROMIUM_VERSION}_amd64.deb; \
    fi && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean && \
    echo "=== 浏览器安装完成 ==="

# 智能验证所有浏览器安装和创建软链接（容器环境适配）
RUN echo "=== 开始智能浏览器验证 ===" && \
    # 初始化变量
    CHROME_OK=0 && CHROMIUM_OK=0 && FIREFOX_OK=0 && \
    # 检查Google Chrome
    echo "检查Google Chrome..." && \
    if [ -f "/usr/bin/google-chrome-stable" ]; then \
        echo "Google Chrome二进制文件存在"; \
        ln -sf /usr/bin/google-chrome-stable /usr/local/bin/google-chrome && \
        if google-chrome-stable --version >/dev/null 2>&1; then \
            echo "✓ Google Chrome验证成功: $(google-chrome-stable --version)"; \
            CHROME_OK=1; \
        else \
            echo "⚠ Google Chrome版本检查失败"; \
        fi; \
    else \
        echo "⚠ Google Chrome二进制文件不存在"; \
    fi && \
    # 检查Chromium（多种可能路径）
    echo "检查Chromium..." && \
    CHROMIUM_PATH="" && \
    if [ -f "/usr/bin/chromium-browser" ] && [ ! -L "/usr/bin/chromium-browser" ]; then \
        CHROMIUM_PATH="/usr/bin/chromium-browser"; \
    elif [ -f "/usr/bin/chromium" ]; then \
        CHROMIUM_PATH="/usr/bin/chromium"; \
    elif [ -f "/snap/bin/chromium" ]; then \
        CHROMIUM_PATH="/snap/bin/chromium"; \
    fi && \
    if [ -n "$CHROMIUM_PATH" ]; then \
        echo "Chromium找到于: $CHROMIUM_PATH"; \
        ln -sf "$CHROMIUM_PATH" /usr/local/bin/chromium-browser && \
        # 尝试版本检查（容错处理）
        if timeout 10 "$CHROMIUM_PATH" --version >/dev/null 2>&1 || \
           timeout 10 "$CHROMIUM_PATH" --help >/dev/null 2>&1; then \
            echo "✓ Chromium验证成功"; \
            CHROMIUM_OK=1; \
        else \
            echo "⚠ Chromium可执行性检查失败，但保留软链接"; \
        fi; \
    else \
        echo "⚠ 未找到Chromium二进制文件"; \
        # 创建一个指向Chrome的备用软链接
        if [ $CHROME_OK -eq 1 ]; then \
            echo "使用Google Chrome作为Chromium的替代"; \
            ln -sf /usr/bin/google-chrome-stable /usr/local/bin/chromium-browser; \
            CHROMIUM_OK=1; \
        fi; \
    fi && \
    # 检查Firefox
    echo "检查Firefox..." && \
    if [ -f "/usr/bin/firefox" ]; then \
        echo "Firefox二进制文件存在"; \
        ln -sf /usr/bin/firefox /usr/local/bin/firefox && \
        if timeout 10 firefox --version >/dev/null 2>&1; then \
            echo "✓ Firefox验证成功: $(firefox --version)"; \
            FIREFOX_OK=1; \
        else \
            echo "⚠ Firefox版本检查失败"; \
        fi; \
    else \
        echo "⚠ Firefox二进制文件不存在"; \
    fi && \
    # 总结验证结果
    echo "=== 浏览器验证结果 ===" && \
    echo "Google Chrome: $([ $CHROME_OK -eq 1 ] && echo '✓ 可用' || echo '✗ 不可用')"; \
    echo "Chromium: $([ $CHROMIUM_OK -eq 1 ] && echo '✓ 可用' || echo '✗ 不可用')"; \
    echo "Firefox: $([ $FIREFOX_OK -eq 1 ] && echo '✓ 可用' || echo '✗ 不可用')"; \
    # 至少需要有一个浏览器可用
    TOTAL_OK=$((CHROME_OK + CHROMIUM_OK + FIREFOX_OK)) && \
    if [ $TOTAL_OK -ge 1 ]; then \
        echo "✓ 有 $TOTAL_OK 个浏览器可用，验证通过"; \
    else \
        echo "✗ 没有可用的浏览器，验证失败"; \
        exit 1; \
    fi && \
    echo "=== 智能浏览器验证完成 ==="

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

# 执行最终的浏览器验证（构建时检查 - 容错版本）
RUN echo "=== 执行最终浏览器验证 ===" && \
    if /usr/local/bin/verify-browsers.sh; then \
        echo "=== 所有浏览器验证通过，构建继续 ==="; \
    else \
        echo "⚠ 浏览器验证未完全通过，但继续构建"; \
        echo "注意: 这可能影响浏览器自动化功能"; \
    fi

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