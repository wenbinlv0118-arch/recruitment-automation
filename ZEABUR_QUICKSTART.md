# 🚀 Zeabur 快速部署指南

> 5 分钟快速部署智能招聘系统到 Zeabur 平台

## 📋 准备工作

### 1. 运行准备脚本
```bash
# 在项目根目录运行
./deploy/scripts/prepare-zeabur.sh
```

### 2. 确保代码已推送到 GitHub
```bash
git add .
git commit -m "准备 Zeabur 部署"
git push origin develop
```

## 🌐 开始部署

### 步骤 1: 注册并创建项目
1. 访问 [Zeabur](https://zeabur.com) 并用 GitHub 登录
2. 创建新项目：`recruitment-automation`

### 步骤 2: 部署后端 ⚡
1. **添加服务** → **Deploy Your Source Code**
2. **选择仓库**: `Recruitment-automation`
3. **配置服务**:
   - Service name: `recruitment-backend`
   - Root Directory: `backend` ⚠️
   - Framework: Node.js (自动检测)

4. **环境变量配置** (复制 `deploy/config/.env.zeabur` 内容):
   ```
   NODE_ENV=production
   PORT=3001
   SUPABASE_URL=https://fftjmohzkzkkqzqgaqfe.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDI1NjYsImV4cCI6MjA3Mjg3ODU2Nn0._PQEDYFp0XTL8sHatcVCMl6pcjooLo79CASTaulFbdQ
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzMwMjU2NiwiZXhwIjoyMDcyODc4NTY2fQ.ZhVVUag5S1q2fCSEQ2q_H_z5hV5gXrOdSJ1Q2k3fYTk
   JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
   CORS_ORIGIN=*
   ```

5. **部署** → 等待完成 → **生成域名** → 📝 记录后端 URL

### 步骤 3: 更新前端配置 🔄
```bash
# 使用脚本自动更新（替换为实际的后端 URL）
./deploy/scripts/prepare-zeabur.sh https://recruitment-backend-xxx.zeabur.app

# 提交更改
git add frontend/.env.production
git commit -m "更新前端 API URL"
git push origin develop
```

### 步骤 4: 部署前端 🎨
1. **添加服务** → **Deploy Your Source Code**
2. **选择相同仓库**
3. **配置服务**:
   - Service name: `recruitment-frontend`
   - Root Directory: `frontend` ⚠️
   - Framework: React (自动检测)

4. **环境变量**:
   ```
   ZBPACK_STATIC_DIR=build
   ```

5. **部署** → 等待完成 → **生成域名** → 📝 记录前端 URL

### 步骤 5: 更新 CORS 配置 🔒
1. 回到后端服务的 Variables 页面
2. 更新 `CORS_ORIGIN` 为前端 URL:
   ```
   CORS_ORIGIN=https://recruitment-frontend-xxx.zeabur.app
   ```
3. 保存 → 自动重新部署

## ✅ 验证部署

1. **访问前端**: 打开前端 URL
2. **测试功能**: 尝试登录和其他功能
3. **检查日志**: 在 Zeabur 控制台查看服务日志

## 🛠️ 常用命令

```bash
# 生成新的 JWT Secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 测试后端连接
curl https://your-backend-url.zeabur.app/health

# 查看项目状态
git status
```

## 🚨 常见问题

| 问题 | 解决方案 |
|------|----------|
| 构建失败 | 检查 Root Directory 设置是否正确 |
| 服务无法启动 | 确认 PORT 环境变量和应用监听端口 |
| 前后端连接失败 | 检查 CORS_ORIGIN 和 API URL 配置 |
| 404 错误 | 确认服务已成功部署并生成域名 |

## 📚 更多资源

- 📖 [详细部署指南](deploy/docs/zeabur-deployment-guide.md)
- 🔧 [环境变量配置](deploy/config/.env.zeabur)
- 🌐 [Zeabur 官方文档](https://zeabur.com/docs)

---

🎉 **部署完成！** 您的智能招聘系统现在已经在 Zeabur 上运行了！

💡 **小贴士**: 
- 每次代码更新后会自动重新部署
- 可以在 Zeabur 控制台实时查看日志
- 支持自定义域名和 HTTPS