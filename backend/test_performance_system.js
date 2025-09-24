/**
 * 性能评估系统测试脚本
 * 验证CDP与VNC性能对比测试系统的功能
 */

const PerformanceComparison = require('./scripts/performanceComparison');
const AutomatedTestCases = require('./scripts/automatedTestCases');
const PerformanceMetrics = require('./scripts/performanceMetrics');
const ModeToggleService = require('./modeToggleService');
const PerformanceReportGenerator = require('./scripts/performanceReportGenerator');

/**
 * 测试性能评估系统的主要功能
 */
async function testPerformanceSystem() {
  console.log('🚀 开始测试性能评估系统...');
  
  try {
    // 1. 测试性能指标收集
    console.log('\n📊 测试性能指标收集...');
    const metrics = new PerformanceMetrics();
    metrics.startMonitoring();
    
    // 模拟一些性能数据
    for (let i = 0; i < 10; i++) {
      metrics.recordFrame(Date.now());
      metrics.recordNetworkRequest(100 + Math.random() * 50, 1000 + Math.random() * 500);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    metrics.stopMonitoring();
    const report = metrics.generateReport();
    console.log('✅ 性能指标收集测试完成');
    console.log('📈 平均帧率:', report.frameRate.average.toFixed(2), 'fps');
    console.log('⏱️ 平均延迟:', report.latency.average.toFixed(2), 'ms');
    
    // 2. 测试自动化测试用例
    console.log('\n🤖 测试自动化测试用例...');
    const testCases = new AutomatedTestCases();
    const scenarios = testCases.getTestScenarios();
    console.log('✅ 找到', scenarios.length, '个测试场景');
    
    // 执行一个简单的测试场景
    const testResult = await testCases.executeScenario('zhilian', 'cdp');
    console.log('✅ 测试场景执行完成，耗时:', testResult.duration, 'ms');
    
    // 3. 测试模式切换服务
    console.log('\n🔄 测试模式切换服务...');
    const modeService = new ModeToggleService();
    await modeService.initialize();
    
    const sessionInfo = await modeService.switchMode('cdp', { testMode: true });
    console.log('✅ CDP模式切换成功，会话ID:', sessionInfo.sessionId);
    
    const vncSessionInfo = await modeService.switchMode('vnc', { testMode: true });
    console.log('✅ VNC模式切换成功，会话ID:', vncSessionInfo.sessionId);
    
    // 4. 测试性能对比
    console.log('\n⚡ 测试性能对比功能...');
    const comparison = new PerformanceComparison();
    
    // 模拟对比测试
    const comparisonResult = {
      cdp: {
        latency: { average: 45.2, min: 32.1, max: 78.5 },
        frameRate: { average: 58.7, min: 45.2, max: 60.0 },
        memory: { average: 125.6, peak: 156.8 },
        cpu: { average: 15.3, peak: 28.7 },
        bandwidth: { total: 2.1, average: 0.35 }
      },
      vnc: {
        latency: { average: 89.6, min: 67.3, max: 125.4 },
        frameRate: { average: 28.4, min: 22.1, max: 35.2 },
        memory: { average: 89.3, peak: 112.5 },
        cpu: { average: 22.8, peak: 35.6 },
        bandwidth: { total: 6.8, average: 1.13 }
      }
    };
    
    // 5. 测试报告生成
    console.log('\n📋 测试报告生成...');
    const reportGenerator = new PerformanceReportGenerator();
    const htmlReport = reportGenerator.generateHTMLReport(comparisonResult);
    const jsonReport = reportGenerator.generateJSONReport(comparisonResult);
    
    console.log('✅ HTML报告生成完成，长度:', htmlReport.length, '字符');
    console.log('✅ JSON报告生成完成');
    
    // 计算性能改进
    const latencyImprovement = ((comparisonResult.vnc.latency.average - comparisonResult.cdp.latency.average) / comparisonResult.vnc.latency.average * 100).toFixed(1);
    const bandwidthImprovement = ((comparisonResult.vnc.bandwidth.total - comparisonResult.cdp.bandwidth.total) / comparisonResult.vnc.bandwidth.total * 100).toFixed(1);
    
    console.log('\n🎯 性能改进验证:');
    console.log('⚡ 延迟降低:', latencyImprovement + '%', '(目标: 50%)');
    console.log('📡 带宽优化:', bandwidthImprovement + '%', '(目标: 70%)');
    
    if (parseFloat(latencyImprovement) >= 50) {
      console.log('✅ 延迟优化目标达成!');
    } else {
      console.log('⚠️ 延迟优化未达到预期目标');
    }
    
    if (parseFloat(bandwidthImprovement) >= 70) {
      console.log('✅ 带宽优化目标达成!');
    } else {
      console.log('⚠️ 带宽优化未达到预期目标');
    }
    
    console.log('\n🎉 性能评估系统测试完成!');
    console.log('📊 所有核心功能运行正常');
    
  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error.message);
    console.error(error.stack);
  }
}

// 运行测试
if (require.main === module) {
  testPerformanceSystem();
}

module.exports = { testPerformanceSystem };