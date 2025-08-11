const KnowledgeService = require('./src/services/knowledgeService');
const DatabaseManager = require('./src/database/init');
const fs = require('fs');

async function reprocessAllDocuments() {
  console.log('🔄 开始重新处理所有文档...\n');
  
  try {
    // 初始化数据库和服务
    const dbManager = new DatabaseManager();
    await dbManager.init();
    
    const knowledgeService = new KnowledgeService(dbManager);
    
    // 获取所有文档
    const documents = await knowledgeService.getDocuments('1');
    console.log(`📄 找到 ${documents.length} 个文档`);
    
    const results = [];
    
    for (const doc of documents) {
      try {
        console.log(`\n🔄 处理文档: ${doc.title} (ID: ${doc.id})`);
        
        // 检查文件是否存在
        if (!fs.existsSync(doc.file_path)) {
          console.log(`⚠️  文件不存在，跳过: ${doc.file_path}`);
          continue;
        }
        
        // 重新处理文档
        const file = {
          path: doc.file_path,
          mimetype: doc.file_type,
          originalname: doc.title,
          size: doc.file_size
        };
        
        const result = await knowledgeService.uploadDocument(file, '1', doc.title);
        console.log(`✅ 处理完成: ${result.message}`);
        
        results.push({ id: doc.id, title: doc.title, status: 'success' });
        
      } catch (error) {
        console.error(`❌ 处理失败: ${doc.title}`, error.message);
        results.push({ id: doc.id, title: doc.title, status: 'failed', error: error.message });
      }
    }
    
    console.log('\n📊 处理结果汇总:');
    results.forEach(result => {
      const status = result.status === 'success' ? '✅' : '❌';
      console.log(`${status} ${result.title}: ${result.status}`);
    });
    
    // 测试检索
    console.log('\n🧪 测试检索...');
    const searchResults = await knowledgeService.retrieveKnowledge('邮箱系统账号', '1', 5);
    console.log(`✅ 检索结果数量: ${searchResults.length}`);
    
    searchResults.forEach((result, index) => {
      console.log(`  ${index + 1}. 相似度: ${result.similarity.toFixed(3)}`);
      console.log(`     内容: ${result.content.substring(0, 100)}...`);
    });
    
  } catch (error) {
    console.error('❌ 重新处理失败:', error.message);
    console.error(error.stack);
  }
}

// 运行脚本
reprocessAllDocuments().catch(console.error); 