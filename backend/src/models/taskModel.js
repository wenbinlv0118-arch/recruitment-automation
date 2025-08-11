const fs = require('fs-extra');
const path = require('path');

class TaskModel {
  constructor() {
    this.tasksFile = path.join(__dirname, '../../storage/tasks.json');
    this.ensureTasksFile();
    this.ensureCandidateIds();
  }

  // 确保任务文件存在
  ensureTasksFile() {
    const dir = path.dirname(this.tasksFile);
    fs.ensureDirSync(dir);
    if (!fs.existsSync(this.tasksFile)) {
      fs.writeJsonSync(this.tasksFile, []);
    }
  }

  // 获取所有任务
  async getAllTasks() {
    try {
      const tasks = await fs.readJson(this.tasksFile);
      return tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('读取任务失败:', error);
      return [];
    }
  }

  // 根据ID获取任务
  async getTaskById(id) {
    try {
      const tasks = await fs.readJson(this.tasksFile);
      return tasks.find(task => task.id === id);
    } catch (error) {
      console.error('获取任务失败:', error);
      return null;
    }
  }

  // 创建新任务
  async createTask(taskData) {
    try {
      const tasks = await fs.readJson(this.tasksFile);
      const newTask = {
        id: this.generateId(),
        ...taskData,
        status: taskData.status || '进行中',
        priority: taskData.priority || '中',
        smartRecruitment: taskData.smartRecruitment || false, // 智能寻聘开关
        recruitmentStatus: taskData.recruitmentStatus || '未开始', // 寻聘状态
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        candidates: taskData.candidates || [],
        comments: taskData.comments || [],
        progress: taskData.progress || 0,
        platforms: taskData.platforms || [] // 招聘平台列表
      };
      
      tasks.push(newTask);
      await fs.writeJson(this.tasksFile, tasks, { spaces: 2 });
      return newTask;
    } catch (error) {
      console.error('创建任务失败:', error);
      throw error;
    }
  }

  // 更新任务
  async updateTask(id, updateData) {
    try {
      const tasks = await fs.readJson(this.tasksFile);
      const taskIndex = tasks.findIndex(task => task.id === id);
      
      if (taskIndex === -1) {
        throw new Error('任务不存在');
      }

      tasks[taskIndex] = {
        ...tasks[taskIndex],
        ...updateData,
        updatedAt: new Date().toISOString()
      };

      await fs.writeJson(this.tasksFile, tasks, { spaces: 2 });
      return tasks[taskIndex];
    } catch (error) {
      console.error('更新任务失败:', error);
      throw error;
    }
  }

