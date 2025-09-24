/**
 * CDP错误处理和连接恢复机制
 * 提供统一的错误处理、连接恢复、重试机制和故障转移功能
 */

const EventEmitter = require('events');
const { performance } = require('perf_hooks');

/**
 * CDP错误处理器类
 */
class CDPErrorHandler extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      maxRetryDelay: options.maxRetryDelay || 30000,
      backoffMultiplier: options.backoffMultiplier || 2,
      connectionTimeout: options.connectionTimeout || 30000,
      healthCheckInterval: options.healthCheckInterval || 10000,
      circuitBreakerThreshold: options.circuitBreakerThreshold || 5,
      circuitBreakerTimeout: options.circuitBreakerTimeout || 60000,
      enableLogging: options.enableLogging !== false
    };
    
    // 错误统计
    this.errorStats = {
      total: 0,
      byType: {},
      byService: {},
      recent: []
    };
    
    // 重试状态
    this.retryState = new Map();
    
    // 断路器状态
    this.circuitBreakers = new Map();
    
    // 连接状态
    this.connectionStates = new Map();
    
    // 健康检查定时器
    this.healthCheckTimer = null;
    
    this.startHealthCheck();
  }

  /**
   * 处理错误
   * @param {Error} error - 错误对象
   * @param {string} context - 错误上下文
   * @param {Object} metadata - 额外元数据
   */
  async handleError(error, context = 'unknown', metadata = {}) {
    const errorInfo = this.analyzeError(error, context, metadata);
    
    // 记录错误
    this.recordError(errorInfo);
    
    // 发出错误事件
    this.emit('error', errorInfo);
    
    // 根据错误类型决定处理策略
    const strategy = this.determineStrategy(errorInfo);
    
    switch (strategy.action) {
      case 'retry':
        return await this.handleRetry(errorInfo, strategy);
      case 'reconnect':
        return await this.handleReconnect(errorInfo, strategy);
      case 'fallback':
        return await this.handleFallback(errorInfo, strategy);
      case 'circuit_break':
        return await this.handleCircuitBreak(errorInfo, strategy);
      default:
        return await this.handleFatal(errorInfo, strategy);
    }
  }

  /**
   * 分析错误
   */
  analyzeError(error, context, metadata) {
    const errorInfo = {
      id: this.generateErrorId(),
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      code: error.code,
      context: context,
      metadata: metadata,
      type: this.classifyError(error),
      severity: this.assessSeverity(error, context),
      recoverable: this.isRecoverable(error)
    };
    
    return errorInfo;
  }

  /**
   * 错误分类
   */
  classifyError(error) {
    const message = error.message.toLowerCase();
    const code = error.code;
    
    // 网络相关错误
    if (code === 'ECONNREFUSED' || code === 'ENOTFOUND' || code === 'ETIMEDOUT') {
      return 'network';
    }
    
    // WebSocket相关错误
    if (message.includes('websocket') || message.includes('ws://') || message.includes('wss://')) {
      return 'websocket';
    }
    
    // Chrome/CDP相关错误
    if (message.includes('chrome') || message.includes('cdp') || message.includes('devtools')) {
      return 'chrome';
    }
    
    // 超时错误
    if (message.includes('timeout') || code === 'ETIMEDOUT') {
      return 'timeout';
    }
    
    // 权限错误
    if (message.includes('permission') || code === 'EACCES') {
      return 'permission';
    }
    
    // 资源不足错误
    if (message.includes('memory') || message.includes('resource')) {
      return 'resource';
    }
    
    // 协议错误
    if (message.includes('protocol') || message.includes('invalid response')) {
      return 'protocol';
    }
    
    return 'unknown';
  }

  /**
   * 评估错误严重程度
   */
  assessSeverity(error, context) {
    const type = this.classifyError(error);
    
    // 致命错误
    if (type === 'permission' || type === 'resource') {
      return 'fatal';
    }
    
    // 高严重性错误
    if (type === 'chrome' || type === 'protocol') {
      return 'high';
    }
    
    // 中等严重性错误
    if (type === 'websocket' || type === 'timeout') {
      return 'medium';
    }
    
    // 低严重性错误
    if (type === 'network') {
      return 'low';
    }
    
    return 'medium';
  }

  /**
   * 判断错误是否可恢复
   */
  isRecoverable(error) {
    const type = this.classifyError(error);
    const severity = this.assessSeverity(error);
    
    // 致命错误通常不可恢复
    if (severity === 'fatal') {
      return false;
    }
    
    // 网络和超时错误通常可恢复
    if (type === 'network' || type === 'timeout' || type === 'websocket') {
      return true;
    }
    
    // Chrome相关错误可能可恢复
    if (type === 'chrome') {
      return !error.message.includes('crashed');
    }
    
    return true;
  }

  /**
   * 确定处理策略
   */
  determineStrategy(errorInfo) {
    const { type, severity, recoverable, context } = errorInfo;
    
    // 检查断路器状态
    if (this.isCircuitOpen(context)) {
      return { action: 'circuit_break', reason: 'circuit_open' };
    }
    
    // 不可恢复的错误
    if (!recoverable) {
      return { action: 'fatal', reason: 'not_recoverable' };
    }
    
    // 根据错误类型决定策略
    switch (type) {
      case 'network':
      case 'timeout':
        return { action: 'retry', maxRetries: 3, delay: 1000 };
        
      case 'websocket':
        return { action: 'reconnect', maxRetries: 2, delay: 2000 };
        
      case 'chrome':
        if (severity === 'high') {
          return { action: 'reconnect', maxRetries: 1, delay: 5000 };
        }
        return { action: 'retry', maxRetries: 2, delay: 2000 };
        
      case 'protocol':
        return { action: 'fallback', reason: 'protocol_error' };
        
      default:
        return { action: 'retry', maxRetries: 1, delay: 1000 };
    }
  }

  /**
   * 处理重试
   */
  async handleRetry(errorInfo, strategy) {
    const { context } = errorInfo;
    const retryKey = `${context}_${errorInfo.id}`;
    
    // 获取重试状态
    let retryState = this.retryState.get(retryKey) || {
      attempts: 0,
      lastAttempt: 0,
      delay: strategy.delay || this.options.retryDelay
    };
    
    // 检查是否超过最大重试次数
    if (retryState.attempts >= (strategy.maxRetries || this.options.maxRetries)) {
      this.retryState.delete(retryKey);
      this.log('error', `重试次数已达上限: ${context}`, errorInfo);
      return { success: false, reason: 'max_retries_exceeded' };
    }
    
    // 计算延迟时间（指数退避）
    const delay = Math.min(
      retryState.delay * Math.pow(this.options.backoffMultiplier, retryState.attempts),
      this.options.maxRetryDelay
    );
    
    // 更新重试状态
    retryState.attempts++;
    retryState.lastAttempt = Date.now();
    this.retryState.set(retryKey, retryState);
    
    this.log('info', `准备重试 (${retryState.attempts}/${strategy.maxRetries}): ${context}`, {
      delay,
      errorType: errorInfo.type
    });
    
    // 等待延迟
    await this.sleep(delay);
    
    // 发出重试事件
    this.emit('retry', {
      context,
      attempt: retryState.attempts,
      maxRetries: strategy.maxRetries,
      delay,
      errorInfo
    });
    
    return { success: true, action: 'retry', attempt: retryState.attempts };
  }

  /**
   * 处理重连
   */
  async handleReconnect(errorInfo, strategy) {
    const { context } = errorInfo;
    
    this.log('info', `开始重连: ${context}`, errorInfo);
    
    // 更新连接状态
    this.setConnectionState(context, 'reconnecting');
    
    // 发出重连事件
    this.emit('reconnect', {
      context,
      errorInfo,
      strategy
    });
    
    // 等待延迟
    if (strategy.delay) {
      await this.sleep(strategy.delay);
    }
    
    return { success: true, action: 'reconnect' };
  }

  /**
   * 处理故障转移
   */
  async handleFallback(errorInfo, strategy) {
    const { context } = errorInfo;
    
    this.log('warn', `启动故障转移: ${context}`, errorInfo);
    
    // 发出故障转移事件
    this.emit('fallback', {
      context,
      errorInfo,
      strategy
    });
    
    return { success: true, action: 'fallback' };
  }

  /**
   * 处理断路器
   */
  async handleCircuitBreak(errorInfo, strategy) {
    const { context } = errorInfo;
    
    this.log('warn', `断路器开启: ${context}`, errorInfo);
    
    // 发出断路器事件
    this.emit('circuit_break', {
      context,
      errorInfo,
      strategy
    });
    
    return { success: false, action: 'circuit_break' };
  }

  /**
   * 处理致命错误
   */
  async handleFatal(errorInfo, strategy) {
    const { context } = errorInfo;
    
    this.log('error', `致命错误: ${context}`, errorInfo);
    
    // 发出致命错误事件
    this.emit('fatal', {
      context,
      errorInfo,
      strategy
    });
    
    return { success: false, action: 'fatal' };
  }

  /**
   * 记录错误
   */
  recordError(errorInfo) {
    this.errorStats.total++;
    
    // 按类型统计
    this.errorStats.byType[errorInfo.type] = (this.errorStats.byType[errorInfo.type] || 0) + 1;
    
    // 按服务统计
    this.errorStats.byService[errorInfo.context] = (this.errorStats.byService[errorInfo.context] || 0) + 1;
    
    // 记录最近错误
    this.errorStats.recent.push(errorInfo);
    
    // 保持最近错误列表大小
    if (this.errorStats.recent.length > 100) {
      this.errorStats.recent.shift();
    }
    
    // 更新断路器状态
    this.updateCircuitBreaker(errorInfo.context);
  }

  /**
   * 更新断路器状态
   */
  updateCircuitBreaker(context) {
    let breaker = this.circuitBreakers.get(context) || {
      state: 'closed',
      failureCount: 0,
      lastFailure: 0,
      nextAttempt: 0
    };
    
    breaker.failureCount++;
    breaker.lastFailure = Date.now();
    
    // 检查是否需要开启断路器
    if (breaker.state === 'closed' && breaker.failureCount >= this.options.circuitBreakerThreshold) {
      breaker.state = 'open';
      breaker.nextAttempt = Date.now() + this.options.circuitBreakerTimeout;
      
      this.log('warn', `断路器开启: ${context}`, {
        failureCount: breaker.failureCount,
        threshold: this.options.circuitBreakerThreshold
      });
    }
    
    this.circuitBreakers.set(context, breaker);
  }

  /**
   * 检查断路器是否开启
   */
  isCircuitOpen(context) {
    const breaker = this.circuitBreakers.get(context);
    
    if (!breaker || breaker.state === 'closed') {
      return false;
    }
    
    if (breaker.state === 'open') {
      // 检查是否可以尝试半开状态
      if (Date.now() >= breaker.nextAttempt) {
        breaker.state = 'half-open';
        this.circuitBreakers.set(context, breaker);
        return false;
      }
      return true;
    }
    
    return false;
  }

  /**
   * 重置断路器
   */
  resetCircuitBreaker(context) {
    const breaker = this.circuitBreakers.get(context);
    
    if (breaker) {
      breaker.state = 'closed';
      breaker.failureCount = 0;
      breaker.lastFailure = 0;
      breaker.nextAttempt = 0;
      
      this.circuitBreakers.set(context, breaker);
      
      this.log('info', `断路器重置: ${context}`);
    }
  }

  /**
   * 设置连接状态
   */
  setConnectionState(context, state) {
    this.connectionStates.set(context, {
      state,
      timestamp: Date.now()
    });
    
    this.emit('connection_state_change', { context, state });
  }

  /**
   * 获取连接状态
   */
  getConnectionState(context) {
    return this.connectionStates.get(context);
  }

  /**
   * 开始健康检查
   */
  startHealthCheck() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.options.healthCheckInterval);
  }

  /**
   * 执行健康检查
   */
  performHealthCheck() {
    const now = Date.now();
    
    // 检查断路器状态
    for (const [context, breaker] of this.circuitBreakers.entries()) {
      if (breaker.state === 'open' && now >= breaker.nextAttempt) {
        breaker.state = 'half-open';
        this.log('info', `断路器进入半开状态: ${context}`);
      }
    }
    
    // 清理过期的重试状态
    for (const [key, retryState] of this.retryState.entries()) {
      if (now - retryState.lastAttempt > 300000) { // 5分钟
        this.retryState.delete(key);
      }
    }
    
    // 发出健康检查事件
    this.emit('health_check', {
      timestamp: now,
      circuitBreakers: Object.fromEntries(this.circuitBreakers),
      connectionStates: Object.fromEntries(this.connectionStates),
      errorStats: this.errorStats
    });
  }

  /**
   * 获取错误统计
   */
  getErrorStats() {
    return {
      ...this.errorStats,
      circuitBreakers: Object.fromEntries(this.circuitBreakers),
      connectionStates: Object.fromEntries(this.connectionStates)
    };
  }

  /**
   * 清理重试状态
   */
  clearRetryState(context) {
    const keysToDelete = [];
    
    for (const key of this.retryState.keys()) {
      if (key.startsWith(context)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.retryState.delete(key));
  }

  /**
   * 生成错误ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 日志记录
   */
  log(level, message, data = {}) {
    if (!this.options.enableLogging) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    
    console.log(`[CDP-ErrorHandler] [${level.toUpperCase()}] ${message}`, data);
    
    this.emit('log', logEntry);
  }

  /**
   * 睡眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 停止错误处理器
   */
  stop() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    this.removeAllListeners();
    this.retryState.clear();
    this.circuitBreakers.clear();
    this.connectionStates.clear();
    
    this.log('info', 'CDP错误处理器已停止');
  }
}

module.exports = CDPErrorHandler;