const fs = require('fs');
const path = require('path');
const resumeParserService = require('./src/services/resumeParserService');

/**
 * 测试详细简历样例的解析功能
 */
async function testSampleResumeParser() {
  try {
    console.log('=== Boss直聘简历解析测试 - 详细样例 ===\n');
    
    // 读取测试简历文件
    const resumeText = fs.readFileSync(path.join(__dirname, 'test-sample-resume.txt'), 'utf8');
    
    // 使用解析服务实例
    const parserService = resumeParserService;
    
    // 解析简历
    const result = await parserService.parseResumeText(resumeText);
    
    // 输出解析结果
    console.log('解析结果:');
    console.log('姓名:', result.name || '未识别');
    console.log('年龄:', result.age || '未识别');
    console.log('工作年限:', result.workYears || '未识别');
    console.log('学历:', result.education || '未识别');
    console.log('目前状态:', result.currentStatus || '未识别');
    console.log('电话:', result.phone || '未提供');
    console.log('邮箱:', result.email || '未提供');
    console.log('');
    
    console.log('个人简介:');
    console.log(result.summary || '未识别');
    console.log('');
    
    console.log('期望职位信息:');
    console.log('- 职位:', result.expectedPosition?.position || '未识别');
    console.log('- 地点:', result.expectedPosition?.location || '未识别');
    console.log('- 行业:', result.expectedPosition?.industry || '未识别');
    console.log('- 薪资:', result.expectedPosition?.salary || '未识别');
    console.log('');
    
    console.log('岗位经验:');
    if (result.positionExperience && result.positionExperience.length > 0) {
      result.positionExperience.forEach((exp, index) => {
        console.log(`${index + 1}. ${exp.position} - ${exp.duration}`);
      });
    } else {
      console.log('未识别到岗位经验');
    }
    console.log('');
    
    console.log('工作经历:');
    if (result.workExperience && result.workExperience.length > 0) {
      result.workExperience.forEach((work, index) => {
        console.log(`${index + 1}. ${work.company} - ${work.position}`);
        console.log(`   时间: ${work.duration}`);
        if (work.description) {
          const shortDesc = work.description.length > 100 ? 
            work.description.substring(0, 100) + '...' : work.description;
          console.log(`   描述: ${shortDesc}`);
        }
      });
    } else {
      console.log('未识别到工作经历');
    }
    console.log('');
    
    console.log('教育经历:');
    if (result.educationExperience && result.educationExperience.length > 0) {
      result.educationExperience.forEach((edu, index) => {
        console.log(`${index + 1}. ${edu.school} - ${edu.major} - ${edu.degree}`);
        console.log(`   时间: ${edu.duration}`);
      });
    } else {
      console.log('未识别到教育经历');
    }
    console.log('');
    
    console.log('资格证书:');
    if (result.certificates && result.certificates.length > 0) {
      result.certificates.forEach((cert, index) => {
        console.log(`${index + 1}. ${cert.name}${cert.date ? ` (${cert.date})` : ''}`);
        if (cert.category) {
          console.log(`   分类: ${cert.category}`);
        }
      });
    } else {
      console.log('未识别到资格证书');
    }
    console.log('');
    
    console.log('志愿经历:');
    if (result.volunteerExperience && result.volunteerExperience.length > 0) {
      result.volunteerExperience.forEach((vol, index) => {
        console.log(`${index + 1}. ${vol.organization} - ${vol.role}`);
        console.log(`   时间: ${vol.duration}`);
        if (vol.description) {
          console.log(`   描述: ${vol.description}`);
        }
      });
    } else {
      console.log('未识别到志愿经历');
    }
    console.log('');
    
    console.log('技能:');
    if (result.skills && result.skills.length > 0) {
      console.log(result.skills.join(', '));
    } else {
      console.log('未识别到技能');
    }
    console.log('');
    
    console.log('解析状态:', result.status);
    console.log('质量评分:', result.qualityScore + '/100');
    console.log('');
    
    // 详细质量评估
    console.log('=== 详细解析质量评估 ===');
    evaluateDetailedParsingResults(result);
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

/**
 * 评估详细简历解析结果的质量
 * @param {Object} result - 解析结果
 */
function evaluateDetailedParsingResults(result) {
  const checks = [
    { name: 'name', expected: '许先生Tommy', actual: result.name, check: (actual) => actual && actual.includes('许') },
    { name: 'age', expected: '36岁', actual: result.age, check: (actual) => actual && actual.includes('36') },
    { name: 'workYears', expected: '10年以上', actual: result.workYears, check: (actual) => actual && actual.includes('10年') },
    { name: 'education', expected: '本科', actual: result.education, check: (actual) => actual && actual.includes('本科') },
    { name: 'currentStatus', expected: '离职', actual: result.currentStatus, check: (actual) => actual && actual.includes('离职') },
    { name: '期望position', expected: '渠道销售', actual: result.expectedPosition?.position, check: (actual) => actual && actual.includes('渠道销售') },
    { name: '期望location', expected: '深圳', actual: result.expectedPosition?.location, check: (actual) => actual && actual.includes('深圳') },
    { name: '期望industry', expected: '行业不限', actual: result.expectedPosition?.industry, check: (actual) => actual && actual.includes('行业不限') },
    { name: '期望salary', expected: '11-22K', actual: result.expectedPosition?.salary, check: (actual) => actual && actual.includes('11-22K') },
    { name: '岗位经验', expected: 2, actual: result.positionExperience?.length, check: (actual) => actual === 2 },
    { name: '工作经历', expected: 5, actual: result.workExperience?.length, check: (actual) => actual === 5 },
    { name: '教育经历', expected: 1, actual: result.educationExperience?.length, check: (actual) => actual === 1 },
    { name: '资格证书', expected: 1, actual: result.certificates?.length, check: (actual) => actual === 1 },
    { name: '志愿经历', expected: 1, actual: result.volunteerExperience?.length, check: (actual) => actual === 1 }
  ];
  
  let correctCount = 0;
  
  checks.forEach(check => {
    const isCorrect = check.check(check.actual);
    const status = isCorrect ? '✓' : '✗';
    
    if (typeof check.expected === 'number') {
      console.log(`${status} ${check.name}: 期望 ${check.expected} 条, 实际 ${check.actual || 0} 条`);
    } else {
      console.log(`${status} ${check.name}: ${isCorrect ? '正确识别' : '识别错误'}`);
      if (!isCorrect && check.actual) {
        console.log(`   实际值: ${check.actual}`);
      }
    }
    
    if (isCorrect) correctCount++;
  });
  
  const accuracy = (correctCount / checks.length * 100).toFixed(1);
  console.log(`\n识别准确率: ${correctCount}/${checks.length} (${accuracy}%)`);
  console.log(`质量得分: ${result.qualityScore}/100`);
  
  if (accuracy >= 90) {
    console.log('🎉 解析质量优秀!');
  } else if (accuracy >= 80) {
    console.log('👍 解析质量良好!');
  } else if (accuracy >= 70) {
    console.log('⚠️ 解析质量一般，需要优化');
  } else {
    console.log('❌ 解析质量较差，需要大幅优化');
  }
}

// 运行测试
testSampleResumeParser();