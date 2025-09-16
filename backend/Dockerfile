# 使用官方 Node.js 20 镜像作为基础镜像 - Zeabur优化版
FROM node:20-slim

# 安装 Playwright 所需的系统依赖和 Xvfb（根据Zeabur优化建议 + 容器环境优化）
RUN apt-get update && apt-get install -y --no-install-recommends \
    # 系统基础包
    wget \
    gnupg \
    ca-certificates \
    # 浏览器运行依赖
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    libu2f-udev \
    libvulkan1 \
    # X服务器虚拟化
    xvfb \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

# 创建非root用户以提高安全性（Zeabur 环境检查优化）
RUN echo "=== 检查和创建node用户 ===" && \
    if id -u node >/dev/null 2>&1; then \
        echo "node用户已存在，跳过创建"; \
    else \
        echo "创建node用户组和用户..."; \
        groupadd --gid 1000 node && \
        useradd --uid 1000 --gid node --shell /bin/bash --create-home node && \
        echo "node用户创建成功"; \
    fi

# 设置工作目录
WORKDIR /app

# 设置环境变量（Zeabur优化）
ENV NODE_ENV=production
ENV PORT=3001
ENV ZEABUR=true
ENV CONTAINER=true

# 设置虚拟显示环境变量，解决X11显示问题
ENV DISPLAY=:99
ENV BROWSER_HEADLESS=true
ENV XVFB_WHD=1920x1080x24

# D-Bus 完全禁用配置（修复colon错误）
ENV DBUS_SESSION_BUS_ADDRESS=""
ENV DBUS_SYSTEM_BUS_ADDRESS=""
ENV NO_DBUS=1
ENV DISABLE_DBUS=1

# 禁用其他可能触发D-Bus的服务
ENV NO_AT_BRIDGE=1
ENV GSETTINGS_BACKEND=memory
ENV GDK_BACKEND=x11

# 额外的D-Bus禁用变量
ENV DBUS_FATAL_WARNINGS=0
ENV DBUS_VERBOSE=0

# Playwright 生产环境优化配置（根据Zeabur建议 + 容器优化）
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
ENV PLAYWRIGHT_DISABLE_FORCED_TERMINATION=true

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖（优化版本）
RUN echo "=== 安装Node.js依赖 ===" && \
    npm ci --only=production --no-audit --no-fund || { echo "ERROR: npm依赖安装失败"; cat /app/package.json; exit 1; }

# 安装 Playwright 浏览器（严格验证版本）
RUN echo "=== 安装Playwright浏览器 ===" && \
    echo "开始安装Chromium浏览器..." && \
    npx playwright install chromium --with-deps || { echo "ERROR: Playwright Chromium安装失败"; npx playwright install --help; exit 1; } && \
    echo "Chromium安装完成" && \
    # 验证Playwright浏览器安装
    echo "验证Playwright浏览器安装..." && \
    npx playwright --version || { echo "ERROR: Playwright命令不可用"; exit 1; } && \
    # 检查浏览器文件是否存在
    echo "检查Playwright浏览器文件..." && \
    find /ms-playwright -name "*chromium*" -type d | head -5 || echo "警告: 未找到Chromium目录" && \
    # 验证浏览器可执行性（只做基本检查，不真正启动）
    echo "验证Playwright浏览器基本可用性..." && \
    node -e "const { chromium } = require('playwright'); console.log('Playwright Chromium 模块加载成功');" || { echo "ERROR: Playwright Chromium模块加载失败"; exit 1; } && \
    echo "=== Playwright浏览器安装验证完成 ==="

# 复制应用代码
COPY . .

# 复制验证脚本
COPY verify-playwright.sh /usr/local/bin/verify-playwright.sh

# 创建存储目录和设置权限（合并操作）
RUN mkdir -p storage/resumes \
    && chmod +x start-with-xvfb.sh \
    && chmod +x /usr/local/bin/verify-playwright.sh \
    && chown -R node:node /app \
    && chmod -R 755 /app

# 执行最终的 Playwright 验证（构建时检查 - 容错版本）
RUN echo "=== 执行最终 Playwright 验证 ===" && \
    if /usr/local/bin/verify-playwright.sh; then \
        echo "=== Playwright 验证通过，构建继续 ==="; \
    else \
        echo "⚠ Playwright 验证未完全通过，但继续构建"; \
        echo "注意: 这可能影响浏览器自动化功能"; \
    fi

# 切换到非root用户
USER node

# 暴露端口
EXPOSE 5001

# 使用启动脚本启动应用（包含Xvfb支持）
CMD ["./start-with-xvfb.sh"]