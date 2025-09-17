/**
 * 日志过滤工具 - 过滤D-Bus和其他系统级错误
 * 用于生产环境中过滤不影响功能的系统警告
 */

class LogFilter {
  constructor() {
    // D-Bus相关错误模式
    this.dbusPatterns = [
      /dbus.*error/i,
      /D-Bus.*connection/i,
      /system_bus_socket/i,
      /Failed to connect to the bus/i,
      /dbus-daemon/i,
      /org\.freedesktop\.DBus/i,
      /bus\.cc.*error/i,
      /DBUS_SESSION_BUS_ADDRESS/i,
      /No such file or directory.*dbus/i,
      /Permission denied.*dbus/i
    ];

    // 其他可忽略的系统警告模式
    this.systemWarningPatterns = [
      /GPU process.*crashed/i,
      /sandbox.*warning/i,
      /accessibility.*warning/i,
      /desktop.*notification.*failed/i,
      /system.*integration.*failed/i
    ];

    // 严重错误模式（不应被过滤）
    this.criticalPatterns = [
      /FATAL/i,
      /CRITICAL/i,
      /Application.*crashed/i,
      /Out of memory/i,
      /Segmentation fault/i,
      /Cannot start server/i,
      /Port.*already in use/i
    ];
  }

  /**
   * 检查日志消息是否应该被过滤
   * @param {string} message - 日志消息
   * @param {string} level - 日志级别 (error, warn, info, debug)
   * @returns {boolean} - true表示应该过滤（不显示），false表示应该保留
   */
  shouldFilter(message, level = 'info') {
    if (!message || typeof message !== 'string') {
      return false;
    }

    // 严重错误永远不过滤
    if (this.isCriticalError(message)) {
      return false;
    }

    // 检查是否为D-Bus相关错误
    if (this.isDbusError(message)) {
      return true;
    }

    // 检查是否为其他系统警告
    if (level === 'warn' && this.isSystemWarning(message)) {
      return true;
    }

    return false;
  }

  /**
   * 检查是否为D-Bus相关错误
   * @param {string} message - 日志消息
   * @returns {boolean}
   */
  isDbusError(message) {
    return this.dbusPatterns.some(pattern => pattern.test(message));
  }

  /**
   * 检查是否为系统警告
   * @param {string} message - 日志消息
   * @returns {boolean}
   */
  isSystemWarning(message) {
    return this.systemWarningPatterns.some(pattern => pattern.test(message));
  }

  /**
   * 检查是否为严重错误
   * @param {string} message - 日志消息
   * @returns {boolean}
   */
  isCriticalError(message) {
    return this.criticalPatterns.some(pattern => pattern.test(message));
  }

  /**
   * 过滤日志消息，返回清理后的消息或null
   * @param {string} message - 原始日志消息
   * @param {string} level - 日志级别
   * @returns {string|null} - 过滤后的消息，null表示应该完全忽略
   */
  filterMessage(message, level = 'info') {
    if (this.shouldFilter(message, level)) {
      return null;
    }
    return message;
  }

  /**
   * 批量过滤日志数组
   * @param {Array} logs - 日志数组，每个元素包含 {message, level, timestamp}
   * @returns {Array} - 过滤后的日志数组
   */
  filterLogs(logs) {
    return logs.filter(log => {
      const filtered = this.filterMessage(log.message, log.level);
      return filtered !== null;
    });
  }

  /**
   * 创建过滤后的console方法
   * @returns {Object} - 包含过滤后的console方法的对象
   */
  createFilteredConsole() {
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug
    };

    return {
      log: (message, ...args) => {
        if (!this.shouldFilter(String(message), 'info')) {
          originalConsole.log(message, ...args);
        }
      },
      error: (message, ...args) => {
        if (!this.shouldFilter(String(message), 'error')) {
          originalConsole.error(message, ...args);
        }
      },
      warn: (message, ...args) => {
        if (!this.shouldFilter(String(message), 'warn')) {
          originalConsole.warn(message, ...args);
        }
      },
      info: (message, ...args) => {
        if (!this.shouldFilter(String(message), 'info')) {
          originalConsole.info(message, ...args);
        }
      },
      debug: (message, ...args) => {
        if (!this.shouldFilter(String(message), 'debug')) {
          originalConsole.debug(message, ...args);
        }
      }
    };
  }

  /**
   * 获取过滤统计信息
   * @param {Array} logs - 原始日志数组
   * @returns {Object} - 统计信息
   */
  getFilterStats(logs) {
    let total = logs.length;
    let dbusFiltered = 0;
    let systemWarningFiltered = 0;
    let totalFiltered = 0;

    logs.forEach(log => {
      if (this.shouldFilter(log.message, log.level)) {
        totalFiltered++;
        if (this.isDbusError(log.message)) {
          dbusFiltered++;
        } else if (this.isSystemWarning(log.message)) {
          systemWarningFiltered++;
        }
      }
    });

    return {
      total,
      filtered: totalFiltered,
      dbusFiltered,
      systemWarningFiltered,
      remaining: total - totalFiltered,
      filterRate: total > 0 ? (totalFiltered / total * 100).toFixed(2) + '%' : '0%'
    };
  }
}

// 创建全局实例
const logFilter = new LogFilter();

// 在生产环境中自动应用日志过滤
if (process.env.NODE_ENV === 'production' && process.env.ENABLE_LOG_FILTER !== 'false') {
  const filteredConsole = logFilter.createFilteredConsole();
  
  // 替换全局console方法
  console.log = filteredConsole.log;
  console.error = filteredConsole.error;
  console.warn = filteredConsole.warn;
  console.info = filteredConsole.info;
  console.debug = filteredConsole.debug;
  
  console.info('✓ 生产环境日志过滤已启用 - D-Bus和系统警告将被过滤');
}

module.exports = {
  LogFilter,
  logFilter
};