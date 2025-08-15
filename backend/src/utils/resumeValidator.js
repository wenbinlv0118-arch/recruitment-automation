const { v4: uuidv4 } = require('uuid');
const ResumeSchema = require('../database/ResumeSchema');

/**
 * 简历数据验证和转换工具
 * 负责数据格式验证、标准化和转换
 */
class ResumeValidator {
  /**
   * 验证简历数据完整性
   * @param {Object} resumeData - 简历数据
   * @returns {Object} 验证结果
   */
  static validateResumeData(resumeData) {
    return ResumeSchema.validateResumeData(resumeData);
  }
  
  /**
   * 将旧的JSON格式转换为标准化格式
   * @param {Object} oldResumeData - 旧格式的简历数据
   * @returns {Object} 标准化后的简历数据
   */
  static convertLegacyFormat(oldResumeData) {
    const standardStructure = ResumeSchema.getStandardResumeStructure();
    
    // 解析parsedContent中的Markdown内容
    let parsedInfo = {};
    if (oldResumeData.parsedContent) {
      parsedInfo = this.parseMarkdownContent(oldResumeData.parsedContent);
    }
    
    // 基本信息映射
    standardStructure.basicInfo = {
      name: oldResumeData.name || parsedInfo.name || '',
      age: this.parseNumber(parsedInfo.age),
      gender: parsedInfo.gender || '',
      phone: parsedInfo.phone || '',
      email: parsedInfo.email || '',
      location: parsedInfo.location || '',
      workYears: this.parseNumber(oldResumeData.experience) || this.parseNumber(parsedInfo.workYears),
      education: parsedInfo.education || '',
      currentStatus: parsedInfo.currentStatus || ''
    };
    
    // 求职意向映射
    standardStructure.jobIntention = {
      expectedPosition: oldResumeData.position || parsedInfo.expectedPosition || '',
      expectedSalary: parsedInfo.expectedSalary || '',
      expectedLocation: parsedInfo.expectedLocation || '',
      workType: parsedInfo.workType || '',
      industry: parsedInfo.industry || ''
    };
    
    // 自我评价
    standardStructure.selfEvaluation = parsedInfo.selfEvaluation || '';
    
    // 工作经历
    standardStructure.workExperiences = parsedInfo.workExperiences || [];
    
    // 项目经历
    standardStructure.projectExperiences = parsedInfo.projectExperiences || [];
    
    // 教育背景
    standardStructure.educationExperiences = parsedInfo.educationExperiences || [];
    
    // 语言技能
    standardStructure.languageSkills = parsedInfo.languageSkills || [];
    
    // 技能标签
    standardStructure.skills = parsedInfo.skills || [];
    
    // 证书资质
    standardStructure.certificates = parsedInfo.certificates || [];
    
    return {
      id: oldResumeData.id || uuidv4(),
      ...standardStructure,
      rawContent: oldResumeData.originalText || '',
      parsedContent: oldResumeData.parsedContent || '',
      parseMethod: oldResumeData.parseMethod || 'llm',
      parseStatus: oldResumeData.parseStatus || 'completed',
      parseTime: oldResumeData.timestamp || new Date().toISOString(),
      qualityScore: oldResumeData.qualityScore || 0,
      completenessScore: this.calculateCompletenessScore(standardStructure),
      richnessScore: this.calculateRichnessScore(standardStructure),
      source: oldResumeData.source || 'unknown',
      status: 'active',
      notes: '',
      createdAt: oldResumeData.createdAt || new Date().toISOString(),
      updatedAt: oldResumeData.updatedAt || new Date().toISOString()
    };
  }
  
