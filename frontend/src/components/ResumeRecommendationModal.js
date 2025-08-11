import React, { useState, useEffect } from 'react';
import { Card, Avatar, Tag, Button, message } from 'antd';
import { UserOutlined, LikeOutlined, DislikeOutlined, CloseOutlined } from '@ant-design/icons';
import styled from 'styled-components';

const { Option } = require('antd/lib/select');

// 添加CSS动画
const slideInAnimation = `
  @keyframes slideInFromRight {
    from {
      opacity: 0;
      transform: translateX(50px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }
`;

// 修改为抽屉式组件样式
const RecommendationDrawer = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'visible'
})`
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 33.33%;
  background: white;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  transform: translateX(${props => props.visible ? '0' : '100%'});
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: transform;
  backface-visibility: hidden;
  perspective: 1000px;
`;

const DrawerHeader = styled.div`
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fafafa;
`;

const DrawerTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #333;
`;

const CloseButton = styled.button`
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

const DrawerBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  height: calc(100vh - 80px);
`;

const ResumeCard = styled(Card)`
  margin-bottom: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  border: 1px solid #f0f0f0;
  overflow: hidden;
  will-change: transform, opacity;
  
  &.fade-out {
    opacity: 0;
    transform: translateX(100%) scale(0.95);
    transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
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

const CardFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
  
  .action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px solid #d9d9d9;
    background: white;
    cursor: pointer;
    transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    will-change: transform;
    
    &:hover {
      transform: scale(1.15);
    }
    
    &.like {
      &:hover {
        border-color: #52c41a;
        color: #52c41a;
      }
      
      &.active {
        border-color: #52c41a;
        color: #52c41a;
        background: #f6ffed;
      }
    }
    
    &.dislike {
      &:hover {
        border-color: #ff4d4f;
        color: #ff4d4f;
      }
      
      &.active {
        border-color: #ff4d4f;
        color: #ff4d4f;
        background: #fff2f0;
      }
    }
  }
