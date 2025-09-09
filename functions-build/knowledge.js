/**
 * 知识库管理API端点
 * Netlify Function for knowledge base management
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
      // 获取知识库统计信息
      if (requestPath.includes('/stats')) {
        return await getKnowledgeStats();
      }
      
      // 获取知识库健康状态
      if (requestPath.includes('/health')) {
        return await getKnowledgeHealth();
      }
      
      // 搜索知识库
      if (requestPath.includes('/search')) {
        return await searchKnowledge(queryStringParameters);
      }
      
      // 获取文档详情
      const docIdMatch = requestPath.match(/\/documents\/([^/]+)$/);
      if (docIdMatch) {
        const docId = docIdMatch[1];
        return await getDocumentById(docId);
      }
      
      // 获取文档分块
      const chunksMatch = requestPath.match(/\/documents\/([^/]+)\/chunks$/);
      if (chunksMatch) {
        const docId = chunksMatch[1];
        return await getDocumentChunks(docId);
      }
      
      // 下载文档
      const downloadMatch = requestPath.match(/\/documents\/([^/]+)\/download$/);
      if (downloadMatch) {
        const docId = downloadMatch[1];
        return await downloadDocument(docId);
      }
      
      // 获取文档列表
      if (requestPath.includes('/documents')) {
        return await getDocumentsList(queryStringParameters);
      }
    }
    
    if (httpMethod === 'POST') {
      // 文档上传
      if (requestPath.includes('/upload')) {
        return await uploadDocument(body);
      }
      
      // 知识检索
      if (requestPath.includes('/retrieve')) {
        return await retrieveKnowledge(body);
      }
      
      // 知识库聊天
      if (requestPath.includes('/chat')) {
        return await chatWithKnowledge(body);
      }
      
      // 重新处理文档
      if (requestPath.includes('/reprocess')) {
        return await reprocessDocument(body);
      }
    }
    
    if (httpMethod === 'DELETE') {
      // 删除文档
      const docIdMatch = requestPath.match(/\/documents\/([^/]+)$/);
      if (docIdMatch) {
        const docId = docIdMatch[1];
        return await deleteDocument(docId);
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Route not found' })
    };

  } catch (error) {
    console.error('Knowledge API error:', error);
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
 * 获取文档列表
 * @param {Object} queryParams - 查询参数
 */
async function getDocumentsList(queryParams = {}) {
  try {
    const { companyId, page = 1, limit = 10 } = queryParams;
    
    // TODO: 集成Supabase后，从数据库查询文档列表
    const mockDocuments = [
      {
        id: 'doc_1',
        title: '公司招聘政策文档',
        filename: 'recruitment_policy.pdf',
        companyId: 'company_1',
        size: 2048000,
        status: 'processed',
        chunksCount: 15,
        uploadedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
        metadata: {
          pages: 8,
          language: 'zh-CN',
          type: 'policy'
        }
      },
      {
        id: 'doc_2',
        title: '技术面试指南',
        filename: 'tech_interview_guide.docx',
        companyId: 'company_1',
        size: 1536000,
        status: 'processed',
        chunksCount: 12,
        uploadedAt: new Date(Date.now() - 86400000).toISOString(),
        processedAt: new Date(Date.now() - 86400000).toISOString(),
        metadata: {
          pages: 6,
          language: 'zh-CN',
          type: 'guide'
        }
      }
    ];

    // 根据公司ID过滤
    let filteredDocs = mockDocuments;
    if (companyId) {
      filteredDocs = filteredDocs.filter(doc => doc.companyId === companyId);
    }

    // 分页处理
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;
    const paginatedDocs = filteredDocs.slice(startIndex, endIndex);

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: paginatedDocs,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredDocs.length,
          totalPages: Math.ceil(filteredDocs.length / limitNum)
        }
      })
    };
  } catch (error) {
    throw new Error(`获取文档列表失败: ${error.message}`);
  }
}

/**
 * 根据ID获取文档详情
 * @param {string} docId - 文档ID
 */
