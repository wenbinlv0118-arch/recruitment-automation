import React, { useState } from 'react';
import { LoadingOutlined } from '@ant-design/icons';
import { MessageItem, MessageContent, ThinkingIndicator } from '../styled';

// 思维链消息组件 - 重新设计为DeepSeek风格
export const ThinkingMessage = ({ content, isComplete = false }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  // 将思维链内容按行分割，每行作为一个思考步骤
  const thinkingSteps = content.split('\n').filter(step => step.trim());
  
  return (
    <div className="thinking-message-deepseek">
      <div 
        className="thinking-header-deepseek"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="thinking-header-left">
          <span className="thinking-icon">🧠</span>
          <span className="thinking-title">思维链</span>
          <span className="thinking-status">
            {isComplete ? '已完成' : '思考中...'}
          </span>
        </div>
        <div className="thinking-toggle">
          {isExpanded ? '收起' : '展开'}
        </div>
      </div>
      
      {isExpanded && (
        <div className="thinking-steps">
          {thinkingSteps.map((step, index) => (
            <div key={index} className="thinking-step">
              <div className="step-number">{index + 1}</div>
              <div className="step-content">{step}</div>
            </div>
          ))}
          {!isComplete && (
            <div className="thinking-loading">
              <LoadingOutlined spin /> 正在思考...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 正式回答组件 - 独立显示
export const FinalAnswer = ({ content }) => {
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
export const CombinedMessage = ({ thinkingContent, finalContent, isThinkingComplete = false }) => {
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

// 普通消息组件
export const NormalMessage = ({ message }) => {
  return (
    <MessageItem>
      <MessageContent isUser={message.isUser}>
        {message.content}
      </MessageContent>
    </MessageItem>
  );
};

// 思维指示器组件
export const ThinkingIndicatorComponent = () => {
  return (
    <MessageItem>
      <MessageContent isThinking={true}>
        <ThinkingIndicator>🧠</ThinkingIndicator>
        正在思考中...
      </MessageContent>
    </MessageItem>
  );
}; 