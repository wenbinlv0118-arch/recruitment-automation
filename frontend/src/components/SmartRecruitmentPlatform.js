import React, { useState } from 'react';
import { Card, Row, Col, Typography, Button, Space, Divider, message } from 'antd';
import { 
  RobotOutlined, 
  SearchOutlined, 
  MessageOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StarOutlined
} from '@ant-design/icons';
import styled from 'styled-components';

const { Title, Text, Paragraph } = Typography;

// 样式组件
const PlatformSelectorContainer = styled.div`
  padding: 24px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const PlatformCard = styled(Card)`
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
  
  &.selected {
    border-color: #1890ff;
    background: #f0f8ff;
  }
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 16px 0;
  
  li {
    padding: 4px 0;
    display: flex;
    align-items: center;
    gap: 8px;
    
    .anticon {
      color: #52c41a;
      font-size: 14px;
    }
  }
`;

const ActionButton = styled(Button)`
  height: 40px;
  font-weight: 500;
`;

const SmartRecruitmentPlatform = ({ onPlatformSelect }) => {
  const [selectedPlatform, setSelectedPlatform] = useState(null);

  const platforms = [
    {
      id: 'zhilian',
      name: '智联招聘',
      icon: <RobotOutlined style={{ fontSize: 24, color: '#1890ff' }} />,
      description: '智能简历下载与筛选',
      features: [
        '自动化简历下载',
        '智能候选人筛选',
        '批量简历处理',
        '快速人才匹配'
      ],
      status: 'active',
      statusText: '已启用'
    },
    {
      id: 'boss',
      name: 'Boss 直聘',
      icon: <SearchOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
      description: '智能简历采集与入库',
      features: [
        '推荐牛人自动浏览',
        '搜索牛人条件筛选',
        '沟通版块简历处理',
        '智能质量检测',
        '自动收藏与入库'
      ],
      status: 'new',
      statusText: '新功能'
    },
    {
      id: '51job',
      name: '前程无忧 51Job',
      icon: <MessageOutlined style={{ fontSize: 24, color: '#fa8c16' }} />,
      description: '智能寻聘功能开发中',
      features: [
        '功能开发中',
        '敬请期待',
        '更多平台支持',
        '统一简历管理'
      ],
      status: 'coming',
      statusText: '即将推出'
    }
  ];

  const handlePlatformSelect = (platform) => {
    if (platform.status === 'coming') {
      message.info('该平台功能正在开发中，敬请期待！');
      return;
    }
    
    setSelectedPlatform(platform);
    if (onPlatformSelect) {
      onPlatformSelect(platform);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#52c41a';
      case 'new':
        return '#1890ff';
      case 'coming':
        return '#faad14';
      default:
        return '#d9d9d9';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircleOutlined />;
      case 'new':
        return <StarOutlined />;
      case 'coming':
        return <ClockCircleOutlined />;
      default:
        return null;
    }
  };

  return (
    <PlatformSelectorContainer>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 16 }}>
          <RobotOutlined style={{ marginRight: 12, color: '#1890ff' }} />
          智能寻聘平台
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          选择您要使用的招聘平台，开始智能化的招聘流程
        </Text>
      </div>

      <Row gutter={[24, 24]} justify="center">
        {platforms.map((platform) => (
          <Col xs={24} sm={12} lg={8} key={platform.id}>
            <PlatformCard
              className={selectedPlatform?.id === platform.id ? 'selected' : ''}
              onClick={() => handlePlatformSelect(platform)}
              hoverable
            >
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                {platform.icon}
                <Title level={3} style={{ margin: '16px 0 8px 0' }}>
                  {platform.name}
                </Title>
                <Text type="secondary" style={{ fontSize: 14 }}>
                  {platform.description}
                </Text>
              </div>

              <div style={{ 
                textAlign: 'center', 
                marginBottom: 16,
                padding: '8px 16px',
                backgroundColor: getStatusColor(platform.status) + '10',
                borderRadius: '16px',
                display: 'inline-block',
                width: '100%'
              }}>
                <Space>
                  {getStatusIcon(platform.status)}
                  <Text style={{ 
                    color: getStatusColor(platform.status),
                    fontWeight: 500 
                  }}>
                    {platform.statusText}
                  </Text>
                </Space>
              </div>

              <FeatureList>
                {platform.features.map((feature, index) => (
                  <li key={index}>
                    <CheckCircleOutlined />
                    <Text style={{ fontSize: '13px' }}>{feature}</Text>
                  </li>
                ))}
              </FeatureList>

              <Divider style={{ margin: '16px 0' }} />

              <div style={{ textAlign: 'center' }}>
                {platform.status === 'coming' ? (
                  <ActionButton type="default" disabled>
                    即将推出
                  </ActionButton>
                ) : (
                  <ActionButton 
                    type={selectedPlatform?.id === platform.id ? 'primary' : 'default'}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlatformSelect(platform);
                    }}
                  >
                    {selectedPlatform?.id === platform.id ? '已选择' : '选择平台'}
                  </ActionButton>
                )}
              </div>
            </PlatformCard>
          </Col>
        ))}
      </Row>

      {selectedPlatform && (
        <div style={{ 
          marginTop: 32, 
          padding: '20px', 
          backgroundColor: '#f6ffed', 
          border: '1px solid #b7eb8f',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <Title level={4} style={{ color: '#52c41a', marginBottom: 16 }}>
            <CheckCircleOutlined style={{ marginRight: 8 }} />
            已选择：{selectedPlatform.name}
          </Title>
          <Text style={{ fontSize: 14 }}>
            您已选择 {selectedPlatform.name} 平台，系统将为您启动相应的智能寻聘流程。
          </Text>
        </div>
      )}
    </PlatformSelectorContainer>
  );
};

export default SmartRecruitmentPlatform;
