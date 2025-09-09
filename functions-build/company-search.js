/**
 * 公司搜索和分析API端点
 * Netlify Function for company search and analysis
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
      // 搜索公司
      if (requestPath.includes('/search')) {
        return await searchCompanies(queryStringParameters);
      }
      
      // 获取公司详情
      if (requestPath.includes('/company/')) {
        const companyId = requestPath.split('/company/')[1];
        return await getCompanyDetails(companyId);
      }
      
      // 获取公司分析报告
      if (requestPath.includes('/analysis/')) {
        const companyId = requestPath.split('/analysis/')[1];
        return await getCompanyAnalysis(companyId);
      }
      
      // 获取行业分析
      if (requestPath.includes('/industry-analysis')) {
        return await getIndustryAnalysis(queryStringParameters);
      }
      
      // 获取搜索历史
      if (requestPath.includes('/search-history')) {
        return await getSearchHistory(queryStringParameters);
      }
    }
    
    if (httpMethod === 'POST') {
      // 添加公司到关注列表
      if (requestPath.includes('/follow')) {
        return await followCompany(body);
      }
      
      // 批量分析公司
      if (requestPath.includes('/batch-analysis')) {
        return await batchAnalyzeCompanies(body);
      }
      
      // 保存搜索条件
      if (requestPath.includes('/save-search')) {
        return await saveSearchCriteria(body);
      }
    }
    
    if (httpMethod === 'DELETE') {
      // 取消关注公司
      if (requestPath.includes('/unfollow/')) {
        const companyId = requestPath.split('/unfollow/')[1];
        return await unfollowCompany(companyId);
      }
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Route not found' })
    };

  } catch (error) {
    console.error('Company Search API error:', error);
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
 * 搜索公司
 * @param {Object} queryParams - 查询参数
 */
async function searchCompanies(queryParams) {
  try {
    const {
      keyword = '',
      industry = '',
      location = '',
      size = '',
      funding = '',
      page = 1,
      limit = 20,
      sortBy = 'relevance'
    } = queryParams || {};
    
    // TODO: 集成实际的公司搜索服务（如企查查、天眼查等）
    // 这里返回模拟数据
    const mockCompanies = [
      {
        id: 'company_001',
        name: '阿里巴巴集团',
        englishName: 'Alibaba Group',
        logo: 'https://example.com/alibaba-logo.png',
        industry: '互联网/电子商务',
        location: '杭州',
        size: '10000+',
        funding: '已上市',
        establishedYear: 1999,
        description: '全球领先的电子商务和云计算公司',
        website: 'https://www.alibaba.com',
        stockCode: 'BABA',
        registeredCapital: '1200000万人民币',
        legalRepresentative: '张勇',
        businessScope: '互联网信息服务、电子商务、云计算服务',
        tags: ['电商', '云计算', '金融科技', '物流'],
        rating: 4.5,
        employeeCount: 254941,
        annualRevenue: '7172.89亿人民币',
        headquarters: '浙江省杭州市余杭区文一西路969号',
        subsidiaries: ['淘宝', '天猫', '支付宝', '菜鸟网络'],
        keyMetrics: {
          marketCap: '2.1万亿人民币',
          peRatio: 12.5,
          growthRate: 8.5,
          profitMargin: 15.2
        }
      },
      {
        id: 'company_002',
        name: '腾讯控股有限公司',
        englishName: 'Tencent Holdings Limited',
        logo: 'https://example.com/tencent-logo.png',
        industry: '互联网/游戏',
        location: '深圳',
        size: '10000+',
        funding: '已上市',
        establishedYear: 1998,
        description: '中国领先的互联网增值服务提供商',
        website: 'https://www.tencent.com',
        stockCode: '00700.HK',
        registeredCapital: '25000万人民币',
        legalRepresentative: '马化腾',
        businessScope: '互联网信息服务、游戏开发、社交网络',
        tags: ['社交', '游戏', '金融科技', '云服务'],
        rating: 4.3,
        employeeCount: 116213,
        annualRevenue: '5601.18亿人民币',
        headquarters: '广东省深圳市南山区科技中一路腾讯大厦',
        subsidiaries: ['微信', 'QQ', '腾讯游戏', '腾讯云'],
        keyMetrics: {
          marketCap: '3.2万亿港币',
          peRatio: 18.7,
          growthRate: 12.1,
          profitMargin: 22.8
        }
      }
    ];
    
    // 模拟搜索过滤
    let filteredCompanies = mockCompanies;
    if (keyword) {
      filteredCompanies = filteredCompanies.filter(company => 
        company.name.includes(keyword) || 
        company.englishName.toLowerCase().includes(keyword.toLowerCase()) ||
        company.description.includes(keyword)
      );
    }
    
    if (industry) {
      filteredCompanies = filteredCompanies.filter(company => 
        company.industry.includes(industry)
      );
    }
    
    if (location) {
      filteredCompanies = filteredCompanies.filter(company => 
        company.location.includes(location)
      );
    }
    
    // 分页处理
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedCompanies = filteredCompanies.slice(startIndex, endIndex);
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        data: {
          companies: paginatedCompanies,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: filteredCompanies.length,
            totalPages: Math.ceil(filteredCompanies.length / parseInt(limit))
          },
          searchCriteria: {
            keyword,
            industry,
            location,
            size,
            funding,
            sortBy
          }
        }
      })
    };
  } catch (error) {
    throw new Error(`搜索公司失败: ${error.message}`);
  }
}

