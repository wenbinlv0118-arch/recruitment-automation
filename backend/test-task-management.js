const TaskModel = require('./src/models/taskModel');

async function createSampleTasks() {
  const taskModel = new TaskModel();

  const sampleTasks = [
    {
      title: '招聘前端开发工程师',
      position: '前端开发工程师',
      description: '负责公司产品的前端开发工作，需要熟练掌握React、Vue等框架',
      status: '进行中',
      priority: '高',
      progress: 60,
      assignee: '张经理',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天后
      candidates: [
        {
          name: '李明',
          email: 'liming@example.com',
          phone: '13800138001',
          status: '面试中',
          notes: '技术能力较强，沟通良好'
        },
        {
          name: '王芳',
          email: 'wangfang@example.com',
          phone: '13800138002',
          status: '已联系',
          notes: '有3年React开发经验'
        }
      ],
      comments: [
        {
          content: '开始筛选简历',
          author: '张经理'
        },
        {
          content: '已安排面试时间',
          author: 'HR小王'
        }
      ]
    },
    {
      title: '招聘产品经理',
      position: '产品经理',
      description: '负责产品规划和设计，需要有互联网产品经验',
      status: '进行中',
      priority: '中',
      progress: 30,
      assignee: '李总监',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14天后
      candidates: [
        {
          name: '陈强',
          email: 'chenqiang@example.com',
          phone: '13800138003',
          status: '待联系',
          notes: '有BAT工作经验'
        }
      ],
      comments: [
        {
          content: '正在收集候选人信息',
          author: '李总监'
        }
      ]
    },
    {
      title: '招聘UI设计师',
      position: 'UI设计师',
      description: '负责产品界面设计，需要良好的审美和设计能力',
      status: '已完成',
      priority: '低',
      progress: 100,
      assignee: '王主管',
      candidates: [
        {
          name: '刘美',
          email: 'liumei@example.com',
          phone: '13800138004',
          status: '已录用',
          notes: '设计风格符合公司要求'
        },
        {
          name: '赵丽',
          email: 'zhaoli@example.com',
          phone: '13800138005',
          status: '已拒绝',
          notes: '经验不足'
        }
      ],
      comments: [
        {
          content: '面试完成，准备录用',
          author: '王主管'
        },
        {
          content: '已发送录用通知',
          author: 'HR小王'
        }
      ]
    },
    {
      title: '招聘后端开发工程师',
      position: '后端开发工程师',
      description: '负责服务器端开发，需要熟悉Node.js、Python等技术',
      status: '已暂停',
      priority: '中',
      progress: 45,
      assignee: '技术总监',
      candidates: [
        {
          name: '孙伟',
          email: 'sunwei@example.com',
          phone: '13800138006',
          status: '面试中',
          notes: '技术栈匹配度高'
        }
      ],
      comments: [
        {
          content: '项目暂时搁置，招聘暂停',
          author: '技术总监'
        }
      ]
    }
  ];

  try {
    console.log('开始创建示例任务...');
    
    for (const taskData of sampleTasks) {
      const task = await taskModel.createTask(taskData);
      console.log(`创建任务成功: ${task.title}`);
    }
    
    console.log('所有示例任务创建完成！');
    
    // 显示统计信息
    const stats = await taskModel.getTaskStats();
    console.log('任务统计:', stats);
    
  } catch (error) {
    console.error('创建示例任务失败:', error);
  }
}

// 运行测试
createSampleTasks(); 