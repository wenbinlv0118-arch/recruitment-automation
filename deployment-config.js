/**
 * 部署配置管理
 * 统一管理不同环境的部署配置
 */

const fs = require('fs');
const path = require('path');

/**
 * 部署配置类
 */
class DeploymentConfig {
  constructor() {
    this.environments = {
      development: {
        name: '开发环境',
        frontend: {
          platform: 'local',
          url: 'http://localhost:3000',
          buildCommand: 'npm run build',
          outputDir: 'build'
        },
        backend: {
          platform: 'local',
          url: 'http://localhost:5001',
          startCommand: 'npm start'
        },
        database: {
          type: 'sqlite',
          file: 'database.sqlite'
        }
      },
      staging: {
        name: '测试环境',
        frontend: {
          platform: 'vercel',
          url: 'https://your-app-staging.vercel.app',
          buildCommand: 'npm run build',
          outputDir: 'build',
          envFile: '.env.staging'
        },
        backend: {
          platform: 'netlify',
          url: 'https://your-functions-staging.netlify.app',
          functionsDir: 'netlify/functions'
        },
        database: {
          type: 'supabase',
          project: 'staging-project-id'
        }
      },
      production: {
        name: '生产环境',
        frontend: {
          platform: 'vercel',
          url: 'https://your-app.vercel.app',
          buildCommand: 'npm run build',
          outputDir: 'build',
          envFile: '.env.production'
        },
        backend: {
          platform: 'netlify',
          url: 'https://your-functions.netlify.app',
          functionsDir: 'netlify/functions'
        },
        database: {
          type: 'supabase',
          project: 'production-project-id'
        }
      }
    };
  }

  /**
   * 获取环境配置
   * @param {string} env - 环境名称
   * @returns {Object} 环境配置
   */
  getEnvironmentConfig(env) {
    return this.environments[env] || this.environments.development;
  }

