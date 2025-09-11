import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Spin, message } from 'antd';
import { StarOutlined } from '@ant-design/icons';
import { apiPost } from '../services/api';
import { API_ENDPOINTS } from '../config/api';

/**
 * 工作经历亮点组件
 * 调用大模型API生成工作经历的亮点总结
 */
const WorkExperienceHighlights = ({ workExperiences, resumeId }) => {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  /**
   * 调用后端API生成工作经历亮点
   */
  const generateHighlights = useCallback(async () => {
    if (!workExperiences || workExperiences.length === 0) {
      return;
    }

    setLoading(true);
    try {
      // 格式化工作经历数据，确保包含必要字段
      const formattedExperiences = workExperiences.map(exp => ({
        company: exp.company || '未知公司',
        position: exp.position || '未知职位',
        duration: exp.duration || '未知时间',
        description: exp.description || '暂无描述'
      }));

      const result = await apiPost(API_ENDPOINTS.RESUME.GENERATE_HIGHLIGHTS, {
        workExperience: formattedExperiences
      });
      
      if (result.success) {
        setHighlights(result.data);
        setGenerated(true);
      } else {
        message.error('生成亮点失败: ' + result.error);
        // 设置默认亮点作为备选
        setHighlights(formattedExperiences.map(exp => ({
          company: exp.company,
          position: exp.position,
          highlights: ['工作经验丰富', '专业技能扎实', '团队协作能力强']
        })));
        setGenerated(true);
      }
    } catch (error) {
      console.error('生成亮点失败:', error);
      message.error('生成亮点失败，使用默认亮点');
      // 设置默认亮点
      const defaultHighlights = workExperiences.map(exp => ({
        company: exp.company || '未知公司',
        position: exp.position || '未知职位',
        highlights: ['工作经验丰富', '专业技能扎实', '团队协作能力强']
      }));
      setHighlights(defaultHighlights);
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  }, [workExperiences]);

  // 组件挂载时自动生成亮点
  useEffect(() => {
    if (workExperiences && workExperiences.length > 0 && !generated) {
      generateHighlights();
    }
  }, [workExperiences, generated, generateHighlights]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '12px' }}>
        <Spin size="small" />
        <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
          AI正在分析工作亮点...
        </div>
      </div>
    );
  }

  if (!highlights || highlights.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ 
        fontSize: '12px', 
        color: '#333', 
        marginBottom: '6px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <StarOutlined style={{ marginRight: '4px', color: '#faad14' }} />
        <strong>AI亮点分析</strong>
      </div>
      
      {highlights.map((expHighlight, expIndex) => (
        <div key={expIndex} style={{ marginBottom: '8px' }}>
          <div style={{ 
            fontSize: '10px', 
            color: '#666', 
            marginBottom: '3px',
            fontWeight: 'bold'
          }}>
            {expHighlight.company} - {expHighlight.position}
          </div>
          <div>
            {expHighlight.highlights.slice(0, 3).map((highlight, index) => (
              <Tag 
                key={index}
                size="small"
                style={{
                  fontSize: '9px',
                  marginBottom: '2px',
                  marginRight: '4px',
                  backgroundColor: '#fff7e6',
                  borderColor: '#ffd591',
                  color: '#d48806',
                  lineHeight: '1.2'
                }}
              >
                {highlight}
              </Tag>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default WorkExperienceHighlights;