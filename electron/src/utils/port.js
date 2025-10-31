// 端口工具模块：检测并查找可用端口
// 使用小模块、单一职责，便于在主进程复用
const net = require('net');

/**
 * 检查指定端口是否可用
 * @param {number} port 要检测的端口
 * @returns {Promise<boolean>} 是否可用
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        server.close(() => resolve(true));
      })
      .listen(port, '127.0.0.1');
  });
}

/**
 * 从起始端口向上递增查找一个可用端口
 * @param {number} startPort 起始端口，默认5001
 * @param {number} maxTries 最大尝试次数，默认20
 * @returns {Promise<number>} 可用端口号
 */
async function findAvailablePort(startPort = 5001, maxTries = 20) {
  let port = startPort;
  for (let i = 0; i < maxTries; i++) {
    // eslint-disable-next-line no-await-in-loop
    const available = await isPortAvailable(port);
    if (available) return port;
    port += 1;
  }
  return startPort; // 兜底返回起始端口
}

module.exports = {
  isPortAvailable,
  findAvailablePort,
};