  /**
   * 生成前端环境变量文件
   * @param {string} env - 环境名称
   * @param {Object} customConfig - 自定义配置
   */
  generateFrontendEnv(env, customConfig = {}) {
    const config = this.getEnvironmentConfig(env);
    const envContent = this.buildEnvContent(env, config, customConfig);
    
    const envFile = config.frontend.envFile || '.env.local';
    const envPath = path.join(__dirname, 'frontend', envFile);
    
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ 前端环境变量文件已生成: ${envFile}`);
  }

  /**
   * 生成后端环境变量文件
   * @param {string} env - 环境名称
   * @param {Object} customConfig - 自定义配置
   */
  generateBackendEnv(env, customConfig = {}) {
    const config = this.getEnvironmentConfig(env);
    const envContent = this.buildBackendEnvContent(env, config, customConfig);
    
    const envFile = '.env';
    const envPath = path.join(__dirname, envFile);
    
    fs.writeFileSync(envPath, envContent);
    console.log(`✅ 后端环境变量文件已生成: ${envFile}`);
  }

  /**
   * 构建前端环境变量内容
   * @param {string} env - 环境名称
   * @param {Object} config - 环境配置
   * @param {Object} customConfig - 自定义配置
   * @returns {string} 环境变量内容
   */
  buildEnvContent(env, config, customConfig) {
    const isProduction = env === 'production';
    const isStaging = env === 'staging';
    
    return `# ${config.name}环境变量配置
# 自动生成于 ${new Date().toLocaleString()}

# 应用配置
REACT_APP_NAME=智能招聘自动化系统
REACT_APP_VERSION=1.0.0
REACT_APP_ENV=${env}

# API 配置
REACT_APP_API_BASE_URL=${config.backend.url}/.netlify/functions
REACT_APP_SOCKET_URL=${config.backend.url.replace('https://', 'wss://').replace('http://', 'ws://')}

# Supabase 配置
REACT_APP_SUPABASE_URL=${customConfig.supabaseUrl || 'https://your-project-id.supabase.co'}
REACT_APP_SUPABASE_ANON_KEY=${customConfig.supabaseAnonKey || 'your-anon-key'}

# 功能开关
REACT_APP_ENABLE_DEBUG=${!isProduction}
REACT_APP_ENABLE_MOCK_DATA=${env === 'development'}
REACT_APP_ENABLE_ANALYTICS=${isProduction || isStaging}

# 第三方服务
REACT_APP_SENTRY_DSN=${customConfig.sentryDsn || ''}
REACT_APP_GOOGLE_ANALYTICS_ID=${customConfig.gaId || ''}

# 文件上传配置
REACT_APP_MAX_FILE_SIZE=10485760
REACT_APP_ALLOWED_FILE_TYPES=.pdf,.docx,.txt

# UI 配置
REACT_APP_THEME=light
REACT_APP_LANGUAGE=zh-CN
REACT_APP_TIMEZONE=Asia/Shanghai

# 性能配置
REACT_APP_ENABLE_SERVICE_WORKER=${isProduction}
REACT_APP_CACHE_DURATION=3600000

# 安全配置
REACT_APP_ENABLE_CSP=${isProduction}
REACT_APP_ALLOWED_ORIGINS=${config.frontend.url}
`;
  }

  /**
   * 构建后端环境变量内容
   * @param {string} env - 环境名称
   * @param {Object} config - 环境配置
   * @param {Object} customConfig - 自定义配置
   * @returns {string} 环境变量内容
   */
  buildBackendEnvContent(env, config, customConfig) {
    const isProduction = env === 'production';
    
    return `# ${config.name}环境变量配置
# 自动生成于 ${new Date().toLocaleString()}

# 应用配置
NODE_ENV=${env}
PORT=5001
APP_NAME=智能招聘自动化系统
APP_VERSION=1.0.0

# 数据库配置
DATABASE_TYPE=${config.database.type}

# Supabase 配置
SUPABASE_URL=${customConfig.supabaseUrl || 'https://your-project-id.supabase.co'}
SUPABASE_ANON_KEY=${customConfig.supabaseAnonKey || 'your-anon-key'}
SUPABASE_SERVICE_ROLE_KEY=${customConfig.supabaseServiceKey || 'your-service-role-key'}

# SQLite 配置（开发环境）
SQLITE_DB_PATH=${config.database.file || 'database.sqlite'}

# 大语言模型配置
LLM_API_URL=${customConfig.llmApiUrl || 'http://localhost:11434'}
LLM_MODEL=${customConfig.llmModel || 'qwen2.5:7b'}
LLM_TIMEOUT=30000

# 安全配置
JWT_SECRET=${customConfig.jwtSecret || 'your-jwt-secret-key'}
ENCRYPTION_KEY=${customConfig.encryptionKey || 'your-encryption-key'}

# CORS 配置
CORS_ORIGIN=${config.frontend.url}
CORS_CREDENTIALS=true

# 日志配置
LOG_LEVEL=${isProduction ? 'info' : 'debug'}
LOG_FILE=${isProduction ? 'logs/app.log' : ''}

# 缓存配置
REDIS_URL=${customConfig.redisUrl || ''}
CACHE_TTL=3600

# 文件存储配置
UPLOAD_DIR=uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,docx,txt

# 招聘平台配置
BOSS_ZHIPIN_ENABLED=true
ZHILIAN_ENABLED=true
QIANCHENG_ENABLED=false

# 第三方服务
OPENAI_API_KEY=${customConfig.openaiApiKey || ''}
BAIDU_API_KEY=${customConfig.baiduApiKey || ''}
TENCENT_SECRET_ID=${customConfig.tencentSecretId || ''}
TENCENT_SECRET_KEY=${customConfig.tencentSecretKey || ''}

# 监控配置
SENTRY_DSN=${customConfig.sentryDsn || ''}
MONITORING_ENABLED=${isProduction}
`;
  }

  /**
   * 验证部署配置
   * @param {string} env - 环境名称
   * @returns {Object} 验证结果
   */
  validateDeploymentConfig(env) {
    const config = this.getEnvironmentConfig(env);
    const errors = [];
    const warnings = [];

    // 检查必需的配置
    if (!config.frontend.url) {
      errors.push('前端URL未配置');
    }

    if (!config.backend.url) {
      errors.push('后端URL未配置');
    }

    if (config.database.type === 'supabase' && !config.database.project) {
      errors.push('Supabase项目ID未配置');
    }

    // 检查生产环境特殊要求
    if (env === 'production') {
      if (config.frontend.url.includes('localhost')) {
        warnings.push('生产环境不应使用localhost');
      }

      if (!config.frontend.url.startsWith('https://')) {
        warnings.push('生产环境建议使用HTTPS');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 显示部署信息
   * @param {string} env - 环境名称
   */
  showDeploymentInfo(env) {
    const config = this.getEnvironmentConfig(env);
    
    console.log(`\n🚀 ${config.name}部署信息:`);
    console.log(`\n📱 前端:`);
    console.log(`   平台: ${config.frontend.platform}`);
    console.log(`   URL: ${config.frontend.url}`);
    console.log(`   构建命令: ${config.frontend.buildCommand}`);
    
    console.log(`\n⚙️  后端:`);
    console.log(`   平台: ${config.backend.platform}`);
    console.log(`   URL: ${config.backend.url}`);
    
    console.log(`\n🗄️  数据库:`);
    console.log(`   类型: ${config.database.type}`);
    if (config.database.project) {
      console.log(`   项目: ${config.database.project}`);
    }
    
    // 验证配置
    const validation = this.validateDeploymentConfig(env);
    if (!validation.valid) {
      console.log(`\n❌ 配置错误:`);
      validation.errors.forEach(error => console.log(`   - ${error}`));
    }
    
    if (validation.warnings.length > 0) {
      console.log(`\n⚠️  配置警告:`);
      validation.warnings.forEach(warning => console.log(`   - ${warning}`));
    }
  }

  /**
   * 生成部署脚本
   * @param {string} env - 环境名称
   */
  generateDeploymentScript(env) {
    const config = this.getEnvironmentConfig(env);
    
    const scriptContent = `#!/bin/bash
# ${config.name}部署脚本
# 自动生成于 ${new Date().toLocaleString()}

set -e

echo "🚀 开始部署到${config.name}..."

# 检查依赖
echo "📦 检查依赖..."
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm 未安装"
    exit 1
fi

# 安装依赖
echo "📦 安装前端依赖..."
cd frontend
npm ci

echo "📦 安装后端依赖..."
cd ../backend
npm ci

cd ..

# 生成环境变量
echo "⚙️  生成环境变量..."
node deployment-config.js generate-env ${env}

# 构建前端
echo "🏗️  构建前端..."
cd frontend
${config.frontend.buildCommand}

# 部署
echo "🚀 开始部署..."
if [ "${config.frontend.platform}" = "vercel" ]; then
    echo "部署到 Vercel..."
    npx vercel --prod
elif [ "${config.frontend.platform}" = "netlify" ]; then
    echo "部署到 Netlify..."
    npx netlify deploy --prod
fi

echo "✅ 部署完成！"
echo "🌐 前端地址: ${config.frontend.url}"
echo "⚙️  后端地址: ${config.backend.url}"
`;

    const scriptPath = path.join(__dirname, `deploy-${env}.sh`);
    fs.writeFileSync(scriptPath, scriptContent);
    fs.chmodSync(scriptPath, '755');
    
    console.log(`✅ 部署脚本已生成: deploy-${env}.sh`);
  }
}

// 命令行接口
if (require.main === module) {
  const deploymentConfig = new DeploymentConfig();
  const args = process.argv.slice(2);
  const command = args[0];
  const env = args[1] || 'development';

  switch (command) {
    case 'info':
      deploymentConfig.showDeploymentInfo(env);
      break;
    case 'generate-env':
      deploymentConfig.generateFrontendEnv(env);
      deploymentConfig.generateBackendEnv(env);
      break;
    case 'generate-script':
      deploymentConfig.generateDeploymentScript(env);
      break;
    case 'validate':
      const validation = deploymentConfig.validateDeploymentConfig(env);
      if (validation.valid) {
        console.log('✅ 配置验证通过');
      } else {
        console.log('❌ 配置验证失败');
        validation.errors.forEach(error => console.log(`   - ${error}`));
        process.exit(1);
      }
      break;
    default:
      console.log('使用方法:');
      console.log('  node deployment-config.js info [env]          - 显示部署信息');
      console.log('  node deployment-config.js generate-env [env]  - 生成环境变量');
      console.log('  node deployment-config.js generate-script [env] - 生成部署脚本');
      console.log('  node deployment-config.js validate [env]     - 验证配置');
      console.log('');
      console.log('环境选项: development, staging, production');
  }
}

module.exports = DeploymentConfig;