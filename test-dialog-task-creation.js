// 测试对话创建任务功能的脚本
// 这个脚本模拟用户通过对话创建任务的各种场景

const testCases = [
  {
    name: "简单任务创建",
    input: "创建一个招聘前端开发工程师的任务",
    expected: {
      title: "招聘前端开发工程师",
      position: "前端开发工程师",
      description: "招聘前端开发工程师，负责相关岗位的招聘工作",
      assignee: "",
      deadline: null
    }
  },
  {
    name: "完整信息任务创建",
    input: "新建一个产品经理的招聘任务，负责人是张经理，7天后截止",
    expected: {
      title: "招聘产品经理",
      position: "产品经理",
      description: "招聘产品经理，负责相关岗位的招聘工作",
      assignee: "张经理",
      deadline: "7天后"
    }
  },
  {
    name: "UI设计师任务创建",
    input: "添加一个UI设计师的招聘任务，负责人李总监",
    expected: {
      title: "招聘UI设计师",
      position: "UI设计师",
      description: "招聘UI设计师，负责相关岗位的招聘工作",
      assignee: "李总监",
      deadline: null
    }
  },
  {
    name: "测试工程师任务创建",
    input: "开始招聘测试工程师，10天后截止",
    expected: {
      title: "招聘测试工程师",
      position: "测试工程师",
      description: "招聘测试工程师，负责相关岗位的招聘工作",
      assignee: "",
      deadline: "10天后"
    }
  },
  {
    name: "不完整信息",
    input: "我想创建任务",
    expected: {
      isValid: false
    }
  }
];

// 模拟解析函数
function parseTaskCreationQuery(query) {
  const taskInfo = {
    isValid: false,
    taskData: {
      title: '',
      position: '',
      description: '',
      status: '进行中',
      priority: '中',
      progress: 0,
      assignee: '',
      deadline: null,
      candidates: []
    }
  };

  // 提取职位信息
  const positionKeywords = {
    '前端开发工程师': ['前端', '前端开发', '前端工程师', 'react', 'vue', 'javascript'],
    '后端开发工程师': ['后端', '后端开发', '后端工程师', 'node.js', 'python', 'java'],
    '产品经理': ['产品经理', '产品', 'pm', 'product'],
    'UI设计师': ['ui设计师', 'ui设计', '设计师', '设计'],
    '测试工程师': ['测试工程师', '测试', 'qa', 'quality'],
    '运营专员': ['运营专员', '运营', 'operation']
  };

  // 查找匹配的职位
  for (const [position, keywords] of Object.entries(positionKeywords)) {
    if (keywords.some(keyword => query.toLowerCase().includes(keyword.toLowerCase()))) {
      taskInfo.taskData.position = position;
      break;
    }
  }

  // 如果没有找到具体职位，尝试从查询中提取
  if (!taskInfo.taskData.position) {
    const positionMatch = query.match(/招聘\s*([^，。\s]+)/);
    if (positionMatch) {
      taskInfo.taskData.position = positionMatch[1];
    }
  }

  // 提取任务名称
  if (taskInfo.taskData.position) {
    taskInfo.taskData.title = `招聘${taskInfo.taskData.position}`;
  } else {
    const titleMatch = query.match(/招聘\s*([^，。\s]+)/);
    if (titleMatch) {
      taskInfo.taskData.title = `招聘${titleMatch[1]}`;
      taskInfo.taskData.position = titleMatch[1];
    }
  }

  // 提取负责人
  const assigneeMatch = query.match(/负责人[是为]\s*([^，。\s]+)/);
  if (assigneeMatch) {
    taskInfo.taskData.assignee = assigneeMatch[1];
  }

  // 提取截止时间
  const deadlineMatch = query.match(/(\d+)\s*天后/);
  if (deadlineMatch) {
    const days = parseInt(deadlineMatch[1]);
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + days);
    taskInfo.taskData.deadline = deadline.toISOString();
  }

  // 提取描述
  const descMatch = query.match(/描述[是为]\s*([^，。]+)/);
  if (descMatch) {
    taskInfo.taskData.description = descMatch[1];
  } else if (taskInfo.taskData.position) {
    taskInfo.taskData.description = `招聘${taskInfo.taskData.position}，负责相关岗位的招聘工作`;
  }

  // 验证任务信息是否完整
  taskInfo.isValid = taskInfo.taskData.title && taskInfo.taskData.position;

  return taskInfo;
}

// 运行测试
console.log('🧪 开始测试对话创建任务功能...\n');

testCases.forEach((testCase, index) => {
  console.log(`📋 测试用例 ${index + 1}: ${testCase.name}`);
  console.log(`输入: "${testCase.input}"`);
  
  const result = parseTaskCreationQuery(testCase.input);
  
  if (testCase.expected.isValid === false) {
    // 测试不完整信息的情况
    if (!result.isValid) {
      console.log('✅ 测试通过: 正确识别为不完整信息');
    } else {
      console.log('❌ 测试失败: 应该识别为不完整信息');
    }
  } else {
    // 测试完整信息的情况
    const isTitleMatch = result.taskData.title === testCase.expected.title;
    const isPositionMatch = result.taskData.position === testCase.expected.position;
    const isDescriptionMatch = result.taskData.description === testCase.expected.description;
    const isAssigneeMatch = result.taskData.assignee === testCase.expected.assignee;
    const isDeadlineMatch = testCase.expected.deadline === null ? 
      result.taskData.deadline === null : 
      result.taskData.deadline !== null;
    
    const allMatch = isTitleMatch && isPositionMatch && isDescriptionMatch && 
                    isAssigneeMatch && isDeadlineMatch && result.isValid;
    
    if (allMatch) {
      console.log('✅ 测试通过');
    } else {
      console.log('❌ 测试失败');
      if (!isTitleMatch) console.log(`   - 标题不匹配: 期望 "${testCase.expected.title}", 实际 "${result.taskData.title}"`);
      if (!isPositionMatch) console.log(`   - 职位不匹配: 期望 "${testCase.expected.position}", 实际 "${result.taskData.position}"`);
      if (!isDescriptionMatch) console.log(`   - 描述不匹配: 期望 "${testCase.expected.description}", 实际 "${result.taskData.description}"`);
      if (!isAssigneeMatch) console.log(`   - 负责人不匹配: 期望 "${testCase.expected.assignee}", 实际 "${result.taskData.assignee}"`);
      if (!isDeadlineMatch) console.log(`   - 截止时间不匹配: 期望 ${testCase.expected.deadline}, 实际 ${result.taskData.deadline}`);
      if (!result.isValid) console.log(`   - 有效性检查失败: 期望 true, 实际 ${result.isValid}`);
    }
  }
  
  console.log(`解析结果:`, {
    isValid: result.isValid,
    title: result.taskData.title,
    position: result.taskData.position,
    description: result.taskData.description,
    assignee: result.taskData.assignee,
    deadline: result.taskData.deadline
  });
  console.log('---\n');
});

console.log('🎉 测试完成！');

// 演示实际使用场景
console.log('🚀 实际使用场景演示:');
console.log('1. 用户: "创建一个招聘前端开发工程师的任务"');
console.log('2. 系统: 自动解析并创建任务');
console.log('3. 用户: "新建一个产品经理的招聘任务，负责人是张经理，7天后截止"');
console.log('4. 系统: 解析完整信息并创建任务');
console.log('5. 用户: "我想创建任务"');
console.log('6. 系统: 提供创建指导'); 