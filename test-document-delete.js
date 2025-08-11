const API_BASE = 'http://localhost:5001/api/knowledge';

async function testDocumentDelete() {
  try {
    console.log('=== 测试文档删除功能 ===\n');

    // 1. 获取文档列表
    console.log('1. 获取文档列表...');
    const listResponse = await fetch(`${API_BASE}/documents?companyId=1`);
    const listData = await listResponse.json();
    
    if (!listData.success) {
      console.error('获取文档列表失败');
      return;
    }

    const documents = listData.data;
    console.log(`找到 ${documents.length} 个文档`);

    // 显示文档列表
    documents.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.title} (状态: ${doc.status})`);
    });

    if (documents.length === 0) {
      console.log('没有文档可删除，测试结束');
      return;
    }

    // 2. 测试删除处理中的文档
    const processingDocs = documents.filter(doc => doc.status === 'processing');
    if (processingDocs.length > 0) {
      console.log(`\n2. 测试删除处理中的文档: ${processingDocs[0].title}`);
      
      const deleteResponse = await fetch(`${API_BASE}/documents/${processingDocs[0].id}`, {
        method: 'DELETE'
      });
      const deleteData = await deleteResponse.json();
      
      if (deleteData.success) {
        console.log('✅ 处理中文档删除成功:', deleteData.data.message);
      } else {
        console.log('❌ 处理中文档删除失败');
      }
    } else {
      console.log('\n2. 没有处理中的文档，跳过测试');
    }

    // 3. 测试删除已处理的文档
    const processedDocs = documents.filter(doc => doc.status === 'processed');
    if (processedDocs.length > 0) {
      console.log(`\n3. 测试删除已处理的文档: ${processedDocs[0].title}`);
      
      const deleteResponse = await fetch(`${API_BASE}/documents/${processedDocs[0].id}`, {
        method: 'DELETE'
      });
      const deleteData = await deleteResponse.json();
      
      if (deleteData.success) {
        console.log('✅ 已处理文档删除成功:', deleteData.data.message);
      } else {
        console.log('❌ 已处理文档删除失败');
      }
    } else {
      console.log('\n3. 没有已处理的文档，跳过测试');
    }

    // 4. 验证删除结果
    console.log('\n4. 验证删除结果...');
    const verifyResponse = await fetch(`${API_BASE}/documents?companyId=1`);
    const verifyData = await verifyResponse.json();
    
    if (verifyData.success) {
      const remainingDocs = verifyData.data;
      console.log(`删除后剩余 ${remainingDocs.length} 个文档`);
      
      remainingDocs.forEach((doc, index) => {
        console.log(`${index + 1}. ${doc.title} (状态: ${doc.status})`);
      });
    }

    console.log('\n=== 测试完成 ===');

  } catch (error) {
    console.error('测试过程中出错:', error.message);
  }
}

// 运行测试
testDocumentDelete(); 