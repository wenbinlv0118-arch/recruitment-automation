# CDP服务使用指南

## 概述

CDP（Chrome DevTools Protocol）服务是一个基于Chrome DevTools协议的远程浏览器控制解决方案，提供实时屏幕录制、用户交互处理、性能监控等功能。

## 架构组件

### 核心服务

1. **CDPService** - CDP连接管理和基础操作
2. **ScreenRecordingService** - 实时屏幕录制和帧处理
3. **UserInteractionService** - 用户交互事件处理
4. **CDPHealthMonitor** - 健康检查和性能监控
5. **CDPErrorHandler** - 错误处理和恢复机制

### 支持组件

- **CDPConfig** - 配置管理
- **CDPPuppeteerBridge** - Puppeteer集成桥接
- **CDPSocketHandlers** - WebSocket事件处理

## 快速开始

### 1. 环境准备

```bash
# 确保Chrome已安装
# macOS
brew install --cask google-chrome

# 安装依赖
npm install
```

### 2. 启动CDP服务

```bash
# 启动CDP Chrome实例
node src/services/startCDP.js --port 9222 --headless

# 启动后端服务
npm start
```

### 3. 基础使用示例

```javascript
const CDPService = require('./src/services/cdpService');
const ScreenRecordingService = require('./src/services/screenRecordingService');
const UserInteractionService = require('./src/services/userInteractionService');

// 初始化服务
const cdpService = new CDPService({
  host: 'localhost',
  port: 9222
});

const screenRecording = new ScreenRecordingService();
const userInteraction = new UserInteractionService();

// 连接到Chrome
async function initializeCDP() {
  try {
    await cdpService.connect();
    console.log('CDP连接成功');
    
    // 导航到页面
    await cdpService.navigate('https://example.com');
    
    // 开始屏幕录制
    await cdpService.startScreencast();
    
    // 启用用户交互
    userInteraction.enable();
    
  } catch (error) {
    console.error('CDP初始化失败:', error);
  }
}

initializeCDP();
```

## 详细功能说明

### CDPService

#### 连接管理

```javascript
// 连接到Chrome实例
await cdpService.connect();

// 检查连接状态
const isConnected = cdpService.isConnected();

// 断开连接
await cdpService.disconnect();
```

#### 页面操作

```javascript
// 导航到URL
await cdpService.navigate('https://example.com');

// 执行JavaScript
const result = await cdpService.evaluateScript('document.title');

// 获取页面信息
const pageInfo = await cdpService.getPageInfo();
```

#### 屏幕录制

```javascript
// 开始屏幕录制
await cdpService.startScreencast({
  format: 'jpeg',
  quality: 80,
  maxWidth: 1920,
  maxHeight: 1080
});

// 停止屏幕录制
await cdpService.stopScreencast();
```

### ScreenRecordingService

#### 基础配置

```javascript
const screenRecording = new ScreenRecordingService({
  frameRate: 30,
  quality: 80,
  bufferSize: 10,
  enableFrameEnhancement: true
});

// 监听帧事件
screenRecording.on('frame', (frameData) => {
  console.log('收到新帧:', frameData.size);
});

// 监听性能事件
screenRecording.on('performance', (stats) => {
  console.log('性能统计:', stats);
});
```

#### 客户端管理

```javascript
// 添加客户端
const clientId = 'client_123';
screenRecording.addClient(clientId, {
  quality: 60,
  maxFrameRate: 24
});

// 移除客户端
screenRecording.removeClient(clientId);

// 广播帧到所有客户端
screenRecording.broadcastFrame(frameData);
```

### UserInteractionService

#### 交互处理

```javascript
const userInteraction = new UserInteractionService();

// 启用服务
userInteraction.enable();

// 处理点击事件
await userInteraction.handleClick({
  x: 100,
  y: 200,
  button: 'left'
});

// 处理键盘输入
await userInteraction.handleKeyboard({
  type: 'keyDown',
  key: 'Enter'
});

// 处理鼠标移动
await userInteraction.handleMouseMove({
  x: 150,
  y: 250
});

// 处理滚动
await userInteraction.handleScroll({
  deltaX: 0,
  deltaY: -100
});
```

### CDPHealthMonitor

#### 健康监控

```javascript
const CDPHealthMonitor = require('./src/services/cdpHealthMonitor');

const healthMonitor = new CDPHealthMonitor({
  checkInterval: 5000,
  alertThresholds: {
    cpuUsage: 80,
    memoryUsage: 80,
    responseTime: 1000,
    frameRate: 20
  }
});

// 注册服务
healthMonitor.registerService('cdpService', cdpService);
healthMonitor.registerService('screenRecordingService', screenRecording);

// 开始监控
healthMonitor.startMonitoring();

// 监听健康状态变化
healthMonitor.on('health_status_changed', (status) => {
  console.log('健康状态变化:', status);
});

// 监听告警
healthMonitor.on('alert_triggered', (alert) => {
  console.log('告警触发:', alert);
});
```

## WebSocket集成

### 前端连接

```javascript
// 前端代码
import io from 'socket.io-client';

const socket = io('http://localhost:3001');

// 连接CDP会话
socket.emit('cdp_connect', {
  url: 'https://example.com',
  options: {
    screencast: true,
    interactions: true
  }
});

// 监听屏幕帧
socket.on('cdp_frame', (frameData) => {
  // 渲染帧到Canvas
  renderFrame(frameData);
});

// 发送用户交互
socket.emit('cdp_interaction', {
  type: 'click',
  x: 100,
  y: 200
});
```

