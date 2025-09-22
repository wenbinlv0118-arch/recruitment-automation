FROM node:20-slim

# 安装必要依赖
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget gnupg ca-certificates fonts-liberation libappindicator3-1 \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 \
    libdbus-1-3 libdrm2 libexpat1 libfontconfig1 libgbm1 libgcc1 \
    libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 \
    libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \
    libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 \
    libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release \
    xdg-utils libu2f-udev libvulkan1 xvfb \
    && rm -rf /var/lib/apt/lists/* && apt-get clean

# 强制禁用D-Bus
RUN systemctl disable dbus 2>/dev/null || true \
    && systemctl mask dbus 2>/dev/null || true \
    && rm -rf /run/dbus /var/run/dbus \
    && mkdir -p /run/dbus \
    && chmod 000 /run/dbus

# 设置工作目录
WORKDIR /app

# 强制环境变量
ENV NODE_ENV=production
ENV PORT=3001
ENV BROWSER_HEADLESS=true

# D-Bus完全禁用
ENV DISABLE_DBUS=1
ENV DISABLE_DEV_SHM_USAGE=1
ENV NO_SANDBOX=1
ENV DISABLE_GPU=1
ENV ENABLE_LOG_FILTER=1
ENV DBUS_SESSION_BUS_ADDRESS=""
ENV DBUS_SYSTEM_BUS_ADDRESS=""
ENV NO_DBUS=1
ENV NO_AT_BRIDGE=1
ENV GSETTINGS_BACKEND=memory
ENV GDK_BACKEND=x11

# 复制和安装依赖
COPY package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# 安装Playwright
RUN npx playwright install chromium --with-deps

# 复制应用代码
COPY . .

EXPOSE 3001
CMD ["npm", "start"]
# 构建时间: Wed Sep 17 16:13:05 CST 2025
