// 使用Node.js 18+内置的fetch API

/**
 * 测试简历解析API的功能
 */
async function testResumeParser() {
    const testText = `许先生Tommy
36岁
10年以上
本科
离职-随时到岗
1. 10年以上丰富专业的售前解决方案技术支持的经验和沉淀。
2.项目经验丰富，擅长：方案撰写能力、与客户深入沟通达成共识、问题的及时应变处理。
3.超强抗压力，坚持韧性。
4.目标感强。
5.人格高尚值得信任诚信可靠：坚持诚实守信的原则，具备高尚的道德标准底线。
6. 快速应对解决问题能力强。
7. 严格执行领导要求和任务，使命必达。
8.  擅长共情沟通表达，商务谈判能力。
9. 心态自信积极乐观 。
10.  独立思考创新思维 。
11. 具备良好的跨部门的管理组织协调和统筹能力。
12. 应变能力敏捷反应强：随机应变处理各种突然特殊问题。
13. 超强学习力
14. 具备风险预判和管理能力。
最近关注
深圳
渠道销售
行业不限
11-22K
牛人最近7天沟通过的职位
岗位经验
售前技术支持 11年7个月
客户经理 1年1个月
工作经历
英迈思信息技术有限公司
解决方案经理
2022.04 - 2025.07
定制化开发各种软件系统，远程控制协同各种iot物联网智能硬件产品和智能体（智能马桶，智能音箱，特定功能机器人，智能扫拖洗一体机，无人机，医疗设备，等。）
软件系统包括各种APP，各种saas包括 ERP OA CRM 等企业管理系统，企业网站，小程序，等 。
云测信息技术有限公司
售前解决方案经理
2019.03 - 2022.04
教育经历
京安学院
计算机应用技术
本科
2007 - 2011
资格证书
CISSP信息系统安全专业认证`;

    try {
        console.log('正在测试简历解析API...');
        console.log('API地址: http://localhost:5001/api/resume-library/parse-text');
        console.log('测试文本长度:', testText.length);
        
        const response = await fetch('http://localhost:5001/api/resume-library/parse-text', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ text: testText })
        });

        console.log('响应状态:', response.status);
        console.log('响应头:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.log('错误响应内容:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('原始响应结果:', JSON.stringify(result, null, 2));
        
        // 提取实际的解析数据
        const parseData = result.success ? result.data : result;
        
        console.log('\n=== 解析结果 ===');
        console.log('姓名:', parseData.name || '未识别');
        console.log('年龄:', parseData.age || '未识别');
        console.log('电话:', parseData.phone || '未识别');
        console.log('邮箱:', parseData.email || '未识别');
        console.log('职位:', parseData.position || '未识别');
        console.log('经验:', parseData.experience || '未识别');
        console.log('教育:', parseData.education || '未识别');
        console.log('技能:', Array.isArray(parseData.skills) ? parseData.skills.join(', ') : (parseData.skills || '未识别'));
        console.log('质量得分:', parseData.qualityScore || 0);
        
        console.log('\n=== 分析问题 ===');
        analyzeResults(parseData, testText);
        
    } catch (error) {
        console.error('测试失败:', error.message);
    }
}

/**
 * 分析解析结果的问题
 */
function analyzeResults(result, originalText) {
    const issues = [];
    
    // 检查姓名识别
    if (!result.name || result.name === '未识别') {
        issues.push('姓名识别失败 - 应该识别出"许先生Tommy"');
    }
    
    // 检查年龄识别
    if (!originalText.includes('36岁') || !result.name?.includes('36')) {
        issues.push('年龄信息未被正确提取 - 应该识别出"36岁"');
    }
    
    // 检查工作经验
    if (!result.experience || !result.experience.includes('10年')) {
        issues.push('工作经验识别不准确 - 应该识别出"10年以上"');
    }
    
    // 检查教育背景
    if (!result.education || !result.education.includes('本科')) {
        issues.push('教育背景识别不准确 - 应该识别出"本科"和"京安学院"');
    }
    
    // 检查职位信息
    if (!result.position || !result.position.includes('售前')) {
        issues.push('职位信息识别不准确 - 应该识别出"售前技术支持"或"解决方案经理"');
    }
    
    if (issues.length === 0) {
        console.log('✅ 解析结果良好，没有发现明显问题');
    } else {
        console.log('❌ 发现以下问题:');
        issues.forEach((issue, index) => {
            console.log(`${index + 1}. ${issue}`);
        });
    }
}

// 运行测试
testResumeParser();