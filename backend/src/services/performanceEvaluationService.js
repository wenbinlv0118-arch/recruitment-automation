/**
 * 性能评估WebSocket服务
 * 处理CDP与VNC性能对比测试的实时通信
 */

const WebSocket = require('ws');
const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// 导入相关服务
const CDPService = require('./cdpService');
const VNCService = require('./vncService');
const PerformanceMetrics = require('../../scripts/performanceMetrics');
const AutomatedTestCases = require('../../scripts/automatedTestCases');
const PerformanceComparison = require('../../scripts/performanceComparison');
const ModeToggleService = require('../../scripts/modeToggleService');

class PerformanceEvaluationService extends EventEmitter {
  constructor() {
    super();
    
    // WebSocket服务器
    this.wss = null;
    this.clients = new Map();
    
    // 服务实例
    this.cdpService = new CDPService();
    this.vncService = new VNCService();
    this.performanceMetrics = new PerformanceMetrics();
    this.automatedTestCases = new AutomatedTestCases();
    this.performanceComparison = new PerformanceComparison();
    this.modeToggleService = new ModeToggleService();
    
    // 测试会话管理
    this.activeSessions = new Map();
    this.testResults = new Map();
    this.userFeedbacks = [];
    
    // 配置
    this.config = {
      port: 3001,
      metricsInterval: 1000,
      sessionTimeout: 30 * 60 * 1000, // 30分钟
      maxClients: 10
    };
    
    this.isInitialized = false;
  }

  /**
   * 初始化服务
   * @param {Object} options - 配置选项
   */
  async initialize(options = {}) {
    try {
      this.config = { ...this.config, ...options };
      
      // 初始化WebSocket服务器
      await this.initializeWebSocketServer();
      
      // 初始化相关服务
      await this.initializeServices();
      
      // 设置定时清理
      this.setupCleanupInterval();
      
      this.isInitialized = true;
      console.log('性能评估服务初始化完成');
      
    } catch (error) {
      console.error('初始化性能评估服务失败:', error);
      throw error;
    }
  }

