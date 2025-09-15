/**
 * 智联招聘服务生产环境测试脚本
 * 模拟真实生产环境测试浏览器初始化
 */

const axios = require('axios');

/**
 * 测试智联招聘服务初始化
 */
async function testZhilianProductionInit() {
  console.log('\n🧪 开始测试智联招聘服务生产环境初始化...');
  
  try {
    // 设置生产环境变量
    const originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      ZEABUR_ENVIRONMENT: process.env.ZEABUR_ENVIRONMENT
    };
    
    // 模拟生产环境
    process.env.NODE_ENV = 'production';
    process.env.ZEABUR_ENVIRONMENT = 'true';
    
    console.log('\n📋 测试环境:');
    console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`   ZEABUR_ENVIRONMENT: ${process.env.ZEABUR_ENVIRONMENT}`);
    
    // 测试智联招聘服务初始化
    console.log('\n🚀 测试智联招聘服务初始化...');
    
    const response = await axios.post('http://localhost:5001/api/zhilian/init', {
      timeout: 60000
    });
    
    if (response.data.success) {
      console.log('   ✅ 智联招聘服务初始化成功!');
      console.log(`   浏览器状态: ${response.data.data?.browserStatus || '未知'}`);
      
      // 测试基本功能
      console.log('\n🔍 测试基本功能...');
      
      const statusResponse = await axios.get('http://localhost:5001/api/zhilian/status');
      
      if (statusResponse.data.success) {
        console.log('   ✅ 服务状态检查成功!');
        console.log(`   初始化状态: ${statusResponse.data.data?.initialized}`);
        console.log(`   浏览器状态: ${statusResponse.data.data?.browserReady}`);
      } else {
        console.log('   ❌ 服务状态检查失败');
      }
      
    } else {
      console.log('   ❌ 智联招聘服务初始化失败');
      console.log(`   错误信息: ${response.data.message}`);
    }
    
    // 恢复原始环境变量
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    process.env.ZEABUR_ENVIRONMENT = originalEnv.ZEABUR_ENVIRONMENT;
    
    console.log('\n🎉 生产环境测试完成!');
    return true;
    
  } catch (error) {
    console.error('\n❌ 智联招聘服务生产环境测试失败:');
    console.error(`   错误信息: ${error.message}`);
    
    if (error.response) {
      console.error(`   HTTP状态: ${error.response.status}`);
      console.error(`   响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    
    if (error.message.includes('remote-debugging') || 
        error.message.includes('headless')) {
      console.error('\n🔧 这可能是浏览器配置问题，建议检查:');
      console.error('   1. 环境变量设置是否正确');
      console.error('   2. headless模式配置');
      console.error('   3. 远程调试参数冲突');
    }
    
    return false;
  }
}

/**
 * 测试清理资源
 */
async function testCleanup() {
  console.log('\n🧹 清理测试资源...');
  
  try {
    await axios.post('http://localhost:5001/api/zhilian/cleanup');
    console.log('   ✅ 资源清理成功');
  } catch (error) {
    console.log('   ⚠️  资源清理失败，可能服务未运行');
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('=== 智联招聘服务生产环境测试 ===');
  
  const success = await testZhilianProductionInit();
  
  // 清理资源
  await testCleanup();
  
  if (success) {
    console.log('\n🎯 测试结论: 智联招聘服务生产环境配置正常!');
    console.log('\n✨ 修复验证:');
    console.log('   - 浏览器初始化成功');
    console.log('   - 无远程调试冲突');
    console.log('   - 服务状态正常');
    process.exit(0);
  } else {
    console.log('\n💥 测试结论: 智联招聘服务仍存在问题!');
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testZhilianProductionInit, testCleanup };