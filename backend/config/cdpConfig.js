/**
 * CDP服务配置模块
 * 管理CDP相关的环境配置和参数
 */

const path = require('path');
const os = require('os');

/**
 * CDP服务配置
 */
const cdpConfig = {
  // Chrome DevTools Protocol 配置
  chrome: {
    // Chrome可执行文件路径（根据环境自动检测）
    executablePath: process.env.CHROME_EXECUTABLE_PATH || getDefaultChromePath(),
    
    // Chrome启动参数 - 优化版本，提升启动速度
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI,VizDisplayCompositor',
      '--disable-ipc-flooding-protection',
      '--enable-features=NetworkService',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-background-networking',
      '--disable-sync',
      '--disable-translate',
      '--disable-default-apps',
      '--disable-component-extensions-with-background-pages',
      '--disable-background-downloads',
      '--disable-add-to-shelf',
      '--disable-client-side-phishing-detection',
      '--disable-datasaver-prompt',
      '--disable-domain-reliability',
      '--disable-features=AudioServiceOutOfProcess',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-default-browser-check',
      '--no-pings',
      '--password-store=basic',
      '--use-gl=swiftshader',
      '--use-angle=swiftshader',
      '--aggressive-cache-discard',
      '--memory-pressure-off',
      '--max_old_space_size=4096',
      '--js-flags=--max-old-space-size=4096'
    ],
    
    // 无头模式配置
    headless: process.env.CDP_HEADLESS !== 'false',
    
    // 调试端口
    debuggingPort: parseInt(process.env.CDP_DEBUG_PORT) || 9222,
    
    // 用户数据目录
    userDataDir: process.env.CDP_USER_DATA_DIR || path.join(os.tmpdir(), 'cdp-chrome-data'),
    
    // 窗口大小
    windowSize: {
      width: parseInt(process.env.CDP_WINDOW_WIDTH) || 1920,
      height: parseInt(process.env.CDP_WINDOW_HEIGHT) || 1080
    }
  },
  
  // WebSocket连接配置
  websocket: {
    // 连接超时时间（毫秒）
    connectionTimeout: parseInt(process.env.CDP_WS_TIMEOUT) || 30000,
    
    // 重连配置
    reconnect: {
      enabled: process.env.CDP_RECONNECT_ENABLED !== 'false',
      maxAttempts: parseInt(process.env.CDP_RECONNECT_MAX_ATTEMPTS) || 5,
      delay: parseInt(process.env.CDP_RECONNECT_DELAY) || 1000,
      backoffMultiplier: parseFloat(process.env.CDP_RECONNECT_BACKOFF) || 1.5
    },
    
    // 心跳检测
    heartbeat: {
      enabled: process.env.CDP_HEARTBEAT_ENABLED !== 'false',
      interval: parseInt(process.env.CDP_HEARTBEAT_INTERVAL) || 30000
    }
  },
  
  // 屏幕录制配置
  screencast: {
    // 录制格式
    format: process.env.CDP_SCREENCAST_FORMAT || 'jpeg',
    
    // 图像质量 (1-100)
    quality: parseInt(process.env.CDP_SCREENCAST_QUALITY) || 80,
    
    // 最大宽度
    maxWidth: parseInt(process.env.CDP_SCREENCAST_MAX_WIDTH) || 1920,
    
    // 最大高度
    maxHeight: parseInt(process.env.CDP_SCREENCAST_MAX_HEIGHT) || 1080,
    
    // 帧率限制 (FPS)
    maxFrameRate: parseInt(process.env.CDP_SCREENCAST_MAX_FPS) || 30,
    
    // 帧缓存大小
    frameBufferSize: parseInt(process.env.CDP_FRAME_BUFFER_SIZE) || 10,
    
    // 压缩配置
    compression: {
      enabled: process.env.CDP_COMPRESSION_ENABLED !== 'false',
      level: parseInt(process.env.CDP_COMPRESSION_LEVEL) || 6
    }
  },
  
  // 性能配置
  performance: {
    // 内存限制 (MB)
    memoryLimit: parseInt(process.env.CDP_MEMORY_LIMIT) || 512,
    
    // CPU限制 (%)
    cpuLimit: parseInt(process.env.CDP_CPU_LIMIT) || 80,
    
    // 监控间隔 (毫秒)
    monitoringInterval: parseInt(process.env.CDP_MONITORING_INTERVAL) || 5000,
    
    // 性能统计
    stats: {
      enabled: process.env.CDP_STATS_ENABLED !== 'false',
      interval: parseInt(process.env.CDP_STATS_INTERVAL) || 10000
    }
  },
  
  // 安全配置
  security: {
    // 允许的域名列表
    allowedDomains: process.env.CDP_ALLOWED_DOMAINS ? 
      process.env.CDP_ALLOWED_DOMAINS.split(',').map(d => d.trim()) : 
      ['localhost', '127.0.0.1'],
    
    // 禁止的URL模式
    blockedUrlPatterns: process.env.CDP_BLOCKED_URLS ? 
      process.env.CDP_BLOCKED_URLS.split(',').map(u => u.trim()) : 
      ['*://*.ads.*', '*://ads.*', '*://analytics.*'],
    
    // 会话超时时间 (毫秒)
    sessionTimeout: parseInt(process.env.CDP_SESSION_TIMEOUT) || 30 * 60 * 1000, // 30分钟
    
    // 最大并发会话数
    maxConcurrentSessions: parseInt(process.env.CDP_MAX_SESSIONS) || 5
  },
  
  // 日志配置
  logging: {
    // 日志级别
    level: process.env.CDP_LOG_LEVEL || 'info',
    
    // 详细模式
    verbose: process.env.CDP_VERBOSE === 'true',
    
    // 性能日志
    performance: process.env.CDP_LOG_PERFORMANCE === 'true',
    
    // 错误追踪
    errorTracking: process.env.CDP_ERROR_TRACKING !== 'false'
  },
  
  // 开发模式配置
  development: {
    // 是否为开发模式
    enabled: process.env.NODE_ENV === 'development',
    
    // 调试模式
    debug: process.env.CDP_DEBUG === 'true',
    
    // 保存调试信息
    saveDebugInfo: process.env.CDP_SAVE_DEBUG === 'true',
    
    // 调试信息保存路径
    debugPath: process.env.CDP_DEBUG_PATH || path.join(os.tmpdir(), 'cdp-debug')
  },
  
  // 集成配置
  integration: {
    // 与Puppeteer集成
    puppeteer: {
      enabled: process.env.CDP_PUPPETEER_INTEGRATION !== 'false',
      shareInstance: process.env.CDP_SHARE_BROWSER === 'true'
    },
    
    // VNC集成
    vnc: {
      enabled: process.env.VNC_ENABLED === 'true',
      display: process.env.DISPLAY || ':1'
    }
  }
};

