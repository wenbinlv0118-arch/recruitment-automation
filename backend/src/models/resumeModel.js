const fs = require('fs-extra');
const path = require('path');
const NodeCache = require('node-cache');

// 简历数据缓存，TTL为5分钟
const resumeCache = new NodeCache({ stdTTL: 300 });

/**
 * 简历模型类
 * 负责简历库的管理，包括简历的存储、分类、评分等功能
 */
class ResumeModel {
  constructor() {
    // 简历库存储目录（支持环境变量覆盖）
    const { storageSubdir } = require('../utils/envPaths');
    this.resumeStorageDir = storageSubdir('resume_library');
    // 简历数据库文件
    this.dbFile = path.join(this.resumeStorageDir, 'resumes.json');
    
    // 简历来源配置
    this.resumeSources = [
      { value: 'boss', label: 'Boss直聘' },
      { value: 'qcwy', label: '前程无忧' },
      { value: 'zlzp', label: '智联招聘' },
      { value: 'lagou', label: '拉勾网' },
      { value: 'liepin', label: '猎聘网' },
      { value: 'linkedin', label: 'LinkedIn' },
      { value: 'manual', label: '手动添加' }
    ];
    
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
    const cacheKey = 'resume_database';
    let cachedDb = resumeCache.get(cacheKey);
    
    if (cachedDb) {
      return cachedDb;
    }
    
    try {
      const db = fs.readJsonSync(this.dbFile);
      resumeCache.set(cacheKey, db);
      return db;
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
      // 更新缓存
      resumeCache.set('resume_database', data);
      // 清除相关缓存
      this.clearRelatedCache();
    } catch (error) {
      console.error('写入简历数据库失败:', error);
    }
  }
  
  /**
   * 清除相关缓存
   */
  clearRelatedCache() {
    const keys = resumeCache.keys();
    keys.forEach(key => {
      if (key.startsWith('resumes_') || key.startsWith('positions_')) {
        resumeCache.del(key);
      }
    });
  }
  
