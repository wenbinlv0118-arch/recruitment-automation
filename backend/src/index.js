// 环境配置加载优先级：.env.local > .env.production > .env
const path = require('path');
const fs = require('fs-extra');

// 在生产环境中启用日志过滤（必须在其他模块加载前）
if (process.env.NODE_ENV === 'production') {
  require('./utils/logFilter');
}

// 检查并加载本地环境配置
const localEnvPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(localEnvPath)) {
  require('dotenv').config({ path: localEnvPath });
  console.log('已加载本地环境配置: .env.local');
} else {
  // 根据 NODE_ENV 加载对应的环境配置
  const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
  const envPath = path.join(__dirname, `../${envFile}`);
  
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log(`已加载环境配置: ${envFile}`);
  } else {
    require('dotenv').config();
    console.log('已加载默认环境配置');
  }
}

const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const resumeModel = require('./models/resumeModel');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: [
      "http://localhost:3000", 
      "http://127.0.0.1:3000",
      "https://recruitment-automation-frontend.zeabur.app"
    ],
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  // 大幅增加ping超时时间，防止页面切换时断开
  pingTimeout: 180000, // 3分钟
  pingInterval: 45000, // 45秒
  upgradeTimeout: 20000,
  maxHttpBufferSize: 1e8,
  // 增加连接超时时间
  connectTimeout: 90000,
  // 改进重连处理
  allowUpgrades: true,
  // 启用连接稳定性配置
  forceNew: false,
  // 添加连接保持配置
  serveClient: false,
  // 启用压缩以减少传输开销
  compression: true,
  // 添加页面切换保护配置
  destroyUpgrade: false,
  destroyUpgradeTimeout: 1000,
  // 增强连接稳定性
  perMessageDeflate: {
    threshold: 1024,
    concurrencyLimit: 10,
    memLevel: 7
  }
});

// 页面切换保护机制
let pageSwitchProtection = {
  isActive: false,
  startTime: null,
  duration: 5000 // 5秒保护期
};

// 激活页面切换保护
function activatePageSwitchProtection() {
  pageSwitchProtection.isActive = true;
  pageSwitchProtection.startTime = Date.now();
  console.log('页面切换保护已激活');
  
  // 自动取消保护
  setTimeout(() => {
    pageSwitchProtection.isActive = false;
    console.log('页面切换保护已取消');
  }, pageSwitchProtection.duration);
}

// 检查是否在保护期内
function isInPageSwitchProtection() {
  if (!pageSwitchProtection.isActive) return false;
  
  const elapsed = Date.now() - pageSwitchProtection.startTime;
  if (elapsed > pageSwitchProtection.duration) {
    pageSwitchProtection.isActive = false;
    return false;
  }
  
  return true;
}

