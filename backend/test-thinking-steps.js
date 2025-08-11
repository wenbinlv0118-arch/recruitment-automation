require('dotenv').config();
const LLMService = require('./src/services/llmService');

async function testThinkingSteps() {
  console.log('🧪 测试思维链步骤检测逻辑...\n');
  
  try {
    // 创建LLM服务实例
    const llmService = new LLMService();
    console.log('✅ LLM服务实例创建成功\n');
    
    // 测试思维链提示生成
    const testQuery = '如何招聘数据分析师？';
    const messages = llmService.generateThinkingChainPrompt(testQuery);
    console.log('📝 测试查询:', testQuery);
    console.log('📋 系统提示:', messages[0].content.substring(0, 150) + '...\n');
    
    // 测试LLM调用
    console.log('🤖 开始测试思维链步骤检测...\n');
    let thinkingSteps = [];
    let stepCount = 0;
    
    const response = await llmService.chatWithLLM(messages, (content) => {
      stepCount++;
      thinkingSteps.push(content);
      console.log(`📋 步骤 ${stepCount}: ${content}`);
      console.log(`   长度: ${content.length} 字符`);
      console.log(`   是否以👉开头: ${content.startsWith('👉')}`);
      console.log('');
    });
    
    console.log('✅ 测试完成！');
    console.log('📊 统计信息:');
    console.log('- 总步骤数:', stepCount);
    console.log('- 最终回答长度:', response.length);
    console.log('\n🎯 所有思维链步骤:');
    thinkingSteps.forEach((step, index) => {
      console.log(`${index + 1}. ${step}`);
    });
    
    console.log('\n🎯 最终回答:');
    console.log(response);
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    console.error('详细错误:', error);
  }
}

// 运行测试
testThinkingSteps(); 