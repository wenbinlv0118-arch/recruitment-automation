import React from 'react';
import styled from 'styled-components';
import { Typography, Tag, Divider, Space, Button, Timeline, Descriptions } from 'antd';
import ReactMarkdown from 'react-markdown';
import { 
  CloseOutlined, 
  MailOutlined, 
  PhoneOutlined, 
  UserOutlined, 
  StarOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  CalendarOutlined,
  TrophyOutlined,
  BookOutlined
} from '@ant-design/icons';

const { Text, Title, Paragraph } = Typography;

// 弹窗基础样式
const BaseDrawer = styled.div`
  position: fixed;
  top: 64px;
  right: 0;
  bottom: 0;
  width: 400px;
  background: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 1001;
  display: flex;
  flex-direction: column;
  transform: translateX(${props => props.$visible ? '0' : '100%'});
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform;
  backface-visibility: hidden;
  perspective: 1000px;
  
  @media (max-width: 1200px) {
    width: 350px;
  }
  
  @media (max-width: 768px) {
    width: 300px;
  }
`;

const BaseDrawerHeader = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafafa;
`;

const BaseDrawerTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

const BaseCloseButton = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  color: #666;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform, background-color, color;
  
  &:hover {
    background: #f0f0f0;
    color: #333;
    transform: scale(1.1);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

const BaseDrawerBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  height: calc(100vh - 80px);
`;

const BaseCard = styled.div`
  margin-bottom: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  border: 1px solid #f0f0f0;
  overflow: hidden;
  will-change: transform, opacity;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
  }
`;

const InfoSection = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #666;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const HighlightTag = styled(Tag)`
  margin: 4px;
  border-radius: 16px;
  padding: 4px 12px;
  font-size: 12px;
  border: 1px solid #e6f7ff;
  background: #f6ffed;
  color: #52c41a;
`;

const SkillTag = styled(Tag)`
  margin: 4px;
  border-radius: 6px;
  padding: 2px 8px;
  font-size: 12px;
`;

const ContactInfo = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  
  .anticon {
    margin-right: 8px;
    color: #1890ff;
  }
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  
  .anticon {
    margin-right: 8px;
    color: #1890ff;
    min-width: 16px;
  }
`;

const TimelineItem = styled.div`
  margin-bottom: 16px;
  
  .company-name {
    font-weight: 600;
    color: #333;
    margin-bottom: 4px;
  }
  
  .position-title {
    color: #1890ff;
    margin-bottom: 4px;
  }
  
  .time-period {
    color: #666;
    font-size: 12px;
    margin-bottom: 8px;
  }
  
  .work-content {
    color: #666;
    font-size: 13px;
    line-height: 1.6;
  }
`;

const ProjectItem = styled.div`
  margin-bottom: 16px;

  .project-name {
    font-weight: 600;
    color: #333;
    margin-bottom: 4px;
  }

  .project-role {
    color: #1890ff;
    margin-bottom: 4px;
  }

  .project-time {
    color: #666;
    font-size: 12px;
    margin-bottom: 8px;
  }

  .project-description {
    color: #666;
    font-size: 13px;
    line-height: 1.6;
  }
`;

// Markdown内容样式
const MarkdownContent = styled.div`
  line-height: 1.6;
  color: #333;
  
  h1, h2, h3, h4, h5, h6 {
    color: #1890ff;
    margin: 16px 0 8px 0;
    font-weight: 600;
  }
  
  h1 { font-size: 20px; }
  h2 { font-size: 18px; }
  h3 { font-size: 16px; }
  h4 { font-size: 14px; }
  
  p {
    margin: 8px 0;
    color: #666;
  }
  
  ul, ol {
    margin: 8px 0;
    padding-left: 20px;
  }
  
  li {
    margin: 4px 0;
    color: #666;
  }
  
  strong {
    color: #333;
    font-weight: 600;
  }
  
  code {
    background: #f5f5f5;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
  }
  
  blockquote {
    border-left: 4px solid #1890ff;
    padding-left: 12px;
    margin: 8px 0;
    color: #666;
    font-style: italic;
  }
`;

/**
 * 清理 Markdown 内容，移除代码块标记
 * @param {string} content - 原始内容
 * @returns {string} 清理后的内容
 */
const cleanMarkdownContent = (content) => {
  if (!content) return '';
  
  // 移除开头的 ```markdown 和结尾的 ```
  return content
    .replace(/^```markdown\s*\n/, '')
    .replace(/\n```\s*$/, '')
    .trim();
};

