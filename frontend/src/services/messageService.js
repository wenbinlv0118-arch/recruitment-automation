import { createCOTResponse } from '../utils/cotUtils';

export class MessageService {
  constructor(messageIdCounter) {
    this.messageIdCounter = messageIdCounter;
  }

  // 生成唯一消息ID
  generateMessageId() {
    return ++this.messageIdCounter.current;
  }

  // 创建普通消息
  createNormalMessage(sender, content, isUser = true, component = null) {
    return {
      id: this.generateMessageId(),
      sender,
      content,
      isUser,
      type: 'normal',
      component,
      timestamp: new Date()
    };
  }

  // 创建COT消息
  createCOTMessage(thinkingProcess, finalAnswer = '', isComplete = false, isStreaming = false) {
    return {
      id: this.generateMessageId(),
      sender: 'AI',
      thinkingProcess,
      finalAnswer,
      isUser: false,
      type: 'cot',
      isComplete,
      isStreaming,
      timestamp: new Date()
    };
  }

  // 创建组合消息
  createCombinedMessage(thinkingContent, finalContent = '', isThinkingComplete = false, additionalComponent = null) {
    return {
      id: this.generateMessageId(),
      sender: 'AI',
      content: finalContent,
      thinkingContent,
      isUser: false,
      type: 'combined',
      isThinkingComplete,
      additionalComponent,
      timestamp: new Date()
    };
  }

  // 创建知识库搜索消息
  createKnowledgeSearchMessage(results, query) {
    return {
      id: this.generateMessageId(),
      sender: 'AI',
      content: '',
      isUser: false,
      type: 'knowledge-search',
      component: results,
      query,
      timestamp: new Date()
    };
  }

