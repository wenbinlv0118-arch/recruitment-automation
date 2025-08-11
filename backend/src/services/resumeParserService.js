const pdfParse = require('pdf-parse');

/**
 * 简历解析服务
 * 负责从简历文件中提取候选人的重要信息
 */
class ResumeParserService {
  /**
   * 解析PDF简历文件
   * @param {Buffer} fileBuffer - PDF文件缓冲区
   * @returns {Object} 解析出的简历信息
   */
  async parsePDFResume(fileBuffer) {
    try {
      // 解析PDF内容
      const pdfData = await pdfParse(fileBuffer);
      const text = pdfData.text;
      
      // 提取简历信息
      const resumeInfo = this.extractResumeInfo(text);
      
      return resumeInfo;
    } catch (error) {
      console.error('解析PDF简历失败:', error);
      throw new Error('简历解析失败: ' + error.message);
    }
  }
  
  /**
   * 从文本中提取简历信息
   * @param {string} text - 简历文本内容
   * @returns {Object} 提取的简历信息
   */
  extractResumeInfo(text) {
    // 初始化简历信息对象
    const resumeInfo = {
      name: '',
      phone: '',
      email: '',
      education: [],
      experience: [],
      skills: []
    };
    
    // 提取姓名（通常在简历开头）
    const nameMatch = text.match(/(?:姓名|Name)[:：\s]*([\u4e00-\u9fa5a-zA-Z]{2,20})/i);
    if (nameMatch) {
      resumeInfo.name = nameMatch[1].trim();
    }
    
    // 提取电话号码
    const phoneMatch = text.match(/(?:电话|手机|Phone|Mobile)[:：\s]*(\d{11}|\d{3,4}[\s-]?\d{7,8})/i);
    if (phoneMatch) {
      resumeInfo.phone = phoneMatch[1].trim();
    }
    
    // 提取邮箱
    const emailMatch = text.match(/(?:邮箱|Email)[:：\s]*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
    if (emailMatch) {
      resumeInfo.email = emailMatch[1].trim();
    }
    
    // 提取教育背景（简化实现）
    const educationRegex = /(?:教育背景|教育经历|Education)[:：\s]*([\s\S]*?)(?=\n\n|工作经历|项目经验|技能|自我评价|$)/i;
    const educationMatch = text.match(educationRegex);
    if (educationMatch) {
      const educationText = educationMatch[1];
      // 简单提取学历信息
      const educationLevels = ['高中', '大专', '本科', '硕士', '博士'];
      for (const level of educationLevels) {
        if (educationText.includes(level)) {
          resumeInfo.education.push({
            level: level,
            institution: this.extractInstitution(educationText),
            major: this.extractMajor(educationText)
          });
        }
      }
    }
    
    // 提取工作经验（简化实现）
    const experienceRegex = /(?:工作经历|工作经验|工作背景|Experience)[:：\s]*([\s\S]*?)(?=\n\n|项目经验|教育背景|技能|自我评价|$)/i;
    const experienceMatch = text.match(experienceRegex);
    if (experienceMatch) {
      const experienceText = experienceMatch[1];
      // 简单提取工作年限
      const yearMatch = experienceText.match(/(\d+)\s*年/);
      if (yearMatch) {
        resumeInfo.experience.push({
          years: parseInt(yearMatch[1]),
          details: experienceText.substring(0, 200) // 仅提取前200字符作为示例
        });
      }
    }
    
    // 提取技能
    const skillsRegex = /(?:技能|专业技能|Skills)[:：\s]*([\s\S]*?)(?=\n\n|工作经历|项目经验|教育背景|自我评价|$)/i;
    const skillsMatch = text.match(skillsRegex);
    if (skillsMatch) {
      const skillsText = skillsMatch[1];
      // 简单提取技能关键词
      const skillKeywords = ['Java', 'Python', 'JavaScript', 'React', 'Vue', 'Node.js', 'SQL', 'MongoDB', 'Docker', 'Kubernetes'];
      const foundSkills = skillKeywords.filter(skill => 
        skillsText.toLowerCase().includes(skill.toLowerCase())
      );
      resumeInfo.skills = foundSkills;
    }
    
    return resumeInfo;
  }
  
  /**
   * 从教育背景文本中提取学校名称
   * @param {string} educationText - 教育背景文本
   * @returns {string} 学校名称
   */
  extractInstitution(educationText) {
    // 简化实现，实际应用中可能需要更复杂的逻辑
    const institutionMatch = educationText.match(/(?:学校|学院|大学)(?:[:：\s]*)([\u4e00-\u9fa5a-zA-Z\s]+)/);
    return institutionMatch ? institutionMatch[1].trim() : '';
  }
  
  /**
   * 从教育背景文本中提取专业
   * @param {string} educationText - 教育背景文本
   * @returns {string} 专业名称
   */
  extractMajor(educationText) {
    // 简化实现，实际应用中可能需要更复杂的逻辑
    const majorMatch = educationText.match(/(?:专业|主修)[:：\s]*([\u4e00-\u9fa5a-zA-Z\s]+)/);
    return majorMatch ? majorMatch[1].trim() : '';
  }
}

module.exports = new ResumeParserService();