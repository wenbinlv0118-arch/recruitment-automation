const dotenv = require('dotenv');
const LLMService = require('./backend/src/services/llmService');

// 加载环境变量
dotenv.config();

console.log('🔍 测试LLM服务配置...');
console.log('LLM_API_KEY:', process.env.LLM_API_KEY ? '✅ 已设置' : '❌ 未设置');
console.log('LLM_API_URL:', process.env.LLM_API_URL ? '✅ 已设置' : '❌ 未设置');
console.log('LLM_MODEL:', process.env.LLM_MODEL ? '✅ 已设置' : '❌ 未设置');

if (!process.env.LLM_API_KEY || !process.env.LLM_API_URL) {
    console.log('❌ 环境变量配置不完整，无法测试LLM服务');
    process.exit(1);
}

console.log('\n🚀 初始化LLM服务...');

try {
    const llmService = new LLMService();
    console.log('✅ LLM服务初始化成功');
    console.log('API地址:', llmService.apiUrl);
    console.log('模型:', llmService.model);
    console.log('是否为智谱AI:', llmService.isZhipuAI);
    
    console.log('\n🧪 测试LLM API调用...');
    
    // 生成测试提示
    const messages = llmService.generateThinkingChainPrompt('你好，请介绍一下你自己');
    console.log('生成的提示词:', JSON.stringify(messages, null, 2));
    
    console.log('\n📡 开始调用LLM API...');
    console.log('⚠️  注意：这将消耗API调用次数');
    
    // 测试API调用（可选，取消注释以进行实际测试）
    /*
    const response = await llmService.chatWithLLM(
        messages,
        (thinkingSteps) => {
            console.log('收到思维链步骤:', thinkingSteps);
        },
        (finalAnswer) => {
            console.log('收到最终回答:', finalAnswer);
        }
    );
    console.log('✅ LLM API调用成功');
    */
    
    console.log('✅ LLM服务测试完成，配置正确！');
    
} catch (error) {
    console.error('❌ LLM服务测试失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
}
