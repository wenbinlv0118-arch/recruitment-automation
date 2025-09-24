import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket';

/**
 * CDP Canvas组件
 * 用于渲染CDP实时屏幕画面并处理用户交互
 */
const CDPCanvas = ({ 
  width = 1920, 
  height = 1080, 
  onInteraction,
  className = '',
  style = {} 
}) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [stats, setStats] = useState({
    frameCount: 0,
    fps: 0,
    latency: 0
  });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  
  // 性能监控
  const frameStatsRef = useRef({
    frameCount: 0,
    lastTime: Date.now(),
    frameTimestamps: []
  });
  
  // Socket连接
  const { socket, isConnected: socketConnected } = useSocket();
  
  /**
   * 计算画布缩放和偏移
   */
  const calculateScale = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    const scaleX = containerWidth / width;
    const scaleY = containerHeight / height;
    const newScale = Math.min(scaleX, scaleY, 1); // 不超过原始大小
    
    const scaledWidth = width * newScale;
    const scaledHeight = height * newScale;
    
    const newOffset = {
      x: (containerWidth - scaledWidth) / 2,
      y: (containerHeight - scaledHeight) / 2
    };
    
    setScale(newScale);
    setOffset(newOffset);
  }, [width, height]);
  
  /**
   * 处理屏幕帧数据
   */
  const handleScreenFrame = useCallback((frameData) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // 清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 绘制图像
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // 更新性能统计
      updateFrameStats(frameData.timestamp);
    };
    
    img.onerror = (error) => {
      console.error('Error loading frame image:', error);
    };
    
    // 设置图像源
    img.src = `data:image/jpeg;base64,${frameData.data}`;
  }, []);
  
  /**
   * 更新帧统计信息
   */
  const updateFrameStats = useCallback((frameTimestamp) => {
    const now = Date.now();
    const frameStats = frameStatsRef.current;
    
    frameStats.frameCount++;
    frameStats.frameTimestamps.push(now);
    
    // 保持最近1秒的时间戳
    frameStats.frameTimestamps = frameStats.frameTimestamps.filter(
      timestamp => now - timestamp <= 1000
    );
    
    // 计算FPS
    const fps = frameStats.frameTimestamps.length;
    
    // 计算延迟
    const latency = frameTimestamp ? now - frameTimestamp : 0;
    
    // 每秒更新一次统计
    if (now - frameStats.lastTime >= 1000) {
      setStats({
        frameCount: frameStats.frameCount,
        fps,
        latency
      });
      frameStats.lastTime = now;
    }
  }, []);
  
  /**
   * 将画布坐标转换为实际坐标
   */
  const canvasToActualCoords = useCallback((canvasX, canvasY) => {
    const actualX = (canvasX - offset.x) / scale;
    const actualY = (canvasY - offset.y) / scale;
    return { x: Math.round(actualX), y: Math.round(actualY) };
  }, [scale, offset]);
  
  /**
   * 处理鼠标点击事件
   */
  const handleMouseClick = useCallback((event) => {
    if (!isConnected) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    
    const { x, y } = canvasToActualCoords(canvasX, canvasY);
    
    const interactionData = {
      type: 'click',
      data: {
        x,
        y,
        button: event.button === 0 ? 'left' : event.button === 2 ? 'right' : 'middle',
        clickCount: event.detail || 1
      }
    };
    
    // 发送交互事件
    if (socket) {
      socket.emit('user-interaction', interactionData);
    }
    
    // 回调通知
    if (onInteraction) {
      onInteraction(interactionData);
    }
  }, [isConnected, socket, canvasToActualCoords, onInteraction]);
  
  /**
   * 处理鼠标移动事件
   */
  const handleMouseMove = useCallback((event) => {
    if (!isConnected) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    
    const { x, y } = canvasToActualCoords(canvasX, canvasY);
    
    const interactionData = {
      type: 'mousemove',
      data: { x, y }
    };
    
    // 发送交互事件（节流处理）
    if (socket) {
      socket.emit('user-interaction', interactionData);
    }
  }, [isConnected, socket, canvasToActualCoords]);
  
  /**
   * 处理键盘事件
   */
  const handleKeyDown = useCallback((event) => {
    if (!isConnected) return;
    
    const interactionData = {
      type: 'keyboard',
      data: {
        type: 'keyDown',
        key: event.key,
        code: event.code,
        modifiers: {
          alt: event.altKey,
          ctrl: event.ctrlKey,
          meta: event.metaKey,
          shift: event.shiftKey
        }
      }
    };
    
    // 发送交互事件
    if (socket) {
      socket.emit('user-interaction', interactionData);
    }
    
    // 阻止默认行为
    event.preventDefault();
  }, [isConnected, socket]);
  
  /**
   * 处理滚轮事件
   */
  const handleWheel = useCallback((event) => {
    if (!isConnected) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const canvasX = event.clientX - rect.left;
    const canvasY = event.clientY - rect.top;
    
    const { x, y } = canvasToActualCoords(canvasX, canvasY);
    
    const interactionData = {
      type: 'scroll',
      data: {
        x,
        y,
        deltaX: event.deltaX,
        deltaY: event.deltaY
      }
    };
    
    // 发送交互事件
    if (socket) {
      socket.emit('user-interaction', interactionData);
    }
    
    // 阻止默认滚动
    event.preventDefault();
  }, [isConnected, socket, canvasToActualCoords]);
  
  // 初始化和事件监听
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // 设置画布尺寸
    canvas.width = width;
    canvas.height = height;
    
    // 计算缩放
    calculateScale();
    
    // 监听窗口大小变化
    const handleResize = () => {
      calculateScale();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [width, height, calculateScale]);
  
  // Socket事件监听
  useEffect(() => {
    if (!socket) return;
    
    // 监听连接状态
    const handleConnect = () => {
      setIsConnected(true);
      console.log('CDP Canvas connected to socket');
    };
    
    const handleDisconnect = () => {
      setIsConnected(false);
      console.log('CDP Canvas disconnected from socket');
    };
    
    // 监听屏幕帧
    const handleScreenFrame = (data) => {
      if (data.type === 'screen-frame') {
        handleScreenFrame(data.data);
      }
    };
    
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('screen-frame', handleScreenFrame);
    
    // 检查当前连接状态
    if (socket.connected) {
      setIsConnected(true);
    }
    
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('screen-frame', handleScreenFrame);
    };
  }, [socket, handleScreenFrame]);
  
  // 键盘焦点管理
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // 设置tabIndex使画布可以获得焦点
    canvas.tabIndex = 0;
    
    const handleFocus = () => {
      canvas.addEventListener('keydown', handleKeyDown);
    };
    
    const handleBlur = () => {
      canvas.removeEventListener('keydown', handleKeyDown);
    };
    
    canvas.addEventListener('focus', handleFocus);
    canvas.addEventListener('blur', handleBlur);
    
    return () => {
      canvas.removeEventListener('focus', handleFocus);
      canvas.removeEventListener('blur', handleBlur);
      canvas.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  return (
    <div 
      ref={containerRef}
      className={`cdp-canvas-container ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#000',
        ...style
      }}
    >
      {/* 画布 */}
      <canvas
        ref={canvasRef}
        onClick={handleMouseClick}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          position: 'absolute',
          left: offset.x,
          top: offset.y,
          width: width * scale,
          height: height * scale,
          cursor: isConnected ? 'crosshair' : 'not-allowed',
          border: isConnected ? '1px solid #4CAF50' : '1px solid #f44336'
        }}
      />
      
      {/* 连接状态指示器 */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          color: 'white',
          backgroundColor: isConnected ? '#4CAF50' : '#f44336'
        }}
      >
        {isConnected ? '已连接' : '未连接'}
      </div>
      
      {/* 性能统计 */}
      {isConnected && (
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.7)'
          }}
        >
          <div>FPS: {stats.fps}</div>
          <div>延迟: {stats.latency}ms</div>
          <div>帧数: {stats.frameCount}</div>
        </div>
      )}
      
      {/* 缩放信息 */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          color: 'white',
          backgroundColor: 'rgba(0, 0, 0, 0.7)'
        }}
      >
        缩放: {Math.round(scale * 100)}%
      </div>
      
      {/* 未连接时的提示 */}
      {!isConnected && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: 'white',
            fontSize: '16px'
          }}
        >
          <div>CDP连接未建立</div>
          <div style={{ fontSize: '12px', marginTop: '8px', opacity: 0.7 }}>
            等待屏幕共享连接...
          </div>
        </div>
      )}
    </div>
  );
};

export default CDPCanvas;