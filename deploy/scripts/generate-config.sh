#!/bin/bash

echo "⚙️ 生成部署配置文件"
echo "=================="

# 创建生产环境配置
cat > deploy/config/.env.production << 'ENVEOF'
# ===========================================
# 智能招聘系统 - 生产环境配置
# ===========================================

# 数据库配置 (Supabase)
# 从 https://app.supabase.com/project/YOUR_PROJECT/settings/api 获取
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here

# 前端配置
# 后端部署完成后更新此URL
REACT_APP_API_URL=https://your-backend.koyeb.app
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# 后端配置
PORT=3001
NODE_ENV=production
# 前端部署完成后更新此URL
CORS_ORIGIN=https://your-domain.eu.org

# 可选配置
JWT_SECRET=your_jwt_secret_here
UPLOAD_MAX_SIZE=10485760
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
ENVEOF

echo "✅ 配置文件已生成: deploy/config/.env.production"
echo "📝 请编辑此文件，填入实际的配置值"
echo ""
echo "🔧 需要配置的项目："
echo "1. SUPABASE_URL - Supabase项目URL"
echo "2. SUPABASE_ANON_KEY - Supabase匿名密钥"
echo "3. SUPABASE_SERVICE_KEY - Supabase服务密钥"
echo "4. REACT_APP_API_URL - 后端API地址"
echo "5. CORS_ORIGIN - 前端域名"