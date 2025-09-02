import React, { useState, useEffect, memo } from 'react';
import { Card, Progress, Typography } from 'antd';
import styled from 'styled-components';

const { Text } = Typography;

const MonitorContainer = styled(Card)`
  position: fixed;
  top: 80px;
  right: 20px;
  width: 280px;
  z-index: 1000;
  background: var(--glass-bg) !important;
  backdrop-filter: var(--blur-md) !important;
  -webkit-backdrop-filter: var(--blur-md) !important;
  border: 1px solid var(--glass-border) !important;
  border-radius: var(--radius-lg) !important;
  box-shadow: var(--shadow-xl) !important;
  
  .ant-card-body {
    padding: 16px;
  }
`;

/**
 * 性能监控组件
 * 实时监控应用性能指标
 */
const PerformanceMonitor = memo(({ show = false }) => {
  const [metrics, setMetrics] = useState({
    memory: 0,
    fps: 0,
    renderTime: 0,
    componentCount: 0
  });
  
  useEffect(() => {
    if (!show) return;
    
    const updateMetrics = () => {
      // 内存使用情况
      const memory = performance.memory ? 
        Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0;
      
      // FPS计算
      let fps = 0;
      let lastTime = performance.now();
      let frameCount = 0;
      
      const calculateFPS = () => {
        frameCount++;
        const currentTime = performance.now();
        if (currentTime - lastTime >= 1000) {
          fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
          frameCount = 0;
          lastTime = currentTime;
        }
        requestAnimationFrame(calculateFPS);
      };
      
      calculateFPS();
      
      // 组件数量（估算）
      const componentCount = document.querySelectorAll('[data-reactroot] *').length;
      
      setMetrics(prev => ({
        ...prev,
        memory,
        fps,
        componentCount
      }));
    };
    
    const interval = setInterval(updateMetrics, 1000);
    updateMetrics();
    
    return () => clearInterval(interval);
  }, [show]);
  
  if (!show) return null;
  
  return (
    <MonitorContainer title="性能监控" size="small">
      <div style={{ marginBottom: '12px' }}>
        <Text strong>内存使用: {metrics.memory}MB</Text>
        <Progress 
          percent={Math.min((metrics.memory / 100) * 100, 100)} 
          size="small" 
          status={metrics.memory > 80 ? 'exception' : 'normal'}
        />
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <Text strong>FPS: {metrics.fps}</Text>
        <Progress 
          percent={Math.min((metrics.fps / 60) * 100, 100)} 
          size="small" 
          status={metrics.fps < 30 ? 'exception' : 'normal'}
        />
      </div>
      
      <div>
        <Text strong>DOM节点: {metrics.componentCount}</Text>
        <Progress 
          percent={Math.min((metrics.componentCount / 1000) * 100, 100)} 
          size="small" 
          status={metrics.componentCount > 800 ? 'exception' : 'normal'}
        />
      </div>
    </MonitorContainer>
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';

export default PerformanceMonitor;