  /**
   * 解析Markdown格式的简历内容
   * @param {string} markdownContent - Markdown格式的简历内容
   * @returns {Object} 解析后的结构化数据
   */
  static parseMarkdownContent(markdownContent) {
    const result = {
      workExperiences: [],
      projectExperiences: [],
      educationExperiences: [],
      languageSkills: [],
      skills: [],
      certificates: []
    };
    
    if (!markdownContent) return result;
    
    const lines = markdownContent.split('\n');
    let currentSection = '';
    let currentItem = {};
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // 识别章节标题
      if (line.startsWith('##')) {
        currentSection = line.replace(/^#+\s*/, '').toLowerCase();
        continue;
      }
      
      // 解析基本信息
      if (currentSection.includes('基本信息') || currentSection.includes('个人信息')) {
        this.parseBasicInfoLine(line, result);
      }
      
      // 解析工作经历
      else if (currentSection.includes('工作经历') || currentSection.includes('工作经验')) {
        this.parseWorkExperienceLine(line, result, currentItem);
      }
      
      // 解析项目经历
      else if (currentSection.includes('项目经历') || currentSection.includes('项目经验')) {
        this.parseProjectExperienceLine(line, result, currentItem);
      }
      
      // 解析教育背景
      else if (currentSection.includes('教育背景') || currentSection.includes('教育经历')) {
        this.parseEducationLine(line, result, currentItem);
      }
      
      // 解析技能
      else if (currentSection.includes('技能') || currentSection.includes('专业技能')) {
        this.parseSkillsLine(line, result);
      }
    }
    
    return result;
  }
  
  /**
   * 解析基本信息行
   * @param {string} line - 文本行
   * @param {Object} result - 结果对象
   */
  static parseBasicInfoLine(line, result) {
    // 姓名
    if (line.includes('姓名') || line.includes('**姓名**')) {
      result.name = line.replace(/.*[:：]\s*/, '').replace(/\*\*/g, '');
    }
    // 年龄
    else if (line.includes('年龄')) {
      const ageMatch = line.match(/\d+/);
      result.age = ageMatch ? parseInt(ageMatch[0]) : null;
    }
    // 性别
    else if (line.includes('性别')) {
      result.gender = line.replace(/.*[:：]\s*/, '').replace(/\*\*/g, '');
    }
    // 手机
    else if (line.includes('手机') || line.includes('电话')) {
      const phoneMatch = line.match(/1[3-9]\d{9}/);
      result.phone = phoneMatch ? phoneMatch[0] : '';
    }
    // 邮箱
    else if (line.includes('邮箱') || line.includes('邮件')) {
      const emailMatch = line.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
      result.email = emailMatch ? emailMatch[0] : '';
    }
    // 工作年限
    else if (line.includes('工作年限') || line.includes('工作经验')) {
      const yearsMatch = line.match(/\d+/);
      result.workYears = yearsMatch ? parseInt(yearsMatch[0]) : null;
    }
  }
  
