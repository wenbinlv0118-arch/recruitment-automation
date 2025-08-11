const fs = require('fs-extra');
const path = require('path');

// 简历库文件路径
const resumeLibraryPath = path.join(__dirname, 'storage/resume_library/resumes.json');

// 岗位列表
const positions = [
  '软件工程师',
  '架构师',
  '产品经理',
  '算法工程师'
];

// 技能列表
const skills = [
  'Java', 'Python', 'JavaScript', 'C++', 'C#', 'Go', 'Rust', 'Swift', 'Kotlin', 'PHP',
  'React', 'Vue', 'Angular', 'Node.js', 'Express', 'Spring Boot', 'Django', 'Flask',
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Elasticsearch',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Linux', 'Git'
];

// 教育背景
const educations = [
  '本科',
  '硕士',
  '博士'
];

// 生成随机技能
function generateRandomSkills(count = 5) {
  const shuffled = [...skills].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// 生成随机工作经验
function generateRandomExperience() {
  return Math.floor(Math.random() * 15) + 1; // 1-15年
}

// 生成随机教育背景
function generateRandomEducation() {
  return educations[Math.floor(Math.random() * educations.length)];
}

// 生成虚拟简历数据
function generateVirtualResume() {
  const position = positions[Math.floor(Math.random() * positions.length)];
  
  return {
    name: `候选人${Math.random().toString(36).substr(2, 9)}`,
    email: `${Math.random().toString(36).substr(2, 9)}@example.com`,
    phone: `1${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}`,
    position: position,
    education: generateRandomEducation(),
    experience: generateRandomExperience(),
    skills: generateRandomSkills(Math.floor(Math.random() * 8) + 3), // 3-10个技能
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// 主函数
async function main() {
  try {
    // 读取现有简历库
    const resumeLibrary = await fs.readJson(resumeLibraryPath);
    
    // 删除原有的两个简历
    resumeLibrary.resumes = [];
    
    // 新增30个虚拟简历
    for (let i = 0; i < 30; i++) {
      const resume = generateVirtualResume();
      const resumeId = `resume_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      resumeLibrary.resumes.push({
        id: resumeId,
        ...resume
      });
    }
    
    // 保存更新后的简历库
    await fs.writeJson(resumeLibraryPath, resumeLibrary, { spaces: 2 });
    
    console.log('成功新增30个虚拟简历并删除原有简历');
  } catch (error) {
    console.error('操作失败:', error);
  }
}

main();