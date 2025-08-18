import React from 'react';
import styled from 'styled-components';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';
import COTReasoning from './COTReasoning';
import ThinkingMessage from './ThinkingMessage';
import CombinedMessage from './CombinedMessage';
import { AnimatedContainer, HoverEffect } from './styled';

const MessageItemWrapper = styled.div`
  margin-bottom: 20px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
`;

const MessageIcon = styled.div`
  font-size: 24px;
  color: ${props => props.isUser ? 'var(--primary-blue)' : 'var(--electric-blue)'};
  background: var(--glass-bg);
  backdrop-filter: var(--blur-sm);
  -webkit-backdrop-filter: var(--blur-sm);
  border: 1px solid var(--glass-border);
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
  transition: all var(--duration-fast) ease;
  flex-shrink: 0;
  
  &:hover {
    transform: scale(1.05);
    box-shadow: var(--shadow-lg);
    border-color: ${props => props.isUser ? 'var(--primary-blue)' : 'var(--electric-blue)'};
  }
`;

const MessageContent = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isUser' && prop !== 'isThinking'
}).attrs(props => ({
  isUser: props.isUser,
  isThinking: props.isThinking
}))`
  background: ${props => {
    if (props.isThinking) {
      return 'linear-gradient(135deg, rgba(240, 245, 255, 0.9), rgba(230, 240, 255, 0.8))';
    }
    return props.isUser 
      ? 'linear-gradient(135deg, var(--primary-blue), var(--electric-blue))' 
      : 'var(--glass-bg)';
  }};
  backdrop-filter: ${props => props.isUser ? 'none' : 'var(--blur-md)'};
  -webkit-backdrop-filter: ${props => props.isUser ? 'none' : 'var(--blur-md)'};
  border: 1px solid ${props => {
    if (props.isThinking) return 'var(--electric-blue)';
    return props.isUser ? 'transparent' : 'var(--glass-border)';
  }};
  color: ${props => {
    if (props.isThinking) return 'var(--gray-800)';
    return props.isUser ? 'white' : 'var(--gray-800)';
  }};
  padding: ${props => props.isThinking ? '20px' : '16px 20px'};
  border-radius: var(--radius-lg);
  max-width: 75%;
  box-shadow: ${props => {
    if (props.isThinking) return 'var(--shadow-lg), 0 0 20px rgba(0, 122, 255, 0.1)';
    return props.isUser ? 'var(--shadow-lg)' : 'var(--shadow-md)';
  }};
  border-left: ${props => props.isThinking ? '4px solid var(--electric-blue)' : 'none'};
  font-family: ${props => props.isThinking ? 'var(--font-mono)' : 'inherit'};
  position: relative;
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-word;
  transition: all var(--duration-normal) ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => {
      if (props.isThinking) return 'var(--shadow-xl), 0 0 30px rgba(0, 122, 255, 0.2)';
      return props.isUser ? 'var(--shadow-xl)' : 'var(--shadow-lg)';
    }};
  }
  
  ${props => props.isThinking && `
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--grid-background);
      opacity: 0.03;
      pointer-events: none;
      border-radius: inherit;
    }
  `}
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
    <AnimatedContainer 
      slideIn
      duration="0.5s"
      delay="0.1s"
    >
      <MessageItemWrapper>
        <MessageIcon isUser={message.isUser}>
          {message.isUser ? <UserOutlined /> : <RobotOutlined />}
        </MessageIcon>
        <MessageContent 
          isUser={message.isUser} 
          isThinking={message.type === 'thinking'}
        >
          {renderMessageContent()}
        </MessageContent>
      </MessageItemWrapper>
    </AnimatedContainer>
  );
};

export default MessageItem;