  /**
   * 获取简历来源列表
   * @returns {Array} 简历来源列表
   */
  getResumeSources() {
    return this.resumeSources;
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
    
    // 创建简历记录，保留原始解析数据
    const resumeRecord = {
      id: resumeId,
      
      // 直接使用解析数据，避免覆盖有效内容
      ...resumeData,
      
      // 确保必要的系统字段
      source: resumeData.source || 'manual',
      parseStatus: resumeData.parseStatus || 'pending',
      qualityScore: resumeData.qualityScore || 0,
      
      // 兼容旧字段（保留用于向后兼容）
      position: resumeData.expectedPosition?.position || resumeData.position || resumeData.name || '',
      experience: resumeData.workYears || resumeData.experience || '',
      
      // 时间戳
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 添加到数据库
    db.resumes.push(resumeRecord);
    this.writeDatabase(db);
    
    return resumeRecord;
  }
  
  /**
   * 获取简历列表
   * @param {string} positionId - 岗位ID（可选）
   * @param {string} source - 简历来源（可选）
   * @returns {Array} 简历列表
   */
  getResumes(positionId = null, source = null) {
    const db = this.readDatabase();
    let resumes = db.resumes;
    
    // 为缺少source字段的简历添加默认值
    resumes = resumes.map(resume => {
      if (!resume.source) {
        resume.source = 'manual'; // 默认来源为手动添加
      }
      return resume;
    });
    
    // 按来源筛选
    if (source) {
      resumes = resumes.filter(resume => resume.source === source);
    }
    
    // 按岗位筛选（这里简化处理，实际可能需要更复杂的关联逻辑）
    if (positionId) {
      resumes = resumes.filter(resume => resume.position === positionId);
    }
    
    // 按创建时间倒序排列
    return resumes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  
  /**
   * 上传简历文件
   * @param {string} filename - 文件名
   * @param {Buffer} buffer - 文件缓冲区
   * @returns {string} 文件路径
   */
  async uploadResumeFile(filename, buffer) {
    try {
      const filePath = path.join(this.resumeStorageDir, filename);
      await fs.writeFile(filePath, buffer);
      return filePath;
    } catch (error) {
      console.error('保存简历文件失败:', error);
      throw new Error('保存简历文件失败');
    }
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
   * @param {string} resumeExperience - 简历中的工作经验
   * @param {string} positionExperience - 岗位要求的工作经验
   * @returns {number} 评分（0-100）
   */
  calculateExperienceScore(resumeExperience, positionExperience) {
    // 提取数字部分
    const resumeExp = parseInt(resumeExperience) || 0;
    const positionExp = parseInt(positionExperience) || 0;
    
    // 如果简历经验大于等于要求经验，得满分
    if (resumeExp >= positionExp) {
      return 100;
    }
    
    // 否则按比例评分
    return Math.max(0, Math.round((resumeExp / positionExp) * 100));
  }
  
  /**
   * 计算技能匹配度评分
   * @param {Array} resumeSkills - 简历中的技能列表
   * @param {Array} positionSkills - 岗位要求的技能列表
   * @returns {number} 评分（0-100）
   */
  calculateSkillsScore(resumeSkills, positionSkills) {
    if (!resumeSkills || !positionSkills || resumeSkills.length === 0 || positionSkills.length === 0) {
      return 0;
    }
    
    // 计算匹配的技能数量
    const matchedSkills = resumeSkills.filter(skill => 
      positionSkills.some(positionSkill => 
        skill.toLowerCase().includes(positionSkill.toLowerCase()) ||
        positionSkill.toLowerCase().includes(skill.toLowerCase())
      )
    );
    
    // 计算匹配度
    const matchRatio = matchedSkills.length / positionSkills.length;
    return Math.round(matchRatio * 100);
  }

  /**
   * 获取所有岗位
   * @returns {Array} 岗位列表
   */
  getPositions() {
    try {
      const db = this.readDatabase();
      return db.positions || [];
    } catch (error) {
      console.error('获取岗位列表失败:', error);
      return [];
    }
  }

  /**
   * 添加岗位
   * @param {Object} positionData - 岗位数据
   * @returns {Object} 添加的岗位信息
   */
  async addPosition(positionData) {
    try {
      const db = this.readDatabase();
      
      // 生成岗位ID
      const positionId = `position_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 创建岗位记录
      const positionRecord = {
        id: positionId,
        title: positionData.title || '',
        company: positionData.company || '',
        experience: positionData.experience || '',
        education: positionData.education || '',
        skills: positionData.skills || [],
        salary: positionData.salary || '',
        description: positionData.description || '',
        responsibilities: positionData.responsibilities || '',
        requirements: positionData.requirements || '',
        benefits: positionData.benefits || '',
        location: positionData.location || '',
        type: positionData.type || '全职',
        status: positionData.status || '招聘中',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // 添加到数据库
      if (!db.positions) {
        db.positions = [];
      }
      db.positions.push(positionRecord);
      
      // 保存到数据库
      this.writeDatabase(db);
      
      console.log('岗位添加成功:', positionRecord.title);
      return positionRecord;
    } catch (error) {
      console.error('添加岗位失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取岗位
   * @param {string} positionId - 岗位ID
   * @returns {Object|null} 岗位信息
   */
  getPositionById(positionId) {
    try {
      const db = this.readDatabase();
      return db.positions?.find(p => p.id === positionId) || null;
    } catch (error) {
      console.error('根据ID获取岗位失败:', error);
      return null;
    }
  }

  /**
   * 更新岗位信息
   * @param {string} positionId - 岗位ID
   * @param {Object} updatedData - 更新的数据
   * @returns {Object} 更新结果
   */
  async updatePosition(positionId, updatedData) {
    try {
      const db = this.readDatabase();
      const positionIndex = db.positions.findIndex(p => p.id === positionId);
      
      if (positionIndex === -1) {
        return {
          success: false,
          error: '岗位不存在'
        };
      }

      // 更新岗位数据
      const updatedPosition = {
        ...db.positions[positionIndex],
        ...updatedData,
        updatedAt: new Date().toISOString()
      };

      db.positions[positionIndex] = updatedPosition;
      this.writeDatabase(db);

      return {
        success: true,
        position: updatedPosition,
        message: '岗位更新成功'
      };
    } catch (error) {
      console.error('更新岗位失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 删除简历
   * @param {string} resumeId - 简历ID
   * @returns {Object} 删除结果
   */
  async deleteResume(resumeId) {
    try {
      const db = this.readDatabase();
      const resumeIndex = db.resumes.findIndex(r => r.id === resumeId);
      
      if (resumeIndex === -1) {
        return {
          success: false,
          error: '简历不存在'
        };
      }

      // 删除简历
      const deletedResume = db.resumes[resumeIndex];
      db.resumes.splice(resumeIndex, 1);
      this.writeDatabase(db);

      return {
        success: true,
        resume: deletedResume,
        message: '简历删除成功'
      };
    } catch (error) {
      console.error('删除简历失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 清空所有简历
   * @returns {Object} 清空结果
   */
  async clearAllResumes() {
    try {
      const db = this.readDatabase();
      const resumeCount = db.resumes.length;
      
      // 清空简历数组
      db.resumes = [];
      this.writeDatabase(db);

      return {
        success: true,
        count: resumeCount,
        message: `成功清空 ${resumeCount} 份简历`
      };
    } catch (error) {
      console.error('清空简历失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 删除岗位
   * @param {string} positionId - 岗位ID
   * @returns {Object} 删除结果
   */
  async deletePosition(positionId) {
    try {
      const db = this.readDatabase();
      const positionIndex = db.positions.findIndex(p => p.id === positionId);
      
      if (positionIndex === -1) {
        return {
          success: false,
          error: '岗位不存在'
        };
      }

      // 检查是否有简历关联此岗位
      const hasRelatedResumes = db.resumes.some(resume => resume.positionId === positionId);
      if (hasRelatedResumes) {
        return {
          success: false,
          error: '该岗位还有关联的简历，无法删除'
        };
      }

      // 删除岗位
      const deletedPosition = db.positions[positionIndex];
      db.positions.splice(positionIndex, 1);
      this.writeDatabase(db);

      return {
        success: true,
        position: deletedPosition,
        message: '岗位删除成功'
      };
    } catch (error) {
      console.error('删除岗位失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new ResumeModel();