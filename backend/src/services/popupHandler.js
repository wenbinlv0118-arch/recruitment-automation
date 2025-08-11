const path = require('path');
const fs = require('fs-extra');

/**
 * 弹窗处理器类
 * 负责检测和处理智联招聘页面中的各种弹窗
 */
class PopupHandler {
  constructor(page, storageDir) {
    this.page = page;
    this.storageDir = storageDir;
    
    // 弹窗处理配置
    this.popupConfig = {
      // 弹窗检测选择器
      popupSelectors: [
        '.a-modal__content', '.a-dialog', '[class*="modal"]', '[class*="dialog"]',
        '[class*="popup"]', '[class*="overlay"]', '[style*="position: fixed"][style*="z-index"]'
      ],
      // 关闭按钮选择器
      closeSelectors: [
        'button.a-button.a-dialog__hide', 'button:has-text("×")', 'button:has-text("X")',
        '[class*="close"]', '[class*="cancel"]', 'text=关闭', 'text=取消'
      ],
      // 确认按钮选择器
      confirmSelectors: [
        'text=确定', 'text=确认', 'text=同意', 'text=继续', '[class*="confirm"]'
      ]
    };
  }

  /**
   * 弹窗检测 - 基于视觉特征
   * @returns {Promise<boolean>} 是否检测到弹窗
   */
  async detectPopups() {
    try {
      // 1. 首先尝试基于选择器的检测
      for (const selector of this.popupConfig.popupSelectors) {
        const popup = await this.findElement([selector]);
        if (popup) {
          const text = await popup.textContent();
          if (text && (text.includes('附件简历') || text.includes('同步') || text.includes('在线简历'))) {
            console.log('检测到同步弹窗');
            return true;
          }
          return true;
        }
      }

      // 2. 增强的基于文本内容的检测
      const pageContent = await this.page.content();
      if (pageContent.includes('附件简历') || pageContent.includes('同步') || pageContent.includes('在线简历')) {
        console.log('基于页面内容检测到同步弹窗');
        return true;
      }

      // 3. 基于视觉特征的弹窗检测
      const popupCandidates = await this.page.locator('div, section, article').all();
      for (const candidate of popupCandidates) {
        if (!(await candidate.isVisible())) continue;
        
        try {
          const box = await candidate.boundingBox();
          if (!box) continue;

          // 检查是否位于页面中央
          const viewport = await this.page.viewportSize();
          const isCentered = 
            Math.abs(box.x + box.width/2 - viewport.width/2) < viewport.width * 0.3 &&
            Math.abs(box.y + box.height/2 - viewport.height/2) < viewport.height * 0.3;

          if (isCentered && box.width > 150 && box.height > 80) { // 降低尺寸要求
            // 检查是否有固定定位或高z-index
            const style = await candidate.evaluate(el => {
              try {
                const computed = window.getComputedStyle(el);
                return {
                  position: computed.position,
                  zIndex: computed.zIndex,
                  backgroundColor: computed.backgroundColor,
                  boxShadow: computed.boxShadow
                };
              } catch (error) {
                console.error('获取元素样式时出错:', error);
                return {
                  position: 'static',
                  zIndex: '0',
                  backgroundColor: 'rgba(0, 0, 0, 0)',
                  boxShadow: 'none'
                };
              }
            });

            // 判断是否为弹窗：固定定位、高z-index、有背景色或阴影
            const isPopup = 
              style.position === 'fixed' ||
              parseInt(style.zIndex) > 1000 ||
              style.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
              style.boxShadow !== 'none' ||
              (box.width > 300 && box.height > 200); // 增加尺寸判断

            if (isPopup) {
              console.log('基于视觉特征检测到弹窗:', {
                position: style.position,
                zIndex: style.zIndex,
                size: `${box.width}x${box.height}`,
                center: `${box.x + box.width/2}, ${box.y + box.height/2}`
              });
              return true;
            }
          }
        } catch (error) {
          // 继续检查下一个元素
        }
      }

      return false;
    } catch (error) {
      console.error('检测弹窗时出错:', error);
      return false;
    }
  }

