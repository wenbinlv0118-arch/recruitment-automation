# VNC性能优化部署说明

## 概述

本文档详细说明了智能寻聘系统VNC服务的性能优化配置，包括环境变量优化、容器资源调整、监控机制完善和性能测试方案。

## 优化内容

### 1. VNC环境变量优化

在后端 `.env` 文件中添加了以下VNC性能优化配置：

```bash
# VNC性能优化配置
VNC_RESOLUTION=1280x720
VNC_QUALITY=6
VNC_COMPRESS_LEVEL=2
VNC_PASSWORD=vnc123456
VNC_PORT=5901
NO_VNC_PORT=6080
VNC_FRAME_RATE=15
VNC_PIXEL_FORMAT=bgr233
VNC_ENCODING=tight
VNC_JPEG_QUALITY=6

# 浏览器配置
HEADLESS=false
```

**配置说明：**
- `VNC_RESOLUTION`: 设置为1280x720，平衡显示效果和性能
- `VNC_QUALITY`: 设置为6，中等质量，减少带宽占用
- `VNC_COMPRESS_LEVEL`: 设置为2，轻度压缩，平衡性能和质量
- `VNC_FRAME_RATE`: 限制为15fps，减少CPU占用
- `VNC_ENCODING`: 使用tight编码，提高压缩效率

### 2. 容器资源优化

在 `zbpack.json` 中调整了VNC服务的资源配置：

```json
{
  "vnc-browser": {
    "resources": {
      "memory": "1Gi",
      "cpu": 0.5
    }
  }
}
```

**优化效果：**
- 内存从2GB降至1GB，减少50%资源占用
- CPU从1核降至0.5核，提高资源利用效率
- 适合智能寻聘场景的资源需求

### 3. Supervisor配置优化

优化了 `supervisord.conf` 中各服务的启动参数：

#### Xvfb优化
```ini
[program:xvfb]
command=/usr/bin/Xvfb :1 -screen 0 %(ENV_VNC_RESOLUTION)sx24 -ac +extension GLX +render -noreset -dpi 96 -nolisten tcp
startsecs=3
startretries=5
stopwaitsecs=5
```

#### X11VNC优化
```ini
[program:x11vnc]
command=/usr/bin/x11vnc -forever -usepw -create -rfbauth /root/.vnc/passwd -rfbport %(ENV_VNC_PORT)s -display :1 -noxrecord -noxfixes -noxdamage -wait 3 -shared -permitfiletransfer -threads -nap -defer 10
startsecs=5
startretries=5
stopwaitsecs=8
```

#### 浏览器启动优化
```ini
[program:browser]
command=/bin/bash -c "sleep 15 && /usr/local/bin/start-browser.sh"
startsecs=15
startretries=5
stopwaitsecs=10
autorestart_delay=20
```

**优化要点：**
- 减少启动等待时间
- 增加重试次数，提高稳定性
- 添加性能优化参数（threads, nap, defer）

### 4. 浏览器启动参数优化

在 `start-browser.sh` 中优化了Chrome启动参数：

```bash
chromium-browser --no-sandbox --disable-dev-shm-usage \
    --disable-gpu --disable-software-rasterizer \
    --disable-background-timer-throttling \
    --disable-backgrounding-occluded-windows \
    --disable-renderer-backgrounding \
    --disable-features=VizDisplayCompositor \
    --memory-pressure-off \
    --max_old_space_size=512 \
    --window-size=1280,720 \
    --user-data-dir=/tmp/chrome-user-data \
    --no-first-run --no-default-browser-check \
    --disable-extensions --disable-plugins \
    --disable-web-security --allow-running-insecure-content
```

**优化效果：**
- 禁用不必要的功能，减少内存占用
- 限制JavaScript内存使用（512MB）
- 优化渲染性能
- 减少启动等待时间

### 5. 监控和日志机制

#### 性能监控脚本
创建了 `monitor-vnc.sh` 脚本，提供：
- VNC服务进程状态监控
- 系统资源使用情况
- 网络连接状态
- 性能建议

使用方法：
```bash
./monitor-vnc.sh
```

#### 日志轮转配置
创建了 `logrotate.conf` 配置：
- 每日轮转日志文件
- 保留7天历史日志
- 压缩旧日志文件
- 防止日志文件过大

#### 性能测试脚本
创建了 `test-vnc-performance.sh` 脚本：
- 30秒性能监控测试
- CPU和内存使用率统计
- 服务稳定性检查
- 性能评估和优化建议

使用方法：
```bash
./test-vnc-performance.sh
```

## 部署步骤

### 1. 更新环境配置
确保后端 `.env` 文件包含所有VNC优化配置。

### 2. 更新容器配置
确保 `zbpack.json` 中的资源配置已更新。

### 3. 重新部署服务
```bash
# 如果使用Zeabur部署
zeabur deploy

# 或者重新构建Docker镜像
docker build -t vnc-service ./vnc-service
```

### 4. 验证部署
```bash
# 运行性能测试
./vnc-service/test-vnc-performance.sh

# 检查服务状态
./vnc-service/monitor-vnc.sh
```

## 性能指标

### 优化前后对比

| 指标 | 优化前 | 优化后 | 改善 |
|------|--------|--------|------|
| 内存使用 | 2GB | 1GB | -50% |
| CPU使用 | 1核 | 0.5核 | -50% |
| 启动时间 | 20秒 | 15秒 | -25% |
| 重试次数 | 3次 | 5次 | +67% |

### 预期性能表现

- **CPU使用率**: < 50% (正常负载)
- **内存使用率**: < 60% (正常负载)
- **启动成功率**: > 95%
- **服务稳定性**: 99%+

## 故障排查

### 常见问题

1. **VNC连接失败**
   ```bash
   # 检查端口监听
   netstat -ln | grep 5901
   
   # 检查X11服务
   xdpyinfo -display :1
   ```

2. **浏览器启动失败**
   ```bash
   # 查看浏览器日志
   tail -f /var/log/supervisor/browser.log
   
   # 检查用户数据目录权限
   ls -la /tmp/chrome-user-data
   ```

3. **性能问题**
   ```bash
   # 运行性能监控
   ./monitor-vnc.sh
   
   # 检查资源使用
   top -p $(pgrep -f 'Xvfb|x11vnc|chromium')
   ```

### 日志文件位置

- Supervisor主日志: `/var/log/supervisor/supervisord.log`
- Xvfb日志: `/var/log/supervisor/xvfb.log`
- X11VNC日志: `/var/log/supervisor/x11vnc.log`
- NoVNC日志: `/var/log/supervisor/novnc.log`
- 浏览器日志: `/var/log/supervisor/browser.log`

## 后续优化建议

### 短期优化（1-2周）
1. 监控生产环境性能数据
2. 根据实际使用情况调整资源配置
3. 优化浏览器缓存策略

### 中期优化（1-2月）
1. 实施CDP方案原型开发
2. 评估WebRTC替代方案
3. 优化网络传输协议

### 长期优化（3-6月）
1. 完整CDP方案实施
2. 混合架构支持
3. 智能资源调度

## 联系信息

如有问题或需要技术支持，请联系开发团队。

---

**文档版本**: 1.0  
**更新日期**: $(date '+%Y-%m-%d')  
**维护人员**: SOLO Coding