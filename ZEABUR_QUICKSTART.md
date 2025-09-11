# 🚀 Zeabur 快速部署指南

> 基于 Zeabur 官方文档的智能招聘系统部署指南 - 支持 Monorepo 自动识别

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

### 步骤 1: 创建账户和项目
1. 访问 [Zeabur](https://zeabur.com) 并用 GitHub 登录
2. 点击 **创建项目** 按钮（或使用快捷键 `Cmd/Ctrl + K`）
3. 选择部署区域（推荐选择离用户最近的区域）：
   - 🇺🇸 AWS us-west-1 (美国西部)
   - 🇺🇸 AWS us-east-1 (美国东部) 
   - 🇯🇵 AWS ap-northeast-1 (日本)
   - 🇸🇬 AWS ap-southeast-1 (新加坡)
4. 系统会自动创建项目，稍后可在设置中修改名称

### 步骤 2: 部署后端服务 ⚡

> 💡 **Zeabur 优势**: 自动识别 Monorepo 结构，无需复杂配置

1. **添加服务** → **Git Service**
2. **配置 GitHub 访问权限**（首次使用需要）
3. **选择仓库**: `Recruitment-automation`
   - **重要**：选择 `develop` 分支（推荐）或 `main` 分支
   - 点击 **Import** 导入仓库
4. **配置后端服务**:
   - 在服务配置页面，设置 **Root Directory** 为 `backend`
   - 服务名称建议设为 `recruitment-backend`
   - Zeabur 会自动检测为 Node.js 应用
   - 可选择创建 `zbpack.json` 配置文件（已提供）

5. **环境变量配置**:
   ```env
   # 基础配置
   NODE_ENV=production
   PORT=$PORT
   
   # 数据库配置
   SUPABASE_URL=https://fftjmohzkzkkqzqgaqfe.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDI1NjYsImV4cCI6MjA3Mjg3ODU2Nn0._PQEDYFp0XTL8sHatcVCMl6pcjooLo79CASTaulFbdQ
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzMwMjU2NiwiZXhwIjoyMDcyODc4NTY2fQ.ZhVVUag5S1q2fCSEQ2q_H_z5hV5gXrOdSJ1Q2k3fYTk
   
   # JWT 配置
   JWT_SECRET=your_generated_jwt_secret_from_script
   
   # CORS 配置（临时设置）
   CORS_ORIGIN=*
   ```

6. **部署并获取域名**:
   - 点击 **Deploy** 开始部署
   - 部署完成后，在 **Networking** 标签页生成域名
   - 📝 记录后端 URL: `https://recruitment-backend-xxx.zeabur.app`

### 步骤 3: 部署前端服务 🎨

1. **添加第二个服务** → **Git Service**
2. **选择相同仓库** `Recruitment-automation`
3. **配置前端服务**:
   - 同样选择 `develop` 分支
   - 设置 **Root Directory** 为 `frontend`
   - 服务名称建议设为 `recruitment-frontend`
4. **前端 Monorepo 配置**:
   - 创建前端专用的 `zbpack.json`：
     ```json
     {
       "build_command": "cd frontend && npm install && npm run build",
       "static": true,
       "output_dir": "frontend/build"
     }
     ```
   - 或使用环境变量：
     ```env
     ZBPACK_BUILD_COMMAND=cd frontend && npm install && npm run build
     ZBPACK_STATIC_DIR=frontend/build
     ```

4. **前端环境变量**:
   ```env
   # React 应用配置
   REACT_APP_API_URL=https://recruitment-backend-xxx.zeabur.app
   REACT_APP_SUPABASE_URL=https://fftjmohzkzkkqzqgaqfe.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDI1NjYsImV4cCI6MjA3Mjg3ODU2Nn0._PQEDYFp0XTL8sHatcVCMl6pcjooLo79CASTaulFbdQ
   
   # 静态网站部署配置
   ZBPACK_STATIC_DIR=build
   ```

5. **部署前端**:
   - 前端会自动使用 Caddy 进行静态托管（更轻量、更省资源）
   - 生成前端域名: `https://recruitment-frontend-xxx.zeabur.app`

### 步骤 4: 更新 CORS 配置 🔒
1. 回到后端服务的 **Variables** 页面
2. 更新 `CORS_ORIGIN`:
   ```env
   CORS_ORIGIN=https://recruitment-frontend-xxx.zeabur.app
   ```
3. 保存后自动重新部署

## ✅ 验证部署

### 1. 检查服务状态
- 在 Zeabur 控制台查看两个服务的运行状态
- 确保都显示为 "Running" 状态
- 查看 **Logs** 标签页检查是否有错误信息

### 2. 测试后端 API
```bash
# 健康检查
curl https://recruitment-backend-xxx.zeabur.app/health

# 测试 API 响应
curl https://recruitment-backend-xxx.zeabur.app/api/test
```

### 3. 测试前端应用
1. 访问前端 URL: `https://recruitment-frontend-xxx.zeabur.app`
2. 检查浏览器控制台是否有网络错误
3. 尝试登录和基本功能

## 🛠️ 高级配置

### Node.js 版本指定
在 `package.json` 中指定 Node.js 版本：
```json
{
  "engines": {
    "node": "18.x"
  }
}
```

### 包管理器配置
在 `package.json` 中指定包管理器：
```json
{
  "packageManager": "npm@9.0.0"
}
```

### 自定义构建命令
使用 `zbpack.json` 进行更精细的控制：
```json
{
  "build_command": "npm run build:prod",
  "start_command": "npm run start:prod",
  "install_command": "npm ci",
  "cache_dependencies": false
}
```

### 环境变量最佳实践
```env
# 使用 Zeabur 提供的动态端口
PORT=$PORT

# 生产环境优化
NODE_ENV=production
NPM_CONFIG_PRODUCTION=true

# 禁用开发工具
REACT_APP_NODE_ENV=production
```

## 🚨 常见问题

### Q: Monorepo 部署失败？
**A**: 确保正确配置了构建路径：
```json
// zbpack.json
{
  "build_command": "cd backend && npm install && npm run build",
  "start_command": "cd backend && npm start"
}
```

### Q: 静态资源 404 错误？
**A**: 检查前端构建输出目录：
```env
ZBPACK_STATIC_DIR=build
# 或者
ZBPACK_STATIC_DIR=frontend/build
```

### Q: CORS 错误？
**A**: 确保后端 CORS 配置正确：
```env
CORS_ORIGIN=https://your-frontend-domain.zeabur.app
# 开发阶段可以使用
CORS_ORIGIN=*
```

### Q: 环境变量不生效？
**A**: 
1. 检查变量名是否正确（React 需要 `REACT_APP_` 前缀）
2. 重新部署服务使变量生效
3. 在 Logs 中检查变量是否正确加载

### Q: 构建超时？
**A**: 优化构建过程：
```json
{
  "install_command": "npm ci --only=production",
  "build_command": "npm run build --silent"
}
```

## 📊 监控和日志

### 实时日志查看
- 在 Zeabur 控制台的 **Logs** 标签页查看实时日志
- 使用过滤器筛选特定类型的日志
- 下载日志文件进行离线分析

### 性能监控
- 在 **Metrics** 标签页查看 CPU、内存使用情况
- 监控请求响应时间和错误率
- 设置告警通知

## 💰 成本优化

### 静态网站部署
前端使用静态部署可以显著降低成本：
```env
ZBPACK_STATIC_DIR=build
```

### 资源配置
- 根据实际需求调整 CPU 和内存配置
- 使用 Zeabur 的按需计费模式
- 监控资源使用情况，避免过度配置

## 🔄 持续部署

### 自动部署
Zeabur 支持 Git 推送自动部署：
1. 推送到 `main` 或 `develop` 分支自动触发部署
2. 在项目设置中配置部署分支
3. 使用 GitHub Actions 进行更复杂的 CI/CD 流程

### 分支部署
```bash
# 部署到生产环境
git push origin main

# 部署到测试环境
git push origin develop
```

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