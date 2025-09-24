/**
 * CDP WebSocket事件处理模块
 * 处理CDP相关的实时通信和用户交互
 */

const cdpService = require('./services/cdpService');
const userInteractionService = require('./services/userInteractionService');
const screenRecordingService = require('./services/screenRecordingService');

/**
 * 设置CDP相关的Socket.IO事件处理器
 * @param {Object} io - Socket.IO实例
 */
function setupCDPSocketHandlers(io) {
  // CDP连接管理
  const cdpConnections = new Map(); // socketId -> cdpService实例
  const clientSessions = new Map(); // socketId -> 会话信息
  
  io.on('connection', (socket) => {
    console.log('CDP Socket客户端连接:', socket.id);
    
    /**
     * 启动CDP会话
     */
    socket.on('cdp-start-session', async (data) => {
      try {
        console.log('启动CDP会话:', data);
        
        const { targetUrl, sessionConfig = {} } = data;
        
        // 创建CDP服务实例
        const cdpInstance = new (require('./services/cdpService'))();
        
        // 初始化CDP连接
        await cdpInstance.initialize();
        
        // 设置屏幕录制事件监听
        cdpInstance.on('screenFrame', (frameData) => {
          socket.emit('screen-frame', {
            type: 'screen-frame',
            data: frameData
          });
        });
        
        // 设置连接状态事件监听
        cdpInstance.on('connectionStatus', (status) => {
          socket.emit('cdp-connection-status', {
            status: status.connected ? 'connected' : 'disconnected',
            message: status.message || ''
          });
        });
        
        // 设置错误事件监听
        cdpInstance.on('error', (error) => {
          console.error('CDP服务错误:', error);
          socket.emit('cdp-error', {
            message: error.message || '未知错误',
            code: error.code || 'UNKNOWN_ERROR'
          });
        });
        
        // 启动屏幕录制
        await cdpInstance.startScreencast();
        
        // 如果提供了目标URL，导航到该页面
        if (targetUrl) {
          await cdpInstance.navigateTo(targetUrl);
        }
        
        // 添加屏幕录制客户端
        screenRecordingService.addClient(socket.id, socket);
        
        // 启用用户交互服务
        userInteractionService.enable();
        
        // 保存连接信息
        cdpConnections.set(socket.id, cdpInstance);
        clientSessions.set(socket.id, {
          startTime: Date.now(),
          targetUrl,
          sessionConfig
        });
        
        // 发送成功响应
        socket.emit('cdp-session-started', {
          status: 'success',
          message: 'CDP会话已启动',
          sessionId: socket.id,
          capabilities: {
            screenRecording: true,
            userInteraction: true,
            navigation: true
          }
        });
        
      } catch (error) {
        console.error('启动CDP会话失败:', error);
        socket.emit('cdp-error', {
          message: '启动CDP会话失败: ' + error.message,
          code: 'SESSION_START_FAILED'
        });
      }
    });
    
    /**
     * 停止CDP会话
     */
    socket.on('cdp-stop-session', async () => {
      try {
        console.log('停止CDP会话:', socket.id);
        
        const cdpInstance = cdpConnections.get(socket.id);
        if (cdpInstance) {
          // 停止屏幕录制
          await cdpInstance.stopScreencast();
          
          // 关闭CDP连接
          await cdpInstance.close();
          
          // 清理连接信息
          cdpConnections.delete(socket.id);
        }
        
        // 移除屏幕录制客户端
        screenRecordingService.removeClient(socket.id);
        
        // 清理会话信息
        clientSessions.delete(socket.id);
        
        socket.emit('cdp-session-stopped', {
          status: 'success',
          message: 'CDP会话已停止'
        });
        
      } catch (error) {
        console.error('停止CDP会话失败:', error);
        socket.emit('cdp-error', {
          message: '停止CDP会话失败: ' + error.message,
          code: 'SESSION_STOP_FAILED'
        });
      }
    });
    
    /**
     * 处理用户交互事件
     */
    socket.on('user-interaction', async (interactionData) => {
      try {
        const cdpInstance = cdpConnections.get(socket.id);
        if (!cdpInstance) {
          socket.emit('cdp-error', {
            message: 'CDP会话未启动',
            code: 'NO_ACTIVE_SESSION'
          });
          return;
        }
        
        console.log('处理用户交互:', interactionData);
        
        // 处理不同类型的交互
        switch (interactionData.type) {
          case 'click':
            await cdpInstance.click(
              interactionData.data.x,
              interactionData.data.y,
              {
                button: interactionData.data.button || 'left',
                clickCount: interactionData.data.clickCount || 1
              }
            );
            break;
            
          case 'mousemove':
            await cdpInstance.mouseMove(
              interactionData.data.x,
              interactionData.data.y
            );
            break;
            
          case 'keyboard':
            if (interactionData.data.type === 'keyDown') {
              await cdpInstance.keyDown(
                interactionData.data.key,
                interactionData.data.modifiers
              );
            }
            break;
            
          case 'scroll':
            await cdpInstance.scroll(
              interactionData.data.x,
              interactionData.data.y,
              interactionData.data.deltaX,
              interactionData.data.deltaY
            );
            break;
            
          default:
            console.warn('未知的交互类型:', interactionData.type);
        }
        
        // 更新交互统计
        userInteractionService.updateStats(interactionData.type);
        
      } catch (error) {
        console.error('处理用户交互失败:', error);
        socket.emit('cdp-error', {
          message: '处理用户交互失败: ' + error.message,
          code: 'INTERACTION_FAILED'
        });
      }
    });
    
    /**
     * 导航到指定URL
     */
    socket.on('cdp-navigate', async (data) => {
      try {
        const cdpInstance = cdpConnections.get(socket.id);
        if (!cdpInstance) {
          socket.emit('cdp-error', {
            message: 'CDP会话未启动',
            code: 'NO_ACTIVE_SESSION'
          });
          return;
        }
        
        console.log('CDP导航到:', data.url);
        
        await cdpInstance.navigateTo(data.url);
        
        socket.emit('cdp-navigation-complete', {
          status: 'success',
          url: data.url,
          message: '页面导航完成'
        });
        
      } catch (error) {
        console.error('CDP导航失败:', error);
        socket.emit('cdp-error', {
          message: '页面导航失败: ' + error.message,
          code: 'NAVIGATION_FAILED'
        });
      }
    });
    
    /**
     * 执行JavaScript代码
     */
    socket.on('cdp-execute-script', async (data) => {
      try {
        const cdpInstance = cdpConnections.get(socket.id);
        if (!cdpInstance) {
          socket.emit('cdp-error', {
            message: 'CDP会话未启动',
            code: 'NO_ACTIVE_SESSION'
          });
          return;
        }
        
        console.log('CDP执行脚本:', data.script);
        
        const result = await cdpInstance.executeScript(data.script);
        
        socket.emit('cdp-script-result', {
          status: 'success',
          result: result,
          requestId: data.requestId
        });
        
      } catch (error) {
        console.error('CDP脚本执行失败:', error);
        socket.emit('cdp-error', {
          message: '脚本执行失败: ' + error.message,
          code: 'SCRIPT_EXECUTION_FAILED',
          requestId: data.requestId
        });
      }
    });
    
    /**
     * 获取页面信息
     */
    socket.on('cdp-get-page-info', async () => {
      try {
        const cdpInstance = cdpConnections.get(socket.id);
        if (!cdpInstance) {
          socket.emit('cdp-error', {
            message: 'CDP会话未启动',
            code: 'NO_ACTIVE_SESSION'
          });
          return;
        }
        
        const pageInfo = await cdpInstance.getPageInfo();
        
        socket.emit('cdp-page-info', {
          status: 'success',
          pageInfo: pageInfo
        });
        
      } catch (error) {
        console.error('获取页面信息失败:', error);
        socket.emit('cdp-error', {
          message: '获取页面信息失败: ' + error.message,
          code: 'PAGE_INFO_FAILED'
        });
      }
    });
    
    /**
     * 获取CDP统计信息
     */
    socket.on('cdp-get-stats', async () => {
      try {
        const screenStats = screenRecordingService.getStats();
        const interactionStats = userInteractionService.getStats();
        const session = clientSessions.get(socket.id);
        
        socket.emit('cdp-stats', {
          status: 'success',
          stats: {
            screen: screenStats,
            interaction: interactionStats,
            session: {
              duration: session ? Date.now() - session.startTime : 0,
              startTime: session ? session.startTime : null
            }
          }
        });
        
      } catch (error) {
        console.error('获取CDP统计信息失败:', error);
        socket.emit('cdp-error', {
          message: '获取统计信息失败: ' + error.message,
          code: 'STATS_FAILED'
        });
      }
    });
    
    /**
     * 客户端断开连接处理
     */
    socket.on('disconnect', async (reason) => {
      console.log('CDP客户端断开连接:', socket.id, '原因:', reason);
      
      try {
        // 清理CDP连接
        const cdpInstance = cdpConnections.get(socket.id);
        if (cdpInstance) {
          await cdpInstance.stopScreencast();
          await cdpInstance.close();
          cdpConnections.delete(socket.id);
        }
        
        // 清理屏幕录制客户端
        screenRecordingService.removeClient(socket.id);
        
        // 清理会话信息
        clientSessions.delete(socket.id);
        
        console.log('CDP连接清理完成:', socket.id);
        
      } catch (error) {
        console.error('CDP连接清理失败:', error);
      }
    });
  });
  
  // 定期清理无效连接
  setInterval(() => {
    const now = Date.now();
    const maxSessionDuration = 30 * 60 * 1000; // 30分钟
    
    for (const [socketId, session] of clientSessions.entries()) {
      if (now - session.startTime > maxSessionDuration) {
        console.log('清理超时的CDP会话:', socketId);
        
        const cdpInstance = cdpConnections.get(socketId);
        if (cdpInstance) {
          cdpInstance.close().catch(console.error);
          cdpConnections.delete(socketId);
        }
        
        screenRecordingService.removeClient(socketId);
        clientSessions.delete(socketId);
      }
    }
  }, 5 * 60 * 1000); // 每5分钟检查一次
  
  console.log('CDP Socket处理器已设置');
}

module.exports = { setupCDPSocketHandlers };