/**
 * 获取公司详情
 * @param {string} companyId - 公司ID
 */
async function getCompanyDetails(companyId) {
  try {
    // TODO: 从数据库或外部API获取公司详情
    const mockCompanyDetails = {
      id: companyId,
      basicInfo: {
        name: '阿里巴巴集团',
        englishName: 'Alibaba Group',
        logo: 'https://example.com/alibaba-logo.png',
        industry: '互联网/电子商务',
        location: '杭州',
        establishedDate: '1999-04-04',
        registeredCapital: '1200000万人民币',
        legalRepresentative: '张勇',
        businessScope: '互联网信息服务、电子商务、云计算服务',
        website: 'https://www.alibaba.com',
        phone: '0571-85022088',
        email: 'ir@alibaba-inc.com',
        address: '浙江省杭州市余杭区文一西路969号'
      },
      financialInfo: {
        stockCode: 'BABA',
        marketCap: '2.1万亿人民币',
        annualRevenue: '7172.89亿人民币',
        netProfit: '1363.94亿人民币',
        totalAssets: '1.8万亿人民币',
        peRatio: 12.5,
        pbRatio: 1.8,
        roe: 15.2,
        debtRatio: 0.35,
        currentRatio: 2.1
      },
      operationalInfo: {
        employeeCount: 254941,
        subsidiaries: ['淘宝', '天猫', '支付宝', '菜鸟网络', '阿里云'],
        businessSegments: [
          { name: '中国商业', revenue: '4021.2亿', percentage: 56.1 },
          { name: '国际商业', revenue: '842.1亿', percentage: 11.7 },
          { name: '本地生活服务', revenue: '495.2亿', percentage: 6.9 },
          { name: '菜鸟', revenue: '594.9亿', percentage: 8.3 },
          { name: '云计算', revenue: '1001.8亿', percentage: 14.0 },
          { name: '数字媒体娱乐', revenue: '217.7亿', percentage: 3.0 }
        ],
        keyProducts: [
          '淘宝网', '天猫', '1688', 'AliExpress', '支付宝', '阿里云', '钉钉', '高德地图'
        ]
      },
      competitiveInfo: {
        mainCompetitors: [
          { name: '腾讯', marketShare: 25.3, relationship: '直接竞争' },
          { name: '京东', marketShare: 18.7, relationship: '电商竞争' },
          { name: '美团', marketShare: 12.4, relationship: '本地服务竞争' },
          { name: '拼多多', marketShare: 15.2, relationship: '电商竞争' }
        ],
        marketPosition: '市场领导者',
        competitiveAdvantages: [
          '生态系统完整性',
          '技术创新能力',
          '用户规模优势',
          '数据资产丰富',
          '国际化布局'
        ]
      },
      riskAssessment: {
        overallRisk: 'medium',
        riskFactors: [
          { type: '监管风险', level: 'high', description: '反垄断监管加强' },
          { type: '竞争风险', level: 'medium', description: '市场竞争激烈' },
          { type: '技术风险', level: 'low', description: '技术迭代风险' },
          { type: '财务风险', level: 'low', description: '财务状况良好' }
        ],
        creditRating: 'AAA',
        esgScore: 85
      },
      recentNews: [
        {
          title: '阿里巴巴发布2024财年第三季度业绩',
          date: '2024-02-07',
          source: '财经网',
          summary: '营收同比增长5%，云计算业务表现亮眼'
        },
        {
          title: '阿里云在AI领域加大投入',
          date: '2024-01-15',
          source: '科技日报',
          summary: '推出新一代AI模型，加强企业服务能力'
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
        data: mockCompanyDetails
      })
    };
  } catch (error) {
    throw new Error(`获取公司详情失败: ${error.message}`);
  }
}

