import React from 'react';
import styled from 'styled-components';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import COTReasoning from './COTReasoning';
import ThinkingMessage from './ThinkingMessage';
import CombinedMessage from './CombinedMessage';

const MessageItemWrapper = styled.div`
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const MessageIcon = styled.div`
  font-size: 20px;
`;

const MessageContent = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isUser' && prop !== 'isThinking'
}).attrs(props => ({
  isUser: props.isUser,
  isThinking: props.isThinking
}))`
  background: ${props => {
    if (props.isThinking) return '#f0f5ff';
    return props.isUser ? 'var(--primary-blue)' : 'white';
  }};
  color: ${props => {
    if (props.isThinking) return '#333333';
    return props.isUser ? 'white' : 'var(--gray-800)';
  }};
  padding: ${props => props.isThinking ? '16px' : '12px 16px'};
  border-radius: 12px;
  max-width: 70%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-left: ${props => props.isThinking ? '4px solid #1890ff' : 'none'};
  font-family: ${props => props.isThinking ? 'monospace' : 'inherit'};
  position: relative;
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-word;
`;

const MessageItem = ({ message }) => {
  const renderMessageContent = () => {
    switch (message.type) {
      case 'cot':
        return (
          <COTReasoning
            thinkingProcess={message.thinkingProcess}
            finalAnswer={message.finalAnswer}
            isComplete={message.isComplete}
            isStreaming={message.isStreaming}
          />
        );
      
      case 'thinking':
        return (
          <ThinkingMessage 
            content={message.content} 
            isComplete={message.isThinkingComplete} 
          />
        );
      
      case 'combined':
        return (
          <CombinedMessage 
            thinkingContent={message.thinkingContent} 
            finalContent={message.content} 
            isThinkingComplete={message.isThinkingComplete || false}
          />
        );
      
      case 'knowledge-search':
        return message.component;
      
      default:
        return (
          <div>
            {message.content}
            {message.additionalComponent && message.additionalComponent}
          </div>
        );
    }
  };

  return (
    <MessageItemWrapper>
      <MessageIcon>
        {message.isUser ? <UserOutlined /> : <RobotOutlined />}
      </MessageIcon>
      <MessageContent 
        isUser={message.isUser} 
        isThinking={message.type === 'thinking'}
      >
        {renderMessageContent()}
      </MessageContent>
    </MessageItemWrapper>
  );
};

export default MessageItem;
