# 生产环境部署检查清单

## 文档状态
- **状态**: 已完成 ✅
- **最后更新**: 2024-12-19
- **版本**: 3.0.0
- **重要提醒**: ⚠️ 所有测试必须在生产环境中验证通过

## 🚀 快速开始

### 一键验证命令
```bash
# 执行完整的生产环境验证
./scripts/production-deployment-validator.sh

# 快速验证（跳过耗时测试）
./scripts/production-deployment-validator.sh quick

# 仅验证工具和环境
./scripts/production-deployment-validator.sh tools
```

### 验证报告位置
- 详细日志: `reports/production-validation-TIMESTAMP.log`
- JSON报告: `reports/production-validation-summary-TIMESTAMP.json`

> **重要原则：所有修改必须在生产环境中验证，不能仅依赖本地开发环境测试**

## 🎯 生产环境优先原则

### 核心要求
- ✅ 所有配置修改必须在生产环境（Zeabur）中测试验证
- ✅ 容器化环境测试优先于本地环境测试
- ✅ 生产环境问题必须在生产环境中复现和解决
- ✅ 部署前必须通过完整的生产环境测试流程

## 🚀 Zeabur 部署问题排查

### 问题现象
- 页面显示："您需要启用JavaScript才能运行此应用程序"
- JavaScript文件无法正确加载或执行
- 浏览器自动化服务在生产环境中失败
- VNC服务连接问题

### ✅ 已验证的配置

#### 1. 本地构建配置 ✅
- [x] 构建文件正确生成 (`frontend/build/`)
- [x] JavaScript文件存在 (`main.31d5e22c.js`)
- [x] index.html 正确引用脚本
- [x] 环境变量格式正确
- [x] zbpack.json 配置正确

#### 2. 项目配置 ✅
- [x] `zbpack.json` 中 `output_dir: "frontend/build"`
- [x] `spa: true` 已设置
- [x] `_redirects` 文件存在于 `public/` 目录
- [x] 环境变量 `.env.production` 配置正确

### 🔧 需要检查的Zeabur部署配置

#### 1. 环境变量设置
在Zeabur控制台中确保以下环境变量已正确设置：

⚠️ **关键问题**: 必须使用 `REACT_APP_` 前缀，不是 `VITE_` 前缀！

```bash
# 正确的React环境变量配置
REACT_APP_API_BASE_URL=https://recruitment-automation-backend.zeabur.app
REACT_APP_SUPABASE_URL=https://your-supabase-url.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key

# Zeabur特定环境变量
ZBPACK_SPA=true
NODE_ENV=production
```

❌ **常见错误**: 使用了错误的前缀
```bash
# 这些变量不会被React应用识别
VITE_API_BASE_URL=https://recruitment-automation-backend.zeabur.app
VITE_APP_VERSION=1.0.0
```

#### 2. 服务配置检查
- [ ] 前端服务类型设置为 "Static"
- [ ] 构建命令正确：`cd frontend && npm ci && npm run build`
- [ ] 输出目录正确：`frontend/build`
- [ ] SPA模式已启用

#### 3. 域名和路由配置
- [ ] 自定义域名配置正确
- [ ] SSL证书已配置
- [ ] 路由重定向规则生效（`_redirects` 文件）

### 🐛 常见问题及解决方案

#### 问题1：JavaScript文件404错误
**可能原因：**
- 静态文件路径不正确
- 构建输出目录配置错误

**解决方案：**
1. 检查Zeabur控制台中的构建日志
2. 确认 `output_dir` 设置为 `frontend/build`
3. 重新部署服务

#### 问题2：环境变量未生效
**可能原因：**
- 环境变量在构建时未正确注入
- REACT_APP_ 前缀缺失

**解决方案：**
1. 在Zeabur控制台重新设置环境变量
2. 确保所有前端环境变量都有 `REACT_APP_` 前缀
3. 触发重新构建

#### 问题3：SPA路由不工作
**可能原因：**
- `_redirects` 文件未生效
- SPA模式未启用