/**
 * 获取公司分析报告
 * @param {string} companyId - 公司ID
 */
async function getCompanyAnalysis(companyId) {
  try {
    // TODO: 生成实际的公司分析报告
    const mockAnalysis = {
      companyId,
      analysisDate: new Date().toISOString(),
      overallScore: 85,
      scoreBreakdown: {
        financial: 88,
        operational: 82,
        market: 90,
        management: 85,
        innovation: 87,
        sustainability: 80
      },
      strengths: [
        '强大的生态系统和平台效应',
        '领先的云计算和AI技术',
        '多元化的业务组合',
        '优秀的管理团队和企业文化',
        '强劲的现金流和财务状况'
      ],
      weaknesses: [
        '面临监管压力和政策风险',
        '国际业务增长放缓',
        '部分业务盈利能力有待提升',
        '竞争加剧导致获客成本上升'
      ],
      opportunities: [
        'AI和云计算市场快速增长',
        '数字化转型需求增加',
        '新兴市场扩张机会',
        '绿色技术和可持续发展'
      ],
      threats: [
        '监管政策变化',
        '激烈的市场竞争',
        '经济周期性波动',
        '技术变革风险'
      ],
      investmentRecommendation: {
        rating: 'BUY',
        targetPrice: '120 USD',
        timeHorizon: '12个月',
        confidence: 'High',
        reasoning: '基于强劲的基本面和长期增长潜力，建议买入持有'
      },
      keyMetrics: {
        valuation: {
          pe: 12.5,
          pb: 1.8,
          ps: 2.3,
          ev_ebitda: 8.9
        },
        profitability: {
          grossMargin: 42.5,
          operatingMargin: 18.7,
          netMargin: 15.2,
          roe: 15.2,
          roa: 8.9
        },
        growth: {
          revenueGrowth: 5.2,
          profitGrowth: 8.7,
          userGrowth: 12.3,
          marketShareGrowth: 2.1
        },
        financial: {
          currentRatio: 2.1,
          quickRatio: 1.8,
          debtToEquity: 0.35,
          interestCoverage: 15.6
        }
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
        data: mockAnalysis
      })
    };
  } catch (error) {
    throw new Error(`获取公司分析报告失败: ${error.message}`);
  }
}

/**
 * 获取行业分析
 * @param {Object} queryParams - 查询参数
 */
async function getIndustryAnalysis(queryParams) {
  try {
    const { industry = '互联网' } = queryParams || {};
    
    // TODO: 生成实际的行业分析报告
    const mockIndustryAnalysis = {
      industry,
      analysisDate: new Date().toISOString(),
      marketSize: {
        current: '5.2万亿人民币',
        projected2025: '8.1万亿人民币',
        cagr: '9.3%'
      },
      keyPlayers: [
        { name: '阿里巴巴', marketShare: 28.5, rank: 1 },
        { name: '腾讯', marketShare: 25.3, rank: 2 },
        { name: '京东', marketShare: 18.7, rank: 3 },
        { name: '美团', marketShare: 12.4, rank: 4 },
        { name: '拼多多', marketShare: 15.1, rank: 5 }
      ],
      trends: [
        {
          name: 'AI技术应用',
          impact: 'high',
          description: '人工智能在各个业务场景中的深度应用'
        },
        {
          name: '数字化转型',
          impact: 'high',
          description: '传统企业加速数字化转型进程'
        },
        {
          name: '监管合规',
          impact: 'medium',
          description: '行业监管政策日趋完善和严格'
        },
        {
          name: '可持续发展',
          impact: 'medium',
          description: 'ESG理念在互联网行业的实践'
        }
      ],
      challenges: [
        '监管政策不确定性',
        '用户增长放缓',
        '竞争加剧',
        '技术创新压力',
        '数据安全和隐私保护'
      ],
      opportunities: [
        '新兴技术应用',
        '下沉市场开拓',
        '国际化扩张',
        '产业互联网发展',
        '绿色数字经济'
      ],
      forecast: {
        outlook: 'positive',
        growthDrivers: [
          '5G和物联网普及',
          '云计算需求增长',
          'AI技术成熟应用',
          '数字经济政策支持'
        ],
        risks: [
          '宏观经济波动',
          '地缘政治影响',
          '技术变革风险',
          '监管政策变化'
        ]
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
        data: mockIndustryAnalysis
      })
    };
  } catch (error) {
    throw new Error(`获取行业分析失败: ${error.message}`);
  }
}

