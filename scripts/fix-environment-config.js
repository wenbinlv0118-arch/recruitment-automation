/**
 * 环境变量配置修复脚本
 * 统一生产环境配置，解决CORS、JWT、SSL配置问题
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class EnvironmentConfigFixer {
  constructor() {
    this.projectRoot = process.cwd();
    this.backupDir = path.join(this.projectRoot, 'backups', `env-config-${Date.now()}`);
    this.issues = [];
    this.fixes = [];
  }

  /**
   * 主修复流程
   */
  async fix() {
    console.log('🔧 开始修复环境变量配置问题...');
    
    try {
      // 1. 创建备份目录
      await this.createBackup();
      
      // 2. 检查现有配置
      await this.analyzeCurrentConfig();
      
      // 3. 修复后端环境配置
      await this.fixBackendConfig();
      
      // 4. 修复前端环境配置
      await this.fixFrontendConfig();
      
      // 5. 修复部署配置
      await this.fixDeploymentConfig();
      
      // 6. 验证修复结果
      await this.validateConfig();
      
      // 7. 生成修复报告
      await this.generateReport();
      
      console.log('✅ 环境变量配置修复完成！');
      
    } catch (error) {
      console.error('❌ 修复过程中出现错误:', error.message);
      throw error;
    }
  }

  /**
   * 创建配置备份
   */
  async createBackup() {
    console.log('📋 创建配置文件备份...');
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const configFiles = [
      'backend/.env.production',
      'frontend/.env.production',
      'deploy/config/.env.zeabur',
      'deploy/config/.env.example'
    ];

    for (const file of configFiles) {
      const sourcePath = path.join(this.projectRoot, file);
      if (fs.existsSync(sourcePath)) {
        const backupFileName = file.replace(/\//g, '_');
        const backupPath = path.join(this.backupDir, backupFileName);
        // 确保备份目录存在
        const backupFileDir = path.dirname(backupPath);
        if (!fs.existsSync(backupFileDir)) {
          fs.mkdirSync(backupFileDir, { recursive: true });
        }
        fs.copyFileSync(sourcePath, backupPath);
        console.log(`  ✅ 备份: ${file}`);
      } else {
        console.log(`  ⚠️  文件不存在，跳过备份: ${file}`);
      }
    }
  }

  /**
   * 分析当前配置问题
   */
  async analyzeCurrentConfig() {
    console.log('🔍 分析当前环境配置...');
    
    // 检查JWT密钥安全性
    await this.checkJWTSecurity();
    
    // 检查CORS配置
    await this.checkCORSConfig();
    
    // 检查SSL配置
    await this.checkSSLConfig();
    
    // 检查数据库配置
    await this.checkDatabaseConfig();
    
    // 检查浏览器配置
    await this.checkBrowserConfig();
  }

  /**
   * 检查JWT安全配置
   */
  async checkJWTSecurity() {
    const backendEnvPath = path.join(this.projectRoot, 'backend/.env.production');
    
    if (fs.existsSync(backendEnvPath)) {
      const content = fs.readFileSync(backendEnvPath, 'utf8');
      const jwtMatch = content.match(/JWT_SECRET=(.+)/);
      
      if (!jwtMatch) {
        this.issues.push('JWT_SECRET 未配置');
      } else {
        const jwtSecret = jwtMatch[1].trim();
        if (jwtSecret.length < 32) {
          this.issues.push('JWT_SECRET 长度不足（建议至少32字符）');
        }
        if (jwtSecret.includes('your_') || jwtSecret.includes('secret')) {
          this.issues.push('JWT_SECRET 使用默认值，存在安全风险');
        }
      }
    } else {
      this.issues.push('backend/.env.production 文件不存在');
    }
  }

  /**
   * 检查CORS配置
   */
  async checkCORSConfig() {
    const backendEnvPath = path.join(this.projectRoot, 'backend/.env.production');
    
    if (fs.existsSync(backendEnvPath)) {
      const content = fs.readFileSync(backendEnvPath, 'utf8');
      const corsMatch = content.match(/CORS_ORIGIN=(.+)/);
      
      if (!corsMatch) {
        this.issues.push('CORS_ORIGIN 未配置');
      } else {
        const corsOrigin = corsMatch[1].trim();
        if (corsOrigin === '*') {
          this.issues.push('CORS_ORIGIN 配置为通配符，存在安全风险');
        }
      }
    }
  }

  /**
   * 检查SSL配置
   */
  async checkSSLConfig() {
    // 检查是否配置了HTTPS相关环境变量
    const requiredSSLVars = ['HTTPS_ENABLED', 'SSL_CERT_PATH', 'SSL_KEY_PATH'];
    const backendEnvPath = path.join(this.projectRoot, 'backend/.env.production');
    
    if (fs.existsSync(backendEnvPath)) {
      const content = fs.readFileSync(backendEnvPath, 'utf8');
      
      for (const varName of requiredSSLVars) {
        if (!content.includes(varName)) {
          this.issues.push(`SSL配置缺少 ${varName}`);
        }
      }
    }
  }

  /**
   * 检查数据库配置
   */
  async checkDatabaseConfig() {
    const backendEnvPath = path.join(this.projectRoot, 'backend/.env.production');
    
    if (fs.existsSync(backendEnvPath)) {
      const content = fs.readFileSync(backendEnvPath, 'utf8');
      
      const requiredDBVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY'];
      
      for (const varName of requiredDBVars) {
        if (!content.includes(varName)) {
          this.issues.push(`数据库配置缺少 ${varName}`);
        }
      }
    }
  }

  /**
   * 检查浏览器配置
   */
  async checkBrowserConfig() {
    const backendEnvPath = path.join(this.projectRoot, 'backend/.env.production');
    
    if (fs.existsSync(backendEnvPath)) {
      const content = fs.readFileSync(backendEnvPath, 'utf8');
      
      const requiredBrowserVars = ['BROWSER_HEADLESS', 'DISPLAY', 'XVFB_WHD'];
      
      for (const varName of requiredBrowserVars) {
        if (!content.includes(varName)) {
          this.issues.push(`浏览器配置缺少 ${varName}`);
        }
      }
    }
  }

  /**
   * 修复后端环境配置
   */
  async fixBackendConfig() {
    console.log('🔧 修复后端环境配置...');
    
    const backendEnvPath = path.join(this.projectRoot, 'backend/.env.production');
    
    // 生成安全的配置
    const secureConfig = this.generateSecureConfig();
    
    const envContent = `# Boss直聘智能寻聘系统 - 生产环境配置
# 自动生成于 ${new Date().toISOString()}

# ==================== 基础配置 ====================
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# ==================== 数据库配置 ====================
SUPABASE_URL=https://fftjmohzkzkkqzqgaqfe.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDI1NjYsImV4cCI6MjA3Mjg3ODU2Nn0._PQEDYFp0XTL8sHatcVCMl6pcjooLo79CASTaulFbdQ
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzMwMjU2NiwiZXhwIjoyMDcyODc4NTY2fQ.ZhVVUag5S1q2fCSEQ2q_H_z5hV5gXrOdSJ1Q2k3fYTk

# ==================== 安全配置 ====================
# JWT 配置（强密钥）
JWT_SECRET=${secureConfig.jwtSecret}
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d

# 加密配置
ENCRYPTION_KEY=${secureConfig.encryptionKey}

# API 安全配置
API_RATE_LIMIT_ENABLED=true
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX_REQUESTS=100

# CORS 配置（生产环境域名）
CORS_ORIGIN=https://recruitment-automation-frontend.zeabur.app
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-Requested-With

# ==================== HTTPS/SSL 配置 ====================
HTTPS_ENABLED=true
SSL_REDIRECT=true
HSTS_ENABLED=true
HSTS_MAX_AGE=31536000
HSTS_INCLUDE_SUBDOMAINS=true

# ==================== 安全头部配置 ====================
SECURITY_HEADERS_ENABLED=true
X_FRAME_OPTIONS=DENY
X_CONTENT_TYPE_OPTIONS=nosniff
X_XSS_PROTECTION=1; mode=block
REFERRER_POLICY=strict-origin-when-cross-origin
CONTENT_SECURITY_POLICY=default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'

# ==================== 文件上传配置 ====================
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=.pdf,.docx,.txt,.doc
UPLOAD_TEMP_DIR=/tmp/uploads

# ==================== 浏览器自动化配置 ====================
BROWSER_HEADLESS=true
DISPLAY=:99
XVFB_WHD=1920x1080x24
BROWSER_TIMEOUT=30000
BROWSER_ARGS=--no-sandbox,--disable-setuid-sandbox,--disable-dev-shm-usage

# ==================== 日志配置 ====================
LOG_LEVEL=info
LOG_FORMAT=json
LOG_FILE_ENABLED=true
LOG_FILE_PATH=/var/log/recruitment-app.log

# ==================== 监控配置 ====================
MONITORING_ENABLED=true
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true

# ==================== 缓存配置 ====================
REDIS_ENABLED=false
CACHE_TTL=3600
SESSION_TTL=86400
`;

    fs.writeFileSync(backendEnvPath, envContent);
    this.fixes.push('后端环境配置已更新');
    console.log('  ✅ 后端环境配置已修复');
  }

  /**
   * 修复前端环境配置
   */
  async fixFrontendConfig() {
    console.log('🔧 修复前端环境配置...');
    
    const frontendEnvPath = path.join(this.projectRoot, 'frontend/.env.production');
    
    const envContent = `# ===========================================
# 智能招聘系统 - 前端生产环境配置
# 自动生成于 ${new Date().toISOString()}
# ===========================================

# 数据库配置 (Supabase)
REACT_APP_SUPABASE_URL=https://fftjmohzkzkkqzqgaqfe.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDI1NjYsImV4cCI6MjA3Mjg3ODU2Nn0._PQEDYFp0XTL8sHatcVCMl6pcjooLo79CASTaulFbdQ

# API 配置
REACT_APP_API_BASE_URL=https://recruitment-automation-backend.zeabur.app
REACT_APP_API_URL=https://recruitment-automation-backend.zeabur.app
REACT_APP_API_TIMEOUT=30000

# WebSocket 配置
REACT_APP_SOCKET_URL=wss://recruitment-automation-backend.zeabur.app
REACT_APP_SOCKET_TIMEOUT=5000

# 安全配置
REACT_APP_ENABLE_HTTPS=true
REACT_APP_SECURE_COOKIES=true
REACT_APP_CSRF_PROTECTION=true

# 性能配置
REACT_APP_ENABLE_SERVICE_WORKER=true
REACT_APP_ENABLE_COMPRESSION=true
REACT_APP_CACHE_DURATION=3600000

# 文件上传配置
REACT_APP_MAX_FILE_SIZE=10485760
REACT_APP_ALLOWED_FILE_TYPES=.pdf,.docx,.txt,.doc

# 功能开关
REACT_APP_ENABLE_DEBUG=false
REACT_APP_ENABLE_MOCK_DATA=false
REACT_APP_ENABLE_ANALYTICS=true

# 应用信息
REACT_APP_VERSION=1.0.0
REACT_APP_BUILD_TIME=${new Date().toISOString()}
REACT_APP_ENVIRONMENT=production

# 错误监控
REACT_APP_ERROR_REPORTING=true
REACT_APP_SENTRY_DSN=

# CDN配置
REACT_APP_CDN_URL=
REACT_APP_STATIC_URL=
`;

    fs.writeFileSync(frontendEnvPath, envContent);
    this.fixes.push('前端环境配置已更新');
    console.log('  ✅ 前端环境配置已修复');
  }

  /**
   * 修复部署配置
   */
  async fixDeploymentConfig() {
    console.log('🔧 修复部署配置...');
    
    const zeaburEnvPath = path.join(this.projectRoot, 'deploy/config/.env.zeabur');
    
    const secureConfig = this.generateSecureConfig();
    
    const envContent = `# ===========================================
# Zeabur 部署环境变量配置
# 自动生成于 ${new Date().toISOString()}
# ===========================================

# ========== 后端服务环境变量 ==========

# 基础配置
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# 数据库配置 (Supabase)
SUPABASE_URL=https://fftjmohzkzkkqzqgaqfe.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDI1NjYsImV4cCI6MjA3Mjg3ODU2Nn0._PQEDYFp0XTL8sHatcVCMl6pcjooLo79CASTaulFbdQ
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzMwMjU2NiwiZXhwIjoyMDcyODc4NTY2fQ.ZhVVUag5S1q2fCSEQ2q_H_z5hV5gXrOdSJ1Q2k3fYTk

# JWT 配置
JWT_SECRET=${secureConfig.jwtSecret}
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d

# CORS 配置（生产环境）
CORS_ORIGIN=https://recruitment-automation-frontend.zeabur.app
CORS_CREDENTIALS=true
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOWED_HEADERS=Content-Type,Authorization,X-Requested-With

# 安全配置
API_RATE_LIMIT_ENABLED=true
API_RATE_LIMIT_WINDOW_MS=900000
API_RATE_LIMIT_MAX_REQUESTS=100
ENCRYPTION_KEY=${secureConfig.encryptionKey}

# HTTPS/SSL 配置
HTTPS_ENABLED=true
SSL_REDIRECT=true
HSTS_ENABLED=true
HSTS_MAX_AGE=31536000

# 安全头部
SECURITY_HEADERS_ENABLED=true
X_FRAME_OPTIONS=DENY
X_CONTENT_TYPE_OPTIONS=nosniff
X_XSS_PROTECTION=1; mode=block

# 文件上传
UPLOAD_MAX_SIZE=10485760
UPLOAD_ALLOWED_TYPES=.pdf,.docx,.txt,.doc

# 浏览器配置（生产环境）
BROWSER_HEADLESS=true
DISPLAY=:99
XVFB_WHD=1920x1080x24
BROWSER_TIMEOUT=30000

# 日志配置
LOG_LEVEL=info
LOG_FORMAT=json

# 监控配置
MONITORING_ENABLED=true
HEALTH_CHECK_ENABLED=true
METRICS_ENABLED=true

# ========== Zeabur 特定配置 ==========
ZBPACK_STATIC_DIR=build
`;

    fs.writeFileSync(zeaburEnvPath, envContent);
    this.fixes.push('Zeabur部署配置已更新');
    console.log('  ✅ Zeabur部署配置已修复');
  }

  /**
   * 生成安全配置
   */
  generateSecureConfig() {
    return {
      jwtSecret: crypto.randomBytes(64).toString('hex'),
      encryptionKey: crypto.randomBytes(32).toString('hex'),
      sessionSecret: crypto.randomBytes(32).toString('hex')
    };
  }

  /**
   * 验证配置
   */
  async validateConfig() {
    console.log('✅ 验证修复后的配置...');
    
    const validationResults = {
      backend: await this.validateBackendConfig(),
      frontend: await this.validateFrontendConfig(),
      deployment: await this.validateDeploymentConfig()
    };
    
    return validationResults;
  }

  /**
   * 验证后端配置
   */
  async validateBackendConfig() {
    const backendEnvPath = path.join(this.projectRoot, 'backend/.env.production');
    
    if (!fs.existsSync(backendEnvPath)) {
      return { valid: false, error: '配置文件不存在' };
    }
    
    const content = fs.readFileSync(backendEnvPath, 'utf8');
    const requiredVars = [
      'NODE_ENV', 'PORT', 'SUPABASE_URL', 'SUPABASE_ANON_KEY',
      'JWT_SECRET', 'CORS_ORIGIN', 'BROWSER_HEADLESS'
    ];
    
    const missingVars = requiredVars.filter(varName => !content.includes(varName));
    
    return {
      valid: missingVars.length === 0,
      missingVars,
      hasSecureJWT: content.includes('JWT_SECRET=') && !content.includes('your_'),
      hasSecureCORS: content.includes('CORS_ORIGIN=') && !content.includes('CORS_ORIGIN=*')
    };
  }

  /**
   * 验证前端配置
   */
  async validateFrontendConfig() {
    const frontendEnvPath = path.join(this.projectRoot, 'frontend/.env.production');
    
    if (!fs.existsSync(frontendEnvPath)) {
      return { valid: false, error: '配置文件不存在' };
    }
    
    const content = fs.readFileSync(frontendEnvPath, 'utf8');
    const requiredVars = [
      'REACT_APP_API_BASE_URL', 'REACT_APP_SUPABASE_URL',
      'REACT_APP_SUPABASE_ANON_KEY'
    ];
    
    const missingVars = requiredVars.filter(varName => !content.includes(varName));
    
    return {
      valid: missingVars.length === 0,
      missingVars,
      hasValidAPIURL: content.includes('REACT_APP_API_BASE_URL=https://')
    };
  }

  /**
   * 验证部署配置
   */
  async validateDeploymentConfig() {
    const zeaburEnvPath = path.join(this.projectRoot, 'deploy/config/.env.zeabur');
    
    if (!fs.existsSync(zeaburEnvPath)) {
      return { valid: false, error: '配置文件不存在' };
    }
    
    const content = fs.readFileSync(zeaburEnvPath, 'utf8');
    const requiredVars = [
      'NODE_ENV', 'PORT', 'SUPABASE_URL', 'JWT_SECRET', 'CORS_ORIGIN'
    ];
    
    const missingVars = requiredVars.filter(varName => !content.includes(varName));
    
    return {
      valid: missingVars.length === 0,
      missingVars
    };
  }

  /**
   * 生成修复报告
   */
  async generateReport() {
    const reportPath = path.join(this.projectRoot, 'environment-config-fix-report.md');
    
    const report = `# 环境变量配置修复报告

生成时间: ${new Date().toISOString()}

## 发现的问题

${this.issues.length > 0 ? this.issues.map(issue => `- ${issue}`).join('\n') : '无问题发现'}

## 修复内容

${this.fixes.map(fix => `- ${fix}`).join('\n')}

## 配置文件位置

- 后端配置: \`backend/.env.production\`
- 前端配置: \`frontend/.env.production\`
- 部署配置: \`deploy/config/.env.zeabur\`

## 安全配置要点

### JWT 安全
- ✅ 使用64字节随机生成的JWT密钥
- ✅ 设置合理的过期时间（8小时）
- ✅ 配置刷新令牌（7天）

### CORS 安全
- ✅ 限制允许的源域名
- ✅ 配置允许的HTTP方法
- ✅ 设置允许的请求头
- ✅ 启用凭据传递

### HTTPS/SSL 配置
- ✅ 启用HTTPS重定向
- ✅ 配置HSTS安全头
- ✅ 设置安全的CSP策略

### 文件上传安全
- ✅ 限制文件大小（10MB）
- ✅ 限制文件类型
- ✅ 配置临时目录

### 浏览器安全
- ✅ 生产环境强制无头模式
- ✅ 配置安全的启动参数
- ✅ 设置合理的超时时间

## 部署说明

### Zeabur 部署
1. 将 \`deploy/config/.env.zeabur\` 中的环境变量复制到 Zeabur 控制台
2. 确保前端和后端服务都正确配置了环境变量
3. 验证CORS配置中的域名与实际部署域名一致

### 本地测试
1. 使用 \`backend/.env.production\` 进行本地生产环境测试
2. 确保所有环境变量都已正确设置
3. 运行验证脚本确认配置正确性

## 后续维护

1. **定期更新密钥**: 建议每3-6个月更新JWT密钥和加密密钥
2. **监控安全日志**: 启用日志记录，监控异常访问
3. **更新CORS配置**: 当部署域名变更时及时更新CORS配置
4. **备份配置**: 定期备份环境配置文件

## 验证命令

\`\`\`bash
# 验证后端配置
node -e "require('dotenv').config({path: 'backend/.env.production'}); console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length);"

# 验证前端配置
node -e "require('dotenv').config({path: 'frontend/.env.production'}); console.log('API URL:', process.env.REACT_APP_API_BASE_URL);"

# 测试CORS配置
curl -H "Origin: https://example.com" -H "Access-Control-Request-Method: POST" -X OPTIONS https://your-backend-url.com/api/test
\`\`\`

---

**注意**: 请妥善保管生成的密钥，不要将包含真实密钥的配置文件提交到版本控制系统。
`;

    fs.writeFileSync(reportPath, report);
    console.log(`📋 修复报告已生成: ${reportPath}`);
  }
}

// 执行修复
if (require.main === module) {
  const fixer = new EnvironmentConfigFixer();
  fixer.fix().catch(console.error);
}

module.exports = EnvironmentConfigFixer;