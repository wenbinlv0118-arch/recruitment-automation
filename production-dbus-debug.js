#!/usr/bin/env node

/**
 * 生产环境D-Bus错误深度诊断脚本
 * 用于分析为什么配置了环境变量但D-Bus错误仍然出现
 */

const fs = require('fs');
const path = require('path');

class ProductionDBusDebugger {
    constructor() {
        this.requiredEnvVars = [
            'DISABLE_DBUS',
            'DISABLE_DEV_SHM_USAGE',
            'NO_SANDBOX',
            'DISABLE_GPU',
            'ENABLE_LOG_FILTER',
            'NODE_ENV',
            'BROWSER_HEADLESS'
        ];
        
        this.dbusRelatedPatterns = [
            /dbus/i,
            /bluez/i,
            /bluetooth/i,
            /system_bus_socket/i
        ];
    }

    /**
     * 检查当前环境变量配置
     */
    checkEnvironmentVariables() {
        console.log('🔍 检查环境变量配置...\n');
        
        const results = {
            missing: [],
            incorrect: [],
            correct: []
        };

        this.requiredEnvVars.forEach(varName => {
            const value = process.env[varName];
            if (value === undefined) {
                results.missing.push(varName);
            } else if (this.validateEnvVar(varName, value)) {
                results.correct.push({ name: varName, value });
            } else {
                results.incorrect.push({ name: varName, value });
            }
        });

        return results;
    }

    /**
     * 验证环境变量的值是否正确
     */
    validateEnvVar(name, value) {
        switch (name) {
            case 'DISABLE_DBUS':
            case 'DISABLE_DEV_SHM_USAGE':
            case 'NO_SANDBOX':
            case 'DISABLE_GPU':
            case 'ENABLE_LOG_FILTER':
                return value === '1' || value === 'true';
            case 'NODE_ENV':
                return value === 'production';
            case 'BROWSER_HEADLESS':
                return value === 'true';
            default:
                return true;
        }
    }

    /**
     * 分析日志中的D-Bus错误模式
     */
    analyzeLogPatterns(logContent) {
        console.log('📊 分析D-Bus错误模式...\n');
        
        const errors = [];
        const lines = logContent.split('\n');
        
        lines.forEach((line, index) => {
            this.dbusRelatedPatterns.forEach(pattern => {
                if (pattern.test(line)) {
                    errors.push({
                        line: index + 1,
                        content: line.trim(),
                        type: this.categorizeError(line)
                    });
                }
            });
        });

        return errors;
    }

    /**
     * 分类错误类型
     */
    categorizeError(line) {
        if (line.includes('system_bus_socket')) return 'socket_connection';
        if (line.includes('bluez')) return 'bluetooth_service';
        if (line.includes('dbus/bus.cc')) return 'dbus_connection';
        return 'general';
    }

