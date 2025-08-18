import React from 'react';
import styled from 'styled-components';
import { Input, Button } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import { GlassInput, PrimaryButton } from './styled';

const InputContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'hasModal'
})`
  padding: 20px;
  background: var(--glass-bg);
  backdrop-filter: var(--blur-md);
  -webkit-backdrop-filter: var(--blur-md);
  border-top: 1px solid var(--glass-border);
  display: flex;
  gap: 16px;
  align-items: flex-end;
  flex-shrink: 0;
  width: 100%;
  overflow-x: hidden;
  box-shadow: var(--shadow-lg), 0 -4px 20px rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 1000;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--electric-blue), transparent);
    opacity: 0.6;
  }
`;

const StyledInput = styled(GlassInput)`
  flex: 1;
  min-height: 44px;
  
  .ant-input {
    background: transparent;
    border: none;
    color: var(--gray-800);
    font-size: 15px;
    
    &::placeholder {
      color: var(--gray-500);
    }
    
    &:focus {
      box-shadow: none;
    }
  }
`;

const StyledButton = styled(PrimaryButton)`
  height: 44px;
  min-width: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 16px;
  
  .anticon {
    font-size: 16px;
  }
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
      <StyledInput
        placeholder="请输入消息..."
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        disabled={isInputDisabled}
        size="large"
        autoSize={{ minRows: 1, maxRows: 4 }}
        style={{ 
          zIndex: 1001,
          pointerEvents: 'auto'
        }}
      />
      <StyledButton
        icon={<SendOutlined />}
        onClick={sendMessage}
        disabled={isButtonDisabled}
        loading={isLoading}
        style={{ 
          zIndex: 1001,
          pointerEvents: 'auto'
        }}
      />
    </InputContainer>
  );
};

export default InputArea;
