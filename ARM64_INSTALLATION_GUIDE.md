# ARM64 Node.js 安装指南

## 方法一: 使用Homebrew (推荐)

```bash
# 1. 安装Homebrew (如果未安装)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. 安装ARM64版本的Node.js
brew install node

# 3. 验证安装
node -p "process.arch" # 应该输出 'arm64'
```

## 方法二: 使用NVM

```bash
# 1. 安装NVM (如果未安装)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 2. 重新加载shell配置
source ~/.zshrc

# 3. 安装最新的Node.js LTS版本
nvm install --lts
nvm use --lts

# 4. 验证安装
node -p "process.arch" # 应该输出 'arm64'
```

## 方法三: 官方安装包

1. 访问 https://nodejs.org/
2. 下载 macOS ARM64 版本
3. 运行安装包
4. 验证安装: `node -p "process.arch"`

## 迁移步骤

1. **备份当前项目**
   ```bash
   cp -r . ../project-backup
   ```

2. **清理现有依赖**
   ```bash
   rm -rf node_modules package-lock.json
   rm -rf backend/node_modules backend/package-lock.json
   rm -rf frontend/node_modules frontend/package-lock.json
   ```

3. **重新安装依赖**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. **重新下载Playwright浏览器**
   ```bash
   cd backend
   npx playwright install
   ```

5. **测试应用**
   ```bash
   npm run dev
   ```

## 注意事项

- 确保Terminal运行在ARM64模式下
- 某些原生模块可能需要重新编译
- 如遇问题，可以回退到备份版本