  /**
   * 初始化WebSocket服务器
   */
  async initializeWebSocketServer() {
    return new Promise((resolve, reject) => {
      try {
        this.wss = new WebSocket.Server({ 
          port: this.config.port,
          path: '/performance-evaluation'
        });
        
        this.wss.on('connection', (ws, req) => {
          this.handleClientConnection(ws, req);
        });
        
        this.wss.on('listening', () => {
          console.log(`性能评估WebSocket服务器启动在端口 ${this.config.port}`);
          resolve();
        });
        
        this.wss.on('error', (error) => {
          console.error('WebSocket服务器错误:', error);
          reject(error);
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 初始化相关服务
   */
  async initializeServices() {
    try {
      // 初始化模式切换服务
      await this.modeToggleService.initialize();
      
      // 设置事件监听
      this.setupServiceEventListeners();
      
    } catch (error) {
      console.error('初始化相关服务失败:', error);
      throw error;
    }
  }

  /**
   * 设置服务事件监听器
   */
  setupServiceEventListeners() {
    // 监听模式切换事件
    this.modeToggleService.on('modeChanged', (data) => {
      this.broadcastToClients({
        type: 'mode_switched',
        mode: data.mode,
        sessionId: data.sessionId
      });
    });
    
    // 监听性能指标更新
    this.performanceMetrics.on('metricsUpdated', (metrics) => {
      this.broadcastToClients({
        type: 'performance_metrics',
        metrics: metrics
      });
    });
  }

  /**
   * 处理客户端连接
   * @param {WebSocket} ws - WebSocket连接
   * @param {Object} req - 请求对象
   */
  handleClientConnection(ws, req) {
    const clientId = uuidv4();
    const clientInfo = {
      id: clientId,
      ws: ws,
      ip: req.socket.remoteAddress,
      connectedAt: Date.now(),
      lastActivity: Date.now()
    };
    
    // 检查客户端数量限制
    if (this.clients.size >= this.config.maxClients) {
      ws.close(1013, '服务器客户端数量已达上限');
      return;
    }
    
    this.clients.set(clientId, clientInfo);
    console.log(`客户端连接: ${clientId} (${clientInfo.ip})`);
    
    // 发送欢迎消息
    this.sendToClient(clientId, {
      type: 'connected',
      clientId: clientId,
      serverTime: Date.now()
    });
    
    // 设置消息处理
    ws.on('message', (data) => {
      this.handleClientMessage(clientId, data);
    });
    
    // 设置连接关闭处理
    ws.on('close', () => {
      this.handleClientDisconnection(clientId);
    });
    
    // 设置错误处理
    ws.on('error', (error) => {
      console.error(`客户端 ${clientId} 错误:`, error);
      this.handleClientDisconnection(clientId);
    });
  }

  /**
   * 处理客户端消息
   * @param {string} clientId - 客户端ID
   * @param {Buffer} data - 消息数据
   */
  async handleClientMessage(clientId, data) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;
      
      // 更新活动时间
      client.lastActivity = Date.now();
      
      const message = JSON.parse(data.toString());
      console.log(`收到客户端 ${clientId} 消息:`, message.type);
      
      switch (message.type) {
        case 'switch_mode':
          await this.handleSwitchMode(clientId, message);
          break;
        case 'start_test':
          await this.handleStartTest(clientId, message);
          break;
        case 'stop_test':
          await this.handleStopTest(clientId, message);
          break;
        case 'get_metrics':
          await this.handleGetMetrics(clientId, message);
          break;
        case 'run_comparison':
          await this.handleRunComparison(clientId, message);
          break;
        case 'submit_feedback':
          await this.handleSubmitFeedback(clientId, message);
          break;
        default:
          console.warn(`未知消息类型: ${message.type}`);
      }
      
    } catch (error) {
      console.error(`处理客户端 ${clientId} 消息失败:`, error);
      this.sendToClient(clientId, {
        type: 'error',
        message: error.message
      });
    }
  }

  /**
   * 处理模式切换
   * @param {string} clientId - 客户端ID
   * @param {Object} message - 消息对象
   */
  async handleSwitchMode(clientId, message) {
    try {
      const { mode, sessionId } = message;
      
      // 切换模式
      const result = await this.modeToggleService.switchMode(sessionId, mode);
      
      this.sendToClient(clientId, {
        type: 'mode_switched',
        mode: result.currentMode,
        sessionId: sessionId,
        success: true
      });
      
    } catch (error) {
      console.error('切换模式失败:', error);
      this.sendToClient(clientId, {
        type: 'mode_switch_failed',
        error: error.message
      });
    }
  }

  /**
   * 处理开始测试
   * @param {string} clientId - 客户端ID
   * @param {Object} message - 消息对象
   */
  async handleStartTest(clientId, message) {
    try {
      const { scenario, mode, sessionId } = message;
      
      // 创建测试会话
      const testSession = {
        id: uuidv4(),
        clientId: clientId,
        scenario: scenario,
        mode: mode,
        sessionId: sessionId,
        startTime: Date.now(),
        status: 'running'
      };
      
      this.activeSessions.set(testSession.id, testSession);
      
      // 开始性能监控
      this.performanceMetrics.startMonitoring();
      
      // 运行测试场景
      const testResult = await this.automatedTestCases.runTestScenario(
        scenario,
        mode === 'cdp' ? 'cdp' : 'vnc'
      );
      
      // 更新测试会话
      testSession.status = 'completed';
      testSession.endTime = Date.now();
      testSession.duration = testSession.endTime - testSession.startTime;
      testSession.result = testResult;
      
      // 保存测试结果
      this.testResults.set(testSession.id, testResult);
      
      this.sendToClient(clientId, {
        type: 'test_completed',
        testId: testSession.id,
        results: {
          scenario: scenario,
          mode: mode,
          duration: testSession.duration,
          success: testResult.success,
          metrics: testResult.metrics
        }
      });
      
    } catch (error) {
      console.error('开始测试失败:', error);
      this.sendToClient(clientId, {
        type: 'test_failed',
        error: error.message
      });
    }
  }

  /**
   * 处理停止测试
   * @param {string} clientId - 客户端ID
   * @param {Object} message - 消息对象
   */
  async handleStopTest(clientId, message) {
    try {
      const { sessionId } = message;
      
      // 查找并停止相关测试会话
      for (const [testId, session] of this.activeSessions.entries()) {
        if (session.clientId === clientId && session.sessionId === sessionId) {
          session.status = 'stopped';
          session.endTime = Date.now();
          break;
        }
      }
      
      // 停止性能监控
      this.performanceMetrics.stopMonitoring();
      
      this.sendToClient(clientId, {
        type: 'test_stopped',
        sessionId: sessionId
      });
      
    } catch (error) {
      console.error('停止测试失败:', error);
      this.sendToClient(clientId, {
        type: 'stop_test_failed',
        error: error.message
      });
    }
  }

  /**
   * 处理获取性能指标
   * @param {string} clientId - 客户端ID
   * @param {Object} message - 消息对象
   */
  async handleGetMetrics(clientId, message) {
    try {
      const metrics = this.performanceMetrics.getCurrentMetrics();
      
      this.sendToClient(clientId, {
        type: 'performance_metrics',
        metrics: metrics
      });
      
    } catch (error) {
      console.error('获取性能指标失败:', error);
      this.sendToClient(clientId, {
        type: 'get_metrics_failed',
        error: error.message
      });
    }
  }

  /**
   * 处理运行对比测试
   * @param {string} clientId - 客户端ID
   * @param {Object} message - 消息对象
   */
  async handleRunComparison(clientId, message) {
    try {
      const { scenario, sessionId } = message;
      
      // 运行对比测试
      const comparisonResult = await this.performanceComparison.runComparison(scenario);
      
      this.sendToClient(clientId, {
        type: 'comparison_data',
        comparison: comparisonResult,
        sessionId: sessionId
      });
      
    } catch (error) {
      console.error('运行对比测试失败:', error);
      this.sendToClient(clientId, {
        type: 'comparison_failed',
        error: error.message
      });
    }
  }

  /**
   * 处理提交用户反馈
   * @param {string} clientId - 客户端ID
   * @param {Object} message - 消息对象
   */
  async handleSubmitFeedback(clientId, message) {
    try {
      const { feedback, sessionId } = message;
      
      // 添加客户端信息
      const feedbackData = {
        ...feedback,
        clientId: clientId,
        sessionId: sessionId,
        submittedAt: Date.now(),
        id: uuidv4()
      };
      
      // 保存反馈
      this.userFeedbacks.push(feedbackData);
      
      // 保存到文件
      await this.saveFeedbackToFile(feedbackData);
      
      this.sendToClient(clientId, {
        type: 'feedback_submitted',
        feedbackId: feedbackData.id
      });
      
    } catch (error) {
      console.error('提交用户反馈失败:', error);
      this.sendToClient(clientId, {
        type: 'feedback_failed',
        error: error.message
      });
    }
  }

  /**
   * 保存反馈到文件
   * @param {Object} feedback - 反馈数据
   */
  async saveFeedbackToFile(feedback) {
    try {
      const feedbackDir = path.join(__dirname, '../../data/feedback');
      await fs.mkdir(feedbackDir, { recursive: true });
      
      const filename = `feedback-${feedback.id}.json`;
      const filepath = path.join(feedbackDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(feedback, null, 2));
      
    } catch (error) {
      console.error('保存反馈文件失败:', error);
    }
  }

  /**
   * 处理客户端断开连接
   * @param {string} clientId - 客户端ID
   */
  handleClientDisconnection(clientId) {
    const client = this.clients.get(clientId);
    if (client) {
      console.log(`客户端断开连接: ${clientId}`);
      
      // 清理相关测试会话
      for (const [testId, session] of this.activeSessions.entries()) {
        if (session.clientId === clientId) {
          session.status = 'disconnected';
          session.endTime = Date.now();
        }
      }
      
      this.clients.delete(clientId);
    }
  }

  /**
   * 发送消息给指定客户端
   * @param {string} clientId - 客户端ID
   * @param {Object} message - 消息对象
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`发送消息给客户端 ${clientId} 失败:`, error);
      }
    }
  }

  /**
   * 广播消息给所有客户端
   * @param {Object} message - 消息对象
   */
  broadcastToClients(message) {
    for (const [clientId, client] of this.clients.entries()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error(`广播消息给客户端 ${clientId} 失败:`, error);
        }
      }
    }
  }

  /**
   * 设置定时清理
   */
  setupCleanupInterval() {
    setInterval(() => {
      this.cleanupExpiredSessions();
      this.cleanupInactiveClients();
    }, 60000); // 每分钟清理一次
  }

  /**
   * 清理过期会话
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    
    for (const [testId, session] of this.activeSessions.entries()) {
      if (now - session.startTime > this.config.sessionTimeout) {
        console.log(`清理过期测试会话: ${testId}`);
        this.activeSessions.delete(testId);
      }
    }
  }

  /**
   * 清理不活跃客户端
   */
  cleanupInactiveClients() {
    const now = Date.now();
    const inactiveTimeout = 10 * 60 * 1000; // 10分钟
    
    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastActivity > inactiveTimeout) {
        console.log(`清理不活跃客户端: ${clientId}`);
        client.ws.close(1000, '客户端不活跃');
        this.clients.delete(clientId);
      }
    }
  }

  /**
   * 获取服务状态
   * @returns {Object} 服务状态信息
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      clientCount: this.clients.size,
      activeSessionCount: this.activeSessions.size,
      testResultCount: this.testResults.size,
      feedbackCount: this.userFeedbacks.length,
      uptime: process.uptime()
    };
  }

  /**
   * 关闭服务
   */
  async shutdown() {
    try {
      console.log('正在关闭性能评估服务...');
      
      // 关闭所有客户端连接
      for (const [clientId, client] of this.clients.entries()) {
        client.ws.close(1001, '服务器关闭');
      }
      
      // 关闭WebSocket服务器
      if (this.wss) {
        this.wss.close();
      }
      
      // 停止性能监控
      this.performanceMetrics.stopMonitoring();
      
      // 关闭相关服务
      await this.modeToggleService.shutdown();
      
      console.log('性能评估服务已关闭');
      
    } catch (error) {
      console.error('关闭性能评估服务失败:', error);
      throw error;
    }
  }
}

module.exports = PerformanceEvaluationService;