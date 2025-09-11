/**
 * API 配置模块
 * 根据环境变量动态配置API端点
 */

// 获取环境变量
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

// API 基础配置
const API_CONFIG = {
  // 开发环境配置
  development: {
    baseURL: '', // 开发环境使用代理，无需基础URL
    timeout: 10000,
    withCredentials: false
  },
  // 生产环境配置
  production: {
    baseURL: process.env.REACT_APP_API_BASE_URL || 'https://recruitment-automation-backend.zeabur.app',
    timeout: 15000,
    withCredentials: false
  }
};

// 获取当前环境配置
const currentConfig = isDevelopment ? API_CONFIG.development : API_CONFIG.production;

// API 端点配置
export const API_ENDPOINTS = {
  // 基础配置
  BASE_URL: currentConfig.baseURL,
  TIMEOUT: currentConfig.timeout,
  
  // 认证相关
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    PROFILE: '/auth/profile'
  },
  
  // 简历库管理
  RESUME: {
    LIST: '/resume-library',
    DETAIL: '/resume-library',
    CREATE: '/resume-library',
    UPDATE: '/resume-library',
    DELETE: '/resume-library',
    UPLOAD: '/resume-library/upload',
    DOWNLOAD: '/resume-library/download'
  },
  
  // 岗位管理
  POSITIONS: {
    LIST: '/positions',
    DETAIL: '/positions',
    CREATE: '/positions',
    UPDATE: '/positions',
    DELETE: '/positions',
    STATS: '/positions/stats'
  },
  
  // 任务管理
  TASKS: {
    LIST: '/tasks',
    DETAIL: '/tasks',
    CREATE: '/tasks',
    UPDATE: '/tasks',
    DELETE: '/tasks',
    STATS: '/tasks/stats',
    UPDATE_CANDIDATE_STATUS: '/tasks',
    ADD_COMMENT: '/tasks'
  },
  
  // 知识库
  KNOWLEDGE: {
    CHAT: '/knowledge/chat',
    DOCUMENTS: '/knowledge/documents',
    UPLOAD: '/knowledge/upload',
    DELETE: '/knowledge/delete'
  },
  
  // Boss直聘
  BOSS_ZHIPIN: {
    START_SMART_SEARCH: '/boss-zhipin/start-smart-search',
    START_BROWSING: '/boss-zhipin/start-browsing',
    STOP_BROWSING: '/boss-zhipin/stop-browsing',
    RESET_BROWSING: '/boss-zhipin/reset-browsing',
    GET_STATUS: '/boss-zhipin/status',
    GET_BROWSING_STATUS: '/boss-zhipin/browsing-status',
    STOP_SERVICE: '/boss-zhipin/stop',
    INIT_SERVICE: '/boss-zhipin/init',
    CLOSE_SERVICE: '/boss-zhipin/close',
    GET_LOGIN_STATUS: '/boss-zhipin/login-status',
    EXECUTE_STEP: '/boss-zhipin/execute-step',
    START_RESUME_PROCESSING: '/boss-zhipin/start-resume-processing',
    STOP_RESUME_PROCESSING: '/boss-zhipin/stop-resume-processing',
    GET_RESUME_PROCESSING_STATUS: '/boss-zhipin/resume-processing-status',
    PROCESS_RESUME: '/boss-zhipin/process-resume',
    NAVIGATE_TO_COMMUNICATION: '/boss-zhipin/navigate-to-communication'
  },
  
  // 智联招聘
  ZHILIAN: {
    START_SMART_SEARCH: '/zhilian/start-smart-search',
    START_BROWSING: '/zhilian/start-browsing',
    STOP_BROWSING: '/zhilian/stop-browsing',
    RESET_BROWSING: '/zhilian/reset-browsing',
    GET_STATUS: '/zhilian/status',
    GET_BROWSING_STATUS: '/zhilian/browsing-status',
    STOP_SERVICE: '/zhilian/stop',
    INIT_SERVICE: '/zhilian/init',
    CLOSE_SERVICE: '/zhilian/close',
    GET_LOGIN_STATUS: '/zhilian/login-status',
    EXECUTE_STEP: '/zhilian/execute-step',
    START_RESUME_PROCESSING: '/zhilian/start-resume-processing',
    STOP_RESUME_PROCESSING: '/zhilian/stop-resume-processing',
    GET_RESUME_PROCESSING_STATUS: '/zhilian/resume-processing-status',
    PROCESS_RESUME: '/zhilian/process-resume',
    NAVIGATE_TO_COMMUNICATION: '/zhilian/navigate-to-communication',
    NAVIGATE_TO_MODE: '/zhilian/navigate-to-mode',
    GET_FILTER_CONFIG: '/zhilian/filter-config'
  },
  
  // 公司搜索
  COMPANY_SEARCH: {
    SEARCH: '/company-search',
    DETAIL: '/company-search',
    ANALYSIS: '/company-search/analysis',
    INDUSTRY_ANALYSIS: '/company-search/industry-analysis',
    HISTORY: '/company-search/history',
    FOLLOW: '/company-search/follow',
    BATCH_ANALYSIS: '/company-search/batch-analysis',
    SAVE_SEARCH: '/company-search/save-search'
  }
};