  /**
   * 弹窗关闭 - 基于视觉特征定位
   * @param {Object} socket - Socket.IO实例
   * @returns {Promise<boolean>} 是否成功关闭弹窗
   */
  async closePopups(socket) {
    try {
      // 1. 首先尝试精确的关闭按钮选择器
      for (const selector of this.popupConfig.closeSelectors) {
        const closeButton = await this.findElement([selector]);
        if (closeButton && await closeButton.isEnabled()) {
          await closeButton.click();
          console.log(`点击关闭按钮: ${selector}`);
          await this.page.waitForTimeout(1500); // 增加等待时间
          
          if (!(await this.detectPopups())) {
            console.log('成功关闭弹窗');
            return true;
          }
        }
      }

      // 2. 基于视觉特征找到弹窗，然后在弹窗内查找关闭按钮
      const popupCandidates = await this.page.locator('div, section, article').all();
      for (const candidate of popupCandidates) {
        if (!(await candidate.isVisible())) continue;
        
        try {
          const box = await candidate.boundingBox();
          if (!box) continue;

          // 检查是否位于页面中央
          const viewport = await this.page.viewportSize();
          const isCentered = 
            Math.abs(box.x + box.width/2 - viewport.width/2) < viewport.width * 0.3 &&
            Math.abs(box.y + box.height/2 - viewport.height/2) < viewport.height * 0.3;

          if (isCentered && box.width > 150 && box.height > 80) { // 降低尺寸要求
            // 检查样式特征
            const style = await candidate.evaluate(el => {
              const computed = window.getComputedStyle(el);
              return {
                position: computed.position,
                zIndex: computed.zIndex,
                backgroundColor: computed.backgroundColor,
                boxShadow: computed.boxShadow
              };
            });

            const isPopup = 
              style.position === 'fixed' ||
              parseInt(style.zIndex) > 1000 ||
              style.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
              style.boxShadow !== 'none' ||
              (box.width > 300 && box.height > 200); // 增加尺寸判断

            if (isPopup) {
              console.log('找到弹窗，开始查找关闭按钮');
              
              // 在弹窗内查找关闭按钮
              const closeElements = await candidate.locator('button, span, div, a').all();
              for (const element of closeElements) {
                if (!(await element.isVisible())) continue;
                
                try {
                  const elementBox = await element.boundingBox();
                  if (!elementBox) continue;

                  // 检查是否在弹窗右上角区域
                  const isTopRight = 
                    elementBox.x > box.x + box.width * 0.7 &&
                    elementBox.y < box.y + box.height * 0.3;

                  if (isTopRight) {
                    const text = await element.textContent();
                    const tagName = await element.evaluate(el => {
                      try {
                        return el.tagName.toLowerCase();
                      } catch (error) {
                        return 'div';
                      }
                    });
                    
                    // 检查是否为关闭按钮
                    let isCloseButton = 
                      text && (text.includes('×') || text.includes('X') || text.includes('关闭') || text.includes('取消')) ||
                      tagName === 'button';
                    
                    if (!isCloseButton) {
                      try {
                        isCloseButton = await element.evaluate(el => {
                          try {
                            const classes = el.className || '';
                            return classes.includes('close') || classes.includes('cancel') || classes.includes('hide');
                          } catch (error) {
                            return false;
                          }
                        });
                      } catch (error) {
                        isCloseButton = false;
                      }
                    }

                    if (isCloseButton) {
                      await element.click();
                      console.log('点击弹窗内关闭按钮:', text || tagName);
                      await this.page.waitForTimeout(1500); // 增加等待时间
                      
                      if (!(await this.detectPopups())) {
                        console.log('成功关闭弹窗');
                        return true;
                      }
                    }
                  }
                } catch (error) {
                  // 继续检查下一个元素
                }
              }

              // 如果没找到关闭按钮，尝试点击弹窗右上角位置
              const clickX = box.x + box.width - 20;
              const clickY = box.y + 20;
              await this.page.mouse.click(clickX, clickY);
              console.log(`点击弹窗右上角位置: (${clickX}, ${clickY})`);
              await this.page.waitForTimeout(1500); // 增加等待时间
              
              if (!(await this.detectPopups())) {
                console.log('点击弹窗右上角成功关闭弹窗');
                return true;
              }
            }
          }
        } catch (error) {
          // 继续检查下一个元素
        }
      }

      // 3. 尝试确认按钮
      for (const selector of this.popupConfig.confirmSelectors) {
        const confirmButton = await this.findElement([selector]);
        if (confirmButton && await confirmButton.isEnabled()) {
          await confirmButton.click();
          console.log(`点击确认按钮: ${selector}`);
          await this.page.waitForTimeout(1500); // 增加等待时间
          return true;
        }
      }

      // 4. 尝试ESC键
      await this.page.keyboard.press('Escape');
      console.log('按下ESC键');
      await this.page.waitForTimeout(1000); // 增加等待时间
      
      if (!(await this.detectPopups())) {
        console.log('ESC键成功关闭弹窗');
        return true;
      }

      // 5. 尝试点击弹窗外部
      await this.page.mouse.click(10, 10);
      console.log('点击页面左上角');
      await this.page.waitForTimeout(1000); // 增加等待时间
      
      if (!(await this.detectPopups())) {
        console.log('点击外部成功关闭弹窗');
        return true;
      }

      return false;
    } catch (error) {
      console.error('关闭弹窗时出错:', error);
      return false;
    }
  }

