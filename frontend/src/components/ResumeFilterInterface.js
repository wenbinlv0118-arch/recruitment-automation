import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Space, 
  Typography, 
  Row, 
  Col, 
  Tag, 
  Progress, 
  Statistic, 
  Modal, 
  message,
  Tooltip,
  Popconfirm,
  Divider,
  Select,
  Input,
  Slider,
  Checkbox,
  Radio
} from 'antd';
import { 
  LikeOutlined, 
  DislikeOutlined, 
  EyeOutlined, 
  DownloadOutlined, 
  FilterOutlined,
  StarOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import styled from 'styled-components';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;

// 样式组件
const FilterContainer = styled.div`
  padding: 24px;
  background: white;
  border-radius: 8px;
`;

const ResumeCard = styled(Card)`
  margin-bottom: 16px;
  transition: all 0.3s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
  
  &.liked {
    border-color: #52c41a;
    background: #f6ffed;
  }
  
  &.disliked {
    border-color: #ff4d4f;
    background: #fff2f0;
  }
`;

const ActionButton = styled(Button)`
  margin: 4px;
  min-width: 80px;
`;

const ResumeFilterInterface = ({ 
  resumes = [], 
  onResumeAction,
  onFilterChange,
  onBatchAction
}) => {
  const [filteredResumes, setFilteredResumes] = useState([]);
  const [filterConfig, setFilterConfig] = useState({
    qualityRange: [0, 100],
    experienceLevel: 'all',
    positionType: 'all',
    educationLevel: 'all',
    tags: [],
    searchKeyword: '',
    status: 'all'
  });
  const [selectedResumes, setSelectedResumes] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  const [sortBy, setSortBy] = useState('quality'); // quality, experience, collectedAt
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc

  // 初始化筛选后的简历
  useEffect(() => {
    applyFilters();
  }, [resumes, filterConfig, sortBy, sortOrder]);

  // 应用筛选条件
  const applyFilters = () => {
    let filtered = [...resumes];

    // 质量评分筛选
    filtered = filtered.filter(resume => 
      resume.qualityScore >= filterConfig.qualityRange[0] && 
      resume.qualityScore <= filterConfig.qualityRange[1]
    );

    // 工作经验筛选
    if (filterConfig.experienceLevel !== 'all') {
      filtered = filtered.filter(resume => {
        const exp = resume.candidateExperience || '';
        switch (filterConfig.experienceLevel) {
          case 'junior':
            return exp.includes('1年') || exp.includes('2年');
          case 'middle':
            return exp.includes('3年') || exp.includes('4年');
          case 'senior':
            return exp.includes('5年') || exp.includes('6年') || exp.includes('7年') || exp.includes('8年') || exp.includes('9年') || exp.includes('10年');
          default:
            return true;
        }
      });
    }

    // 职位类型筛选
    if (filterConfig.positionType !== 'all') {
      filtered = filtered.filter(resume => {
        const title = (resume.candidateTitle || '').toLowerCase();
        switch (filterConfig.positionType) {
          case 'frontend':
            return title.includes('前端') || title.includes('frontend');
          case 'backend':
            return title.includes('后端') || title.includes('backend');
          case 'fullstack':
            return title.includes('全栈') || title.includes('fullstack');
          case 'product':
            return title.includes('产品') || title.includes('product');
          case 'design':
            return title.includes('设计') || title.includes('design');
          default:
            return true;
        }
      });
    }

    // 教育背景筛选
    if (filterConfig.educationLevel !== 'all') {
      filtered = filtered.filter(resume => {
        const education = resume.keyInfo?.education || '';
        switch (filterConfig.educationLevel) {
          case 'high':
            return education.includes('高中');
          case 'college':
            return education.includes('大专');
          case 'bachelor':
            return education.includes('本科');
          case 'master':
            return education.includes('硕士');
          case 'phd':
            return education.includes('博士');
          default:
            return true;
        }
      });
    }

    // 标签筛选
    if (filterConfig.tags.length > 0) {
      filtered = filtered.filter(resume => 
        filterConfig.tags.some(tag => 
          resume.tags && resume.tags.includes(tag)
        )
      );
    }

    // 关键词搜索
    if (filterConfig.searchKeyword) {
      const keyword = filterConfig.searchKeyword.toLowerCase();
      filtered = filtered.filter(resume => 
        resume.candidateName.toLowerCase().includes(keyword) ||
        resume.candidateTitle.toLowerCase().includes(keyword) ||
        resume.candidateCompany.toLowerCase().includes(keyword) ||
        resume.resumeText.toLowerCase().includes(keyword)
      );
    }

    // 状态筛选
    if (filterConfig.status !== 'all') {
      filtered = filtered.filter(resume => resume.status === filterConfig.status);
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'quality':
          aValue = a.qualityScore;
          bValue = b.qualityScore;
          break;
        case 'experience':
          aValue = parseInt(a.candidateExperience) || 0;
          bValue = parseInt(b.candidateExperience) || 0;
          break;
        case 'collectedAt':
          aValue = new Date(a.collectedAt);
          bValue = new Date(b.collectedAt);
          break;
        default:
          aValue = a.qualityScore;
          bValue = b.qualityScore;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredResumes(filtered);
  };

  // 处理简历点赞
  const handleLike = (resumeId) => {
    if (onResumeAction) {
      onResumeAction('like', resumeId);
    }
    message.success('简历已标记为喜欢');
  };

  // 处理简历点踩
  const handleDislike = (resumeId) => {
    if (onResumeAction) {
      onResumeAction('dislike', resumeId);
    }
    message.success('简历已标记为不喜欢');
  };

  // 处理简历选择
  const handleResumeSelect = (resumeId, checked) => {
    if (checked) {
      setSelectedResumes(prev => [...prev, resumeId]);
    } else {
      setSelectedResumes(prev => prev.filter(id => id !== resumeId));
    }
  };

  // 处理全选
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedResumes(filteredResumes.map(r => r.id));
    } else {
      setSelectedResumes([]);
    }
  };

  // 批量操作
  const handleBatchAction = (action) => {
    if (selectedResumes.length === 0) {
      message.warning('请先选择简历');
      return;
    }

    if (onBatchAction) {
      onBatchAction(action, selectedResumes);
    }

    switch (action) {
      case 'like':
        message.success(`已批量标记 ${selectedResumes.length} 份简历为喜欢`);
        break;
      case 'dislike':
        message.success(`已批量标记 ${selectedResumes.length} 份简历为不喜欢`);
        break;
      case 'download':
        message.success(`开始批量下载 ${selectedResumes.length} 份简历`);
        break;
      case 'delete':
        message.success(`已批量删除 ${selectedResumes.length} 份简历`);
        setSelectedResumes([]);
        break;
    }
  };

  // 获取筛选统计信息
  const getFilterStats = () => {
    const total = resumes.length;
    const filtered = filteredResumes.length;
    const selected = selectedResumes.length;
    const liked = resumes.filter(r => r.status === 'liked').length;
    const disliked = resumes.filter(r => r.status === 'disliked').length;
    
    return { total, filtered, selected, liked, disliked };
  };

  const stats = getFilterStats();

  return (
    <FilterContainer>
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <Title level={2} style={{ marginBottom: 16 }}>
          <FilterOutlined style={{ marginRight: 12, color: '#1890ff' }} />
          智能简历筛选界面
        </Title>
        <Text type="secondary" style={{ fontSize: 16 }}>
          智能筛选、批量操作、简历管理
        </Text>
      </div>

      {/* 筛选条件配置 */}
      <Card title="筛选条件" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}>
            <Text strong>质量评分范围</Text>
            <Slider
              range
              min={0}
              max={100}
              value={filterConfig.qualityRange}
              onChange={(value) => setFilterConfig(prev => ({ ...prev, qualityRange: value }))}
              marks={{
                0: '0分',
                50: '50分',
                100: '100分'
              }}
            />
          </Col>
          <Col span={6}>
            <Text strong>工作经验</Text>
            <Select
              value={filterConfig.experienceLevel}
              onChange={(value) => setFilterConfig(prev => ({ ...prev, experienceLevel: value }))}
              style={{ width: '100%' }}
            >
              <Option value="all">全部</Option>
              <Option value="junior">初级(1-2年)</Option>
              <Option value="middle">中级(3-4年)</Option>
              <Option value="senior">资深(5年+)</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Text strong>职位类型</Text>
            <Select
              value={filterConfig.positionType}
              onChange={(value) => setFilterConfig(prev => ({ ...prev, positionType: value }))}
              style={{ width: '100%' }}
            >
              <Option value="all">全部</Option>
              <Option value="frontend">前端开发</Option>
              <Option value="backend">后端开发</Option>
              <Option value="fullstack">全栈开发</Option>
              <Option value="product">产品经理</Option>
              <Option value="design">设计师</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Text strong>教育背景</Text>
            <Select
              value={filterConfig.educationLevel}
              onChange={(value) => setFilterConfig(prev => ({ ...prev, educationLevel: value }))}
              style={{ width: '100%' }}
            >
              <Option value="all">全部</Option>
              <Option value="high">高中</Option>
              <Option value="college">大专</Option>
              <Option value="bachelor">本科</Option>
              <Option value="master">硕士</Option>
              <Option value="phd">博士</Option>
            </Select>
          </Col>
        </Row>
        
        <Divider />
        
        <Row gutter={16}>
          <Col span={8}>
            <Text strong>关键词搜索</Text>
            <Search
              placeholder="搜索姓名、职位、公司等"
              value={filterConfig.searchKeyword}
              onChange={(e) => setFilterConfig(prev => ({ ...prev, searchKeyword: e.target.value }))}
              allowClear
            />
          </Col>
          <Col span={8}>
            <Text strong>状态筛选</Text>
            <Select
              value={filterConfig.status}
              onChange={(value) => setFilterConfig(prev => ({ ...prev, status: value }))}
              style={{ width: '100%' }}
            >
              <Option value="all">全部</Option>
              <Option value="collected">已采集</Option>
              <Option value="liked">已点赞</Option>
              <Option value="disliked">已点踩</Option>
              <Option value="stored">已入库</Option>
            </Select>
          </Col>
          <Col span={8}>
            <Text strong>排序方式</Text>
            <Select
              value={`${sortBy}-${sortOrder}`}
              onChange={(value) => {
                const [newSortBy, newSortOrder] = value.split('-');
                setSortBy(newSortBy);
                setSortOrder(newSortOrder);
              }}
              style={{ width: '100%' }}
            >
              <Option value="quality-desc">质量评分(高→低)</Option>
              <Option value="quality-asc">质量评分(低→高)</Option>
              <Option value="experience-desc">工作经验(多→少)</Option>
              <Option value="experience-asc">工作经验(少→多)</Option>
              <Option value="collectedAt-desc">采集时间(新→旧)</Option>
              <Option value="collectedAt-asc">采集时间(旧→新)</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* 统计信息和操作 */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col span={16}>
            <Space size="large">
              <Statistic title="总简历数" value={stats.total} />
              <Statistic title="筛选结果" value={stats.filtered} />
              <Statistic title="已选择" value={stats.selected} />
              <Statistic title="已点赞" value={stats.liked} />
              <Statistic title="已点踩" value={stats.disliked} />
            </Space>
          </Col>
          <Col span={8} style={{ textAlign: 'right' }}>
            <Space>
              <Button
                icon={<EyeOutlined />}
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? '列表视图' : '网格视图'}
              </Button>
              <Button
                icon={<SettingOutlined />}
                onClick={() => {
                  Modal.info({
                    title: '筛选说明',
                    content: (
                      <div>
                        <p><strong>质量评分：</strong>根据简历完整性、信息丰富度等综合评分</p>
                        <p><strong>工作经验：</strong>按工作年限分类筛选</p>
                        <p><strong>职位类型：</strong>按技术方向分类筛选</p>
                        <p><strong>标签筛选：</strong>支持多标签组合筛选</p>
                      </div>
                    ),
                    width: 500
                  });
                }}
              >
                筛选说明
              </Button>
            </Space>
          </Col>
        </Row>
        
        {stats.selected > 0 && (
          <>
            <Divider />
            <Row gutter={16} align="middle">
              <Col span={16}>
                <Text strong>批量操作：</Text>
                <Space>
                  <ActionButton
                    type="primary"
                    icon={<LikeOutlined />}
                    onClick={() => handleBatchAction('like')}
                  >
                    批量点赞
                  </ActionButton>
                  <ActionButton
                    danger
                    icon={<DislikeOutlined />}
                    onClick={() => handleBatchAction('dislike')}
                  >
                    批量点踩
                  </ActionButton>
                  <ActionButton
                    icon={<DownloadOutlined />}
                    onClick={() => handleBatchAction('download')}
                  >
                    批量下载
                  </ActionButton>
                  <Popconfirm
                    title="确定要删除选中的简历吗？"
                    onConfirm={() => handleBatchAction('delete')}
                    okText="确定"
                    cancelText="取消"
                  >
                    <ActionButton danger>批量删除</ActionButton>
                  </Popconfirm>
                </Space>
              </Col>
              <Col span={8} style={{ textAlign: 'right' }}>
                <Checkbox
                  checked={stats.selected === stats.filtered && stats.filtered > 0}
                  indeterminate={stats.selected > 0 && stats.selected < stats.filtered}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                >
                  全选
                </Checkbox>
              </Col>
            </Row>
          </>
        )}
      </Card>

      {/* 简历列表 */}
      <Card title={`简历列表 (${stats.filtered})`}>
        {filteredResumes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Text type="secondary">没有找到符合条件的简历</Text>
          </div>
        ) : (
          <div style={{ display: viewMode === 'grid' ? 'grid' : 'block', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))' }}>
            {filteredResumes.map(resume => (
              <ResumeCard
                key={resume.id}
                className={resume.status === 'liked' ? 'liked' : resume.status === 'disliked' ? 'disliked' : ''}
                size="small"
                title={
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Checkbox
                        checked={selectedResumes.includes(resume.id)}
                        onChange={(e) => handleResumeSelect(resume.id, e.target.checked)}
                      />
                      <Text strong style={{ marginLeft: 8 }}>{resume.candidateName}</Text>
                    </div>
                    <Tag color={resume.isValid ? 'green' : 'orange'}>
                      {resume.isValid ? '有效' : '需改进'}
                    </Tag>
                  </div>
                }
                extra={
                  <Space>
                    <Tooltip title="点赞">
                      <Button
                        type="text"
                        icon={<LikeOutlined />}
                        size="small"
                        onClick={() => handleLike(resume.id)}
                        style={{ color: resume.status === 'liked' ? '#52c41a' : undefined }}
                      />
                    </Tooltip>
                    <Tooltip title="点踩">
                      <Button
                        type="text"
                        icon={<DislikeOutlined />}
                        size="small"
                        onClick={() => handleDislike(resume.id)}
                        style={{ color: resume.status === 'disliked' ? '#ff4d4f' : undefined }}
                      />
                    </Tooltip>
                    <Tooltip title="预览">
                      <Button
                        type="text"
                        icon={<EyeOutlined />}
                        size="small"
                        onClick={() => {
                          Modal.info({
                            title: `简历预览 - ${resume.candidateName}`,
                            content: (
                              <div>
                                <p><strong>职位：</strong>{resume.candidateTitle}</p>
                                <p><strong>公司：</strong>{resume.candidateCompany}</p>
                                <p><strong>工作经验：</strong>{resume.candidateExperience}</p>
                                <p><strong>质量评分：</strong>{resume.qualityScore}分</p>
                                <Divider />
                                <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                                    {resume.resumeText.substring(0, 500)}...
                                  </pre>
                                </div>
                              </div>
                            ),
                            width: 600
                          });
                        }}
                      />
                    </Tooltip>
                  </Space>
                }
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <p><strong>职位：</strong>{resume.candidateTitle}</p>
                    <p><strong>公司：</strong>{resume.candidateCompany}</p>
                    <p><strong>工作经验：</strong>{resume.candidateExperience}</p>
                  </Col>
                  <Col span={12}>
                    <p><strong>质量评分：</strong></p>
                    <Progress
                      percent={resume.qualityScore}
                      size="small"
                      strokeColor={resume.qualityScore >= 80 ? '#52c41a' : resume.qualityScore >= 60 ? '#faad14' : '#ff4d4f'}
                    />
                    <p><strong>采集时间：</strong></p>
                    <Text type="secondary">
                      {new Date(resume.collectedAt).toLocaleDateString()}
                    </Text>
                  </Col>
                </Row>
                
                {resume.tags && resume.tags.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <Text strong>标签：</Text>
                    <Space size="small" style={{ marginLeft: 8 }}>
                      {resume.tags.map((tag, index) => (
                        <Tag key={index} color="blue">{tag}</Tag>
                      ))}
                    </Space>
                  </div>
                )}
              </ResumeCard>
            ))}
          </div>
        )}
      </Card>
    </FilterContainer>
  );
};

export default ResumeFilterInterface;
