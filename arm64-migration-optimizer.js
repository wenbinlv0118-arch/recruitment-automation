#!/usr/bin/env node

/**
 * ARM64 迁移优化器
 * 用于将Node.js环境从x64 Rosetta模式迁移到原生ARM64模式
 * 提升M1/M2芯片Mac的性能表现
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

class ARM64MigrationOptimizer {
    constructor() {
        this.projectRoot = process.cwd();
        this.backupDir = path.join(this.projectRoot, 'backups', `arm64-migration-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`);
        this.migrationReport = [];
        this.performanceMetrics = {
            before: {},
            after: {}
        };
    }

    /**
     * 分析当前系统环境
     */
    analyzeCurrentEnvironment() {
        console.log('🔍 分析当前系统环境...');
        
        const analysis = {
            platform: os.platform(),
            arch: os.arch(),
            nodeArch: process.arch,
            nodeVersion: process.version,
            cpuInfo: os.cpus()[0],
            totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024),
            isRosetta: process.arch === 'x64' && os.arch() === 'arm64'
        };

        this.migrationReport.push({
            step: 'environment_analysis',
            timestamp: new Date().toISOString(),
            data: analysis
        });

        console.log(`📊 系统架构: ${analysis.arch}`);
        console.log(`📊 Node.js架构: ${analysis.nodeArch}`);
        console.log(`📊 Node.js版本: ${analysis.nodeVersion}`);
        console.log(`📊 CPU: ${analysis.cpuInfo.model}`);
        console.log(`📊 内存: ${analysis.totalMemory}GB`);
        console.log(`📊 Rosetta模式: ${analysis.isRosetta ? '是' : '否'}`);

        return analysis;
    }

    /**
     * 检查ARM64 Node.js可用性
     */
    checkARM64NodeAvailability() {
        console.log('\n🔍 检查ARM64 Node.js可用性...');
        
        try {
            // 检查是否安装了nvm
            const nvmCheck = execSync('which nvm || echo "not_found"', { encoding: 'utf8' }).trim();
            
            // 检查是否有ARM64版本的Node.js
            let arm64NodePath = null;
            const possiblePaths = [
                '/opt/homebrew/bin/node',
                '/usr/local/bin/node-arm64',
                `${os.homedir()}/.nvm/versions/node/v${process.version.slice(1)}-darwin-arm64/bin/node`
            ];

            for (const nodePath of possiblePaths) {
                if (fs.existsSync(nodePath)) {
                    try {
                        const archCheck = execSync(`${nodePath} -p "process.arch"`, { encoding: 'utf8' }).trim();
                        if (archCheck === 'arm64') {
                            arm64NodePath = nodePath;
                            break;
                        }
                    } catch (e) {
                        // 忽略错误，继续检查下一个路径
                    }
                }
            }

            const availability = {
                nvmInstalled: nvmCheck !== 'not_found',
                arm64NodePath,
                homebrewInstalled: fs.existsSync('/opt/homebrew/bin/brew')
            };

            this.migrationReport.push({
                step: 'arm64_availability_check',
                timestamp: new Date().toISOString(),
                data: availability
            });

            console.log(`📦 NVM已安装: ${availability.nvmInstalled ? '是' : '否'}`);
            console.log(`📦 Homebrew已安装: ${availability.homebrewInstalled ? '是' : '否'}`);
            console.log(`📦 ARM64 Node.js路径: ${availability.arm64NodePath || '未找到'}`);

            return availability;
        } catch (error) {
            console.error('❌ 检查ARM64 Node.js可用性时出错:', error.message);
            return { error: error.message };
        }
    }

    /**
     * 创建备份
     */
    createBackup() {
        console.log('\n💾 创建项目备份...');
        
        try {
            // 创建备份目录
            fs.mkdirSync(this.backupDir, { recursive: true });

            // 备份关键文件
            const filesToBackup = [
                'package.json',
                'package-lock.json',
                '.env',
                'database.db',
                'knowledge.db'
            ];

            const backedUpFiles = [];
            for (const file of filesToBackup) {
                const sourcePath = path.join(this.projectRoot, file);
                const backupPath = path.join(this.backupDir, file);
                
                if (fs.existsSync(sourcePath)) {
                    fs.copyFileSync(sourcePath, backupPath);
                    backedUpFiles.push(file);
                }
            }

            // 备份后端环境文件
            const backendEnvPath = path.join(this.projectRoot, 'backend', '.env');
            if (fs.existsSync(backendEnvPath)) {
                fs.copyFileSync(backendEnvPath, path.join(this.backupDir, 'backend.env'));
                backedUpFiles.push('backend/.env');
            }

            const backupInfo = {
                backupDir: this.backupDir,
                backedUpFiles,
                timestamp: new Date().toISOString()
            };

            this.migrationReport.push({
                step: 'backup_creation',
                timestamp: new Date().toISOString(),
                data: backupInfo
            });

            console.log(`✅ 备份已创建: ${this.backupDir}`);
            console.log(`📁 已备份文件: ${backedUpFiles.join(', ')}`);

            return backupInfo;
        } catch (error) {
            console.error('❌ 创建备份时出错:', error.message);
            throw error;
        }
    }

    /**
     * 性能基准测试
     */
    async performBenchmark(phase = 'before') {
        console.log(`\n⚡ 执行${phase === 'before' ? '迁移前' : '迁移后'}性能基准测试...`);
        
        const startTime = Date.now();
        
        try {
            // Node.js启动时间测试
            const nodeStartTime = Date.now();
            execSync('node -e "console.log(\'Node.js started\')"', { stdio: 'pipe' });
            const nodeStartDuration = Date.now() - nodeStartTime;

            // 内存使用情况
            const memoryUsage = process.memoryUsage();
            
            // CPU信息
            const cpuInfo = os.cpus()[0];
            
            // 文件系统性能测试
            const fsTestStart = Date.now();
            const testFile = path.join(this.projectRoot, 'temp_benchmark_test.txt');
            const testData = 'x'.repeat(1024 * 1024); // 1MB数据
            fs.writeFileSync(testFile, testData);
            fs.readFileSync(testFile);
            fs.unlinkSync(testFile);
            const fsTestDuration = Date.now() - fsTestStart;

            // 包管理器性能测试
            const npmTestStart = Date.now();
            execSync('npm --version', { stdio: 'pipe' });
            const npmTestDuration = Date.now() - npmTestStart;

            const benchmarkResults = {
                timestamp: new Date().toISOString(),
                nodeStartTime: nodeStartDuration,
                memoryUsage: {
                    rss: Math.round(memoryUsage.rss / 1024 / 1024),
                    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
                    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                    external: Math.round(memoryUsage.external / 1024 / 1024)
                },
                cpuModel: cpuInfo.model,
                cpuSpeed: cpuInfo.speed,
                fsPerformance: fsTestDuration,
                npmPerformance: npmTestDuration,
                totalTestTime: Date.now() - startTime
            };

            this.performanceMetrics[phase] = benchmarkResults;
            
            this.migrationReport.push({
                step: `benchmark_${phase}`,
                timestamp: new Date().toISOString(),
                data: benchmarkResults
            });

            console.log(`📊 Node.js启动时间: ${nodeStartDuration}ms`);
            console.log(`📊 内存使用 (RSS): ${benchmarkResults.memoryUsage.rss}MB`);
            console.log(`📊 文件系统性能: ${fsTestDuration}ms`);
            console.log(`📊 NPM响应时间: ${npmTestDuration}ms`);

            return benchmarkResults;
        } catch (error) {
            console.error(`❌ ${phase}基准测试时出错:`, error.message);
            return { error: error.message };
        }
    }

    /**
     * 生成ARM64安装指南
     */
    generateInstallationGuide() {
        console.log('\n📋 生成ARM64安装指南...');
        
        const guide = `# ARM64 Node.js 安装指南

## 方法一: 使用Homebrew (推荐)

\`\`\`bash
# 1. 安装Homebrew (如果未安装)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. 安装ARM64版本的Node.js
brew install node

# 3. 验证安装
node -p "process.arch" # 应该输出 'arm64'
\`\`\`

## 方法二: 使用NVM

\`\`\`bash
# 1. 安装NVM (如果未安装)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 2. 重新加载shell配置
source ~/.zshrc

# 3. 安装最新的Node.js LTS版本
nvm install --lts
nvm use --lts

# 4. 验证安装
node -p "process.arch" # 应该输出 'arm64'
\`\`\`

## 方法三: 官方安装包

1. 访问 https://nodejs.org/
2. 下载 macOS ARM64 版本
3. 运行安装包
4. 验证安装: \`node -p "process.arch"\`

## 迁移步骤

1. **备份当前项目**
   \`\`\`bash
   cp -r . ../project-backup
   \`\`\`

2. **清理现有依赖**
   \`\`\`bash
   rm -rf node_modules package-lock.json
   rm -rf backend/node_modules backend/package-lock.json
   rm -rf frontend/node_modules frontend/package-lock.json
   \`\`\`

3. **重新安装依赖**
   \`\`\`bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   \`\`\`

4. **重新下载Playwright浏览器**
   \`\`\`bash
   cd backend
   npx playwright install
   \`\`\`

5. **测试应用**
   \`\`\`bash
   npm run dev
   \`\`\`

## 注意事项

- 确保Terminal运行在ARM64模式下
- 某些原生模块可能需要重新编译
- 如遇问题，可以回退到备份版本
`;

        const guidePath = path.join(this.projectRoot, 'ARM64_INSTALLATION_GUIDE.md');
        fs.writeFileSync(guidePath, guide);
        
        console.log(`✅ 安装指南已生成: ${guidePath}`);
        return guidePath;
    }

    /**
     * 生成迁移报告
     */
    generateMigrationReport() {
        console.log('\n📊 生成ARM64迁移报告...');
        
        const performanceComparison = this.comparePerformance();
        
        const report = `# ARM64 迁移优化报告

生成时间: ${new Date().toLocaleString('zh-CN')}

## 迁移概述

本报告记录了从x64 Rosetta模式迁移到原生ARM64 Node.js环境的完整过程和性能对比。

## 环境信息

### 迁移前环境
- **系统架构**: ${this.migrationReport[0]?.data?.arch || 'N/A'}
- **Node.js架构**: ${this.migrationReport[0]?.data?.nodeArch || 'N/A'}
- **Node.js版本**: ${this.migrationReport[0]?.data?.nodeVersion || 'N/A'}
- **Rosetta模式**: ${this.migrationReport[0]?.data?.isRosetta ? '是' : '否'}

### 系统规格
- **CPU**: ${this.migrationReport[0]?.data?.cpuInfo?.model || 'N/A'}
- **内存**: ${this.migrationReport[0]?.data?.totalMemory || 'N/A'}GB

## 性能对比

${performanceComparison}

## 迁移步骤记录

${this.migrationReport.map((step, index) => {
    return `### ${index + 1}. ${step.step.replace(/_/g, ' ').toUpperCase()}
**时间**: ${new Date(step.timestamp).toLocaleString('zh-CN')}\n**状态**: 完成\n`;
}).join('\n')}

## 优化建议

### 立即执行
1. **清理依赖缓存**: 定期清理npm缓存以确保使用ARM64版本的包
2. **更新开发工具**: 确保IDE和开发工具使用ARM64版本
3. **监控性能**: 使用性能监控脚本持续跟踪系统表现

### 后续优化
1. **原生模块优化**: 检查并更新所有原生模块到ARM64版本
2. **容器化部署**: 考虑使用ARM64 Docker镜像进行部署
3. **CI/CD优化**: 更新构建流水线以支持ARM64架构

## 注意事项

1. **兼容性测试**: 定期测试所有功能确保兼容性
2. **备份策略**: 保持定期备份，特别是在更新依赖时
3. **性能监控**: 持续监控性能指标，及时发现问题

## 技术支持

如遇到问题，请参考:
- ARM64安装指南: \`ARM64_INSTALLATION_GUIDE.md\`
- 性能监控脚本: \`performance-monitor.js\`
- 备份文件: \`${this.backupDir}\`

---
*报告生成时间: ${new Date().toISOString()}*
`;

        const reportPath = path.join(this.projectRoot, 'ARM64_MIGRATION_REPORT.md');
        fs.writeFileSync(reportPath, report);
        
        console.log(`✅ 迁移报告已生成: ${reportPath}`);
        return reportPath;
    }

    /**
     * 比较迁移前后性能
     */
    comparePerformance() {
        const before = this.performanceMetrics.before;
        const after = this.performanceMetrics.after;
        
        if (!before || !before.memoryUsage) {
            return '### 性能基准\n\n#### 迁移前性能指标\n\n' + 
                   (before ? `- Node.js启动时间: ${before.nodeStartTime}ms\n` +
                            `- 内存使用(RSS): ${before.memoryUsage?.rss || 'N/A'}MB\n` +
                            `- 文件系统性能: ${before.fsPerformance}ms\n` +
                            `- NPM响应时间: ${before.npmPerformance}ms\n` : '⚠️ 缺少迁移前性能数据') +
                   '\n⚠️ 迁移后数据缺失，请运行 `node arm64-migration-optimizer.js --post-migration` 进行迁移后测试。';
        }
        
        if (!after || !after.memoryUsage) {
            return '### 性能基准\n\n#### 迁移前性能指标\n\n' +
                   `- Node.js启动时间: ${before.nodeStartTime}ms\n` +
                   `- 内存使用(RSS): ${before.memoryUsage.rss}MB\n` +
                   `- 文件系统性能: ${before.fsPerformance}ms\n` +
                   `- NPM响应时间: ${before.npmPerformance}ms\n\n` +
                   '⚠️ 迁移后数据缺失，请运行 `node arm64-migration-optimizer.js --post-migration` 进行迁移后测试。';
        }

        const improvements = {
            nodeStartTime: ((before.nodeStartTime - after.nodeStartTime) / before.nodeStartTime * 100).toFixed(1),
            memoryRSS: ((before.memoryUsage.rss - after.memoryUsage.rss) / before.memoryUsage.rss * 100).toFixed(1),
            fsPerformance: ((before.fsPerformance - after.fsPerformance) / before.fsPerformance * 100).toFixed(1),
            npmPerformance: ((before.npmPerformance - after.npmPerformance) / before.npmPerformance * 100).toFixed(1)
        };

        return `### 性能对比\n\n| 指标 | 迁移前 | 迁移后 | 改善幅度 |\n|------|--------|--------|----------|\n| Node.js启动时间 | ${before.nodeStartTime}ms | ${after.nodeStartTime}ms | ${improvements.nodeStartTime > 0 ? '+' : ''}${improvements.nodeStartTime}% |\n| 内存使用(RSS) | ${before.memoryUsage.rss}MB | ${after.memoryUsage.rss}MB | ${improvements.memoryRSS > 0 ? '+' : ''}${improvements.memoryRSS}% |\n| 文件系统性能 | ${before.fsPerformance}ms | ${after.fsPerformance}ms | ${improvements.fsPerformance > 0 ? '+' : ''}${improvements.fsPerformance}% |\n| NPM响应时间 | ${before.npmPerformance}ms | ${after.npmPerformance}ms | ${improvements.npmPerformance > 0 ? '+' : ''}${improvements.npmPerformance}% |\n\n**总体评估**: ${this.getOverallPerformanceAssessment(improvements)}`;
    }

    /**
     * 获取整体性能评估
     */
    getOverallPerformanceAssessment(improvements) {
        const avgImprovement = (parseFloat(improvements.nodeStartTime) + 
                              parseFloat(improvements.fsPerformance) + 
                              parseFloat(improvements.npmPerformance)) / 3;
        
        if (avgImprovement > 15) {
            return '🚀 显著性能提升';
        } else if (avgImprovement > 5) {
            return '📈 明显性能改善';
        } else if (avgImprovement > 0) {
            return '✅ 轻微性能提升';
        } else {
            return '⚠️ 性能无明显变化';
        }
    }

    /**
     * 执行完整的ARM64迁移优化流程
     */
    async runOptimization() {
        console.log('🚀 开始ARM64迁移优化流程...');
        console.log('=' .repeat(50));
        
        try {
            // 1. 分析当前环境
            const currentEnv = this.analyzeCurrentEnvironment();
            
            // 2. 检查ARM64可用性
            const arm64Availability = this.checkARM64NodeAvailability();
            
            // 3. 创建备份
            const backupInfo = this.createBackup();
            
            // 4. 执行迁移前性能基准测试
            await this.performBenchmark('before');
            
            // 5. 生成安装指南
            const guidePath = this.generateInstallationGuide();
            
            // 6. 生成迁移报告
            const reportPath = this.generateMigrationReport();
            
            console.log('\n' + '='.repeat(50));
            console.log('✅ ARM64迁移优化分析完成!');
            console.log('\n📋 生成的文件:');
            console.log(`   - 安装指南: ${guidePath}`);
            console.log(`   - 迁移报告: ${reportPath}`);
            console.log(`   - 项目备份: ${backupInfo.backupDir}`);
            
            console.log('\n🔄 下一步操作:');
            if (currentEnv.isRosetta) {
                console.log('   1. 按照安装指南安装ARM64版本的Node.js');
                console.log('   2. 在新的ARM64 Terminal中重新安装项目依赖');
                console.log('   3. 运行 node arm64-migration-optimizer.js --post-migration 进行迁移后测试');
            } else {
                console.log('   ✅ 当前已在ARM64环境下运行，无需迁移');
            }
            
            return {
                success: true,
                currentEnv,
                arm64Availability,
                backupInfo,
                guidePath,
                reportPath
            };
            
        } catch (error) {
            console.error('❌ ARM64迁移优化过程中出错:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * 执行迁移后验证
     */
    async runPostMigrationValidation() {
        console.log('🔍 执行迁移后验证...');
        console.log('=' .repeat(50));
        
        try {
            // 1. 重新分析环境
            const newEnv = this.analyzeCurrentEnvironment();
            
            // 2. 执行迁移后性能基准测试
            await this.performBenchmark('after');
            
            // 3. 更新迁移报告
            const reportPath = this.generateMigrationReport();
            
            console.log('\n' + '='.repeat(50));
            console.log('✅ 迁移后验证完成!');
            console.log(`📊 更新的报告: ${reportPath}`);
            
            if (newEnv.nodeArch === 'arm64') {
                console.log('🎉 成功迁移到ARM64环境!');
            } else {
                console.log('⚠️ 仍在x64环境下运行，请检查Node.js安装');
            }
            
            return {
                success: true,
                newEnv,
                reportPath
            };
            
        } catch (error) {
            console.error('❌ 迁移后验证过程中出错:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 主执行逻辑
if (require.main === module) {
    const optimizer = new ARM64MigrationOptimizer();
    
    // 检查命令行参数
    const args = process.argv.slice(2);
    const isPostMigration = args.includes('--post-migration');
    
    if (isPostMigration) {
        optimizer.runPostMigrationValidation()
            .then(result => {
                process.exit(result.success ? 0 : 1);
            })
            .catch(error => {
                console.error('执行失败:', error);
                process.exit(1);
            });
    } else {
        optimizer.runOptimization()
            .then(result => {
                process.exit(result.success ? 0 : 1);
            })
            .catch(error => {
                console.error('执行失败:', error);
                process.exit(1);
            });
    }
}

module.exports = ARM64MigrationOptimizer;