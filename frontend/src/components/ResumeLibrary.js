import React, { useState, useEffect } from 'react';
import { Card, List, Typography, Button, Space, Select, message, Spin, Row, Col, Tag, Avatar, Divider, Input } from 'antd';
import { DownloadOutlined, SearchOutlined, UploadOutlined, UserOutlined, MailOutlined, PhoneOutlined, StarOutlined, EyeOutlined } from '@ant-design/icons';
import ResumeUploadModal from './ResumeUploadModal';
import ResumeDetailModal from './ResumeDetailModal';

const { Text } = Typography;
const { Option } = Select;

/**
 * 简历库组件
 * 用于展示和管理简历资源
 */
const ResumeLibrary = () => {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedSource, setSelectedSource] = useState('');
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedResume, setSelectedResume] = useState(null);
  
  // 获取简历列表
  const fetchResumes = async (source = '') => {
    setLoading(true);
    try {
      const params = source ? `?source=${source}` : '';
      const response = await fetch(`/api/resume-library${params}`);
      const result = await response.json();
      
      // 后端直接返回数组，不需要检查success字段
      if (Array.isArray(result)) {
        setResumes(result);
      } else if (result.success && Array.isArray(result.data)) {
        // 兼容旧格式
        setResumes(result.data);
      } else {
        message.error('获取简历列表失败：数据格式错误');
        setResumes([]);
      }
    } catch (error) {
      console.error('获取简历列表失败:', error);
      message.error('获取简历列表失败');
      setResumes([]);
    } finally {
      setLoading(false);
    }
  };
  
  // 组件加载时获取简历列表
  useEffect(() => {
    fetchResumes();
  }, []);
  
  // 处理来源筛选
  const handleSourceChange = (value) => {
    setSelectedSource(value);
    fetchResumes(value);
  };

  // 处理搜索
  const handleSearch = (value) => {
    setSearchText(value);
  };

  // 处理排序
  const handleSortChange = (value) => {
    setSortBy(value);
  };

  // 处理查看详情
  const handleViewDetail = (resume) => {
    setSelectedResume(resume);
    setDetailModalVisible(true);
  };

  // 关闭详情弹窗
  const handleCloseDetail = () => {
    setDetailModalVisible(false);
    setSelectedResume(null);
  };

  // 过滤和排序简历
  const getFilteredAndSortedResumes = () => {
    let filteredResumes = [...resumes];
    
    // 按来源筛选
    if (selectedSource) {
      filteredResumes = filteredResumes.filter(resume => resume.source === selectedSource);
    }
    
    // 按搜索文本筛选
    if (searchText) {
      filteredResumes = filteredResumes.filter(resume => 
        resume.name.toLowerCase().includes(searchText.toLowerCase()) ||
        resume.position.toLowerCase().includes(searchText.toLowerCase()) ||
        (resume.skills && resume.skills.some(skill => 
          skill.toLowerCase().includes(searchText.toLowerCase())
        ))
      );
    }
    
    // 排序
    filteredResumes.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'experience':
          return b.experience - a.experience;
        case 'education':
          const educationOrder = { '博士': 5, '硕士': 4, '本科': 3, '大专': 2, '高中': 1 };
          return (educationOrder[b.education] || 0) - (educationOrder[a.education] || 0);
        case 'createdAt':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
    
    return filteredResumes;
  };
  
  // 处理上传成功
  const handleUploadSuccess = () => {
    fetchResumes(selectedSource);
    setUploadModalVisible(false);
    message.success('简历上传成功');
  };
  
  // 下载简历
  const handleDownload = async (resume) => {
    if (resume.filePath) {
      try {
        const response = await fetch(`/api/resumes/${resume.filePath.split('/').pop()}`);
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = resume.filePath.split('/').pop();
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          message.error('下载简历失败');
        }
      } catch (error) {
        console.error('下载简历失败:', error);
        message.error('下载简历失败');
      }
    } else {
      message.info('该简历没有可下载的文件');
    }
  };
  
  return (
    <Card 
      title={
        <Space>
          <SearchOutlined />
          <span>简历库</span>
        </Space>
      } 
      extra={
        <Space>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Text type="secondary">来源筛选:</Text>
            <Select
              placeholder="选择来源"
              style={{ width: 140 }}
              allowClear
              onChange={handleSourceChange}
              value={selectedSource}
            >
              <Option value="boss">Boss直聘</Option>
              <Option value="qcwy">前程无忧</Option>
              <Option value="zlzp">智联招聘</Option>
              <Option value="lagou">拉勾网</Option>
              <Option value="liepin">猎聘网</Option>
              <Option value="linkedin">LinkedIn</Option>
              <Option value="manual">手动添加</Option>
            </Select>
          </div>
          <Button 
            type="primary" 
            icon={<UploadOutlined />}
            onClick={() => setUploadModalVisible(true)}
          >
            上传简历
          </Button>
        </Space>
      }
      style={{ height: '100%', overflow: 'auto' }}
    >
      <Spin spinning={loading}>
        <div style={{ marginBottom: 16 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col span={8}>
              <Text type="secondary">共找到 {getFilteredAndSortedResumes().length} 份简历</Text>
            </Col>
            <Col span={8}>
              <Input.Search
                placeholder="搜索姓名、职位或技能"
                allowClear
                onSearch={handleSearch}
                style={{ width: '100%' }}
              />
            </Col>
            <Col span={8}>
              <Select
                placeholder="排序方式"
                style={{ width: '100%' }}
                value={sortBy}
                onChange={handleSortChange}
              >
                <Option value="createdAt">按创建时间</Option>
                <Option value="name">按姓名</Option>
                <Option value="experience">按经验</Option>
                <Option value="education">按学历</Option>
              </Select>
            </Col>
          </Row>
        </div>
        
        <Row gutter={[16, 16]}>
          {getFilteredAndSortedResumes().map(item => {
            // 生成亮点内容
            const generateHighlights = (resume) => {
              const highlights = [];
              
              // 基于学历的亮点
              if (resume.education === '博士') {
                highlights.push('高学历人才', '学术背景深厚');
              } else if (resume.education === '硕士') {
                highlights.push('硕士学历', '专业素养高');
              }
              
              // 基于经验的亮点
              if (resume.experience >= 10) {
                highlights.push('资深专家', '经验丰富');
              } else if (resume.experience >= 5) {
                highlights.push('中高级人才', '技术扎实');
              } else if (resume.experience >= 2) {
                highlights.push('成长型人才', '潜力巨大');
              }
              
              // 基于技能的亮点
              if (resume.skills && resume.skills.length > 0) {
                const skillCount = resume.skills.length;
                if (skillCount >= 8) {
                  highlights.push('技能全面', '技术栈丰富');
                } else if (skillCount >= 5) {
                  highlights.push('技能多样', '综合能力强');
                }
                
                // 特定技能亮点
                if (resume.skills.includes('React') || resume.skills.includes('Vue') || resume.skills.includes('Angular')) {
                  highlights.push('前端开发');
                }
                if (resume.skills.includes('Node.js') || resume.skills.includes('Spring Boot')) {
                  highlights.push('后端开发');
                }
                if (resume.skills.includes('Docker') || resume.skills.includes('Kubernetes')) {
                  highlights.push('云原生');
                }
              }
              
              return highlights.slice(0, 4); // 最多显示4个亮点
            };

            const highlights = generateHighlights(item);

            return (
              <Col xs={24} sm={12} md={8} lg={6} key={item.id}>
                <Card
                  hoverable
                  size="small"
                  style={{ height: 'auto', minHeight: '280px' }}
                  bodyStyle={{ padding: '16px' }}
                  actions={[
                    <Button 
                      icon={<EyeOutlined />} 
                      size="small"
                      type="link"
                      onClick={() => handleViewDetail(item)}
                    >
                      查看详情
                    </Button>
                  ]}
                >
                  {/* 头像和姓名 */}
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <Avatar 
                      size={56} 
                      icon={<UserOutlined />}
                      style={{ backgroundColor: '#1890ff', marginBottom: '8px' }}
                    />
                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>
                      {item.name}
                    </div>
                  </div>

                  {/* 应聘职位 */}
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <Tag color="blue" style={{ fontSize: '14px', padding: '6px 12px', borderRadius: '16px' }}>
                      {item.position}
                    </Tag>
                  </div>

                  {/* 基本信息 */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <Tag color="green" style={{ fontSize: '12px' }}>
                        {item.education}
                      </Tag>
                      <Tag color="orange" style={{ fontSize: '12px' }}>
                        {item.experience}年经验
                      </Tag>
                    </div>
                    
                    <div style={{ marginBottom: '8px' }}>
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        来源: {
                          item.source === 'boss' ? 'Boss直聘' :
                          item.source === 'qcwy' ? '前程无忧' :
                          item.source === 'zlzp' ? '智联招聘' :
                          item.source === 'lagou' ? '拉勾网' :
                          item.source === 'liepin' ? '猎聘网' :
                          item.source === 'linkedin' ? 'LinkedIn' :
                          item.source === 'manual' ? '手动添加' :
                          item.source ? item.source : '未知来源'
                        }
                      </Text>
                    </div>
                  </div>

                  {/* 技能标签 */}
                  {item.skills && item.skills.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <Text type="secondary" style={{ fontSize: '11px', marginBottom: '6px', display: 'block' }}>
                        技能标签:
                      </Text>
                      <div>
                        {item.skills.slice(0, 4).map((skill, index) => (
                          <Tag key={index} size="small" style={{ marginBottom: '4px', fontSize: '10px' }}>
                            {skill}
                          </Tag>
                        ))}
                        {item.skills.length > 4 && (
                          <Tag size="small" style={{ marginBottom: '4px', fontSize: '10px' }}>
                            +{item.skills.length - 4}
                          </Tag>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 亮点内容 */}
                  {highlights.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <Text type="secondary" style={{ fontSize: '11px', marginBottom: '6px', display: 'block' }}>
                        亮点分析:
                      </Text>
                      <div>
                        {highlights.map((highlight, index) => (
                          <Tag 
                            key={index} 
                            size="small" 
                            style={{ 
                              marginBottom: '4px', 
                              fontSize: '10px',
                              backgroundColor: '#f6ffed',
                              borderColor: '#b7eb8f',
                              color: '#52c41a'
                            }}
                          >
                            {highlight}
                          </Tag>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 联系方式 */}
                  <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                      <MailOutlined style={{ fontSize: '12px', color: '#1890ff', marginRight: '6px' }} />
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        {item.email}
                      </Text>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <PhoneOutlined style={{ fontSize: '12px', color: '#1890ff', marginRight: '6px' }} />
                      <Text type="secondary" style={{ fontSize: '11px' }}>
                        {item.phone}
                      </Text>
                    </div>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
        
        {resumes.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text type="secondary">暂无简历数据</Text>
          </div>
        )}
      </Spin>
      
      <ResumeUploadModal
        visible={uploadModalVisible}
        onClose={() => setUploadModalVisible(false)}
        onSuccess={handleUploadSuccess}
      />
      
      {/* 简历详情弹窗 */}
      <ResumeDetailModal
        visible={detailModalVisible}
        onClose={handleCloseDetail}
        resume={selectedResume}
      />
    </Card>
  );
};

export default ResumeLibrary;