**解决方案：**
1. 确认 `public/_redirects` 文件存在
2. 在zbpack.json中确认 `"spa": true`
3. 检查Zeabur控制台中的SPA设置

#### 问题4：CORS或API连接问题
**可能原因：**
- API基础URL配置错误
- 后端服务未正确启动

**解决方案：**
1. 检查 `REACT_APP_API_BASE_URL` 是否指向正确的后端域名
2. 确认后端服务正常运行
3. 检查浏览器开发者工具的网络请求

### 📋 部署步骤

#### 1. 重新部署前端服务
```bash
# 在Zeabur控制台中：
1. 进入前端服务设置
2. 检查环境变量配置
3. 触发重新部署
4. 查看构建日志
```

#### 2. 验证部署结果
```bash
# 检查项目：
1. 访问部署的URL
2. 打开浏览器开发者工具
3. 检查Console是否有错误
4. 检查Network标签页的请求状态
5. 验证JavaScript文件是否正确加载
```

### 🔍 调试命令

#### 本地测试生产构建
```bash
cd frontend
npm run build
npx serve -s build -p 3000
```

#### 检查构建输出
```bash
node diagnose-production.js
```

### 📞 如果问题仍然存在

1. **检查Zeabur构建日志**
   - 查看是否有构建错误
   - 确认所有依赖正确安装

2. **联系Zeabur支持**
   - 提供构建日志
   - 说明具体问题现象

3. **考虑替代方案**
   - 使用Netlify或Vercel部署
   - 使用Docker容器部署

---

## 🔧 完整生产环境检查清单

### 1. 环境配置验证

#### 1.1 环境变量检查
```bash
# 在Zeabur控制台验证以下环境变量
NODE_ENV=production
ZEABUR_ENVIRONMENT=production

# 前端环境变量（必须有REACT_APP_前缀）
REACT_APP_API_BASE_URL=https://recruitment-automation-backend.zeabur.app
REACT_APP_SUPABASE_URL=your-supabase-url
REACT_APP_SUPABASE_ANON_KEY=your-anon-key

# 后端环境变量
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-key
ZHILIAN_USERNAME=your-username
ZHILIAN_PASSWORD=your-password

# VNC服务环境变量
VNC_PASSWORD=your-vnc-password
DISPLAY=:1
```

#### 1.2 生产环境配置测试脚本
```bash
# 创建生产环境配置验证脚本
node backend/scripts/verify-production-config.js
```

### 2. 浏览器自动化配置

#### 2.1 Playwright配置验证
- [ ] headless参数类型正确（布尔值，不是字符串）
- [ ] 容器环境浏览器参数配置
- [ ] 内存限制和优化设置
- [ ] 错误重试机制

#### 2.2 生产环境浏览器测试
```bash
# 在Zeabur环境中测试浏览器启动
node backend/test-production-browser.js
```

### 3. VNC服务配置

#### 3.1 VNC服务检查
- [ ] VNC服务端口配置（5901）
- [ ] 密码认证设置
- [ ] 显示器配置（DISPLAY=:1）
- [ ] 网络安全设置

#### 3.2 VNC连接测试
```bash
# 测试VNC服务连接
curl -f http://localhost:6080/vnc.html || echo "VNC服务未启动"
```

### 4. 数据库连接验证

#### 4.1 Supabase连接测试
```bash
# 测试数据库连接
node backend/scripts/test-database-connection.js
```

#### 4.2 数据持久化验证
- [ ] 用户数据存储测试
- [ ] 简历数据存储测试
- [ ] 向量化数据存储测试
- [ ] 数据备份机制验证

### 5. 网络和安全配置

#### 5.1 CORS配置验证
- [ ] 前端域名白名单设置
- [ ] API跨域请求配置
- [ ] 安全头部设置

#### 5.2 SSL和域名配置
- [ ] HTTPS证书配置
- [ ] 自定义域名设置
- [ ] 重定向规则配置

### 6. 性能和资源监控

#### 6.1 内存监控
```bash
# 检查内存使用情况
node backend/scripts/memory-monitor.js
```

