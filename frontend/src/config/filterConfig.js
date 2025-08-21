/**
 * 招聘网站筛选条件配置模块
 * 支持不同招聘网站的筛选条件适配
 */

// Boss直聘筛选条件配置
const bossZhipinFilters = {
  education: {
    label: '学历要求',
    type: 'select',
    placeholder: '选择学历要求',
    options: [
      { value: '', label: '不限' },
      { value: '本科及以上', label: '本科及以上' },
      { value: '硕士及以上', label: '硕士及以上' },
      { value: '博士', label: '博士' },
      { value: '自定义', label: '自定义' }
    ]
  },
  university: {
    label: '院校要求',
    type: 'select',
    placeholder: '选择院校要求',
    options: [
      { value: '', label: '不限' },
      { value: '统招本科', label: '统招本科' },
      { value: '双一流院校', label: '双一流院校' },
      { value: '211院校', label: '211院校' },
      { value: '985院校', label: '985院校' },
      { value: '留学生', label: '留学生' },
      { value: 'QS100', label: 'QS100' },
      { value: 'QS500', label: 'QS500' }
    ]
  },
  experience: {
    label: '经验要求',
    type: 'select',
    placeholder: '选择经验要求',
    options: [
      { value: '', label: '不限' },
      { value: '在校/应届', label: '在校/应届' },
      { value: '24年毕业', label: '24年毕业' },
      { value: '25年毕业', label: '25年毕业' },
      { value: '25年后毕业', label: '25年后毕业' },
      { value: '1-3年', label: '1-3年' },
      { value: '3-5年', label: '3-5年' },
      { value: '5-10年', label: '5-10年' },
      { value: '自定义', label: '自定义' }
    ]
  },
  age: {
    label: '年龄要求',
    type: 'select',
    placeholder: '选择年龄要求',
    options: [
      { value: '', label: '不限' },
      { value: '20-25', label: '20-25' },
      { value: '25-30', label: '25-30' },
      { value: '30-35', label: '30-35' },
      { value: '35-40', label: '35-40' },
      { value: '40-50', label: '40-50' },
      { value: '50以上', label: '50以上' },
      { value: '自定义', label: '自定义' }
    ]
  },
  isActive: {
    label: '仅显示活跃候选人',
    type: 'switch',
    defaultValue: true
  }
};

// 智联招聘筛选条件配置
const zhilianFilters = {
  location: {
    label: '工作地点',
    type: 'select',
    placeholder: '选择工作地点',
    options: [
      { value: '', label: '不限' },
      { value: '北京', label: '北京' },
      { value: '上海', label: '上海' },
      { value: '广州', label: '广州' },
      { value: '深圳', label: '深圳' },
      { value: '杭州', label: '杭州' },
      { value: '成都', label: '成都' },
      { value: '武汉', label: '武汉' },
      { value: '西安', label: '西安' },
      { value: '南京', label: '南京' },
      { value: '苏州', label: '苏州' },
      { value: '天津', label: '天津' },
      { value: '重庆', label: '重庆' },
      { value: '青岛', label: '青岛' },
      { value: '大连', label: '大连' },
      { value: '厦门', label: '厦门' },
      { value: '长沙', label: '长沙' },
      { value: '郑州', label: '郑州' },
      { value: '济南', label: '济南' },
      { value: '福州', label: '福州' }
    ]
  },
  position: {
    label: '寻聘职位',
    type: 'select',
    placeholder: '选择寻聘职位',
    options: [
      { value: '', label: '不限' },
      { value: '实施工程师', label: '实施工程师' }
    ]
  },
  education: {
    label: '学历要求',
    type: 'select',
    placeholder: '选择学历要求',
    options: [
      { value: '', label: '不限' },
      { value: '大专及以上', label: '大专及以上' },
      { value: '本科及以上', label: '本科及以上' },
      { value: '硕士及以上', label: '硕士及以上' }
    ]
  },
  age: {
    label: '年龄要求',
    type: 'select',
    placeholder: '选择年龄要求',
    options: [
      { value: '', label: '不限' },
      { value: '20-25', label: '20-25' },
      { value: '25-30', label: '25-30' },
      { value: '30-35', label: '30-35' },
      { value: '35-40', label: '35-40' },
      { value: '40以上', label: '40以上' }
    ]
  },
  experience: {
    label: '经验要求',
    type: 'select',
    placeholder: '选择经验要求',
    options: [
      { value: '', label: '不限' },
      { value: '无经验', label: '无经验' },
      { value: '1-3年', label: '1-3年' },
      { value: '3-5年', label: '3-5年' },
      { value: '5-10年', label: '5-10年' }
    ]
  },
  university: {
    label: '院校要求',
    type: 'select',
    placeholder: '选择院校要求',
    options: [
      { value: '', label: '不限' },
      { value: '统招', label: '统招' },
      { value: '985', label: '985' },
      { value: '211', label: '211' },
      { value: '双一流', label: '双一流' },
      { value: '海外院校', label: '海外院校' }
    ]
  }
};

