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
import styled from 'styled-components';

const { Title, Text } = Typography;

const CapabilityCardsContainer = styled.div`
  padding: 12px 16px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
`;

const StyledCard = styled(Card)`
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: 100%;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    border-color: #1890ff;
  }
  
  .ant-card-body {
    padding: 12px;
    text-align: center;
  }
`;

const IconWrapper = styled.div`
  font-size: 24px;
  color: #1890ff;
  margin-bottom: 8px;
  display: flex;
  justify-content: center;
`;

const CapabilityCards = ({ onCapabilityClick }) => {
  const capabilities = [
    {
      id: 'smart-recruitment',
      title: '智能寻聘',
      description: '多平台智能招聘，支持智联招聘、Boss直聘等',
      icon: <RobotOutlined />,
      color: '#1890ff',
      keywords: ['招聘', '寻聘', '智能招聘', '自动化招聘', '多平台']
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
      id: 'task-management',
      title: '任务管理',
      description: '创建和管理招聘任务流程',
      icon: <CheckSquareOutlined />,
      color: '#722ed1',
      keywords: ['任务', '管理', '招聘任务', '流程管理']
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
      <Row gutter={[12, 12]} justify="center">
        {capabilities.map((capability) => (
          <Col xs={12} sm={8} md={6} lg={4} key={capability.id}>
            <StyledCard
              onClick={() => handleCardClick(capability)}
              hoverable
            >
              <IconWrapper style={{ color: capability.color }}>
                {capability.icon}
              </IconWrapper>
              <Title level={5} style={{ marginBottom: 8 }}>
                {capability.title}
              </Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {capability.description}
              </Text>
            </StyledCard>
          </Col>
        ))}
      </Row>
    </CapabilityCardsContainer>
  );
};

export default CapabilityCards; 