# Zeabur D-Bus 错误紧急修复指南

## 🚨 紧急问题

**错误信息**: `Failed to connect to the bus: Failed to connect to socket /run/dbus/system_bus_socket: No such file or directory`

**状态**: 生产环境仍在显示D-Bus错误

## 🔧 立即修复步骤

### 步骤1: 检查Zeabur环境变量配置

1. 登录 [Zeabur控制台](https://zeabur.com)
2. 进入你的项目 > Backend服务 > 环境变量
3. **确认以下关键变量是否已添加**:

```bash
# 必须添加的D-Bus禁用配置
ENABLE_LOG_FILTER=true
DISABLE_DBUS=1
NO_DBUS=1
DONT_PROMPT_WSL_INSTALL=1
```

### 步骤2: 移除有问题的变量

**确认以下变量已删除**（如果存在请删除）:
```bash
# 删除这些变量
DISPLAY=:99
XVFB_WHD=1920x1080x24
```

### 步骤3: 完整环境变量配置

**复制以下完整配置到Zeabur环境变量**:

```bash
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
BROWSER_HEADLESS=true
PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0
CONTAINER=true
ZEABUR=true
ENABLE_LOG_FILTER=true
DISABLE_DBUS=1
NO_DBUS=1
DONT_PROMPT_WSL_INSTALL=1
```

### 步骤4: 重新部署服务

1. 保存环境变量配置
2. 在Zeabur控制台中**重新部署**Backend服务
3. 等待部署完成（通常需要2-3分钟）

### 步骤5: 验证修复效果

1. 部署完成后，查看服务日志
2. 确认不再出现D-Bus错误信息
3. 测试应用功能是否正常

## 🔍 问题原因分析

1. **环境变量未应用**: 可能优化后的环境变量配置还没有应用到Zeabur生产环境
2. **服务未重启**: 环境变量更改后需要重新部署服务才能生效
3. **配置冲突**: 可能存在旧的DISPLAY或XVFB_WHD变量导致冲突

## ⚡ 快速检查清单

- [ ] 确认`ENABLE_LOG_FILTER=true`已添加
- [ ] 确认`DISABLE_DBUS=1`已添加
- [ ] 确认`NO_DBUS=1`已添加
- [ ] 确认`DONT_PROMPT_WSL_INSTALL=1`已添加
- [ ] 确认删除了`DISPLAY`变量（如果存在）
- [ ] 确认删除了`XVFB_WHD`变量（如果存在）
- [ ] 重新部署了Backend服务
- [ ] 验证日志中不再出现D-Bus错误

## 📞 如果问题仍然存在

如果按照以上步骤操作后问题仍然存在，请提供:

1. Zeabur控制台中当前的环境变量截图
2. 最新的服务部署日志
3. 确认重新部署的时间戳

**这个问题一定可以解决！** 关键是确保环境变量正确配置并重新部署服务。