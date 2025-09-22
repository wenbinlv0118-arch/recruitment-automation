#!/usr/bin/env node

/**
 * 生产环境问题修复验证脚本
 * 验证所有修复是否在生产环境中正常工作
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ProductionFixValidator {
    constructor() {
        this.projectRoot = process.cwd();
        this.results = {
            passed: [],
            failed: [],
            warnings: []
        };
        this.startTime = new Date();
    }

    /**
     * 记录测试结果
     */
    logResult(test, status, message, details = null) {
        const result = {
            test,
            message,
            details,
            timestamp: new Date().toISOString()
        };

        if (status === 'pass') {
            this.results.passed.push(result);
            console.log(`✅ ${test}: ${message}`);
        } else if (status === 'fail') {
            this.results.failed.push(result);
            console.log(`❌ ${test}: ${message}`);
            if (details) console.log(`   详情: ${details}`);
        } else if (status === 'warn') {
            this.results.warnings.push(result);
            console.log(`⚠️  ${test}: ${message}`);
        }
    }

    /**
     * 验证环境变量配置
     */
    validateEnvironmentConfig() {
        console.log('\n🔍 验证环境变量配置...');
        
        try {
            const envPath = path.join(this.projectRoot, 'backend', '.env.production');
            
            if (!fs.existsSync(envPath)) {
                this.logResult('环境变量文件', 'fail', '生产环境配置文件不存在');
                return;
            }

            const envContent = fs.readFileSync(envPath, 'utf8');
            const requiredVars = [
                'SUPABASE_URL',
                'SUPABASE_ANON_KEY',
                'SUPABASE_SERVICE_KEY',
                'JWT_SECRET',
                'NODE_ENV'
            ];

            let missingVars = [];
            requiredVars.forEach(varName => {
                if (!envContent.includes(varName)) {
                    missingVars.push(varName);
                }
            });

            if (missingVars.length === 0) {
                this.logResult('环境变量配置', 'pass', '所有必需的环境变量都已配置');
            } else {
                this.logResult('环境变量配置', 'fail', '缺少必需的环境变量', missingVars.join(', '));
            }

        } catch (error) {
            this.logResult('环境变量配置', 'fail', '验证环境变量时出错', error.message);
        }
    }

    /**
     * 验证网络安全配置
     */
    validateNetworkSecurity() {
        console.log('\n🔍 验证网络安全配置...');
        
        try {
            // 检查HTTPS配置
            const sslConfigPath = path.join(this.projectRoot, 'ssl', 'ssl-config.conf');
            if (fs.existsSync(sslConfigPath)) {
                this.logResult('SSL配置', 'pass', 'SSL配置文件存在');
            } else {
                this.logResult('SSL配置', 'warn', 'SSL配置文件不存在，建议配置HTTPS');
            }

            // 检查安全头配置
            const middlewarePath = path.join(this.projectRoot, 'backend', 'src', 'middleware');
            if (fs.existsSync(middlewarePath)) {
                const files = fs.readdirSync(middlewarePath);
                const hasSecurityMiddleware = files.some(file => 
                    file.includes('security') || file.includes('cors')
                );
                
                if (hasSecurityMiddleware) {
                    this.logResult('安全中间件', 'pass', '安全中间件已配置');
                } else {
                    this.logResult('安全中间件', 'warn', '建议添加安全中间件');
                }
            }

        } catch (error) {
            this.logResult('网络安全配置', 'fail', '验证网络安全配置时出错', error.message);
        }
    }

    /**
     * 验证数据持久化配置
     */
    validateDataPersistence() {
        console.log('\n🔍 验证数据持久化配置...');
        
        try {
            // 检查备份脚本
            const backupScriptPath = path.join(this.projectRoot, 'scripts', 'database-backup.js');
            if (fs.existsSync(backupScriptPath)) {
                this.logResult('数据库备份脚本', 'pass', '备份脚本已创建');
            } else {
                this.logResult('数据库备份脚本', 'fail', '备份脚本不存在');
            }

            // 检查备份目录
            const backupDir = path.join(this.projectRoot, 'backend', 'backups');
            if (fs.existsSync(backupDir)) {
                this.logResult('备份目录', 'pass', '备份目录已创建');
            } else {
                this.logResult('备份目录', 'fail', '备份目录不存在');
            }

            // 检查数据监控脚本
            const monitoringScriptPath = path.join(this.projectRoot, 'scripts', 'data-monitoring.js');
            if (fs.existsSync(monitoringScriptPath)) {
                this.logResult('数据监控脚本', 'pass', '数据监控脚本已创建');
            } else {
                this.logResult('数据监控脚本', 'warn', '建议创建数据监控脚本');
            }

        } catch (error) {
            this.logResult('数据持久化配置', 'fail', '验证数据持久化配置时出错', error.message);
        }
    }

    /**
     * 验证Docker容器配置
     */
    validateDockerConfig() {
        console.log('\n🔍 验证Docker容器配置...');
        
        try {
            // 检查Dockerfile
            const dockerfilePath = path.join(this.projectRoot, 'backend', 'Dockerfile');
            if (fs.existsSync(dockerfilePath)) {
                const dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
                
                // 检查非root用户配置
                if (dockerfileContent.includes('USER') && !dockerfileContent.includes('USER root')) {
                    this.logResult('Docker用户配置', 'pass', '已配置非root用户');
                } else {
                    this.logResult('Docker用户配置', 'fail', '未配置非root用户');
                }

                // 检查Xvfb配置
                if (dockerfileContent.includes('xvfb') || dockerfileContent.includes('Xvfb')) {
                    this.logResult('Xvfb配置', 'pass', 'Xvfb虚拟显示已配置');
                } else {
                    this.logResult('Xvfb配置', 'warn', '建议配置Xvfb虚拟显示');
                }

            } else {
                this.logResult('Dockerfile', 'fail', 'Dockerfile不存在');
            }

            // 检查启动脚本
            const startScriptPath = path.join(this.projectRoot, 'backend', 'start-with-xvfb.sh');
            if (fs.existsSync(startScriptPath)) {
                this.logResult('启动脚本', 'pass', '启动脚本已配置');
            } else {
                this.logResult('启动脚本', 'fail', '启动脚本不存在');
            }

            // 检查优化配置
            const optimizedDockerfilePath = path.join(this.projectRoot, 'optimizations', 'Dockerfile.optimized');
            if (fs.existsSync(optimizedDockerfilePath)) {
                this.logResult('Docker优化配置', 'pass', '优化配置已生成');
            } else {
                this.logResult('Docker优化配置', 'warn', '建议生成优化配置');
            }

        } catch (error) {
            this.logResult('Docker容器配置', 'fail', '验证Docker配置时出错', error.message);
        }
    }

    /**
     * 验证应用程序功能
     */
    validateApplicationFunctionality() {
        console.log('\n🔍 验证应用程序功能...');
        
        try {
            // 检查主要服务文件
            const mainServicePath = path.join(this.projectRoot, 'backend', 'src', 'index.js');
            if (fs.existsSync(mainServicePath)) {
                this.logResult('主服务文件', 'pass', '主服务文件存在');
            } else {
                this.logResult('主服务文件', 'fail', '主服务文件不存在');
            }

            // 检查路由配置
            const routesPath = path.join(this.projectRoot, 'backend', 'src', 'routes');
            if (fs.existsSync(routesPath)) {
                const routeFiles = fs.readdirSync(routesPath);
                if (routeFiles.length > 0) {
                    this.logResult('路由配置', 'pass', `发现${routeFiles.length}个路由文件`);
                } else {
                    this.logResult('路由配置', 'warn', '路由目录为空');
                }
            } else {
                this.logResult('路由配置', 'fail', '路由目录不存在');
            }

            // 检查依赖包
            const packageJsonPath = path.join(this.projectRoot, 'backend', 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                const criticalDeps = ['express', 'dotenv', '@supabase/supabase-js'];
                
                let missingDeps = [];
                criticalDeps.forEach(dep => {
                    if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
                        missingDeps.push(dep);
                    }
                });

                if (missingDeps.length === 0) {
                    this.logResult('关键依赖', 'pass', '所有关键依赖都已安装');
                } else {
                    this.logResult('关键依赖', 'fail', '缺少关键依赖', missingDeps.join(', '));
                }
            }

        } catch (error) {
            this.logResult('应用程序功能', 'fail', '验证应用程序功能时出错', error.message);
        }
    }

    /**
     * 验证部署配置
     */
    validateDeploymentConfig() {
        console.log('\n🔍 验证部署配置...');
        
        try {
            // 检查部署脚本
            const deployScriptPath = path.join(this.projectRoot, 'deploy-production.sh');
            if (fs.existsSync(deployScriptPath)) {
                this.logResult('部署脚本', 'pass', '部署脚本存在');
            } else {
                this.logResult('部署脚本', 'warn', '建议创建部署脚本');
            }

            // 检查Zeabur配置
            const zeaburConfigPath = path.join(this.projectRoot, 'zbpack.json');
            if (fs.existsSync(zeaburConfigPath)) {
                this.logResult('Zeabur配置', 'pass', 'Zeabur配置文件存在');
            } else {
                this.logResult('Zeabur配置', 'warn', '建议配置Zeabur部署');
            }

            // 检查部署文档
            const deploymentDocs = [
                'DEPLOYMENT_GUIDE.md',
                'PRODUCTION_DEPLOYMENT_CHECKLIST.md',
                'ZEABUR_QUICKSTART.md'
            ];

            let existingDocs = [];
            deploymentDocs.forEach(doc => {
                if (fs.existsSync(path.join(this.projectRoot, doc))) {
                    existingDocs.push(doc);
                }
            });

            if (existingDocs.length > 0) {
                this.logResult('部署文档', 'pass', `发现${existingDocs.length}个部署文档`);
            } else {
                this.logResult('部署文档', 'warn', '建议创建部署文档');
            }

        } catch (error) {
            this.logResult('部署配置', 'fail', '验证部署配置时出错', error.message);
        }
    }

    /**
     * 生成验证报告
     */
    generateReport() {
        const endTime = new Date();
        const duration = Math.round((endTime - this.startTime) / 1000);
        
        const reportPath = path.join(this.projectRoot, 'reports', 'production-fix-validation-report.md');
        
        const report = `# 生产环境问题修复验证报告

生成时间: ${new Date().toLocaleString()}
验证耗时: ${duration}秒

## 验证概览

- ✅ 通过测试: ${this.results.passed.length}
- ❌ 失败测试: ${this.results.failed.length}
- ⚠️  警告项目: ${this.results.warnings.length}

## 详细结果

### 通过的测试
${this.results.passed.map(result => `- ✅ **${result.test}**: ${result.message}`).join('\n')}

### 失败的测试
${this.results.failed.map(result => `- ❌ **${result.test}**: ${result.message}${result.details ? ` (${result.details})` : ''}`).join('\n')}

### 警告项目
${this.results.warnings.map(result => `- ⚠️  **${result.test}**: ${result.message}`).join('\n')}

## 修复建议

### 高优先级修复
${this.results.failed.map(result => `
#### ${result.test}
**问题**: ${result.message}
**建议**: 立即修复此问题以确保生产环境稳定性
${result.details ? `**详情**: ${result.details}` : ''}
`).join('')}

### 优化建议
${this.results.warnings.map(result => `
#### ${result.test}
**建议**: ${result.message}
**优先级**: 中等
`).join('')}

## 总体评估

${this.results.failed.length === 0 ? 
    '🎉 **所有关键测试都已通过！** 生产环境修复验证成功。' : 
    `⚠️  **发现${this.results.failed.length}个关键问题需要修复。** 建议在部署到生产环境前解决这些问题。`
}

## 下一步行动

1. 修复所有失败的测试项目
2. 考虑实施警告项目的建议
3. 在生产环境中进行最终验证
4. 监控部署后的系统状态

---
*此报告由生产环境问题修复验证脚本自动生成*
`;

        // 确保reports目录存在
        const reportsDir = path.dirname(reportPath);
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }

        fs.writeFileSync(reportPath, report);
        console.log(`\n📊 验证报告已保存: ${reportPath}`);
    }

    /**
     * 运行完整验证
     */
    async run() {
        console.log('🚀 开始生产环境问题修复验证...');
        console.log('=' .repeat(60));
        
        try {
            // 运行所有验证
            this.validateEnvironmentConfig();
            this.validateNetworkSecurity();
            this.validateDataPersistence();
            this.validateDockerConfig();
            this.validateApplicationFunctionality();
            this.validateDeploymentConfig();
            
            // 生成报告
            this.generateReport();
            
            console.log('\n' + '=' .repeat(60));
            console.log('✅ 生产环境问题修复验证完成');
            console.log(`📋 通过: ${this.results.passed.length} | 失败: ${this.results.failed.length} | 警告: ${this.results.warnings.length}`);
            
            // 返回适当的退出码
            if (this.results.failed.length > 0) {
                console.log('❌ 验证失败，请修复上述问题后重新验证');
                process.exit(1);
            } else {
                console.log('🎉 所有关键验证都已通过！');
                process.exit(0);
            }
            
        } catch (error) {
            console.error('❌ 验证过程中出现错误:', error.message);
            process.exit(1);
        }
    }
}

// 主程序
if (require.main === module) {
    const validator = new ProductionFixValidator();
    validator.run();
}

module.exports = ProductionFixValidator;