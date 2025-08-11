import React, { useState } from 'react';
import { LoadingOutlined } from '@ant-design/icons';

const ThinkingMessage = ({ content, isComplete = false }) => {
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

export default ThinkingMessage;
