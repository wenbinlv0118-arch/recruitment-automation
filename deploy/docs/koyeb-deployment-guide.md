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

1. 登录后，在控制台首页点击 **Create Service**
2. 在服务类型选择页面，选择 **Web Service**
3. 继续下一步

### 3. 配置部署源

1. 在 **Deploy from** 部分选择 **GitHub**
2. 如果是首次使用，需要授权 Koyeb 访问您的 GitHub 仓库
3. 在仓库列表中选择 `recruitment-automation`
4. 在分支选择中选择 `develop`

### 4. 配置构建设置

在 **Build and deployment settings** 部分配置：

```bash
# Build command
cd backend && npm install

# Run command  
cd backend && npm start

# Port
3001
```

### 5. 服务配置

1. **Service name**: `recruitment-backend`
2. **Instance type**: 选择 **Nano** (免费套餐)
3. **Scaling**: 保持默认设置 (1 instance)

### 6. 环境变量配置

在 **Environment variables** 部分添加以下变量：

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

1. 检查所有配置无误后，点击 **Deploy**
2. 等待部署完成（通常需要 3-5 分钟）
3. 部署成功后，您将看到服务状态变为 **Running**

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