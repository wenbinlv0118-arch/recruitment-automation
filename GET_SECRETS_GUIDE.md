# 获取 GitHub Secrets 配置指南

## 📋 需要获取的信息清单

### Vercel 配置
- `VERCEL_TOKEN` - Vercel API Token
- `VERCEL_ORG_ID` - 组织ID
- `VERCEL_PROJECT_ID` - 项目ID

### Netlify 配置
- `NETLIFY_AUTH_TOKEN` - Netlify API Token
- `NETLIFY_SITE_ID` - 站点ID

### Supabase 配置
- `SUPABASE_URL` - 项目URL
- `SUPABASE_ANON_KEY` - 匿名密钥
- `SUPABASE_SERVICE_ROLE_KEY` - 服务角色密钥

---

## 🔑 Vercel 配置获取

### 1. 获取 VERCEL_TOKEN
1. 登录 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击右上角头像 → **Settings**
3. 左侧菜单选择 **Tokens**
4. 点击 **Create Token**
5. 输入名称（如：`GitHub Actions`），选择过期时间
6. 复制生成的 Token

### 2. 获取 VERCEL_ORG_ID
1. 在 Vercel Dashboard 中
2. 点击右上角头像 → **Settings**
3. 在 **General** 页面找到 **Team ID** 或 **User ID**
4. 复制该 ID（这就是 ORG_ID）

### 3. 获取 VERCEL_PROJECT_ID
**方法一：通过 Dashboard**
1. 在 Vercel Dashboard 中找到你的项目
2. 点击项目进入详情页
3. 点击 **Settings** 标签
4. 在 **General** 页面找到 **Project ID**

**方法二：通过 CLI（推荐）**
```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录
vercel login

# 在项目根目录运行
vercel link

# 查看项目信息
vercel project ls
```

---

## 🌐 Netlify 配置获取

### 1. 获取 NETLIFY_AUTH_TOKEN
1. 登录 [Netlify Dashboard](https://app.netlify.com/)
2. 点击右上角头像 → **User settings**
3. 左侧菜单选择 **Applications**
4. 点击 **Personal access tokens**
5. 点击 **New access token**
6. 输入描述（如：`GitHub Actions`）
7. 复制生成的 Token

### 2. 获取 NETLIFY_SITE_ID
**方法一：通过 Dashboard**
1. 在 Netlify Dashboard 中找到你的站点
2. 点击站点进入详情页
3. 点击 **Site settings**
4. 在 **General** → **Site details** 中找到 **Site ID**

**方法二：通过 CLI**
```bash
# 安装 Netlify CLI
npm install -g netlify-cli

# 登录
netlify login

# 在项目根目录运行
netlify link

# 查看站点信息
netlify status
```

---

## 🗄️ Supabase 配置获取

### 1. 获取 SUPABASE_URL 和 SUPABASE_ANON_KEY
1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 选择你的项目
3. 左侧菜单选择 **Settings** → **API**
4. 在 **Project API keys** 部分找到：
   - **URL**: 复制 `Project URL`
   - **ANON_KEY**: 复制 `anon public` 密钥

### 2. 获取 SUPABASE_SERVICE_ROLE_KEY
1. 在同一个 **API** 页面
2. 找到 **service_role** 密钥
3. 点击 **Reveal** 显示完整密钥
4. 复制该密钥

⚠️ **注意**: Service Role Key 拥有完全权限，请妥善保管！

---

## 🔧 配置 GitHub Secrets

### 1. 进入 GitHub 仓库设置
1. 打开你的 GitHub 仓库
2. 点击 **Settings** 标签
3. 左侧菜单选择 **Secrets and variables** → **Actions**

### 2. 添加 Repository Secrets
点击 **New repository secret**，逐一添加以下密钥：

```
名称: VERCEL_TOKEN
值: [从 Vercel 获取的 Token]

名称: VERCEL_ORG_ID
值: [从 Vercel 获取的组织ID]

名称: VERCEL_PROJECT_ID
值: [从 Vercel 获取的项目ID]

名称: NETLIFY_AUTH_TOKEN
值: [从 Netlify 获取的 Token]

名称: NETLIFY_SITE_ID
值: [从 Netlify 获取的站点ID]

名称: SUPABASE_URL
值: [从 Supabase 获取的项目URL]

名称: SUPABASE_ANON_KEY
值: [从 Supabase 获取的匿名密钥]

名称: SUPABASE_SERVICE_ROLE_KEY
值: [从 Supabase 获取的服务角色密钥]
```

---

## ✅ 验证配置

### 1. 检查 Secrets 是否添加成功
在 GitHub 仓库的 **Settings** → **Secrets and variables** → **Actions** 页面，确认所有 8 个密钥都已添加。

### 2. 测试部署
1. 推送代码到 `develop` 分支触发测试环境部署
2. 推送代码到 `main` 分支触发生产环境部署
3. 在 **Actions** 标签页查看工作流执行状态

---

## 🚨 安全提醒

1. **永远不要**将这些密钥提交到代码仓库中
2. **定期轮换** API Token，特别是 Service Role Key
3. **最小权限原则**：只给予必要的权限
4. **监控使用情况**：定期检查 API 使用日志

---

## 🔍 故障排除

### 常见问题
1. **Token 无效**：检查是否过期，重新生成
2. **权限不足**：确认 Token 有足够权限
3. **项目ID错误**：重新获取正确的项目ID
4. **网络问题**：检查 GitHub Actions 的网络连接

### 调试方法
1. 查看 GitHub Actions 日志
2. 检查各平台的部署日志
3. 验证环境变量是否正确传递

完成以上配置后，你的自动部署流程就可以正常工作了！🎉