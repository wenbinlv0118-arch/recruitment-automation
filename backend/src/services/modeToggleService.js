/**
 * 模式切换服务
 * 实现CDP与VNC模式的动态切换功能
 */

const logger = require('../utils/logger');
const { cdpService } = require('./cdpService');
const { vncService } = require('./vncService');
const { performanceMetrics } = require('../../scripts/performanceMetrics');
const EventEmitter = require('events');

class ModeToggleService extends EventEmitter {
  constructor() {
    super();
    this.currentMode = 'vnc'; // 默认模式
    this.availableModes = ['vnc', 'cdp'];
    this.sessions = new Map(); // 存储会话信息
    this.performanceData = new Map(); // 存储性能数据
    this.switchingInProgress = new Set(); // 正在切换的会话
    
    this.initializeServices();
  }

  /**
   * 初始化服务
   */
  async initializeServices() {
    try {
      logger.info('初始化模式切换服务');
      
      // 监听服务状态变化
      this.setupServiceListeners();
      
      logger.info('模式切换服务初始化完成', {
        currentMode: this.currentMode,
        availableModes: this.availableModes
      });
    } catch (error) {
      logger.error('模式切换服务初始化失败', { error: error.message });
      throw error;
    }
  }

  /**
   * 设置服务监听器
   */
  setupServiceListeners() {
    // CDP服务状态监听
    if (cdpService) {
      cdpService.on('connected', (sessionId) => {
        this.emit('modeChanged', { sessionId, mode: 'cdp', status: 'connected' });
      });
      
      cdpService.on('disconnected', (sessionId) => {
        this.emit('modeChanged', { sessionId, mode: 'cdp', status: 'disconnected' });
      });
    }
    
    // VNC服务状态监听
    if (vncService) {
      vncService.on('sessionCreated', (sessionId) => {
        this.emit('modeChanged', { sessionId, mode: 'vnc', status: 'connected' });
      });
      
      vncService.on('sessionClosed', (sessionId) => {
        this.emit('modeChanged', { sessionId, mode: 'vnc', status: 'disconnected' });
      });
    }
  }

  /**
   * 切换模式
   * @param {string} sessionId - 会话ID
   * @param {string} targetMode - 目标模式 ('vnc' | 'cdp')
   * @param {Object} options - 切换选项
   * @returns {Promise<Object>} 切换结果
   */
  async switchMode(sessionId, targetMode, options = {}) {
    const {
      preserveState = true,
      timeout = 30000,
      fallbackOnError = true
    } = options;

    if (!this.availableModes.includes(targetMode)) {
      throw new Error(`不支持的模式: ${targetMode}`);
    }

    if (this.switchingInProgress.has(sessionId)) {
      throw new Error(`会话 ${sessionId} 正在切换模式中`);
    }

    const currentSession = this.sessions.get(sessionId);
    if (!currentSession) {
      throw new Error(`会话 ${sessionId} 不存在`);
    }

    if (currentSession.mode === targetMode) {
      logger.info('目标模式与当前模式相同，无需切换', { sessionId, mode: targetMode });
      return {
        success: true,
        sessionId,
        mode: targetMode,
        message: '模式已是目标模式'
      };
    }

    this.switchingInProgress.add(sessionId);
    
    try {
      logger.info('开始切换模式', {
        sessionId,
        fromMode: currentSession.mode,
        toMode: targetMode,
        preserveState
      });

      // 开始性能监控
      const performanceMonitor = this.startPerformanceMonitoring(sessionId, targetMode);

      // 保存当前状态
      let savedState = null;
      if (preserveState) {
        savedState = await this.saveCurrentState(sessionId, currentSession.mode);
      }

      // 停止当前模式服务
      await this.stopCurrentMode(sessionId, currentSession.mode);

      // 启动目标模式服务
      const newSession = await this.startTargetMode(sessionId, targetMode, savedState);

      // 更新会话信息
      this.sessions.set(sessionId, {
        ...newSession,
        mode: targetMode,
        previousMode: currentSession.mode,
        switchedAt: Date.now()
      });

      // 停止性能监控
      const performanceResult = await this.stopPerformanceMonitoring(performanceMonitor);
      this.performanceData.set(`${sessionId}_${targetMode}`, performanceResult);

      logger.info('模式切换成功', {
        sessionId,
        newMode: targetMode,
        switchDuration: Date.now() - (performanceMonitor?.startTime || Date.now())
      });

      this.emit('modeSwitched', {
        sessionId,
        fromMode: currentSession.mode,
        toMode: targetMode,
        success: true,
        performanceResult
      });

      return {
        success: true,
        sessionId,
        mode: targetMode,
        previousMode: currentSession.mode,
        performanceResult,
        message: '模式切换成功'
      };

    } catch (error) {
      logger.error('模式切换失败', {
        sessionId,
        targetMode,
        error: error.message
      });

      // 如果启用了错误回退，尝试恢复到原模式
      if (fallbackOnError && currentSession) {
        try {
          await this.fallbackToOriginalMode(sessionId, currentSession.mode);
          logger.info('已回退到原模式', { sessionId, mode: currentSession.mode });
        } catch (fallbackError) {
          logger.error('回退到原模式失败', {
            sessionId,
            fallbackError: fallbackError.message
          });
        }
      }

      this.emit('modeSwitchFailed', {
        sessionId,
        targetMode,
        error: error.message
      });

      throw error;
    } finally {
      this.switchingInProgress.delete(sessionId);
    }
  }

