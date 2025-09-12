/**
 * VNC服务配置文件
 * 用于管理VNC远程桌面服务的连接参数
 */

// VNC服务器配置
export const VNC_CONFIG = {
  // 开发环境配置
  development: {
    serverUrl: 'http://localhost',
    webPort: '6080',
    vncPort: '5900',
    password: 'vnc123'
  },
  
  // 生产环境配置 - Zeabur部署
  production: {
    serverUrl: 'https://vnc-browser-recruitment.zeabur.app',
    webPort: '', // HTTPS默认端口
    vncPort: '5900',
    password: 'vnc123'
  }
};

// 当前环境检测
const getCurrentEnvironment = () => {
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  return 'development';
};

// 获取当前环境的VNC配置
export const getCurrentVncConfig = () => {
  const env = getCurrentEnvironment();
  return VNC_CONFIG[env];
};

// 构建VNC Web客户端URL
export const buildVncUrl = (config = getCurrentVncConfig()) => {
  const { serverUrl, webPort } = config;
  const port = webPort ? `:${webPort}` : '';
  const baseUrl = `${serverUrl}${port}`;
  
  // noVNC客户端参数
  const params = new URLSearchParams({
    autoconnect: 'true',
    resize: 'scale',
    quality: '6',
    compression: '2'
  });
  
  return `${baseUrl}/vnc.html?${params.toString()}`;
};

// VNC连接状态检查
export const checkVncConnection = async (config = getCurrentVncConfig()) => {
  try {
    const { serverUrl, webPort } = config;
    const port = webPort ? `:${webPort}` : '';
    const healthUrl = `${serverUrl}${port}/health`;
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      timeout: 5000
    });
    
    return response.ok;
  } catch (error) {
    console.warn('VNC连接检查失败:', error);
    return false;
  }
};

// 默认导出当前配置
export default getCurrentVncConfig();