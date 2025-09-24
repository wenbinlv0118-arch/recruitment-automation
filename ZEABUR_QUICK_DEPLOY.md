# Zeabur 快速部署指南

## 🚀 一键部署智能寻聘系统

### 前置条件
- GitHub 账户
- 项目代码已推送到 GitHub
- Supabase 数据库已配置

### 步骤 1: 准备部署

```bash
# 1. 运行部署准备脚本
./deploy/scripts/prepare-zeabur.sh

# 2. 验证部署就绪状态
cd backend && ./set-zeabur-env.sh

# 3. 提交并推送代码
git add .
git commit -m "准备 Zeabur 部署"
git push origin develop
```

### 步骤 2: 在 Zeabur 部署后端

1. **访问 Zeabur**
   - 打开 [Zeabur 控制台](https://dash.zeabur.com)
   - 使用 GitHub 账户登录

2. **创建项目**
   - 点击「创建项目」
   - 选择部署区域（推荐：AWS ap-northeast-1 日本）

3. **部署后端服务**
   - 点击「添加服务」→「Git Service」
   - 选择 `recruitment-automation` 仓库
   - 选择 `develop` 分支
   - 设置 Root Directory: `backend`

4. **配置环境变量**
   ```env
   NODE_ENV=production
   PORT=$PORT
   SUPABASE_URL=https://fftjmohzkzkkqzqgaqfe.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDI1NjYsImV4cCI6MjA3Mjg3ODU2Nn0._PQEDYFp0XTL8sHatcVCMl6pcjooLo79CASTaulFbdQ
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzMwMjU2NiwiZXhwIjoyMDcyODc4NTY2fQ.ZhVVUag5S1q2fCSEQ2q_H_z5hV5gXrOdSJ1Q2k3fYTk
   JWT_SECRET=your_generated_jwt_secret_from_script
   CORS_ORIGIN=*
   BROWSER_HEADLESS=true
   ZEABUR=true
   CONTAINER=true
   PUPPETEER_SKIP_DOWNLOAD=true
   PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
   ```

5. **部署并获取 URL**
   - 点击「Deploy」开始部署
   - 等待部署完成（约 3-5 分钟）
   - 复制后端服务 URL（如：https://recruitment-backend-xxx.zeabur.app）

### 步骤 3: 部署前端

1. **更新前端配置**
   ```bash
   # 使用后端 URL 更新前端配置
   ./deploy/scripts/prepare-zeabur.sh https://recruitment-backend-xxx.zeabur.app
   
   # 提交更改
   git add frontend/.env.production
   git commit -m "更新前端 API URL"
   git push origin develop
   ```

2. **部署前端服务**
   - 在 Zeabur 项目中点击「添加服务」→「Git Service」
   - 选择同一个仓库和分支
   - 设置 Root Directory: `frontend`
   - Zeabur 会自动识别为 React 静态网站

3. **获取前端 URL**
   - 部署完成后复制前端 URL（如：https://recruitment-frontend-xxx.zeabur.app）

### 步骤 4: 更新 CORS 配置

1. **更新后端 CORS**
   - 在后端服务的环境变量中
   - 将 `CORS_ORIGIN=*` 改为 `CORS_ORIGIN=https://recruitment-frontend-xxx.zeabur.app`
   - 重新部署后端服务

### 步骤 5: 部署 VNC 服务（可选）

1. **部署 VNC 浏览器服务**
   - 添加新服务，选择同一个仓库
   - 设置 Root Directory: `vnc-service`
   - 配置环境变量：
     ```env
     VNC_RESOLUTION=1280x720
     VNC_PASSWORD=vnc123
     NODE_ENV=production
     ZEABUR=true
     CONTAINER=true
     ```

## 🔧 部署后验证

### 自动状态检查

使用我们提供的部署状态检查脚本：

```bash
# 检查所有服务状态
./deploy/scripts/check-deployment-status.sh \
  https://your-backend.zeabur.app \
  https://your-frontend.zeabur.app \
  https://your-vnc.zeabur.app

# 交互式检查（推荐）
./deploy/scripts/check-deployment-status.sh
```

该脚本会自动检查：
- ✅ 服务可访问性
- ✅ API 健康状态
- ✅ 数据库连接
- ✅ CORS 配置
- ✅ 生成部署报告

### 手动验证步骤

1. **后端服务验证**
   ```bash
   curl https://your-backend.zeabur.app/api/health
   # 应返回: {"status":"ok","timestamp":"..."}
   ```

2. **前端应用验证**
   - 访问前端 URL
   - 检查页面是否正常加载
   - 测试用户登录功能

3. **VNC 服务验证**（如果部署）
   - 访问 VNC URL
   - 测试浏览器自动化功能

## 🛠️ 常见问题解决

### 部署失败
1. **检查构建日志**
   - 在 Zeabur 服务页面查看 Logs 标签
   - 查找错误信息

2. **常见错误及解决方案**
   ```bash
   # 依赖安装失败
   # 解决：检查 package.json 中的依赖版本
   
   # 端口冲突
   # 解决：确保使用 PORT=$PORT 环境变量
   
   # 环境变量缺失
   # 解决：检查所有必需的环境变量是否已配置
   ```

### 服务无法访问
1. **检查服务状态**
   - 确保服务显示为「Running」状态
   - 检查服务日志是否有错误

2. **检查网络配置**
   - 确保端口配置正确
   - 检查防火墙设置

### CORS 错误
1. **临时解决**
   ```env
   CORS_ORIGIN=*
   ```

2. **生产环境配置**
   ```env
   CORS_ORIGIN=https://your-frontend-domain.zeabur.app
   ```

## 📊 监控和维护

### 1. 服务监控
- 在 Zeabur 控制台查看服务状态
- 监控资源使用情况
- 查看访问日志

### 2. 自动部署
- 推送到 `develop` 分支会自动触发重新部署
- 可以在 Zeabur 中配置部署分支

### 3. 备份和恢复
- 定期备份 Supabase 数据库
- 保存重要的环境变量配置

## 🎯 部署成功标志

✅ 后端服务正常运行  
✅ 前端页面可以访问  
✅ 用户可以正常登录  
✅ API 调用正常响应  
✅ 数据库连接正常  
✅ VNC 服务可选运行  

## 📞 技术支持

### 故障排除

如果遇到部署问题，请参考详细的故障排除指南：

📖 **[Zeabur 故障排除指南](deploy/docs/zeabur-troubleshooting.md)**

该指南包含：
- 🚨 常见部署问题及解决方案
- 🔧 调试工具和方法
- 📊 性能优化建议
- 🚀 部署最佳实践

### 获取帮助

1. **查看日志**：在 Zeabur 控制台查看详细的构建和运行日志
2. **检查文档**：参考 `deploy/docs/zeabur-deployment-guide.md`
3. **运行检查脚本**：使用 `check-deployment-status.sh` 诊断问题
4. **环境变量**：确保所有必需的环境变量都已正确设置
5. **网络问题**：检查域名解析和 CORS 配置
6. **联系支持**：如需帮助，请提供详细的错误信息和日志

---

**部署完成！** 🎉

您的智能寻聘系统现在已经在 Zeabur 上成功运行。