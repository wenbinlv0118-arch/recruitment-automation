const EventEmitter = require('events');

/**
 * 用户交互处理服务
 * 处理前端发送的用户交互事件，并转换为CDP命令
 */
class UserInteractionService extends EventEmitter {
  constructor(cdpService) {
    super();
    
    this.cdpService = cdpService;
    this.isEnabled = false;
    
    // 交互统计
    this.stats = {
      totalInteractions: 0,
      clickEvents: 0,
      keyboardEvents: 0,
      scrollEvents: 0,
      lastInteractionTime: null
    };
    
    console.log('UserInteractionService initialized');
  }

  /**
   * 启用用户交互处理
   */
  enable() {
    this.isEnabled = true;
    console.log('User interaction handling enabled');
    this.emit('interaction-enabled');
  }

  /**
   * 禁用用户交互处理
   */
  disable() {
    this.isEnabled = false;
    console.log('User interaction handling disabled');
    this.emit('interaction-disabled');
  }

  /**
   * 处理鼠标点击事件
   * @param {Object} event - 点击事件数据
   * @param {number} event.x - X坐标
   * @param {number} event.y - Y坐标
   * @param {string} event.button - 鼠标按钮 (left/right/middle)
   * @param {number} event.clickCount - 点击次数
   */
  async handleMouseClick(event) {
    if (!this.isEnabled || !this.cdpService.isConnected) {
      return { success: false, error: 'Service not available' };
    }

    try {
      const { x, y, button = 'left', clickCount = 1 } = event;
      
      // 验证坐标
      if (typeof x !== 'number' || typeof y !== 'number') {
        throw new Error('Invalid coordinates');
      }

      // 转换按钮类型
      const buttonMap = {
        'left': 'left',
        'right': 'right',
        'middle': 'middle'
      };
      
      const cdpButton = buttonMap[button] || 'left';
      
      // 执行点击
      await this.cdpService.click(x, y, { button: cdpButton, clickCount });
      
      // 更新统计
      this.updateStats('click');
      
      console.log(`Mouse click executed: (${x}, ${y}) button: ${button}`);
      this.emit('interaction-executed', {
        type: 'click',
        coordinates: { x, y },
        button,
        clickCount
      });
      
      return { success: true };
      
    } catch (error) {
      console.error('Error handling mouse click:', error);
      this.emit('interaction-error', { type: 'click', error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 处理鼠标移动事件
   * @param {Object} event - 移动事件数据
   * @param {number} event.x - X坐标
   * @param {number} event.y - Y坐标
   */
  async handleMouseMove(event) {
    if (!this.isEnabled || !this.cdpService.isConnected) {
      return { success: false, error: 'Service not available' };
    }

    try {
      const { x, y } = event;
      
      // 验证坐标
      if (typeof x !== 'number' || typeof y !== 'number') {
        throw new Error('Invalid coordinates');
      }

      // 执行鼠标移动
      const client = this.cdpService.getClient();
      await client.Input.dispatchMouseEvent({
        type: 'mouseMoved',
        x: x,
        y: y
      });
      
      this.emit('interaction-executed', {
        type: 'mousemove',
        coordinates: { x, y }
      });
      
      return { success: true };
      
    } catch (error) {
      console.error('Error handling mouse move:', error);
      this.emit('interaction-error', { type: 'mousemove', error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 处理键盘输入事件
   * @param {Object} event - 键盘事件数据
   * @param {string} event.type - 事件类型 (keydown/keyup/char)
   * @param {string} event.key - 按键
   * @param {string} event.text - 输入文本
   * @param {Object} event.modifiers - 修饰键状态
   */
  async handleKeyboardInput(event) {
    if (!this.isEnabled || !this.cdpService.isConnected) {
      return { success: false, error: 'Service not available' };
    }

    try {
      const { type, key, text, modifiers = {} } = event;
      
      if (type === 'text' && text) {
        // 处理文本输入
        await this.cdpService.type(text);
        
        console.log(`Text input executed: "${text}"`);
        this.emit('interaction-executed', {
          type: 'text-input',
          text
        });
        
      } else if (key) {
        // 处理按键事件
        const client = this.cdpService.getClient();
        
        const keyEvent = {
          type: type || 'keyDown',
          key: key,
          ...modifiers
        };
        
        if (text) {
          keyEvent.text = text;
        }
        
        await client.Input.dispatchKeyEvent(keyEvent);
        
        console.log(`Key event executed: ${type} ${key}`);
        this.emit('interaction-executed', {
          type: 'key-event',
          keyType: type,
          key,
          modifiers
        });
      }
      
      // 更新统计
      this.updateStats('keyboard');
      
      return { success: true };
      
    } catch (error) {
      console.error('Error handling keyboard input:', error);
      this.emit('interaction-error', { type: 'keyboard', error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 处理滚动事件
   * @param {Object} event - 滚动事件数据
   * @param {number} event.x - X坐标
   * @param {number} event.y - Y坐标
   * @param {number} event.deltaX - X方向滚动量
   * @param {number} event.deltaY - Y方向滚动量
   */
  async handleScroll(event) {
    if (!this.isEnabled || !this.cdpService.isConnected) {
      return { success: false, error: 'Service not available' };
    }

    try {
      const { x, y, deltaX = 0, deltaY = 0 } = event;
      
      // 验证坐标
      if (typeof x !== 'number' || typeof y !== 'number') {
        throw new Error('Invalid coordinates');
      }

      // 执行滚动
      const client = this.cdpService.getClient();
      await client.Input.dispatchMouseEvent({
        type: 'mouseWheel',
        x: x,
        y: y,
        deltaX: deltaX,
        deltaY: deltaY
      });
      
      // 更新统计
      this.updateStats('scroll');
      
      console.log(`Scroll executed: (${x}, ${y}) delta: (${deltaX}, ${deltaY})`);
      this.emit('interaction-executed', {
        type: 'scroll',
        coordinates: { x, y },
        delta: { deltaX, deltaY }
      });
      
      return { success: true };
      
    } catch (error) {
      console.error('Error handling scroll:', error);
      this.emit('interaction-error', { type: 'scroll', error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 处理拖拽事件
   * @param {Object} event - 拖拽事件数据
   * @param {number} event.startX - 起始X坐标
   * @param {number} event.startY - 起始Y坐标
   * @param {number} event.endX - 结束X坐标
   * @param {number} event.endY - 结束Y坐标
   * @param {number} event.duration - 拖拽持续时间（毫秒）
   */
  async handleDrag(event) {
    if (!this.isEnabled || !this.cdpService.isConnected) {
      return { success: false, error: 'Service not available' };
    }

    try {
      const { startX, startY, endX, endY, duration = 500 } = event;
      
      // 验证坐标
      if (typeof startX !== 'number' || typeof startY !== 'number' ||
          typeof endX !== 'number' || typeof endY !== 'number') {
        throw new Error('Invalid coordinates');
      }

      const client = this.cdpService.getClient();
      
      // 鼠标按下
      await client.Input.dispatchMouseEvent({
        type: 'mousePressed',
        x: startX,
        y: startY,
        button: 'left',
        clickCount: 1
      });
      
      // 计算中间步骤
      const steps = Math.max(10, Math.floor(duration / 50)); // 每50ms一步
      const stepX = (endX - startX) / steps;
      const stepY = (endY - startY) / steps;
      const stepDelay = duration / steps;
      
      // 执行拖拽移动
      for (let i = 1; i <= steps; i++) {
        const currentX = startX + (stepX * i);
        const currentY = startY + (stepY * i);
        
        await client.Input.dispatchMouseEvent({
          type: 'mouseMoved',
          x: currentX,
          y: currentY,
          button: 'left'
        });
        
        // 延迟
        await new Promise(resolve => setTimeout(resolve, stepDelay));
      }
      
      // 鼠标释放
      await client.Input.dispatchMouseEvent({
        type: 'mouseReleased',
        x: endX,
        y: endY,
        button: 'left',
        clickCount: 1
      });
      
      console.log(`Drag executed: (${startX}, ${startY}) -> (${endX}, ${endY})`);
      this.emit('interaction-executed', {
        type: 'drag',
        start: { x: startX, y: startY },
        end: { x: endX, y: endY },
        duration
      });
      
      return { success: true };
      
    } catch (error) {
      console.error('Error handling drag:', error);
      this.emit('interaction-error', { type: 'drag', error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * 处理通用交互事件
   * @param {Object} event - 交互事件数据
   * @param {string} event.type - 事件类型
   * @param {Object} event.data - 事件数据
   */
  async handleInteraction(event) {
    const { type, data } = event;
    
    switch (type) {
      case 'click':
        return await this.handleMouseClick(data);
      case 'mousemove':
        return await this.handleMouseMove(data);
      case 'keyboard':
        return await this.handleKeyboardInput(data);
      case 'scroll':
        return await this.handleScroll(data);
      case 'drag':
        return await this.handleDrag(data);
      default:
        return { success: false, error: `Unknown interaction type: ${type}` };
    }
  }

  /**
   * 更新交互统计
   * @param {string} type - 交互类型
   */
  updateStats(type) {
    this.stats.totalInteractions++;
    this.stats.lastInteractionTime = Date.now();
    
    switch (type) {
      case 'click':
        this.stats.clickEvents++;
        break;
      case 'keyboard':
        this.stats.keyboardEvents++;
        break;
      case 'scroll':
        this.stats.scrollEvents++;
        break;
    }
  }

  /**
   * 获取交互统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      ...this.stats,
      isEnabled: this.isEnabled
    };
  }

  /**
   * 重置统计信息
   */
  resetStats() {
    this.stats = {
      totalInteractions: 0,
      clickEvents: 0,
      keyboardEvents: 0,
      scrollEvents: 0,
      lastInteractionTime: null
    };
    
    console.log('Interaction stats reset');
    this.emit('stats-reset');
  }

  /**
   * 清理资源
   */
  cleanup() {
    this.disable();
    this.removeAllListeners();
    console.log('UserInteractionService cleaned up');
  }
}

module.exports = UserInteractionService;