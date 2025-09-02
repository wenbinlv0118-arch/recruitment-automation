const express = require('express');
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
    const cacheKey = `tasks_${JSON.stringify(req.query)}`;
    
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
    const cacheKey = `task_${taskId}`;
    
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
    cache.del(`task_${taskId}`);
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

module.exports = router;