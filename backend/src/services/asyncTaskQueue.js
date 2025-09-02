const EventEmitter = require('events');
const resumeModel = require('../models/resumeModel');
const ResumeDeduplication = require('../utils/resumeDeduplication');

/**
 * 异步任务队列服务
 * 用于处理耗时的简历解析任务，避免API超时
 */
class AsyncTaskQueue extends EventEmitter {
  constructor() {
    super();
    this.tasks = new Map(); // 存储任务状态
    this.queue = []; // 任务队列
    this.processing = false; // 是否正在处理任务
    this.maxConcurrent = 2; // 最大并发任务数
    this.currentConcurrent = 0; // 当前并发任务数
  }
  
  /**
   * 添加简历解析任务
   * @param {string} taskId - 任务ID
   * @param {Object} taskData - 任务数据
   * @returns {string} 任务ID
   */
  addResumeParseTask(taskId, taskData) {
    const task = {
      id: taskId,
      type: 'resume_parse',
      status: 'pending',
      data: taskData,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
      progress: {
        percentage: 0,
        stage: 'queued',
        message: '任务已加入队列，等待处理',
        details: {}
      }
    };
    
    this.tasks.set(taskId, task);
    this.queue.push(task);
    
    console.log(`添加简历解析任务: ${taskId}`);
    
    // 开始处理队列
    this.processQueue();
    
    return taskId;
  }
  
