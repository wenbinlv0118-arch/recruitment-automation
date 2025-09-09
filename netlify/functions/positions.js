/**
 * 职位管理API端点
 * Netlify Function for position management
 */

exports.handler = async (event, context) => {
  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  // 处理OPTIONS预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { httpMethod, path: requestPath, queryStringParameters, body } = event;
    
    // 路由处理
    if (httpMethod === 'GET') {
      // 获取职位统计信息
      if (requestPath.includes('/stats')) {
        return await getPositionStats();
      }
      
      // 获取特定职位详情
      const positionIdMatch = requestPath.match(/\/positions\/([^/]+)$/);
      if (positionIdMatch) {
        const positionId = positionIdMatch[1];
        return await getPositionById(positionId);
      }
      
      // 获取职位列表
      return await getPositionsList(queryStringParameters);
    }
    
    if (httpMethod === 'POST') {
      // 创建新职位
      return await createPosition(body);
    }
    
    if (httpMethod === 'PUT') {
      // 更新职位
      const positionIdMatch = requestPath.match(/\/positions\/([^/]+)$/);
      if (positionIdMatch) {
        const positionId = positionIdMatch[1];
        return await updatePosition(positionId, body);
      }
    }
    
    if (httpMethod === 'DELETE') {
      // 删除职位
      const positionIdMatch = requestPath.match(/\/positions\/([^/]+)$/);
      if (positionIdMatch) {
        const positionId = positionIdMatch[1];
        return await deletePosition(positionId);
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Route not found' })
    };

  } catch (error) {
    console.error('Positions API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: '服务器内部错误',
        message: error.message
      })
    };
  }
};

/**
 * 获取职位列表
 * @param {Object} queryParams - 查询参数
 */
async function getPositionsList(queryParams = {}) {
  try {
    const {
      status,
      department,
      level,
      location,
      search,
      page = 1,
      limit = 10
    } = queryParams;
    
    // TODO: 集成Supabase后，从数据库查询职位列表
    const mockPositions = [
      {
        id: 'pos_1',
        title: 'React前端开发工程师',
        department: '技术部',
        level: 'middle',
        location: '北京',
        status: 'active',
        description: '负责前端产品的开发和维护，要求熟悉React技术栈',
        requirements: {
          experience: '3-5年',
          education: '本科及以上',
          skills: ['React', 'JavaScript', 'TypeScript', 'Redux'],
          languages: ['中文', '英文']
        },
        benefits: {
          salary: '20K-35K',
          bonus: '13薪',
          insurance: '五险一金',
          vacation: '带薪年假',
          other: ['弹性工作', '技术培训', '团建活动']
        },
        recruiter: {
          name: 'HR小王',
          email: 'wang@company.com',
          phone: '138****8888'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        applicantsCount: 15,
        viewsCount: 128
      },
      {
        id: 'pos_2',
        title: 'Java后端开发工程师',
        department: '技术部',
        level: 'senior',
        location: '上海',
        status: 'active',
        description: '负责后端服务的设计和开发，要求有微服务架构经验',
        requirements: {
          experience: '5-8年',
          education: '本科及以上',
          skills: ['Java', 'Spring Boot', 'MySQL', 'Redis', 'Kafka'],
          languages: ['中文']
        },
        benefits: {
          salary: '30K-50K',
          bonus: '15薪',
          insurance: '五险一金',
          vacation: '带薪年假',
          other: ['股票期权', '技术培训', '健身房']
        },
        recruiter: {
          name: 'HR小李',
          email: 'li@company.com',
          phone: '139****9999'
        },
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        publishedAt: new Date(Date.now() - 86400000).toISOString(),
        applicantsCount: 23,
        viewsCount: 256
      },
      {
        id: 'pos_3',
        title: '产品经理',
        department: '产品部',
        level: 'middle',
        location: '深圳',
        status: 'paused',
        description: '负责产品规划和需求分析，协调各部门推进产品开发',
        requirements: {
          experience: '3-5年',
          education: '本科及以上',
          skills: ['产品设计', '需求分析', '项目管理', 'Axure', 'Figma'],
          languages: ['中文', '英文']
        },
        benefits: {
          salary: '25K-40K',
          bonus: '14薪',
          insurance: '五险一金',
          vacation: '带薪年假',
          other: ['弹性工作', '产品培训']
        },
        recruiter: {
          name: 'HR小张',
          email: 'zhang@company.com',
          phone: '137****7777'
        },
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 172800000).toISOString(),
        publishedAt: null,
        applicantsCount: 8,
        viewsCount: 89
      }
    ];

    // 应用过滤条件
    let filteredPositions = mockPositions;
    if (status) {
      filteredPositions = filteredPositions.filter(pos => pos.status === status);
    }
    if (department) {
      filteredPositions = filteredPositions.filter(pos => pos.department === department);
    }
    if (level) {
      filteredPositions = filteredPositions.filter(pos => pos.level === level);
    }
    if (location) {
      filteredPositions = filteredPositions.filter(pos => pos.location === location);
    }
    if (search) {
      filteredPositions = filteredPositions.filter(pos => 
        pos.title.toLowerCase().includes(search.toLowerCase()) ||
        pos.description.toLowerCase().includes(search.toLowerCase())
      );
    }

    // 分页处理
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedPositions = filteredPositions.slice(startIndex, endIndex);

    const pagination = {
      page: pageNum,
      limit: limitNum,
      total: filteredPositions.length,
      totalPages: Math.ceil(filteredPositions.length / limitNum)
    };

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: paginatedPositions,
        pagination
      })
    };
  } catch (error) {
    throw new Error(`获取职位列表失败: ${error.message}`);
  }
}

