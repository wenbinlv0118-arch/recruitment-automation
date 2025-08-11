const axios = require('axios');

// 简单测试API调用
async function testSimpleAPI() {
  try {
    console.log('🧪 开始简单API测试...\n');

    // 测试岗位创建API
    console.log('📋 测试岗位创建API...');
    const response = await axios.post('http://localhost:3001/api/positions/create-from-dialog', {
      userMessage: '我想创建一个前端开发工程师岗位，部门是技术部，工作地点在北京，薪资范围15K-25K'
    });

    console.log('📊 响应状态:', response.status);
    console.log('📊 响应数据:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('✅ API调用成功');
    } else {
      console.log('❌ API调用失败:', response.data.error);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testSimpleAPI();
