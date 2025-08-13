import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Row, 
  Col, 
  Progress, 
  Tag, 
  Alert, 
  message,
  Divider,
  Statistic,
  Switch,
  InputNumber,
  List
} from 'antd';
import { 
  RocketOutlined, 
  ReloadOutlined,
  SaveOutlined,
  MonitorOutlined,
  ThunderboltOutlined,
  StopOutlined
} from '@ant-design/icons';
import styled from 'styled-components';

const { Title, Text } = Typography;

// 样式组件
const OptimizerContainer = styled.div`
  padding: 24px;
  background: white;
  border-radius: 8px;
`;

const MetricCard = styled(Card)`
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

const PerformanceOptimizer = ({ 
  onOptimizationApply,
  onSettingsSave
}) => {
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  const [optimizationSettings, setOptimizationSettings] = useState({
    enableCaching: true,
    enableCompression: true,
    enableLazyLoading: true,
    maxConcurrentRequests: 5,
    requestTimeout: 30000,
    enableRetry: true,
    maxRetryAttempts: 3,
    enablePerformanceMonitoring: true,
    enableErrorTracking: true
  });
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [errorLogs, setErrorLogs] = useState([]);
  const [optimizationHistory, setOptimizationHistory] = useState([]);
  const [currentOptimization, setCurrentOptimization] = useState(null);

  // 检查性能阈值
  const checkPerformanceThresholds = useCallback((metrics) => {
    const warnings = [];
    
    if (metrics.memoryUsage > 80) {
      warnings.push(`内存使用率过高: ${metrics.memoryUsage.toFixed(1)}%`);
    }
    
    if (metrics.cpuUsage > 80) {
      warnings.push(`CPU使用率过高: ${metrics.cpuUsage.toFixed(1)}%`);
    }
    
    if (metrics.responseTime > 1500) {
      warnings.push(`响应时间过长: ${metrics.responseTime.toFixed(0)}ms`);
    }
    
    if (metrics.errorRate > 5) {
      warnings.push(`错误率过高: ${metrics.errorRate.toFixed(1)}%`);
    }
    
    if (warnings.length > 0) {
      warnings.forEach(warning => {
        addErrorLog('性能警告', warning);
      });
    }
  }, []);

  // 收集性能指标
  const collectPerformanceMetrics = useCallback(() => {
    // 模拟收集性能指标
    const metrics = {
      memoryUsage: Math.random() * 100,
      cpuUsage: Math.random() * 100,
      responseTime: Math.random() * 2000 + 100,
      throughput: Math.random() * 1000 + 100,
      errorRate: Math.random() * 10,
      timestamp: new Date().toISOString()
    };

    setPerformanceMetrics(metrics);
    
    // 检查性能阈值
    checkPerformanceThresholds(metrics);
  }, [checkPerformanceThresholds]);

  // 性能指标监控
  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        collectPerformanceMetrics();
      }, 5000); // 每5秒收集一次

      return () => clearInterval(interval);
    }
  }, [isMonitoring, collectPerformanceMetrics]);



  // 启动性能监控
  const startMonitoring = () => {
    setIsMonitoring(true);
    collectPerformanceMetrics();
    message.success('性能监控已启动');
  };

  // 停止性能监控
  const stopMonitoring = () => {
    setIsMonitoring(false);
    message.info('性能监控已停止');
  };

  // 应用性能优化
  const applyOptimization = async () => {
    try {
      setCurrentOptimization('applying');
      message.info('正在应用性能优化...');
      
      // 模拟优化过程
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // 记录优化历史
      const optimizationRecord = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        settings: { ...optimizationSettings },
        status: 'completed',
        improvements: calculateImprovements()
      };
      
      setOptimizationHistory(prev => [optimizationRecord, ...prev]);
      
      if (onOptimizationApply) {
        await onOptimizationApply(optimizationSettings);
      }
      
      setCurrentOptimization('completed');
      message.success('性能优化已应用完成');
      
    } catch (error) {
      setCurrentOptimization('failed');
      addErrorLog('优化应用失败', error.message);
      message.error(`优化应用失败: ${error.message}`);
    }
  };

  // 计算优化改进
  const calculateImprovements = () => {
    const improvements = [];
    
    if (optimizationSettings.enableCaching) {
      improvements.push('缓存优化: 响应时间减少15-30%');
    }
    
    if (optimizationSettings.enableCompression) {
      improvements.push('压缩优化: 数据传输量减少40-60%');
    }
    
    if (optimizationSettings.enableLazyLoading) {
      improvements.push('懒加载优化: 初始加载时间减少25-40%');
    }
    
    if (optimizationSettings.maxConcurrentRequests > 3) {
      improvements.push('并发优化: 处理能力提升20-35%');
    }
    
    return improvements;
  };

  // 保存优化设置
  const saveSettings = () => {
    if (onSettingsSave) {
      onSettingsSave(optimizationSettings);
    }
    
    message.success('优化设置已保存');
  };

  // 重置设置
  const resetSettings = () => {
    setOptimizationSettings({
      enableCaching: true,
      enableCompression: true,
      enableLazyLoading: true,
      maxConcurrentRequests: 5,
      requestTimeout: 30000,
      enableRetry: true,
      maxRetryAttempts: 3,
      enablePerformanceMonitoring: true,
      enableErrorTracking: true
    });
    
    message.success('设置已重置为默认值');
  };

  // 添加错误日志
  const addErrorLog = (title, message) => {
    const errorLog = {
      id: Date.now(),
      title,
      message,
      timestamp: new Date().toISOString(),
      level: 'warning'
    };
    
    setErrorLogs(prev => [errorLog, ...prev]);
  };

  // 获取性能状态
  const getPerformanceStatus = () => {
    if (!performanceMetrics.memoryUsage) return 'unknown';
    
    const score = (
      (100 - performanceMetrics.memoryUsage) * 0.3 +
      (100 - performanceMetrics.cpuUsage) * 0.3 +
      (2000 - performanceMetrics.responseTime) / 20 * 0.2 +
      (10 - performanceMetrics.errorRate) * 10 * 0.2
    );
    
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'warning';
    return 'error';
  };

  const performanceStatus = getPerformanceStatus();

  return (
    <OptimizerContainer>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 16 }}>
          <RocketOutlined style={{ marginRight: 12, color: '#1890ff' }} />
          性能优化与异常处理
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          系统性能监控、优化配置、异常处理
        </Text>
      </div>

      {/* 性能监控控制 */}
      <Card title="性能监控控制" style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col span={16}>
            <Space size="large">
              <Button
                type="primary"
                icon={<MonitorOutlined />}
                onClick={startMonitoring}
                disabled={isMonitoring}
              >
                启动监控
              </Button>
              
              <Button
                icon={<StopOutlined />}
                onClick={stopMonitoring}
                disabled={!isMonitoring}
              >
                停止监控
              </Button>
              
              <Button
                icon={<ReloadOutlined />}
                onClick={collectPerformanceMetrics}
              >
                刷新指标
              </Button>
            </Space>
          </Col>
          
          <Col span={8} style={{ textAlign: 'right' }}>
            <div>
              <Text strong>监控状态：</Text>
              <Tag color={isMonitoring ? 'green' : 'default'}>
                {isMonitoring ? '运行中' : '已停止'}
              </Tag>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 性能指标 */}
      {Object.keys(performanceMetrics).length > 0 && (
        <MetricCard 
          title="实时性能指标" 
          status={performanceStatus}
          style={{ marginBottom: 24 }}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="内存使用率"
                value={performanceMetrics.memoryUsage?.toFixed(1)}
                suffix="%"
                valueStyle={{ 
                  color: performanceMetrics.memoryUsage > 80 ? '#ff4d4f' : 
                         performanceMetrics.memoryUsage > 60 ? '#faad14' : '#52c41a' 
                }}
              />
              <Progress
                percent={performanceMetrics.memoryUsage}
                strokeColor={
                  performanceMetrics.memoryUsage > 80 ? '#ff4d4f' : 
                  performanceMetrics.memoryUsage > 60 ? '#faad14' : '#52c41a'
                }
                size="small"
              />
            </Col>
            
            <Col span={6}>
              <Statistic
                title="CPU使用率"
                value={performanceMetrics.cpuUsage?.toFixed(1)}
                suffix="%"
                valueStyle={{ 
                  color: performanceMetrics.cpuUsage > 80 ? '#ff4d4f' : 
                         performanceMetrics.cpuUsage > 60 ? '#faad14' : '#52c41a' 
                }}
              />
              <Progress
                percent={performanceMetrics.cpuUsage}
                strokeColor={
                  performanceMetrics.cpuUsage > 80 ? '#ff4d4f' : 
                  performanceMetrics.cpuUsage > 60 ? '#faad14' : '#52c41a'
                }
                size="small"
              />
            </Col>
            
            <Col span={6}>
              <Statistic
                title="响应时间"
                value={performanceMetrics.responseTime?.toFixed(0)}
                suffix="ms"
                valueStyle={{ 
                  color: performanceMetrics.responseTime > 1500 ? '#ff4d4f' : 
                         performanceMetrics.responseTime > 1000 ? '#faad14' : '#52c41a' 
                }}
              />
            </Col>
            
            <Col span={6}>
              <Statistic
                title="错误率"
                value={performanceMetrics.errorRate?.toFixed(1)}
                suffix="%"
                valueStyle={{ 
                  color: performanceMetrics.errorRate > 5 ? '#ff4d4f' : 
                         performanceMetrics.errorRate > 2 ? '#faad14' : '#52c41a' 
                }}
              />
            </Col>
          </Row>
          
          <Divider />
          
          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title="吞吐量"
                value={performanceMetrics.throughput?.toFixed(0)}
                suffix="req/s"
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="性能评级"
                value={
                  performanceStatus === 'excellent' ? '优秀' :
                  performanceStatus === 'good' ? '良好' :
                  performanceStatus === 'warning' ? '警告' :
                  performanceStatus === 'error' ? '错误' : '未知'
                }
                valueStyle={{ 
                  color: 
                    performanceStatus === 'excellent' ? '#52c41a' :
                    performanceStatus === 'good' ? '#1890ff' :
                    performanceStatus === 'warning' ? '#faad14' :
                    performanceStatus === 'error' ? '#ff4d4f' : '#666'
                }}
              />
            </Col>
          </Row>
        </MetricCard>
      )}

      {/* 优化配置 */}
      <Card title="性能优化配置" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={12}>
            <Title level={5}>基础优化</Title>
            
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Switch
                  checked={optimizationSettings.enableCaching}
                  onChange={(checked) => setOptimizationSettings(prev => ({ ...prev, enableCaching: checked }))}
                />
                <Text>启用缓存优化</Text>
              </Space>
              <Text type="secondary" style={{ display: 'block', marginLeft: 24 }}>
                减少重复请求，提升响应速度
              </Text>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Switch
                  checked={optimizationSettings.enableCompression}
                  onChange={(checked) => setOptimizationSettings(prev => ({ ...prev, enableCompression: checked }))}
                />
                <Text>启用数据压缩</Text>
              </Space>
              <Text type="secondary" style={{ display: 'block', marginLeft: 24 }}>
                减少数据传输量，提升网络效率
              </Text>
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Switch
                  checked={optimizationSettings.enableLazyLoading}
                  onChange={(checked) => setOptimizationSettings(prev => ({ ...prev, enableLazyLoading: checked }))}
                />
                <Text>启用懒加载</Text>
              </Space>
              <Text type="secondary" style={{ display: 'block', marginLeft: 24 }}>
                按需加载资源，减少初始加载时间
              </Text>
            </div>
          </Col>
          
          <Col span={12}>
            <Title level={5}>高级配置</Title>
            
            <div style={{ marginBottom: 16 }}>
              <Text>最大并发请求数</Text>
              <InputNumber
                min={1}
                max={20}
                value={optimizationSettings.maxConcurrentRequests}
                onChange={(value) => setOptimizationSettings(prev => ({ ...prev, maxConcurrentRequests: value }))}
                style={{ width: '100%', marginTop: 8 }}
              />
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Text>请求超时时间 (ms)</Text>
              <InputNumber
                min={1000}
                max={60000}
                step={1000}
                value={optimizationSettings.requestTimeout}
                onChange={(value) => setOptimizationSettings(prev => ({ ...prev, requestTimeout: value }))}
                style={{ width: '100%', marginTop: 8 }}
              />
            </div>
            
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Switch
                  checked={optimizationSettings.enableRetry}
                  onChange={(checked) => setOptimizationSettings(prev => ({ ...prev, enableRetry: checked }))}
                />
                <Text>启用重试机制</Text>
              </Space>
              {optimizationSettings.enableRetry && (
                <div style={{ marginLeft: 24 }}>
                  <Text type="secondary">最大重试次数: </Text>
                  <InputNumber
                    min={1}
                    max={10}
                    value={optimizationSettings.maxRetryAttempts}
                    onChange={(value) => setOptimizationSettings(prev => ({ ...prev, maxRetryAttempts: value }))}
                    size="small"
                  />
                </div>
              )}
            </div>
          </Col>
        </Row>
        
        <Divider />
        
        <div style={{ textAlign: 'center' }}>
          <Space size="large">
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              onClick={applyOptimization}
              loading={currentOptimization === 'applying'}
              disabled={currentOptimization === 'applying'}
            >
              应用优化
            </Button>
            
            <Button
              icon={<SaveOutlined />}
              onClick={saveSettings}
            >
              保存设置
            </Button>
            
            <Button
              icon={<ReloadOutlined />}
              onClick={resetSettings}
            >
              重置设置
            </Button>
          </Space>
        </div>
      </Card>

      {/* 错误日志 */}
      {errorLogs.length > 0 && (
        <Card title="异常日志" style={{ marginBottom: 24 }}>
          <div style={{ maxHeight: '300px', overflow: 'auto' }}>
            {errorLogs.map(log => (
              <Alert
                key={log.id}
                message={log.title}
                description={log.message}
                type="warning"
                showIcon
                style={{ marginBottom: 8 }}
                action={
                  <Button size="small" type="text">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </Button>
                }
              />
            ))}
          </div>
        </Card>
      )}

      {/* 优化历史 */}
      {optimizationHistory.length > 0 && (
        <Card title="优化历史记录">
          <List
            dataSource={optimizationHistory}
            renderItem={record => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>性能优化 #{record.id}</span>
                      <Tag color={record.status === 'completed' ? 'green' : 'red'}>
                        {record.status === 'completed' ? '成功' : '失败'}
                      </Tag>
                    </div>
                  }
                  description={
                    <div>
                      <Text type="secondary">
                        执行时间: {new Date(record.timestamp).toLocaleString()}
                      </Text>
                      {record.improvements && record.improvements.length > 0 && (
                        <div style={{ marginTop: 8 }}>
                          <Text strong>优化效果：</Text>
                          <ul style={{ marginTop: 4 }}>
                            {record.improvements.map((improvement, index) => (
                              <li key={index}>{improvement}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </OptimizerContainer>
  );
};

export default PerformanceOptimizer;
