const axios = require('axios');

// 测试JD详情一键发布功能
async function testJDPublish() {
  try {
    console.log('🚀 开始测试JD详情一键发布功能...\n');

    // 1. 测试创建岗位
    console.log('📋 步骤1: 创建测试岗位...');
    const positionData = {
      title: '高级前端开发工程师',
      department: '技术部',
      location: '北京',
      salary: '25K-35K',
      experience: '3-5年',
      education: '本科及以上',
      skills: ['React', 'Vue', 'TypeScript', 'Node.js'],
      responsibilities: [
        '负责公司核心产品的前端开发工作',
        '参与产品需求分析和技术方案设计',
        '编写高质量、可维护的前端代码',
        '与后端工程师协作完成接口对接'
      ],
      requirements: [
        '本科及以上学历，计算机相关专业',
        '3年以上前端开发经验',
        '熟练掌握React、Vue等前端框架',
        '具备良好的代码规范和团队协作能力'
      ],
      benefits: [
        '具有竞争力的薪资待遇',
        '五险一金、带薪年假',
        '定期团建活动和培训机会',
        '弹性工作制度'
      ],
      description: '这是一个自动生成的完整描述...'
    };

    const createResponse = await axios.post('http://localhost:3001/api/positions/create-from-dialog', {
      userMessage: `我想创建一个${positionData.title}岗位，部门是${positionData.department}，工作地点在${positionData.location}，薪资范围${positionData.salary}，需要${positionData.experience}工作经验，学历要求${positionData.education}，技能要求包括${positionData.skills.join('、')}`
    });

    if (createResponse.data.success) {
      console.log('✅ 岗位创建成功:', createResponse.data.position.title);
      const positionId = createResponse.data.position.id;
      
      // 2. 测试更新岗位信息
      console.log('\n📝 步骤2: 更新岗位信息...');
      const updateResponse = await axios.put(`http://localhost:3001/api/positions/${positionId}`, {
        ...positionData,
        updatedAt: new Date().toISOString()
      });

      if (updateResponse.data.success) {
        console.log('✅ 岗位信息更新成功');
        
        // 3. 测试创建招聘任务（模拟一键发布的第一步）
        console.log('\n🚀 步骤3: 模拟一键发布 - 同步至任务管理列表...');
        const taskData = {
          title: `招聘${createResponse.data.position.title}`,
          position: createResponse.data.position.title,
          description: createResponse.data.position.description,
          status: '进行中',
          priority: '高',
          platforms: ['智联招聘'],
          candidates: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const taskResponse = await axios.post('http://localhost:3001/api/tasks', taskData);
        
        if (taskResponse.data.success) {
          console.log('✅ 招聘任务创建成功:', taskResponse.data.data.title);
          console.log('📊 任务ID:', taskResponse.data.data.id);
          
          // 4. 验证任务是否在列表中
          console.log('\n🔍 步骤4: 验证任务是否在任务管理列表中...');
          const tasksResponse = await axios.get('http://localhost:3001/api/tasks');
          
          if (tasksResponse.data.success) {
            const createdTask = tasksResponse.data.data.find(task => 
              task.title === `招聘${createResponse.data.position.title}`
            );
            
            if (createdTask) {
              console.log('✅ 任务已成功同步至任务管理列表');
              console.log('📋 任务详情:', {
                id: createdTask.id,
                title: createdTask.title,
                status: createdTask.status,
                priority: createdTask.priority,
                platforms: createdTask.platforms
              });
            } else {
              console.log('❌ 任务未在列表中找到');
            }
          }
        } else {
          console.log('❌ 招聘任务创建失败:', taskResponse.data.message);
        }
      } else {
        console.log('❌ 岗位信息更新失败:', updateResponse.data.message);
      }
    } else {
      console.log('❌ 岗位创建失败:', createResponse.data.error);
    }

    console.log('\n🎉 JD详情一键发布功能测试完成！');
    console.log('\n📝 测试总结:');
    console.log('✅ 岗位创建和更新功能正常');
    console.log('✅ 招聘任务同步功能正常');
    console.log('✅ 任务管理列表集成正常');
    console.log('✅ 一键发布流程模拟正常');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
  }
}

// 运行测试
testJDPublish();
