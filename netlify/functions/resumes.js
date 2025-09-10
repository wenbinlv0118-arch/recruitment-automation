/**
 * 简历管理API端点
 * Netlify Function for resume management
 */
const path = require('path');
const fs = require('fs-extra');

// 由于Netlify Functions是无状态的，我们需要使用环境变量或外部存储
// 这里先创建基础结构，后续会集成Supabase

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
    const { httpMethod, path: requestPath, queryStringParameters } = event;
    
    // 路由处理
    if (httpMethod === 'GET') {
      // 获取简历列表
      if (requestPath === '/.netlify/functions/resumes' || requestPath.endsWith('/resumes')) {
        return await getResumesList(queryStringParameters);
      }
      
      // 下载特定简历文件
      if (requestPath.includes('/resumes/') && requestPath.split('/').length > 4) {
        const filename = requestPath.split('/').pop();
        return await downloadResume(filename);
      }
    }
    
    if (httpMethod === 'POST') {
      // 上传简历
      return await uploadResume(event.body);
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Route not found' })
    };

  } catch (error) {
    console.error('Resume API error:', error);
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
 * 获取简历列表
 * @param {Object} queryParams - 查询参数
 */
async function getResumesList(queryParams = {}) {
  try {
    // TODO: 集成Supabase后，从数据库获取简历列表
    // 目前返回模拟数据
    const mockResumes = [
      {
        id: 'resume_1',
        name: '张三_前端开发工程师.pdf',
        filename: '张三_前端开发工程师.pdf',
        size: 1024000,
        downloadTime: new Date().toISOString(),
        source: 'manual',
        parseStatus: 'completed',
        qualityScore: 85,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: 'resume_2',
        name: '李四_后端开发工程师.pdf',
        filename: '李四_后端开发工程师.pdf',
        size: 956000,
        downloadTime: new Date().toISOString(),
        source: 'zhilian',
        parseStatus: 'completed',
        qualityScore: 92,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: mockResumes
      })
    };
  } catch (error) {
    throw new Error(`获取简历列表失败: ${error.message}`);
  }
}

/**
 * 下载简历文件
 * @param {string} filename - 文件名
 */
async function downloadResume(filename) {
  try {
    // TODO: 集成Supabase Storage后，从云存储下载文件
    // 目前返回错误信息
    return {
      statusCode: 501,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: '文件下载功能正在开发中，请稍后再试',
        message: 'File download feature is under development'
      })
    };
  } catch (error) {
    throw new Error(`下载简历文件失败: ${error.message}`);
  }
}

/**
 * 上传简历
 * @param {string} body - 请求体
 */
async function uploadResume(body) {
  try {
    // TODO: 集成Supabase后，处理文件上传
    // 目前返回模拟响应
    return {
      statusCode: 501,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: '文件上传功能正在开发中，请稍后再试',
        message: 'File upload feature is under development'
      })
    };
  } catch (error) {
    throw new Error(`上传简历失败: ${error.message}`);
  }
}