const fs = require('fs');
const path = require('path');

/**
 * 测试PDF解析功能
 */
async function testPDFParsing() {
  try {
    console.log('=== PDF解析功能测试 ===\n');
    
    // 导入简历解析服务
    const resumeParserService = require('./backend/src/services/resumeParserService');
    
    // 创建一个简单的PDF内容用于测试
    const testText = `张三
男，28岁，5年工作经验
本科学历
手机：13812345678
邮箱：zhangsan@example.com

个人简介：
熟练掌握Java、Python等编程语言，具有丰富的Web开发经验。

工作经历：
2019-2024 ABC科技有限公司 高级软件工程师
负责公司核心产品的开发和维护工作。`;
    
    console.log('测试文本内容:');
    console.log(testText);
    console.log('\n开始解析...');
    
    // 直接测试文本解析功能
    const result = resumeParserService.parseResumeText(testText);
    
    console.log('\n解析结果:');
    console.log('姓名:', result.name || '未识别');
    console.log('年龄:', result.age || '未识别');
    console.log('工作年限:', result.workYears || '未识别');
    console.log('学历:', result.education || '未识别');
    console.log('电话:', result.phone || '未识别');
    console.log('邮箱:', result.email || '未识别');
    console.log('个人简介:', result.selfIntroduction || '未识别');
    console.log('解析状态:', result.parseStatus);
    console.log('质量评分:', result.qualityScore);
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

// 运行测试
testPDFParsing();