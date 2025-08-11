const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const resumeModel = require('../models/resumeModel');
const resumeParserService = require('../services/resumeParserService');
const storageDir = path.join(__dirname, '../../storage/resumes');

// 文件上传配置
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * 注册所有API路由
 * @param {Object} app - Express应用实例
 */
function registerAllRoutes(app) {
  // 导入路由模块
  const knowledgeRoutes = require('./knowledge');
  const taskRoutes = require('./tasks');
  const positionRoutes = require('./positions');
  const companySearchRoutes = require('./companySearch');

  // 健康检查路由
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '服务运行正常' });
  });

  // 获取下载的简历列表
  app.get('/api/resumes', (req, res) => {
    try {
      const files = fs.readdirSync(storageDir);
      const resumes = files
        .filter(file => file.endsWith('.pdf') || file.endsWith('.doc') || file.endsWith('.docx'))
        .map(file => ({
          name: file,
          size: fs.statSync(path.join(storageDir, file)).size,
          downloadTime: fs.statSync(path.join(storageDir, file)).mtime
        }));
      
      res.json(resumes);
    } catch (error) {
      res.status(500).json({ error: '获取简历列表失败' });
    }
  });

  // 下载简历文件
  app.get('/api/resumes/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(storageDir, filename);
    
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).json({ error: '文件不存在' });
    }
  });

  // 下载简历文件（兼容旧接口）
  app.get('/api/download-resume', (req, res) => {
    const filename = req.query.filename;
    if (!filename) {
      return res.status(400).json({ error: '缺少文件名参数' });
    }
    
    const filePath = path.join(storageDir, filename);
    
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).json({ error: '文件不存在' });
    }
  });

  // 简历库相关路由
  app.get('/api/resume-library', async (req, res) => {
    try {
      const positionId = req.query.positionId || null;
      const resumes = await resumeModel.getResumes(positionId);
      res.json({ success: true, data: resumes });
    } catch (error) {
      console.error('获取简历库列表失败:', error);
      res.status(500).json({ success: false, error: '获取简历库列表失败' });
    }
  });

  app.post('/api/resume-library', async (req, res) => {
    try {
      const resumeData = req.body;
      const resume = await resumeModel.addResume(resumeData);
      res.json({ success: true, data: resume });
    } catch (error) {
      console.error('添加简历到简历库失败:', error);
      res.status(500).json({ success: false, error: '添加简历到简历库失败' });
    }
  });

  app.post('/api/resume-library/upload', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: '请选择文件' });
      }
      
      // 解析简历文件
      let parsedResume = {};
      if (req.file.originalname.endsWith('.pdf')) {
        parsedResume = await resumeParserService.parsePDFResume(req.file.buffer);
      }
      
      const filePath = await resumeModel.uploadResumeFile(req.file.originalname, req.file.buffer);
      
      res.json({
        success: true,
        data: {
          message: '文件上传成功', 
          filename: req.file.originalname,
          path: filePath,
          parsedResume: parsedResume
        }
      });
    } catch (error) {
      console.error('上传简历文件失败:', error);
      res.status(500).json({ success: false, error: '上传简历文件失败', message: error.message });
    }
  });

  app.post('/api/resume-library/:resumeId/score', async (req, res) => {
    try {
      const resumeId = req.params.resumeId;
      const { positionId, scoringCriteria } = req.body;
      
      const scoreResult = await resumeModel.scoreResume(resumeId, positionId, scoringCriteria);
      res.json({ success: true, data: scoreResult });
    } catch (error) {
      console.error('简历评分失败:', error);
      res.status(500).json({ success: false, error: '简历评分失败', message: error.message });
    }
  });

  // 注册其他路由模块
  app.use('/api/knowledge', knowledgeRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/positions', positionRoutes);
  app.use('/api/company-search', companySearchRoutes);
}

module.exports = {
  registerAllRoutes
};