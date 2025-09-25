/**
 * 性能评估组件
 * 用于CDP与VNC性能对比测试和用户体验评估
 */

import React, { useState, useEffect, useRef } from 'react';
import './PerformanceEvaluation.css';

const PerformanceEvaluation = () => {
  const [currentMode, setCurrentMode] = useState('vnc');
  const [testStatus, setTestStatus] = useState('idle'); // idle, running, completed
  const [testResults, setTestResults] = useState(null);
  const [userFeedback, setUserFeedback] = useState({
    responsiveness: 5,
    visualQuality: 5,
    stability: 5,
    overallExperience: 5,
    comments: ''
  });
  const [performanceMetrics, setPerformanceMetrics] = useState({
    latency: 0,
    frameRate: 0,
    memoryUsage: 0,
    cpuUsage: 0
  });
  const [testScenarios] = useState([
    { id: 'zhilian', name: '智联招聘测试', description: '模拟智联招聘网站操作' },
    { id: 'boss', name: 'BOSS直聘测试', description: '模拟BOSS直聘网站操作' },
    { id: 'liepin', name: '猎聘测试', description: '模拟猎聘网站操作' },
    { id: 'complex', name: '复杂交互测试', description: '多标签页和复杂操作测试' }
  ]);
  const [selectedScenario, setSelectedScenario] = useState('zhilian');
  const [comparisonData, setComparisonData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const wsRef = useRef(null);
  const metricsIntervalRef = useRef(null);
  const testStartTimeRef = useRef(null);

  useEffect(() => {
    // 初始化WebSocket连接
    initializeWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (metricsIntervalRef.current) {
        clearInterval(metricsIntervalRef.current);
      }
    };
  }, []);

  /**
   * 初始化WebSocket连接
   */
  const initializeWebSocket = () => {
    try {
      wsRef.current = new WebSocket('ws://localhost:3001/performance-evaluation');
      
      wsRef.current.onopen = () => {
        console.log('性能评估WebSocket连接已建立');
        setIsConnected(true);
      };
      
      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      };
      
      wsRef.current.onclose = () => {
        console.log('性能评估WebSocket连接已关闭');
        setIsConnected(false);
        // 尝试重连
        setTimeout(initializeWebSocket, 3000);
      };
      
      wsRef.current.onerror = (error) => {
        console.error('性能评估WebSocket错误:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('初始化WebSocket失败:', error);
    }
  };

  /**
   * 处理WebSocket消息
   * @param {Object} data - 消息数据
   */
  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'connected':
        console.log('WebSocket连接确认:', data.clientId);
        setIsConnected(true);
        break;
      case 'performance_metrics':
        setPerformanceMetrics(data.metrics);
        break;
      case 'test_completed':
        setTestStatus('completed');
        setTestResults(data.results);
        break;
      case 'mode_switched':
        setCurrentMode(data.mode);
        setTestStatus('idle');
        break;
      case 'mode_switch_failed':
        console.error('模式切换失败:', data.error);
        alert('模式切换失败: ' + data.error);
        setTestStatus('idle');
        break;
      case 'comparison_data':
        setComparisonData(data.comparison);
        break;
      case 'error':
        console.error('服务器错误:', data.message);
        alert('服务器错误: ' + data.message);
        break;
      default:
        console.log('未知消息类型:', data.type);
    }
  };

  /**
   * 发送WebSocket消息
   * @param {Object} message - 消息对象
   */
  const sendWebSocketMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket未连接，无法发送消息');
    }
  };

  /**
   * 切换模式
   * @param {string} mode - 目标模式
   */
  const switchMode = async (mode) => {
    if (testStatus === 'running') {
      alert('测试进行中，无法切换模式');
      return;
    }

    try {
      setTestStatus('switching');
      
      sendWebSocketMessage({
        type: 'switch_mode',
        mode: mode,
        sessionId: 'evaluation_session'
      });
      
      // 重置性能指标
      setPerformanceMetrics({
        latency: 0,
        frameRate: 0,
        memoryUsage: 0,
        cpuUsage: 0
      });
      
    } catch (error) {
      console.error('切换模式失败:', error);
      alert('切换模式失败: ' + error.message);
      setTestStatus('idle');
    }
  };

  /**
   * 开始性能测试
   */
  const startPerformanceTest = async () => {
    if (!isConnected) {
      alert('WebSocket未连接，无法开始测试');
      return;
    }

    try {
      setTestStatus('running');
      setTestResults(null);
      testStartTimeRef.current = Date.now();
      
      // 发送开始测试消息
      sendWebSocketMessage({
        type: 'start_test',
        scenario: selectedScenario,
        mode: currentMode,
        sessionId: 'evaluation_session'
      });
      
      // 开始收集性能指标
      startMetricsCollection();
      
    } catch (error) {
      console.error('开始测试失败:', error);
      alert('开始测试失败: ' + error.message);
      setTestStatus('idle');
    }
  };

  /**
   * 停止性能测试
   */
  const stopPerformanceTest = () => {
    setTestStatus('idle');
    
    sendWebSocketMessage({
      type: 'stop_test',
      sessionId: 'evaluation_session'
    });
    
    stopMetricsCollection();
  };

  /**
   * 开始收集性能指标
   */
  const startMetricsCollection = () => {
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
    }
    
    metricsIntervalRef.current = setInterval(() => {
      sendWebSocketMessage({
        type: 'get_metrics',
        sessionId: 'evaluation_session'
      });
    }, 1000); // 每秒收集一次指标
  };

  /**
   * 停止收集性能指标
   */
  const stopMetricsCollection = () => {
    if (metricsIntervalRef.current) {
      clearInterval(metricsIntervalRef.current);
      metricsIntervalRef.current = null;
    }
  };

  /**
   * 运行对比测试
   */
  const runComparisonTest = async () => {
    if (!isConnected) {
      alert('WebSocket未连接，无法开始对比测试');
      return;
    }

    try {
      setTestStatus('running');
      setComparisonData(null);
      
      sendWebSocketMessage({
        type: 'run_comparison',
        scenario: selectedScenario,
        sessionId: 'evaluation_session'
      });
      
    } catch (error) {
      console.error('对比测试失败:', error);
      alert('对比测试失败: ' + error.message);
      setTestStatus('idle');
    }
  };

  /**
   * 提交用户反馈
   */
  const submitFeedback = async () => {
    try {
      const feedbackData = {
        ...userFeedback,
        mode: currentMode,
        scenario: selectedScenario,
        timestamp: Date.now(),
        performanceMetrics: performanceMetrics
      };
      
      sendWebSocketMessage({
        type: 'submit_feedback',
        feedback: feedbackData,
        sessionId: 'evaluation_session'
      });
      
      alert('反馈提交成功！');
      
      // 重置反馈表单
      setUserFeedback({
        responsiveness: 5,
        visualQuality: 5,
        stability: 5,
        overallExperience: 5,
        comments: ''
      });
      
    } catch (error) {
      console.error('提交反馈失败:', error);
      alert('提交反馈失败: ' + error.message);
    }
  };

  /**
   * 导出测试报告
   */
  const exportReport = () => {
    if (!testResults && !comparisonData) {
      alert('没有可导出的测试数据');
      return;
    }
    
    const reportData = {
      timestamp: Date.now(),
      currentMode,
      selectedScenario,
      testResults,
      comparisonData,
      userFeedback,
      performanceMetrics
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-evaluation-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * 格式化性能数值
   * @param {number} value - 数值
   * @param {string} unit - 单位
   * @returns {string} 格式化后的字符串
   */
  const formatMetric = (value, unit) => {
    if (typeof value !== 'number') return '0 ' + unit;
    return value.toFixed(1) + ' ' + unit;
  };

  /**
   * 获取性能等级颜色
   * @param {number} value - 数值
   * @param {string} type - 类型
   * @returns {string} 颜色类名
   */
  const getPerformanceColor = (value, type) => {
    switch (type) {
      case 'latency':
        if (value < 50) return 'excellent';
        if (value < 100) return 'good';
        if (value < 200) return 'fair';
        return 'poor';
      case 'frameRate':
        if (value >= 30) return 'excellent';
        if (value >= 20) return 'good';
        if (value >= 15) return 'fair';
        return 'poor';
      case 'memory':
      case 'cpu':
        if (value < 30) return 'excellent';
        if (value < 50) return 'good';
        if (value < 70) return 'fair';
        return 'poor';
      default:
        return 'fair';
    }
  };

  return (
    <div className="performance-evaluation">
      <div className="evaluation-header">
        <h1>性能评估与对比测试</h1>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></span>
          {isConnected ? '已连接' : '未连接'}
        </div>
      </div>

      <div className="evaluation-content">
        {/* 模式切换区域 */}
        <div className="mode-section">
          <h2>模式切换</h2>
          <div className="mode-controls">
            <div className="current-mode">
              <span>当前模式: </span>
              <span className={`mode-badge ${currentMode}`}>
                {currentMode === 'vnc' ? 'VNC模式' : 'CDP模式'}
              </span>
            </div>
            <div className="mode-buttons">
              <button
                className={`mode-btn ${currentMode === 'vnc' ? 'active' : ''}`}
                onClick={() => switchMode('vnc')}
                disabled={testStatus === 'running' || testStatus === 'switching' || !isConnected}
              >
                {testStatus === 'switching' ? '切换中...' : '切换到VNC'}
              </button>
              <button
                className={`mode-btn ${currentMode === 'cdp' ? 'active' : ''}`}
                onClick={() => switchMode('cdp')}
                disabled={testStatus === 'running' || testStatus === 'switching' || !isConnected}
              >
                {testStatus === 'switching' ? '切换中...' : '切换到CDP'}
              </button>
            </div>
          </div>
        </div>

        {/* 测试场景选择 */}
        <div className="scenario-section">
          <h2>测试场景</h2>
          <div className="scenario-selector">
            {testScenarios.map(scenario => (
              <div
                key={scenario.id}
                className={`scenario-card ${selectedScenario === scenario.id ? 'selected' : ''}`}
                onClick={() => setSelectedScenario(scenario.id)}
              >
                <h3>{scenario.name}</h3>
                <p>{scenario.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 性能指标显示 */}
        <div className="metrics-section">
          <h2>实时性能指标</h2>
          <div className="metrics-grid">
            <div className={`metric-card ${getPerformanceColor(performanceMetrics.latency, 'latency')}`}>
              <h3>延迟</h3>
              <div className="metric-value">{formatMetric(performanceMetrics.latency, 'ms')}</div>
            </div>
            <div className={`metric-card ${getPerformanceColor(performanceMetrics.frameRate, 'frameRate')}`}>
              <h3>帧率</h3>
              <div className="metric-value">{formatMetric(performanceMetrics.frameRate, 'FPS')}</div>
            </div>
            <div className={`metric-card ${getPerformanceColor(performanceMetrics.memoryUsage, 'memory')}`}>
              <h3>内存使用</h3>
              <div className="metric-value">{formatMetric(performanceMetrics.memoryUsage, 'MB')}</div>
            </div>
            <div className={`metric-card ${getPerformanceColor(performanceMetrics.cpuUsage, 'cpu')}`}>
              <h3>CPU使用</h3>
              <div className="metric-value">{formatMetric(performanceMetrics.cpuUsage, '%')}</div>
            </div>
          </div>
        </div>

        {/* 测试控制 */}
        <div className="test-controls">
          <h2>测试控制</h2>
          <div className="control-buttons">
            <button
              className="test-btn start"
              onClick={startPerformanceTest}
              disabled={testStatus === 'running' || testStatus === 'switching' || !isConnected}
            >
              {testStatus === 'running' ? '测试进行中...' : testStatus === 'switching' ? '模式切换中...' : '开始性能测试'}
            </button>
            <button
              className="test-btn stop"
              onClick={stopPerformanceTest}
              disabled={testStatus !== 'running'}
            >
              停止测试
            </button>
            <button
              className="test-btn comparison"
              onClick={runComparisonTest}
              disabled={testStatus === 'running' || testStatus === 'switching' || !isConnected}
            >
              {testStatus === 'switching' ? '模式切换中...' : '运行对比测试'}
            </button>
          </div>
        </div>

        {/* 测试结果显示 */}
        {testResults && (
          <div className="results-section">
            <h2>测试结果</h2>
            <div className="results-content">
              <div className="result-summary">
                <h3>测试摘要</h3>
                <p>测试模式: {testResults.mode}</p>
                <p>测试场景: {testResults.scenario}</p>
                <p>测试时长: {testResults.duration}ms</p>
                <p>测试状态: {testResults.success ? '成功' : '失败'}</p>
              </div>
              <div className="result-metrics">
                <h3>性能指标</h3>
                <pre>{JSON.stringify(testResults.metrics, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}

        {/* 对比结果显示 */}
        {comparisonData && (
          <div className="comparison-section">
            <h2>对比测试结果</h2>
            <div className="comparison-content">
              <div className="comparison-summary">
                <h3>性能对比摘要</h3>
                <p>延迟改进: {comparisonData.latencyImprovement?.toFixed(1)}%</p>
                <p>帧率改进: {comparisonData.frameRateImprovement?.toFixed(1)}%</p>
                <p>内存优化: {comparisonData.memoryImprovement?.toFixed(1)}%</p>
                <p>总体建议: {comparisonData.recommendation}</p>
              </div>
              <div className="comparison-chart">
                <h3>详细对比数据</h3>
                <pre>{JSON.stringify(comparisonData, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}

        {/* 用户反馈区域 */}
        <div className="feedback-section">
          <h2>用户体验反馈</h2>
          <div className="feedback-form">
            <div className="rating-group">
              <label>响应速度 (1-10):</label>
              <input
                type="range"
                min="1"
                max="10"
                value={userFeedback.responsiveness}
                onChange={(e) => setUserFeedback({
                  ...userFeedback,
                  responsiveness: parseInt(e.target.value)
                })}
              />
              <span>{userFeedback.responsiveness}</span>
            </div>
            
            <div className="rating-group">
              <label>视觉质量 (1-10):</label>
              <input
                type="range"
                min="1"
                max="10"
                value={userFeedback.visualQuality}
                onChange={(e) => setUserFeedback({
                  ...userFeedback,
                  visualQuality: parseInt(e.target.value)
                })}
              />
              <span>{userFeedback.visualQuality}</span>
            </div>
            
            <div className="rating-group">
              <label>稳定性 (1-10):</label>
              <input
                type="range"
                min="1"
                max="10"
                value={userFeedback.stability}
                onChange={(e) => setUserFeedback({
                  ...userFeedback,
                  stability: parseInt(e.target.value)
                })}
              />
              <span>{userFeedback.stability}</span>
            </div>
            
            <div className="rating-group">
              <label>整体体验 (1-10):</label>
              <input
                type="range"
                min="1"
                max="10"
                value={userFeedback.overallExperience}
                onChange={(e) => setUserFeedback({
                  ...userFeedback,
                  overallExperience: parseInt(e.target.value)
                })}
              />
              <span>{userFeedback.overallExperience}</span>
            </div>
            
            <div className="comment-group">
              <label>详细评价:</label>
              <textarea
                value={userFeedback.comments}
                onChange={(e) => setUserFeedback({
                  ...userFeedback,
                  comments: e.target.value
                })}
                placeholder="请描述您的使用体验，包括遇到的问题和建议..."
                rows="4"
              />
            </div>
            
            <button
              className="feedback-btn"
              onClick={submitFeedback}
              disabled={!isConnected}
            >
              提交反馈
            </button>
          </div>
        </div>

        {/* 报告导出 */}
        <div className="export-section">
          <h2>报告导出</h2>
          <button
            className="export-btn"
            onClick={exportReport}
            disabled={!testResults && !comparisonData}
          >
            导出测试报告
          </button>
        </div>
      </div>
    </div>
  );
};

export default PerformanceEvaluation;