  /**
   * 自动处理弹窗
   * @param {Object} socket - Socket.IO实例
   * @param {string} context - 处理上下文
   * @returns {Promise<boolean>} 是否处理了弹窗
   */
  async autoHandlePopups(socket, context = 'general') {
    try {
      console.log(`开始自动处理弹窗，上下文: ${context}`);
      
      await this.page.waitForLoadState('networkidle');
      // 使用更智能的等待方式，监听页面加载事件
      await Promise.race([
        this.page.waitForSelector('body', { timeout: 5000 }),
        new Promise(resolve => setTimeout(resolve, 3000))
      ]);
      
      // 监听控制台日志
      this.page.on('console', msg => {
        if (msg.text().includes('关闭同步弹窗')) {
          console.log('检测到同步弹窗关闭事件:', msg.text());
        }
      });
      
      await this.page.screenshot({ path: path.join(this.storageDir, `debug_popup_${context}.png`) });
      
      let attempts = 0;
      const maxAttempts = 8; // 增加尝试次数
      let popupHandled = false;
      
      // 使用更智能的等待方式，监听页面加载事件
      await Promise.race([
        this.page.waitForLoadState('domcontentloaded'),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]);
      
      while (attempts < maxAttempts) {
        attempts++;
        console.log(`弹窗处理尝试 ${attempts}/${maxAttempts}`);
        
        if (await this.detectPopups()) {
          if (await this.closePopups(socket)) {
            popupHandled = true;
            console.log('成功处理弹窗');
            // 使用更智能的等待方式，监听页面加载事件
            await Promise.race([
              this.page.waitForLoadState('domcontentloaded'),
              new Promise(resolve => setTimeout(resolve, 1500))
            ]);
            continue;
          }
        } else {
          console.log('未检测到弹窗');
          if (attempts >= 3) break;
          // 使用更智能的等待方式，监听页面加载事件
          await Promise.race([
            this.page.waitForLoadState('domcontentloaded'),
            new Promise(resolve => setTimeout(resolve, 1500))
          ]);
        }
      }
      
      await this.page.screenshot({ path: path.join(this.storageDir, `debug_after_popup_${context}.png`) });
      
      if (popupHandled) {
        console.log('自动弹窗处理完成');
        socket.emit('statusUpdate', { 
          status: 'auto_popup_completed', 
          message: '自动弹窗处理完成' 
        });
      }
      
      return popupHandled;
      
    } catch (error) {
      console.error('自动处理弹窗时出错:', error);
      return false;
    }
  }

