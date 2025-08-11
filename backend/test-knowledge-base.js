const DatabaseManager = require('./src/database/init');
const KnowledgeService = require('./src/services/knowledgeService');
const LLMService = require('./src/services/llmService');

/**
 * 知识库系统测试脚本
 */
async function testKnowledgeBase() {
  console.log('🚀 开始测试知识库系统...\n');

  try {
    // 1. 初始化数据库
    console.log('1. 初始化数据库...');
    const dbManager = new DatabaseManager();
    await dbManager.init();
    console.log('✅ 数据库初始化成功\n');

    // 2. 初始化服务
    console.log('2. 初始化服务...');
    const knowledgeService = new KnowledgeService(dbManager);
    const llmService = new LLMService();
    console.log('✅ 服务初始化成功\n');

    // 3. 创建测试公司
    console.log('3. 创建测试公司...');
    const companyResult = await dbManager.run(
      'INSERT INTO companies (name, description) VALUES (?, ?)',
      ['测试公司', '用于测试的企业智库系统']
    );
    const companyId = companyResult.id;
    console.log(`✅ 测试公司创建成功，ID: ${companyId}\n`);

    // 4. 测试文档处理（模拟）
    console.log('4. 测试文档处理...');
    const testContent = `
    我们公司是一家专注于人工智能技术研发的创新企业。
    
    公司福利：
    - 五险一金全额缴纳
    - 年终奖金制度
    - 带薪年假15天
    - 免费工作餐
    - 定期团建活动
    
    技术岗位要求：
    - 本科及以上学历
    - 3年以上相关工作经验
    - 熟练掌握Python、JavaScript等编程语言
    - 有机器学习项目经验优先
    
    薪资待遇：
    - 月薪15K-25K
    - 根据能力面议
    - 提供期权激励
    `;

    // 模拟文档上传
    const mockFile = {
      path: '/tmp/test-document.txt',
      mimetype: 'text/plain',
      originalname: '公司介绍.txt',
      size: testContent.length
    };

    const uploadResult = await knowledgeService.uploadDocument(mockFile, companyId, '公司介绍');
    console.log('✅ 文档处理成功:', uploadResult.message, '\n');

    // 5. 测试知识库检索
    console.log('5. 测试知识库检索...');
    const testQueries = [
      '公司福利有哪些？',
      '技术岗位要求是什么？',
      '薪资待遇怎么样？',
      '公司主要做什么的？'
    ];

    for (const query of testQueries) {
      console.log(`查询: "${query}"`);
      const results = await knowledgeService.retrieveKnowledge(query, companyId, 3);
      console.log(`找到 ${results.length} 个相关结果:`);
      
      results.forEach((result, index) => {
        const similarity = (result.similarity * 100).toFixed(1);
        console.log(`  ${index + 1}. 相关度: ${similarity}%`);
        console.log(`     内容: ${result.content.substring(0, 100)}...`);
      });
      console.log('');
    }

    // 6. 测试AI对话
    console.log('6. 测试AI对话...');
    const chatQuery = '我想了解公司的福利待遇';
    const chatResults = await knowledgeService.retrieveKnowledge(chatQuery, companyId, 3);
    const context = knowledgeService.buildContext(chatResults);
    
    console.log('检索到的上下文:');
    console.log(context.substring(0, 300) + '...\n');

    // 模拟AI回答（实际需要LLM服务）
    console.log('AI回答（模拟）:');
    console.log('根据公司知识库信息，我们公司的福利待遇包括：');
    console.log('- 五险一金全额缴纳');
    console.log('- 年终奖金制度');
    console.log('- 带薪年假15天');
    console.log('- 免费工作餐');
    console.log('- 定期团建活动\n');

    // 7. 测试统计信息
    console.log('7. 测试统计信息...');
    const stats = await knowledgeService.getStats(companyId);
    console.log('知识库统计:');
    console.log(`- 文档总数: ${stats.documents.total}`);
    console.log(`- 已处理: ${stats.documents.processed}`);
    console.log(`- 处理失败: ${stats.documents.failed}`);
    console.log(`- 向量总数: ${stats.vectors.totalEmbeddings}`);
    console.log(`- 检索次数: ${stats.retrieval.total_queries}\n`);

    // 8. 测试文档搜索
    console.log('8. 测试文档搜索...');
    const searchResults = await knowledgeService.searchDocuments('福利', companyId, 5);
    console.log(`搜索"福利"找到 ${searchResults.length} 个文档\n`);

    console.log('🎉 所有测试通过！知识库系统运行正常。');

  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error('错误详情:', error.stack);
  }
}

// 运行测试
if (require.main === module) {
  testKnowledgeBase().then(() => {
    console.log('\n测试完成');
    process.exit(0);
  }).catch((error) => {
    console.error('测试异常:', error);
    process.exit(1);
  });
}

module.exports = { testKnowledgeBase }; 