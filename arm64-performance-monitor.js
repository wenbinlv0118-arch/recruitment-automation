#!/usr/bin/env node

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
        const logEntry = JSON.stringify(metrics) + '\n';
        fs.appendFileSync(this.logFile, logEntry);
        
        // 控制台输出
        console.log(`[${new Date().toLocaleTimeString()}] Memory: ${metrics.memory.heapUsed}/${metrics.memory.heapTotal}MB, Load: ${metrics.system.loadAverage[0].toFixed(2)}`);
    }

    /**
     * 开始监控
     */
    startMonitoring(intervalMs = 5000) {
        console.log('🚀 开始ARM64性能监控...');
        console.log(`📊 监控间隔: ${intervalMs}ms`);
        console.log(`📝 日志文件: ${this.logFile}`);
        
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
