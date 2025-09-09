# 🚀 智能招聘系统完整部署指南

本指南将手把手教你完成整个部署流程，每一步都有具体的操作说明。

## 📋 部署概览

### 部署架构
- **前端**: React 应用 → Vercel
- **后端**: Node.js API → Netlify Functions  
- **数据库**: SQLite → Supabase PostgreSQL
- **自动部署**: GitHub Actions

### 完整流程
1. [准备工作](#1-准备工作) (10分钟)
2. [创建 Supabase 项目](#2-创建-supabase-项目) (15分钟)
3. [配置 Vercel](#3-配置-vercel) (10分钟)
4. [配置 Netlify](#4-配置-netlify) (10分钟)
5. [设置 GitHub Actions](#5-设置-github-actions) (15分钟)
6. [测试部署](#6-测试部署) (10分钟)

---

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
```

---

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
```

---

**🎉 恭喜！你已经成功完成了智能招聘系统的完整部署！**

现在你可以：
- 通过推送代码到 `develop` 分支部署测试环境
- 通过推送代码到 `main` 分支部署生产环境
- 享受全自动的 CI/CD 流程！