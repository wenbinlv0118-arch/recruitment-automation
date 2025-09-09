/**
 * HTTP 客户端工具
 * 统一处理API请求，包括错误处理、重试机制、拦截器等
 */

import axios from 'axios';
import { message } from 'antd';
import { REQUEST_CONFIG, ERROR_CONFIG, buildApiUrl, getEnvironmentInfo } from '../config/api';

/**
 * HTTP 客户端类
 */
class HttpClient {
  constructor() {
    this.client = axios.create(REQUEST_CONFIG);
    this.setupInterceptors();
    this.requestQueue = new Map();
  }

  /**
   * 设置请求和响应拦截器
   */
  setupInterceptors() {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        // 添加请求ID用于去重
        const requestId = this.generateRequestId(config);
        config.requestId = requestId;

        // 检查是否有相同的请求正在进行
        if (this.requestQueue.has(requestId)) {
          const cancelToken = axios.CancelToken.source();
          cancelToken.cancel('重复请求已取消');
          config.cancelToken = cancelToken.token;
        } else {
          this.requestQueue.set(requestId, config);
        }

        // 添加时间戳
        config.metadata = {
          startTime: Date.now()
        };

        // 开发环境日志
        if (getEnvironmentInfo().isDevelopment) {
          console.log('🚀 API Request:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            data: config.data,
            params: config.params
          });
        }

