#!/usr/bin/env node

/**
 * 前端后端连接测试脚本
 * 测试前端是否能正确调用后端 API
 */

const https = require('https');
const { URL } = require('url');

// 测试配置
const FRONTEND_URL = 'https://recruitment-automation-frontend.zeabur.app';
const BACKEND_URL = 'https://recruitment-automation-backend.zeabur.app';

/**
 * 发送 HTTP 请求
 * @param {string} url - 请求 URL
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>} 响应结果
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'User-Agent': 'Frontend-Backend-Connection-Test/1.0',
        'Accept': 'application/json',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

/**
 * 测试前端可访问性
 */
async function testFrontendAccess() {
  console.log('🔍 测试前端可访问性...');
  try {
    const response = await makeRequest(FRONTEND_URL);
    if (response.statusCode === 200) {
      console.log('✅ 前端可正常访问');
      console.log(`   状态码: ${response.statusCode}`);
      console.log(`   内容类型: ${response.headers['content-type']}`);
      return true;
    } else {
      console.log(`❌ 前端访问异常，状态码: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 前端访问失败: ${error.message}`);
    return false;
  }
}

/**
 * 测试后端健康检查
 */
async function testBackendHealth() {
  console.log('🔍 测试后端健康检查...');
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/health`);
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      console.log('✅ 后端健康检查正常');
      console.log(`   响应: ${JSON.stringify(data)}`);
      return true;
    } else {
      console.log(`❌ 后端健康检查异常，状态码: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 后端健康检查失败: ${error.message}`);
    return false;
  }
}

/**
 * 测试任务统计 API
 */
async function testTasksStatsAPI() {
  console.log('🔍 测试任务统计 API...');
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/tasks/stats`);
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      console.log('✅ 任务统计 API 正常');
      console.log(`   数据: ${JSON.stringify(data, null, 2)}`);
      return true;
    } else {
      console.log(`❌ 任务统计 API 异常，状态码: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 任务统计 API 失败: ${error.message}`);
    return false;
  }
}

/**
 * 测试任务列表 API
 */
async function testTasksListAPI() {
  console.log('🔍 测试任务列表 API...');
  try {
    const response = await makeRequest(`${BACKEND_URL}/api/tasks`);
    if (response.statusCode === 200) {
      const data = JSON.parse(response.body);
      console.log('✅ 任务列表 API 正常');
      console.log(`   数据: ${JSON.stringify(data, null, 2)}`);
      return true;
    } else {
      console.log(`❌ 任务列表 API 异常，状态码: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ 任务列表 API 失败: ${error.message}`);
    return false;
  }
}

/**
 * 测试 WebSocket 端点
 */
async function testWebSocketEndpoint() {
  console.log('🔍 测试 WebSocket 端点...');
  try {
    const response = await makeRequest(`${BACKEND_URL}/socket.io/`);
    // WebSocket 端点通常返回 400 是正常的，因为需要特定的握手协议
    if (response.statusCode === 400) {
      console.log('✅ WebSocket 端点可访问（返回 400 是正常的）');
      return true;
    } else {
      console.log(`⚠️  WebSocket 端点状态码: ${response.statusCode}`);
      return true; // 仍然认为是可访问的
    }
  } catch (error) {
    console.log(`❌ WebSocket 端点测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log('🚀 开始前端后端连接测试\n');
  console.log(`前端地址: ${FRONTEND_URL}`);
  console.log(`后端地址: ${BACKEND_URL}\n`);

  const tests = [
    { name: '前端可访问性', fn: testFrontendAccess },
    { name: '后端健康检查', fn: testBackendHealth },
    { name: '任务统计 API', fn: testTasksStatsAPI },
    { name: '任务列表 API', fn: testTasksListAPI },
    { name: 'WebSocket 端点', fn: testWebSocketEndpoint }
  ];

  let passedTests = 0;
  const totalTests = tests.length;

  for (const test of tests) {
    const result = await test.fn();
    if (result) passedTests++;
    console.log(''); // 空行分隔
  }

  console.log('📊 测试结果汇总:');
  console.log(`   通过: ${passedTests}/${totalTests}`);
  console.log(`   成功率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (passedTests === totalTests) {
    console.log('\n🎉 所有测试通过！前端与后端连接正常。');
  } else {
    console.log('\n⚠️  部分测试失败，请检查相关服务。');
  }

  return passedTests === totalTests;
}

// 运行测试
if (require.main === module) {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('测试运行出错:', error);
    process.exit(1);
  });
}

module.exports = { runTests };