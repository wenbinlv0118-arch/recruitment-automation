import styled, { css } from 'styled-components';

// 容器组件
export const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  
  @media (max-width: 768px) {
    padding: 0 16px;
  }
`;

// 弹性容器
export const FlexContainer = styled.div`
  display: flex;
  
  ${props => props.direction && css`
    flex-direction: ${props.direction};
  `}
  
  ${props => props.justify && css`
    justify-content: ${props.justify};
  `}
  
  ${props => props.align && css`
    align-items: ${props.align};
  `}
  
  ${props => props.wrap && css`
    flex-wrap: ${props.wrap};
  `}
  
  ${props => props.gap && css`
    gap: ${props.gap};
  `}
  
  ${props => props.flex && css`
    flex: ${props.flex};
  `}
`;

// 网格容器
export const GridContainer = styled.div`
  display: grid;
  
  ${props => props.columns && css`
    grid-template-columns: ${props.columns};
  `}
  
  ${props => props.rows && css`
    grid-template-rows: ${props.rows};
  `}
  
  ${props => props.gap && css`
    gap: ${props.gap};
  `}
  
  ${props => props.areas && css`
    grid-template-areas: ${props.areas};
  `}
  
  @media (max-width: 768px) {
    ${props => props.mobileColumns && css`
      grid-template-columns: ${props.mobileColumns};
    `}
  }
`;

// 响应式网格项
export const GridItem = styled.div`
  ${props => props.area && css`
    grid-area: ${props.area};
  `}
  
  ${props => props.column && css`
    grid-column: ${props.column};
  `}
  
  ${props => props.row && css`
    grid-row: ${props.row};
  `}
`;

// 玻璃拟态面板
export const GlassPanel = styled.div`
  background: var(--glass-bg);
  backdrop-filter: var(--blur-md);
  -webkit-backdrop-filter: var(--blur-md);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 24px;
  position: relative;
  overflow: hidden;
  
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
  
  ${props => props.padding && css`
    padding: ${props.padding};
  `}
  
  ${props => props.margin && css`
    margin: ${props.margin};
  `}
  
  ${props => props.height && css`
    height: ${props.height};
  `}
  
  ${props => props.width && css`
    width: ${props.width};
  `}
`;

// 侧边栏布局
export const SidebarLayout = styled.div`
  display: flex;
  height: 100vh;
  overflow: hidden;
`;

export const Sidebar = styled.aside`
  width: ${props => props.width || '256px'};
  background: var(--glass-bg);
  backdrop-filter: var(--blur-lg);
  -webkit-backdrop-filter: var(--blur-lg);
  border-right: 1px solid var(--glass-border);
  box-shadow: var(--shadow-lg);
  position: fixed;
  height: 100vh;
  overflow-y: auto;
  z-index: 100;
  transition: transform var(--duration-normal) var(--ease-out);
  
  ${props => props.collapsed && css`
    transform: translateX(-100%);
  `}
  
  /* 自定义滚动条 */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--glass-bg);
    border-radius: var(--radius-full);
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--gradient-primary);
    border-radius: var(--radius-full);
    transition: background var(--duration-fast) ease;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: var(--gradient-secondary);
  }
`;

export const MainContent = styled.main`
  flex: 1;
  margin-left: ${props => props.sidebarWidth || '256px'};
  background: var(--gradient-secondary);
  overflow: hidden;
  transition: margin-left var(--duration-normal) var(--ease-out);
  
  ${props => props.sidebarCollapsed && css`
    margin-left: 0;
  `}
`;

// 头部布局
export const HeaderLayout = styled.header`
  background: var(--glass-bg);
  backdrop-filter: var(--blur-lg);
  -webkit-backdrop-filter: var(--blur-lg);
  border-bottom: 1px solid var(--glass-border);
  box-shadow: var(--shadow-md);
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 50;
  
  ${props => props.fixed && css`
    position: fixed;
    width: 100%;
    top: 0;
    left: 0;
  `}
`;

// 内容区域
export const ContentArea = styled.div`
  padding: 24px;
  height: calc(100vh - 64px);
  overflow-y: auto;
  
  /* 自定义滚动条 */
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: var(--glass-bg);
    border-radius: var(--radius-full);
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--gradient-primary);
    border-radius: var(--radius-full);
    transition: background var(--duration-fast) ease;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: var(--gradient-secondary);
  }
  
  @media (max-width: 768px) {
    padding: 16px;
  }
`;

// 卡片网格
export const CardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  ${props => props.minWidth && css`
    grid-template-columns: repeat(auto-fill, minmax(${props.minWidth}, 1fr));
  `}
  
  ${props => props.columns && css`
    grid-template-columns: repeat(${props.columns}, 1fr);
  `}
`;

// 分栏布局
export const ColumnLayout = styled.div`
  display: flex;
  gap: 24px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 16px;
  }
`;

export const Column = styled.div`
  flex: ${props => props.flex || 1};
  
  ${props => props.width && css`
    width: ${props.width};
    flex: none;
  `}
  
  ${props => props.minWidth && css`
    min-width: ${props.minWidth};
  `}
`;

// 居中容器
export const CenterContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: ${props => props.minHeight || '200px'};
  
  ${props => props.fullHeight && css`
    min-height: 100vh;
  `}
`;

// 堆叠容器
export const StackContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.gap || '16px'};
  
  ${props => props.horizontal && css`
    flex-direction: row;
    align-items: center;
  `}
`;

// 响应式隐藏
export const HideOnMobile = styled.div`
  @media (max-width: 768px) {
    display: none;
  }
`;

export const ShowOnMobile = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: block;
  }
`;

// 固定定位容器
export const FixedContainer = styled.div`
  position: fixed;
  
  ${props => props.top && css`
    top: ${props.top};
  `}
  
  ${props => props.bottom && css`
    bottom: ${props.bottom};
  `}
  
  ${props => props.left && css`
    left: ${props.left};
  `}
  
  ${props => props.right && css`
    right: ${props.right};
  `}
  
  ${props => props.zIndex && css`
    z-index: ${props.zIndex};
  `}
`;

// 浮动操作按钮容器
export const FloatingActionContainer = styled(FixedContainer)`
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 12px;
  
  @media (max-width: 768px) {
    bottom: 16px;
    right: 16px;
  }
`;