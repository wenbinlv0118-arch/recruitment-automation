// 测试简历库修复
const testResumeLibraryFix = async () => {
  console.log('🧪 开始测试简历库修复...\n');

  try {
    // 1. 测试获取岗位数据
    console.log('1. 测试获取岗位数据...');
    const positionsResponse = await fetch('/api/positions');
    const positionsResult = await positionsResponse.json();
    
    if (positionsResult.success) {
      console.log('✅ 岗位数据获取成功');
      console.log(`   返回格式: { success: true, data: [...] }`);
      console.log(`   岗位数量: ${positionsResult.data.length}`);
    } else {
      console.log('❌ 岗位数据获取失败:', positionsResult.error);
    }

    // 2. 测试获取简历数据
    console.log('\n2. 测试获取简历数据...');
    const resumesResponse = await fetch('/api/resume-library');
    const resumesResult = await resumesResponse.json();
    
    if (resumesResult.success) {
      console.log('✅ 简历数据获取成功');
      console.log(`   返回格式: { success: true, data: [...] }`);
      console.log(`   简历数量: ${resumesResult.data.length}`);
      
      // 检查简历数据结构
      if (resumesResult.data.length > 0) {
        const sampleResume = resumesResult.data[0];
        console.log('\n   样本简历数据结构:');
        console.log(`   - id: ${sampleResume.id}`);
        console.log(`   - name: ${sampleResume.name}`);
        console.log(`   - skills: ${Array.isArray(sampleResume.skills) ? '数组' : '非数组'}`);
        console.log(`   - workExperience: ${Array.isArray(sampleResume.workExperience) ? '数组' : '非数组'}`);
        console.log(`   - educationDetails: ${Array.isArray(sampleResume.educationDetails) ? '数组' : '非数组'}`);
        console.log(`   - scores: ${Array.isArray(sampleResume.scores) ? '数组' : '非数组'}`);
        console.log(`   - updatedAt: ${sampleResume.updatedAt || '不存在'}`);
      }
    } else {
      console.log('❌ 简历数据获取失败:', resumesResult.error);
    }

    // 3. 测试前端页面访问
    console.log('\n3. 测试前端页面访问...');
    const pageResponse = await fetch('/');
    if (pageResponse.ok) {
      console.log('✅ 前端页面访问成功');
    } else {
      console.log('❌ 前端页面访问失败:', pageResponse.status);
    }

    console.log('\n🎉 简历库修复测试完成！');
    console.log('\n💡 如果所有测试都通过，说明修复成功。');
    console.log('   现在可以尝试点击简历列表，应该不会再报错了。');

  } catch (error) {
    console.error('❌ 测试过程中出现错误:', error);
  }
};

// 运行测试
testResumeLibraryFix(); 