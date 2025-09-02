import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Card, Button, Typography, Alert, Steps, message, Tag, Tabs, Space } from 'antd';
import { 
  PlayCircleOutlined, 
  StopOutlined, 
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  RobotOutlined,
  UserOutlined,
  FileTextOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import styled from 'styled-components';
import CandidateBrowser from './CandidateBrowser';
import ResumeProcessor from './ResumeProcessor';

const { Title, Text } = Typography;
const { Step } = Steps;

const Container = styled.div`
  padding: 24px;
  max-width: 1000px;
  margin: 0 auto;
`;

const StatusCard = styled(Card)`
  margin-bottom: 24px;
  
  .status-indicator {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 20px;
    padding: 12px 0;
    
    .anticon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    h4 {
      flex: 1;
      margin: 0 !important;
      font-size: 16px;
      font-weight: 600;
      white-space: nowrap;
      min-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
  
  .status-tag {
    font-size: 14px;
    padding: 6px 16px;
    border-radius: 6px;
    min-width: 80px;
    text-align: center;
  }
  
  .status-details {
    .status-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      padding: 8px 0;
      border-bottom: 1px solid #f0f0f0;
      
      &:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }
      
      .status-label {
        font-weight: 500;
        color: #333;
      }
      
      .status-value {
        margin-left: 16px;
      }
    }
  }
`;

const ControlPanel = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin: 24px 0;
`;

const ControlButton = styled(Button)`
  height: 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  .anticon {
    font-size: 24px;
  }
`;

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

const LogContainer = styled.div`
  margin-top: 24px;
  padding: 16px;
  background: #f5f5f5;
  border-radius: 8px;
  max-height: 300px;
  overflow-y: auto;
  
  .log-item {
    margin-bottom: 8px;
    padding: 8px;
    background: white;
    border-radius: 4px;
    border-left: 3px solid #1890ff;
    
    .log-time {
      color: #666;
      font-size: 12px;
    }
    
    .log-message {
      margin-top: 4px;
    }
  }
`;

const BossZhipinControl = () => {
  const [currentStatus, setCurrentStatus] = useState('not_initialized');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasBrowser, setHasBrowser] = useState(false);
  const [hasPage, setHasPage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // 使用useRef管理定时器
  const statusPollingRef = useRef(null);
  const loginPollingRef = useRef(null);

  // 添加日志
  const addLog = (message, type = 'info') => {
    const logItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // 确保唯一性
      time: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [logItem, ...prev].slice(0, 50)); // 保留最近50条日志
  };

  // 获取状态
  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/boss-zhipin/status');
      const result = await response.json();
      
      if (result.success) {
        const { status, isLoggedIn, hasBrowser, hasPage } = result.data;
        setCurrentStatus(status);
        setIsLoggedIn(isLoggedIn);
        setHasBrowser(hasBrowser);
        setHasPage(hasPage);
        
        // 根据状态设置当前步骤
        updateCurrentStep(status, isLoggedIn);
      }
    } catch (error) {
      console.error('获取状态失败:', error);
      addLog('获取状态失败: ' + error.message, 'error');
    }
  };

  // 更新当前步骤
  const updateCurrentStep = (status, isLoggedIn) => {
    switch (status) {
      case 'not_initialized':
        setCurrentStep(0);
        break;
      case 'initialized':
        setCurrentStep(1);
        break;
      case 'logging_in':
        setCurrentStep(2);
        break;
      case 'idle':
        if (isLoggedIn) {
          setCurrentStep(3);
        } else {
          setCurrentStep(2);
        }
        break;
      default:
        setCurrentStep(0);
    }
  };

  // 启动 Boss 直聘智能寻聘
  const startBossZhipin = async () => {
    try {
      setIsLoading(true);
      addLog('正在启动 Boss 直聘智能寻聘...', 'info');
      
      const response = await fetch('/api/boss-zhipin/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        message.success('Boss 直聘智能寻聘启动成功！');
        addLog(result.message, 'success');
        setCurrentStep(1);
        
        // 开始轮询状态
        startStatusPolling();
      } else {
        message.error(result.message);
        addLog('启动失败: ' + result.message, 'error');
      }
    } catch (error) {
      console.error('启动失败:', error);
      message.error('启动失败: ' + error.message);
      addLog('启动失败: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 停止服务
  const stopBossZhipin = async () => {
    try {
      setIsLoading(true);
      addLog('正在停止 Boss 直聘智能寻聘...', 'info');
      
      const response = await fetch('/api/boss-zhipin/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        message.success('Boss 直聘智能寻聘已停止');
        addLog(result.message, 'success');
        setCurrentStep(0);
        setCurrentStatus('not_initialized');
        setIsLoggedIn(false);
        setHasBrowser(false);
        setHasPage(false);
      } else {
        message.error(result.message);
        addLog('停止失败: ' + result.message, 'error');
      }
    } catch (error) {
      console.error('停止失败:', error);
      message.error('停止失败: ' + error.message);
      addLog('停止失败: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 检查登录状态
  const checkLoginStatus = async () => {
    try {
      const response = await fetch('/api/boss-zhipin/check-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        const { isLoggedIn, status, hasBrowser, hasPage } = result.data;
        setIsLoggedIn(isLoggedIn);
        setCurrentStatus(status);
        setHasBrowser(hasBrowser);
        setHasPage(hasPage);
        updateCurrentStep(status, isLoggedIn);
        
        if (isLoggedIn) {
          // 清除登录轮询
          if (loginPollingRef.current) {
            clearInterval(loginPollingRef.current);
            loginPollingRef.current = null;
          }
          
          message.success('用户已登录！');
          addLog('用户登录成功！', 'success');
          
          // 登录成功后自动切换到候选人浏览选项卡
          setActiveTab('candidates');
          
          // 触发后续自动化流程
          await triggerPostLoginFlow();
        } else {
          addLog('用户尚未登录', 'info');
        }
        
        return isLoggedIn;
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      addLog('检查登录状态失败: ' + error.message, 'error');
      return false;
    }
  };

  // 等待用户登录
  const waitForLogin = async () => {
    try {
      setIsLoading(true);
      addLog('正在等待用户扫码登录...', 'info');
      
      const response = await fetch('/api/boss-zhipin/wait-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ timeout: 300000 }) // 5分钟超时
      });
      
      const result = await response.json();
      
      if (result.success) {
        message.info('正在等待用户扫码登录，请使用 Boss 直聘 App 扫描二维码');
        addLog(result.message, 'info');
        
        // 开始轮询登录状态
        startLoginPolling();
      } else {
        message.error(result.message);
        addLog('等待登录失败: ' + result.message, 'error');
      }
    } catch (error) {
      console.error('等待登录失败:', error);
      message.error('等待用户登录失败: ' + error.message);
      addLog('等待用户登录失败: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // 登录成功后触发的自动化流程
  const triggerPostLoginFlow = async () => {
    try {
      addLog('登录成功，开始自动化流程...', 'info');
      
      // 可以在这里添加登录成功后的自动化操作
      // 例如：自动导航到招聘页面、处理弹窗等
      
      addLog('自动化流程已启动', 'success');
    } catch (error) {
      console.error('自动化流程启动失败:', error);
      addLog('自动化流程启动失败: ' + error.message, 'error');
    }
  };

  // 开始状态轮询
  const startStatusPolling = () => {
    // 清除之前的轮询
    if (statusPollingRef.current) {
      clearInterval(statusPollingRef.current);
    }
    
    statusPollingRef.current = setInterval(() => {
      fetchStatus();
    }, 2000); // 每2秒检查一次状态
    
    // 5分钟后停止轮询
    setTimeout(() => {
      if (statusPollingRef.current) {
        clearInterval(statusPollingRef.current);
        statusPollingRef.current = null;
      }
    }, 300000);
  };

  // 开始登录状态轮询
  const startLoginPolling = () => {
    // 清除之前的轮询
    if (loginPollingRef.current) {
      clearInterval(loginPollingRef.current);
    }
    
    loginPollingRef.current = setInterval(async () => {
      const loginStatus = await checkLoginStatus();
      
      // 如果已登录，停止轮询
      if (loginStatus) {
        clearInterval(loginPollingRef.current);
        loginPollingRef.current = null;
      }
    }, 3000); // 每3秒检查一次登录状态
    
    // 5分钟后停止轮询
    setTimeout(() => {
      if (loginPollingRef.current) {
        clearInterval(loginPollingRef.current);
        loginPollingRef.current = null;
      }
    }, 300000);
  };

  // 获取状态显示信息
  const getStatusInfo = () => {
    switch (currentStatus) {
      case 'not_initialized':
        return { text: '未初始化', color: 'default', icon: <ExclamationCircleOutlined /> };
      case 'initialized':
        return { text: '已初始化', color: 'processing', icon: <ClockCircleOutlined /> };
      case 'logging_in':
        return { text: '等待登录', color: 'warning', icon: <ClockCircleOutlined /> };
      case 'idle':
        if (isLoggedIn) {
          return { text: '已登录', color: 'success', icon: <CheckCircleOutlined /> };
        } else {
          return { text: '待登录', color: 'warning', icon: <ClockCircleOutlined /> };
        }
      default:
        return { text: '未知状态', color: 'default', icon: <ExclamationCircleOutlined /> };
    }
  };

  // 获取步骤信息 - 使用useMemo优化
  const steps = useMemo(() => [
    {
      key: 'init',
      title: '初始化',
      description: '启动浏览器和基础服务'
    },
    {
      key: 'website',
      title: '打开官网',
      description: '访问 Boss 直聘官网'
    },
    {
      key: 'login',
      title: '等待登录',
      description: '用户扫码登录'
    },
    {
      key: 'complete',
      title: '登录完成',
      description: '可以开始自动化操作'
    }
  ], []);

  // 标签页配置 - 使用useMemo优化
  const tabItems = useMemo(() => [
    {
      key: 'dashboard',
      label: (
        <span>
          <DashboardOutlined />
          控制台
        </span>
      ),
      children: null
    },
    {
      key: 'candidates',
      label: (
        <span>
          <UserOutlined />
          候选人浏览
        </span>
      ),
      children: <CandidateBrowser />
    },
    {
      key: 'resumes',
      label: (
        <span>
          <FileTextOutlined />
          简历处理
        </span>
      ),
      children: <ResumeProcessor platform="boss" />
    }
  ], []);

  useEffect(() => {
    fetchStatus();
    addLog('Boss 直聘控制界面已加载', 'info');
    
    // 组件卸载时清理定时器
    return () => {
      if (statusPollingRef.current) {
        clearInterval(statusPollingRef.current);
        statusPollingRef.current = null;
      }
      if (loginPollingRef.current) {
        clearInterval(loginPollingRef.current);
        loginPollingRef.current = null;
      }
    };
  }, []);

  const statusInfo = getStatusInfo();

  return (
    <Container>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2}>
          <RobotOutlined style={{ marginRight: 12, color: '#1890ff' }} />
          Boss 直聘智能寻聘控制台
        </Title>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          管理 Boss 直聘自动化流程
        </Text>
      </div>

      <StatusCard>
        <div className="status-indicator">
          {statusInfo.icon}
          <Title level={4} style={{ margin: 0 }}>当前状态</Title>
          <Tag color={statusInfo.color} className="status-tag">
            {statusInfo.text}
          </Tag>
        </div>
        
        <div className="status-details">
          <div className="status-item">
            <Text strong className="status-label">浏览器状态:</Text>
            <Tag color={hasBrowser ? 'success' : 'default'} className="status-value">
              {hasBrowser ? '已启动' : '未启动'}
            </Tag>
          </div>
          <div className="status-item">
            <Text strong className="status-label">页面状态:</Text>
            <Tag color={hasPage ? 'success' : 'default'} className="status-value">
              {hasPage ? '已加载' : '未加载'}
            </Tag>
          </div>
          <div className="status-item">
            <Text strong className="status-label">登录状态:</Text>
            <Tag color={isLoggedIn ? 'success' : 'default'} className="status-value">
              {isLoggedIn ? '已登录' : '未登录'}
            </Tag>
          </div>
        </div>
      </StatusCard>

      <StepsContainer>
        <Steps current={currentStep} items={steps} />
      </StepsContainer>

      <ControlPanel>
        <ControlButton
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={startBossZhipin}
          loading={isLoading}
          disabled={currentStatus !== 'not_initialized'}
        >
          启动智能寻聘
        </ControlButton>
        
        <ControlButton
          icon={<ReloadOutlined />}
          onClick={checkLoginStatus}
          disabled={!hasBrowser}
        >
          检查登录状态
        </ControlButton>
        
        <ControlButton
          icon={<ClockCircleOutlined />}
          onClick={waitForLogin}
          loading={isLoading}
          disabled={currentStatus === 'not_initialized' || isLoggedIn}
        >
          等待用户登录
        </ControlButton>
        
        <ControlButton
          danger
          icon={<StopOutlined />}
          onClick={stopBossZhipin}
          loading={isLoading}
          disabled={currentStatus === 'not_initialized'}
        >
          停止服务
        </ControlButton>
      </ControlPanel>

      <Alert
        message="操作说明"
        description="1. 点击'启动智能寻聘'开始自动化流程；2. 系统会自动打开 Boss 直聘官网并导航到招聘页面；3. 选择 App 扫码登录方式；4. 使用 Boss 直聘 App 扫描二维码完成登录；5. 登录成功后即可开始自动化操作。"
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      {/* 功能标签页 */}
      {isLoggedIn && (
        <Card style={{ marginBottom: 24 }}>
          <Tabs 
            activeKey={activeTab}
            onChange={setActiveTab}
            items={tabItems}
            size="large"
            tabPosition="top"
          />
        </Card>
      )}

      <LogContainer>
        <Title level={4}>操作日志</Title>
        {logs.map(log => (
          <div key={log.id} className="log-item">
            <div className="log-time">{log.time}</div>
            <div className="log-message">
              <Tag color={log.type === 'error' ? 'red' : log.type === 'success' ? 'green' : 'blue'}>
                {log.message}
              </Tag>
            </div>
          </div>
        ))}
        {logs.length === 0 && (
          <Text type="secondary">暂无操作日志</Text>
        )}
      </LogContainer>
    </Container>
  );
};

export default BossZhipinControl;