### 后端处理

```javascript
// 在socketHandlers.js中
const setupCDPSocketHandlers = require('./src/services/cdpSocketHandlers');

// 设置CDP Socket处理器
setupCDPSocketHandlers(io);
```

## 配置选项

### CDPConfig

```javascript
const config = {
  // Chrome启动参数
  chrome: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--headless'
    ],
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  },
  
  // WebSocket配置
  websocket: {
    timeout: 30000,
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    heartbeatInterval: 30000
  },
  
  // 屏幕录制配置
  screencast: {
    format: 'jpeg',
    quality: 80,
    maxWidth: 1920,
    maxHeight: 1080,
    frameRate: 30,
    bufferSize: 10
  },
  
  // 性能配置
  performance: {
    maxMemoryUsage: 512 * 1024 * 1024, // 512MB
    maxCpuUsage: 80,
    monitoringInterval: 5000
  },
  
  // 安全配置
  security: {
    allowedDomains: ['localhost', '127.0.0.1'],
    blockedUrls: [],
    sessionTimeout: 300000, // 5分钟
    maxConcurrentSessions: 10
  }
};
```

## 性能优化

### 1. 帧率优化

```javascript
// 动态调整帧率
screenRecording.setFrameRate(24); // 降低帧率以节省资源

// 启用帧增强
screenRecording.enableFrameEnhancement({
  compression: true,
  resizing: true,
  qualityAdjustment: true
});
```

### 2. 内存管理

```javascript
// 设置缓冲区大小
screenRecording.setBufferSize(5); // 减少缓冲区大小

// 定期清理
setInterval(() => {
  screenRecording.cleanup();
}, 60000); // 每分钟清理一次
```

### 3. 连接优化

```javascript
// 启用连接池
cdpService.enableConnectionPooling({
  maxConnections: 5,
  idleTimeout: 30000
});

// 启用压缩
cdpService.enableCompression(true);
```

## 错误处理

### 基础错误处理

```javascript
const CDPErrorHandler = require('./src/services/cdpErrorHandler');

const errorHandler = new CDPErrorHandler({
  maxRetries: 3,
  retryDelay: 1000,
  enableCircuitBreaker: true
});

// 注册错误处理器
cdpService.setErrorHandler(errorHandler);

// 监听错误事件
errorHandler.on('error', (error) => {
  console.error('CDP错误:', error);
});

errorHandler.on('recovery', (info) => {
  console.log('错误恢复:', info);
});
```

### 自动恢复

```javascript
// 启用自动重连
cdpService.enableAutoReconnect({
  maxAttempts: 5,
  delay: 2000,
  backoff: 'exponential'
});

// 启用故障转移
cdpService.enableFailover({
  backupHosts: ['localhost:9223', 'localhost:9224'],
  healthCheckInterval: 10000
});
```

## 监控和调试

### 性能监控

```javascript
// 获取性能统计
const stats = cdpService.getPerformanceStats();
console.log('性能统计:', stats);

// 获取健康状态
const health = healthMonitor.getHealthStatus();
console.log('健康状态:', health);

// 获取指标数据
const metrics = healthMonitor.getMetrics('performance', 50);
console.log('性能指标:', metrics);
```

### 调试模式

```javascript
// 启用调试模式
process.env.CDP_DEBUG = 'true';

// 启用详细日志
cdpService.setLogLevel('debug');

// 监听调试事件
cdpService.on('debug', (info) => {
  console.log('调试信息:', info);
});
```

## 测试

### 性能测试

```bash
# 运行性能测试
node src/services/cdpPerformanceTest.js --duration 60 --url https://example.com
```

### 单元测试

```bash
# 运行单元测试
npm test

# 运行特定测试
npm test -- --grep "CDP"
```

## 故障排除

### 常见问题

1. **连接失败**
   - 检查Chrome是否正在运行
   - 验证端口是否正确
   - 检查防火墙设置

2. **性能问题**
   - 降低帧率和质量
   - 减少并发连接数
   - 启用压缩

3. **内存泄漏**
   - 定期清理缓冲区
   - 监控内存使用
   - 设置合理的会话超时

### 日志分析

```javascript
// 启用结构化日志
cdpService.enableStructuredLogging({
  format: 'json',
  level: 'info',
  output: './logs/cdp.log'
});

// 分析日志
const logs = cdpService.getLogs({
  level: 'error',
  since: Date.now() - 3600000 // 最近1小时
});
```

## 最佳实践

1. **资源管理**
   - 及时关闭不需要的连接
   - 设置合理的超时时间
   - 监控资源使用情况

2. **安全考虑**
   - 限制允许的域名
   - 设置会话超时
   - 验证用户输入

3. **性能优化**
   - 根据需求调整质量和帧率
   - 使用连接池
   - 启用压缩

4. **错误处理**
   - 实现重试机制
   - 记录详细错误信息
   - 提供降级方案

5. **监控告警**
   - 设置合理的告警阈值
   - 监控关键指标
   - 建立告警通知机制

## API参考

详细的API文档请参考各个服务模块的JSDoc注释。

## 更新日志

- v1.0.0 - 初始版本，包含基础CDP功能
- v1.1.0 - 添加健康监控和错误处理
- v1.2.0 - 性能优化和WebSocket集成

## 支持

如有问题或建议，请联系开发团队或提交Issue。