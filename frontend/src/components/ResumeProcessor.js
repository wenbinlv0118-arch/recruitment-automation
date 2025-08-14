import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Alert, Steps, message, Tag, Space, Divider, Row, Col, Progress, List, Modal, Input, Rate, Switch, Select } from 'antd';
import { 
  FileTextOutlined, 
  CheckCircleOutlined,
  CloseCircleOutlined,
  StarOutlined,
  DownloadOutlined,
  EyeOutlined,
  ReloadOutlined,
  SettingOutlined,
  UserOutlined,
  // CompanyOutlined 不存在于 @ant-design/icons 中，使用替代图标
  BuildOutlined as CompanyOutlined,
  CalendarOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import styled from 'styled-components';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { TextArea } = Input;

const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const StatusCard = styled(Card)`
  margin-bottom: 24px;
  
  .status-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .status-value {
    font-weight: 600;
  }
`;

const ResumeCard = styled(Card)`
  margin-bottom: 16px;
  border: 2px solid transparent;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  &.processing {
    border-color: #1890ff;
  }
  
  &.completed {
    border-color: #52c41a;
  }
  
  &.failed {
    border-color: #ff4d4f;
  }
  
  .resume-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }
  
  .resume-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .resume-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: #f0f0f0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    color: #666;
  }
  
  .resume-details {
    flex: 1;
  }
  
  .resume-name {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 4px;
  }
  
  .resume-position {
    color: #666;
    margin-bottom: 4px;
  }
  
  .resume-company {
    color: #999;
    font-size: 12px;
  }
  
  .resume-status {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .resume-content {
    margin-top: 16px;
    padding: 16px;
    background: #f9f9f9;
    border-radius: 8px;
    max-height: 200px;
    overflow-y: auto;
  }
  
  .resume-actions {
    margin-top: 16px;
    display: flex;
    gap: 8px;
  }
  
  .quality-score {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
  }
`;

const QualityIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  
  .quality-label {
    font-weight: 500;
    min-width: 80px;
  }
  
  .quality-bar {
    flex: 1;
    height: 8px;
    background: #f0f0f0;
    border-radius: 4px;
    overflow: hidden;
    
    .quality-fill {
      height: 100%;
      background: linear-gradient(90deg, #ff4d4f 0%, #faad14 50%, #52c41a 100%);
      transition: width 0.3s ease;
    }
  }
  
  .quality-text {
    min-width: 40px;
    text-align: right;
    font-weight: 600;
  }
`;

const ResumeProcessor = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resumes, setResumes] = useState([]);
  const [processingCount, setProcessingCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [currentResumeIndex, setCurrentResumeIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  
  // 处理设置
  const [settings, setSettings] = useState({
    minQualityScore: 70,
    autoProcess: true,
    saveFailedResumes: false,
    maxResumeLength: 5000,
    requiredFields: ['name', 'experience', 'education']
  });

  // 获取步骤信息
  const getSteps = () => [
    {
      title: '简历收集',
      description: '从收藏的候选人中收集简历',
      status: currentStep >= 0 ? 'finish' : 'wait'
    },
    {
      title: '质量检测',
      description: '检测简历内容质量和完整性',
      status: currentStep >= 1 ? 'finish' : 'wait'
    },
    {
      title: '内容解析',
      description: '解析简历内容并结构化',
      status: currentStep >= 2 ? 'finish' : 'wait'
    },
    {
      title: '数据入库',
      description: '将解析后的简历存入数据库',
      status: currentStep >= 3 ? 'finish' : 'wait'
    }
  ];

  // 启动简历处理
  const startProcessing = async () => {
    try {
      setIsProcessing(true);
      setCurrentStep(1);
      message.success('开始简历处理...');
      
      // 调用后端API启动处理
      const response = await fetch('/api/boss-zhipin/start-resume-processing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          settings: settings
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        message.success('简历处理已启动');
        // 开始轮询状态
        startStatusPolling();
      } else {
        message.error(result.message);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('启动简历处理失败:', error);
      message.error('启动简历处理失败: ' + error.message);
      setIsProcessing(false);
    }
  };

  // 停止处理
  const stopProcessing = async () => {
    try {
      setIsProcessing(false);
      setCurrentStep(0);
      message.info('已停止简历处理');
      
      // 调用后端API停止处理
      await fetch('/api/boss-zhipin/stop-resume-processing', {
        method: 'POST'
      });
    } catch (error) {
      console.error('停止处理失败:', error);
    }
  };

  // 开始状态轮询
  const startStatusPolling = () => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/boss-zhipin/resume-processing-status');
        const result = await response.json();
        
        if (result.success) {
          const { resumes, processingCount, completedCount, failedCount, currentIndex, isActive, status } = result.data;
          setResumes(resumes || []);
          setProcessingCount(processingCount || 0);
          setCompletedCount(completedCount || 0);
          setFailedCount(failedCount || 0);
          setCurrentResumeIndex(currentIndex || 0);
          
          // 更新当前步骤
          if (status === 'collecting') {
            setCurrentStep(0);
          } else if (status === 'quality_checking') {
            setCurrentStep(1);
          } else if (status === 'parsing') {
            setCurrentStep(2);
          } else if (status === 'storing') {
            setCurrentStep(3);
          } else if (status === 'completed' || (!isActive && status === 'idle')) {
            setCurrentStep(3);
            setIsProcessing(false);
            clearInterval(interval);
            message.success('简历处理已完成！');
          }
        }
      } catch (error) {
        console.error('获取处理状态失败:', error);
      }
    }, 2000);
    
    // 10分钟后停止轮询
    setTimeout(() => {
      clearInterval(interval);
    }, 600000);
  };

  // 处理单个简历
  const processResume = async (resumeId, action) => {
    try {
      const response = await fetch('/api/boss-zhipin/process-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          resumeId,
          action // approve, reject, manual_review
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        if (action === 'approve') {
          message.success('简历已通过并入库');
          setCompletedCount(prev => prev + 1);
        } else if (action === 'reject') {
          message.info('简历已拒绝');
          setFailedCount(prev => prev + 1);
        }
        
        // 更新简历列表
        setResumes(prev => prev.filter(r => r.id !== resumeId));
      } else {
        message.error(result.message);
      }
    } catch (error) {
      console.error('处理简历失败:', error);
      message.error('操作失败: ' + error.message);
    }
  };

  // 查看简历详情
  const viewResumeDetail = (resume) => {
    Modal.info({
      title: `${resume.name} 的简历详情`,
      width: 800,
      content: (
        <div>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={12}>
              <div><UserOutlined /> 姓名: {resume.name}</div>
              <div><CompanyOutlined /> 职位: {resume.position}</div>
              <div><EnvironmentOutlined /> 地区: {resume.location}</div>
            </Col>
            <Col span={12}>
              <div><CalendarOutlined /> 经验: {resume.experience}</div>
              <div><StarOutlined /> 学历: {resume.education}</div>
              <div>期望薪资: {resume.salary}</div>
            </Col>
          </Row>
          
          <Divider />
          
          <div>
            <Text strong>简历内容:</Text>
            {resume.parsedContent && resume.parseMethod === 'llm' ? (
              <div style={{ 
                marginTop: 8, 
                padding: 12, 
                background: '#f5f5f5', 
                borderRadius: 4,
                maxHeight: 300,
                overflowY: 'auto'
              }}>

                <div style={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px' }}>
                   {resume.parsedContent.replace(/^```markdown\s*\n/, '').replace(/\n```\s*$/, '').trim()}
                 </div>
              </div>
            ) : (
              <div style={{ 
                marginTop: 8, 
                padding: 12, 
                background: '#f5f5f5', 
                borderRadius: 4,
                maxHeight: 300,
                overflowY: 'auto'
              }}>
                {resume.content || resume.originalText || '暂无内容'}
              </div>
            )}
          </div>
          
          <Divider />
          
          <div>
            <Text strong>质量评分:</Text>
            <div style={{ marginTop: 8 }}>
              <Rate disabled defaultValue={resume.qualityScore / 20} />
              <span style={{ marginLeft: 8 }}>{resume.qualityScore}分</span>
            </div>
          </div>
        </div>
      )
    });
  };

  // 更新设置
  const updateSettings = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 保存设置
  const saveSettings = () => {
    setShowSettings(false);
    message.success('设置已保存');
  };

  // 获取质量等级颜色
  const getQualityColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'error';
  };

  // 获取质量等级文本
  const getQualityText = (score) => {
    if (score >= 80) return '优秀';
    if (score >= 60) return '良好';
    return '需改进';
  };

  useEffect(() => {
    // 组件加载时获取初始状态
    fetch('/api/boss-zhipin/resume-processing-status')
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          const { resumes, processingCount, completedCount, failedCount, currentIndex } = result.data;
          setResumes(resumes || []);
          setProcessingCount(processingCount || 0);
          setCompletedCount(completedCount || 0);
          setFailedCount(failedCount || 0);
          setCurrentResumeIndex(currentIndex || 0);
        }
      })
      .catch(error => {
        console.error('获取初始状态失败:', error);
      });
  }, []);

  return (
    <Container>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2}>
          <FileTextOutlined style={{ marginRight: 12, color: '#1890ff' }} />
          简历处理与入库
        </Title>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          智能检测简历质量，自动解析内容并入库管理
        </Text>
      </div>

      <StepsContainer>
        <Steps current={currentStep} items={getSteps()} />
      </StepsContainer>

      {/* 状态面板 */}
      <StatusCard title="处理状态">
        <Row gutter={24}>
          <Col span={6}>
            <div className="status-row">
              <Text>待处理简历:</Text>
              <Text className="status-value" type="primary">{resumes.length}</Text>
            </div>
          </Col>
          <Col span={6}>
            <div className="status-row">
              <Text>处理中:</Text>
              <Text className="status-value" type="processing">{processingCount}</Text>
            </div>
          </Col>
          <Col span={6}>
            <div className="status-row">
              <Text>已完成:</Text>
              <Text className="status-value" type="success">{completedCount}</Text>
            </div>
          </Col>
          <Col span={6}>
            <div className="status-row">
              <Text>处理失败:</Text>
              <Text className="status-value" type="error">{failedCount}</Text>
            </div>
          </Col>
        </Row>
        
        {resumes.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text>总体进度: </Text>
            <Progress 
              percent={Math.round((completedCount / (completedCount + failedCount + resumes.length)) * 100)} 
              status="active"
            />
          </div>
        )}
      </StatusCard>

      {/* 控制按钮 */}
      <Card style={{ marginBottom: 24, textAlign: 'center' }}>
        <Space size="large">
          {!isProcessing ? (
            <Button 
              type="primary" 
              size="large"
              icon={<FileTextOutlined />}
              onClick={startProcessing}
              disabled={resumes.length === 0}
            >
              开始处理
            </Button>
          ) : (
            <Button 
              danger
              size="large"
              icon={<CloseCircleOutlined />}
              onClick={stopProcessing}
            >
              停止处理
            </Button>
          )}
          
          <Button 
            size="large"
            icon={<SettingOutlined />}
            onClick={() => setShowSettings(true)}
          >
            处理设置
          </Button>
          
          <Button 
            size="large"
            icon={<ReloadOutlined />}
            onClick={() => window.location.reload()}
          >
            刷新状态
          </Button>
        </Space>
      </Card>

      {/* 简历列表 */}
      <Card title="待处理简历" extra={`共 ${resumes.length} 份`}>
        {resumes.length > 0 ? (
          resumes.map((resume, index) => (
            <ResumeCard 
              key={resume.id} 
              className={resume.status || 'pending'}
            >
              <div className="resume-header">
                <div className="resume-info">
                  <div className="resume-avatar">
                    <UserOutlined />
                  </div>
                  <div className="resume-details">
                    <div className="resume-name">{resume.name}</div>
                    <div className="resume-position">{resume.position}</div>
                    <div className="resume-company">{resume.company}</div>
                  </div>
                </div>
                
                <div className="resume-status">
                  <Tag color={getQualityColor(resume.qualityScore)}>
                    {getQualityText(resume.qualityScore)}
                  </Tag>
                  <Tag color="blue">{resume.qualityScore}分</Tag>
                </div>
              </div>
              
              <div className="resume-content">
                <Text>{resume.content.substring(0, 200)}...</Text>
              </div>
              
              <QualityIndicator>
                <div className="quality-label">完整性:</div>
                <div className="quality-bar">
                  <div 
                    className="quality-fill" 
                    style={{ width: `${resume.completeness || 0}%` }}
                  />
                </div>
                <div className="quality-text">{resume.completeness || 0}%</div>
              </QualityIndicator>
              
              <QualityIndicator>
                <div className="quality-label">丰富度:</div>
                <div className="quality-bar">
                  <div 
                    className="quality-fill" 
                    style={{ width: `${resume.richness || 0}%` }}
                  />
                </div>
                <div className="quality-text">{resume.richness || 0}%</div>
              </QualityIndicator>
              
              <div className="resume-actions">
                <Button 
                  type="primary" 
                  size="small"
                  icon={<CheckCircleOutlined />}
                  onClick={() => processResume(resume.id, 'approve')}
                >
                  通过入库
                </Button>
                <Button 
                  size="small"
                  icon={<CloseCircleOutlined />}
                  onClick={() => processResume(resume.id, 'reject')}
                >
                  拒绝
                </Button>
                <Button 
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={() => viewResumeDetail(resume)}
                >
                  查看详情
                </Button>
                <Button 
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={() => processResume(resume.id, 'manual_review')}
                >
                  人工审核
                </Button>
              </div>
            </ResumeCard>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">暂无待处理简历</Text>
          </div>
        )}
      </Card>

      {/* 设置弹窗 */}
      <Modal
        title="简历处理设置"
        open={showSettings}
        onOk={saveSettings}
        onCancel={() => setShowSettings(false)}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                最低质量分数
              </label>
              <Input 
                type="number"
                min={0}
                max={100}
                value={settings.minQualityScore}
                onChange={(e) => updateSettings('minQualityScore', parseInt(e.target.value))}
                suffix="分"
              />
            </div>
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
                最大简历长度
              </label>
              <Input 
                type="number"
                min={100}
                max={10000}
                value={settings.maxResumeLength}
                onChange={(e) => updateSettings('maxResumeLength', parseInt(e.target.value))}
                suffix="字符"
              />
            </div>
          </Col>
        </Row>
        
        <Row>
          <Col span={24}>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Switch 
                  checked={settings.autoProcess}
                  onChange={(checked) => updateSettings('autoProcess', checked)}
                />
                <Text>自动处理通过质量检测的简历</Text>
              </Space>
            </div>
          </Col>
        </Row>
        
        <Row>
          <Col span={24}>
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Switch 
                  checked={settings.saveFailedResumes}
                  onChange={(checked) => updateSettings('saveFailedResumes', checked)}
                />
                <Text>保存处理失败的简历</Text>
              </Space>
            </div>
          </Col>
        </Row>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
            必填字段
          </label>
          <Select
            mode="multiple"
            placeholder="选择必填字段"
            value={settings.requiredFields}
            onChange={(value) => updateSettings('requiredFields', value)}
            style={{ width: '100%' }}
          >
            <Select.Option value="name">姓名</Select.Option>
            <Select.Option value="experience">工作经验</Select.Option>
            <Select.Option value="education">教育背景</Select.Option>
            <Select.Option value="skills">技能特长</Select.Option>
            <Select.Option value="contact">联系方式</Select.Option>
          </Select>
        </div>
      </Modal>

      <Alert
        message="操作说明"
        description="1. 系统会自动检测简历质量，包括完整性、丰富度等指标；2. 质量分数达到设定标准的简历会自动通过；3. 您可以手动审核每份简历，决定是否入库；4. 处理完成的简历会自动存入简历库，可以在简历管理模块中查看；5. 处理失败的简历会根据设置决定是否保存。"
        type="info"
        showIcon
        style={{ marginTop: 24 }}
      />
    </Container>
  );
};

const StepsContainer = styled.div`
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

export default ResumeProcessor;
