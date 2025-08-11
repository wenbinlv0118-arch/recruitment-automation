import React from 'react';
import ThinkingMessage from './ThinkingMessage';

// 正式回答组件 - 独立显示
const FinalAnswer = ({ content }) => {
  return (
    <div className="final-answer-deepseek">
      <div className="answer-header">
        <span className="answer-icon">💡</span>
        <span className="answer-title">回答</span>
      </div>
      <div className="answer-content">
        {content}
      </div>
    </div>
  );
};

// 组合消息组件 - 重新设计
const CombinedMessage = ({ thinkingContent, finalContent, isThinkingComplete = false }) => {
  return (
    <div className="combined-message-deepseek">
      {/* 思维链部分 */}
      {thinkingContent && (
        <ThinkingMessage 
          content={thinkingContent} 
          isComplete={isThinkingComplete}
        />
      )}
      
      {/* 正式回答部分 - 只有在思维链完成后才显示 */}
      {finalContent && isThinkingComplete && (
        <FinalAnswer content={finalContent} />
      )}
    </div>
  );
};

export default CombinedMessage;
