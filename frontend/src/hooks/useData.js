import { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '../constants';
import { apiGet } from '../utils/apiClient';
import Logger from '../utils/logger';

export const useData = () => {
  const [resumes, setResumes] = useState([]);
  const [positions, setPositions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPositions = async () => {
    try {
      const result = await apiGet(API_ENDPOINTS.POSITIONS);
      if (result.success) {
        setPositions(result.data || []);
      } else {
        Logger.error('获取岗位数据失败:', result.error);
        setPositions([]);
      }
    } catch (error) {
      Logger.error('获取岗位数据失败:', error);
      setPositions([]);
    }
  };

  const fetchResumes = async () => {
    try {
      const result = await apiGet(API_ENDPOINTS.RESUME.LIST);
      if (result.success) {
        setResumes(result.data || []);
      } else {
        Logger.error('获取简历数据失败:', result.error);
        setResumes([]);
      }
    } catch (error) {
      Logger.error('获取简历数据失败:', error);
      setResumes([]);
    }
  };

  const getRecommendedResumes = async (query) => {
    try {
      // 获取所有简历
      const allResumes = await apiGet(API_ENDPOINTS.RESUME.LIST);
      
      // 根据查询关键词筛选简历
      let filteredResumes = allResumes;
      
      // 检查是否包含岗位关键词
      const positionKeywords = {
        '产品经理': ['产品', 'PM', '产品经理', '产品总监'],
        '软件工程师': ['开发', '工程师', '程序员', '软件', 'Java', 'Python', 'JavaScript'],
        '前端工程师': ['前端', 'React', 'Vue', 'Angular', 'HTML', 'CSS', 'JavaScript'],
        '后端工程师': ['后端', 'Java', 'Python', 'Node.js', '数据库', 'API'],
        '算法工程师': ['算法', '机器学习', 'AI', '深度学习', '数据科学'],
        '测试工程师': ['测试', 'QA', '质量保证', '自动化测试'],
        '运维工程师': ['运维', 'DevOps', '部署', '服务器', 'Linux']
      };

      // 根据查询内容匹配岗位关键词
      for (const [position, keywords] of Object.entries(positionKeywords)) {
        if (keywords.some(keyword => query.includes(keyword))) {
          // 筛选包含该岗位关键词的简历
          filteredResumes = allResumes.filter(resume => 
            resume.skills && resume.skills.some(skill => 
              keywords.some(keyword => skill.toLowerCase().includes(keyword.toLowerCase()))
            )
          );
          break;
        }
      }

      return filteredResumes.slice(0, 5); // 返回前5个推荐简历
    } catch (error) {
      Logger.error('获取推荐简历失败:', error);
      return [];
    }
  };

  const downloadResume = async (filename) => {
    try {
      const result = await apiGet(`/api/download-resume?filename=${encodeURIComponent(filename)}`, { responseType: 'blob' });
      if (result.success) {
        const blob = result.data;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        Logger.error('下载简历失败');
      }
    } catch (error) {
      Logger.error('下载简历失败:', error);
    }
  };

  useEffect(() => {
    fetchPositions();
    fetchResumes();
  }, []);

  return {
    resumes,
    setResumes,
    positions,
    setPositions,
    isLoading,
    setIsLoading,
    fetchPositions,
    fetchResumes,
    getRecommendedResumes,
    downloadResume
  };
};