// 添加 Socket.IO 连接事件监听
io.on('connection', (socket) => {
  console.log('客户端已连接:', socket.id);
  console.log('客户端传输方式:', socket.conn.transport.name);
  console.log('客户端地址:', socket.handshake.address);
  console.log('客户端查询参数:', socket.handshake.query);

  // 监听连接错误
  socket.on('error', (error) => {
    console.error('Socket 连接错误:', error);
  });

  // 监听断开连接
  socket.on('disconnect', (reason) => {
    // 记录断开连接的详细信息
    const disconnectDetails = {
      socketId: socket.id,
      reason: reason,
      timestamp: new Date().toISOString(),
      transport: socket.conn?.transport?.name || 'unknown',
      inProtection: isInPageSwitchProtection()
    };
    
    console.log('客户端断开连接:', socket.id, '原因:', reason);
    console.log('断开连接详情:', disconnectDetails);
    
    // 根据断开原因进行不同处理
    if (reason === 'transport close') {
      if (isInPageSwitchProtection()) {
        console.log('⚡ 页面切换保护期内的传输层关闭，这是预期的正常断开，忽略处理');
        return; // 在保护期内忽略transport close
      } else {
        console.log('检测到传输层关闭，这可能是由于页面切换或网络问题导致的断开');
      }
    } else if (reason === 'ping timeout') {
      console.log('检测到ping超时，可能是网络延迟或客户端无响应');
    } else if (reason === 'client namespace disconnect') {
      console.log('客户端主动断开连接');
    } else if (reason === 'server namespace disconnect') {
      console.log('服务器主动断开连接');
    } else {
      console.log('其他原因的连接断开:', reason);
    }
  });

  // 监听重连尝试
  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('客户端重连尝试:', socket.id, '次数:', attemptNumber);
  });

  // 监听页面切换保护激活请求
  socket.on('activatePageSwitchProtection', () => {
    console.log('收到页面切换保护激活请求，激活5秒保护期');
    activatePageSwitchProtection();
  });

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
      
      // 检查Socket连接状态
      if (!socket.connected) {
        console.warn('Socket连接已断开，无法处理消息');
        return;
      }
      
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
          // 检查Socket连接状态
          if (socket.connected) {
            // 发送思维链中间步骤
            if (!thinkingStepsSent) {
              socket.emit('thinking', { content: content });
              thinkingStepsSent = true;
            }
          }
        }, (finalAnswer) => {
          // 检查Socket连接状态
          if (socket.connected) {
            // 发送最终建议
            socket.emit('finalAnswer', { content: finalAnswer });
          }
        });
        
        // 检查Socket连接状态后发送最终响应
        if (socket.connected) {
          socket.emit('aiMessage', { content: response });
        }
      } else {
        // 模拟模式 - 直接发送响应
        if (socket.connected) {
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
      }
    } catch (error) {
      console.error('处理用户消息失败:', error);
      
      // 检查Socket连接状态
      if (!socket.connected) {
        console.warn('Socket连接已断开，无法发送错误消息');
        return;
      }
      
      // 提供更详细的错误信息给前端
      let errorMessage = '处理消息失败';
      
      if (error.message.includes('LLM_API_KEY')) {
        errorMessage = 'LLM服务配置错误：' + error.message;
      } else if (error.message.includes('LLM_API_URL')) {
        errorMessage = 'LLM服务配置错误：' + error.message;
      } else if (error.message.includes('API密钥无效')) {
        errorMessage = 'LLM API密钥无效，请检查配置';
      } else if (error.message.includes('API访问被拒绝')) {
        errorMessage = 'LLM API访问被拒绝，请检查权限';
      } else if (error.message.includes('连接超时')) {
        errorMessage = 'LLM服务连接超时，请检查网络';
      } else {
        errorMessage = '处理消息失败: ' + error.message;
      }
      
      // 发送错误消息给前端
      socket.emit('error', { 
        message: errorMessage,
        details: error.message
      });
      
      // 同时发送一个用户友好的AI消息
      socket.emit('aiMessage', { 
        content: `抱歉，我暂时无法为您提供AI服务。错误原因：${errorMessage}\n\n请检查系统配置或联系管理员。` 
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

  // 公司搜索功能已删除
});

// 文件上传配置
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 中间件
// 导入缓存中间件
const cacheMiddleware = require('./middleware/cacheMiddleware');
const securityMiddleware = require('./middleware/securityMiddleware');

// 安全中间件配置
app.use(securityMiddleware.helmet);
app.use(securityMiddleware.cors);
app.use(securityMiddleware.globalLimiter);

// 基础中间件
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(process.cwd(), 'public')));

// 应用缓存中间件到不同的路由
// 任务统计使用中期缓存（5分钟）
app.use('/api/tasks/stats', cacheMiddleware.mediumTerm);
// 岗位信息使用长期缓存（30分钟）
app.use('/api/positions', cacheMiddleware.longTerm);
// 任务列表使用短期缓存（1分钟）
app.use('/api/tasks', cacheMiddleware.shortTerm);
// 简历库统计使用中期缓存
app.use('/api/resume-library/stats', cacheMiddleware.mediumTerm);
// 知识库检索使用短期缓存
app.use('/api/knowledge/search', cacheMiddleware.shortTerm);

// API速率限制中间件
app.use('/api/', securityMiddleware.apiLimiter);
app.use('/api/resume-library/upload', securityMiddleware.uploadLimiter);
app.use('/api/resume-library/upload-async', securityMiddleware.uploadLimiter);

// 确保存储目录存在
const storageDir = path.join(__dirname, '../storage/resumes');
fs.ensureDirSync(storageDir);

// 智联招聘自动化服务已删除
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
  // 确保环境变量已加载
  if (process.env.LLM_API_KEY) {
    llmService = new LLMService();
    console.log('大语言模型服务初始化成功');
    console.log('API地址:', process.env.LLM_API_URL || process.env.LLM_BASE_URL);
    console.log('模型:', process.env.LLM_MODEL);
  } else {
    console.log('LLM_API_KEY 未设置，跳过大语言模型服务初始化');
    llmService = null;
  }
} catch (error) {
  console.error('大语言模型服务初始化失败:', error.message);
  console.log('将使用模拟模式运行');
  llmService = null;
}

