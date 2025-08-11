const DatabaseManager = require('./src/database/init');
const PersistentVectorService = require('./src/services/persistentVectorService');

async function testVectorFix() {
  console.log('🧪 开始测试向量化修复效果...\n');

  try {
    // 初始化数据库
    const dbManager = new DatabaseManager();
    await dbManager.init();
    console.log('✅ 数据库初始化成功');

    // 初始化向量化服务
    const vectorService = new PersistentVectorService(dbManager);
    await vectorService.initTables();
    console.log('✅ 向量化服务初始化成功');

    // 测试1: 向量维度一致性
    console.log('\n📝 测试1: 向量维度一致性');
    const testTexts = [
      '邮箱系统账号配置',
      '产品开发流程指南',
      '招聘前端开发工程师',
      'Python后端开发岗位'
    ];

    const embeddings = await vectorService.getEmbeddings(testTexts);
    console.log(`📊 生成的向量数量: ${embeddings.length}`);
    
    for (let i = 0; i < embeddings.length; i++) {
      console.log(`  向量 ${i + 1} 维度: ${embeddings[i].length}`);
    }

    // 测试2: 余弦相似度计算
    console.log('\n📝 测试2: 余弦相似度计算');
    const query = '邮箱系统账号配置';
    const queryEmbedding = await vectorService.getEmbeddings(query);
    console.log(`查询向量维度: ${queryEmbedding.length}`);

    for (let i = 0; i < embeddings.length; i++) {
      const similarity = vectorService.cosineSimilarity(queryEmbedding, embeddings[i]);
      console.log(`  与向量 ${i + 1} 的相似度: ${similarity.toFixed(4)}`);
    }

    // 测试3: 文档存储和检索
    console.log('\n📝 测试3: 文档存储和检索');
    const documentId = 'test-fix-doc-1';
    const metadata = { document_title: '测试文档', company_id: 'test-company' };

    try {
      await vectorService.storeDocumentVectors(testTexts, documentId, metadata);
      console.log('✅ 文档向量存储成功');

      // 测试检索
      const results = await vectorService.retrieveSimilar(query, 3);
      console.log(`✅ 检索成功，找到 ${results.length} 个结果`);
      
      for (let i = 0; i < results.length; i++) {
        console.log(`  ${i + 1}. 相似度: ${results[i].similarity.toFixed(4)}`);
        console.log(`     内容: ${results[i].content.substring(0, 50)}...`);
      }
    } catch (error) {
      console.error('❌ 文档存储或检索失败:', error.message);
    }

    // 测试4: 混合搜索
    console.log('\n📝 测试4: 混合搜索');
    try {
      const hybridResults = await vectorService.hybridSearch(query, 3);
      console.log(`✅ 混合搜索成功，找到 ${hybridResults.length} 个结果`);
      
      for (let i = 0; i < hybridResults.length; i++) {
        console.log(`  ${i + 1}. 相似度: ${hybridResults[i].similarity.toFixed(4)}`);
        console.log(`     内容: ${hybridResults[i].content.substring(0, 50)}...`);
      }
    } catch (error) {
      console.error('❌ 混合搜索失败:', error.message);
    }

    // 测试5: 关键词搜索
    console.log('\n📝 测试5: 关键词搜索');
    try {
      const keywordResults = await vectorService.keywordSearch(query, 3);
      console.log(`✅ 关键词搜索成功，找到 ${keywordResults.length} 个结果`);
      
      for (let i = 0; i < keywordResults.length; i++) {
        console.log(`  ${i + 1}. 相似度: ${keywordResults[i].similarity.toFixed(4)}`);
        console.log(`     内容: ${keywordResults[i].content.substring(0, 50)}...`);
      }
    } catch (error) {
      console.error('❌ 关键词搜索失败:', error.message);
    }

    // 获取统计信息
    console.log('\n📊 服务统计信息:');
    const stats = await vectorService.getStats();
    console.log(`  总向量数: ${stats.totalEmbeddings}`);
    console.log(`  词汇表大小: ${stats.vocabularySize}`);
    console.log(`  文档数量: ${stats.documentCount}`);

    console.log('\n🎉 向量化修复测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testVectorFix(); 