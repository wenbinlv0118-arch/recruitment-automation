# 🚀 智能招聘系统 - 快速部署指南

## 📋 部署概览

本项目采用完全免费的部署方案：
- **前端**: 腾讯云EdgeOne Pages (免费)
- **后端**: Koyeb (免费5.5美元/月)
- **数据库**: Supabase (免费500MB)
- **域名**: eu.org二级域名 (免费)
- **CDN**: Cloudflare (免费)

## ⚡ 一键部署

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd Recruitment-automation

# 2. 运行一键部署脚本
./deploy/deploy.sh
```

## 📝 分步部署

### 步骤1: 环境检查
```bash
./deploy/scripts/check-environment.sh
```

### 步骤2: 生成配置文件
```bash
./deploy/scripts/generate-config.sh
```

### 步骤3: 配置数据库
```bash
./deploy/scripts/get-supabase-config.sh
```

### 步骤4: 构建前端
```bash
./deploy/scripts/build-frontend.sh
```

### 步骤5: 部署后端
```bash
./deploy/scripts/deploy-backend.sh
```

### 步骤6: 部署前端
```bash
./deploy/scripts/deploy-frontend.sh
```

### 步骤7: 配置域名
```bash
./deploy/scripts/setup-domain.sh
./deploy/scripts/setup-cloudflare.sh
```

### 步骤8: 验证部署
```bash
./deploy/scripts/verify-deployment.sh https://your-domain.eu.org https://your-backend.koyeb.app
```

## 🔧 配置说明

### 必需的环境变量
```bash
# 数据库配置
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# 应用配置
REACT_APP_API_URL=https://your-backend.koyeb.app
REACT_APP_FRONTEND_URL=https://your-domain.eu.org

# JWT配置
JWT_SECRET=your_jwt_secret_key
```

## 📚 详细文档

- [完整部署指南](./DEPLOYMENT_GUIDE.md)
- [项目结构说明](./README.md)

## 🆘 常见问题

### Q: 部署失败怎么办？
A: 运行健康检查脚本诊断问题：
```bash
./deploy/scripts/health-check.sh https://your-backend.koyeb.app
```

### Q: 域名申请被拒绝？
A: 尝试其他免费域名服务或使用临时域名测试

### Q: 前端无法连接后端？
A: 检查CORS配置和环境变量设置

## 📞 技术支持

如遇到问题，请检查：
1. 所有环境变量是否正确配置
2. 服务是否正常启动
3. 域名DNS是否生效
4. 防火墙设置是否正确

---

🎉 **恭喜！** 您的智能招聘系统已成功部署！