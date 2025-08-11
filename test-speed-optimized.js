#!/usr/bin/env node

/**
 * 性能优化测试脚本
 * 验证优化后的响应速度
 */

const axios = require('axios');

async function testOptimizedSpeed() {
  console.log('🚀 测试优化后的响应速度...\n');
  
  const testCases = [
    "招聘前端开发工程师，要求3年React经验",
    "需要Java后端工程师，熟悉Spring Boot",
    "招聘产品经理，负责用户增长"
  ];

  for (let i = 0; i < testCases.length; i++) {
    const query = testCases[i];
    console.log(`📝 测试用例 ${i+1}: ${query}`);
    
    try {
      const startTime = Date.now();
      
      const response = await axios.post('http://localhost:3000/api/positions/create-from-dialog', {
        userMessage: query
      }, {
        timeout: 10000 // 10秒超时
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      console.log(`   ✅ 成功 (${duration}ms) - ${duration < 2000 ? '⚡极速' : duration < 5000 ? '🚀快速' : '✅正常'}`);
      console.log(`   🎯 岗位: ${response.data.position?.title}`);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(`   ❌ 失败 (${duration}ms)`);
    }
    
    console.log('');
  }
}

console.log('⚡ 开始性能测试...\n');
testOptimizedSpeed().catch(console.error);