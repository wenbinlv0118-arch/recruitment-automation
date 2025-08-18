import styled, { css, keyframes } from 'styled-components';
import { Button, Card, Input, Select, Modal } from 'antd';

// 动画定义
const pulse = keyframes`
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
`;

const slideIn = keyframes`
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const glow = keyframes`
  0%, 100% {
    box-shadow: var(--shadow-md), 0 0 8px rgba(0, 122, 255, 0.2);
  }
  50% {
    box-shadow: var(--shadow-lg), 0 0 16px rgba(0, 122, 255, 0.4);
  }
`;

// 基础按钮样式
const baseButtonStyles = css`
  background: var(--glass-bg);
  backdrop-filter: var(--blur-md);
  -webkit-backdrop-filter: var(--blur-md);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--duration-normal) var(--ease-out);
  font-weight: 600;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left var(--duration-normal) ease;
  }
  
  &:hover::before {
    left: 100%;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
    border-color: var(--primary-blue);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

// 主要按钮
export const PrimaryButton = styled(Button)`
  ${baseButtonStyles}
  background: var(--gradient-primary);
  color: white;
  border: none;
  
  &:hover {
    background: var(--gradient-primary);
    color: white;
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg), 0 0 20px rgba(0, 122, 255, 0.3);
  }
  
  &:focus {
    background: var(--gradient-primary);
    color: white;
    border: none;
  }
`;

// 次要按钮
export const SecondaryButton = styled(Button)`
  ${baseButtonStyles}
  color: var(--primary-blue);
  
  &:hover {
    color: var(--electric-blue);
    background: var(--glass-bg-light);
  }
  
  &:focus {
    color: var(--primary-blue);
  }
`;

// 危险按钮
export const DangerButton = styled(Button)`
  ${baseButtonStyles}
  background: var(--gradient-danger);
  color: white;
  border: none;
  
  &:hover {
    background: var(--gradient-danger);
    color: white;
    box-shadow: var(--shadow-lg), 0 0 20px rgba(245, 101, 101, 0.3);
  }
  
  &:focus {
    background: var(--gradient-danger);
    color: white;
    border: none;
  }
`;

// 玻璃拟态卡片
export const GlassCard = styled(Card)`
  background: var(--glass-bg);
  backdrop-filter: var(--blur-md);
  -webkit-backdrop-filter: var(--blur-md);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  transition: all var(--duration-normal) var(--ease-out);
  position: relative;
  overflow: hidden;
  animation: ${slideIn} 0.6s ease-out;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--grid-background);
    opacity: 0.02;
    pointer-events: none;
  }
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-xl), 0 0 30px rgba(0, 122, 255, 0.1);
    border-color: var(--primary-blue);
  }
  
  .ant-card-body {
    position: relative;
    z-index: 1;
  }
  
  .ant-card-head {
    background: transparent;
    border-bottom: 1px solid var(--glass-border);
    
    .ant-card-head-title {
      color: var(--gray-900);
      font-weight: 700;
      background: var(--gradient-text);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
  }
`;

// 高亮卡片
export const HighlightCard = styled(GlassCard)`
  border: 2px solid var(--primary-blue);
  animation: ${glow} 2s infinite;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--gradient-primary);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }
`;

// 玻璃拟态输入框
export const GlassInput = styled(Input)`
  background: var(--glass-bg);
  backdrop-filter: var(--blur-sm);
  -webkit-backdrop-filter: var(--blur-sm);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--duration-fast) ease;
  color: var(--gray-800);
  font-weight: 500;
  
  &:hover {
    border-color: var(--primary-blue);
    box-shadow: var(--shadow-md), 0 0 8px rgba(0, 122, 255, 0.1);
  }
  
  &:focus {
    background: var(--glass-bg-light);
    border-color: var(--electric-blue);
    box-shadow: var(--shadow-md), 0 0 12px rgba(0, 122, 255, 0.2);
  }
  
  &::placeholder {
    color: var(--gray-500);
    font-weight: 400;
  }
`;

// 玻璃拟态文本域
export const GlassTextArea = styled(Input.TextArea)`
  background: var(--glass-bg);
  backdrop-filter: var(--blur-sm);
  -webkit-backdrop-filter: var(--blur-sm);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: all var(--duration-fast) ease;
  color: var(--gray-800);
  font-weight: 500;
  resize: vertical;
  
  &:hover {
    border-color: var(--primary-blue);
    box-shadow: var(--shadow-md), 0 0 8px rgba(0, 122, 255, 0.1);
  }
  
  &:focus {
    background: var(--glass-bg-light);
    border-color: var(--electric-blue);
    box-shadow: var(--shadow-md), 0 0 12px rgba(0, 122, 255, 0.2);
  }
  
  &::placeholder {
    color: var(--gray-500);
    font-weight: 400;
  }
`;

// 玻璃拟态选择器
export const GlassSelect = styled(Select)`
  .ant-select-selector {
    background: var(--glass-bg) !important;
    backdrop-filter: var(--blur-sm);
    -webkit-backdrop-filter: var(--blur-sm);
    border: 1px solid var(--glass-border) !important;
    border-radius: var(--radius-md) !important;
    box-shadow: var(--shadow-sm);
    transition: all var(--duration-fast) ease;
  }
  
  &:hover .ant-select-selector {
    border-color: var(--primary-blue) !important;
    box-shadow: var(--shadow-md), 0 0 8px rgba(0, 122, 255, 0.1);
  }
  
  &.ant-select-focused .ant-select-selector {
    background: var(--glass-bg-light) !important;
    border-color: var(--electric-blue) !important;
    box-shadow: var(--shadow-md), 0 0 12px rgba(0, 122, 255, 0.2) !important;
  }
  
  .ant-select-selection-placeholder {
    color: var(--gray-500);
    font-weight: 400;
  }
  
  .ant-select-selection-item {
    color: var(--gray-800);
    font-weight: 500;
  }
`;

// 玻璃拟态模态框
export const GlassModal = styled(Modal)`
  .ant-modal-content {
    background: var(--glass-bg);
    backdrop-filter: var(--blur-lg);
    -webkit-backdrop-filter: var(--blur-lg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-2xl);
    overflow: hidden;
    position: relative;
  }
  
  .ant-modal-content::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--grid-background);
    opacity: 0.02;
    pointer-events: none;
  }
  
  .ant-modal-header {
    background: transparent;
    border-bottom: 1px solid var(--glass-border);
    position: relative;
    z-index: 1;
  }
  
  .ant-modal-title {
    color: var(--gray-900);
    font-weight: 700;
    background: var(--gradient-text);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .ant-modal-body {
    position: relative;
    z-index: 1;
  }
  
  .ant-modal-footer {
    background: transparent;
    border-top: 1px solid var(--glass-border);
    position: relative;
    z-index: 1;
  }
  
  .ant-modal-close {
    color: var(--gray-600);
    transition: all var(--duration-fast) ease;
  }
  
  .ant-modal-close:hover {
    color: var(--primary-blue);
    background: var(--glass-bg-light);
  }
`;

// 加载指示器
export const LoadingIndicator = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--primary-blue);
  font-weight: 600;
  animation: ${pulse} 1.5s infinite;
  
  &::before {
    content: '';
    width: 16px;
    height: 16px;
    border: 2px solid var(--primary-blue);
    border-top: 2px solid transparent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

// 状态标签
export const StatusTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 600;
  background: var(--glass-bg);
  backdrop-filter: var(--blur-sm);
  -webkit-backdrop-filter: var(--blur-sm);
  border: 1px solid var(--glass-border);
  transition: all var(--duration-fast) ease;
  
  ${props => props.status === 'success' && css`
    color: var(--success-green);
    border-color: var(--success-green);
    background: rgba(82, 196, 26, 0.1);
  `}
  
  ${props => props.status === 'warning' && css`
    color: var(--warning-orange);
    border-color: var(--warning-orange);
    background: rgba(250, 173, 20, 0.1);
  `}
  
  ${props => props.status === 'error' && css`
    color: var(--danger-red);
    border-color: var(--danger-red);
    background: rgba(245, 101, 101, 0.1);
  `}
  
  ${props => props.status === 'info' && css`
    color: var(--primary-blue);
    border-color: var(--primary-blue);
    background: rgba(0, 122, 255, 0.1);
  `}
`;

// 分割线
export const GlassDivider = styled.div`
  height: 1px;
  background: var(--glass-border);
  margin: 16px 0;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 1px;
    background: var(--gradient-primary);
  }
`;