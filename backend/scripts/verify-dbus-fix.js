#!/usr/bin/env node

/**
 * D-Bus修复验证脚本
 * 验证所有D-Bus禁用配置是否正确生效
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// 验证结果收集器
class VerificationResults {
    constructor() {
        this.results = [];
        this.errors = [];
        this.warnings = [];
    }

    addResult(category, test, status, message) {
        this.results.push({ category, test, status, message, timestamp: new Date() });
        
        if (status === 'FAIL') {
            this.errors.push({ test, message });
        } else if (status === 'WARN') {
            this.warnings.push({ test, message });
        }
    }

    generateReport() {
        console.log('\n=== D-Bus修复验证报告 ===');
        console.log(`验证时间: ${new Date().toLocaleString()}`);
        console.log(`总测试数: ${this.results.length}`);
        console.log(`错误数: ${this.errors.length}`);
        console.log(`警告数: ${this.warnings.length}`);
        
        console.log('\n=== 详细结果 ===');
        let currentCategory = '';
        
        this.results.forEach(result => {
            if (result.category !== currentCategory) {
                console.log(`\n--- ${result.category} ---`);
                currentCategory = result.category;
            }
            
            const icon = result.status === 'PASS' ? '✅' : 
                        result.status === 'WARN' ? '⚠️' : '❌';
            console.log(`${icon} ${result.test}: ${result.message}`);
        });
        
        if (this.errors.length > 0) {
            console.log('\n=== 需要修复的错误 ===');
            this.errors.forEach(error => {
                console.log(`❌ ${error.test}: ${error.message}`);
            });
        }
        
        if (this.warnings.length > 0) {
            console.log('\n=== 警告信息 ===');
            this.warnings.forEach(warning => {
                console.log(`⚠️ ${warning.test}: ${warning.message}`);
            });
        }
        
        console.log('\n=== 验证总结 ===');
        if (this.errors.length === 0) {
            console.log('🎉 所有关键测试通过！D-Bus修复配置正确。');
        } else {
            console.log('🚨 发现关键错误，需要进一步修复。');
        }
        
        return this.errors.length === 0;
    }
}

// 验证器类
class DBusFixVerifier {
    constructor() {
        this.results = new VerificationResults();
    }

    /**
     * 验证环境变量配置
     */
    verifyEnvironmentVariables() {
        const requiredVars = {
            'DBUS_SESSION_BUS_ADDRESS': '',
            'DBUS_SYSTEM_BUS_ADDRESS': '',
            'NO_DBUS': '1',
            'DISABLE_DBUS': '1',
            'NO_AT_BRIDGE': '1',
            'GSETTINGS_BACKEND': 'memory',
            'GDK_BACKEND': 'x11'
        };

        Object.entries(requiredVars).forEach(([varName, expectedValue]) => {
            const actualValue = process.env[varName];
            
            if (expectedValue === '' && actualValue === '') {
                this.results.addResult('环境变量', varName, 'PASS', '正确设置为空字符串');
            } else if (actualValue === expectedValue) {
                this.results.addResult('环境变量', varName, 'PASS', `正确设置为: ${actualValue}`);
            } else if (actualValue === undefined) {
                this.results.addResult('环境变量', varName, 'WARN', '未设置，但可能在运行时设置');
            } else {
                this.results.addResult('环境变量', varName, 'FAIL', `期望: ${expectedValue}, 实际: ${actualValue}`);
            }
        });
    }

    /**
     * 验证配置文件
     */
    verifyConfigFiles() {
        const configFiles = [
            '.env.production',
            'start-with-xvfb.sh',
            'src/config/environmentConfig.js'
        ];

        configFiles.forEach(file => {
            const filePath = path.join(__dirname, '..', file);
            
            if (fs.existsSync(filePath)) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    
                    // 检查关键D-Bus禁用配置
                    const checks = [
                        { pattern: /DBUS_SESSION_BUS_ADDRESS.*=""/, name: 'Session Bus Address' },
                        { pattern: /DBUS_SYSTEM_BUS_ADDRESS.*=""/, name: 'System Bus Address' },
                        { pattern: /NO_DBUS.*=.*1/, name: 'NO_DBUS Flag' },
                        { pattern: /--disable-dbus/, name: 'Browser Disable D-Bus' }
                    ];
                    
                    checks.forEach(check => {
                        if (check.pattern.test(content)) {
                            this.results.addResult('配置文件', `${file} - ${check.name}`, 'PASS', '配置正确');
                        } else {
                            this.results.addResult('配置文件', `${file} - ${check.name}`, 'WARN', '未找到相关配置');
                        }
                    });
                    
                } catch (error) {
                    this.results.addResult('配置文件', file, 'FAIL', `读取失败: ${error.message}`);
                }
            } else {
                this.results.addResult('配置文件', file, 'WARN', '文件不存在');
            }
        });
    }

    /**
     * 验证浏览器启动参数
     */
    async verifyBrowserConfig() {
        try {
            // 动态导入配置文件
            const configPath = path.join(__dirname, '..', 'src', 'config', 'environmentConfig.js');
            
            if (fs.existsSync(configPath)) {
                delete require.cache[require.resolve(configPath)];
                const config = require(configPath);
                
                if (config.environmentConfig && config.environmentConfig.getBrowserArgs) {
                    const args = config.environmentConfig.getBrowserArgs();
                    
                    const requiredArgs = [
                        '--no-dbus',
                        '--disable-dbus',
                        '--disable-system-dbus',
                        '--disable-desktop-notifications'
                    ];
                    
                    requiredArgs.forEach(arg => {
                        if (args.includes(arg)) {
                            this.results.addResult('浏览器配置', arg, 'PASS', '参数已配置');
                        } else {
                            this.results.addResult('浏览器配置', arg, 'FAIL', '缺少关键参数');
                        }
                    });
                } else {
                    this.results.addResult('浏览器配置', 'getBrowserArgs', 'FAIL', '函数不存在');
                }
            } else {
                this.results.addResult('浏览器配置', 'environmentConfig.js', 'FAIL', '配置文件不存在');
            }
        } catch (error) {
            this.results.addResult('浏览器配置', '配置加载', 'FAIL', `加载失败: ${error.message}`);
        }
    }

    /**
     * 验证Dockerfile配置
     */
    verifyDockerfile() {
        const dockerfilePath = path.join(__dirname, '..', 'Dockerfile');
        
        if (fs.existsSync(dockerfilePath)) {
            try {
                const content = fs.readFileSync(dockerfilePath, 'utf8');
                
                const checks = [
                    { pattern: /ENV DBUS_SESSION_BUS_ADDRESS=""/, name: 'Docker Session Bus' },
                    { pattern: /ENV DBUS_SYSTEM_BUS_ADDRESS=""/, name: 'Docker System Bus' },
                    { pattern: /ENV NO_DBUS=1/, name: 'Docker NO_DBUS' },
                    { pattern: /systemctl disable dbus/, name: 'Systemctl Disable' },
                    { pattern: /mkdir -p \/run\/dbus/, name: 'Virtual Socket Creation' }
                ];
                
                checks.forEach(check => {
                    if (check.pattern.test(content)) {
                        this.results.addResult('Dockerfile', check.name, 'PASS', '配置正确');
                    } else {
                        this.results.addResult('Dockerfile', check.name, 'FAIL', '配置缺失');
                    }
                });
                
            } catch (error) {
                this.results.addResult('Dockerfile', '读取', 'FAIL', `读取失败: ${error.message}`);
            }
        } else {
            this.results.addResult('Dockerfile', '存在性', 'FAIL', 'Dockerfile不存在');
        }
    }

    /**
     * 运行所有验证
     */
    async runAllVerifications() {
        console.log('🔍 开始D-Bus修复验证...');
        
        this.verifyEnvironmentVariables();
        this.verifyConfigFiles();
        await this.verifyBrowserConfig();
        this.verifyDockerfile();
        
        return this.results.generateReport();
    }
}

// 主函数
async function main() {
    try {
        const verifier = new DBusFixVerifier();
        const success = await verifier.runAllVerifications();
        
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('❌ 验证过程中发生错误:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = { DBusFixVerifier, VerificationResults };