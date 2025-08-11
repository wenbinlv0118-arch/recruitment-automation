import styled from 'styled-components';
import { Layout, Typography } from 'antd';

const { Header, Content, Sider } = Layout;
const { Title } = Typography;

// 布局样式
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

export const HeaderTitle = styled(Title)`
  color: white !important;
  margin: 0 !important;
  display: flex;
  align-items: center;
  gap: 12px;
`;