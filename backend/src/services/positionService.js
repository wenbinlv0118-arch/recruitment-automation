const ResumeModel = require('../models/resumeModel');
const LLMService = require('./llmService');

class PositionService {
  constructor() {
    this.resumeModel = ResumeModel;
    this.llmService = null;
  }
  
  // 延迟初始化LLM服务
  async initLLMService() {
    if (!this.llmService) {
      try {
        this.llmService = new LLMService();
        console.log('✅ LLM服务初始化成功');
      } catch (error) {
        console.warn('大语言模型服务初始化失败，将使用模拟模式:', error.message);
      }
    }
    return this.llmService;
  }

  async createPositionFromDialog(userMessage, thinkingCallback = null, finalAnswerCallback = null) {
    try {
      const positionInfo = await this.parsePositionInfo(userMessage, thinkingCallback);
      const jobDescription = await this.generateJobDescription(positionInfo, thinkingCallback);
      
      const positionData = {
        title: positionInfo.title,
        department: positionInfo.department,
        location: positionInfo.location,
        salary: positionInfo.salary,
        experience: positionInfo.experience,
        education: positionInfo.education,
        skills: positionInfo.skills,
        responsibilities: jobDescription.responsibilities,
        requirements: jobDescription.requirements,
        benefits: jobDescription.benefits,
        description: jobDescription.fullDescription,
        status: 'active',
        createdFromDialog: true,
        originalMessage: userMessage
      };

      const position = await this.resumeModel.addPosition(positionData);
      
      const result = {
        success: true,
        position: position,
        summary: `已成功创建岗位"${position.title}"，包含完整的岗位描述和要求。`
      };

      if (finalAnswerCallback) {
        finalAnswerCallback(result);
      }

      return result;

    } catch (error) {
      console.error('创建岗位失败:', error);
      const errorResult = {
        success: false,
        error: error.message,
        summary: '创建岗位时出现错误，请重试。'
      };

      if (finalAnswerCallback) {
        finalAnswerCallback(errorResult);
      }

      throw error;
    }
  }

