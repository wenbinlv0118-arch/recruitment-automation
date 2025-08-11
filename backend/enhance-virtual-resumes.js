const fs = require('fs-extra');
const path = require('path');

// 简历库文件路径
const resumeLibraryPath = path.join(__dirname, 'storage/resume_library/resumes.json');

// 学校列表
const schools = [
  '清华大学', '北京大学', '浙江大学', '复旦大学', '上海交通大学', 
  '南京大学', '中国科学技术大学', '华中科技大学', '中山大学', '西安交通大学',
  '哈尔滨工业大学', '同济大学', '东南大学', '北京航空航天大学', '南开大学',
  '天津大学', '大连理工大学', '华南理工大学', '北京理工大学', '华东师范大学'
];

// 专业列表
const majors = [
  '计算机科学与技术', '软件工程', '信息管理与信息系统', '数据科学与大数据技术',
  '人工智能', '网络工程', '信息安全', '数字媒体技术', '物联网工程', '智能科学与技术'
];

// 公司列表
const companies = [
  '阿里巴巴', '腾讯', '百度', '字节跳动', '美团', '滴滴', '京东', '网易', '小米', '华为',
  '蚂蚁集团', '拼多多', '快手', '微博', '携程', '去哪儿', '58同城', '贝壳找房', '小红书', 'B站',
  '知乎', '豆瓣', '豆瓣', '饿了么', '盒马鲜生', '菜鸟网络', '钉钉', '飞书', '企业微信', '腾讯云'
];

// 项目名称列表
const projectNames = [
  '电商平台系统', '在线教育平台', '社交网络应用', '移动支付系统', '智能推荐引擎',
  '数据可视化平台', '微服务架构系统', '云原生应用', 'AI聊天机器人', '区块链应用',
  '物联网平台', '视频直播系统', '在线会议系统', '企业管理系统', '金融风控系统'
];

// 生成随机教育背景
function generateEducationDetails() {
  const school = schools[Math.floor(Math.random() * schools.length)];
  const major = majors[Math.floor(Math.random() * majors.length)];
  const degree = ['本科', '硕士', '博士'][Math.floor(Math.random() * 3)];
  const graduationYear = 2020 + Math.floor(Math.random() * 5);
  const gpa = (3.0 + Math.random() * 1.5).toFixed(1);
  
  return [{
    school,
    major,
    degree,
    graduationYear,
    gpa
  }];
}

// 生成随机工作经验
function generateWorkExperience(experienceYears) {
  const workExp = [];
  let remainingYears = experienceYears;
  
  while (remainingYears > 0) {
    const company = companies[Math.floor(Math.random() * companies.length)];
    const positions = ['软件工程师', '高级软件工程师', '技术专家', '架构师', '技术经理'];
    const position = positions[Math.floor(Math.random() * positions.length)];
    
    const duration = Math.min(remainingYears, Math.floor(Math.random() * 4) + 1);
    const startYear = 2024 - remainingYears;
    const endYear = startYear + duration;
    
    const startDate = `${startYear}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}`;
    const endDate = remainingYears - duration > 0 ? `${endYear}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}` : null;
    
    const descriptions = [
      '负责公司核心业务系统的设计和开发，参与技术架构决策，推动技术创新和团队技术能力提升。',
      '主导大型分布式系统的架构设计，解决高并发、高可用等技术难题，确保系统稳定运行。',
      '负责团队技术方案评审，指导初级工程师，参与产品需求分析和技术选型。',
      '参与微服务架构改造，优化系统性能，提升用户体验，降低运维成本。',
      '负责数据平台建设，设计数据模型，开发数据处理流程，支持业务数据分析需求。'
    ];
    
    const achievements = [
      '优化系统性能，响应时间提升50%，支持用户量增长300%',
      '重构核心模块，代码质量提升40%，bug率降低60%',
      '设计并实现微服务架构，系统可用性达到99.9%',
      '带领团队完成重大项目，按时交付，获得客户好评',
      '开发自动化测试框架，测试效率提升80%'
    ];
    
    workExp.push({
      company,
      position,
      startDate,
      endDate,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      achievements: [achievements[Math.floor(Math.random() * achievements.length)]]
    });
    
    remainingYears -= duration;
  }
  
  return workExp;
}