// 前程无忧筛选条件配置
const qianchengFilters = {
  education: {
    label: '学历要求',
    type: 'select',
    placeholder: '选择学历要求',
    options: [
      { value: '', label: '不限' },
      { value: '初中及以下', label: '初中及以下' },
      { value: '高中/中专/技校', label: '高中/中专/技校' },
      { value: '大专', label: '大专' },
      { value: '本科', label: '本科' },
      { value: '硕士', label: '硕士' },
      { value: '博士', label: '博士' }
    ]
  },
  experience: {
    label: '工作经验',
    type: 'select',
    placeholder: '选择工作经验',
    options: [
      { value: '', label: '不限' },
      { value: '无经验', label: '无经验' },
      { value: '1年以下', label: '1年以下' },
      { value: '1-3年', label: '1-3年' },
      { value: '3-5年', label: '3-5年' },
      { value: '5-10年', label: '5-10年' },
      { value: '10年以上', label: '10年以上' }
    ]
  },
  salary: {
    label: '月薪范围',
    type: 'select',
    placeholder: '选择月薪范围',
    options: [
      { value: '', label: '不限' },
      { value: '2000以下', label: '2000以下' },
      { value: '2000-4000', label: '2000-4000' },
      { value: '4000-6000', label: '4000-6000' },
      { value: '6000-8000', label: '6000-8000' },
      { value: '8000-10000', label: '8000-10000' },
      { value: '10000-15000', label: '10000-15000' },
      { value: '15000-25000', label: '15000-25000' },
      { value: '25000以上', label: '25000以上' }
    ]
  },
  jobType: {
    label: '职位类型',
    type: 'select',
    placeholder: '选择职位类型',
    options: [
      { value: '', label: '不限' },
      { value: '全职', label: '全职' },
      { value: '兼职', label: '兼职' },
      { value: '实习', label: '实习' },
      { value: '劳务派遣', label: '劳务派遣' }
    ]
  }
};