// WebSocket 配置
export const WEBSOCKET_CONFIG = {
  URL: isDevelopment 
    ? 'ws://localhost:5001' 
    : (process.env.REACT_APP_SOCKET_URL || 'wss://recruitment-automation-backend.zeabur.app'),
  RECONNECT_INTERVAL: 3000,
  MAX_RECONNECT_ATTEMPTS: 5
};

// Supabase 配置
export const SUPABASE_CONFIG = {
  URL: process.env.REACT_APP_SUPABASE_URL,
  ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY
};

// 请求配置
export const REQUEST_CONFIG = {
  baseURL: currentConfig.baseURL,
  timeout: currentConfig.timeout,
  withCredentials: currentConfig.withCredentials,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// 错误处理配置
export const ERROR_CONFIG = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  TIMEOUT_MESSAGE: '请求超时，请检查网络连接',
  NETWORK_ERROR_MESSAGE: '网络连接失败，请稍后重试',
  SERVER_ERROR_MESSAGE: '服务器错误，请联系管理员'
};

// 功能开关
export const FEATURE_FLAGS = {
  ENABLE_DEBUG: process.env.REACT_APP_ENABLE_DEBUG === 'true',
  ENABLE_MOCK_DATA: process.env.REACT_APP_ENABLE_MOCK_DATA === 'true',
  ENABLE_ANALYTICS: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  ENABLE_SERVICE_WORKER: process.env.REACT_APP_ENABLE_SERVICE_WORKER === 'true'
};

// 文件上传配置
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: parseInt(process.env.REACT_APP_MAX_FILE_SIZE) || 10485760, // 10MB
  ALLOWED_FILE_TYPES: process.env.REACT_APP_ALLOWED_FILE_TYPES?.split(',') || ['.pdf', '.docx', '.txt'],
  CHUNK_SIZE: 1024 * 1024 // 1MB chunks
};

// 缓存配置
export const CACHE_CONFIG = {
  DURATION: parseInt(process.env.REACT_APP_CACHE_DURATION) || 3600000, // 1小时
  KEYS: {
    USER_PROFILE: 'user_profile',
    POSITIONS: 'positions',
    TASKS: 'tasks',
    COMPANIES: 'companies'
  }
};

/**
 * 构建完整的API URL
 * @param {string} endpoint - API端点
 * @returns {string} 完整的API URL
 */
export const buildApiUrl = (endpoint) => {
  if (isDevelopment) {
    // 开发环境使用代理
    return `/api${endpoint}`;
  }
  // 生产环境使用完整URL，确保包含/api前缀
  return `${currentConfig.baseURL}/api${endpoint}`;
};

/**
 * 获取环境信息
 * @returns {Object} 环境信息
 */
export const getEnvironmentInfo = () => {
  return {
    isDevelopment,
    isProduction,
    nodeEnv: process.env.NODE_ENV,
    apiBaseUrl: currentConfig.baseURL,
    version: process.env.REACT_APP_VERSION || '1.0.0'
  };
};

// 导出默认配置
export default {
  API_ENDPOINTS,
  WEBSOCKET_CONFIG,
  SUPABASE_CONFIG,
  REQUEST_CONFIG,
  ERROR_CONFIG,
  FEATURE_FLAGS,
  UPLOAD_CONFIG,
  CACHE_CONFIG,
  buildApiUrl,
  getEnvironmentInfo
};