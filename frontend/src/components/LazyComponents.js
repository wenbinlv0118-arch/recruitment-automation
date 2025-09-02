import React, { lazy, Suspense, memo } from 'react';
import { Spin } from 'antd';
import styled from 'styled-components';

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  background: var(--glass-bg);
  border-radius: var(--radius-lg);
`;

/**
 * 加载中组件
 */
const LoadingFallback = memo(() => (
  <LoadingContainer>
    <Spin size="large" tip="加载中..." />
  </LoadingContainer>
));

LoadingFallback.displayName = 'LoadingFallback';

/**
 * 懒加载包装器
 */
export const withLazyLoading = (importFunc, fallback = <LoadingFallback />) => {
  const LazyComponent = lazy(importFunc);
  
  return memo((props) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  ));
};

// 懒加载的组件
export const LazyResumeLibrary = withLazyLoading(() => import('../ResumeLibrary'));
export const LazyKnowledgeBase = withLazyLoading(() => import('../KnowledgeBase'));
export const LazyTaskManagement = withLazyLoading(() => import('../TaskManagement'));
export const LazyPositionManagement = withLazyLoading(() => import('../PositionManagement'));
export const LazyBossZhipinControl = withLazyLoading(() => import('../BossZhipinControl'));
export const LazyZhilianControl = withLazyLoading(() => import('../ZhilianControl'));
export const LazyBrowser = withLazyLoading(() => import('../Browser'));

/**
 * 预加载函数
 */
export const preloadComponents = () => {
  // 预加载常用组件
  import('../ResumeLibrary');
  import('../KnowledgeBase');
  import('../TaskManagement');
};

// 在应用启动时预加载
if (typeof window !== 'undefined') {
  // 延迟预加载，避免影响首屏渲染
  setTimeout(preloadComponents, 2000);
}
