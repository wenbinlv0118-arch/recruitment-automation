# 使用官方 Node.js 20 镜像作为基础镜像
FROM node:20-slim

# 安装 Playwright 所需的系统依赖和 Xvfb（根据Zeabur优化建议）
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
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
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# 创建非root用户以提高安全性
RUN groupadd --gid 1000 node \
  && useradd --uid 1000 --gid node --shell /bin/bash --create-home node

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3001

# 设置虚拟显示环境变量，解决X11显示问题
ENV DISPLAY=:99
ENV DBUS_SESSION_BUS_ADDRESS=/dev/null
ENV BROWSER_HEADLESS=true
ENV XVFB_WHD=1920x1080x24

# Playwright 生产环境优化配置（根据Zeabur建议）
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 安装 Playwright 浏览器
RUN npx playwright install chromium

# 复制应用代码
COPY . .

# 创建存储目录
RUN mkdir -p storage/resumes

# 给启动脚本添加执行权限
RUN chmod +x start-with-xvfb.sh

# 设置目录权限，确保node用户可以访问
RUN chown -R node:node /app
RUN chmod -R 755 /app

# 切换到非root用户
USER node

# 暴露端口
EXPOSE 5001

# 使用启动脚本启动应用（包含Xvfb支持）
CMD ["./start-with-xvfb.sh"]