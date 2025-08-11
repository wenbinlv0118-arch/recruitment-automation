import React from 'react';
import styled from 'styled-components';
import { Input, Button } from 'antd';
import { SendOutlined } from '@ant-design/icons';

const InputContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'hasModal'
})`
  padding: 16px;
  background: white;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  flex-shrink: 0;
  width: 100%;
  overflow-x: hidden;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1000;
`;

const InputArea = ({
  inputValue,
  setInputValue,
  sendMessage,
  isConnected,
  isLoading,
  hasAnyModal
}) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 临时修复：始终启用输入框，无论连接状态如何
  const isInputDisabled = false; // !isConnected || isLoading;
  const isButtonDisabled = !inputValue.trim(); // || !isConnected || isLoading;

  return (
    <InputContainer hasModal={hasAnyModal}>
      <Input
        placeholder="请输入消息..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={isInputDisabled}
        size="large"
        style={{ 
          zIndex: 1001,
          pointerEvents: 'auto'
        }}
      />
      <Button
        type="primary"
        icon={<SendOutlined />}
        onClick={sendMessage}
        disabled={isButtonDisabled}
        loading={isLoading}
        size="large"
        style={{ 
          zIndex: 1001,
          pointerEvents: 'auto'
        }}
      />
    </InputContainer>
  );
};

export default InputArea;
