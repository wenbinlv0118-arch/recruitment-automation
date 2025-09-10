# GitHub Actions 故障排除指南

## 常见问题及解决方案

### 1. 依赖安装失败 (Exit Code 1)

**问题描述**：
在 GitHub Actions 工作流中，`npm ci` 命令执行失败，返回退出代码 1。

**可能原因**：
- package-lock.json 文件与 package.json 不同步
- CI 环境中某些依赖包无法正常安装
- 网络问题导致包下载失败
- Node.js 版本不兼容

**解决方案**：

1. **改进依赖安装步骤**（已实施）：
```yaml
- name: 安装依赖
  run: |
    echo "安装根目录依赖..."
    npm ci || (echo "根目录依赖安装失败，尝试 npm install" && npm install)
    echo "安装后端依赖..."
    cd backend && (npm ci || npm install)
    echo "安装前端依赖..."
    cd ../frontend && (npm ci || npm install)
```

2. **本地验证**：
```bash
# 清理本地缓存
npm cache clean --force
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
rm -rf frontend/node_modules frontend/package-lock.json

# 重新安装依赖
npm install
cd backend && npm install
cd ../frontend && npm install
```

3. **更新 package-lock.json**：
```bash
# 在每个目录中更新锁定文件
npm update
cd backend && npm update
cd ../frontend && npm update
```

### 2. 代码质量检查失败

**问题描述**：
ESLint 检查发现错误，导致工作流失败。

**解决方案**：
- 修复代码中的 ESLint 错误
- 确保所有必要的依赖都已正确导入
- 使用 `|| echo` 允许警告但不中断构建

### 3. 缓存问题

**问题描述**：
GitHub Actions 缓存可能导致依赖安装问题。

**解决方案**：
```yaml
- name: 设置 Node.js
  uses: actions/setup-node@v4
  with:
    node-version: ${{ env.NODE_VERSION }}
    cache: 'npm'
    cache-dependency-path: '**/package-lock.json'
```

### 4. 环境变量配置

**问题描述**：
缺少必要的环境变量或密钥。

**解决方案**：
1. 在 GitHub 仓库设置中配置所需的 Secrets
2. 确保工作流中正确引用这些 Secrets
3. 使用环境特定的配置

## 调试技巧

### 1. 启用详细日志
```yaml
- name: 调试信息
  run: |
    echo "Node.js 版本: $(node --version)"
    echo "npm 版本: $(npm --version)"
    echo "当前目录: $(pwd)"
    echo "文件列表:"
    ls -la
```

### 2. 检查依赖状态
```yaml
- name: 检查依赖
  run: |
    npm ls --depth=0 || true
    cd backend && npm ls --depth=0 || true
    cd ../frontend && npm ls --depth=0 || true
```

### 3. 验证构建环境
```yaml
- name: 环境检查
  run: |
    echo "操作系统: ${{ runner.os }}"
    echo "架构: ${{ runner.arch }}"
    echo "工作目录: ${{ github.workspace }}"
```

## 预防措施

1. **定期更新依赖**：
   - 使用 `npm audit` 检查安全漏洞
   - 定期更新 package.json 中的依赖版本

2. **本地测试**：
   - 在推送前本地运行所有检查
   - 使用与 CI 相同的 Node.js 版本

3. **监控工作流**：
   - 定期检查 GitHub Actions 运行状态
   - 设置通知以便及时发现问题

## 相关文档

- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - 部署指南
- [NETWORK_TROUBLESHOOTING.md](./NETWORK_TROUBLESHOOTING.md) - 网络问题排除
- [GitHub Actions 官方文档](https://docs.github.com/en/actions)

---

**最后更新**: 2024年1月
**维护者**: 开发团队