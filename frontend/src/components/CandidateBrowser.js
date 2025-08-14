import React, { useState, useEffect } from 'react';
import { Card, Button, Typography, Alert, Steps, message, Tag, Space, Divider, Row, Col, Input, Select, Slider, Switch } from 'antd';
import { 
  SearchOutlined, 
  UserOutlined,
  HeartOutlined,
  DislikeOutlined,
  EyeOutlined,
  StarOutlined,
  ReloadOutlined,
  FilterOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined
} from '@ant-design/icons';
import styled from 'styled-components';

const { Title, Text } = Typography;
const { Step } = Steps;
const { Option } = Select;

const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const FilterPanel = styled(Card)`
  margin-bottom: 24px;
  
  .filter-row {
    margin-bottom: 16px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .filter-label {
    font-weight: 500;
    margin-bottom: 8px;
    display: block;
  }
`;

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
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .status-value {
    font-weight: 600;
  }
`;

const CandidateBrowser = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isBrowsing, setIsBrowsing] = useState(false);
  const [browseMode, setBrowseMode] = useState('recommended'); // recommended, search, communication
  const [candidates, setCandidates] = useState([]);
  const [processedCount, setProcessedCount] = useState(0);
  const [likedCount, setLikedCount] = useState(0);
  const [dislikedCount, setDislikedCount] = useState(0);
  const [currentCandidateIndex, setCurrentCandidateIndex] = useState(0);
  
  // 筛选条件状态
  const [filters, setFilters] = useState({
    position: '',
    location: '',
    experience: '',
    salary: '',
    education: '',
    age: [18, 50],
    isActive: true
  });
  
  // 候选人数量设置
  const [targetCandidateCount, setTargetCandidateCount] = useState(50);

  // 获取步骤信息
  const getSteps = () => {
    if (browseMode === 'search') {
      // 搜索模式需要筛选条件配置
      return [
        {
          title: '选择浏览模式',
          description: '推荐牛人、搜索牛人、沟通版块',
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
      // 推荐和沟通模式不需要筛选条件配置
      return [
        {
          title: '选择浏览模式',
          description: '推荐牛人、搜索牛人、沟通版块',
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

  // 启动候选人浏览
  const startBrowsing = async () => {
    try {
      setIsBrowsing(true);
      // 根据模式设置不同的步骤
      if (browseMode === 'search') {
        setCurrentStep(2);
      } else {
        setCurrentStep(1);
      }
      message.success('开始候选人浏览...');
      
      // 调用后端API启动浏览
      const response = await fetch('/api/boss-zhipin/start-browsing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          mode: browseMode,
          filters: filters,
          targetCount: targetCandidateCount
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        message.success('候选人浏览已启动');
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

  // 停止浏览
  const stopBrowsing = async () => {
    try {
      setIsBrowsing(false);
      setCurrentStep(1);
      message.info('已停止候选人浏览');
      
      // 调用后端API停止浏览
      await fetch('/api/boss-zhipin/stop-browsing', {
        method: 'POST'
      });
    } catch (error) {
      console.error('停止浏览失败:', error);
    }
  };

  // 开始状态轮询
  const startStatusPolling = () => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/boss-zhipin/browsing-status');
        const result = await response.json();
        
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
          
          // 如果浏览不再活跃或已完成，更新状态
          if (!isActive || status === 'idle') {
            setCurrentStep(3);
            setIsBrowsing(false);
            clearInterval(interval);
            message.success('候选人浏览已完成');
          }
        }
      } catch (error) {
        console.error('获取浏览状态失败:', error);
      }
    }, 2000);
    
    // 10分钟后停止轮询
    setTimeout(() => {
      clearInterval(interval);
    }, 600000);
  };

  // 处理候选人操作
  const handleCandidateAction = async (candidateId, action) => {
    try {
      const response = await fetch('/api/boss-zhipin/candidate-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          candidateId,
          action // like, dislike, skip
        })
      });
      
      const result = await response.json();
      
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

  // 更新筛选条件
  const updateFilter = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // 应用筛选条件
  const applyFilters = () => {
    setCurrentStep(1);
    message.success('筛选条件已应用');
  };

  // 重置筛选条件
  const resetFilters = () => {
    setFilters({
      position: '',
      location: '',
      experience: '',
      salary: '',
      education: '',
      age: [18, 50],
      isActive: true
    });
  };

  useEffect(() => {
    // 组件加载时获取初始状态
    fetch('/api/boss-zhipin/browsing-status')
      .then(response => response.json())
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
  }, []);

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
        <Row gutter={16}>
          <Col span={8}>
            <Card 
              size="small" 
              className={browseMode === 'recommended' ? 'selected' : ''}
              onClick={() => setBrowseMode('recommended')}
              style={{ 
                cursor: 'pointer',
                borderColor: browseMode === 'recommended' ? '#1890ff' : undefined
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <StarOutlined style={{ fontSize: 24, color: '#faad14', marginBottom: 8 }} />
                <div>推荐牛人</div>
                <Text type="secondary">系统推荐的优质候选人</Text>
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card 
              size="small" 
              className={browseMode === 'search' ? 'selected' : ''}
              onClick={() => setBrowseMode('search')}
              style={{ 
                cursor: 'pointer',
                borderColor: browseMode === 'search' ? '#1890ff' : undefined
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <SearchOutlined style={{ fontSize: 24, color: '#1890ff', marginBottom: 8 }} />
                <div>搜索牛人</div>
                <Text type="secondary">根据条件搜索候选人</Text>
              </div>
            </Card>
          </Col>
          <Col span={8}>
            <Card 
              size="small" 
              className={browseMode === 'communication' ? 'selected' : ''}
              onClick={() => setBrowseMode('communication')}
              style={{ 
                cursor: 'pointer',
                borderColor: browseMode === 'communication' ? '#1890ff' : undefined
              }}
            >
              <div style={{ textAlign: 'center' }}>
                <EyeOutlined style={{ fontSize: 24, color: '#52c41a', marginBottom: 8 }} />
                <div>沟通版块</div>
                <Text type="secondary">处理主动投递的候选人</Text>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 候选人数量设置 */}
      <Card title="候选人数量设置" style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 500, marginBottom: 8, display: 'block' }}>目标候选人数量</label>
              <Slider
                min={10}
                max={200}
                step={10}
                value={targetCandidateCount}
                onChange={setTargetCandidateCount}
                marks={{
                  10: '10',
                  50: '50',
                  100: '100',
                  150: '150',
                  200: '200'
                }}
                tooltip={{
                  formatter: (value) => `${value}个候选人`
                }}
              />
            </div>
          </Col>
          <Col span={12}>
            <div style={{ textAlign: 'center', padding: '20px', background: '#f5f5f5', borderRadius: '8px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff', marginBottom: '8px' }}>
                {targetCandidateCount}
              </div>
              <div style={{ color: '#666' }}>个候选人</div>
              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                达到此数量后自动停止寻聘
              </div>
            </div>
          </Col>
        </Row>
        <Alert
          message="寻聘说明"
          description={`系统将自动浏览候选人信息，当成功处理的候选人数量达到 ${targetCandidateCount} 个时，将自动停止寻聘流程。您可以随时手动停止寻聘。`}
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      </Card>

      {/* 筛选条件配置 - 仅在搜索模式下显示 */}
      {browseMode === 'search' && (
        <FilterPanel title="筛选条件配置">
        <Row gutter={16}>
          <Col span={8}>
            <div className="filter-row">
              <label className="filter-label">期望职位</label>
              <Input 
                placeholder="如：前端工程师"
                value={filters.position}
                onChange={(e) => updateFilter('position', e.target.value)}
              />
            </div>
          </Col>
          <Col span={8}>
            <div className="filter-row">
              <label className="filter-label">工作地区</label>
              <Input 
                placeholder="如：北京、上海"
                value={filters.location}
                onChange={(e) => updateFilter('location', e.target.value)}
              />
            </div>
          </Col>
          <Col span={8}>
            <div className="filter-row">
              <label className="filter-label">工作经验</label>
              <Select 
                placeholder="选择工作经验"
                value={filters.experience}
                onChange={(value) => updateFilter('experience', value)}
                style={{ width: '100%' }}
              >
                <Option value="0-1">0-1年</Option>
                <Option value="1-3">1-3年</Option>
                <Option value="3-5">3-5年</Option>
                <Option value="5-10">5-10年</Option>
                <Option value="10+">10年以上</Option>
              </Select>
            </div>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={8}>
            <div className="filter-row">
              <label className="filter-label">期望薪资</label>
              <Select 
                placeholder="选择薪资范围"
                value={filters.salary}
                onChange={(value) => updateFilter('salary', value)}
                style={{ width: '100%' }}
              >
                <Option value="0-5">5K以下</Option>
                <Option value="5-10">5-10K</Option>
                <Option value="10-20">10-20K</Option>
                <Option value="20-30">20-30K</Option>
                <Option value="30+">30K以上</Option>
              </Select>
            </div>
          </Col>
          <Col span={8}>
            <div className="filter-row">
              <label className="filter-label">学历要求</label>
              <Select 
                placeholder="选择学历要求"
                value={filters.education}
                onChange={(value) => updateFilter('education', value)}
                style={{ width: '100%' }}
              >
                <Option value="大专">大专</Option>
                <Option value="本科">本科</Option>
                <Option value="硕士">硕士</Option>
                <Option value="博士">博士</Option>
              </Select>
            </div>
          </Col>
          <Col span={8}>
            <div className="filter-row">
              <label className="filter-label">年龄范围</label>
              <Slider
                range
                min={18}
                max={50}
                value={filters.age}
                onChange={(value) => updateFilter('age', value)}
                marks={{
                  18: '18',
                  25: '25',
                  35: '35',
                  50: '50'
                }}
              />
            </div>
          </Col>
        </Row>
        
        <Row>
          <Col span={24}>
            <div className="filter-row">
              <Space>
                <Switch 
                  checked={filters.isActive}
                  onChange={(checked) => updateFilter('isActive', checked)}
                />
                <Text>仅显示活跃候选人</Text>
              </Space>
            </div>
          </Col>
        </Row>
        
        <Divider />
        
        <Space>
          <Button type="primary" onClick={applyFilters}>
            应用筛选条件
          </Button>
          <Button onClick={resetFilters}>
            重置条件
          </Button>
        </Space>
        </FilterPanel>
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
          {!isBrowsing ? (
            <Button 
              type="primary" 
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={startBrowsing}
              disabled={browseMode === 'search' ? currentStep < 1 : !browseMode}
            >
              开始浏览
            </Button>
          ) : (
            <Button 
              danger
              size="large"
              icon={<PauseCircleOutlined />}
              onClick={stopBrowsing}
            >
              停止浏览
            </Button>
          )}
          
          <Button 
            size="large"
            icon={<ReloadOutlined />}
            onClick={() => window.location.reload()}
          >
            刷新状态
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
