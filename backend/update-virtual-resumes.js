const fs = require('fs-extra');
const path = require('path');

// 简历库文件路径
const resumeLibraryPath = path.join(__dirname, 'storage/resume_library/resumes.json');

// 常见的中文姓氏
const surnames = [
  '赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈',
  '褚', '卫', '蒋', '沈', '韩', '杨', '朱', '秦', '尤', '许',
  '何', '吕', '施', '张', '孔', '曹', '严', '华', '金', '魏',
  '陶', '姜', '戚', '谢', '邹', '喻', '柏', '水', '窦', '章',
  '云', '苏', '潘', '葛', '奚', '范', '彭', '郎', '鲁', '韦',
  '昌', '马', '苗', '凤', '花', '方', '俞', '任', '袁', '柳',
  '酆', '鲍', '史', '唐', '费', '廉', '岑', '薛', '雷', '贺',
  '倪', '汤', '滕', '殷', '罗', '毕', '郝', '邬', '安', '常',
  '乐', '于', '时', '傅', '皮', '卞', '齐', '康', '伍', '余',
  '元', '卜', '顾', '孟', '平', '黄', '和', '穆', '萧', '尹'
];

// 常见的中文名字
const givenNames = [
  '伟', '芳', '娜', '敏', '静', '丽', '强', '磊', '军', '洋',
  '勇', '艳', '杰', '娟', '涛', '明', '超', '秀英', '霞', '平',
  '刚', '桂英', '林', '华', '丹', '田', '雪', '丽娟', '海', '春梅',
  '波', '玉兰', '龙', '飞', '秀兰', '磊', '建军', '静', '丽华', '凯',
  '文', '利', '晶', '国', '琴', '涛', '秀珍', '峰', '建华', '军',
  '红', '霞', '燕', '玉', '兵', '莉', '云', '洁', '梅', '浩',
  '斌', '雪梅', '鑫', '倩', '慧', '嘉', '鹏', '兰英', '旭', '莹',
  '婷', '秀梅', '宁', '蓉', '倩', '洁', '婷婷', '霞', '晶', '欢',
  '颖', '倩', '洁', '婷婷', '霞', '晶', '欢', '颖', '颖', '颖',
  '丽', '丽', '丽', '丽', '丽', '丽', '丽', '丽', '丽', '丽'
];

// 科技感头像URL列表（模拟）
const avatarUrls = [
  'https://example.com/avatar1.jpg',
  'https://example.com/avatar2.jpg',
  'https://example.com/avatar3.jpg',
  'https://example.com/avatar4.jpg',
  'https://example.com/avatar5.jpg',
  'https://example.com/avatar6.jpg',
  'https://example.com/avatar7.jpg',
  'https://example.com/avatar8.jpg',
  'https://example.com/avatar9.jpg',
  'https://example.com/avatar10.jpg'
];

// 生成随机中文姓名
function generateRandomChineseName() {
  const surname = surnames[Math.floor(Math.random() * surnames.length)];
  const givenName = givenNames[Math.floor(Math.random() * givenNames.length)];
  return surname + givenName;
}

// 生成随机头像URL
function generateRandomAvatar() {
  return avatarUrls[Math.floor(Math.random() * avatarUrls.length)];
}

// 主函数
async function main() {
  try {
    // 读取现有简历库
    const resumeLibrary = await fs.readJson(resumeLibraryPath);
    
    // 为每个简历添加头像和生成真实的中文姓名
    for (const resume of resumeLibrary.resumes) {
      // 生成真实的中文姓名
      resume.name = generateRandomChineseName();
      
      // 添加头像URL
      resume.avatar = generateRandomAvatar();
      
      // 更新时间戳
      resume.updatedAt = new Date().toISOString();
    }
    
    // 保存更新后的简历库
    await fs.writeJson(resumeLibraryPath, resumeLibrary, { spaces: 2 });
    
    console.log('成功为所有虚拟简历添加头像和生成真实的中文姓名');
  } catch (error) {
    console.error('操作失败:', error);
  }
}

main();