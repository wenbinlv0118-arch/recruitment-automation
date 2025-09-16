/**
 * 环境配置管理模块
 * 统一处理不同环境下的浏览器启动配置和环境检测
 */

const os = require('os');
const logger = require('../utils/logger');

/**
 * 环境类型枚举
 */
const ENVIRONMENT_TYPES = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  ZEABUR: 'zeabur',
  LOCAL_PROD: 'local_production'
};

/**
 * 平台类型枚举
 */
const PLATFORM_TYPES = {
  MACOS: 'darwin',
  LINUX: 'linux',
  WINDOWS: 'win32'
};

class EnvironmentConfig {
  constructor() {
    this.platform = os.platform();
    this.environment = this.detectEnvironment();
    this.config = this.generateConfig();
  }

  /**
   * 检测当前运行环境
   * @returns {string} 环境类型
   */
  detectEnvironment() {
    // Zeabur 云平台环境
    if (process.env.ZEABUR_ENVIRONMENT) {
      return ENVIRONMENT_TYPES.ZEABUR;
    }
    
    // 生产环境
    if (process.env.NODE_ENV === 'production') {
      return ENVIRONMENT_TYPES.PRODUCTION;
    }
    
    // 强制无头模式（用于本地测试）
    if (process.env.BROWSER_HEADLESS === 'true') {
      return ENVIRONMENT_TYPES.LOCAL_PROD;
    }
    
    // 默认开发环境
    return ENVIRONMENT_TYPES.DEVELOPMENT;
  }

  /**
   * 生成环境配置
   * @returns {Object} 配置对象
   */
  generateConfig() {
    const baseConfig = {
      environment: this.environment,
      platform: this.platform,
      isProduction: this.isProduction(),
      shouldUseHeadless: this.shouldUseHeadless(),
      browserConfig: this.getBrowserConfig()
    };

    logger.info(`环境配置已生成: ${this.environment} on ${this.platform}`);
    return baseConfig;
  }

  /**
   * 判断是否为生产环境
   * @returns {boolean}
   */
  isProduction() {
    return [
      ENVIRONMENT_TYPES.PRODUCTION,
      ENVIRONMENT_TYPES.ZEABUR,
      ENVIRONMENT_TYPES.LOCAL_PROD
    ].includes(this.environment);
  }

  /**
   * 判断是否应该使用无头模式
   * @returns {boolean}
   */
  shouldUseHeadless() {
    // 生产环境或云平台环境必须使用无头模式
    if (this.environment === ENVIRONMENT_TYPES.ZEABUR || 
        this.environment === ENVIRONMENT_TYPES.PRODUCTION ||
        this.environment === ENVIRONMENT_TYPES.LOCAL_PROD) {
      return true;
    }
    
    // Mac 开发环境的特殊处理
    if (this.platform === PLATFORM_TYPES.MACOS && 
        this.environment === ENVIRONMENT_TYPES.DEVELOPMENT) {
      // Mac系统默认有图形界面，不需要检查DISPLAY环境变量
      // 只有在明确设置了BROWSER_HEADLESS=true时才使用无头模式
      if (process.env.BROWSER_HEADLESS === 'true') {
        logger.info('Mac环境检测到BROWSER_HEADLESS=true，使用无头模式');
        return true;
      }
      logger.info('Mac开发环境使用有头模式');
      return false;
    }
    
    // Linux环境检查显示配置
    if (this.platform === PLATFORM_TYPES.LINUX) {
      const hasDisplay = process.env.DISPLAY || process.env.WAYLAND_DISPLAY;
      if (!hasDisplay) {
        logger.warn('Linux环境未检测到显示配置，将使用无头模式');
        return true;
      }
    }
    
    return false;
  }

  /**
   * 获取浏览器配置
   * @returns {Object} 浏览器启动配置
   */
  getBrowserConfig() {
    const shouldUseHeadless = this.shouldUseHeadless();
    
    const config = {
      // 生产环境使用headless模式
      headless: shouldUseHeadless,
      args: this.getBrowserArgs(),
      timeout: this.getBrowserTimeout(),
      options: {
        // 确保在headless模式下禁用远程调试
        ...(shouldUseHeadless && {
          devtools: false,
          // 忽略可能导致远程调试冲突的默认参数
          ignoreDefaultArgs: [
            '--enable-automation',
            '--enable-blink-features=IdleDetection',
            '--remote-debugging-pipe',
            '--remote-debugging-port'
          ]
        })
      }
    };

    return config;
  }

