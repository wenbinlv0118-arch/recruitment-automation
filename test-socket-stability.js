const io = require('socket.io-client');

console.log('🧪 测试Socket连接稳定性...');

// 创建Socket连接
const socket = io('http://localhost:5001', {
  transports: ['websocket', 'polling'],
  timeout: 30000,
  forceNew: false,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  upgrade: true,
  rememberUpgrade: true,
  autoConnect: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

let messageCount = 0;
let disconnectCount = 0;
let reconnectCount = 0;

// 连接成功
socket.on('connect', () => {
  console.log('✅ Socket连接成功:', socket.id);
  console.log('传输方式:', socket.io.engine.transport.name);
  
  // 开始发送测试消息
  startMessageTest();
});

// 连接断开
socket.on('disconnect', (reason) => {
  disconnectCount++;
  console.log(`❌ Socket连接断开 (第${disconnectCount}次):`, reason);
  console.log('断开时间:', new Date().toISOString());
});

// 重连尝试
socket.on('reconnect_attempt', (attemptNumber) => {
  console.log(`🔄 重连尝试 ${attemptNumber}/10`);
});

// 重连成功
socket.on('reconnect', (attemptNumber) => {
  reconnectCount++;
  console.log(`✅ 重连成功 (第${reconnectCount}次):`, attemptNumber);
  console.log('重连时间:', new Date().toISOString());
  
  // 重连成功后继续测试
  startMessageTest();
});

// 重连失败
socket.on('reconnect_failed', () => {
  console.log('❌ 重连失败，已达到最大尝试次数');
});

// 连接错误
socket.on('connect_error', (error) => {
  console.error('❌ 连接错误:', error.message);
});

// 错误处理
socket.on('error', (error) => {
  console.error('❌ Socket错误:', error);
});

// 开始消息测试
function startMessageTest() {
  console.log('📡 开始发送测试消息...');
  
  // 发送测试消息
  const testMessage = `测试消息 ${++messageCount} - ${new Date().toISOString()}`;
  socket.emit('userMessage', { message: testMessage });
  
  // 每5秒发送一条消息
  setInterval(() => {
    if (socket.connected) {
      const message = `测试消息 ${++messageCount} - ${new Date().toISOString()}`;
      socket.emit('userMessage', { message: message });
      console.log('📤 发送消息:', message);
    }
  }, 5000);
}

// 监听AI响应
socket.on('aiMessage', (data) => {
  console.log('🤖 收到AI响应:', data.content ? data.content.substring(0, 100) + '...' : '无内容');
});

// 监听状态更新
socket.on('statusUpdate', (data) => {
  console.log('📊 状态更新:', data.status, data.message);
});

// 监听思维链
socket.on('thinking', (data) => {
  console.log('🧠 收到思维链:', Array.isArray(data.content) ? data.content.length + ' 个步骤' : '单步');
});

// 监听最终回答
socket.on('finalAnswer', (data) => {
  console.log('💡 收到最终回答:', data.content ? data.content.substring(0, 100) + '...' : '无内容');
});

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n🛑 正在停止测试...');
  console.log(`📊 测试统计:`);
  console.log(`   - 发送消息: ${messageCount} 条`);
  console.log(`   - 断开连接: ${disconnectCount} 次`);
  console.log(`   - 重连成功: ${reconnectCount} 次`);
  
  if (socket.connected) {
    socket.disconnect();
  }
  
  process.exit(0);
});

console.log('💡 测试说明:');
console.log('1. 每5秒发送一条测试消息');
console.log('2. 监控连接状态和重连情况');
console.log('3. 按 Ctrl+C 停止测试');
console.log('');
console.log('⏳ 等待连接建立...');
