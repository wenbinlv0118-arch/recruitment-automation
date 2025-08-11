const fetch = require('node-fetch');

async function testSmartRecruitmentAPI() {
  try {
    console.log('测试智能寻聘API...');
    
    // 1. 获取任务列表
    console.log('\n1. 获取任务列表...');
    const tasksResponse = await fetch('http://localhost:5001/api/tasks');
    const tasksResult = await tasksResponse.json();
    
    if (tasksResult.success && tasksResult.data.length > 0) {
      const firstTask = tasksResult.data[0];
      console.log('找到任务:', firstTask.id, firstTask.title);
      console.log('当前智能寻聘状态:', firstTask.smartRecruitment);
      console.log('当前寻聘状态:', firstTask.recruitmentStatus);
      
      // 2. 测试PATCH请求
      console.log('\n2. 测试PATCH请求...');
      const patchResponse = await fetch(`http://localhost:5001/api/tasks/${firstTask.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          smartRecruitment: true,
          recruitmentStatus: '进行中'
        }),
      });
      
      console.log('PATCH响应状态:', patchResponse.status);
      const patchResult = await patchResponse.json();
      console.log('PATCH响应内容:', patchResult);
      
      if (patchResult.success) {
        // 3. 验证更新结果
        console.log('\n3. 验证更新结果...');
        const verifyResponse = await fetch(`http://localhost:5001/api/tasks/${firstTask.id}`);
        const verifyResult = await verifyResponse.json();
        
        if (verifyResult.success) {
          console.log('更新后的任务:', verifyResult.data);
          console.log('智能寻聘状态:', verifyResult.data.smartRecruitment);
          console.log('寻聘状态:', verifyResult.data.recruitmentStatus);
        }
      }
    } else {
      console.log('没有找到任务');
    }
    
  } catch (error) {
    console.error('测试失败:', error);
  }
}

testSmartRecruitmentAPI();
