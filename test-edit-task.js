// 测试任务编辑功能
async function testEditTask() {
  const baseUrl = 'http://localhost:5001/api';
  
  console.log('🧪 开始测试任务编辑功能...\n');

  try {
    // 1. 先获取现有任务列表
    console.log('1. 获取现有任务列表...');
    const listResponse = await fetch(`${baseUrl}/tasks`);
    const listResult = await listResponse.json();
    
    if (!listResult.success || listResult.data.length === 0) {
      console.log('❌ 没有找到现有任务，先创建一个测试任务...');
      
      // 创建一个测试任务
      const createResponse = await fetch(`${baseUrl}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: '测试编辑任务',
          position: '测试职位',
          description: '这是一个用于测试编辑功能的任务',
          status: '进行中',
          priority: '中',
          progress: 50,
          platforms: ['智联招聘', 'BOSS直聘']
        })
      });

      const createResult = await createResponse.json();
      if (createResult.success) {
        console.log('✅ 测试任务创建成功');
        var testTask = createResult.data;
      } else {
        console.log('❌ 测试任务创建失败:', createResult.message);
        return;
      }
    } else {
      console.log('✅ 找到现有任务，使用第一个任务进行测试');
      testTask = listResult.data[0];
    }

    console.log('   测试任务ID:', testTask.id);
    console.log('   测试任务标题:', testTask.title);
    console.log('   当前平台:', testTask.platforms || []);

    // 2. 测试编辑任务
    console.log('\n2. 测试编辑任务...');
    const updateData = {
      title: '已编辑的测试任务',
      position: '已编辑的测试职位',
      description: '这是经过编辑的测试任务',
      status: '进行中',
      priority: '高',
      progress: 75,
      platforms: ['智联招聘', 'BOSS直聘', '拉勾网', '猎聘网']
    };

    const updateResponse = await fetch(`${baseUrl}/tasks/${testTask.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateData)
    });

    const updateResult = await updateResponse.json();
    if (updateResult.success) {
      console.log('✅ 任务编辑成功');
      console.log('   新标题:', updateResult.data.title);
      console.log('   新平台:', updateResult.data.platforms);
      console.log('   新进度:', updateResult.data.progress);
    } else {
      console.log('❌ 任务编辑失败:', updateResult.message);
    }

    // 3. 验证编辑结果
    console.log('\n3. 验证编辑结果...');
    const verifyResponse = await fetch(`${baseUrl}/tasks/${testTask.id}`);
    const verifyResult = await verifyResponse.json();
    
    if (verifyResult.success) {
      console.log('✅ 验证成功');
      console.log('   最终标题:', verifyResult.data.title);
      console.log('   最终平台:', verifyResult.data.platforms);
      console.log('   最终进度:', verifyResult.data.progress);
    } else {
      console.log('❌ 验证失败:', verifyResult.message);
    }

    console.log('\n🎉 任务编辑功能测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testEditTask(); 