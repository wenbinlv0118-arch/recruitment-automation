# VNC远程桌面服务部署指南

## 概述

本指南介绍如何在Zeabur平台上部署VNC远程桌面服务，以支持智能寻聘系统的实时监控功能。

## 架构设计

### 服务组件
- **VNC服务器**: 提供远程桌面环境
- **noVNC Web客户端**: 基于Web的VNC查看器
- **浏览器环境**: 在VNC中运行的浏览器实例

### 端口配置
- **5900**: VNC服务器端口
- **6080**: noVNC Web访问端口

## Zeabur部署配置

### 1. VNC服务Docker配置

创建 `vnc-service/Dockerfile`:

```dockerfile
# 基于Ubuntu 20.04
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
    && rm -rf /var/lib/apt/lists/*

# 安装noVNC
RUN git clone https://github.com/novnc/noVNC.git /opt/noVNC \
    && git clone https://github.com/novnc/websockify /opt/noVNC/utils/websockify

# 创建VNC密码文件
RUN mkdir -p ~/.vnc && \
    x11vnc -storepasswd $VNC_PASSWORD ~/.vnc/passwd

# 配置supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# 创建启动脚本
COPY start-vnc.sh /usr/local/bin/start-vnc.sh
RUN chmod +x /usr/local/bin/start-vnc.sh

# 暴露端口
EXPOSE $VNC_PORT $NO_VNC_PORT

# 启动服务
CMD ["/usr/local/bin/start-vnc.sh"]
```

### 2. Supervisor配置

创建 `vnc-service/supervisord.conf`:

```ini
[supervisord]
nodaemon=true
user=root

[program:xvfb]
command=/usr/bin/Xvfb :1 -screen 0 %(ENV_VNC_RESOLUTION)sx24
autorestart=true
stdout_logfile=/var/log/xvfb.log
stderr_logfile=/var/log/xvfb.log

[program:fluxbox]
command=/usr/bin/fluxbox
environment=DISPLAY=":1"
autorestart=true
stdout_logfile=/var/log/fluxbox.log
stderr_logfile=/var/log/fluxbox.log

[program:x11vnc]
command=/usr/bin/x11vnc -forever -usepw -create -rfbauth /root/.vnc/passwd -rfbport %(ENV_VNC_PORT)s
autorestart=true
stdout_logfile=/var/log/x11vnc.log
stderr_logfile=/var/log/x11vnc.log

[program:novnc]
command=/opt/noVNC/utils/novnc_proxy --vnc localhost:%(ENV_VNC_PORT)s --listen %(ENV_NO_VNC_PORT)s
autorestart=true
stdout_logfile=/var/log/novnc.log
stderr_logfile=/var/log/novnc.log

[program:browser]
command=/usr/bin/chromium-browser --no-sandbox --disable-dev-shm-usage --remote-debugging-port=9222
environment=DISPLAY=":1"
autorestart=true
stdout_logfile=/var/log/browser.log
stderr_logfile=/var/log/browser.log
```

### 3. 启动脚本

创建 `vnc-service/start-vnc.sh`:

```bash
#!/bin/bash

# 设置显示环境
export DISPLAY=:1

# 启动supervisor
/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
```

### 4. 更新zbpack.json配置

在项目根目录的 `zbpack.json` 中添加VNC服务配置:

```json
{
  "build_command": "npm run build",
  "services": {
    "backend": {
      "dockerfile": "./backend/Dockerfile",
      "context": "./backend",
      "env": {
        "NODE_ENV": "production",
        "PORT": "3001"
      }
    },
    "frontend": {
      "build_command": "cd frontend && npm install && npm run build",
      "output_dir": "frontend/build",
      "install_command": "cd frontend && npm install"
    },
    "vnc-browser": {
      "dockerfile": "./vnc-service/Dockerfile",
      "context": "./vnc-service",
      "env": {
        "VNC_RESOLUTION": "1280x720",
        "VNC_PASSWORD": "vnc123",
        "VNC_PORT": "5900",
        "NO_VNC_PORT": "6080"
      },
      "ports": {
        "6080": "HTTP"
      }
    }
  },
  "meta": {
    "name": "智能寻聘系统",
    "description": "基于AI的智能招聘自动化系统，支持VNC远程桌面监控",
    "version": "1.0.0"
  }
}
```

## 部署步骤

### 1. 准备VNC服务文件

```bash
# 创建VNC服务目录
mkdir -p vnc-service

# 创建必要的配置文件
# - Dockerfile
# - supervisord.conf  
# - start-vnc.sh
```

### 2. 推送代码到GitHub

```bash
git add .
git commit -m "添加VNC远程桌面服务支持"
git push origin main
```

### 3. 在Zeabur部署VNC服务

1. 登录Zeabur控制台
2. 选择现有项目
3. 添加新服务 "vnc-browser"
4. 选择GitHub仓库
5. 配置服务设置:
   - 服务名称: `vnc-browser`
   - 构建路径: `vnc-service`
   - 端口映射: `6080 -> HTTP`
6. 设置环境变量
7. 部署服务

### 4. 获取VNC服务域名

部署完成后，Zeabur会自动分配域名，格式类似:
`https://recruitment-vnc-browser.zeabur.app`

### 5. 更新前端配置

在前端Browser组件中更新VNC服务器地址:

```javascript
const VNC_SERVER_URL = 'https://recruitment-vnc-browser.zeabur.app';
const VNC_WEB_PORT = '6080';
```

## 使用说明

### 1. 访问VNC远程桌面

- 在应用的"浏览器"功能中
- 切换到"VNC远程桌面"模式
- 系统会自动连接到VNC服务器
- 可以实时查看和控制远程桌面环境

### 2. VNC功能特性

- **实时监控**: 查看自动化脚本的执行过程
- **远程控制**: 必要时可以手动干预
- **多浏览器支持**: 支持Chrome、Firefox等
- **可扩展性**: 支持多个VNC实例

## 安全考虑

### 1. 访问控制
- VNC密码保护
- 仅限内部网络访问
- HTTPS加密传输

### 2. 资源限制
- CPU和内存限制
- 连接数限制
- 会话超时设置

## 故障排除

### 1. 连接问题
- 检查VNC服务状态
- 验证端口配置
- 查看防火墙设置

### 2. 性能问题
- 调整VNC分辨率
- 优化压缩设置
- 监控资源使用

## 成本估算

### Zeabur资源消费
- **CPU**: 0.5-1 vCPU
- **内存**: 512MB-1GB
- **存储**: 1GB
- **网络**: 按流量计费

### 预估月费用
- 基础套餐: $5-10/月
- 包含VNC服务的完整部署

## 后续优化

1. **多实例支持**: 支持多个并发VNC会话
2. **会话管理**: 实现会话保存和恢复
3. **性能监控**: 添加VNC服务监控面板
4. **自动扩缩容**: 根据负载自动调整实例数量