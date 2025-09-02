const axios = require('axios');

/**
 * 大语言模型服务类
 * 负责与大语言模型API交互，实现思维链功能
 */
class LLMService {
  constructor() {
    // 从环境变量获取API配置
    this.apiKey = process.env.LLM_API_KEY;
    this.apiUrl = process.env.LLM_API_URL || process.env.LLM_BASE_URL || 'https://api.openai.com/v1/chat/completions';
    this.model = process.env.LLM_MODEL || 'gpt-3.5-turbo';
    
    // 验证必要配置
    if (!this.apiKey) {
      throw new Error('LLM_API_KEY 环境变量未设置');
    }
    
    // 检测是否为智谱AI API
    this.isZhipuAI = this.apiUrl.includes('bigmodel.cn');
  }

  /**
   * 发送消息到大语言模型并获取响应
   * @param {Array} messages - 对话历史消息数组
   * @param {Function} thinkingCallback - 思维链中间步骤回调函数
   * @param {Function} finalAnswerCallback - 最终建议回调函数
   * @returns {Promise<string>} 最终响应内容
   */
  async chatWithLLM(messages, thinkingCallback = null, finalAnswerCallback = null) {
    try {
      console.log('LLM服务调用开始，API地址:', this.apiUrl);
      console.log('使用模型:', this.model);
      console.log('是否为智谱AI:', this.isZhipuAI);
      console.log('消息内容:', JSON.stringify(messages, null, 2));
      
      // 验证API配置
      if (!this.apiKey) {
        throw new Error('LLM_API_KEY 环境变量未设置，请检查 .env 文件配置');
      }
      
      if (!this.apiUrl) {
        throw new Error('LLM_API_URL 环境变量未设置，请检查 .env 文件配置');
      }
      
      // 构建请求参数
      let requestBody;
      let headers;
      
      if (this.isZhipuAI) {
        // 智谱AI API格式
        requestBody = {
          model: this.model,
          messages: messages,
          stream: true,
          temperature: 0.7
        };
        headers = {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        };
      } else {
        // OpenAI API格式
        requestBody = {
          model: this.model,
          messages: messages,
          stream: true,
          temperature: 0.7
        };
        headers = {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        };
      }

      console.log('发送请求到LLM API...');
      console.log('请求头:', headers);
      console.log('请求体:', JSON.stringify(requestBody, null, 2));

      // 发送请求到大语言模型API
      const response = await axios.post(this.apiUrl, requestBody, {
        headers: headers,
        responseType: 'stream',
        timeout: 300000 // 设置300秒超时，优化简历解析性能
      });

      console.log('LLM API响应状态:', response.status);
      console.log('LLM API响应头:', response.headers);

      // 处理流式响应
      return new Promise((resolve, reject) => {
        let fullContent = '';
        let buffer = '';
        
        response.data.on('data', (chunk) => {
          buffer += chunk.toString();
          
          // 处理流式数据块
          const lines = buffer.split('\n');
          buffer = lines.pop(); // 保留不完整的行
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              
              if (data === '[DONE]') {
                // 完成传输后，解析并发送思维链步骤和最终建议
                if (thinkingCallback || finalAnswerCallback) {
                  this.sendThinkingStepsAndFinalAnswer(fullContent, thinkingCallback, finalAnswerCallback || ((finalAnswer) => {
                    resolve(finalAnswer);
                  }));
                } else {
                  resolve(fullContent);
                }
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                let content = '';
                
                if (this.isZhipuAI) {
                  // 智谱AI响应格式
                  content = parsed.choices?.[0]?.delta?.content || '';
                } else {
                  // OpenAI响应格式
                  content = parsed.choices?.[0]?.delta?.content || '';
                }
                
                if (content) {
                  fullContent += content;
                  console.log('收到LLM流式内容:', content);
                }
              } catch (parseError) {
                // 忽略解析错误
                console.warn('解析流式响应时出错:', parseError);
              }
            }
          }
        });
        
        response.data.on('end', () => {
          console.log('LLM流式响应完成，总内容长度:', fullContent.length);
          // 完成传输后，解析并发送思维链步骤和最终建议
          if (thinkingCallback || finalAnswerCallback) {
            this.sendThinkingStepsAndFinalAnswer(fullContent, thinkingCallback, finalAnswerCallback || ((finalAnswer) => {
              resolve(finalAnswer);
            }));
          } else {
            resolve(fullContent);
          }
        });
        
        response.data.on('error', (error) => {
          console.error('LLM流式响应错误:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('与大语言模型通信时出错:', error);
      
      // 提供更详细的错误信息
      let errorMessage = '大语言模型调用失败';
      
      if (error.response) {
        // 服务器响应了错误状态码
        console.error('LLM API错误响应:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
        
        if (error.response.status === 401) {
          errorMessage = 'API密钥无效或已过期，请检查LLM_API_KEY配置';
        } else if (error.response.status === 403) {
          errorMessage = 'API访问被拒绝，请检查API密钥权限';
        } else if (error.response.status === 429) {
          errorMessage = 'API调用频率超限，请稍后再试';
        } else if (error.response.status >= 500) {
          errorMessage = 'LLM服务暂时不可用，请稍后再试';
        } else {
          errorMessage = `LLM API错误: ${error.response.status} ${error.response.statusText}`;
        }
      } else if (error.request) {
        // 请求已发出但没有收到响应
        console.error('LLM API请求超时或无响应:', error.request);
        errorMessage = 'LLM服务连接超时，请检查网络连接和API地址';
      } else {
        // 其他错误
        if (error.message.includes('LLM_API_KEY')) {
          errorMessage = error.message;
        } else if (error.message.includes('LLM_API_URL')) {
          errorMessage = error.message;
        } else {
          errorMessage = `LLM服务错误: ${error.message}`;
        }
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * 发送思维链步骤
   * @param {string} fullContent - 完整的响应内容
   * @param {Function} thinkingCallback - 回调函数
   */
  sendThinkingSteps(fullContent, thinkingCallback) {
    if (!thinkingCallback) return;
    
    // 使用正则表达式匹配完整的思维链步骤
    const stepPattern = /👉[^👉]*/g;
    const matches = fullContent.match(stepPattern);
    
    if (matches) {
      const validSteps = [];
      for (const match of matches) {
        const step = match.trim();
        // 检查是否是有效的步骤（至少包含👉和内容）
        if (step.length > 1) {
          // 清理步骤内容，移除多余的空白字符
          const cleanStep = step.replace(/\s+/g, ' ').trim();
          if (cleanStep.length > 1) {
            validSteps.push(cleanStep);
          }
        }
      }
      
      // 一次性发送所有步骤
      if (validSteps.length > 0) {
        thinkingCallback(validSteps);
      }
    }
  }

  /**
   * 发送思维链步骤和最终建议
   * @param {string} fullContent - 完整的响应内容
   * @param {Function} thinkingCallback - 思维链回调函数
   * @param {Function} finalAnswerCallback - 最终建议回调函数
   */
  sendThinkingStepsAndFinalAnswer(fullContent, thinkingCallback, finalAnswerCallback) {
    if (!thinkingCallback || !finalAnswerCallback) return;
    
    // 分离思维链部分和最终建议部分
    const thinkingMatch = fullContent.match(/## 思维链部分[\s\S]*?(?=## 最终建议部分|$)/);
    const finalAdviceMatch = fullContent.match(/## 最终建议部分[\s\S]*$/);
    
    // 处理思维链部分
    if (thinkingMatch) {
      const thinkingContent = thinkingMatch[0].replace(/## 思维链部分/, '').trim();
      const stepPattern = /👉[^👉]*/g;
      const matches = thinkingContent.match(stepPattern);
      
      if (matches) {
        const validSteps = [];
        for (const match of matches) {
          const step = match.trim();
          if (step.length > 1) {
            const cleanStep = step.replace(/\s+/g, ' ').trim();
            if (cleanStep.length > 1) {
              validSteps.push(cleanStep);
            }
          }
        }
        
        if (validSteps.length > 0) {
          thinkingCallback(validSteps);
        }
      }
    }
    
    // 处理最终建议部分
    if (finalAdviceMatch) {
      const finalAdviceContent = finalAdviceMatch[0].replace(/## 最终建议部分/, '').trim();
      if (finalAdviceContent) {
        finalAnswerCallback(finalAdviceContent);
      }
    } else {
      // 如果没有找到结构化内容，使用原始内容作为最终建议
      finalAnswerCallback(fullContent);
    }
  }

  /**
   * 生成思维链提示词
   * @param {string} userQuery - 用户查询
   * @returns {Array} 包含思维链提示的对话消息数组
   */
  generateThinkingChainPrompt(userQuery) {
    return [
      {
        role: "system",
        content: `你是一个专业的AI助手，需要帮助用户解决各种问题。在回答用户问题时，请严格按照以下格式输出：

## 思维链部分
请先进行详细的思维链分析，每个步骤使用'👉'标记：

👉 分析用户需求：[详细分析用户的具体需求和问题背景]
👉 思考解决方案：[分析可能的解决方案和实现方法]
👉 制定执行计划：[确定具体的执行步骤和策略]

## 最终建议部分
思维链分析完成后，请严格按照以下格式提供结构化的最终建议：

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

**重要要求：**
1. 必须严格按照上述格式输出，包括"## 思维链部分"和"## 最终建议部分"标题
2. 思维链部分要详细分析，帮助用户理解思考过程
3. 最终建议部分要结构化、分类清晰、便于执行
4. 根据问题类型智能调整建议内容：
   - 招聘问题：需求分析 → 招聘策略 → 执行步骤 → 注意事项
   - 技术问题：技术分析 → 解决方案 → 实施计划 → 技术要点
   - 问题解决：问题诊断 → 解决方案 → 执行步骤 → 预防措施
   - 通用问题：需求理解 → 方案设计 → 行动建议 → 补充说明

请确保思维链和最终建议之间有明确的分隔，最终建议要实用、可操作。`
      },
      {
        role: "user",
        content: userQuery
      }
    ];
  }

  /**
   * 带知识库上下文的对话
   * @param {string} userQuery - 用户查询
   * @param {string} knowledgeContext - 知识库上下文
   * @param {Function} thinkingCallback - 思维链回调函数
   * @param {Function} finalAnswerCallback - 最终建议回调函数
   * @returns {Promise<string>} 最终响应内容
   */
  async chatWithKnowledgeBase(userQuery, knowledgeContext, thinkingCallback = null, finalAnswerCallback = null) {
    const enhancedPrompt = this.generateKnowledgePrompt(userQuery, knowledgeContext);
    
    return await this.chatWithLLM(
      enhancedPrompt, 
      thinkingCallback, 
      finalAnswerCallback
    );
  }

  /**
   * 生成带知识库的提示词
   * @param {string} userQuery - 用户查询
   * @param {string} knowledgeContext - 知识库上下文
   * @returns {Array} 包含知识库上下文的对话消息数组
   */
  generateKnowledgePrompt(userQuery, knowledgeContext) {
    return [
      {
        role: "system",
        content: `你是一个专业的招聘AI助手Moirai。在回答候选人问题时，请基于以下企业知识库信息：

${knowledgeContext}

**回答要求：**
1. 优先使用知识库中的信息回答，确保信息准确
2. 如果知识库信息不足，可以补充一般性建议
3. 保持专业、友好的语调
4. 回答要具体、准确、有针对性
5. 如果知识库中有相关信息，请明确引用来源

请严格按照以下格式输出：

## 思维链部分
👉 分析候选人问题：[分析候选人的具体问题]
👉 检索相关信息：[说明从知识库中找到的相关信息]
👉 制定回答策略：[确定如何组织回答]

## 最终建议部分
[基于知识库信息的具体回答，如果引用了知识库信息，请标注来源]`
      },
      {
        role: "user",
        content: userQuery
      }
    ];
  }
}

module.exports = LLMService;