/**
 * 应用预加载器
 * 在应用启动时预加载关键资源
 */
class ApplicationPreloader {
  constructor() {
    this.preloadTasks = [];
    this.preloadResults = new Map();
    this.isPreloading = false;
  }

  /**
   * 添加预加载任务
   */
  addPreloadTask(name, taskFunction, priority = 'normal') {
    this.preloadTasks.push({
      name,
      taskFunction,
      priority,
      completed: false,
      startTime: null,
      endTime: null,
      error: null
    });
  }

  /**
   * 开始预加载
   */
  async startPreloading() {
    if (this.isPreloading) {
      console.warn('⚠️ 预加载已在进行中');
      return;
    }
    
    this.isPreloading = true;
    console.log('🚀 开始应用预加载...');
    
    // 按优先级排序任务
    const sortedTasks = this.preloadTasks.sort((a, b) => {
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
    
    // 执行高优先级任务（同步）
    const highPriorityTasks = sortedTasks.filter(task => task.priority === 'high');
    for (const task of highPriorityTasks) {
      await this.executeTask(task);
    }
    
    this.isPreloading = false;
    console.log('✅ 应用预加载完成');
  }

  /**
   * 执行预加载任务
   */
  async executeTask(task) {
    task.startTime = Date.now();
    
    try {
      console.log(`🔄 执行预加载任务: ${task.name}`);
      const result = await task.taskFunction();
      
      task.endTime = Date.now();
      task.completed = true;
      
      this.preloadResults.set(task.name, result);
      
      const duration = task.endTime - task.startTime;
      console.log(`✅ 预加载任务完成: ${task.name} (${duration}ms)`);
      
    } catch (error) {
      task.endTime = Date.now();
      task.error = error;
      
      const duration = task.endTime - task.startTime;
      console.error(`❌ 预加载任务失败: ${task.name} (${duration}ms)`, error.message);
    }
  }
}

module.exports = new ApplicationPreloader();