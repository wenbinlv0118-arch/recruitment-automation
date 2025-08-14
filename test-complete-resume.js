// 使用Node.js 18+内置的fetch API

/**
 * 测试完整简历解析API的功能（包含电话和邮箱）
 */
async function testCompleteResumeParser() {
    // 完整的测试简历文本（包含电话和邮箱）
    const completeTestText = `许先生Tommy
联系电话：13800138000
邮箱：tommy.xu@example.com
36岁
10年以上
本科
离职-随时到岗

个人优势：
1. 10年以上丰富专业的售前解决方案技术支持的经验和沉淀。
2. 项目经验丰富，擅长：方案撰写能力、与客户深入沟通达成共识、问题的及时应变处理。
3. 超强抗压力，坚持韧性。
4. 目标感强。
5. 人格高尚值得信任诚信可靠：坚持诚实守信的原则，具备高尚的道德标准底线。

岗位经验：
售前技术支持 11年7个月
客户经理 1年1个月

工作经历：
英迈思信息技术有限公司
解决方案经理
2022.04 - 2025.07
定制化开发各种软件系统，远程控制协同各种iot物联网智能硬件产品和智能体。
软件系统包括各种APP，各种saas包括 ERP OA CRM 等企业管理系统，企业网站，小程序等。

教育经历：
京安学院
计算机应用技术
本科
2007 - 2011

专业技能：
- 方案撰写能力
- 客户沟通与需求分析
- 项目管理与风险控制
- 技术支持与问题解决
- 商务谈判与合同签署
- 跨部门协调与团队管理`;

    try {
        console.log('正在测试完整简历解析API...');
        console.log('API地址: http://localhost:5001/api/resume-library/parse-text');
        console.log('测试文本长度:', completeTestText.length);
        
        const response = await fetch('http://localhost:5001/api/resume-library/parse-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: completeTestText })
        });

        console.log('响应状态:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.log('错误响应内容:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('原始响应结果:', JSON.stringify(result, null, 2));
        
        // 提取实际的解析数据
        const parseData = result.success ? result.data : result;
        
        console.log('\n=== 完整简历解析结果 ===');
        console.log('姓名:', parseData.name || '未识别');
        console.log('年龄:', parseData.age || '未识别');
        console.log('电话:', parseData.phone || '未识别');
        console.log('邮箱:', parseData.email || '未识别');
        console.log('职位:', parseData.position || '未识别');
        console.log('经验:', parseData.experience || '未识别');
        console.log('教育:', parseData.education || '未识别');
        console.log('技能:', Array.isArray(parseData.skills) ? parseData.skills.join(', ') : (parseData.skills || '未识别'));
        console.log('质量得分:', parseData.qualityScore || 0);
        
        console.log('\n=== 解析效果评估 ===');
        evaluateParsingResults(parseData);
        
    } catch (error) {
        console.error('测试失败:', error.message);
    }
}

/**
 * 评估解析结果的准确性
 * @param {Object} parseData - 解析后的数据
 */
function evaluateParsingResults(parseData) {
    const expectedResults = {
        name: '许先生Tommy',
        age: '36岁',
        phone: '13800138000',
        email: 'tommy.xu@example.com',
        position: '解决方案经理',
        experience: '10年以上',
        education: '本科'
    };
    
    let correctCount = 0;
    let totalCount = Object.keys(expectedResults).length;
    
    console.log('\n字段识别准确性检查:');
    
    for (const [field, expected] of Object.entries(expectedResults)) {
        const actual = parseData[field];
        const isCorrect = actual && (actual.includes(expected) || expected.includes(actual));
        
        if (isCorrect) {
            console.log(`✅ ${field}: 识别正确 (${actual})`);
            correctCount++;
        } else {
            console.log(`❌ ${field}: 识别错误 - 期望: ${expected}, 实际: ${actual || '未识别'}`);
        }
    }
    
    // 技能检查
    const expectedSkills = ['方案撰写', '客户沟通', '项目管理', '技术支持', '商务谈判'];
    const actualSkills = parseData.skills || [];
    const skillsFound = expectedSkills.filter(skill => 
        actualSkills.some(actualSkill => actualSkill.includes(skill))
    );
    
    console.log(`\n技能识别情况: 识别到 ${skillsFound.length}/${expectedSkills.length} 个预期技能`);
    console.log('识别到的技能:', skillsFound.join(', '));
    
    const accuracy = (correctCount / totalCount * 100).toFixed(1);
    console.log(`\n总体识别准确率: ${accuracy}% (${correctCount}/${totalCount})`);
    console.log(`质量得分: ${parseData.qualityScore}/100`);
    
    if (accuracy >= 80) {
        console.log('🎉 解析效果优秀！');
    } else if (accuracy >= 60) {
        console.log('👍 解析效果良好，还有提升空间');
    } else {
        console.log('⚠️  解析效果需要改进');
    }
}

// 运行测试
testCompleteResumeParser();