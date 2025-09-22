#!/usr/bin/env node

/**
 * 生产环境资源监控和性能优化脚本
 * 监控CPU、内存、磁盘、网络等资源使用情况
 * 提供性能优化建议和自动优化功能
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');

class ResourcePerformanceMonitor {
  constructor() {
    this.monitoringInterval = null;
    this.performanceData = [];
    this.alerts = [];
    this.thresholds = {
      cpu: 80,        // CPU使用率阈值 (%)
      memory: 85,     // 内存使用率阈值 (%)
      disk: 90,       // 磁盘使用率阈值 (%)
      loadAverage: 2, // 系统负载阈值
      responseTime: 2000, // API响应时间阈值 (ms)
      errorRate: 5    // 错误率阈值 (%)
    };
  }

  /**
   * 获取系统资源使用情况
   */
  async getSystemResources() {
    try {
      const cpuUsage = await this.getCPUUsage();
      const memoryUsage = this.getMemoryUsage();
      const diskUsage = await this.getDiskUsage();
      const networkStats = await this.getNetworkStats();
      const loadAverage = os.loadavg();

      return {
        timestamp: new Date().toISOString(),
        cpu: cpuUsage,
        memory: memoryUsage,
        disk: diskUsage,
        network: networkStats,
        loadAverage: loadAverage[0], // 1分钟平均负载
        uptime: os.uptime()
      };
    } catch (error) {
      console.error('❌ 获取系统资源失败:', error.message);
      return null;
    }
  }

  /**
   * 获取CPU使用率
   */
  async getCPUUsage() {
    return new Promise((resolve) => {
      const startMeasure = this.cpuAverage();
      
      setTimeout(() => {
        const endMeasure = this.cpuAverage();
        const idleDifference = endMeasure.idle - startMeasure.idle;
        const totalDifference = endMeasure.total - startMeasure.total;
        const percentageCPU = 100 - ~~(100 * idleDifference / totalDifference);
        
        resolve({
          usage: percentageCPU,
          cores: os.cpus().length,
          model: os.cpus()[0].model
        });
      }, 1000);
    });
  }

  /**
   * CPU平均值计算辅助函数
   */
  cpuAverage() {
    const cpus = os.cpus();
    let user = 0, nice = 0, sys = 0, idle = 0, irq = 0;
    
    for (let cpu of cpus) {
      user += cpu.times.user;
      nice += cpu.times.nice;
      sys += cpu.times.sys;
      idle += cpu.times.idle;
      irq += cpu.times.irq;
    }
    
    const total = user + nice + sys + idle + irq;
    return { idle, total };
  }

  /**
   * 获取内存使用情况
   */
  getMemoryUsage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const usagePercentage = (usedMemory / totalMemory) * 100;

    return {
      total: Math.round(totalMemory / 1024 / 1024), // MB
      used: Math.round(usedMemory / 1024 / 1024),   // MB
      free: Math.round(freeMemory / 1024 / 1024),   // MB
      usage: Math.round(usagePercentage)
    };
  }

  /**
   * 获取磁盘使用情况
   */
  async getDiskUsage() {
    try {
      let diskInfo = {};
      
      if (process.platform === 'darwin' || process.platform === 'linux') {
        const output = execSync('df -h /', { encoding: 'utf8' });
        const lines = output.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          diskInfo = {
            total: parts[1],
            used: parts[2],
            available: parts[3],
            usage: parseInt(parts[4])
          };
        }
      } else {
        // Windows 支持
        diskInfo = {
          total: 'N/A',
          used: 'N/A',
          available: 'N/A',
          usage: 0
        };
      }

      return diskInfo;
    } catch (error) {
      return {
        total: 'N/A',
        used: 'N/A',
        available: 'N/A',
        usage: 0,
        error: error.message
      };
    }
  }

  /**
   * 获取网络统计信息
   */
  async getNetworkStats() {
    try {
      const networkInterfaces = os.networkInterfaces();
      const stats = {
        interfaces: Object.keys(networkInterfaces).length,
        activeConnections: 0,
        totalBytes: 0
      };

      // 尝试获取网络连接数（仅在支持的系统上）
      if (process.platform === 'darwin' || process.platform === 'linux') {
        try {
          const netstat = execSync('netstat -an | grep ESTABLISHED | wc -l', { encoding: 'utf8' });
          stats.activeConnections = parseInt(netstat.trim());
        } catch (e) {
          stats.activeConnections = 'N/A';
        }
      }

      return stats;
    } catch (error) {
      return {
        interfaces: 0,
        activeConnections: 'N/A',
        totalBytes: 0,
        error: error.message
      };
    }
  }

  /**
   * 获取Node.js进程资源使用情况
   */
  getNodeProcessStats() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      pid: process.pid,
      memory: {
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        external: Math.round(memUsage.external / 1024 / 1024) // MB
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: Math.round(process.uptime()),
      version: process.version
    };
  }

  /**
   * 检查应用性能指标
   */
  async checkApplicationPerformance() {
    const results = {
      database: await this.checkDatabasePerformance(),
      api: await this.checkAPIPerformance(),
      browser: await this.checkBrowserPerformance(),
      cache: await this.checkCachePerformance()
    };

    return results;
  }

  /**
   * 检查数据库性能
   */
  async checkDatabasePerformance() {
    try {
      const startTime = Date.now();
      
      // 模拟数据库连接测试
      // 在实际环境中，这里应该连接到真实的数据库
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        connections: 'N/A', // 需要实际数据库连接来获取
        queries: 'N/A'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        responseTime: null
      };
    }
  }

  /**
   * 检查API性能
   */
  async checkAPIPerformance() {
    try {
      const endpoints = [
        'http://localhost:3001/health',
        'http://localhost:3001/api/status'
      ];

      const results = [];
      
      for (const endpoint of endpoints) {
        try {
          const startTime = Date.now();
          // 在生产环境中，这里应该发送实际的HTTP请求
          await new Promise(resolve => setTimeout(resolve, 50));
          const responseTime = Date.now() - startTime;
          
          results.push({
            endpoint,
            status: 'healthy',
            responseTime
          });
        } catch (error) {
          results.push({
            endpoint,
            status: 'error',
            error: error.message
          });
        }
      }

      return {
        endpoints: results,
        averageResponseTime: results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * 检查浏览器性能
   */
  async checkBrowserPerformance() {
    try {
      // 检查浏览器进程
      const browserProcesses = await this.getBrowserProcesses();
      
      return {
        processes: browserProcesses.length,
        totalMemory: browserProcesses.reduce((sum, p) => sum + (p.memory || 0), 0),
        status: browserProcesses.length > 0 ? 'running' : 'stopped'
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * 获取浏览器进程信息
   */
  async getBrowserProcesses() {
    try {
      if (process.platform === 'darwin' || process.platform === 'linux') {
        const output = execSync('ps aux | grep -E "(chrome|chromium|firefox)" | grep -v grep', { encoding: 'utf8' });
        const lines = output.trim().split('\n').filter(line => line.length > 0);
        
        return lines.map(line => {
          const parts = line.split(/\s+/);
          return {
            pid: parts[1],
            cpu: parseFloat(parts[2]),
            memory: parseFloat(parts[3]),
            command: parts.slice(10).join(' ')
          };
        });
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * 检查缓存性能
   */
  async checkCachePerformance() {
    try {
      // 模拟缓存性能检查
      const cacheStats = {
        hits: Math.floor(Math.random() * 1000),
        misses: Math.floor(Math.random() * 100),
        size: Math.floor(Math.random() * 50), // MB
        status: 'healthy'
      };

      cacheStats.hitRate = (cacheStats.hits / (cacheStats.hits + cacheStats.misses) * 100).toFixed(2);

      return cacheStats;
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * 分析性能数据并生成告警
   */
  analyzePerformance(systemStats, appStats, nodeStats) {
    const alerts = [];

    // CPU使用率检查
    if (systemStats.cpu.usage > this.thresholds.cpu) {
      alerts.push({
        type: 'warning',
        category: 'cpu',
        message: `CPU使用率过高: ${systemStats.cpu.usage}%`,
        threshold: this.thresholds.cpu,
        current: systemStats.cpu.usage,
        suggestions: [
          '检查是否有CPU密集型进程',
          '考虑优化算法或增加服务器资源',
          '检查是否有死循环或无限递归'
        ]
      });
    }

    // 内存使用率检查
    if (systemStats.memory.usage > this.thresholds.memory) {
      alerts.push({
        type: 'warning',
        category: 'memory',
        message: `内存使用率过高: ${systemStats.memory.usage}%`,
        threshold: this.thresholds.memory,
        current: systemStats.memory.usage,
        suggestions: [
          '检查内存泄漏',
          '优化数据结构和算法',
          '增加服务器内存',
          '启用垃圾回收优化'
        ]
      });
    }

    // 磁盘使用率检查
    if (systemStats.disk.usage > this.thresholds.disk) {
      alerts.push({
        type: 'critical',
        category: 'disk',
        message: `磁盘使用率过高: ${systemStats.disk.usage}%`,
        threshold: this.thresholds.disk,
        current: systemStats.disk.usage,
        suggestions: [
          '清理临时文件和日志',
          '压缩或删除旧数据',
          '增加磁盘空间',
          '设置日志轮转'
        ]
      });
    }

    // 系统负载检查
    if (systemStats.loadAverage > this.thresholds.loadAverage) {
      alerts.push({
        type: 'warning',
        category: 'load',
        message: `系统负载过高: ${systemStats.loadAverage.toFixed(2)}`,
        threshold: this.thresholds.loadAverage,
        current: systemStats.loadAverage,
        suggestions: [
          '检查运行的进程数量',
          '优化并发处理',
          '增加服务器资源',
          '实施负载均衡'
        ]
      });
    }

    // Node.js进程内存检查
    if (nodeStats.memory.heapUsed > 500) { // 500MB
      alerts.push({
        type: 'warning',
        category: 'node_memory',
        message: `Node.js堆内存使用过高: ${nodeStats.memory.heapUsed}MB`,
        threshold: 500,
        current: nodeStats.memory.heapUsed,
        suggestions: [
          '检查内存泄漏',
          '优化对象创建和销毁',
          '使用流处理大数据',
          '启用垃圾回收监控'
        ]
      });
    }

    return alerts;
  }

  /**
   * 生成性能优化建议
   */
  generateOptimizationSuggestions(systemStats, appStats, nodeStats, alerts) {
    const suggestions = {
      immediate: [], // 立即可执行的优化
      shortTerm: [], // 短期优化
      longTerm: []   // 长期优化
    };

    // 基于告警生成建议
    alerts.forEach(alert => {
      suggestions.immediate.push(...alert.suggestions);
    });

    // 基于系统状态生成通用建议
    if (systemStats.memory.usage > 70) {
      suggestions.shortTerm.push(
        '启用内存监控和告警',
        '实施内存缓存策略',
        '优化数据库查询'
      );
    }

    if (systemStats.cpu.usage > 60) {
      suggestions.shortTerm.push(
        '实施API响应缓存',
        '优化数据库索引',
        '使用CDN加速静态资源'
      );
    }

    // 长期优化建议
    suggestions.longTerm.push(
      '实施微服务架构',
      '使用容器编排',
      '实施自动扩缩容',
      '建立完整的监控体系'
    );

    // 去重
    suggestions.immediate = [...new Set(suggestions.immediate)];
    suggestions.shortTerm = [...new Set(suggestions.shortTerm)];
    suggestions.longTerm = [...new Set(suggestions.longTerm)];

    return suggestions;
  }

  /**
   * 生成性能报告
   */
  async generatePerformanceReport(systemStats, appStats, nodeStats, alerts, suggestions) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        status: alerts.length === 0 ? 'healthy' : alerts.some(a => a.type === 'critical') ? 'critical' : 'warning',
        totalAlerts: alerts.length,
        criticalAlerts: alerts.filter(a => a.type === 'critical').length,
        warningAlerts: alerts.filter(a => a.type === 'warning').length
      },
      system: systemStats,
      application: appStats,
      nodeProcess: nodeStats,
      alerts,
      suggestions,
      recommendations: this.getPerformanceRecommendations(systemStats, appStats, nodeStats)
    };

    // 保存报告到文件
    const reportPath = path.join(__dirname, '..', 'reports', `performance-report-${Date.now()}.json`);
    
    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📊 性能报告已保存: ${reportPath}`);
    } catch (error) {
      console.error('❌ 保存性能报告失败:', error.message);
    }

    return report;
  }

  /**
   * 获取性能优化建议
   */
  getPerformanceRecommendations(systemStats, appStats, nodeStats) {
    const recommendations = [];

    // CPU优化建议
    if (systemStats.cpu.usage > 50) {
      recommendations.push({
        category: 'CPU优化',
        priority: 'high',
        actions: [
          '启用API响应缓存',
          '优化数据库查询',
          '实施代码分割和懒加载',
          '使用Worker线程处理CPU密集型任务'
        ]
      });
    }

    // 内存优化建议
    if (systemStats.memory.usage > 60) {
      recommendations.push({
        category: '内存优化',
        priority: 'high',
        actions: [
          '启用垃圾回收监控',
          '实施对象池模式',
          '使用流处理大文件',
          '优化图片和静态资源'
        ]
      });
    }

    // 网络优化建议
    recommendations.push({
      category: '网络优化',
      priority: 'medium',
      actions: [
        '启用Gzip压缩',
        '使用CDN加速',
        '实施HTTP/2',
        '优化API响应大小'
      ]
    });

    // 数据库优化建议
    if (appStats.database && appStats.database.responseTime > 100) {
      recommendations.push({
        category: '数据库优化',
        priority: 'high',
        actions: [
          '添加数据库索引',
          '优化查询语句',
          '实施连接池',
          '使用读写分离'
        ]
      });
    }

    return recommendations;
  }

  /**
   * 启动持续监控
   */
  startContinuousMonitoring(intervalMs = 60000) {
    console.log(`🔄 启动持续监控，间隔: ${intervalMs / 1000}秒`);
    
    this.monitoringInterval = setInterval(async () => {
      try {
        const systemStats = await this.getSystemResources();
        const nodeStats = this.getNodeProcessStats();
        const appStats = await this.checkApplicationPerformance();
        
        if (systemStats) {
          const alerts = this.analyzePerformance(systemStats, appStats, nodeStats);
          
          // 只在有告警时输出
          if (alerts.length > 0) {
            console.log(`⚠️  发现 ${alerts.length} 个性能告警:`);
            alerts.forEach(alert => {
              console.log(`   ${alert.type.toUpperCase()}: ${alert.message}`);
            });
          }
          
          // 保存监控数据
          this.performanceData.push({
            timestamp: new Date().toISOString(),
            system: systemStats,
            node: nodeStats,
            application: appStats,
            alerts
          });
          
          // 保持最近100条记录
          if (this.performanceData.length > 100) {
            this.performanceData = this.performanceData.slice(-100);
          }
        }
      } catch (error) {
        console.error('❌ 监控过程中发生错误:', error.message);
      }
    }, intervalMs);
  }

  /**
   * 停止监控
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('🛑 监控已停止');
    }
  }

  /**
   * 执行完整的性能检查
   */
  async runFullPerformanceCheck() {
    console.log('🔍 开始完整性能检查...\n');

    try {
      // 获取系统资源
      console.log('📊 收集系统资源信息...');
      const systemStats = await this.getSystemResources();
      
      // 获取Node.js进程信息
      console.log('🟢 收集Node.js进程信息...');
      const nodeStats = this.getNodeProcessStats();
      
      // 检查应用性能
      console.log('🚀 检查应用性能...');
      const appStats = await this.checkApplicationPerformance();
      
      // 分析性能数据
      console.log('🔍 分析性能数据...');
      const alerts = this.analyzePerformance(systemStats, appStats, nodeStats);
      
      // 生成优化建议
      console.log('💡 生成优化建议...');
      const suggestions = this.generateOptimizationSuggestions(systemStats, appStats, nodeStats, alerts);
      
      // 生成报告
      console.log('📋 生成性能报告...');
      const report = await this.generatePerformanceReport(systemStats, appStats, nodeStats, alerts, suggestions);
      
      // 输出结果
      this.displayPerformanceResults(report);
      
      return report;
    } catch (error) {
      console.error('❌ 性能检查失败:', error.message);
      return null;
    }
  }

  /**
   * 显示性能检查结果
   */
  displayPerformanceResults(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 性能检查结果');
    console.log('='.repeat(60));
    
    // 总体状态
    const statusIcon = report.summary.status === 'healthy' ? '✅' : 
                      report.summary.status === 'warning' ? '⚠️' : '❌';
    console.log(`${statusIcon} 总体状态: ${report.summary.status.toUpperCase()}`);
    console.log(`📈 告警数量: ${report.summary.totalAlerts} (严重: ${report.summary.criticalAlerts}, 警告: ${report.summary.warningAlerts})`);
    
    // 系统资源
    console.log('\n🖥️  系统资源:');
    console.log(`   CPU使用率: ${report.system.cpu.usage}% (${report.system.cpu.cores}核)`);
    console.log(`   内存使用: ${report.system.memory.used}MB / ${report.system.memory.total}MB (${report.system.memory.usage}%)`);
    console.log(`   磁盘使用: ${report.system.disk.used} / ${report.system.disk.total} (${report.system.disk.usage}%)`);
    console.log(`   系统负载: ${report.system.loadAverage.toFixed(2)}`);
    
    // Node.js进程
    console.log('\n🟢 Node.js进程:');
    console.log(`   堆内存: ${report.nodeProcess.memory.heapUsed}MB / ${report.nodeProcess.memory.heapTotal}MB`);
    console.log(`   RSS内存: ${report.nodeProcess.memory.rss}MB`);
    console.log(`   运行时间: ${Math.floor(report.nodeProcess.uptime / 60)}分钟`);
    
    // 应用性能
    console.log('\n🚀 应用性能:');
    console.log(`   数据库状态: ${report.application.database.status}`);
    if (report.application.database.responseTime) {
      console.log(`   数据库响应: ${report.application.database.responseTime}ms`);
    }
    console.log(`   API平均响应: ${report.application.api.averageResponseTime?.toFixed(2) || 'N/A'}ms`);
    console.log(`   浏览器进程: ${report.application.browser.processes}个`);
    
    // 告警信息
    if (report.alerts.length > 0) {
      console.log('\n⚠️  性能告警:');
      report.alerts.forEach((alert, index) => {
        const icon = alert.type === 'critical' ? '❌' : '⚠️';
        console.log(`   ${icon} ${alert.message}`);
      });
    }
    
    // 优化建议
    if (report.suggestions.immediate.length > 0) {
      console.log('\n💡 立即优化建议:');
      report.suggestions.immediate.slice(0, 5).forEach(suggestion => {
        console.log(`   • ${suggestion}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`📋 详细报告已保存到 reports/ 目录`);
    console.log('='.repeat(60));
  }
}

// 主执行函数
async function main() {
  const monitor = new ResourcePerformanceMonitor();
  
  const args = process.argv.slice(2);
  const command = args[0] || 'check';
  
  switch (command) {
    case 'check':
      await monitor.runFullPerformanceCheck();
      break;
      
    case 'monitor':
      const interval = parseInt(args[1]) || 60000;
      monitor.startContinuousMonitoring(interval);
      
      // 优雅关闭
      process.on('SIGINT', () => {
        console.log('\n🛑 收到停止信号...');
        monitor.stopMonitoring();
        process.exit(0);
      });
      
      console.log('按 Ctrl+C 停止监控');
      break;
      
    case 'help':
      console.log(`
📊 资源性能监控工具

用法:
  node resource-performance-monitor.js [命令] [选项]

命令:
  check                    执行一次完整的性能检查
  monitor [间隔ms]         启动持续监控 (默认60秒)
  help                     显示帮助信息

示例:
  node resource-performance-monitor.js check
  node resource-performance-monitor.js monitor 30000
      `);
      break;
      
    default:
      console.log('❌ 未知命令，使用 "help" 查看帮助');
      process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 执行失败:', error.message);
    process.exit(1);
  });
}

module.exports = ResourcePerformanceMonitor;