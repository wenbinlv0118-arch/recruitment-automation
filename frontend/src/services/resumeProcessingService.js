import { message } from 'antd';

class ResumeProcessingService {
  constructor() {
    this.processingQueue = [];
    this.isProcessing = false;
    this.collectionLimit = 400; // Boss直聘收藏上限
    this.currentCollectionCount = 0;
  }

  /**
   * 自动收藏候选人
   * @param {Object} candidate - 候选人信息
   * @param {Object} page - Playwright页面对象
   * @returns {Object} 收藏结果
   */
  async autoCollectCandidate(candidate, page) {
    try {
      // 检查收藏上限
      if (this.currentCollectionCount >= this.collectionLimit) {
        return {
          success: false,
          error: '已达到收藏上限400个，无法继续收藏'
        };
      }

      message.info(`正在收藏候选人 ${candidate.name}...`);

      // 1. 查找收藏按钮
      const collectButton = await this.findCollectButton(page);
      if (!collectButton) {
        return {
          success: false,
          error: '未找到收藏按钮'
        };
      }

      // 2. 执行收藏操作
      await this.executeCollectAction(page, collectButton);

      // 3. 验证收藏结果
      const isCollected = await this.verifyCollectionResult(page, candidate);
      
      if (isCollected) {
        this.currentCollectionCount++;
        message.success(`候选人 ${candidate.name} 收藏成功`);
        
        return {
          success: true,
          message: '收藏成功',
          collectionCount: this.currentCollectionCount
        };
      } else {
        return {
          success: false,
          error: '收藏操作失败，请重试'
        };
      }

    } catch (error) {
      console.error('自动收藏失败:', error);
      message.error(`收藏失败: ${error.message}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 查找收藏按钮
   * @param {Object} page - Playwright页面对象
   * @returns {Object|null} 收藏按钮元素
   */
  async findCollectButton(page) {
    try {
      // 尝试多种选择器来定位收藏按钮
      const selectors = [
        '[data-testid="collect-button"]',
        '.collect-btn',
        '.favorite-btn',
        'button:has-text("收藏")',
        'button:has-text("关注")',
        '.ant-btn:has-text("收藏")',
        '.ant-btn:has-text("关注")'
      ];

      for (const selector of selectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            return button;
          }
        } catch (e) {
          continue;
        }
      }

      // 如果没找到，尝试通过文本内容查找
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await button.textContent();
        if (text && (text.includes('收藏') || text.includes('关注'))) {
          return button;
        }
      }

      return null;
    } catch (error) {
      console.error('查找收藏按钮失败:', error);
      return null;
    }
  }

  /**
   * 执行收藏操作
   * @param {Object} page - Playwright页面对象
   * @param {Object} collectButton - 收藏按钮元素
   */
  async executeCollectAction(page, collectButton) {
    try {
      // 检查按钮是否可点击
      const isEnabled = await collectButton.isEnabled();
      if (!isEnabled) {
        throw new Error('收藏按钮不可点击');
      }

      // 点击收藏按钮
      await collectButton.click();
      
      // 等待操作完成
      await page.waitForTimeout(1000);

      // 检查是否有确认弹窗
      const confirmDialog = await page.$('.ant-modal, .modal, .dialog');
      if (confirmDialog) {
        // 点击确认按钮
        const confirmButton = await page.$('button:has-text("确定"), button:has-text("确认")');
        if (confirmButton) {
          await confirmButton.click();
          await page.waitForTimeout(500);
        }
      }

    } catch (error) {
      throw new Error(`执行收藏操作失败: ${error.message}`);
    }
  }

  /**
   * 验证收藏结果
   * @param {Object} page - Playwright页面对象
   * @param {Object} candidate - 候选人信息
   * @returns {boolean} 是否收藏成功
   */
  async verifyCollectionResult(page, candidate) {
    try {
      // 等待页面更新
      await page.waitForTimeout(1000);

      // 检查收藏按钮状态变化
      const collectButton = await this.findCollectButton(page);
      if (!collectButton) {
        return false;
      }

      // 检查按钮文本或样式是否变化
      const buttonText = await collectButton.textContent();
      const buttonClass = await collectButton.getAttribute('class');
      
      // 如果按钮文本变为"已收藏"或样式变化，说明收藏成功
      if (buttonText.includes('已收藏') || buttonText.includes('已关注') || 
          buttonClass.includes('collected') || buttonClass.includes('active')) {
        return true;
      }

      // 检查页面是否有成功提示
      const successMessage = await page.$('.ant-message-success, .success-message, .toast-success');
      if (successMessage) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('验证收藏结果失败:', error);
      return false;
    }
  }

  /**
   * 处理简历入库
   * @param {Object} resumeData - 简历数据
   * @returns {Object} 入库结果
   */
  async processResumeStorage(resumeData) {
    try {
      message.info(`正在处理简历入库: ${resumeData.candidateName}`);

      // 1. 数据验证
      const validationResult = this.validateResumeData(resumeData);
      if (!validationResult.isValid) {
        return {
          success: false,
          error: `数据验证失败: ${validationResult.errors.join(', ')}`
        };
      }

      // 2. 数据标准化
      const normalizedData = this.normalizeResumeData(resumeData);

      // 3. 调用后端API进行入库
      const storageResult = await this.callStorageAPI(normalizedData);

      if (storageResult.success) {
        message.success(`简历 ${resumeData.candidateName} 入库成功`);
        
        return {
          success: true,
          message: '入库成功',
          resumeId: storageResult.resumeId,
          storageTime: new Date().toISOString()
        };
      } else {
        return {
          success: false,
          error: storageResult.error
        };
      }

    } catch (error) {
      console.error('简历入库失败:', error);
      message.error(`入库失败: ${error.message}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 验证简历数据
   * @param {Object} resumeData - 简历数据
   * @returns {Object} 验证结果
   */
  validateResumeData(resumeData) {
    const errors = [];
    
    // 必填字段检查
    if (!resumeData.candidateName) {
      errors.push('候选人姓名不能为空');
    }
    
    if (!resumeData.resumeText) {
      errors.push('简历内容不能为空');
    }
    
    if (!resumeData.keyInfo) {
      errors.push('关键信息不能为空');
    }
    
    // 数据完整性检查
    if (resumeData.resumeText.length < 100) {
      errors.push('简历内容过短，至少需要100字符');
    }
    
    if (resumeData.qualityScore < 0 || resumeData.qualityScore > 100) {
      errors.push('质量评分必须在0-100之间');
    }

    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * 标准化简历数据
   * @param {Object} resumeData - 原始简历数据
   * @returns {Object} 标准化后的数据
   */
  normalizeResumeData(resumeData) {
    return {
      id: resumeData.id,
      name: resumeData.candidateName,
      title: resumeData.candidateTitle,
      company: resumeData.candidateCompany,
      experience: resumeData.candidateExperience,
      resumeContent: resumeData.resumeText,
      qualityScore: resumeData.qualityScore,
      keyInfo: {
        phone: resumeData.keyInfo.phone,
        email: resumeData.keyInfo.email,
        position: resumeData.keyInfo.position,
        education: resumeData.keyInfo.education
      },
      status: 'stored',
      collectedAt: resumeData.collectedAt,
      storedAt: new Date().toISOString(),
      source: 'boss_zhipin',
      tags: this.generateTags(resumeData)
    };
  }

  /**
   * 生成简历标签
   * @param {Object} resumeData - 简历数据
   * @returns {Array} 标签数组
   */
  generateTags(resumeData) {
    const tags = [];
    
    // 根据质量评分添加标签
    if (resumeData.qualityScore >= 80) {
      tags.push('高质量');
    } else if (resumeData.qualityScore >= 60) {
      tags.push('中等质量');
    } else {
      tags.push('需改进');
    }
    
    // 根据工作经验添加标签
    if (resumeData.candidateExperience) {
      const exp = resumeData.candidateExperience;
      if (exp.includes('5年') || exp.includes('6年') || exp.includes('7年') || exp.includes('8年') || exp.includes('9年') || exp.includes('10年')) {
        tags.push('资深');
      } else if (exp.includes('3年') || exp.includes('4年')) {
        tags.push('中级');
      } else if (exp.includes('1年') || exp.includes('2年')) {
        tags.push('初级');
      }
    }
    
    // 根据职位添加标签
    if (resumeData.candidateTitle) {
      const title = resumeData.candidateTitle.toLowerCase();
      if (title.includes('前端') || title.includes('frontend')) {
        tags.push('前端开发');
      } else if (title.includes('后端') || title.includes('backend')) {
        tags.push('后端开发');
      } else if (title.includes('全栈') || title.includes('fullstack')) {
        tags.push('全栈开发');
      } else if (title.includes('产品') || title.includes('product')) {
        tags.push('产品经理');
      } else if (title.includes('设计') || title.includes('design')) {
        tags.push('设计师');
      }
    }
    
    return tags;
  }

  /**
   * 调用存储API
   * @param {Object} normalizedData - 标准化后的数据
   * @returns {Object} API调用结果
   */
  async callStorageAPI(normalizedData) {
    try {
      // 这里应该调用实际的后端API
      // 目前先模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟成功响应
      return {
        success: true,
        resumeId: `resume_${Date.now()}`,
        message: '存储成功'
      };
      
      // 实际的API调用代码应该是：
      // const response = await fetch('/api/resumes', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify(normalizedData)
      // });
      // 
      // if (response.ok) {
      //   const result = await response.json();
      //   return { success: true, ...result };
      // } else {
      //   throw new Error(`API调用失败: ${response.status}`);
      // }
      
    } catch (error) {
      throw new Error(`API调用失败: ${error.message}`);
    }
  }

  /**
   * 获取收藏统计信息
   * @returns {Object} 统计信息
   */
  getCollectionStatistics() {
    return {
      currentCount: this.currentCollectionCount,
      limit: this.collectionLimit,
      remaining: this.collectionLimit - this.currentCollectionCount,
      usageRate: Math.round((this.currentCollectionCount / this.collectionLimit) * 100)
    };
  }

  /**
   * 重置收藏计数
   */
  resetCollectionCount() {
    this.currentCollectionCount = 0;
    message.success('收藏计数已重置');
  }

  /**
   * 设置收藏上限
   * @param {number} limit - 新的收藏上限
   */
  setCollectionLimit(limit) {
    if (limit > 0 && limit <= 1000) {
      this.collectionLimit = limit;
      message.success(`收藏上限已设置为 ${limit}`);
    } else {
      message.error('收藏上限必须在1-1000之间');
    }
  }
}

// 创建单例实例
const resumeProcessingService = new ResumeProcessingService();

export default resumeProcessingService;
