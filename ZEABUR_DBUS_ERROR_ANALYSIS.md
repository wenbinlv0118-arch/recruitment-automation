# Zeabur 生产环境 D-Bus 错误分析

## 问题描述

即使在本地修复了日志过滤器后，Zeabur 生产环境仍然显示 D-Bus 错误：

```
[pid=5387][err] [0917/033310.728010:ERROR:dbus/bus.cc:408] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
[pid=5387][err] [0917/033310.729001:ERROR:dbus/bus.cc:408] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
[pid=5387][err] [0917/033310.729097:ERROR:dbus/bus.cc:408] Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory
```

## 环境变量分析

### 可能导致 D-Bus 错误的关键环境变量

1. **DISPLAY=:99**
   - 虚拟显示器配置
   - 可能触发 D-Bus 系统总线连接尝试

2. **XVFB_WHD=1920x1080x24**
   - Xvfb (X Virtual Framebuffer) 配置
   - 虚拟显示环境可能需要 D-Bus 服务

3. **BROWSER_HEADLESS=true**
   - 无头浏览器模式
   - 与 DISPLAY 设置冲突，可能导致混合模式问题

4. **CONTAINER=true**
   - 容器环境标识
   - 容器中通常没有完整的 D-Bus 系统服务

5. **ZEABUR=true**
   - Zeabur 平台标识
   - 平台特定的容器限制

6. **PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true**
   - 跳过主机要求验证
   - 可能导致 Playwright 尝试连接不存在的系统服务

### 根本原因分析

1. **容器环境限制**：
   - Zeabur 容器环境中没有 D-Bus 系统服务
   - `/run/dbus/system_bus_socket` 文件不存在

2. **显示环境配置冲突**：
   - 同时设置了 `DISPLAY=:99` 和 `BROWSER_HEADLESS=true`
   - 可能导致 Playwright 尝试连接图形系统服务

3. **日志过滤器未生效**：
   - 生产环境可能没有正确应用日志过滤器
   - 需要确认 `NODE_ENV=production` 和过滤器配置

## 解决方案

### 方案1：优化环境变量配置

```bash
# 移除可能导致 D-Bus 连接的环境变量
# DISPLAY=:99  # 注释掉或移除
# XVFB_WHD=1920x1080x24  # 注释掉或移除

# 确保无头模式
BROWSER_HEADLESS=true

# 添加 D-Bus 禁用环境变量
DISABLE_DBUS=1
NO_DBUS=1

# 确保日志过滤器启用
NODE_ENV=production
ENABLE_LOG_FILTER=true
```

### 方案2：增强日志过滤器

确保日志过滤器在生产环境中正确工作，并添加更多 D-Bus 错误模式。

### 方案3：Playwright 配置优化

在 Playwright 配置中明确禁用系统集成功能。

## 建议的环境变量修改

### 需要移除的变量
```bash
DISPLAY=:99
XVFB_WHD=1920x1080x24
```

### 需要添加的变量
```bash
DISABLE_DBUS=1
NO_DBUS=1
ENABLE_LOG_FILTER=true
```

### 需要确认的变量
```bash
NODE_ENV=production  # 已设置
BROWSER_HEADLESS=true  # 已设置
CONTAINER=true  # 已设置
```

## 下一步行动

1. 修改 Zeabur 环境变量配置
2. 重新部署服务
3. 监控日志输出
4. 验证 D-Bus 错误是否被过滤