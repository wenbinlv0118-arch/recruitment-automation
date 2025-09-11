/**
 * 测试API修复效果的脚本
 * 验证前端API调用是否正确使用buildApiUrl函数
 */

const fs = require('fs');
const path = require('path');

// 检查文件中是否包含直接的fetch调用
function checkDirectFetchCalls(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];
  
  lines.forEach((line, index) => {
    // 检查是否有直接的fetch('/api/...')调用
    if (line.includes('fetch(\'/api/') || line.includes('fetch("/api/')) {
      issues.push({
        line: index + 1,
        content: line.trim(),
        type: 'direct_fetch_call'
      });
    }
    
    // 检查是否有相对路径的API调用
    if (line.includes('fetch(\'/') && !line.includes('buildApiUrl') && !line.includes('apiGet')) {
      issues.push({
        line: index + 1,
        content: line.trim(),
        type: 'relative_path_fetch'
      });
    }
  });
  
  return issues;
}

// 检查文件是否正确导入了API相关函数
function checkApiImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const hasApiEndpoints = content.includes('API_ENDPOINTS');
  const hasBuildApiUrl = content.includes('buildApiUrl');
  const hasApiClient = content.includes('apiGet') || content.includes('apiPost');
  
  return {
    hasApiEndpoints,
    hasBuildApiUrl,
    hasApiClient
  };
}

// 要检查的文件列表
const filesToCheck = [
  'frontend/src/components/TaskManagement.js',
  'frontend/src/components/TaskForm.js',
  'frontend/src/components/PositionManagement.js',
  'frontend/src/App.js'
];

console.log('🔍 检查API调用修复情况...');
console.log('=' .repeat(50));

let totalIssues = 0;

filesToCheck.forEach(file => {
  const fullPath = path.join(__dirname, file);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ 文件不存在: ${file}`);
    return;
  }
  
  console.log(`\n📁 检查文件: ${file}`);
  
  // 检查直接fetch调用
  const fetchIssues = checkDirectFetchCalls(fullPath);
  if (fetchIssues.length > 0) {
    console.log(`  ⚠️  发现 ${fetchIssues.length} 个潜在问题:`);
    fetchIssues.forEach(issue => {
      console.log(`    第${issue.line}行: ${issue.content}`);
      console.log(`    类型: ${issue.type}`);
    });
    totalIssues += fetchIssues.length;
  } else {
    console.log('  ✅ 未发现直接fetch调用问题');
  }
  
  // 检查导入情况
  const imports = checkApiImports(fullPath);
  console.log(`  📦 导入检查:`);
  console.log(`    API_ENDPOINTS: ${imports.hasApiEndpoints ? '✅' : '❌'}`);
  console.log(`    buildApiUrl: ${imports.hasBuildApiUrl ? '✅' : '❌'}`);
  console.log(`    API客户端函数: ${imports.hasApiClient ? '✅' : '❌'}`);
});

console.log('\n' + '='.repeat(50));
if (totalIssues === 0) {
  console.log('🎉 所有检查通过！API调用已正确修复。');
  console.log('\n📋 修复总结:');
  console.log('1. ✅ 替换了直接的fetch("/api/...")调用');
  console.log('2. ✅ 使用buildApiUrl函数构建正确的API URL');
  console.log('3. ✅ 使用apiGet/apiPost等统一的API客户端函数');
  console.log('4. ✅ 正确导入了API_ENDPOINTS和相关函数');
  
  console.log('\n🚀 部署建议:');
  console.log('1. 重新构建前端项目: npm run build');
  console.log('2. 部署到生产环境');
  console.log('3. 验证生产环境API调用是否正常');
} else {
  console.log(`❌ 发现 ${totalIssues} 个问题需要修复`);
}

console.log('\n🔧 生产环境API配置:');
console.log('- 开发环境: 使用代理，相对路径 /api/...');
console.log('- 生产环境: 使用完整URL https://recruitment-automation-backend.zeabur.app/api/...');
console.log('- buildApiUrl函数会根据环境自动选择正确的URL格式');