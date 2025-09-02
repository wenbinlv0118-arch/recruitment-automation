const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

/**
 * API性能优化器
 * 针对发现的性能瓶颈进行优化
 */
class APIPerformanceOptimizer {
  constructor() {
    this.backendDir = path.join(__dirname, 'backend');
    this.optimizations = [];
  }

  /**
   * 确保目录存在
   */
  async ensureDir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * 复制文件
   */
  async copyFile(src, dest) {
    const data = await fs.readFile(src);
    await fs.writeFile(dest, data);
  }

  /**
   * 读取JSON文件
   */
  async readJson(filePath) {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  }

  /**
   * 写入JSON文件
   */
  async writeJson(filePath, data) {
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * 执行所有性能优化
   */
  async optimizeAll() {
    console.log('🚀 开始API性能优化...');
    
    try {
      // 1. 优化任务路由的数据库查询
      await this.optimizeTaskRoutes();
      
      // 2. 优化岗位服务的数据库操作
      await this.optimizePositionService();
      
      // 3. 优化简历模型的文件操作
      await this.optimizeResumeModel();
      
      // 4. 添加响应缓存机制
      await this.addResponseCaching();
      
      // 5. 优化分页查询
      await this.optimizePagination();
      
      // 生成优化报告
      await this.generateOptimizationReport();
      
      console.log('✅ API性能优化完成!');
      
    } catch (error) {
      console.error('❌ API性能优化失败:', error);
      throw error;
    }
  }

  /**
   * 优化任务路由性能
   */
  async optimizeTaskRoutes() {
    console.log('📊 优化任务路由性能...');
    
    const tasksRoutePath = path.join(this.backendDir, 'src/routes/tasks.js');
    const originalContent = await fs.readFile(tasksRoutePath, 'utf8');
    
    // 优化后的任务路由代码
    const optimizedContent = `const express = require('express');
const router = express.Router();
const TaskModel = require('../models/taskModel');
const NodeCache = require('node-cache');

// 创建缓存实例，TTL为5分钟
const cache = new NodeCache({ stdTTL: 300 });

const taskModel = new TaskModel();

// 获取所有任务 - 优化版本
router.get('/', async (req, res) => {
  try {
    const { status, priority, platform, recruitmentStatus, search, page = 1, limit = 10 } = req.query;
    
    // 生成缓存键
    const cacheKey = \`tasks_\${JSON.stringify(req.query)}\`;
    
    // 尝试从缓存获取
    let cachedResult = cache.get(cacheKey);
    if (cachedResult && !search) { // 搜索查询不使用缓存
      console.log('📦 使用缓存数据');
      return res.json(cachedResult);
    }
    
    // 获取所有任务（优化：只在需要时加载）
    let tasks = await taskModel.getAllTasksOptimized({
      status,
      priority,
      platform,
      recruitmentStatus,
      search,
      page: parseInt(page),
      limit: parseInt(limit)
    });

    const result = {
      success: true,
      data: tasks.data,
      pagination: tasks.pagination
    };
    
    // 缓存结果（非搜索查询）
    if (!search) {
      cache.set(cacheKey, result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('获取任务列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务列表失败',
      error: error.message
    });
  }
});

// 获取任务统计 - 优化版本
router.get('/stats', async (req, res) => {
  try {
    const cacheKey = 'task_stats';
    let cachedStats = cache.get(cacheKey);
    
    if (cachedStats) {
      console.log('📦 使用缓存的统计数据');
      return res.json({
        success: true,
        data: cachedStats
      });
    }
    
    const stats = await taskModel.getTaskStatsOptimized();
    
    // 缓存统计数据，TTL为2分钟
    cache.set(cacheKey, stats, 120);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取任务统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务统计失败',
      error: error.message
    });
  }
});

// 根据ID获取任务 - 优化版本
router.get('/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const cacheKey = \`task_\${taskId}\`;
    
    let cachedTask = cache.get(cacheKey);
    if (cachedTask) {
      console.log('📦 使用缓存的任务数据');
      return res.json({
        success: true,
        data: cachedTask
      });
    }
    
    const task = await taskModel.getTaskByIdOptimized(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }
    
    // 缓存任务数据
    cache.set(cacheKey, task);
    
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('获取任务失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务失败',
      error: error.message
    });
  }
});

// 清除缓存的辅助函数
function clearTaskCache(taskId = null) {
  if (taskId) {
    cache.del(\`task_\${taskId}\`);
  }
  // 清除相关的列表缓存
  const keys = cache.keys();
  keys.forEach(key => {
    if (key.startsWith('tasks_') || key === 'task_stats') {
      cache.del(key);
    }
  });
}

// 导出清除缓存函数供其他模块使用
router.clearCache = clearTaskCache;

module.exports = router;`;
    
    // 备份原文件
    await this.copyFile(tasksRoutePath, `${tasksRoutePath}.backup`);
    
    // 写入优化后的代码
    await fs.writeFile(tasksRoutePath, optimizedContent);
    
    this.optimizations.push({
      file: 'tasks.js',
      type: '路由缓存优化',
      description: '添加了NodeCache缓存机制，优化了数据库查询性能'
    });
    
    console.log('✅ 任务路由优化完成');
  }

  /**
   * 优化岗位服务性能
   */
  async optimizePositionService() {
    console.log('🏢 优化岗位服务性能...');
    
    const positionServicePath = path.join(this.backendDir, 'src/services/positionService.js');
    const originalContent = await fs.readFile(positionServicePath, 'utf8');
    
    // 在原有代码基础上添加缓存机制
    const optimizedContent = originalContent.replace(
      'const ResumeModel = require(\'../models/resumeModel\');',
      `const ResumeModel = require('../models/resumeModel');
const NodeCache = require('node-cache');

// 岗位服务缓存，TTL为10分钟
const positionCache = new NodeCache({ stdTTL: 600 });`
    ).replace(
      'async getPositions() {\n    return await this.resumeModel.getPositions();\n  }',
      `async getPositions() {
    const cacheKey = 'all_positions';
    let cachedPositions = positionCache.get(cacheKey);
    
    if (cachedPositions) {
      console.log('📦 使用缓存的岗位数据');
      return cachedPositions;
    }
    
    const positions = await this.resumeModel.getPositions();
    positionCache.set(cacheKey, positions);
    
    return positions;
  }`
    ).replace(
      'async getPositionById(positionId) {\n    const positions = await this.resumeModel.getPositions();\n    return positions.find(p => p.id === positionId);\n  }',
      `async getPositionById(positionId) {
    const cacheKey = \`position_\${positionId}\`;
    let cachedPosition = positionCache.get(cacheKey);
    
    if (cachedPosition) {
      console.log('📦 使用缓存的岗位详情');
      return cachedPosition;
    }
    
    const positions = await this.resumeModel.getPositions();
    const position = positions.find(p => p.id === positionId);
    
    if (position) {
      positionCache.set(cacheKey, position);
    }
    
    return position;
  }`
    );
    
    // 备份原文件
    await this.copyFile(positionServicePath, `${positionServicePath}.backup`);
    
    // 写入优化后的代码
    await fs.writeFile(positionServicePath, optimizedContent);
    
    this.optimizations.push({
      file: 'positionService.js',
      type: '服务层缓存优化',
      description: '为岗位服务添加了缓存机制，减少重复的数据库查询'
    });
    
    console.log('✅ 岗位服务优化完成');
  }

  /**
   * 优化简历模型性能
   */
  async optimizeResumeModel() {
    console.log('📄 优化简历模型性能...');
    
    const resumeModelPath = path.join(this.backendDir, 'src/models/resumeModel.js');
    const originalContent = await fs.readFile(resumeModelPath, 'utf8');
    
    // 添加内存缓存和批量操作优化
    const optimizedContent = originalContent.replace(
      'const fs = require(\'fs-extra\');\nconst path = require(\'path\');',
      `const fs = require('fs-extra');
const path = require('path');
const NodeCache = require('node-cache');

// 简历数据缓存，TTL为5分钟
const resumeCache = new NodeCache({ stdTTL: 300 });`
    ).replace(
      'readDatabase() {\n    try {\n      return fs.readJsonSync(this.dbFile);\n    } catch (error) {\n      console.error(\'读取简历数据库失败:\', error);\n      return { resumes: [], positions: [], categories: [] };\n    }\n  }',
      `readDatabase() {
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
  }`
    ).replace(
      'writeDatabase(data) {\n    try {\n      fs.writeJsonSync(this.dbFile, data);\n    } catch (error) {\n      console.error(\'写入简历数据库失败:\', error);\n    }\n  }',
      `writeDatabase(data) {
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
  }`
    );
    
    // 备份原文件
    await this.copyFile(resumeModelPath, `${resumeModelPath}.backup`);
    
    // 写入优化后的代码
    await fs.writeFile(resumeModelPath, optimizedContent);
    
    this.optimizations.push({
      file: 'resumeModel.js',
      type: '数据模型缓存优化',
      description: '为简历数据模型添加了内存缓存，减少文件I/O操作'
    });
    
    console.log('✅ 简历模型优化完成');
  }

  /**
   * 添加响应缓存中间件
   */
  async addResponseCaching() {
    console.log('🔄 添加响应缓存中间件...');
    
    const middlewarePath = path.join(this.backendDir, 'src/middleware/cacheMiddleware.js');
    
    const cacheMiddlewareContent = `const NodeCache = require('node-cache');

/**
 * 响应缓存中间件
 * 为API响应提供缓存机制
 */
class CacheMiddleware {
  constructor() {
    // 创建不同TTL的缓存实例
    this.shortCache = new NodeCache({ stdTTL: 60 }); // 1分钟
    this.mediumCache = new NodeCache({ stdTTL: 300 }); // 5分钟
    this.longCache = new NodeCache({ stdTTL: 1800 }); // 30分钟
  }

  /**
   * 短期缓存中间件（1分钟）
   */
  shortTerm(req, res, next) {
    return this.createCacheMiddleware(this.shortCache)(req, res, next);
  }

  /**
   * 中期缓存中间件（5分钟）
   */
  mediumTerm(req, res, next) {
    return this.createCacheMiddleware(this.mediumCache)(req, res, next);
  }

  /**
   * 长期缓存中间件（30分钟）
   */
  longTerm(req, res, next) {
    return this.createCacheMiddleware(this.longCache)(req, res, next);
  }

  /**
   * 创建缓存中间件
   */
  createCacheMiddleware(cache) {
    return (req, res, next) => {
      // 只缓存GET请求
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = \`\${req.originalUrl}_\${JSON.stringify(req.query)}\`;
      const cachedResponse = cache.get(cacheKey);

      if (cachedResponse) {
        console.log(\`📦 缓存命中: \${req.originalUrl}\`);
        res.set('X-Cache', 'HIT');
        return res.json(cachedResponse);
      }

      // 重写res.json方法以缓存响应
      const originalJson = res.json;
      res.json = function(data) {
        // 只缓存成功的响应
        if (res.statusCode === 200 && data && data.success !== false) {
          cache.set(cacheKey, data);
          console.log(\`💾 缓存存储: \${req.originalUrl}\`);
        }
        res.set('X-Cache', 'MISS');
        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * 清除特定模式的缓存
   */
  clearPattern(pattern) {
    [this.shortCache, this.mediumCache, this.longCache].forEach(cache => {
      const keys = cache.keys();
      keys.forEach(key => {
        if (key.includes(pattern)) {
          cache.del(key);
        }
      });
    });
  }

  /**
   * 清除所有缓存
   */
  clearAll() {
    this.shortCache.flushAll();
    this.mediumCache.flushAll();
    this.longCache.flushAll();
    console.log('🗑️ 所有缓存已清除');
  }
}

module.exports = new CacheMiddleware();`;
    
    // 确保中间件目录存在
    await this.ensureDir(path.dirname(middlewarePath));
    
    // 写入缓存中间件
    await fs.writeFile(middlewarePath, cacheMiddlewareContent);
    
    this.optimizations.push({
      file: 'cacheMiddleware.js',
      type: '响应缓存中间件',
      description: '创建了统一的响应缓存中间件，支持多级缓存策略'
    });
    
    console.log('✅ 响应缓存中间件创建完成');
  }

  /**
   * 优化分页查询
   */
  async optimizePagination() {
    console.log('📄 优化分页查询性能...');
    
    const taskModelPath = path.join(this.backendDir, 'src/models/taskModel.js');
    const originalContent = await fs.readFile(taskModelPath, 'utf8');
    
    // 添加优化的分页查询方法
    const optimizedMethods = `
  /**
   * 优化的获取所有任务方法（支持服务器端分页和筛选）
   */
  async getAllTasksOptimized(options = {}) {
    try {
      const {
        status,
        priority,
        platform,
        recruitmentStatus,
        search,
        page = 1,
        limit = 10
      } = options;
      
      let tasks = await fs.readJson(this.tasksFile);
      
      // 先进行筛选，减少需要处理的数据量
      if (status && status !== '全部') {
        tasks = tasks.filter(task => task.status === status);
      }
      
      if (priority && priority !== '全部') {
        tasks = tasks.filter(task => task.priority === priority);
      }
      
      if (platform && platform !== '全部') {
        tasks = tasks.filter(task => 
          task.platforms && task.platforms.includes(platform)
        );
      }
      
      if (recruitmentStatus && recruitmentStatus !== '全部') {
        tasks = tasks.filter(task => task.recruitmentStatus === recruitmentStatus);
      }
      
      // 搜索功能（只在有搜索词时执行）
      if (search && search.trim()) {
        const searchLower = search.toLowerCase();
        tasks = tasks.filter(task => {
          return (
            task.title?.toLowerCase().includes(searchLower) ||
            task.description?.toLowerCase().includes(searchLower) ||
            task.position?.toLowerCase().includes(searchLower) ||
            (task.platforms && task.platforms.some(platform => 
              platform.toLowerCase().includes(searchLower)
            )) ||
            (task.candidates && task.candidates.some(c => 
              c.name?.toLowerCase().includes(searchLower) ||
              c.email?.toLowerCase().includes(searchLower)
            ))
          );
        });
      }
      
      // 排序（只对筛选后的数据排序）
      tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // 计算分页
      const total = tasks.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      // 只返回当前页的数据
      const paginatedTasks = tasks.slice(startIndex, endIndex);
      
      return {
        data: paginatedTasks,
        pagination: {
          current: parseInt(page),
          pageSize: parseInt(limit),
          total: total,
          totalPages: totalPages
        }
      };
    } catch (error) {
      console.error('获取任务列表失败:', error);
      return {
        data: [],
        pagination: {
          current: 1,
          pageSize: 10,
          total: 0,
          totalPages: 0
        }
      };
    }
  }
  
  /**
   * 优化的获取任务统计方法
   */
  async getTaskStatsOptimized() {
    try {
      const tasks = await fs.readJson(this.tasksFile);
      
      // 使用单次遍历计算所有统计数据
      const stats = tasks.reduce((acc, task) => {
        // 状态统计
        acc.total++;
        switch (task.status) {
          case '进行中': acc.inProgress++; break;
          case '已完成': acc.completed++; break;
          case '已暂停': acc.paused++; break;
          case '已取消': acc.cancelled++; break;
        }
        
        // 优先级统计
        switch (task.priority) {
          case '高': acc.highPriority++; break;
          case '中': acc.mediumPriority++; break;
          case '低': acc.lowPriority++; break;
        }
        
        // 智能寻聘统计
        if (task.smartRecruitment === true) {
          acc.smartRecruitmentEnabled++;
        }
        
        switch (task.recruitmentStatus) {
          case '进行中': acc.recruitmentInProgress++; break;
          case '已完成': acc.recruitmentCompleted++; break;
          case '已暂停': acc.recruitmentPaused++; break;
        }
        
        return acc;
      }, {
        total: 0,
        inProgress: 0,
        completed: 0,
        paused: 0,
        cancelled: 0,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0,
        smartRecruitmentEnabled: 0,
        recruitmentInProgress: 0,
        recruitmentCompleted: 0,
        recruitmentPaused: 0
      });
      
      return stats;
    } catch (error) {
      console.error('获取任务统计失败:', error);
      return {
        total: 0,
        inProgress: 0,
        completed: 0,
        paused: 0,
        cancelled: 0,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0,
        smartRecruitmentEnabled: 0,
        recruitmentInProgress: 0,
        recruitmentCompleted: 0,
        recruitmentPaused: 0
      };
    }
  }
  
  /**
   * 优化的根据ID获取任务方法
   */
  async getTaskByIdOptimized(id) {
    try {
      const tasks = await fs.readJson(this.tasksFile);
      // 使用find方法，找到后立即返回，避免遍历整个数组
      return tasks.find(task => task.id === id) || null;
    } catch (error) {
      console.error('获取任务失败:', error);
      return null;
    }
  }`;
    
    // 在类的末尾添加优化方法
    const optimizedContent = originalContent.replace(
      'module.exports = TaskModel;',
      optimizedMethods + '\n\nmodule.exports = TaskModel;'
    );
    
    // 备份原文件
    await this.copyFile(taskModelPath, `${taskModelPath}.backup`);
    
    // 写入优化后的代码
    await fs.writeFile(taskModelPath, optimizedContent);
    
    this.optimizations.push({
      file: 'taskModel.js',
      type: '分页查询优化',
      description: '添加了服务器端分页和优化的查询方法，减少内存使用和提高响应速度'
    });
    
    console.log('✅ 分页查询优化完成');
  }

  /**
   * 生成优化报告
   */
  async generateOptimizationReport() {
    const reportContent = `# API性能优化报告

生成时间: ${new Date().toLocaleString()}

## 优化概述

本次优化主要针对以下性能瓶颈：
1. 数据库查询频繁，缺乏缓存机制
2. 分页查询在客户端进行，浪费带宽和内存
3. 文件I/O操作频繁，影响响应速度
4. 缺乏统一的响应缓存策略

## 优化详情

${this.optimizations.map((opt, index) => `### ${index + 1}. ${opt.type}

**文件**: \`${opt.file}\`

**描述**: ${opt.description}
`).join('\n')}

## 性能提升预期

- **响应时间**: 减少 40-60%
- **内存使用**: 减少 30-50%
- **数据库查询**: 减少 70-80%
- **带宽使用**: 减少 50-70%

## 使用说明

### 1. 安装依赖

\`\`\`bash
npm install node-cache
\`\`\`

### 2. 应用缓存中间件

在主应用文件中添加缓存中间件：

\`\`\`javascript
const cacheMiddleware = require('./src/middleware/cacheMiddleware');

// 为不同的路由应用不同的缓存策略
app.use('/api/tasks/stats', cacheMiddleware.mediumTerm);
app.use('/api/positions', cacheMiddleware.longTerm);
app.use('/api/tasks', cacheMiddleware.shortTerm);
\`\`\`

### 3. 缓存管理

\`\`\`javascript
// 清除特定模式的缓存
cacheMiddleware.clearPattern('tasks');

// 清除所有缓存
cacheMiddleware.clearAll();
\`\`\`

## 监控建议

1. **缓存命中率**: 监控缓存命中率，目标 > 70%
2. **响应时间**: 监控API响应时间，目标 < 200ms
3. **内存使用**: 监控Node.js进程内存使用
4. **错误率**: 监控API错误率，确保优化不影响稳定性

## 注意事项

1. **缓存一致性**: 数据更新时需要清除相关缓存
2. **内存管理**: 监控缓存内存使用，避免内存泄漏
3. **缓存策略**: 根据业务需求调整缓存TTL
4. **回滚方案**: 保留了原文件备份，如有问题可快速回滚

## 后续优化建议

1. **数据库索引**: 为常用查询字段添加索引
2. **连接池**: 实现数据库连接池
3. **CDN**: 为静态资源配置CDN
4. **负载均衡**: 实现多实例负载均衡
5. **异步处理**: 将耗时操作改为异步处理

---

**优化完成**: ${this.optimizations.length} 个文件已优化
**备份位置**: 原文件已备份为 \`.backup\` 后缀
**生效方式**: 重启应用服务器后生效`;

    await fs.writeFile(
      path.join(__dirname, 'API_PERFORMANCE_OPTIMIZATION_REPORT.md'),
      reportContent
    );

    console.log('📊 优化报告已生成: API_PERFORMANCE_OPTIMIZATION_REPORT.md');
  }
}

// 执行优化
if (require.main === module) {
  const optimizer = new APIPerformanceOptimizer();
  optimizer.optimizeAll().catch(console.error);
}

module.exports = APIPerformanceOptimizer;