  /**
   * 解析工作经历行
   * @param {string} line - 文本行
   * @param {Object} result - 结果对象
   * @param {Object} currentItem - 当前项目对象
   */
  static parseWorkExperienceLine(line, result, currentItem) {
    if (line.startsWith('###') || line.startsWith('-')) {
      // 新的工作经历项
      if (Object.keys(currentItem).length > 0) {
        result.workExperiences.push({ ...currentItem });
      }
      Object.keys(currentItem).forEach(key => delete currentItem[key]);
      
      const titleLine = line.replace(/^[#\-\s]*/, '');
      const parts = titleLine.split(/[|｜]/);
      if (parts.length >= 2) {
        currentItem.position = parts[0].trim();
        currentItem.companyName = parts[1].trim();
        if (parts.length >= 3) {
          currentItem.startDate = parts[2].trim();
        }
      }
    } else if (line && currentItem.position) {
      if (!currentItem.description) currentItem.description = '';
      currentItem.description += line + '\n';
    }
  }
  
  /**
   * 解析项目经历行
   * @param {string} line - 文本行
   * @param {Object} result - 结果对象
   * @param {Object} currentItem - 当前项目对象
   */
  static parseProjectExperienceLine(line, result, currentItem) {
    if (line.startsWith('###') || line.startsWith('-')) {
      if (Object.keys(currentItem).length > 0) {
        result.projectExperiences.push({ ...currentItem });
      }
      Object.keys(currentItem).forEach(key => delete currentItem[key]);
      
      currentItem.projectName = line.replace(/^[#\-\s]*/, '');
    } else if (line && currentItem.projectName) {
      if (!currentItem.description) currentItem.description = '';
      currentItem.description += line + '\n';
    }
  }
  
  /**
   * 解析教育背景行
   * @param {string} line - 文本行
   * @param {Object} result - 结果对象
   * @param {Object} currentItem - 当前项目对象
   */
  static parseEducationLine(line, result, currentItem) {
    if (line.startsWith('###') || line.startsWith('-')) {
      if (Object.keys(currentItem).length > 0) {
        result.educationExperiences.push({ ...currentItem });
      }
      Object.keys(currentItem).forEach(key => delete currentItem[key]);
      
      const parts = line.replace(/^[#\-\s]*/, '').split(/[|｜]/);
      if (parts.length >= 2) {
        currentItem.schoolName = parts[0].trim();
        currentItem.major = parts[1].trim();
        if (parts.length >= 3) {
          currentItem.degree = parts[2].trim();
        }
      }
    }
  }
  
  /**
   * 解析技能行
   * @param {string} line - 文本行
   * @param {Object} result - 结果对象
   */
  static parseSkillsLine(line, result) {
    if (line.startsWith('-') || line.startsWith('•')) {
      const skillName = line.replace(/^[\-•\s]*/, '').trim();
      if (skillName) {
        result.skills.push({
          skillName,
          skillLevel: '',
          skillCategory: '',
          yearsOfExperience: null
        });
      }
    }
  }
  
  /**
   * 解析数字字符串为整数
   * @param {string|number} value - 要解析的值
   * @returns {number|null} 解析后的数字或null
   */
  static parseNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseInt(value);
      return isNaN(num) ? null : num;
    }
    return null;
  }
  
  /**
   * 计算简历完整度评分
   * @param {Object} resumeData - 简历数据
   * @returns {number} 完整度评分(0-100)
   */
  static calculateCompletenessScore(resumeData) {
    let score = 0;
    const weights = {
      basicInfo: 30,
      jobIntention: 20,
      workExperiences: 25,
      educationExperiences: 15,
      skills: 10
    };
    
    // 基本信息完整度
    const basicFields = ['name', 'phone', 'email'];
    const filledBasicFields = basicFields.filter(field => resumeData.basicInfo[field]);
    score += (filledBasicFields.length / basicFields.length) * weights.basicInfo;
    
    // 求职意向完整度
    if (resumeData.jobIntention.expectedPosition) score += weights.jobIntention;
    
    // 工作经历完整度
    if (resumeData.workExperiences.length > 0) score += weights.workExperiences;
    
    // 教育背景完整度
    if (resumeData.educationExperiences.length > 0) score += weights.educationExperiences;
    
    // 技能完整度
    if (resumeData.skills.length > 0) score += weights.skills;
    
    return Math.round(score);
  }
  
  /**
   * 计算简历丰富度评分
   * @param {Object} resumeData - 简历数据
   * @returns {number} 丰富度评分(0-100)
   */
  static calculateRichnessScore(resumeData) {
    let score = 0;
    
    // 工作经历数量
    score += Math.min(resumeData.workExperiences.length * 15, 45);
    
    // 项目经历数量
    score += Math.min(resumeData.projectExperiences.length * 10, 30);
    
    // 技能数量
    score += Math.min(resumeData.skills.length * 2, 20);
    
    // 其他加分项
    if (resumeData.selfEvaluation) score += 5;
    if (resumeData.languageSkills.length > 0) score += 5;
    if (resumeData.certificates.length > 0) score += 5;
    
    return Math.min(Math.round(score), 100);
  }
  
  /**
   * 清理和标准化文本
   * @param {string} text - 原始文本
   * @returns {string} 清理后的文本
   */
  static cleanText(text) {
    if (!text) return '';
    return text.trim().replace(/\s+/g, ' ').replace(/[\r\n]+/g, '\n');
  }
}

module.exports = ResumeValidator;