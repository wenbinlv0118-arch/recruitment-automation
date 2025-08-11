// 测试LLM API功能
require('dotenv').config();
const axios = require('axios');

const testLLMAPI = async () => {
  console.log('🧪 开始测试LLM API...\n');
  
  try {
    // 测试1：检查环境变量
    console.log('=== 测试1：检查环境变量 ===');
    const requiredEnvVars = ['LLM_API_KEY', 'LLM_API_URL', 'LLM_MODEL'];
    
    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      if (value) {
        console.log(`✅ ${envVar}: ${envVar === 'LLM_API_KEY' ? '***' + value.slice(-4) : value}`);
      } else {
        console.log(`❌ ${envVar}: 未设置`);
      }
    }
    
    // 测试2：测试API连接
    console.log('\n=== 测试2：测试API连接 ===');
    const apiUrl = process.env.LLM_API_URL;
    const apiKey = process.env.LLM_API_KEY;
    const model = process.env.LLM_MODEL;
    
    if (!apiUrl || !apiKey || !model) {
      console.log('❌ 缺少必要的环境变量，跳过API测试');
      return;
    }
    
    const testMessage = "我需要招聘前端开发工程师";
    
    const requestBody = {
      model: model,
      messages: [
        {
          role: "system",
          content: `你是一个专业的AI助手，需要帮助用户解决各种问题。在回答用户问题时，请严格按照以下格式输出：

## 思维链部分（使用👉标记）
请先进行详细的思维链分析，每个步骤使用'👉'标记：

👉 分析用户需求：[详细分析用户的具体需求和问题背景]
👉 思考解决方案：[分析可能的解决方案和实现方法]
👉 制定执行计划：[确定具体的执行步骤和策略]

## 最终建议部分（使用###标记）
思维链分析完成后，请提供结构化的最终建议，格式如下：

### 📋 需求分析
- [分析要点1]
- [分析要点2]

### 🚀 解决方案
1. [解决方案1]
2. [解决方案2]

### ⚠️ 注意事项
- [注意事项1]
- [注意事项2]

### 💡 补充建议
- [补充建议1]
- [补充建议2]

请确保思维链和最终建议之间有明确的分隔，最终建议要实用、可操作。`
        },
        {
          role: "user",
          content: testMessage
        }
      ],
      stream: false,
      temperature: 0.7
    };
    
    console.log('📤 发送请求到:', apiUrl);
    console.log('📝 测试消息:', testMessage);
    
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });
    
    console.log('✅ API响应成功');
    console.log('📊 响应状态:', response.status);
    
    const responseContent = response.data.choices[0]?.message?.content;
    if (responseContent) {
      console.log('\n📄 响应内容预览:');
      console.log(responseContent.substring(0, 500) + '...');
      
      // 检查是否包含思维链部分
      const hasThinkingPart = responseContent.includes('## 思维链部分');
      const hasFinalAdvicePart = responseContent.includes('## 最终建议部分');
      const hasThinkingSteps = responseContent.includes('👉');
      const hasStructuredAdvice = responseContent.includes('###');
      
      console.log('\n🔍 内容结构检查:');
      console.log(`思维链部分: ${hasThinkingPart ? '✅' : '❌'}`);
      console.log(`最终建议部分: ${hasFinalAdvicePart ? '✅' : '❌'}`);
      console.log(`思维步骤标记: ${hasThinkingSteps ? '✅' : '❌'}`);
      console.log(`结构化建议: ${hasStructuredAdvice ? '✅' : '❌'}`);
      
      if (hasThinkingPart && hasFinalAdvicePart && hasThinkingSteps && hasStructuredAdvice) {
        console.log('\n🎉 所有检查通过！API工作正常');
      } else {
        console.log('\n⚠️ 部分检查未通过，可能需要调整提示词');
      }
    } else {
      console.log('❌ 响应中没有找到内容');
    }
    
  } catch (error) {
    console.error('❌ API测试失败:', error.message);
    
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
};

// 运行测试
testLLMAPI(); 