/**
 * 关注公司
 * @param {string} body - 请求体
 */
async function followCompany(body) {
  try {
    const { companyId, userId, notes } = JSON.parse(body || '{}');
    
    if (!companyId || !userId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          message: '缺少必要参数: companyId 或 userId'
        })
      };
    }
    
    // TODO: 保存关注信息到数据库
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: '公司关注成功',
        data: {
          companyId,
          userId,
          notes,
          followedAt: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    throw new Error(`关注公司失败: ${error.message}`);
  }
}

/**
 * 取消关注公司
 * @param {string} companyId - 公司ID
 */
async function unfollowCompany(companyId) {
  try {
    // TODO: 从数据库删除关注信息
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: '取消关注成功',
        data: {
          companyId,
          unfollowedAt: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    throw new Error(`取消关注公司失败: ${error.message}`);
  }
}

/**
 * 批量分析公司
 * @param {string} body - 请求体
 */
async function batchAnalyzeCompanies(body) {
  try {
    const { companyIds, analysisType = 'basic' } = JSON.parse(body || '{}');
    
    if (!companyIds || !Array.isArray(companyIds)) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          message: '缺少必要参数: companyIds（数组格式）'
        })
      };
    }
    
    // TODO: 实现批量分析逻辑
    const mockBatchResults = companyIds.map(id => ({
      companyId: id,
      status: 'completed',
      score: Math.floor(Math.random() * 40) + 60, // 60-100分
      analysisType,
      completedAt: new Date().toISOString()
    }));
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: '批量分析任务已启动',
        data: {
          taskId: `batch_analysis_${Date.now()}`,
          companyCount: companyIds.length,
          analysisType,
          results: mockBatchResults,
          startedAt: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    throw new Error(`批量分析公司失败: ${error.message}`);
  }
}

/**
 * 保存搜索条件
 * @param {string} body - 请求体
 */
async function saveSearchCriteria(body) {
  try {
    const { name, criteria, userId } = JSON.parse(body || '{}');
    
    if (!name || !criteria || !userId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          message: '缺少必要参数: name, criteria 或 userId'
        })
      };
    }
    
    // TODO: 保存搜索条件到数据库
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        message: '搜索条件保存成功',
        data: {
          id: `search_${Date.now()}`,
          name,
          criteria,
          userId,
          savedAt: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    throw new Error(`保存搜索条件失败: ${error.message}`);
  }
}

/**
 * 获取搜索历史
 * @param {Object} queryParams - 查询参数
 */
async function getSearchHistory(queryParams) {
  try {
    const { userId, page = 1, limit = 10 } = queryParams || {};
    
    if (!userId) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: false,
          message: '缺少必要参数: userId'
        })
      };
    }
    
    // TODO: 从数据库获取搜索历史
    const mockSearchHistory = [
      {
        id: 'search_001',
        name: '互联网独角兽公司',
        criteria: {
          industry: '互联网',
          funding: '独角兽',
          location: '北京,上海,深圳'
        },
        searchCount: 15,
        lastUsed: '2024-02-07T10:30:00Z',
        createdAt: '2024-01-15T09:20:00Z'
      },
      {
        id: 'search_002',
        name: 'AI科技公司',
        criteria: {
          keyword: '人工智能',
          industry: '科技',
          size: '500-9999'
        },
        searchCount: 8,
        lastUsed: '2024-02-05T14:15:00Z',
        createdAt: '2024-01-20T16:45:00Z'
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
          searches: mockSearchHistory,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: mockSearchHistory.length,
            totalPages: Math.ceil(mockSearchHistory.length / parseInt(limit))
          }
        }
      })
    };
  } catch (error) {
    throw new Error(`获取搜索历史失败: ${error.message}`);
  }
}