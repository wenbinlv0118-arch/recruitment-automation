const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { SOCKET_CONFIG } = require('../utils/config');
const { ensureDirectory } = require('../utils/common');

/**
 * 创建并配置Express服务器和Socket.IO
 * @returns {Object} 包含app、server和io实例的对象
 */
function createServer() {
  // 创建Express应用
  const app = express();

  // 配置中间件
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(express.static(path.join(__dirname, '../public')));

  // 确保存储目录存在（支持环境变量覆盖）
  const { storageSubdir } = require('../utils/envPaths');
  const storageDir = storageSubdir('resumes');
  ensureDirectory(storageDir);

  // 创建HTTP服务器
  const server = http.createServer(app);

  // 配置Socket.IO
  const io = socketIo(server, SOCKET_CONFIG);

  return { app, server, io };
}

/**
 * 启动服务器并监听指定端口
 * @param {Object} server - HTTP服务器实例
 * @param {number} port - 要监听的端口号
 * @param {string} storageDir - 存储目录路径
 */
function startServer(server, port, storageDir) {
  server.listen(port, () => {
    console.log(`服务器运行在端口 ${port}`);
    console.log(`存储目录: ${storageDir}`);
  });
}

module.exports = {
  createServer,
  startServer
};