  async parsePositionInfo(userMessage, thinkingCallback = null) {
    // 确保LLM服务已初始化
    await this.initLLMService();
    
    if (!this.llmService) {
      return this.simplePositionParsing(userMessage);
    }

    const prompt = `
请分析以下用户输入的岗位描述，提取关键信息并返回JSON格式的结果：

用户输入：${userMessage}

请提取以下信息：
1. title: 岗位标题
2. department: 部门（如果提到）
3. location: 工作地点（如果提到）
4. salary: 薪资范围（如果提到）
5. experience: 工作经验要求（年数）
6. education: 学历要求
7. skills: 技能要求（数组）

请只返回JSON格式的结果，不要包含其他文字。
`;

    const messages = [
      { role: 'system', content: '你是一个专业的HR助手，擅长分析岗位描述并提取关键信息。' },
      { role: 'user', content: prompt }
    ];

    try {
      const response = await this.llmService.chatWithLLM(messages, thinkingCallback);
      
      // 清理响应内容，移除可能的控制字符
      const cleanResponse = response.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.warn('JSON解析失败，尝试清理后重新解析:', parseError.message);
          // 进一步清理JSON字符串
          const cleanedJson = jsonMatch[0].replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ');
          return JSON.parse(cleanedJson);
        }
      } else {
        throw new Error('无法解析大模型响应');
      }
    } catch (error) {
      console.warn('大模型解析失败，使用简单解析:', error.message);
      return this.simplePositionParsing(userMessage);
    }
  }

  simplePositionParsing(userMessage) {
    const result = {
      title: '新岗位',
      department: '',
      location: '',
      salary: '',
      experience: 0,
      education: '本科',
      skills: []
    };

    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('前端') || lowerMessage.includes('frontend')) {
      result.title = '前端开发工程师';
      result.skills = ['JavaScript', 'React', 'Vue', 'HTML', 'CSS'];
    } else if (lowerMessage.includes('后端') || lowerMessage.includes('backend')) {
      result.title = '后端开发工程师';
      result.skills = ['Java', 'Python', 'Node.js', '数据库', 'API'];
    } else if (lowerMessage.includes('全栈') || lowerMessage.includes('fullstack')) {
      result.title = '全栈开发工程师';
      result.skills = ['JavaScript', 'React', 'Node.js', '数据库', 'API'];
    } else if (lowerMessage.includes('产品') || lowerMessage.includes('product')) {
      result.title = '产品经理';
      result.skills = ['产品设计', '用户研究', '项目管理', '数据分析'];
    } else if (lowerMessage.includes('设计') || lowerMessage.includes('design')) {
      result.title = 'UI/UX设计师';
      result.skills = ['Figma', 'Sketch', 'Photoshop', '用户研究', '交互设计'];
    }

    const experienceMatch = userMessage.match(/(\d+)[\s]*年/);
    if (experienceMatch) {
      result.experience = parseInt(experienceMatch[1]);
    }

    if (lowerMessage.includes('硕士') || lowerMessage.includes('研究生')) {
      result.education = '硕士';
    } else if (lowerMessage.includes('博士')) {
      result.education = '博士';
    } else if (lowerMessage.includes('大专')) {
      result.education = '大专';
    }

    return result;
  }

  async generateJobDescription(positionInfo, thinkingCallback = null) {
    // 确保LLM服务已初始化
    await this.initLLMService();
    
    if (!this.llmService) {
      return this.generateSimpleJD(positionInfo);
    }

    const prompt = `
请为以下岗位生成完整的岗位描述（JD）：

岗位信息：
- 岗位名称：${positionInfo.title}
- 部门：${positionInfo.department || '待定'}
- 工作地点：${positionInfo.location || '待定'}
- 薪资范围：${positionInfo.salary || '面议'}
- 工作经验：${positionInfo.experience}年
- 学历要求：${positionInfo.education}
- 技能要求：${positionInfo.skills.join(', ')}

请生成以下内容：
1. 岗位职责（responsibilities）：5-8条具体的工作职责
2. 任职要求（requirements）：5-8条具体的任职要求
3. 福利待遇（benefits）：3-5条公司福利
4. 完整描述（fullDescription）：包含以上所有信息的完整JD

请以JSON格式返回，包含responsibilities、requirements、benefits、fullDescription四个字段。
`;

    const messages = [
      { role: 'system', content: '你是一个专业的HR助手，擅长撰写岗位描述和任职要求。' },
      { role: 'user', content: prompt }
    ];

    try {
      const response = await this.llmService.chatWithLLM(messages, thinkingCallback);
      
      // 清理响应内容，移除可能的控制字符
      const cleanResponse = response.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.warn('JSON解析失败，尝试清理后重新解析:', parseError.message);
          // 进一步清理JSON字符串
          const cleanedJson = jsonMatch[0].replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ');
          return JSON.parse(cleanedJson);
        }
      } else {
        throw new Error('无法解析大模型响应');
      }
    } catch (error) {
      console.warn('大模型生成JD失败，使用简单生成:', error.message);
      return this.generateSimpleJD(positionInfo);
    }
  }

  generateSimpleJD(positionInfo) {
    const responsibilities = [
      '负责相关项目的开发和维护工作',
      '参与技术方案设计和评审',
      '编写技术文档和代码注释',
      '与产品、设计等团队协作',
      '持续学习新技术，提升团队技术水平'
    ];

    const requirements = [
      `${positionInfo.education}及以上学历`,
      `具有${positionInfo.experience}年以上相关工作经验`,
      `熟练掌握${positionInfo.skills.slice(0, 3).join('、')}等技术`,
      '具有良好的团队协作能力和沟通能力',
      '有责任心，能够承担工作压力'
    ];

    const benefits = [
      '具有竞争力的薪资待遇',
      '五险一金、带薪年假',
      '定期团建活动',
      '职业发展培训机会',
      '弹性工作制度'
    ];

    const fullDescription = `
# ${positionInfo.title}

## 岗位职责
${responsibilities.map(item => `- ${item}`).join('\n')}

## 任职要求
${requirements.map(item => `- ${item}`).join('\n')}

## 福利待遇
${benefits.map(item => `- ${item}`).join('\n')}

## 工作地点
${positionInfo.location || '待定'}

## 薪资范围
${positionInfo.salary || '面议'}
    `.trim();

    return {
      responsibilities,
      requirements,
      benefits,
      fullDescription
    };
  }

  async getPositions() {
    return await this.resumeModel.getPositions();
  }

  async getPositionById(positionId) {
    const positions = await this.resumeModel.getPositions();
    return positions.find(p => p.id === positionId);
  }

  async updatePosition(positionId, updatedData) {
    try {
      const db = this.resumeModel.readDatabase();
      const positionIndex = db.positions.findIndex(p => p.id === positionId);
      
      if (positionIndex === -1) {
        return {
          success: false,
          error: '岗位不存在'
        };
      }

      // 更新岗位数据
      const updatedPosition = {
        ...db.positions[positionIndex],
        ...updatedData,
        updatedAt: new Date().toISOString()
      };

      db.positions[positionIndex] = updatedPosition;
      this.resumeModel.writeDatabase(db);

      return {
        success: true,
        position: updatedPosition,
        message: '岗位更新成功'
      };
    } catch (error) {
      console.error('更新岗位失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deletePosition(positionId) {
    try {
      const db = this.resumeModel.readDatabase();
      const positionIndex = db.positions.findIndex(p => p.id === positionId);
      
      if (positionIndex === -1) {
        return {
          success: false,
          error: '岗位不存在'
        };
      }

      // 检查是否有简历关联此岗位
      const hasRelatedResumes = db.resumes.some(resume => resume.positionId === positionId);
      if (hasRelatedResumes) {
        return {
          success: false,
          error: '该岗位还有关联的简历，无法删除'
        };
      }

      // 删除岗位
      const deletedPosition = db.positions[positionIndex];
      db.positions.splice(positionIndex, 1);
      this.resumeModel.writeDatabase(db);

      return {
        success: true,
        position: deletedPosition,
        message: '岗位删除成功'
      };
    } catch (error) {
      console.error('删除岗位失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new PositionService();
