/**
 * 测试容器中Playwright浏览器自动化功能
 */
const axios = require('axios');

/**
 * 测试后端Playwright功能
 */
async function testPlaywrightInContainer() {
    console.log('🎭 测试容器中的Playwright功能...');
    
    try {
        // 测试基本的浏览器启动
        const response = await axios.post('http://localhost:3001/api/test/playwright', {
            url: 'https://example.com',
            action: 'navigate'
        }, {
            timeout: 30000
        });
        
        if (response.status === 200) {
            console.log('✅ Playwright容器测试成功');
            console.log('响应:', response.data);
            return true;
        } else {
            console.log('❌ Playwright容器测试失败:', response.status);
            return false;
        }
    } catch (error) {
        console.log('❌ Playwright容器测试错误:', error.message);
        if (error.response) {
            console.log('错误详情:', error.response.data);
        }
        return false;
    }
}

/**
 * 测试服务健康状态
 */
async function testServiceHealth() {
    console.log('🏥 检查服务健康状态...');
    
    try {
        const response = await axios.get('http://localhost:3001/api/health');
        console.log('✅ 后端服务健康:', response.data);
        return true;
    } catch (error) {
        console.log('❌ 后端服务不健康:', error.message);
        return false;
    }
}

/**
 * 主测试函数
 */
async function runTests() {
    console.log('🚀 开始容器功能测试...');
    
    const healthOk = await testServiceHealth();
    if (!healthOk) {
        console.log('❌ 服务健康检查失败，停止测试');
        process.exit(1);
    }
    
    const playwrightOk = await testPlaywrightInContainer();
    
    console.log('\n📊 测试结果汇总:');
    console.log(`- 服务健康: ${healthOk ? '✅' : '❌'}`);
    console.log(`- Playwright功能: ${playwrightOk ? '✅' : '❌'}`);
    
    if (healthOk && playwrightOk) {
        console.log('\n🎉 所有测试通过！容器部署成功');
        process.exit(0);
    } else {
        console.log('\n❌ 部分测试失败');
        process.exit(1);
    }
}

// 运行测试
runTests().catch(error => {
    console.error('测试运行错误:', error);
    process.exit(1);
});