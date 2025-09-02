import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import io from 'socket.io-client';

/**
 * Socket连接管理hook
 * 优化Socket连接逻辑和错误处理
 */
export const useSocket = (onMessage) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // 初始化Socket连接
  useEffect(() => {
    const newSocket = io('http://localhost:5001', {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      upgrade: true,
      rememberUpgrade: true,
      autoConnect: true
    });
    
    // 连接成功
    newSocket.on('connect', () => {
      setIsConnected(true);
      if (onMessage) {
        onMessage('AI', '您好！我是 Moirai ，请告诉我您的需求，我将为您提供专业的服务～', false);
      }
    });
    
    // 连接断开
    newSocket.on('disconnect', (reason) => {
      console.log('Socket.IO连接断开:', reason);
      setIsConnected(false);
      
      const reasonMessages = {
        'io server disconnect': '服务器主动断开连接，正在尝试重连...',
        'transport close': '网络连接中断，正在尝试重连...',
        'transport error': '网络传输错误，正在尝试重连...'
      };
      
      if (reasonMessages[reason]) {
        message.warning(reasonMessages[reason]);
      }
    });
    
    // 连接错误
    newSocket.on('connect_error', (error) => {
      console.error('Socket.IO连接错误:', error);
      setIsConnected(false);
      
      if (error.message.includes('timeout')) {
        message.error('连接超时，请检查网络连接');
      } else if (error.message.includes('ECONNREFUSED')) {
        message.error('无法连接到服务器，请确认服务器已启动');
      } else {
        message.error('连接服务器失败: ' + error.message);
      }
    });
    
    // 重连成功
    newSocket.on('reconnect', (attemptNumber) => {
      console.log('Socket.IO重连成功，尝试次数:', attemptNumber);
      setIsConnected(true);
      message.success('重连成功！');
    });
    
    // 重连尝试
    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket.IO重连尝试:', attemptNumber);
      if (attemptNumber <= 3) {
        message.info(`正在尝试重连... (${attemptNumber}/10)`);
      }
    });
    
    // 重连错误
    newSocket.on('reconnect_error', (error) => {
      console.error('Socket.IO重连失败:', error);
    });
    
    setSocket(newSocket);
    
    // 清理函数
    return () => {
      newSocket.disconnect();
    };
  }, [onMessage]);
  
  // 发送消息
  const sendMessage = useCallback((message) => {
    if (socket && isConnected) {
      socket.emit('message', message);
    }
  }, [socket, isConnected]);
  
  return {
    socket,
    isConnected,
    sendMessage
  };
};
