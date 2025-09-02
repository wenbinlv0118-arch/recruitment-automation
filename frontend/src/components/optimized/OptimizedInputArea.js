import React, { memo, useCallback } from 'react';
import { Input, Button } from 'antd';
import { SendOutlined } from '@ant-design/icons';
import styled from 'styled-components';

const InputContainer = styled.div`
  padding: 20px;
  background: var(--glass-bg);
  backdrop-filter: var(--blur-md);
  -webkit-backdrop-filter: var(--blur-md);
  border-top: 1px solid var(--glass-border);
  border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  display: flex;
  gap: 12px;
  flex-shrink: 0;
  width: 100%;
  overflow-x: hidden;
  box-shadow: var(--shadow-lg), 0 -4px 20px rgba(0, 122, 255, 0.1);
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--gradient-primary);
    opacity: 0.6;
  }
`;

/**
 * 优化的输入区域组件
 * 使用React.memo优化渲染性能
 */
const OptimizedInputArea = memo(({ 
  inputValue, 
  setInputValue, 
  onSendMessage, 
  isConnected, 
  isLoading 
}) => {
  // 处理发送消息
  const handleSend = useCallback(() => {
    if (inputValue.trim() && isConnected && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  }, [inputValue, isConnected, isLoading, onSendMessage, setInputValue]);
  
  // 处理回车键
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);
  
  return (
    <InputContainer>
      <Input.TextArea
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={isConnected ? "请输入您的问题..." : "连接中..."}
        disabled={!isConnected || isLoading}
        autoSize={{ minRows: 1, maxRows: 4 }}
        style={{
          flex: 1,
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)'
        }}
      />
      <Button
        type="primary"
        icon={<SendOutlined />}
        onClick={handleSend}
        disabled={!inputValue.trim() || !isConnected || isLoading}
        loading={isLoading}
        style={{
          background: 'var(--gradient-primary)',
          border: 'none',
          borderRadius: 'var(--radius-md)',
          height: 'auto',
          minHeight: '40px'
        }}
      >
        发送
      </Button>
    </InputContainer>
  );
});

OptimizedInputArea.displayName = 'OptimizedInputArea';

export default OptimizedInputArea;
