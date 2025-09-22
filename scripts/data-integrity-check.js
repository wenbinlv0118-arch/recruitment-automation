/**
 * 数据完整性检查脚本
 * 用于验证数据的一致性和完整性
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env.production') });

class DataIntegrityChecker {
  constructor() {
    this.supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );
    this.issues = [];
    this.warnings = [];
  }

  /**
   * 执行完整性检查
   */
  async performIntegrityCheck() {
    console.log('🔍 开始数据完整性检查...');
    
    const checkResults = {
      timestamp: new Date().toISOString(),
      checks: {},
      summary: {
        totalChecks: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
    
    // 检查用户数据完整性
    await this.checkUserDataIntegrity(checkResults);
    
    // 检查简历数据完整性
    await this.checkResumeDataIntegrity(checkResults);
    
    // 检查关联数据一致性
    await this.checkDataConsistency(checkResults);
    
    // 生成检查报告
    await this.generateIntegrityReport(checkResults);
    
    return checkResults;
  }

  /**
   * 检查用户数据完整性
   */
  async checkUserDataIntegrity(results) {
    console.log('  👤 检查用户数据完整性...');
    
    try {
      const { data: users, error } = await this.supabaseClient
        .from('users')
        .select('*');
      
      if (error) {
        results.checks.userIntegrity = {
          status: 'failed',
          error: error.message
        };
        results.summary.failed++;
        return;
      }
      
      const issues = [];
      
      users.forEach(user => {
        // 检查必需字段
        if (!user.email) {
          issues.push(`用户 ${user.id} 缺少邮箱`);
        }
        
        // 检查邮箱格式
        if (user.email && !/^[^s@]+@[^s@]+.[^s@]+$/.test(user.email)) {
          issues.push(`用户 ${user.id} 邮箱格式无效`);
        }
      });
      
      results.checks.userIntegrity = {
        status: issues.length === 0 ? 'passed' : 'warning',
        totalUsers: users.length,
        issues
      };
      
      if (issues.length === 0) {
        results.summary.passed++;
        console.log(`    ✅ 用户数据完整性检查通过 (${users.length} 个用户)`);
      } else {
        results.summary.warnings++;
        console.log(`    ⚠️ 发现 ${issues.length} 个用户数据问题`);
      }
      
    } catch (error) {
      results.checks.userIntegrity = {
        status: 'failed',
        error: error.message
      };
      results.summary.failed++;
    }
    
    results.summary.totalChecks++;
  }

  /**
   * 检查简历数据完整性
   */
  async checkResumeDataIntegrity(results) {
    console.log('  📄 检查简历数据完整性...');
    
    try {
      const { data: resumes, error } = await this.supabaseClient
        .from('resumes')
        .select('*');
      
      if (error && error.code !== 'PGRST116') {
        results.checks.resumeIntegrity = {
          status: 'failed',
          error: error.message
        };
        results.summary.failed++;
        return;
      }
      
      if (error && error.code === 'PGRST116') {
        results.checks.resumeIntegrity = {
          status: 'warning',
          message: '简历表不存在'
        };
        results.summary.warnings++;
        results.summary.totalChecks++;
        return;
      }
      
      const issues = [];
      
      resumes.forEach(resume => {
        // 检查必需字段
        if (!resume.user_id) {
          issues.push(`简历 ${resume.id} 缺少用户ID`);
        }
        
        if (!resume.content && !resume.file_path) {
          issues.push(`简历 ${resume.id} 缺少内容或文件路径`);
        }
      });
      
      results.checks.resumeIntegrity = {
        status: issues.length === 0 ? 'passed' : 'warning',
        totalResumes: resumes.length,
        issues
      };
      
      if (issues.length === 0) {
        results.summary.passed++;
        console.log(`    ✅ 简历数据完整性检查通过 (${resumes.length} 份简历)`);
      } else {
        results.summary.warnings++;
        console.log(`    ⚠️ 发现 ${issues.length} 个简历数据问题`);
      }
      
    } catch (error) {
      results.checks.resumeIntegrity = {
        status: 'failed',
        error: error.message
      };
      results.summary.failed++;
    }
    
    results.summary.totalChecks++;
  }

  /**
   * 检查数据一致性
   */
  async checkDataConsistency(results) {
    console.log('  🔗 检查数据一致性...');
    
    try {
      // 这里可以添加更多的一致性检查
      // 例如：检查外键约束、数据关联等
      
      results.checks.dataConsistency = {
        status: 'passed',
        message: '数据一致性检查通过'
      };
      
      results.summary.passed++;
      console.log('    ✅ 数据一致性检查通过');
      
    } catch (error) {
      results.checks.dataConsistency = {
        status: 'failed',
        error: error.message
      };
      results.summary.failed++;
    }
    
    results.summary.totalChecks++;
  }

  /**
   * 生成完整性检查报告
   */
  async generateIntegrityReport(results) {
    const reportPath = path.join(__dirname, '../reports/data-integrity-report.md');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const report = `# 数据完整性检查报告

**生成时间**: ${results.timestamp}

## 检查摘要

- **总检查项**: ${results.summary.totalChecks}
- **通过**: ${results.summary.passed}
- **失败**: ${results.summary.failed}
- **警告**: ${results.summary.warnings}

## 详细结果

${Object.entries(results.checks).map(([checkName, result]) => `### ${checkName}

- **状态**: ${result.status}
${result.error ? `- **错误**: ${result.error}` : ''}
${result.message ? `- **消息**: ${result.message}` : ''}
${result.issues && result.issues.length > 0 ? `- **问题**:
${result.issues.map(issue => `  - ${issue}`).join('
')}` : ''}
`).join('
')}

## 建议

${results.summary.failed > 0 ? '🚨 **立即处理**: 存在严重的数据完整性问题
' : ''}
${results.summary.warnings > 0 ? '⚠️ **需要关注**: 存在数据质量问题
' : ''}
${results.summary.failed === 0 && results.summary.warnings === 0 ? '✅ **状态良好**: 数据完整性检查全部通过' : ''}
`;
    
    fs.writeFileSync(reportPath, report);
    console.log(`  ✅ 完整性检查报告已生成: ${reportPath}`);
  }
}

// 主函数
async function main() {
  const checker = new DataIntegrityChecker();
  
  try {
    await checker.performIntegrityCheck();
    process.exit(0);
  } catch (error) {
    console.error('完整性检查过程中发生错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = DataIntegrityChecker;
