# Zeabur 部署指南

> 基于 Zeabur 官方文档的完整部署指南 - 支持 Monorepo 和现代化部署流程 <mcreference link="https://zeabur.com/docs/zh-CN/get-started" index="1">1</mcreference> <mcreference link="https://zeabur.com/docs/zh-CN/guides/nodejs" index="2">2</mcreference>

本指南将详细介绍如何在 Zeabur 平台部署智能招聘系统，充分利用 Zeabur 的 Monorepo 自动识别、静态网站优化等特性。

## 🌟 Zeabur 平台优势

### 技术特性
- **Monorepo 原生支持**: 自动识别 pnpm workspace、Yarn Workspace、Turborepo 等 <mcreference link="https://zeabur.com/docs/zh-CN/guides/nodejs" index="2">2</mcreference>
- **多框架支持**: Node.js、React、Next.js、Express 等 30+ 框架
- **静态网站优化**: 自动使用 Caddy 进行轻量化托管
- **一键部署**: 无需复杂配置，Git 推送即部署
- **全球 CDN**: 多区域部署，就近访问

### 成本优势
- **按需计费**: 根据实际资源使用量计费
- **静态托管**: 前端静态部署显著降低成本
- **资源共享**: 多个小项目可共享资源池

## 📋 部署前准备

### 1. 运行自动化准备脚本
```bash
# 在项目根目录运行
./deploy/scripts/prepare-zeabur.sh

# 脚本会自动：
# - 生成安全的 JWT Secret
# - 检查环境变量配置
# - 验证 package.json 脚本
# - 检查 Git 状态
```

### 2. 确保代码已推送到 GitHub
```bash
# 提交所有更改
git add .
git commit -m "准备 Zeabur 部署：添加配置文件和脚本"
git push origin develop
```

### 3. 项目结构检查
确保项目结构符合 Zeabur Monorepo 要求：
```
recruitment-automation/
├── backend/          # 后端服务目录
│   ├── package.json  # 后端依赖配置
│   └── src/         # 后端源码
├── frontend/         # 前端应用目录
│   ├── package.json  # 前端依赖配置
│   └── src/         # 前端源码
├── package.json      # 根目录配置（Monorepo）
└── zbpack.json      # Zeabur 构建配置（可选）
```

## 🚀 开始部署

### 步骤 1: 创建 Zeabur 账户和项目