// 生成随机项目经验
function generateProjects() {
  const projectCount = Math.floor(Math.random() * 3) + 1;
  const projects = [];
  
  for (let i = 0; i < projectCount; i++) {
    const projectName = projectNames[Math.floor(Math.random() * projectNames.length)];
    const roles = ['项目负责人', '技术负责人', '核心开发', '架构师'];
    const role = roles[Math.floor(Math.random() * roles.length)];
    const period = `${Math.floor(Math.random() * 12) + 3}个月`;
    
    const descriptions = [
      '设计并实现了一个高可扩展的微服务架构系统，支持百万级用户并发访问。',
      '开发了基于机器学习的智能推荐系统，提升了用户转化率30%。',
      '构建了完整的数据分析平台，为业务决策提供了强有力的数据支持。',
      '实现了分布式缓存系统，显著提升了系统响应速度和用户体验。',
      '设计了安全可靠的支付系统，支持多种支付方式，日交易额过亿。'
    ];
    
    const technologies = [
      ['Java', 'Spring Boot', 'MySQL', 'Redis', 'Docker'],
      ['Python', 'Django', 'PostgreSQL', 'Elasticsearch', 'Kubernetes'],
      ['JavaScript', 'Node.js', 'MongoDB', 'Redis', 'AWS'],
      ['Go', 'Gin', 'MySQL', 'Redis', 'Docker'],
      ['C++', 'Qt', 'SQLite', 'Linux', 'Git']
    ];
    
    projects.push({
      name: projectName,
      role,
      period,
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      technologies: technologies[Math.floor(Math.random() * technologies.length)]
    });
  }
  
  return projects;
}

// 生成随机评分
function generateScores(resume) {
  const position = resume.position;
  let baseScore = 70;
  
  // 根据岗位调整基础分数
  switch (position) {
    case '架构师':
      baseScore = 85;
      break;
    case '算法工程师':
      baseScore = 80;
      break;
    case '产品经理':
      baseScore = 75;
      break;
    case '软件工程师':
      baseScore = 70;
      break;
  }
  
  // 根据经验调整分数
  if (resume.experience >= 8) baseScore += 10;
  else if (resume.experience >= 5) baseScore += 5;
  
  // 根据学历调整分数
  if (resume.education === '博士') baseScore += 8;
  else if (resume.education === '硕士') baseScore += 5;
  
  // 添加随机波动
  const finalScore = Math.min(100, Math.max(60, baseScore + Math.floor(Math.random() * 20) - 10));
  
  const scoreDetails = {
    education: {
      score: resume.education === '博士' ? 95 : resume.education === '硕士' ? 85 : 75,
      weight: 0.3,
      weightedScore: 0
    },
    experience: {
      score: Math.min(100, resume.experience * 8),
      weight: 0.5,
      weightedScore: 0
    },
    skills: {
      score: Math.min(100, resume.skills.length * 8),
      weight: 0.2,
      weightedScore: 0
    }
  };
  
  // 计算加权分数
  Object.values(scoreDetails).forEach(detail => {
    detail.weightedScore = detail.score * detail.weight;
  });
  
  return [{
    resumeId: resume.id,
    positionId: resume.positionId,
    score: finalScore,
    details: scoreDetails,
    createdAt: new Date().toISOString()
  }];
}

// 主函数
async function main() {
  try {
    // 读取现有简历库
    const resumeLibrary = await fs.readJson(resumeLibraryPath);
    
    // 完善每个简历
    resumeLibrary.resumes.forEach(resume => {
      // 添加详细的教育背景
      resume.educationDetails = generateEducationDetails();
      
      // 添加详细的工作经验
      resume.workExperience = generateWorkExperience(resume.experience);
      
      // 添加项目经验
      resume.projects = generateProjects();
      
      // 生成评分
      resume.scores = generateScores(resume);
      
      // 更新updatedAt时间
      resume.updatedAt = new Date().toISOString();
    });
    
    // 保存更新后的简历库
    await fs.writeJson(resumeLibraryPath, resumeLibrary, { spaces: 2 });
    
    console.log('成功完善虚拟简历数据');
    console.log(`完善了 ${resumeLibrary.resumes.length} 份简历`);
    console.log('添加了详细的教育背景、工作经验、项目经验和评分信息');
  } catch (error) {
    console.error('操作失败:', error);
  }
}

main(); 