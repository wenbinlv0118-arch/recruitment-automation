#!/usr/bin/env node

/**
 * ARM64 性能优化器
 * 专门针对ARM64环境下的Node.js应用进行深度性能优化
 * 包括依赖优化、原生模块检查、V8引擎调优等
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

class ARM64PerformanceOptimizer {
    constructor() {
        this.projectRoot = process.cwd();
        this.optimizationReport = [];
        this.performanceMetrics = {
            before: {},
            after: {}
        };
        this.optimizations = [];
    }

    /**
     * 分析当前ARM64环境状态
     */
    analyzeARM64Environment() {
        console.log('🔍 分析ARM64环境状态...');
        
        const analysis = {
            platform: os.platform(),
            arch: os.arch(),
            nodeArch: process.arch,
            nodeVersion: process.version,
            v8Version: process.versions.v8,
            cpuInfo: os.cpus()[0],
            totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024),
            freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024),
            loadAverage: os.loadavg(),
            uptime: Math.round(os.uptime() / 3600 * 100) / 100
        };

        this.optimizationReport.push({
            step: 'arm64_environment_analysis',
            timestamp: new Date().toISOString(),
            data: analysis
        });

        console.log(`📊 系统架构: ${analysis.arch}`);
        console.log(`📊 Node.js架构: ${analysis.nodeArch}`);
        console.log(`📊 Node.js版本: ${analysis.nodeVersion}`);
        console.log(`📊 V8版本: ${analysis.v8Version}`);
        console.log(`📊 CPU: ${analysis.cpuInfo.model}`);
        console.log(`📊 CPU核心数: ${analysis.cpuInfo.speed}MHz x ${os.cpus().length}`);
        console.log(`📊 内存: ${analysis.freeMemory}GB / ${analysis.totalMemory}GB`);
        console.log(`📊 系统负载: ${analysis.loadAverage.map(l => l.toFixed(2)).join(', ')}`);

        return analysis;
    }

    /**
     * 检查原生模块ARM64兼容性
     */
    checkNativeModulesCompatibility() {
        console.log('\n🔍 检查原生模块ARM64兼容性...');
        
        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        const backendPackageJsonPath = path.join(this.projectRoot, 'backend', 'package.json');
        const frontendPackageJsonPath = path.join(this.projectRoot, 'frontend', 'package.json');
        
        const nativeModules = {
            high_risk: ['chromadb', 'sqlite3', 'node-gyp', 'canvas', 'sharp'],
            medium_risk: ['playwright', 'puppeteer', 'tesseract.js', 'bcrypt', 'argon2'],
            low_risk: ['@xenova/transformers', 'jimp', 'pdf-parse']
        };
        
        const foundModules = {
            high_risk: [],
            medium_risk: [],
            low_risk: []
        };
        
        const checkPackageJson = (packagePath, location) => {
            if (!fs.existsSync(packagePath)) return;
            
            const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            const allDeps = {
                ...packageData.dependencies || {},
                ...packageData.devDependencies || {}
            };
            
            Object.keys(allDeps).forEach(dep => {
                Object.keys(nativeModules).forEach(risk => {
                    if (nativeModules[risk].some(mod => dep.includes(mod))) {
                        foundModules[risk].push({
                            name: dep,
                            version: allDeps[dep],
                            location
                        });
                    }
                });
            });
        };
        
        checkPackageJson(packageJsonPath, 'root');
        checkPackageJson(backendPackageJsonPath, 'backend');
        checkPackageJson(frontendPackageJsonPath, 'frontend');
        
        this.optimizationReport.push({
            step: 'native_modules_compatibility',
            timestamp: new Date().toISOString(),
            data: foundModules
        });
        
        console.log(`🔴 高风险模块: ${foundModules.high_risk.length}个`);
        foundModules.high_risk.forEach(mod => {
            console.log(`   - ${mod.name}@${mod.version} (${mod.location})`);
        });
        
        console.log(`🟡 中风险模块: ${foundModules.medium_risk.length}个`);
        foundModules.medium_risk.forEach(mod => {
            console.log(`   - ${mod.name}@${mod.version} (${mod.location})`);
        });
        
        console.log(`🟢 低风险模块: ${foundModules.low_risk.length}个`);
        foundModules.low_risk.forEach(mod => {
            console.log(`   - ${mod.name}@${mod.version} (${mod.location})`);
        });
        
        return foundModules;
    }

    /**
     * 执行性能基准测试
     */
    async performBenchmark(phase = 'before') {
        console.log(`\n⚡ 执行${phase === 'before' ? '优化前' : '优化后'}性能基准测试...`);
        
        const startTime = Date.now();
        
        try {
            // Node.js启动时间测试
            const nodeStartTime = Date.now();
            execSync('node -e "console.log(\'Node.js started\')"', { stdio: 'pipe' });
            const nodeStartDuration = Date.now() - nodeStartTime;

            // V8引擎性能测试
            const v8TestStart = Date.now();
            execSync('node -e "const arr = new Array(1000000).fill(0).map((_, i) => i * 2); console.log(arr.length);"', { stdio: 'pipe' });
            const v8TestDuration = Date.now() - v8TestStart;

            // 内存使用情况
            const memoryUsage = process.memoryUsage();
            
            // 文件系统性能测试
            const fsTestStart = Date.now();
            const testFile = path.join(this.projectRoot, 'temp_benchmark_test.txt');
            const testData = 'x'.repeat(1024 * 1024); // 1MB数据
            fs.writeFileSync(testFile, testData);
            fs.readFileSync(testFile);
            fs.unlinkSync(testFile);
            const fsTestDuration = Date.now() - fsTestStart;

            // NPM性能测试
            const npmTestStart = Date.now();
            execSync('npm --version', { stdio: 'pipe' });
            const npmTestDuration = Date.now() - npmTestStart;

            // 数据库连接测试（如果存在）
            let dbTestDuration = 0;
            const dbPath = path.join(this.projectRoot, 'backend', 'database.db');
            if (fs.existsSync(dbPath)) {
                const dbTestStart = Date.now();
                try {
                    execSync('node -e "const sqlite3 = require(\'sqlite3\'); const db = new sqlite3.Database(\'backend/database.db\'); db.close();"', { stdio: 'pipe' });
                    dbTestDuration = Date.now() - dbTestStart;
                } catch (e) {
                    dbTestDuration = -1; // 表示测试失败
                }
            }

            const benchmarkResults = {
                timestamp: new Date().toISOString(),
                nodeStartTime: nodeStartDuration,
                v8Performance: v8TestDuration,
                memoryUsage: {
                    rss: Math.round(memoryUsage.rss / 1024 / 1024),
                    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                    external: Math.round(memoryUsage.external / 1024 / 1024)
                },
                fsPerformance: fsTestDuration,
                npmPerformance: npmTestDuration,
                dbPerformance: dbTestDuration,
                totalTestTime: Date.now() - startTime
            };

            this.performanceMetrics[phase] = benchmarkResults;
            
            this.optimizationReport.push({
                step: `benchmark_${phase}`,
                timestamp: new Date().toISOString(),
                data: benchmarkResults
            });

            console.log(`📊 Node.js启动时间: ${nodeStartDuration}ms`);
            console.log(`📊 V8引擎性能: ${v8TestDuration}ms`);
            console.log(`📊 内存使用 (RSS): ${benchmarkResults.memoryUsage.rss}MB`);
            console.log(`📊 堆内存使用: ${benchmarkResults.memoryUsage.heapUsed}/${benchmarkResults.memoryUsage.heapTotal}MB`);
            console.log(`📊 文件系统性能: ${fsTestDuration}ms`);
            console.log(`📊 NPM响应时间: ${npmTestDuration}ms`);
            if (dbTestDuration > 0) {
                console.log(`📊 数据库连接时间: ${dbTestDuration}ms`);
            }

            return benchmarkResults;
        } catch (error) {
            console.error(`❌ ${phase}基准测试时出错:`, error.message);
            return { error: error.message };
        }
    }

    /**
     * 优化V8引擎参数
     */
    optimizeV8Parameters() {
        console.log('\n🚀 优化V8引擎参数...');
        
        const v8Flags = [
            '--max-old-space-size=4096',  // 增加老生代内存限制
            '--max-new-space-size=2048',  // 增加新生代内存限制
            '--optimize-for-size',        // 优化内存使用
            '--gc-interval=100',          // 调整GC间隔
            '--expose-gc'                 // 暴露GC接口用于监控
        ];
        
        const startScript = `#!/bin/bash
# ARM64优化启动脚本
# 使用优化的V8参数启动Node.js应用

export NODE_OPTIONS="${v8Flags.join(' ')}"

echo "🚀 使用ARM64优化参数启动应用..."
echo "V8参数: $NODE_OPTIONS"

# 启动后端服务
cd backend
npm start &
BACKEND_PID=$!

# 启动前端服务
cd ../frontend
npm start &
FRONTEND_PID=$!

echo "✅ 应用已启动"
echo "后端PID: $BACKEND_PID"
echo "前端PID: $FRONTEND_PID"

# 等待用户输入以停止服务
read -p "按Enter键停止服务..."

kill $BACKEND_PID $FRONTEND_PID
echo "🛑 服务已停止"
`;
        
        const scriptPath = path.join(this.projectRoot, 'start-arm64-optimized.sh');
        fs.writeFileSync(scriptPath, startScript);
        execSync(`chmod +x "${scriptPath}"`);
        
        this.optimizations.push({
            type: 'v8_optimization',
            description: 'V8引擎参数优化',
            flags: v8Flags,
            scriptPath
        });
        
        console.log(`✅ V8优化参数已配置: ${v8Flags.join(' ')}`);
        console.log(`✅ 优化启动脚本已创建: ${scriptPath}`);
        
        return { flags: v8Flags, scriptPath };
    }

    /**
     * 优化依赖配置
     */
    optimizeDependencies() {
        console.log('\n📦 优化依赖配置...');
        
        const optimizations = [];
        
        // 创建.npmrc优化配置
        const npmrcContent = `# ARM64优化配置
target_arch=arm64
target_platform=darwin
cache-max=1073741824
engine-strict=true
optional=false
# 使用更快的镜像
registry=https://registry.npmmirror.com/
`;
        
        const npmrcPath = path.join(this.projectRoot, '.npmrc');
        fs.writeFileSync(npmrcPath, npmrcContent);
        optimizations.push({ type: 'npmrc', path: npmrcPath });
        
        // 创建后端.npmrc
        const backendNpmrcPath = path.join(this.projectRoot, 'backend', '.npmrc');
        if (fs.existsSync(path.join(this.projectRoot, 'backend'))) {
            fs.writeFileSync(backendNpmrcPath, npmrcContent);
            optimizations.push({ type: 'backend_npmrc', path: backendNpmrcPath });
        }
        
        // 创建前端.npmrc
        const frontendNpmrcPath = path.join(this.projectRoot, 'frontend', '.npmrc');
        if (fs.existsSync(path.join(this.projectRoot, 'frontend'))) {
            fs.writeFileSync(frontendNpmrcPath, npmrcContent);
            optimizations.push({ type: 'frontend_npmrc', path: frontendNpmrcPath });
        }
        
        this.optimizations.push({
            type: 'dependency_optimization',
            description: '依赖配置优化',
            optimizations
        });
        
        console.log(`✅ NPM配置已优化: ${optimizations.length}个文件`);
        optimizations.forEach(opt => {
            console.log(`   - ${opt.path}`);
        });
        
        return optimizations;
    }

    /**
     * 创建性能监控脚本
     */
    createPerformanceMonitor() {
        console.log('\n📊 创建ARM64性能监控脚本...');
        
        const monitorScript = `#!/usr/bin/env node

/**
 * ARM64性能监控脚本
 * 实时监控ARM64环境下的应用性能
 */

const os = require('os');
const fs = require('fs');
const path = require('path');

class ARM64PerformanceMonitor {
    constructor() {
        this.monitoringInterval = null;
        this.logFile = path.join(__dirname, 'arm64-performance.log');
    }

    /**
     * 获取系统性能指标
     */
    getSystemMetrics() {
        const memUsage = process.memoryUsage();
        const cpuUsage = process.cpuUsage();
        
        return {
            timestamp: new Date().toISOString(),
            memory: {
                rss: Math.round(memUsage.rss / 1024 / 1024),
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                external: Math.round(memUsage.external / 1024 / 1024)
            },
            cpu: {
                user: cpuUsage.user,
                system: cpuUsage.system
            },
            system: {
                loadAverage: os.loadavg(),
                freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024),
                totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024),
                uptime: os.uptime()
            }
        };
    }

    /**
     * 记录性能数据
     */
    logMetrics(metrics) {
        const logEntry = JSON.stringify(metrics) + '\\n';
        fs.appendFileSync(this.logFile, logEntry);
        
        // 控制台输出
        console.log(\`[\${new Date().toLocaleTimeString()}] Memory: \${metrics.memory.heapUsed}/\${metrics.memory.heapTotal}MB, Load: \${metrics.system.loadAverage[0].toFixed(2)}\`);
    }

    /**
     * 开始监控
     */
    startMonitoring(intervalMs = 5000) {
        console.log('🚀 开始ARM64性能监控...');
        console.log(\`📊 监控间隔: \${intervalMs}ms\`);
        console.log(\`📝 日志文件: \${this.logFile}\`);
        
        this.monitoringInterval = setInterval(() => {
            const metrics = this.getSystemMetrics();
            this.logMetrics(metrics);
        }, intervalMs);
    }

    /**
     * 停止监控
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('🛑 性能监控已停止');
        }
    }
}

// 主执行逻辑
if (require.main === module) {
    const monitor = new ARM64PerformanceMonitor();
    
    // 处理退出信号
    process.on('SIGINT', () => {
        monitor.stopMonitoring();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        monitor.stopMonitoring();
        process.exit(0);
    });
    
    // 开始监控
    monitor.startMonitoring();
}

module.exports = ARM64PerformanceMonitor;
`;
        
        const monitorPath = path.join(this.projectRoot, 'arm64-performance-monitor.js');
        fs.writeFileSync(monitorPath, monitorScript);
        execSync(`chmod +x "${monitorPath}"`);
        
        this.optimizations.push({
            type: 'performance_monitor',
            description: 'ARM64性能监控脚本',
            scriptPath: monitorPath
        });
        
        console.log(`✅ 性能监控脚本已创建: ${monitorPath}`);
        
        return monitorPath;
    }

    /**
     * 生成优化报告
     */
    generateOptimizationReport() {
        console.log('\n📊 生成ARM64优化报告...');
        
        const performanceComparison = this.comparePerformance();
        
        const report = `# ARM64 性能优化报告

生成时间: ${new Date().toLocaleString('zh-CN')}

## 优化概述

本报告记录了ARM64环境下Node.js应用的深度性能优化过程和效果对比。

## 环境信息

### 系统配置
- **系统架构**: ${this.optimizationReport[0]?.data?.arch || 'N/A'}
- **Node.js架构**: ${this.optimizationReport[0]?.data?.nodeArch || 'N/A'}
- **Node.js版本**: ${this.optimizationReport[0]?.data?.nodeVersion || 'N/A'}
- **V8版本**: ${this.optimizationReport[0]?.data?.v8Version || 'N/A'}

### 硬件规格
- **CPU**: ${this.optimizationReport[0]?.data?.cpuInfo?.model || 'N/A'}
- **CPU核心**: ${os.cpus().length}核心
- **内存**: ${this.optimizationReport[0]?.data?.totalMemory || 'N/A'}GB
- **可用内存**: ${this.optimizationReport[0]?.data?.freeMemory || 'N/A'}GB

## 性能对比

${performanceComparison}

## 优化措施

${this.optimizations.map((opt, index) => {
    return `### ${index + 1}. ${opt.description}\n\n**类型**: ${opt.type}\n**状态**: 已完成\n${opt.flags ? `**参数**: \`${opt.flags.join(' ')}\`\n` : ''}${opt.scriptPath ? `**脚本**: \`${opt.scriptPath}\`\n` : ''}`;
}).join('\n')}

