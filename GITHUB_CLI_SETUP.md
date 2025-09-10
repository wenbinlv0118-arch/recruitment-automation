# GitHub CLI 权限配置指南

## 1. 安装 GitHub CLI

### macOS 安装
```bash
# 使用 Homebrew 安装
brew install gh

# 或者使用 MacPorts
sudo port install gh
```

### 验证安装
```bash
gh --version
```

## 2. 配置 GitHub CLI 权限

### 方法一：交互式登录（推荐）
```bash
gh auth login
```

按照提示选择：
1. **GitHub.com** (选择 GitHub.com)
2. **HTTPS** (选择 HTTPS 协议)
3. **Yes** (上传 SSH 公钥到 GitHub)
4. **Login with a web browser** (通过浏览器登录)

### 方法二：使用 Personal Access Token
```bash
# 设置环境变量
export GH_TOKEN="your_personal_access_token"

# 或者使用命令行登录
gh auth login --with-token < token.txt
```

## 3. Personal Access Token 权限要求

### 创建 Personal Access Token
1. 访问 GitHub Settings: https://github.com/settings/tokens
2. 点击 "Generate new token" → "Generate new token (classic)"
3. 设置 Token 名称和过期时间
4. 选择必要的权限范围

### 必需权限 (Scopes)

#### 基础权限
- **repo** - 完整的仓库访问权限
  - `repo:status` - 访问提交状态
  - `repo_deployment` - 访问部署状态
  - `public_repo` - 访问公共仓库
  - `repo:invite` - 访问仓库邀请
  - `security_events` - 读写安全事件

#### GitHub Actions 相关
- **workflow** - 更新 GitHub Actions 工作流文件
- **write:packages** - 上传包到 GitHub Packages
- **read:packages** - 下载包从 GitHub Packages

#### 项目管理
- **admin:repo_hook** - 管理仓库 webhooks
- **write:discussion** - 读写讨论
- **read:discussion** - 读取讨论

#### 用户信息
- **user** - 更新用户资料信息
  - `read:user` - 读取用户资料
  - `user:email` - 访问用户邮箱
  - `user:follow` - 关注/取消关注用户

#### 组织权限（如果需要）
- **read:org** - 读取组织成员和团队信息
- **write:org** - 管理组织成员和团队

### 推荐的最小权限集合
对于大多数开发场景，以下权限已足够：
```
✅ repo (完整仓库访问)
✅ workflow (GitHub Actions)
✅ write:packages (包管理)
✅ read:packages (包下载)
✅ user (用户信息)
✅ read:org (组织信息，如果需要)
```

## 4. 验证配置

### 检查认证状态
```bash
# 查看当前认证状态
gh auth status

# 查看当前用户
gh api user
```

### 测试基本功能
```bash
# 列出仓库
gh repo list

# 查看 GitHub Actions 运行状态
gh run list

# 查看最近的工作流运行
gh run list --limit 5
```

## 5. 常见问题解决

### 权限不足错误
```bash
# 错误示例
Error: HTTP 403: Resource not accessible by integration
```

**解决方案：**
1. 检查 Token 权限是否包含所需的 scope
2. 重新生成 Token 并添加缺失的权限
3. 更新环境变量或重新登录

### Token 过期
```bash
# 重新登录
gh auth login

# 或者刷新 Token
gh auth refresh
```

### 切换账户
```bash
# 登出当前账户
gh auth logout

# 重新登录
gh auth login
```

## 6. 安全最佳实践

### Token 管理
1. **定期轮换** - 建议每 90 天更新一次 Token
2. **最小权限原则** - 只授予必要的权限
3. **安全存储** - 不要在代码中硬编码 Token
4. **环境隔离** - 为不同环境使用不同的 Token

### 环境变量设置
```bash
# 在 ~/.zshrc 或 ~/.bash_profile 中添加
export GH_TOKEN="your_token_here"

# 重新加载配置
source ~/.zshrc
```

### CI/CD 环境配置
```yaml
# GitHub Actions 中使用
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  # 或使用自定义 Token
  GH_TOKEN: ${{ secrets.PERSONAL_ACCESS_TOKEN }}
```

## 7. 项目特定配置

### 查看当前项目的 Actions 状态
```bash
# 在项目目录中运行
cd /path/to/your/project
gh run list --limit 10
gh run view --log  # 查看最新运行的日志
```

### 触发工作流
```bash
# 手动触发工作流
gh workflow run deploy.yml

# 查看工作流状态
gh run watch
```

## 8. 故障排除命令

```bash
# 检查 CLI 版本
gh --version

# 检查认证状态
gh auth status

# 测试 API 连接
gh api user

# 查看详细错误信息
gh run list --json

# 强制刷新认证
gh auth refresh --hostname github.com
```

---

**注意：** 配置完成后，你就可以使用 `gh run list` 等命令来查看和管理 GitHub Actions 的运行状态了。