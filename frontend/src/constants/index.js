// 导入API配置
import { API_ENDPOINTS as API_CONFIG } from '../config/api';

// API端点（保持向后兼容）
export const API_ENDPOINTS = {
  RESUME_LIBRARY: '/resume-library',
  POSITIONS: '/positions',
  TASKS: '/tasks',
  KNOWLEDGE: '/knowledge',
  DOCUMENTS: '/documents'
};

// 完整的API配置
export const API_CONFIG_FULL = API_CONFIG;

// 消息类型
export const MESSAGE_TYPES = {
  NORMAL: 'normal',
  COT: 'cot',
  THINKING: 'thinking'
};

// 菜单项
export const MENU_ITEMS = [
  { key: '1', label: 'AI对话', icon: 'RobotOutlined' },
  { key: '2', label: '简历库', icon: 'FileTextOutlined' },
  { key: '3', label: '岗位管理', icon: 'BarChartOutlined' },
  { key: '4', label: '任务管理', icon: 'BookOutlined' },
  { key: '5', label: '知识库', icon: 'FolderOutlined' },
  { key: '6', label: '浏览器', icon: 'GlobalOutlined' }
];

// 文件类型
export const FILE_TYPES = {
  PDF: '.pdf',
  DOCX: '.docx',
  TXT: '.txt'
};

// 状态常量
export const STATUS = {
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  IDLE: 'idle'
};

// 任务状态
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// 任务优先级
export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// 岗位类型
export const POSITION_TYPES = [
  '全职',
  '兼职',
  '实习',
  '外包',
  '项目制'
];

// 工作经验要求
export const EXPERIENCE_LEVELS = [
  '应届毕业生',
  '1-3年',
  '3-5年',
  '5-10年',
  '10年以上'
];

// 教育程度
export const EDUCATION_LEVELS = [
  '高中',
  '大专',
  '本科',
  '硕士',
  '博士'
];

// 薪资范围
export const SALARY_RANGES = [
  '3K以下',
  '3K-5K',
  '5K-8K',
  '8K-12K',
  '12K-20K',
  '20K-30K',
  '30K-50K',
  '50K以上'
];