        return config;
      },
      (error) => {
        console.error('请求拦截器错误:', error);
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        const { config } = response;
        
        // 从请求队列中移除
        if (config.requestId) {
          this.requestQueue.delete(config.requestId);
        }

        // 计算请求耗时
        const duration = Date.now() - (config.metadata?.startTime || 0);

        // 开发环境日志
        if (getEnvironmentInfo().isDevelopment) {
          console.log('✅ API Response:', {
            method: config.method?.toUpperCase(),
            url: config.url,
            status: response.status,
            duration: `${duration}ms`,
            data: response.data
          });
        }

        return response;
      },
      (error) => {
        const { config } = error;
        
        // 从请求队列中移除
        if (config?.requestId) {
          this.requestQueue.delete(config.requestId);
        }

        // 处理错误
        return this.handleError(error);
      }
    );
  }

  /**
   * 生成请求ID
   * @param {Object} config - 请求配置
   * @returns {string} 请求ID
   */
  generateRequestId(config) {
    const { method, url, data, params } = config;
    const key = JSON.stringify({ method, url, data, params });
    return btoa(key).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  /**
   * 错误处理
   * @param {Error} error - 错误对象
   * @returns {Promise} 拒绝的Promise
   */
  async handleError(error) {
    const { config, response, code, message: errorMessage } = error;

    // 取消的请求不处理
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    // 网络错误
    if (code === 'ECONNABORTED' || errorMessage.includes('timeout')) {
      message.error(ERROR_CONFIG.TIMEOUT_MESSAGE);
      return Promise.reject(new Error(ERROR_CONFIG.TIMEOUT_MESSAGE));
    }

    if (!response) {
      message.error(ERROR_CONFIG.NETWORK_ERROR_MESSAGE);
      return Promise.reject(new Error(ERROR_CONFIG.NETWORK_ERROR_MESSAGE));
    }

    // HTTP 状态码错误
    const { status, data } = response;
    let errorMsg = ERROR_CONFIG.SERVER_ERROR_MESSAGE;

    switch (status) {
      case 400:
        errorMsg = data?.message || '请求参数错误';
        break;
      case 401:
        errorMsg = '未授权，请重新登录';
        // 可以在这里处理登录跳转
        break;
      case 403:
        errorMsg = '权限不足';
        break;
      case 404:
        errorMsg = '请求的资源不存在';
        break;
      case 422:
        errorMsg = data?.message || '数据验证失败';
        break;
      case 429:
        errorMsg = '请求过于频繁，请稍后再试';
        break;
      case 500:
        errorMsg = '服务器内部错误';
        break;
      case 502:
        errorMsg = '网关错误';
        break;
      case 503:
        errorMsg = '服务暂时不可用';
        break;
      default:
        errorMsg = data?.message || `请求失败 (${status})`;
    }

    // 显示错误消息
    message.error(errorMsg);

    // 开发环境日志
    if (getEnvironmentInfo().isDevelopment) {
      console.error('❌ API Error:', {
        method: config?.method?.toUpperCase(),
        url: config?.url,
        status,
        error: errorMsg,
        data: data
      });
    }

    return Promise.reject(new Error(errorMsg));
  }

  /**
   * 重试请求
   * @param {Object} config - 请求配置
   * @param {number} retryCount - 重试次数
   * @returns {Promise} 请求结果
   */
  async retryRequest(config, retryCount = 0) {
    try {
      return await this.client(config);
    } catch (error) {
      if (retryCount < ERROR_CONFIG.RETRY_ATTEMPTS) {
        console.log(`重试请求 (${retryCount + 1}/${ERROR_CONFIG.RETRY_ATTEMPTS}):`, config.url);
        
        // 等待一段时间后重试
        await new Promise(resolve => 
          setTimeout(resolve, ERROR_CONFIG.RETRY_DELAY * (retryCount + 1))
        );
        
        return this.retryRequest(config, retryCount + 1);
      }
      throw error;
    }
  }

  /**
   * GET 请求
   * @param {string} endpoint - API端点
   * @param {Object} params - 查询参数
   * @param {Object} options - 请求选项
   * @returns {Promise} 请求结果
   */
  async get(endpoint, params = {}, options = {}) {
    const config = {
      method: 'GET',
      url: buildApiUrl(endpoint),
      params,
      ...options
    };

    if (options.retry) {
      return this.retryRequest(config);
    }

    return this.client(config);
  }

  /**
   * POST 请求
   * @param {string} endpoint - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise} 请求结果
   */
  async post(endpoint, data = {}, options = {}) {
    const config = {
      method: 'POST',
      url: buildApiUrl(endpoint),
      data,
      ...options
    };

    if (options.retry) {
      return this.retryRequest(config);
    }

    return this.client(config);
  }

  /**
   * PUT 请求
   * @param {string} endpoint - API端点
   * @param {Object} data - 请求数据
   * @param {Object} options - 请求选项
   * @returns {Promise} 请求结果
   */
  async put(endpoint, data = {}, options = {}) {
    const config = {
      method: 'PUT',
      url: buildApiUrl(endpoint),
      data,
      ...options
    };

    if (options.retry) {
      return this.retryRequest(config);
    }

    return this.client(config);
  }

  /**
   * DELETE 请求
   * @param {string} endpoint - API端点
   * @param {Object} options - 请求选项
   * @returns {Promise} 请求结果
   */
  async delete(endpoint, options = {}) {
    const config = {
      method: 'DELETE',
      url: buildApiUrl(endpoint),
      ...options
    };

    if (options.retry) {
      return this.retryRequest(config);
    }

    return this.client(config);
  }

  /**
   * 上传文件
   * @param {string} endpoint - API端点
   * @param {FormData} formData - 文件数据
   * @param {Object} options - 请求选项
   * @returns {Promise} 请求结果
   */
  async upload(endpoint, formData, options = {}) {
    const config = {
      method: 'POST',
      url: buildApiUrl(endpoint),
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      ...options
    };

    return this.client(config);
  }

  /**
   * 下载文件
   * @param {string} endpoint - API端点
   * @param {Object} params - 查询参数
   * @param {Object} options - 请求选项
   * @returns {Promise} 请求结果
   */
  async download(endpoint, params = {}, options = {}) {
    const config = {
      method: 'GET',
      url: buildApiUrl(endpoint),
      params,
      responseType: 'blob',
      ...options
    };

    return this.client(config);
  }

  /**
   * 取消所有请求
   */
  cancelAllRequests() {
    this.requestQueue.clear();
  }

  /**
   * 获取请求统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      pendingRequests: this.requestQueue.size,
      queuedRequests: Array.from(this.requestQueue.keys())
    };
  }
}

// 创建全局实例
const httpClient = new HttpClient();

// 导出便捷方法
export const { get, post, put, delete: del, upload, download } = httpClient;

// 导出类和实例
export { HttpClient };
export default httpClient;