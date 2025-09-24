/**
 * CDP健康检查和监控服务
 * 提供实时监控、性能指标收集、健康状态评估和告警功能
 */

const EventEmitter = require('events');
const os = require('os');
const { performance } = require('perf_hooks');

/**
 * CDP健康监控器类
 */
class CDPHealthMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.options = {
      checkInterval: options.checkInterval || 5000, // 检查间隔（毫秒）
      metricsRetention: options.metricsRetention || 3600000, // 指标保留时间（1小时）
      alertThresholds: {
        cpuUsage: options.alertThresholds?.cpuUsage || 80, // CPU使用率阈值
        memoryUsage: options.alertThresholds?.memoryUsage || 80, // 内存使用率阈值
        responseTime: options.alertThresholds?.responseTime || 1000, // 响应时间阈值（毫秒）
        errorRate: options.alertThresholds?.errorRate || 5, // 错误率阈值（%）
        frameRate: options.alertThresholds?.frameRate || 20, // 最低帧率阈值
        connectionCount: options.alertThresholds?.connectionCount || 100, // 最大连接数
        ...options.alertThresholds
      },
      enableDetailedMetrics: options.enableDetailedMetrics !== false,
      enableAlerts: options.enableAlerts !== false,
      enableLogging: options.enableLogging !== false
    };
    
    // 监控状态
    this.isMonitoring = false;
    this.monitoringTimer = null;
    
    // 服务引用
    this.services = {
      cdpService: null,
      screenRecordingService: null,
      userInteractionService: null,
      errorHandler: null
    };
    
    // 指标数据
    this.metrics = {
      system: [],
      performance: [],
      connections: [],
      errors: [],
      frames: [],
      interactions: []
    };
    
    // 健康状态
    this.healthStatus = {
      overall: 'unknown',
      services: {},
      lastCheck: null,
      issues: [],
      score: 0
    };
    
    // 告警状态
    this.alertState = {
      active: new Map(),
      history: [],
      suppressions: new Map()
    };
    
    // 性能基线
    this.baseline = {
      cpu: 0,
      memory: 0,
      responseTime: 0,
      frameRate: 0,
      established: false
    };
  }

  /**
   * 注册服务
   * @param {string} name - 服务名称
   * @param {Object} service - 服务实例
   */
  registerService(name, service) {
    this.services[name] = service;
    
    // 监听服务事件
    if (service && typeof service.on === 'function') {
      this.setupServiceListeners(name, service);
    }
    
    this.log('info', `服务已注册: ${name}`);
  }

  /**
   * 设置服务事件监听
   */
  setupServiceListeners(name, service) {
    // 监听错误事件
    service.on('error', (error) => {
      this.recordError(name, error);
    });
    
    // 监听性能事件
    if (service.on && typeof service.on === 'function') {
      service.on('performance', (data) => {
        this.recordPerformance(name, data);
      });
      
      service.on('frame', (frameData) => {
        this.recordFrame(name, frameData);
      });
      
      service.on('interaction', (interactionData) => {
        this.recordInteraction(name, interactionData);
      });
    }
  }

  /**
   * 开始监控
   */
  startMonitoring() {
    if (this.isMonitoring) {
      this.log('warn', '监控已在运行中');
      return;
    }
    
    this.isMonitoring = true;
    this.log('info', '开始健康监控');
    
    // 立即执行一次检查
    this.performHealthCheck();
    
    // 设置定时检查
    this.monitoringTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.options.checkInterval);
    
    // 建立性能基线
    setTimeout(() => {
      this.establishBaseline();
    }, 30000); // 30秒后建立基线
    
    this.emit('monitoring_started');
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }
    
    this.isMonitoring = false;
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    this.log('info', '健康监控已停止');
    this.emit('monitoring_stopped');
  }

  /**
   * 执行健康检查
   */
  async performHealthCheck() {
    const checkStart = performance.now();
    
    try {
      // 收集系统指标
      const systemMetrics = await this.collectSystemMetrics();
      
      // 收集服务指标
      const serviceMetrics = await this.collectServiceMetrics();
      
      // 收集性能指标
      const performanceMetrics = await this.collectPerformanceMetrics();
      
      // 评估健康状态
      const healthStatus = this.evaluateHealth({
        system: systemMetrics,
        services: serviceMetrics,
        performance: performanceMetrics
      });
      
      // 更新健康状态
      this.updateHealthStatus(healthStatus);
      
      // 检查告警条件
      if (this.options.enableAlerts) {
        this.checkAlerts(healthStatus);
      }
      
      // 清理过期数据
      this.cleanupMetrics();
      
      const checkDuration = performance.now() - checkStart;
      
      this.emit('health_check_completed', {
        duration: checkDuration,
        status: healthStatus,
        timestamp: Date.now()
      });
      
    } catch (error) {
      this.log('error', '健康检查失败', error);
      this.emit('health_check_failed', error);
    }
  }

  /**
   * 收集系统指标
   */
  async collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const loadAvg = os.loadavg();
    
    const metrics = {
      timestamp: Date.now(),
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
        loadAverage: loadAvg[0]
      },
      memory: {
        rss: memUsage.rss,
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        external: memUsage.external,
        usage: (memUsage.heapUsed / memUsage.heapTotal) * 100
      },
      system: {
        uptime: process.uptime(),
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpuCount: os.cpus().length
      }
    };
    
    this.metrics.system.push(metrics);
    return metrics;
  }

  /**
   * 收集服务指标
   */
  async collectServiceMetrics() {
    const serviceMetrics = {};
    
    for (const [name, service] of Object.entries(this.services)) {
      if (!service) continue;
      
      try {
        const metrics = await this.collectSingleServiceMetrics(name, service);
        serviceMetrics[name] = metrics;
      } catch (error) {
        this.log('warn', `收集服务指标失败: ${name}`, error);
        serviceMetrics[name] = {
          status: 'error',
          error: error.message,
          timestamp: Date.now()
        };
      }
    }
    
    return serviceMetrics;
  }

  /**
   * 收集单个服务指标
   */
  async collectSingleServiceMetrics(name, service) {
    const metrics = {
      name,
      timestamp: Date.now(),
      status: 'unknown'
    };
    
    // 检查服务是否有健康检查方法
    if (typeof service.getHealthStatus === 'function') {
      const healthStatus = await service.getHealthStatus();
      metrics.status = healthStatus.status || 'unknown';
      metrics.details = healthStatus;
    } else if (typeof service.isConnected === 'function') {
      metrics.status = service.isConnected() ? 'healthy' : 'unhealthy';
    } else {
      // 基本可用性检查
      metrics.status = service ? 'healthy' : 'unhealthy';
    }
    
    // 收集特定服务的指标
    switch (name) {
      case 'cdpService':
        metrics.connections = service.getConnectionCount ? service.getConnectionCount() : 0;
        metrics.sessions = service.getActiveSessions ? service.getActiveSessions() : 0;
        break;
        
      case 'screenRecordingService':
        if (service.getStats) {
          const stats = service.getStats();
          metrics.frameRate = stats.frameRate || 0;
          metrics.clients = stats.clients || 0;
          metrics.bufferSize = stats.bufferSize || 0;
        }
        break;
        
      case 'userInteractionService':
        if (service.getStats) {
          const stats = service.getStats();
          metrics.interactions = stats.totalInteractions || 0;
          metrics.averageLatency = stats.averageLatency || 0;
        }
        break;
        
      case 'errorHandler':
        if (service.getErrorStats) {
          const stats = service.getErrorStats();
          metrics.totalErrors = stats.total || 0;
          metrics.errorRate = this.calculateErrorRate(stats);
        }
        break;
    }
    
    return metrics;
  }

  /**
   * 收集性能指标
   */
  async collectPerformanceMetrics() {
    const metrics = {
      timestamp: Date.now(),
      responseTime: await this.measureResponseTime(),
      throughput: this.calculateThroughput(),
      frameRate: this.calculateFrameRate(),
      interactionLatency: this.calculateInteractionLatency(),
      errorRate: this.calculateCurrentErrorRate()
    };
    
    this.metrics.performance.push(metrics);
    return metrics;
  }

  /**
   * 测量响应时间
   */
  async measureResponseTime() {
    if (!this.services.cdpService) return 0;
    
    try {
      const start = performance.now();
      
      // 执行简单的健康检查操作
      if (typeof this.services.cdpService.ping === 'function') {
        await this.services.cdpService.ping();
      } else if (typeof this.services.cdpService.getStatus === 'function') {
        await this.services.cdpService.getStatus();
      }
      
      return performance.now() - start;
    } catch (error) {
      return -1; // 表示测量失败
    }
  }

  /**
   * 计算吞吐量
   */
  calculateThroughput() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentInteractions = this.metrics.interactions.filter(
      interaction => interaction.timestamp > oneMinuteAgo
    );
    
    return recentInteractions.length; // 每分钟交互数
  }

  /**
   * 计算帧率
   */
  calculateFrameRate() {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    const recentFrames = this.metrics.frames.filter(
      frame => frame.timestamp > oneSecondAgo
    );
    
    return recentFrames.length; // FPS
  }

  /**
   * 计算交互延迟
   */
  calculateInteractionLatency() {
    const recentInteractions = this.metrics.interactions.slice(-10); // 最近10次交互
    
    if (recentInteractions.length === 0) return 0;
    
    const totalLatency = recentInteractions.reduce(
      (sum, interaction) => sum + (interaction.latency || 0), 0
    );
    
    return totalLatency / recentInteractions.length;
  }

  /**
   * 计算当前错误率
   */
  calculateCurrentErrorRate() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentErrors = this.metrics.errors.filter(
      error => error.timestamp > oneMinuteAgo
    );
    
    const totalOperations = this.metrics.interactions.filter(
      interaction => interaction.timestamp > oneMinuteAgo
    ).length;
    
    if (totalOperations === 0) return 0;
    
    return (recentErrors.length / totalOperations) * 100;
  }

  /**
   * 计算错误率
   */
  calculateErrorRate(errorStats) {
    if (!errorStats || !errorStats.recent) return 0;
    
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    const recentErrors = errorStats.recent.filter(
      error => error.timestamp > oneMinuteAgo
    );
    
    return recentErrors.length;
  }

  /**
   * 评估健康状态
   */
  evaluateHealth(metrics) {
    const issues = [];
    let score = 100;
    
    // 评估系统指标
    if (metrics.system.memory.usage > this.options.alertThresholds.memoryUsage) {
      issues.push({
        type: 'memory',
        severity: 'high',
        message: `内存使用率过高: ${metrics.system.memory.usage.toFixed(2)}%`,
        value: metrics.system.memory.usage,
        threshold: this.options.alertThresholds.memoryUsage
      });
      score -= 20;
    }
    
    // 评估性能指标
    if (metrics.performance.responseTime > this.options.alertThresholds.responseTime) {
      issues.push({
        type: 'response_time',
        severity: 'medium',
        message: `响应时间过长: ${metrics.performance.responseTime.toFixed(2)}ms`,
        value: metrics.performance.responseTime,
        threshold: this.options.alertThresholds.responseTime
      });
      score -= 15;
    }
    
    if (metrics.performance.frameRate < this.options.alertThresholds.frameRate) {
      issues.push({
        type: 'frame_rate',
        severity: 'medium',
        message: `帧率过低: ${metrics.performance.frameRate}FPS`,
        value: metrics.performance.frameRate,
        threshold: this.options.alertThresholds.frameRate
      });
      score -= 15;
    }
    
    if (metrics.performance.errorRate > this.options.alertThresholds.errorRate) {
      issues.push({
        type: 'error_rate',
        severity: 'high',
        message: `错误率过高: ${metrics.performance.errorRate.toFixed(2)}%`,
        value: metrics.performance.errorRate,
        threshold: this.options.alertThresholds.errorRate
      });
      score -= 25;
    }
    
    // 评估服务状态
    for (const [serviceName, serviceMetrics] of Object.entries(metrics.services)) {
      if (serviceMetrics.status !== 'healthy') {
        issues.push({
          type: 'service',
          severity: 'high',
          message: `服务不健康: ${serviceName}`,
          service: serviceName,
          status: serviceMetrics.status
        });
        score -= 30;
      }
    }
    
    // 确定总体状态
    let overall = 'healthy';
    if (score < 50) {
      overall = 'critical';
    } else if (score < 70) {
      overall = 'unhealthy';
    } else if (score < 90) {
      overall = 'degraded';
    }
    
    return {
      overall,
      score: Math.max(0, score),
      issues,
      metrics,
      timestamp: Date.now()
    };
  }

  /**
   * 更新健康状态
   */
  updateHealthStatus(newStatus) {
    const previousStatus = this.healthStatus.overall;
    this.healthStatus = newStatus;
    
    // 如果状态发生变化，发出事件
    if (previousStatus !== newStatus.overall) {
      this.emit('health_status_changed', {
        previous: previousStatus,
        current: newStatus.overall,
        status: newStatus
      });
      
      this.log('info', `健康状态变化: ${previousStatus} -> ${newStatus.overall}`);
    }
  }

  /**
   * 检查告警条件
   */
  checkAlerts(healthStatus) {
    for (const issue of healthStatus.issues) {
      const alertKey = `${issue.type}_${issue.service || 'system'}`;
      
      // 检查是否已有活跃告警
      if (!this.alertState.active.has(alertKey)) {
        this.triggerAlert(alertKey, issue);
      } else {
        // 更新现有告警
        const existingAlert = this.alertState.active.get(alertKey);
        existingAlert.lastSeen = Date.now();
        existingAlert.count++;
      }
    }
    
    // 检查是否有告警需要清除
    for (const [alertKey, alert] of this.alertState.active.entries()) {
      const stillActive = healthStatus.issues.some(issue => {
        const issueKey = `${issue.type}_${issue.service || 'system'}`;
        return issueKey === alertKey;
      });
      
      if (!stillActive) {
        this.clearAlert(alertKey, alert);
      }
    }
  }

  /**
   * 触发告警
   */
  triggerAlert(alertKey, issue) {
    const alert = {
      id: this.generateAlertId(),
      key: alertKey,
      type: issue.type,
      severity: issue.severity,
      message: issue.message,
      value: issue.value,
      threshold: issue.threshold,
      service: issue.service,
      firstSeen: Date.now(),
      lastSeen: Date.now(),
      count: 1,
      status: 'active'
    };
    
    this.alertState.active.set(alertKey, alert);
    this.alertState.history.push({ ...alert, action: 'triggered' });
    
    this.log('warn', `告警触发: ${issue.message}`, alert);
    this.emit('alert_triggered', alert);
  }

  /**
   * 清除告警
   */
  clearAlert(alertKey, alert) {
    alert.status = 'cleared';
    alert.clearedAt = Date.now();
    
    this.alertState.active.delete(alertKey);
    this.alertState.history.push({ ...alert, action: 'cleared' });
    
    this.log('info', `告警清除: ${alert.message}`, alert);
    this.emit('alert_cleared', alert);
  }

  /**
   * 记录错误
   */
  recordError(service, error) {
    const errorRecord = {
      timestamp: Date.now(),
      service,
      message: error.message,
      type: error.name || 'Error',
      stack: error.stack
    };
    
    this.metrics.errors.push(errorRecord);
  }

  /**
   * 记录性能数据
   */
  recordPerformance(service, data) {
    const performanceRecord = {
      timestamp: Date.now(),
      service,
      ...data
    };
    
    this.metrics.performance.push(performanceRecord);
  }

  /**
   * 记录帧数据
   */
  recordFrame(service, frameData) {
    const frameRecord = {
      timestamp: Date.now(),
      service,
      size: frameData.size || 0,
      quality: frameData.quality || 0
    };
    
    this.metrics.frames.push(frameRecord);
  }

  /**
   * 记录交互数据
   */
  recordInteraction(service, interactionData) {
    const interactionRecord = {
      timestamp: Date.now(),
      service,
      type: interactionData.type,
      latency: interactionData.latency || 0
    };
    
    this.metrics.interactions.push(interactionRecord);
  }

  /**
   * 建立性能基线
   */
  establishBaseline() {
    if (this.metrics.performance.length < 10) {
      this.log('warn', '数据不足，无法建立性能基线');
      return;
    }
    
    const recentMetrics = this.metrics.performance.slice(-10);
    
    this.baseline = {
      responseTime: this.calculateAverage(recentMetrics.map(m => m.responseTime)),
      frameRate: this.calculateAverage(recentMetrics.map(m => m.frameRate)),
      interactionLatency: this.calculateAverage(recentMetrics.map(m => m.interactionLatency)),
      established: true,
      timestamp: Date.now()
    };
    
    this.log('info', '性能基线已建立', this.baseline);
    this.emit('baseline_established', this.baseline);
  }

  /**
   * 清理过期指标
   */
  cleanupMetrics() {
    const now = Date.now();
    const cutoff = now - this.options.metricsRetention;
    
    for (const [key, metrics] of Object.entries(this.metrics)) {
      if (Array.isArray(metrics)) {
        this.metrics[key] = metrics.filter(metric => metric.timestamp > cutoff);
      }
    }
    
    // 清理告警历史
    this.alertState.history = this.alertState.history.filter(
      alert => alert.firstSeen > cutoff
    );
  }

  /**
   * 获取健康状态
   */
  getHealthStatus() {
    return {
      ...this.healthStatus,
      monitoring: this.isMonitoring,
      baseline: this.baseline
    };
  }

  /**
   * 获取指标数据
   */
  getMetrics(type = null, limit = 100) {
    if (type && this.metrics[type]) {
      return this.metrics[type].slice(-limit);
    }
    
    const result = {};
    for (const [key, metrics] of Object.entries(this.metrics)) {
      if (Array.isArray(metrics)) {
        result[key] = metrics.slice(-limit);
      }
    }
    
    return result;
  }

  /**
   * 获取告警状态
   */
  getAlertStatus() {
    return {
      active: Array.from(this.alertState.active.values()),
      history: this.alertState.history.slice(-50),
      suppressions: Array.from(this.alertState.suppressions.entries())
    };
  }

  /**
   * 工具函数
   */
  calculateAverage(values) {
    if (values.length === 0) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  log(level, message, data = {}) {
    if (!this.options.enableLogging) return;
    
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    
    console.log(`[CDP-HealthMonitor] [${level.toUpperCase()}] ${message}`, data);
    this.emit('log', logEntry);
  }

  /**
   * 停止监控并清理资源
   */
  destroy() {
    this.stopMonitoring();
    this.removeAllListeners();
    
    // 清理数据
    for (const key of Object.keys(this.metrics)) {
      this.metrics[key] = [];
    }
    
    this.alertState.active.clear();
    this.alertState.history = [];
    this.alertState.suppressions.clear();
    
    this.log('info', 'CDP健康监控器已销毁');
  }
}

module.exports = CDPHealthMonitor;