`;

const ResumeRecommendationModal = ({ 
  visible, 
  onClose, 
  query, 
  resumes = [], 
  positions = [] 
}) => {
  const [displayedResumes, setDisplayedResumes] = useState([]);
  const [likedResumes, setLikedResumes] = useState(new Set());
  const [dislikedResumes, setDislikedResumes] = useState(new Set());
  const [isAnimating, setIsAnimating] = useState(false);

  // 注入CSS动画
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = slideInAnimation;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // 初始化显示的简历
  useEffect(() => {
    if (visible && resumes.length > 0) {
      setIsAnimating(true);
      setDisplayedResumes(resumes.slice(0, 5)); // 显示前5个
      setLikedResumes(new Set());
      setDislikedResumes(new Set());
      
      // 延迟重置动画状态，确保进入动画完成
      setTimeout(() => {
        setIsAnimating(false);
      }, 100);
    }
  }, [visible, resumes]);

  // 获取评分等级
  const getScoreIndicator = (score) => {
    if (!score) return { level: '未评分', color: '#999', bgColor: '#f5f5f5' };
    
    if (score >= 90) return { level: '优秀', color: '#52c41a', bgColor: '#f6ffed' };
    if (score >= 80) return { level: '良好', color: '#1890ff', bgColor: '#e6f7ff' };
    if (score >= 70) return { level: '一般', color: '#faad14', bgColor: '#fffbe6' };
    return { level: '待提升', color: '#ff4d4f', bgColor: '#fff2f0' };
  };

  // 处理点赞
  const handleLike = (resumeId) => {
    setLikedResumes(prev => new Set([...prev, resumeId]));
    setDislikedResumes(prev => {
      const newSet = new Set(prev);
      newSet.delete(resumeId);
      return newSet;
    });
    message.success('已点赞该候选人');
  };

  // 处理点踩
  const handleDislike = (resumeId) => {
    setDislikedResumes(prev => new Set([...prev, resumeId]));
    setLikedResumes(prev => {
      const newSet = new Set(prev);
      newSet.delete(resumeId);
      return newSet;
    });
    
    // 添加消失动画
    const cardElement = document.querySelector(`[data-resume-id="${resumeId}"]`);
    if (cardElement) {
      cardElement.classList.add('fade-out');
    }
    
    // 延迟移除简历并添加新的
    setTimeout(() => {
      setDisplayedResumes(prev => {
        const filtered = prev.filter(r => r.id !== resumeId);
        // 从原始简历中找下一个未显示的
        const nextResume = resumes.find(r => 
          !filtered.some(displayed => displayed.id === r.id) &&
          !dislikedResumes.has(r.id)
        );
        if (nextResume) {
          return [...filtered, nextResume];
        }
        return filtered;
      });
    }, 500);
    
    message.info('已跳过该候选人');
  };

  // 渲染简历卡片
  const renderResumeCard = (resume, index) => {
    const position = positions.find(p => p.id === resume.positionId) || {};
    const latestScore = resume.scores && resume.scores.length > 0 ? resume.scores[resume.scores.length - 1] : null;
    const scoreIndicator = getScoreIndicator(latestScore?.score);
    
    const keySkills = resume.skills ? resume.skills.slice(0, 3) : [];
    const education = resume.educationDetails && resume.educationDetails.length > 0 ? resume.educationDetails[0] : null;
    const latestWork = resume.workExperience && resume.workExperience.length > 0 ? resume.workExperience[0] : null;

    return (
      <ResumeCard 
        key={resume.id}
        data-resume-id={resume.id}
        style={{
          animationDelay: `${index * 0.1}s`,
          animation: isAnimating ? 'slideInFromRight 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards' : 'none'
        }}
      >
        {/* 头部：姓名、评分、岗位 */}
        <CardHeader>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Avatar size="large" icon={<UserOutlined />} />
              <div style={{ marginLeft: 12 }}>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#333' }}>
                  {resume.name || '未命名候选人'}
                </div>
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
        
        {/* 底部操作按钮 */}
        <CardFooter>
          <div style={{ fontSize: 12, color: '#666' }}>
            综合评分: {latestScore?.score || 0}分
          </div>
          <ActionButtons>
            <div 
              className={`action-btn like ${likedResumes.has(resume.id) ? 'active' : ''}`}
              onClick={() => handleLike(resume.id)}
            >
              <LikeOutlined />
            </div>
            <div 
              className={`action-btn dislike ${dislikedResumes.has(resume.id) ? 'active' : ''}`}
              onClick={() => handleDislike(resume.id)}
            >
              <DislikeOutlined />
            </div>
          </ActionButtons>
        </CardFooter>
      </ResumeCard>
    );
  };

  return (
    <RecommendationDrawer visible={visible} data-drawer="recommendation">
      <DrawerHeader>
        <DrawerTitle>简历推荐 - {query}</DrawerTitle>
        <CloseButton 
          onClick={() => {
            // 添加关闭动画延迟
            const drawer = document.querySelector('[data-drawer="recommendation"]');
            if (drawer) {
              drawer.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            }
            setTimeout(() => {
              onClose();
            }, 50);
          }}
        >
          <CloseOutlined />
        </CloseButton>
      </DrawerHeader>
      
      <DrawerBody>
        <div style={{ marginBottom: 16, padding: '12px 16px', backgroundColor: '#f6ffed', borderRadius: '8px', border: '1px solid #b7eb8f' }}>
          <div style={{ fontSize: 14, fontWeight: 'bold', color: '#52c41a', marginBottom: 4 }}>
            为您推荐 Top5 候选人
          </div>
          <div style={{ fontSize: 12, color: '#666' }}>
            基于您的查询"{query}"，我们为您筛选出了评分最高的候选人
          </div>
        </div>
        
        <div style={{ marginBottom: 16 }}>
          {displayedResumes.map((resume, index) => renderResumeCard(resume, index))}
        </div>
        
        {displayedResumes.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', padding: '40px 20px' }}>
            <div style={{ fontSize: 16, marginBottom: 8 }}>暂无推荐候选人</div>
            <div style={{ fontSize: 12 }}>请尝试调整查询条件</div>
          </div>
        )}
      </DrawerBody>
    </RecommendationDrawer>
  );
};

export default ResumeRecommendationModal;