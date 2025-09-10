# Koyeb 后端部署详细指南

## 🎯 概述

本指南详细说明如何在 Koyeb 平台部署智能招聘系统的后端服务。

## 📋 前置条件

- [x] GitHub 账号
- [x] 代码已推送到 GitHub 仓库
- [x] 已配置 `deploy/config/.env.production` 文件

## 🚀 部署步骤

### 1. 访问 Koyeb 控制台

1. 打开浏览器，访问 [https://app.koyeb.com](https://app.koyeb.com)
2. 点击右上角 **Sign up** 或 **Log in**
3. 选择 **Continue with GitHub** 使用 GitHub 账号登录

### 2. 创建新服务

1. 登录后，在控制台首页点击 **Create Service** 按钮
2. 在 "Let's deploy a new service" 页面，选择 **GitHub** 选项
   - 可以看到 GitHub 和 Docker 两个选项
   - 选择 GitHub 来从代码仓库部署
3. 点击 GitHub 图标继续

### 3. 导入项目

1. 在 "Create a new service" 页面的 "Import project" 步骤中：
   - 如果是首次使用，需要授权 Koyeb 访问您的 GitHub 仓库
   - 在搜索框中输入仓库名称或从列表中选择 `recruitment-automation`
   - 选择分支：确保选择 `develop` 分支（默认可能是 `main` 或 `master`）
   - 确认选择正确的仓库和分支后点击 **Import** 按钮

### 4. 配置构建选项

1. 在 "Build options" 页面（步骤 2 of 4）：
   - 选择 **Buildpack** 选项（推荐，自动检测项目类型）
   - 或选择 **Dockerfile** 如果项目包含 Dockerfile

2. 展开 "Customize Buildpack settings" 部分：
   - **Run command**: 设置为 `cd backend && npm start`
   - **Build command**: 设置为 `cd backend && npm install`
   - **Work directory**: 保持默认 `/app`
   - **Privileged**: 保持默认关闭状态

### 5. 配置服务设置

1. 在 "Configure service" 页面（步骤 3 of 4）：
   - **Service name**: 输入 `recruitment-backend`
   - **Region**: 选择离您最近的区域（如 Frankfurt, Paris 等）
   - **Instance type**: 选择 **Nano** (免费套餐)
   - **Scaling**: 保持默认设置 (1 instance)

2. 点击 **Next** 继续到下一步

### 6. 环境变量配置

1. 在 "Environment variables" 页面（步骤 4 of 4）添加以下变量：
2. 点击 **Add variable** 按钮逐个添加：

```bash
# 从 deploy/config/.env.production 文件复制以下变量
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
JWT_SECRET=your_jwt_secret_here
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-domain.eu.org
UPLOAD_MAX_SIZE=10485760
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
```

### 7. 部署服务

1. 完成所有环境变量配置后，检查所有设置无误
2. 点击 **Deploy** 按钮开始部署
3. 系统会自动跳转到服务详情页面
4. 等待部署完成（通常需要 3-5 分钟）：
   - 可以在 **Deployments** 标签中查看部署进度
   - 在 **Logs** 标签中查看实时构建和运行日志
5. 部署成功后，服务状态会显示为 **Healthy** 或 **Running**

### 8. 获取服务 URL

1. 在服务详情页面，复制 **Public URL**
2. URL 格式通常为：`https://your-service-name-xxx.koyeb.app`
3. 记录此 URL，后续需要在前端配置中使用

## 🔧 部署后配置

### 更新前端配置

将获取到的 Koyeb URL 更新到以下文件：

1. `frontend/.env.production`
2. `deploy/config/.env.production`

```bash
REACT_APP_API_URL=https://your-service-name-xxx.koyeb.app
```

### 验证部署

运行验证脚本：

```bash
./deploy/scripts/verify-deployment.sh https://your-domain.eu.org https://your-service-name-xxx.koyeb.app
```

## 📊 监控和维护

### 查看日志

1. 在 Koyeb 控制台进入您的服务
2. 点击 **Logs** 标签查看运行日志
3. 可以实时监控服务状态和错误信息

### 重新部署

当代码更新后：

1. 推送代码到 GitHub 的 `develop` 分支
2. Koyeb 会自动检测到更改并重新部署
3. 也可以在控制台手动触发重新部署

### 免费额度管理

- Koyeb 提供每月 5.5 美元的免费额度
- Nano 实例每月消耗约 5.5 美元
- 需要每 14 天登录一次平台以保持服务活跃

## ❗ 常见问题

### 部署失败

1. **构建失败**: 检查 `package.json` 和依赖项
2. **启动失败**: 检查环境变量配置
3. **端口错误**: 确保使用端口 3001

### 服务无法访问

1. 检查服务状态是否为 **Running**
2. 验证环境变量是否正确配置
3. 查看服务日志排查错误

### 免费额度用完

1. 升级到付费计划
2. 或者暂停服务直到下个月额度重置

## 📞 技术支持

如遇到问题，可以：

1. 查看 [Koyeb 官方文档](https://www.koyeb.com/docs)
2. 联系 Koyeb 技术支持
3. 在项目 GitHub 仓库提交 Issue