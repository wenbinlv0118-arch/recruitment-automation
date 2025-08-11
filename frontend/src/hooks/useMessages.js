import { useState, useRef, useCallback } from 'react';
import { MessageService } from '../services/messageService';

export const useMessages = () => {
  const [messages, setMessages] = useState([]);
  const messageIdCounter = useRef(0);
  const messageService = new MessageService(messageIdCounter);

  const addMessage = useCallback((sender, content, isUser = true, component = null) => {
    const newMessage = messageService.createNormalMessage(sender, content, isUser, component);
    setMessages(prev => [...prev, newMessage]);
  }, [messageService]);

  const addCOTMessage = useCallback((thinkingProcess, finalAnswer = '', isComplete = false, isStreaming = false) => {
    const newMessage = messageService.createCOTMessage(thinkingProcess, finalAnswer, isComplete, isStreaming);
    setMessages(prev => [...prev, newMessage]);
  }, [messageService]);

  const updateCOTMessage = useCallback((thinkingProcess, finalAnswer, isComplete, isStreaming) => {
    setMessages(prev => messageService.updateCOTMessage(prev, thinkingProcess, finalAnswer, isComplete, isStreaming));
  }, [messageService]);

  const updateMessageWithContent = useCallback((content, additionalComponent = null) => {
    setMessages(prev => messageService.updateCombinedMessage(prev, content, additionalComponent));
  }, [messageService]);

  const addKnowledgeSearchMessage = useCallback((results, query) => {
    const newMessage = messageService.createKnowledgeSearchMessage(results, query);
    setMessages(prev => [...prev, newMessage]);
  }, [messageService]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    messageIdCounter.current = 0;
  }, []);

  const extractPhoneFromMessages = useCallback(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const phoneMatch = messages[i].content.match(/1[3-9]\d{9}/);
      if (phoneMatch) {
        return phoneMatch[0];
      }
    }
    return null;
  }, [messages]);

  return {
    messages,
    setMessages,
    addMessage,
    addCOTMessage,
    updateCOTMessage,
    updateMessageWithContent,
    addKnowledgeSearchMessage,
    clearMessages,
    extractPhoneFromMessages,
    messageService
  };
}; 