async function getDocumentById(docId) {
  try {
    // TODO: 集成Supabase后，从数据库查询特定文档
    const mockDocument = {
      id: docId,
      title: '公司招聘政策文档',
      filename: 'recruitment_policy.pdf',
      companyId: 'company_1',
      size: 2048000,
      status: 'processed',
      chunksCount: 15,
      uploadedAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      metadata: {
        pages: 8,
        language: 'zh-CN',
        type: 'policy',
        summary: '本文档详细描述了公司的招聘流程、标准和政策要求。'
      },
      processingLog: [
        {
          step: 'upload',
          status: 'completed',
          timestamp: new Date().toISOString(),
          message: '文档上传成功'
        },
        {
          step: 'extract',
          status: 'completed',
          timestamp: new Date().toISOString(),
          message: '文本提取完成'
        },
        {
          step: 'chunk',
          status: 'completed',
          timestamp: new Date().toISOString(),
          message: '文档分块完成，共生成15个分块'
        },
        {
          step: 'embed',
          status: 'completed',
          timestamp: new Date().toISOString(),
          message: '向量化完成'
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
        data: mockDocument
      })
    };
  } catch (error) {
    throw new Error(`获取文档详情失败: ${error.message}`);
  }
}

/**
 * 获取文档分块
 * @param {string} docId - 文档ID
 */
async function getDocumentChunks(docId) {
  try {
    // TODO: 集成Supabase后，从数据库查询文档分块
    const mockChunks = [
      {
        id: 'chunk_1',
        documentId: docId,
        content: '公司招聘政策概述：本政策适用于所有招聘活动...',
        chunkIndex: 0,
        tokens: 128,
        metadata: {
          page: 1,
          section: '概述'
        }
      },
      {
        id: 'chunk_2',
        documentId: docId,
        content: '招聘流程包括以下步骤：1. 需求分析 2. 职位发布...',
        chunkIndex: 1,
        tokens: 156,
        metadata: {
          page: 2,
          section: '招聘流程'
        }
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
        data: mockChunks
      })
    };
  } catch (error) {
    throw new Error(`获取文档分块失败: ${error.message}`);
  }
}

/**
 * 上传文档
 * @param {string} body - 请求体
 */
async function uploadDocument(body) {
  try {
    // TODO: 集成Supabase Storage和文档处理服务
    return {
      statusCode: 501,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: false,
        error: '文档上传功能正在开发中，请稍后再试',
        message: 'Document upload feature is under development'
      })
    };
  } catch (error) {
    throw new Error(`上传文档失败: ${error.message}`);
  }
}

/**
 * 知识检索
 * @param {string} body - 请求体
 */
async function retrieveKnowledge(body) {
  try {
    const { query, companyId, limit = 5 } = JSON.parse(body || '{}');
    
    // TODO: 集成向量数据库进行语义搜索
    const mockResults = [
      {
        id: 'chunk_1',
        content: '关于React开发工程师的招聘要求：需要3年以上React开发经验...',
        score: 0.92,
        document: {
          id: 'doc_1',
          title: '技术岗位招聘标准',
          filename: 'tech_requirements.pdf'
        },
        metadata: {
          page: 3,
          section: 'React开发工程师'
        }
      },
      {
        id: 'chunk_2',
        content: '面试流程包括技术面试、项目经验分享和团队适应性评估...',
        score: 0.87,
        document: {
          id: 'doc_2',
          title: '面试流程指南',
          filename: 'interview_process.docx'
        },
        metadata: {
          page: 1,
          section: '面试流程'
        }
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
        data: {
          query,
          results: mockResults.slice(0, parseInt(limit)),
          total: mockResults.length
        }
      })
    };
  } catch (error) {
    throw new Error(`知识检索失败: ${error.message}`);
  }
}

/**
 * 知识库聊天
 * @param {string} body - 请求体
 */
