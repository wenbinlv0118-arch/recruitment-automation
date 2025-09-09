/**
 * API客户端工具模块
 * 提供统一的API调用接口，自动处理URL构建和错误处理
 */

import { buildApiUrl, REQUEST_CONFIG, ERROR_CONFIG } from '../config/api';

/**
 * 通用API调用函数
 * @param {string} endpoint - API端点路径
 * @param {Object} options - fetch选项
 * @returns {Promise} API响应
 */
export const apiCall = async (endpoint, options = {}) => {
  const url = buildApiUrl(endpoint);
  const config = {
    ...REQUEST_CONFIG,
    ...options,
    headers: {
      ...REQUEST_CONFIG.headers,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // 检查响应内容类型
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  } catch (error) {
    console.error(`API调用失败 [${endpoint}]:`, error);
    throw error;
  }
};

/**
 * GET请求
 * @param {string} endpoint - API端点路径
 * @param {Object} options - 额外选项
 * @returns {Promise} API响应
 */
export const apiGet = (endpoint, options = {}) => {
  return apiCall(endpoint, {
    method: 'GET',
    ...options
  });
};

/**
 * POST请求
 * @param {string} endpoint - API端点路径
 * @param {Object} data - 请求数据
 * @param {Object} options - 额外选项
 * @returns {Promise} API响应
 */
export const apiPost = (endpoint, data = null, options = {}) => {
  return apiCall(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : null,
    ...options
  });
};

/**
 * PUT请求
 * @param {string} endpoint - API端点路径
 * @param {Object} data - 请求数据
 * @param {Object} options - 额外选项
 * @returns {Promise} API响应
 */
export const apiPut = (endpoint, data = null, options = {}) => {
  return apiCall(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : null,
    ...options
  });
};

/**
 * DELETE请求
 * @param {string} endpoint - API端点路径
 * @param {Object} options - 额外选项
 * @returns {Promise} API响应
 */
export const apiDelete = (endpoint, options = {}) => {
  return apiCall(endpoint, {
    method: 'DELETE',
    ...options
  });
};

/**
 * 文件上传请求
 * @param {string} endpoint - API端点路径
 * @param {FormData} formData - 表单数据
 * @param {Object} options - 额外选项
 * @returns {Promise} API响应
 */
export const apiUpload = (endpoint, formData, options = {}) => {
  const uploadOptions = {
    method: 'POST',
    body: formData,
    ...options
  };
  
  // 移除Content-Type头，让浏览器自动设置
  if (uploadOptions.headers) {
    delete uploadOptions.headers['Content-Type'];
  }
  
  return apiCall(endpoint, uploadOptions);
};

export default {
  apiCall,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  apiUpload
};