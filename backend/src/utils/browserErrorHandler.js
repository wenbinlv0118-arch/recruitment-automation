/**
 * 浏览器错误处理器 - 专门处理Playwright/Chromium的D-Bus和系统错误
 * 确保D-Bus错误不影响浏览器正常启动和运行
 */

const { logFilter } = require('./logFilter');

class BrowserErrorHandler {
  constructor() {
    this.dbusErrorCount = 0;
    this.systemErrorCount = 0;
    this.startTime = Date.now();
    this.maxDbusErrors = 50; // 最大允许的D-Bus错误数量
    this.errorBuffer = []; // 错误缓冲区
    this.bufferSize = 100;
  }

  /**
   * 处理浏览器启动过程中的错误
   * @param {Error} error - 错误对象
   * @param {string} context - 错误上下文（如'launch', 'newPage', 'navigate'等）
   * @returns {boolean} - true表示错误已处理，false表示需要抛出
   */
  handleBrowserError(error, context = 'unknown') {
    const errorMessage = error.message || String(error);
    const timestamp = new Date().toISOString();
    
    // 记录错误到缓冲区
    this.addToErrorBuffer({
      message: errorMessage,
      context,
      timestamp,
      stack: error.stack
    });

    // 检查是否为D-Bus相关错误
    if (this.isDbusRelatedError(errorMessage)) {
      this.dbusErrorCount++;
      
      // 如果D-Bus错误数量在合理范围内，则忽略
      if (this.dbusErrorCount <= this.maxDbusErrors) {
        console.debug(`[浏览器] D-Bus错误已忽略 (${this.dbusErrorCount}/${this.maxDbusErrors}): ${context}`);
        return true; // 错误已处理，不需要抛出
      } else {
        console.warn(`[浏览器] D-Bus错误数量超过阈值 (${this.dbusErrorCount}), 上下文: ${context}`);
        return false; // 需要抛出错误
      }
    }

    // 检查是否为其他可忽略的系统错误
    if (this.isIgnorableSystemError(errorMessage)) {
      this.systemErrorCount++;
      console.debug(`[浏览器] 系统错误已忽略: ${context} - ${errorMessage.substring(0, 100)}`);
      return true; // 错误已处理
    }

    // 检查是否为致命错误
    if (this.isFatalError(errorMessage)) {
      console.error(`[浏览器] 致命错误: ${context} - ${errorMessage}`);
      return false; // 需要抛出错误
    }

    // 默认情况下，记录但不阻止执行
    console.warn(`[浏览器] 未分类错误: ${context} - ${errorMessage.substring(0, 100)}`);
    return false;
  }

  /**
   * 检查是否为D-Bus相关错误
   * @param {string} errorMessage - 错误消息
   * @returns {boolean}
   */
  isDbusRelatedError(errorMessage) {
    const dbusPatterns = [
      /dbus.*error/i,
      /D-Bus.*connection/i,
      /system_bus_socket/i,
      /Failed to connect to the bus/i,
      /dbus-daemon/i,
      /org\.freedesktop\.DBus/i,
      /bus\.cc.*error/i,
      /No such file or directory.*dbus/i,
      /Permission denied.*dbus/i,
      /Could not connect.*dbus/i,
      /DBus.*not available/i
    ];
    
    return dbusPatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * 检查是否为可忽略的系统错误
   * @param {string} errorMessage - 错误消息
   * @returns {boolean}
   */
  isIgnorableSystemError(errorMessage) {
    const ignorablePatterns = [
      /GPU process.*crashed/i,
      /sandbox.*warning/i,
      /accessibility.*warning/i,
      /desktop.*notification.*failed/i,
      /system.*integration.*failed/i,
      /libva.*error/i,
      /VAAPI.*not supported/i,
      /Failed to initialize.*VA-API/i,
      /No VA display found/i,
      /fontconfig.*warning/i
    ];
    
    return ignorablePatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * 检查是否为致命错误
   * @param {string} errorMessage - 错误消息
   * @returns {boolean}
   */
  isFatalError(errorMessage) {
    const fatalPatterns = [
      /Browser closed/i,
      /Target closed/i,
      /Navigation failed/i,
      /Timeout.*exceeded/i,
      /Cannot start browser/i,
      /Browser process.*crashed/i,
      /Out of memory/i,
      /Segmentation fault/i
    ];
    
    return fatalPatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * 添加错误到缓冲区
   * @param {Object} errorInfo - 错误信息
   */
  addToErrorBuffer(errorInfo) {
    this.errorBuffer.push(errorInfo);
    
    // 保持缓冲区大小
    if (this.errorBuffer.length > this.bufferSize) {
      this.errorBuffer.shift();
    }
  }

  /**
   * 获取错误统计信息
   * @returns {Object} - 统计信息
   */
  getErrorStats() {
    const uptime = Date.now() - this.startTime;
    const totalErrors = this.errorBuffer.length;
    
    return {
      uptime: Math.round(uptime / 1000), // 秒
      totalErrors,
      dbusErrors: this.dbusErrorCount,
      systemErrors: this.systemErrorCount,
      errorRate: totalErrors > 0 ? (totalErrors / (uptime / 1000 / 60)).toFixed(2) : 0, // 每分钟错误数
      recentErrors: this.errorBuffer.slice(-10) // 最近10个错误
    };
  }

  /**
   * 重置错误计数器
   */
  resetCounters() {
    this.dbusErrorCount = 0;
    this.systemErrorCount = 0;
    this.startTime = Date.now();
    this.errorBuffer = [];
  }

  /**
   * 包装Playwright浏览器启动方法
   * @param {Function} launchFunction - 原始的浏览器启动函数
   * @param {Object} options - 启动选项
   * @returns {Promise} - 包装后的启动Promise
   */
  async wrapBrowserLaunch(launchFunction, options = {}) {
    try {
      console.log('[浏览器] 开始启动浏览器...');
      const browser = await launchFunction(options);
      console.log('[浏览器] 浏览器启动成功');
      return browser;
    } catch (error) {
      const handled = this.handleBrowserError(error, 'launch');
      
      if (handled) {
        // 错误已处理，尝试重新启动
        console.log('[浏览器] 重试启动浏览器...');
        try {
          return await launchFunction(options);
        } catch (retryError) {
          console.error('[浏览器] 重试启动失败:', retryError.message);
          throw retryError;
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * 包装页面操作方法
   * @param {Function} pageFunction - 页面操作函数
   * @param {string} context - 操作上下文
   * @returns {Promise} - 包装后的操作Promise
   */
  async wrapPageOperation(pageFunction, context = 'page-operation') {
    try {
      return await pageFunction();
    } catch (error) {
      const handled = this.handleBrowserError(error, context);
      
      if (handled) {
        console.debug(`[浏览器] ${context} 错误已忽略，继续执行`);
        return null; // 返回null表示操作被跳过
      } else {
        throw error;
      }
    }
  }
}

// 创建全局实例
const browserErrorHandler = new BrowserErrorHandler();

// 在生产环境中自动捕获未处理的Promise拒绝
if (process.env.NODE_ENV === 'production') {
  process.on('unhandledRejection', (reason, promise) => {
    if (reason && typeof reason === 'object' && reason.message) {
      const handled = browserErrorHandler.handleBrowserError(reason, 'unhandledRejection');
      if (handled) {
        console.debug('[浏览器] 未处理的Promise拒绝已忽略:', reason.message.substring(0, 100));
        return;
      }
    }
    
    console.error('[浏览器] 未处理的Promise拒绝:', reason);
  });
}

module.exports = {
  BrowserErrorHandler,
  browserErrorHandler
};