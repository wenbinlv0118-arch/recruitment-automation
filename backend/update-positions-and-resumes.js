const fs = require('fs-extra');
const path = require('path');

// 简历库文件路径
const resumeLibraryPath = path.join(__dirname, 'storage/resume_library/resumes.json');

// 岗位名称到ID的映射
const positionMapping = {
  '软件工程师': 'position_1754041357907_sweng',
  '架构师': 'position_1754041357910_arch',
  '产品经理': 'position_1754041357911_pm',
  '算法工程师': 'position_1754041357912_algo'
};

// 主函数
async function main() {
  try {
    // 读取现有简历库
    const resumeLibrary = await fs.readJson(resumeLibraryPath);
    
    // 更新每个简历，添加positionId字段
    resumeLibrary.resumes.forEach(resume => {
      // 根据position字段找到对应的positionId
      const positionId = positionMapping[resume.position];
      if (positionId) {
        resume.positionId = positionId;
      } else {
        // 如果没有找到匹配的岗位，随机分配一个
        const positionIds = Object.values(positionMapping);
        resume.positionId = positionIds[Math.floor(Math.random() * positionIds.length)];
      }
      
      // 更新updatedAt时间
      resume.updatedAt = new Date().toISOString();
    });
    
    // 保存更新后的简历库
    await fs.writeJson(resumeLibraryPath, resumeLibrary, { spaces: 2 });
    
    console.log('成功更新虚拟简历数据，为每个简历分配了positionId');
    console.log(`更新了 ${resumeLibrary.resumes.length} 份简历`);
  } catch (error) {
    console.error('操作失败:', error);
  }
}

main();