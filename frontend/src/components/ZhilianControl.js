import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, Button, Typography, Alert, Steps, message, Tag, Tabs } from 'antd';
import { 
  PlayCircleOutlined, 
  StopOutlined, 
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  UserOutlined,
  FileTextOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import styled from 'styled-components';
import CandidateBrowser from './CandidateBrowser';
import ResumeProcessor from './ResumeProcessor';

const { Title, Text } = Typography;

/**
 * 样式组件定义 - 与Boss直聘控制台完全一致
 */
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
    gap: 12px;
    margin-bottom: 20px;
  }
  
  .status-tag {
    font-size: 14px;
    padding: 6px 16px;
    border-radius: 6px;
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

/**
 * 智联招聘控制组件
 * 与Boss直聘控制台界面和功能完全一致
 */
const ZhilianControl = () => {
  // 状态管理 - 与Boss直聘保持一致
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

  /**
   * 添加操作日志
   */
  const addLog = useCallback((message, type = 'info') => {
    const logItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      time: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [logItem, ...prev].slice(0, 50));
  }, []);

  /**
   * 更新当前步骤
   */
  const updateCurrentStep = useCallback((status, isLoggedIn) => {
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
  }, []);

  /**
   * 获取智联招聘服务状态
   */
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/zhilian/status');
      const result = await response.json();
      
      if (result.success) {
        const statusData = result.data;
        
        // 更新状态变量
        setCurrentStatus(statusData.status);
        setIsLoggedIn(statusData.loggedIn);
        setHasBrowser(statusData.hasBrowser);
        setHasPage(statusData.hasPage);
        
        // 更新当前步骤
        updateCurrentStep(statusData.status, statusData.loggedIn);
        
        // 如果已登录且正在轮询登录状态，停止轮询
        if (statusData.loggedIn && loginPollingRef.current) {
          clearInterval(loginPollingRef.current);
          loginPollingRef.current = null;
          addLog('检测到用户已登录，停止登录状态轮询', 'success');
        }
      }
    } catch (error) {
      console.error('获取状态失败:', error);
      addLog('获取状态失败: ' + error.message, 'error');
    }
  }, [addLog, updateCurrentStep]);

  /**
   * 启动智联招聘智能寻聘 - 优化版本
   */
  const startZhilian = async () => {
    try {
      setIsLoading(true);
      addLog('正在启动智联招聘智能寻聘...', 'info');
      
      // 第一步：初始化浏览器
      addLog('正在初始化浏览器...', 'info');
      const initResponse = await fetch('/api/zhilian/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const initResult = await initResponse.json();
      
      if (!initResult.success) {
        message.error(initResult.message);
        addLog('初始化失败: ' + initResult.message, 'error');
        return;
      }
      
      addLog('浏览器初始化成功', 'success');
      
      // 更新状态
      if (initResult.data) {
        const statusData = initResult.data;
        setCurrentStatus(statusData.status);
        setIsLoggedIn(statusData.loggedIn);
        setHasBrowser(statusData.hasBrowser);
        setHasPage(statusData.hasPage);
        updateCurrentStep(statusData.status, statusData.loggedIn);
      } else {
        setCurrentStep(1);
      }
      
      // 第二步：打开智联招聘网站
      addLog('正在打开智联招聘网站...', 'info');
      const openResponse = await fetch('/api/zhilian/execute-step', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ step: 'open_website' })
      });
      
      const openResult = await openResponse.json();
      
      if (openResult.success) {
        message.success('智联招聘网站已打开，请登录！');
        addLog('智联招聘网站已打开，等待用户登录', 'success');
        setCurrentStep(2);
        
        // 开始轮询状态
        startStatusPolling();
        
        // 检查是否已经登录
        const statusResponse = await fetch('/api/zhilian/status');
        const statusResult = await statusResponse.json();
        
        if (statusResult.success && !statusResult.data.loggedIn) {
          // 如果还未登录，开始等待登录
          setTimeout(() => {
            waitForLogin();
          }, 2000);
        } else if (statusResult.success && statusResult.data.loggedIn) {
          addLog('检测到用户已登录，跳过登录等待', 'success');
          setCurrentStep(3);
          setActiveTab('candidates');
        }
      } else {
        message.error(openResult.message);
        addLog('打开网站失败: ' + openResult.message, 'error');
      }
    } catch (error) {
      console.error('启动失败:', error);
      message.error('启动失败: ' + error.message);
      addLog('启动失败: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 停止智联招聘服务
   */
  const stopZhilian = async () => {
    try {
      setIsLoading(true);
      addLog('正在停止智联招聘智能寻聘...', 'info');
      
      const response = await fetch('/api/zhilian/stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        message.success('智联招聘智能寻聘已停止');
        addLog(result.message, 'success');
        setCurrentStatus('not_initialized');
        setIsLoggedIn(false);
        setHasBrowser(false);
        setHasPage(false);
        setCurrentStep(0);
        
        // 停止轮询
        if (statusPollingRef.current) {
          clearInterval(statusPollingRef.current);
          statusPollingRef.current = null;
        }
        if (loginPollingRef.current) {
          clearInterval(loginPollingRef.current);
          loginPollingRef.current = null;
        }
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

  // 移除未使用的checkLoginStatus函数，其功能已整合到fetchStatus中

  /**
   * 手动检查登录状态
   */
  const checkLogin = async () => {
    try {
      addLog('正在检查登录状态...', 'info');
      
      // 使用专门的登录状态检查API
      const response = await fetch('/api/zhilian/login-status');
      const result = await response.json();
      
      if (result.success) {
        const statusData = result.data;
        const { isLoggedIn, loggedIn, status, hasBrowser, hasPage } = statusData;
        
        // 兼容两种字段名
        const actualLoginStatus = isLoggedIn !== undefined ? isLoggedIn : loggedIn;
        
        setIsLoggedIn(actualLoginStatus);
        setCurrentStatus(status);
        setHasBrowser(hasBrowser);
        setHasPage(hasPage);
        updateCurrentStep(status, actualLoginStatus);
        
        if (actualLoginStatus) {
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
          message.warning('用户尚未登录，请在浏览器中完成登录');
          addLog('用户尚未登录', 'warning');
        }
        
        return actualLoginStatus;
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      message.error('检查登录状态失败: ' + error.message);
      addLog('检查登录状态失败: ' + error.message, 'error');
      return false;
    }
  };

  /**
   * 等待用户登录
   */
  const waitForLogin = async () => {
    try {
      setIsLoading(true);
      addLog('正在等待用户扫码登录...', 'info');
      message.info('正在等待用户扫码登录，请使用智联招聘App扫描二维码');
      
      // 开始登录状态轮询
      startLoginPolling();
    } catch (error) {
      console.error('等待登录失败:', error);
      message.error('等待用户登录失败: ' + error.message);
      addLog('等待用户登录失败: ' + error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 启动状态轮询 - 优化版本，避免状态重置
   */
  const startStatusPolling = () => {
    // 如果已经在轮询，不要重复启动
    if (statusPollingRef.current) {
      return;
    }
    
    addLog('启动状态轮询监控', 'info');
    
    // 开始新的轮询
    statusPollingRef.current = setInterval(() => {
      fetchStatus();
    }, 2000); // 每2秒检查一次
    
    // 5分钟后停止轮询
    setTimeout(() => {
      if (statusPollingRef.current) {
        clearInterval(statusPollingRef.current);
        statusPollingRef.current = null;
        addLog('状态轮询已超时停止', 'warning');
      }
    }, 300000); // 5分钟
  };

  /**
   * 登录成功后的自动化流程处理
   */
  const triggerPostLoginFlow = async () => {
    try {
      addLog('开始执行登录后自动化流程...', 'info');
      
      // 这里可以添加登录成功后需要执行的自动化操作
      // 例如：获取用户信息、初始化候选人浏览等
      
      addLog('登录后自动化流程执行完成', 'success');
    } catch (error) {
      console.error('登录后自动化流程执行失败:', error);
      addLog('登录后自动化流程执行失败: ' + error.message, 'error');
    }
  };

  /**
   * 启动登录状态轮询 - 优化版本
   */
  const startLoginPolling = () => {
    // 如果已经在轮询，不要重复启动
    if (loginPollingRef.current) {
      return;
    }
    
    addLog('开始监控登录状态，请在浏览器中完成扫码登录', 'info');
    
    loginPollingRef.current = setInterval(async () => {
      try {
        // 直接调用fetchStatus来更新所有状态
        await fetchStatus();
        
        // 检查是否已登录，如果已登录则停止轮询
        const response = await fetch('/api/zhilian/status');
        const result = await response.json();
        
        if (result.success && result.data.loggedIn) {
          // 登录成功，停止轮询
          clearInterval(loginPollingRef.current);
          loginPollingRef.current = null;
          addLog('检测到用户已登录，停止轮询', 'success');
          
          // 显示登录成功消息
          message.success('用户已登录！');
          addLog('用户登录成功！', 'success');
          setCurrentStep(3);
          
          // 登录成功后自动切换到候选人浏览选项卡
          setActiveTab('candidates');
          
          // 触发后续自动化流程
          await triggerPostLoginFlow();
        }
      } catch (error) {
        console.error('登录状态轮询出错:', error);
        addLog('登录状态轮询出错: ' + error.message, 'error');
      }
    }, 3000); // 每3秒检查一次
    
    // 2分钟后停止登录轮询
    setTimeout(() => {
      if (loginPollingRef.current) {
        clearInterval(loginPollingRef.current);
        loginPollingRef.current = null;
        addLog('登录轮询已超时停止，请手动检查登录状态', 'warning');
      }
    }, 120000); // 2分钟
  };

  /**
   * 获取状态显示信息
   */
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

  /**
   * 获取步骤信息
   */
  const steps = useMemo(() => [
    {
      key: 'init',
      title: '初始化',
      description: '启动浏览器和基础服务'
    },
    {
      key: 'website',
      title: '打开官网',
      description: '访问智联招聘官网'
    },
    {
      key: 'login',
      title: '等待登录',
      description: '用户登录智联招聘'
    },
    {
      key: 'complete',
      title: '登录完成',
      description: '可以开始自动化操作'
    }
  ], []);

  /**
   * 标签页配置
   */
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
      children: <CandidateBrowser platform="zhilian" />
    },
    {
      key: 'resumes',
      label: (
        <span>
          <FileTextOutlined />
          简历处理
        </span>
      ),
      children: <ResumeProcessor platform="zhilian" />
    }
  ], []);

  useEffect(() => {
    fetchStatus();
    addLog('智联招聘控制界面已加载', 'info');
    
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
  }, [fetchStatus, addLog]);

  const statusInfo = getStatusInfo();

  return (
    <Container>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2}>
          <SearchOutlined style={{ marginRight: 12, color: '#1890ff' }} />
          智联招聘智能寻聘控制台
        </Title>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          管理智联招聘自动化流程
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
          onClick={startZhilian}
          loading={isLoading}
          disabled={isLoading || (currentStatus !== 'not_initialized' && currentStatus !== 'idle')}
        >
          启动智能寻聘
        </ControlButton>
        
        <ControlButton
          icon={<ReloadOutlined />}
          onClick={checkLogin}
          disabled={isLoading || !hasBrowser || currentStatus === 'not_initialized'}
        >
          检查登录状态
        </ControlButton>
        
        <ControlButton
          icon={<ClockCircleOutlined />}
          onClick={waitForLogin}
          loading={isLoading}
          disabled={isLoading || currentStatus === 'not_initialized' || isLoggedIn || !hasBrowser}
        >
          等待用户登录
        </ControlButton>
        
        <ControlButton
          danger
          icon={<StopOutlined />}
          onClick={stopZhilian}
          loading={isLoading}
          disabled={isLoading || currentStatus === 'not_initialized'}
        >
          停止服务
        </ControlButton>
      </ControlPanel>

      <Alert
        message="操作说明"
        description="1. 点击'启动智能寻聘'开始自动化流程；2. 系统会自动打开智联招聘官网并导航到招聘页面；3. 请在智联招聘网站上完成登录；4. 登录成功后即可开始自动化操作。"
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

export default ZhilianControl;