// 初始化知识库服务
const KnowledgeService = require('./services/knowledgeService');
let knowledgeService;
try {
  const { DatabaseAdapter } = require('./database/adapter');
  const dbAdapter = new DatabaseAdapter();
  knowledgeService = new KnowledgeService(dbAdapter);
  console.log('知识库服务初始化成功');
} catch (error) {
  console.error('知识库服务初始化失败:', error.message);
  knowledgeService = null;
}

// 注册所有路由（包括健康检查和测试路由）
const { registerAllRoutes } = require('./routes/index');
registerAllRoutes(app);

// 保留原有的健康检查路由作为备用
app.get('/api/health-backup', (req, res) => {
  res.json({ status: 'ok', message: '服务运行正常' });
});

// 获取下载的简历列表
app.get('/api/resumes', async (req, res) => {
  try {
    // 首先尝试从简历库获取结构化数据
    const resumeLibraryResumes = await resumeModel.getResumes();
    
    if (resumeLibraryResumes && resumeLibraryResumes.length > 0) {
      // 如果有简历库数据，返回结构化数据
      res.json({ success: true, data: resumeLibraryResumes });
    } else {
      // 如果没有简历库数据，返回文件系统中的简历文件列表
      const files = fs.readdirSync(storageDir);
      const resumes = files
        .filter(file => file.endsWith('.pdf') || file.endsWith('.doc') || file.endsWith('.docx'))
        .map(file => ({
          id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: file,
          filename: file,
          size: fs.statSync(path.join(storageDir, file)).size,
          downloadTime: fs.statSync(path.join(storageDir, file)).mtime,
          source: 'file_system',
          parseStatus: 'pending',
          qualityScore: 0,
          createdAt: fs.statSync(path.join(storageDir, file)).mtime,
          updatedAt: fs.statSync(path.join(storageDir, file)).mtime
        }));
      
      res.json({ success: true, data: resumes });
    }
  } catch (error) {
    console.error('获取简历列表失败:', error);
    res.status(500).json({ success: false, error: '获取简历列表失败' });
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
// API路由：获取简历库列表
app.get('/api/resume-library', async (req, res) => {
  try {
    const { positionId, source } = req.query;
    const resumes = await resumeModel.getResumes();
    
    // 根据查询参数过滤
    let filteredResumes = resumes;
    if (positionId) {
      filteredResumes = filteredResumes.filter(resume => resume.positionId === positionId);
    }
    if (source) {
      filteredResumes = filteredResumes.filter(resume => resume.source === source);
    }
    
    res.json({
      success: true,
      data: filteredResumes
    });
  } catch (error) {
    console.error('获取简历库列表失败:', error);
    res.status(500).json({ success: false, error: '获取简历库列表失败' });
  }
});

// API路由：添加简历到简历库
app.post('/api/resume-library', async (req, res) => {
  try {
    const resumeData = req.body;
    const resume = await resumeModel.addResume(resumeData);
    res.json({ success: true, data: resume });
  } catch (error) {
    console.error('添加简历到简历库失败:', error);
    res.status(500).json({ success: false, error: '添加简历到简历库失败' });
  }
});

// API路由：上传简历文件到简历库
/**
 * 使用大语言模型解析简历文本
 * @param {string} text - 简历文本内容
 * @returns {Object} 解析结果，包含结构化数据和Markdown内容
 */
async function parseResumeWithLLM(text) {
  if (!text || text.trim().length < 10) {
    return { parseStatus: 'invalid_content', message: '简历内容过短或无效' };
  }

  try {
    // 导入LLM服务
    const LLMService = require('./services/llmService');
    const llmService = new LLMService();
    
    // 构建与Boss直聘简历解析相同的提示词
    const messages = [{
      role: 'user',
      content: `请将以下简历文本解析为标准化格式。请按照以下要求输出两部分内容：

第一部分：JSON格式的结构化数据（用于系统处理）
第二部分：Markdown格式的简历内容（用于页面展示）

请严格按照以下格式输出：

\`\`\`json
{
  "name": "候选人姓名",
  "age": "年龄（数字）",
  "workYears": "工作年限（数字）",
  "education": "学历（本科/硕士/博士等）",
  "currentStatus": "当前状态（在职/离职/待业）",
  "phone": "手机号码",
  "email": "邮箱地址",
  "selfIntroduction": "个人简介",
  "expectedPosition": {
    "position": "期望职位",
    "location": "工作地点",
    "industry": "期望行业",
    "salary": "期望薪资"
  },
  "workExperience": [
    {
      "company": "公司名称",
      "position": "职位名称",
      "department": "部门",
      "duration": "工作时间",
      "description": "工作描述"
    }
  ],
  "educationExperience": [
    {
      "school": "学校名称",
      "degree": "学历",
      "major": "专业",
      "duration": "就读时间"
    }
  ],
  "skills": ["技能1", "技能2", "技能3"],
  "certificates": ["证书1", "证书2"]
}
\`\`\`

\`\`\`markdown
# 个人简历

## 基本信息
- **姓名**：候选人姓名
- **年龄**：XX岁
- **工作年限**：X年
- **学历**：本科/硕士/博士
- **当前状态**：在职/离职/待业
- **联系电话**：手机号码
- **邮箱**：邮箱地址

## 求职意向
- **期望职位**：期望职位名称
- **期望地点**：工作地点
- **期望行业**：期望行业
- **期望薪资**：期望薪资范围

## 个人简介
个人简介内容...

## 工作经历
### 公司名称 | 职位名称 | 工作时间
**部门**：部门名称

工作描述和主要职责...

## 教育经历
### 学校名称 | 专业 | 学历 | 就读时间
教育相关描述...

## 专业技能
- 技能1
- 技能2
- 技能3

## 证书资质
- 证书1
- 证书2
\`\`\`

请解析以下简历文本：\n\n${text}`
    }];
    
    console.log('开始调用大模型解析简历...');
    
    // 调用大模型进行简历解析
    const parsedContent = await llmService.chatWithLLM(messages);
    
    console.log('大模型解析完成，结果长度:', parsedContent.length);
    
    // 解析包含JSON和Markdown两部分的响应
    let parsedData;
    let markdownContent = '';
    
    try {
      // 提取JSON部分
      const jsonMatch = parsedContent.match(/```json\s*([\s\S]*?)\s*```/);
      // 提取Markdown部分
      const markdownMatch = parsedContent.match(/```markdown\s*([\s\S]*?)\s*```/);
      
      if (jsonMatch && jsonMatch[1]) {
        // 解析JSON数据
        parsedData = JSON.parse(jsonMatch[1].trim());
        console.log('JSON数据解析成功');
      } else {
        // 如果没有找到JSON块，尝试直接解析整个内容
        parsedData = JSON.parse(parsedContent);
        console.log('直接JSON解析成功（向后兼容）');
      }
      
      if (markdownMatch && markdownMatch[1]) {
        markdownContent = markdownMatch[1].trim();
        console.log('Markdown内容提取成功，长度:', markdownContent.length);
      } else {
        // 如果没有Markdown部分，使用原始内容作为备用
        markdownContent = parsedContent;
        console.log('使用原始内容作为Markdown（向后兼容）');
      }
      
      // 数据清洗和验证
      const cleanedData = {
        name: parsedData.name || '未知',
        age: parsedData.age || null,
        workYears: parsedData.workYears || null,
        education: parsedData.education || '未知',
        currentStatus: parsedData.currentStatus || '未知',
        phone: parsedData.phone || null,
        email: parsedData.email || null,
        selfIntroduction: parsedData.selfIntroduction || null,
        expectedPosition: parsedData.expectedPosition || {},
        workExperience: Array.isArray(parsedData.workExperience) ? parsedData.workExperience : [],
        educationExperience: Array.isArray(parsedData.educationExperience) ? parsedData.educationExperience : [],
        skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
        certificates: Array.isArray(parsedData.certificates) ? parsedData.certificates : [],
        parseStatus: 'completed',
        qualityScore: 85, // 大模型解析的质量评分
        markdownContent: markdownContent
      };
      
      console.log('简历解析成功，提取到姓名:', cleanedData.name);
      return cleanedData;
      
    } catch (parseError) {
      console.error('解析大模型响应失败:', parseError);
      return {
        parseStatus: 'llm_parse_failed',
        message: '大模型响应解析失败: ' + parseError.message,
        rawResponse: parsedContent
      };
    }
    
  } catch (error) {
    console.error('大模型调用失败:', error);
    return {
      parseStatus: 'llm_call_failed',
      message: '大模型调用失败: ' + error.message
    };
  }
}

app.post('/api/resume-library/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' });
    }
    
    // 导入简历解析服务
    const resumeParserService = require('./services/resumeParserService');
    let parsedResume = {};
    let extractedText = '';
    
    // 根据文件类型进行解析
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    try {
       if (fileExtension === '.pdf') {
         console.log('开始解析PDF文件:', req.file.originalname);
         // 先使用传统方法提取文本
         const traditionalResult = await resumeParserService.parsePDFResume(req.file.buffer);
         extractedText = traditionalResult.rawText || '';
         
         // 如果提取到足够的文本内容，使用大模型进行深度解析
         if (extractedText && extractedText.trim().length > 50) {
           console.log('PDF文本提取成功，开始大模型解析...');
           parsedResume = await parseResumeWithLLM(extractedText);
         } else {
           console.log('PDF文本提取内容不足，使用传统解析结果');
           parsedResume = traditionalResult;
         }
         
       } else if (fileExtension === '.docx') {
         console.log('开始解析DOCX文件:', req.file.originalname);
         // 先使用传统方法提取文本
         const traditionalResult = await resumeParserService.parseDOCXResume(req.file.buffer);
         extractedText = traditionalResult.rawText || '';
         
         // 如果提取到足够的文本内容，使用大模型进行深度解析
         if (extractedText && extractedText.trim().length > 50) {
           console.log('DOCX文本提取成功，开始大模型解析...');
           parsedResume = await parseResumeWithLLM(extractedText);
         } else {
           console.log('DOCX文本提取内容不足，使用传统解析结果');
           parsedResume = traditionalResult;
         }
         
       } else if (fileExtension === '.txt') {
         // 临时支持.txt文件用于测试
         console.log('开始解析TXT文件（测试模式）:', req.file.originalname);
         extractedText = req.file.buffer.toString('utf-8');
         
         // 直接使用大模型解析文本内容
         if (extractedText && extractedText.trim().length > 50) {
           console.log('TXT文本内容充足，开始大模型解析...');
           parsedResume = await parseResumeWithLLM(extractedText);
         } else {
           console.log('TXT文本内容不足，使用传统解析');
           parsedResume = resumeParserService.parseResumeText(extractedText);
         }
         
       } else {
         console.log('不支持的文件格式:', fileExtension);
         parsedResume = { parseStatus: 'unsupported_format', message: '不支持的文件格式' };
       }
    } catch (parseError) {
      console.error('文件解析失败:', parseError);
      parsedResume = { parseStatus: 'parse_failed', message: '文件解析失败: ' + parseError.message };
    }
    
    const filePath = await resumeModel.uploadResumeFile(req.file.originalname, req.file.buffer);
    
    // 如果解析成功，检查重复并自动将简历添加到数据库
    let resumeRecord = null;
    let isDuplicate = false;
    let duplicateInfo = null;
    
    if (parsedResume && parsedResume.parseStatus !== 'parse_failed' && parsedResume.parseStatus !== 'unsupported_format') {
      try {
        // 导入去重工具
        const ResumeDeduplication = require('./utils/resumeDeduplication');
        
        // 检查简历重复性
        const duplicateCheck = await ResumeDeduplication.checkDuplicate(
          req.file.buffer,
          extractedText,
          parsedResume
        );
        
        if (duplicateCheck.isDuplicate) {
          // 发现重复简历，返回现有记录
          isDuplicate = true;
          duplicateInfo = {
            type: duplicateCheck.duplicateType,
            existingResumeId: duplicateCheck.duplicateResume.id,
            message: `检测到重复简历（${duplicateCheck.duplicateType}），已跳过入库`
          };
          resumeRecord = duplicateCheck.duplicateResume;
          console.log('检测到重复简历:', duplicateInfo);
        } else {
          // 准备简历数据用于入库，包含去重哈希值
          const resumeData = {
            ...parsedResume,
            source: req.body.source || '文件上传',
            originalText: extractedText,
            parseMethod: parsedResume.parseMethod || 'llm',
            parseTime: new Date().toISOString(),
            parseStatus: 'completed',
            // 添加去重相关字段
            fileHash: duplicateCheck.hashes.fileHash,
            textHash: duplicateCheck.hashes.textHash,
            fingerprint: duplicateCheck.hashes.fingerprint
          };
          
          // 添加简历到数据库
          resumeRecord = await resumeModel.addResume(resumeData);
          console.log('简历自动入库成功:', resumeRecord.id);
        }
        
      } catch (addError) {
        console.error('简历处理失败:', addError);
        // 处理失败不影响文件上传成功的响应
      }
    }
    
    res.json({ 
      success: true,
      data: {
        message: isDuplicate ? '检测到重复简历，已跳过入库' : '文件上传成功', 
        filename: req.file.originalname,
        path: filePath,
        parsedResume: parsedResume,
        resumeId: resumeRecord?.id,
        parseStatus: parsedResume?.parseStatus,
        qualityScore: parsedResume?.qualityScore || 0,
        // 去重信息
        isDuplicate: isDuplicate,
        duplicateInfo: duplicateInfo
      }
    });
  } catch (error) {
    console.error('上传简历文件失败:', error);
    res.status(500).json({ error: '上传简历文件失败', message: error.message });
  }
});


