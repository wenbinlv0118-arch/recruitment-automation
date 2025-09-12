# VNC远程桌面服务

## 概述

本服务提供基于Web的VNC远程桌面功能，支持智能寻聘系统的实时监控需求。用户可以通过浏览器直接访问远程桌面环境，实时查看自动化脚本的执行过程。

## 服务架构

### 核心组件
- **Xvfb**: 虚拟显示服务器
- **Fluxbox**: 轻量级窗口管理器
- **x11vnc**: VNC服务器
- **noVNC**: Web VNC客户端
- **Chromium**: 预装浏览器
- **Supervisor**: 进程管理器

### 端口配置
- **5900**: VNC服务器端口
- **6080**: noVNC Web访问端口
- **9222**: Chrome远程调试端口

## 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `VNC_RESOLUTION` | 1280x720 | VNC桌面分辨率 |
| `VNC_PASSWORD` | vnc123 | VNC连接密码 |
| `VNC_PORT` | 5900 | VNC服务器端口 |
| `NO_VNC_PORT` | 6080 | noVNC Web端口 |
| `DISPLAY` | :1 | X11显示器编号 |

## 本地开发

### 构建Docker镜像

```bash
# 在vnc-service目录下
docker build -t recruitment-vnc .
```

### 运行容器

```bash
docker run -d \
  --name vnc-browser \
  -p 5900:5900 \
  -p 6080:6080 \
  -e VNC_RESOLUTION=1280x720 \
  -e VNC_PASSWORD=vnc123 \
  recruitment-vnc
```

### 访问VNC桌面

- **Web访问**: http://localhost:6080
- **VNC客户端**: localhost:5900 (密码: vnc123)

## Zeabur部署

### 1. 推送代码

```bash
git add vnc-service/
git commit -m "添加VNC远程桌面服务"
git push origin main
```

### 2. 在Zeabur创建服务

1. 登录Zeabur控制台
2. 选择项目
3. 添加服务 "vnc-browser"
4. 选择GitHub仓库
5. 配置构建路径: `vnc-service`
6. 设置端口映射: `6080 -> HTTP`

### 3. 配置环境变量

在Zeabur服务设置中添加:

```
VNC_RESOLUTION=1280x720
VNC_PASSWORD=vnc123
VNC_PORT=5900
NO_VNC_PORT=6080
DISPLAY=:1
```

### 4. 部署并获取域名

部署完成后，获取分配的域名，例如:
`https://recruitment-vnc-browser.zeabur.app`

## 使用说明

### 1. 在智能寻聘系统中使用

1. 打开应用的"浏览器"功能
2. 切换到"VNC远程桌面"模式
3. 系统自动连接VNC服务器
4. 实时查看自动化脚本执行

### 2. 直接Web访问

访问: `https://recruitment-vnc-browser.zeabur.app:6080`

### 3. VNC客户端访问

- 服务器: `recruitment-vnc-browser.zeabur.app`
- 端口: `5900`
- 密码: `vnc123`

## 功能特性

### 1. 实时监控
- 查看浏览器自动化过程
- 监控脚本执行状态
- 实时错误诊断

### 2. 远程控制
- 必要时手动干预
- 调试自动化脚本
- 处理异常情况

### 3. 多浏览器支持
- 预装Chromium浏览器
- 支持Firefox（可选）
- Chrome远程调试接口

## 性能优化

### 1. 分辨率设置
```bash
# 低分辨率（节省带宽）
VNC_RESOLUTION=1024x768

# 高分辨率（更好体验）
VNC_RESOLUTION=1920x1080
```

### 2. 压缩设置
- noVNC自动压缩
- 质量级别可调
- 适应网络条件

### 3. 资源限制
```yaml
# Docker Compose示例
services:
  vnc-browser:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

## 安全配置

### 1. 密码保护
- 修改默认VNC密码
- 定期更换密码
- 使用强密码策略

### 2. 网络安全
- HTTPS加密传输
- 防火墙规则
- 访问IP限制

### 3. 容器安全
- 非root用户运行
- 最小权限原则
- 定期更新基础镜像

## 故障排除

### 1. 连接问题

**症状**: 无法连接VNC

**解决方案**:
```bash
# 检查服务状态
docker logs vnc-browser

# 检查端口
netstat -tuln | grep 6080

# 重启服务
docker restart vnc-browser
```

### 2. 显示问题

**症状**: 黑屏或显示异常

**解决方案**:
```bash
# 检查X11服务
docker exec vnc-browser ps aux | grep Xvfb

# 重置显示
docker exec vnc-browser supervisorctl restart xvfb
```

### 3. 性能问题

**症状**: 响应缓慢

**解决方案**:
- 降低分辨率
- 调整压缩质量
- 增加容器资源

## 监控和日志

### 1. 服务监控
```bash
# 查看所有服务状态
docker exec vnc-browser supervisorctl status

# 查看特定服务日志
docker exec vnc-browser supervisorctl tail -f novnc
```

### 2. 系统资源
```bash
# CPU和内存使用
docker stats vnc-browser

# 磁盘使用
docker exec vnc-browser df -h
```

### 3. 网络连接
```bash
# 活动连接
docker exec vnc-browser netstat -an

# 端口监听
docker exec vnc-browser ss -tuln
```

## 扩展功能

### 1. 录屏功能
```bash
# 安装ffmpeg
apt-get install ffmpeg

# 录制屏幕
ffmpeg -f x11grab -video_size 1280x720 -i :1 -codec:v libx264 output.mp4
```

### 2. 文件传输
```bash
# 通过HTTP服务器
python3 -m http.server 8000

# 访问文件
http://localhost:8000
```

### 3. 多用户支持
- 配置多个VNC端口
- 用户会话隔离
- 权限管理

## 版本历史

- **v1.0.0**: 基础VNC服务
- **v1.1.0**: 添加noVNC Web支持
- **v1.2.0**: 集成Chromium浏览器
- **v1.3.0**: Supervisor进程管理

## 技术支持

如有问题，请查看:
1. 容器日志: `docker logs vnc-browser`
2. 服务状态: `supervisorctl status`
3. 网络连接: `netstat -tuln`
4. 系统资源: `docker stats`

## 许可证

本项目采用MIT许可证，详见LICENSE文件。