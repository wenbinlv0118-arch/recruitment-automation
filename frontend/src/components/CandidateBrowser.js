import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Alert, Steps, message, Tag, Space, Row, Col, Select, Progress } from 'antd';
import { 
  SearchOutlined, 
  UserOutlined,
  HeartOutlined,
  DislikeOutlined,
  EyeOutlined,
  StarOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  MessageOutlined,
  BulbOutlined
} from '@ant-design/icons';
import styled from 'styled-components';
import FilterPanel from './FilterPanel';
import { apiPost, apiGet } from '../utils/api';
import useFilters from '../hooks/useFilters';

const { Title, Text } = Typography;
const { Option } = Select;

const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

// FilterPanel组件已移至独立文件

const CandidateCard = styled(Card)`
  margin-bottom: 16px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: #1890ff;
  }
  
  .candidate-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  
  .candidate-info {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .candidate-avatar {
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
  
  .candidate-details {
    flex: 1;
  }
  
  .candidate-name {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 4px;
  }
  
  .candidate-position {
    color: #666;
    margin-bottom: 4px;
  }
  
  .candidate-company {
    color: #999;
    font-size: 12px;
  }
  
  .candidate-actions {
    display: flex;
    gap: 8px;
  }
  
  .candidate-tags {
    margin-top: 12px;
    
    .ant-tag {
      margin-bottom: 4px;
    }
  }
`;

const StatusPanel = styled(Card)`
  margin-bottom: 24px;
  
  .status-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    padding: 12px 16px;
    background: #fafafa;
    border-radius: 8px;
    border: 1px solid #f0f0f0;
    transition: all 0.2s ease;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    &:hover {
      background: #f5f5f5;
      border-color: #d9d9d9;
    }
  }
  
  .status-value {
    font-weight: 600;
    min-width: 80px;
    text-align: center;
    
    .ant-tag {
      margin: 0;
      font-size: 12px;
      padding: 4px 12px;
      border-radius: 6px;
    }
  }
`;

/**
 * 统一的模式选择卡片样式组件
 * 为所有浏览模式提供一致的选中动效和悬停效果
 */
const ModeSelectionCard = styled(Card)`
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 2px solid transparent;
  position: relative;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  }
  
  &.selected {
    border-color: #1890ff;
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(24, 144, 255, 0.2);
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #1890ff, #52c41a);
      animation: shimmer 2s ease-in-out infinite;
    }
    
    .mode-icon {
      animation: pulse 1.5s ease-in-out infinite;
    }
    
    .mode-title {
      color: #1890ff;
      font-weight: 600;
    }
  }
  
  .mode-content {
    text-align: center;
    padding: 8px;
  }
  
  .mode-icon {
    transition: all 0.3s ease;
    margin-bottom: 8px;
  }
  
  .mode-title {
    transition: all 0.3s ease;
    margin-bottom: 4px;
  }
  
  @keyframes shimmer {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }
  
  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }
`;

/**
 * 候选人浏览组件
 * @param {Object} props - 组件属性
 * @param {string} props.platform - 招聘平台标识，默认为'boss-zhipin'
 */
