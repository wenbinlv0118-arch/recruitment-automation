import React from 'react';
import styled from 'styled-components';
import CapabilityCards from './CapabilityCards';
import MessageList from './MessageList';
import InputArea from './InputArea';

const ChatContainerWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  background: white;
  overflow: hidden;
`;

const CapabilityCardsWrapper = styled.div`
  flex-shrink: 0;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  background: #f8fafc;
  width: 100%;
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
  );
};

export default ChatContainer;
