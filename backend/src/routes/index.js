const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const resumeModel = require('../models/resumeModel');
const resumeParserService = require('../services/resumeParserService');
const storageDir = path.join(__dirname, '../../storage/resume_library');

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

  // 健康检查路由
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '服务运行正常' });
  });

  // Playwright功能测试路由
  app.post('/api/test/playwright', async (req, res) => {
    try {
      const { chromium } = require('playwright');
      const { url, action } = req.body;
      
      if (!url) {
        return res.status(400).json({ success: false, error: '缺少URL参数' });
      }
      
      // 启动浏览器
      const browser = await chromium.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // 导航到指定URL
      await page.goto(url, { waitUntil: 'networkidle' });
      
      // 获取页面标题
      const title = await page.title();
      
      // 关闭浏览器
      await browser.close();
      
      res.json({ 
        success: true, 
        data: {
          url,
          title,
          action: action || 'navigate',
          timestamp: new Date().toISOString(),
          message: 'Playwright测试成功'
        }
      });
      
    } catch (error) {
      console.error('Playwright测试失败:', error);
      res.status(500).json({ 
        success: false, 
        error: `Playwright测试失败: ${error.message}`,
        details: error.stack
      });
    }
  });

  // 获取下载的简历列表
  app.get('/api/resumes', async (req, res) => {
    try {
      // 首先尝试从简历库获取结构化数据
      const resumeLibraryResumes = resumeModel.getResumes();
      
      if (resumeLibraryResumes && resumeLibraryResumes.length > 0) {
        // 如果有简历库数据，返回结构化数据
        res.json({ success: true, data: resumeLibraryResumes });
      } else {
        // 如果没有简历库数据，返回文件系统中的简历文件列表
        const files = fs.readdirSync(storageDir);
        const resumes = files
          .filter(file => file.endsWith('.pdf') || file.endsWith('.doc') || file.endsWith('.docx'))
          .map(file => ({
            id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file,
            filename: file,
            size: fs.statSync(path.join(storageDir, file)).size,
            downloadTime: fs.statSync(path.join(storageDir, file)).mtime,
            source: 'file_system',
            parseStatus: 'pending',
            qualityScore: 0,
            createdAt: fs.statSync(path.join(storageDir, file)).mtime,
            updatedAt: fs.statSync(path.join(storageDir, file)).mtime
          }));
        
        res.json({ success: true, data: resumes });
      }
    } catch (error) {
      console.error('获取简历列表失败:', error);
      res.status(500).json({ success: false, error: '获取简历列表失败' });
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

  // 获取简历来源列表
  app.get('/api/resume-library/sources', (req, res) => {
    try {
      const sources = resumeModel.getResumeSources();
      res.json({ success: true, data: sources });
    } catch (error) {
      console.error('获取简历来源列表失败:', error);
      res.status(500).json({ success: false, error: '获取简历来源列表失败' });
    }
  });

  // 简历库相关路由
  app.get('/api/resume-library', async (req, res) => {
    try {
      const positionId = req.query.positionId || null;
      const source = req.query.source || null;
      const resumes = resumeModel.getResumes(positionId, source);
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
      const { source = 'manual', positionId } = req.body;
      
      // 文件上传模式
      if (req.file) {
        // 解析简历文件
        let parsedResume = {};
        let parseStatus = 'pending';
        let qualityScore = 0;
        
        try {
          if (req.file.originalname.endsWith('.pdf')) {
            parsedResume = await resumeParserService.parsePDFResume(req.file.buffer);
          } else if (req.file.originalname.endsWith('.docx')) {
            parsedResume = await resumeParserService.parseDOCXResume(req.file.buffer);
          }
          
          // 计算简历质量评分
          qualityScore = resumeParserService.calculateQualityScore(parsedResume);
          parseStatus = 'completed';
        } catch (parseError) {
          console.error('简历解析失败:', parseError);
          parseStatus = 'failed';
        }
        
        const filePath = await resumeModel.uploadResumeFile(req.file.originalname, req.file.buffer);
        
        // 添加到简历库
        const resumeData = {
          ...parsedResume,
          source,
          positionId,
          filePath,
          parseStatus,
          qualityScore
        };
        
        const resume = await resumeModel.addResume(resumeData);
        
        return res.json({
          success: true,
          data: {
            message: '文件上传成功', 
            filename: req.file.originalname,
            path: filePath,
            parsedResume: parsedResume,
            resumeId: resume.id,
            parseStatus,
            qualityScore
          }
        });
      }
      
      // 文本解析模式
      const { resumeText } = req.body;
      if (resumeText) {
        // 解析文本简历
        let parsedResume = {};
        let parseStatus = 'pending';
        let qualityScore = 0;
        
        try {
          parsedResume = await resumeParserService.parseTextResume(resumeText);
          qualityScore = resumeParserService.calculateQualityScore(parsedResume);
          parseStatus = 'completed';
        } catch (parseError) {
          console.error('简历解析失败:', parseError);
          parseStatus = 'failed';
        }
        
        // 添加到简历库
        const resumeData = {
          ...parsedResume,
          source,
          positionId,
          parseStatus,
          qualityScore
        };
        
        const resume = await resumeModel.addResume(resumeData);
        
        return res.json({
          success: true,
          data: {
            message: '文本解析成功', 
            parsedResume: parsedResume,
            resumeId: resume.id,
            parseStatus,
            qualityScore
          }
        });
      }
      
      return res.status(400).json({ success: false, error: '请选择文件或输入简历文本' });
    } catch (error) {
      console.error('上传简历失败:', error);
      res.status(500).json({ success: false, error: '上传简历失败', message: error.message });
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
  // app.use('/api/company-search', companySearchRoutes); // 暂时注释，等待companySearch模块创建
}

module.exports = {
  registerAllRoutes
};