# Zeabur 部署故障排除指南

本指南帮助解决智能寻聘系统在 Zeabur 平台部署过程中可能遇到的常见问题。

## 🚨 常见部署问题

### 1. 构建失败问题

#### 问题：Node.js 版本不兼容
```
Error: The engine "node" is incompatible with this module
```

**解决方案：**
1. 检查 `package.json` 中的 `engines` 字段
2. 确保 `zbpack.json` 中指定了正确的 Node.js 版本
3. 推荐使用 Node.js 18 或 20

```json
// package.json
{
  "engines": {
    "node": ">=18.0.0"
  }
}

// zbpack.json
{
  "services": {
    "backend": {
      "nodeVersion": "18"
    }
  }
}
```

#### 问题：依赖安装失败
```
npm ERR! peer dep missing
```

**解决方案：**
1. 清理 `package-lock.json`
2. 重新安装依赖
3. 检查 peer dependencies

```bash
# 本地清理和重新安装
rm -rf node_modules package-lock.json
npm install

# 提交更新后的 package-lock.json
git add package-lock.json
git commit -m "更新依赖锁定文件"
git push
```

#### 问题：Puppeteer 安装失败
```
Error: Failed to download Chromium
```

**解决方案：**
1. 确保设置了正确的环境变量
2. 检查 `zbpack.json` 配置

```json
// zbpack.json 中的环境变量
{
  "services": {
    "backend": {
      "env": {
        "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD": "true",
        "PUPPETEER_EXECUTABLE_PATH": "/usr/bin/google-chrome-stable"
      }
    }
  }
}
```

### 2. 运行时错误

#### 问题：服务启动失败
```
Application failed to start
```

**排查步骤：**
1. 检查 Zeabur 控制台日志
2. 验证环境变量配置
3. 检查端口配置

**解决方案：**
```javascript
// 确保服务监听正确端口
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

#### 问题：数据库连接失败
```
Error: connect ECONNREFUSED
```

**解决方案：**
1. 检查 Supabase 环境变量
2. 验证数据库 URL 格式
3. 确认网络连接

```bash
# 检查环境变量
echo $SUPABASE_URL
echo $SUPABASE_ANON_KEY

# 测试数据库连接
curl -H "apikey: $SUPABASE_ANON_KEY" "$SUPABASE_URL/rest/v1/"
```

#### 问题：CORS 错误
```
Access to fetch at 'backend-url' from origin 'frontend-url' has been blocked by CORS policy
```

**解决方案：**
1. 更新后端 CORS 配置
2. 添加前端域名到允许列表

```javascript
// backend/src/middleware/cors.js
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'https://your-frontend.zeabur.app',  // 添加实际前端 URL
    process.env.FRONTEND_URL
  ],
  credentials: true
};
```

### 3. 环境变量问题

#### 问题：环境变量未生效
```
undefined is not a valid value
```

**排查步骤：**
1. 检查 Zeabur 控制台环境变量设置
2. 验证变量名称拼写
3. 确认变量值格式

**解决方案：**
```bash
# 在 Zeabur 控制台设置环境变量
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-jwt-secret
BROWSER_HEADLESS=true
```

### 4. 静态文件问题

#### 问题：前端资源 404
```
GET /static/js/main.js 404 (Not Found)
```

**解决方案：**
1. 检查构建输出目录
2. 验证 `zbpack.json` 静态目录配置

```json
// zbpack.json
{
  "services": {
    "frontend": {
      "env": {
        "ZBPACK_STATIC_DIR": "dist"
      }
    }
  }
}
```

## 🔧 调试工具和方法

### 1. 使用部署状态检查脚本

```bash
# 检查所有服务状态
./deploy/scripts/check-deployment-status.sh \
  https://backend.zeabur.app \
  https://frontend.zeabur.app \
  https://vnc.zeabur.app

# 交互式检查
./deploy/scripts/check-deployment-status.sh
```

### 2. 查看 Zeabur 日志

1. 登录 Zeabur 控制台
2. 选择项目和服务
3. 点击 "Logs" 标签
4. 查看实时日志和错误信息

### 3. 本地测试生产配置

```bash
# 使用生产环境变量本地测试
cp deploy/config/.env.zeabur .env.production

# 设置必要的环境变量
export NODE_ENV=production
export BROWSER_HEADLESS=true

# 启动服务测试
npm run start
```

### 4. 网络连接测试

```bash
# 测试服务可达性
curl -I https://your-backend.zeabur.app/api/health

# 测试 API 响应
curl https://your-backend.zeabur.app/api/health

# 测试 CORS
curl -H "Origin: https://your-frontend.zeabur.app" \
     -H "Access-Control-Request-Method: GET" \
     -X OPTIONS \
     https://your-backend.zeabur.app/api/health
```

## 📊 性能优化

### 1. 构建优化

```json
// package.json - 优化构建脚本
{
  "scripts": {
    "build": "npm run build:clean && npm run build:app",
    "build:clean": "rm -rf dist",
    "build:app": "vite build --mode production"
  }
}
```

### 2. 资源优化

```javascript
// vite.config.js - 构建优化
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          utils: ['lodash', 'axios']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

### 3. 内存优化

```json
// zbpack.json - 资源限制
{
  "services": {
    "backend": {
      "env": {
        "NODE_OPTIONS": "--max-old-space-size=1024"
      }
    }
  }
}
```

## 🚀 部署最佳实践

### 1. 部署前检查清单

- [ ] 所有测试通过
- [ ] 环境变量已配置
- [ ] 构建脚本正常
- [ ] 依赖版本兼容
- [ ] 代码已推送到 Git

### 2. 分阶段部署

1. **第一阶段：后端服务**
   - 部署后端 API
   - 配置数据库连接
   - 测试 API 端点

2. **第二阶段：前端应用**
   - 更新 API URL
   - 部署前端应用
   - 测试页面加载

3. **第三阶段：VNC 服务**
   - 部署浏览器服务
   - 测试自动化功能
   - 验证完整流程

### 3. 监控和维护

```bash
# 定期健康检查
*/5 * * * * curl -f https://your-backend.zeabur.app/api/health || echo "Backend down"

# 日志监控
tail -f /var/log/app.log | grep ERROR

# 资源监控
watch -n 5 'curl -s https://your-backend.zeabur.app/api/stats'
```

## 📞 获取帮助

### 1. 官方资源

- [Zeabur 官方文档](https://zeabur.com/docs)
- [Zeabur Discord 社区](https://discord.gg/zeabur)
- [GitHub Issues](https://github.com/zeabur/zeabur/issues)

### 2. 项目支持

- 查看项目 README.md
- 检查 GitHub Issues
- 联系项目维护者

### 3. 紧急问题处理

1. **服务完全不可用**
   - 检查 Zeabur 状态页面
   - 回滚到上一个工作版本
   - 联系技术支持

2. **部分功能异常**
   - 查看错误日志
   - 使用调试工具
   - 逐步排查问题

3. **性能问题**
   - 监控资源使用
   - 分析瓶颈点
   - 优化代码和配置

---

## 📝 故障记录模板

```markdown
### 问题描述
- 时间：
- 影响范围：
- 错误信息：

### 排查过程
1. 检查项目：
2. 发现问题：
3. 尝试解决：

### 解决方案
- 最终方案：
- 验证结果：

### 预防措施
- 改进建议：
- 监控加强：
```

记住：遇到问题时保持冷静，系统性地排查，记录解决过程以便后续参考。