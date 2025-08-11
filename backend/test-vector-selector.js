const VectorServiceSelector = require('./src/services/vectorServiceSelector');

async function testVectorServiceSelector() {
  console.log('🧪 开始测试向量化服务选择器...\n');
  
  const selector = new VectorServiceSelector();
  
  // 等待服务初始化
  console.log('⏳ 等待服务初始化...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 测试文本
  const testTexts = [
    '招聘前端开发工程师，需要React和Vue.js经验',
    'Python后端开发岗位，熟悉Django和Flask框架',
    '机器学习算法工程师，要求掌握TensorFlow和PyTorch',
    '产品经理职位招聘，需要有互联网产品设计经验',
    'UI设计师岗位，熟练使用Figma和Sketch设计工具'
  ];
  
  try {
    // 显示服务状态
    console.log('\n📊 服务状态:');
    const status = selector.getServiceStatus();
    console.log(`  当前服务: ${status.currentService}`);
    console.log(`  可用服务: ${status.availableServices.map(s => s.name).join(', ')}`);
    console.log(`  服务优先级: ${status.servicePriority.join(' > ')}`);
    
    // 测试向量化功能
    console.log('\n📝 测试向量化功能...');
    const singleEmbedding = await selector.getEmbeddings(testTexts[0]);
    console.log(`✅ 单个文本向量化成功，向量维度: ${singleEmbedding.length}`);
    
    const batchEmbeddings = await selector.getEmbeddings(testTexts);
    console.log(`✅ 批量文本向量化成功，向量数量: ${batchEmbeddings.length}`);
    
    // 测试文档存储和检索
    console.log('\n📝 测试文档存储和检索...');
    await selector.storeDocumentVectors(testTexts, 'test-doc-1', {
      title: '招聘信息文档',
      category: '技术岗位'
    });
    console.log('✅ 文档向量存储成功');
    
    // 测试相似度检索
    const query = '前端开发';
    const results = await selector.retrieveSimilar(query, 3);
    console.log(`✅ 相似度检索成功，找到 ${results.length} 个结果`);
    
    results.forEach((result, index) => {
      console.log(`  ${index + 1}. 相似度: ${result.similarity.toFixed(3)}, 内容: ${result.content.substring(0, 50)}...`);
    });
    
    // 测试混合搜索
    const hybridResults = await selector.hybridSearch(query, 3);
    console.log(`✅ 混合搜索成功，找到 ${hybridResults.length} 个结果`);
    
    // 获取统计信息
    const stats = selector.getStats();
    console.log('\n📊 详细统计信息:');
    console.log(`  当前服务: ${stats.currentService}`);
    console.log(`  总向量数: ${stats.totalEmbeddings}`);
    console.log(`  总文档块数: ${stats.totalChunks}`);
    console.log(`  内存使用: ${Math.round(stats.memoryUsage.heapUsed / 1024 / 1024)}MB`);
    
    if (stats.vocabularySize) {
      console.log(`  词汇表大小: ${stats.vocabularySize}`);
    }
    if (stats.documentCount) {
      console.log(`  文档数量: ${stats.documentCount}`);
    }
    
    console.log('\n🎉 所有测试通过！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testVectorServiceSelector().catch(console.error); 