#### 6.2 性能优化验证
- [ ] 内存泄漏检测
- [ ] CPU使用率监控
- [ ] 响应时间测试
- [ ] 并发处理能力测试

## 🧪 生产环境测试脚本

### 完整部署验证脚本
```bash
#!/bin/bash
# verify-production-deployment.sh

echo "🚀 开始生产环境部署验证..."

# 1. 检查服务状态
echo "📡 检查服务状态..."
curl -f https://recruitment-automation-frontend.zeabur.app/health || echo "❌ 前端服务异常"
curl -f https://recruitment-automation-backend.zeabur.app/health || echo "❌ 后端服务异常"

# 2. 测试API连接
echo "🔗 测试API连接..."
curl -f https://recruitment-automation-backend.zeabur.app/api/health || echo "❌ API连接失败"

# 3. 测试数据库连接
echo "💾 测试数据库连接..."
node backend/scripts/test-database-connection.js || echo "❌ 数据库连接失败"

# 4. 测试浏览器自动化
echo "🤖 测试浏览器自动化..."
node backend/test-production-browser.js || echo "❌ 浏览器自动化失败"

# 5. 测试VNC服务
echo "🖥️ 测试VNC服务..."
curl -f http://localhost:6080/vnc.html || echo "❌ VNC服务异常"

echo "✅ 生产环境验证完成"
```

### 关键功能测试脚本
```bash
#!/bin/bash
# test-core-features.sh

echo "🧪 开始核心功能测试..."

# 1. 用户注册登录测试
echo "👤 测试用户功能..."
node backend/scripts/test-user-auth.js || echo "❌ 用户认证失败"

# 2. 简历解析测试
echo "📄 测试简历解析..."
node backend/scripts/test-resume-parsing.js || echo "❌ 简历解析失败"

# 3. 智联招聘自动化测试
echo "🔍 测试智联招聘自动化..."
node backend/scripts/test-zhilian-automation.js || echo "❌ 智联自动化失败"

# 4. VNC远程控制测试
echo "🖱️ 测试VNC远程控制..."
node backend/scripts/test-vnc-control.js || echo "❌ VNC控制失败"

echo "✅ 核心功能测试完成"
```

## 🚨 常见生产环境问题及解决方案

### 问题1：浏览器启动失败
**症状：** `Error: Failed to launch browser`
**原因：** 容器环境缺少必要的依赖或配置错误
**解决方案：**
1. 检查Dockerfile中的浏览器依赖安装
2. 验证headless参数配置
3. 检查内存限制设置

### 问题2：VNC服务无法连接
**症状：** VNC客户端连接超时
**原因：** 端口映射或防火墙配置问题
**解决方案：**
1. 检查Zeabur端口配置
2. 验证VNC密码设置
3. 检查网络安全组设置

### 问题3：数据库连接失败
**症状：** `Connection timeout` 或 `Authentication failed`
**原因：** 环境变量配置错误或网络问题
**解决方案：**
1. 验证Supabase连接字符串
2. 检查API密钥配置
3. 测试网络连通性

### 问题4：内存不足错误
**症状：** `Out of memory` 或服务崩溃
**原因：** 浏览器进程占用过多内存
**解决方案：**
1. 启用内存监控
2. 配置浏览器内存限制
3. 实现内存清理机制

## 📋 部署前检查清单

### 必须完成的检查项
- [ ] 所有环境变量在Zeabur控制台中正确配置
- [ ] 生产环境配置验证脚本通过
- [ ] 浏览器自动化在容器环境中测试通过
- [ ] VNC服务在生产环境中可正常访问
- [ ] 数据库连接和数据持久化测试通过
- [ ] 网络和安全配置验证完成
- [ ] 性能监控和资源限制配置完成
- [ ] 完整的功能测试在生产环境中通过

### 部署后验证清单
- [ ] 前端页面正常加载，无JavaScript错误
- [ ] 用户注册登录功能正常
- [ ] 简历上传和解析功能正常
- [ ] 智联招聘自动化功能正常
- [ ] VNC远程控制功能正常
- [ ] 数据存储和检索功能正常
- [ ] 性能监控数据正常
- [ ] 错误日志监控正常

