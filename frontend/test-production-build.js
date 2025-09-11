#!/usr/bin/env node
/**
 * 测试生产环境构建脚本
 * 模拟静态文件服务器来测试构建输出
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;
const BUILD_DIR = path.join(__dirname, 'build');

console.log('🚀 启动生产环境测试服务器...');
console.log('构建目录:', BUILD_DIR);

// 检查构建目录是否存在
if (!fs.existsSync(BUILD_DIR)) {
  console.error('❌ 构建目录不存在，请先运行 npm run build');
  process.exit(1);
}

// 静态文件服务
app.use(express.static(BUILD_DIR, {
  setHeaders: (res, path) => {
    // 设置正确的Content-Type
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
    
    // 添加安全头
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
  }
}));

// SPA路由支持 - 所有路由都返回index.html
app.get('*', (req, res) => {
  const indexPath = path.join(BUILD_DIR, 'index.html');
  
  console.log(`📄 请求路径: ${req.path}`);
  
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('index.html not found');
  }
});

// 错误处理
app.use((err, req, res, next) => {
  console.error('❌ 服务器错误:', err);
  res.status(500).send('Internal Server Error');
});

// 启动服务器
app.listen(PORT, () => {
  console.log('✅ 测试服务器启动成功!');
  console.log(`🌐 访问地址: http://localhost:${PORT}`);
  console.log('\n📋 测试步骤:');
  console.log('1. 在浏览器中打开上述地址');
  console.log('2. 打开开发者工具 (F12)');
  console.log('3. 检查Console是否有错误');
  console.log('4. 检查Network标签页的请求状态');
  console.log('5. 验证页面是否正常显示');
  console.log('\n按 Ctrl+C 停止服务器');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭测试服务器...');
  process.exit(0);
});

// 监听未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('❌ 未捕获的异常:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
  process.exit(1);
});