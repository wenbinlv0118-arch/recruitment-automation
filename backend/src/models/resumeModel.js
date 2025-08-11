const fs = require('fs-extra');
const path = require('path');

/**
 * 简历模型类
 * 负责简历库的管理，包括简历的存储、分类、评分等功能
 */
class ResumeModel {
  constructor() {
    // 简历库存储目录
    this.resumeStorageDir = path.join(__dirname, '../../storage/resume_library');
    // 简历数据库文件
    this.dbFile = path.join(this.resumeStorageDir, 'resumes.json');
    
    // 确保存储目录存在
    fs.ensureDirSync(this.resumeStorageDir);
    
    // 初始化数据库
    this.initDatabase();
  }
  
  /**
   * 初始化数据库
   */
  initDatabase() {
    try {
      if (!fs.existsSync(this.dbFile)) {
        // 创建初始数据库结构
        const initialData = {
          resumes: [],
          positions: [],
          categories: []
        };
        fs.writeJsonSync(this.dbFile, initialData);
      }
    } catch (error) {
      console.error('初始化简历数据库失败:', error);
    }
  }
  
  /**
   * 读取数据库
   * @returns {Object} 数据库内容
   */
  readDatabase() {
    try {
      return fs.readJsonSync(this.dbFile);
    } catch (error) {
      console.error('读取简历数据库失败:', error);
      return { resumes: [], positions: [], categories: [] };
    }
  }
  
  /**
   * 写入数据库
   * @param {Object} data - 数据库内容
   */
  writeDatabase(data) {
    try {
      fs.writeJsonSync(this.dbFile, data);
    } catch (error) {
      console.error('写入简历数据库失败:', error);
    }
  }
  
