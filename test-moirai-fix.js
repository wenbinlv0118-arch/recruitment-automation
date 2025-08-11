const io = require('socket.io-client');

// 连接到后端服务
const socket = io('http://localhost:5001', {
  transports: ['websocket', 'polling'],
  timeout: 30000,
  forceNew: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

console.log('正在连接Socket.IO...');

socket.on('connect', () => {
  console.log('✅ 连接成功');
  console.log('传输方式:', socket.io.engine.transport.name);
  
  // 发送测试消息
  console.log('\n📤 发送测试消息...');
  socket.emit('userMessage', { message: '我需要招聘前端开发工程师' });
});

socket.on('thinking', (data) => {
  console.log('\n🧠 收到思维链消息:');
  console.log('数据类型:', typeof data.content);
  console.log('内容:', data.content);
});

socket.on('finalAnswer', (data) => {
  console.log('\n💡 收到最终建议消息:');
  console.log('内容:', data.content);
});

socket.on('aiMessage', (data) => {
  console.log('\n🤖 收到AI消息:');
  console.log('内容:', data.content);
});

socket.on('statusUpdate', (data) => {
  console.log('\n📊 状态更新:', data.status, '-', data.message);
});

socket.on('error', (data) => {
  console.error('\n❌ 错误:', data.message);
});

socket.on('disconnect', () => {
  console.log('\n🔌 连接断开');
});

// 15秒后断开连接
setTimeout(() => {
  console.log('\n⏰ 测试完成，断开连接');
  socket.disconnect();
  process.exit(0);
}, 15000); 