# 🚨 紧急修复指南 - libgbm.so.1缺失问题

## 问题状态
- **根本原因确认**：Zeabur容器缺少libgbm系统库
- **Dockerfile已修复**：包含完整系统依赖
- **当前状态**：强制重建已触发，等待构建完成

## 立即验证步骤

### 1. 在Zeabur控制台检查构建日志
```bash
# 查找这些成功标志
[✓] libgbm1 is already the newest version
[✓] Setting up libgbm-dev
[✓] Chromium dependencies installed
```

### 2. 部署完成后验证
```bash
# 后端日志应显示
curl https://your-backend-url.com/api/health
# 期望响应：{"status":"ok","browser":"ready"}
```

## 备用方案（如果5分钟后仍未解决）

### 方案A：使用Puppeteer替代（30秒切换）
```bash
# 已准备切换脚本，无需代码修改
npm install puppeteer-core
```

### 方案B：Zeabur环境变量快速修复
```bash
# 在Zeabur控制台添加
ZEABUR_BUILD_COMMAND="apt-get update && apt-get install -y libgbm1 && npm start"
```

## 构建监控
- **预计时间**：3-5分钟
- **成功标志**：日志中不再出现`libgbm.so.1`错误
- **验证URL**：部署完成后访问健康检查接口

## 技术支持
如果10分钟后问题仍未解决，立即执行：
```bash
# 获取详细构建日志
zeabur logs --tail=100
```