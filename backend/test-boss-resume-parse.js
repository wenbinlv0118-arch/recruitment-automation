const resumeParserService = require('./src/services/resumeParserService');

/**
 * 测试Boss直聘简历解析功能
 */
function testBossResumeParser() {
  // Boss直聘简历示例文本
  const bossResumeText = `
张伟 28岁 5年 本科 离职

我是一名有着5年工作经验的解决方案经理，擅长客户需求分析、方案设计和项目管理。具备良好的沟通协调能力和团队合作精神，能够在压力下高效工作。熟悉SaaS产品和企业级解决方案，有丰富的B2B销售和客户服务经验。

期望职位：解决方案经理
工作地点：北京
行业：互联网
薪资：15k-25k/月

岗位经验
解决方案经理 3年2个月
售前技术支持 1年8个月
客户经理 1年1个月

工作经历
2021-03至今 北京科技有限公司 解决方案经理
负责企业级SaaS产品的解决方案设计和客户需求分析，成功完成50+项目交付，客户满意度达95%以上。主要工作包括：需求调研、方案撰写、技术选型、项目管理等。

2019-07-2021-02 上海信息技术公司 售前技术支持
负责产品演示、技术方案制定和客户技术问题解答。参与了30+个大型项目的售前支持工作，协助销售团队完成年度目标120%。

教育经历
2015-09-2019-06 北京理工大学 计算机科学与技术 本科
主修课程包括数据结构、算法设计、数据库原理、软件工程等。在校期间担任学生会技术部部长，组织了多次技术讲座和编程竞赛。

资格证书
PMP项目管理专业人士认证 2020-05
软件设计师证书 2019-03

志愿经历
2018-06-2019-05 北京青年志愿者协会 技术培训服务
为社区老年人提供智能手机和电脑使用培训，累计服务时长200小时，帮助300+老年人掌握基本的数字技能。
  `;

  console.log('=== Boss直聘简历解析测试 ===\n');
  console.log('原始简历文本:');
  console.log(bossResumeText);
  console.log('\n' + '='.repeat(50) + '\n');

  try {
    // 解析简历
    const parseResult = resumeParserService.parseResumeText(bossResumeText);
    
    console.log('解析结果:');
    console.log('姓名:', parseResult.name);
    console.log('年龄:', parseResult.age);
    console.log('工作年限:', parseResult.workYears);
    console.log('学历:', parseResult.education);
    console.log('目前状态:', parseResult.currentStatus);
    console.log('电话:', parseResult.phone || '未提供');
    console.log('邮箱:', parseResult.email || '未提供');
    
    console.log('\n个人简介:');
    console.log(parseResult.selfIntroduction || '未识别');
    
    console.log('\n期望职位信息:');
    if (parseResult.expectedPosition) {
      console.log('- 职位:', parseResult.expectedPosition.position || '未识别');
      console.log('- 地点:', parseResult.expectedPosition.location || '未识别');
      console.log('- 行业:', parseResult.expectedPosition.industry || '未识别');
      console.log('- 薪资:', parseResult.expectedPosition.salary || '未识别');
    }
    
    console.log('\n岗位经验:');
    if (parseResult.positionExperience && parseResult.positionExperience.length > 0) {
      parseResult.positionExperience.forEach((exp, index) => {
        console.log(`${index + 1}. ${exp.position} - ${exp.duration}`);
      });
    } else {
      console.log('未识别');
    }
    
    console.log('\n工作经历:');
    if (parseResult.workExperience && parseResult.workExperience.length > 0) {
      parseResult.workExperience.forEach((work, index) => {
        console.log(`${index + 1}. ${work.company} - ${work.position}`);
        console.log(`   时间: ${work.duration}`);
        if (work.description) {
          console.log(`   描述: ${work.description.substring(0, 100)}...`);
        }
      });
    } else {
      console.log('未识别');
    }
    
    console.log('\n教育经历:');
    if (parseResult.educationExperience && parseResult.educationExperience.length > 0) {
      parseResult.educationExperience.forEach((edu, index) => {
        console.log(`${index + 1}. ${edu.school} - ${edu.major} - ${edu.degree}`);
        console.log(`   时间: ${edu.duration}`);
      });
    } else {
      console.log('未识别');
    }
    
    console.log('\n资格证书:');
    if (parseResult.certificates && parseResult.certificates.length > 0) {
      parseResult.certificates.forEach((cert, index) => {
        console.log(`${index + 1}. ${cert.name}${cert.obtainDate ? ` (${cert.obtainDate})` : ''}`);
      });
    } else {
      console.log('未识别');
    }
    
    console.log('\n志愿经历:');
    if (parseResult.volunteerExperience && parseResult.volunteerExperience.length > 0) {
      parseResult.volunteerExperience.forEach((vol, index) => {
        console.log(`${index + 1}. ${vol.organization} - ${vol.activity}`);
        console.log(`   时间: ${vol.duration}`);
      });
    } else {
      console.log('未识别');
    }
    
    console.log('\n技能:');
    if (parseResult.skills && parseResult.skills.length > 0) {
      console.log(parseResult.skills.join(', '));
    } else {
      console.log('未识别');
    }
    
    console.log('\n解析状态:', parseResult.parseStatus);
    console.log('质量评分:', parseResult.qualityScore + '/100');
    
    // 评估解析质量
    console.log('\n=== 解析质量评估 ===');
    evaluateParsingResults(parseResult);
    
  } catch (error) {
    console.error('解析失败:', error.message);
  }
}