  /**
   * 添加简历到简历库
   * @param {Object} resumeData - 简历数据
   * @returns {Object} 添加的简历信息
   */
  async addResume(resumeData) {
    const db = this.readDatabase();
    
    // 生成简历ID
    const resumeId = `resume_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建简历记录
    const resumeRecord = {
      id: resumeId,
      ...resumeData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 添加到数据库
    db.resumes.push(resumeRecord);
    this.writeDatabase(db);
    
    return resumeRecord;
  }
  
  /**
   * 根据岗位对简历进行评分
   * @param {string} resumeId - 简历ID
   * @param {string} positionId - 岗位ID
   * @param {Object} scoringCriteria - 评分标准
   * @returns {Object} 评分结果
   */
  async scoreResume(resumeId, positionId, scoringCriteria) {
    const db = this.readDatabase();
    
    // 查找简历
    const resume = db.resumes.find(r => r.id === resumeId);
    if (!resume) {
      throw new Error('简历不存在');
    }
    
    // 查找岗位
    const position = db.positions.find(p => p.id === positionId);
    if (!position) {
      throw new Error('岗位不存在');
    }
    
    // 计算评分（简化实现）
    let totalScore = 0;
    let maxScore = 0;
    const scoreDetails = {};
    
    // 根据评分标准计算各项得分
    for (const [criteria, weight] of Object.entries(scoringCriteria)) {
      let score = 0;
      
      // 根据不同评分标准计算得分
      switch (criteria) {
        case 'education':
          // 学历匹配度评分
          score = this.calculateEducationScore(resume.education, position.education);
          break;
        case 'experience':
          // 工作经验评分
          score = this.calculateExperienceScore(resume.experience, position.experience);
          break;
        case 'skills':
          // 技能匹配度评分
          score = this.calculateSkillsScore(resume.skills, position.skills);
          break;
        default:
          // 其他自定义评分标准
          score = 0;
      }
      
      scoreDetails[criteria] = {
        score: score,
        weight: weight,
        weightedScore: score * weight
      };
      
      totalScore += score * weight;
      maxScore += 100 * weight;
    }
    
    // 计算总分（百分制）
    const finalScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    
    // 保存评分结果
    const scoreRecord = {
      resumeId,
      positionId,
      score: finalScore,
      details: scoreDetails,
      createdAt: new Date().toISOString()
    };
    
    // 更新简历记录
    if (!resume.scores) {
      resume.scores = [];
    }
    resume.scores.push(scoreRecord);
    resume.updatedAt = new Date().toISOString();
    
    this.writeDatabase(db);
    
    return scoreRecord;
  }
  
  /**
   * 计算学历匹配度评分
   * @param {string} resumeEducation - 简历中的学历
   * @param {string} positionEducation - 岗位要求的学历
   * @returns {number} 评分（0-100）
   */
  calculateEducationScore(resumeEducation, positionEducation) {
    const educationLevels = {
      '高中': 1,
      '大专': 2,
      '本科': 3,
      '硕士': 4,
      '博士': 5
    };
    
    const resumeLevel = educationLevels[resumeEducation] || 0;
    const positionLevel = educationLevels[positionEducation] || 0;
    
    // 如果简历学历大于等于要求学历，得满分
    if (resumeLevel >= positionLevel) {
      return 100;
    }
    
    // 否则按比例评分
    return Math.max(0, 100 - (positionLevel - resumeLevel) * 20);
  }
  
  /**
   * 计算工作经验评分
   * @param {number} resumeExperience - 简历中的工作经验（年）
   * @param {number} positionExperience - 岗位要求的工作经验（年）
   * @returns {number} 评分（0-100）
   */
  calculateExperienceScore(resumeExperience, positionExperience) {
    // 如果工作经验满足要求，得满分
    if (resumeExperience >= positionExperience) {
      return 100;
    }
    
    // 否则按比例评分
    if (positionExperience > 0) {
      return Math.max(0, Math.round((resumeExperience / positionExperience) * 100));
    }
    
    return 100;
  }
  
  /**
   * 计算技能匹配度评分
   * @param {Array} resumeSkills - 简历中的技能
   * @param {Array} positionSkills - 岗位要求的技能
   * @returns {number} 评分（0-100）
   */
  calculateSkillsScore(resumeSkills, positionSkills) {
    if (!positionSkills || positionSkills.length === 0) {
      return 100;
    }
    
    if (!resumeSkills || resumeSkills.length === 0) {
      return 0;
    }
    
    // 计算技能匹配度
    const matchedSkills = resumeSkills.filter(skill => 
      positionSkills.some(posSkill => 
        skill.toLowerCase().includes(posSkill.toLowerCase()) || 
        posSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );
    
    return Math.round((matchedSkills.length / positionSkills.length) * 100);
  }
  
  /**
   * 获取简历列表
   * @param {string} positionId - 岗位ID（可选）
   * @returns {Array} 简历列表
   */
  async getResumes(positionId = null) {
    const db = this.readDatabase();
    
    if (positionId) {
      // 返回特定岗位的简历
      return db.resumes.filter(resume => 
        resume.positionId === positionId || 
        (resume.scores && resume.scores.some(score => score.positionId === positionId))
      );
    }
    
    // 返回所有简历
    return db.resumes;
  }
  
  /**
   * 添加岗位
   * @param {Object} positionData - 岗位数据
   * @returns {Object} 添加的岗位信息
   */
  async addPosition(positionData) {
    const db = this.readDatabase();
    
    // 生成岗位ID
    const positionId = `position_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建岗位记录
    const positionRecord = {
      id: positionId,
      ...positionData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 添加到数据库
    db.positions.push(positionRecord);
    this.writeDatabase(db);
    
    return positionRecord;
  }
  
  /**
   * 获取岗位列表
   * @returns {Array} 岗位列表
   */
  async getPositions() {
    const db = this.readDatabase();
    return db.positions;
  }
  
  /**
   * 上传简历文件
   * @param {string} filename - 文件名
   * @param {Buffer} fileBuffer - 文件内容
   * @returns {string} 文件存储路径
   */
  async uploadResumeFile(filename, fileBuffer) {
    const filePath = path.join(this.resumeStorageDir, filename);
    await fs.writeFile(filePath, fileBuffer);
    return filePath;
  }
}

module.exports = new ResumeModel();