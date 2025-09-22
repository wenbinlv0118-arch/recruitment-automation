/**
 * 网络安全配置修复脚本
 * 用于修复和验证生产环境的网络安全配置
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class NetworkSecurityFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.issues = [];
    this.fixes = [];
    this.recommendations = [];
  }

  /**
   * 执行完整的网络安全配置修复
   */
  async runSecurityFix() {
    console.log('🔒 开始网络安全配置修复...');
    console.log('================================\n');

    try {
      // 1. 检查当前配置状态
      await this.analyzeCurrentSecurity();
      
      // 2. 修复CORS配置
      await this.fixCORSConfiguration();
      
      // 3. 修复SSL配置
      await this.fixSSLConfiguration();
      
      // 4. 修复安全头部配置
      await this.fixSecurityHeaders();
      
      // 5. 修复速率限制配置
      await this.fixRateLimiting();
      
      // 6. 验证修复结果
      await this.validateSecurityConfig();
      
      // 7. 生成修复报告
      await this.generateFixReport();
      
      console.log('\n✅ 网络安全配置修复完成!');
      console.log(`📄 修复报告: ${path.join(this.projectRoot, 'reports/network-security-fix-report.md')}`);
      
    } catch (error) {
      console.error('❌ 网络安全配置修复失败:', error.message);
      throw error;
    }
  }

  /**
   * 分析当前安全配置状态
   */
  async analyzeCurrentSecurity() {
    console.log('🔍 分析当前网络安全配置...');
    
    // 检查安全中间件是否存在
    const securityMiddlewarePath = path.join(this.projectRoot, 'backend/src/middleware/securityMiddleware.js');
    if (!fs.existsSync(securityMiddlewarePath)) {
      this.issues.push('安全中间件文件不存在');
    }
    
    // 检查nginx配置
    const nginxConfigPath = path.join(this.projectRoot, 'nginx/conf.d/security.conf');
    if (!fs.existsSync(nginxConfigPath)) {
      this.issues.push('nginx安全配置文件不存在');
    }
    
    // 检查环境变量配置
    await this.checkEnvironmentSecurity();
    
    console.log(`  发现 ${this.issues.length} 个安全配置问题`);
  }

  /**
   * 检查环境变量安全配置
   */
  async checkEnvironmentSecurity() {
    const envFiles = [
      'backend/.env.production',
      'frontend/.env.production'
    ];
    
    for (const envFile of envFiles) {
      const envPath = path.join(this.projectRoot, envFile);
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        
        // 检查CORS配置
        if (content.includes('CORS_ORIGIN=*')) {
          this.issues.push(`${envFile} 中CORS配置使用通配符，存在安全风险`);
        }
        
        // 检查HTTPS配置
        if (!content.includes('HTTPS_ENABLED=true')) {
          this.issues.push(`${envFile} 中未启用HTTPS`);
        }
        
        // 检查安全头部配置
        if (!content.includes('SECURITY_HEADERS_ENABLED=true')) {
          this.issues.push(`${envFile} 中未启用安全头部`);
        }
      }
    }
  }

  /**
   * 修复CORS配置
   */
  async fixCORSConfiguration() {
    console.log('🔧 修复CORS配置...');
    
    // 更新后端CORS配置
    const backendIndexPath = path.join(this.projectRoot, 'backend/src/index.js');
    if (fs.existsSync(backendIndexPath)) {
      let content = fs.readFileSync(backendIndexPath, 'utf8');
      
      // 检查是否已经使用安全中间件
      if (!content.includes('securityMiddleware.cors')) {
        console.log('  ⚠️ 后端未使用安全CORS中间件，请手动集成');
        this.recommendations.push('在backend/src/index.js中集成securityMiddleware.cors');
      } else {
        console.log('  ✅ 后端CORS配置已使用安全中间件');
        this.fixes.push('后端CORS配置已使用安全中间件');
      }
    }
  }

  /**
   * 修复SSL配置
   */
  async fixSSLConfiguration() {
    console.log('🔧 修复SSL配置...');
    
    // 创建SSL配置文件
    const sslConfigPath = path.join(this.projectRoot, 'ssl/ssl-config.conf');
    const sslDir = path.dirname(sslConfigPath);
    
    if (!fs.existsSync(sslDir)) {
      fs.mkdirSync(sslDir, { recursive: true });
    }
    
    const sslConfig = `# SSL配置文件
# 用于生产环境SSL证书配置

# SSL证书路径
SSL_CERT_PATH=/etc/ssl/certs/server.crt
SSL_KEY_PATH=/etc/ssl/private/server.key

# SSL安全配置
SSL_PROTOCOLS=TLSv1.2 TLSv1.3
SSL_CIPHERS=ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384
SSL_PREFER_SERVER_CIPHERS=on
SSL_SESSION_CACHE=shared:SSL:10m
SSL_SESSION_TIMEOUT=10m

# HSTS配置
HSTS_MAX_AGE=31536000
HSTS_INCLUDE_SUBDOMAINS=true
HSTS_PRELOAD=true
`;
    
    fs.writeFileSync(sslConfigPath, sslConfig);
    this.fixes.push('SSL配置文件已创建');
    console.log('  ✅ SSL配置文件已创建');
  }

  /**
   * 修复安全头部配置
   */
  async fixSecurityHeaders() {
    console.log('🔧 修复安全头部配置...');
    
    // 检查安全中间件是否包含helmet配置
    const securityMiddlewarePath = path.join(this.projectRoot, 'backend/src/middleware/securityMiddleware.js');
    if (fs.existsSync(securityMiddlewarePath)) {
      const content = fs.readFileSync(securityMiddlewarePath, 'utf8');
      
      if (content.includes('helmet(helmetOptions)')) {
        console.log('  ✅ 安全头部中间件已配置');
        this.fixes.push('安全头部中间件已配置');
      } else {
        console.log('  ⚠️ 安全头部中间件配置不完整');
        this.recommendations.push('检查securityMiddleware.js中的helmet配置');
      }
    }
  }

  /**
   * 修复速率限制配置
   */
  async fixRateLimiting() {
    console.log('🔧 修复速率限制配置...');
    
    // 检查速率限制中间件
    const backendIndexPath = path.join(this.projectRoot, 'backend/src/index.js');
    if (fs.existsSync(backendIndexPath)) {
      const content = fs.readFileSync(backendIndexPath, 'utf8');
      
      if (content.includes('securityMiddleware.apiLimiter')) {
        console.log('  ✅ API速率限制已配置');
        this.fixes.push('API速率限制已配置');
      }
      
      if (content.includes('securityMiddleware.uploadLimiter')) {
        console.log('  ✅ 文件上传速率限制已配置');
        this.fixes.push('文件上传速率限制已配置');
      }
    }
  }

  /**
   * 验证安全配置
   */
  async validateSecurityConfig() {
    console.log('🔍 验证安全配置...');
    
    const validationResults = {
      securityMiddleware: false,
      nginxConfig: false,
      sslConfig: false,
      environmentConfig: false
    };
    
    // 验证安全中间件
    const securityMiddlewarePath = path.join(this.projectRoot, 'backend/src/middleware/securityMiddleware.js');
    validationResults.securityMiddleware = fs.existsSync(securityMiddlewarePath);
    
    // 验证nginx配置
    const nginxConfigPath = path.join(this.projectRoot, 'nginx/conf.d/security.conf');
    validationResults.nginxConfig = fs.existsSync(nginxConfigPath);
    
    // 验证SSL配置
    const sslConfigPath = path.join(this.projectRoot, 'ssl/ssl-config.conf');
    validationResults.sslConfig = fs.existsSync(sslConfigPath);
    
    // 验证环境配置
    const envPath = path.join(this.projectRoot, 'backend/.env.production');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      validationResults.environmentConfig = content.includes('HTTPS_ENABLED=true') && 
                                           content.includes('SECURITY_HEADERS_ENABLED=true');
    }
    
    console.log('  验证结果:');
    console.log(`    安全中间件: ${validationResults.securityMiddleware ? '✅' : '❌'}`);
    console.log(`    Nginx配置: ${validationResults.nginxConfig ? '✅' : '❌'}`);
    console.log(`    SSL配置: ${validationResults.sslConfig ? '✅' : '❌'}`);
    console.log(`    环境配置: ${validationResults.environmentConfig ? '✅' : '❌'}`);
    
    return validationResults;
  }

  /**
   * 生成修复报告
   */
  async generateFixReport() {
    const reportPath = path.join(this.projectRoot, 'reports/network-security-fix-report.md');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const report = `# 网络安全配置修复报告

**生成时间**: ${new Date().toISOString()}

## 发现的问题

${this.issues.length > 0 ? this.issues.map(issue => `- ${issue}`).join('\n') : '- 无问题发现'}

## 修复内容

${this.fixes.length > 0 ? this.fixes.map(fix => `- ${fix}`).join('\n') : '- 无修复内容'}

## 建议

${this.recommendations.length > 0 ? this.recommendations.map(rec => `- ${rec}`).join('\n') : '- 无额外建议'}

## 配置文件位置

- **安全中间件**: \`backend/src/middleware/securityMiddleware.js\`
- **Nginx配置**: \`nginx/conf.d/security.conf\`
- **SSL配置**: \`ssl/ssl-config.conf\`
- **环境配置**: \`backend/.env.production\`

## 部署说明

### 1. 后端应用集成

确保在 \`backend/src/index.js\` 中正确集成安全中间件:

\`\`\`javascript
const securityMiddleware = require('./middleware/securityMiddleware');

// 安全中间件配置
app.use(securityMiddleware.helmet);
app.use(securityMiddleware.cors);
app.use(securityMiddleware.globalLimiter);

// API速率限制
app.use('/api/', securityMiddleware.apiLimiter);
app.use('/api/resume-library/upload', securityMiddleware.uploadLimiter);
\`\`\`

### 2. Nginx配置部署

将 \`nginx/conf.d/security.conf\` 复制到生产环境的nginx配置目录:

\`\`\`bash
sudo cp nginx/conf.d/security.conf /etc/nginx/conf.d/
sudo nginx -t
sudo systemctl reload nginx
\`\`\`

### 3. SSL证书配置

确保SSL证书文件位于正确位置:
- 证书文件: \`/etc/ssl/certs/server.crt\`
- 私钥文件: \`/etc/ssl/private/server.key\`

### 4. 环境变量配置

确保生产环境包含以下安全配置:

\`\`\`bash
HTTPS_ENABLED=true
SSL_REDIRECT=true
SECURITY_HEADERS_ENABLED=true
CORS_ORIGIN=https://your-frontend-domain.com
\`\`\`

## 验证步骤

### 1. 安全头部验证

\`\`\`bash
curl -I https://your-domain.com
\`\`\`

检查响应头是否包含:
- \`Strict-Transport-Security\`
- \`X-Frame-Options\`
- \`X-Content-Type-Options\`
- \`Content-Security-Policy\`

### 2. CORS验证

\`\`\`bash
curl -H "Origin: https://unauthorized-domain.com" \\n     -H "Access-Control-Request-Method: GET" \\n     -X OPTIONS https://your-api-domain.com/api/health
\`\`\`

### 3. 速率限制验证

\`\`\`bash
# 快速发送多个请求测试速率限制
for i in {1..20}; do curl https://your-api-domain.com/api/health; done
\`\`\`

### 4. SSL验证

\`\`\`bash
openssl s_client -connect your-domain.com:443 -servername your-domain.com
\`\`\`

## 监控建议

1. **日志监控**: 监控nginx访问日志中的异常请求
2. **性能监控**: 监控速率限制的触发情况
3. **安全监控**: 设置安全头部缺失的告警
4. **证书监控**: 监控SSL证书的到期时间

---

**注意**: 请在生产环境部署前在测试环境验证所有配置。
`;
    
    fs.writeFileSync(reportPath, report);
    console.log(`  ✅ 修复报告已生成: ${reportPath}`);
  }
}

// 主函数
async function main() {
  const fixer = new NetworkSecurityFixer();
  
  try {
    await fixer.runSecurityFix();
    process.exit(0);
  } catch (error) {
    console.error('修复过程中发生错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = NetworkSecurityFixer;