## 6. 网络和安全配置验证

### 6.1 网络连接验证
```bash
# 运行网络配置验证脚本
node scripts/network-config-validator.js [前端URL] [后端URL]

# 检查项目:
# - DNS解析测试
# - HTTP/HTTPS连接测试  
# - 端口连通性测试
# - 网络延迟测试
# - 数据库连接测试
# - 本地网络配置检查
```

### 6.2 安全配置验证
```bash
# 运行安全配置脚本
node scripts/production-security-config.js [前端URL] [后端URL]

# 自动生成:
# - CORS配置
# - 安全头部配置
# - 速率限制配置
# - 输入验证配置
# - 安全中间件代码
```

### 6.3 网络安全检查清单
- [ ] **SSL/TLS配置**
  - [ ] 有效的SSL证书
  - [ ] 强制HTTPS重定向
  - [ ] 安全的TLS版本(1.2+)
  - [ ] 正确的证书链配置

- [ ] **CORS配置**
  - [ ] 指定具体的前端域名(避免使用*)
  - [ ] 正确的HTTP方法白名单
  - [ ] 适当的头部白名单
  - [ ] 凭据传递配置正确

- [ ] **安全头部**
  - [ ] Content-Security-Policy
  - [ ] X-XSS-Protection
  - [ ] X-Content-Type-Options
  - [ ] X-Frame-Options
  - [ ] Strict-Transport-Security
  - [ ] Referrer-Policy

- [ ] **速率限制**
  - [ ] 全局请求限制
  - [ ] API端点限制
  - [ ] 认证尝试限制
  - [ ] 文件上传限制

- [ ] **输入验证**
  - [ ] 文件上传类型和大小限制
  - [ ] 字符串长度和格式验证
  - [ ] SQL注入防护
  - [ ] XSS防护

### 6.4 网络性能优化
- [ ] **CDN配置**
  - [ ] 静态资源CDN加速
  - [ ] 图片压缩和优化
  - [ ] 缓存策略配置

- [ ] **负载均衡**
  - [ ] 多实例部署(如适用)
  - [ ] 健康检查配置
  - [ ] 故障转移机制

- [ ] **数据库连接**
  - [ ] 连接池配置
  - [ ] 连接超时设置
  - [ ] 查询优化

## 7. 监控和告警配置

### 7.1 应用监控
- [ ] 错误日志监控
- [ ] 性能指标监控
- [ ] 用户行为分析
- [ ] 业务指标监控

### 7.2 基础设施监控
- [ ] 服务器资源监控
- [ ] 网络连接监控
- [ ] 数据库性能监控
- [ ] 存储空间监控

### 7.3 告警配置
- [ ] 错误率告警
- [ ] 响应时间告警
- [ ] 资源使用告警
- [ ] 安全事件告警

---

**最后更新：** 2024年12月
**状态：** 完整的生产环境检查清单已创建，包括网络和安全配置验证
**重要提醒：** 所有测试必须在生产环境（Zeabur）中进行验证

## 🛠️ 验证脚本完整列表

### 主验证脚本
- **`scripts/production-deployment-validator.sh`** - 🚀 **主验证脚本**（推荐使用）
  - 整合所有验证功能
  - 支持完整验证、快速验证、分模块验证
  - 生成详细报告和JSON格式摘要

### 专项验证脚本
- `scripts/verify-production-deployment.sh` - 生产环境部署验证脚本
- `scripts/test-core-features.sh` - 核心功能测试脚本
- `scripts/test-database-connection.js` - 数据库连接测试脚本
- `scripts/test-production-browser.js` - 生产环境浏览器测试脚本
- `scripts/production-security-config.js` - 生产环境安全配置脚本
- `scripts/network-config-validator.js` - 网络配置验证脚本
- `scripts/test-network-security.sh` - 网络和安全配置测试
- `scripts/resource-performance-monitor.js` - 资源监控和性能优化
- `scripts/production-resource-validator.js` - 生产环境资源配置验证
- `scripts/data-persistence-validator.js` - 数据持久化和备份验证

