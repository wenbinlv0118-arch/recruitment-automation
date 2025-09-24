const EventEmitter = require('events');
const { performance } = require('perf_hooks');

/**
 * 屏幕录制服务
 * 处理CDP实时屏幕录制的帧数据，包括帧缓存、压缩和转发
 */
class ScreenRecordingService extends EventEmitter {
  constructor() {
    super();
    
    // 帧缓存配置
    this.frameBuffer = [];
    this.maxBufferSize = 10; // 最大缓存帧数
    this.frameRate = 30; // 目标帧率
    this.lastFrameTime = 0;
    this.frameInterval = 1000 / this.frameRate; // 帧间隔（毫秒）
    
    // 性能监控
    this.stats = {
      totalFrames: 0,
      droppedFrames: 0,
      averageProcessingTime: 0,
      lastUpdateTime: Date.now()
    };
    
    // 连接状态
    this.isRecording = false;
    this.clients = new Set(); // 连接的客户端
    
    console.log('ScreenRecordingService initialized');
  }

  /**
   * 开始屏幕录制
   * @param {Object} options - 录制选项
   * @param {number} options.frameRate - 帧率
   * @param {string} options.format - 图像格式 (jpeg/png)
   * @param {number} options.quality - 图像质量 (1-100)
   */
  startRecording(options = {}) {
    const {
      frameRate = 30,
      format = 'jpeg',
      quality = 80
    } = options;
    
    this.frameRate = frameRate;
    this.frameInterval = 1000 / frameRate;
    this.format = format;
    this.quality = quality;
    
    this.isRecording = true;
    this.stats = {
      totalFrames: 0,
      droppedFrames: 0,
      averageProcessingTime: 0,
      lastUpdateTime: Date.now()
    };
    
    console.log(`Screen recording started - FPS: ${frameRate}, Format: ${format}, Quality: ${quality}`);
    this.emit('recording-started', { frameRate, format, quality });
  }

  /**
   * 停止屏幕录制
   */
  stopRecording() {
    this.isRecording = false;
    this.frameBuffer = [];
    
    console.log('Screen recording stopped');
    console.log('Recording stats:', this.stats);
    
    this.emit('recording-stopped', this.stats);
  }

  /**
   * 处理接收到的屏幕帧
   * @param {Object} frameData - CDP屏幕帧数据
   * @param {string} frameData.data - Base64编码的图像数据
   * @param {Object} frameData.metadata - 帧元数据
   */
  processFrame(frameData) {
    if (!this.isRecording) {
      return;
    }

    const startTime = performance.now();
    const currentTime = Date.now();
    
    // 帧率控制 - 跳过过于频繁的帧
    if (currentTime - this.lastFrameTime < this.frameInterval) {
      this.stats.droppedFrames++;
      return;
    }
    
    try {
      // 处理帧数据
      const processedFrame = this.enhanceFrame(frameData);
      
      // 添加到缓存
      this.addToBuffer(processedFrame);
      
      // 广播给所有客户端
      this.broadcastFrame(processedFrame);
      
      // 更新统计信息
      this.updateStats(startTime);
      this.lastFrameTime = currentTime;
      
    } catch (error) {
      console.error('Error processing frame:', error);
      this.emit('frame-error', error);
    }
  }

  /**
   * 增强帧数据，添加时间戳和元数据
   * @param {Object} frameData - 原始帧数据
   * @returns {Object} 增强后的帧数据
   */
  enhanceFrame(frameData) {
    return {
      id: this.generateFrameId(),
      timestamp: Date.now(),
      data: frameData.data,
      metadata: {
        ...frameData.metadata,
        frameNumber: this.stats.totalFrames,
        format: this.format,
        quality: this.quality
      }
    };
  }

  /**
   * 添加帧到缓存
   * @param {Object} frame - 处理后的帧数据
   */
  addToBuffer(frame) {
    this.frameBuffer.push(frame);
    
    // 保持缓存大小限制
    if (this.frameBuffer.length > this.maxBufferSize) {
      this.frameBuffer.shift(); // 移除最旧的帧
    }
  }

  /**
   * 广播帧给所有连接的客户端
   * @param {Object} frame - 帧数据
   */
  broadcastFrame(frame) {
    if (this.clients.size === 0) {
      return;
    }

    const frameMessage = {
      type: 'screen-frame',
      data: frame
    };

    this.clients.forEach(client => {
      try {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify(frameMessage));
        }
      } catch (error) {
        console.error('Error sending frame to client:', error);
        this.removeClient(client);
      }
    });
  }

  /**
   * 添加客户端连接
   * @param {WebSocket} client - WebSocket客户端
   */
  addClient(client) {
    this.clients.add(client);
    console.log(`Client connected. Total clients: ${this.clients.size}`);
    
    // 发送最新帧给新客户端
    if (this.frameBuffer.length > 0) {
      const latestFrame = this.frameBuffer[this.frameBuffer.length - 1];
      const frameMessage = {
        type: 'screen-frame',
        data: latestFrame
      };
      
      try {
        client.send(JSON.stringify(frameMessage));
      } catch (error) {
        console.error('Error sending initial frame to client:', error);
      }
    }
    
    this.emit('client-connected', { clientCount: this.clients.size });
  }

  /**
   * 移除客户端连接
   * @param {WebSocket} client - WebSocket客户端
   */
  removeClient(client) {
    this.clients.delete(client);
    console.log(`Client disconnected. Total clients: ${this.clients.size}`);
    this.emit('client-disconnected', { clientCount: this.clients.size });
  }

  /**
   * 获取最新帧
   * @returns {Object|null} 最新的帧数据
   */
  getLatestFrame() {
    return this.frameBuffer.length > 0 ? this.frameBuffer[this.frameBuffer.length - 1] : null;
  }

  /**
   * 获取录制统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      isRecording: this.isRecording,
      clientCount: this.clients.size,
      bufferSize: this.frameBuffer.length,
      frameRate: this.frameRate
    };
  }

  /**
   * 更新性能统计
   * @param {number} startTime - 处理开始时间
   */
  updateStats(startTime) {
    const processingTime = performance.now() - startTime;
    this.stats.totalFrames++;
    
    // 计算平均处理时间
    this.stats.averageProcessingTime = 
      (this.stats.averageProcessingTime * (this.stats.totalFrames - 1) + processingTime) / this.stats.totalFrames;
  }

  /**
   * 生成唯一帧ID
   * @returns {string} 帧ID
   */
  generateFrameId() {
    return `frame_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.stopRecording();
    this.clients.clear();
    this.frameBuffer = [];
    this.removeAllListeners();
    console.log('ScreenRecordingService cleaned up');
  }
}

module.exports = ScreenRecordingService;