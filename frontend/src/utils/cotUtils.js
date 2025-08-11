// COT工具函数 - 用于生成和解析XML格式的推理过程

/**
 * 生成XML格式的COT推理过程
 * @param {Array} steps - 推理步骤数组，每个步骤包含emoji和content
 * @param {Object} conclusion - 推理结论，包含emoji和content
 * @returns {string} XML格式的推理过程
 */
export const generateCOTXML = (steps, conclusion = null) => {
  let xml = '<thinking_process>\n';
  
  // 添加推理步骤
  steps.forEach((step, index) => {
    const sequence = index + 1;
    const emoji = step.emoji || '💭';
    const content = step.content || step;
    xml += `  <step sequence="${sequence}">${emoji} ${content}</step>\n`;
  });
  
  // 添加推理结论
  if (conclusion) {
    const emoji = conclusion.emoji || '🎯';
    const content = conclusion.content || conclusion;
    xml += `  <conclusion>${emoji} ${content}</conclusion>\n`;
  }
  
  xml += '</thinking_process>';
  return xml;
};

/**
 * 解析XML格式的COT内容
 * @param {string} xmlString - XML格式的字符串
 * @returns {Object} 解析后的对象，包含steps和conclusion
 */
export const parseCOTXML = (xmlString) => {
  try {
    const steps = [];
    let conclusion = null;
    
    // 提取步骤
    const stepMatches = xmlString.match(/<step sequence="(\d+)">([\s\S]*?)<\/step>/g);
    if (stepMatches) {
      stepMatches.forEach((match) => {
        const sequenceMatch = match.match(/sequence="(\d+)"/);
        const contentMatch = match.match(/<step sequence="\d+">([\s\S]*?)<\/step>/);
        
        if (sequenceMatch && contentMatch) {
          const sequence = parseInt(sequenceMatch[1]);
          const content = contentMatch[1].trim();
          
          // 提取emoji和文本
          const emojiMatch = content.match(/^([^\s]+)\s+(.+)$/);
          const emoji = emojiMatch ? emojiMatch[1] : '💭';
          const text = emojiMatch ? emojiMatch[2] : content;
          
          steps.push({
            sequence,
            emoji,
            content: text
          });
        }
      });
    }
    
    // 提取结论
    const conclusionMatch = xmlString.match(/<conclusion>([\s\S]*?)<\/conclusion>/);
    if (conclusionMatch) {
      const content = conclusionMatch[1].trim();
      const emojiMatch = content.match(/^([^\s]+)\s+(.+)$/);
      const emoji = emojiMatch ? emojiMatch[1] : '🎯';
      const text = emojiMatch ? emojiMatch[2] : content;
      conclusion = { emoji, content: text };
    }
    
    return {
      steps: steps.sort((a, b) => a.sequence - b.sequence),
      conclusion
    };
  } catch (error) {
    console.error('解析COT XML失败:', error);
    return { steps: [], conclusion: null };
  }
};

/**
 * 创建完整的COT响应
 * @param {Array} steps - 推理步骤
 * @param {Object} conclusion - 推理结论
 * @param {string} finalAnswer - 最终答案
 * @returns {string} 完整的XML格式响应
 */
export const createCOTResponse = (steps, conclusion, finalAnswer) => {
  const thinkingProcess = generateCOTXML(steps, conclusion);
  
  return `${thinkingProcess}
<final_answer>
${finalAnswer}
</final_answer>`;
};

/**
 * 预设的推理步骤模板
 */
export const COT_TEMPLATES = {
  // 问题分析模板
  PROBLEM_ANALYSIS: [
    { emoji: '🔍', content: '分析问题背景和需求' },
    { emoji: '📋', content: '识别关键信息和约束条件' },
    { emoji: '🎯', content: '确定解决方案的目标' }
  ],
  
  // 技术方案模板
  TECHNICAL_SOLUTION: [
    { emoji: '🔧', content: '分析技术可行性' },
    { emoji: '⚙️', content: '设计解决方案架构' },
    { emoji: '📊', content: '评估实现复杂度' },
    { emoji: '🚀', content: '制定实施计划' }
  ],
  
  // 决策分析模板
  DECISION_ANALYSIS: [
    { emoji: '📝', content: '收集相关信息' },
    { emoji: '⚖️', content: '分析各种选项' },
    { emoji: '📊', content: '评估风险和收益' },
    { emoji: '🎯', content: '做出最终决策' }
  ],
  
  // 招聘流程模板
  RECRUITMENT_PROCESS: [
    { emoji: '🔍', content: '分析招聘需求' },
    { emoji: '📋', content: '制定招聘策略' },
    { emoji: '🔎', content: '搜索合适候选人' },
    { emoji: '📞', content: '联系候选人' },
    { emoji: '📄', content: '收集简历信息' },
    { emoji: '✅', content: '评估候选人匹配度' }
  ]
};

/**
 * 根据场景生成COT内容
 * @param {string} scenario - 场景类型
 * @param {Array} customSteps - 自定义步骤
 * @param {Object} conclusion - 结论
 * @param {string} finalAnswer - 最终答案
 * @returns {string} 完整的COT响应
 */
export const generateCOTByScenario = (scenario, customSteps = [], conclusion = null, finalAnswer = '') => {
  let steps = [];
  
  // 根据场景选择模板
  switch (scenario) {
    case 'problem_analysis':
      steps = COT_TEMPLATES.PROBLEM_ANALYSIS;
      break;
    case 'technical_solution':
      steps = COT_TEMPLATES.TECHNICAL_SOLUTION;
      break;
    case 'decision_analysis':
      steps = COT_TEMPLATES.DECISION_ANALYSIS;
      break;
    case 'recruitment_process':
      steps = COT_TEMPLATES.RECRUITMENT_PROCESS;
      break;
    default:
      steps = customSteps.length > 0 ? customSteps : COT_TEMPLATES.PROBLEM_ANALYSIS;
  }
  
  // 合并自定义步骤
  if (customSteps.length > 0) {
    steps = [...steps, ...customSteps];
  }
  
  return createCOTResponse(steps, conclusion, finalAnswer);
};

/**
 * 验证COT XML格式是否正确
 * @param {string} xmlString - XML字符串
 * @returns {boolean} 是否格式正确
 */
export const validateCOTXML = (xmlString) => {
  try {
    // 检查基本结构
    const hasThinkingProcess = xmlString.includes('<thinking_process>') && xmlString.includes('</thinking_process>');
    const hasFinalAnswer = xmlString.includes('<final_answer>') && xmlString.includes('</final_answer>');
    
    if (!hasThinkingProcess) {
      return false;
    }
    
    // 检查步骤格式
    const stepMatches = xmlString.match(/<step sequence="\d+">.*?<\/step>/g);
    if (stepMatches) {
      for (const match of stepMatches) {
        const sequenceMatch = match.match(/sequence="(\d+)"/);
        if (!sequenceMatch) {
          return false;
        }
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

export default {
  generateCOTXML,
  parseCOTXML,
  createCOTResponse,
  COT_TEMPLATES,
  generateCOTByScenario,
  validateCOTXML
}; 