import React from 'react';
import styled from 'styled-components';
import { Typography, Tag, Space, Button, Timeline } from 'antd';
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

// 样式组件定义
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

const WorkExperienceItem = styled.div`
  margin-bottom: 20px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  border-left: 4px solid #1890ff;

  .header-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .company-position {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .company-name {
    font-weight: 600;
    color: #333;
    font-size: 14px;
  }

  .position-title {
    color: #1890ff;
    font-size: 14px;
  }

  .time-period {
    color: #666;
    font-size: 12px;
    white-space: nowrap;
  }

  .work-description {
    color: #666;
    font-size: 13px;
    line-height: 1.6;
    margin-top: 8px;
  }

  .achievements {
    margin-top: 12px;
  }

  .achievements-title {
    font-weight: 600;
    color: #333;
    font-size: 12px;
    margin-bottom: 6px;
  }

  .achievements-list {
    margin: 0;
    padding-left: 16px;
  }

  .achievements-list li {
    font-size: 12px;
    color: #666;
    margin-bottom: 4px;
    line-height: 1.4;
  }
`;

const EducationItem = styled.div`
  margin-bottom: 16px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 6px;

  .education-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .education-main {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .school-name {
    font-weight: 600;
    color: #333;
    font-size: 14px;
  }

  .major-degree {
    color: #1890ff;
    font-size: 13px;
  }

  .education-time {
    color: #666;
    font-size: 12px;
    white-space: nowrap;
  }

  .education-description {
    color: #666;
    font-size: 12px;
    line-height: 1.5;
    margin-top: 6px;
  }
`;

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

