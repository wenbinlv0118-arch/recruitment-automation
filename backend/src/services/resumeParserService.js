const fs = require('fs-extra');
const path = require('path');

/**
 * 简历解析服务
 * 负责解析各种格式的简历文件和文本，提取关键信息
 */
class ResumeParserService {
  constructor() {
    // 支持的文件类型
    this.supportedFileTypes = ['.pdf', '.doc', '.docx'];
    
    // 正则表达式模式
    this.patterns = {
      // 手机号模式
      phone: /1[3-9]\d{9}/g,
      // 邮箱模式
      email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      // 姓名模式（常见中文姓名）
      name: /[\u4e00-\u9fa5]{2,4}(?=\s*[\u4e00-\u9fa5]*[：:])/g,
      // 学历模式
      education: /(?:学历|教育背景|毕业院校)[:：]\s*([\u4e00-\u9fa5]+)/g,
      // 工作经验模式
      experience: /(?:工作经验|工作年限|工作经历)[:：]\s*(\d+)[\u4e00-\u9fa5]*/g,
      // 技能模式
      skills: /(?:技能|专长|擅长)[:：]\s*([^\n]+)/g,
      // 职位模式
      position: /(?:应聘职位|求职意向|期望职位)[:：]\s*([\u4e00-\u9fa5\w\s]+)/g
    };
  }

  /**
   * 解析PDF简历文件
   * @param {Buffer} buffer - PDF文件缓冲区
   * @returns {Object} 解析结果
   */
  async parsePDFResume(buffer) {
    try {
      // 这里需要安装 pdf-parse 包
      // const pdfParse = require('pdf-parse');
      // const data = await pdfParse(buffer);
      // const text = data.text;
      
      // 由于pdf-parse需要额外安装，这里先用模拟数据
      const text = this.extractTextFromPDF(buffer);
      return this.parseResumeText(text);
    } catch (error) {
      console.error('PDF解析失败:', error);
      throw new Error('PDF文件解析失败');
    }
  }

  /**
   * 解析DOCX简历文件
   * @param {Buffer} buffer - DOCX文件缓冲区
   * @returns {Object} 解析结果
   */
  async parseDOCXResume(buffer) {
    try {
      // 这里需要安装 mammoth 包
      // const mammoth = require('mammoth');
      // const result = await mammoth.extractRawText({ buffer });
      // const text = result.value;
      
      // 由于mammoth需要额外安装，这里先用模拟数据
      const text = this.extractTextFromDOCX(buffer);
      return this.parseResumeText(text);
    } catch (error) {
      console.error('DOCX解析失败:', error);
      throw new Error('DOCX文件解析失败');
    }
  }

  /**
   * 解析文本简历
   * @param {string} text - 简历文本内容
   * @returns {Object} 解析结果
   */
  parseResumeText(text) {
    if (!text || typeof text !== 'string') {
      throw new Error('无效的文本内容');
    }

    const result = {
      name: this.extractName(text),
      phone: this.extractPhone(text),
      email: this.extractEmail(text),
      position: this.extractPosition(text),
      experience: this.extractExperience(text),
      education: this.extractEducation(text),
      skills: this.extractSkills(text),
      parseStatus: 'completed',
      qualityScore: this.calculateQualityScore(text)
    };

    return result;
  }

