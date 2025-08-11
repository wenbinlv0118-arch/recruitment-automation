const VectorServiceSelector = require('./src/services/vectorServiceSelector');

async function testEnhancedVectorServiceSelector() {
  console.log('🧪 开始测试增强版向量化服务选择器...\n');
  
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
    console.log(`  缓存命中率: ${status.cache.cacheHitRate}`);
    
    // 测试向量化功能（第一次调用，应该缓存未命中）
    console.log('\n📝 第一次测试向量化功能（缓存未命中）...');
    const startTime1 = Date.now();
    const singleEmbedding1 = await selector.getEmbeddings(testTexts[0]);
    const time1 = Date.now() - startTime1;
    console.log(`✅ 单个文本向量化成功，向量维度: ${singleEmbedding1.length}，耗时: ${time1}ms`);
    
    // 第二次调用相同文本（应该缓存命中）
    console.log('\n📝 第二次测试相同文本（缓存命中）...');
    const startTime2 = Date.now();
    const singleEmbedding2 = await selector.getEmbeddings(testTexts[0]);
    const time2 = Date.now() - startTime2;
    console.log(`✅ 缓存命中，向量化成功，耗时: ${time2}ms`);
    console.log(`🚀 性能提升: ${Math.round((time1 - time2) / time1 * 100)}%`);
    
    // 测试批量向量化
    console.log('\n📝 测试批量向量化...');
    const batchEmbeddings = await selector.getEmbeddings(testTexts);
    console.log(`✅ 批量文本向量化成功，向量数量: ${batchEmbeddings.length}`);
    
    // 测试文档存储和检索
    console.log('\n📝 测试文档存储和检索...');
    await selector.storeDocumentVectors(testTexts, 'test-doc-1', {
      title: '招聘信息文档',
      category: '技术岗位'
    });
    console.log('✅ 文档向量存储成功');
    
    // 测试相似度检索（第一次，缓存未命中）
    console.log('\n📝 第一次测试相似度检索（缓存未命中）...');
    const query = '前端开发';
    const startTime3 = Date.now();
    const results1 = await selector.retrieveSimilar(query, 3);
    const time3 = Date.now() - startTime3;
    console.log(`✅ 相似度检索成功，找到 ${results1.length} 个结果，耗时: ${time3}ms`);
    
    // 第二次相同检索（缓存命中）
    console.log('\n📝 第二次测试相同检索（缓存命中）...');
    const startTime4 = Date.now();
    const results2 = await selector.retrieveSimilar(query, 3);
    const time4 = Date.now() - startTime4;
    console.log(`✅ 缓存命中，检索成功，耗时: ${time4}ms`);
    console.log(`🚀 性能提升: ${Math.round((time3 - time4) / time3 * 100)}%`);
    
    results1.forEach((result, index) => {
      console.log(`  ${index + 1}. 相似度: ${result.similarity.toFixed(3)}, 内容: ${result.content.substring(0, 50)}...`);
    });
    
    // 测试混合搜索
    const hybridResults = await selector.hybridSearch(query, 3);
    console.log(`✅ 混合搜索成功，找到 ${hybridResults.length} 个结果`);
    
    // 测试缓存管理
    console.log('\n🔧 测试缓存管理...');
    const cacheStats = selector.manageCache('stats');
    console.log('📊 缓存统计:');
    console.log(`  向量缓存: ${cacheStats.embeddingCache.size}/${cacheStats.embeddingCache.maxSize}`);
    console.log(`  搜索缓存: ${cacheStats.searchCache.size}/${cacheStats.searchCache.maxSize}`);
    console.log(`  总请求数: ${cacheStats.performance.totalRequests}`);
    console.log(`  缓存命中: ${cacheStats.performance.cacheHits}`);
    console.log(`  缓存未命中: ${cacheStats.performance.cacheMisses}`);
    
    // 获取详细统计信息
    const stats = selector.getStats();
    console.log('\n📊 详细统计信息:');
    console.log(`  当前服务: ${stats.currentService}`);
    console.log(`  总向量数: ${stats.totalEmbeddings}`);
    console.log(`  总文档块数: ${stats.totalChunks}`);
    console.log(`  内存使用: ${Math.round(stats.memoryUsage.heapUsed / 1024 / 1024)}MB`);
    console.log(`  平均响应时间: ${stats.performance.averageResponseTime}`);
    console.log(`  缓存命中率: ${stats.cache.cacheHitRate}`);
    
    if (stats.vocabularySize) {
      console.log(`  词汇表大小: ${stats.vocabularySize}`);
    }
    if (stats.documentCount) {
      console.log(`  文档数量: ${stats.documentCount}`);
    }
    
    // 测试缓存清理
    console.log('\n🧹 测试缓存清理...');
    selector.manageCache('clear', 'embedding');
    const afterClearStats = selector.manageCache('stats');
    console.log(`✅ 向量缓存已清空，当前大小: ${afterClearStats.embeddingCache.size}`);
    
    console.log('\n🎉 所有增强功能测试通过！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testEnhancedVectorServiceSelector().catch(console.error);
