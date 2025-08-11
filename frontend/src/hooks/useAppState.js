import { useState, useCallback } from 'react';

export const useAppState = () => {
  // 基础状态
  const [selectedMenuKey, setSelectedMenuKey] = useState('1');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWaitingForCode, setIsWaitingForCode] = useState(false);
  
  // 数据状态
  const [resumes, setResumes] = useState([]);
  const [positions, setPositions] = useState([]);
  const [currentStatus, setCurrentStatus] = useState(null);
  
  // 弹窗状态
  const [recommendationVisible, setRecommendationVisible] = useState(false);
  const [recommendationQuery, setRecommendationQuery] = useState('');
  const [recommendedResumes, setRecommendedResumes] = useState([]);
  const [jdDetailVisible, setJdDetailVisible] = useState(false);
  const [currentPositionData, setCurrentPositionData] = useState(null);
  const [companyFilterVisible, setCompanyFilterVisible] = useState(false);
  const [companyRecommendationVisible, setCompanyRecommendationVisible] = useState(false);
  
  // 公司搜索相关状态
  const [companySearchFilters, setCompanySearchFilters] = useState({});
  const [recommendedCompanies, setRecommendedCompanies] = useState([]);
  const [recommendationReport, setRecommendationReport] = useState({});
  
  // 计算是否有任何弹窗显示
  const hasAnyModal = recommendationVisible || jdDetailVisible || companyFilterVisible || companyRecommendationVisible;
  
  // 状态更新函数
  const updateConnectionStatus = useCallback((status) => {
    setIsConnected(status);
  }, []);
  
  const updateLoadingStatus = useCallback((status) => {
    setIsLoading(status);
  }, []);
  
  const updateWaitingForCode = useCallback((status) => {
    setIsWaitingForCode(status);
  }, []);
  
  const updateCurrentStatus = useCallback((status) => {
    setCurrentStatus(status);
  }, []);
  
  const updateResumes = useCallback((newResumes) => {
    setResumes(newResumes);
  }, []);
  
  const updatePositions = useCallback((newPositions) => {
    setPositions(newPositions);
  }, []);
  
  const updateCurrentPositionData = useCallback((data) => {
    setCurrentPositionData(data);
  }, []);
  
  const updateRecommendedResumes = useCallback((resumes, query = '') => {
    setRecommendedResumes(resumes);
    setRecommendationQuery(query);
  }, []);
  
  const updateRecommendedCompanies = useCallback((companies, report = {}) => {
    setRecommendedCompanies(companies);
    setRecommendationReport(report);
  }, []);
  
  const updateCompanySearchFilters = useCallback((filters) => {
    setCompanySearchFilters(filters);
  }, []);
  
  // 弹窗控制函数
  const showRecommendationModal = useCallback(() => {
    setRecommendationVisible(true);
  }, []);
  
  const hideRecommendationModal = useCallback(() => {
    setRecommendationVisible(false);
  }, []);
  
  const showJdDetailModal = useCallback(() => {
    setJdDetailVisible(true);
  }, []);
  
  const hideJdDetailModal = useCallback(() => {
    setJdDetailVisible(false);
  }, []);
  
  const showCompanyFilterModal = useCallback(() => {
    setCompanyFilterVisible(true);
  }, []);
  
  const hideCompanyFilterModal = useCallback(() => {
    setCompanyFilterVisible(false);
  }, []);
  
  const showCompanyRecommendationModal = useCallback(() => {
    setCompanyRecommendationVisible(true);
  }, []);
  
  const hideCompanyRecommendationModal = useCallback(() => {
    setCompanyRecommendationVisible(false);
  }, []);
  
  return {
    // 状态
    selectedMenuKey,
    isConnected,
    isLoading,
    isWaitingForCode,
    resumes,
    positions,
    currentStatus,
    recommendationVisible,
    recommendationQuery,
    recommendedResumes,
    jdDetailVisible,
    currentPositionData,
    companyFilterVisible,
    companyRecommendationVisible,
    companySearchFilters,
    recommendedCompanies,
    recommendationReport,
    hasAnyModal,
    
    // 状态更新函数
    setSelectedMenuKey,
    updateConnectionStatus,
    updateLoadingStatus,
    updateWaitingForCode,
    updateCurrentStatus,
    updateResumes,
    updatePositions,
    updateCurrentPositionData,
    updateRecommendedResumes,
    updateRecommendedCompanies,
    updateCompanySearchFilters,
    
    // 弹窗控制函数
    showRecommendationModal,
    hideRecommendationModal,
    showJdDetailModal,
    hideJdDetailModal,
    showCompanyFilterModal,
    hideCompanyFilterModal,
    showCompanyRecommendationModal,
    hideCompanyRecommendationModal,
  };
};