/**
 * 获取默认Chrome路径
 * @returns {string} Chrome可执行文件路径
 */
function getDefaultChromePath() {
  const platform = os.platform();
  
  switch (platform) {
    case 'win32':
      return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    case 'darwin':
      return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    case 'linux':
      // 检查常见的Linux Chrome路径
      const linuxPaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium'
      ];
      
      const fs = require('fs');
      for (const chromePath of linuxPaths) {
        try {
          if (fs.existsSync(chromePath)) {
            return chromePath;
          }
        } catch (error) {
          // 忽略错误，继续检查下一个路径
        }
      }
      
      return '/usr/bin/google-chrome'; // 默认路径
    default:
      return 'google-chrome';
  }
}

/**
 * 获取环境特定的配置
 * @param {string} environment - 环境名称 ('development', 'production', 'test')
 * @returns {Object} 环境配置
 */
function getEnvironmentConfig(environment = process.env.NODE_ENV || 'development') {
  const baseConfig = { ...cdpConfig };
  
  switch (environment) {
    case 'production':
      return {
        ...baseConfig,
        chrome: {
          ...baseConfig.chrome,
          headless: true,
          args: [
            ...baseConfig.chrome.args,
            '--disable-logging',
            '--silent'
          ]
        },
        logging: {
          ...baseConfig.logging,
          level: 'warn',
          verbose: false
        },
        development: {
          ...baseConfig.development,
          enabled: false,
          debug: false
        }
      };
      
    case 'test':
      return {
        ...baseConfig,
        chrome: {
          ...baseConfig.chrome,
          headless: true,
          args: [
            ...baseConfig.chrome.args,
            '--disable-logging',
            '--silent',
            '--disable-web-security'
          ]
        },
        security: {
          ...baseConfig.security,
          sessionTimeout: 5 * 60 * 1000, // 5分钟
          maxConcurrentSessions: 2
        },
        performance: {
          ...baseConfig.performance,
          memoryLimit: 256,
          monitoringInterval: 1000
        }
      };
      
    case 'development':
    default:
      return {
        ...baseConfig,
        chrome: {
          ...baseConfig.chrome,
          headless: process.env.CDP_HEADLESS !== 'false'
        },
        logging: {
          ...baseConfig.logging,
          level: 'debug',
          verbose: true,
          performance: true
        },
        development: {
          ...baseConfig.development,
          enabled: true,
          debug: true
        }
      };
  }
}

/**
 * 验证配置
 * @param {Object} config - 配置对象
 * @returns {Object} 验证结果
 */
function validateConfig(config = cdpConfig) {
  const errors = [];
  const warnings = [];
  
  // 检查Chrome可执行文件路径
  if (config.chrome.executablePath) {
    const fs = require('fs');
    try {
      if (!fs.existsSync(config.chrome.executablePath)) {
        errors.push(`Chrome可执行文件不存在: ${config.chrome.executablePath}`);
      }
    } catch (error) {
      warnings.push(`无法验证Chrome路径: ${error.message}`);
    }
  }
  
  // 检查端口范围
  if (config.chrome.debuggingPort < 1024 || config.chrome.debuggingPort > 65535) {
    errors.push(`调试端口超出有效范围: ${config.chrome.debuggingPort}`);
  }
  
  // 检查内存限制
  if (config.performance.memoryLimit < 128) {
    warnings.push(`内存限制可能过低: ${config.performance.memoryLimit}MB`);
  }
  
  // 检查帧率设置
  if (config.screencast.maxFrameRate > 60) {
    warnings.push(`帧率设置可能过高: ${config.screencast.maxFrameRate}FPS`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

module.exports = {
  cdpConfig,
  getEnvironmentConfig,
  validateConfig,
  getDefaultChromePath
};