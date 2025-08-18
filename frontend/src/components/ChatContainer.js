import React from 'react';
import styled from 'styled-components';
import CapabilityCards from './CapabilityCards';
import MessageList from './MessageList';
import InputArea from './InputArea';
import { AnimatedContainer } from './styled';

const ChatContainerWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  background: var(--glass-bg);
  backdrop-filter: var(--blur-sm);
  -webkit-backdrop-filter: var(--blur-sm);
  overflow: hidden;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--grid-background);
    opacity: 0.02;
    pointer-events: none;
  }
`;

const CapabilityCardsWrapper = styled.div`
  flex-shrink: 0;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 20px;
  background: transparent;
  width: 100%;
  position: relative;
  
  /* 自定义滚动条样式 */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--glass-border);
    border-radius: 3px;
    transition: background var(--duration-fast) ease;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: var(--primary-blue);
  }
`;

const ChatContainer = ({
  messages,
  inputValue,
  setInputValue,
  sendMessage,
  isConnected,
  isLoading,
  onCapabilityClick,
  hasAnyModal
}) => {
  return (
    <AnimatedContainer fadeIn duration="0.8s">
      <ChatContainerWrapper>
        <CapabilityCardsWrapper>
          <CapabilityCards onCapabilityClick={onCapabilityClick} />
        </CapabilityCardsWrapper>
        
        <MessagesContainer>
          <MessageList messages={messages} />
        </MessagesContainer>
        
        <InputArea
          inputValue={inputValue}
          setInputValue={setInputValue}
          sendMessage={sendMessage}
          isConnected={isConnected}
          isLoading={isLoading}
          hasAnyModal={hasAnyModal}
        />
      </ChatContainerWrapper>
    </AnimatedContainer>
  );
};

export default ChatContainer;