const ResumeDetailModal = ({ visible, onClose, resume }) => {
  if (!resume) return null;

  /**
   * 解析候选人姓名
   */
  const parseCandidateName = (resume) => {
    if (resume.parsedContent) {
      const content = resume.parsedContent;
      // 匹配标题中的姓名
      const titleMatch = content.match(/# (.+?) - /);
      if (titleMatch) {
        return titleMatch[1].trim();
      }
      // 匹配基本信息中的姓名
      const nameMatch = content.match(/\*\*姓名\*\*：(.+?)\n/);
      if (nameMatch) {
        return nameMatch[1].trim();
      }
    }
    return resume.name || '未知姓名';
  };

  /**
   * 解析学历信息
   */
  const parseEducationLevel = (resume) => {
    if (resume.parsedContent) {
      const content = resume.parsedContent;
      // 匹配教育经历中的学历
      const eduMatch = content.match(/## 🎓 教育经历([\s\S]*?)(?=##|$)/);
      if (eduMatch) {
        const eduSection = eduMatch[1];
        const degreeMatch = eduSection.match(/(博士|硕士|本科|大专|高中|中专)/);
        if (degreeMatch) {
          return degreeMatch[1];
        }
      }
    }
    return resume.education || '未知学历';
  };

  /**
   * 解析工作年限
   */
  const parseWorkYears = (resume) => {
    if (resume.parsedContent) {
      const content = resume.parsedContent;
      // 从自我评价中提取工作年限
      const selfEvalMatch = content.match(/## 📌 自我评价([\s\S]*?)(?=##|$)/);
      if (selfEvalMatch) {
        const selfEval = selfEvalMatch[1];
        const yearMatch = selfEval.match(/(\d+)年.*?经验/);
        if (yearMatch) {
          return yearMatch[1];
        }
      }
    }
    return resume.workYears || '0';
  };

  /**
   * 解析求职岗位
   */
  const parseExpectedPosition = (resume) => {
    if (resume.parsedContent) {
      const content = resume.parsedContent;
      // 匹配标题中的职位信息
      const titleMatch = content.match(/# .*? - (.+?)\n/);
      if (titleMatch) {
        return titleMatch[1].trim();
      }
      // 匹配求职意向中的职位
      const intentMatch = content.match(/## 🔍 求职意向([\s\S]*?)(?=##|$)/);
      if (intentMatch) {
        const intentSection = intentMatch[1];
        const positionMatch = intentSection.match(/\*\*职位\*\*：(.+?)\n/);
        if (positionMatch) {
          return positionMatch[1].trim();
        }
      }
    }
    return resume.position || '未指定职位';
  };

  // 解析后的数据
  const candidateName = parseCandidateName(resume);
  const educationLevel = parseEducationLevel(resume);
  const workYears = parseWorkYears(resume);
  const expectedPosition = parseExpectedPosition(resume);

  // 生成亮点内容（基于技能和经验）
  const generateHighlights = (resume) => {
    const highlights = [];
    
    // 基于学历的亮点
    if (resume.education === '博士') {
      highlights.push('高学历人才', '学术背景深厚', '研究能力强');
    } else if (resume.education === '硕士') {
      highlights.push('硕士学历', '专业素养高', '学习能力强');
    }
    
    // 基于经验的亮点
    if (resume.experience >= 10) {
      highlights.push('资深专家', '经验丰富', '技术成熟');
    } else if (resume.experience >= 5) {
      highlights.push('中高级人才', '经验丰富', '技术扎实');
    } else if (resume.experience >= 2) {
      highlights.push('成长型人才', '学习能力强', '潜力巨大');
    }
    
    // 基于技能的亮点
    if (resume.skills && resume.skills.length > 0) {
      const skillCount = resume.skills.length;
      if (skillCount >= 8) {
        highlights.push('技能全面', '技术栈丰富', '适应性强');
      } else if (skillCount >= 5) {
        highlights.push('技能多样', '技术面广', '综合能力强');
      }
      
      // 特定技能亮点
      if (resume.skills.includes('React') || resume.skills.includes('Vue') || resume.skills.includes('Angular')) {
        highlights.push('前端开发', '现代框架', 'UI/UX设计');
      }
      if (resume.skills.includes('Node.js') || resume.skills.includes('Spring Boot')) {
        highlights.push('后端开发', '服务端技术', 'API设计');
      }
      if (resume.skills.includes('Docker') || resume.skills.includes('Kubernetes')) {
        highlights.push('容器化', '云原生', 'DevOps');
      }
      if (resume.skills.includes('Python') || resume.skills.includes('Java') || resume.skills.includes('C++')) {
        highlights.push('编程语言', '算法能力', '代码质量');
      }
    }
    
    return highlights.slice(0, 8); // 最多显示8个亮点
  };

  const highlights = generateHighlights(resume);

  // 生成模拟数据（基于现有数据扩展）
  const generateMockData = (resume) => {
    const age = 25 + Math.floor(Math.random() * 15); // 25-40岁
    const status = ['在职', '离职', '待业'][Math.floor(Math.random() * 3)];
    const selfIntro = [
      '热爱技术，有强烈的学习欲望和团队合作精神。擅长前端开发，对用户体验有独到见解。',
      '具备扎实的计算机基础，熟悉多种编程语言和框架。有丰富的项目经验，能够独立完成项目开发。',
      '技术全面，前后端都有涉猎。善于沟通，能够快速理解业务需求并转化为技术方案。',
      '专注于算法和数据结构，有较强的逻辑思维能力。热爱开源，积极参与技术社区。'
    ][Math.floor(Math.random() * 4)];
    
    const expectedSalary = ['15k-25k', '20k-35k', '25k-45k', '35k-60k'][Math.floor(Math.random() * 4)];
    const workLocation = ['北京', '上海', '深圳', '杭州', '广州'][Math.floor(Math.random() * 4)];
    
    const workExperience = [
      {
        company: '腾讯科技',
        position: resume.position,
        time: '2022.03 - 2024.06',
        content: '负责公司核心产品的架构设计和开发工作，带领团队完成多个重要项目，提升了系统性能和用户体验。'
      },
      {
        company: '阿里巴巴',
        position: resume.position,
        time: '2020.07 - 2022.02',
        content: '参与电商平台的开发维护，负责后端服务架构优化，提升了系统稳定性和响应速度。'
      }
    ];
    
    const projectExperience = [
      {
        name: '企业级管理系统',
        role: '技术负责人',
        time: '2023.01 - 2023.12',
        description: '设计并开发了一套完整的企业级管理系统，包含用户管理、权限控制、数据统计等模块，提升了企业运营效率。'
      },
      {
        name: '移动端APP开发',
        role: '前端开发',
        time: '2022.06 - 2022.12',
        description: '使用React Native开发跨平台移动应用，实现了复杂的用户界面和交互功能，获得了用户好评。'
      }
    ];
    
    const education = {
      school: ['清华大学', '北京大学', '浙江大学', '复旦大学'][Math.floor(Math.random() * 4)],
      major: ['计算机科学与技术', '软件工程', '信息管理与信息系统'][Math.floor(Math.random() * 4)],
      degree: resume.education,
      time: '2016.09 - 2020.06'
    };
    
    const certificates = [
      'PMP项目管理认证',
      'AWS解决方案架构师认证',
      'Google Cloud认证',
      'Microsoft Azure认证'
    ].slice(0, Math.floor(Math.random() * 3) + 1);
    
    return {
      age,
      status,
      selfIntro,
      expectedSalary,
      workLocation,
      workExperience,
      projectExperience,
      education,
      certificates
    };
  };

  const mockData = generateMockData(resume);

  return (
    <BaseDrawer $visible={visible}>
      <BaseDrawerHeader>
        <BaseDrawerTitle>简历详情 - {candidateName}</BaseDrawerTitle>
        <BaseCloseButton onClick={onClose}>
          <CloseOutlined />
        </BaseCloseButton>
      </BaseDrawerHeader>
      
      <BaseDrawerBody>
        {/* 基本信息 */}
        <BaseCard>
          <div style={{ padding: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                backgroundColor: '#1890ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: 'white',
                fontSize: '32px'
              }}>
                <UserOutlined />
              </div>
              <Title level={3} style={{ margin: 0 }}>{candidateName}</Title>
              <Tag color="blue" style={{ fontSize: '14px', padding: '4px 12px' }}>
                {expectedPosition}
              </Tag>
            </div>
            
            <Divider />
            
            <Descriptions column={1} size="small" styles={{ label: { width: '80px', textAlign: 'left' }, content: { textAlign: 'left' } }}>
              {resume.age && (
                <Descriptions.Item label="年龄">
                  <Tag color="cyan">{resume.age}</Tag>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="学历">
                <Tag color="green">{educationLevel}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="工作年限">
                <Tag color="orange">{workYears}年</Tag>
              </Descriptions.Item>
              {resume.currentStatus && (
                <Descriptions.Item label="目前状态">
                  <Tag color={resume.currentStatus === '在职' ? 'success' : 'warning'}>
                    {resume.currentStatus}
                  </Tag>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="来源">
                <Tag color="purple">
                  {resume.source === 'boss' ? 'Boss直聘' :
                   resume.source === 'qcwy' ? '前程无忧' :
                   resume.source === 'zlzp' ? '智联招聘' :
                   resume.source === 'lagou' ? '拉勾网' :
                   resume.source === 'liepin' ? '猎聘网' :
                   resume.source === 'linkedin' ? 'LinkedIn' :
                   resume.source === 'manual' ? '手动添加' : '未知来源'}
                </Tag>
              </Descriptions.Item>
              {resume.qualityScore && (
                <Descriptions.Item label="质量评分">
                  <Tag color={resume.qualityScore >= 80 ? 'success' : resume.qualityScore >= 60 ? 'warning' : 'error'}>
                    {resume.qualityScore}分
                  </Tag>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        </BaseCard>

        {/* Markdown格式简历内容 */}
        {resume.parsedContent && resume.parseMethod === 'llm' && (
          <BaseCard>
            <div style={{ padding: '20px' }}>
              <SectionTitle>
                <span>简历内容</span>
              </SectionTitle>
              <MarkdownContent>
                <ReactMarkdown>{cleanMarkdownContent(resume.parsedContent)}</ReactMarkdown>
              </MarkdownContent>
            </div>
          </BaseCard>
        )}

        {/* 自我介绍 */}
        {resume.selfIntroduction && !resume.parsedContent && (
          <BaseCard>
            <div style={{ padding: '20px' }}>
              <SectionTitle>自我介绍</SectionTitle>
              <Paragraph style={{ color: '#666', lineHeight: 1.6, margin: 0 }}>
                {resume.selfIntroduction}
              </Paragraph>
            </div>
          </BaseCard>
        )}

        {/* 期望职位 */}
        {resume.expectedPosition && !resume.parsedContent && (
          <BaseCard>
            <div style={{ padding: '20px' }}>
              <SectionTitle>期望职位</SectionTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {resume.expectedPosition.position && (
                  <InfoRow>
                    <CalendarOutlined />
                    <Text>期望职位：</Text>
                    <Tag color="purple">{resume.expectedPosition.position}</Tag>
                  </InfoRow>
                )}
                {resume.expectedPosition.location && (
                  <InfoRow>
                    <EnvironmentOutlined />
                    <Text>工作地点：</Text>
                    <Tag color="blue">{resume.expectedPosition.location}</Tag>
                  </InfoRow>
                )}
                {resume.expectedPosition.salary && (
                  <InfoRow>
                    <DollarOutlined />
                    <Text>期望薪资：</Text>
                    <Tag color="green">{resume.expectedPosition.salary}</Tag>
                  </InfoRow>
                )}
                {resume.expectedPosition.workType && (
                  <InfoRow>
                    <CalendarOutlined />
                    <Text>工作类型：</Text>
                    <Tag color="orange">{resume.expectedPosition.workType}</Tag>
                  </InfoRow>
                )}
              </div>
            </div>
          </BaseCard>
        )}

        {/* 联系方式 */}
        <BaseCard>
          <div style={{ padding: '20px' }}>
            <SectionTitle>联系方式</SectionTitle>
            <ContactInfo>
              <MailOutlined />
              <Text>{resume.email}</Text>
            </ContactInfo>
            <ContactInfo>
              <PhoneOutlined />
              <Text>{resume.phone}</Text>
            </ContactInfo>
          </div>
        </BaseCard>

        {/* 岗位经验 */}
        {resume.positionExperience && resume.positionExperience.length > 0 && (
          <BaseCard>
            <div style={{ padding: '20px' }}>
              <SectionTitle>岗位经验</SectionTitle>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>相关经验：</Text>
              </div>
              <div>
                {resume.positionExperience.map((exp, index) => (
                  <div key={index} style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text strong style={{ color: '#1890ff' }}>{exp.position}</Text>
                      <Tag color="green" style={{ fontSize: '12px' }}>
                        {exp.duration}
                      </Tag>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </BaseCard>
        )}

        {/* 工作经历 */}
        {resume.workExperience && resume.workExperience.length > 0 && !resume.parsedContent && (
          <BaseCard>
            <div style={{ padding: '20px' }}>
              <SectionTitle>工作经历</SectionTitle>
              <Timeline>
                {resume.workExperience.map((work, index) => (
                  <Timeline.Item key={index}>
                    <TimelineItem>
                      <div className="company-name">{work.company}</div>
                      <div className="position-title">{work.position}</div>
                      <div className="time-period">{work.startTime} - {work.endTime}</div>
                      <div className="work-content">{work.description}</div>
                      {work.achievements && work.achievements.length > 0 && (
                        <div style={{ marginTop: '8px' }}>
                          <Text strong style={{ fontSize: '12px' }}>主要成就：</Text>
                          <ul style={{ margin: '4px 0', paddingLeft: '16px' }}>
                            {work.achievements.map((achievement, idx) => (
                              <li key={idx} style={{ fontSize: '12px', color: '#666' }}>
                                {achievement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </TimelineItem>
                  </Timeline.Item>
                ))}
              </Timeline>
            </div>
          </BaseCard>
        )}

        {/* 教育经历 */}
        {resume.educationExperience && resume.educationExperience.length > 0 && !resume.parsedContent && (
          <BaseCard>
            <div style={{ padding: '20px' }}>
              <SectionTitle>教育经历</SectionTitle>
              <Timeline>
                {resume.educationExperience.map((edu, index) => (
                  <Timeline.Item key={index}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <BookOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
                        <Text strong>{edu.school}</Text>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <Text>{edu.major} · {edu.degree}</Text>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <Text type="secondary">{edu.startTime} - {edu.endTime}</Text>
                      </div>
                      {edu.description && (
                        <div>
                          <Text type="secondary">{edu.description}</Text>
                        </div>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </div>
          </BaseCard>
        )}

        {/* 资格证书 */}
        {resume.certificates && resume.certificates.length > 0 && !resume.parsedContent && (
          <BaseCard>
            <div style={{ padding: '20px' }}>
              <SectionTitle>资格证书</SectionTitle>
              <div>
                {resume.certificates.map((cert, index) => (
                  <div key={index} style={{ marginBottom: '12px' }}>
                    <Tag color="gold" style={{ marginBottom: '4px' }}>
                      <TrophyOutlined style={{ marginRight: '4px' }} />
                      {cert.name}
                    </Tag>
                    {cert.category && (
                      <Tag color="blue" style={{ marginLeft: '8px' }}>
                        {cert.category}
                      </Tag>
                    )}
                    {cert.issuer && (
                      <div style={{ marginTop: '4px' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          颁发机构：{cert.issuer}
                        </Text>
                      </div>
                    )}
                    {cert.date && (
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          获得时间：{cert.date}
                        </Text>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </BaseCard>
        )}

        {/* 志愿经历 */}
        {resume.volunteerExperience && resume.volunteerExperience.length > 0 && !resume.parsedContent && (
          <BaseCard>
            <div style={{ padding: '20px' }}>
              <SectionTitle>志愿经历</SectionTitle>
              <Timeline>
                {resume.volunteerExperience.map((vol, index) => (
                  <Timeline.Item key={index}>
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ fontWeight: '600', color: '#333', marginBottom: '4px' }}>
                        {vol.organization}
                      </div>
                      <div style={{ color: '#1890ff', marginBottom: '4px' }}>
                        {vol.role}
                      </div>
                      <div style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>
                        {vol.startTime} - {vol.endTime}
                      </div>
                      {vol.description && (
                        <div style={{ color: '#666', fontSize: '13px', lineHeight: 1.6 }}>
                          {vol.description}
                        </div>
                      )}
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            </div>
          </BaseCard>
        )}

        {/* 专业技能 */}
        {resume.skills && resume.skills.length > 0 && !resume.parsedContent && (
          <BaseCard>
            <div style={{ padding: '20px' }}>
              <SectionTitle>专业技能</SectionTitle>
              <div>
                {resume.skills.map((skill, index) => (
                  <SkillTag key={index} color="blue">
                    {skill}
                  </SkillTag>
                ))}
              </div>
            </div>
          </BaseCard>
        )}

        {/* 亮点分析 */}
        {!resume.parsedContent && (
          <BaseCard>
            <div style={{ padding: '20px' }}>
              <SectionTitle>亮点分析</SectionTitle>
              <div>
                {highlights.map((highlight, index) => (
                  <HighlightTag key={index}>
                    {highlight}
                  </HighlightTag>
                ))}
              </div>
            </div>
          </BaseCard>
        )}

        {/* 操作按钮 */}
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Space>
            <Button type="primary" icon={<StarOutlined />}>
              标记感兴趣
            </Button>
            <Button>
              下载简历
            </Button>
            <Button type="dashed">
              联系候选人
            </Button>
          </Space>
        </div>
      </BaseDrawerBody>
    </BaseDrawer>
  );
};

export default ResumeDetailModal;
