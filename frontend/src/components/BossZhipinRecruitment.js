import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Steps, Alert, Divider, Row, Col, Statistic, Tabs, message, Tag } from 'antd';
import { 
  PlayCircleOutlined, 
  StopOutlined, 
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  RobotOutlined,
  GlobalOutlined,
  UserOutlined,
  SearchOutlined,
  FilterOutlined,
  UploadOutlined,
  RocketOutlined,
  SettingOutlined,
  BookOutlined
} from '@ant-design/icons';
import styled from 'styled-components';
import bossZhipinService from '../services/bossZhipinService';
import CandidateFilterConfigurator from './CandidateFilterConfigurator';
import ResumeCollectionResults from './ResumeCollectionResults';
import ResumeCollectionProgress from './ResumeCollectionProgress';
import ResumeFilterInterface from './ResumeFilterInterface';
import ResumeUploadWithPaste from './ResumeUploadWithPaste';
import EndToEndTest from './EndToEndTest';
import PerformanceOptimizer from './PerformanceOptimizer';
import UserGuide from './UserGuide';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

// 样式组件
const ControlPanelContainer = styled.div`
  padding: 24px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const StatusCard = styled(Card)`
  margin-bottom: 16px;
  
  .ant-card-head {
    background: ${props => {
      if (props.status === 'running') return '#f6ffed';
      if (props.status === 'stopped') return '#fff2e8';
      if (props.status === 'error') return '#fff1f0';
      return '#f0f0f0';
    }};
    border-color: ${props => {
      if (props.status === 'running') return '#b7eb8f';
      if (props.status === 'stopped') return '#ffbb96';
      if (props.status === 'error') return '#ffa39e';
      return '#d9d9d9';
    }};
  }
`;

const StepContainer = styled.div`
  margin: 24px 0;
  
  .ant-steps-item-process .ant-steps-item-icon {
    background: #1890ff;
    border-color: #1890ff;
  }
  
  .ant-steps-item-finish .ant-steps-item-icon {
    background: #52c41a;
    border-color: #52c41a;
  }
`;

const ActionButton = styled(Button)`
  height: 40px;
  font-weight: 500;
  min-width: 120px;
