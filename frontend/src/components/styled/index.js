import styled from 'styled-components';
import { Layout, Header, Content, Sider } from 'antd';

// 样式组件
export const StyledSider = styled(Sider)`
  background: white;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
  z-index: 10;
  position: fixed;
  height: 100vh;
  overflow: auto;
`;

export const StyledLayout = styled(Layout)`
  height: 100vh;
  background: var(--gradient-secondary);
  overflow: hidden;
`;

export const StyledHeader = styled(Header).withConfig({
  shouldForwardProp: (prop) => prop !== 'hasModal'
})`
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(30, 58, 138, 0.15);
  position: fixed;
  width: ${props => props.hasModal ? 'calc(100% - 256px - 33.33%)' : 'calc(100% - 256px)'};
  z-index: 9;
  top: 0;
  left: 256px;
  transition: width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: width;
`;

export const StyledContent = styled(Content).withConfig({
  shouldForwardProp: (prop) => prop !== 'hasModal'
})`
  padding: 0;
  margin: 0;
  width: ${props => props.hasModal ? 'calc(100% - 256px - 33.33%)' : 'calc(100% - 256px)'};
  height: 100vh;
  display: flex;
  flex-direction: column;
  margin-top: 64px;
  margin-left: 256px;
  overflow: hidden;
  transition: width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: width;
`;

export const HeaderTitle = styled.h1`
  color: white !important;
  margin: 0 !important;
  display: flex;
  align-items: center;
  gap: 12px;
`;

export const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  background: white;
  overflow: hidden;
`;

export const ChatHeader = styled.div`
  background: var(--gradient-primary);
  color: white;
  padding: 16px 24px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  display: none; // 隐藏标题栏
`;

export const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  background: #f8fafc;
  width: 100%;
`;

export const CapabilityCardsWrapper = styled.div`
  flex-shrink: 0;
`;

export const MessageItem = styled.div`
  margin-bottom: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
`;

export const MessageContent = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'isUser' && prop !== 'isThinking'
}).attrs(props => ({
  isUser: props.isUser,
  isThinking: props.isThinking
}))`
  background: ${props => {
    if (props.isThinking) return '#f0f5ff';
    return props.isUser ? 'var(--primary-blue)' : 'white';
  }};
  color: ${props => {
    if (props.isThinking) return '#333333';
    return props.isUser ? 'white' : 'var(--gray-800)';
  }};
  padding: ${props => props.isThinking ? '16px' : '12px 16px'};
  border-radius: 12px;
  max-width: 70%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border-left: ${props => props.isThinking ? '4px solid #1890ff' : 'none'};
  font-family: ${props => props.isThinking ? 'monospace' : 'inherit'};
  position: relative;
  overflow-wrap: break-word;
  word-wrap: break-word;
  word-break: break-word;
`;

export const ThinkingIndicator = styled.span`
  color: #1890ff;
  margin-right: 5px;
`;

export const InputContainer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'hasModal'
})`
  padding: 16px;
  background: white;
  border-top: 1px solid #e5e7eb;
  display: flex;
  gap: 12px;
  flex-shrink: 0; // 防止输入框被压缩
  width: 100%;
  overflow-x: hidden;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);
`;

export const StatusCard = styled.div`
  margin-bottom: 16px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(30, 58, 138, 0.1);
`;

export const ResumeList = styled.div`
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 16px rgba(30, 58, 138, 0.1);
`; 