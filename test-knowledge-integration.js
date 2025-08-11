// 测试知识库集成功能
const io = require('socket.io-client');

// 连接到后端服务
const socket = io('http://localhost:5001', {
  transports: ['websocket', 'polling'],
  timeout: 30000
});

console.log('正在连接Socket.IO...');

socket.on('connect', () => {
  console.log('✅ Socket.IO连接成功:', socket.id);
  
  // 测试1: 知识库检索
  console.log('\n🧪 测试1: 知识库检索');
  socket.emit('userMessage', { message: '查找关于产品开发的文档' });
  
  setTimeout(() => {
    // 测试2: 知识库AI对话
    console.log('\n🧪 测试2: 知识库AI对话');
    socket.emit('knowledgeChat', { 
      query: 'AI助手，帮我分析一下这个技术方案',
      companyId: '1'
    });
  }, 5000);
  
  setTimeout(() => {
    // 测试3: 普通对话
    console.log('\n🧪 测试3: 普通对话');
    socket.emit('userMessage', { message: '你好，请介绍一下智能寻聘功能' });
  }, 10000);
  
  setTimeout(() => {
    console.log('\n✅ 测试完成，断开连接');
    socket.disconnect();
    process.exit(0);
  }, 15000);
});

socket.on('disconnect', () => {
  console.log('❌ Socket.IO连接断开');
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket.IO连接错误:', error.message);
});

// 监听AI消息
socket.on('aiMessage', (data) => {
  console.log('🤖 收到AI消息:', data.content.substring(0, 100) + '...');
});

// 监听知识库对话消息
socket.on('knowledgeChat', (data) => {
  console.log('📚 收到知识库对话消息:', data.response.substring(0, 100) + '...');
});

// 监听思维链消息
socket.on('thinking', (data) => {
  console.log('🧠 收到思维链消息:', data.content.substring(0, 100) + '...');
});

// 监听状态更新
socket.on('statusUpdate', (data) => {
  console.log('📊 状态更新:', data.message);
});

// 监听错误
socket.on('error', (data) => {
  console.error('❌ 错误:', data.message);
}); 