  // 更新COT消息
  updateCOTMessage(messages, thinkingProcess, finalAnswer, isComplete, isStreaming) {
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && !lastMessage.isUser && lastMessage.type === 'cot') {
      return messages.map((msg, index) => {
        if (index === messages.length - 1) {
          return {
            ...msg,
            thinkingProcess,
            finalAnswer,
            isComplete,
            isStreaming
          };
        }
        return msg;
      });
    } else {
      return [...messages, this.createCOTMessage(thinkingProcess, finalAnswer, isComplete, isStreaming)];
    }
  }

  // 更新组合消息
  updateCombinedMessage(messages, content, additionalComponent = null) {
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && lastMessage.type === 'combined') {
      return messages.map((msg, index) => {
        if (index === messages.length - 1) {
          return {
            ...msg,
            content,
            isThinkingComplete: true,
            additionalComponent
          };
        }
        return msg;
      });
    } else {
      return [...messages, this.createCombinedMessage('', content, true, additionalComponent)];
    }
  }

  // 生成COT格式回复
  generateCOTResponse(userMessage) {
    let steps = [];
    let conclusion = null;
    let finalAnswer = '';

    if (userMessage.includes('招聘') || userMessage.includes('人才') || userMessage.includes('简历')) {
      steps = [
        { emoji: '🔍', content: '分析您的招聘需求：' + userMessage },
        { emoji: '📋', content: '制定招聘策略：通过智能招聘平台进行自动化招聘' },
        { emoji: '🔎', content: '搜索合适候选人：使用智能筛选功能找到匹配的简历' },
        { emoji: '📞', content: '联系候选人：自动发送邀请消息' },
        { emoji: '📄', content: '收集简历信息：自动下载和分析简历' },
        { emoji: '✅', content: '评估候选人匹配度：基于技能和经验进行评分' }
      ];
      conclusion = { emoji: '🎯', content: '通过自动化流程提高招聘效率，减少人工筛选时间' };
      finalAnswer = '我理解您的招聘需求。建议使用智能招聘自动化系统，可以显著提升招聘效率，平均节省60%的筛选时间。您可以输入"智能寻聘"来启动自动化招聘流程。';
    } else if (userMessage.includes('技术') || userMessage.includes('开发') || userMessage.includes('编程')) {
      steps = [
        { emoji: '🔧', content: '分析技术需求：' + userMessage },
        { emoji: '⚙️', content: '设计技术方案：采用现代化的技术架构' },
        { emoji: '📊', content: '评估实现复杂度：分析技术可行性和开发周期' },
        { emoji: '🚀', content: '制定实施计划：分阶段开发，确保质量' }
      ];
      conclusion = { emoji: '🎯', content: '技术方案可行，建议采用渐进式开发策略' };
      finalAnswer = '基于您的技术需求，我建议采用现代化的技术栈和敏捷开发方法。这样可以确保项目的成功实施和长期维护。';
    } else {
      steps = [
        { emoji: '🔍', content: '理解您的需求：' + userMessage },
        { emoji: '📋', content: '分析相关信息：收集和整理相关数据' },
        { emoji: '🎯', content: '制定解决方案：基于分析结果提供建议' }
      ];
      conclusion = { emoji: '🎯', content: '基于分析提供个性化建议' };
      finalAnswer = '我理解您的需求。基于我的分析，我建议您考虑相关的解决方案。如果您需要更具体的帮助，请提供更多详细信息。';
    }

    const thinkingProcess = createCOTResponse(steps, conclusion, finalAnswer);
    const finalAnswerMatch = thinkingProcess.match(/<final_answer>([\s\S]*?)<\/final_answer>/);
    const extractedFinalAnswer = finalAnswerMatch ? finalAnswerMatch[1].trim() : finalAnswer;
    const thinkingProcessOnly = thinkingProcess.replace(/<final_answer>[\s\S]*?<\/final_answer>/, '').trim();

    return {
      thinkingProcess: thinkingProcessOnly,
      finalAnswer: extractedFinalAnswer
    };
  }

  // 解析AI消息响应
  parseAIResponse(fullResponse) {
    const thinkingMatch = fullResponse.match(/## 思维链部分[\s\S]*?(?=## 最终建议部分|$)/);
    const finalAdviceMatch = fullResponse.match(/## 最终建议部分[\s\S]*$/);
    
    let thinkingContent = '';
    let finalAdviceContent = '';
    
    if (thinkingMatch) {
      thinkingContent = thinkingMatch[0].replace(/## 思维链部分/, '').trim();
    }
    
    if (finalAdviceMatch) {
      finalAdviceContent = finalAdviceMatch[0].replace(/## 最终建议部分/, '').trim();
    }
    
    if (!finalAdviceContent) {
      finalAdviceContent = fullResponse;
    }
    
    return {
      thinkingContent,
      finalAdviceContent
    };
  }

  // 解析思维链消息
  parseThinkingMessage(content) {
    let thinkingSteps = [];
    let conclusion = null;
    
    if (Array.isArray(content)) {
      thinkingSteps = content.map((step, index) => {
        const stepMatch = step.match(/👉\s*(.+)/);
        if (stepMatch) {
          const stepContent = stepMatch[1].trim();
          let emoji = '💭';
          if (stepContent.includes('分析') || stepContent.includes('需求')) emoji = '🔍';
          else if (stepContent.includes('思考') || stepContent.includes('方案')) emoji = '📋';
          else if (stepContent.includes('制定') || stepContent.includes('执行')) emoji = '🎯';
          else if (stepContent.includes('技术')) emoji = '🔧';
          else if (stepContent.includes('招聘')) emoji = '📞';
          
          return { emoji, content: stepContent };
        }
        return { emoji: '💭', content: step.trim() };
      });
    } else {
      const stepMatch = content.match(/👉\s*(.+)/);
      if (stepMatch) {
        const stepContent = stepMatch[1].trim();
        let emoji = '💭';
        if (stepContent.includes('分析') || stepContent.includes('需求')) emoji = '🔍';
        else if (stepContent.includes('思考') || stepContent.includes('方案')) emoji = '📋';
        else if (stepContent.includes('制定') || stepContent.includes('执行')) emoji = '🎯';
        
        thinkingSteps = [{ emoji, content: stepContent }];
      }
    }
    
    if (thinkingSteps.length > 0) {
      conclusion = { emoji: '🎯', content: '基于以上分析，制定相应的解决方案' };
    }
    
    return createCOTResponse(thinkingSteps, conclusion, '');
  }
}