  /**
   * 创建新会话
   * @param {string} sessionId - 会话ID
   * @param {string} mode - 模式
   * @param {Object} config - 配置
   * @returns {Promise<Object>} 会话信息
   */
  async createSession(sessionId, mode = 'vnc', config = {}) {
    if (this.sessions.has(sessionId)) {
      throw new Error(`会话 ${sessionId} 已存在`);
    }

    if (!this.availableModes.includes(mode)) {
      throw new Error(`不支持的模式: ${mode}`);
    }

    logger.info('创建新会话', { sessionId, mode, config });

    try {
      let sessionData;
      
      switch (mode) {
        case 'cdp':
          sessionData = await this.createCDPSession(sessionId, config);
          break;
        case 'vnc':
          sessionData = await this.createVNCSession(sessionId, config);
          break;
        default:
          throw new Error(`未实现的模式: ${mode}`);
      }

      const session = {
        id: sessionId,
        mode,
        ...sessionData,
        createdAt: Date.now(),
        lastActivity: Date.now()
      };

      this.sessions.set(sessionId, session);
      
      logger.info('会话创建成功', { sessionId, mode });
      
      this.emit('sessionCreated', { sessionId, mode, session });
      
      return session;

    } catch (error) {
      logger.error('创建会话失败', {
        sessionId,
        mode,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 销毁会话
   * @param {string} sessionId - 会话ID
   * @returns {Promise<boolean>} 是否成功
   */
  async destroySession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('尝试销毁不存在的会话', { sessionId });
      return false;
    }

    logger.info('销毁会话', { sessionId, mode: session.mode });

    try {
      // 停止当前模式服务
      await this.stopCurrentMode(sessionId, session.mode);
      
      // 清理会话数据
      this.sessions.delete(sessionId);
      this.performanceData.delete(sessionId);
      this.switchingInProgress.delete(sessionId);
      
      logger.info('会话销毁成功', { sessionId });
      
      this.emit('sessionDestroyed', { sessionId, mode: session.mode });
      
      return true;

    } catch (error) {
      logger.error('销毁会话失败', {
        sessionId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 获取会话信息
   * @param {string} sessionId - 会话ID
   * @returns {Object|null} 会话信息
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * 获取所有会话
   * @returns {Array} 会话列表
   */
  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  /**
   * 获取性能数据
   * @param {string} sessionId - 会话ID
   * @param {string} mode - 模式
   * @returns {Object|null} 性能数据
   */
  getPerformanceData(sessionId, mode = null) {
    if (mode) {
      return this.performanceData.get(`${sessionId}_${mode}`) || null;
    }
    
    // 返回该会话的所有性能数据
    const allData = {};
    for (const [key, value] of this.performanceData.entries()) {
      if (key.startsWith(`${sessionId}_`)) {
        const modeKey = key.replace(`${sessionId}_`, '');
        allData[modeKey] = value;
      }
    }
    
    return Object.keys(allData).length > 0 ? allData : null;
  }

  /**
   * 创建CDP会话
   * @param {string} sessionId - 会话ID
   * @param {Object} config - 配置
   * @returns {Promise<Object>} 会话数据
   */
  async createCDPSession(sessionId, config) {
    if (!cdpService) {
      throw new Error('CDP服务不可用');
    }

    const cdpSession = await cdpService.createSession({
      sessionId,
      ...config
    });

    return {
      cdpSessionId: cdpSession.id,
      websocketUrl: cdpSession.websocketUrl,
      debuggerUrl: cdpSession.debuggerUrl,
      status: 'connected'
    };
  }

  /**
   * 创建VNC会话
   * @param {string} sessionId - 会话ID
   * @param {Object} config - 配置
   * @returns {Promise<Object>} 会话数据
   */
  async createVNCSession(sessionId, config) {
    if (!vncService) {
      throw new Error('VNC服务不可用');
    }

    const vncSession = await vncService.createSession({
      sessionId,
      ...config
    });

    return {
      vncSessionId: vncSession.id,
      vncUrl: vncSession.url,
      displayNumber: vncSession.displayNumber,
      status: 'connected'
    };
  }

  /**
   * 保存当前状态
   * @param {string} sessionId - 会话ID
   * @param {string} mode - 当前模式
   * @returns {Promise<Object>} 保存的状态
   */
  async saveCurrentState(sessionId, mode) {
    logger.info('保存当前状态', { sessionId, mode });
    
    try {
      let state = {};
      
      switch (mode) {
        case 'cdp':
          if (cdpService) {
            state = await cdpService.captureState(sessionId);
          }
          break;
        case 'vnc':
          if (vncService) {
            state = await vncService.captureScreenshot(sessionId);
          }
          break;
      }
      
      state.timestamp = Date.now();
      state.mode = mode;
      
      return state;
    } catch (error) {
      logger.warn('保存状态失败', {
        sessionId,
        mode,
        error: error.message
      });
      return null;
    }
  }

  /**
   * 停止当前模式
   * @param {string} sessionId - 会话ID
   * @param {string} mode - 当前模式
   */
  async stopCurrentMode(sessionId, mode) {
    logger.info('停止当前模式', { sessionId, mode });
    
    try {
      switch (mode) {
        case 'cdp':
          if (cdpService) {
            await cdpService.closeSession(sessionId);
          }
          break;
        case 'vnc':
          if (vncService) {
            await vncService.closeSession(sessionId);
          }
          break;
      }
    } catch (error) {
      logger.warn('停止当前模式失败', {
        sessionId,
        mode,
        error: error.message
      });
    }
  }

  /**
   * 启动目标模式
   * @param {string} sessionId - 会话ID
   * @param {string} targetMode - 目标模式
   * @param {Object} savedState - 保存的状态
   * @returns {Promise<Object>} 新会话数据
   */
  async startTargetMode(sessionId, targetMode, savedState) {
    logger.info('启动目标模式', { sessionId, targetMode });
    
    let sessionData;
    
    switch (targetMode) {
      case 'cdp':
        sessionData = await this.createCDPSession(sessionId, {
          restoreState: savedState
        });
        break;
      case 'vnc':
        sessionData = await this.createVNCSession(sessionId, {
          restoreState: savedState
        });
        break;
      default:
        throw new Error(`未实现的目标模式: ${targetMode}`);
    }
    
    return sessionData;
  }

  /**
   * 回退到原模式
   * @param {string} sessionId - 会话ID
   * @param {string} originalMode - 原模式
   */
  async fallbackToOriginalMode(sessionId, originalMode) {
    logger.info('回退到原模式', { sessionId, originalMode });
    
    try {
      const sessionData = await this.startTargetMode(sessionId, originalMode, null);
      
      this.sessions.set(sessionId, {
        ...sessionData,
        mode: originalMode,
        fallbackAt: Date.now()
      });
      
    } catch (error) {
      logger.error('回退失败', {
        sessionId,
        originalMode,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * 开始性能监控
   * @param {string} sessionId - 会话ID
   * @param {string} mode - 模式
   * @returns {Object} 监控器
   */
  startPerformanceMonitoring(sessionId, mode) {
    const monitor = {
      sessionId,
      mode,
      startTime: Date.now(),
      metrics: new performanceMetrics.constructor()
    };
    
    monitor.metrics.startMonitoring();
    
    return monitor;
  }

  /**
   * 停止性能监控
   * @param {Object} monitor - 监控器
   * @returns {Promise<Object>} 性能结果
   */
  async stopPerformanceMonitoring(monitor) {
    if (!monitor || !monitor.metrics) {
      return null;
    }
    
    monitor.metrics.stopMonitoring();
    
    const result = {
      sessionId: monitor.sessionId,
      mode: monitor.mode,
      duration: Date.now() - monitor.startTime,
      metrics: monitor.metrics.getReport()
    };
    
    return result;
  }

  /**
   * 获取服务状态
   * @returns {Object} 服务状态
   */
  getServiceStatus() {
    return {
      currentMode: this.currentMode,
      availableModes: this.availableModes,
      activeSessions: this.sessions.size,
      switchingInProgress: this.switchingInProgress.size,
      services: {
        cdp: cdpService ? 'available' : 'unavailable',
        vnc: vncService ? 'available' : 'unavailable'
      }
    };
  }

  /**
   * 清理过期会话
   * @param {number} maxAge - 最大年龄（毫秒）
   * @returns {number} 清理的会话数量
   */
  async cleanupExpiredSessions(maxAge = 24 * 60 * 60 * 1000) { // 默认24小时
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > maxAge) {
        try {
          await this.destroySession(sessionId);
          cleanedCount++;
          logger.info('清理过期会话', { sessionId, age: now - session.lastActivity });
        } catch (error) {
          logger.error('清理过期会话失败', {
            sessionId,
            error: error.message
          });
        }
      }
    }
    
    return cleanedCount;
  }

  /**
   * 更新会话活动时间
   * @param {string} sessionId - 会话ID
   */
  updateSessionActivity(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }
}

// 创建全局实例
const modeToggleService = new ModeToggleService();

module.exports = {
  modeToggleService,
  ModeToggleService
};