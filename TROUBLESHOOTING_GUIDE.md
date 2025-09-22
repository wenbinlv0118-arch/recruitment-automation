# 生产环境故障排除指南

本指南提供了在生产环境中可能遇到的常见问题及其解决方案。

## 目录

1. [环境变量配置问题](#环境变量配置问题)
2. [网络安全配置问题](#网络安全配置问题)
3. [数据持久化问题](#数据持久化问题)
4. [Docker容器配置问题](#docker容器配置问题)
5. [应用程序启动问题](#应用程序启动问题)
6. [性能优化问题](#性能优化问题)
7. [监控和日志](#监控和日志)
8. [紧急恢复程序](#紧急恢复程序)

---

## 环境变量配置问题

### 问题症状
- 应用启动失败
- 数据库连接错误
- API调用失败
- 认证问题

### 常见原因
1. 环境变量文件缺失或路径错误
2. 环境变量值格式错误
3. 敏感信息泄露
4. 环境变量未正确加载

### 解决方案

#### 1. 检查环境变量文件
```bash
# 验证环境变量文件存在
ls -la backend/.env.production

# 检查环境变量内容（注意不要泄露敏感信息）
node scripts/fix-environment-config.js validate
```

#### 2. 验证必需的环境变量
```bash
# 运行环境变量验证脚本
node scripts/fix-environment-config.js
```

必需的环境变量：
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `JWT_SECRET`
- `NODE_ENV=production`

#### 3. 修复环境变量加载问题
```javascript
// 在应用启动时确保正确加载环境变量
require('dotenv').config({ path: '.env.production' });
```

---

## 网络安全配置问题

### 问题症状
- CORS错误
- SSL证书问题
- 安全头缺失警告
- 跨域请求失败

### 常见原因
1. CORS配置不正确
2. SSL证书过期或配置错误
3. 安全中间件未正确配置
4. 防火墙规则问题

### 解决方案

#### 1. 验证网络安全配置
```bash
# 运行网络安全验证脚本
node scripts/test-network-security.sh
```

#### 2. 检查CORS配置
```javascript
// 确保CORS中间件正确配置
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
}));
```

#### 3. 验证SSL配置
```bash
# 检查SSL证书状态
openssl x509 -in ssl/certificate.crt -text -noout

# 测试HTTPS连接
curl -I https://your-domain.com
```

---

## 数据持久化问题

### 问题症状
- 数据库连接失败
- 数据丢失
- 备份失败
- 查询超时

### 常见原因
1. 数据库连接配置错误
2. 网络连接问题
3. 数据库权限不足
4. 备份机制未配置

### 解决方案

#### 1. 验证数据库连接
```bash
# 运行数据持久化验证
node scripts/data-persistence-validator.js validate
```

#### 2. 修复数据库连接问题
```bash
# 运行数据持久化修复脚本
node scripts/fix-data-persistence.js
```

#### 3. 手动测试数据库连接
```javascript
// 测试Supabase连接
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// 测试连接
supabase.from('users').select('count').then(console.log).catch(console.error);
```

#### 4. 数据备份和恢复
```bash
# 创建数据备份
node scripts/database-backup.js

# 检查备份文件
ls -la backend/backups/

# 数据完整性检查
node scripts/data-integrity-check.js
```

---

## Docker容器配置问题

### 问题症状
- 容器启动失败
- Xvfb显示问题
- 权限错误
- 浏览器无法启动

### 常见原因
1. Dockerfile配置错误
2. 用户权限问题
3. Xvfb未正确配置
4. 依赖包缺失

### 解决方案

#### 1. 分析Docker配置
```bash
# 运行Docker配置优化分析
node scripts/optimize-docker-config.js
```

#### 2. 检查容器状态
```bash
# 查看容器日志
docker logs <container_id>

# 进入容器调试
docker exec -it <container_id> /bin/bash

# 检查Xvfb进程
ps aux | grep Xvfb
```

#### 3. 验证Playwright配置
```bash
# 在容器内运行Playwright验证
./verify-playwright.sh

# 测试浏览器启动
DISPLAY=:99 npx playwright install chromium
```

#### 4. 使用优化后的配置
```bash
# 使用优化后的Dockerfile
cp optimizations/Dockerfile.optimized backend/Dockerfile
cp optimizations/start-with-xvfb.optimized.sh backend/start-with-xvfb.sh

# 重新构建镜像
docker build -t your-app:optimized .
```

---

## 应用程序启动问题

### 问题症状
- 应用无法启动
- 端口占用错误
- 模块加载失败
- 内存不足

### 常见原因
1. 依赖包未安装
2. 端口冲突
3. 内存限制
4. 启动脚本错误

### 解决方案

#### 1. 检查依赖包
```bash
# 安装依赖
npm install

# 检查关键依赖
npm list express dotenv @supabase/supabase-js
```

#### 2. 检查端口占用
```bash
# 查看端口占用
lsof -i :3000

# 杀死占用进程
kill -9 <PID>
```

#### 3. 内存优化
```bash
# 设置Node.js内存限制
export NODE_OPTIONS="--max-old-space-size=2048"

# 运行内存优化脚本
node memory-optimizer.js
```

---

## 性能优化问题

### 问题症状
- 响应时间慢
- 内存使用过高
- CPU占用率高
- 请求超时

### 解决方案

#### 1. 性能监控
```bash
# 运行性能分析
node performance-analyzer.js

# 监控系统资源
top -p <node_process_id>
```

#### 2. 内存优化
```bash
# 运行内存优化
node memory-optimizer.js

# 启动优化脚本
node startup-optimizer.js
```

#### 3. 数据库查询优化
```javascript
// 添加查询索引
// 使用分页查询
// 实施查询缓存
```

---

## 监控和日志

### 日志位置
- 应用日志: `backend/data/logs/`
- 错误日志: `backend/data/alerts/`
- 系统日志: `/var/log/`
- Docker日志: `docker logs <container>`

### 监控脚本
```bash
# 运行系统监控
node scripts/data-monitoring.js

# 检查应用健康状态
curl http://localhost:3000/health
```

### 日志分析
```bash
# 查看最近的错误日志
tail -f backend/data/logs/error.log

# 搜索特定错误
grep -r "ERROR" backend/data/logs/
```

---

## 紧急恢复程序

### 1. 服务完全不可用

#### 立即行动
1. 检查服务状态
```bash
# 检查进程
ps aux | grep node

# 检查端口
netstat -tlnp | grep :3000
```

2. 重启服务
```bash
# 停止服务
pkill -f "node.*src/index.js"

# 重启服务
npm start
```

3. 检查日志
```bash
tail -f backend/data/logs/error.log
```

### 2. 数据库连接失败

#### 立即行动
1. 验证数据库状态
```bash
node scripts/data-persistence-validator.js validate
```

2. 检查网络连接
```bash
ping your-supabase-url.com
nslookup your-supabase-url.com
```

3. 重新配置连接
```bash
node scripts/fix-data-persistence.js
```

### 3. 内存不足

#### 立即行动
1. 释放内存
```bash
# 重启应用
npm restart

# 清理缓存
npm cache clean --force
```

2. 优化内存使用
```bash
node memory-optimizer.js
```

### 4. 安全问题

#### 立即行动
1. 检查安全配置
```bash
node scripts/test-network-security.sh
```

2. 更新安全设置
```bash
# 重新生成JWT密钥
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 更新环境变量
node scripts/fix-environment-config.js
```

---

## 联系支持

如果以上解决方案都无法解决问题，请：

1. 收集以下信息：
   - 错误日志
   - 系统状态
   - 复现步骤
   - 环境信息

2. 运行完整诊断：
```bash
node scripts/production-fix-validator.js
```

3. 生成诊断报告：
   - 查看 `reports/` 目录中的最新报告
   - 包含所有相关日志文件

---

## 预防措施

### 定期维护
1. 每日运行健康检查
```bash
node scripts/production-fix-validator.js
```

2. 每周运行完整备份
```bash
node scripts/database-backup.js
```

3. 每月更新依赖包
```bash
npm audit
npm update
```

### 监控设置
1. 设置自动化监控
2. 配置告警通知
3. 定期性能分析

### 文档更新
1. 记录所有配置更改
2. 更新部署文档
3. 维护故障排除记录

---

*最后更新: 2025年1月*
*版本: 1.0*