`;

const BossZhipinRecruitment = () => {
  const [status, setStatus] = useState('stopped');
  const [currentStep, setCurrentStep] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [activeTab, setActiveTab] = useState('control');
  const [collectedResumes, setCollectedResumes] = useState([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [currentCandidate, setCurrentCandidate] = useState(null);
  const [collectionProgress, setCollectionProgress] = useState({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0
  });

  // 初始化时加载简历数据
  useEffect(() => {
    updateResumeData();
  }, []);

  // 步骤配置
  const steps = [
    {
      title: '启动流程',
      description: '初始化浏览器自动化',
      icon: <RobotOutlined />
    },
    {
      title: '打开官网',
      description: '访问 Boss 直聘官网',
      icon: <GlobalOutlined />
    },
    {
      title: '导航招聘',
      description: '点击"我要招聘"',
      icon: <UserOutlined />
    },
    {
      title: '选择登录方式',
      description: '选择 App 扫码登录',
      icon: <ClockCircleOutlined />
    },
    {
      title: '等待扫码登录',
      description: '用户使用 App 扫码',
      icon: <ClockCircleOutlined />
    },
    {
      title: '验证登录状态',
      description: '确认登录成功',
      icon: <CheckCircleOutlined />
    },
    {
      title: '进入招聘系统',
      description: '开始智能寻聘',
      icon: <RobotOutlined />
    },
    {
      title: '候选人发现',
      description: '选择寻聘方式',
      icon: <SearchOutlined />
    }
  ];

  // 获取当前步骤索引
  const getCurrentStepIndex = () => {
    const stepMap = {
      '启动中': 0,
      '初始化浏览器': 0,
      '打开官网': 1,
      '导航招聘页面': 2,
      '启动登录自动化': 3,
      '选择登录方式': 3,
      '等待扫码登录': 4,
      '验证登录状态': 5,
      '登录验证完成': 5,
      '进入招聘系统': 6,
      '登录完成': 6,
      '启动候选人发现': 7,
      '已停止': -1
    };
    return stepMap[currentStep] || -1;
  };

  // 启动智能寻聘
  const handleStart = async () => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      setStatus('running');
      
      await bossZhipinService.startRecruitment();
      
      // 开始状态监控
      startStatusMonitoring();
      
    } catch (error) {
      setStatus('error');
      setErrorMessage(error.message);
      setIsLoading(false);
    }
  };

  // 处理候选人发现选项
  const handleCandidateDiscoveryOptions = () => {
    setActiveTab('discovery');
  };

  // 处理筛选条件应用
  const handleFilterApply = async (filterConfig) => {
    try {
      setIsLoading(true);
      setErrorMessage('');
      setStatus('running');
      
      // 启动搜索牛人流程
      await bossZhipinService.startSearchCandidates(filterConfig);
      
      // 开始状态监控
      startStatusMonitoring();
      
    } catch (error) {
      setStatus('error');
      setErrorMessage(error.message);
      setIsLoading(false);
    }
  };

  // 处理筛选条件保存
  const handleFilterSave = async (filterConfig) => {
    try {
      message.success(`筛选器"${filterConfig.name}"保存成功`);
      // 这里可以添加保存到本地存储或后端的逻辑
    } catch (error) {
      message.error(`保存筛选器失败: ${error.message}`);
    }
  };

  // 停止智能寻聘
  const handleStop = async () => {
    try {
      await bossZhipinService.stopRecruitment();
      setStatus('stopped');
      setCurrentStep('');
      setIsLoading(false);
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  // 更新简历数据
  const updateResumeData = () => {
    const resumes = bossZhipinService.getResumeCollectionResults();
    setCollectedResumes(resumes);
  };

  // 处理简历操作
  const handleResumeAction = (action, resumeId) => {
    if (action === 'delete') {
      // 从列表中移除简历
      setCollectedResumes(prev => prev.filter(r => r.id !== resumeId));
      // 更新统计信息
      updateResumeData();
    }
  };

  // 清空所有简历
  const handleClearAllResumes = () => {
    bossZhipinService.clearResumeCollectionResults();
    setCollectedResumes([]);
  };

  // 处理质量阈值变更
  const handleQualityThresholdChange = (threshold) => {
    bossZhipinService.setResumeQualityThreshold(threshold);
    // 重新计算统计信息
    updateResumeData();
  };

  // 处理批量操作
  const handleBatchAction = (action, resumeIds) => {
    switch (action) {
      case 'like':
        // 批量点赞
        setCollectedResumes(prev => 
          prev.map(resume => 
            resumeIds.includes(resume.id) 
              ? { ...resume, status: 'liked' }
              : resume
          )
        );
        break;
      case 'dislike':
        // 批量点踩
        setCollectedResumes(prev => 
          prev.map(resume => 
            resumeIds.includes(resume.id) 
              ? { ...resume, status: 'disliked' }
              : resume
          )
        );
        break;
      case 'download':
        // 批量下载
        const selectedResumes = collectedResumes.filter(r => resumeIds.includes(r.id));
        selectedResumes.forEach(resume => {
          const content = `候选人简历 - ${resume.candidateName}\n\n${resume.resumeText}`;
          const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${resume.candidateName}_简历.txt`;
          link.click();
          URL.revokeObjectURL(url);
        });
        message.success(`已下载 ${selectedResumes.length} 份简历`);
        break;
      case 'delete':
        // 批量删除
        setCollectedResumes(prev => prev.filter(r => !resumeIds.includes(r.id)));
        message.success(`已删除 ${resumeIds.length} 份简历`);
        break;
      default:
        break;
    }
    
    // 更新统计信息
    updateResumeData();
  };

  // 处理简历上传
  const handleResumeUpload = (resume) => {
    // 将上传的简历添加到采集结果中
    const newResume = {
      id: Date.now() + Math.random(),
      candidateId: Date.now(),
      candidateName: resume.name || '未知姓名',
      candidateTitle: resume.position || '未知职位',
      candidateCompany: '手动上传',
      candidateExperience: resume.experience || '未知',
      resumeText: resume.content,
      qualityScore: resume.qualityScore,
      isValid: resume.qualityScore >= 60,
      issues: [],
      suggestions: [],
      keyInfo: {
        name: resume.name,
        phone: resume.phone,
        email: resume.email,
        position: resume.position,
        experience: resume.experience,
        education: resume.education
      },
      collectedAt: new Date().toISOString(),
      status: 'collected',
      tags: resume.skills || []
    };
    
    setCollectedResumes(prev => [newResume, ...prev]);
    message.success('简历上传成功，已添加到采集结果中');
    
    // 更新统计信息
    updateResumeData();
  };

  // 端到端测试处理函数
  const handleTestStart = async () => {
    try {
      message.info('开始端到端测试...');
      // 这里可以调用实际的测试逻辑
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('端到端测试启动成功');
    } catch (error) {
      message.error(`测试启动失败: ${error.message}`);
    }
  };

  const handleTestPause = () => {
    message.info('测试已暂停');
  };

  const handleTestStop = () => {
    message.info('测试已停止');
  };

  const handleTestReset = () => {
    message.success('测试已重置');
  };

  // 性能优化处理函数
  const handleOptimizationApply = async (settings) => {
    try {
      message.info('正在应用性能优化...');
      // 这里可以调用实际的优化逻辑
      await new Promise(resolve => setTimeout(resolve, 2000));
      message.success('性能优化应用成功');
    } catch (error) {
      message.error(`优化应用失败: ${error.message}`);
    }
  };

  const handleSettingsSave = (settings) => {
    message.success('优化设置已保存');
    console.log('保存的优化设置:', settings);
  };

  // 状态监控
  const startStatusMonitoring = () => {
    const interval = setInterval(async () => {
      try {
        const serviceStatus = bossZhipinService.getStatus();
        
        if (!serviceStatus.isRunning) {
          setStatus('stopped');
          setCurrentStep('');
          setIsLoading(false);
          clearInterval(interval);
          return;
        }
        
        setCurrentStep(serviceStatus.currentStep);
        
        // 更新简历数据
        updateResumeData();
        
        // 检查是否完成所有步骤
        if (serviceStatus.currentStep === '进入招聘系统' || serviceStatus.currentStep === '登录完成') {
          setStatus('completed');
          setCurrentStep('智能寻聘流程完成');
          setIsLoading(false);
          clearInterval(interval);
          
          // 显示候选人发现选项
          handleCandidateDiscoveryOptions();
        }
        
        // 检查是否开始候选人浏览
        if (serviceStatus.currentStep.includes('候选人') || serviceStatus.currentStep.includes('浏览')) {
          setIsCollecting(true);
          // 模拟设置候选人信息（实际应该从服务获取）
          setCurrentCandidate({
            name: '张三',
            title: '前端工程师',
            company: '某某公司',
            experience: '3年'
          });
          // 更新采集进度信息
          setCollectionProgress({
            total: 10, // 模拟总候选人数量
            processed: 0,
            successful: 0,
            failed: 0
          });
        }
        
        // 检查登录状态
        if (serviceStatus.loginStatus === 'failed') {
          setStatus('error');
          setErrorMessage('登录失败，请重新启动流程');
          setIsLoading(false);
          clearInterval(interval);
        }
        
      } catch (error) {
        console.error('状态监控错误:', error);
      }
    }, 1000);
  };

  // 获取状态显示信息
  const getStatusInfo = () => {
    switch (status) {
      case 'running':
        return {
          type: 'info',
          message: 'Boss 直聘智能寻聘流程正在运行中...',
          icon: <ClockCircleOutlined />
        };
      case 'completed':
        return {
          type: 'success',
          message: 'Boss 直聘智能寻聘流程已完成！',
          icon: <CheckCircleOutlined />
        };
      case 'error':
        return {
          type: 'error',
          message: `运行出错: ${errorMessage}`,
          icon: <ExclamationCircleOutlined />
        };
      default:
        return {
          type: 'warning',
          message: 'Boss 直聘智能寻聘流程未启动',
          icon: <ExclamationCircleOutlined />
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <ControlPanelContainer>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 16 }}>
          <RobotOutlined style={{ marginRight: 12, color: '#1890ff' }} />
          Boss 直聘智能寻聘控制台
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          自动化简历采集与入库流程控制
        </Text>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'control',
            label: (
              <span>
                <RobotOutlined />
                流程控制
              </span>
            ),
            children: (
              <div>
                {/* 状态显示 */}
                <StatusCard 
                  status={status}
                  title={
                    <Space>
                      {statusInfo.icon}
                      <span>当前状态</span>
                    </Space>
                  }
                >
                  <Alert
                    message={statusInfo.message}
                    type={statusInfo.type}
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                  
                  <Row gutter={16}>
                    <Col span={6}>
                      <Statistic
                        title="运行状态"
                        value={status === 'running' ? '运行中' : status === 'completed' ? '已完成' : '已停止'}
                        valueStyle={{ 
                          color: status === 'running' ? '#52c41a' : status === 'completed' ? '#1890ff' : '#faad14' 
                        }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="当前步骤"
                        value={currentStep || '未开始'}
                        valueStyle={{ color: '#666' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="浏览器状态"
                        value={status === 'running' ? '已连接' : '未连接'}
                        valueStyle={{ color: status === 'running' ? '#52c41a' : '#faad14' }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="登录状态"
                        value={bossZhipinService.getLoginStatusDescription()}
                        valueStyle={{ 
                          color: (() => {
                            const loginStatus = bossZhipinService.getStatus().loginStatus;
                            if (loginStatus === 'logged_in') return '#52c41a';
                            if (loginStatus === 'scanning') return '#1890ff';
                            if (loginStatus === 'failed') return '#ff4d4f';
                            return '#faad14';
                          })()
                        }}
                      />
                    </Col>
                  </Row>
                </StatusCard>

                {/* 操作按钮 */}
                <Card title="操作控制" style={{ marginBottom: 24 }}>
                  <Space size="large">
                    <ActionButton
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      onClick={handleStart}
                      loading={isLoading}
                      disabled={status === 'running'}
                    >
                      启动流程
                    </ActionButton>
                    
                    <ActionButton
                      danger
                      icon={<StopOutlined />}
                      onClick={handleStop}
                      disabled={status !== 'running'}
                    >
                      停止流程
                    </ActionButton>
                    
                    <ActionButton
                      icon={<ReloadOutlined />}
                      onClick={() => window.location.reload()}
                    >
                      刷新页面
                    </ActionButton>
                  </Space>
                </Card>

                {/* 流程步骤 */}
                <Card title="流程步骤" style={{ marginBottom: 24 }}>
                  <StepContainer>
                    <Steps
                      current={getCurrentStepIndex()}
                      direction="vertical"
                      size="small"
                    >
                      {steps.map((step, index) => (
                        <Step
                          key={index}
                          title={step.title}
                          description={step.description}
                          icon={step.icon}
                          status={
                            index < getCurrentStepIndex() ? 'finish' :
                            index === getCurrentStepIndex() ? 'process' : 'wait'
                          }
                        />
                      ))}
                    </Steps>
                  </StepContainer>
                </Card>

                {/* 登录状态指示器 */}
                <Card title="登录状态监控" style={{ marginBottom: 24 }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <div style={{ textAlign: 'center', padding: '16px' }}>
                        <div style={{ 
                          width: '60px', 
                          height: '60px', 
                          borderRadius: '50%', 
                          backgroundColor: (() => {
                            const loginStatus = bossZhipinService.getStatus().loginStatus;
                            if (loginStatus === 'logged_in') return '#52c41a';
                            if (loginStatus === 'scanning') return '#1890ff';
                            if (loginStatus === 'failed') return '#ff4d4f';
                            return '#faad14';
                          })(),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 8px',
                          color: 'white',
                          fontSize: '24px'
                        }}>
                          {(() => {
                            const loginStatus = bossZhipinService.getStatus().loginStatus;
                            if (loginStatus === 'logged_in') return <CheckCircleOutlined />;
                            if (loginStatus === 'scanning') return <ClockCircleOutlined />;
                            if (loginStatus === 'failed') return <ExclamationCircleOutlined />;
                            return <ClockCircleOutlined />;
                          })()}
                        </div>
                        <Text strong>{bossZhipinService.getLoginStatusDescription()}</Text>
                      </div>
                    </Col>
                    <Col span={16}>
                      <div style={{ padding: '16px' }}>
                        <Text strong>登录流程说明：</Text>
                        <ul style={{ marginTop: '8px' }}>
                          <li>系统将自动选择 App 扫码登录方式</li>
                          <li>请使用 Boss 直聘 App 扫描页面上的二维码</li>
                          <li>扫码成功后，系统将自动验证登录状态</li>
                          <li>登录成功后，将自动进入招聘系统</li>
                          <li>如遇到问题，可点击"停止流程"重新开始</li>
                        </ul>
                      </div>
                    </Col>
                  </Row>
                </Card>

                {/* 功能说明 */}
                <Card title="功能说明">
                  <Paragraph>
                    <Text strong>Boss 直聘智能寻聘功能说明：</Text>
                  </Paragraph>
                  <ul>
                    <li>自动打开 Boss 直聘官网并导航到招聘页面</li>
                    <li>支持 App 扫码登录方式</li>
                    <li>智能简历采集与质量检测</li>
                    <li>自动收藏与简历入库</li>
                    <li>支持推荐牛人、搜索牛人、沟通版块三大入口</li>
                  </ul>
                  
                  <Divider />
                  
                  <Paragraph>
                    <Text type="secondary">
                      注意：首次使用需要确保网络连接正常，并准备好 Boss 直聘 App 用于扫码登录。
                    </Text>
                  </Paragraph>
                </Card>
              </div>
            )
          },
          {
            key: 'discovery',
            label: (
              <span>
                <SearchOutlined />
                候选人发现
              </span>
            ),
            children: (
              <div>
                <Card title="候选人发现方式" style={{ marginBottom: 24 }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Card 
                        hoverable 
                        style={{ textAlign: 'center', cursor: 'pointer' }}
                        onClick={() => {
                          setActiveTab('filter');
                        }}
                      >
                        <SearchOutlined style={{ fontSize: 32, color: '#1890ff', marginBottom: 16 }} />
                        <Title level={4}>搜索牛人</Title>
                        <Text type="secondary">使用筛选条件精准搜索候选人</Text>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card 
                        hoverable 
                        style={{ textAlign: 'center', cursor: 'pointer' }}
                        onClick={async () => {
                          try {
                            setIsLoading(true);
                            await bossZhipinService.enterRecommendedCandidates();
                            startStatusMonitoring();
                          } catch (error) {
                            setErrorMessage(error.message);
                            setIsLoading(false);
                          }
                        }}
                      >
                        <FilterOutlined style={{ fontSize: 32, color: '#52c41a', marginBottom: 16 }} />
                        <Title level={4}>推荐牛人</Title>
                        <Text type="secondary">浏览系统推荐的候选人</Text>
                      </Card>
                    </Col>
                  </Row>
                </Card>
              </div>
            )
          },
          {
            key: 'filter',
            label: (
              <span>
                <FilterOutlined />
                筛选配置
              </span>
            ),
            children: (
              <CandidateFilterConfigurator
                onFilterApply={handleFilterApply}
                onFilterSave={handleFilterSave}
              />
            )
          },
          {
            key: 'progress',
            label: (
              <span>
                <ClockCircleOutlined />
                采集进度
                {isCollecting && (
                  <Tag color="green" style={{ marginLeft: 8 }}>
                    采集中
                  </Tag>
                )}
              </span>
            ),
            children: (
              <ResumeCollectionProgress
                isCollecting={isCollecting}
                currentCandidate={currentCandidate}
                totalCandidates={collectionProgress.total}
                processedCandidates={collectionProgress.processed}
                successfulCollections={collectionProgress.successful}
                failedCollections={collectionProgress.failed}
                currentStep={currentStep}
                estimatedTime={collectionProgress.total * 30} // 假设每个候选人30秒
                onPause={() => setIsCollecting(false)}
                onResume={() => setIsCollecting(true)}
                onStop={() => {
                  setIsCollecting(false);
                  setStatus('stopped');
                }}
              />
            )
          },
          {
            key: 'results',
            label: (
              <span>
                <CheckCircleOutlined />
                采集结果
                {collectedResumes.length > 0 && (
                  <Tag color="blue" style={{ marginLeft: 8 }}>
                    {collectedResumes.length}
                  </Tag>
                )}
              </span>
            ),
            children: (
              <ResumeCollectionResults
                collectedResumes={collectedResumes}
                onResumeAction={handleResumeAction}
                onClearAll={handleClearAllResumes}
                onQualityThresholdChange={handleQualityThresholdChange}
              />
            )
          },
          {
            key: 'filter',
            label: (
              <span>
                <FilterOutlined />
                智能筛选
                {collectedResumes.filter(r => r.status === 'liked').length > 0 && (
                  <Tag color="green" style={{ marginLeft: 8 }}>
                    {collectedResumes.filter(r => r.status === 'liked').length}
                  </Tag>
                )}
              </span>
            ),
            children: (
              <ResumeFilterInterface
                resumes={collectedResumes}
                onResumeAction={handleResumeAction}
                onFilterChange={(config) => console.log('筛选配置变更:', config)}
                onBatchAction={handleBatchAction}
              />
            )
          },
          {
            key: 'upload',
            label: (
              <span>
                <UploadOutlined />
                简历上传
              </span>
            ),
            children: (
              <ResumeUploadWithPaste
                onResumeProcessed={(parsed) => console.log('简历解析完成:', parsed)}
                onUploadComplete={(resume) => handleResumeUpload(resume)}
              />
            )
          },
          {
            key: 'end-to-end-test',
            label: (
              <span>
                <RocketOutlined />
                端到端测试
              </span>
            ),
            children: (
              <EndToEndTest 
                onTestStart={handleTestStart}
                onTestPause={handleTestPause}
                onTestStop={handleTestStop}
                onTestReset={handleTestReset}
              />
            )
          },
          {
            key: 'performance-optimizer',
            label: (
              <span>
                <SettingOutlined />
                性能优化
              </span>
            ),
            children: (
              <PerformanceOptimizer 
                onOptimizationApply={handleOptimizationApply}
                onSettingsSave={handleSettingsSave}
              />
            )
          },
          {
            key: 'user-guide',
            label: (
              <span>
                <BookOutlined />
                使用指南
              </span>
            ),
            children: (
              <UserGuide />
            )
          }
        ]}
      />
    </ControlPanelContainer>
  );
};

export default BossZhipinRecruitment;
