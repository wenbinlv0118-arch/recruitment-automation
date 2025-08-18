import React from 'react';
import { Card, Row, Col, Typography } from 'antd';
import { 
  RobotOutlined, 
  SearchOutlined, 
  FileTextOutlined, 
  UserOutlined,
  MessageOutlined,
  BookOutlined,
  DownloadOutlined,
  BarChartOutlined,
  CheckSquareOutlined,
  PlusOutlined
} from '@ant-design/icons';
import styled, { keyframes } from 'styled-components';
import { GlassCard, AnimatedContainer, HoverEffect } from './styled';

const { Title, Text } = Typography;

const CapabilityCardsContainer = styled.div`
  padding: 16px 20px;
  background: var(--glass-bg);
  backdrop-filter: var(--blur-md);
  -webkit-backdrop-filter: var(--blur-md);
  border-bottom: 1px solid var(--glass-border);
  flex-shrink: 0;
  position: relative;
  
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
`;

const StyledCard = styled(GlassCard)`
  cursor: pointer;
  height: 100%;
  position: relative;
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left var(--duration-normal) ease;
  }
  
  &:hover::after {
    left: 100%;
  }
  
  &:hover {
    transform: translateY(-6px) scale(1.02);
    box-shadow: var(--shadow-xl), 0 0 30px rgba(0, 122, 255, 0.2);
    border-color: var(--electric-blue);
  }
  
  &:active {
    transform: translateY(-2px) scale(0.98);
  }
`;

// 设置卡片内容样式
const cardBodyStyle = {
  padding: '16px',
  textAlign: 'center',
  position: 'relative',
  zIndex: 1
};

const IconWrapper = styled.div`
  font-size: 28px;
  color: var(--primary-blue);
  margin-bottom: 12px;
  display: flex;
  transition: all var(--duration-fast) ease;
  filter: drop-shadow(0 0 8px rgba(0, 122, 255, 0.3));
  
  ${StyledCard}:hover & {
    color: var(--electric-blue);
    transform: scale(1.1) rotate(5deg);
    filter: drop-shadow(0 0 12px rgba(0, 122, 255, 0.5));
  }
  justify-content: center;
`;

const CapabilityCards = ({ onCapabilityClick }) => {
  const capabilities = [
    {
      id: 'smart-recruitment',
      title: '智能寻聘',
      description: '自动化招聘流程，智能筛选候选人',
      icon: <RobotOutlined />,
      color: '#1890ff',
      keywords: ['招聘', '寻聘', '智能招聘', '自动化招聘']
    },
    {
      id: 'resume-recommendation',
      title: '简历推荐',
      description: '基于岗位需求推荐优秀候选人',
      icon: <UserOutlined />,
      color: '#52c41a',
      keywords: ['简历', '候选人', '推荐', '人才']
    },
    {
      id: 'knowledge-search',
      title: '知识检索',
      description: '搜索企业文档和知识库资料',
      icon: <SearchOutlined />,
      color: '#fa8c16',
      keywords: ['文档', '知识', '检索', '搜索', '查找']
    },
    {
      id: 'data-analytics',
      title: '数据分析',
      description: '招聘数据统计和分析报告',
      icon: <BarChartOutlined />,
      color: '#eb2f96',
      keywords: ['数据', '分析', '统计', '报告']
    },
    {
      id: 'position-creation',
      title: '岗位创建',
      description: '通过对话创建岗位并生成JD',
      icon: <PlusOutlined />,
      color: '#13c2c2',
      keywords: ['岗位', '职位', '创建岗位', '发布岗位', 'JD']
    }
  ];

  const handleCardClick = (capability) => {
    if (onCapabilityClick) {
      onCapabilityClick(capability);
    }
  };

  return (
    <CapabilityCardsContainer>
      <Row gutter={[16, 16]} justify="center">
        {capabilities.map((capability, index) => (
          <Col flex={1} style={{ minWidth: '200px', maxWidth: '300px' }} key={capability.id}>
            <AnimatedContainer 
              fadeIn
              duration="0.6s"
              delay={`${index * 0.1}s`}
            >
              <StyledCard
                onClick={() => handleCardClick(capability)}
                hoverable
                styles={{ body: cardBodyStyle }}
              >
                <IconWrapper style={{ color: capability.color }}>
                  {capability.icon}
                </IconWrapper>
                <Title level={5} style={{ marginBottom: 8, color: capability.color, fontWeight: 600 }}>
                  {capability.title}
                </Title>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {capability.description}
                </Text>
              </StyledCard>
            </AnimatedContainer>
          </Col>
        ))}
      </Row>
    </CapabilityCardsContainer>
  );
};

export default CapabilityCards;