const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs-extra');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e8
});

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 确保存储目录存在
const storageDir = path.join(__dirname, '../storage/resumes');
fs.ensureDirSync(storageDir);

// 智联招聘自动化服务
const zhilianService = require('./services/zhilianService');

// Socket.IO 连接处理
io.on('connection', (socket) => {
  console.log('客户端已连接:', socket.id);
  console.log('客户端传输方式:', socket.conn.transport.name);
  console.log('客户端地址:', socket.handshake.address);

  // 处理智能寻聘请求
  socket.on('startRecruitment', async (data) => {
    try {
      console.log('开始智能寻聘:', data);
      
      // 发送状态更新
      socket.emit('statusUpdate', { 
        status: 'starting', 
        message: '正在启动浏览器...' 
      });

      // 启动智联招聘自动化
      await zhilianService.startRecruitment(socket, data);
      
    } catch (error) {
      console.error('智能寻聘失败:', error);
      socket.emit('error', { 
        message: '智能寻聘失败: ' + error.message 
      });
    }
  });

  // 处理验证码输入
  socket.on('submitVerificationCode', async (code) => {
    try {
      await zhilianService.submitVerificationCode(socket, code);
    } catch (error) {
      console.error('验证码提交失败:', error);
      socket.emit('error', { 
        message: '验证码提交失败: ' + error.message 
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('客户端断开连接:', socket.id);
  });
});

// API路由
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: '服务运行正常' });
});

// 获取下载的简历列表
app.get('/api/resumes', (req, res) => {
  try {
    const files = fs.readdirSync(storageDir);
    const resumes = files
      .filter(file => file.endsWith('.pdf') || file.endsWith('.doc') || file.endsWith('.docx'))
      .map(file => ({
        name: file,
        size: fs.statSync(path.join(storageDir, file)).size,
        downloadTime: fs.statSync(path.join(storageDir, file)).mtime
      }));
    
    res.json(resumes);
  } catch (error) {
    res.status(500).json({ error: '获取简历列表失败' });
  }
});

// 下载简历文件
app.get('/api/resumes/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(storageDir, filename);
  
  if (fs.existsSync(filePath)) {
    res.download(filePath);
  } else {
    res.status(404).json({ error: '文件不存在' });
  }
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`存储目录: ${storageDir}`);
}); 