/**
 * 生产环境安全配置脚本
 * 用于配置和验证生产环境的网络安全设置
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class ProductionSecurityConfig {
  constructor() {
    this.securityChecks = [];
    this.configErrors = [];
    this.recommendations = [];
  }

  /**
   * 生成安全的CORS配置
   * @param {string} frontendDomain - 前端域名
   * @returns {Object} CORS配置对象
   */
  generateCORSConfig(frontendDomain) {
    const corsConfig = {
      origin: [frontendDomain],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
      ],
      credentials: true,
      maxAge: 86400, // 24小时预检缓存
      optionsSuccessStatus: 200
    };

    console.log('✅ 生成CORS配置:', JSON.stringify(corsConfig, null, 2));
    return corsConfig;
  }

  /**
   * 生成安全头部配置
   * @returns {Object} 安全头部配置
   */
  generateSecurityHeaders() {
    const securityHeaders = {
      // 内容安全策略
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' wss: https:",
        "frame-src 'none'",
        "object-src 'none'",
        "base-uri 'self'"
      ].join('; '),
      
      // XSS防护
      'X-XSS-Protection': '1; mode=block',
      
      // 内容类型嗅探防护
      'X-Content-Type-Options': 'nosniff',
      
      // 点击劫持防护
      'X-Frame-Options': 'DENY',
      
      // HTTPS强制
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      
      // 引用者策略
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // 权限策略
      'Permissions-Policy': [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=()',
        'usb=()'
      ].join(', ')
    };

    console.log('✅ 生成安全头部配置');
    return securityHeaders;
  }

  /**
   * 生成速率限制配置
   * @returns {Object} 速率限制配置
   */
  generateRateLimitConfig() {
    const rateLimitConfig = {
      // 全局限制
      global: {
        windowMs: 15 * 60 * 1000, // 15分钟
        max: 1000, // 每个IP最多1000次请求
        message: '请求过于频繁，请稍后再试',
        standardHeaders: true,
        legacyHeaders: false
      },
      
      // API限制
      api: {
        windowMs: 15 * 60 * 1000,
        max: 500,
        message: 'API请求过于频繁，请稍后再试'
      },
      
      // 认证限制
      auth: {
        windowMs: 15 * 60 * 1000,
        max: 10, // 登录尝试限制
        message: '登录尝试过于频繁，请15分钟后再试',
        skipSuccessfulRequests: true
      },
      
      // 文件上传限制
      upload: {
        windowMs: 60 * 60 * 1000, // 1小时
        max: 50, // 每小时最多50次上传
        message: '文件上传过于频繁，请稍后再试'
      }
    };

    console.log('✅ 生成速率限制配置');
    return rateLimitConfig;
  }

  /**
   * 生成输入验证配置
   * @returns {Object} 输入验证规则
   */
  generateInputValidationConfig() {
    const validationConfig = {
      // 文件上传验证
      fileUpload: {
        maxSize: 10 * 1024 * 1024, // 10MB
        allowedTypes: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain'
        ],
        maxFiles: 5
      },
      
      // 字符串验证
      string: {
        maxLength: 10000,
        minLength: 1,
        sanitize: true,
        allowedChars: /^[\u4e00-\u9fa5a-zA-Z0-9\s\-_@.]+$/
      },
      
      // 邮箱验证
      email: {
        pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        maxLength: 254
      },
      
      // 密码验证
      password: {
        minLength: 8,
        maxLength: 128,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true
      }
    };

    console.log('✅ 生成输入验证配置');
    return validationConfig;
  }

  /**
   * 检查SSL/TLS配置
   * @param {string} domain - 域名
   * @returns {Promise<Object>} SSL检查结果
   */
  async checkSSLConfig(domain) {
    return new Promise((resolve) => {
      const options = {
        hostname: domain.replace(/^https?:\/\//, ''),
        port: 443,
        path: '/',
        method: 'GET',
        timeout: 10000
      };

      const req = https.request(options, (res) => {
        const cert = res.socket.getPeerCertificate();
        const result = {
          valid: true,
          issuer: cert.issuer,
          subject: cert.subject,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          protocol: res.socket.getProtocol(),
          cipher: res.socket.getCipher()
        };
        
        console.log('✅ SSL证书验证通过');
        resolve(result);
      });

      req.on('error', (error) => {
        console.log('❌ SSL证书验证失败:', error.message);
        resolve({ valid: false, error: error.message });
      });

      req.on('timeout', () => {
        console.log('❌ SSL检查超时');
        req.destroy();
        resolve({ valid: false, error: 'Timeout' });
      });

      req.end();
    });
  }

  /**
   * 验证CORS配置
   * @param {string} backendUrl - 后端URL
   * @param {string} frontendUrl - 前端URL
   * @returns {Promise<Object>} CORS验证结果
   */
  async validateCORSConfig(backendUrl, frontendUrl) {
    return new Promise((resolve) => {
      const url = new URL('/api/health', backendUrl);
      
      const options = {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname,
        method: 'OPTIONS',
        headers: {
          'Origin': frontendUrl,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        },
        timeout: 10000
      };

      const protocol = url.protocol === 'https:' ? https : http;
      
      const req = protocol.request(options, (res) => {
        const corsHeaders = {
          origin: res.headers['access-control-allow-origin'],
          methods: res.headers['access-control-allow-methods'],
          headers: res.headers['access-control-allow-headers'],
          credentials: res.headers['access-control-allow-credentials']
        };

        const isValid = corsHeaders.origin === frontendUrl || corsHeaders.origin === '*';
        
        if (isValid) {
          console.log('✅ CORS配置验证通过');
        } else {
          console.log('❌ CORS配置验证失败');
        }

        resolve({
          valid: isValid,
          headers: corsHeaders,
          statusCode: res.statusCode
        });
      });

      req.on('error', (error) => {
        console.log('❌ CORS验证请求失败:', error.message);
        resolve({ valid: false, error: error.message });
      });

      req.on('timeout', () => {
        console.log('❌ CORS验证超时');
        req.destroy();
        resolve({ valid: false, error: 'Timeout' });
      });

      req.end();
    });
  }

  /**
   * 生成安全配置中间件代码
   * @param {Object} config - 配置对象
   * @returns {string} 中间件代码
   */
  generateSecurityMiddleware(config) {
    const middlewareCode = `
/**
 * 生产环境安全中间件
 * 自动生成 - 请勿手动修改
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// CORS配置
const corsOptions = ${JSON.stringify(config.cors, null, 2)};

// 安全头部配置
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
};

// 速率限制配置
const globalLimiter = rateLimit(${JSON.stringify(config.rateLimit.global, null, 2)});
const apiLimiter = rateLimit(${JSON.stringify(config.rateLimit.api, null, 2)});
const authLimiter = rateLimit(${JSON.stringify(config.rateLimit.auth, null, 2)});
const uploadLimiter = rateLimit(${JSON.stringify(config.rateLimit.upload, null, 2)});

// 输入验证中间件
const validateInput = (req, res, next) => {
  // 实现输入验证逻辑
  const validation = ${JSON.stringify(config.validation, null, 2)};
  
  // 验证文件上传
  if (req.files) {
    for (const file of req.files) {
      if (file.size > validation.fileUpload.maxSize) {
        return res.status(400).json({ error: '文件大小超过限制' });
      }
      if (!validation.fileUpload.allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: '不支持的文件类型' });
      }
    }
  }
  
  next();
};

module.exports = {
  cors: cors(corsOptions),
  helmet: helmet(helmetOptions),
  globalLimiter,
  apiLimiter,
  authLimiter,
  uploadLimiter,
  validateInput
};
`;

    return middlewareCode;
  }

  /**
   * 执行完整的安全配置检查
   * @param {Object} options - 检查选项
   * @returns {Promise<Object>} 检查结果
   */
  async runSecurityAudit(options = {}) {
    const {
      frontendUrl = 'https://recruitment-frontend-xxx.zeabur.app',
      backendUrl = 'https://recruitment-backend-xxx.zeabur.app'
    } = options;

    console.log('🔒 开始生产环境安全配置检查...\n');

    const results = {
      timestamp: new Date().toISOString(),
      frontendUrl,
      backendUrl,
      checks: {},
      recommendations: [],
      errors: []
    };

    try {
      // 1. SSL/TLS检查
      console.log('1. 检查SSL/TLS配置...');
      results.checks.ssl = await this.checkSSLConfig(backendUrl);

      // 2. CORS配置检查
      console.log('2. 检查CORS配置...');
      results.checks.cors = await this.validateCORSConfig(backendUrl, frontendUrl);

      // 3. 生成安全配置
      console.log('3. 生成安全配置...');
      const securityConfig = {
        cors: this.generateCORSConfig(frontendUrl),
        headers: this.generateSecurityHeaders(),
        rateLimit: this.generateRateLimitConfig(),
        validation: this.generateInputValidationConfig()
      };

      // 4. 生成中间件代码
      const middlewareCode = this.generateSecurityMiddleware(securityConfig);
      const middlewarePath = path.join(__dirname, '../backend/src/middleware/securityMiddleware.js');
      
      // 确保目录存在
      const middlewareDir = path.dirname(middlewarePath);
      if (!fs.existsSync(middlewareDir)) {
        fs.mkdirSync(middlewareDir, { recursive: true });
      }
      
      fs.writeFileSync(middlewarePath, middlewareCode);
      console.log('✅ 安全中间件代码已生成:', middlewarePath);

      // 5. 生成配置文件
      const configPath = path.join(__dirname, '../config/security-config.json');
      fs.writeFileSync(configPath, JSON.stringify(securityConfig, null, 2));
      console.log('✅ 安全配置文件已生成:', configPath);

      results.config = securityConfig;
      results.middlewarePath = middlewarePath;
      results.configPath = configPath;

      // 6. 生成建议
      this.generateRecommendations(results);

    } catch (error) {
      console.error('❌ 安全配置检查失败:', error);
      results.errors.push(error.message);
    }

    return results;
  }

  /**
   * 生成安全建议
   * @param {Object} results - 检查结果
   */
  generateRecommendations(results) {
    const recommendations = [];

    // SSL建议
    if (!results.checks.ssl?.valid) {
      recommendations.push({
        type: 'SSL',
        priority: 'HIGH',
        message: '建议配置有效的SSL证书，确保HTTPS连接安全'
      });
    }

    // CORS建议
    if (!results.checks.cors?.valid) {
      recommendations.push({
        type: 'CORS',
        priority: 'HIGH',
        message: '建议正确配置CORS，避免使用通配符(*)，指定具体的前端域名'
      });
    }

    // 通用安全建议
    recommendations.push(
      {
        type: 'MONITORING',
        priority: 'MEDIUM',
        message: '建议集成安全监控工具，如Sentry或LogRocket'
      },
      {
        type: 'BACKUP',
        priority: 'MEDIUM',
        message: '建议定期备份数据库和配置文件'
      },
      {
        type: 'UPDATES',
        priority: 'LOW',
        message: '建议定期更新依赖包，修复安全漏洞'
      }
    );

    results.recommendations = recommendations;
    
    console.log('\n📋 安全建议:');
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. [${rec.priority}] ${rec.type}: ${rec.message}`);
    });
  }

  /**
   * 生成安全配置报告
   * @param {Object} results - 检查结果
   * @returns {string} 报告内容
   */
  generateSecurityReport(results) {
    const report = `
# 生产环境安全配置报告

**生成时间**: ${results.timestamp}
**前端URL**: ${results.frontendUrl}
**后端URL**: ${results.backendUrl}

## 安全检查结果

### SSL/TLS配置
- **状态**: ${results.checks.ssl?.valid ? '✅ 通过' : '❌ 失败'}
- **协议**: ${results.checks.ssl?.protocol || 'N/A'}
- **证书有效期**: ${results.checks.ssl?.validTo || 'N/A'}

### CORS配置
- **状态**: ${results.checks.cors?.valid ? '✅ 通过' : '❌ 失败'}
- **允许源**: ${results.checks.cors?.headers?.origin || 'N/A'}
- **允许方法**: ${results.checks.cors?.headers?.methods || 'N/A'}

## 生成的配置文件

- **安全中间件**: ${results.middlewarePath}
- **配置文件**: ${results.configPath}

## 安全建议

${results.recommendations.map((rec, index) => 
  `${index + 1}. **[${rec.priority}] ${rec.type}**: ${rec.message}`
).join('\n')}

## 下一步操作

1. 将生成的安全中间件集成到Express应用中
2. 更新环境变量配置
3. 重新部署应用
4. 验证安全配置是否生效

---
*此报告由生产环境安全配置脚本自动生成*
`;

    return report;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  const securityConfig = new ProductionSecurityConfig();
  
  // 从命令行参数获取URL
  const frontendUrl = process.argv[2] || 'https://recruitment-frontend-xxx.zeabur.app';
  const backendUrl = process.argv[3] || 'https://recruitment-backend-xxx.zeabur.app';
  
  securityConfig.runSecurityAudit({ frontendUrl, backendUrl })
    .then(results => {
      console.log('\n🎯 安全配置检查完成!');
      
      // 生成报告
      const report = securityConfig.generateSecurityReport(results);
      const reportPath = path.join(__dirname, '../reports/security-audit-report.md');
      
      // 确保报告目录存在
      const reportDir = path.dirname(reportPath);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      fs.writeFileSync(reportPath, report);
      console.log('📄 安全报告已生成:', reportPath);
      
      // 输出结果摘要
      console.log('\n📊 检查摘要:');
      console.log(`- SSL配置: ${results.checks.ssl?.valid ? '✅' : '❌'}`);
      console.log(`- CORS配置: ${results.checks.cors?.valid ? '✅' : '❌'}`);
      console.log(`- 安全建议: ${results.recommendations.length} 条`);
      console.log(`- 错误数量: ${results.errors.length} 个`);
    })
    .catch(error => {
      console.error('❌ 安全配置检查失败:', error);
      process.exit(1);
    });
}

module.exports = ProductionSecurityConfig;