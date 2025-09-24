/**
 * 性能评估服务
 * 提供CDP与VNC性能对比测试的WebSocket服务
 */

const WebSocket = require('ws');
const EventEmitter = require('events');
const PerformanceMetrics = require('../scripts/performanceMetrics');
const AutomatedTestCases = require('../scripts/automatedTestCases');
const PerformanceComparison = require('../scripts/performanceComparison');
const PerformanceReportGenerator = require('../scripts/performanceReportGenerator');

class PerformanceEvaluationService extends EventEmitter {
  constructor() {
    super();
    this.wss = null;
    this.clients = new Map();
    this.activeTests = new Map();
    this.performanceMetrics = new PerformanceMetrics();
    this.automatedTestCases = new AutomatedTestCases();
    this.performanceComparison = new PerformanceComparison();
    this.reportGenerator = new PerformanceReportGenerator();
    this.metricsInterval = null;
  }

  /**
   * 初始化WebSocket服务器
   * @param {number} port - 端口号
   */
  initialize(port = 3001) {
    this.wss = new WebSocket.Server({ 
      port,
      path: '/performance-evaluation'
    });

    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      console.log(`性能评估客户端连接: ${clientId}`);
      
      this.clients.set(clientId, {
        ws,
        sessionId: null,
        currentMode: 'vnc',
        testStatus: 'idle'
      });

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          this.handleClientMessage(clientId, data);
        } catch (error) {
          console.error('解析消息失败:', error);
          this.sendError(clientId, '消息格式错误');
        }
      });

      ws.on('close', () => {
        console.log(`性能评估客户端断开: ${clientId}`);
        this.clients.delete(clientId);
        this.cleanupClientResources(clientId);
      });

      ws.on('error', (error) => {
        console.error(`客户端错误 ${clientId}:`, error);
      });

      // 发送连接确认
      this.sendMessage(clientId, {
        type: 'connected',
        clientId,
        timestamp: Date.now()
      });
    });

    console.log(`性能评估WebSocket服务启动在端口 ${port}`);
  }

  /**
   * 处理客户端消息
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 消息数据
   */
  async handleClientMessage(clientId, data) {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      switch (data.type) {
        case 'switch_mode':
          await this.handleModeSwitch(clientId, data);
          break;
        case 'start_test':
          await this.handleStartTest(clientId, data);
          break;
        case 'stop_test':
          await this.handleStopTest(clientId, data);
          break;
        case 'get_metrics':
          await this.handleGetMetrics(clientId, data);
          break;
        case 'run_comparison':
          await this.handleRunComparison(clientId, data);
          break;
        case 'submit_feedback':
          await this.handleSubmitFeedback(clientId, data);
          break;
        default:
          console.log(`未知消息类型: ${data.type}`);
      }
    } catch (error) {
      console.error(`处理消息失败 ${clientId}:`, error);
      this.sendError(clientId, error.message);
    }
  }

  /**
   * 处理模式切换
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 消息数据
   */
  async handleModeSwitch(clientId, data) {
    const client = this.clients.get(clientId);
    const { mode, sessionId } = data;

    console.log(`切换模式: ${client.currentMode} -> ${mode}`);
    
    // 模拟模式切换延迟
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    client.currentMode = mode;
    client.sessionId = sessionId;
    
    this.sendMessage(clientId, {
      type: 'mode_switched',
      mode,
      sessionId,
      timestamp: Date.now()
    });
  }

  /**
   * 处理开始测试
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 消息数据
   */
  async handleStartTest(clientId, data) {
    const client = this.clients.get(clientId);
    const { scenario, mode, sessionId } = data;

    console.log(`开始性能测试: ${scenario} (${mode})`);
    
    client.testStatus = 'running';
    client.sessionId = sessionId;
    
    const testId = this.generateTestId();
    this.activeTests.set(testId, {
      clientId,
      scenario,
      mode,
      startTime: Date.now(),
      metrics: []
    });

    // 开始收集性能指标
    this.startMetricsCollection(testId);
    
    // 运行自动化测试用例
    try {
      const testResults = await this.automatedTestCases.runScenario(scenario, mode);
      
      // 停止指标收集
      this.stopMetricsCollection(testId);
      
      const test = this.activeTests.get(testId);
      const duration = Date.now() - test.startTime;
      
      const results = {
        testId,
        scenario,
        mode,
        duration,
        success: testResults.success,
        metrics: testResults.metrics,
        details: testResults.details
      };
      
      client.testStatus = 'completed';
      this.activeTests.delete(testId);
      
      this.sendMessage(clientId, {
        type: 'test_completed',
        results,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('测试执行失败:', error);
      this.stopMetricsCollection(testId);
      client.testStatus = 'idle';
      this.activeTests.delete(testId);
      this.sendError(clientId, '测试执行失败: ' + error.message);
    }
  }

  /**
   * 处理停止测试
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 消息数据
   */
  async handleStopTest(clientId, data) {
    const client = this.clients.get(clientId);
    
    console.log(`停止性能测试: ${clientId}`);
    
    // 找到并停止该客户端的活跃测试
    for (const [testId, test] of this.activeTests.entries()) {
      if (test.clientId === clientId) {
        this.stopMetricsCollection(testId);
        this.activeTests.delete(testId);
        break;
      }
    }
    
    client.testStatus = 'idle';
    
    this.sendMessage(clientId, {
      type: 'test_stopped',
      timestamp: Date.now()
    });
  }

  /**
   * 处理获取性能指标
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 消息数据
   */
  async handleGetMetrics(clientId, data) {
    try {
      const metrics = await this.performanceMetrics.getCurrentMetrics();
      
      this.sendMessage(clientId, {
        type: 'performance_metrics',
        metrics,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('获取性能指标失败:', error);
      this.sendError(clientId, '获取性能指标失败');
    }
  }

  /**
   * 处理运行对比测试
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 消息数据
   */
  async handleRunComparison(clientId, data) {
    const { scenario, sessionId } = data;
    
    console.log(`运行对比测试: ${scenario}`);
    
    try {
      const comparisonResults = await this.performanceComparison.runComparison(scenario);
      
      this.sendMessage(clientId, {
        type: 'comparison_data',
        comparison: comparisonResults,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('对比测试失败:', error);
      this.sendError(clientId, '对比测试失败: ' + error.message);
    }
  }

  /**
   * 处理提交用户反馈
   * @param {string} clientId - 客户端ID
   * @param {Object} data - 消息数据
   */
  async handleSubmitFeedback(clientId, data) {
    const { feedback, sessionId } = data;
    
    console.log(`收到用户反馈: ${clientId}`, feedback);
    
    try {
      // 保存反馈到文件或数据库
      await this.saveFeedback(feedback);
      
      this.sendMessage(clientId, {
        type: 'feedback_submitted',
        success: true,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('保存反馈失败:', error);
      this.sendError(clientId, '保存反馈失败');
    }
  }

  /**
   * 开始收集性能指标
   * @param {string} testId - 测试ID
   */
  startMetricsCollection(testId) {
    const test = this.activeTests.get(testId);
    if (!test) return;
    
    const interval = setInterval(async () => {
      try {
        const metrics = await this.performanceMetrics.getCurrentMetrics();
        test.metrics.push({
          timestamp: Date.now(),
          ...metrics
        });
        
        // 发送实时指标给客户端
        const client = this.clients.get(test.clientId);
        if (client && client.ws.readyState === WebSocket.OPEN) {
          this.sendMessage(test.clientId, {
            type: 'performance_metrics',
            metrics,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        console.error('收集性能指标失败:', error);
      }
    }, 1000);
    
    test.metricsInterval = interval;
  }

  /**
   * 停止收集性能指标
   * @param {string} testId - 测试ID
   */
  stopMetricsCollection(testId) {
    const test = this.activeTests.get(testId);
    if (test && test.metricsInterval) {
      clearInterval(test.metricsInterval);
      test.metricsInterval = null;
    }
  }

  /**
   * 保存用户反馈
   * @param {Object} feedback - 反馈数据
   */
  async saveFeedback(feedback) {
    const fs = require('fs').promises;
    const path = require('path');
    
    const feedbackDir = path.join(__dirname, '../data/feedback');
    await fs.mkdir(feedbackDir, { recursive: true });
    
    const filename = `feedback_${Date.now()}.json`;
    const filepath = path.join(feedbackDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(feedback, null, 2));
    console.log(`反馈已保存: ${filepath}`);
  }

  /**
   * 发送消息给客户端
   * @param {string} clientId - 客户端ID
   * @param {Object} message - 消息对象
   */
  sendMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  /**
   * 发送错误消息
   * @param {string} clientId - 客户端ID
   * @param {string} error - 错误信息
   */
  sendError(clientId, error) {
    this.sendMessage(clientId, {
      type: 'error',
      error,
      timestamp: Date.now()
    });
  }

  /**
   * 生成客户端ID
   * @returns {string} 客户端ID
   */
  generateClientId() {
    return 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 生成测试ID
   * @returns {string} 测试ID
   */
  generateTestId() {
    return 'test_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 清理客户端资源
   * @param {string} clientId - 客户端ID
   */
  cleanupClientResources(clientId) {
    // 停止该客户端的所有活跃测试
    for (const [testId, test] of this.activeTests.entries()) {
      if (test.clientId === clientId) {
        this.stopMetricsCollection(testId);
        this.activeTests.delete(testId);
      }
    }
  }

  /**
   * 关闭服务
   */
  close() {
    if (this.wss) {
      this.wss.close();
    }
    
    // 清理所有活跃测试
    for (const testId of this.activeTests.keys()) {
      this.stopMetricsCollection(testId);
    }
    this.activeTests.clear();
    
    console.log('性能评估服务已关闭');
  }
}

module.exports = PerformanceEvaluationService;