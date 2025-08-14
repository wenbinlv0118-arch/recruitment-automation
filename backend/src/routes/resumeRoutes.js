const express = require('express');
const router = express.Router();
const ResumeParserService = require('../services/resumeParserService');
const ResumeModel = require('../models/resumeModel');

/**
 * 解析简历文本
 * POST /api/resume/parse-text
 */
router.post('/parse-text', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: '请提供简历文本'
      });
    }

    // 使用解析服务实例
    const parseResult = ResumeParserService.parseResumeText(text.trim());
    
    res.json({
      success: true,
      data: parseResult,
      message: '简历解析完成'
    });
    
  } catch (error) {
    console.error('解析简历文本失败:', error);
    res.status(500).json({
      success: false,
      message: '解析失败: ' + error.message
    });
  }
});

/**
 * 添加简历到数据库
 * POST /api/resume/add
 */
router.post('/add', async (req, res) => {
  try {
    const resumeData = req.body;
    
    // 验证必要字段
    if (!resumeData.name) {
      return res.status(400).json({
        success: false,
        message: '姓名是必填字段'
      });
    }

    // 使用简历模型实例
    const resumeModel = ResumeModel;
    
    // 准备简历数据
    const resumeToAdd = {
      name: resumeData.name,
      age: resumeData.age,
      phone: resumeData.phone,
      email: resumeData.email,
      workYears: resumeData.workYears,
      education: resumeData.education,
      currentStatus: resumeData.currentStatus,
      selfIntroduction: resumeData.selfIntroduction,
      expectedPosition: resumeData.expectedPosition,
      positionExperience: resumeData.positionExperience,
      workExperience: resumeData.workExperience,
      educationExperience: resumeData.educationExperience,
      certificates: resumeData.certificates,
      volunteerExperience: resumeData.volunteerExperience,
      skills: resumeData.skills,
      source: resumeData.source || 'boss_zhipin_text',
      parseStatus: resumeData.parseStatus || 'completed',
      qualityScore: resumeData.qualityScore || 0,
      notes: resumeData.notes || '',
      originalText: resumeData.originalText || '',
      // 兼容旧字段
      position: resumeData.expectedPosition?.position || '',
      experience: resumeData.workYears || ''
    };
    
    // 添加简历到数据库
    const result = await resumeModel.addResume(resumeToAdd);
    
    res.json({
      success: true,
      data: result,
      message: '简历添加成功'
    });
    
  } catch (error) {
    console.error('添加简历失败:', error);
    res.status(500).json({
      success: false,
      message: '添加失败: ' + error.message
    });
  }
});

/**
 * 获取简历列表
 * GET /api/resume/list
 */
router.get('/list', async (req, res) => {
  try {
    const { page = 1, pageSize = 10, source, minQualityScore } = req.query;
    
    const resumeModel = ResumeModel;
    const resumes = await resumeModel.getResumes();
    
    // 过滤条件
    let filteredResumes = resumes;
    
    if (source) {
      filteredResumes = filteredResumes.filter(resume => resume.source === source);
    }
    
    if (minQualityScore) {
      filteredResumes = filteredResumes.filter(resume => 
        resume.qualityScore >= parseInt(minQualityScore)
      );
    }
    
    // 分页
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + parseInt(pageSize);
    const paginatedResumes = filteredResumes.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        resumes: paginatedResumes,
        total: filteredResumes.length,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
    
  } catch (error) {
    console.error('获取简历列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取失败: ' + error.message
    });
  }
});

/**
 * 获取简历详情
 * GET /api/resume/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const resumeModel = ResumeModel;
    const resumes = await resumeModel.getResumes();
    
    const resume = resumes.find(r => r.id === id);
    
    if (!resume) {
      return res.status(404).json({
        success: false,
        message: '简历不存在'
      });
    }
    
    res.json({
      success: true,
      data: resume
    });
    
  } catch (error) {
    console.error('获取简历详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取失败: ' + error.message
    });
  }
});

/**
 * 删除简历
 * DELETE /api/resume/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const resumeModel = ResumeModel;
    const resumes = await resumeModel.getResumes();
    
    const resumeIndex = resumes.findIndex(r => r.id === id);
    
    if (resumeIndex === -1) {
      return res.status(404).json({
        success: false,
        message: '简历不存在'
      });
    }
    
    // 删除简历
    resumes.splice(resumeIndex, 1);
    await resumeModel.writeDatabase(resumes);
    
    res.json({
      success: true,
      message: '简历删除成功'
    });
    
  } catch (error) {
    console.error('删除简历失败:', error);
    res.status(500).json({
      success: false,
      message: '删除失败: ' + error.message
    });
  }
});

module.exports = router;