import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Progress, 
  Typography, 
  Space, 
  Tag, 
  Row, 
  Col, 
  Statistic, 
  Button,
  Alert,
  Divider
} from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import styled from 'styled-components';

const { Title, Text } = Typography;

// 样式组件
const ProgressContainer = styled.div`
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const ProgressBar = styled.div`
  margin: 16px 0;
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
`;

const ResumeCollectionProgress = ({ 
  isCollecting = false,
  currentCandidate = null,
  totalCandidates = 0,
  processedCandidates = 0,
  successfulCollections = 0,
  failedCollections = 0,
  currentStep = '',
  estimatedTime = 0,
  onPause,
  onResume,
  onStop
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // 计算进度百分比
  const progressPercent = totalCandidates > 0 ? 
    Math.round((processedCandidates / totalCandidates) * 100) : 0;

  // 计算成功率
  const successRate = processedCandidates > 0 ? 
    Math.round((successfulCollections / processedCandidates) * 100) : 0;

  // 计算剩余时间
  const remainingTime = estimatedTime > 0 ? 
    Math.max(0, estimatedTime - elapsedTime) : 0;

  // 格式化时间显示
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  // 计时器效果
  useEffect(() => {
    let interval;
    if (isCollecting && !isPaused) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCollecting, isPaused]);

  // 处理暂停/恢复
  const handlePauseResume = () => {
    if (isPaused) {
      setIsPaused(false);
      if (onResume) onResume();
    } else {
      setIsPaused(true);
      if (onPause) onPause();
    }
  };

  // 处理停止
  const handleStop = () => {
    if (onStop) onStop();
  };

  // 获取状态显示信息
  const getStatusInfo = () => {
    if (!isCollecting) {
      return {
        type: 'info',
        message: '简历采集未开始',
        icon: <ClockCircleOutlined />
      };
    }
    
    if (isPaused) {
      return {
        type: 'warning',
        message: '简历采集已暂停',
        icon: <PauseCircleOutlined />
      };
    }
    
    if (processedCandidates >= totalCandidates && totalCandidates > 0) {
      return {
        type: 'success',
        message: '简历采集完成！',
        icon: <CheckCircleOutlined />
      };
    }
    
    return {
      type: 'info',
      message: '简历采集中...',
      icon: <PlayCircleOutlined />
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <ProgressContainer>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 8 }}>
          <CheckCircleOutlined style={{ marginRight: 12, color: '#1890ff' }} />
          简历采集进度
        </Title>
        <Text type="secondary">
          实时监控简历采集状态和进度
        </Text>
      </div>

      {/* 状态指示器 */}
      <Alert
        message={statusInfo.message}
        type={statusInfo.type}
        icon={statusInfo.icon}
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* 当前候选人信息 */}
      {currentCandidate && (
        <Card size="small" style={{ marginBottom: 24 }}>
          <Title level={5}>当前处理候选人</Title>
          <Row gutter={16}>
            <Col span={8}>
              <Text strong>姓名：</Text>{currentCandidate.name}
            </Col>
            <Col span={8}>
              <Text strong>职位：</Text>{currentCandidate.title}
            </Col>
            <Col span={8}>
              <Text strong>公司：</Text>{currentCandidate.company}
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 8 }}>
            <Col span={8}>
              <Text strong>当前步骤：</Text>
              <Tag color="blue">{currentStep}</Tag>
            </Col>
            <Col span={8}>
              <Text strong>工作经验：</Text>{currentCandidate.experience}
            </Col>
            <Col span={8}>
              <Text strong>处理进度：</Text>
              <Text type="secondary">
                {processedCandidates + 1} / {totalCandidates}
              </Text>
            </Col>
          </Row>
        </Card>
      )}

      {/* 总体进度 */}
      <Card size="small" style={{ marginBottom: 24 }}>
        <Title level={5}>总体进度</Title>
        <ProgressBar>
          <Progress
            percent={progressPercent}
            status={processedCandidates >= totalCandidates && totalCandidates > 0 ? 'success' : 'active'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
        </ProgressBar>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="总候选人"
              value={totalCandidates}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已处理"
              value={processedCandidates}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="成功采集"
              value={successfulCollections}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="采集失败"
              value={failedCollections}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
        </Row>
        
        <Divider />
        
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <Text strong>成功率</Text>
              <div style={{ marginTop: 8 }}>
                <Progress
                  type="circle"
                  percent={successRate}
                  format={(percent) => `${percent}%`}
                  strokeColor={successRate >= 80 ? '#52c41a' : successRate >= 60 ? '#faad14' : '#ff4d4f'}
                  size={80}
                />
              </div>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              <Text strong>剩余时间</Text>
              <div style={{ marginTop: 8, fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {formatTime(remainingTime)}
              </div>
              <Text type="secondary">预计剩余时间</Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 时间统计 */}
      <Card size="small" style={{ marginBottom: 24 }}>
        <Title level={5}>时间统计</Title>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="已用时间"
              value={formatTime(elapsedTime)}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="预计总时间"
              value={formatTime(estimatedTime)}
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="平均处理时间"
              value={processedCandidates > 0 ? 
                formatTime(Math.round(elapsedTime / processedCandidates)) : '0秒'}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
        </Row>
      </Card>

      {/* 操作按钮 */}
      {isCollecting && (
        <Card size="small">
          <Title level={5}>操作控制</Title>
          <Space size="large">
            <Button
              type={isPaused ? 'primary' : 'default'}
              icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
              onClick={handlePauseResume}
            >
              {isPaused ? '恢复采集' : '暂停采集'}
            </Button>
            
            <Button
              danger
              icon={<ExclamationCircleOutlined />}
              onClick={handleStop}
            >
              停止采集
            </Button>
            
            <Button
              icon={<ReloadOutlined />}
              onClick={() => window.location.reload()}
            >
              刷新页面
            </Button>
          </Space>
        </Card>
      )}

      {/* 采集完成提示 */}
      {processedCandidates >= totalCandidates && totalCandidates > 0 && (
        <Alert
          message="简历采集完成！"
          description={`成功采集 ${successfulCollections} 份简历，失败 ${failedCollections} 份。请查看采集结果标签页获取详细信息。`}
          type="success"
          showIcon
          style={{ marginTop: 24 }}
        />
      )}
    </ProgressContainer>
  );
};

export default ResumeCollectionProgress;
