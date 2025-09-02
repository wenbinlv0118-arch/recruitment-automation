import React, { memo, useMemo } from 'react';
import styled from 'styled-components';
import { RobotOutlined, UserOutlined } from '@ant-design/icons';

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  background: transparent;
  width: 100%;
  position: relative;
  z-index: 1;
  
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--glass-bg);
    border-radius: var(--radius-sm);
    backdrop-filter: var(--blur-sm);
    -webkit-backdrop-filter: var(--blur-sm);
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, var(--primary-blue), var(--electric-blue));
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-sm);
    transition: all var(--duration-fast) ease;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, var(--electric-blue), var(--cyber-blue));
    box-shadow: 0 0 12px rgba(0, 122, 255, 0.4);
  }
`;

const MessageItem = styled.div`
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

const MessageContent = styled.div`
  background: ${props => {
    return props.sender === 'user' 
      ? 'var(--gradient-primary)' 
      : 'var(--glass-bg)';
  }};
  backdrop-filter: var(--blur-md);
  -webkit-backdrop-filter: var(--blur-md);
  color: ${props => {
    return props.sender === 'user' ? 'white' : 'var(--text-primary)';
  }};
  padding: 16px 20px;
  border-radius: var(--radius-lg);
  max-width: 75%;
  box-shadow: ${props => {
    return props.sender === 'user' 
      ? 'var(--shadow-lg), 0 0 20px rgba(0, 122, 255, 0.3)' 
      : 'var(--shadow-md)';
  }};
  border: 1px solid ${props => {
    return props.sender === 'user' 
      ? 'var(--primary-blue)' 
      : 'var(--glass-border)';
  }};
  margin-left: ${props => props.sender === 'user' ? 'auto' : '0'};
  margin-right: ${props => props.sender === 'user' ? '0' : 'auto'};
  position: relative;
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-word;
  transition: all var(--duration-fast) ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => {
      return props.sender === 'user' 
        ? 'var(--shadow-xl), 0 0 25px rgba(0, 122, 255, 0.4)' 
        : 'var(--shadow-lg)';
    }};
  }
`;

/**
 * 单个消息项组件（使用memo优化）
 */
const MessageItemComponent = memo(({ message }) => {
  const { sender, content, isThinking } = message;
  
  return (
    <MessageItem>
      {sender === 'AI' ? <RobotOutlined style={{ color: 'var(--primary-blue)', fontSize: '20px' }} /> : <UserOutlined style={{ color: 'var(--success-green)', fontSize: '20px' }} />}
      <MessageContent sender={sender}>
        {isThinking && <span style={{ color: 'var(--primary-blue)', marginRight: '8px' }}>🤔 思考中...</span>}
        {content}
      </MessageContent>
    </MessageItem>
  );
});

MessageItemComponent.displayName = 'MessageItemComponent';

/**
 * 优化的消息列表组件
 * 使用虚拟化和memo优化大量消息的渲染性能
 */
const OptimizedMessageList = memo(({ messages, messagesEndRef }) => {
  // 使用useMemo优化消息渲染
  const renderedMessages = useMemo(() => {
    return messages.map((message) => (
      <MessageItemComponent key={message.id} message={message} />
    ));
  }, [messages]);
  
  return (
    <MessagesContainer>
      {renderedMessages}
      <div ref={messagesEndRef} />
    </MessagesContainer>
  );
});

OptimizedMessageList.displayName = 'OptimizedMessageList';

export default OptimizedMessageList;
