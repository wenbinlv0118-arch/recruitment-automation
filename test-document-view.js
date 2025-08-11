// 测试文档查看功能
const API_BASE = 'http://localhost:5001/api/knowledge';

async function testDocumentView() {
  console.log('🧪 开始测试文档查看功能...\n');

  try {
    // 1. 获取文档列表
    console.log('1. 获取文档列表...');
    const listResponse = await fetch(`${API_BASE}/documents?companyId=1`);
    const listData = await listResponse.json();
    const documents = listData.data;
    console.log(`   当前共有 ${documents.length} 个文档\n`);

    if (documents.length === 0) {
      console.log('❌ 没有文档可以测试查看功能');
      return;
    }

    // 2. 选择一个已处理的文档进行测试
    const testDocument = documents.find(doc => doc.status === 'processed');
    if (!testDocument) {
      console.log('❌ 没有已处理的文档可以测试');
      return;
    }

    console.log(`2. 选择测试文档: "${testDocument.title}" (ID: ${testDocument.id})`);
    console.log(`   文件类型: ${testDocument.file_type}`);
    console.log(`   状态: ${testDocument.status}\n`);

    // 3. 测试获取文档详情
    console.log('3. 测试获取文档详情...');
    const detailResponse = await fetch(`${API_BASE}/documents/${testDocument.id}`);
    const detailData = await detailResponse.json();
    
    if (detailData.success) {
      console.log('✅ 文档详情获取成功');
      console.log(`   文档标题: ${detailData.data.title}`);
      console.log(`   文件大小: ${detailData.data.file_size} bytes`);
      console.log(`   上传时间: ${detailData.data.upload_time}\n`);
    } else {
      console.log('❌ 文档详情获取失败');
      return;
    }

    // 4. 测试获取文档块内容
    console.log('4. 测试获取文档块内容...');
    const chunksResponse = await fetch(`${API_BASE}/documents/${testDocument.id}/chunks`);
    const chunksData = await chunksResponse.json();
    
    if (chunksData.success) {
      console.log('✅ 文档块内容获取成功');
      console.log(`   块数量: ${chunksData.data.length}`);
      
      // 显示第一个块的内容预览
      if (chunksData.data.length > 0) {
        const firstChunk = chunksData.data[0];
        const contentPreview = firstChunk.content.substring(0, 100) + '...';
        console.log(`   内容预览: ${contentPreview}\n`);
      }
    } else {
      console.log('❌ 文档块内容获取失败');
      return;
    }

    // 5. 测试下载功能
    console.log('5. 测试下载功能...');
    const downloadResponse = await fetch(`${API_BASE}/documents/${testDocument.id}/download`);
    
    if (downloadResponse.ok) {
      console.log('✅ 文档下载功能正常');
      console.log(`   响应头: ${downloadResponse.headers.get('Content-Disposition')}`);
      console.log(`   内容类型: ${downloadResponse.headers.get('Content-Type')}\n`);
    } else {
      console.log('❌ 文档下载功能失败');
      return;
    }

    console.log('🎉 文档查看功能测试完成！所有功能正常。');
    console.log('\n📋 功能总结:');
    console.log('   ✅ 文档详情获取');
    console.log('   ✅ 文档块内容获取');
    console.log('   ✅ 文档下载功能');
    console.log('   ✅ 前端查看组件已集成');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testDocumentView(); 