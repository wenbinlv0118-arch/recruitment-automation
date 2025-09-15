# 使用官方 Node.js 18 镜像作为基础镜像
FROM node:18-slim

# 安装 Playwright 所需的系统依赖和 Xvfb
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libu2f-udev \
    libvulkan1 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

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

# 暴露端口
EXPOSE 5001

# 使用启动脚本启动应用（包含Xvfb支持）
CMD ["./start-with-xvfb.sh"]