  // 删除任务
  async deleteTask(id) {
    try {
      const tasks = await fs.readJson(this.tasksFile);
      const filteredTasks = tasks.filter(task => task.id !== id);
      
      if (filteredTasks.length === tasks.length) {
        throw new Error('任务不存在');
      }

      await fs.writeJson(this.tasksFile, filteredTasks, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('删除任务失败:', error);
      throw error;
    }
  }

  // 批量删除任务
  async deleteTasks(ids) {
    try {
      const tasks = await fs.readJson(this.tasksFile);
      const filteredTasks = tasks.filter(task => !ids.includes(task.id));
      await fs.writeJson(this.tasksFile, filteredTasks, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('批量删除任务失败:', error);
      throw error;
    }
  }

  // 添加候选人到任务
  async addCandidateToTask(taskId, candidate) {
    try {
      const tasks = await fs.readJson(this.tasksFile);
      const taskIndex = tasks.findIndex(task => task.id === taskId);
      
      if (taskIndex === -1) {
        throw new Error('任务不存在');
      }

      const candidateWithId = {
        id: this.generateId(),
        ...candidate,
        addedAt: new Date().toISOString(),
        status: candidate.status || '待联系'
      };

      tasks[taskIndex].candidates.push(candidateWithId);
      tasks[taskIndex].updatedAt = new Date().toISOString();

      await fs.writeJson(this.tasksFile, tasks, { spaces: 2 });
      return tasks[taskIndex];
    } catch (error) {
      console.error('添加候选人失败:', error);
      throw error;
    }
  }

  // 更新候选人状态
  async updateCandidateStatus(taskId, candidateId, status) {
    try {
      const tasks = await fs.readJson(this.tasksFile);
      const taskIndex = tasks.findIndex(task => task.id === taskId);
      
      if (taskIndex === -1) {
        throw new Error(`任务不存在: ${taskId}`);
      }

      console.log(`查找候选人ID: ${candidateId}`);
      console.log(`任务中的候选人:`, tasks[taskIndex].candidates.map(c => ({ id: c.id, name: c.name })));

      const candidateIndex = tasks[taskIndex].candidates.findIndex(c => c.id === candidateId);
      if (candidateIndex === -1) {
        throw new Error(`候选人不存在: ${candidateId}`);
      }

      const oldStatus = tasks[taskIndex].candidates[candidateIndex].status;
      tasks[taskIndex].candidates[candidateIndex].status = status;
      tasks[taskIndex].updatedAt = new Date().toISOString();

      await fs.writeJson(this.tasksFile, tasks, { spaces: 2 });
      
      console.log(`候选人状态更新成功: ${oldStatus} -> ${status}`);
      return tasks[taskIndex];
    } catch (error) {
      console.error('更新候选人状态失败:', error);
      throw error;
    }
  }

  // 添加评论
  async addComment(taskId, comment) {
    try {
      const tasks = await fs.readJson(this.tasksFile);
      const taskIndex = tasks.findIndex(task => task.id === taskId);
      
      if (taskIndex === -1) {
        throw new Error('任务不存在');
      }

      const newComment = {
        id: this.generateId(),
        content: comment.content,
        author: comment.author || '系统',
        createdAt: new Date().toISOString()
      };

      tasks[taskIndex].comments.push(newComment);
      tasks[taskIndex].updatedAt = new Date().toISOString();

      await fs.writeJson(this.tasksFile, tasks, { spaces: 2 });
      return tasks[taskIndex];
    } catch (error) {
      console.error('添加评论失败:', error);
      throw error;
    }
  }

  // 获取任务统计
  async getTaskStats() {
    try {
      const tasks = await fs.readJson(this.tasksFile);
      const stats = {
        total: tasks.length,
        inProgress: tasks.filter(t => t.status === '进行中').length,
        completed: tasks.filter(t => t.status === '已完成').length,
        paused: tasks.filter(t => t.status === '已暂停').length,
        cancelled: tasks.filter(t => t.status === '已取消').length,
        highPriority: tasks.filter(t => t.priority === '高').length,
        mediumPriority: tasks.filter(t => t.priority === '中').length,
        lowPriority: tasks.filter(t => t.priority === '低').length,
        // 智能寻聘相关统计
        smartRecruitmentEnabled: tasks.filter(t => t.smartRecruitment === true).length,
        recruitmentInProgress: tasks.filter(t => t.recruitmentStatus === '进行中').length,
        recruitmentCompleted: tasks.filter(t => t.recruitmentStatus === '已完成').length,
        recruitmentPaused: tasks.filter(t => t.recruitmentStatus === '已暂停').length
      };
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

  // 确保所有候选人都有ID（用于修复现有数据）
  async ensureCandidateIds() {
    try {
      const tasks = await fs.readJson(this.tasksFile);
      let hasChanges = false;

      tasks.forEach(task => {
        if (task.candidates && Array.isArray(task.candidates)) {
          task.candidates.forEach(candidate => {
            if (!candidate.id) {
              candidate.id = this.generateId();
              hasChanges = true;
            }
          });
        }
      });

      if (hasChanges) {
        await fs.writeJson(this.tasksFile, tasks, { spaces: 2 });
        console.log('已为所有候选人添加ID');
      }
    } catch (error) {
      console.error('确保候选人ID失败:', error);
    }
  }

  // 生成唯一ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

module.exports = TaskModel; 