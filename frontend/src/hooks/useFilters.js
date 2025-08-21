/**
 * 筛选条件管理Hook
 * 提供筛选条件的状态管理和操作方法
 */

import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { getDefaultFilterValues, validateFilters } from '../config/filterConfig';

/**
 * 筛选条件管理Hook
 * @param {string} platform - 招聘平台标识
 * @param {Object} initialFilters - 初始筛选条件
 * @returns {Object} 筛选条件状态和操作方法
 */
const useFilters = (platform, initialFilters = {}) => {
  // 获取默认筛选条件
  const defaultFilters = getDefaultFilterValues(platform);
  
  // 合并初始筛选条件和默认值
  const [filters, setFilters] = useState(() => ({
    ...defaultFilters,
    ...initialFilters
  }));
  
  // 筛选条件是否已应用
  const [isApplied, setIsApplied] = useState(false);
  
  // 筛选条件是否有变更
  const [hasChanges, setHasChanges] = useState(false);
  
  // 原始筛选条件（用于检测变更）
  const [originalFilters, setOriginalFilters] = useState(() => ({
    ...defaultFilters,
    ...initialFilters
  }));
  
  /**
   * 更新单个筛选条件
   * @param {string} key - 筛选条件键
   * @param {any} value - 筛选条件值
   */
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => {
      const newFilters = {
        ...prev,
        [key]: value
      };
      
      // 检测是否有变更
      const hasChanges = JSON.stringify(newFilters) !== JSON.stringify(originalFilters);
      setHasChanges(hasChanges);
      
      return newFilters;
    });
  }, [originalFilters]);
  
  /**
   * 批量更新筛选条件
   * @param {Object} newFilters - 新的筛选条件
   */
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => {
      const mergedFilters = {
        ...prev,
        ...newFilters
      };
      
      // 检测是否有变更
      const hasChanges = JSON.stringify(mergedFilters) !== JSON.stringify(originalFilters);
      setHasChanges(hasChanges);
      
      return mergedFilters;
    });
  }, [originalFilters]);
  
  /**
   * 应用筛选条件
   * @returns {boolean} 是否应用成功
   */
  const applyFilters = useCallback(() => {
    // 验证筛选条件
    if (!validateFilters(platform, filters)) {
      message.error('筛选条件格式不正确，请检查后重试');
      return false;
    }
    
    setIsApplied(true);
    setHasChanges(false);
    setOriginalFilters({ ...filters });
    
    message.success('筛选条件已应用');
    return true;
  }, [platform, filters]);
  
  /**
   * 重置筛选条件
   */
  const resetFilters = useCallback(() => {
    const defaultValues = getDefaultFilterValues(platform);
    setFilters(defaultValues);
    setIsApplied(false);
    setHasChanges(false);
    setOriginalFilters(defaultValues);
    
    message.info('筛选条件已重置');
  }, [platform]);
  
  /**
   * 清空筛选条件
   */
  const clearFilters = useCallback(() => {
    const clearedFilters = {};
    const defaultValues = getDefaultFilterValues(platform);
    
    // 保留默认值，清空其他值
    Object.keys(defaultValues).forEach(key => {
      if (typeof defaultValues[key] === 'boolean') {
        clearedFilters[key] = defaultValues[key];
      } else {
        clearedFilters[key] = '';
      }
    });
    
    setFilters(clearedFilters);
    setIsApplied(false);
    setHasChanges(true);
    
    message.info('筛选条件已清空');
  }, [platform]);
  
  /**
   * 获取已设置的筛选条件数量
   * @returns {number} 已设置的筛选条件数量
   */
  const getActiveFilterCount = useCallback(() => {
    return Object.values(filters).filter(value => {
      if (typeof value === 'boolean') {
        return value !== getDefaultFilterValues(platform)[Object.keys(filters).find(key => filters[key] === value)];
      }
      return value && value !== '';
    }).length;
  }, [filters, platform]);
  
  /**
   * 检查筛选条件是否为空
   * @returns {boolean} 是否为空
   */
  const isEmpty = useCallback(() => {
    return getActiveFilterCount() === 0;
  }, [getActiveFilterCount]);
  
  /**
   * 获取筛选条件摘要
   * @returns {Array} 筛选条件摘要数组
   */
  const getFilterSummary = useCallback(() => {
    const summary = [];
    const defaultValues = getDefaultFilterValues(platform);
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== '' && value !== defaultValues[key]) {
        summary.push({
          key,
          value,
          label: `${key}: ${value}`
        });
      }
    });
    
    return summary;
  }, [filters, platform]);
  
  // 当平台变更时，重置筛选条件
  useEffect(() => {
    const newDefaultFilters = getDefaultFilterValues(platform);
    setFilters(newDefaultFilters);
    setOriginalFilters(newDefaultFilters);
    setIsApplied(false);
    setHasChanges(false);
  }, [platform]);
  
  return {
    // 状态
    filters,
    isApplied,
    hasChanges,
    
    // 操作方法
    updateFilter,
    updateFilters,
    applyFilters,
    resetFilters,
    clearFilters,
    
    // 工具方法
    getActiveFilterCount,
    isEmpty,
    getFilterSummary,
    
    // 验证方法
    validate: () => validateFilters(platform, filters)
  };
};

export default useFilters;