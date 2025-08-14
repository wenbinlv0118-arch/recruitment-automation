import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

// 弹窗基础模式 - 样式定义
const BaseDrawer = styled.div`
  position: fixed;
  top: 64px;
  right: 0;
  bottom: 0;
  width: 33.33%;
  min-width: 400px;
  max-width: 600px;
  background: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  transform: translateX(${props => props.$visible ? '0' : '100%'});
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), visibility 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform;
  backface-visibility: hidden;
  perspective: 1000px;
  visibility: ${props => props.$visible ? 'visible' : 'hidden'};
  opacity: ${props => props.$visible ? '1' : '0'};
  pointer-events: ${props => props.$visible ? 'auto' : 'none'};
  user-select: none;
`;

const BaseDrawerHeader = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafafa;
`;

const BaseDrawerTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

const BaseCloseButton = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  color: #666;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform, background-color, color;
  
  &:hover {
    background: #f0f0f0;
    color: #333;
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const BaseDrawerBody = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
  height: calc(100vh - 80px);
  width: 100%;
  box-sizing: border-box;
  position: relative;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  scroll-behavior: smooth;
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }
`;

// 基础卡片样式
const BaseCard = styled.div`
  margin-bottom: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  border: 1px solid #f0f0f0;
  overflow: hidden;
  will-change: transform, opacity;
  
  &.fade-out {
    opacity: 0;
    transform: translateX(100%) scale(0.95);
    transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  }
`;

// 基础操作按钮样式
const BaseActionButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #d9d9d9;
  background: white;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform;
  
  &:hover {
    transform: scale(1.15);
  }
`;

// CSS动画定义
const slideInAnimation = `
  @keyframes slideInFromRight {
    from {
      opacity: 0;
      transform: translateX(50px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }
`;

// 弹窗基础模式组件
const ModalBasePattern = ({ 
  visible, 
  onClose, 
  title, 
  children,
  dataAttribute = "base-drawer"
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  // 注入CSS动画
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = slideInAnimation;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  // 处理显示状态变化
  useEffect(() => {
    if (visible) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsAnimating(false);
      }, 100);
    }
  }, [visible]);

  return (
    <BaseDrawer $visible={visible} data-drawer={dataAttribute}>
      <BaseDrawerHeader>
        <BaseDrawerTitle>{title}</BaseDrawerTitle>
        <BaseCloseButton 
          onClick={() => {
            // 添加关闭动画延迟
            const drawer = document.querySelector(`[data-drawer="${dataAttribute}"]`);
            if (drawer) {
              drawer.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
              drawer.style.transform = 'translateX(100%)';
              drawer.style.opacity = '0';
            }
            setTimeout(() => {
              onClose();
            }, 300);
          }}
        >
          ✕
        </BaseCloseButton>
      </BaseDrawerHeader>
      
      <BaseDrawerBody>
        {React.Children.map(children, (child, index) => {
          if (React.isValidElement(child)) {
            return React.cloneElement(child, {
              style: {
                ...child.props.style,
                animationDelay: `${index * 0.1}s`,
                animation: isAnimating ? 'slideInFromRight 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' : 'none'
              }
            });
          }
          return child;
        })}
      </BaseDrawerBody>
    </BaseDrawer>
  );
};

// 导出样式组件供单独使用
export {
  BaseDrawer,
  BaseDrawerHeader,
  BaseDrawerTitle,
  BaseCloseButton,
  BaseDrawerBody,
  BaseCard,
  BaseActionButton,
  slideInAnimation
};

export default ModalBasePattern;