  /**
   * 处理简历下载相关的弹窗
   * @param {Object} socket - Socket.IO实例
   * @returns {Promise<boolean>} 是否处理了弹窗
   */
  async handleResumeDownloadPopups(socket) {
    try {
      console.log('开始处理简历下载弹窗...');
      
      // 1. 处理简历类型选择弹窗
      const resumeTypeSelectors = [
        '.a-modal__content:has-text("普通简历")',
        '.a-dialog:has-text("普通简历")',
        '[class*="modal"]:has-text("普通简历")',
        '[class*="dialog"]:has-text("普通简历")'
      ];
      
      for (const selector of resumeTypeSelectors) {
        try {
          const popup = await this.page.locator(selector).first();
          if (await popup.isVisible()) {
            console.log('检测到简历类型选择弹窗');
            
            // 选择普通简历
            const normalResumeButton = await popup.locator('text=普通简历, text=标准简历, button:has-text("普通")').first();
            if (normalResumeButton && await normalResumeButton.isVisible()) {
              await normalResumeButton.click();
              console.log('已选择普通简历类型');
              // 使用更智能的等待方式，监听页面加载事件
            await Promise.race([
              this.page.waitForLoadState('domcontentloaded'),
              new Promise(resolve => setTimeout(resolve, 1000))
            ]);
            }
            
            return true;
          }
        } catch (error) {
          console.log(`处理简历类型弹窗失败: ${error.message}`);
        }
      }
      
      // 2. 处理下载确认弹窗
      const downloadConfirmSelectors = [
        '.a-modal__content:has-text("立即下载")',
        '.a-dialog:has-text("立即下载")',
        '[class*="modal"]:has-text("立即下载")',
        '[class*="dialog"]:has-text("立即下载")'
      ];
      
      for (const selector of downloadConfirmSelectors) {
        try {
          const popup = await this.page.locator(selector).first();
          if (await popup.isVisible()) {
            console.log('检测到下载确认弹窗');
            
            // 点击立即下载
            const downloadButton = await popup.locator('text=立即下载, button:has-text("立即下载"), button:has-text("确认")').first();
            if (downloadButton && await downloadButton.isVisible()) {
              await downloadButton.click();
              console.log('已确认下载');
              await this.page.waitForTimeout(1000);
            }
            
            return true;
          }
        } catch (error) {
          console.log(`处理下载确认弹窗失败: ${error.message}`);
        }
      }
      
      // 3. 处理权限验证弹窗
      const permissionSelectors = [
        '.a-modal__content:has-text("权限")',
        '.a-dialog:has-text("权限")',
        '[class*="modal"]:has-text("权限")',
        '[class*="dialog"]:has-text("权限")'
      ];
      
      for (const selector of permissionSelectors) {
        try {
          const popup = await this.page.locator(selector).first();
          if (await popup.isVisible()) {
            console.log('检测到权限验证弹窗');
            
            // 点击确认或同意
            const confirmButton = await popup.locator('text=确认, text=同意, text=继续, button:has-text("确认")').first();
            if (confirmButton && await confirmButton.isVisible()) {
              await confirmButton.click();
              console.log('已确认权限');
              await this.page.waitForTimeout(1000);
            }
            
            return true;
          }
        } catch (error) {
          console.log(`处理权限验证弹窗失败: ${error.message}`);
        }
      }
      
      console.log('未检测到简历下载相关弹窗');
      return false;
      
    } catch (error) {
      console.error('处理简历下载弹窗时出错:', error);
      return false;
    }
  }

  /**
   * 通用元素查找方法
   * @param {Array<string>} selectors - 选择器数组
   * @returns {Promise<Object|null>} 找到的元素或null
   */
  async findElement(selectors) {
    for (const selector of selectors) {
      try {
        const element = await this.page.locator(selector).first();
        if (await element.isVisible()) {
          console.log(`找到元素: ${selector}`);
          return element;
        }
      } catch (error) {
        // 继续尝试下一个选择器
      }
    }
    return null;
  }
}

module.exports = PopupHandler;