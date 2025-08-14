const axios = require('axios');

/**
 * 测试简历解析API
 */
async function testResumeParseAPI() {
  const testResumeText = `
张三
年龄：28岁
工作年限：5年
学历：本科
目前状态：离职

个人简介：
我是一名有着5年工作经验的解决方案经理，擅长客户需求分析、方案设计和项目管理。

期望职位：解决方案经理
期望地点：北京
期望行业：互联网
期望薪资：15k-25k/月

工作经历：
2021-03至今 北京科技有限公司 解决方案经理
负责企业级解决方案的设计和实施，管理多个大型项目。

2019-07-2021-02 上海信息技术公司 售前技术支持
负责产品演示、技术方案制定和客户技术问题解答。

教育经历：
2015-09-2019-06 北京理工大学 计算机科学与技术 本科

资格证书：
PMP项目管理专业人士认证
软件设计师证书
  `;

  try {
    console.log('🚀 开始测试简历解析API...');
    
    const response = await axios.post('http://localhost:5001/api/resume/parse-text', {
      text: testResumeText
    }, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ API调用成功!');
    console.log('响应状态:', response.status);
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('🎉 简历解析成功!');
      const parseResult = response.data.data;
      console.log('解析结果摘要:');
      console.log('- 姓名:', parseResult.name);
      console.log('- 年龄:', parseResult.age);
      console.log('- 工作年限:', parseResult.workYears);
      console.log('- 学历:', parseResult.education);
      console.log('- 质量评分:', parseResult.qualityScore);
    } else {
      console.log('❌ 简历解析失败:', response.data.message);
    }
    
  } catch (error) {
    console.error('❌ API调用失败:');
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else if (error.request) {
      console.error('请求失败，无响应:', error.message);
    } else {
      console.error('请求配置错误:', error.message);
    }
  }
}

// 运行测试
testResumeParseAPI();