export class QueryHandler {
  // 检查是否是简历查询
  static isResumeQuery(query) {
    if (this.isTaskCreationQuery(query)) {
      return false;
    }
    
    const resumeKeywords = ['简历', '候选人', '应聘者', '求职者', '人才', '面试'];
    const positionKeywords = ['产品经理', '软件工程师', '架构师', '算法工程师', '前端', '后端', '测试', '运维'];
    
    const hasResumeKeyword = resumeKeywords.some(keyword => query.includes(keyword));
    const hasPositionKeyword = positionKeywords.some(keyword => query.includes(keyword));
    
    return hasResumeKeyword || hasPositionKeyword;
  }

  // 检查是否是知识库查询
  static isKnowledgeQuery(query) {
    const knowledgeKeywords = ['文档', '知识', '资料', '文件', '检索', '搜索', '查询', '查找'];
    const hasKnowledgeKeyword = knowledgeKeywords.some(keyword => query.includes(keyword));
    return hasKnowledgeKeyword;
  }

  // 检查是否是任务创建查询
  static isTaskCreationQuery(query) {
    const taskKeywords = [
      '创建任务', '新建任务', '添加任务', '招聘任务', '任务管理',
      '开始招聘', '招聘流程', '招聘计划', '招聘项目', '创建招聘任务'
    ];
    
    const hasTaskKeyword = taskKeywords.some(keyword => query.includes(keyword));
    const hasCreateRecruitment = query.includes('创建') && query.includes('招聘');
    const hasRecruitmentTask = query.includes('招聘') && query.includes('任务');
    
    return hasTaskKeyword || hasCreateRecruitment || hasRecruitmentTask;
  }

  // 检查是否是岗位创建查询
  static isPositionCreationQuery(query) {
    const positionKeywords = [
      '创建岗位', '新建岗位', '添加岗位', '发布岗位', '岗位管理',
      '招聘岗位', '职位发布', '创建职位', '新建职位', '添加职位',
      '需要招聘', '招聘', '招人', '找人', '招工'
    ];
    
    const hasPositionKeyword = positionKeywords.some(keyword => query.includes(keyword));
    const hasCreatePosition = query.includes('创建') && (query.includes('岗位') || query.includes('职位'));
    const hasRecruitmentPosition = query.includes('招聘') && (query.includes('岗位') || query.includes('职位'));
    
    return hasPositionKeyword || hasCreatePosition || hasRecruitmentPosition;
  }

  // 检查是否是公司搜索查询
  static isCompanySearchQuery(query) {
    const companyKeywords = [
      '公司搜索', '找公司', '公司推荐', '智能推荐', '公司分析',
      '推荐公司', '公司筛选', '找工作', '求职', '公司评估',
      '公司对比', '公司排名', '最佳公司', '好公司'
    ];
    
    const hasCompanyKeyword = companyKeywords.some(keyword => query.includes(keyword));
    const hasSearchCompany = query.includes('搜索') && query.includes('公司');
    const hasRecommendCompany = query.includes('推荐') && query.includes('公司');
    
    return hasCompanyKeyword || hasSearchCompany || hasRecommendCompany;
  }

  // 解析任务创建查询
  static parseTaskCreationQuery(query) {
    const taskInfo = {
      isValid: false,
      taskData: {
        title: '',
        position: '',
        description: '',
        status: '进行中',
        priority: '中',
        progress: 0,
        assignee: '',
        deadline: null,
        candidates: []
      }
    };

    // 提取职位信息
    const positionKeywords = {
      '前端开发工程师': ['前端', '前端开发', '前端工程师', 'react', 'vue', 'javascript', 'js'],
      '后端开发工程师': ['后端', '后端开发', '后端工程师', 'node.js', 'python', 'java', 'server'],
      '产品经理': ['产品经理', '产品', 'pm', 'product'],
      'UI设计师': ['ui设计师', 'ui设计', '设计师', '设计', 'ui'],
      '测试工程师': ['测试工程师', '测试', 'qa', 'quality'],
      '运营专员': ['运营专员', '运营', 'operation'],
      '数据分析师': ['数据分析师', '数据分析', '数据', 'analyst'],
      '算法工程师': ['算法工程师', '算法', 'algorithm', '机器学习', 'ai', 'ml']
    };

    // 查找匹配的职位
    for (const [position, keywords] of Object.entries(positionKeywords)) {
      if (keywords.some(keyword => query.toLowerCase().includes(keyword.toLowerCase()))) {
        taskInfo.taskData.position = position;
        break;
      }
    }

    // 如果没有找到具体职位，尝试从查询中提取
    if (!taskInfo.taskData.position) {
      const positionMatch = query.match(/招聘\s*([^，。\s]+(?:\s+[^，。\s]+)*)/);
      if (positionMatch) {
        taskInfo.taskData.position = positionMatch[1].trim();
      }
    }

    // 提取任务名称
    if (taskInfo.taskData.position) {
      taskInfo.taskData.title = `招聘${taskInfo.taskData.position}`;
    } else {
      const titleMatch = query.match(/招聘\s*([^，。\s]+(?:\s+[^，。\s]+)*)/);
      if (titleMatch) {
        taskInfo.taskData.title = `招聘${titleMatch[1].trim()}`;
        taskInfo.taskData.position = titleMatch[1].trim();
      }
    }

    // 提取负责人
    const assigneeMatch = query.match(/负责人[是为]\s*([^，。\s]+)/);
    if (assigneeMatch) {
      taskInfo.taskData.assignee = assigneeMatch[1];
    } else {
      const assigneeMatch2 = query.match(/负责人\s*([^，。\s]+)/);
      if (assigneeMatch2) {
        taskInfo.taskData.assignee = assigneeMatch2[1];
      }
    }

    // 提取截止时间
    const deadlineMatch = query.match(/(\d+)\s*天后/);
    if (deadlineMatch) {
      const days = parseInt(deadlineMatch[1]);
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + days);
      taskInfo.taskData.deadline = deadline.toISOString();
    }