  /**
   * 提取姓名
   * @param {string} text - 文本内容
   * @returns {string} 姓名
   */
  extractName(text) {
    // 尝试多种姓名提取模式
    const patterns = [
      /(?:姓名|名字)[:：]\s*([\u4e00-\u9fa5]{2,4})/,
      /^([\u4e00-\u9fa5]{2,4})\s*[\u4e00-\u9fa5]*[：:]/m,
      /([\u4e00-\u9fa5]{2,4})\s+\d+/ // 姓名后跟数字（如年龄）
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return null;
  }

  /**
   * 提取手机号
   * @param {string} text - 文本内容
   * @returns {string} 手机号
   */
  extractPhone(text) {
    const match = text.match(this.patterns.phone);
    return match ? match[0] : null;
  }

  /**
   * 提取邮箱
   * @param {string} text - 文本内容
   * @returns {string} 邮箱
   */
  extractEmail(text) {
    const match = text.match(this.patterns.email);
    return match ? match[0] : null;
  }

  /**
   * 提取应聘职位
   * @param {string} text - 文本内容
   * @returns {string} 职位
   */
  extractPosition(text) {
    const match = text.match(this.patterns.position);
    return match ? match[1].trim() : null;
  }

  /**
   * 提取工作经验
   * @param {string} text - 文本内容
   * @returns {string} 工作经验
   */
  extractExperience(text) {
    const match = text.match(this.patterns.experience);
    if (match) {
      return `${match[1]}年`;
    }
    
    // 尝试其他经验提取模式
    const expPatterns = [
      /(\d+)[\u4e00-\u9fa5]*工作经验/,
      /工作(\d+)[\u4e00-\u9fa5]/,
      /(\d+)年经验/
    ];

    for (const pattern of expPatterns) {
      const expMatch = text.match(pattern);
      if (expMatch) {
        return `${expMatch[1]}年`;
      }
    }

    return null;
  }

  /**
   * 提取学历
   * @param {string} text - 文本内容
   * @returns {string} 学历
   */
  extractEducation(text) {
    const match = text.match(this.patterns.education);
    if (match) {
      return match[1];
    }

    // 查找常见学历关键词
    const educationKeywords = ['博士', '硕士', '本科', '大专', '高中'];
    for (const keyword of educationKeywords) {
      if (text.includes(keyword)) {
        return keyword;
      }
    }

    return null;
  }

  /**
   * 提取技能
   * @param {string} text - 文本内容
   * @returns {Array} 技能列表
   */
  extractSkills(text) {
    const match = text.match(this.patterns.skills);
    if (match) {
      // 分割技能字符串
      const skillsText = match[1];
      const skills = skillsText.split(/[,，、\s]+/).filter(skill => skill.trim());
      return skills;
    }

    // 如果没有找到技能模式，尝试从文本中提取常见技能关键词
    const commonSkills = [
      'JavaScript', 'Python', 'Java', 'C++', 'React', 'Vue', 'Angular',
      'Node.js', 'MySQL', 'MongoDB', 'Redis', 'Docker', 'Git',
      '项目管理', '团队协作', '沟通能力', '学习能力'
    ];

    const foundSkills = [];
    for (const skill of commonSkills) {
      if (text.includes(skill)) {
        foundSkills.push(skill);
      }
    }

    return foundSkills.length > 0 ? foundSkills : null;
  }

  /**
   * 计算简历质量评分
   * @param {string} text - 文本内容
   * @returns {number} 质量评分（0-100）
   */
  calculateQualityScore(text) {
    let score = 0;
    
    // 基础信息完整性评分
    if (this.extractName(text)) score += 20;
    if (this.extractPhone(text)) score += 20;
    if (this.extractEmail(text)) score += 15;
    if (this.extractPosition(text)) score += 15;
    if (this.extractExperience(text)) score += 15;
    if (this.extractEducation(text)) score += 15;
    
    // 文本长度评分
    if (text.length > 200) score += 5;
    if (text.length > 500) score += 5;
    if (text.length > 1000) score += 5;
    
    // 技能信息评分
    const skills = this.extractSkills(text);
    if (skills && skills.length > 0) {
      score += Math.min(skills.length * 2, 10);
    }
    
    return Math.min(score, 100);
  }

  /**
   * 从PDF缓冲区提取文本（模拟实现）
   * @param {Buffer} buffer - PDF文件缓冲区
   * @returns {string} 文本内容
   */
  extractTextFromPDF(buffer) {
    // 这里是模拟实现，实际应该使用pdf-parse库
    return `张三
电话：13800138000
邮箱：zhangsan@example.com
应聘职位：前端工程师
工作经验：3年
学历：本科
技能：JavaScript, React, Vue, Node.js, MySQL
教育背景：某某大学 计算机科学与技术 本科
工作经历：
2021-至今 某某公司 前端工程师
- 负责公司前端产品开发
- 使用React和Vue框架
- 参与项目架构设计`;
  }

  /**
   * 从DOCX缓冲区提取文本（模拟实现）
   * @param {Buffer} buffer - DOCX文件缓冲区
   * @returns {string} 文本内容
   */
  extractTextFromDOCX(buffer) {
    // 这里是模拟实现，实际应该使用mammoth库
    return `李四
联系电话：13900139000
电子邮箱：lisi@example.com
求职意向：后端工程师
工作年限：5年
最高学历：硕士
专业技能：Java, Spring Boot, MySQL, Redis, Docker
教育经历：某某大学 软件工程 硕士
工作经历：
2019-至今 某某科技公司 后端工程师
- 负责后端系统开发
- 使用Java和Spring Boot
- 数据库设计和优化`;
  }
}

module.exports = new ResumeParserService();