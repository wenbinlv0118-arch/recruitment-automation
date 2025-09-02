/**
 * 测试直接API调用上传简历功能
 * 验证新实现的uploadResumeViaAPI方法
 */

const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

/**
 * 获取内容类型
 * @param {string} filename - 文件名
 * @returns {string} 内容类型
 */
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'application/pdf';
    case '.doc':
      return 'application/msword';
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return 'application/octet-stream';
  }
}

/**
 * 测试API上传功能
 * @param {string} testFilePath - 测试文件路径
 */
async function testAPIUpload(testFilePath) {
  try {
    console.log('🚀 开始测试API上传功能...');
    console.log(`📁 测试文件: ${testFilePath}`);
    
    // 检查文件是否存在
    try {
      await fs.access(testFilePath);
      console.log('✅ 测试文件存在');
    } catch (error) {
      throw new Error(`❌ 测试文件不存在: ${testFilePath}`);
    }
    
    // 读取文件
    const fileBuffer = await fs.readFile(testFilePath);
    const fileName = path.basename(testFilePath);
    const fileSize = (fileBuffer.length / 1024).toFixed(2);
    
    console.log(`📊 文件信息:`);
    console.log(`   - 文件名: ${fileName}`);
    console.log(`   - 文件大小: ${fileSize}KB`);
    console.log(`   - 内容类型: ${getContentType(fileName)}`);
    
    // 构造FormData
    const formData = new FormData();
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: getContentType(fileName)
    });
    formData.append('source', '测试上传');
    formData.append('notes', '这是一个API功能测试');
    
    console.log('📤 开始上传到后端API...');
    
    // 调用后端API
    const startTime = Date.now();
    const response = await axios.post('http://localhost:5001/api/resume-library/upload', formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Length': formData.getLengthSync()
      },
      timeout: 60000, // 60秒超时
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    });
    
    const uploadTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (response.data && response.data.success) {
      console.log('🎉 API上传成功!');
      console.log(`⏱️  上传耗时: ${uploadTime}秒`);
      console.log('📋 上传结果:');
      console.log(`   - 简历ID: ${response.data.data.resumeId}`);
      console.log(`   - 文件名: ${response.data.data.filename}`);
      console.log(`   - 文件路径: ${response.data.data.path || 'N/A'}`);
      console.log(`   - 解析状态: ${response.data.data.parseStatus}`);
      console.log(`   - 质量评分: ${response.data.data.qualityScore || 'N/A'}`);
      console.log(`   - 消息: ${response.data.data.message}`);
      
      if (response.data.data.parsedResume) {
        console.log('📄 解析数据预览:');
        const parsed = response.data.data.parsedResume;
        console.log(`   - 姓名: ${parsed.name || 'N/A'}`);
        console.log(`   - 电话: ${parsed.phone || 'N/A'}`);
        console.log(`   - 邮箱: ${parsed.email || 'N/A'}`);
        console.log(`   - 工作经验: ${parsed.workExperience?.length || 0}条`);
        console.log(`   - 教育经历: ${parsed.education?.length || 0}条`);
        console.log(`   - 技能: ${parsed.skills?.length || 0}项`);
      }
      
      return {
        success: true,
        data: response.data.data,
        uploadTime: uploadTime
      };
    } else {
      throw new Error(response.data?.error || '服务器返回失败状态');
    }
    
  } catch (error) {
    console.error('❌ API上传测试失败:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 提示: 请确保后端服务正在运行 (npm run dev)');
    } else if (error.response) {
      console.error(`🔍 服务器响应: ${error.response.status} - ${error.response.data?.error || error.response.statusText}`);
    }
    
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 创建测试文件
 */
async function createTestFile() {
  const testDir = path.join(__dirname, 'test_files');
  const testFilePath = path.join(testDir, 'test_resume.txt');
  
  try {
    // 创建测试目录
    await fs.mkdir(testDir, { recursive: true });
    
    // 创建测试简历内容
    const testContent = `
测试简历

个人信息：
姓名：张三
电话：13800138000
邮箱：zhangsan@example.com

工作经验：
2020-2023  软件工程师  ABC科技有限公司
- 负责前端开发工作
- 使用React、Vue等技术栈
- 参与多个项目的开发和维护

教育经历：
2016-2020  计算机科学与技术  某某大学  本科

技能特长：
- JavaScript、TypeScript
- React、Vue、Node.js
- MySQL、MongoDB
- Git、Docker
`;
    
    await fs.writeFile(testFilePath, testContent, 'utf8');
    console.log(`📝 测试文件已创建: ${testFilePath}`);
    
    return testFilePath;
  } catch (error) {
    console.error('❌ 创建测试文件失败:', error.message);
    throw error;
  }
}

/**
 * 主测试函数
 */
async function runTest() {
  console.log('🧪 开始API上传功能测试\n');
  
  try {
    // 创建测试文件
    const testFilePath = await createTestFile();
    
    // 测试API上传
    const result = await testAPIUpload(testFilePath);
    
    console.log('\n📊 测试结果总结:');
    if (result.success) {
      console.log('✅ 测试通过 - API上传功能正常工作');
      console.log(`⏱️  总耗时: ${result.uploadTime}秒`);
    } else {
      console.log('❌ 测试失败 - API上传功能存在问题');
      console.log(`🔍 错误信息: ${result.error}`);
    }
    
  } catch (error) {
    console.error('❌ 测试执行失败:', error.message);
  }
}

// 运行测试
if (require.main === module) {
  runTest();
}

module.exports = {
  testAPIUpload,
  createTestFile,
  runTest
};