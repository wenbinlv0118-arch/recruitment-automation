const resumeModel = require('./src/models/resumeModel');

async function createSamplePositions() {
  const samplePositions = [
    {
      name: '前端开发工程师',
      title: '前端开发工程师',
      description: '负责公司产品的前端开发工作，需要熟练掌握React、Vue等框架',
      requirements: [
        '3年以上前端开发经验',
        '熟练掌握HTML、CSS、JavaScript',
        '熟悉React、Vue等主流框架',
        '了解前端工程化和构建工具'
      ],
      salary: '15k-25k',
      department: '技术部',
      location: '北京'
    },
    {
      name: '后端开发工程师',
      title: '后端开发工程师',
      description: '负责服务器端开发，需要熟悉Node.js、Python等技术',
      requirements: [
        '3年以上后端开发经验',
        '熟练掌握Node.js或Python',
        '熟悉数据库设计和优化',
        '了解微服务架构'
      ],
      salary: '18k-30k',
      department: '技术部',
      location: '北京'
    },
    {
      name: '产品经理',
      title: '产品经理',
      description: '负责产品规划和设计，需要有互联网产品经验',
      requirements: [
        '3年以上产品经理经验',
        '熟悉产品设计流程',
        '具备良好的沟通能力',
        '有互联网产品经验优先'
      ],
      salary: '20k-35k',
      department: '产品部',
      location: '北京'
    },
    {
      name: 'UI设计师',
      title: 'UI设计师',
      description: '负责产品界面设计，需要良好的审美和设计能力',
      requirements: [
        '2年以上UI设计经验',
        '熟练掌握设计工具',
        '具备良好的审美能力',
        '了解用户体验设计'
      ],
      salary: '12k-20k',
      department: '设计部',
      location: '北京'
    },
    {
      name: '测试工程师',
      title: '测试工程师',
      description: '负责产品质量保证，需要熟悉测试流程和工具',
      requirements: [
        '2年以上测试经验',
        '熟悉测试流程和方法',
        '了解自动化测试',
        '具备良好的问题分析能力'
      ],
      salary: '10k-18k',
      department: '技术部',
      location: '北京'
    },
    {
      name: '运营专员',
      title: '运营专员',
      description: '负责产品运营和用户增长，需要具备数据分析能力',
      requirements: [
        '1年以上运营经验',
        '具备数据分析能力',
        '良好的文案写作能力',
        '了解用户增长策略'
      ],
      salary: '8k-15k',
      department: '运营部',
      location: '北京'
    }
  ];

  try {
    console.log('开始创建示例职位...');
    
    for (const positionData of samplePositions) {
      const position = await resumeModel.addPosition(positionData);
      console.log(`创建职位成功: ${position.name}`);
    }
    
    console.log('所有示例职位创建完成！');
    
    // 显示所有职位
    const positions = await resumeModel.getPositions();
    console.log('当前职位列表:', positions.map(p => p.name));
    
  } catch (error) {
    console.error('创建示例职位失败:', error);
  }
}

// 运行测试
createSamplePositions(); 