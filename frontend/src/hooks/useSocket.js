import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { message } from 'antd';
import Logger from '../utils/logger';

export const useSocket = (appState) => {
  const [socket, setSocket] = useState(null);
  const messageIdCounter = useRef(0);
  const appStateRef = useRef(appState);

  // 更新ref但不触发重渲染
  useEffect(() => {
    appStateRef.current = appState;
  });

  useEffect(() => {
    Logger.log('正在连接Socket.IO...');
    
    const newSocket = io('/', {
      transports: ['websocket', 'polling'],
      timeout: 30000,
      forceNew: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      upgrade: true,
      rememberUpgrade: true
    });

    newSocket.on('connect', () => {
      Logger.log('Socket.IO连接成功:', newSocket.id);
      appStateRef.current.updateConnectionStatus(true);
      // 添加欢迎消息
      if (appStateRef.current.messages?.length === 0) {
        appStateRef.current.addMessage('AI', '您好！我是 Moirai ，请告诉我您的需求，我将为您提供专业的服务～', false);
      }
    });

    newSocket.on('disconnect', (reason) => {
      Logger.log('Socket.IO连接断开:', reason);
      appStateRef.current.updateConnectionStatus(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket.IO连接错误:', error);
      message.error('连接服务器失败: ' + error.message);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      Logger.log('Socket.IO重连成功，尝试次数:', attemptNumber);
      appStateRef.current.updateConnectionStatus(true);
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('Socket.IO重连失败:', error);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('Socket.IO重连失败，已达到最大尝试次数');
      message.error('无法连接到服务器，请刷新页面重试');
    });

    newSocket.on('statusUpdate', (data) => {
      Logger.log('收到状态更新:', data);
      appStateRef.current.updateCurrentStatus(data);
      appStateRef.current.addMessage('AI', data.message, false);
      
      if (data.requiresInput) {
        appStateRef.current.updateWaitingForCode(true);
      }
      
      if (data.status === 'completed') {
        appStateRef.current.updateLoadingStatus(false);
        appStateRef.current.fetchResumes();
      }
    });

    // 监听COT消息
    newSocket.on('cotMessage', (data) => {
      Logger.log('收到COT消息:', data);
      appStateRef.current.addCOTMessage(
        data.thinkingProcess || '',
        data.finalAnswer || '',
        data.isComplete || false,
        data.isStreaming || false
      );
    });

    // 监听思维链消息
    newSocket.on('thinking', (data) => {
      Logger.log('收到思维链消息:', data);
      const thinkingProcess = appStateRef.current.messageService?.parseThinkingMessage(data.content);
      if (thinkingProcess) {
        appStateRef.current.addCOTMessage(thinkingProcess, '', false, true);
      }
    });

    // 监听AI消息
    newSocket.on('aiMessage', (data) => {
      Logger.log('收到AI消息:', data);
      const { thinkingContent, finalAdviceContent } = appStateRef.current.messageService?.parseAIResponse(data.content) || {};
      
      if (thinkingContent) {
        appStateRef.current.addCOTMessage(thinkingContent, '', false, true);
      }
      
      // 更新COT消息，添加最终答案
      appStateRef.current.updateCOTMessage(thinkingContent, finalAdviceContent, true, false);
    });

    // 监听知识库AI对话消息
    newSocket.on('knowledgeChat', (data) => {
      Logger.log('收到知识库AI对话消息:', data);
      appStateRef.current.addMessage('AI', data.response, false);
    });

    // 监听最终建议消息
    newSocket.on('finalAnswer', (data) => {
      Logger.log('收到最终建议消息:', data);
      appStateRef.current.updateCOTMessage('', data.content, true, false);
    });

    // 监听公司分析完成事件
    newSocket.on('companyAnalysisCompleted', (data) => {
      Logger.log('公司分析完成:', data);
      
      if (data.status === 'success') {
        appStateRef.current.updateRecommendedCompanies(data.companies || [], data.recommendationReport || {});
        appStateRef.current.showCompanyRecommendationModal();
        appStateRef.current.addMessage('AI', `公司分析完成！共分析了 ${data.companies?.length || 0} 家公司，已为您生成智能推荐报告。`, false);
      } else {
        message.error('公司分析失败');
      }
    });

    // 监听公司搜索完成事件
    newSocket.on('companySearchCompleted', (data) => {
      Logger.log('公司搜索完成:', data);
      
      if (data.status === 'no_results') {
        message.warning('未找到符合条件的公司，请调整筛选条件后重试');
      }
    });

    newSocket.on('error', (data) => {
      console.error('收到错误:', data);
      message.error(data.message || '操作失败，请重试');
      appStateRef.current.updateLoadingStatus(false);
      appStateRef.current.updateWaitingForCode(false);
    });

    setSocket(newSocket);
    window.socket = newSocket; // 用于调试

    return () => {
      Logger.log('清理Socket.IO连接');
      if (newSocket) {
        newSocket.disconnect();
        newSocket.close();
      }
    };
  }, []); // 修复：空依赖数组，只在组件挂载时执行

  const startRecruitment = (phone = null) => {
    if (!socket) return;

    appStateRef.current.updateLoadingStatus(true);
    const phoneNumber = phone || appStateRef.current.extractPhoneFromMessages?.();
    
    if (!phoneNumber) {
      appStateRef.current.addMessage('AI', '请先提供您的手机号码', false);
      appStateRef.current.updateLoadingStatus(false);
      return;
    }

    socket.emit('startRecruitment', { phone: phoneNumber });
  };

  const sendVerificationCode = (code) => {
    if (!socket) return;

    socket.emit('submitVerificationCode', code);
    appStateRef.current.updateWaitingForCode(false);
  };

  const sendUserMessage = (message) => {
    if (socket) {
      socket.emit('userMessage', { message });
    }
  };

  const sendKnowledgeChat = (query) => {
    if (socket) {
      socket.emit('knowledgeChat', { 
        query,
        companyId: '1'
      });
    }
  };

  const startCompanySearch = (filters) => {
    if (socket) {
      socket.emit('startCompanySearch', {
        filters,
        userId: 'default'
      });
    }
  };

  return {
    socket,
    messageIdCounter,
    startRecruitment,
    sendVerificationCode,
    sendUserMessage,
    sendKnowledgeChat,
    startCompanySearch
  };
};