/**
 * 任务管理API端点
 * Netlify Function for task management
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
    
    // 调试日志
    console.log('Request details:', {
      httpMethod,
      path: requestPath,
      queryStringParameters
    });
    
    // 路由处理
    if (httpMethod === 'GET') {
      // 检查查询参数中的action
      const action = queryStringParameters?.action;
      
      // 获取任务统计信息
      if (action === 'stats' || (requestPath && requestPath.includes('/stats'))) {
        return await getTaskStats();
      }
      
      // 获取特定任务详情
      const taskId = queryStringParameters?.id;
      if (taskId) {
        return await getTaskById(taskId);
      }
      
      // 获取任务列表
      return await getTasksList(queryStringParameters);
    }
    
    if (httpMethod === 'POST') {
      // 创建新任务
      return await createTask(body);
    }
    
    if (httpMethod === 'PUT') {
      // 更新任务
      const taskIdMatch = requestPath.match(/\/tasks\/([^/]+)$/);
      if (taskIdMatch) {
        const taskId = taskIdMatch[1];
        return await updateTask(taskId, body);
      }
    }
    
    if (httpMethod === 'DELETE') {
      // 删除任务
      const taskIdMatch = requestPath.match(/\/tasks\/([^/]+)$/);
      if (taskIdMatch) {
        const taskId = taskIdMatch[1];
        return await deleteTask(taskId);
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Route not found' })
    };

  } catch (error) {
    console.error('Tasks API error:', error);
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
 * 获取任务列表
 * @param {Object} queryParams - 查询参数
 */
async function getTasksList(queryParams = {}) {
  try {
    
    // 简化的测试数据
    const mockTasks = [
      {
        id: 'task_1',
        title: 'React前端开发工程师招聘',
        description: '招聘有经验的React开发工程师',
        status: 'active',
        priority: 'high',
        smartRecruitment: true,
        recruitmentStatus: 'in_progress',
        platforms: ['zhilian', 'boss'],
        candidates: [
          {
            id: 'candidate_1',
            name: '张三',
            status: 'pending',
            source: 'zhilian',
            matchScore: 85
          }
        ],
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'task_2',
        title: 'Java后端开发工程师招聘',
        description: '寻找资深Java开发工程师',
        status: 'active',
        priority: 'medium',
        smartRecruitment: false,
        recruitmentStatus: 'pending',
        platforms: ['boss'],
        candidates: [],
        comments: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    // 简化处理，直接返回所有任务
    const paginatedTasks = mockTasks;
    
    const pagination = {
      page: 1,
      limit: 10,
      total: mockTasks.length,
      totalPages: 1
    };

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: paginatedTasks,
        pagination
      })
    };
  } catch (error) {
    throw new Error(`获取任务列表失败: ${error.message}`);
  }
}

/**
 * 获取任务统计信息
 */
async function getTaskStats() {
  try {
    // TODO: 集成Supabase后，从数据库统计任务信息
    const mockStats = {
      total: 25,
      active: 18,
      completed: 5,
      paused: 2,
      byPriority: {
        high: 8,
        medium: 12,
        low: 5
      },
      byStatus: {
        pending: 6,
        in_progress: 12,
        completed: 5,
        paused: 2
      },
      recentActivity: [
        {
          id: 'activity_1',
          type: 'task_created',
          message: '创建了新任务：React前端开发工程师招聘',
          timestamp: new Date().toISOString()
        },
        {
          id: 'activity_2',
          type: 'candidate_added',
          message: '为任务添加了新候选人：张三',
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
    throw new Error(`获取任务统计失败: ${error.message}`);
  }
}

/**
 * 根据ID获取任务详情
 * @param {string} taskId - 任务ID
 */
async function getTaskById(taskId) {
  try {
    // TODO: 集成Supabase后，从数据库查询特定任务
    const mockTask = {
      id: taskId,
      title: 'React前端开发工程师招聘',
      description: '招聘有经验的React开发工程师，要求熟悉React生态系统',
      status: 'active',
      priority: 'high',
      smartRecruitment: true,
      recruitmentStatus: 'in_progress',
      platforms: ['zhilian', 'boss'],
      requirements: {
        experience: '3-5年',
        education: '本科及以上',
        skills: ['React', 'JavaScript', 'TypeScript', 'Redux'],
        location: '北京'
      },
      candidates: [
        {
          id: 'candidate_1',
          name: '张三',
          status: 'pending',
          source: 'zhilian',
          matchScore: 85,
          contact: {
            phone: '138****8888',
            email: 'zhang***@email.com'
          },
          addedAt: new Date().toISOString()
        }
      ],
      comments: [
        {
          id: 'comment_1',
          content: '已联系候选人张三，等待回复',
          author: 'HR小王',
          createdAt: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
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
        data: mockTask
      })
    };
  } catch (error) {
    throw new Error(`获取任务详情失败: ${error.message}`);
  }
}

/**
 * 创建新任务
 * @param {string} body - 请求体
 */
async function createTask(body) {
  try {
    const taskData = JSON.parse(body || '{}');
    
    // TODO: 集成Supabase后，将任务数据保存到数据库
    const newTask = {
      id: `task_${Date.now()}`,
      ...taskData,
      status: 'active',
      candidates: [],
      comments: [],
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
        data: newTask,
        message: '任务创建成功'
      })
    };
  } catch (error) {
    throw new Error(`创建任务失败: ${error.message}`);
  }
}

/**
 * 更新任务
 * @param {string} taskId - 任务ID
 * @param {string} body - 请求体
 */
async function updateTask(taskId, body) {
  try {
    const updateData = JSON.parse(body || '{}');
    
    // TODO: 集成Supabase后，更新数据库中的任务
    const updatedTask = {
      id: taskId,
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
        data: updatedTask,
        message: '任务更新成功'
      })
    };
  } catch (error) {
    throw new Error(`更新任务失败: ${error.message}`);
  }
}

/**
 * 删除任务
 * @param {string} taskId - 任务ID
 */
async function deleteTask(taskId) {
  try {
    // TODO: 集成Supabase后，从数据库删除任务
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: '任务删除成功'
      })
    };
  } catch (error) {
    throw new Error(`删除任务失败: ${error.message}`);
  }
}