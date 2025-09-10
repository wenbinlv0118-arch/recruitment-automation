# Zeabur 部署指南

本指南将详细介绍如何在 Zeabur 平台部署智能招聘系统。

## 📋 部署前准备

### 1. 确保项目已推送到 GitHub
```bash
# 确保所有更改已提交并推送
git add .
git commit -m "准备 Zeabur 部署"
git push origin develop
```

### 2. 准备环境变量
确保 `deploy/config/.env.production` 文件包含所有必要的环境变量。

## 🚀 开始部署

### 步骤 1: 注册 Zeabur 账户

1. 访问 [Zeabur 官网](https://zeabur.com)
2. 点击 "Get Started" 或 "开始使用"
3. 使用 GitHub 账户登录（推荐）
4. 授权 Zeabur 访问您的 GitHub 仓库

### 步骤 2: 创建新项目

1. 登录 Zeabur 控制台：https://dash.zeabur.com
2. 点击 "Create New Project" 创建新项目
3. 输入项目名称：`recruitment-automation`
4. 选择合适的区域（推荐选择离用户最近的区域）

## 🔧 部署后端服务

### 步骤 3: 部署后端

1. **添加服务**
   - 在项目页面点击 "Add New Service"
   - 选择 "Deploy Your Source Code"

2. **选择仓库**
   - 在 GitHub 仓库列表中找到 `Recruitment-automation`
   - 点击 "Import" 按钮

3. **配置后端服务**
   - **Service name**: 输入 `recruitment-backend`
   - **Root Directory**: 设置为 `backend`（重要！）
   - **Framework**: Zeabur 会自动检测为 Node.js
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

4. **环境变量配置**
   点击 "Variables" 标签页，添加以下环境变量：

   ```
   NODE_ENV=production
   PORT=3001
   
   # 数据库配置
   SUPABASE_URL=https://fftjmohzkzkkqzqgaqfe.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDI1NjYsImV4cCI6MjA3Mjg3ODU2Nn0._PQEDYFp0XTL8sHatcVCMl6pcjooLo79CASTaulFbdQ
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzMwMjU2NiwiZXhwIjoyMDcyODc4NTY2fQ.ZhVVUag5S1q2fCSEQ2q_H_z5hV5gXrOdSJ1Q2k3fYTk
   
   # JWT 配置
   JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
   
   # CORS 配置（临时设置，前端部署后更新）
   CORS_ORIGIN=*
   
   # 可选配置
   UPLOAD_MAX_SIZE=10485760
   RATE_LIMIT_WINDOW=900000
   RATE_LIMIT_MAX=100
   ```

5. **部署后端**
   - 点击 "Deploy" 按钮
   - 等待构建和部署完成（通常需要 2-5 分钟）

6. **获取后端 URL**
   - 部署成功后，点击 "Domains" 标签页
   - 点击 "Generate Domain" 生成域名
   - 记录生成的 URL，格式类似：`https://recruitment-backend-xxx.zeabur.app`

## 🌐 部署前端服务

### 步骤 4: 更新前端配置

在部署前端之前，需要更新前端的环境变量：

1. 编辑 `frontend/.env.production` 文件：
   ```
   REACT_APP_API_URL=https://recruitment-backend-xxx.zeabur.app
   REACT_APP_SUPABASE_URL=https://fftjmohzkzkkqzqgaqfe.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDI1NjYsImV4cCI6MjA3Mjg3ODU2Nn0._PQEDYFp0XTL8sHatcVCMl6pcjooLo79CASTaulFbdQ
   ```

2. 提交更改：
   ```bash
   git add frontend/.env.production
   git commit -m "更新前端 API URL 配置"
   git push origin develop
   ```

### 步骤 5: 部署前端

1. **添加前端服务**
   - 在同一个项目中点击 "Add New Service"
   - 选择 "Deploy Your Source Code"
   - 选择相同的 GitHub 仓库

2. **配置前端服务**
   - **Service name**: 输入 `recruitment-frontend`
   - **Root Directory**: 设置为 `frontend`
   - **Framework**: Zeabur 会自动检测为 React
   - **Build Command**: `npm install && npm run build`
   - **Output Directory**: `build`

3. **静态网站配置**
   在 "Variables" 标签页添加：
   ```
   ZBPACK_STATIC_DIR=build
   ```

4. **部署前端**
   - 点击 "Deploy" 按钮
   - 等待构建和部署完成

5. **获取前端 URL**
   - 部署成功后，生成前端域名
   - 记录前端 URL，格式类似：`https://recruitment-frontend-xxx.zeabur.app`

## 🔄 更新后端 CORS 配置

### 步骤 6: 更新 CORS 设置

1. 回到后端服务的 "Variables" 页面
2. 更新 `CORS_ORIGIN` 环境变量：
   ```
   CORS_ORIGIN=https://recruitment-frontend-xxx.zeabur.app
   ```
3. 保存后，服务会自动重新部署

## ✅ 验证部署

### 步骤 7: 测试应用

1. **访问前端应用**
   - 打开前端 URL
   - 检查页面是否正常加载

2. **测试后端连接**
   - 在前端尝试登录或其他需要后端的功能
   - 检查浏览器开发者工具的网络请求

3. **检查日志**
   - 在 Zeabur 控制台查看服务日志
   - 确保没有错误信息

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