/**
 * 获取职位统计信息
 */
async function getPositionStats() {
  try {
    // TODO: 集成Supabase后，从数据库统计职位信息
    const mockStats = {
      total: 45,
      active: 32,
      paused: 8,
      closed: 5,
      byDepartment: {
        '技术部': 25,
        '产品部': 8,
        '市场部': 6,
        '运营部': 4,
        '人事部': 2
      },
      byLevel: {
        'junior': 12,
        'middle': 20,
        'senior': 10,
        'lead': 3
      },
      byLocation: {
        '北京': 18,
        '上海': 15,
        '深圳': 8,
        '杭州': 4
      },
      applications: {
        total: 1256,
        thisWeek: 89,
        thisMonth: 342
      },
      recentActivity: [
        {
          id: 'activity_1',
          type: 'position_created',
          message: '创建了新职位：React前端开发工程师',
          timestamp: new Date().toISOString()
        },
        {
          id: 'activity_2',
          type: 'application_received',
          message: 'Java后端开发工程师收到新申请',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        }
      ]
    };

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: mockStats
      })
    };
  } catch (error) {
    throw new Error(`获取职位统计失败: ${error.message}`);
  }
}

/**
 * 根据ID获取职位详情
 * @param {string} positionId - 职位ID
 */
async function getPositionById(positionId) {
  try {
    // TODO: 集成Supabase后，从数据库查询特定职位
    const mockPosition = {
      id: positionId,
      title: 'React前端开发工程师',
      department: '技术部',
      level: 'middle',
      location: '北京',
      status: 'active',
      description: '我们正在寻找一位有经验的React前端开发工程师加入我们的技术团队。你将负责开发和维护我们的前端产品，与后端团队紧密合作，为用户提供优秀的产品体验。',
      responsibilities: [
        '负责前端产品的开发和维护',
        '与UI/UX设计师合作实现设计稿',
        '优化前端性能，提升用户体验',
        '参与技术方案讨论和代码评审',
        '协助解决线上问题和bug修复'
      ],
      requirements: {
        experience: '3-5年',
        education: '本科及以上',
        skills: ['React', 'JavaScript', 'TypeScript', 'Redux', 'Webpack', 'Git'],
        languages: ['中文', '英文'],
        preferred: [
          '有大型项目开发经验',
          '熟悉微前端架构',
          '了解Node.js开发',
          '有团队管理经验优先'
        ]
      },
      benefits: {
        salary: '20K-35K',
        bonus: '13薪',
        insurance: '五险一金',
        vacation: '带薪年假15天',
        other: [
          '弹性工作时间',
          '技术培训预算',
          '团建活动',
          '健身房会员',
          '免费午餐',
          '生日福利'
        ]
      },
      workEnvironment: {
        teamSize: '8-12人',
        workingHours: '9:30-18:30',
        overtime: '很少加班',
        culture: '开放、创新、协作'
      },
      recruiter: {
        name: 'HR小王',
        email: 'wang@company.com',
        phone: '138****8888',
        wechat: 'hr_wang_123'
      },
      company: {
        name: '科技创新有限公司',
        industry: '互联网',
        size: '100-500人',
        stage: '成长期',
        website: 'https://company.com'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      applicantsCount: 15,
      viewsCount: 128,
      applications: [
        {
          id: 'app_1',
          candidateName: '张三',
          appliedAt: new Date().toISOString(),
          status: 'pending',
          source: 'website'
        },
        {
          id: 'app_2',
          candidateName: '李四',
          appliedAt: new Date(Date.now() - 86400000).toISOString(),
          status: 'interview_scheduled',
          source: 'zhilian'
        }
      ]
    };

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: mockPosition
      })
    };
  } catch (error) {
    throw new Error(`获取职位详情失败: ${error.message}`);
  }
}

/**
 * 创建新职位
 * @param {string} body - 请求体
 */
async function createPosition(body) {
  try {
    const positionData = JSON.parse(body || '{}');
    
    // TODO: 集成Supabase后，将职位数据保存到数据库
    const newPosition = {
      id: `pos_${Date.now()}`,
      ...positionData,
      status: 'draft',
      applicantsCount: 0,
      viewsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: newPosition,
        message: '职位创建成功'
      })
    };
  } catch (error) {
    throw new Error(`创建职位失败: ${error.message}`);
  }
}

/**
 * 更新职位
 * @param {string} positionId - 职位ID
 * @param {string} body - 请求体
 */
async function updatePosition(positionId, body) {
  try {
    const updateData = JSON.parse(body || '{}');
    
    // TODO: 集成Supabase后，更新数据库中的职位
    const updatedPosition = {
      id: positionId,
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: updatedPosition,
        message: '职位更新成功'
      })
    };
  } catch (error) {
    throw new Error(`更新职位失败: ${error.message}`);
  }
}

/**
 * 删除职位
 * @param {string} positionId - 职位ID
 */
async function deletePosition(positionId) {
  try {
    // TODO: 集成Supabase后，从数据库删除职位
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: '职位删除成功'
      })
    };
  } catch (error) {
    throw new Error(`删除职位失败: ${error.message}`);
  }
}