// 辅助函数
const cleanMarkdownContent = (content) => {
  if (!content) return '';
  return content.replace(/\*\*(.*?)\*\*/g, '$1')
                .replace(/\*(.*?)\*/g, '$1')
                .replace(/#{1,6}\s*/g, '');
};

/**
 * 解析候选人姓名
 * @param {Object} resume - 简历对象
 * @returns {string} 候选人姓名
 */
const parseCandidateName = (resume) => {
  if (resume.candidateName) return resume.candidateName;
  if (resume.name) return resume.name;
  
  // 从解析内容中提取姓名
  try {
    const parsed = JSON.parse(resume.parsedContent || '{}');
    if (parsed.basicInfo?.name) return parsed.basicInfo.name;
    if (parsed.name) return parsed.name;
  } catch (e) {
    // 如果不是JSON格式，尝试从文本中提取
    const content = resume.parsedContent || '';
    const nameMatch = content.match(/姓名[：:](.*?)\n/) || content.match(/姓名[：:]\s*(.*?)\s/);
    if (nameMatch) return nameMatch[1].trim();
  }
  
  return '未知';
};

/**
 * 解析教育水平
 * @param {Object} resume - 简历对象
 * @returns {string} 教育水平
 */
const parseEducationLevel = (resume) => {
  if (resume.educationLevel) return resume.educationLevel;
  
  // 从教育经历中获取最高学历
  if (resume.educationExperience && resume.educationExperience.length > 0) {
    const degrees = resume.educationExperience.map(edu => edu.degree).filter(Boolean);
    if (degrees.length > 0) {
      // 简单的学历排序逻辑
      const degreeOrder = ['博士', '硕士', '本科', '大专', '高中'];
      for (const degree of degreeOrder) {
        if (degrees.some(d => d.includes(degree))) {
          return degree;
        }
      }
      return degrees[0];
    }
  }
  
  // 从解析内容中提取
  try {
    const parsed = JSON.parse(resume.parsedContent || '{}');
    if (parsed.basicInfo?.education) return parsed.basicInfo.education;
    if (parsed.education) return parsed.education;
  } catch (e) {
    const content = resume.parsedContent || '';
    const eduMatch = content.match(/学历[：:](.*?)\n/) || content.match(/教育背景[：:](.*?)\n/);
    if (eduMatch) return eduMatch[1].trim();
  }
  
  return '未知';
};

/**
 * 解析工作年限
 * @param {Object} resume - 简历对象
 * @returns {string} 工作年限
 */
const parseWorkYears = (resume) => {
  if (resume.workYears) return resume.workYears;
  
  // 从工作经历计算
  if (resume.workExperience && resume.workExperience.length > 0) {
    let totalMonths = 0;
    resume.workExperience.forEach(work => {
      if (work.startTime && work.endTime) {
        const start = new Date(work.startTime);
        const end = work.endTime === '至今' ? new Date() : new Date(work.endTime);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          totalMonths += (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        }
      }
    });
    if (totalMonths > 0) {
      const years = Math.floor(totalMonths / 12);
      const months = totalMonths % 12;
      return years > 0 ? `${years}年${months > 0 ? months + '个月' : ''}` : `${months}个月`;
    }
  }
  
  // 从解析内容中提取
  try {
    const parsed = JSON.parse(resume.parsedContent || '{}');
    if (parsed.workYears) return parsed.workYears;
  } catch (e) {
    const content = resume.parsedContent || '';
    const workMatch = content.match(/工作年限[：:](.*?)\n/) || content.match(/工作经验[：:](.*?)\n/);
    if (workMatch) return workMatch[1].trim();
  }
  
  return '未知';
};

/**
 * 解析期望职位
 * @param {Object} resume - 简历对象
 * @returns {string} 期望职位
 */
const parseExpectedPosition = (resume) => {
  // 处理结构化的expectedPosition对象
  if (resume.expectedPosition) {
    if (typeof resume.expectedPosition === 'object' && resume.expectedPosition !== null) {
      if (resume.expectedPosition.position && resume.expectedPosition.position.trim() !== '') {
        return resume.expectedPosition.position;
      }
    } else if (typeof resume.expectedPosition === 'string' && resume.expectedPosition.trim() !== '') {
      return resume.expectedPosition;
    }
  }
  
  try {
    const parsed = JSON.parse(resume.parsedContent || '{}');
    if (parsed.jobIntention?.position) return parsed.jobIntention.position;
    if (parsed.expectedPosition) {
      if (typeof parsed.expectedPosition === 'object' && parsed.expectedPosition.position) {
        return parsed.expectedPosition.position;
      } else if (typeof parsed.expectedPosition === 'string') {
        return parsed.expectedPosition;
      }
    }
  } catch (e) {
    const content = resume.parsedContent || '';
    const posMatch = content.match(/期望职位[：:](.*?)\n/) || content.match(/求职意向[：:](.*?)\n/);
    if (posMatch) return posMatch[1].trim();
  }
  
  return '未指定职位';
};

const ResumeDetailModal = ({ visible, onClose, resume }) => {
  if (!resume) return null;

  return (
    <BaseDrawer style={{ transform: visible ? 'translateX(0)' : 'translateX(100%)' }}>
      <BaseDrawerHeader>
        <BaseDrawerTitle>简历详情</BaseDrawerTitle>
        <BaseCloseButton onClick={onClose}>
          <CloseOutlined />
        </BaseCloseButton>
      </BaseDrawerHeader>
      
      <BaseDrawerBody>



        {/* Markdown格式简历内容 - 优先使用markdownContent字段 */}
        {(resume.markdownContent || resume.parsedContent) && (
          <BaseCard>
            <div style={{ padding: '20px' }}>
              <SectionTitle>
                <span>简历详情</span>
              </SectionTitle>
              <MarkdownContent>
                <ReactMarkdown>
                  {resume.markdownContent 
                    ? resume.markdownContent 
                    : cleanMarkdownContent(resume.parsedContent)
                  }
                </ReactMarkdown>
              </MarkdownContent>
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
          </Space>
        </div>
      </BaseDrawerBody>
    </BaseDrawer>
  );
};

export default ResumeDetailModal;
