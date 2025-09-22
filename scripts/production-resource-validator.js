#!/usr/bin/env node

/**
 * 生产环境资源配置验证脚本
 * 验证Zeabur部署环境的资源配置和限制
 * 确保生产环境资源配置符合要求
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class ProductionResourceValidator {
  constructor() {
    this.validationResults = [];
    this.errors = [];
    this.warnings = [];
    
    // 生产环境资源要求
    this.requirements = {
      memory: {
        minimum: 512,    // MB
        recommended: 1024 // MB
      },
      cpu: {
        minimum: 0.5,    // vCPU
        recommended: 1   // vCPU
      },
      disk: {
        minimum: 1024,   // MB
        recommended: 2048 // MB
      },
      nodeVersion: {
        minimum: '16.0.0',
        recommended: '18.0.0'
      },
      environment: {
        required: [
          'NODE_ENV',
          'PORT',
          'SUPABASE_URL',
          'SUPABASE_ANON_KEY',
          'JWT_SECRET',
          'CORS_ORIGIN'
        ],
        optional: [
          'UPLOAD_MAX_SIZE',
          'RATE_LIMIT_WINDOW',
          'RATE_LIMIT_MAX',
          'NODE_OPTIONS',
          'BROWSER_HEADLESS',
          'VNC_PASSWORD'
        ]
      }
    };
  }

  /**
   * 验证环境变量配置
   */
  async validateEnvironmentVariables() {
    console.log('🔍 验证环境变量配置...');
    
    const results = {
      required: { passed: [], missing: [] },
      optional: { present: [], missing: [] },
      values: {}
    };

    // 检查必需的环境变量
    for (const envVar of this.requirements.environment.required) {
      const value = process.env[envVar];
      if (value) {
        results.required.passed.push(envVar);
        results.values[envVar] = this.maskSensitiveValue(envVar, value);
      } else {
        results.required.missing.push(envVar);
        this.errors.push(`缺少必需的环境变量: ${envVar}`);
      }
    }

    // 检查可选的环境变量
    for (const envVar of this.requirements.environment.optional) {
      const value = process.env[envVar];
      if (value) {
        results.optional.present.push(envVar);
        results.values[envVar] = this.maskSensitiveValue(envVar, value);
      } else {
        results.optional.missing.push(envVar);
      }
    }

    // 验证特定环境变量的值
    await this.validateSpecificEnvironmentValues(results);

    this.validationResults.push({
      category: 'Environment Variables',
      status: results.required.missing.length === 0 ? 'passed' : 'failed',
      details: results
    });

    return results;
  }

  /**
   * 验证特定环境变量的值
   */
  async validateSpecificEnvironmentValues(results) {
    // 验证NODE_ENV
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv !== 'production') {
      this.warnings.push(`NODE_ENV应该设置为'production'，当前值: ${nodeEnv}`);
    }

    // 验证PORT
    const port = process.env.PORT;
    if (port && (isNaN(port) || parseInt(port) < 1 || parseInt(port) > 65535)) {
      this.errors.push(`PORT值无效: ${port}`);
    }

    // 验证CORS_ORIGIN
    const corsOrigin = process.env.CORS_ORIGIN;
    if (corsOrigin === '*') {
      this.warnings.push('CORS_ORIGIN设置为通配符(*)，生产环境建议设置具体域名');
    }

    // 验证JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret && jwtSecret.length < 32) {
      this.warnings.push('JWT_SECRET长度过短，建议至少32个字符');
    }

    // 验证UPLOAD_MAX_SIZE
    const uploadMaxSize = process.env.UPLOAD_MAX_SIZE;
    if (uploadMaxSize && isNaN(uploadMaxSize)) {
      this.errors.push(`UPLOAD_MAX_SIZE值无效: ${uploadMaxSize}`);
    }

    // 验证RATE_LIMIT配置
    const rateLimitWindow = process.env.RATE_LIMIT_WINDOW;
    const rateLimitMax = process.env.RATE_LIMIT_MAX;
    if (rateLimitWindow && isNaN(rateLimitWindow)) {
      this.errors.push(`RATE_LIMIT_WINDOW值无效: ${rateLimitWindow}`);
    }
    if (rateLimitMax && isNaN(rateLimitMax)) {
      this.errors.push(`RATE_LIMIT_MAX值无效: ${rateLimitMax}`);
    }
  }

  /**
   * 掩码敏感信息
   */
  maskSensitiveValue(key, value) {
    const sensitiveKeys = ['SECRET', 'KEY', 'PASSWORD', 'TOKEN'];
    const isSensitive = sensitiveKeys.some(sensitive => key.includes(sensitive));
    
    if (isSensitive && value.length > 8) {
      return value.substring(0, 4) + '*'.repeat(value.length - 8) + value.substring(value.length - 4);
    }
    
    return value;
  }

  /**
   * 验证Node.js版本
   */
  async validateNodeVersion() {
    console.log('🟢 验证Node.js版本...');
    
    const currentVersion = process.version;
    const versionNumber = currentVersion.replace('v', '');
    
    const results = {
      current: currentVersion,
      minimum: this.requirements.nodeVersion.minimum,
      recommended: this.requirements.nodeVersion.recommended,
      isValid: this.compareVersions(versionNumber, this.requirements.nodeVersion.minimum) >= 0,
      isRecommended: this.compareVersions(versionNumber, this.requirements.nodeVersion.recommended) >= 0
    };

    if (!results.isValid) {
      this.errors.push(`Node.js版本过低: ${currentVersion}，最低要求: ${this.requirements.nodeVersion.minimum}`);
    } else if (!results.isRecommended) {
      this.warnings.push(`Node.js版本建议升级到: ${this.requirements.nodeVersion.recommended}，当前: ${currentVersion}`);
    }

    this.validationResults.push({
      category: 'Node.js Version',
      status: results.isValid ? 'passed' : 'failed',
      details: results
    });

    return results;
  }

  /**
   * 版本比较函数
   */
  compareVersions(version1, version2) {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part > v2part) return 1;
      if (v1part < v2part) return -1;
    }
    
    return 0;
  }

  /**
   * 验证包依赖配置
   */
  async validatePackageDependencies() {
    console.log('📦 验证包依赖配置...');
    
    const results = {
      packageJson: { exists: false, valid: false },
      dependencies: { production: [], development: [], missing: [] },
      scripts: { present: [], missing: [] },
      engines: { defined: false, valid: false }
    };

    try {
      // 检查package.json
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJsonExists = await this.fileExists(packageJsonPath);
      
      if (packageJsonExists) {
        results.packageJson.exists = true;
        
        const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf8'));
        results.packageJson.valid = true;
        
        // 检查依赖
        if (packageJson.dependencies) {
          results.dependencies.production = Object.keys(packageJson.dependencies);
        }
        if (packageJson.devDependencies) {
          results.dependencies.development = Object.keys(packageJson.devDependencies);
        }
        
        // 检查脚本
        const requiredScripts = ['start', 'build'];
        const optionalScripts = ['dev', 'test', 'lint'];
        
        if (packageJson.scripts) {
          for (const script of requiredScripts) {
            if (packageJson.scripts[script]) {
              results.scripts.present.push(script);
            } else {
              results.scripts.missing.push(script);
              this.errors.push(`缺少必需的npm脚本: ${script}`);
            }
          }
          
          for (const script of optionalScripts) {
            if (packageJson.scripts[script]) {
              results.scripts.present.push(script);
            }
          }
        } else {
          this.errors.push('package.json中缺少scripts配置');
        }
        
        // 检查engines配置
        if (packageJson.engines) {
          results.engines.defined = true;
          if (packageJson.engines.node) {
            results.engines.valid = true;
            results.engines.nodeVersion = packageJson.engines.node;
          }
        } else {
          this.warnings.push('建议在package.json中定义engines.node版本');
        }
        
        // 检查关键依赖
        const criticalDependencies = ['express', 'cors', 'dotenv'];
        for (const dep of criticalDependencies) {
          if (!results.dependencies.production.includes(dep)) {
            results.dependencies.missing.push(dep);
            this.warnings.push(`建议添加关键依赖: ${dep}`);
          }
        }
        
      } else {
        this.errors.push('package.json文件不存在');
      }
      
    } catch (error) {
      this.errors.push(`验证package.json失败: ${error.message}`);
    }

    this.validationResults.push({
      category: 'Package Dependencies',
      status: results.packageJson.exists && results.scripts.missing.length === 0 ? 'passed' : 'failed',
      details: results
    });

    return results;
  }

  /**
   * 验证Zeabur配置文件
   */
  async validateZeaburConfiguration() {
    console.log('⚡ 验证Zeabur配置...');
    
    const results = {
      zbpackJson: { exists: false, valid: false, config: null },
      dockerfiles: { backend: false, vnc: false },
      envFiles: { production: false, zeabur: false }
    };

    try {
      // 检查zbpack.json
      const zbpackPath = path.join(process.cwd(), 'zbpack.json');
      if (await this.fileExists(zbpackPath)) {
        results.zbpackJson.exists = true;
        
        try {
          const zbpackConfig = JSON.parse(await fs.readFile(zbpackPath, 'utf8'));
          results.zbpackJson.valid = true;
          results.zbpackJson.config = zbpackConfig;
          
          // 验证配置结构
          if (!zbpackConfig.services) {
            this.warnings.push('zbpack.json中缺少services配置');
          } else {
            const services = Object.keys(zbpackConfig.services);
            if (!services.includes('backend')) {
              this.warnings.push('zbpack.json中缺少backend服务配置');
            }
            if (!services.includes('vnc-service')) {
              this.warnings.push('zbpack.json中缺少vnc-service服务配置');
            }
          }
          
        } catch (error) {
          this.errors.push(`zbpack.json格式无效: ${error.message}`);
        }
      } else {
        this.warnings.push('zbpack.json文件不存在，建议创建以优化部署');
      }

      // 检查Dockerfile
      const backendDockerfile = path.join(process.cwd(), 'backend', 'Dockerfile');
      const vncDockerfile = path.join(process.cwd(), 'vnc-service', 'Dockerfile');
      
      results.dockerfiles.backend = await this.fileExists(backendDockerfile);
      results.dockerfiles.vnc = await this.fileExists(vncDockerfile);
      
      if (!results.dockerfiles.backend) {
        this.warnings.push('backend/Dockerfile不存在');
      }
      if (!results.dockerfiles.vnc) {
        this.warnings.push('vnc-service/Dockerfile不存在');
      }

      // 检查环境配置文件
      const prodEnvPath = path.join(process.cwd(), 'backend', '.env.production');
      const zeaburEnvPath = path.join(process.cwd(), 'deploy', 'config', '.env.zeabur');
      
      results.envFiles.production = await this.fileExists(prodEnvPath);
      results.envFiles.zeabur = await this.fileExists(zeaburEnvPath);
      
      if (!results.envFiles.production) {
        this.warnings.push('backend/.env.production文件不存在');
      }
      if (!results.envFiles.zeabur) {
        this.warnings.push('deploy/config/.env.zeabur文件不存在');
      }

    } catch (error) {
      this.errors.push(`验证Zeabur配置失败: ${error.message}`);
    }

    this.validationResults.push({
      category: 'Zeabur Configuration',
      status: results.zbpackJson.exists ? 'passed' : 'warning',
      details: results
    });

    return results;
  }

  /**
   * 验证资源限制配置
   */
  async validateResourceLimits() {
    console.log('📊 验证资源限制配置...');
    
    const results = {
      nodeOptions: { defined: false, values: [] },
      memoryLimits: { configured: false, values: {} },
      uploadLimits: { configured: false, values: {} },
      rateLimits: { configured: false, values: {} }
    };

    // 检查NODE_OPTIONS
    const nodeOptions = process.env.NODE_OPTIONS;
    if (nodeOptions) {
      results.nodeOptions.defined = true;
      results.nodeOptions.values = nodeOptions.split(' ').filter(opt => opt.trim());
      
      // 检查内存限制
      const memoryOption = results.nodeOptions.values.find(opt => opt.includes('--max-old-space-size'));
      if (memoryOption) {
        const memorySize = memoryOption.split('=')[1];
        if (memorySize && parseInt(memorySize) < 512) {
          this.warnings.push(`内存限制过低: ${memorySize}MB，建议至少512MB`);
        }
      } else {
        this.warnings.push('建议设置--max-old-space-size限制Node.js内存使用');
      }
    } else {
      this.warnings.push('建议设置NODE_OPTIONS优化Node.js性能');
    }

    // 检查上传限制
    const uploadMaxSize = process.env.UPLOAD_MAX_SIZE;
    if (uploadMaxSize) {
      results.uploadLimits.configured = true;
      results.uploadLimits.values.maxSize = uploadMaxSize;
      
      const sizeInMB = parseInt(uploadMaxSize) / (1024 * 1024);
      if (sizeInMB > 50) {
        this.warnings.push(`上传文件大小限制过大: ${sizeInMB.toFixed(1)}MB`);
      }
    }

    // 检查速率限制
    const rateLimitWindow = process.env.RATE_LIMIT_WINDOW;
    const rateLimitMax = process.env.RATE_LIMIT_MAX;
    
    if (rateLimitWindow && rateLimitMax) {
      results.rateLimits.configured = true;
      results.rateLimits.values = {
        window: rateLimitWindow,
        max: rateLimitMax,
        requestsPerMinute: Math.round((parseInt(rateLimitMax) * 60000) / parseInt(rateLimitWindow))
      };
      
      if (results.rateLimits.values.requestsPerMinute > 1000) {
        this.warnings.push(`速率限制过于宽松: ${results.rateLimits.values.requestsPerMinute}请求/分钟`);
      }
    } else {
      this.warnings.push('建议配置API速率限制');
    }

    this.validationResults.push({
      category: 'Resource Limits',
      status: 'passed',
      details: results
    });

    return results;
  }

  /**
   * 验证安全配置
   */
  async validateSecurityConfiguration() {
    console.log('🔒 验证安全配置...');
    
    const results = {
      cors: { configured: false, secure: false },
      jwt: { configured: false, secure: false },
      https: { enforced: false },
      headers: { configured: false }
    };

    // 检查CORS配置
    const corsOrigin = process.env.CORS_ORIGIN;
    if (corsOrigin) {
      results.cors.configured = true;
      results.cors.secure = corsOrigin !== '*';
      
      if (!results.cors.secure) {
        this.warnings.push('CORS配置不安全，建议设置具体的域名白名单');
      }
    } else {
      this.errors.push('缺少CORS_ORIGIN配置');
    }

    // 检查JWT配置
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret) {
      results.jwt.configured = true;
      results.jwt.secure = jwtSecret.length >= 32 && !/^(test|demo|example)/.test(jwtSecret.toLowerCase());
      
      if (!results.jwt.secure) {
        this.warnings.push('JWT_SECRET不够安全，建议使用强随机字符串');
      }
    } else {
      this.errors.push('缺少JWT_SECRET配置');
    }

    // 检查HTTPS强制
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production') {
      results.https.enforced = true; // Zeabur默认提供HTTPS
    }

    this.validationResults.push({
      category: 'Security Configuration',
      status: results.cors.configured && results.jwt.configured ? 'passed' : 'failed',
      details: results
    });

    return results;
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 生成验证报告
   */
  async generateValidationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalChecks: this.validationResults.length,
        passed: this.validationResults.filter(r => r.status === 'passed').length,
        failed: this.validationResults.filter(r => r.status === 'failed').length,
        warnings: this.validationResults.filter(r => r.status === 'warning').length,
        errors: this.errors.length,
        warningCount: this.warnings.length
      },
      results: this.validationResults,
      errors: this.errors,
      warnings: this.warnings,
      recommendations: this.generateRecommendations()
    };

    // 保存报告
    const reportPath = path.join(__dirname, '..', 'reports', `resource-validation-${Date.now()}.json`);
    
    try {
      await fs.mkdir(path.dirname(reportPath), { recursive: true });
      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`📋 验证报告已保存: ${reportPath}`);
    } catch (error) {
      console.error('❌ 保存验证报告失败:', error.message);
    }

    return report;
  }

  /**
   * 生成优化建议
   */
  generateRecommendations() {
    const recommendations = [];

    // 基于错误生成建议
    if (this.errors.length > 0) {
      recommendations.push({
        priority: 'critical',
        category: '错误修复',
        items: this.errors.map(error => `修复: ${error}`)
      });
    }

    // 基于警告生成建议
    if (this.warnings.length > 0) {
      recommendations.push({
        priority: 'high',
        category: '配置优化',
        items: this.warnings.map(warning => `优化: ${warning}`)
      });
    }

    // 通用建议
    recommendations.push({
      priority: 'medium',
      category: '性能优化',
      items: [
        '启用Gzip压缩',
        '配置CDN加速',
        '实施API缓存策略',
        '优化数据库查询',
        '启用HTTP/2'
      ]
    });

    recommendations.push({
      priority: 'low',
      category: '监控和维护',
      items: [
        '设置性能监控',
        '配置错误告警',
        '实施日志管理',
        '定期安全审计',
        '建立备份策略'
      ]
    });

    return recommendations;
  }

  /**
   * 显示验证结果
   */
  displayValidationResults(report) {
    console.log('\n' + '='.repeat(60));
    console.log('🔍 生产环境资源配置验证结果');
    console.log('='.repeat(60));

    // 总体状态
    const overallStatus = report.summary.failed === 0 ? 
      (report.summary.warnings === 0 ? '✅ 通过' : '⚠️ 警告') : '❌ 失败';
    
    console.log(`📊 总体状态: ${overallStatus}`);
    console.log(`📈 检查项目: ${report.summary.totalChecks}`);
    console.log(`✅ 通过: ${report.summary.passed}`);
    console.log(`❌ 失败: ${report.summary.failed}`);
    console.log(`⚠️ 警告: ${report.summary.warnings}`);

    // 详细结果
    console.log('\n📋 详细检查结果:');
    report.results.forEach(result => {
      const icon = result.status === 'passed' ? '✅' : 
                   result.status === 'failed' ? '❌' : '⚠️';
      console.log(`   ${icon} ${result.category}: ${result.status.toUpperCase()}`);
    });

    // 错误信息
    if (report.errors.length > 0) {
      console.log('\n❌ 错误信息:');
      report.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
    }

    // 警告信息
    if (report.warnings.length > 0) {
      console.log('\n⚠️ 警告信息:');
      report.warnings.forEach(warning => {
        console.log(`   • ${warning}`);
      });
    }

    // 关键建议
    if (report.recommendations.length > 0) {
      const criticalRecs = report.recommendations.find(r => r.priority === 'critical');
      if (criticalRecs) {
        console.log('\n🚨 关键建议:');
        criticalRecs.items.slice(0, 5).forEach(item => {
          console.log(`   • ${item}`);
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📋 完整报告已保存到 reports/ 目录');
    console.log('='.repeat(60));
  }

  /**
   * 执行完整验证
   */
  async runFullValidation() {
    console.log('🔍 开始生产环境资源配置验证...\n');

    try {
      // 执行各项验证
      await this.validateEnvironmentVariables();
      await this.validateNodeVersion();
      await this.validatePackageDependencies();
      await this.validateZeaburConfiguration();
      await this.validateResourceLimits();
      await this.validateSecurityConfiguration();

      // 生成报告
      const report = await this.generateValidationReport();
      
      // 显示结果
      this.displayValidationResults(report);
      
      return report;
    } catch (error) {
      console.error('❌ 验证过程中发生错误:', error.message);
      return null;
    }
  }
}

// 主执行函数
async function main() {
  const validator = new ProductionResourceValidator();
  
  const args = process.argv.slice(2);
  const command = args[0] || 'validate';
  
  switch (command) {
    case 'validate':
      const report = await validator.runFullValidation();
      process.exit(report && report.summary.failed === 0 ? 0 : 1);
      break;
      
    case 'help':
      console.log(`
🔍 生产环境资源配置验证工具

用法:
  node production-resource-validator.js [命令]

命令:
  validate                 执行完整的资源配置验证
  help                     显示帮助信息

验证项目:
  • 环境变量配置
  • Node.js版本
  • 包依赖配置
  • Zeabur配置文件
  • 资源限制配置
  • 安全配置

示例:
  node production-resource-validator.js validate
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

module.exports = ProductionResourceValidator;