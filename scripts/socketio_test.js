#!/usr/bin/env node
/**
 * 连接后端 Socket.IO 并验证实时事件
 * 为什么：最小化客户端验证连接、消息往返与断开流程，确保实时通道可用
 */
const io = require('socket.io-client');

/**
 * 启动连接并进行基本事件测试
 * 步骤：
 * 1. 连接到指定后端地址
 * 2. 监听 connect/disconnect/error 事件
 * 3. 发送一个 ping 消息（如支持）并打印响应
 */
function runSocketTest(url = 'http://127.0.0.1:5001') {
  const socket = io(url, {
    transports: ['websocket', 'polling'],
    reconnectionAttempts: 1,
    timeout: 5000,
  });

  socket.on('connect', () => {
    console.log('✅ Socket 已连接:', socket.id);
    // 尝试发送一个简单事件（如果后端有统一事件可用，可修改为具体事件）
    socket.emit('client_ping', { ts: Date.now() }, (ack) => {
      console.log('📨 收到服务器ACK:', ack);
      socket.disconnect();
    });
  });

  socket.on('disconnect', (reason) => {
    console.log('👋 Socket 已断开:', reason);
    process.exit(0);
  });

  socket.on('connect_error', (err) => {
    console.error('❌ 连接错误:', err.message);
    process.exit(2);
  });

  // 兜底退出：避免无响应时挂住流程
  setTimeout(() => {
    console.warn('⏳ 超时退出');
    try { socket.disconnect(); } catch {}
    process.exit(3);
  }, 15000);
}

/**
 * 主入口：允许通过CLI参数传入URL
 */
function main() {
  const url = process.argv[2] || 'http://127.0.0.1:5001';
  runSocketTest(url);
}

main();