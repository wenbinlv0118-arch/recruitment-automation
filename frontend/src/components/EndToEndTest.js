import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Row, 
  Col, 
  Tag, 
  Alert, 
  message,
  Divider,
  Statistic,
  Steps
} from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  StopOutlined, 
  CheckCircleOutlined,
  RocketOutlined,
  SettingOutlined,
  FileTextOutlined,
  UserOutlined,
  GlobalOutlined
} from '@ant-design/icons';
import styled from 'styled-components';

const { Title, Text } = Typography;
const { Step } = Steps;

// 样式组件
const TestContainer = styled.div`
  padding: 24px;
  background: white;
  border-radius: 8px;
`;

const TestStep = styled.div`
  margin: 16px 0;
  padding: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  background: #fafafa;
  
  &.success {
    border-color: #52c41a;
    background: #f6ffed;
  }
  
  &.error {
    border-color: #ff4d4f;
    background: #fff2f0;
  }
  
  &.running {
    border-color: #1890ff;
    background: #e6f7ff;
  }
`;

const PerformanceCard = styled(Card)`
  margin-bottom: 16px;
  
  .ant-card-head {
    background: ${props => {
      if (props.status === 'excellent') return '#f6ffed';
      if (props.status === 'good') return '#e6f7ff';
      if (props.status === 'warning') return '#fff7e6';
      return '#fff2f0';
    }};
  }
`;