1. **注册账户** <mcreference link="https://zeabur.com/docs/zh-CN/get-started" index="1">1</mcreference>
   - 访问 [Zeabur 官网](https://zeabur.com)
   - 点击 "开始使用" 按钮
   - 使用 GitHub 账户登录（目前仅支持 GitHub 登录）
   - 授权 Zeabur 访问您的 GitHub 仓库

2. **创建项目**
   - 登录后自动跳转到控制台：https://dash.zeabur.com
   - 点击 **创建项目** 按钮（或使用快捷键 `Cmd/Ctrl + K`）
   - 选择部署区域（推荐选择离目标用户最近的区域）：
     - 🇺🇸 **AWS us-west-1** (美国西部) - 适合北美用户
     - 🇺🇸 **AWS us-east-1** (美国东部) - 适合北美和欧洲用户
     - 🇯🇵 **AWS ap-northeast-1** (日本) - 适合亚太用户
     - 🇸🇬 **AWS ap-southeast-1** (新加坡) - 适合东南亚用户
   - 系统会自动生成随机项目名，稍后可在设置中修改

## 🔧 部署后端服务

### 步骤 2: 部署后端 Node.js 应用

> 💡 **Zeabur 优势**: 自动识别 Monorepo 结构，支持 Express、Nest.js 等多种 Node.js 框架 <mcreference link="https://zeabur.com/docs/zh-CN/guides/nodejs" index="2">2</mcreference>

#### 2.1 添加后端服务

1. **创建服务**
   - 在项目页面点击 **添加服务** 按钮
   - 选择 **Git Service**（部署源代码）

2. **配置 GitHub 访问权限**（首次使用需要）
   - 点击配置 GitHub 访问权限
   - 授权 Zeabur 访问指定仓库或所有仓库
   - 选择 `Recruitment-automation` 仓库

3. **Monorepo 自动识别**
   - Zeabur 会自动扫描项目结构
   - 识别到 `backend/` 和 `frontend/` 目录
   - 默认选择第一个 Node.js 应用（通常是 backend）

#### 2.2 配置后端构建

**方法一：使用 zbpack.json（推荐）**

在项目根目录创建 `zbpack.json`：
```json
{
  "build_command": "cd backend && npm install && npm run build",
  "start_command": "cd backend && npm start",
  "install_command": "cd backend && npm install",
  "node_version": "18",
  "cache_dependencies": true
}
```

**方法二：使用环境变量**
```env
ZBPACK_BUILD_COMMAND=cd backend && npm install && npm run build
ZBPACK_START_COMMAND=cd backend && npm start
ZBPACK_INSTALL_COMMAND=cd backend && npm install
```

**方法三：指定工作目录**
```env
# 让 Zeabur 直接在 backend 目录工作
ZBPACK_ROOT_DIR=backend
```

#### 2.3 环境变量配置

在服务的 **Variables** 标签页添加以下环境变量：

```env
# === 基础配置 ===
NODE_ENV=production
# 使用 Zeabur 提供的动态端口
PORT=$PORT

# === 数据库配置 ===
SUPABASE_URL=https://fftjmohzkzkkqzqgaqfe.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDI1NjYsImV4cCI6MjA3Mjg3ODU2Nn0._PQEDYFp0XTL8sHatcVCMl6pcjooLo79CASTaulFbdQ
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzMwMjU2NiwiZXhwIjoyMDcyODc4NTY2fQ.ZhVVUag5S1q2fCSEQ2q_H_z5hV5gXrOdSJ1Q2k3fYTk

# === JWT 配置 ===
# 使用脚本生成的安全密钥
JWT_SECRET=your_generated_jwt_secret_from_script

# === CORS 配置 ===
# 临时设置为允许所有来源，前端部署后更新
CORS_ORIGIN=*

# === 可选配置 ===
UPLOAD_MAX_SIZE=10485760
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# === Zeabur 特定配置 ===
# 生产环境优化
NPM_CONFIG_PRODUCTION=true
# 禁用 nodemon（生产环境不需要）
NODE_OPTIONS=--max-old-space-size=1024
```

#### 2.4 高级配置选项

**Node.js 版本指定**
在 `backend/package.json` 中指定：
```json
{
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=8.0.0"
  }
}
```

**包管理器配置**
```json
{
  "packageManager": "npm@9.0.0"
}
```

**禁用缓存**（如果遇到构建问题）：
```env
ZBPACK_CACHE_DEPENDENCIES=false
```

#### 2.5 部署后端服务

1. **开始部署**
   - 配置完成后，点击 **Deploy** 按钮
   - Zeabur 会自动执行以下步骤：
     - 克隆 GitHub 仓库
     - 安装依赖（`npm install`）
     - 执行构建命令（`npm run build`）
     - 启动应用（`npm start`）

2. **监控部署过程**
   - 在 **Logs** 标签页实时查看构建日志
   - 构建通常需要 2-5 分钟
   - 成功后服务状态显示为 "Running"

3. **生成访问域名**
   - 部署成功后，切换到 **Networking** 标签页
   - 点击 **Generate Domain** 生成公共域名
   - 记录生成的 URL：`https://recruitment-backend-xxx.zeabur.app`
   - 也可以绑定自定义域名

#### 2.6 验证后端部署

```bash
# 测试健康检查端点
curl https://recruitment-backend-xxx.zeabur.app/health

# 测试 API 响应
curl https://recruitment-backend-xxx.zeabur.app/api/test

# 检查服务状态
curl -I https://recruitment-backend-xxx.zeabur.app
```

**预期响应**：
- 状态码：200 OK
- 响应时间：< 500ms
- 包含正确的 CORS 头部

## 🌐 部署前端服务

### 步骤 3: 部署 React 前端应用

> 💡 **Zeabur 优势**: 自动识别 React、Vue、Angular 等前端框架，支持静态网站托管和 SPA 路由 <mcreference link="https://zeabur.com/docs/zh-CN/guides/nodejs" index="2">2</mcreference>

#### 3.1 添加前端服务

1. **创建第二个服务**
   - 在同一项目中点击 **添加服务**
   - 选择 **Git Service**
   - 选择相同的 `Recruitment-automation` 仓库

2. **选择前端目录**
   - Zeabur 会再次扫描 Monorepo 结构
   - 这次选择 `frontend/` 目录
   - 或者手动指定根目录为 `frontend`

#### 3.2 配置前端构建

**方法一：使用 zbpack.json（推荐）**

在项目根目录更新 `zbpack.json`：
```json
{
  "services": {
    "backend": {
      "build_command": "cd backend && npm install && npm run build",
      "start_command": "cd backend && npm start",
      "node_version": "18"
    },
    "frontend": {
      "build_command": "cd frontend && npm install && npm run build",
      "output_dir": "frontend/dist",
      "install_command": "cd frontend && npm install",
      "node_version": "18"
    }
  }
}
```

**方法二：环境变量配置**
```env
# 前端构建配置
ZBPACK_BUILD_COMMAND=cd frontend && npm install && npm run build
ZBPACK_OUTPUT_DIR=frontend/dist
ZBPACK_INSTALL_COMMAND=cd frontend && npm install

# 或者指定工作目录
ZBPACK_ROOT_DIR=frontend
```

#### 3.3 更新前端 API 配置

**重要**：在部署前端之前，必须更新 API 基础 URL 指向后端服务。

1. **更新 API 配置文件**

   编辑 `frontend/src/config/api.js`：
   ```javascript
   // 生产环境 API 配置
   const API_CONFIG = {
     development: {
       baseURL: 'http://localhost:3001',
       timeout: 10000
     },
     production: {
       // 替换为你的后端 Zeabur URL
       baseURL: 'https://recruitment-backend-xxx.zeabur.app',
       timeout: 15000
     }
   };
   
   const environment = process.env.NODE_ENV || 'development';
   export const API_BASE_URL = API_CONFIG[environment].baseURL;
   export const API_TIMEOUT = API_CONFIG[environment].timeout;
   ```

2. **更新环境变量文件**

   创建 `frontend/.env.production`：
   ```env
   # API 配置
   VITE_API_BASE_URL=https://recruitment-backend-xxx.zeabur.app
   VITE_APP_NAME=Recruitment Automation
   VITE_APP_VERSION=1.0.0
   
   # 构建优化
   GENERATE_SOURCEMAP=false
   VITE_BUILD_ANALYZE=false
   ```

3. **更新 Vite 配置**（如果使用 Vite）

   编辑 `frontend/vite.config.js`：
   ```javascript
   import { defineConfig } from 'vite';
   import react from '@vitejs/plugin-react';
   
   export default defineConfig(({ mode }) => ({
     plugins: [react()],
     base: '/',
     build: {
       outDir: 'dist',
       sourcemap: mode === 'development',
       rollupOptions: {
         output: {
           manualChunks: {
             vendor: ['react', 'react-dom'],
             router: ['react-router-dom']
           }
         }
       }
     },
     server: {
       port: 3000,
       proxy: mode === 'development' ? {
         '/api': {
           target: 'http://localhost:3001',
           changeOrigin: true
         }
       } : undefined
     }
   }));
   ```

#### 3.4 前端环境变量配置

在 Zeabur 前端服务的 **Variables** 标签页添加：

```env
# === 构建配置 ===
NODE_ENV=production

# === API 配置 ===
VITE_API_BASE_URL=https://recruitment-backend-xxx.zeabur.app

# === 应用配置 ===
VITE_APP_NAME=Recruitment Automation
VITE_APP_VERSION=1.0.0

# === 构建优化 ===
GENERATE_SOURCEMAP=false
VITE_BUILD_ANALYZE=false

# === Zeabur 特定配置 ===
# 静态文件服务配置
ZBPACK_STATIC_SERVE=true
# SPA 路由支持
ZBPACK_SPA=true
```

#### 3.5 提交配置更改

```bash
# 提交前端配置更新
git add frontend/
git commit -m "feat: 配置前端生产环境 API 和构建设置"
git push origin develop
```

#### 3.6 部署前端服务

1. **开始部署**
   - 配置完成后，点击 **Deploy** 按钮
   - Zeabur 会自动执行：
     - 安装前端依赖
     - 执行构建命令（`npm run build`）
     - 部署静态文件到 CDN

2. **监控构建过程**
   - 查看 **Logs** 标签页的构建日志
   - 前端构建通常需要 3-8 分钟
   - 成功后显示 "Deployment successful"

3. **生成前端域名**
   - 切换到 **Networking** 标签页
   - 点击 **Generate Domain**
   - 记录前端 URL：`https://recruitment-frontend-xxx.zeabur.app`

#### 3.7 配置 SPA 路由支持

对于 React Router 等 SPA 应用，需要配置路由回退：

**方法一：使用 _redirects 文件**

在 `frontend/public/` 目录创建 `_redirects`：
```
/*    /index.html   200
```

**方法二：使用 Zeabur 配置**

添加环境变量：
```env
ZBPACK_SPA=true
```

#### 3.8 验证前端部署

```bash
# 测试前端访问
curl -I https://recruitment-frontend-xxx.zeabur.app

# 测试 SPA 路由
curl https://recruitment-frontend-xxx.zeabur.app/dashboard

# 测试 API 连接
# 在浏览器开发者工具中检查网络请求
```

**验证清单**：
- ✅ 前端页面正常加载
- ✅ SPA 路由工作正常
- ✅ API 请求成功连接后端
- ✅ 静态资源（CSS、JS、图片）正常加载
- ✅ 响应时间 < 2 秒

## 🔄 更新后端 CORS 配置

### 步骤 4: 配置生产环境 CORS

前端部署完成后，必须更新后端 CORS 配置以确保安全的跨域访问。

#### 4.1 更新 CORS 环境变量

1. **获取前端域名**
   - 记录前端服务的完整 URL
   - 格式：`https://recruitment-frontend-xxx.zeabur.app`

2. **更新后端 CORS 配置**
   
   在后端服务的 **Variables** 标签页中更新：
   ```env
   # 从通配符更新为具体域名
   CORS_ORIGIN=https://recruitment-frontend-xxx.zeabur.app
   
   # 可选：支持多个域名
   CORS_ORIGIN=https://recruitment-frontend-xxx.zeabur.app,https://your-custom-domain.com
   
   # 其他 CORS 配置
   CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
   CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-Requested-With
   CORS_CREDENTIALS=true
   ```

3. **验证 CORS 配置**
   
   后端代码应包含类似配置（`backend/src/middleware/cors.js`）：
   ```javascript
   const corsOptions = {
     origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
     methods: process.env.CORS_METHODS?.split(',') || ['GET', 'POST', 'PUT', 'DELETE'],
     allowedHeaders: process.env.CORS_ALLOWED_HEADERS?.split(',') || [
       'Content-Type', 'Authorization', 'X-Requested-With'
     ],
     credentials: process.env.CORS_CREDENTIALS === 'true'
   };
   ```

#### 4.2 重新部署后端

```bash
# 方法一：自动重启（推荐）
# 保存环境变量后，Zeabur 会自动重启服务

# 方法二：手动重新部署
# 在 Zeabur 控制台点击 "Redeploy" 按钮

# 方法三：触发新的部署
git commit --allow-empty -m "trigger: 重新部署后端服务"
git push origin develop
```

## ✅ 验证完整部署

### 步骤 5: 全面测试应用

#### 5.1 前端访问测试

```bash
# 测试前端页面加载
curl -I https://recruitment-frontend-xxx.zeabur.app

# 检查静态资源
curl -I https://recruitment-frontend-xxx.zeabur.app/static/css/main.css
```

**预期结果**：
- 状态码：200 OK
- Content-Type: text/html
- 页面加载时间 < 3 秒

#### 5.2 API 连接测试

```bash
# 测试后端健康检查
curl https://recruitment-backend-xxx.zeabur.app/health

# 测试 CORS 预检请求
curl -X OPTIONS \
  -H "Origin: https://recruitment-frontend-xxx.zeabur.app" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://recruitment-backend-xxx.zeabur.app/api/auth/login
```

**预期结果**：
- 健康检查返回 200 状态
- CORS 预检返回正确的 Access-Control 头部

#### 5.3 端到端功能测试

**在浏览器中测试以下功能**：

1. **用户认证流程**
   - ✅ 用户注册
   - ✅ 用户登录
   - ✅ JWT Token 验证
   - ✅ 用户登出

2. **核心业务功能**
   - ✅ 数据列表加载
   - ✅ 数据创建/编辑
   - ✅ 文件上传（如果有）
   - ✅ 搜索和筛选

3. **数据库连接**
   - ✅ Supabase 连接正常
   - ✅ 数据持久化成功
   - ✅ 实时更新（如果使用）

#### 5.4 性能和安全测试

```bash
# 性能测试
time curl https://recruitment-frontend-xxx.zeabur.app
time curl https://recruitment-backend-xxx.zeabur.app/api/health

# 安全测试
curl -H "Origin: https://malicious-site.com" \
  https://recruitment-backend-xxx.zeabur.app/api/test
```

**性能基准**：
- 前端首次加载：< 3 秒
- API 响应时间：< 500ms
- 恶意跨域请求应被拒绝

## 🎯 部署完成清单

### 基础部署
- [ ] ✅ 后端服务部署成功并运行
- [ ] ✅ 前端服务部署成功并可访问
- [ ] ✅ 环境变量配置正确
- [ ] ✅ 域名生成并可访问

### 功能验证
- [ ] ✅ API 连接正常工作
- [ ] ✅ 数据库连接正常
- [ ] ✅ CORS 配置正确
- [ ] ✅ 用户认证流程正常
- [ ] ✅ 核心业务功能正常

### 性能和安全
- [ ] ✅ 页面加载性能达标
- [ ] ✅ API 响应性能达标
- [ ] ✅ 跨域安全配置正确
- [ ] ✅ 环境变量安全配置

### 监控和维护
- [ ] ✅ 部署日志正常
- [ ] ✅ 错误监控配置
- [ ] ✅ 自动部署流程验证

## 🚀 后续优化建议

### 性能优化
1. **启用 CDN 加速**
   - 配置 Zeabur 的全球 CDN
   - 优化静态资源缓存策略

2. **数据库优化**
   - 配置 Supabase 连接池
   - 添加数据库索引优化

3. **前端优化**
   - 启用代码分割（Code Splitting）
   - 配置 Service Worker 缓存

### 安全加固
1. **环境变量管理**
   - 定期轮换 JWT Secret
   - 使用 Zeabur 的密钥管理

2. **访问控制**
   - 配置 IP 白名单（如需要）
   - 启用 DDoS 防护

### 监控和日志
1. **应用监控**
   - 集成 Sentry 错误监控
   - 配置性能监控

2. **日志管理**
   - 配置结构化日志
   - 设置日志告警

## 📚 更多资源

### 官方文档
- 📖 [Zeabur 官方文档](https://zeabur.com/docs/zh-CN) <mcreference link="https://zeabur.com/docs/zh-CN/get-started" index="1">1</mcreference>
- 🚀 [Node.js 部署指南](https://zeabur.com/docs/zh-CN/guides/nodejs) <mcreference link="https://zeabur.com/docs/zh-CN/guides/nodejs" index="2">2</mcreference>
- 🌐 [静态网站部署](https://zeabur.com/docs/zh-CN/guides/static)
- ⚙️ [环境变量配置](https://zeabur.com/docs/zh-CN/deploy/variables)
- 🔗 [自定义域名](https://zeabur.com/docs/zh-CN/deploy/domain)

### 社区资源
- 💬 [Zeabur Discord 社区](https://discord.gg/zeabur)
- 📝 [GitHub 示例项目](https://github.com/zeabur/zeabur)
- 🎥 [视频教程合集](https://www.youtube.com/c/zeabur)

### 故障排除
- 🔧 [常见问题解答](https://zeabur.com/docs/zh-CN/faq)
- 🐛 [故障排除指南](https://zeabur.com/docs/zh-CN/troubleshooting)
- 📞 [技术支持](https://zeabur.com/support)

## 🛠️ 高级配置

### 自定义域名（可选）

1. 在 "Domains" 标签页点击 "Custom Domain"
2. 输入您的域名
3. 按照提示配置 DNS 记录

### 环境变量管理

- 可以随时在 "Variables" 页面修改环境变量
- 修改后服务会自动重新部署
- 支持批量导入环境变量

### 监控和日志

- **实时日志**: 在服务页面查看实时日志
- **性能监控**: 查看 CPU、内存使用情况
- **访问统计**: 查看请求量和响应时间

## 🚨 故障排除

### 常见问题

1. **构建失败**
   - 检查 `package.json` 中的脚本命令
   - 确保所有依赖都在 `dependencies` 中
   - 查看构建日志中的错误信息

2. **服务无法启动**
   - 检查 `PORT` 环境变量是否正确
   - 确保应用监听 `process.env.PORT`
   - 查看服务日志

3. **前后端连接失败**
   - 检查 CORS 配置
   - 确认 API URL 是否正确
   - 检查网络请求是否被阻止

### 调试技巧

1. **查看日志**
   ```bash
   # 在 Zeabur 控制台的 Logs 标签页查看实时日志
   ```

2. **测试 API 连接**
   ```bash
   curl https://recruitment-backend-xxx.zeabur.app/health
   ```

3. **检查环境变量**
   - 在服务的 Variables 页面确认所有变量都已设置
   - 注意变量名的大小写

## 💰 费用说明

### 免费额度
- 静态网站：完全免费
- Serverless 函数：有一定免费额度

### 付费计划
- 最低 $5/月
- 按实际使用的 CPU、内存、存储计费
- 多个小项目可以共享资源

## 🔄 持续部署

### 自动部署
- 每次推送到 GitHub 都会触发自动部署
- 支持分支部署
- 可以设置部署钩子

### 版本管理
- 支持回滚到之前的版本
- 可以查看部署历史
- 支持蓝绿部署

## 📞 获取帮助

- **官方文档**: https://zeabur.com/docs
- **社区支持**: https://discord.gg/zeabur
- **中文客服**: 通过官网联系

---

🎉 **恭喜！您已成功在 Zeabur 上部署了智能招聘系统！**

记住保存好您的服务 URL 和访问凭据，定期检查服务状态和日志。