// 使用内置的fetch（Node.js 18+）

// 测试招聘平台功能
async function testPlatformFeature() {
  const baseUrl = 'http://localhost:5001/api';
  
  console.log('🧪 开始测试招聘平台功能...\n');

  try {
    // 1. 创建包含招聘平台的任务
    console.log('1. 创建包含招聘平台的任务...');
    const createResponse = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: '前端开发工程师招聘',
        position: '前端开发工程师',
        description: '招聘有经验的前端开发工程师',
        status: '进行中',
        priority: '高',
        progress: 30,
        assignee: '张经理',
        platforms: ['智联招聘', 'BOSS直聘', '拉勾网'],
        candidates: [
          {
            name: '张三',
            email: 'zhangsan@example.com',
            phone: '13800138001',
            status: '待联系'
          }
        ]
      })
    });

    const createResult = await createResponse.json();
    if (createResult.success) {
      console.log('✅ 任务创建成功:', createResult.data.title);
      console.log('   招聘平台:', createResult.data.platforms);
    } else {
      console.log('❌ 任务创建失败:', createResult.message);
      return;
    }

    // 2. 获取任务列表，测试平台筛选
    console.log('\n2. 测试招聘平台筛选功能...');
    const filterResponse = await fetch(`${baseUrl}/tasks?platform=智联招聘`);
    const filterResult = await filterResponse.json();
    
    if (filterResult.success) {
      console.log('✅ 平台筛选成功，找到任务数量:', filterResult.data.length);
      filterResult.data.forEach(task => {
        console.log(`   - ${task.title} (平台: ${task.platforms?.join(', ') || '无'})`);
      });
    } else {
      console.log('❌ 平台筛选失败:', filterResult.message);
    }

    // 3. 测试搜索功能（包含平台搜索）
    console.log('\n3. 测试包含平台的搜索功能...');
    const searchResponse = await fetch(`${baseUrl}/tasks?search=BOSS直聘`);
    const searchResult = await searchResponse.json();
    
    if (searchResult.success) {
      console.log('✅ 平台搜索成功，找到任务数量:', searchResult.data.length);
      searchResult.data.forEach(task => {
        console.log(`   - ${task.title} (平台: ${task.platforms?.join(', ') || '无'})`);
      });
    } else {
      console.log('❌ 平台搜索失败:', searchResult.message);
    }

    // 4. 更新任务，添加更多平台
    console.log('\n4. 更新任务，添加更多招聘平台...');
    const updateResponse = await fetch(`${baseUrl}/tasks/${createResult.data.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        platforms: ['智联招聘', 'BOSS直聘', '拉勾网', '猎聘网', 'LinkedIn']
      })
    });

    const updateResult = await updateResponse.json();
    if (updateResult.success) {
      console.log('✅ 任务更新成功');
      console.log('   更新后的平台:', updateResult.data.platforms);
    } else {
      console.log('❌ 任务更新失败:', updateResult.message);
    }

    // 5. 获取任务统计
    console.log('\n5. 获取任务统计...');
    const statsResponse = await fetch(`${baseUrl}/tasks/stats`);
    const statsResult = await statsResponse.json();
    
    if (statsResult.success) {
      console.log('✅ 统计获取成功');
      console.log('   总任务数:', statsResult.data.total);
      console.log('   进行中:', statsResult.data.inProgress);
      console.log('   已完成:', statsResult.data.completed);
      console.log('   高优先级:', statsResult.data.highPriority);
    } else {
      console.log('❌ 统计获取失败:', statsResult.message);
    }

    console.log('\n🎉 招聘平台功能测试完成！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testPlatformFeature(); 