    // 提取描述
    const descMatch = query.match(/描述[是为]\s*([^，。]+)/);
    if (descMatch) {
      taskInfo.taskData.description = descMatch[1];
    } else if (taskInfo.taskData.position) {
      taskInfo.taskData.description = `招聘${taskInfo.taskData.position}，负责相关岗位的招聘工作`;
    }

    // 验证任务信息是否完整
    taskInfo.isValid = taskInfo.taskData.title && taskInfo.taskData.position;

    return taskInfo;
  }

  // 获取推荐简历
  static async getRecommendedResumes(query) {
    try {
      const response = await fetch('/api/resume-library');
      const allResumes = await response.json();
      
      let filteredResumes = allResumes;
      
      // 检查是否包含岗位关键词
      const positionKeywords = {
        '产品经理': ['产品经理', '产品', 'pm', 'product'],
        '软件工程师': ['软件工程师', '开发工程师', '程序员', 'developer', '开发'],
        '架构师': ['架构师', '架构', 'architect'],
        '算法工程师': ['算法工程师', '算法', 'algorithm', '机器学习', 'ai']
      };
      
      // 找到匹配的岗位
      let targetPosition = null;
      for (const [position, keywords] of Object.entries(positionKeywords)) {
        if (keywords.some(keyword => query.toLowerCase().includes(keyword.toLowerCase()))) {
          targetPosition = position;
          break;
        }
      }
      
      // 如果找到目标岗位，筛选相关简历
      if (targetPosition) {
        filteredResumes = allResumes.filter(resume => 
          resume.position === targetPosition
        );
      }
      
      // 按评分排序，取前5个
      filteredResumes.sort((a, b) => {
        const scoreA = a.scores && a.scores.length > 0 ? a.scores[a.scores.length - 1].score : 0;
        const scoreB = b.scores && b.scores.length > 0 ? b.scores[b.scores.length - 1].score : 0;
        return scoreB - scoreA;
      });
      
      return filteredResumes.slice(0, 5);
    } catch (error) {
      console.error('获取推荐简历失败:', error);
      return [];
    }
  }

  // 从消息历史中提取手机号
  static extractPhoneFromMessages(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const phoneMatch = messages[i].content.match(/1[3-9]\d{9}/);
      if (phoneMatch) {
        return phoneMatch[0];
      }
    }
    return null;
  }

  // 处理能力卡片点击
  static getCapabilityMessage(capability) {
    const capabilityMessages = {
      'smart-recruitment': '请输入您的手机号，我将为您启动智能寻聘流程',
      'resume-recommendation': '我需要简历推荐功能，请帮我推荐合适的候选人',
      'company-search': '我想搜索和推荐合适的公司，请帮我启动公司搜索功能',
      'knowledge-search': '我想搜索企业知识库，请帮我查找相关文档',
      'data-analytics': '我想查看数据分析报告，请帮我分析招聘数据',
      'task-management': '我想创建招聘任务，请帮我管理招聘流程',
      'position-creation': '我想创建一个新的岗位，请帮我生成岗位描述'
    };
    
    return capabilityMessages[capability.id] || `我想使用${capability.title}功能`;
  }
}
