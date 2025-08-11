const KnowledgeService = require('./src/services/knowledgeService');
const DatabaseManager = require('./src/database/init');
const fs = require('fs');

async function reprocessEmailDocument() {
  console.log('🔄 开始重新处理邮箱系统文档...\n');
  
  try {
    // 初始化数据库和服务
    const dbManager = new DatabaseManager();
    await dbManager.init();
    
    const knowledgeService = new KnowledgeService(dbManager);
    
    // 获取邮箱系统文档
    const documents = await knowledgeService.getDocuments('1');
    const emailDoc = documents.find(doc => doc.title.includes('邮箱系统账号配置'));
    
    if (!emailDoc) {
      console.error('❌ 未找到邮箱系统文档');
      return;
    }
    
    console.log(`📄 找到文档: ${emailDoc.title} (ID: ${emailDoc.id})`);
    
    // 检查文件是否存在
    if (!fs.existsSync(emailDoc.file_path)) {
      console.error('❌ 文档文件不存在:', emailDoc.file_path);
      return;
    }
    
    // 重新处理文档
    const file = {
      path: emailDoc.file_path,
      mimetype: emailDoc.file_type,
      originalname: emailDoc.title,
      size: emailDoc.file_size
    };
    
    console.log('🔄 开始重新处理...');
    const result = await knowledgeService.uploadDocument(file, '1', emailDoc.title);
    
    console.log('✅ 重新处理完成:', result);
    
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
reprocessEmailDocument().catch(console.error); 