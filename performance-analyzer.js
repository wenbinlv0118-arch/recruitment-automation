#!/usr/bin/env node

/**
 * 性能分析工具
 * 监控系统资源使用情况和API响应时间
 */

const os = require('os');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class PerformanceAnalyzer {
    constructor() {
        this.baseURL = 'http://localhost:5001';
        this.results = {
            system: {},
            memory: {},
            api: {},
            database: {},
            recommendations: []
        };
    }

    /**
     * 获取系统信息
     */
    getSystemInfo() {
        const cpus = os.cpus();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        
        this.results.system = {
            platform: os.platform(),
            arch: os.arch(),
            cpuModel: cpus[0].model,
            cpuCores: cpus.length,
            totalMemory: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)}GB`,
            usedMemory: `${(usedMem / 1024 / 1024 / 1024).toFixed(2)}GB`,
            freeMemory: `${(freeMem / 1024 / 1024 / 1024).toFixed(2)}GB`,
            memoryUsage: `${((usedMem / totalMem) * 100).toFixed(1)}%`,
            loadAverage: os.loadavg(),
            uptime: `${(os.uptime() / 3600).toFixed(1)}小时`
        };
    }

    /**
     * 分析Node.js进程内存使用
     */
    analyzeMemoryUsage() {
        const memUsage = process.memoryUsage();
        
        this.results.memory = {
            rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`,
            heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
            heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`,
            arrayBuffers: `${(memUsage.arrayBuffers / 1024 / 1024).toFixed(2)}MB`,
            heapUsagePercent: `${((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1)}%`
        };

        // 内存使用建议
        const heapUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
        if (heapUsagePercent > 80) {
            this.results.recommendations.push('⚠️ 堆内存使用率过高，建议优化内存使用或增加内存限制');
        }
        if (memUsage.rss > 500 * 1024 * 1024) {
            this.results.recommendations.push('⚠️ RSS内存使用超过500MB，建议检查内存泄漏');
        }
    }

    /**
     * 测试API性能
     */
    async testAPIPerformance() {
        const endpoints = [
            { name: '任务列表', url: '/api/tasks?page=1&limit=10' },
            { name: '任务统计', url: '/api/tasks/stats' },
            { name: '岗位列表', url: '/api/positions' },
            { name: '健康检查', url: '/api/health' }
        ];

        this.results.api = {};
        
        for (const endpoint of endpoints) {
            try {
                const startTime = Date.now();
                const response = await axios.get(`${this.baseURL}${endpoint.url}`, {
                    timeout: 5000
                });
                const endTime = Date.now();
                const responseTime = endTime - startTime;
                
                this.results.api[endpoint.name] = {
                    status: response.status,
                    responseTime: `${responseTime}ms`,
                    dataSize: JSON.stringify(response.data).length,
                    success: true
                };

                // 性能建议
                if (responseTime > 1000) {
                    this.results.recommendations.push(`⚠️ ${endpoint.name}响应时间过长(${responseTime}ms)，建议优化查询或添加缓存`);
                } else if (responseTime > 500) {
                    this.results.recommendations.push(`💡 ${endpoint.name}响应时间较慢(${responseTime}ms)，可考虑优化`);
                }
                
            } catch (error) {
                this.results.api[endpoint.name] = {
                    error: error.message,
                    success: false
                };
                this.results.recommendations.push(`❌ ${endpoint.name}请求失败: ${error.message}`);
            }
        }
    }

    /**
     * 分析数据库性能
     */
    async analyzeDatabasePerformance() {
        const dbPath = path.join(__dirname, 'backend', 'database.db');
        const knowledgePath = path.join(__dirname, 'backend', 'knowledge.db');
        
        this.results.database = {};
        
        try {
            if (fs.existsSync(dbPath)) {
                const stats = fs.statSync(dbPath);
                this.results.database.mainDB = {
                    size: `${(stats.size / 1024 / 1024).toFixed(2)}MB`,
                    lastModified: stats.mtime.toISOString()
                };
                
                if (stats.size > 100 * 1024 * 1024) {
                    this.results.recommendations.push('💡 主数据库文件较大，建议定期清理或优化');
                }
            }
            
            if (fs.existsSync(knowledgePath)) {
                const stats = fs.statSync(knowledgePath);
                this.results.database.knowledgeDB = {
                    size: `${(stats.size / 1024 / 1024).toFixed(2)}MB`,
                    lastModified: stats.mtime.toISOString()
                };
                
                if (stats.size > 500 * 1024 * 1024) {
                    this.results.recommendations.push('💡 知识库文件较大，建议考虑向量数据压缩');
                }
            }
        } catch (error) {
            this.results.database.error = error.message;
        }
    }

    /**
     * 生成性能报告
     */
    generateReport() {
        const report = `
🚀 系统性能分析报告
==================================================
分析时间: ${new Date().toLocaleString('zh-CN')}

🖥️  系统信息:
平台: ${this.results.system.platform}
架构: ${this.results.system.arch}
CPU: ${this.results.system.cpuModel}
CPU核心: ${this.results.system.cpuCores}
总内存: ${this.results.system.totalMemory}
已用内存: ${this.results.system.usedMemory} (${this.results.system.memoryUsage})
可用内存: ${this.results.system.freeMemory}
系统负载: [${this.results.system.loadAverage.map(l => l.toFixed(2)).join(', ')}]
运行时间: ${this.results.system.uptime}

🧠 Node.js内存使用:
RSS: ${this.results.memory.rss}
堆总量: ${this.results.memory.heapTotal}
堆使用: ${this.results.memory.heapUsed} (${this.results.memory.heapUsagePercent})
外部内存: ${this.results.memory.external}
ArrayBuffers: ${this.results.memory.arrayBuffers}

🌐 API性能测试:
${Object.entries(this.results.api).map(([name, data]) => {
    if (data.success) {
        return `✅ ${name}: ${data.responseTime} (${data.status})`;
    } else {
        return `❌ ${name}: ${data.error}`;
    }
}).join('\n')}

💾 数据库信息:
${this.results.database.mainDB ? `主数据库: ${this.results.database.mainDB.size}` : '主数据库: 未找到'}
${this.results.database.knowledgeDB ? `知识库: ${this.results.database.knowledgeDB.size}` : '知识库: 未找到'}

📊 优化建议:
${this.results.recommendations.length > 0 ? this.results.recommendations.join('\n') : '✅ 系统运行良好，暂无优化建议'}

==================================================
`;
        
        return report;
    }

    /**
     * 运行完整分析
     */
    async runAnalysis() {
        console.log('🔍 开始性能分析...');
        
        console.log('📊 收集系统信息...');
        this.getSystemInfo();
        
        console.log('🧠 分析内存使用...');
        this.analyzeMemoryUsage();
        
        console.log('🌐 测试API性能...');
        await this.testAPIPerformance();
        
        console.log('💾 分析数据库性能...');
        await this.analyzeDatabasePerformance();
        
        const report = this.generateReport();
        console.log(report);
        
        // 保存报告
        const reportPath = path.join(__dirname, 'PERFORMANCE_ANALYSIS_REPORT.txt');
        fs.writeFileSync(reportPath, report);
        console.log(`📄 详细报告已保存到: ${reportPath}`);
        
        return this.results;
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const analyzer = new PerformanceAnalyzer();
    analyzer.runAnalysis().catch(console.error);
}

module.exports = PerformanceAnalyzer;