  /**
   * 更新任务进度
   * @param {string} taskId - 任务ID
   * @param {number} percentage - 进度百分比 (0-100)
   * @param {string} stage - 当前阶段
   * @param {string} message - 进度消息
   * @param {Object} details - 详细信息
   */
  updateTaskProgress(taskId, percentage, stage, message, details = {}) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.progress = {
        percentage: Math.min(100, Math.max(0, percentage)),
        stage,
        message,
        details,
        updatedAt: Date.now()
      };
      task.updatedAt = Date.now();
      console.log(`任务 ${taskId} 进度更新: ${percentage}% - ${message}`);
    }
  }

  /**
   * 获取任务状态
   * @param {string} taskId - 任务ID
   * @returns {Object|null} 任务状态
   */
  getTaskStatus(taskId) {
    return this.tasks.get(taskId) || null;
  }
  
  /**
   * 处理任务队列
   */
  async processQueue() {
    if (this.processing || this.currentConcurrent >= this.maxConcurrent) {
      return;
    }
    
    const task = this.queue.shift();
    if (!task) {
      return;
    }
    
    this.currentConcurrent++;
    this.processing = true;
    
    try {
      await this.processTask(task);
    } catch (error) {
      console.error(`任务处理失败: ${task.id}`, error);
    } finally {
      this.currentConcurrent--;
      this.processing = false;
      
      // 继续处理下一个任务
      if (this.queue.length > 0) {
        setImmediate(() => this.processQueue());
      }
    }
  }
  
  /**
   * 处理单个任务
   * @param {Object} task - 任务对象
   */
  async processTask(task) {
    console.log(`开始处理任务: ${task.id}`);
    
    // 更新任务状态
    task.status = 'processing';
    task.startedAt = new Date().toISOString();
    this.tasks.set(task.id, task);
    
    try {
      if (task.type === 'resume_parse') {
        await this.processResumeParseTask(task);
      }
      
      task.status = 'completed';
      task.completedAt = new Date().toISOString();
      
      console.log(`任务完成: ${task.id}`);
      
      // 发出任务完成事件
      this.emit('taskCompleted', task);
      
    } catch (error) {
      task.status = 'failed';
      task.error = error.message;
      task.completedAt = new Date().toISOString();
      
      console.error(`任务失败: ${task.id}`, error);
      
      // 发出任务失败事件
      this.emit('taskFailed', task, error);
    }
    
    this.tasks.set(task.id, task);
  }
  
  /**
   * 处理简历解析任务
   * @param {Object} task - 任务对象
   */
  async processResumeParseTask(task) {
    const { fileBuffer, extractedText, filename, source } = task.data;
    
    // 更新进度：开始处理
    this.updateTaskProgress(task.id, 10, 'processing', '开始处理简历解析任务');
    
    // 导入解析函数（避免循环依赖，直接导入LLM服务）
    const LLMService = require('./llmService');
    const llmService = new LLMService();
    
    // 更新进度：分析文本内容
    this.updateTaskProgress(task.id, 20, 'text_analysis', '分析简历文本内容', {
      filename,
      textLength: extractedText?.length || 0
    });
    
    let parsedResume = {};
    
    try {
      // 使用大模型解析简历
      if (extractedText && extractedText.trim().length > 50) {
        console.log(`开始大模型解析简历: ${filename}`);
        
        // 更新进度：准备大模型解析
        this.updateTaskProgress(task.id, 30, 'llm_preparation', '准备大模型解析', {
          textLength: extractedText.trim().length
        });
        
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

请解析以下简历文本：\n\n${extractedText}`
        }];
        
        // 调用大模型进行简历解析（带重试机制）
         let parsedContent;
         let retryCount = 0;
         const maxRetries = 3;
         
         while (retryCount < maxRetries) {
           try {
             console.log(`尝试大模型解析 (第${retryCount + 1}次): ${filename}`);
             // 更新进度：调用大模型
             this.updateTaskProgress(task.id, 40 + retryCount * 10, 'llm_calling', `调用大模型解析 (第${retryCount + 1}次)`, {
               retryCount: retryCount + 1,
               maxRetries
             });
             parsedContent = await llmService.chatWithLLM(messages);
             break; // 成功则跳出循环
           } catch (error) {
             retryCount++;
             console.error(`大模型解析失败 (第${retryCount}次):`, error.message);
             
             // 根据错误类型决定是否重试
             if (this.shouldRetry(error) && retryCount < maxRetries) {
               const delay = Math.pow(2, retryCount) * 1000; // 指数退避
               console.log(`等待 ${delay}ms 后重试...`);
               await new Promise(resolve => setTimeout(resolve, delay));
               continue;
             } else {
               // 不可重试的错误或达到最大重试次数，使用降级策略
               console.log('大模型解析失败，使用降级策略');
               throw error;
             }
           }
         }
        
        // 更新进度：解析大模型响应
        this.updateTaskProgress(task.id, 60, 'response_parsing', '解析大模型响应内容');
        
        // 解析包含JSON和Markdown两部分的响应
        try {
          // 提取JSON部分
          const jsonMatch = parsedContent.match(/```json\s*([\s\S]*?)\s*```/);
          // 提取Markdown部分
          const markdownMatch = parsedContent.match(/```markdown\s*([\s\S]*?)\s*```/);
          
          let parsedData;
          let markdownContent = '';
          
          if (jsonMatch && jsonMatch[1]) {
            parsedData = JSON.parse(jsonMatch[1].trim());
          } else {
            parsedData = JSON.parse(parsedContent);
          }
          
          if (markdownMatch && markdownMatch[1]) {
            markdownContent = markdownMatch[1].trim();
          } else {
            markdownContent = parsedContent;
          }
          
          // 数据清洗和验证
          parsedResume = {
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
            qualityScore: 85,
            markdownContent: markdownContent
          };
          
        } catch (parseError) {
           console.error('解析大模型响应失败:', parseError);
           // 使用降级策略：传统解析方法
           console.log('启用降级策略：使用传统解析方法');
           const resumeParserService = require('./resumeParserService');
           const fallbackResult = resumeParserService.parseResumeText(extractedText);
           
           parsedResume = {
             ...fallbackResult,
             parseStatus: 'llm_failed_fallback_used',
             message: '大模型解析失败，已使用传统解析方法',
             llmError: parseError.message,
             qualityScore: 60 // 降级解析质量分数较低
           };
         }
        
      } else {
        // 文本内容不足，使用传统解析
        this.updateTaskProgress(task.id, 40, 'fallback_parsing', '文本内容不足，使用传统解析方法');
        const resumeParserService = require('./resumeParserService');
        parsedResume = resumeParserService.parseResumeText(extractedText);
      }
      
      // 检查解析是否成功
      if (parsedResume && parsedResume.parseStatus !== 'parse_failed' && parsedResume.parseStatus !== 'unsupported_format') {
        
        // 更新进度：检查重复性
        this.updateTaskProgress(task.id, 70, 'duplicate_check', '检查简历重复性');
        
        // 检查简历重复性
        const duplicateCheck = await ResumeDeduplication.checkDuplicate(
          fileBuffer,
          extractedText,
          parsedResume
        );
        
        let resumeRecord = null;
        let isDuplicate = false;
        
        if (duplicateCheck.isDuplicate) {
          // 发现重复简历
          isDuplicate = true;
          resumeRecord = duplicateCheck.duplicateResume;
          console.log(`检测到重复简历: ${filename}`);
          this.updateTaskProgress(task.id, 85, 'duplicate_found', '检测到重复简历，跳过入库');
        } else {
          // 更新进度：准备入库
          this.updateTaskProgress(task.id, 80, 'database_saving', '保存简历到数据库');
          // 准备简历数据用于入库
          const resumeData = {
            ...parsedResume,
            source: source || '文件上传',
            originalText: extractedText,
            parseMethod: 'llm_async',
            parseTime: new Date().toISOString(),
            parseStatus: 'completed',
            // 添加去重相关字段
            fileHash: duplicateCheck.hashes.fileHash,
            textHash: duplicateCheck.hashes.textHash,
            fingerprint: duplicateCheck.hashes.fingerprint
          };
          
          // 添加简历到数据库
          resumeRecord = await resumeModel.addResume(resumeData);
          console.log(`异步简历入库成功: ${resumeRecord.id}`);
          this.updateTaskProgress(task.id, 90, 'database_saved', '简历保存成功');
        }
        
        // 更新进度：任务完成
        this.updateTaskProgress(task.id, 100, 'completed', isDuplicate ? '检测到重复简历，已跳过入库' : '简历解析和入库成功', {
          resumeId: resumeRecord?.id,
          isDuplicate,
          qualityScore: parsedResume.qualityScore || 0
        });
        
        // 设置任务结果
        task.result = {
          success: true,
          resumeId: resumeRecord?.id,
          parseStatus: parsedResume.parseStatus,
          qualityScore: parsedResume.qualityScore || 0,
          isDuplicate: isDuplicate,
          message: isDuplicate ? '检测到重复简历，已跳过入库' : '简历解析和入库成功'
        };
        
      } else {
        // 解析失败
        this.updateTaskProgress(task.id, 100, 'failed', '简历解析失败', {
          parseStatus: parsedResume.parseStatus || 'parse_failed'
        });
        
        task.result = {
          success: false,
          parseStatus: parsedResume.parseStatus || 'parse_failed',
          message: parsedResume.message || '简历解析失败'
        };
      }
      
    } catch (error) {
      console.error(`异步简历解析失败: ${filename}`, error);
      
      // 更新进度：任务失败
      this.updateTaskProgress(task.id, 100, 'error', `异步解析失败: ${error.message}`, {
        errorType: error.name,
        errorMessage: error.message
      });
      
      task.result = {
        success: false,
        parseStatus: 'async_parse_failed',
        message: `异步解析失败: ${error.message}`
      };
    }
  }
  
  /**
   * 判断错误是否可以重试
   * @param {Error} error - 错误对象
   * @returns {boolean} - 是否可以重试
   */
  shouldRetry(error) {
    const errorMessage = error.message.toLowerCase();
    
    // 不可重试的错误类型
    const nonRetryableErrors = [
      'api key', // API密钥错误
      'unauthorized', // 未授权
      'forbidden', // 禁止访问
      'invalid request', // 无效请求
      'quota exceeded', // 配额超限
      'rate limit', // 频率限制
      'content policy' // 内容策略违规
    ];
    
    // 可重试的错误类型
    const retryableErrors = [
      'timeout', // 超时
      'network', // 网络错误
      'connection', // 连接错误
      'server error', // 服务器错误
      'service unavailable', // 服务不可用
      'internal error' // 内部错误
    ];
    
    // 检查是否为不可重试错误
    for (const nonRetryable of nonRetryableErrors) {
      if (errorMessage.includes(nonRetryable)) {
        return false;
      }
    }
    
    // 检查是否为可重试错误
    for (const retryable of retryableErrors) {
      if (errorMessage.includes(retryable)) {
        return true;
      }
    }
    
    // 默认情况下，网络相关错误可以重试
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' || 
           error.code === 'ENOTFOUND' ||
           error.code === 'ECONNREFUSED';
  }

  /**
   * 清理过期任务
   * @param {number} maxAge - 最大保留时间（毫秒）
   */
  cleanupExpiredTasks(maxAge = 24 * 60 * 60 * 1000) { // 默认24小时
    const now = Date.now();
    const expiredTasks = [];
    
    for (const [taskId, task] of this.tasks.entries()) {
      const taskAge = now - new Date(task.createdAt).getTime();
      if (taskAge > maxAge) {
        expiredTasks.push(taskId);
      }
    }
    
    expiredTasks.forEach(taskId => {
      this.tasks.delete(taskId);
    });
    
    if (expiredTasks.length > 0) {
      console.log(`清理了 ${expiredTasks.length} 个过期任务`);
    }
  }
}

// 创建全局任务队列实例
const taskQueue = new AsyncTaskQueue();

// 定期清理过期任务
setInterval(() => {
  taskQueue.cleanupExpiredTasks();
}, 60 * 60 * 1000); // 每小时清理一次

module.exports = taskQueue;