// API路由：解析简历文本（原有关键字匹配算法）
app.post('/api/resume-library/parse-text', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length < 10) {
      return res.status(400).json({ success: false, error: '请提供有效的简历文本内容' });
    }
    
    // 导入简历解析服务
    const resumeParserService = require('./services/resumeParserService');
    
    // 解析文本简历
    const parsedResume = resumeParserService.parseResumeText(text);
    
    res.json({ 
      success: true, 
      data: parsedResume 
    });
  } catch (error) {
    console.error('文本解析失败:', error);
    res.status(500).json({ success: false, error: '文本解析失败', message: error.message });
  }
});

// API路由：使用大模型解析Boss直聘简历
app.post('/api/resume/parse-boss-resume', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length < 10) {
      return res.status(400).json({ success: false, error: '请提供有效的简历文本内容' });
    }
    
    // 导入LLM服务
    const LLMService = require('./services/llmService');
    const llmService = new LLMService();
    
    // 构建简历解析提示词
    const messages = [{
      role: 'user',
      content: `请将以下简历文本解析为标准化格式。请按照以下要求输出两部分内容：

第一部分：JSON格式的结构化数据（用于系统处理）
第二部分：Markdown格式的简历内容（用于页面展示）

请严格按照以下格式输出：

\`\`\`json
{
  "name": "候选人姓名",
  "age": "年龄（数字）",
  "workYears": "工作年限（数字）",
  "education": "学历（本科/硕士/博士等）",
  "currentStatus": "当前状态（在职/离职/待业）",
  "phone": "手机号码",
  "email": "邮箱地址",
  "selfIntroduction": "个人简介",
  "expectedPosition": {
    "position": "期望职位",
    "location": "工作地点",
    "industry": "期望行业",
    "salary": "期望薪资"
  },
  "workExperience": [
    {
      "company": "公司名称",
      "position": "职位名称",
      "department": "部门",
      "duration": "工作时间",
      "description": "工作描述"
    }
  ],
  "educationExperience": [
    {
      "school": "学校名称",
      "degree": "学历",
      "major": "专业",
      "duration": "就读时间"
    }
  ],
  "skills": ["技能1", "技能2", "技能3"],
  "certificates": ["证书1", "证书2"]
}
\`\`\`

\`\`\`markdown
# 个人简历

## 基本信息
- **姓名**：候选人姓名
- **年龄**：XX岁
- **工作年限**：X年
- **学历**：本科/硕士/博士
- **当前状态**：在职/离职/待业
- **联系电话**：手机号码
- **邮箱**：邮箱地址

## 求职意向
- **期望职位**：期望职位名称
- **期望地点**：工作地点
- **期望行业**：期望行业
- **期望薪资**：期望薪资范围

## 个人简介
个人简介内容...

## 工作经历
### 公司名称 | 职位名称 | 工作时间
**部门**：部门名称

工作描述和主要职责...

## 教育经历
### 学校名称 | 专业 | 学历 | 就读时间
教育相关描述...

## 专业技能
- 技能1
- 技能2
- 技能3

## 证书资质
- 证书1
- 证书2
\`\`\`

请解析以下简历文本：\n\n${text}`
     }];
    
    console.log('开始调用大模型解析Boss直聘简历...');
    
    // 调用大模型进行简历解析
    const parsedContent = await llmService.chatWithLLM(messages);
    
    console.log('大模型解析完成，结果长度:', parsedContent.length);
    
    // 解析包含JSON和Markdown两部分的响应
    let parsedData;
    let markdownContent = '';
    
    try {
      // 提取JSON部分
      const jsonMatch = parsedContent.match(/```json\s*([\s\S]*?)\s*```/);
      // 提取Markdown部分
      const markdownMatch = parsedContent.match(/```markdown\s*([\s\S]*?)\s*```/);
      
      if (jsonMatch && jsonMatch[1]) {
        // 解析JSON数据
        parsedData = JSON.parse(jsonMatch[1].trim());
        console.log('JSON数据解析成功');
      } else {
        // 如果没有找到JSON块，尝试直接解析整个内容
        parsedData = JSON.parse(parsedContent);
        console.log('直接JSON解析成功（向后兼容）');
      }
      
      if (markdownMatch && markdownMatch[1]) {
        markdownContent = markdownMatch[1].trim();
        console.log('Markdown内容提取成功，长度:', markdownContent.length);
      } else {
        // 如果没有Markdown部分，使用原始内容作为备用
        markdownContent = parsedContent;
        console.log('使用原始内容作为Markdown（向后兼容）');
      }
      
      // 数据清洗和验证
      const cleanedData = {
        name: parsedData.name || '未知',
        age: parsedData.age || null,
        workYears: parsedData.workYears || null,
        education: parsedData.education || '未知',
        currentStatus: parsedData.currentStatus || '未知',
        phone: parsedData.phone || null,
        email: parsedData.email || null,
        selfIntroduction: parsedData.selfIntroduction || null,
        expectedPosition: parsedData.expectedPosition || {},
        workExperience: Array.isArray(parsedData.workExperience) ? parsedData.workExperience : [],
        educationExperience: Array.isArray(parsedData.educationExperience) ? parsedData.educationExperience : [],
        skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
        certificates: Array.isArray(parsedData.certificates) ? parsedData.certificates : [],
        // 新增Markdown格式的简历内容
        markdownContent: markdownContent,
        // 保持向后兼容性
        parsedContent: parsedContent,
        parseMethod: 'llm',
        timestamp: new Date().toISOString()
      };
      
      console.log('数据处理完成，返回结构化数据和Markdown内容');
      
      res.json({ 
        success: true, 
        data: cleanedData
      });
    } catch (jsonError) {
      console.warn('数据解析失败，返回原始格式:', jsonError.message);
      
      // 如果解析失败，返回原始格式（向后兼容）
      res.json({ 
        success: true, 
        data: {
          originalText: text,
          parsedContent: parsedContent,
          markdownContent: parsedContent, // 将原始内容也作为markdown内容
          parseMethod: 'llm',
          timestamp: new Date().toISOString()
        }
      });
    }
  } catch (error) {
    console.error('大模型简历解析失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '大模型简历解析失败', 
      message: error.message 
    });
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