/**
 * 评估解析结果的准确性
 */
function evaluateParsingResults(result) {
  const expectedResults = {
    name: '张伟',
    age: '28岁',
    workYears: '5年',
    education: '本科',
    currentStatus: '离职',
    expectedPosition: {
      position: '解决方案经理',
      location: '北京',
      industry: '互联网',
      salary: '15k-25k/月'
    },
    positionExperienceCount: 3,
    workExperienceCount: 2,
    educationExperienceCount: 1,
    certificatesCount: 2,
    volunteerExperienceCount: 1
  };
  
  let correctCount = 0;
  let totalCount = 0;
  
  // 检查基础信息
  const basicFields = ['name', 'age', 'workYears', 'education', 'currentStatus'];
  basicFields.forEach(field => {
    totalCount++;
    if (result[field] === expectedResults[field]) {
      correctCount++;
      console.log(`✓ ${field}: 正确识别`);
    } else {
      console.log(`✗ ${field}: 期望 "${expectedResults[field]}", 实际 "${result[field] || '未识别'}"`);;
    }
  });
  
  // 检查期望职位信息
  const positionFields = ['position', 'location', 'industry', 'salary'];
  positionFields.forEach(field => {
    totalCount++;
    const actual = result.expectedPosition?.[field];
    const expected = expectedResults.expectedPosition[field];
    if (actual === expected) {
      correctCount++;
      console.log(`✓ 期望${field}: 正确识别`);
    } else {
      console.log(`✗ 期望${field}: 期望 "${expected}", 实际 "${actual || '未识别'}"`);;
    }
  });
  
  // 检查数组字段数量
  const arrayFields = [
    { key: 'positionExperience', name: '岗位经验', expectedCount: 'positionExperienceCount' },
    { key: 'workExperience', name: '工作经历', expectedCount: 'workExperienceCount' },
    { key: 'educationExperience', name: '教育经历', expectedCount: 'educationExperienceCount' },
    { key: 'certificates', name: '资格证书', expectedCount: 'certificatesCount' },
    { key: 'volunteerExperience', name: '志愿经历', expectedCount: 'volunteerExperienceCount' }
  ];
  
  arrayFields.forEach(field => {
    totalCount++;
    const actualCount = result[field.key]?.length || 0;
    const expectedCount = expectedResults[field.expectedCount];
    if (actualCount === expectedCount) {
      correctCount++;
      console.log(`✓ ${field.name}: 正确识别 ${actualCount} 条`);
    } else {
      console.log(`✗ ${field.name}: 期望 ${expectedCount} 条, 实际 ${actualCount} 条`);
    }
  });
  
  const accuracy = ((correctCount / totalCount) * 100).toFixed(1);
  console.log(`\n识别准确率: ${correctCount}/${totalCount} (${accuracy}%)`);
  console.log(`质量得分: ${result.qualityScore}/100`);
  
  if (accuracy >= 90) {
    console.log('🎉 解析质量优秀!');
  } else if (accuracy >= 80) {
    console.log('👍 解析质量良好!');
  } else if (accuracy >= 70) {
    console.log('⚠️  解析质量一般，需要优化');
  } else {
    console.log('❌ 解析质量较差，需要大幅优化');
  }
}

// 运行测试
testBossResumeParser();