const CandidateBrowser = ({ platform = 'boss-zhipin' }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [isPaused, setIsPaused] = useState(false); // 新增暂停状态
  const [browseMode, setBrowseMode] = useState('recommended'); // recommended, search, potential, communication
  const [candidates, setCandidates] = useState([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [likedCount, setLikedCount] = useState(0);
  const [dislikedCount, setDislikedCount] = useState(0);
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0);
  const [pollingInterval, setPollingInterval] = useState(null); // 保存轮询间隔ID
  
  // 系统状态变量 - 智联招聘需要的初始化状态
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // eslint-disable-next-line no-unused-vars
  const [searchFilters, setSearchFilters] = useState({});
  
  // 使用筛选条件Hook
  const {
    filters,
    updateFilter,
    applyFilters: applyFiltersHook,
    resetFilters: resetFiltersHook
  } = useFilters(platform);
  
  // 简历采集数量设置 - 测试环节支持2-5份简历
  const [targetResumeCount, setTargetResumeCount] = useState(3);

  // 智联招聘初始化相关函数
  const startZhilianService = async () => {
    if (platform !== 'zhilian') return;
    
    try {
      setIsLoading(true);
      setCurrentStep(0);
      
      // 启动智联招聘服务，传递必要的参数
      const response = await apiPost('/api/zhilian/start', {
        mode: browseMode || 'recommended', // 使用当前选择的模式，默认为推荐模式
        filters: filters || {},
        targetCount: targetResumeCount
      });
      
      if (response.ok) {
        setIsInitialized(true);
        setCurrentStep(1);
        // 开始状态轮询
        startZhilianStatusPolling();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '启动智联招聘服务失败');
      }
    } catch (error) {
      console.error('启动智联招聘服务错误:', error);
      message.error(error.message || '启动智联招聘服务失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 智联招聘状态轮询
  const startZhilianStatusPolling = () => {
    if (platform !== 'zhilian') return;
    
    const pollInterval = setInterval(async () => {
      try {
        const data = await apiGet('/api/zhilian/status');
        updateZhilianStatus(data);
      } catch (error) {
        console.error('获取智联招聘状态失败:', error);
      }
    }, 2000);
    
    // 保存轮询ID以便后续清理
    window.zhilianStatusPolling = pollInterval;
  };
  
  // 更新智联招聘状态
  const updateZhilianStatus = (statusData) => {
    const { hasBrowser, hasPage, isLoggedIn } = statusData;
    
    setIsLoggedIn(isLoggedIn);
    
    // 根据状态更新当前步骤
    if (hasBrowser && !hasPage) {
      setCurrentStep(1); // 打开官网
    } else if (hasPage && !isLoggedIn) {
      setCurrentStep(2); // 等待登录
    } else if (isLoggedIn) {
      setCurrentStep(3); // 登录完成
      // 清理状态轮询
      if (window.zhilianStatusPolling) {
        clearInterval(window.zhilianStatusPolling);
        window.zhilianStatusPolling = null;
      }
      // 重置步骤，进入浏览模式选择
      setTimeout(() => {
        setCurrentStep(0);
      }, 1000);
    }
  };
  
  // 停止智联招聘服务
  const stopZhilianService = async () => {
    if (platform !== 'zhilian') return;
    
    try {
      await apiPost('/api/zhilian/stop', {});
      
      // 重置所有状态
      setIsInitialized(false);
      setIsLoggedIn(false);
      setCurrentStep(0);
      
      // 清理轮询
      if (window.zhilianStatusPolling) {
        clearInterval(window.zhilianStatusPolling);
        window.zhilianStatusPolling = null;
      }
      
      message.success('智联招聘服务已停止');
    } catch (error) {
      console.error('停止智联招聘服务错误:', error);
      message.error('停止智联招聘服务失败');
    }
  };

  // 获取步骤信息
  const getSteps = () => {
    // 智联招聘需要完整的初始化流程
    if (platform === 'zhilian') {
      // 如果还未登录，显示初始化步骤
      if (!isLoggedIn) {
        return [
          {
            title: '初始化',
            description: '启动浏览器和基础服务',
            status: currentStep >= 0 ? 'finish' : 'wait'
          },
          {
            title: '打开官网',
            description: '访问智联招聘官网',
            status: currentStep >= 1 ? 'finish' : 'wait'
          },
          {
            title: '等待登录',
            description: '用户手动登录',
            status: currentStep >= 2 ? 'finish' : 'wait'
          },
          {
            title: '登录完成',
            description: '验证登录状态，准备开始自动化操作',
            status: currentStep >= 3 ? 'finish' : 'wait'
          }
        ];
      }
      
      // 登录后显示浏览模式选择步骤
      const modeDescription = '推荐人才、搜索人才、潜在人才、互动';
      
      if (browseMode === 'search') {
        return [
          {
            title: '选择浏览模式',
            description: modeDescription,
            status: currentStep >= 0 ? 'finish' : 'wait'
          },
          {
            title: '配置筛选条件',
            description: '设置职位、地区、经验等筛选条件',
            status: currentStep >= 1 ? 'finish' : 'wait'
          },
          {
            title: '开始浏览',
            description: '自动浏览候选人信息',
            status: currentStep >= 2 ? 'finish' : 'wait'
          },
          {
            title: '简历处理',
            description: '自动采集和处理简历',
            status: currentStep >= 3 ? 'finish' : 'wait'
          }
        ];
      } else {
        return [
          {
            title: '选择浏览模式',
            description: modeDescription,
            status: currentStep >= 0 ? 'finish' : 'wait'
          },
          {
            title: '开始浏览',
            description: '自动浏览候选人信息',
            status: currentStep >= 1 ? 'finish' : 'wait'
          },
          {
            title: '简历处理',
            description: '自动采集和处理简历',
            status: currentStep >= 2 ? 'finish' : 'wait'
          }
        ];
      }
    }
    
    // Boss直聘的原有逻辑
    const modeDescription = '推荐牛人、搜索牛人、沟通版块';
    
    if (browseMode === 'search') {
      return [
        {
          title: '选择浏览模式',
          description: modeDescription,
          status: currentStep >= 0 ? 'finish' : 'wait'
        },
        {
          title: '配置筛选条件',
          description: '设置职位、地区、经验等筛选条件',
          status: currentStep >= 1 ? 'finish' : 'wait'
        },
        {
          title: '开始浏览',
          description: '自动浏览候选人信息',
          status: currentStep >= 2 ? 'finish' : 'wait'
        },
        {
          title: '简历处理',
          description: '自动采集和处理简历',
          status: currentStep >= 3 ? 'finish' : 'wait'
        }
      ];
    } else {
      return [
        {
          title: '选择浏览模式',
          description: modeDescription,
          status: currentStep >= 0 ? 'finish' : 'wait'
        },
        {
          title: '开始浏览',
          description: '自动浏览候选人信息',
          status: currentStep >= 1 ? 'finish' : 'wait'
        },
        {
          title: '简历处理',
          description: '自动采集和处理简历',
          status: currentStep >= 2 ? 'finish' : 'wait'
        }
      ];
    }
  };

  /**
   * 根据选择的模式导航到对应页面
   * @param {string} mode - 浏览模式 (recommended, search, favorites, communication)
   */
  const navigateToModeSpecificPage = async (mode) => {
    try {
      const modeMessages = {
        recommended: platform === 'zhilian' ? '推荐人才' : '推荐牛人',
        search: platform === 'zhilian' ? '搜索人才' : '搜索牛人',
        favorites: platform === 'zhilian' ? '潜在人才' : '收藏',
        communication: platform === 'zhilian' ? '互动' : '沟通版块'
      };
      
      message.loading(`正在导航到${modeMessages[mode]}版块...`, 1);
      
      // 根据模式选择不同的导航策略
      const apiEndpoint = platform === 'zhilian' ? '/api/zhilian/navigate-to-mode' : '/api/boss-zhipin/navigate-to-mode';
      
      const result = await apiPost(apiEndpoint, {
        mode: mode,
        targetCount: targetResumeCount
      });
      
      if (result.success) {
        message.success(`🎯 已成功导航到${modeMessages[mode]}版块！`);
        console.log(`导航到${modeMessages[mode]}版块成功:`, result);
      } else {
        message.warning(`导航到${modeMessages[mode]}版块失败: ` + result.message);
        console.error('导航失败:', result);
      }
    } catch (error) {
      console.error('导航错误:', error);
      message.error('导航时发生错误: ' + error.message);
    }
  };

  // 启动候选人浏览
  const startBrowsing = async () => {
    try {
      // 如果是暂停状态，则继续浏览
      if (isPaused) {
        setIsPaused(false);
        message.success('继续智能寻聘...');
        // 重新开始轮询状态
        startStatusPolling();
        return;
      }
      
      setIsBrowsing(true);
      // 根据模式设置不同的步骤
      if (browseMode === 'search') {
        setCurrentStep(2);
      } else {
        setCurrentStep(1);
      }
      
      // 添加调试信息
      console.log('启动浏览参数:', {
        mode: browseMode,
        filters: filters,
        targetCount: targetResumeCount
      });
      
      // 根据平台显示不同的消息
      const modeMessages = {
        search: platform === 'zhilian' ? '搜索人才' : '搜索牛人',
        recommended: platform === 'zhilian' ? '推荐人才' : '推荐牛人', 
        communication: platform === 'zhilian' ? '互动' : '沟通版块',
        favorites: platform === 'zhilian' ? '潜在人才' : '收藏'
      };
      
      message.success(`开始${modeMessages[browseMode] || '候选人'}浏览...`);
      
      // 根据平台调用不同的API
      const apiEndpoint = platform === 'zhilian' ? '/api/zhilian/start-browsing' : '/api/boss-zhipin/start-browsing';
      
      const result = await apiPost(apiEndpoint, {
        mode: browseMode,
        filters: filters,
        targetCount: targetResumeCount
      });
      console.log('后端响应:', result);
      
      if (result.success) {
        message.success('候选人浏览已启动');
        
        // 根据选择的模式导航到对应页面
        await navigateToModeSpecificPage(browseMode);
        
        // 开始轮询状态
        startStatusPolling();
      } else {
        message.error(result.message);
        setIsBrowsing(false);
      }
    } catch (error) {
      console.error('启动浏览失败:', error);
      message.error('启动浏览失败: ' + error.message);
      setIsBrowsing(false);
    }
  };

  // 暂停浏览（不完全停止，保持进度）
  const pauseBrowsing = async () => {
    try {
      setIsPaused(true);
      // 停止轮询但不改变isBrowsing状态
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      message.info('已暂停智能寻聘，网站保持打开状态');
      
      // 调用后端暂停API（不完全停止服务）
      const apiEndpoint = platform === 'zhilian' ? '/api/zhilian/pause-browsing' : '/api/boss-zhipin/pause-browsing';
      
      await apiPost(apiEndpoint, {}).catch(error => {
        console.warn('暂停API调用失败，但前端状态已更新:', error);
      });
    } catch (error) {
      console.error('暂停浏览失败:', error);
    }
  };
  
  // 完全停止浏览（重置状态）
  const stopBrowsing = async () => {
    try {
      setIsBrowsing(false);
      setIsPaused(false);
      setCurrentStep(1);
      
      // 停止轮询
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      
      message.info('已完全停止候选人浏览');
      
      // 根据平台调用不同的API
      const apiEndpoint = platform === 'zhilian' ? '/api/zhilian/stop-browsing' : '/api/boss-zhipin/stop-browsing';
      
      await apiPost(apiEndpoint, {});
    } catch (error) {
      console.error('停止浏览失败:', error);
    }
  };

  // 开始状态轮询
  const startStatusPolling = () => {
    // 清除之前的轮询
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    
    const interval = setInterval(async () => {
      try {
        // 如果已暂停，不进行轮询
        if (isPaused) {
          return;
        }
        
        // 根据平台调用不同的API
        const apiEndpoint = platform === 'zhilian' ? '/api/zhilian/browsing-status' : '/api/boss-zhipin/browsing-status';
        const result = await apiGet(apiEndpoint);
        
        if (result.success) {
          const { 
            candidates, 
            processedCount, 
            likedCount, 
            dislikedCount, 
            currentIndex, 
            status,
            isActive 
          } = result.data;
          
          setCandidates(candidates || []);
          setProcessedCount(processedCount || 0);
          setLikedCount(likedCount || 0);
          setDislikedCount(dislikedCount || 0);
          setCurrentCandidateIndex(currentIndex || 0);
          
          // 检查是否达到目标数量
          if (processedCount >= targetResumeCount && isActive) {
            // 达到目标数量，显示成功提示
            message.success(`🎉 已成功收集 ${targetResumeCount} 份简历，自动停止采集！`);
            setCurrentStep(3);
            setIsBrowsing(false);
            setIsPaused(false);
            clearInterval(interval);
            setPollingInterval(null);
            
            // 调用停止API
            const stopApiEndpoint = platform === 'zhilian' ? '/api/zhilian/stop-browsing' : '/api/boss-zhipin/stop-browsing';
            apiPost(stopApiEndpoint, {}).catch(console.error);
            return;
          }
          
          // 如果浏览不再活跃或已完成，更新状态
          if (!isActive || status === 'idle') {
            setCurrentStep(3);
            setIsBrowsing(false);
            setIsPaused(false);
            clearInterval(interval);
            setPollingInterval(null);
            
            if (processedCount >= targetResumeCount) {
              message.success(`🎉 已成功收集 ${processedCount} 份简历，任务完成！`);
            } else {
              message.info(`候选人浏览已完成，共收集 ${processedCount} 份简历`);
            }
          }
        }
      } catch (error) {
        console.error('获取浏览状态失败:', error);
      }
    }, 2000);
    
    // 保存轮询间隔ID
    setPollingInterval(interval);
    
    // 10分钟后停止轮询
    setTimeout(() => {
      clearInterval(interval);
      setPollingInterval(null);
    }, 600000);
  };
  
  // 重置状态（刷新状态按钮功能）
  const resetBrowsingStatus = async () => {
    try {
      setIsLoading(true);
      
      // 停止当前轮询
      if (pollingInterval) {
        clearInterval(pollingInterval);
        setPollingInterval(null);
      }
      
      // 重置前端状态
      setIsBrowsing(false);
      setIsPaused(false);
      setCurrentStep(0);
      setCandidates([]);
      setProcessedCount(0);
      setLikedCount(0);
      setDislikedCount(0);
      setCurrentCandidateIndex(0);
      
      // 调用后端重置API
      const apiEndpoint = platform === 'zhilian' ? '/api/zhilian/reset-browsing' : '/api/boss-zhipin/reset-browsing';
      
      await apiPost(apiEndpoint, {});
      message.success('状态已重置，可以重新开始寻聘');
    } catch (error) {
      console.error('重置状态失败:', error);
      message.error('重置状态失败: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理候选人操作
  const handleCandidateAction = async (candidateId, action) => {
    try {
      // 根据平台调用不同的API
      const apiEndpoint = platform === 'zhilian' ? '/api/zhilian/candidate-action' : '/api/boss-zhipin/candidate-action';
      
      const result = await apiPost(apiEndpoint, {
        candidateId,
        action // like, dislike, skip
      });
      
      if (result.success) {
        if (action === 'like') {
          setLikedCount(prev => prev + 1);
          message.success('已收藏候选人');
        } else if (action === 'dislike') {
          setDislikedCount(prev => prev + 1);
          message.info('已跳过候选人');
        }
        
        // 更新候选人列表
        setCandidates(prev => prev.filter(c => c.id !== candidateId));
      } else {
        message.error(result.message);
      }
    } catch (error) {
      console.error('处理候选人操作失败:', error);
      message.error('操作失败: ' + error.message);
    }
  };

  // 应用筛选条件
  const applyFilters = () => {
    if (applyFiltersHook()) {
      setCurrentStep(1);
    }
  };

  // 重置筛选条件
  const resetFilters = () => {
    resetFiltersHook();
  };
  
  /**
   * 处理搜索模式选择
   * 统一的模式选择逻辑，不再硬编码特定接口调用
   */
  const handleSearchModeSelection = () => {
    setBrowseMode('search');
    // 智联招聘搜索模式直接显示筛选条件配置区域，不使用弹窗
  };
  


  useEffect(() => {
    // 组件加载时获取初始状态
    const apiEndpoint = platform === 'zhilian' ? '/api/zhilian/browsing-status' : '/api/boss-zhipin/browsing-status';
    
    apiGet(apiEndpoint)
      .then(result => {
        if (result.success) {
          const { candidates, processedCount, likedCount, dislikedCount, currentIndex } = result.data;
          setCandidates(candidates || []);
          setProcessedCount(processedCount || 0);
          setLikedCount(likedCount || 0);
          setDislikedCount(dislikedCount || 0);
          setCurrentCandidateIndex(currentIndex || 0);
        }
      })
      .catch(error => {
        console.error('获取初始状态失败:', error);
      });
  }, [platform]);

  return (
    <Container>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2}>
          <UserOutlined style={{ marginRight: 12, color: '#1890ff' }} />
          候选人浏览与筛选
        </Title>
        <Text type="secondary" style={{ fontSize: '16px' }}>
          自动化浏览候选人信息，智能筛选优质简历
        </Text>
      </div>

      <StepsContainer>
        <Steps current={currentStep} items={getSteps()} />
      </StepsContainer>

      {/* 浏览模式选择 */}
      <Card title="选择浏览模式" style={{ marginBottom: 24 }}>
          {platform === 'zhilian' ? (
            // 智联招聘四个模块
            <Row gutter={16}>
            <Col span={6}>
              <ModeSelectionCard 
                size="small" 
                className={browseMode === 'recommended' ? 'selected' : ''}
                onClick={() => setBrowseMode('recommended')}
              >
                <div className="mode-content">
                  <StarOutlined className="mode-icon" style={{ fontSize: 24, color: '#faad14' }} />
                  <div className="mode-title">推荐人才</div>
                  <Text type="secondary">系统推荐的优质候选人</Text>
                </div>
              </ModeSelectionCard>
            </Col>
            <Col span={6}>
              <ModeSelectionCard 
                size="small" 
                className={browseMode === 'search' ? 'selected' : ''}
                onClick={handleSearchModeSelection}
              >
                <div className="mode-content">
                  <SearchOutlined className="mode-icon" style={{ fontSize: 24, color: '#1890ff' }} />
                  <div className="mode-title">搜索人才</div>
                  <Text type="secondary">根据条件搜索候选人</Text>
                </div>
              </ModeSelectionCard>
            </Col>
            <Col span={6}>
              <ModeSelectionCard 
                size="small" 
                className={browseMode === 'favorites' ? 'selected' : ''}
                onClick={() => setBrowseMode('favorites')}
              >
                <div className="mode-content">
                  <BulbOutlined className="mode-icon" style={{ fontSize: 24, color: '#722ed1' }} />
                  <div className="mode-title">潜在人才</div>
                  <Text type="secondary">收藏的优质候选人</Text>
                </div>
              </ModeSelectionCard>
            </Col>
            <Col span={6}>
              <ModeSelectionCard 
                size="small" 
                className={browseMode === 'communication' ? 'selected' : ''}
                onClick={() => setBrowseMode('communication')}
              >
                <div className="mode-content">
                  <MessageOutlined className="mode-icon" style={{ fontSize: 24, color: '#52c41a' }} />
                  <div className="mode-title">互动</div>
                  <Text type="secondary">处理主动投递的候选人</Text>
                </div>
              </ModeSelectionCard>
            </Col>
          </Row>
        ) : (
          // Boss直聘三个模块
          <Row gutter={16}>
            <Col span={8}>
              <ModeSelectionCard 
                size="small" 
                className={browseMode === 'recommended' ? 'selected' : ''}
                onClick={() => setBrowseMode('recommended')}
              >
                <div className="mode-content">
                  <StarOutlined className="mode-icon" style={{ fontSize: 24, color: '#faad14' }} />
                  <div className="mode-title">推荐牛人</div>
                  <Text type="secondary">系统推荐的优质候选人</Text>
                </div>
              </ModeSelectionCard>
            </Col>
            <Col span={8}>
              <ModeSelectionCard 
                size="small" 
                className={browseMode === 'search' ? 'selected' : ''}
                onClick={() => setBrowseMode('search')}
              >
                <div className="mode-content">
                  <SearchOutlined className="mode-icon" style={{ fontSize: 24, color: '#1890ff' }} />
                  <div className="mode-title">搜索牛人</div>
                  <Text type="secondary">根据条件搜索候选人</Text>
                </div>
              </ModeSelectionCard>
            </Col>
            <Col span={8}>
              <ModeSelectionCard 
                size="small" 
                className={browseMode === 'communication' ? 'selected' : ''}
                onClick={() => setBrowseMode('communication')}
              >
                <div className="mode-content">
                  <MessageOutlined className="mode-icon" style={{ fontSize: 24, color: '#52c41a' }} />
                  <div className="mode-title">互动</div>
                  <Text type="secondary">处理主动投递的候选人</Text>
                </div>
              </ModeSelectionCard>
            </Col>
          </Row>
        )}
        </Card>

      {/* 简历采集数量设置 - 所有平台都显示 */}
      <Card title="简历采集数量设置" style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 500, marginBottom: 8, display: 'block' }}>目标简历采集数量（测试环节）</label>
              <Select
                value={targetResumeCount}
                onChange={setTargetResumeCount}
                style={{ width: '100%' }}
                size="large"
              >
                <Option value={2}>2份简历</Option>
                <Option value={3}>3份简历</Option>
                <Option value={4}>4份简历</Option>
                <Option value={5}>5份简历</Option>
              </Select>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ textAlign: 'center', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff', marginBottom: '8px' }}>
                {targetResumeCount}
              </div>
              <div style={{ color: '#666' }}>份简历</div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                采集到此数量后自动停止
              </div>
            </div>
          </Col>
        </Row>
        {/* 进度条显示 */}
        {isBrowsing && (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <Text strong>采集进度</Text>
              <Text>{processedCount}/{targetResumeCount}</Text>
            </div>
            <Progress 
              percent={Math.round((processedCount / targetResumeCount) * 100)}
              status={processedCount >= targetResumeCount ? 'success' : 'active'}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
              showInfo={false}
            />
          </div>
        )}
        
        <Alert
          message="简历采集说明"
          description={`系统将自动浏览候选人信息并采集简历，当成功采集的简历数量达到 ${targetResumeCount} 份时，将自动停止采集流程。这是测试环节，您可以随时手动停止采集。`}
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
        </Card>

      {/* 筛选条件配置 - 仅在搜索模式下显示 */}
      {browseMode === 'search' && (
        <FilterPanel
          platform={platform}
          filters={filters}
          onFilterChange={updateFilter}
          onApply={applyFilters}
          onReset={resetFilters}
          loading={isBrowsing}
          title="筛选条件配置"
        />
      )}

      {/* 状态面板 */}
      <StatusPanel title="浏览状态">
        <Row gutter={24}>
          <Col span={6}>
            <div className="status-row">
              <Text>已处理候选人:</Text>
              <Text className="status-value" type="primary">{processedCount}</Text>
            </div>
          </Col>
          <Col span={6}>
            <div className="status-row">
              <Text>目标简历数量:</Text>
              <Text className="status-value" type="success">{targetResumeCount}</Text>
            </div>
          </Col>
          <Col span={6}>
            <div className="status-row">
              <Text>收集进度:</Text>
              <Text className="status-value" style={{ 
                color: processedCount >= targetResumeCount ? '#52c41a' : '#1890ff' 
              }}>
                {processedCount}/{targetResumeCount}
              </Text>
            </div>
          </Col>
          <Col span={6}>
            <div className="status-row">
              <Text>完成状态:</Text>
              <Text className="status-value" style={{
                color: processedCount >= targetResumeCount ? '#52c41a' : '#faad14'
              }}>
                {processedCount >= targetResumeCount ? '已完成' : '进行中'}
              </Text>
            </div>
          </Col>
          <Col span={6}>
            <div className="status-row">
              <Text>已收藏:</Text>
              <Text className="status-value" type="success">{likedCount}</Text>
            </div>
          </Col>
          <Col span={6}>
            <div className="status-row">
              <Text>已跳过:</Text>
              <Text className="status-value" type="warning">{dislikedCount}</Text>
            </div>
          </Col>
          <Col span={6}>
            <div className="status-row">
              <Text>当前进度:</Text>
              <Text className="status-value">{currentCandidateIndex + 1}</Text>
            </div>
          </Col>
        </Row>
      </StatusPanel>

      {/* 控制按钮 */}
      <Card style={{ marginBottom: 24, textAlign: 'center' }}>
        <Space size="large">
          {platform === 'zhilian' ? (
            // 智联招聘控制按钮
            !isLoggedIn ? (
              !isInitialized ? (
                <Button 
                  type="primary" 
                  size="large"
                  icon={<PlayCircleOutlined />}
                  onClick={startZhilianService}
                  loading={isLoading}
                >
                  启动智能寻聘
                </Button>
              ) : (
                <Button 
                  danger
                  size="large"
                  icon={<PauseCircleOutlined />}
                  onClick={stopZhilianService}
                >
                  停止服务
                </Button>
              )
            ) : (
              // 登录后显示浏览控制按钮
              !isBrowsing ? (
                <Button 
                  type="primary" 
                  size="large"
                  icon={<PlayCircleOutlined />}
                  onClick={startBrowsing}
                  disabled={browseMode === 'search' ? currentStep < 1 : !browseMode}
                >
                  {isPaused ? '继续寻聘' : '开始浏览'}
                </Button>
              ) : (
                <Button 
                  danger
                  size="large"
                  icon={<PauseCircleOutlined />}
                  onClick={pauseBrowsing}
                >
                  暂停浏览
                </Button>
              )
            )
          ) : (
            // Boss直聘控制按钮（原有逻辑）
            !isBrowsing ? (
              <Button 
                type="primary" 
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={startBrowsing}
                disabled={browseMode === 'search' ? currentStep < 1 : !browseMode}
              >
                {isPaused ? '继续寻聘' : '开始浏览'}
              </Button>
            ) : (
              <Button 
                danger
                size="large"
                icon={<PauseCircleOutlined />}
                onClick={pauseBrowsing}
              >
                暂停浏览
              </Button>
            )
          )}
          
          <Button 
            size="large"
            icon={<ReloadOutlined />}
            onClick={resetBrowsingStatus}
            loading={isLoading}
          >
            重置状态
          </Button>
        </Space>
      </Card>

      {/* 候选人列表 */}
      <Card title="候选人列表" extra={`共 ${candidates.length} 人`}>
        {candidates.length > 0 ? (
          candidates.map((candidate, index) => (
            <CandidateCard key={candidate.id}>
              <div className="candidate-header">
                <div className="candidate-info">
                  <div className="candidate-avatar">
                    <UserOutlined />
                  </div>
                  <div className="candidate-details">
                    <div className="candidate-name">{candidate.name}</div>
                    <div className="candidate-position">{candidate.position}</div>
                    <div className="candidate-company">{candidate.company}</div>
                  </div>
                </div>
                
                <div className="candidate-actions">
                  <Button 
                    type="primary" 
                    size="small"
                    icon={<HeartOutlined />}
                    onClick={() => handleCandidateAction(candidate.id, 'like')}
                  >
                    收藏
                  </Button>
                  <Button 
                    size="small"
                    icon={<DislikeOutlined />}
                    onClick={() => handleCandidateAction(candidate.id, 'dislike')}
                  >
                    跳过
                  </Button>
                </div>
              </div>
              
              <div className="candidate-tags">
                <Tag color="blue">{candidate.experience}</Tag>
                <Tag color="green">{candidate.location}</Tag>
                <Tag color="orange">{candidate.salary}</Tag>
                <Tag color="purple">{candidate.education}</Tag>
              </div>
            </CandidateCard>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">暂无候选人信息</Text>
          </div>
        )}
      </Card>

      <Alert
        message="操作说明"
        description="1. 选择浏览模式（推荐牛人、搜索牛人、沟通版块）；2. 配置筛选条件，设置职位、地区、经验等要求；3. 点击'开始浏览'启动自动化浏览流程；4. 系统会自动浏览候选人信息，您可以对候选人进行收藏或跳过操作；5. 收藏的候选人会自动进入简历处理流程。"
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

export default CandidateBrowser;
