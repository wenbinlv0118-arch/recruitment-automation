# 生产环境部署检查清单

## 🚀 Zeabur 部署问题排查

### 问题现象
- 页面显示："您需要启用JavaScript才能运行此应用程序"
- JavaScript文件无法正确加载或执行

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

**最后更新：** 2024年12月
**状态：** 待验证Zeabur部署配置