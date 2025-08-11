#!/usr/bin/env node

/**
 * 修复后的岗位创建测试脚本
 * 验证岗位创建功能是否正常
 */

const axios = require('axios');

async function testPositionCreation() {
  console.log('🚀 测试修复后的岗位创建功能...\n');
  
  const testCases = [
    "招聘前端开发工程师，要求3年React经验",
    "需要Java后端工程师，熟悉Spring Boot",
    "招聘产品经理，负责用户增长"
  ];

  for (let i = 0; i < testCases.length; i++) {
    const query = testCases[i];
    console.log(`📝 测试用例 ${i+1}: ${query}`);
    
    try {
      console.log('   ⏳ 等待响应...');
      const startTime = Date.now();
      
      const response = await axios.post('http://localhost:3000/api/positions/create-from-dialog', {
        userMessage: query
      }, {
        timeout: 70000 // 70秒超时，比LLM超时稍长
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`   ✅ 成功 (${duration}ms)`);
      console.log(`   🎯 岗位: ${response.data.position?.title || '未知'}`);
      console.log(`   📊 状态: ${response.data.success ? '成功' : '失败'}`);
      
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - (error.config?.startTime || endTime - 70000);
      
      console.log(`   ❌ 失败 (${duration}ms)`);
      console.log(`   🔍 错误: ${error.message}`);
      
      if (error.response) {
        console.log(`   📱 状态码: ${error.response.status}`);
        console.log(`   💬 错误详情: ${JSON.stringify(error.response.data)}`);
      }
    }
    
    console.log('');
  }
}

// 运行测试
console.log('🔄 开始测试修复后的岗位创建功能...\n');
testPositionCreation().catch(console.error);