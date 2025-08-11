const VectorServiceSelector = require('./src/services/vectorServiceSelector');
const KnowledgeService = require('./src/services/knowledgeService');
const DatabaseManager = require('./src/database/init');

async function testKnowledgeSearch() {
  console.log('🧪 开始测试知识库搜索...\n');
  
  try {
    // 初始化数据库和服务
    const dbManager = new DatabaseManager();
    await dbManager.init();
    
    const vectorService = new VectorServiceSelector();
    const knowledgeService = new KnowledgeService(dbManager);
    
    // 等待服务初始化
    console.log('⏳ 等待服务初始化...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 检查向量化服务状态
    console.log('\n📊 向量化服务状态:');
    const vectorStats = vectorService.getStats();
    console.log(`  当前服务: ${vectorStats.currentService}`);
    console.log(`  总向量数: ${vectorStats.totalEmbeddings}`);
    console.log(`  总文档块数: ${vectorStats.totalChunks}`);
    console.log(`  使用模拟模式: ${vectorStats.useMockMode}`);
    
    // 测试直接向量化
    console.log('\n📝 测试直接向量化...');
    const testText = '邮箱系统账号配置';
    const embedding = await vectorService.getEmbeddings(testText);
    console.log(`✅ 向量化成功，维度: ${embedding.length}`);
    
    // 测试相似度检索
    console.log('\n📝 测试相似度检索...');
    const results = await vectorService.retrieveSimilar(testText, 5, 0.1);
    console.log(`✅ 检索结果数量: ${results.length}`);
    
    results.forEach((result, index) => {
      console.log(`  ${index + 1}. 相似度: ${result.similarity.toFixed(3)}`);
      console.log(`     内容: ${result.content.substring(0, 100)}...`);
      console.log(`     元数据: ${JSON.stringify(result.metadata)}`);
    });
    
    // 测试知识库检索
    console.log('\n📝 测试知识库检索...');
    const knowledgeResults = await knowledgeService.retrieveKnowledge(testText, '1', 5);
    console.log(`✅ 知识库检索结果数量: ${knowledgeResults.length}`);
    
    knowledgeResults.forEach((result, index) => {
      console.log(`  ${index + 1}. 相似度: ${result.similarity.toFixed(3)}`);
      console.log(`     内容: ${result.content.substring(0, 100)}...`);
    });
    
    // 测试混合搜索
    console.log('\n📝 测试混合搜索...');
    const hybridResults = await vectorService.hybridSearch(testText, 5);
    console.log(`✅ 混合搜索结果数量: ${hybridResults.length}`);
    
    // 测试关键词搜索
    console.log('\n📝 测试关键词搜索...');
    const keywordResults = await vectorService.keywordSearch(testText, 5);
    console.log(`✅ 关键词搜索结果数量: ${keywordResults.length}`);
    
    console.log('\n🎉 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error(error.stack);
  }
}

// 运行测试
testKnowledgeSearch().catch(console.error); 