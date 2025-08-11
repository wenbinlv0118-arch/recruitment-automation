import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import MessageItem from './MessageItem';

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  background: #f8fafc;
  width: 100%;
`;

const MessageList = ({ messages }) => {
  const messagesEndRef = useRef(null);

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <MessagesContainer>
      {messages.map((msg, index) => (
        <MessageItem key={msg.id || index} message={msg} />
      ))}
      <div ref={messagesEndRef} />
    </MessagesContainer>
  );
};

export default MessageList;