### 配置文件
- `deploy/config/.env.zeabur` - Zeabur环境变量配置
- `zbpack.json` - Zeabur构建配置
- `backend/.env.production` - 后端生产环境配置

## 📋 验证脚本使用指南

### 主验证脚本使用方法

```bash
# 1. 完整验证（推荐）
./scripts/production-deployment-validator.sh

# 2. 快速验证（跳过耗时测试）
./scripts/production-deployment-validator.sh quick

# 3. 分模块验证
./scripts/production-deployment-validator.sh tools        # 仅检查工具和环境
./scripts/production-deployment-validator.sh structure    # 仅检查项目结构
./scripts/production-deployment-validator.sh dependencies # 仅检查依赖安装
./scripts/production-deployment-validator.sh tests        # 仅运行测试

# 4. 带选项的验证
./scripts/production-deployment-validator.sh --skip-tests     # 跳过功能测试
./scripts/production-deployment-validator.sh --skip-browser   # 跳过浏览器测试
./scripts/production-deployment-validator.sh --skip-network   # 跳过网络测试
./scripts/production-deployment-validator.sh --verbose       # 详细输出
./scripts/production-deployment-validator.sh --quiet         # 静默模式
```

### 专项脚本使用方法

```bash
# 核心功能测试
./scripts/test-core-features.sh

# 数据库连接测试
node scripts/test-database-connection.js

# 浏览器测试
node scripts/test-production-browser.js

# 网络和安全测试
./scripts/test-network-security.sh

# 资源配置验证
node scripts/production-resource-validator.js validate

# 数据持久化验证
node scripts/data-persistence-validator.js validate

# 性能监控
node scripts/resource-performance-monitor.js check
```

### 验证报告说明

#### 详细日志文件
- 位置: `reports/production-validation-TIMESTAMP.log`
- 内容: 完整的验证过程日志，包括所有检查项的详细结果

#### JSON摘要报告
- 位置: `reports/production-validation-summary-TIMESTAMP.json`
- 内容: 验证结果统计、成功率、建议等结构化数据

#### 报告解读
- ✅ **完全通过**: 所有检查项都通过，无警告
- ⚠️ **通过（有警告）**: 核心检查通过，但有需要关注的警告
- ❌ **失败**: 有关键检查项失败，需要修复后重新验证

### 常见问题处理

#### 环境变量缺失
```bash
# 检查必需的环境变量
echo "NODE_ENV: $NODE_ENV"
echo "SUPABASE_URL: $SUPABASE_URL"
echo "SUPABASE_ANON_KEY: $SUPABASE_ANON_KEY"
echo "JWT_SECRET: $JWT_SECRET"
echo "CORS_ORIGIN: $CORS_ORIGIN"
```

#### 依赖安装问题
```bash
# 清理并重新安装依赖
rm -rf node_modules package-lock.json
npm install

# 后端依赖
cd backend && rm -rf node_modules package-lock.json && npm install

# 前端依赖
cd frontend && rm -rf node_modules package-lock.json && npm install
```

#### 权限问题
```bash
# 为所有脚本添加执行权限
chmod +x scripts/*.sh
```

### 自动化集成

#### CI/CD集成示例
```yaml
# .github/workflows/production-validation.yml
name: Production Validation
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Run production validation
        run: ./scripts/production-deployment-validator.sh quick
        env:
          NODE_ENV: production
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          CORS_ORIGIN: ${{ secrets.CORS_ORIGIN }}
```

#### 定期监控脚本
```bash
#!/bin/bash
# scripts/scheduled-validation.sh
# 定期运行验证并发送报告

# 运行快速验证
./scripts/production-deployment-validator.sh quick

# 检查结果并发送通知（可集成邮件、Slack等）
if [ $? -eq 0 ]; then
    echo "✅ 生产环境验证通过"
else
    echo "❌ 生产环境验证失败，请检查报告"
fi
```