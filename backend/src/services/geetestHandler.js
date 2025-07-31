/**
 * 极验验证码处理器
 * 负责检测和处理极验验证码
 */
class GeetestHandler {
  constructor(page) {
    this.page = page;
  }

  /**
   * 处理极验验证码
   * @param {Object} socket - Socket.IO实例
   * @returns {Promise<boolean>} 是否检测并处理了极验验证码
   */
  async handleGeetest(socket) {
    try {
      console.log('检查是否存在极验验证码...');
      
      // 检查是否存在极验验证码
      const geetestSelectors = [
        '.geetest_panel',
        '.geetest_wind',
        '[class*="geetest"]',
        'iframe[src*="geetest"]'
      ];
      
      for (const selector of geetestSelectors) {
        const geetest = await this.findElement([selector]);
        if (geetest) {
          console.log(`检测到极验验证码: ${selector}`);
          
          // 检查是否已经通过验证
          const isAlreadyPassed = await this.page.evaluate(() => {
            try {
              const successPanel = document.querySelector('.geetest_success');
              const successTitle = document.querySelector('.geetest_panel_success_title');
              const successAnimate = document.querySelector('.geetest_success_animate');
              return successPanel || (successTitle && successTitle.textContent.includes('通过验证')) || successAnimate;
            } catch (error) {
              console.error('检查极验验证码状态时出错:', error);
              return false;
            }
          });
          
          if (isAlreadyPassed) {
            console.log('极验验证码已经通过');
            socket.emit('statusUpdate', { 
              status: 'geetest_completed', 
              message: '验证码已通过验证' 
            });
            
            // 等待验证码面板消失
            await this.page.waitForTimeout(3000);
            return true;
          }
          
          socket.emit('statusUpdate', { 
            status: 'geetest_detected', 
            message: '检测到验证码，请手动完成验证' 
          });
          
          // 等待用户手动完成验证
          await this.page.waitForFunction(() => {
            try {
              // 检查验证码是否已完成
              const successPanel = document.querySelector('.geetest_success');
              const successTitle = document.querySelector('.geetest_panel_success_title');
              const successAnimate = document.querySelector('.geetest_success_animate');
              return successPanel || (successTitle && successTitle.textContent.includes('通过验证')) || successAnimate;
            } catch (error) {
              console.error('等待极验验证码完成时出错:', error);
              return false;
            }
          }, { timeout: 60000 }); // 等待60秒
          
          console.log('极验验证码已完成');
          socket.emit('statusUpdate', { 
            status: 'geetest_completed', 
            message: '验证码验证完成' 
          });
          
          // 等待验证码面板消失
          await this.page.waitForTimeout(3000);
          return true;
        }
      }
      
      console.log('未检测到极验验证码');
      return false;
    } catch (error) {
      console.log('处理极验验证码时出错:', error.message);
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

module.exports = GeetestHandler;