const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Socket.IO WebSocket 代理
  app.use(
    createProxyMiddleware('/socket.io', {
      target: 'http://localhost:5001',
      changeOrigin: true,
      ws: true, // 支持 WebSocket
      logLevel: 'debug', // 开发环境启用调试日志
      onError: (err, req, res) => {
        console.error('Socket.IO 代理错误:', err);
      },
      onProxyReq: (proxyReq, req, res) => {
        console.log('Socket.IO 代理请求:', req.method, req.url);
      }
    })
  );
  
  // API 代理
  app.use(
    createProxyMiddleware('/api', {
      target: 'http://localhost:5001',
      changeOrigin: true,
      logLevel: 'debug',
      onError: (err, req, res) => {
        console.error('API 代理错误:', err);
      }
    })
  );
};