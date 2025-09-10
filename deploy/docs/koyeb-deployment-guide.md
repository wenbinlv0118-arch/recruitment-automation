# Koyeb 后端部署详细指南

## 🎯 概述

本指南详细说明如何在 Koyeb 平台部署智能招聘系统的后端服务。

## 📋 前置条件

- [x] GitHub 账号
- [x] 代码已推送到 GitHub 仓库
- [x] 已配置 `deploy/config/.env.production` 文件
- [x] 后端目录包含 `Dockerfile`（已自动创建）
- [x] 后端目录包含 `.dockerignore`（已自动创建）

## 🚀 部署步骤

### 1. 访问 Koyeb 控制台

1. 打开浏览器，访问 [https://app.koyeb.com](https://app.koyeb.com)
2. 点击右上角 **Sign up** 或 **Log in**
3. 选择 **Continue with GitHub** 使用 GitHub 账号登录

### 2. 创建新服务

1. 登录后，在控制台首页点击 **Create Web Service**
2. Koyeb会直接进入部署配置页面

### 3. 配置部署源

1. 在 **Deploy from** 部分选择 **GitHub**
2. 如果是首次使用，需要授权 Koyeb 访问您的 GitHub 仓库
3. 在仓库列表中选择 `recruitment-automation`
4. 在分支选择中选择 `main` 或 `develop`
5. Koyeb会自动检测项目结构和配置

### 4. 自动检测和配置

Koyeb会自动检测项目配置：

- **自动检测**: Koyeb会扫描项目根目录和子目录
- **Dockerfile优先**: 检测到 `backend/Dockerfile`，会使用Docker构建
- **工作目录**: 自动设置为 `backend/`
- **端口检测**: 从Dockerfile中的EXPOSE指令检测端口3001
- **健康检查**: 使用Dockerfile中定义的健康检查

**推荐配置**（通常自动检测）：
```bash
# 构建方式
Docker

# 工作目录
backend/

# 端口
3001

# 健康检查端点
/api/health
```

如需手动配置，可在 **Advanced** 部分调整：
- 构建参数
- 环境变量
- 资源限制

### 5. 服务配置

1. **App name**: `recruitment-backend`
2. **Instance type**: 选择 **Nano** (512MB RAM, 0.1 vCPU)
3. **Regions**: 选择离用户最近的区域（如 Frankfurt, Paris）
4. **Scaling**: 保持默认设置 (1 instance)
5. **Health checks**: Koyeb会自动配置健康检查

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
2. Koyeb开始构建和部署过程：
   - **Building**: 下载代码并构建应用
   - **Deploying**: 部署到选定区域
   - **Starting**: 启动应用实例
3. 整个过程通常需要 2-5 分钟
4. 部署成功后，服务状态变为 **Healthy**

### 8. 获取服务 URL

1. 在服务详情页面，复制 **Public URL**
2. URL 格式通常为：`https://your-service-name-xxx.koyeb.app`
3. 记录此 URL，后续需要在前端配置中使用

## 🐳 Docker部署优势

使用Docker部署具有以下优势：

- **环境一致性**: 确保开发、测试、生产环境完全一致
- **依赖管理**: 所有系统依赖都打包在镜像中
- **快速启动**: 容器启动速度快，扩展性好
- **资源隔离**: 更好的资源管理和安全性
- **健康检查**: 内置健康检查机制，自动重启故障实例

### Docker配置说明

项目已包含优化的Docker配置：

1. **Dockerfile**: 基于Alpine Linux的轻量级镜像
2. **.dockerignore**: 排除不必要文件，减小镜像体积
3. **健康检查**: 自动监控应用状态
4. **多阶段构建**: 优化构建过程和镜像大小

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

1. 推送代码到 GitHub 的对应分支
2. Koyeb 会自动检测到更改并触发重新部署
3. 也可以在控制台点击 **Redeploy** 手动触发
4. 支持回滚到之前的部署版本

### 免费额度管理

- Koyeb 提供每月免费额度（具体额度可能调整）
- Nano 实例：512MB RAM, 0.1 vCPU
- 免费额度包括：计算时间、带宽、构建时间
- 超出免费额度后按使用量计费
- 可在控制台查看当前使用情况

## ❗ 常见问题

### 部署失败

1. **构建失败**: 
   - 检查 `package.json` 和依赖项
   - 查看构建日志中的错误信息
   - 确保Node.js版本兼容
2. **启动失败**: 
   - 检查环境变量配置
   - 验证启动命令是否正确
   - 查看应用日志排查错误
3. **健康检查失败**: 
   - 确保应用正确监听端口
   - 检查应用是否能正常响应HTTP请求

### 服务无法访问

1. 检查服务状态是否为 **Healthy**
2. 验证环境变量是否正确配置
3. 查看服务日志排查错误
4. 检查域名DNS配置（如使用自定义域名）
5. 验证防火墙和安全组设置

### 免费额度用完

1. 升级到付费计划
2. 或者暂停服务直到下个月额度重置

## 📞 技术支持

如遇到问题，可以：

1. 查看 [Koyeb 官方文档](https://www.koyeb.com/docs)
2. 联系 Koyeb 技术支持
3. 在项目 GitHub 仓库提交 Issue