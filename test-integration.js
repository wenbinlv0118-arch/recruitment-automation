/**
 * 集成测试脚本 - 验证Docker容器化部署的完整功能
 * 测试后端API、Playwright功能和VNC服务
 */

const axios = require('axios');

// 配置
const config = {
  backend: 'http://localhost:3001',
  vnc: 'http://localhost:6080'
};

/**
 * 测试后端健康状态
 */
async function testBackendHealth() {
  console.log('🏥 测试后端健康状态...');
  try {
    const response = await axios.get(`${config.backend}/api/health`);
    console.log('✅ 后端健康检查通过:', response.data);
    return true;
  } catch (error) {
    console.log('❌ 后端健康检查失败:', error.message);
    return false;
  }
}

/**
 * 测试Playwright浏览器自动化功能
 */
async function testPlaywrightAutomation() {
  console.log('🎭 测试Playwright浏览器自动化...');
  try {
    const testData = {
      url: 'https://httpbin.org/get',
      action: 'navigate'
    };
    
    const response = await axios.post(`${config.backend}/api/test/playwright`, testData, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });
    
    console.log('✅ Playwright自动化测试通过');
    console.log('响应数据:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Playwright自动化测试失败:', error.message);
    return false;
  }
}

/**
 * 测试VNC服务可访问性
 */
async function testVNCService() {
  console.log('🖥️  测试VNC服务...');
  try {
    const response = await axios.get(config.vnc, { timeout: 10000 });
    if (response.data.includes('novnc')) {
      console.log('✅ VNC服务正常运行');
      console.log('VNC访问地址: http://localhost:6080');
      return true;
    } else {
      console.log('❌ VNC服务响应异常');
      return false;
    }
  } catch (error) {
    console.log('❌ VNC服务测试失败:', error.message);
    return false;
  }
}

/**
 * 主测试函数
 */
async function runIntegrationTests() {
  console.log('🚀 开始集成测试...');
  console.log('=' .repeat(50));
  
  const results = {
    backend: false,
    playwright: false,
    vnc: false
  };
  
  // 测试后端健康状态
  results.backend = await testBackendHealth();
  console.log('');
  
  // 如果后端正常，测试Playwright功能
  if (results.backend) {
    results.playwright = await testPlaywrightAutomation();
    console.log('');
  }
  
  // 测试VNC服务
  results.vnc = await testVNCService();
  console.log('');
  
  // 输出测试结果
  console.log('📊 集成测试结果汇总:');
  console.log('=' .repeat(50));
  console.log(`- 后端服务: ${results.backend ? '✅' : '❌'}`);
  console.log(`- Playwright功能: ${results.playwright ? '✅' : '❌'}`);
  console.log(`- VNC服务: ${results.vnc ? '✅' : '❌'}`);
  console.log('');
  
  const allPassed = Object.values(results).every(result => result);
  if (allPassed) {
    console.log('🎉 所有集成测试通过！Docker容器化部署成功');
    console.log('');
    console.log('📋 服务访问信息:');
    console.log(`- 后端API: ${config.backend}`);
    console.log(`- VNC远程桌面: ${config.vnc}`);
    console.log(`- 健康检查: ${config.backend}/api/health`);
  } else {
    console.log('❌ 部分测试失败，请检查服务状态');
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runIntegrationTests().catch(error => {
    console.error('测试执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  runIntegrationTests,
  testBackendHealth,
  testPlaywrightAutomation,
  testVNCService
};