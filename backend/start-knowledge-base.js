#!/usr/bin/env node

/**
 * 知识库系统启动脚本
 * 用于快速启动和测试企业智库系统
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 启动企业智库系统...\n');

// 检查环境变量
function checkEnvironment() {
  console.log('1. 检查环境配置...');
  
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  未找到 .env 文件，请复制 env.example 并配置必要的环境变量');
    console.log('   特别是 HUGGINGFACE_API_KEY 用于文本向量化\n');
    return false;
  }
  
  console.log('✅ 环境配置文件存在\n');
  return true;
}

// 检查依赖
function checkDependencies() {
  console.log('2. 检查依赖包...');
  
  const packagePath = path.join(__dirname, 'package.json');
  if (!fs.existsSync(packagePath)) {
    console.log('❌ 未找到 package.json 文件');
    return false;
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const requiredDeps = [
    'sqlite3', 'multer', 'pdf-parse', 'mammoth', 'xlsx', 
    '@huggingface/inference', 'express', 'cors'
  ];
  
  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies[dep]);
  
  if (missingDeps.length > 0) {
    console.log(`❌ 缺少依赖包: ${missingDeps.join(', ')}`);
    console.log('请运行: npm install\n');
    return false;
  }
  
  console.log('✅ 所有依赖包已安装\n');
  return true;
}

// 创建必要的目录
function createDirectories() {
  console.log('3. 创建必要目录...');
  
  const dirs = [
    path.join(__dirname, 'storage'),
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'src/database')
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ 创建目录: ${dir}`);
    }
  });
  
  console.log('✅ 目录结构检查完成\n');
}

// 启动服务器
function startServer() {
  console.log('4. 启动服务器...');
  
  const serverProcess = spawn('node', ['src/index.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  serverProcess.on('error', (error) => {
    console.error('❌ 服务器启动失败:', error);
  });
  
  serverProcess.on('close', (code) => {
    console.log(`\n服务器已停止，退出码: ${code}`);
  });
  
  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    serverProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('\n正在关闭服务器...');
    serverProcess.kill('SIGTERM');
  });
  
  return serverProcess;
}

// 运行测试
function runTests() {
  console.log('5. 运行系统测试...');
  
  const testProcess = spawn('node', ['test-knowledge-base.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  testProcess.on('close', (code) => {
    if (code === 0) {
      console.log('✅ 系统测试通过\n');
    } else {
      console.log('❌ 系统测试失败\n');
    }
  });
  
  return testProcess;
}

// 显示使用说明
function showUsage() {
  console.log('📖 使用说明:');
  console.log('');
  console.log('API 端点:');
  console.log('  POST /api/knowledge/upload          - 上传文档');
  console.log('  GET  /api/knowledge/documents       - 获取文档列表');
  console.log('  POST /api/knowledge/retrieve        - 检索知识库');
  console.log('  POST /api/knowledge/chat            - AI对话');
  console.log('  GET  /api/knowledge/search          - 搜索文档');
  console.log('  GET  /api/knowledge/stats           - 获取统计信息');
  console.log('  GET  /api/knowledge/health          - 健康检查');
  console.log('');
  console.log('示例请求:');
  console.log('  curl -X POST http://localhost:5001/api/knowledge/health');
  console.log('  curl -X GET "http://localhost:5001/api/knowledge/documents?companyId=1"');
  console.log('');
  console.log('📝 注意: 请确保已配置 HUGGINGFACE_API_KEY 环境变量');
  console.log('');
}

// 主函数
async function main() {
  try {
    // 检查环境
    if (!checkEnvironment()) {
      process.exit(1);
    }
    
    // 检查依赖
    if (!checkDependencies()) {
      process.exit(1);
    }
    
    // 创建目录
    createDirectories();
    
    // 显示使用说明
    showUsage();
    
    // 启动服务器
    const server = startServer();
    
    // 等待服务器启动
    setTimeout(() => {
      console.log('🌐 服务器已启动，访问 http://localhost:5001');
      console.log('📊 知识库API: http://localhost:5001/api/knowledge/health');
      console.log('');
      console.log('按 Ctrl+C 停止服务器\n');
    }, 2000);
    
  } catch (error) {
    console.error('❌ 启动失败:', error);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = { main }; 