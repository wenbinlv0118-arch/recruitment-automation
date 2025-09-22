# 🚀 Zeabur 部署就绪指南

## ✅ 准备工作已完成

### 📦 代码状态
- ✅ 所有代码已推送到 GitHub
- ✅ zbpack.json 配置文件已优化
- ✅ 环境变量配置已准备
- ✅ Docker 配置已完善
- ✅ 部署脚本已就绪

### 🔧 配置文件状态
- ✅ `zbpack.json` - Zeabur Monorepo 配置
- ✅ `deploy/config/.env.zeabur` - 环境变量模板
- ✅ `deploy/scripts/prepare-zeabur.sh` - 部署准备脚本
- ✅ `backend/Dockerfile` - 后端容器配置
- ✅ `vnc-service/Dockerfile` - VNC 服务配置

## 🌐 开始 Zeabur 部署

### 步骤 1: 创建 Zeabur 账户
1. 访问 [Zeabur 官网](https://zeabur.com)
2. 使用 GitHub 账户登录
3. 授权 Zeabur 访问您的仓库

### 步骤 2: 创建项目
1. 在 Zeabur 控制台点击 **创建项目**
2. 选择部署区域（推荐选择离用户最近的区域）：
   - 🇺🇸 AWS us-west-1 (美国西部)
   - 🇺🇸 AWS us-east-1 (美国东部)
   - 🇯🇵 AWS ap-northeast-1 (日本)
   - 🇸🇬 AWS ap-southeast-1 (新加坡)

### 步骤 3: 部署后端服务
1. **添加服务** → **Git Service**
2. **选择仓库**: `recruitment-automation`
3. **选择分支**: `develop`
4. **配置服务**:
   - 服务名称: `recruitment-backend`
   - Root Directory: `backend`
   - Zeabur 会自动检测为 Node.js 应用

#### 环境变量配置
在服务的 **Variables** 标签页添加以下环境变量：

```env
# 基础配置
NODE_ENV=production
PORT=$PORT

# 数据库配置
SUPABASE_URL=https://fftjmohzkzkkqzqgaqfe.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDI1NjYsImV4cCI6MjA3Mjg3ODU2Nn0._PQEDYFp0XTL8sHatcVCMl6pcjooLo79CASTaulFbdQ
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzMwMjU2NiwiZXhwIjoyMDcyODc4NTY2fQ.ZhVVUag5S1q2fCSEQ2q_H_z5hV5gXrOdSJ1Q2k3fYTk

# JWT 配置（使用生成的密钥）
JWT_SECRET=your_generated_jwt_secret_from_script

# CORS 配置（临时设置）
CORS_ORIGIN=*

# 浏览器配置
BROWSER_HEADLESS=true
DISPLAY=:99
XVFB_WHD=1920x1080x24

# Zeabur 特定配置
ZEABUR=true
CONTAINER=true
PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
```

### 步骤 4: 部署前端服务
1. **添加服务** → **Git Service**
2. **选择仓库**: `recruitment-automation`
3. **选择分支**: `develop`
4. **配置服务**:
   - 服务名称: `recruitment-frontend`
   - Root Directory: `frontend`
   - Zeabur 会自动检测为 React 应用

#### 前端环境变量
```env
# 构建配置
NODE_ENV=production
GENERATE_SOURCEMAP=false

# API 配置（部署后端后获取 URL）
REACT_APP_API_URL=https://recruitment-backend-xxx.zeabur.app
REACT_APP_SUPABASE_URL=https://fftjmohzkzkkqzqgaqfe.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDI1NjYsImV4cCI6MjA3Mjg3ODU2Nn0._PQEDYFp0XTL8sHatcVCMl6pcjooLo79CASTaulFbdQ

# Zeabur 静态网站配置
ZBPACK_STATIC_SERVE=true
ZBPACK_SPA=true
```

### 步骤 5: 部署 VNC 服务（可选）
1. **添加服务** → **Git Service**
2. **选择仓库**: `recruitment-automation`
3. **选择分支**: `develop`
4. **配置服务**:
   - 服务名称: `vnc-browser`
   - Root Directory: `vnc-service`
   - Zeabur 会自动检测为 Docker 应用

#### VNC 环境变量
```env
# VNC 配置
VNC_RESOLUTION=1280x720
VNC_PASSWORD=vnc123
VNC_PORT=5900
NO_VNC_PORT=6080
DISPLAY=:1

# Zeabur 配置
ZEABUR=true
CONTAINER=true
```

## 🔗 获取服务 URL

### 后端服务
1. 部署完成后，在 **Networking** 标签页
2. 点击 **Generate Domain**
3. 记录 URL: `https://recruitment-backend-xxx.zeabur.app`

### 前端服务
1. 部署完成后，在 **Networking** 标签页
2. 点击 **Generate Domain**
3. 记录 URL: `https://recruitment-frontend-xxx.zeabur.app`

### VNC 服务
1. 部署完成后，在 **Networking** 标签页
2. 点击 **Generate Domain**
3. 记录 URL: `https://vnc-browser-xxx.zeabur.app`

## 🔄 更新配置

### 更新后端 CORS
获取前端 URL 后，更新后端环境变量：
```env
CORS_ORIGIN=https://recruitment-frontend-xxx.zeabur.app
```

### 更新前端 API URL
获取后端 URL 后，更新前端环境变量：
```env
REACT_APP_API_URL=https://recruitment-backend-xxx.zeabur.app
```

## ✅ 验证部署

### 后端验证
```bash
# 健康检查
curl https://recruitment-backend-xxx.zeabur.app/api/health

# Playwright 测试
curl -X POST https://recruitment-backend-xxx.zeabur.app/api/test/playwright

# Boss直聘状态
curl https://recruitment-backend-xxx.zeabur.app/api/boss-zhipin/status
```

### 前端验证
1. 访问前端 URL
2. 检查页面加载正常
3. 测试 API 连接
4. 验证核心功能

### VNC 验证
1. 访问 VNC URL
2. 输入密码: `vnc123`
3. 查看远程桌面

## 🎯 部署完成清单

- [ ] ✅ 后端服务部署成功
- [ ] ✅ 前端服务部署成功
- [ ] ✅ VNC 服务部署成功（可选）
- [ ] ✅ 环境变量配置正确
- [ ] ✅ 域名生成并可访问
- [ ] ✅ API 连接正常
- [ ] ✅ 智能寻聘功能正常
- [ ] ✅ 浏览器自动化正常
- [ ] ✅ VNC 远程监控正常

## 📚 相关文档

- [详细部署指南](deploy/docs/zeabur-deployment-guide.md)
- [快速开始指南](ZEABUR_QUICKSTART.md)
- [环境变量配置](deploy/config/.env.zeabur)
- [Zeabur 官方文档](https://zeabur.com/docs)

---

🎉 **恭喜！您的智能招聘系统已准备好在 Zeabur 上部署！**

💡 **提示**: 
- 每次代码更新会自动重新部署
- 可在 Zeabur 控制台实时查看日志
- 支持自定义域名和 HTTPS
- 支持环境变量热更新