// API路由：删除单个简历
app.delete('/api/resume-library/:resumeId', async (req, res) => {
  try {
    const resumeId = req.params.resumeId;
    const result = await resumeModel.deleteResume(resumeId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('删除简历失败:', error);
    res.status(500).json({ success: false, error: '删除简历失败', message: error.message });
  }
});

// API路由：清空所有简历
app.delete('/api/resume-library', async (req, res) => {
  try {
    const result = await resumeModel.clearAllResumes();
    res.json(result);
  } catch (error) {
    console.error('清空简历库失败:', error);
    res.status(500).json({ success: false, error: '清空简历库失败', message: error.message });
  }
});

// API路由：生成工作经历亮点
app.post('/api/resume/generate-highlights', async (req, res) => {
  try {
    const { workExperience } = req.body;
    
    if (!workExperience || !Array.isArray(workExperience) || workExperience.length === 0) {
      return res.status(400).json({ success: false, error: '请提供有效的工作经历数据' });
    }
    
    // 检查LLM服务是否可用
    if (!llmService) {
      return res.status(500).json({ success: false, error: 'LLM服务不可用' });
    }
    
    const highlights = [];
    
    // 为每段工作经历生成亮点
    for (const experience of workExperience) {
      const { company, position, duration, description } = experience;
      
      if (!company || !position || !description) {
        continue; // 跳过不完整的经历
      }
      
      // 构建提示词
      const messages = [{
        role: 'user',
        content: `请为以下工作经历提取3-5个核心亮点，要求简洁明了，突出成就和能力：

公司：${company}
职位：${position}
时间：${duration || '未知'}
工作内容：${description}

请直接返回亮点列表，每个亮点一行，不需要其他格式。`
      }];
      
      try {
        console.log(`正在为${company}的${position}职位生成亮点...`);
        
        // 调用大模型生成亮点
        const highlightText = await llmService.chatWithLLM(messages);
        
        // 解析亮点文本为数组
        const highlightList = highlightText
          .split('\n')
          .map(line => line.trim())
          .filter(line => line.length > 0 && !line.startsWith('#'))
          .slice(0, 5); // 最多5个亮点
        
        highlights.push({
          company,
          position,
          duration,
          highlights: highlightList
        });
        
      } catch (error) {
        console.error(`生成${company}亮点失败:`, error);
        // 如果生成失败，使用默认亮点
        highlights.push({
          company,
          position,
          duration,
          highlights: ['负责核心业务开发', '具备丰富项目经验', '团队协作能力强']
        });
      }
    }
    
    res.json({ 
      success: true, 
      data: highlights
    });
    
  } catch (error) {
    console.error('生成工作经历亮点失败:', error);
    res.status(500).json({ success: false, error: '生成亮点失败', message: error.message });
  }
});


// 注册知识库路由
app.use('/api/knowledge', knowledgeRoutes);
// 注册任务管理路由
app.use('/api/tasks', taskRoutes);
// 注册岗位路由
app.use('/api/positions', positionRoutes);
// 注册 Boss 直聘路由
const bossZhipinRoutes = require('./routes/bossZhipin');
// 将io实例传递给Boss直聘路由
bossZhipinRoutes.setIO(io);
app.use('/api/boss-zhipin', bossZhipinRoutes);

// 注册智联招聘路由
const { router: zhilianRoutes, initializeZhilianService } = require('./routes/zhilian');
// 初始化智联招聘服务
initializeZhilianService(io);
// 将io实例传递给智联招聘路由
app.set('io', io);
app.use('/api/zhilian', zhilianRoutes);

// 注册简历路由
const resumeRoutes = require('./routes/resumeRoutes');
app.use('/api/resume', resumeRoutes);



// 公司搜索路由已删除

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`存储目录: ${storageDir}`);
});

