const DatabaseManager = require('./src/database/init');
const KnowledgeService = require('./src/services/knowledgeService');
const fs = require('fs');
const path = require('path');

async function testDocumentUploadFix() {
  console.log('🧪 开始测试文档上传修复效果...\n');

  try {
    // 初始化数据库
    const dbManager = new DatabaseManager();
    await dbManager.init();
    console.log('✅ 数据库初始化成功');

    // 初始化知识库服务
    const knowledgeService = new KnowledgeService(dbManager);
    console.log('✅ 知识库服务初始化成功');

    // 创建测试文档
    const testContent = `
邮箱系统账号配置指南

一、系统概述
本系统提供完整的邮箱账号配置功能，支持多种客户端和平台。

二、配置步骤
1. 下载客户端软件
2. 安装并启动程序
3. 输入账号信息
4. 配置安全设置
5. 测试连接

三、常见问题
1. 证书导入失败
2. 连接超时
3. 密码错误

四、技术支持
如有问题请联系技术支持团队。
    `;

    const testFilePath = path.join(__dirname, 'test-document.txt');
    fs.writeFileSync(testFilePath, testContent, 'utf8');

    // 模拟文件上传
    const mockFile = {
      path: testFilePath,
      originalname: 'test-document.txt',
      mimetype: 'text/plain',
      size: fs.statSync(testFilePath).size
    };

    console.log('\n📝 测试文档上传...');
    const uploadResult = await knowledgeService.uploadDocument(mockFile, 'test-company-1', '邮箱系统配置指南');
    console.log('✅ 文档上传成功:', uploadResult);

    // 等待一下确保处理完成
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n📝 测试知识库检索...');
    const query = '邮箱系统账号配置';
    const searchResults = await knowledgeService.retrieveKnowledge(query, 'test-company-1', 5);
    console.log(`✅ 检索成功，找到 ${searchResults.length} 个结果`);

    for (let i = 0; i < searchResults.length; i++) {
      const result = searchResults[i];
      console.log(`  ${i + 1}. 相似度: ${(result.similarity * 100).toFixed(1)}%`);
      console.log(`     来源: ${result.metadata?.document_title || '未知'}`);
      console.log(`     内容: ${result.content.substring(0, 100)}...`);
      console.log('');
    }

    console.log('\n📝 测试AI对话...');
    const context = knowledgeService.buildContext(searchResults);
    console.log('✅ 上下文构建成功');
    console.log(`上下文长度: ${context.length} 字符`);
    console.log(`上下文预览: ${context.substring(0, 200)}...`);

    console.log('\n📝 测试文档搜索...');
    const searchQuery = '邮箱';
    const searchDocs = await knowledgeService.searchDocuments(searchQuery, 'test-company-1', 5);
    console.log(`✅ 文档搜索成功，找到 ${searchDocs.length} 个文档`);

    for (let i = 0; i < searchDocs.length; i++) {
      const doc = searchDocs[i];
      console.log(`  ${i + 1}. ${doc.title}`);
      console.log(`     状态: ${doc.status}`);
      console.log(`     预览: ${doc.content_preview || '无内容预览'}`);
    }

    console.log('\n📝 测试统计信息...');
    const stats = await knowledgeService.getStats('test-company-1');
    console.log('✅ 统计信息获取成功');
    console.log(`  文档总数: ${stats.documents.total}`);
    console.log(`  已处理: ${stats.documents.processed}`);
    console.log(`  失败: ${stats.documents.failed}`);
    console.log(`  向量总数: ${stats.vectors.totalEmbeddings}`);

    // 清理测试文件
    try {
      fs.unlinkSync(testFilePath);
      console.log('\n🧹 测试文件清理完成');
    } catch (error) {
      console.warn('⚠️ 清理测试文件失败:', error.message);
    }

    console.log('\n🎉 文档上传修复测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

// 运行测试
testDocumentUploadFix(); 