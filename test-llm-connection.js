#!/usr/bin/env node

/**
 * 大模型API连接测试脚本
 * 用于诊断大模型API连接问题
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

// 直接读取环境变量文件
const envPath = path.join(__dirname, 'backend', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// 解析环境变量
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

class LLMConnectionTester {
  constructor() {
    this.apiKey = envVars.LLM_API_KEY;
    this.apiUrl = envVars.LLM_API_URL;
    this.model = envVars.LLM_MODEL;
  }

  /**
   * 测试大模型API连接
   */
  async testConnection() {
    console.log('🔍 开始测试大模型API连接...\n');
    
    // 1. 检查配置
    console.log('📋 API配置检查:');
    console.log(`   API Key: ${this.apiKey ? '✅ 已设置' : '❌ 未设置'}`);
    console.log(`   API URL: ${this.apiUrl || '❌ 未设置'}`);
    console.log(`   Model: ${this.model || '❌ 未设置'}`);
    console.log('');

    if (!this.apiKey || !this.apiUrl) {
      console.log('❌ 缺少必要的API配置');
      return false;
    }

    // 2. 测试API连通性
    console.log('🔗 测试API连通性...');
    try {
      const response = await axios.post(this.apiUrl, {
        model: this.model,
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 10
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      console.log('✅ API连接成功');
      console.log(`   状态码: ${response.status}`);
      return true;

    } catch (error) {
      console.log('❌ API连接失败');
      
      if (error.response) {
        console.log(`   状态码: ${error.response.status}`);
        console.log(`   错误: ${JSON.stringify(error.response.data)}`);
      } else if (error.code === 'ENOTFOUND') {
        console.log('   错误: DNS解析失败');
      } else if (error.code === 'ECONNREFUSED') {
        console.log('   错误: 连接被拒绝');
      } else if (error.code === 'ETIMEDOUT') {
        console.log('   错误: 连接超时');
      } else {
        console.log(`   错误: ${error.message}`);
      }
      
      return false;
    }
  }

  /**
   * 测试后端服务
   */
  async testBackendService() {
    console.log('\n🖥️  测试后端服务...');
    
    try {
      const response = await axios.get('http://localhost:3000/api/knowledge/search?q=test&companyId=1', {
        timeout: 5000
      });
      
      console.log('✅ 后端服务运行正常');
      
    } catch (error) {
      console.log('❌ 后端服务未响应');
      console.log(`   错误: ${error.message}`);
    }
  }
}

// 运行测试
async function runTests() {
  const tester = new LLMConnectionTester();
  
  console.log('🚀 大模型API连接诊断\n');
  console.log('=' .repeat(50));
  
  await tester.testConnection();
  await tester.testBackendService();
  
  console.log('\n' + '=' .repeat(50));
  console.log('💡 诊断完成');
}

runTests().catch(console.error);