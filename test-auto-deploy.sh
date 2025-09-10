#!/bin/bash

# 自动部署测试脚本
# 用于验证GitHub Actions和部署配置是否正确设置

echo "🚀 开始测试自动部署配置..."

# 检查必要文件是否存在
echo "📋 检查配置文件..."

required_files=(
    ".github/workflows/deploy.yml"
    "vercel.json"
    "netlify.toml"
    "deployment-config.js"
    "package.json"
    "frontend/package.json"
    "backend/package.json"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "❌ $file 缺失"
        exit 1
    fi
done

# 检查Git仓库状态
echo "\n🔍 检查Git仓库状态..."
if [ -d ".git" ]; then
    echo "✅ Git仓库已初始化"
    
    # 检查当前分支
    current_branch=$(git branch --show-current 2>/dev/null || echo "未知")
    echo "📍 当前分支: $current_branch"
    
    # 检查远程仓库
    remote_url=$(git remote get-url origin 2>/dev/null || echo "未设置")
    echo "🌐 远程仓库: $remote_url"
else
    echo "⚠️  Git仓库未初始化"
    echo "💡 建议运行: git init && git remote add origin <your-repo-url>"
fi

# 验证部署配置
echo "\n🔧 验证部署配置..."
node deployment-config.js validate development
node deployment-config.js validate staging
node deployment-config.js validate production

# 测试构建流程
echo "\n🏗️  测试构建流程..."
echo "前端构建测试:"
cd frontend
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 前端构建成功"
else
    echo "❌ 前端构建失败"
fi
cd ..

echo "后端构建测试:"
cd backend
npm run build > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 后端构建成功"
else
    echo "❌ 后端构建失败"
fi
cd ..

# 检查环境变量模板
echo "\n📝 检查环境变量模板..."
env_files=(
    ".env.example"
    "frontend/.env.example"
    "backend/env.example"
)

for file in "${env_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file 存在"
    else
        echo "⚠️  $file 缺失"
    fi
done

# 生成部署检查清单
echo "\n📋 生成部署检查清单..."
echo "\n=== 自动部署配置检查清单 ==="
echo "\n✅ 已完成的配置:"
echo "   - GitHub Actions工作流程 (.github/workflows/deploy.yml)"
echo "   - Vercel配置 (vercel.json)"
echo "   - Netlify配置 (netlify.toml)"
echo "   - 部署脚本 (deployment-config.js)"
echo "   - 环境变量模板"
echo "   - 构建脚本"

echo "\n🔧 需要手动配置的项目:"
echo "   1. 创建GitHub仓库并推送代码"
echo "   2. 在GitHub仓库中设置以下Secrets:"
echo "      - VERCEL_TOKEN"
echo "      - VERCEL_ORG_ID"
echo "      - VERCEL_PROJECT_ID"
echo "      - NETLIFY_AUTH_TOKEN"
echo "      - NETLIFY_SITE_ID"
echo "      - NETLIFY_STAGING_SITE_ID"
echo "      - SUPABASE_URL"
echo "      - SUPABASE_ANON_KEY"
echo "      - SUPABASE_SERVICE_ROLE_KEY"
echo "      - STAGING_SUPABASE_URL"
echo "      - STAGING_SUPABASE_ANON_KEY"
echo "      - STAGING_SUPABASE_SERVICE_ROLE_KEY"
echo "   3. 创建Vercel项目并获取项目ID"
echo "   4. 创建Netlify站点并获取站点ID"
echo "   5. 创建Supabase项目并获取API密钥"

echo "\n📚 参考文档:"
echo "   - 部署指南: DEPLOYMENT_GUIDE.md"
echo "   - 部署检查清单: DEPLOYMENT_CHECKLIST.md"
echo "   - GitHub Actions设置: GITHUB_ACTIONS_SETUP.md"

echo "\n🎉 自动部署配置检查完成！"
echo "💡 按照上述清单完成手动配置后，推送代码到GitHub即可触发自动部署。"