  /**
   * 获取浏览器启动参数
   * @returns {Array} 启动参数数组
   */
  getBrowserArgs() {
    const baseArgs = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor',
      // D-Bus 错误修复参数 - 全面禁用
      '--no-dbus',
      '--disable-dbus',
      '--disable-system-font-check',
      '--disable-font-subpixel-positioning',
      '--disable-sync',
      '--disable-translate',
      '--disable-features=TranslateUI',
      
      // 系统服务和IPC禁用
      '--disable-accessibility',
      '--disable-component-update',
      '--disable-default-apps',
      '--disable-domain-reliability',
      '--disable-client-side-phishing-detection',
      '--disable-popup-blocking',
      '--no-service-autorun',
      '--disable-hang-monitor',
      '--disable-prompt-on-repost',
      
      // 媒体和硬件访问禁用
      '--disable-audio-output',
      '--disable-audio-input',
      '--disable-notifications',
      
      // 网络和更新服务禁用
      '--disable-remote-fonts',
      
      // 内存和稳定性优化参数
      '--max-old-space-size=512',
      '--memory-pressure-off',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      '--disable-ipc-flooding-protection',
      '--single-process'
    ];

    // 生产环境额外参数
    if (this.isProduction()) {
      baseArgs.push(
        '--disable-plugins',
        '--disable-remote-fonts',
        '--no-remote-debugging-port',
        '--disable-blink-features=AutomationControlled',
        // 明确禁用所有远程调试功能
        '--disable-remote-debugging',
        '--disable-dev-tools',
        '--disable-extensions-http-throttling',
        '--disable-component-extensions-with-background-pages',
        // 生产环境内存和进程优化
        '--max_old_space_size=256',
        '--disable-crash-reporter',
        '--disable-logging',
        '--disable-gpu-process-crash-limit',
        '--disable-hang-monitor',
        '--disable-prompt-on-repost',
        '--disable-client-side-phishing-detection',
        '--disable-sync',
        '--metrics-recording-only',
        '--no-crash-upload'
      );
    }

    // Mac 环境特殊优化
    if (this.platform === PLATFORM_TYPES.MACOS) {
      baseArgs.push(
        '--disable-gpu-sandbox',
        '--disable-software-rasterizer',
        '--disable-background-timer-throttling'
      );
    }

    // Linux 容器环境优化
    if (this.platform === PLATFORM_TYPES.LINUX && this.isProduction()) {
      baseArgs.push(
        '--disable-dev-shm-usage',
        '--disable-extensions',
        '--disable-default-apps'
      );
    }

    return baseArgs;
  }

  /**
   * 获取浏览器超时配置
   * @returns {number} 超时时间（毫秒）
   */
  getBrowserTimeout() {
    if (this.isProduction()) {
      return 60000; // 生产环境 60 秒
    }
    return 30000; // 开发环境 30 秒
  }

  /**
   * 获取当前配置
   * @returns {Object} 配置对象
   */
  getConfig() {
    return this.config;
  }

  /**
   * 打印配置信息
   */
  printConfig() {
    logger.info('=== 环境配置信息 ===');
    logger.info(`环境类型: ${this.environment}`);
    logger.info(`平台类型: ${this.platform}`);
    logger.info(`生产模式: ${this.isProduction()}`);
    logger.info(`无头模式: ${this.shouldUseHeadless()}`);
    logger.info(`浏览器参数数量: ${this.config.browserConfig.args.length}`);
    logger.info('==================');
  }

  /**
   * 验证环境配置
   * @returns {Object} 验证结果
   */
  validateConfig() {
    const issues = [];
    const warnings = [];

    // 检查 Mac 开发环境的显示配置
    if (this.platform === PLATFORM_TYPES.MACOS && 
        this.environment === ENVIRONMENT_TYPES.DEVELOPMENT &&
        !this.shouldUseHeadless()) {
      const hasDisplay = process.env.DISPLAY || process.env.WAYLAND_DISPLAY;
      if (!hasDisplay) {
        warnings.push('Mac环境建议设置DISPLAY环境变量或使用无头模式');
      }
    }

    // 检查生产环境配置
    if (this.isProduction() && !this.shouldUseHeadless()) {
      issues.push('生产环境必须使用无头模式');
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings
    };
  }
}

// 创建全局实例
const environmentConfig = new EnvironmentConfig();

// 导出配置和工具函数
module.exports = {
  environmentConfig,
  ENVIRONMENT_TYPES,
  PLATFORM_TYPES,
  
  // 便捷方法
  isProduction: () => environmentConfig.isProduction(),
  shouldUseHeadless: () => environmentConfig.shouldUseHeadless(),
  getBrowserConfig: () => environmentConfig.getBrowserConfig(),
  getConfig: () => environmentConfig.getConfig(),
  printConfig: () => environmentConfig.printConfig(),
  validateConfig: () => environmentConfig.validateConfig()
};