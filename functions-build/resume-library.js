/**
 * 简历库管理API端点
 * Netlify Function for resume library management
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
      // 获取简历来源列表
      if (requestPath.includes('/sources')) {
        return await getResumeSources();
      }
      
      // 获取简历库列表
      return await getResumeLibrary(queryStringParameters);
    }
    
    if (httpMethod === 'POST') {
      // 处理文件上传
      if (requestPath.includes('/upload')) {
        return await uploadResumeToLibrary(body);
      }
      
      // 添加简历到简历库
      return await addResumeToLibrary(body);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Route not found' })
    };

  } catch (error) {
    console.error('Resume library API error:', error);
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
 * 获取简历来源列表
 */
async function getResumeSources() {
  try {
    // TODO: 集成Supabase后，从数据库获取来源列表
    const mockSources = [
      { id: 'manual', name: '手动上传', count: 15 },
      { id: 'zhilian', name: '智联招聘', count: 28 },
      { id: 'boss', name: 'Boss直聘', count: 22 },
      { id: 'lagou', name: '拉勾网', count: 12 }
    ];

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: mockSources
      })
    };
  } catch (error) {
    throw new Error(`获取简历来源列表失败: ${error.message}`);
  }
}

/**
 * 获取简历库列表
 * @param {Object} queryParams - 查询参数
 */
async function getResumeLibrary(queryParams = {}) {
  try {
    const { positionId, source } = queryParams;
    
    // TODO: 集成Supabase后，根据条件查询简历库
    const mockResumes = [
      {
        id: 'lib_resume_1',
        name: '王五',
        position: 'React开发工程师',
        experience: '3年',
        education: '本科',
        skills: ['React', 'JavaScript', 'TypeScript', 'Node.js'],
        source: 'zhilian',
        qualityScore: 88,
        matchScore: 92,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        contact: {
          phone: '138****8888',
          email: 'wang***@email.com'
        },
        summary: '具有3年React开发经验，熟悉前端技术栈，有大型项目经验。'
      },
      {
        id: 'lib_resume_2',
        name: '赵六',
        position: 'Java后端工程师',
        experience: '5年',
        education: '硕士',
        skills: ['Java', 'Spring Boot', 'MySQL', 'Redis'],
        source: 'boss',
        qualityScore: 95,
        matchScore: 89,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        contact: {
          phone: '139****9999',
          email: 'zhao***@email.com'
        },
        summary: '5年Java开发经验，精通Spring生态，有微服务架构经验。'
      }
    ];

    // 根据条件过滤
    let filteredResumes = mockResumes;
    if (source) {
      filteredResumes = filteredResumes.filter(resume => resume.source === source);
    }
    if (positionId) {
      // TODO: 根据职位ID过滤匹配的简历
    }

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: filteredResumes
      })
    };
  } catch (error) {
    throw new Error(`获取简历库列表失败: ${error.message}`);
  }
}

/**
 * 添加简历到简历库
 * @param {string} body - 请求体
 */
async function addResumeToLibrary(body) {
  try {
    const resumeData = JSON.parse(body || '{}');
    
    // TODO: 集成Supabase后，将简历数据保存到数据库
    const newResume = {
      id: `lib_resume_${Date.now()}`,
      ...resumeData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'active'
    };

    return {
      statusCode: 201,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: newResume,
        message: '简历已成功添加到简历库'
      })
    };
  } catch (error) {
    throw new Error(`添加简历到简历库失败: ${error.message}`);
  }
}

/**
 * 上传简历文件到简历库
 * @param {string} body - 请求体
 */
async function uploadResumeToLibrary(body) {
  try {
    // TODO: 集成Supabase Storage和简历解析服务
    // 目前返回模拟响应
    return {
      statusCode: 501,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: '简历上传功能正在开发中，请稍后再试',
        message: 'Resume upload feature is under development'
      })
    };
  } catch (error) {
    throw new Error(`上传简历到简历库失败: ${error.message}`);
  }
}