// 拉勾网筛选条件配置
const lagouFilters = {
  experience: {
    label: '工作经验',
    type: 'select',
    placeholder: '选择工作经验',
    options: [
      { value: '', label: '不限' },
      { value: '应届毕业生', label: '应届毕业生' },
      { value: '1-3年', label: '1-3年' },
      { value: '3-5年', label: '3-5年' },
      { value: '5-10年', label: '5-10年' },
      { value: '10年以上', label: '10年以上' }
    ]
  },
  salary: {
    label: '薪资范围',
    type: 'select',
    placeholder: '选择薪资范围',
    options: [
      { value: '', label: '不限' },
      { value: '2k以下', label: '2k以下' },
      { value: '2k-5k', label: '2k-5k' },
      { value: '5k-10k', label: '5k-10k' },
      { value: '10k-15k', label: '10k-15k' },
      { value: '15k-25k', label: '15k-25k' },
      { value: '25k-50k', label: '25k-50k' },
      { value: '50k以上', label: '50k以上' }
    ]
  },
  companyStage: {
    label: '公司阶段',
    type: 'select',
    placeholder: '选择公司阶段',
    options: [
      { value: '', label: '不限' },
      { value: '未融资', label: '未融资' },
      { value: '天使轮', label: '天使轮' },
      { value: 'A轮', label: 'A轮' },
      { value: 'B轮', label: 'B轮' },
      { value: 'C轮', label: 'C轮' },
      { value: 'D轮及以上', label: 'D轮及以上' },
      { value: '已上市', label: '已上市' },
      { value: '不需要融资', label: '不需要融资' }
    ]
  },
  companySize: {
    label: '公司规模',
    type: 'select',
    placeholder: '选择公司规模',
    options: [
      { value: '', label: '不限' },
      { value: '少于15人', label: '少于15人' },
      { value: '15-50人', label: '15-50人' },
      { value: '50-150人', label: '50-150人' },
      { value: '150-500人', label: '150-500人' },
      { value: '500-2000人', label: '500-2000人' },
      { value: '2000人以上', label: '2000人以上' }
    ]
  }
};

// 招聘网站配置映射
const PLATFORM_FILTERS = {
  'boss-zhipin': bossZhipinFilters,
  'zhilian': zhilianFilters,
  'qiancheng': qianchengFilters,
  'lagou': lagouFilters
};

// 默认筛选条件值
const DEFAULT_FILTER_VALUES = {
  'boss-zhipin': {
    education: '',
    university: '',
    experience: '',
    age: '',
    isActive: true
  },
  'zhilian': {
    location: '',
    position: '',
    education: '',
    age: '',
    experience: '',
    university: ''
  },
  'qiancheng': {
    education: '',
    experience: '',
    salary: '',
    jobType: ''
  },
  'lagou': {
    experience: '',
    salary: '',
    companyStage: '',
    companySize: ''
  }
};

/**
 * 获取指定平台的筛选条件配置
 * @param {string} platform - 平台标识
 * @returns {Object} 筛选条件配置
 */
export const getFilterConfig = (platform) => {
  return PLATFORM_FILTERS[platform] || {};
};

/**
 * 获取指定平台的默认筛选条件值
 * @param {string} platform - 平台标识
 * @returns {Object} 默认筛选条件值
 */
export const getDefaultFilterValues = (platform) => {
  return DEFAULT_FILTER_VALUES[platform] || {};
};

/**
 * 获取所有支持的平台列表
 * @returns {Array} 平台列表
 */
export const getSupportedPlatforms = () => {
  return Object.keys(PLATFORM_FILTERS);
};

/**
 * 验证筛选条件值是否有效
 * @param {string} platform - 平台标识
 * @param {Object} filters - 筛选条件值
 * @returns {boolean} 是否有效
 */
export const validateFilters = (platform, filters) => {
  const config = getFilterConfig(platform);
  
  for (const [key, value] of Object.entries(filters)) {
    if (!config[key]) {
      console.warn(`Unknown filter key: ${key} for platform: ${platform}`);
      continue;
    }
    
    const filterConfig = config[key];
    
    // 验证选择类型的值
    if (filterConfig.type === 'select' && value) {
      const validValues = filterConfig.options.map(option => option.value);
      if (!validValues.includes(value)) {
        console.warn(`Invalid filter value: ${value} for key: ${key}`);
        return false;
      }
    }
    
    // 验证开关类型的值
    if (filterConfig.type === 'switch' && typeof value !== 'boolean') {
      console.warn(`Invalid switch value: ${value} for key: ${key}`);
      return false;
    }
  }
  
  return true;
};

const filterConfigExports = {
  getFilterConfig,
  getDefaultFilterValues,
  getSupportedPlatforms,
  validateFilters,
  PLATFORM_FILTERS,
  DEFAULT_FILTER_VALUES
};

export default filterConfigExports;