const EndToEndTest = ({ 
  onTestStart,
  onTestPause,
  onTestStop,
  onTestReset
}) => {
  const [testStatus, setTestStatus] = useState('idle'); // idle, running, paused, completed, error
  const [currentStep, setCurrentStep] = useState(0);
  const [testResults, setTestResults] = useState({});
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [errorLogs, setErrorLogs] = useState([]);
  const [testStartTime, setTestStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // 测试步骤配置
  const testSteps = [
    {
      title: '系统初始化',
      description: '检查系统状态和依赖',
      icon: <SettingOutlined />,
      key: 'initialization'
    },
    {
      title: '浏览器启动',
      description: '启动Playwright浏览器实例',
      icon: <GlobalOutlined />,
      key: 'browser_start'
    },
    {
      title: '网站访问',
      description: '访问Boss直聘官网',
      icon: <GlobalOutlined />,
      key: 'website_access'
    },
    {
      title: '页面导航',
      description: '导航到招聘页面',
      icon: <UserOutlined />,
      key: 'page_navigation'
    },
    {
      title: '登录流程',
      description: '启动App扫码登录',
      icon: <UserOutlined />,
      key: 'login_process'
    },
    {
      title: '候选人发现',
      description: '进入候选人列表页面',
      icon: <FileTextOutlined />,
      key: 'candidate_discovery'
    },
    {
      title: '简历采集',
      description: '采集候选人简历内容',
      icon: <FileTextOutlined />,
      key: 'resume_collection'
    },
    {
      title: '质量检测',
      description: '检测简历质量并评分',
      icon: <CheckCircleOutlined />,
      key: 'quality_check'
    },
    {
      title: '自动收藏',
      description: '收藏优质候选人',
      icon: <CheckCircleOutlined />,
      key: 'auto_collection'
    },
    {
      title: '数据入库',
      description: '将简历数据存储到系统',
      icon: <FileTextOutlined />,
      key: 'data_storage'
    },
    {
      title: '流程完成',
      description: '完成整个智能寻聘流程',
      icon: <RocketOutlined />,
      key: 'completion'
    }
  ];

  // 计时器效果
  useEffect(() => {
    let interval;
    if (testStatus === 'running') {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [testStatus]);

  // 启动端到端测试
  const handleStartTest = async () => {
    try {
      setTestStatus('running');
      setCurrentStep(0);
      setTestStartTime(new Date());
      setElapsedTime(0);
      setTestResults({});
      setErrorLogs([]);
      setPerformanceMetrics({});

      message.info('开始端到端测试...');

      if (onTestStart) {
        await onTestStart();
      }

      // 模拟测试流程
      await simulateTestFlow();

    } catch (error) {
      console.error('测试启动失败:', error);
      setTestStatus('error');
      addErrorLog('测试启动失败', error.message);
      message.error(`测试启动失败: ${error.message}`);
    }
  };

  // 暂停测试
  const handlePauseTest = () => {
    setTestStatus('paused');
    message.info('测试已暂停');
    
    if (onTestPause) {
      onTestPause();
    }
  };

  // 停止测试
  const handleStopTest = () => {
    setTestStatus('idle');
    message.info('测试已停止');
    
    if (onTestStop) {
      onTestStop();
    }
  };

  // 重置测试
  const handleResetTest = () => {
    setTestStatus('idle');
    setCurrentStep(0);
    setTestResults({});
    setErrorLogs([]);
    setPerformanceMetrics({});
    setElapsedTime(0);
    setTestStartTime(null);
    
    message.success('测试已重置');
    
    if (onTestReset) {
      onTestReset();
    }
  };

  // 模拟测试流程
  const simulateTestFlow = async () => {
    for (let i = 0; i < testSteps.length; i++) {
      if (testStatus !== 'running') break;
      
      setCurrentStep(i);
      const step = testSteps[i];
      
      try {
        // 模拟步骤执行
        await simulateStepExecution(step, i);
        
        // 更新测试结果
        setTestResults(prev => ({
          ...prev,
          [step.key]: {
            status: 'success',
            timestamp: new Date().toISOString(),
            duration: Math.random() * 2000 + 500 // 模拟执行时间
          }
        }));
        
        // 短暂延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        // 记录错误
        setTestResults(prev => ({
          ...prev,
          [step.key]: {
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message
          }
        }));
        
        addErrorLog(`步骤 ${step.title} 执行失败`, error.message);
        
        // 如果关键步骤失败，停止测试
        if (isCriticalStep(step.key)) {
          setTestStatus('error');
          message.error(`关键步骤失败: ${step.title}`);
          return;
        }
      }
    }
    
    if (testStatus === 'running') {
      setTestStatus('completed');
      message.success('端到端测试完成！');
      calculatePerformanceMetrics();
    }
  };

  // 模拟步骤执行
  const simulateStepExecution = async (step, stepIndex) => {
    // 模拟不同步骤的执行时间和成功率
    const stepConfigs = {
      'initialization': { successRate: 0.95, avgTime: 1000 },
      'browser_start': { successRate: 0.90, avgTime: 3000 },
      'website_access': { successRate: 0.85, avgTime: 2000 },
      'page_navigation': { successRate: 0.80, avgTime: 1500 },
      'login_process': { successRate: 0.70, avgTime: 5000 },
      'candidate_discovery': { successRate: 0.85, avgTime: 2000 },
      'resume_collection': { successRate: 0.75, avgTime: 3000 },
      'quality_check': { successRate: 0.90, avgTime: 1000 },
      'auto_collection': { successRate: 0.80, avgTime: 2000 },
      'data_storage': { successRate: 0.85, avgTime: 1500 },
      'completion': { successRate: 0.95, avgTime: 500 }
    };
    
    const config = stepConfigs[step.key] || { successRate: 0.80, avgTime: 2000 };
    
    // 模拟执行时间
    const executionTime = config.avgTime + (Math.random() - 0.5) * 1000;
    await new Promise(resolve => setTimeout(resolve, executionTime));
    
    // 模拟成功率
    if (Math.random() > config.successRate) {
      throw new Error(`步骤执行失败: ${step.title}`);
    }
    
    return { success: true, duration: executionTime };
  };

  // 判断是否为关键步骤
  const isCriticalStep = (stepKey) => {
    const criticalSteps = ['initialization', 'browser_start', 'website_access'];
    return criticalSteps.includes(stepKey);
  };

  // 添加错误日志
  const addErrorLog = (title, message) => {
    const errorLog = {
      id: Date.now(),
      title,
      message,
      timestamp: new Date().toISOString(),
      step: currentStep
    };
    
    setErrorLogs(prev => [errorLog, ...prev]);
  };

  // 计算性能指标
  const calculatePerformanceMetrics = () => {
    const totalSteps = testSteps.length;
    const successfulSteps = Object.values(testResults).filter(r => r.status === 'success').length;
    const failedSteps = totalSteps - successfulSteps;
    const successRate = (successfulSteps / totalSteps) * 100;
    
    // 计算平均执行时间
    const totalDuration = Object.values(testResults)
      .filter(r => r.duration)
      .reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = totalDuration / successfulSteps;
    
    // 性能评级
    let performanceRating = 'excellent';
    if (successRate < 80) performanceRating = 'error';
    else if (successRate < 90) performanceRating = 'warning';
    else if (successRate < 95) performanceRating = 'good';
    
    setPerformanceMetrics({
      totalSteps,
      successfulSteps,
      failedSteps,
      successRate: Math.round(successRate * 100) / 100,
      avgDuration: Math.round(avgDuration),
      totalDuration: Math.round(totalDuration),
      performanceRating
    });
  };

  // 获取步骤状态
  const getStepStatus = (stepIndex) => {
    if (stepIndex < currentStep) return 'finish';
    if (stepIndex === currentStep && testStatus === 'running') return 'process';
    return 'wait';
  };

  // 获取步骤结果
  const getStepResult = (stepKey) => {
    return testResults[stepKey] || null;
  };

  // 格式化时间
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟${secs}秒`;
    } else if (minutes > 0) {
      return `${minutes}分钟${secs}秒`;
    } else {
      return `${secs}秒`;
    }
  };

  return (
    <TestContainer>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 16 }}>
          <RocketOutlined style={{ marginRight: 12, color: '#1890ff' }} />
          端到端测试控制台
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          完整流程测试、性能监控、异常处理
        </Text>
      </div>

      {/* 测试状态和控制 */}
      <Card title="测试控制" style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col span={16}>
            <Space size="large">
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleStartTest}
                disabled={testStatus === 'running'}
                size="large"
              >
                开始测试
              </Button>
              
              <Button
                icon={<PauseCircleOutlined />}
                onClick={handlePauseTest}
                disabled={testStatus !== 'running'}
                size="large"
              >
                暂停测试
              </Button>
              
              <Button
                danger
                icon={<StopOutlined />}
                onClick={handleStopTest}
                disabled={testStatus === 'idle'}
                size="large"
              >
                停止测试
              </Button>
              
              <Button
                icon={<SettingOutlined />}
                onClick={handleResetTest}
                size="large"
              >
                重置测试
              </Button>
            </Space>
          </Col>
          
          <Col span={8} style={{ textAlign: 'right' }}>
            <div>
              <Text strong>测试状态：</Text>
              <Tag 
                color={
                  testStatus === 'running' ? 'green' : 
                  testStatus === 'completed' ? 'blue' : 
                  testStatus === 'error' ? 'red' : 
                  testStatus === 'paused' ? 'orange' : 'default'
                }
              >
                {testStatus === 'idle' ? '未开始' :
                 testStatus === 'running' ? '运行中' :
                 testStatus === 'paused' ? '已暂停' :
                 testStatus === 'completed' ? '已完成' :
                 testStatus === 'error' ? '执行错误' : '未知'}
              </Tag>
            </div>
            
            {testStartTime && (
              <div style={{ marginTop: 8 }}>
                <Text type="secondary">
                  运行时间: {formatTime(elapsedTime)}
                </Text>
              </div>
            )}
          </Col>
        </Row>
      </Card>

      {/* 测试步骤进度 */}
      <Card title="测试步骤进度" style={{ marginBottom: 24 }}>
        <Steps
          current={currentStep}
          direction="vertical"
          size="small"
        >
          {testSteps.map((step, index) => {
            const result = getStepResult(step.key);
            const status = getStepStatus(index);
            
            return (
              <Step
                key={step.key}
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{step.title}</span>
                    {result && (
                      <Tag color={result.status === 'success' ? 'green' : 'red'}>
                        {result.status === 'success' ? '成功' : '失败'}
                      </Tag>
                    )}
                  </div>
                }
                description={step.description}
                icon={step.icon}
                status={status}
              />
            );
          })}
        </Steps>
      </Card>

      {/* 性能指标 */}
      {Object.keys(performanceMetrics).length > 0 && (
        <PerformanceCard 
          title="性能指标" 
          status={performanceMetrics.performanceRating}
          style={{ marginBottom: 24 }}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="总步骤数"
                value={performanceMetrics.totalSteps}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="成功步骤"
                value={performanceMetrics.successfulSteps}
                valueStyle={{ color: '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="失败步骤"
                value={performanceMetrics.failedSteps}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="成功率"
                value={performanceMetrics.successRate}
                suffix="%"
                valueStyle={{ 
                  color: performanceMetrics.successRate >= 90 ? '#52c41a' : 
                         performanceMetrics.successRate >= 80 ? '#faad14' : '#ff4d4f' 
                }}
              />
            </Col>
          </Row>
          
          <Divider />
          
          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title="平均执行时间"
                value={performanceMetrics.avgDuration}
                suffix="ms"
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="总执行时间"
                value={performanceMetrics.totalDuration}
                suffix="ms"
                valueStyle={{ color: '#faad14' }}
              />
            </Col>
          </Row>
        </PerformanceCard>
      )}

      {/* 错误日志 */}
      {errorLogs.length > 0 && (
        <Card title="错误日志" style={{ marginBottom: 24 }}>
          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {errorLogs.map(log => (
              <Alert
                key={log.id}
                message={log.title}
                description={log.message}
                type="error"
                showIcon
                style={{ marginBottom: 8 }}
                action={
                  <Button size="small" type="text">
                    步骤 {log.step + 1}
                  </Button>
                }
              />
            ))}
          </div>
        </Card>
      )}

      {/* 测试结果详情 */}
      {Object.keys(testResults).length > 0 && (
        <Card title="测试结果详情">
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            {testSteps.map((step, index) => {
              const result = getStepResult(step.key);
              if (!result) return null;
              
              return (
                <TestStep
                  key={step.key}
                  className={result.status === 'success' ? 'success' : 'error'}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text strong>{step.title}</Text>
                      <br />
                      <Text type="secondary">{step.description}</Text>
                    </div>
                    <div>
                      <Tag color={result.status === 'success' ? 'green' : 'red'}>
                        {result.status === 'success' ? '成功' : '失败'}
                      </Tag>
                      {result.duration && (
                        <Tag color="blue">{result.duration}ms</Tag>
                      )}
                    </div>
                  </div>
                  
                  {result.error && (
                    <div style={{ marginTop: 8 }}>
                      <Text type="danger">错误信息: {result.error}</Text>
                    </div>
                  )}
                  
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">
                      执行时间: {new Date(result.timestamp).toLocaleString()}
                    </Text>
                  </div>
                </TestStep>
              );
            })}
          </div>
        </Card>
      )}
    </TestContainer>
  );
};

export default EndToEndTest;
