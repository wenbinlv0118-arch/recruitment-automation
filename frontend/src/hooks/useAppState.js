import { useState, useCallback } from 'react';
import { API_ENDPOINTS } from '../config/api';
import { apiGet } from '../utils/apiClient';

/**
 * 应用状态管理hook
 * 集中管理应用的主要状态
 */
export const useAppState = () => {
  // 基础状态
  const [selectedMenuKey, setSelectedMenuKey] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [isWaitingForCode, setIsWaitingForCode] = useState(false);
  
  // 简历相关状态
  const [resumes, setResumes] = useState([]);
  const [recommendationVisible, setRecommendationVisible] = useState(false);
  const [recommendationQuery, setRecommendationQuery] = useState('');
  const [recommendedResumes, setRecommendedResumes] = useState([]);
  
  // 岗位相关状态
  const [positions, setPositions] = useState([]);
  const [jdDetailVisible, setJdDetailVisible] = useState(false);
  const [currentPositionData, setCurrentPositionData] = useState(null);
  const [positionManagementVisible, setPositionManagementVisible] = useState(false);
  const [currentCompanyInfo, setCurrentCompanyInfo] = useState(null);
  
  // 公司推荐相关状态
  const [recommendedCompanies, setRecommendedCompanies] = useState([]);
  const [recommendationReport, setRecommendationReport] = useState({});
  const [companyRecommendationVisible, setCompanyRecommendationVisible] = useState(false);
  
  // 智能寻聘相关状态
  const [showSmartRecruitment, setShowSmartRecruitment] = useState(false);
  const [selectedRecruitmentPlatform, setSelectedRecruitmentPlatform] = useState(null);
  const [showBossZhipinControl, setShowBossZhipinControl] = useState(false);
  const [showZhilianControl, setShowZhilianControl] = useState(false);
  
  // 计算是否有任何弹窗显示
  const hasAnyModal = recommendationVisible || jdDetailVisible || 
    positionManagementVisible || companyRecommendationVisible || 
    showSmartRecruitment || showBossZhipinControl || showZhilianControl;
  
  // 获取岗位数据的优化版本
  const fetchPositions = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await apiGet(API_ENDPOINTS.POSITIONS.LIST);
      if (result.success) {
        setPositions(result.data || []);
      } else {
        console.error('获取岗位数据失败:', result.error);
        setPositions([]);
      }
    } catch (error) {
      console.error('获取岗位数据失败:', error);
      setPositions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return {
    // 基础状态
    selectedMenuKey,
    setSelectedMenuKey,
    isLoading,
    setIsLoading,
    currentStatus,
    setCurrentStatus,
    isWaitingForCode,
    setIsWaitingForCode,
    
    // 简历相关
    resumes,
    setResumes,
    recommendationVisible,
    setRecommendationVisible,
    recommendationQuery,
    setRecommendationQuery,
    recommendedResumes,
    setRecommendedResumes,
    
    // 岗位相关
    positions,
    setPositions,
    jdDetailVisible,
    setJdDetailVisible,
    currentPositionData,
    setCurrentPositionData,
    positionManagementVisible,
    setPositionManagementVisible,
    currentCompanyInfo,
    setCurrentCompanyInfo,
    
    // 公司推荐
    recommendedCompanies,
    setRecommendedCompanies,
    recommendationReport,
    setRecommendationReport,
    companyRecommendationVisible,
    setCompanyRecommendationVisible,
    
    // 智能寻聘
    showSmartRecruitment,
    setShowSmartRecruitment,
    selectedRecruitmentPlatform,
    setSelectedRecruitmentPlatform,
    showBossZhipinControl,
    setShowBossZhipinControl,
    showZhilianControl,
    setShowZhilianControl,
    
    // 计算属性
    hasAnyModal,
    
    // 方法
    fetchPositions
  };
};