async function chatWithKnowledge(body) {
  try {
    const { message, companyId, conversationId } = JSON.parse(body || '{}');
    
    // TODO: 集成LLM服务进行知识库问答
    const mockResponse = {
      id: `msg_${Date.now()}`,
      message: '根据公司招聘政策文档，React开发工程师的招聘要求包括：\n\n1. 3年以上React开发经验\n2. 熟悉JavaScript、TypeScript\n3. 了解Redux、MobX等状态管理\n4. 有团队协作经验\n\n面试流程包括技术面试、项目经验分享和团队适应性评估三个环节。',
      conversationId: conversationId || `conv_${Date.now()}`,
      sources: [
        {
          documentId: 'doc_1',
          title: '技术岗位招聘标准',
          chunkId: 'chunk_1',
          relevance: 0.92
        },
        {
          documentId: 'doc_2',
          title: '面试流程指南',
          chunkId: 'chunk_2',
          relevance: 0.87
        }
      ],
      timestamp: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: mockResponse
      })
    };
  } catch (error) {
    throw new Error(`知识库聊天失败: ${error.message}`);
  }
}

/**
 * 搜索知识库
 * @param {Object} queryParams - 查询参数
 */
async function searchKnowledge(queryParams = {}) {
  try {
    const { q: query, companyId, type, limit = 10 } = queryParams;
    
    if (!query) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          error: '缺少查询参数'
        })
      };
    }

    // TODO: 集成全文搜索功能
    const mockResults = [
      {
        id: 'result_1',
        type: 'document',
        title: '技术岗位招聘标准',
        content: '...React开发工程师招聘要求...',
        score: 0.95,
        highlight: '...React开发工程师...'
      },
      {
        id: 'result_2',
        type: 'chunk',
        title: '面试流程指南 - 技术面试',
        content: '...技术面试环节的具体要求...',
        score: 0.88,
        highlight: '...技术面试...'
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
        data: {
          query,
          results: mockResults.slice(0, parseInt(limit)),
          total: mockResults.length
        }
      })
    };
  } catch (error) {
    throw new Error(`搜索知识库失败: ${error.message}`);
  }
}

/**
 * 获取知识库统计信息
 */
async function getKnowledgeStats() {
  try {
    // TODO: 集成Supabase后，从数据库统计知识库信息
    const mockStats = {
      documents: {
        total: 25,
        processed: 23,
        processing: 1,
        failed: 1
      },
      chunks: {
        total: 342,
        embedded: 340,
        pending: 2
      },
      storage: {
        totalSize: 52428800, // 50MB
        documentsSize: 48234496,
        indexSize: 4194304
      },
      activity: {
        uploadsToday: 3,
        queriesThisWeek: 127,
        lastActivity: new Date().toISOString()
      }
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
    throw new Error(`获取知识库统计失败: ${error.message}`);
  }
}

/**
 * 获取知识库健康状态
 */
async function getKnowledgeHealth() {
  try {
    const mockHealth = {
      status: 'healthy',
      services: {
        database: { status: 'up', responseTime: 45 },
        vectorStore: { status: 'up', responseTime: 23 },
        llmService: { status: 'up', responseTime: 156 },
        storage: { status: 'up', responseTime: 12 }
      },
      lastCheck: new Date().toISOString()
    };

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: mockHealth
      })
    };
  } catch (error) {
    throw new Error(`获取知识库健康状态失败: ${error.message}`);
  }
}

/**
 * 下载文档
 * @param {string} docId - 文档ID
 */
async function downloadDocument(docId) {
  try {
    // TODO: 集成Supabase Storage进行文件下载
    return {
      statusCode: 501,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: '文档下载功能正在开发中，请稍后再试',
        message: 'Document download feature is under development'
      })
    };
  } catch (error) {
    throw new Error(`下载文档失败: ${error.message}`);
  }
}

/**
 * 删除文档
 * @param {string} docId - 文档ID
 */
async function deleteDocument(docId) {
  try {
    // TODO: 集成Supabase后，从数据库和存储中删除文档
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: '文档删除成功'
      })
    };
  } catch (error) {
    throw new Error(`删除文档失败: ${error.message}`);
  }
}

/**
 * 重新处理文档
 * @param {string} body - 请求体
 */
async function reprocessDocument(body) {
  try {
    const { documentId } = JSON.parse(body || '{}');
    
    // TODO: 集成文档处理服务
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: '文档重新处理任务已启动',
        data: {
          documentId,
          status: 'processing',
          startedAt: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    throw new Error(`重新处理文档失败: ${error.message}`);
  }
}