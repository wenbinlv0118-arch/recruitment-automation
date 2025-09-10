# GitHub Actions 自动部署设置

本文档详细说明如何配置 GitHub Actions 实现自动部署。

## 目录

- [概述](#概述)
- [环境配置](#环境配置)
- [Secrets 配置](#secrets-配置)
- [工作流程](#工作流程)
- [故障排除](#故障排除)

## 概述

### 自动部署流程

1. **代码质量检查**: ESLint、测试
2. **构建测试**: 前端和后端构建
3. **环境部署**: 
   - `develop` 分支 → Staging 环境
   - `main` 分支 → Production 环境
4. **健康检查**: 部署后验证服务状态

### 部署架构

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   GitHub    │    │   Vercel    │    │  Netlify    │
│ (代码仓库)   │───▶│  (前端)     │    │  (后端)     │
└─────────────┘    └─────────────┘    └─────────────┘
                           │                   │
                           └───────┬───────────┘
                                   │
                           ┌─────────────┐
                           │  Supabase   │
                           │  (数据库)   │
                           └─────────────┘
```

## 环境配置

### 1. GitHub 仓库设置

#### 创建环境

1. 进入 GitHub 仓库
2. 点击 `Settings` → `Environments`
3. 创建两个环境：
   - `staging` (测试环境)
   - `production` (生产环境)

#### 分支保护规则

1. 进入 `Settings` → `Branches`
2. 为 `main` 分支添加保护规则：
   - ✅ Require status checks to pass
   - ✅ Require branches to be up to date
   - ✅ Require pull request reviews

### 2. Vercel 配置

#### 获取 Vercel 配置信息

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录 Vercel
vercel login

# 在项目目录中初始化
cd frontend
vercel

# 获取项目信息
vercel project ls
```

#### 获取必要的 Token 和 ID

1. **Vercel Token**: 
   - 访问 https://vercel.com/account/tokens
   - 创建新的 Token

2. **Organization ID**:
   ```bash
   vercel teams ls
   ```

3. **Project ID**:
   ```bash
   vercel project ls
   ```

### 3. Netlify 配置

#### 获取 Netlify 配置信息

```bash
# 安装 Netlify CLI
npm install -g netlify-cli

# 登录 Netlify
netlify login

# 初始化项目
netlify init

# 获取站点信息
netlify sites:list
```

#### 获取必要的 Token 和 ID

1. **Netlify Auth Token**:
   - 访问 https://app.netlify.com/user/applications#personal-access-tokens
   - 创建新的 Personal Access Token

2. **Site ID**:
   ```bash
   netlify sites:list
   ```

## Secrets 配置

### 1. 通用 Secrets

在 GitHub 仓库的 `Settings` → `Secrets and variables` → `Actions` 中添加：

#### Vercel 相关

```
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id
```

#### Netlify 相关

```
NETLIFY_AUTH_TOKEN=your-netlify-auth-token
NETLIFY_SITE_ID=your-production-site-id
NETLIFY_STAGING_SITE_ID=your-staging-site-id
```

### 2. 生产环境 Secrets

在 `production` 环境中添加：

#### Supabase 配置

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### API 配置

```
API_URL=https://your-functions.netlify.app/.netlify/functions
```

#### 第三方服务 (可选)

```
SENTRY_DSN=your-sentry-dsn
GA_ID=your-google-analytics-id
OPENAI_API_KEY=your-openai-key
```

#### 安全配置

```
JWT_SECRET=your-jwt-secret-key
ENCRYPTION_KEY=your-encryption-key
```

### 3. 测试环境 Secrets

在 `staging` 环境中添加：

```
STAGING_SUPABASE_URL=https://your-staging-project-id.supabase.co
STAGING_SUPABASE_ANON_KEY=your-staging-anon-key
STAGING_SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key
STAGING_API_URL=https://staging-your-functions.netlify.app/.netlify/functions
```

## 工作流程

### 1. 开发流程

```bash
# 1. 创建功能分支
git checkout -b feature/new-feature

# 2. 开发和提交
git add .
git commit -m "feat: 添加新功能"

# 3. 推送到远程
git push origin feature/new-feature

# 4. 创建 Pull Request 到 develop
# GitHub Actions 会自动运行质量检查和构建测试

# 5. 合并到 develop 分支
# 自动部署到 Staging 环境

# 6. 测试通过后，创建 PR 到 main
# 合并后自动部署到 Production 环境
```

### 2. 部署触发条件

| 分支 | 触发条件 | 部署环境 |
|------|----------|----------|
| `feature/*` | Push/PR | 仅运行测试 |
| `develop` | Push | Staging |
| `main` | Push | Production |

### 3. 工作流程步骤

#### 质量检查 (所有分支)

1. 代码检出
2. Node.js 环境设置
3. 依赖安装
4. ESLint 检查
5. 单元测试

#### 构建测试 (所有分支)

1. 前端构建
2. 后端构建
3. 构建产物上传

#### 部署 (develop/main)

1. 环境变量生成
2. 项目构建
3. Vercel 部署 (前端)
4. Netlify 部署 (后端)
5. 健康检查

## 故障排除

### 常见问题

#### 1. Secrets 未配置

**错误信息**: `Error: Input required and not supplied: vercel-token`

**解决方案**:
```bash
# 检查 Secrets 配置
# 确保在正确的环境中添加了所需的 Secrets
```

#### 2. 构建失败

**错误信息**: `npm ERR! code ELIFECYCLE`

**解决方案**:
```bash
# 本地测试构建
npm run build

# 检查依赖版本
npm audit
npm audit fix
```

#### 3. 部署超时

**错误信息**: `Error: The deployment timed out`

**解决方案**:
- 检查构建产物大小
- 优化依赖和资源
- 增加超时时间

#### 4. 环境变量未生效

**错误信息**: API 调用失败或配置错误

**解决方案**:
```bash
# 检查环境变量名称
# 确保在构建时正确传递
# 验证 Secrets 值是否正确
```

### 调试方法

#### 1. 查看工作流程日志

1. 进入 GitHub 仓库
2. 点击 `Actions` 标签
3. 选择失败的工作流程
4. 查看详细日志

#### 2. 本地模拟部署

```bash
# 模拟 GitHub Actions 环境
export NODE_ENV=production
export REACT_APP_API_BASE_URL=https://your-api.netlify.app

# 运行构建
npm run build

# 测试部署脚本
./deploy-production.sh
```

#### 3. 启用调试模式

在工作流程文件中添加：

```yaml
- name: 调试信息
  run: |
    echo "Node.js 版本: $(node --version)"
    echo "npm 版本: $(npm --version)"
    echo "当前目录: $(pwd)"
    echo "文件列表: $(ls -la)"
    env
```

### 性能优化

#### 1. 缓存优化

```yaml
- name: 缓存 node_modules
  uses: actions/cache@v3
  with:
    path: |
      ~/.npm
      node_modules
      */node_modules
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

#### 2. 并行执行

```yaml
strategy:
  matrix:
    node-version: [18, 20]
    os: [ubuntu-latest, windows-latest]
```

#### 3. 条件执行

```yaml
- name: 仅在文件变更时运行
  if: contains(github.event.head_commit.modified, 'frontend/')
  run: cd frontend && npm run build
```

## 监控和通知

### 1. Slack 通知

```yaml
- name: Slack 通知
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    channel: '#deployments'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
  if: always()
```

### 2. 邮件通知

```yaml
- name: 邮件通知
  uses: dawidd6/action-send-mail@v3
  with:
    server_address: smtp.gmail.com
    server_port: 465
    username: ${{ secrets.MAIL_USERNAME }}
    password: ${{ secrets.MAIL_PASSWORD }}
    subject: 部署状态通知
    body: 部署到 ${{ github.ref }} 分支的状态: ${{ job.status }}
    to: admin@example.com
  if: failure()
```

### 3. 部署状态徽章

在 README.md 中添加：

```markdown
![Deploy Status](https://github.com/username/repo/workflows/自动部署/badge.svg)
```

## 安全最佳实践

### 1. Secrets 管理

- 使用最小权限原则
- 定期轮换敏感密钥
- 不要在日志中输出 Secrets
- 使用环境级别的 Secrets

### 2. 权限控制

```yaml
permissions:
  contents: read
  deployments: write
  statuses: write
```

### 3. 安全扫描

```yaml
- name: 安全扫描
  uses: github/super-linter@v4
  env:
    DEFAULT_BRANCH: main
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## 成本优化

### 1. 减少运行时间

- 使用缓存减少依赖安装时间
- 并行执行独立任务
- 跳过不必要的步骤

### 2. 资源使用

- 选择合适的运行器类型
- 及时清理临时文件
- 优化构建产物大小

### 3. 运行频率

- 合理设置触发条件
- 避免重复构建
- 使用路径过滤器

---

**注意**: 请根据实际项目需求调整配置，确保所有 Secrets 和配置信息的安全性。