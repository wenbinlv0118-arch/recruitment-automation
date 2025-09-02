const express = require('express');
const router = express.Router();
const TaskModel = require('../models/taskModel');

const taskModel = new TaskModel();

// 获取所有任务
router.get('/', async (req, res) => {
  try {
    const { status, priority, platform, recruitmentStatus, search, page = 1, limit = 10 } = req.query;
    let tasks = await taskModel.getAllTasks();

    // 状态筛选
    if (status && status !== '全部') {
      tasks = tasks.filter(task => task.status === status);
    }

    // 优先级筛选
    if (priority && priority !== '全部') {
      tasks = tasks.filter(task => task.priority === priority);
    }

    // 招聘平台筛选
    if (platform && platform !== '全部') {
      tasks = tasks.filter(task => 
        task.platforms && task.platforms.includes(platform)
      );
    }

    // 智能寻聘状态筛选
    if (recruitmentStatus && recruitmentStatus !== '全部') {
      tasks = tasks.filter(task => task.recruitmentStatus === recruitmentStatus);
    }

    // 搜索功能
    if (search) {
      const searchLower = search.toLowerCase();
      tasks = tasks.filter(task => 
        task.title?.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower) ||
        task.position?.toLowerCase().includes(searchLower) ||
        task.platforms?.some(platform => 
          platform.toLowerCase().includes(searchLower)
        ) ||
        task.candidates?.some(c => 
          c.name?.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower)
        )
      );
    }

    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedTasks = tasks.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedTasks,
      pagination: {
        current: parseInt(page),
        pageSize: parseInt(limit),
        total: tasks.length,
        totalPages: Math.ceil(tasks.length / limit)
      }
    });
  } catch (error) {
    console.error('获取任务列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务列表失败',
      error: error.message
    });
  }
});

// 获取任务统计
router.get('/stats', async (req, res) => {
  try {
    const stats = await taskModel.getTaskStats();
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

// 根据ID获取任务
router.get('/:id', async (req, res) => {
  try {
    const task = await taskModel.getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: '任务不存在'
      });
    }
    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('获取任务详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取任务详情失败',
      error: error.message
    });
  }
});

// 创建新任务
router.post('/', async (req, res) => {
  try {
    const taskData = req.body;
    const newTask = await taskModel.createTask(taskData);
    res.status(201).json({
      success: true,
      data: newTask,
      message: '任务创建成功'
    });
  } catch (error) {
    console.error('创建任务失败:', error);
    res.status(500).json({
      success: false,
      message: '创建任务失败',
      error: error.message
    });
  }
});

// 更新任务
router.put('/:id', async (req, res) => {
  try {
    const updatedTask = await taskModel.updateTask(req.params.id, req.body);
    res.json({
      success: true,
      data: updatedTask,
      message: '任务更新成功'
    });
  } catch (error) {
    console.error('更新任务失败:', error);
    res.status(500).json({
      success: false,
      message: '更新任务失败',
      error: error.message
    });
  }
});

// 部分更新任务（用于智能寻聘状态切换）
router.patch('/:id', async (req, res) => {
  try {
    const updatedTask = await taskModel.updateTask(req.params.id, req.body);
    res.json({
      success: true,
      data: updatedTask,
      message: '任务更新成功'
    });
  } catch (error) {
    console.error('更新任务失败:', error);
    res.status(500).json({
      success: false,
      message: '更新任务失败',
      error: error.message
    });
  }
});

// 删除任务
router.delete('/:id', async (req, res) => {
  try {
    await taskModel.deleteTask(req.params.id);
    res.json({
      success: true,
      message: '任务删除成功'
    });
  } catch (error) {
    console.error('删除任务失败:', error);
    res.status(500).json({
      success: false,
      message: '删除任务失败',
      error: error.message
    });
  }
});

// 批量删除任务
router.delete('/', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({
        success: false,
        message: '请提供要删除的任务ID数组'
      });
    }
    await taskModel.deleteTasks(ids);
    res.json({
      success: true,
      message: `成功删除 ${ids.length} 个任务`
    });
  } catch (error) {
    console.error('批量删除任务失败:', error);
    res.status(500).json({
      success: false,
      message: '批量删除任务失败',
      error: error.message
    });
  }
});

// 添加候选人到任务
router.post('/:id/candidates', async (req, res) => {
  try {
    const updatedTask = await taskModel.addCandidateToTask(req.params.id, req.body);
    res.json({
      success: true,
      data: updatedTask,
      message: '候选人添加成功'
    });
  } catch (error) {
    console.error('添加候选人失败:', error);
    res.status(500).json({
      success: false,
      message: '添加候选人失败',
      error: error.message
    });
  }
});

// 更新候选人状态
router.put('/:taskId/candidates/:candidateId/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updatedTask = await taskModel.updateCandidateStatus(
      req.params.taskId,
      req.params.candidateId,
      status
    );
    res.json({
      success: true,
      data: updatedTask,
      message: '候选人状态更新成功'
    });
  } catch (error) {
    console.error('更新候选人状态失败:', error);
    res.status(500).json({
      success: false,
      message: '更新候选人状态失败',
      error: error.message
    });
  }
});

// 添加评论
router.post('/:id/comments', async (req, res) => {
  try {
    const updatedTask = await taskModel.addComment(req.params.id, req.body);
    res.json({
      success: true,
      data: updatedTask,
      message: '评论添加成功'
    });
  } catch (error) {
    console.error('添加评论失败:', error);
    res.status(500).json({
      success: false,
      message: '添加评论失败',
      error: error.message
    });
  }
});

module.exports = router; 