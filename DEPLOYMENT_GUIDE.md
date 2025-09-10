# 🚀 智能招聘系统完整部署指南

## 📋 部署方案概览

本指南将帮助您完全免费部署智能招聘系统，适合小白用户，包含自动化脚本。

### 🎯 推荐免费方案
- **前端**: 腾讯云EdgeOne Pages（国内访问友好）
- **后端**: Koyeb（无需信用卡，5.5美元/月免费额度）
- **数据库**: Supabase（免费版足够使用）
- **域名**: eu.org免费二级域名
- **CDN**: Cloudflare（免费版）

### 💰 成本分析
- **总成本**: 完全免费
- **维护成本**: 每14天登录一次Koyeb平台
- **升级路径**: 后续可平滑迁移到付费方案

---

## 🛠️ 准备工作

### 📝 需要注册的账号
1. [GitHub](https://github.com) - 代码托管
2. [Koyeb](https://app.koyeb.com) - 后端部署
3. [腾讯云](https://cloud.tencent.com) - 前端部署
4. [Supabase](https://supabase.com) - 数据库
5. [Cloudflare](https://www.cloudflare.com) - CDN加速
6. [eu.org](https://nic.eu.org) - 免费域名

### 💻 本地环境要求
- Node.js 16+ 
- Git
- 现代浏览器

---

## 📦 第一阶段：项目准备与代码托管

### 1.1 GitHub仓库设置

```bash
# 克隆项目到本地
git clone <your-repo-url>
cd Recruitment-automation

# 创建部署分支
git checkout -b deployment

# 推送到GitHub
git push origin deployment
```

### 1.2 环境变量配置

创建部署配置文件：

```bash
# 创建部署配置目录
mkdir -p deploy/config

# 创建环境变量模板
cat > deploy/config/.env.template << 'EOF'
# 数据库配置
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key

# 前端配置
REACT_APP_API_URL=your_backend_url
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key

# 后端配置
PORT=3001
NODE_ENV=production
CORS_ORIGIN=your_frontend_url
EOF

## 1. 准备工作

### 1.1 检查项目状态

```bash
# 确保你在项目根目录
cd /Users/leo/Documents/Saas\ 智能化发展/Recruitment-automation

# 检查项目文件
ls -la
# 应该看到: frontend/, backend/, .github/, vercel.json, netlify.toml 等文件
```

### 1.2 安装必要工具

```bash
# 安装 Vercel CLI
npm install -g vercel

# 安装 Netlify CLI
npm install -g netlify-cli

# 验证安装
vercel --version
netlify --version
```

### 1.3 创建 GitHub 仓库

1. 打开 [GitHub](https://github.com)
2. 点击右上角 **"+"** → **"New repository"**
3. 填写信息：
   - **Repository name**: `recruitment-automation`
   - **Description**: `智能招聘自动化系统`
   - 选择 **Public** 或 **Private**
   - **不要**勾选 "Initialize this repository with README"
4. 点击 **"Create repository"**

### 1.4 推送代码到 GitHub

```bash
# 初始化 Git（如果还没有）
git init

# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/recruitment-automation.git

# 添加所有文件
git add .

# 提交代码
git commit -m "Initial commit: 智能招聘系统"

# 推送到 GitHub
git branch -M main
git push -u origin main
>>>>>>> 4b086b078303ff4e98029aed3a878f834aa21728
```

---

<<<<<<< HEAD
## 🗄️ 第二阶段：数据库部署（Supabase）

### 2.1 创建Supabase项目

1. 访问 [Supabase](https://supabase.com)
2. 点击 "Start your project"
3. 使用GitHub账号登录
4. 创建新项目：
   - Project name: `recruitment-system`
   - Database password: 生成强密码并保存
   - Region: 选择 `Southeast Asia (Singapore)` 或 `Northeast Asia (Tokyo)`

### 2.2 数据库初始化脚本

创建自动化初始化脚本：

```bash
# 创建数据库初始化脚本
cat > deploy/scripts/init-database.sql << 'EOF'
-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建简历表
CREATE TABLE IF NOT EXISTS resumes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  content TEXT,
  skills TEXT[],
  experience JSONB,
  education JSONB,
  contact_info JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建职位表
CREATE TABLE IF NOT EXISTS jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  company VARCHAR(100) NOT NULL,
  description TEXT,
  requirements TEXT[],
  salary_range VARCHAR(50),
  location VARCHAR(100),
  job_type VARCHAR(20) DEFAULT 'full-time',
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建任务表
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  priority VARCHAR(10) DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- 启用行级安全策略
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 创建安全策略
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own resumes" ON resumes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own resumes" ON resumes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view active jobs" ON jobs FOR SELECT USING (status = 'active');
CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
EOF
```

### 2.3 获取数据库连接信息

```bash
# 创建获取Supabase配置的脚本
cat > deploy/scripts/get-supabase-config.sh << 'EOF'
#!/bin/bash

echo "🔍 请在Supabase项目中获取以下信息："
echo "1. 进入项目 Settings > API"
echo "2. 复制以下信息："
echo "   - Project URL (SUPABASE_URL)"
echo "   - anon public key (SUPABASE_ANON_KEY)"
echo "   - service_role secret key (SUPABASE_SERVICE_KEY)"
echo ""
echo "3. 在SQL Editor中执行 deploy/scripts/init-database.sql"
echo ""
echo "✅ 完成后，将信息填入 deploy/config/.env.production"
EOF

chmod +x deploy/scripts/get-supabase-config.sh
```

---

## 🚀 第三阶段：后端部署（Koyeb）

### 3.1 准备后端代码

```bash
# 创建后端部署配置
cat > backend/Dockerfile << 'EOF'
FROM node:18-alpine

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 暴露端口
EXPOSE 3001

# 启动应用
CMD ["npm", "start"]
EOF
```

### 3.2 Koyeb部署脚本

```bash
# 创建Koyeb部署自动化脚本
cat > deploy/scripts/deploy-backend.sh << 'EOF'
#!/bin/bash

echo "🚀 开始部署后端到Koyeb..."

# 检查环境变量
if [ ! -f "deploy/config/.env.production" ]; then
    echo "❌ 请先创建 deploy/config/.env.production 文件"
    exit 1
fi

echo "📋 Koyeb部署步骤："
echo "1. 访问 https://app.koyeb.com"
echo "2. 使用GitHub账号注册/登录"
echo "3. 点击 'Create Service'"
echo "4. 选择 'Web Service'"
echo "5. 选择 'GitHub' 作为部署源"
echo "6. 选择您的仓库和 'develop' 分支"
echo "7. 配置如下："
echo "   - Service name: recruitment-backend"
echo "   - Build command: cd backend && npm install"
echo "   - Run command: cd backend && npm start"
echo "   - Port: 3001"
echo "   - Instance type: Nano (免费)"
echo "8. 添加环境变量（从 deploy/config/.env.production 复制）"
echo "9. 点击 'Deploy'"
echo ""
echo "⏳ 部署完成后，复制应用URL并更新前端配置"
EOF

chmod +x deploy/scripts/deploy-backend.sh
```

### 3.3 后端健康检查

```bash
# 创建健康检查脚本
cat > deploy/scripts/health-check.sh << 'EOF'
#!/bin/bash

BACKEND_URL="$1"

if [ -z "$BACKEND_URL" ]; then
    echo "❌ 请提供后端URL: ./health-check.sh <backend-url>"
    exit 1
fi

echo "🔍 检查后端健康状态..."

# 检查健康端点
response=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health")

if [ "$response" = "200" ]; then
    echo "✅ 后端服务正常运行"
else
    echo "❌ 后端服务异常，HTTP状态码: $response"
    exit 1
fi

# 检查API端点
api_response=$(curl -s "$BACKEND_URL/api/health")
echo "📊 API响应: $api_response"
EOF

chmod +x deploy/scripts/health-check.sh
```

---

## 🌐 第四阶段：前端部署（腾讯云EdgeOne Pages）

### 4.1 前端构建配置

```bash
# 创建前端构建脚本
cat > deploy/scripts/build-frontend.sh << 'EOF'
#!/bin/bash

echo "🏗️ 开始构建前端..."

cd frontend

# 安装依赖
echo "📦 安装依赖..."
npm install

# 复制环境变量
if [ -f "../deploy/config/.env.production" ]; then
    cp ../deploy/config/.env.production .env.production
    echo "✅ 环境变量已配置"
else
    echo "⚠️ 未找到生产环境配置，使用默认配置"
fi

# 构建项目
echo "🔨 构建项目..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ 前端构建成功"
    echo "📁 构建文件位于: frontend/build/"
else
    echo "❌ 前端构建失败"
    exit 1
fi
EOF

chmod +x deploy/scripts/build-frontend.sh
```

### 4.2 腾讯云EdgeOne Pages部署

```bash
# 创建腾讯云部署指南
cat > deploy/scripts/deploy-frontend.sh << 'EOF'
#!/bin/bash

echo "🌐 腾讯云EdgeOne Pages部署指南"
echo ""
echo "📋 部署步骤："
echo "1. 访问 https://console.cloud.tencent.com/edgeone"
echo "2. 注册/登录腾讯云账号"
echo "3. 开通EdgeOne服务（免费版）"
echo "4. 创建站点："
echo "   - 站点名称: recruitment-system"
echo "   - 接入方式: CNAME接入"
echo "5. 进入 '边缘函数' > 'Pages'"
echo "6. 创建Pages项目："
echo "   - 项目名称: recruitment-frontend"
echo "   - 连接GitHub仓库"
echo "   - 分支: deployment"
echo "   - 构建命令: cd frontend && npm install && npm run build"
echo "   - 输出目录: frontend/build"
echo "7. 配置环境变量（从 deploy/config/.env.production 复制）"
echo "8. 部署完成后配置自定义域名"
echo ""
echo "🔧 自动化部署（可选）："
echo "也可以直接上传 frontend/build 目录到任何静态托管服务"
EOF

chmod +x deploy/scripts/deploy-frontend.sh
=======
## 2. 创建 Supabase 项目

### 2.1 注册并创建项目

1. 访问 [Supabase](https://supabase.com)
2. 点击 **"Start your project"**
3. 使用 GitHub 账号登录
4. 点击 **"New project"**
5. 填写项目信息：
   - **Name**: `recruitment-automation`
   - **Database Password**: 设置一个强密码（记住这个密码！）
   - **Region**: 选择 `Northeast Asia (Tokyo)` 或最近的地区
6. 点击 **"Create new project"**
7. 等待 2-3 分钟项目创建完成

### 2.2 获取项目配置

1. 项目创建完成后，点击左侧 **"Settings"**
2. 点击 **"API"**
3. 复制以下信息（**重要：保存到记事本**）：
   ```
   Project URL: https://你的项目id.supabase.co
   anon public: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
   service_role: eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
   ```

### 2.3 执行数据库迁移

1. 在 Supabase Dashboard 中，点击左侧 **"SQL Editor"**
2. 点击 **"New query"**
3. 复制以下 SQL 并执行：

```sql
-- 创建公司表
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建文档表
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    file_path VARCHAR(500),
    file_type VARCHAR(50),
    company_id INTEGER REFERENCES companies(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建简历表
CREATE TABLE resumes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    content TEXT,
    file_path VARCHAR(500),
    parsed_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建任务表
CREATE TABLE tasks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    assigned_to VARCHAR(255),
    due_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 启用 RLS (Row Level Security)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 创建允许所有操作的策略（开发阶段）
CREATE POLICY "Allow all operations" ON companies FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON documents FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON resumes FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON tasks FOR ALL USING (true);
```

4. 点击 **"Run"** 执行 SQL
5. 确认看到 "Success. No rows returned" 消息

---

## 3. 配置 Vercel

### 3.1 登录 Vercel

```bash
# 登录 Vercel
vercel login
# 选择登录方式，推荐使用 GitHub
```

### 3.2 部署前端

```bash
# 进入前端目录
cd frontend

# 首次部署
vercel
```

**按照提示操作**：
1. `Set up and deploy "~/Documents/Saas 智能化发展/Recruitment-automation/frontend"? [Y/n]` → 输入 `Y`
2. `Which scope do you want to deploy to?` → 选择你的账号
3. `Link to existing project? [y/N]` → 输入 `N`
4. `What's your project's name?` → 输入 `recruitment-automation-frontend`
5. `In which directory is your code located?` → 直接按回车（使用当前目录）
6. `Want to override the settings? [y/N]` → 输入 `N`

### 3.3 获取 Vercel 配置信息

```bash
# 获取项目信息
vercel project ls
# 记录项目 ID

# 获取组织 ID
vercel teams ls
# 记录组织 ID
```

### 3.4 创建 Vercel API Token

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击右上角头像 → **"Settings"**
3. 左侧点击 **"Tokens"**
4. 点击 **"Create Token"**
5. 填写信息：
   - **Token Name**: `GitHub Actions`
   - **Scope**: 选择你的账号
   - **Expiration**: `No Expiration`
6. 点击 **"Create"**
7. **立即复制 Token**（只显示一次！）

---

## 4. 配置 Netlify

### 4.1 登录 Netlify

```bash
# 回到项目根目录
cd ..

# 登录 Netlify
netlify login
# 会打开浏览器，点击 "Authorize" 授权
```

### 4.2 初始化 Netlify 项目

```bash
# 初始化项目
netlify init
```

**按照提示操作**：
1. `What would you like to do?` → 选择 `Create & configure a new site`
2. `Team:` → 选择你的团队（通常是你的用户名）
3. `Site name (optional):` → 输入 `recruitment-automation-api`
4. `Your build command (hugo build/yarn run build/etc):` → 输入 `npm run build:backend`
5. `Directory to publish (blank for current dir):` → 输入 `netlify/functions`

### 4.3 获取 Netlify 配置信息

```bash
# 查看站点信息
netlify status
# 记录 Site ID

# 或者查看 .netlify/state.json 文件
cat .netlify/state.json
```

### 4.4 创建 Netlify API Token

1. 访问 [Netlify Dashboard](https://app.netlify.com/)
2. 点击右上角头像 → **"User settings"**
3. 左侧点击 **"Applications"**
4. 点击 **"Personal access tokens"**
5. 点击 **"New access token"**
6. 填写描述：`GitHub Actions`
7. 点击 **"Generate token"**
8. **立即复制 Token**（只显示一次！）

---

## 5. 设置 GitHub Actions

### 5.1 配置 GitHub Secrets

1. 打开你的 GitHub 仓库
2. 点击 **"Settings"** 标签
3. 左侧点击 **"Secrets and variables"** → **"Actions"**
4. 点击 **"New repository secret"**

**逐一添加以下 8 个 Secrets**：

| Secret 名称 | 值 | 来源 |
|-------------|----|---------|
| `VERCEL_TOKEN` | 从步骤 3.4 获取的 Token | Vercel |
| `VERCEL_ORG_ID` | 从步骤 3.3 获取的组织 ID | Vercel |
| `VERCEL_PROJECT_ID` | 从步骤 3.3 获取的项目 ID | Vercel |
| `NETLIFY_AUTH_TOKEN` | 从步骤 4.4 获取的 Token | Netlify |
| `NETLIFY_SITE_ID` | 从步骤 4.3 获取的站点 ID | Netlify |
| `SUPABASE_URL` | 从步骤 2.2 获取的 Project URL | Supabase |
| `SUPABASE_ANON_KEY` | 从步骤 2.2 获取的 anon public | Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | 从步骤 2.2 获取的 service_role | Supabase |

### 5.2 验证 GitHub Actions 配置

```bash
# 检查 GitHub Actions 配置文件
cat .github/workflows/deploy.yml
# 确认文件存在且内容正确
```

---

## 6. 测试部署

### 6.1 触发自动部署

```bash
# 创建一个小的更改来触发部署
echo "# 部署测试" >> README.md

# 提交并推送到 develop 分支（测试环境）
git add .
git commit -m "test: 触发测试环境部署"
git checkout -b develop
git push origin develop
```

### 6.2 监控部署过程

1. 打开 GitHub 仓库
2. 点击 **"Actions"** 标签
3. 查看正在运行的工作流
4. 点击工作流查看详细日志

**预期结果**：
- ✅ Quality Check 通过
- ✅ Build Test 通过  
- ✅ Deploy Staging 成功
- ✅ Health Check 通过

### 6.3 验证部署结果

**检查前端**：
1. 在 GitHub Actions 日志中找到 Vercel 部署 URL
2. 访问 URL 确认前端正常显示

**检查后端**：
1. 在 GitHub Actions 日志中找到 Netlify 部署 URL
2. 访问 `你的netlify域名/.netlify/functions/health` 确认 API 正常

### 6.4 部署到生产环境

```bash
# 切换到 main 分支
git checkout main

# 合并 develop 分支
git merge develop

# 推送到生产环境
git push origin main
```

---

## 🎯 部署完成检查清单

### ✅ 必须完成的项目

- [ ] **Supabase 项目**已创建并配置数据库
- [ ] **Vercel 前端**部署成功，可以访问
- [ ] **Netlify 后端**部署成功，API 可用
- [ ] **GitHub Secrets**全部 8 个已正确配置
- [ ] **GitHub Actions**工作流运行成功
- [ ] **测试环境**部署验证通过
- [ ] **生产环境**部署验证通过

### 🔍 验证方法

```bash
# 1. 检查前端
curl -I https://你的vercel域名.vercel.app
# 应该返回 200 状态码

# 2. 检查后端健康状态
curl https://你的netlify域名.netlify.app/.netlify/functions/health
# 应该返回 {"status":"ok"}

# 3. 检查数据库连接
node supabase/setup.js test
# 应该显示连接成功
```

---

## 🚨 常见问题解决

### 问题 1: Vercel 部署失败

**症状**: Build 失败，提示找不到文件

**解决方案**:
```bash
# 检查 vercel.json 配置
cat vercel.json

# 确保前端依赖已安装
cd frontend
npm install
npm run build
```

### 问题 2: Netlify Functions 404

**症状**: API 调用返回 404

**解决方案**:
```bash
# 检查函数文件
ls -la netlify/functions/

# 重新构建
npm run build:backend

# 本地测试
netlify dev
```

### 问题 3: Supabase 连接失败

**症状**: 数据库操作失败

**解决方案**:
```bash
# 测试连接
node -e "console.log(process.env.SUPABASE_URL)"

# 检查环境变量
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY
```

### 问题 4: GitHub Actions 失败

**症状**: 工作流执行失败

**解决方案**:
1. 检查 Secrets 是否正确配置
2. 查看详细错误日志
3. 验证 Token 是否有效
4. 确认项目 ID 正确

---

## 📞 获取帮助

如果遇到问题，请按以下顺序排查：

1. **检查日志**: GitHub Actions → 点击失败的工作流 → 查看详细日志
2. **验证配置**: 确认所有 Secrets 和环境变量正确
3. **本地测试**: 在本地运行相同的命令
4. **查看文档**: 参考平台官方文档

### 有用的命令

```bash
# 查看项目状态
npm run deploy:validate

# 测试本地构建
npm run build
npm run build:backend

# 查看环境变量
env | grep SUPABASE
env | grep VERCEL
env | grep NETLIFY
>>>>>>> 4b086b078303ff4e98029aed3a878f834aa21728
```

---

<<<<<<< HEAD
## 🌍 第五阶段：域名配置

### 5.1 申请免费域名

```bash
# 创建域名申请指南
cat > deploy/scripts/setup-domain.sh << 'EOF'
#!/bin/bash

echo "🌐 免费域名申请指南"
echo ""
echo "📋 推荐方案：eu.org 二级域名"
echo "1. 访问 https://nic.eu.org"
echo "2. 点击 'New Domain'"
echo "3. 填写域名信息："
echo "   - Domain: your-project-name.eu.org"
echo "   - Admin Contact: 您的邮箱"
echo "   - Technical Contact: 您的邮箱"
echo "4. 设置DNS服务器为Cloudflare："
echo "   - ns1.cloudflare.com"
echo "   - ns2.cloudflare.com"
echo "5. 提交申请（需要人工审核，通常1-7天）"
echo ""
echo "🔄 备选方案："
echo "- publicvm.com (https://freedomain.one)"
echo "- nom.za (https://www.nom.za)"
echo "- pp.ua (https://nic.ua)"
EOF

chmod +x deploy/scripts/setup-domain.sh
```

### 5.2 Cloudflare配置

```bash
# 创建Cloudflare配置脚本
cat > deploy/scripts/setup-cloudflare.sh << 'EOF'
#!/bin/bash

echo "☁️ Cloudflare CDN配置指南"
echo ""
echo "📋 配置步骤："
echo "1. 访问 https://www.cloudflare.com"
echo "2. 注册/登录账号"
echo "3. 添加站点：输入您的域名"
echo "4. 选择免费计划"
echo "5. 配置DNS记录："
echo "   - A记录: @ -> 您的前端IP地址"
echo "   - CNAME记录: api -> 您的后端域名"
echo "   - CNAME记录: www -> 您的域名"
echo "6. 启用以下功能："
echo "   - Always Use HTTPS: ON"
echo "   - Auto Minify: CSS, JS, HTML"
echo "   - Brotli Compression: ON"
echo "   - Browser Cache TTL: 4 hours"
echo "7. 等待DNS传播（通常5-10分钟）"
echo ""
echo "🔍 验证配置："
echo "curl -I https://your-domain.eu.org"
EOF

chmod +x deploy/scripts/setup-cloudflare.sh
```

---

## 🤖 第六阶段：自动化部署脚本

### 6.1 一键部署脚本

```bash
# 创建主部署脚本
cat > deploy/deploy.sh << 'EOF'
#!/bin/bash

set -e

echo "🚀 智能招聘系统一键部署脚本"
echo "================================"

# 检查必要工具
command -v node >/dev/null 2>&1 || { echo "❌ 请先安装 Node.js"; exit 1; }
command -v git >/dev/null 2>&1 || { echo "❌ 请先安装 Git"; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "❌ 请先安装 curl"; exit 1; }

echo "✅ 环境检查通过"

# 创建必要目录
mkdir -p deploy/config
mkdir -p deploy/scripts
mkdir -p deploy/logs

# 检查配置文件
if [ ! -f "deploy/config/.env.production" ]; then
    echo "⚠️ 未找到生产环境配置文件"
    echo "📝 请先完成以下步骤："
    echo "1. 运行: ./deploy/scripts/get-supabase-config.sh"
    echo "2. 创建 deploy/config/.env.production 文件"
    echo "3. 填入所有必要的环境变量"
    exit 1
fi

echo "📋 开始部署流程..."

# 步骤1: 构建前端
echo "🏗️ 步骤1: 构建前端"
./deploy/scripts/build-frontend.sh

# 步骤2: 部署提示
echo "🚀 步骤2: 部署后端"
echo "请按照以下脚本的指引完成后端部署："
./deploy/scripts/deploy-backend.sh

echo ""
read -p "后端部署完成后，请输入后端URL: " BACKEND_URL

if [ -n "$BACKEND_URL" ]; then
    echo "🔍 测试后端连接..."
    ./deploy/scripts/health-check.sh "$BACKEND_URL"
fi

# 步骤3: 前端部署提示
echo "🌐 步骤3: 部署前端"
./deploy/scripts/deploy-frontend.sh

# 步骤4: 域名配置提示
echo "🌍 步骤4: 配置域名"
./deploy/scripts/setup-domain.sh

echo ""
echo "🎉 部署脚本执行完成！"
echo "📝 请按照上述指引完成手动配置步骤"
echo "📊 部署日志保存在: deploy/logs/"
EOF

chmod +x deploy/deploy.sh
```

### 6.2 环境检查脚本

```bash
# 创建环境检查脚本
cat > deploy/scripts/check-environment.sh << 'EOF'
#!/bin/bash

echo "🔍 环境检查脚本"
echo "================="

# 检查Node.js
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js: $NODE_VERSION"
else
    echo "❌ Node.js 未安装"
    echo "📥 安装方法: https://nodejs.org/"
fi

# 检查npm
if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm: $NPM_VERSION"
else
    echo "❌ npm 未安装"
fi

# 检查Git
if command -v git >/dev/null 2>&1; then
    GIT_VERSION=$(git --version)
    echo "✅ Git: $GIT_VERSION"
else
    echo "❌ Git 未安装"
    echo "📥 安装方法: https://git-scm.com/"
fi

# 检查curl
if command -v curl >/dev/null 2>&1; then
    echo "✅ curl: 已安装"
else
    echo "❌ curl 未安装"
fi

# 检查项目依赖
echo ""
echo "📦 检查项目依赖..."

if [ -f "frontend/package.json" ]; then
    echo "✅ 前端项目配置存在"
    cd frontend
    if [ -d "node_modules" ]; then
        echo "✅ 前端依赖已安装"
    else
        echo "⚠️ 前端依赖未安装，运行: cd frontend && npm install"
    fi
    cd ..
else
    echo "❌ 前端项目配置不存在"
fi

if [ -f "backend/package.json" ]; then
    echo "✅ 后端项目配置存在"
    cd backend
    if [ -d "node_modules" ]; then
        echo "✅ 后端依赖已安装"
    else
        echo "⚠️ 后端依赖未安装，运行: cd backend && npm install"
    fi
    cd ..
else
    echo "❌ 后端项目配置不存在"
fi

echo ""
echo "🎯 环境检查完成"
EOF

chmod +x deploy/scripts/check-environment.sh
```

### 6.3 配置生成脚本

```bash
# 创建配置生成脚本
cat > deploy/scripts/generate-config.sh << 'EOF'
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
EOF

chmod +x deploy/scripts/generate-config.sh
```

---

## 📚 第七阶段：部署验证与监控

### 7.1 部署验证脚本

```bash
# 创建部署验证脚本
cat > deploy/scripts/verify-deployment.sh << 'EOF'
#!/bin/bash

echo "🔍 部署验证脚本"
echo "==============="

FRONTEND_URL="$1"
BACKEND_URL="$2"

if [ -z "$FRONTEND_URL" ] || [ -z "$BACKEND_URL" ]; then
    echo "❌ 用法: ./verify-deployment.sh <frontend-url> <backend-url>"
    echo "📝 示例: ./verify-deployment.sh https://your-domain.eu.org https://your-backend.koyeb.app"
    exit 1
fi

echo "🌐 验证前端: $FRONTEND_URL"
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$frontend_status" = "200" ]; then
    echo "✅ 前端访问正常"
else
    echo "❌ 前端访问异常，状态码: $frontend_status"
fi

echo "🚀 验证后端: $BACKEND_URL"
backend_status=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL/health")
if [ "$backend_status" = "200" ]; then
    echo "✅ 后端服务正常"
else
    echo "❌ 后端服务异常，状态码: $backend_status"
fi

echo "🔗 验证API连接"
api_response=$(curl -s "$BACKEND_URL/api/health" | head -c 100)
if [ -n "$api_response" ]; then
    echo "✅ API响应正常: $api_response"
else
    echo "❌ API无响应"
fi

echo "🌍 验证CORS配置"
cors_test=$(curl -s -H "Origin: $FRONTEND_URL" -H "Access-Control-Request-Method: GET" -H "Access-Control-Request-Headers: Content-Type" -X OPTIONS "$BACKEND_URL/api/health")
echo "📊 CORS测试完成"

echo ""
echo "🎯 验证完成"
echo "📝 如有问题，请检查："
echo "1. 环境变量配置是否正确"
echo "2. 域名DNS是否生效"
echo "3. 服务是否正常启动"
EOF

chmod +x deploy/scripts/verify-deployment.sh
```

### 7.2 监控脚本

```bash
# 创建简单监控脚本
cat > deploy/scripts/monitor.sh << 'EOF'
#!/bin/bash

echo "📊 服务监控脚本"
echo "==============="

# 读取配置
if [ -f "deploy/config/.env.production" ]; then
    source deploy/config/.env.production
else
    echo "❌ 配置文件不存在"
    exit 1
fi

# 监控函数
check_service() {
    local name="$1"
    local url="$2"
    local expected_status="$3"
    
    echo "🔍 检查 $name..."
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
    
    if [ "$status" = "$expected_status" ]; then
        echo "✅ $name 正常 (状态码: $status)"
        return 0
    else
        echo "❌ $name 异常 (状态码: $status)"
        return 1
    fi
}

# 检查各服务
echo "$(date): 开始监控检查" >> deploy/logs/monitor.log

check_service "前端" "$REACT_APP_API_URL" "200"
frontend_ok=$?

check_service "后端健康检查" "$REACT_APP_API_URL/health" "200"
backend_ok=$?

check_service "API接口" "$REACT_APP_API_URL/api/health" "200"
api_ok=$?

# 记录结果
if [ $frontend_ok -eq 0 ] && [ $backend_ok -eq 0 ] && [ $api_ok -eq 0 ]; then
    echo "✅ 所有服务正常" | tee -a deploy/logs/monitor.log
else
    echo "❌ 部分服务异常" | tee -a deploy/logs/monitor.log
fi

echo "$(date): 监控检查完成" >> deploy/logs/monitor.log
EOF

chmod +x deploy/scripts/monitor.sh
```

---

## 📖 使用说明

### 🚀 快速开始

1. **环境检查**
```bash
./deploy/scripts/check-environment.sh
```

2. **生成配置文件**
```bash
./deploy/scripts/generate-config.sh
```

3. **配置数据库**
```bash
./deploy/scripts/get-supabase-config.sh
# 按提示完成Supabase配置
```

4. **一键部署**
```bash
./deploy/deploy.sh
```

5. **验证部署**
```bash
./deploy/scripts/verify-deployment.sh <前端URL> <后端URL>
```

### 🔧 维护任务

- **监控服务**: `./deploy/scripts/monitor.sh`
- **健康检查**: `./deploy/scripts/health-check.sh <后端URL>`
- **重新构建前端**: `./deploy/scripts/build-frontend.sh`

### 📝 注意事项

1. **Koyeb维护**: 每14天需要登录一次Koyeb平台
2. **域名续期**: eu.org域名需要定期续期
3. **监控日志**: 定期检查 `deploy/logs/` 目录
4. **备份数据**: 定期备份Supabase数据

### 🆘 故障排除

| 问题 | 解决方案 |
|------|----------|
| 前端无法访问 | 检查DNS配置和Cloudflare设置 |
| 后端API错误 | 检查Koyeb服务状态和环境变量 |
| 数据库连接失败 | 验证Supabase配置和网络连接 |
| CORS错误 | 检查后端CORS_ORIGIN配置 |

---

## 🎉 部署完成

恭喜！您已经成功部署了智能招聘系统。

### 📊 部署总结
- ✅ 完全免费的部署方案
- ✅ 国内用户友好的访问速度
- ✅ 自动化部署脚本
- ✅ 完整的监控和维护工具

### 🔄 后续优化
1. 根据使用情况考虑升级到付费方案
2. 添加更多监控和告警功能
3. 实施自动化CI/CD流程
4. 优化性能和用户体验

---

*📞 如有问题，请查看故障排除部分或提交Issue*
=======
**🎉 恭喜！你已经成功完成了智能招聘系统的完整部署！**

现在你可以：
- 通过推送代码到 `develop` 分支部署测试环境
- 通过推送代码到 `main` 分支部署生产环境
- 享受全自动的 CI/CD 流程！
>>>>>>> 4b086b078303ff4e98029aed3a878f834aa21728
