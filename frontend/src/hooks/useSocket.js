import { useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

/**
 * Socket连接管理Hook
 * 提供WebSocket连接状态管理和事件处理
 */
const useSocket = (serverPath = null, options = {}) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  
  const reconnectTimeoutRef = useRef(null);
  const maxReconnectAttempts = options.maxReconnectAttempts || 5;
  const reconnectDelay = options.reconnectDelay || 3000;
  
  /**
   * 创建Socket连接
   */
  const createConnection = useCallback(() => {
    try {
      // 默认连接到当前域名的后端服务
      const socketUrl = serverPath || `${window.location.protocol}//${window.location.hostname}:3001`;
      
      const socketOptions = {
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
        ...options
      };
      
      console.log('Creating socket connection to:', socketUrl);
      
      const newSocket = io(socketUrl, socketOptions);
      
      // 连接成功事件
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setIsConnected(true);
        setConnectionError(null);
        setReconnectAttempts(0);
        
        // 清除重连定时器
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      });
      
      // 连接断开事件
      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setIsConnected(false);
        
        // 如果不是主动断开，尝试重连
        if (reason !== 'io client disconnect' && reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect();
        }
      });
      
      // 连接错误事件
      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnectionError(error.message);
        setIsConnected(false);
        
        // 尝试重连
        if (reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect();
        }
      });
      
      // 重连事件
      newSocket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        setReconnectAttempts(0);
      });
      
      // 重连尝试事件
      newSocket.on('reconnect_attempt', (attemptNumber) => {
        console.log('Socket reconnect attempt:', attemptNumber);
        setReconnectAttempts(attemptNumber);
      });
      
      // 重连失败事件
      newSocket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed after maximum attempts');
        setConnectionError('连接失败，已达到最大重试次数');
      });
      
      setSocket(newSocket);
      
      return newSocket;
    } catch (error) {
      console.error('Error creating socket connection:', error);
      setConnectionError(error.message);
      return null;
    }
  }, [serverPath, options, reconnectAttempts, maxReconnectAttempts]);
  
  /**
   * 安排重连
   */
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    const delay = reconnectDelay * Math.pow(1.5, reconnectAttempts); // 指数退避
    
    console.log(`Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
    
    reconnectTimeoutRef.current = setTimeout(() => {
      setReconnectAttempts(prev => prev + 1);
      createConnection();
    }, delay);
  }, [reconnectAttempts, maxReconnectAttempts, reconnectDelay, createConnection]);
  
  /**
   * 手动重连
   */
  const reconnect = useCallback(() => {
    if (socket) {
      socket.disconnect();
    }
    setReconnectAttempts(0);
    createConnection();
  }, [socket, createConnection]);
  
  /**
   * 断开连接
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    
    setIsConnected(false);
    setReconnectAttempts(0);
  }, [socket]);
  
  /**
   * 发送事件
   */
  const emit = useCallback((event, data, callback) => {
    if (socket && isConnected) {
      socket.emit(event, data, callback);
      return true;
    } else {
      console.warn('Socket not connected, cannot emit event:', event);
      return false;
    }
  }, [socket, isConnected]);
  
  /**
   * 监听事件
   */
  const on = useCallback((event, handler) => {
    if (socket) {
      socket.on(event, handler);
      return () => socket.off(event, handler);
    }
    return () => {};
  }, [socket]);
  
  /**
   * 取消监听事件
   */
  const off = useCallback((event, handler) => {
    if (socket) {
      socket.off(event, handler);
    }
  }, [socket]);
  
  // 初始化连接
  useEffect(() => {
    createConnection();
    
    // 清理函数
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socket) {
        socket.disconnect();
      }
    };
  }, []); // 空依赖数组，只在组件挂载时执行
  
  // 页面可见性变化处理
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 页面隐藏时，可以选择断开连接以节省资源
        console.log('Page hidden, socket connection maintained');
      } else {
        // 页面显示时，检查连接状态
        console.log('Page visible, checking socket connection');
        if (socket && !socket.connected) {
          reconnect();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [socket, reconnect]);
  
  // 网络状态变化处理
  useEffect(() => {
    const handleOnline = () => {
      console.log('Network online, checking socket connection');
      if (socket && !socket.connected) {
        reconnect();
      }
    };
    
    const handleOffline = () => {
      console.log('Network offline');
      setConnectionError('网络连接已断开');
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [socket, reconnect]);
  
  return {
    socket,
    isConnected,
    connectionError,
    reconnectAttempts,
    reconnect,
    disconnect,
    emit,
    on,
    off
  };
};

export { useSocket };