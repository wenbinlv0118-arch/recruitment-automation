#!/usr/bin/env node

/**
 * 生产环境配置验证脚本
 * 验证所有必要的环境变量和配置文件是否正确设置
 */

const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// 必需的环境变量
const requiredEnvVars = {
    backend: [
        'NODE_ENV',
        'PORT',
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_KEY',
        'JWT_SECRET',
        'CORS_ORIGIN',
        'BROWSER_HEADLESS',
        'DISPLAY',
        'XVFB_WHD'
    ],
    frontend: [
        'REACT_APP_API_BASE_URL',
        'REACT_APP_API_URL',
        'REACT_APP_SOCKET_URL',
        'REACT_APP_SUPABASE_URL'
    ]
};

// 检查配置文件
function checkConfigFile(filePath, description) {
    log(`\n检查 ${description}...`, 'blue');
    
    if (!fs.existsSync(filePath)) {
        log(`❌ 文件不存在: ${filePath}`, 'red');
        return false;
    }
    
    log(`✅ 文件存在: ${filePath}`, 'green');
    
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        
        log(`   包含 ${lines.length} 个配置项`, 'blue');
        
        // 检查是否包含浏览器配置
        const hasBrowserConfig = content.includes('BROWSER_HEADLESS') || 
                               content.includes('DISPLAY') || 
                               content.includes('XVFB_WHD');
        
        if (filePath.includes('backend') && hasBrowserConfig) {
            log(`   ✅ 包含浏览器配置`, 'green');
        } else if (filePath.includes('backend')) {
            log(`   ⚠️  缺少浏览器配置`, 'yellow');
        }
        
        return true;
    } catch (error) {
        log(`❌ 读取文件失败: ${error.message}`, 'red');
        return false;
    }
}

// 检查Docker配置
function checkDockerConfig() {
    log(`\n检查 Docker 配置...`, 'blue');
    
    const dockerfilePath = path.join(__dirname, 'backend', 'Dockerfile');
    const startScriptPath = path.join(__dirname, 'backend', 'start-with-xvfb.sh');
    
    let allGood = true;
    
    // 检查 Dockerfile
    if (fs.existsSync(dockerfilePath)) {
        const dockerContent = fs.readFileSync(dockerfilePath, 'utf8');
        
        if (dockerContent.includes('xvfb')) {
            log(`   ✅ Dockerfile 包含 Xvfb 支持`, 'green');
        } else {
            log(`   ❌ Dockerfile 缺少 Xvfb 支持`, 'red');
            allGood = false;
        }
        
        if (dockerContent.includes('BROWSER_HEADLESS')) {
            log(`   ✅ Dockerfile 包含浏览器环境变量`, 'green');
        } else {
            log(`   ❌ Dockerfile 缺少浏览器环境变量`, 'red');
            allGood = false;
        }
        
        if (dockerContent.includes('start-with-xvfb.sh')) {
            log(`   ✅ Dockerfile 使用 Xvfb 启动脚本`, 'green');
        } else {
            log(`   ❌ Dockerfile 未使用 Xvfb 启动脚本`, 'red');
            allGood = false;
        }
    } else {
        log(`   ❌ Dockerfile 不存在`, 'red');
        allGood = false;
    }
    
    // 检查启动脚本
    if (fs.existsSync(startScriptPath)) {
        log(`   ✅ Xvfb 启动脚本存在`, 'green');
        
        // 检查脚本权限
        try {
            const stats = fs.statSync(startScriptPath);
            const isExecutable = !!(stats.mode & parseInt('111', 8));
            
            if (isExecutable) {
                log(`   ✅ 启动脚本具有执行权限`, 'green');
            } else {
                log(`   ⚠️  启动脚本缺少执行权限`, 'yellow');
            }
        } catch (error) {
            log(`   ⚠️  无法检查脚本权限: ${error.message}`, 'yellow');
        }
    } else {
        log(`   ❌ Xvfb 启动脚本不存在`, 'red');
        allGood = false;
    }
    
    return allGood;
}

// 检查 Zeabur 配置
function checkZeaburConfig() {
    log(`\n检查 Zeabur 配置...`, 'blue');
    
    const zbpackPath = path.join(__dirname, 'zbpack.json');
    
    if (!fs.existsSync(zbpackPath)) {
        log(`   ❌ zbpack.json 不存在`, 'red');
        return false;
    }
    
    try {
        const zbpackContent = JSON.parse(fs.readFileSync(zbpackPath, 'utf8'));
        
        if (zbpackContent.services && zbpackContent.services.backend) {
            const backendConfig = zbpackContent.services.backend;
            
            if (backendConfig.env && backendConfig.env.BROWSER_HEADLESS) {
                log(`   ✅ zbpack.json 包含后端浏览器配置`, 'green');
            } else {
                log(`   ❌ zbpack.json 缺少后端浏览器配置`, 'red');
                return false;
            }
        } else {
            log(`   ❌ zbpack.json 缺少后端服务配置`, 'red');
            return false;
        }
        
        return true;
    } catch (error) {
        log(`   ❌ zbpack.json 格式错误: ${error.message}`, 'red');
        return false;
    }
}

// 主验证函数
function main() {
    log('🔍 开始验证生产环境配置...', 'blue');
    
    let allChecksPass = true;
    
    // 检查配置文件
    const configFiles = [
        {
            path: path.join(__dirname, 'backend', '.env.production'),
            description: '后端生产环境配置'
        },
        {
            path: path.join(__dirname, 'frontend', '.env.production'),
            description: '前端生产环境配置'
        },
        {
            path: path.join(__dirname, 'deploy', 'config', '.env.zeabur'),
            description: 'Zeabur 部署配置'
        }
    ];
    
    configFiles.forEach(config => {
        if (!checkConfigFile(config.path, config.description)) {
            allChecksPass = false;
        }
    });
    
    // 检查 Docker 配置
    if (!checkDockerConfig()) {
        allChecksPass = false;
    }
    
    // 检查 Zeabur 配置
    if (!checkZeaburConfig()) {
        allChecksPass = false;
    }
    
    // 输出结果
    log('\n' + '='.repeat(50), 'blue');
    
    if (allChecksPass) {
        log('🎉 所有生产环境配置检查通过！', 'green');
        log('✅ 可以安全部署到生产环境', 'green');
        process.exit(0);
    } else {
        log('❌ 生产环境配置检查失败！', 'red');
        log('⚠️  请修复上述问题后再部署', 'yellow');
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = { main, checkConfigFile, checkDockerConfig, checkZeaburConfig };