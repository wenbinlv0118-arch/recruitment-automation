import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * 消息管理hook
 * 优化消息状态管理和渲染性能
 */
export const useMessages = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const messageIdCounter = useRef(0);
  
  // 自动滚动到底部
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);
  
  // 监听消息变化，自动滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  
  // 添加消息（优化版本）
  const addMessage = useCallback((sender, content, isThinking = false, messageType = 'normal') => {
    const newMessage = {
      id: ++messageIdCounter.current,
      sender,
      content,
      isThinking,
      messageType,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  }, []);
  
  // 更新消息
  const updateMessage = useCallback((messageId, updates) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId ? { ...msg, ...updates } : msg
    ));
  }, []);
  
  // 删除消息
  const removeMessage = useCallback((messageId) => {
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
  }, []);
  
  // 清空消息
  const clearMessages = useCallback(() => {
    setMessages([]);
    messageIdCounter.current = 0;
  }, []);
  
  return {
    messages,
    inputValue,
    setInputValue,
    messagesEndRef,
    addMessage,
    updateMessage,
    removeMessage,
    clearMessages,
    scrollToBottom
  };
};
