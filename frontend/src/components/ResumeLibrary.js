import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Upload, Button, Form, Input, Select, message, Card, Row, Col, Tag, Avatar } from 'antd';
import { UploadOutlined, UserOutlined, SettingOutlined, DownloadOutlined } from '@ant-design/icons';
import ModalBasePattern, { BaseCard, BaseActionButton } from './ModalBasePattern';
import PositionManagement from './PositionManagement';
import { useData } from '../hooks/useData';

const { Option } = Select;

const ResumeLibraryContainer = styled.div`
  padding: 20px;
  background-color: #f5f5f5;
  height: 100%;
  overflow-y: auto;
`;



const ResumeDetailContent = styled.div`
  .resume-section {
    margin-bottom: 24px;
    
    .section-title {
      font-size: 18px;
      font-weight: bold;
      color: #333;
      border-bottom: 2px solid #1890ff;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    
    .section-content {
      line-height: 1.6;
    }
  }
  
  .basic-info {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
    
    .info-item {
      display: flex;
      align-items: center;
      
      .label {
        font-weight: bold;
        margin-right: 8px;
        min-width: 80px;
        color: #333;
      }
      
      .value {
        color: #666;
        flex: 1;
      }
    }
  }
  
  .experience-item, .education-item {
    border-left: 3px solid #1890ff;
    padding-left: 16px;
    margin-bottom: 16px;
    
    .item-title {
      font-weight: bold;
      color: #333;
      margin-bottom: 4px;
    }
    
    .item-subtitle {
      color: #666;
      font-size: 14px;
      margin-bottom: 8px;
    }
    
    .item-description {
      color: #666;
      line-height: 1.5;
    }
  }
  
  .skills-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
`;




const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
`;

const Title = styled.h2`
  margin: 0;
  color: #333;
`;

const UploadButton = styled(Button)`
  margin-right: 10px;
`;

const FilterContainer = styled.div`
  margin-bottom: 20px;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  
  .filter-label {
    font-weight: 500;
    color: #333;
    margin-bottom: 8px;
    font-size: 14px;
  }
  
  .ant-select {
    width: 100%;
  }
`;


const ScoreTag = styled(Tag)`
  font-size: 14px;
  padding: 4px 8px;
`;

const ResumeCardContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 20px;
`;

const ResumeCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 1px solid #f0f0f0;
  overflow: hidden;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    border-color: #d9d9d9;
  }
  
  .ant-card-body {
    padding: 16px;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
`;

const CardAvatar = styled(Avatar)`
  margin-right: 12px;
`;

const CardTitle = styled.div`
  font-size: 16px;
  font-weight: bold;
  color: #333;
`;

const CardPosition = styled.div`
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
`;

const SkillsContainer = styled.div`
  margin-bottom: 12px;
`;

const SkillTag = styled(Tag)`
  margin-bottom: 4px;
`;

const ExperienceInfo = styled.div`
  font-size: 14px;
  color: #666;
  margin-bottom: 12px;
`;

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
`;

const ResumeLibrary = () => {
  const { downloadResume } = useData();
  const [resumes, setResumes] = useState([]);
  const [positions, setPositions] = useState([]);
  const [filteredResumes, setFilteredResumes] = useState([]);
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [selectedScoreLevel, setSelectedScoreLevel] = useState(null); // 评分等级筛选
  const [sortBy, setSortBy] = useState('score'); // 排序字段：score, name, experience
  const [sortOrder, setSortOrder] = useState('desc'); // 排序方向：asc, desc
  const [isUploadModalVisible, setIsUploadModalVisible] = useState(false);
  const [isPositionManagementVisible, setIsPositionManagementVisible] = useState(false);
  const [isResumeDetailVisible, setIsResumeDetailVisible] = useState(false);
  const [selectedResume, setSelectedResume] = useState(null);
  const [uploadForm] = Form.useForm();


  // 获取简历库数据
  const fetchResumes = async () => {
    try {
      const response = await fetch('/api/resume-library');
      
      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const errorText = await response.text();
        throw new Error(`Expected JSON response but received: ${errorText}`);
      }
      
      const result = await response.json();
      // 检查API响应格式，后端返回 { success: true, data: resumes }
      const data = result.success ? result.data : result;
      setResumes(data);
      setFilteredResumes(data);
    } catch (error) {
      console.error('获取简历库数据失败:', error);
      message.error(`获取简历库数据失败: ${error.message}`);
    }
  };

  // 获取岗位数据
  const fetchPositions = async () => {
    try {
      const response = await fetch('/api/positions');
      
      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const errorText = await response.text();
        throw new Error(`Expected JSON response but received: ${errorText}`);
      }
      
      const result = await response.json();
      // 检查API响应格式，后端返回 { success: true, data: positions }
      const data = result.success ? result.data : result;
      // 确保data是数组，如果不是则设置为空数组
      setPositions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('获取岗位数据失败:', error);
      message.error(`获取岗位数据失败: ${error.message}`);
      // 出错时确保positions为空数组，避免map错误
      setPositions([]);
    }
  };

  // 页面加载时获取数据
  useEffect(() => {
    fetchResumes();
    fetchPositions();
  }, []);

  // 根据岗位筛选和排序简历
  useEffect(() => {
    let filtered = resumes;
    
    // 按岗位筛选
    if (selectedPosition) {
      filtered = filtered.filter(resume => 
        resume.positionId === selectedPosition || 
        (resume.scores && resume.scores.some(score => score.positionId === selectedPosition))
      );
    }
    
    // 按评分等级筛选
    if (selectedScoreLevel) {
      filtered = filtered.filter(resume => {
        const latestScore = resume.scores && resume.scores.length > 0 ? resume.scores[resume.scores.length - 1].score : 0;
        
        switch (selectedScoreLevel) {
          case 'excellent':
            return latestScore >= 90;
          case 'good':
            return latestScore >= 80 && latestScore < 90;
          case 'average':
            return latestScore >= 70 && latestScore < 80;
          case 'poor':
            return latestScore < 70;
          case 'unscored':
            return latestScore === 0;
          default:
            return true;
        }
      });
    }
    
    // 排序
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'score':
          // 获取最新评分，如果没有评分则设为0
          aValue = a.scores && a.scores.length > 0 ? a.scores[a.scores.length - 1].score : 0;
          bValue = b.scores && b.scores.length > 0 ? b.scores[b.scores.length - 1].score : 0;
          break;
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'experience':
          aValue = a.experience || 0;
          bValue = b.experience || 0;
          break;
        default:
          aValue = 0;
          bValue = 0;
      }
      
      // 根据排序方向进行排序
      if (sortOrder === 'asc') {
        if (typeof aValue === 'string') {
          return aValue.localeCompare(bValue);
        }
        return aValue - bValue;
      } else {
        if (typeof aValue === 'string') {
          return bValue.localeCompare(aValue);
        }
        return bValue - aValue;
      }
    });
    
    setFilteredResumes(filtered);
  }, [selectedPosition, selectedScoreLevel, resumes, sortBy, sortOrder]);



  // 处理添加简历
  const handleAddResume = async (values) => {
    try {
      // 处理文件上传
      const formData = new FormData();
      if (values.file && values.file.length > 0) {
        formData.append('file', values.file[0].originFileObj);
      }
      
      // 发送文件上传请求
      const response = await fetch('/api/resume-library/upload', {
        method: 'POST',
        body: formData
      });

      // 检查响应状态
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const errorText = await response.text();
        throw new Error(`Expected JSON response but received: ${errorText}`);
      }
      
      const result = await response.json();
      
      // 如果解析了简历信息，则自动构建简历数据并提交
      let autoSubmitData = {
        name: '未命名候选人',
        email: '',
        phone: '',
        education: [],
        experience: [],
        skills: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      if (result.parsedResume && Object.keys(result.parsedResume).length > 0) {
        const parsed = result.parsedResume;
        
        // 构建自动提交数据
        autoSubmitData = {
          name: parsed.name || '未命名候选人',
          email: parsed.email || '',
          phone: parsed.phone || '',
          education: parsed.education || [],
          experience: parsed.experience || [],
          skills: parsed.skills || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        message.success(`简历解析成功，识别到候选人: ${parsed.name || '未知'}`);
      }
      
      // 发送添加简历请求
      const addResponse = await fetch('/api/resume-library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(autoSubmitData)
      });
      
      if (!addResponse.ok) {
        const errorText = await addResponse.text();
        throw new Error(`HTTP error! status: ${addResponse.status}, message: ${errorText}`);
      }
      
      message.success('简历添加成功');
      setIsUploadModalVisible(false);
      uploadForm.resetFields();
      fetchResumes(); // 重新获取简历数据
    } catch (error) {
      console.error('简历添加失败:', error);
      message.error(`简历添加失败: ${error.message}`);
    }
  };

  // 处理查看简历详情
  const handleViewResume = (resume) => {
    setSelectedResume(resume);
    setIsResumeDetailVisible(true);
  };



  // 渲染技能标签
  const renderSkills = (skills) => {
    if (!skills || skills.length === 0) return <div>暂无技能信息</div>;
    
    return (
      <SkillsContainer>
        {skills.map((skill, index) => (
          <SkillTag key={index} color="blue">{skill}</SkillTag>
        ))}
      </SkillsContainer>
    );
  };

  // 渲染候选人卡片
  const renderResumeCard = (resume) => {
    // 获取岗位信息
    const position = positions.find(p => p.id === resume.positionId) || {};
    
    // 获取最新评分
    let latestScore = null;
    if (resume.scores && resume.scores.length > 0) {
      latestScore = resume.scores[resume.scores.length - 1];
    }
    
    // 计算评分指标
    const getScoreIndicator = () => {
      if (!latestScore) return { level: '未评分', color: '#999', bgColor: '#f5f5f5' };
      
      const score = latestScore.score;
      if (score >= 90) return { level: '优秀', color: '#52c41a', bgColor: '#f6ffed' };
      if (score >= 80) return { level: '良好', color: '#1890ff', bgColor: '#e6f7ff' };
      if (score >= 70) return { level: '一般', color: '#faad14', bgColor: '#fffbe6' };
      return { level: '待提升', color: '#ff4d4f', bgColor: '#fff2f0' };
    };
    
    const scoreIndicator = getScoreIndicator();
    
    // 获取关键技能（最多显示3个）
    const keySkills = resume.skills ? resume.skills.slice(0, 3) : [];
    
    // 获取教育背景
    const education = resume.educationDetails && resume.educationDetails.length > 0 
      ? resume.educationDetails[0] : null;
    
    // 获取最新工作经验
    const latestWork = resume.workExperience && resume.workExperience.length > 0 
      ? resume.workExperience[0] : null;
    
    return (
      <ResumeCard>
        {/* 头部：姓名、评分、岗位 */}
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <CardAvatar size="large" icon={<UserOutlined />} />
              <div style={{ marginLeft: 12 }}>
                <CardTitle>{resume.name || '未命名候选人'}</CardTitle>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                  {position.name || '未分配岗位'}
                </div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {latestScore ? (
                <div style={{ 
                  padding: '4px 8px', 
                  borderRadius: '12px', 
                  backgroundColor: scoreIndicator.bgColor,
                  color: scoreIndicator.color,
                  fontSize: 12,
                  fontWeight: 'bold',
                  border: `1px solid ${scoreIndicator.color}`
                }}>
                  {latestScore.score}分
                </div>
              ) : (
                <div style={{ 
                  padding: '4px 8px', 
                  borderRadius: '12px', 
                  backgroundColor: '#f5f5f5',
                  color: '#999',
                  fontSize: 12
                }}>
                  未评分
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        
        {/* 评分等级 */}
        {latestScore && (
          <div style={{ 
            marginBottom: 12,
            padding: '6px 12px',
            backgroundColor: scoreIndicator.bgColor,
            borderRadius: '6px',
            border: `1px solid ${scoreIndicator.color}20`
          }}>
            <span style={{ fontSize: 12, color: scoreIndicator.color, fontWeight: 'bold' }}>
              {scoreIndicator.level}
            </span>
          </div>
        )}
        
        {/* 关键信息网格 */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: 12, 
          marginBottom: 16 
        }}>
          {/* 教育背景 */}
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>学历</div>
            <div style={{ fontSize: 13, fontWeight: 'bold', color: '#333' }}>
              {education ? `${education.degree} · ${education.school}` : resume.education || '未知'}
            </div>
          </div>
          
          {/* 工作经验 */}
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>经验</div>
            <div style={{ fontSize: 13, fontWeight: 'bold', color: '#333' }}>
              {resume.experience || 0} 年
            </div>
          </div>
        </div>
        
        {/* 最新工作 */}
        {latestWork && (
          <div style={{ 
            marginBottom: 12,
            padding: '8px 12px',
            backgroundColor: '#fff7e6',
            borderRadius: '6px',
            border: '1px solid #ffd591'
          }}>
            <div style={{ fontSize: 11, color: '#d46b08', marginBottom: 2 }}>最新工作</div>
            <div style={{ fontSize: 13, fontWeight: 'bold', color: '#333', marginBottom: 2 }}>
              {latestWork.company}
            </div>
            <div style={{ fontSize: 12, color: '#666' }}>
              {latestWork.position} · {latestWork.startDate}
            </div>
          </div>
        )}
        
        {/* 关键技能 */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>关键技能</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {keySkills.map((skill, index) => (
              <Tag key={index} size="small" color="blue" style={{ fontSize: 11 }}>
                {skill}
              </Tag>
            ))}
            {resume.skills && resume.skills.length > 3 && (
              <Tag size="small" style={{ fontSize: 11, color: '#666' }}>
                +{resume.skills.length - 3}
              </Tag>
            )}
          </div>
        </div>
        
        {/* 评分详情（如果有的话） */}
        {latestScore && latestScore.details && (
          <div style={{ 
            marginBottom: 16,
            padding: '8px 12px',
            backgroundColor: '#f0f9ff',
            borderRadius: '6px',
            border: '1px solid #91d5ff'
          }}>
            <div style={{ fontSize: 11, color: '#1890ff', marginBottom: 4 }}>评分详情</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span>学历: {Math.round(latestScore.details.education?.score || 0)}分</span>
              <span>经验: {Math.round(latestScore.details.experience?.score || 0)}分</span>
              <span>技能: {Math.round(latestScore.details.skills?.score || 0)}分</span>
            </div>
          </div>
        )}
        
        {/* 底部操作 */}
        <CardFooter>
          <div style={{ fontSize: 12, color: '#666' }}>
            更新时间: {resume.updatedAt ? new Date(resume.updatedAt).toLocaleDateString() : '未知'}
          </div>
          <Button 
            type="primary" 
            size="small" 
            onClick={() => handleViewResume(resume)}
          >
            查看详情
          </Button>
        </CardFooter>
      </ResumeCard>
    );
  };

  // 获取评分标签颜色
  const getScoreColor = (score) => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'orange';
    return 'red';
  };

  // 渲染简历详情内容
  const renderResumeDetail = (resume) => {
    if (!resume) return null;
    
    return (
      <ResumeDetailContent>
        {/* 基本信息 */}
        <div className="resume-section">
          <div className="section-title">基本信息</div>
          <div className="section-content">
            <div className="basic-info">
              <div className="info-item">
                <span className="label">姓名：</span>
                <span className="value">{resume.name}</span>
              </div>
              <div className="info-item">
                <span className="label">邮箱：</span>
                <span className="value">{resume.email}</span>
              </div>
              <div className="info-item">
                <span className="label">电话：</span>
                <span className="value">{resume.phone}</span>
              </div>
              <div className="info-item">
                <span className="label">应聘岗位：</span>
                <span className="value">{resume.position}</span>
              </div>
              <div className="info-item">
                <span className="label">学历：</span>
                <span className="value">{resume.education}</span>
              </div>
              <div className="info-item">
                <span className="label">工作经验：</span>
                <span className="value">{resume.experience} 年</span>
              </div>
            </div>
          </div>
        </div>

        {/* 教育背景 */}
        {resume.educationDetails && Array.isArray(resume.educationDetails) && (
          <div className="resume-section">
            <div className="section-title">教育背景</div>
            <div className="section-content">
              {resume.educationDetails.map((edu, index) => (
                <div key={index} className="education-item">
                  <div className="item-title">{edu.school}</div>
                  <div className="item-subtitle">
                    {edu.major} | {edu.degree} | {edu.graduationYear}
                  </div>
                  {edu.gpa && (
                    <div className="item-description">GPA: {edu.gpa}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 工作经验 */}
        {resume.workExperience && Array.isArray(resume.workExperience) && (
          <div className="resume-section">
            <div className="section-title">工作经验</div>
            <div className="section-content">
              {resume.workExperience.map((work, index) => (
                <div key={index} className="experience-item">
                  <div className="item-title">{work.company}</div>
                  <div className="item-subtitle">
                    {work.position} | {work.startDate} - {work.endDate || '至今'}
                  </div>
                  <div className="item-description">
                    {work.description}
                  </div>
                  {work.achievements && Array.isArray(work.achievements) && (
                    <div className="item-description">
                      <strong>主要成就：</strong>
                      <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                        {work.achievements.map((achievement, idx) => (
                          <li key={idx}>{achievement}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 技能特长 */}
        <div className="resume-section">
          <div className="section-title">技能特长</div>
          <div className="section-content">
            <div className="skills-container">
              {resume.skills && Array.isArray(resume.skills) ? (
                resume.skills.map((skill, index) => (
                  <Tag key={index} color="blue">{skill}</Tag>
                ))
              ) : (
                <div>暂无技能信息</div>
              )}
            </div>
          </div>
        </div>

        {/* 项目经验 */}
        {resume.projects && Array.isArray(resume.projects) && (
          <div className="resume-section">
            <div className="section-title">项目经验</div>
            <div className="section-content">
              {resume.projects.map((project, index) => (
                <div key={index} className="experience-item">
                  <div className="item-title">{project.name}</div>
                  <div className="item-subtitle">
                    {project.role} | {project.period}
                  </div>
                  <div className="item-description">
                    {project.description}
                  </div>
                  {project.technologies && Array.isArray(project.technologies) && (
                    <div className="item-description">
                      <strong>技术栈：</strong>
                      {project.technologies.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 评分信息 */}
        {resume.scores && Array.isArray(resume.scores) && resume.scores.length > 0 && (
          <div className="resume-section">
            <div className="section-title">评分详情</div>
            <div className="section-content">
              {resume.scores.map((score, index) => (
                <div key={index} style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <ScoreTag color={getScoreColor(score.score)}>
                      总分: {score.score}分
                    </ScoreTag>
                    <span style={{ marginLeft: '8px', color: '#666' }}>
                      {score.createdAt ? new Date(score.createdAt).toLocaleDateString() : '未知时间'}
                    </span>
                  </div>
                  {score.details && (
                    <div style={{ paddingLeft: '16px' }}>
                      {Object.entries(score.details).map(([criteria, detail]) => (
                        <div key={criteria} style={{ marginBottom: '4px' }}>
                          <span style={{ fontWeight: 'bold' }}>{criteria}: </span>
                          <span>{detail.score}分 (权重: {detail.weight})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 下载按钮 */}
        <div className="resume-section" style={{ textAlign: 'center', marginTop: '20px' }}>
          <Button 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={() => {
              if (resume.resumeFile) {
                downloadResume(resume.resumeFile);
              } else {
                message.error('无法下载简历文件');
              }
            }}
          >
            下载简历
          </Button>
        </div>
      </ResumeDetailContent>
    );
  };


  return (
    <ResumeLibraryContainer>

      <Header>
        <Title>简历库</Title>
        <div>
          <UploadButton 
            type="primary" 
            icon={<UploadOutlined />} 
            onClick={() => setIsUploadModalVisible(true)}
          >
            上传简历
          </UploadButton>
          <Button 
            type="default" 
            icon={<SettingOutlined />}
            onClick={() => setIsPositionManagementVisible(true)}
          >
            岗位管理
          </Button>
        </div>
      </Header>

      <FilterContainer>
        <Row gutter={16}>
          <Col span={6}>
            <div className="filter-label">按岗位筛选</div>
            <Select 
              placeholder="选择岗位" 
              value={selectedPosition} 
              onChange={(value) => setSelectedPosition(value)}
              allowClear
            >
              {(positions || []).map(position => (
                <Option key={position.id} value={position.id}>
                  {position.name}
                </Option>
              ))}
            </Select>
          </Col>
          <Col span={6}>
            <div className="filter-label">评分等级</div>
            <Select 
              placeholder="选择评分等级" 
              value={selectedScoreLevel} 
              onChange={(value) => setSelectedScoreLevel(value)}
              allowClear
            >
              <Option value="excellent">优秀 (90分以上)</Option>
              <Option value="good">良好 (80-89分)</Option>
              <Option value="average">一般 (70-79分)</Option>
              <Option value="poor">待提升 (70分以下)</Option>
              <Option value="unscored">未评分</Option>
            </Select>
          </Col>
          <Col span={6}>
            <div className="filter-label">排序方式</div>
            <Select 
              value={sortBy} 
              onChange={(value) => setSortBy(value)}
            >
              <Option value="score">按评分排序</Option>
              <Option value="name">按姓名排序</Option>
              <Option value="experience">按经验排序</Option>
            </Select>
          </Col>
          <Col span={6}>
            <div className="filter-label">排序方向</div>
            <Select 
              value={sortOrder} 
              onChange={(value) => setSortOrder(value)}
            >
              <Option value="desc">降序</Option>
              <Option value="asc">升序</Option>
            </Select>
          </Col>
        </Row>
        <div style={{ marginTop: 12, color: '#666', fontSize: 12 }}>
          当前排序: {sortBy === 'score' ? '评分' : sortBy === 'name' ? '姓名' : '经验'} 
          ({sortOrder === 'desc' ? '降序' : '升序'})
          {selectedPosition && ` | 已筛选岗位: ${(positions || []).find(p => p.id === selectedPosition)?.name}`}
          {selectedScoreLevel && ` | 评分等级: ${
            selectedScoreLevel === 'excellent' ? '优秀' :
            selectedScoreLevel === 'good' ? '良好' :
            selectedScoreLevel === 'average' ? '一般' :
            selectedScoreLevel === 'poor' ? '待提升' : '未评分'
          }`}
          {` | 共 ${filteredResumes.length} 份简历`}
        </div>
      </FilterContainer>

      <ResumeCardContainer>
          {filteredResumes.map(resume => (
            <div key={resume.id}>
              {renderResumeCard(resume)}
            </div>
          ))}
        </ResumeCardContainer>

      {/* 上传简历弹窗 */}
      <ModalBasePattern
        visible={isUploadModalVisible}
        onClose={() => {
          setIsUploadModalVisible(false);
          uploadForm.resetFields();
        }}
        title="上传简历"
        dataAttribute="upload-resume-modal"
      >
        <Form
          form={uploadForm}
          layout="vertical"
          onFinish={handleAddResume}
        >
          {/* 简历名称和关联岗位将根据解析结果自动填充 */}
        <Form.Item
          name="name"
          label="简历名称"
        >
          <Input placeholder="简历名称将自动识别" readOnly />
        </Form.Item>
        
        <Form.Item
          name="positionId"
          label="关联岗位"
        >
          <Select placeholder="岗位将自动匹配" disabled>
            {(positions || []).map(position => (
              <Option key={position.id} value={position.id}>
                {position.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
          
          <Form.Item
            name="file"
            label="上传文件"
            valuePropName="fileList"
            getValueFromEvent={(e) => e && e.fileList}
          >
            <Upload 
              beforeUpload={() => false} 
              maxCount={1}
              accept=".pdf,.doc,.docx"
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </Form.Item>
          
          <Form.Item>
            <Button type="primary" htmlType="submit">
              添加简历
            </Button>
          </Form.Item>
        </Form>
      </ModalBasePattern>

      {/* 简历详情弹窗 */}
      <ModalBasePattern
        visible={isResumeDetailVisible}
        onClose={() => {
          setIsResumeDetailVisible(false);
          setSelectedResume(null);
        }}
        title={`${selectedResume?.name || '候选人'} - 简历详情`}
        dataAttribute="resume-detail-modal"
      >
        {renderResumeDetail(selectedResume)}
      </ModalBasePattern>

      {/* 岗位管理弹窗 */}
      <PositionManagement
        visible={isPositionManagementVisible}
        onClose={() => {
          setIsPositionManagementVisible(false);
          fetchPositions(); // 关闭时重新获取岗位数据，以更新筛选器
        }}
      />
    </ResumeLibraryContainer>
  );
};

export default ResumeLibrary;