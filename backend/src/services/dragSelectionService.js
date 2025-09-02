/**
 * 拖拽选区复制服务
 * 基于Playwright实现拖拽矩形选区并复制简历内容
 */

const logger = require('../utils/logger');

class DragSelectionService {
  constructor() {
    this.isInitialized = false;
    // 记录鼠标拖拽过程中经过的区域
    this.draggedPath = [];
    this.dragBoundingBox = null;
  }

  /**
   * 初始化服务
   */
  async initialize() {
    try {
      this.isInitialized = true;
      // 重置拖拽路径记录
      this.draggedPath = [];
      this.dragBoundingBox = null;
      logger.info('拖拽选区服务初始化成功');
    } catch (error) {
      logger.error('拖拽选区服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 记录拖拽路径中的坐标点
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   */
  recordDragPoint(x, y) {
    this.draggedPath.push({ x, y });
    
    // 更新拖拽边界框
    if (!this.dragBoundingBox) {
      this.dragBoundingBox = { minX: x, maxX: x, minY: y, maxY: y };
    } else {
      this.dragBoundingBox.minX = Math.min(this.dragBoundingBox.minX, x);
      this.dragBoundingBox.maxX = Math.max(this.dragBoundingBox.maxX, x);
      this.dragBoundingBox.minY = Math.min(this.dragBoundingBox.minY, y);
      this.dragBoundingBox.maxY = Math.max(this.dragBoundingBox.maxY, y);
    }
  }

  /**
   * 检查指定坐标是否在拖拽路径的边界框内
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} tolerance - 容错范围（像素）
   * @returns {boolean} 是否在拖拽区域内
   */
  isPointInDraggedArea(x, y, tolerance = 10) {
    if (!this.dragBoundingBox || this.draggedPath.length === 0) {
      logger.warn('拖拽路径为空，无法验证坐标是否在拖拽区域内');
      return false;
    }

    // 检查是否在拖拽边界框内（加上容错范围）
    const inBoundingBox = (
      x >= this.dragBoundingBox.minX - tolerance &&
      x <= this.dragBoundingBox.maxX + tolerance &&
      y >= this.dragBoundingBox.minY - tolerance &&
      y <= this.dragBoundingBox.maxY + tolerance
    );

    if (!inBoundingBox) {
      logger.warn(`坐标(${x}, ${y})不在拖拽边界框内: minX=${this.dragBoundingBox.minX}, maxX=${this.dragBoundingBox.maxX}, minY=${this.dragBoundingBox.minY}, maxY=${this.dragBoundingBox.maxY}`);
      return false;
    }

    logger.info(`✅ 坐标(${x}, ${y})在拖拽区域内，边界框: [${this.dragBoundingBox.minX}-${this.dragBoundingBox.maxX}, ${this.dragBoundingBox.minY}-${this.dragBoundingBox.maxY}]`);
    return true;
  }

  /**
   * 重置拖拽路径记录
   */
  resetDragPath() {
    this.draggedPath = [];
    this.dragBoundingBox = null;
    logger.info('拖拽路径记录已重置');
  }

  /**
   * 检查并请求剪贴板权限
   * @param {Object} page - Playwright页面对象
   * @returns {Promise<boolean>} 是否有权限
   */
  async checkAndRequestClipboardPermission(page) {
    try {
      logger.info('检查剪切板权限...');
      
      const hasPermission = await page.evaluate(async () => {
        try {
          // 检查是否支持Permissions API
          if (!navigator.permissions) {
            return false;
          }
          
          // 查询剪切板读取权限
           const permission = await navigator.permissions.query({ name: 'clipboard-read' });
           console.log(`剪切板权限状态: ${permission.state}`);
           
           return permission.state === 'granted' || permission.state === 'prompt';
        } catch (error) {
          console.warn('权限检查失败:', error);
          return false;
        }
      });
      
      if (!hasPermission) {
        logger.warn('浏览器不支持剪切板权限API或权限被拒绝');
        return false;
      }
      
      // 尝试请求权限（通过实际使用clipboard API）
      const canAccess = await page.evaluate(async () => {
        try {
          // 尝试读取剪切板以触发权限请求
          await navigator.clipboard.readText();
          return true;
        } catch (error) {
          console.warn('剪切板访问被拒绝:', error);
          return false;
        }
      });
      
      if (canAccess) {
        logger.info('✅ 剪切板权限获取成功');
      } else {
        logger.warn('❌ 剪切板权限获取失败');
      }
      
      return canAccess;
      
    } catch (error) {
      logger.error('剪切板权限检查失败:', error);
      return false;
    }
  }

  /**
   * 通过Hook方式复制在线简历内容（推荐方法）
   * 基于用户优化建议：切换到/web/frame/c-resume iframe，注入两行Hook，拖拽选区后Ctrl+C复制
   * @param {Object} page - Playwright页面对象
   * @param {Object} options - 配置选项
   * @returns {Promise<string>} 复制的文本内容
   */
  async copyResumeByHook(page, options = {}) {
    try {
      logger.info('开始执行优化的Hook方式复制在线简历');
      
      const {
        frameSelector = '/web/frame/c-resume/?source=search',
        canvasSelector = 'canvas#resume',
        margin = 5,
        dragSteps = 30,
        waitTime = 500
      } = options;

      // 1. 定位iframe - 使用精确的URL匹配（如果指定了frameSelector）
      let frame = null;
      let isMainPage = !frameSelector; // 判断是否是主页面操作
      
      if (isMainPage) {
        logger.info('操作主页面canvas#resume元素，无需iframe切换');
      } else {
        try {
          logger.info('等待/web/frame/c-resume iframe加载...');
          
          // 寻找iframe，支持多种格式
          let iframes = [];
          
          // 首先尝试匹配c-resume URL
          try {
            await page.waitForSelector('iframe[src*="/web/frame/c-resume"]', { timeout: 3000 });
            iframes = await page.$$('iframe[src*="/web/frame/c-resume"]');
          } catch (e) {
            // 如果没有找到，尝试所有iframe（测试环境中可能使用data URL）
            logger.info('未找到c-resume URL格式的iframe，尝试所有iframe');
            await page.waitForSelector('iframe', { timeout: 5000 });
            iframes = await page.$$('iframe');
          }
          
          if (iframes.length === 0) {
            throw new Error('未找到任何iframe元素');
          }
          
          // 遍历所有iframe并尝试获取contentFrame
          for (const iframe of iframes) {
            try {
              const src = await iframe.getAttribute('src');
              logger.info(`检查iframe，src: ${src ? src.substring(0, 100) + '...' : '无src'}`);
              
              frame = await iframe.contentFrame();
              if (frame) {
                // 等待iframe内容加载
                await frame.waitForTimeout(1000);
                
                // 检查iframe中是否有canvas#resume元素
                try {
                  const canvasExists = await frame.locator('canvas#resume').count();
                  if (canvasExists > 0) {
                    logger.info(`在iframe中找到canvas#resume元素，src: ${src ? src.substring(0, 50) + '...' : '无src'}`);
                    break;
                  }
                } catch (canvasError) {
                  logger.warn(`检查canvas元素时出错: ${canvasError.message}`);
                }
              }
              frame = null; // 重置，继续寻找
            } catch (frameError) {
              logger.warn(`获取iframe contentFrame失败: ${frameError.message}`);
              continue;
            }
          }
          
          if (!frame) {
            throw new Error('无法获取任何iframe的contentFrame或未找到包含canvas#resume的iframe');
          }
          
          logger.info('成功切换到包含canvas#resume的iframe');
        } catch (error) {
          logger.error('定位iframe失败:', error);
          throw new Error(`无法定位iframe: ${error.message}`);
        }
      }

      // 2. 确定操作上下文
      const targetContext = isMainPage ? page : frame;
      const contextName = isMainPage ? '主页面' : 'iframe';
      
      logger.info(`准备在${contextName}中进行拖拽+右键复制操作`);
      
      // 简单检查canvas是否存在
      const canvasExists = await targetContext.locator('canvas#resume').count();
      if (canvasExists === 0) {
        throw new Error(`${contextName}中未找到canvas#resume元素`);
      }
      
      logger.info(`✅ 在${contextName}中找到canvas#resume元素`);

      // 3. 定位canvas并获取边界框
      logger.info(`定位canvas#resume元素（${contextName}模式）...`);
      
      let canvasInfo = null;
      
      if (isMainPage) {
        // 主页面模式：直接获取canvas边界框
        const canvas = page.locator(canvasSelector);
        await canvas.waitFor({ state: 'visible', timeout: 5000 });
        await page.waitForTimeout(1000);
        
        const boundingBox = await canvas.boundingBox();
        if (!boundingBox || !boundingBox.width || !boundingBox.height) {
          throw new Error('主页面canvas元素不可见或无效');
        }
        
        canvasInfo = {
          x: boundingBox.x,
          y: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height,
          visible: true
        };
        
        logger.info('主页面Canvas边界框:', canvasInfo);
        
      } else {
        // iframe模式：需要坐标转换
        // 等待canvas元素可见
        await frame.waitForSelector(canvasSelector, { state: 'visible', timeout: 5000 });
        await frame.waitForTimeout(1000); // 等待canvas完全渲染
        
        // 获取canvas在iframe中的位置
        canvasInfo = await frame.evaluate((selector) => {
          const canvas = document.querySelector(selector);
          if (!canvas) {
            return null;
          }
          
          const rect = canvas.getBoundingClientRect();
          return {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height,
            visible: rect.width > 0 && rect.height > 0
          };
        }, canvasSelector);
        
        if (!canvasInfo || !canvasInfo.visible) {
          throw new Error('iframe中canvas元素不可见或无效');
        }
        
        logger.info('Canvas边界框（iframe内坐标）:', canvasInfo);
        
        // 4. 获取iframe在页面中的位置并计算绝对坐标
        let iframeElement = null;
        let iframeBoundingBox = null;
        
        // 尝试获取iframe元素和边界框
        try {
          // 首先尝试找到对应的iframe元素
          const allIframes = await page.$$('iframe');
          logger.info(`页面中总共有 ${allIframes.length} 个iframe`);
          
          for (let i = 0; i < allIframes.length; i++) {
            const iframe = allIframes[i];
            try {
              const testFrame = await iframe.contentFrame();
              if (testFrame) {
                // 检查是否是我们要的iframe
                const canvasCount = await testFrame.locator('canvas#resume').count();
                if (canvasCount > 0) {
                  iframeElement = iframe;
                  iframeBoundingBox = await iframe.boundingBox();
                  logger.info(`找到目标iframe（第${i+1}个），边界框:`, iframeBoundingBox);
                  break;
                }
              }
            } catch (e) {
              logger.warn(`检查第${i+1}个iframe时出错: ${e.message}`);
              continue;
            }
          }
          
          if (!iframeElement || !iframeBoundingBox) {
            throw new Error('无法获取iframe元素或边界框');
          }
        } catch (error) {
          logger.error('获取iframe边界框失败:', error);
          
          // 作为备用方案，使用默认坐标
          logger.warn('使用默认坐标作为备用方案');
          iframeBoundingBox = { x: 0, y: 0, width: 900, height: 650 };
        }
        
        // 计算在页面坐标系中的绝对坐标
        canvasInfo.x = iframeBoundingBox.x + canvasInfo.x;
        canvasInfo.y = iframeBoundingBox.y + canvasInfo.y;
        
        logger.info(`Canvas绝对坐标（页面坐标系）: x=${canvasInfo.x}, y=${canvasInfo.y}, width=${canvasInfo.width}, height=${canvasInfo.height}`);
      }
      
      // 5. 计算拖拽坐标（从左上角到右下角）
      let startX = canvasInfo.x + margin;
      let startY = canvasInfo.y + margin;
      let endX = canvasInfo.x + canvasInfo.width - margin;
      let endY = canvasInfo.y + canvasInfo.height - margin;
      
      // 安全检查：确保坐标不为负数
      if (startX < 0) {
        logger.warn(`startX为负数(${startX})，调整为0`);
        startX = 0;
      }
      if (startY < 0) {
        logger.warn(`startY为负数(${startY})，调整为0`);
        startY = 0;
      }
      if (endX < startX) {
        logger.warn(`endX(${endX}) < startX(${startX})，调整endX`);
        endX = startX + 100; // 最小宽度100px
      }
      if (endY < startY) {
        logger.warn(`endY(${endY}) < startY(${startY})，调整endY`);
        endY = startY + 100; // 最小高度100px
      }
      
      logger.info(`拖拽坐标（${contextName}模式）: 起点(${startX}, ${startY}) -> 终点(${endX}, ${endY})`);
      logger.info(`Canvas区域大小: 宽度=${canvasInfo.width}, 高度=${canvasInfo.height}`);
      logger.info(`Canvas位置: x=${canvasInfo.x}, y=${canvasInfo.y}`);
      
      // 6. 简洁的拖拽选区操作
      logger.info('开始拖拽选区操作...');
      
      // 重置拖拽路径记录
      this.resetDragPath();
      
      // 点击canvas激活
      logger.info('点击canvas激活复制功能...');
      if (isMainPage) {
        await page.locator(canvasSelector).click();
      } else {
        await frame.locator(canvasSelector).click();
      }
      await page.waitForTimeout(300);
      
      // 执行拖拽选区
      logger.info('执行拖拽选区操作');
      logger.info(`拖拽参数: 起点(${startX}, ${startY}) -> 终点(${endX}, ${endY}), 步数: ${dragSteps}`);
      await this.performDragSelection(page, startX, startY, endX, endY, dragSteps, targetContext, contextName);
      await page.waitForTimeout(300);
      
      // 记录拖拽完成后的路径信息
      if (this.draggedPath.length > 0) {
        logger.info(`✅ 拖拽路径记录完成: 共${this.draggedPath.length}个坐标点`);
        logger.info(`拖拽边界框: [${this.dragBoundingBox.minX}-${this.dragBoundingBox.maxX}, ${this.dragBoundingBox.minY}-${this.dragBoundingBox.maxY}]`);
      } else {
        logger.warn('⚠️ 拖拽路径记录为空，可能影响右键点击位置验证');
      }
      
      // 在canvas#resume范围内随机位置右键点击复制（确保在canvas边界内）
      logger.info('计算canvas#resume范围内的右键点击位置...');
      
      // 重新获取canvas的准确边界（确保最新位置）
      let canvasRightClickInfo = null;
      if (isMainPage) {
        // 主页面模式：直接获取canvas边界框
        const canvas = page.locator(canvasSelector);
        const boundingBox = await canvas.boundingBox();
        if (boundingBox && boundingBox.width && boundingBox.height) {
          canvasRightClickInfo = {
            x: boundingBox.x,
            y: boundingBox.y,
            width: boundingBox.width,
            height: boundingBox.height
          };
        }
      } else {
        // iframe模式：需要计算绝对坐标
        const canvasInfoInFrame = await frame.evaluate((selector) => {
          const canvas = document.querySelector(selector);
          if (!canvas) return null;
          const rect = canvas.getBoundingClientRect();
          return {
            x: rect.left,
            y: rect.top,
            width: rect.width,
            height: rect.height
          };
        }, canvasSelector);
        
        if (canvasInfoInFrame) {
          // 获取iframe的位置并计算绝对坐标
          const allIframes = await page.$$('iframe');
          let iframeBoundingBox = null;
          
          for (let i = 0; i < allIframes.length; i++) {
            const iframe = allIframes[i];
            try {
              const testFrame = await iframe.contentFrame();
              if (testFrame) {
                const canvasCount = await testFrame.locator('canvas#resume').count();
                if (canvasCount > 0) {
                  iframeBoundingBox = await iframe.boundingBox();
                  break;
                }
              }
            } catch (e) {
              continue;
            }
          }
          
          if (iframeBoundingBox) {
            canvasRightClickInfo = {
              x: iframeBoundingBox.x + canvasInfoInFrame.x,
              y: iframeBoundingBox.y + canvasInfoInFrame.y,
              width: canvasInfoInFrame.width,
              height: canvasInfoInFrame.height
            };
          }
        }
      }
      
      if (!canvasRightClickInfo) {
        // 如果无法获取canvas信息，使用原有的拖拽区域作为后备
        logger.warn('无法获取canvas边界信息，使用拖拽区域作为右键点击范围');
        canvasRightClickInfo = {
          x: startX,
          y: startY,
          width: endX - startX,
          height: endY - startY
        };
      }
      
      logger.info(`Canvas右键点击范围: x=${canvasRightClickInfo.x}, y=${canvasRightClickInfo.y}, width=${canvasRightClickInfo.width}, height=${canvasRightClickInfo.height}`);
      
      // 优先在拖拽区域内计算右键点击位置
      let clampedX, clampedY;
      
      if (this.dragBoundingBox && this.draggedPath.length > 0) {
        // 在拖拽区域内选择右键点击位置
        const dragSafeMargin = 10; // 拖拽区域边缘安全边距
        const dragWidth = this.dragBoundingBox.maxX - this.dragBoundingBox.minX;
        const dragHeight = this.dragBoundingBox.maxY - this.dragBoundingBox.minY;
        
        if (dragWidth > 2 * dragSafeMargin && dragHeight > 2 * dragSafeMargin) {
          // 拖拽区域足够大，在其中选择位置
          const rightClickX = this.dragBoundingBox.minX + dragSafeMargin + Math.random() * (dragWidth - 2 * dragSafeMargin);
          const rightClickY = this.dragBoundingBox.minY + dragSafeMargin + Math.random() * (dragHeight - 2 * dragSafeMargin);
          
          // 添加微小的手抖偏移（±2像素）
          const jitterX = (Math.random() - 0.5) * 4;
          const jitterY = (Math.random() - 0.5) * 4;
          
          clampedX = rightClickX + jitterX;
          clampedY = rightClickY + jitterY;
          
          logger.info(`在拖拽区域内选择右键点击位置: 拖拽边界[${this.dragBoundingBox.minX}-${this.dragBoundingBox.maxX}, ${this.dragBoundingBox.minY}-${this.dragBoundingBox.maxY}]`);
        } else {
          // 拖拽区域太小，使用拖拽区域的中心点
          clampedX = (this.dragBoundingBox.minX + this.dragBoundingBox.maxX) / 2;
          clampedY = (this.dragBoundingBox.minY + this.dragBoundingBox.maxY) / 2;
          logger.info(`拖拽区域较小，使用中心点作为右键点击位置`);
        }
      } else {
        // 备用方案：在canvas范围内计算安全的右键点击位置
        logger.warn('拖拽路径为空，使用canvas范围作为备用方案');
        const canvasSafeMargin = 20; // canvas边缘安全边距
        const rightClickX = canvasRightClickInfo.x + canvasSafeMargin + Math.random() * (canvasRightClickInfo.width - 2 * canvasSafeMargin);
        const rightClickY = canvasRightClickInfo.y + canvasSafeMargin + Math.random() * (canvasRightClickInfo.height - 2 * canvasSafeMargin);
        
        // 添加微小的手抖偏移（±2像素）
        const jitterX = (Math.random() - 0.5) * 4;
        const jitterY = (Math.random() - 0.5) * 4;
        const finalX = rightClickX + jitterX;
        const finalY = rightClickY + jitterY;
        
        // 确保最终坐标仍在canvas范围内
        clampedX = Math.max(canvasRightClickInfo.x + 5, Math.min(finalX, canvasRightClickInfo.x + canvasRightClickInfo.width - 5));
        clampedY = Math.max(canvasRightClickInfo.y + 5, Math.min(finalY, canvasRightClickInfo.y + canvasRightClickInfo.height - 5));
      }
      
      logger.info(`在canvas#resume范围内右键点击复制: (${Math.round(clampedX)}, ${Math.round(clampedY)})`);
      const rightClickSuccess = await this.performRightClickCopy(page, clampedX, clampedY);
      
      if (!rightClickSuccess) {
        logger.warn('右键复制可能未成功，但继续尝试获取内容');
      }
      
      // 等待更长时间确保复制操作完成（特别是对于右键复制）
      await page.waitForTimeout(2000); // 增加到2秒等待时间
      
      // 尝试读取剪贴板内容（最多重试5次，增加重试次数）
      logger.info('尝试读取剪贴板内容...');
      let finalResult = null;
      
      for (let attempt = 1; attempt <= 5; attempt++) {
        logger.info(`第${attempt}次尝试读取剪贴板内容`);
      
        const result = await page.evaluate(async () => {
          try {
            let clipboardContent = '';
            
            // 策略1（最高优先级）: navigator.clipboard.readText() - 经测试最有效
            if (navigator.clipboard && navigator.clipboard.readText) {
              try {
                clipboardContent = await navigator.clipboard.readText();
                console.log('📋 优先级策略1: navigator.clipboard.readText()读取到内容，长度:', clipboardContent.length);
                if (clipboardContent && clipboardContent.trim() && clipboardContent.length > 20) {
                  return { success: true, content: clipboardContent, method: 'navigator.clipboard.readText' };
                }
              } catch (clipError) {
                console.warn('🚫 navigator.clipboard.readText()失败:', clipError.message);
              }
            }
            
            // 策甥2: 检查全局变量（Hook机制）
            if (window.__grabbed_text) {
              console.log('📋 策甥2: 从全局变量获取到内容，长度:', window.__grabbed_text.length);
              return { success: true, content: window.__grabbed_text, method: 'global variable' };
            }
            
            // 策甥3: 获取当前选中的文本
            const selectedText = window.getSelection().toString();
            if (selectedText && selectedText.trim() && selectedText.length > 20) {
              console.log('📋 策甥3: 获取到选中文本，长度:', selectedText.length);
              return { success: true, content: selectedText, method: 'getSelection' };
            }
            
            // 策甥4: 临时输入框粘贴方法（备用）
            try {
              const tempInput = document.createElement('textarea');
              tempInput.style.position = 'fixed';
              tempInput.style.left = '-1000px';
              tempInput.style.top = '-1000px';
              tempInput.style.opacity = '0';
              document.body.appendChild(tempInput);
              tempInput.focus();
              
              // 模拟Ctrl+V粘贴
              const pasteEvent = new ClipboardEvent('paste', {
                bubbles: true,
                cancelable: true,
                composed: true
              });
              
              tempInput.dispatchEvent(pasteEvent);
              
              // 等待一下，然后检查输入框内容
              await new Promise(resolve => setTimeout(resolve, 200));
              
              if (tempInput.value && tempInput.value.trim() && tempInput.value.length > 20) {
                console.log('📋 策甥4: 使用临时输入框方法读取到内容，长度:', tempInput.value.length);
                clipboardContent = tempInput.value;
                document.body.removeChild(tempInput);
                return { success: true, content: clipboardContent, method: 'temporary textarea paste' };
              }
              
              document.body.removeChild(tempInput);
            } catch (pasteError) {
              console.warn('🚫 临时输入框粘贴方法失败:', pasteError.message);
            }
            
            console.warn('❌ 所有策略均未能获取到有效内容');
            return { success: false, content: '', method: 'none' };
          } catch (error) {
            console.error('读取内容失败:', error);
            return { success: false, content: '', error: error.message, method: 'error' };
          }
        });
        
        if (result.success && result.content.trim()) {
          logger.info(`✅ 第${attempt}次尝试成功，使用方法: ${result.method}，简历文本长度: ${result.content.length}`);
          finalResult = result;
          break;
        }
        
        logger.warn(`⚠️ 第${attempt}次尝试失败: ${result.error || '内容为空'}, 使用方法: ${result.method}`);
        if (attempt < 5) {
          // 逐次增加等待时间: 500ms, 700ms, 900ms, 1200ms
          const waitTime = 500 + (attempt - 1) * 200;
          logger.info(`等待${waitTime}ms后重试...`);
          await page.waitForTimeout(waitTime);
        }
      }
      
      if (!finalResult || !finalResult.success || !finalResult.content.trim()) {
        throw new Error(`未能获取到复制内容（${contextName}模式），已重试3次`);
      }
      
      logger.info(`右键复制成功（${contextName}模式），简历文本长度: ${finalResult.content.length}`);
      return finalResult.content.trim();
      
    } catch (error) {
      logger.error('优化的Hook方式复制失败:', error);
      throw error;
    }
  }

  /**
   * 执行右键点击复制操作
   * @param {Object} page - Playwright页面对象
   * @param {number} x - 右键点击X坐标
   * @param {number} y - 右键点击Y坐标
   * @param {boolean} validateDragArea - 是否验证右键点击位置在拖拽区域内
   * @returns {Promise<boolean>} 是否成功
   */
  async performRightClickCopy(page, x, y, validateDragArea = true) {
    try {
      logger.info(`在位置(${x}, ${y})执行右键点击复制`);
      
      // 验证右键点击位置是否在拖拽区域内
      if (validateDragArea && !this.isPointInDraggedArea(x, y)) {
        logger.warn(`右键点击位置(${x}, ${y})不在拖拽区域内，可能影响复制效果`);
      }
      
      // 检查是否有文本选中
      const hasSelection = await page.evaluate(() => {
        const selection = window.getSelection();
        const selectedText = selection ? selection.toString() : '';
        console.log('当前选中文本长度:', selectedText.length);
        console.log('选中文本预览:', selectedText.substring(0, 50) + '...');
        return selectedText.length > 0;
      });
      
      if (!hasSelection) {
        logger.warn('⚠️ 当前没有文本选中，右键菜单可能不会显示复制选项');
      }
      
      // 平滑移动到指定位置（模拟真实用户移动）
      const moveSteps = 5 + Math.floor(Math.random() * 5); // 5-9步随机移动
      await page.mouse.move(x, y, { steps: moveSteps });
      
      // 思考时间（模拟用户在拖拽完成后的短暂停顿）
      const thinkTime = 100 + Math.random() * 200; // 100-300ms随机思考时间
      await page.waitForTimeout(thinkTime);
      
      // 分步右键操作（模拟真实的按下→持续→释放过程）
      await page.mouse.down({ button: 'right' });
      const holdTime = 150 + Math.random() * 100; // 150-250ms按住时间
      await page.waitForTimeout(holdTime);
      await page.mouse.up({ button: 'right' });
      
      // 等待右键菜单出现（加入一些随机性）
      const menuWaitTime = 300 + Math.random() * 200; // 300-500ms
      await page.waitForTimeout(menuWaitTime);
      
      // 根据用户反馈，右键菜单以右键点击点为左上角生成，复制按钮在第一项位置
      // 右键菜单以右键点击点为左上角生成，复制按钮在第一项位置
      const copyButtonOffsetX = 15 + Math.random() * 10; // 向右移动15-25像素
      const copyButtonOffsetY = 8 + Math.random() * 8;   // 向下移动8-16像素
      
      const copyButtonX = x + copyButtonOffsetX;
      const copyButtonY = y + copyButtonOffsetY;
      
      logger.info(`根据右键菜单布局，计算复制按钮位置: (${Math.round(copyButtonX)}, ${Math.round(copyButtonY)})`);
      
      // 移动到复制按钮位置
      const copyMoveSteps = 3 + Math.floor(Math.random() * 3); // 3-5步移动
      await page.mouse.move(copyButtonX, copyButtonY, { steps: copyMoveSteps });
      
      // 用户识别复制按钮的时间
      const recognitionTime = 100 + Math.random() * 150; // 100-250ms识别时间
      await page.waitForTimeout(recognitionTime);
      
      // 执行左键点击（模拟点击复制按钮）
      await page.mouse.down({ button: 'left' });
      const clickHoldTime = 80 + Math.random() * 40; // 80-120ms按住时间
      await page.waitForTimeout(clickHoldTime);
      await page.mouse.up({ button: 'left' });
      
      // 点击后的等待时间
      const postClickDelay = 200 + Math.random() * 100; // 200-300ms
      await page.waitForTimeout(postClickDelay);
      
      const foundCopyButton = true; // 基于位置计算的点击，认为成功
      logger.info('✅ 基于位置计算的复制按钮点击完成');
      
      // 关闭右键菜单（如果还在显示）
      const escapeDelay = 100 + Math.random() * 100; // 100-200ms
      await page.waitForTimeout(escapeDelay);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      
      if (!foundCopyButton) {
        logger.warn('⚠️ 未找到复制按钮，右键菜单可能没有复制选项');
      }
      
      return foundCopyButton;
      
    } catch (error) {
      logger.error('右键点击复制操作失败:', error);
      return false;
    }
  }

  /**
   * 执行拖拽选区操作（拖拽同时模拟快速向下滚轮滚动）
   * @param {Object} page - Playwright页面对象
   * @param {number} startX - 起始X坐标
   * @param {number} startY - 起始Y坐标
   * @param {number} endX - 结束X坐标
   * @param {number} endY - 结束Y坐标
   * @param {number} steps - 拖拽步数
   * @param {Object} targetContext - 目标上下文（page或frame）
   * @param {string} contextName - 上下文名称
   */
  async performDragSelection(page, startX, startY, endX, endY, steps = 30, targetContext = null, contextName = '主页面') {
    try {
      logger.info('开始执行拖拽选区操作（拖拽同时模拟快速向下滚轮滚动）');
      logger.info(`拖拽参数: 起点(${startX}, ${startY}) -> 终点(${endX}, ${endY}), 步数: ${steps}, 上下文: ${contextName}`);
      
      // 验证坐标范围的合理性
      if (startX < 0 || startY < 0 || endX < 0 || endY < 0) {
        throw new Error(`拖拽坐标不能为负数: 起点(${startX}, ${startY}) -> 终点(${endX}, ${endY})`);
      }
      
      if (Math.abs(endX - startX) < 10 || Math.abs(endY - startY) < 10) {
        throw new Error(`拖拽范围过小，可能无法选中内容: 宽度=${Math.abs(endX - startX)}, 高度=${Math.abs(endY - startY)}`);
      }
      
      // 确定检测上下文（优先使用传入的targetContext，否则使用page）
      const detectionContext = targetContext || page;
      
      // 移动到起始位置
      await page.mouse.move(startX, startY);
      await page.waitForTimeout(100);
      
      // 按住鼠标左键
      await page.mouse.down();
      await page.waitForTimeout(50);
      
      // 执行带滚轮滚动的拖拽操作
      logger.info(`在拖拽过程中同步模拟快速向下滚轮滚动 (${contextName})`);
      await this.performDragWithMouseWheel(page, startX, startY, endX, endY, steps, detectionContext, contextName);
      
      // 松开鼠标左键
      await page.mouse.up();
      await page.waitForTimeout(200);
      
      logger.info('拖拽选区操作完成');
      
    } catch (error) {
      logger.error('拖拽选区操作失败:', error);
      throw error;
    }
  }

  /**
   * 检查是否已经滚动到底部
   * @param {Object} context - Playwright页面或frame对象
   * @param {string} contextName - 上下文名称
   * @returns {Promise<boolean>} 是否在底部
   */
  async checkIfAtBottom(context, contextName = '主页面') {
    try {
      const isAtBottom = await context.evaluate(() => {
        const documentElement = document.documentElement;
        const body = document.body;
        
        // 获取文档滚动信息
        const scrollHeight = Math.max(
          documentElement.scrollHeight,
          documentElement.offsetHeight,
          documentElement.clientHeight,
          body ? body.scrollHeight : 0,
          body ? body.offsetHeight : 0
        );
        
        const clientHeight = window.innerHeight || documentElement.clientHeight;
        const scrollTop = window.pageYOffset || documentElement.scrollTop || (body ? body.scrollTop : 0);
        
        // 检查是否已经滚动到底部（10px容错）
        return Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
      });
      
      return isAtBottom;
      
    } catch (error) {
      logger.error(`检查是否在底部失败 (${contextName}):`, error);
      return true; // 出错时认为在底部，停止滚动
    }
  }
  
  /**
   * 执行带滚轮滚动的拖拽操作
   * @param {Object} page - Playwright页面对象
   * @param {number} startX - 起始X坐标
   * @param {number} startY - 起始Y坐标
   * @param {number} endX - 结束X坐标
   * @param {number} endY - 结束Y坐标
   * @param {number} steps - 拖拽步数
   * @param {Object} detectionContext - 检测上下文（page或frame）
   * @param {string} contextName - 上下文名称
   */
  async performDragWithMouseWheel(page, startX, startY, endX, endY, steps, detectionContext, contextName) {
    try {
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      
      // 滚轮滚动参数（快速向下滚动）
      const wheelDeltaY = 500; // 每次滚动500像素，快速滚动
      let isAtBottom = false;
      
      logger.info(`开始带滚轮滚动的拖拽操作 (${contextName}), 滚轮速度: ${wheelDeltaY}px`);
      
      // 分步拖拽和滚轮滚动
      for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        
        // 计算当前位置
        const currentX = startX + deltaX * progress;
        const currentY = startY + deltaY * progress;
        
        // 记录拖拽路径中的坐标点
        this.recordDragPoint(currentX, currentY);
        
        // 移动鼠标
        await page.mouse.move(currentX, currentY);
        
        // 每步都执行滚轮滚动（除非已经在底部）
        if (!isAtBottom) {
          // 使用page.mouse.wheel模拟滚轮向下滚动
          await page.mouse.wheel(0, wheelDeltaY);
          
          logger.info(`步骤 ${i}/${steps}: 在${contextName}执行滚轮滚动 deltaY=${wheelDeltaY}`);
          
          // 每3步检查一次是否已经滚动到底部
          if (i % 3 === 0 || i === steps) {
            isAtBottom = await this.checkIfAtBottom(detectionContext, contextName);
            if (isAtBottom) {
              logger.info(`✅ 已滚动到底部 (${contextName})，停止滚轮滚动`);
            }
          }
        }
        
        // 短暂等待，使拖拽更平滑
        await page.waitForTimeout(15); // 稍微增加等待时间，让滚轮滚动更稳定
      }
      
      logger.info(`带滚轮滚动的拖拽操作完成 (${contextName})`);
      
    } catch (error) {
      logger.error(`带滚轮滚动的拖拽操作失败 (${contextName}):`, error);
      throw error;
    }
  }
  /**
   * 清理资源
   */
  async cleanup() {
    try {
      this.isInitialized = false;
      // 清理拖拽路径记录
      this.resetDragPath();
      logger.info('拖拽选区服务清理完成');
    } catch (error) {
      logger.error('拖拽选区服务清理失败:', error);
    }
  }
}

module.exports = DragSelectionService;