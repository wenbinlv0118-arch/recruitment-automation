const axios = require('axios');

/**
 * 测试知识库问答功能
 */
async function testKnowledgeQA() {
  console.log('🧪 开始测试知识库问答功能...\n');

  const API_BASE = 'http://localhost:5001/api/knowledge';
  const testQueries = [
    '如何进行邮箱系统账号配置？',
    'Windows客户端如何配置邮箱？',
    '如何导入证书？',
    '银河麒麟客户端配置步骤是什么？'
  ];

  for (const query of testQueries) {
    console.log(`📝 测试查询: ${query}`);
    
    try {
      const response = await axios.post(`${API_BASE}/chat`, {
        query: query,
        companyId: '1'
      });

      if (response.data.success) {
        console.log('✅ 查询成功');
        console.log(`🤖 AI回答: ${response.data.data.response.substring(0, 200)}...`);
        console.log(`📚 检索到 ${response.data.data.retrievedDocs?.length || 0} 个相关文档`);
        
        if (response.data.data.context) {
          console.log(`📖 上下文信息: ${response.data.data.context.substring(0, 100)}...`);
        }
      } else {
        console.log('❌ 查询失败:', response.data.error);
      }
    } catch (error) {
      console.log('❌ 请求失败:', error.response?.data?.message || error.message);
    }
    
    console.log('---\n');
  }

  console.log('🎉 知识库问答测试完成！');
}

// 运行测试
testKnowledgeQA().catch(console.error); 