## 原生模块兼容性

${this.generateNativeModulesReport()}

## 使用指南

### 启动优化应用
\`\`\`bash
# 使用优化参数启动
./start-arm64-optimized.sh
\`\`\`

### 性能监控
\`\`\`bash
# 启动性能监控
node arm64-performance-monitor.js
\`\`\`

### 依赖管理
\`\`\`bash
# 重新安装依赖（使用优化配置）
npm install
\`\`\`

## 优化建议

### 立即执行
1. **使用优化启动脚本**: 始终使用 \`start-arm64-optimized.sh\` 启动应用
2. **启用性能监控**: 在生产环境中运行性能监控脚本
3. **定期更新依赖**: 确保使用最新的ARM64兼容版本

### 持续优化
1. **监控内存使用**: 根据实际使用情况调整V8内存参数
2. **优化数据库查询**: 利用ARM64的并行处理能力
3. **代码分析**: 使用V8性能分析工具识别热点代码

## 注意事项

1. **V8参数调优**: 根据应用特点调整内存和GC参数
2. **原生模块更新**: 定期检查原生模块的ARM64兼容性
3. **性能监控**: 持续监控关键性能指标

## 技术支持

- 优化启动脚本: \`start-arm64-optimized.sh\`
- 性能监控脚本: \`arm64-performance-monitor.js\`
- 性能日志: \`arm64-performance.log\`

---
*报告生成时间: ${new Date().toISOString()}*
`;

        const reportPath = path.join(this.projectRoot, 'ARM64_PERFORMANCE_OPTIMIZATION_REPORT.md');
        fs.writeFileSync(reportPath, report);
        
        console.log(`✅ 优化报告已生成: ${reportPath}`);
        return reportPath;
    }

    /**
     * 生成原生模块报告
     */
    generateNativeModulesReport() {
        const nativeModulesData = this.optimizationReport.find(r => r.step === 'native_modules_compatibility')?.data;
        
        if (!nativeModulesData) {
            return '⚠️ 原生模块兼容性数据缺失';
        }
        
        let report = '';
        
        if (nativeModulesData.high_risk.length > 0) {
            report += `### 🔴 高风险模块 (${nativeModulesData.high_risk.length}个)\n\n`;
            nativeModulesData.high_risk.forEach(mod => {
                report += `- **${mod.name}** v${mod.version} (${mod.location})\n`;
            });
            report += '\n**建议**: 优先更新这些模块到ARM64兼容版本\n\n';
        }
        
        if (nativeModulesData.medium_risk.length > 0) {
            report += `### 🟡 中风险模块 (${nativeModulesData.medium_risk.length}个)\n\n`;
            nativeModulesData.medium_risk.forEach(mod => {
                report += `- **${mod.name}** v${mod.version} (${mod.location})\n`;
            });
            report += '\n**建议**: 定期检查更新，监控性能表现\n\n';
        }
        
        if (nativeModulesData.low_risk.length > 0) {
            report += `### 🟢 低风险模块 (${nativeModulesData.low_risk.length}个)\n\n`;
            nativeModulesData.low_risk.forEach(mod => {
                report += `- **${mod.name}** v${mod.version} (${mod.location})\n`;
            });
            report += '\n**建议**: 正常维护即可\n\n';
        }
        
        return report || '✅ 未发现需要特别关注的原生模块';
    }

    /**
     * 比较优化前后性能
     */
    comparePerformance() {
        const before = this.performanceMetrics.before;
        const after = this.performanceMetrics.after;
        
        if (!before || !before.memoryUsage) {
            return '### 性能基准\n\n#### 优化前性能指标\n\n' + 
                   (before ? `- Node.js启动时间: ${before.nodeStartTime}ms\n` +
                            `- V8引擎性能: ${before.v8Performance}ms\n` +
                            `- 内存使用(RSS): ${before.memoryUsage?.rss || 'N/A'}MB\n` +
                            `- 文件系统性能: ${before.fsPerformance}ms\n` +
                            `- NPM响应时间: ${before.npmPerformance}ms\n` +
                            (before.dbPerformance > 0 ? `- 数据库连接时间: ${before.dbPerformance}ms\n` : '') : '⚠️ 缺少优化前性能数据') +
                   '\n⚠️ 优化后数据缺失，请运行优化后测试。';
        }
        
        if (!after || !after.memoryUsage) {
            return '### 性能基准\n\n#### 优化前性能指标\n\n' +
                   `- Node.js启动时间: ${before.nodeStartTime}ms\n` +
                   `- V8引擎性能: ${before.v8Performance}ms\n` +
                   `- 内存使用(RSS): ${before.memoryUsage.rss}MB\n` +
                   `- 文件系统性能: ${before.fsPerformance}ms\n` +
                   `- NPM响应时间: ${before.npmPerformance}ms\n` +
                   (before.dbPerformance > 0 ? `- 数据库连接时间: ${before.dbPerformance}ms\n` : '') +
                   '\n⚠️ 优化后数据缺失，请运行优化后测试。';
        }

        const improvements = {
            nodeStartTime: ((before.nodeStartTime - after.nodeStartTime) / before.nodeStartTime * 100).toFixed(1),
            v8Performance: ((before.v8Performance - after.v8Performance) / before.v8Performance * 100).toFixed(1),
            memoryRSS: ((before.memoryUsage.rss - after.memoryUsage.rss) / before.memoryUsage.rss * 100).toFixed(1),
            fsPerformance: ((before.fsPerformance - after.fsPerformance) / before.fsPerformance * 100).toFixed(1),
            npmPerformance: ((before.npmPerformance - after.npmPerformance) / before.npmPerformance * 100).toFixed(1),
            dbPerformance: before.dbPerformance > 0 && after.dbPerformance > 0 ? 
                          ((before.dbPerformance - after.dbPerformance) / before.dbPerformance * 100).toFixed(1) : 'N/A'
        };

        let performanceTable = `### 性能对比\n\n| 指标 | 优化前 | 优化后 | 改善幅度 |\n|------|--------|--------|----------|\n`;
        performanceTable += `| Node.js启动时间 | ${before.nodeStartTime}ms | ${after.nodeStartTime}ms | ${improvements.nodeStartTime > 0 ? '+' : ''}${improvements.nodeStartTime}% |\n`;
        performanceTable += `| V8引擎性能 | ${before.v8Performance}ms | ${after.v8Performance}ms | ${improvements.v8Performance > 0 ? '+' : ''}${improvements.v8Performance}% |\n`;
        performanceTable += `| 内存使用(RSS) | ${before.memoryUsage.rss}MB | ${after.memoryUsage.rss}MB | ${improvements.memoryRSS > 0 ? '+' : ''}${improvements.memoryRSS}% |\n`;
        performanceTable += `| 文件系统性能 | ${before.fsPerformance}ms | ${after.fsPerformance}ms | ${improvements.fsPerformance > 0 ? '+' : ''}${improvements.fsPerformance}% |\n`;
        performanceTable += `| NPM响应时间 | ${before.npmPerformance}ms | ${after.npmPerformance}ms | ${improvements.npmPerformance > 0 ? '+' : ''}${improvements.npmPerformance}% |\n`;
        
        if (improvements.dbPerformance !== 'N/A') {
            performanceTable += `| 数据库连接时间 | ${before.dbPerformance}ms | ${after.dbPerformance}ms | ${improvements.dbPerformance > 0 ? '+' : ''}${improvements.dbPerformance}% |\n`;
        }
        
        performanceTable += `\n**总体评估**: ${this.getOverallPerformanceAssessment(improvements)}`;
        
        return performanceTable;
    }

    /**
     * 获取整体性能评估
     */
    getOverallPerformanceAssessment(improvements) {
        const numericImprovements = Object.values(improvements)
            .filter(val => val !== 'N/A')
            .map(val => parseFloat(val));
        
        const avgImprovement = numericImprovements.reduce((sum, val) => sum + val, 0) / numericImprovements.length;
        
        if (avgImprovement > 20) {
            return '🚀 显著性能提升';
        } else if (avgImprovement > 10) {
            return '📈 明显性能改善';
        } else if (avgImprovement > 5) {
            return '✅ 轻微性能提升';
        } else if (avgImprovement > 0) {
            return '🔧 性能微调完成';
        } else {
            return '⚠️ 性能无明显变化';
        }
    }

    /**
     * 执行完整的ARM64性能优化流程
     */
    async runOptimization() {
        console.log('🚀 开始ARM64性能优化流程...');
        console.log('=' .repeat(50));
        
        try {
            // 1. 分析ARM64环境
            const envAnalysis = this.analyzeARM64Environment();
            
            // 2. 检查原生模块兼容性
            const nativeModules = this.checkNativeModulesCompatibility();
            
            // 3. 执行优化前性能基准测试
            await this.performBenchmark('before');
            
            // 4. 优化V8引擎参数
            const v8Optimization = this.optimizeV8Parameters();
            
            // 5. 优化依赖配置
            const depOptimization = this.optimizeDependencies();
            
            // 6. 创建性能监控脚本
            const monitorScript = this.createPerformanceMonitor();
            
            // 7. 生成优化报告
            const reportPath = this.generateOptimizationReport();
            
            console.log('\n' + '='.repeat(50));
            console.log('✅ ARM64性能优化完成!');
            console.log('\n📋 生成的文件:');
            console.log(`   - 优化报告: ${reportPath}`);
            console.log(`   - 启动脚本: ${v8Optimization.scriptPath}`);
            console.log(`   - 监控脚本: ${monitorScript}`);
            
            console.log('\n🔄 下一步操作:');
            console.log('   1. 使用 ./start-arm64-optimized.sh 启动应用');
            console.log('   2. 运行 node arm64-performance-monitor.js 监控性能');
            console.log('   3. 根据监控结果进一步调优参数');
            
            return {
                success: true,
                envAnalysis,
                nativeModules,
                optimizations: this.optimizations,
                reportPath
            };
            
        } catch (error) {
            console.error('❌ ARM64性能优化过程中出错:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 主执行逻辑
if (require.main === module) {
    const optimizer = new ARM64PerformanceOptimizer();
    
    optimizer.runOptimization()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('执行失败:', error);
            process.exit(1);
        });
}

module.exports = ARM64PerformanceOptimizer;