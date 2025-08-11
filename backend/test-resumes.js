const resumeModel = require('./src/models/resumeModel');

async function createSampleResumes() {
  const sampleResumes = [
    {
      name: '张三',
      email: 'zhangsan@example.com',
      phone: '13800138001',
      position: '前端开发工程师',
      filename: '张三_前端开发工程师.pdf',
      experience: '5年',
      education: '本科',
      skills: ['React', 'Vue', 'JavaScript', 'HTML', 'CSS'],
      currentCompany: '腾讯',
      expectedSalary: '25k',
      status: '待筛选'
    },
    {
      name: '李四',
      email: 'lisi@example.com',
      phone: '13800138002',
      position: '后端开发工程师',
      filename: '李四_后端开发工程师.pdf',
      experience: '3年',
      education: '硕士',
      skills: ['Node.js', 'Python', 'MySQL', 'Redis', 'Docker'],
      currentCompany: '阿里巴巴',
      expectedSalary: '30k',
      status: '已联系'
    },
    {
      name: '王五',
      email: 'wangwu@example.com',
      phone: '13800138003',
      position: '产品经理',
      filename: '王五_产品经理.pdf',
      experience: '4年',
      education: '本科',
      skills: ['产品设计', '用户研究', '数据分析', '项目管理'],
      currentCompany: '字节跳动',
      expectedSalary: '35k',
      status: '面试中'
    },
    {
      name: '赵六',
      email: 'zhaoliu@example.com',
      phone: '13800138004',
      position: 'UI设计师',
      filename: '赵六_UI设计师.pdf',
      experience: '2年',
      education: '本科',
      skills: ['Figma', 'Sketch', 'Photoshop', 'Illustrator'],
      currentCompany: '美团',
      expectedSalary: '18k',
      status: '待筛选'
    },
    {
      name: '钱七',
      email: 'qianqi@example.com',
      phone: '13800138005',
      position: '测试工程师',
      filename: '钱七_测试工程师.pdf',
      experience: '3年',
      education: '本科',
      skills: ['自动化测试', '性能测试', '接口测试', 'Selenium'],
      currentCompany: '百度',
      expectedSalary: '20k',
      status: '已联系'
    },
    {
      name: '孙八',
      email: 'sunba@example.com',
      phone: '13800138006',
      position: '运营专员',
      filename: '孙八_运营专员.pdf',
      experience: '1年',
      education: '本科',
      skills: ['用户运营', '内容运营', '数据分析', '活动策划'],
      currentCompany: '滴滴',
      expectedSalary: '12k',
      status: '待筛选'
    },
    {
      name: '周九',
      email: 'zhoujiu@example.com',
      phone: '13800138007',
      position: '前端开发工程师',
      filename: '周九_前端开发工程师.pdf',
      experience: '2年',
      education: '本科',
      skills: ['Vue', 'TypeScript', 'Webpack', 'Git'],
      currentCompany: '京东',
      expectedSalary: '18k',
      status: '已拒绝'
    },
    {
      name: '吴十',
      email: 'wushi@example.com',
      phone: '13800138008',
      position: '后端开发工程师',
      filename: '吴十_后端开发工程师.pdf',
      experience: '6年',
      education: '硕士',
      skills: ['Java', 'Spring Boot', 'MySQL', 'Kafka', '微服务'],
      currentCompany: '华为',
      expectedSalary: '40k',
      status: '已录用'
    }
  ];

  try {
    console.log('开始创建示例简历...');
    
    for (const resumeData of sampleResumes) {
      const resume = await resumeModel.addResume(resumeData);
      console.log(`创建简历成功: ${resume.name} - ${resume.position}`);
    }
    
    console.log('所有示例简历创建完成！');
    
    // 显示所有简历
    const resumes = await resumeModel.getResumes();
    console.log('当前简历列表:', resumes.map(r => `${r.name} (${r.position})`));
    
  } catch (error) {
    console.error('创建示例简历失败:', error);
  }
}

// 运行测试
createSampleResumes(); 