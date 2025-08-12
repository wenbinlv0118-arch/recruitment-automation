require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const resumeModel = require('./models/resumeModel');

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

// 文件上传配置
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 确保存储目录存在
const storageDir = path.join(__dirname, '../storage/resumes');
fs.ensureDirSync(storageDir);

// 智联招聘自动化服务
const zhilianService = require('./services/zhilianService');
// 候选人智能服务已删除
// 大语言模型服务
const LLMService = require('./services/llmService');
// 知识库路由
const knowledgeRoutes = require('./routes/knowledge');
// 任务管理路由
const taskRoutes = require('./routes/tasks');
// 岗位路由
const positionRoutes = require('./routes/positions');

// 初始化大语言模型服务
let llmService;
try {
  llmService = new LLMService();
  console.log('大语言模型服务初始化成功');
} catch (error) {
  console.error('大语言模型服务初始化失败:', error.message);
  console.log('将使用模拟模式运行');
  llmService = null;
}

// 初始化知识库服务
const KnowledgeService = require('./services/knowledgeService');
let knowledgeService;
try {
  const DatabaseManager = require('./database/init');
  const dbManager = new DatabaseManager();
  knowledgeService = new KnowledgeService(dbManager);
  console.log('知识库服务初始化成功');
} catch (error) {
  console.error('知识库服务初始化失败:', error.message);
  knowledgeService = null;
}

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

  // 候选人管理功能已删除

  // 处理用户对话消息
  socket.on('userMessage', async (data) => {
    try {
      console.log('收到用户消息:', data);
      
      // 如果有大语言模型服务，则使用它来处理消息
      if (llmService) {
        // 发送初始状态更新
        socket.emit('statusUpdate', { 
          status: 'thinking', 
          message: '正在思考...' 
        });
        
        // 生成思维链提示
        const messages = llmService.generateThinkingChainPrompt(data.message);
        
        // 用于收集完整的响应
        let fullResponse = '';
        let thinkingStepsSent = false;
        
        // 调用大语言模型并处理思维链
        const response = await llmService.chatWithLLM(messages, (content) => {
          // 发送思维链中间步骤
          if (!thinkingStepsSent) {
            socket.emit('thinking', { content: content });
            thinkingStepsSent = true;
          }
        }, (finalAnswer) => {
          // 发送最终建议
          socket.emit('finalAnswer', { content: finalAnswer });
        });
        
        // 发送最终响应（保持兼容性）
        socket.emit('aiMessage', { content: response });
      } else {
        // 模拟模式 - 直接发送响应
        socket.emit('statusUpdate', { 
          status: 'thinking', 
          message: '正在思考...' 
        });
        
        // 模拟思维链过程
        const thinkingSteps = [
          "👉 分析用户需求：用户希望了解如何使用智能寻聘功能",
          "👉 思考实现方案：我需要解释智能寻聘的工作流程",
          "👉 制定执行步骤：首先需要登录智联招聘账号，然后设置筛选条件，最后开始筛选候选人"
        ];
        
        // 模拟按步骤显示思维链
        socket.emit('thinking', { content: thinkingSteps });
        // 等待一段时间模拟处理
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 发送最终响应
        socket.emit('aiMessage', { 
          content: '智能寻聘功能可以帮助您自动在智联招聘上寻找合适的候选人。使用流程如下：\n\n1. 提供您的智联招聘账号信息\n2. 设置筛选条件（如技能、经验、薪资等）\n3. 启动筛选过程\n4. 查看筛选结果并与候选人互动\n\n请提供您的手机号码，我将帮您启动智能寻聘流程。' 
        });
      }
    } catch (error) {
      console.error('处理用户消息失败:', error);
      socket.emit('error', { 
        message: '处理消息失败: ' + error.message 
      });
    }
  });

  // 处理知识库AI对话
  socket.on('knowledgeChat', async (data) => {
    try {
      console.log('收到知识库对话请求:', data);
      
      if (!knowledgeService) {
        socket.emit('knowledgeChat', { 
          response: '抱歉，知识库服务暂时不可用，请稍后再试。' 
        });
        return;
      }

      const { query, companyId } = data;
      
      if (!query || !companyId) {
        socket.emit('knowledgeChat', { 
          response: '请提供查询内容和公司ID。' 
        });
        return;
      }

      // 1. 检索相关知识
      const results = await knowledgeService.retrieveKnowledge(query, companyId, 5);
      const context = knowledgeService.buildContext(results);

      // 2. 使用LLM生成回答
      let response;
      if (llmService) {
        response = await llmService.chatWithKnowledgeBase(query, context);
      } else {
        // 模拟模式
        if (results.length > 0) {
          response = `基于企业知识库，我为您找到以下相关信息：\n\n${results.map((result, index) => 
            `${index + 1}. ${result.content.substring(0, 200)}...\n   相关度: ${(result.similarity * 100).toFixed(1)}%\n`
          ).join('\n')}\n\n这些信息应该能帮助回答您的问题。如果您需要更详细的信息，请告诉我。`;
        } else {
          response = '抱歉，在企业知识库中没有找到与您问题相关的内容。请尝试使用不同的关键词或查看文档管理中的可用文档。';
        }
      }

      socket.emit('knowledgeChat', { response });
      
    } catch (error) {
      console.error('知识库对话失败:', error);
      socket.emit('knowledgeChat', { 
        response: '抱歉，知识库对话服务出现错误，请稍后再试。' 
      });
    }
  });

  // 公司搜索功能已删除

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

// API路由：获取简历库中的简历列表
app.get('/api/resume-library', async (req, res) => {
  try {
    const positionId = req.query.positionId || null;
    const resumes = await resumeModel.getResumes(positionId);
    res.json(resumes);
  } catch (error) {
    console.error('获取简历库列表失败:', error);
    res.status(500).json({ error: '获取简历库列表失败' });
  }
});

// API路由：添加简历到简历库
app.post('/api/resume-library', async (req, res) => {
  try {
    const resumeData = req.body;
    const resume = await resumeModel.addResume(resumeData);
    res.json(resume);
  } catch (error) {
    console.error('添加简历到简历库失败:', error);
    res.status(500).json({ error: '添加简历到简历库失败' });
  }
});

// API路由：上传简历文件到简历库
app.post('/api/resume-library/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' });
    }
    
    // 解析简历文件功能已删除
    let parsedResume = {};
    
    const filePath = await resumeModel.uploadResumeFile(req.file.originalname, req.file.buffer);
    
    res.json({ 
      message: '文件上传成功', 
      filename: req.file.originalname,
      path: filePath,
      parsedResume: parsedResume
    });
  } catch (error) {
    console.error('上传简历文件失败:', error);
    res.status(500).json({ error: '上传简历文件失败', message: error.message });
  }
});


// API路由：对简历进行评分
app.post('/api/resume-library/:resumeId/score', async (req, res) => {
  try {
    const resumeId = req.params.resumeId;
    const { positionId, scoringCriteria } = req.body;
    
    const scoreResult = await resumeModel.scoreResume(resumeId, positionId, scoringCriteria);
    res.json(scoreResult);
  } catch (error) {
    console.error('简历评分失败:', error);
    res.status(500).json({ error: '简历评分失败', message: error.message });
  }
});

// 注册知识库路由
app.use('/api/knowledge', knowledgeRoutes);
// 注册任务管理路由
app.use('/api/tasks', taskRoutes);
// 注册岗位路由
app.use('/api/positions', positionRoutes);

// 公司搜索路由已删除

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`存储目录: ${storageDir}`);
});