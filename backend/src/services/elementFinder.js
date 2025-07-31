/**
 * 元素查找器类
 * 提供增强的元素查找功能，支持超时重试和动态等待策略
 */
class ElementFinder {
  constructor(page, defaultTimeout = 30000) {
    this.page = page;
    this.defaultTimeout = defaultTimeout;
  }

  /**
   * 增强的元素查找方法，支持超时重试机制
   * @param {Array<string>} selectors - 选择器数组
   * @param {Object} options - 查找选项
   * @param {number} options.timeout - 超时时间(毫秒)
   * @param {number} options.retryCount - 重试次数
   * @param {number} options.retryInterval - 重试间隔(毫秒)
   * @param {boolean} options.waitForVisible - 是否等待元素可见
   * @returns {Promise<Object|null>} 找到的元素或null
   */
  async findElement(selectors, options = {}) {
    const {
      timeout = this.defaultTimeout,
      retryCount = 3,
      retryInterval = 1000,
      waitForVisible = true
    } = options;

    let lastError = null;
    
    // 重试机制
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      if (attempt > 0) {
        console.log(`元素查找重试 ${attempt}/${retryCount}`);
        await this.page.waitForTimeout(retryInterval);
      }

      for (const selector of selectors) {
        try {
          const element = await this.page.locator(selector).first();
          
          // 检查元素是否存在
          const exists = await element.isVisible();
          if (exists) {
            console.log(`找到元素: ${selector}`);
            return element;
          } else if (!waitForVisible) {
            // 如果不等待可见且元素存在
            const count = await this.page.locator(selector).count();
            if (count > 0) {
              console.log(`找到元素(不可见): ${selector}`);
              return element;
            }
          }
        } catch (error) {
          lastError = error;
          console.log(`查找元素失败 (${selector}):`, error.message);
        }
      }

      // 如果不是最后一次重试，继续下一次
      if (attempt < retryCount) {
        console.log(`未找到元素，${retryInterval}ms后重试...`);
      }
    }

    console.log(`元素查找失败，已尝试 ${retryCount + 1} 次`);
    if (lastError) {
      console.log('最后错误:', lastError.message);
    }
    
    return null;
  }

  /**
   * 等待元素出现
   * @param {Array<string>} selectors - 选择器数组
   * @param {Object} options - 等待选项
   * @returns {Promise<Object|null>} 找到的元素或null
   */
  async waitForElement(selectors, options = {}) {
    const {
      timeout = this.defaultTimeout,
      retryCount = 2
    } = options;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      const element = await this.findElement(selectors, { 
        timeout, 
        waitForVisible: true 
      });
      
      if (element) {
        return element;
      }
      
      if (attempt < retryCount) {
        console.log(`等待元素出现，1秒后重试...`);
        await this.page.waitForTimeout(1000);
      }
    }
    
    return null;
  }

  /**
   * 检查元素是否存在
   * @param {string} selector - 选择器
   * @returns {Promise<boolean>} 元素是否存在
   */
  async exists(selector) {
    try {
      const count = await this.page.locator(selector).count();
      return count > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * 获取元素文本内容
   * @param {Array<string>} selectors - 选择器数组
   * @returns {Promise<string|null>} 元素文本内容或null
   */
  async getText(selectors) {
    const element = await this.findElement(selectors);
    if (element) {
      try {
        return await element.textContent();
      } catch (error) {
        console.error('获取元素文本失败:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * 点击元素
   * @param {Array<string>} selectors - 选择器数组
   * @param {Object} options - 点击选项
   * @returns {Promise<boolean>} 是否成功点击
   */
  async clickElement(selectors, options = {}) {
    const {
      timeout = this.defaultTimeout,
      retryCount = 2
    } = options;

    const element = await this.findElement(selectors, { timeout });
    if (element) {
      try {
        // 等待元素可点击
        await element.waitFor({ state: 'visible', timeout });
        await element.click();
        console.log(`成功点击元素: ${selectors[0]}`);
        return true;
      } catch (error) {
        console.error(`点击元素失败: ${selectors[0]}`, error);
        return false;
      }
    }
    
    return false;
  }

  /**
   * 填充输入框
   * @param {Array<string>} selectors - 选择器数组
   * @param {string} value - 填充值
   * @param {Object} options - 填充选项
   * @returns {Promise<boolean>} 是否成功填充
   */
  async fillInput(selectors, value, options = {}) {
    const {
      timeout = this.defaultTimeout,
      clearFirst = true
    } = options;

    const element = await this.findElement(selectors, { timeout });
    if (element) {
      try {
        // 等待元素可编辑
        await element.waitFor({ state: 'visible', timeout });
        
        if (clearFirst) {
          await element.clear();
        }
        
        await element.fill(value);
        console.log(`成功填充输入框: ${selectors[0]} = ${value}`);
        return true;
      } catch (error) {
        console.error(`填充输入框失败: ${selectors[0]}`, error);
        return false;
      }
    }
    
    return false;
  }
}

module.exports = ElementFinder;