    /**
     * 检查代码中可能的D-Bus依赖
     */
    checkCodeDependencies() {
        console.log('🔎 检查代码中的D-Bus依赖...\n');
        
        const serviceFiles = [
            'zhilianService.js',
            'browser.js',
            'puppeteer-config.js'
        ];

        const dependencies = [];

        serviceFiles.forEach(file => {
            const filePath = path.join(__dirname, 'backend', file);
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                
                // 检查可能的D-Bus触发点
                if (content.includes('puppeteer.launch')) {
                    const matches = content.match(/puppeteer\.launch\([^)]*\)/g);
                    if (matches) {
                        dependencies.push({
                            file,
                            type: 'puppeteer_launch',
                            details: matches
                        });
                    }
                }

                // 检查Chrome参数
                if (content.includes('--no-sandbox') || content.includes('--disable-dev-shm-usage')) {
                    dependencies.push({
                        file,
                        type: 'chrome_args',
                        details: 'Found Chrome arguments'
                    });
                }
            }
        });

        return dependencies;
    }

    /**
     * 生成Zeabur特定的配置检查
     */
    generateZeaburConfig() {
        return {
            platform: 'zeabur',
            requiredVariables: {
                'DISABLE_DBUS': '1',
                'DISABLE_DEV_SHM_USAGE': '1',
                'NO_SANDBOX': '1',
                'DISABLE_GPU': '1',
                'ENABLE_LOG_FILTER': '1',
                'NODE_ENV': 'production',
                'BROWSER_HEADLESS': 'true'
            },
            forbiddenVariables: [
                'DISPLAY',
                'XVFB_WHD',
                'DBUS_SESSION_BUS_ADDRESS'
            ],
            deploymentSteps: [
                '登录Zeabur控制台',
                '进入项目环境变量设置',
                '添加所有必需的环境变量',
                '移除所有禁止的环境变量',
                '重新部署服务',
                '检查部署日志'
            ]
        };
    }

    /**
     * 生成修复建议
     */
    generateFixes(envResults, dependencies) {
        const fixes = [];

        if (envResults.missing.length > 0) {
            fixes.push({
                type: 'missing_env_vars',
                description: `缺失环境变量: ${envResults.missing.join(', ')}`,
                action: '立即在Zeabur控制台添加这些环境变量'
            });
        }

        if (envResults.incorrect.length > 0) {
            fixes.push({
                type: 'incorrect_env_vars',
                description: `配置错误的环境变量: ${envResults.incorrect.map(i => `${i.name}=${i.value}`).join(', ')}`,
                action: '修正这些环境变量的值'
            });
        }

        // 检查是否需要强制Chrome参数
        dependencies.forEach(dep => {
            if (dep.type === 'puppeteer_launch') {
                fixes.push({
                    type: 'chrome_args',
                    description: 'Puppeteer启动配置可能需要强制添加Chrome参数',
                    action: '确保在代码中强制添加--no-sandbox和--disable-dev-shm-usage参数'
                });
            }
        });

        return fixes;
    }

    /**
     * 运行完整诊断
     */
    async runFullDiagnosis() {
        console.log('🚀 开始生产环境D-Bus错误深度诊断\n');
        console.log('='.repeat(60));

        const envResults = this.checkEnvironmentVariables();
        const dependencies = this.checkCodeDependencies();
        const zeaburConfig = this.generateZeaburConfig();
        const fixes = this.generateFixes(envResults, dependencies);

        // 输出诊断结果
        console.log('📋 诊断结果:');
        console.log('环境变量检查结果:', JSON.stringify(envResults, null, 2));
        console.log('\n代码依赖检查:', JSON.stringify(dependencies, null, 2));
        console.log('\nZeabur配置:', JSON.stringify(zeaburConfig, null, 2));
        console.log('\n修复建议:', JSON.stringify(fixes, null, 2));

        // 生成配置文件
        this.generateEnvironmentFile(zeaburConfig.requiredVariables);
        this.generateDeploymentGuide(fixes);

        return {
            envResults,
            dependencies,
            zeaburConfig,
            fixes
        };
    }

    /**
     * 生成环境变量配置文件
     */
    generateEnvironmentFile(variables) {
        const content = Object.entries(variables)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        fs.writeFileSync(
            path.join(__dirname, 'zeabur-production.env'),
            `# Zeabur生产环境环境变量配置
# 用于解决D-Bus错误问题
${content}
`
        );
        
        console.log('\n✅ 已生成zeabur-production.env配置文件');
    }

    /**
     * 生成部署指南
     */
    generateDeploymentGuide(fixes) {
        const guide = `# Zeabur生产环境D-Bus错误修复指南

## 立即执行步骤

${fixes.map((fix, index) => `${index + 1}. ${fix.description}: ${fix.action}`).join('\n')}

## 验证步骤
1. 重新部署后检查日志
2. 确认D-Bus错误不再出现
3. 验证服务正常运行

## 紧急联系
如果问题仍然存在，请提供完整的部署日志进行进一步分析。
`;

        fs.writeFileSync(
            path.join(__dirname, 'ZEABUR_DEPLOYMENT_FIX.md'),
            guide
        );

        console.log('✅ 已生成ZEABUR_DEPLOYMENT_FIX.md部署指南');
    }
}

// 运行诊断
if (require.main === module) {
    const debuggerInstance = new ProductionDBusDebugger();
    debuggerInstance.runFullDiagnosis()
        .then(results => {
            console.log('\n✅ 诊断完成！请按照生成的指南修复问题。');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ 诊断失败:', error);
            process.exit(1);
        });
}

module.exports = ProductionDBusDebugger;