# Puppeteer替代方案部署指南

## 概述
由于Playwright在生产环境中遇到libgbm.so.1缺失和D-Bus错误，我们已成功实现Puppeteer替代方案。

## 已完成的工作

### 1. 核心组件
- ✅ 创建Puppeteer服务模块 (`src/services/puppeteerService.js`)
- ✅ 创建Puppeteer版智联招聘服务 (`src/services/zhilianServicePuppeteer.js`)
- ✅ 安装Puppeteer依赖 (`npm install puppeteer@^21.5.2`)

### 2. 测试脚本
- ✅ 创建基础测试脚本 (`test-puppeteer-simple.js`)
- ✅ 创建Zeabur环境测试脚本 (`test-zeabur-puppeteer.js`)

### 3. 配置优化
- ✅ 容器环境友好的浏览器配置
- ✅ 无头模式优化参数
- ✅ Zeabur环境特殊处理

## 部署步骤

### 1. 验证安装
```bash
cd backend
npm install puppeteer@^21.5.2 --save
```

### 2. 运行测试
```bash
# 基础功能测试
node test-puppeteer-simple.js

# Zeabur环境测试
node test-zeabur-puppeteer.js
```

### 3. 更新服务引用
在需要使用浏览器自动化的服务中：

```javascript
// 替换原来的Playwright导入
const { puppeteerService } = require('./src/services/puppeteerService');

// 或者使用新的智联招聘服务
const { ZhilianServicePuppeteer } = require('./src/services/zhilianServicePuppeteer');
```

### 4. Zeabur部署
由于Puppeteer不依赖系统级图形库，可以直接部署到Zeabur：

```bash
# 提交更改
git add .
git commit -m "feat: 使用Puppeteer替代Playwright解决生产环境依赖问题"
git push origin-ssh develop
```

## 优势对比

| 特性 | Playwright | Puppeteer |
|------|------------|-----------|
| 系统依赖 | ❌ 需要libgbm.so.1等 | ✅ 最小依赖 |
| Docker支持 | ❌ 需要额外配置 | ✅ 原生支持 |
| Zeabur兼容 | ❌ 需要特殊处理 | ✅ 直接部署 |
| 启动速度 | 中等 | 快速 |
| 内存占用 | 较高 | 较低 |

## 使用示例

### 基础使用
```javascript
const { puppeteerService } = require('./src/services/puppeteerService');

async function example() {
  const page = await puppeteerService.createPage();
  await page.goto('https://example.com');
  const title = await page.title();
  console.log(title);
  await puppeteerService.close();
}
```

### 智联招聘集成
```javascript
const { ZhilianServicePuppeteer } = require('./src/services/zhilianServicePuppeteer');

const service = new ZhilianServicePuppeteer();
await service.searchCandidates('前端工程师', '北京');
```

## 故障排除

### 常见问题
1. **浏览器启动失败**
   - 检查是否安装了Chrome
   - 确认使用无头模式配置

2. **页面加载超时**
   - 调整网络超时设置
   - 检查目标网站可用性

3. **内存问题**
   - 使用单进程模式
   - 及时关闭浏览器实例

### 监控建议
- 定期检查服务健康状态
- 监控内存使用情况
- 记录错误日志

## 下一步计划
1. 在Zeabur部署并验证
2. 监控实际运行效果
3. 根据反馈优化配置
4. 逐步迁移其他Playwright依赖

## 支持
如有问题，请参考：
- 测试脚本：`test-zeabur-puppeteer.js`
- 服务文档：`src/services/puppeteerService.js`
- 部署日志：Zeabur控制台