# Zeabur部署指南 - Puppeteer迁移完成

## 🎯 迁移状态总结

### ✅ 已完成迁移的服务
- `puppeteerService.js` - 已使用Puppeteer
- `zhilianService.js` - 已迁移到Puppeteer
- `bossService.js` - 已迁移到Puppeteer
- `bossZhipinService.js` - 已从Playwright迁移到Puppeteer

### ✅ 依赖更新
- 已移除 `playwright` 依赖
- 已添加 `puppeteer@^21.6.1` 依赖
- package.json已更新

## 🚀 部署步骤

### 1. 环境准备
```bash
# 在Zeabur容器环境中执行
chmod +x deploy-zeabur.sh
./deploy-zeabur.sh
```

### 2. 手动部署命令
```bash
# 安装系统依赖
apt-get update
apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libxss1 \
  libxtst6 \
  xdg-utils \
  libgbm-dev \
  libxshmfence-dev \
  libglu1-mesa-dev \
  libgles2-mesa-dev \
  xvfb

# 安装Node.js依赖
npm install

# 运行验证测试
node test-zeabur-ready.js
```

### 3. 关键配置
所有服务文件已配置为容器环境优化：

```javascript
// 通用浏览器启动配置
const browser = await puppeteer.launch({
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--no-first-run',
    '--no-zygote',
    '--single-process'
  ]
});
```

## 🔍 验证测试

### 运行部署验证
```bash
# 验证所有文件就绪
node test-zeabur-ready.js

# 验证Puppeteer迁移
node check-puppeteer-migration.js

# 验证基本功能（在Linux容器中）
node test-zeabur-simple.js
```

### 预期结果
- ✅ 所有服务文件存在且配置正确
- ✅ Puppeteer依赖已安装
- ✅ 无Playwright残留
- ✅ 浏览器启动成功
- ✅ 基本功能正常

## ⚠️ 已知问题与解决方案

### 1. Mac开发环境架构警告
**问题**: Mac M1/M2芯片显示性能降级警告
**解决**: 仅在Linux容器中运行，不影响Zeabur部署

### 2. 缺失系统库
**问题**: `libgbm.so.1` 缺失
**解决**: 已在deploy-zeabur.sh中包含安装命令

### 3. 浏览器启动失败
**问题**: Chrome启动参数不兼容
**解决**: 已优化启动参数，适配容器环境

## 📋 部署检查清单

- [ ] package.json已更新（移除playwright，添加puppeteer）
- [ ] 所有服务文件已迁移到Puppeteer
- [ ] 系统依赖已安装（libgbm-dev等）
- [ ] 环境变量已配置
- [ ] 部署脚本已可执行
- [ ] 验证测试已通过

## 🐛 故障排除

### 浏览器启动失败
```bash
# 检查Chrome是否安装
which google-chrome-stable || which chromium-browser

# 手动测试
node -e "
const puppeteer = require('puppeteer');
puppeteer.launch({headless: true, args: ['--no-sandbox']})
  .then(b => b.close().then(() => console.log('✅ Chrome正常')))
  .catch(e => console.error('❌ Chrome错误:', e.message));
"
```

### 依赖问题
```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install
```

## 🎉 部署成功标志

当以下命令全部返回成功时，表示部署完成：

```bash
node test-zeabur-ready.js    # 返回"✅ 部署就绪验证通过"
node check-puppeteer-migration.js  # 显示"4个文件已迁移"
```

## 📞 技术支持

如遇到部署问题，请检查：
1. 系统依赖是否完整安装
2. Node.js版本是否兼容（推荐v18+）
3. 环境变量是否正确设置
4. 查看详细错误日志