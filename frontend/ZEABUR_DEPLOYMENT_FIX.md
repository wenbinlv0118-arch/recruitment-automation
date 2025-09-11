# Zeabur部署问题解决指南

## 问题现象
页面显示："您需要启用JavaScript才能运行此应用程序"

## 解决步骤

### 1. 本地验证
```bash
# 构建项目
npm run build

# 运行验证脚本
./verify-deployment.sh

# 本地测试
npm run serve
# 或
node test-production-build.js
```

### 2. Zeabur配置检查

#### 环境变量设置
在Zeabur控制台 > 服务设置 > 环境变量中添加：

⚠️ **重要提醒**: React应用必须使用 `REACT_APP_` 前缀，不是 `VITE_` 前缀！

```
# 正确的React环境变量前缀
REACT_APP_API_BASE_URL=https://recruitment-automation-backend.zeabur.app
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key

# Zeabur特定配置
ZBPACK_SPA=true
NODE_ENV=production
```

❌ **错误配置示例**（不要使用）：
```
# 这些是错误的，不会被React识别
VITE_API_BASE_URL=https://recruitment-automation-backend.zeabur.app
VITE_APP_VERSION=1.0.0
```

#### 服务配置确认
- **服务类型**: Static
- **框架**: React
- **构建命令**: `cd frontend && npm ci && npm run build`
- **输出目录**: `frontend/build`
- **SPA模式**: 启用

### 3. 重新部署
1. 保存环境变量配置
2. 触发重新部署
3. 查看构建日志
4. 验证部署结果

### 4. 故障排除

#### 如果JavaScript文件404
- 检查构建日志中的错误
- 确认输出目录配置正确
- 检查静态文件路径

#### 如果环境变量未生效
- 确保变量名有REACT_APP_前缀
- 重新构建项目
- 检查构建时的环境变量注入

#### 如果SPA路由不工作
- 确认_redirects文件存在
- 检查SPA模式是否启用
- 验证路由配置

## 联系支持
如果问题仍然存在，请联系Zeabur技术支持，并提供：
- 构建日志
- 环境变量配置截图
- 浏览器开发者工具的错误信息
