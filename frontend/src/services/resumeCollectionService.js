import { message } from 'antd';

class ResumeCollectionService {
  constructor() {
    this.collectedResumes = [];
    this.qualityThreshold = 60; // 简历质量阈值
    this.maxResumeLength = 10000; // 最大简历长度
    this.minResumeLength = 200; // 最小简历长度
  }

  /**
   * 采集候选人简历内容
   * @param {Object} candidate - 候选人信息
   * @param {Object} page - Playwright页面对象
   * @returns {Object} 采集结果
   */
  async collectResumeContent(candidate, page) {
    try {
      message.info(`正在采集候选人 ${candidate.name} 的简历内容...`);
      
      // 1. 等待简历内容加载
      await this.waitForResumeContent(page);
      
      // 2. 提取简历文本内容
      const resumeText = await this.extractResumeText(page);
      
      // 3. 检测简历质量
      const qualityResult = this.checkResumeQuality(resumeText);
      
      // 4. 构建简历数据
      const resumeData = this.buildResumeData(candidate, resumeText, qualityResult);
      
      // 5. 存储采集结果
      this.collectedResumes.push(resumeData);
      
      message.success(`简历采集完成，质量评分: ${qualityResult.score}`);
      
      return {
        success: true,
        resumeData,
        qualityResult
      };
      
    } catch (error) {
      console.error('简历采集失败:', error);
      message.error(`简历采集失败: ${error.message}`);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 等待简历内容加载
   * @param {Object} page - Playwright页面对象
   */
  async waitForResumeContent(page) {
    try {
      // 等待简历内容区域出现
      await page.waitForSelector('.resume-content, .candidate-resume, [data-testid="resume-content"]', {
        timeout: 10000
      });
      
      // 等待内容完全加载
      await page.waitForTimeout(2000);
      
    } catch (error) {
      throw new Error('简历内容加载超时');
    }
  }

  /**
   * 提取简历文本内容
   * @param {Object} page - Playwright页面对象
   * @returns {string} 简历文本内容
   */
  async extractResumeText(page) {
    try {
      // 尝试多种选择器来定位简历内容
      const selectors = [
        '.resume-content',
        '.candidate-resume',
        '[data-testid="resume-content"]',
        '.resume-detail',
        '.candidate-detail'
      ];
      
      let resumeText = '';
      
      for (const selector of selectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            resumeText = await element.evaluate(el => el.textContent || '');
            if (resumeText.trim()) {
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
      
      // 如果没有找到简历内容，尝试从整个页面提取
      if (!resumeText.trim()) {
        resumeText = await page.evaluate(() => {
          // 尝试找到包含候选人信息的区域
          const candidateInfo = document.querySelector('.candidate-info, .user-info, .profile-info');
          if (candidateInfo) {
            return candidateInfo.textContent || '';
          }
          
          // 如果还是找不到，返回页面主要内容
          const mainContent = document.querySelector('main, .main-content, .content');
          return mainContent ? mainContent.textContent || '' : document.body.textContent || '';
        });
      }
      
      // 清理文本内容
      resumeText = this.cleanResumeText(resumeText);
      
      if (!resumeText.trim()) {
        throw new Error('无法提取到简历内容');
      }
      
      return resumeText;
      
    } catch (error) {
      throw new Error(`提取简历文本失败: ${error.message}`);
    }
  }

  /**
   * 清理简历文本内容
   * @param {string} text - 原始文本
   * @returns {string} 清理后的文本
   */
  cleanResumeText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ') // 合并多个空格
      .replace(/\n+/g, '\n') // 合并多个换行
      .replace(/\t+/g, ' ') // 替换制表符
      .trim();
  }

  /**
   * 检测简历质量
   * @param {string} resumeText - 简历文本内容
   * @returns {Object} 质量检测结果
   */
  checkResumeQuality(resumeText) {
    const result = {
      score: 0,
      isValid: false,
      issues: [],
      suggestions: []
    };
    
    // 1. 长度检测
    if (resumeText.length < this.minResumeLength) {
      result.issues.push(`简历内容过短（${resumeText.length}字符），建议至少${this.minResumeLength}字符`);
      result.score -= 20;
    } else if (resumeText.length > this.maxResumeLength) {
      result.issues.push(`简历内容过长（${resumeText.length}字符），建议控制在${this.maxResumeLength}字符以内`);
      result.score -= 10;
    } else {
      result.score += 20;
    }
    
    // 2. 关键信息检测
    const keyInfo = this.extractKeyInformation(resumeText);
    
    if (keyInfo.name) result.score += 15;
    else result.issues.push('缺少姓名信息');
    
    if (keyInfo.phone) result.score += 15;
    else result.issues.push('缺少联系电话');
    
    if (keyInfo.email) result.score += 10;
    else result.issues.push('缺少邮箱信息');
    
    if (keyInfo.position) result.score += 15;
    else result.issues.push('缺少求职意向');
    
    if (keyInfo.experience) result.score += 15;
    else result.issues.push('缺少工作经验');
    
    if (keyInfo.education) result.score += 10;
    else result.issues.push('缺少教育背景');
    
    // 3. 内容完整性检测
    if (resumeText.includes('工作经历') || resumeText.includes('工作经验')) {
      result.score += 10;
    } else {
      result.issues.push('缺少详细工作经历描述');
    }
    
    if (resumeText.includes('技能') || resumeText.includes('专业技能')) {
      result.score += 10;
    } else {
      result.issues.push('缺少技能描述');
    }
    
    // 4. 生成建议
    if (result.score < this.qualityThreshold) {
      result.suggestions.push('简历质量较低，建议完善个人信息和详细描述');
    }
    
    if (!keyInfo.name) {
      result.suggestions.push('请添加姓名信息');
    }
    
    if (!keyInfo.phone) {
      result.suggestions.push('请添加联系电话');
    }
    
    if (!keyInfo.position) {
      result.suggestions.push('请明确求职意向');
    }
    
    // 5. 判断是否有效
    result.isValid = result.score >= this.qualityThreshold;
    
    return result;
  }

  /**
   * 提取关键信息
   * @param {string} resumeText - 简历文本内容
   * @returns {Object} 关键信息
   */
  extractKeyInformation(resumeText) {
    const info = {
      name: null,
      phone: null,
      email: null,
      position: null,
      experience: null,
      education: null
    };
    
    // 提取姓名（通常在开头，2-4个字符）
    const nameMatch = resumeText.match(/^[\u4e00-\u9fa5]{2,4}/);
    if (nameMatch) {
      info.name = nameMatch[0];
    }
    
    // 提取电话号码
    const phoneMatch = resumeText.match(/1[3-9]\d{9}/);
    if (phoneMatch) {
      info.phone = phoneMatch[0];
    }
    
    // 提取邮箱
    const emailMatch = resumeText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) {
      info.email = emailMatch[0];
    }
    
    // 提取求职意向
    const positionPatterns = [
      /求职意向[：:]\s*([^\n\r]+)/,
      /应聘职位[：:]\s*([^\n\r]+)/,
      /期望职位[：:]\s*([^\n\r]+)/
    ];
    
    for (const pattern of positionPatterns) {
      const match = resumeText.match(pattern);
      if (match) {
        info.position = match[1].trim();
        break;
      }
    }
    
    // 提取工作经验
    const experiencePatterns = [
      /工作经验[：:]\s*([^\n\r]+)/,
      /工作年限[：:]\s*([^\n\r]+)/,
      /(\d+年工作经验)/
    ];
    
    for (const pattern of experiencePatterns) {
      const match = resumeText.match(pattern);
      if (match) {
        info.experience = match[1].trim();
        break;
      }
    }
    
    // 提取教育背景
    const educationPatterns = [
      /学历[：:]\s*([^\n\r]+)/,
      /教育背景[：:]\s*([^\n\r]+)/,
      /(本科|硕士|博士|大专|高中)/
    ];
    
    for (const pattern of educationPatterns) {
      const match = resumeText.match(pattern);
      if (match) {
        info.education = match[1].trim();
        break;
      }
    }
    
    return info;
  }

  /**
   * 构建简历数据
   * @param {Object} candidate - 候选人信息
   * @param {string} resumeText - 简历文本内容
   * @param {Object} qualityResult - 质量检测结果
   * @returns {Object} 简历数据
   */
  buildResumeData(candidate, resumeText, qualityResult) {
    const keyInfo = this.extractKeyInformation(resumeText);
    
    return {
      id: Date.now() + Math.random(),
      candidateId: candidate.id,
      candidateName: candidate.name,
      candidateTitle: candidate.title,
      candidateCompany: candidate.company,
      candidateExperience: candidate.experience,
      resumeText: resumeText,
      qualityScore: qualityResult.score,
      isValid: qualityResult.isValid,
      issues: qualityResult.issues,
      suggestions: qualityResult.suggestions,
      keyInfo: keyInfo,
      collectedAt: new Date().toISOString(),
      status: 'collected' // collected, processing, stored, rejected
    };
  }

  /**
   * 获取采集的简历列表
   * @returns {Array} 简历列表
   */
  getCollectedResumes() {
    return this.collectedResumes;
  }

  /**
   * 获取有效简历列表
   * @returns {Array} 有效简历列表
   */
  getValidResumes() {
    return this.collectedResumes.filter(resume => resume.isValid);
  }

  /**
   * 获取简历统计信息
   * @returns {Object} 统计信息
   */
  getResumeStatistics() {
    const total = this.collectedResumes.length;
    const valid = this.collectedResumes.filter(r => r.isValid).length;
    const invalid = total - valid;
    const avgScore = total > 0 ? 
      this.collectedResumes.reduce((sum, r) => sum + r.qualityScore, 0) / total : 0;
    
    return {
      total,
      valid,
      invalid,
      averageScore: Math.round(avgScore * 100) / 100,
      validRate: total > 0 ? Math.round((valid / total) * 100) : 0
    };
  }

  /**
   * 清空采集的简历
   */
  clearCollectedResumes() {
    this.collectedResumes = [];
    message.success('已清空采集的简历数据');
  }

  /**
   * 设置质量阈值
   * @param {number} threshold - 质量阈值（0-100）
   */
  setQualityThreshold(threshold) {
    if (threshold >= 0 && threshold <= 100) {
      this.qualityThreshold = threshold;
      message.success(`简历质量阈值已设置为 ${threshold}`);
    } else {
      message.error('质量阈值必须在0-100之间');
    }
  }
}

// 创建单例实例
const resumeCollectionService = new ResumeCollectionService();

export default resumeCollectionService;
