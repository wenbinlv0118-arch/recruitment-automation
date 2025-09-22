/**
 * 数据监控脚本
 * 用于监控数据库健康状态和性能指标
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env.production') });

class DataMonitoring {
  constructor() {
    this.supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    this.metricsDir = path.join(__dirname, '../metrics');
  }

  /**
   * 检查数据库健康状态
   */
  async checkDatabaseHealth() {
    console.log('🏥 检查数据库健康状态...');
    
    const healthMetrics = {
      timestamp: new Date().toISOString(),
      connection: { status: 'unknown', responseTime: 0 },
      tables: {},
      storage: {},
      overall: 'unknown'
    };
    
    try {
      // 测试连接响应时间
      const startTime = Date.now();
      const { data, error } = await this.supabaseClient
        .from('users')
        .select('count')
        .limit(1);
      const responseTime = Date.now() - startTime;
      
      healthMetrics.connection = {
        status: error && error.code !== 'PGRST116' ? 'failed' : 'healthy',
        responseTime,
        error: error ? error.message : null
      };
      
      console.log(`  📡 连接状态: ${healthMetrics.connection.status}`);
      console.log(`  ⏱️ 响应时间: ${responseTime}ms`);
      
    } catch (error) {
      healthMetrics.connection = {
        status: 'failed',
        responseTime: 0,
        error: error.message
      };
    }
    
    // 检查表状态
    const tables = ['users', 'resumes', 'jobs', 'applications'];
    for (const tableName of tables) {
      try {
        const { count, error } = await this.supabaseClient
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        healthMetrics.tables[tableName] = {
          status: error ? 'error' : 'healthy',
          recordCount: count || 0,
          error: error ? error.message : null
        };
        
        console.log(`  📊 表 ${tableName}: ${count || 0} 条记录`);
        
      } catch (error) {
        healthMetrics.tables[tableName] = {
          status: 'error',
          recordCount: 0,
          error: error.message
        };
      }
    }
    
    // 计算整体健康状态
    const hasConnectionIssues = healthMetrics.connection.status !== 'healthy';
    const hasTableIssues = Object.values(healthMetrics.tables)
      .some(table => table.status === 'error');
    
    if (hasConnectionIssues) {
      healthMetrics.overall = 'critical';
    } else if (hasTableIssues) {
      healthMetrics.overall = 'warning';
    } else {
      healthMetrics.overall = 'healthy';
    }
    
    console.log(`  🎯 整体状态: ${healthMetrics.overall}`);
    
    // 保存监控数据
    if (!fs.existsSync(this.metricsDir)) {
      fs.mkdirSync(this.metricsDir, { recursive: true });
    }
    
    const metricsFile = path.join(this.metricsDir, `health-${Date.now()}.json`);
    fs.writeFileSync(metricsFile, JSON.stringify(healthMetrics, null, 2));
    
    return healthMetrics;
  }

  /**
   * 生成监控报告
   */
  async generateMonitoringReport() {
    console.log('📋 生成监控报告...');
    
    const healthMetrics = await this.checkDatabaseHealth();
    
    const report = `# 数据库监控报告

**生成时间**: ${new Date().toISOString()}

## 连接状态

- **状态**: ${healthMetrics.connection.status}
- **响应时间**: ${healthMetrics.connection.responseTime}ms
${healthMetrics.connection.error ? `- **错误**: ${healthMetrics.connection.error}` : ''}

## 表状态

${Object.entries(healthMetrics.tables).map(([tableName, metrics]) => `- **${tableName}**: ${metrics.status} (${metrics.recordCount} 条记录)${metrics.error ? ` - 错误: ${metrics.error}` : ''}`).join('
')}

## 整体健康状态

**状态**: ${healthMetrics.overall}

${healthMetrics.overall === 'critical' ? '🚨 **需要立即关注**: 数据库连接存在问题' : ''}
${healthMetrics.overall === 'warning' ? '⚠️ **需要关注**: 部分表存在问题' : ''}
${healthMetrics.overall === 'healthy' ? '✅ **状态良好**: 所有检查项正常' : ''}

## 建议

${healthMetrics.overall !== 'healthy' ? '- 检查数据库连接配置
- 验证表结构完整性
- 查看详细错误日志' : '- 继续定期监控
- 保持当前配置'}
`;
    
    const reportPath = path.join(__dirname, '../reports/database-monitoring-report.md');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportPath, report);
    console.log(`  ✅ 监控报告已生成: ${reportPath}`);
    
    return { healthMetrics, reportPath };
  }
}

// 主函数
async function main() {
  const monitoring = new DataMonitoring();
  
  try {
    await monitoring.generateMonitoringReport();
    process.exit(0);
  } catch (error) {
    console.error('监控过程中发生错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = DataMonitoring;
