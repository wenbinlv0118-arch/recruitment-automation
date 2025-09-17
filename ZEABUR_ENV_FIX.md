# Zeabur 环境变量配置修复方案

## 问题确认

经过测试，本地日志过滤器工作正常，能够100%过滤D-Bus错误。问题在于Zeabur生产环境配置。

## 当前环境变量分析

### 导致D-Bus错误的环境变量

```bash
# 这些变量可能触发D-Bus连接尝试
DISPLAY=:99                                    # ❌ 移除
XVFB_WHD=1920x1080x24                         # ❌ 移除
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true # ⚠️ 保留但需配合其他设置
```

### 正确的环境变量配置

```bash
# 基础配置（保持不变）
PASSWORD=cvb0DA1GaIBq3zKy65xJ9sO24MkE7Xr8
CORS_ORIGIN=https://recruitment-automation-frontend.zeabur.app
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDI1NjYsImV4cCI6MjA3Mjg3ODU2Nn0._PQEDYFp0XTL8sHatcVCMl6pcjooLo79CASTaulFbdQ
PORT=${WEB_PORT}
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=900000
NPM_CONFIG_PRODUCTION=true
UPLOAD_MAX_SIZE=10485760
NODE_ENV=production
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzMwMjU2NiwiZXhwIjoyMDcyODc4NTY2fQ.ZhVVUag5S1q2fCSEQ2q_H_z5hV5gXrOdSJ1Q2k3fYTk
SUPABASE_URL=https://fftjmohzkzkkqzqgaqfe.supabase.co
JWT_SECRET=f6554ea01e7303b5373d9715fa0beef42a80234ce5bbd3d6ed3ec567fa20965d864354fdfa4145a3e52a656bad2987a8a85746a4f6db08dc98d572652812340e
LLM_API_KEY=d4820908e52b4302a6c0135ec28bb8d9.YH0DoJ2y3mqH3yra
LLM_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
LLM_MODEL=glm-4.5
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_CREDENTIALS=true
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-Requested-With
RECRUITMENT_AUTOMATION_KINITE_HOST=service-68c2317418173169c6289640
RECRUITMENT_AUTOMATION_UNTNER_HOST=service-68c3c6f26fd03a087cd436bd

# 浏览器配置（优化）
BROWSER_HEADLESS=true
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0

# 容器环境配置（保持）
CONTAINER=true
ZEABUR=true

# 日志过滤配置（新增）
ENABLE_LOG_FILTER=true

# D-Bus禁用配置（新增）
DISABLE_DBUS=1
NO_DBUS=1
DONT_PROMPT_WSL_INSTALL=1

# 移除的环境变量
# DISPLAY=:99                    # ❌ 移除 - 避免触发图形系统
# XVFB_WHD=1920x1080x24         # ❌ 移除 - 避免虚拟显示器
```

## 修复步骤

### 1. 在Zeabur控制台中修改环境变量

**移除以下变量：**
- `DISPLAY`
- `XVFB_WHD`

**添加以下变量：**
- `ENABLE_LOG_FILTER=true`
- `DISABLE_DBUS=1`
- `NO_DBUS=1`
- `DONT_PROMPT_WSL_INSTALL=1`

### 2. 重新部署服务

在Zeabur控制台中触发重新部署，或者推送新的代码提交。

### 3. 验证修复效果

部署完成后，检查日志输出：
- 应该看到 "✓ 生产环境日志过滤已启用 - D-Bus和系统警告将被过滤"
- 不应该再看到D-Bus错误消息

## 技术原理

### 为什么移除DISPLAY和XVFB_WHD

1. **DISPLAY=:99**：
   - 告诉应用程序连接到虚拟显示器
   - 触发图形系统初始化
   - 导致D-Bus系统总线连接尝试

2. **XVFB_WHD=1920x1080x24**：
   - Xvfb虚拟帧缓冲配置
   - 在容器环境中可能导致系统服务依赖

### 为什么添加D-Bus禁用变量

1. **DISABLE_DBUS=1**：
   - 明确告诉应用程序禁用D-Bus
   - 防止自动连接尝试

2. **NO_DBUS=1**：
   - 通用的D-Bus禁用标志
   - 被多个库识别

3. **DONT_PROMPT_WSL_INSTALL=1**：
   - 防止WSL相关的系统提示
   - 避免额外的系统集成尝试

### 日志过滤器确保

- `ENABLE_LOG_FILTER=true`：明确启用日志过滤
- `NODE_ENV=production`：已设置，确保生产环境模式

## 预期结果

修复后，Zeabur生产环境应该：
1. 不再显示D-Bus错误消息
2. 显示日志过滤器启用消息
3. 浏览器功能正常工作
4. 性能不受影响

## 监控建议

部署后持续监控1-2小时，确认：
- [ ] 服务正常启动
- [ ] 没有D-Bus错误
- [ ] 浏览器自动化功能正常
- [ ] API响应正常