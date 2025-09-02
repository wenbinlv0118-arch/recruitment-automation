const crypto = require('crypto');
const resumeModel = require('../models/resumeModel');

/**
 * 简历去重工具类
 * 提供基于文件内容hash和关键信息的去重功能
 */
class ResumeDeduplication {
  
  /**
   * 计算文件内容的MD5哈希值
   * @param {Buffer} fileBuffer - 文件缓冲区
   * @returns {string} MD5哈希值
   */
  static calculateFileHash(fileBuffer) {
    return crypto.createHash('md5').update(fileBuffer).digest('hex');
  }
  
  /**
   * 计算简历文本内容的哈希值
   * @param {string} text - 简历文本内容
   * @returns {string} 文本内容哈希值
   */
  static calculateTextHash(text) {
    // 标准化文本：去除空白字符、转换为小写
    const normalizedText = text.replace(/\s+/g, ' ').trim().toLowerCase();
    return crypto.createHash('md5').update(normalizedText, 'utf8').digest('hex');
  }
  
  /**
   * 生成简历关键信息指纹
   * @param {Object} resumeData - 解析后的简历数据
   * @returns {string} 关键信息指纹
   */
  static generateResumeFingerprint(resumeData) {
    const keyInfo = {
      name: resumeData.name || '',
      phone: resumeData.phone || '',
      email: resumeData.email || '',
      // 取前两个工作经历的公司名
      companies: (resumeData.workExperience || []).slice(0, 2).map(exp => exp.company || '').join('|'),
      // 教育经历的学校名
      schools: (resumeData.educationExperience || []).slice(0, 2).map(edu => edu.school || '').join('|')
    };
    
    const fingerprintString = JSON.stringify(keyInfo).toLowerCase();
    return crypto.createHash('md5').update(fingerprintString, 'utf8').digest('hex');
  }
  
  /**
   * 检查简历是否已存在（基于文件哈希）
   * @param {string} fileHash - 文件哈希值
   * @returns {Promise<Object|null>} 存在的简历记录或null
   */
  static async checkDuplicateByFileHash(fileHash) {
    try {
      const existingResumes = resumeModel.getResumes();
      return existingResumes.find(resume => resume.fileHash === fileHash) || null;
    } catch (error) {
      console.error('检查文件哈希重复失败:', error);
      return null;
    }
  }
  
  /**
   * 检查简历是否已存在（基于文本哈希）
   * @param {string} textHash - 文本哈希值
   * @returns {Promise<Object|null>} 存在的简历记录或null
   */
  static async checkDuplicateByTextHash(textHash) {
    try {
      const existingResumes = resumeModel.getResumes();
      return existingResumes.find(resume => resume.textHash === textHash) || null;
    } catch (error) {
      console.error('检查文本哈希重复失败:', error);
      return null;
    }
  }
  
  /**
   * 检查简历是否已存在（基于关键信息指纹）
   * @param {string} fingerprint - 关键信息指纹
   * @returns {Promise<Object|null>} 存在的简历记录或null
   */
  static async checkDuplicateByFingerprint(fingerprint) {
    try {
      const existingResumes = resumeModel.getResumes();
      return existingResumes.find(resume => resume.fingerprint === fingerprint) || null;
    } catch (error) {
      console.error('检查指纹重复失败:', error);
      return null;
    }
  }
  
  /**
   * 综合检查简历重复性
   * @param {Buffer} fileBuffer - 文件缓冲区
   * @param {string} extractedText - 提取的文本内容
   * @param {Object} parsedResume - 解析后的简历数据
   * @returns {Promise<Object>} 检查结果
   */
  static async checkDuplicate(fileBuffer, extractedText, parsedResume) {
    const fileHash = this.calculateFileHash(fileBuffer);
    const textHash = this.calculateTextHash(extractedText);
    const fingerprint = this.generateResumeFingerprint(parsedResume);
    
    // 按优先级检查重复
    let duplicateResume = null;
    let duplicateType = null;
    
    // 1. 首先检查文件哈希（最严格）
    duplicateResume = await this.checkDuplicateByFileHash(fileHash);
    if (duplicateResume) {
      duplicateType = 'file_hash';
    }
    
    // 2. 检查文本哈希（中等严格）
    if (!duplicateResume) {
      duplicateResume = await this.checkDuplicateByTextHash(textHash);
      if (duplicateResume) {
        duplicateType = 'text_hash';
      }
    }
    
    // 3. 检查关键信息指纹（最宽松）
    if (!duplicateResume && parsedResume.name && (parsedResume.phone || parsedResume.email)) {
      duplicateResume = await this.checkDuplicateByFingerprint(fingerprint);
      if (duplicateResume) {
        duplicateType = 'fingerprint';
      }
    }
    
    return {
      isDuplicate: !!duplicateResume,
      duplicateType,
      duplicateResume,
      hashes: {
        fileHash,
        textHash,
        fingerprint
      }
    };
  }
}

module.exports = ResumeDeduplication;