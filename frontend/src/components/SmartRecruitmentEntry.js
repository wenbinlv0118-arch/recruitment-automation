import React, { useState } from 'react';
import { Card, Button, Space, Typography, Divider, Alert, Modal } from 'antd';
import { 
  RobotOutlined, 
  SearchOutlined, 
  MessageOutlined,
  StarOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import styled from 'styled-components';

const { Title, Text } = Typography;

const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const PlatformCardsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin: 24px 0;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PlatformCard = styled(Card)`
  height: 100%;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  border-radius: 12px;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
  
  &.selected {
    border-color: ${props => props.brandcolor};
    box-shadow: 0 4px 20px ${props => props.brandcolor}40;
  }
  
  .ant-card-body {
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .platform-header {
    text-align: center;
    margin-bottom: 20px;
    
    .platform-icon {
      font-size: 32px;
      margin-bottom: 12px;
      display: block;
    }
    
    .platform-name {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .platform-status {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      padding: 4px 8px;
      border-radius: 12px;
      background: ${props => props.statusbgcolor};
      color: ${props => props.statuscolor};
    }
  }
  
  .platform-description {
    text-align: center;
    color: #666;
    margin-bottom: 20px;
    line-height: 1.5;
  }
  
  .feature-list {
    flex: 1;
    margin-bottom: 20px;
    
    .feature-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      font-size: 13px;
      
      .feature-icon {
        margin-right: 8px;
        color: #52c41a;
        font-size: 12px;
      }
    }
  }
  
  .platform-actions {
    text-align: center;
    margin-top: auto;
  }
`;

const ActionButtons = styled.div`
  text-align: center;
  margin-top: 24px;
  
  .ant-btn {
    margin: 0 8px;
    height: 40px;
    padding: 0 24px;
    font-size: 16px;
  }
`;

const SmartRecruitmentEntry = ({ onStartRecruitment, onOpenBossZhipinControl, onOpenZhilianControl }) => {
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const platforms = [
    {
      id: 'zhilian',
      name: '智联招聘',
      icon: <SearchOutlined />,
      description: '智能简历搜索和下载',
      features: [
        '自动化简历搜索',
        '智能候选人筛选',
        '批量简历下载',
        '简历质量检测',
        '自动化入库流程'
      ],
      status: 'active',
      brandColor: '#1890ff',
      statusBgColor: '#e6f7ff',
      statusColor: '#1890ff'
    },
    {
      id: 'boss',
      name: 'Boss 直聘',
      icon: <RobotOutlined />,
      description: '全流程智能寻聘自动化',
      features: [
        '推荐牛人自动浏览',
        '搜索牛人条件配置',
        '沟通版块简历采集',
        '智能简历筛选管理',
        '自动收藏和入库'
      ],
      status: 'new',
      brandColor: '#fa8c16',
      statusBgColor: '#fff7e6',
      statusColor: '#fa8c16'
    },
    {
      id: 'wuyou',
      name: '前程无忧 51Job',
      icon: <MessageOutlined />,
      description: '智能简历采集和处理',
      features: [
        '简历自动采集',
        '候选人智能筛选',
        '简历质量检测',
        '自动化入库流程'
      ],
      status: 'coming',
      brandColor: '#722ed1',
      statusBgColor: '#f9f0ff',
      statusColor: '#722ed1'
    }
  ];

  const handlePlatformSelect = (platform) => {
    if (platform.status === 'active' || platform.status === 'new') {
      setSelectedPlatform(platform);
    }
  };

  const handleStartRecruitment = () => {
    if (selectedPlatform) {
      setShowConfirmModal(true);
    }
  };

  const confirmStartRecruitment = () => {
    setShowConfirmModal(false);
    
    // 特殊处理智联招聘
    if (selectedPlatform.id === 'zhilian' && onOpenZhilianControl) {
      onOpenZhilianControl();
      return;
    }
    
    // 特殊处理 Boss 直聘
    if (selectedPlatform.id === 'boss' && onOpenBossZhipinControl) {
      onOpenBossZhipinControl();
      return;
    }
    
    if (onStartRecruitment) {
      onStartRecruitment(selectedPlatform);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircleOutlined />;
      case 'new':
        return <StarOutlined />;
      case 'coming':
        return <InfoCircleOutlined />;
      default:
        return null;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return '已上线';
      case 'new':
        return '新功能';
      case 'coming':
        return '即将上线';
      default:
        return '';
    }
  };

  return (
    <Container>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2}>
          <RobotOutlined style={{ marginRight: 12, color: '#1890ff' }} />
          智能寻聘系统
        </Title>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          选择招聘平台，启动自动化招聘流程
        </Text>
      </div>

      <Alert
        message="功能说明"
        description="智能寻聘系统支持多个招聘平台，可以自动化完成简历采集、筛选和入库等招聘流程，大幅提升招聘效率。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <div style={{ marginBottom: 24 }}>
        <Title level={4}>选择招聘平台</Title>
        <Text type="secondary">点击下方卡片选择要使用的招聘平台</Text>
      </div>

      <PlatformCardsContainer>
        {platforms.map((platform) => (
          <PlatformCard
            key={platform.id}
            className={selectedPlatform?.id === platform.id ? 'selected' : ''}
            onClick={() => handlePlatformSelect(platform)}
            brandcolor={platform.brandColor}
            statusbgcolor={platform.statusBgColor}
            statuscolor={platform.statusColor}
            style={{ 
              opacity: platform.status === 'coming' ? 0.6 : 1,
              borderColor: selectedPlatform?.id === platform.id ? platform.brandColor : 'transparent'
            }}
          >
            <div className="platform-header">
              <div 
                className="platform-icon"
                style={{ color: platform.brandColor }}
              >
                {platform.icon}
              </div>
              <div className="platform-name">{platform.name}</div>
              <div className="platform-status">
                {getStatusIcon(platform.status)}
                {getStatusText(platform.status)}
              </div>
            </div>
            
            <div className="platform-description">
              {platform.description}
            </div>
            
            <div className="feature-list">
              {platform.features.map((feature, index) => (
                <div key={index} className="feature-item">
                  <CheckCircleOutlined className="feature-icon" />
                  <Text>{feature}</Text>
                </div>
              ))}
            </div>
            
            <div className="platform-actions">
              {platform.status === 'coming' && (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  敬请期待
                </Text>
              )}
            </div>
          </PlatformCard>
        ))}
      </PlatformCardsContainer>

      {selectedPlatform && (
        <ActionButtons>
          <Divider />
          <Title level={4}>已选择：{selectedPlatform.name}</Title>
          <Space size="large">
            <Button 
              type="primary" 
              size="large"
              onClick={handleStartRecruitment}
              icon={<RobotOutlined />}
              style={{ 
                background: selectedPlatform.brandColor,
                borderColor: selectedPlatform.brandColor
              }}
            >
              启动智能寻聘
            </Button>
            <Button 
              size="large"
              onClick={() => setSelectedPlatform(null)}
            >
              重新选择
            </Button>
          </Space>
        </ActionButtons>
      )}

      <Modal
        title="确认启动智能寻聘"
        open={showConfirmModal}
        onOk={confirmStartRecruitment}
        onCancel={() => setShowConfirmModal(false)}
        okText="确认启动"
        cancelText="取消"
      >
        <p>您即将启动 <strong>{selectedPlatform?.name}</strong> 的智能寻聘功能。</p>
        <p>请确保：</p>
        <ul>
          <li>已准备好相应的招聘平台账号</li>
          <li>网络连接稳定</li>
          <li>浏览器环境正常</li>
        </ul>
        <p>是否确认启动？</p>
      </Modal>
    </Container>
  );
};

export default SmartRecruitmentEntry;