// API路由：异步上传简历文件（优化版本，避免超时）
app.post('/api/resume-library/upload-async', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' });
    }
    
    // 导入简历解析服务和异步任务队列
    const resumeParserService = require('./services/resumeParserService');
    const asyncTaskQueue = require('./services/asyncTaskQueue');
    
    let extractedText = '';
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    
    // 快速提取文本内容（不进行大模型解析）
    try {
      if (fileExtension === '.pdf') {
        console.log('快速提取PDF文本:', req.file.originalname);
        const traditionalResult = await resumeParserService.parsePDFResume(req.file.buffer);
        extractedText = traditionalResult.rawText || '';
      } else if (fileExtension === '.docx') {
        console.log('快速提取DOCX文本:', req.file.originalname);
        const traditionalResult = await resumeParserService.parseDOCXResume(req.file.buffer);
        extractedText = traditionalResult.rawText || '';
      } else if (fileExtension === '.txt') {
        console.log('读取TXT文件:', req.file.originalname);
        extractedText = req.file.buffer.toString('utf-8');
      } else {
        return res.status(400).json({ error: '不支持的文件格式' });
      }
    } catch (extractError) {
      console.error('文本提取失败:', extractError);
      return res.status(500).json({ error: '文件解析失败', message: extractError.message });
    }
    
    // 保存文件
    const filePath = await resumeModel.uploadResumeFile(req.file.originalname, req.file.buffer);
    
    // 生成任务ID
    const taskId = `parse_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 添加到异步任务队列
    asyncTaskQueue.addResumeParseTask(taskId, {
      fileBuffer: req.file.buffer,
      extractedText: extractedText,
      filename: req.file.originalname,
      source: req.body.source || '文件上传'
    });
    
    // 立即返回响应，不等待解析完成
    res.json({
      success: true,
      data: {
        message: '文件上传成功，正在后台解析中',
        filename: req.file.originalname,
        path: filePath,
        taskId: taskId,
        parseStatus: 'processing',
        estimatedTime: '预计1-3分钟完成解析'
      }
    });
    
  } catch (error) {
    console.error('异步上传简历文件失败:', error);
    res.status(500).json({ error: '上传简历文件失败', message: error.message });
  }
});

// API路由：查询异步任务状态
app.get('/api/resume-library/task-status/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const asyncTaskQueue = require('./services/asyncTaskQueue');
    
    const taskStatus = asyncTaskQueue.getTaskStatus(taskId);
    
    if (!taskStatus) {
      return res.status(404).json({ error: '任务不存在或已过期' });
    }
    
    res.json({
      success: true,
      data: {
        taskId: taskStatus.id,
        status: taskStatus.status,
        createdAt: taskStatus.createdAt,
        startedAt: taskStatus.startedAt,
        completedAt: taskStatus.completedAt,
        result: taskStatus.result,
        error: taskStatus.error
      }
    });
    
  } catch (error) {
    console.error('查询任务状态失败:', error);
    res.status(500).json({ error: '查询任务状态失败', message: error.message });
  }
});

// 导出函数供其他模块使用
module.exports = {
  parseResumeWithLLM
};