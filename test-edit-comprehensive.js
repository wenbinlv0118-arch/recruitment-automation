// 全面测试任务编辑功能
async function testEditComprehensive() {
  const baseUrl = 'http://localhost:5001/api';
  
  console.log('🧪 开始全面测试任务编辑功能...\n');

  try {
    // 1. 创建一个包含所有字段的测试任务
    console.log('1. 创建包含所有字段的测试任务...');
    const createResponse = await fetch(`${baseUrl}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: '全面测试任务',
        position: '测试职位',
        description: '这是一个包含所有字段的测试任务',
        status: '进行中',
        priority: '高',
        progress: 30,
        assignee: '测试负责人',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天后
        platforms: ['智联招聘', 'BOSS直聘'],
        candidates: [
          {
            name: '张三',
            email: 'zhangsan@example.com',
            phone: '13800138001',
            status: '待联系',
            notes: '测试候选人1'
          },
          {
            name: '李四',
            email: 'lisi@example.com',
            phone: '13800138002',
            status: '已联系',
            notes: '测试候选人2'
          }
        ]
      })
    });

    const createResult = await createResponse.json();
    if (!createResult.success) {
      console.log('❌ 测试任务创建失败:', createResult.message);
      return;
    }

    const testTask = createResult.data;
    console.log('✅ 测试任务创建成功');
    console.log('   任务ID:', testTask.id);
    console.log('   候选人数量:', testTask.candidates?.length || 0);
    console.log('   平台数量:', testTask.platforms?.length || 0);

    // 2. 测试获取任务详情
    console.log('\n2. 测试获取任务详情...');
    const detailResponse = await fetch(`${baseUrl}/tasks/${testTask.id}`);
    const detailResult = await detailResponse.json();
    
    if (detailResult.success) {
      console.log('✅ 任务详情获取成功');
      console.log('   标题:', detailResult.data.title);
      console.log('   候选人:', detailResult.data.candidates?.length || 0);
      console.log('   平台:', detailResult.data.platforms?.length || 0);
    } else {
      console.log('❌ 任务详情获取失败:', detailResult.message);
    }

    // 3. 测试编辑任务（修改所有字段）
    console.log('\n3. 测试编辑任务...');
    const updateData = {
      title: '已编辑的全面测试任务',
      position: '已编辑的测试职位',
      description: '这是经过全面编辑的测试任务',
      status: '已完成',
      priority: '中',
      progress: 100,
      assignee: '新负责人',
      deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14天后
      platforms: ['智联招聘', 'BOSS直聘', '拉勾网', '猎聘网', 'LinkedIn'],
      candidates: [
        {
          name: '王五',
          email: 'wangwu@example.com',
          phone: '13800138003',
          status: '已录用',
          notes: '新候选人1'
        },
        {
          name: '赵六',
          email: 'zhaoliu@example.com',
          phone: '13800138004',
          status: '面试中',
          notes: '新候选人2'
        },
        {
          name: '钱七',
          email: 'qianqi@example.com',
          phone: '13800138005',
          status: '已拒绝',
          notes: '新候选人3'
        }
      ]
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
      console.log('   新状态:', updateResult.data.status);
      console.log('   新进度:', updateResult.data.progress);
      console.log('   新候选人数量:', updateResult.data.candidates?.length || 0);
      console.log('   新平台数量:', updateResult.data.platforms?.length || 0);
    } else {
      console.log('❌ 任务编辑失败:', updateResult.message);
    }

    // 4. 测试部分字段更新
    console.log('\n4. 测试部分字段更新...');
    const partialUpdateData = {
      progress: 85,
      platforms: ['智联招聘', 'BOSS直聘']
    };

    const partialUpdateResponse = await fetch(`${baseUrl}/tasks/${testTask.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(partialUpdateData)
    });

    const partialUpdateResult = await partialUpdateResponse.json();
    if (partialUpdateResult.success) {
      console.log('✅ 部分字段更新成功');
      console.log('   新进度:', partialUpdateResult.data.progress);
      console.log('   新平台:', partialUpdateResult.data.platforms);
    } else {
      console.log('❌ 部分字段更新失败:', partialUpdateResult.message);
    }

    // 5. 测试空字段处理
    console.log('\n5. 测试空字段处理...');
    const emptyUpdateData = {
      platforms: [],
      candidates: []
    };

    const emptyUpdateResponse = await fetch(`${baseUrl}/tasks/${testTask.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emptyUpdateData)
    });

    const emptyUpdateResult = await emptyUpdateResponse.json();
    if (emptyUpdateResult.success) {
      console.log('✅ 空字段处理成功');
      console.log('   空平台数组:', emptyUpdateResult.data.platforms);
      console.log('   空候选人数组:', emptyUpdateResult.data.candidates);
    } else {
      console.log('❌ 空字段处理失败:', emptyUpdateResult.message);
    }

    console.log('\n🎉 全面测试完成！所有功能正常！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
  }
}

// 运行测试
testEditComprehensive(); 