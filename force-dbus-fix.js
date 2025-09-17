#!/usr/bin/env node

/**
 * Zeabur D-Bus错误强制修复脚本
 * 生成完整的配置文件和验证命令
 */

const fs = require('fs');
const path = require('path');

class ForceDBusFix {
    constructor() {
        this.requiredEnvVars = {
            'DISABLE_DBUS': '1',
            'DISABLE_DEV_SHM_USAGE': '1',
            'NO_SANDBOX': '1',
            'DISABLE_GPU': '1',
            'ENABLE_LOG_FILTER': '1',
            'NODE_ENV': 'production',
            'BROWSER_HEADLESS': 'true'
        };
        
        this.forbiddenVars = [
            'DISPLAY',
            'XVFB_WHD',
            'DBUS_SESSION_BUS_ADDRESS',
            'DBUS_SYSTEM_BUS_ADDRESS'
        ];
    }

    /**
     * 生成Zeabur控制台配置命令
     */
    generateZeaburCommands() {
        const commands = [];
        
        // 添加必需变量
        Object.entries(this.requiredEnvVars).forEach(([key, value]) => {
            commands.push(`zeabur env set ${key} ${value}`);
        });

        // 移除禁止变量
        this.forbiddenVars.forEach(varName => {
            commands.push(`zeabur env unset ${varName}`);
        });

        return commands;
    }

    /**
     * 生成Dockerfile强制配置
     */
    generateDockerfileFix() {
        return `FROM node:20-slim

# 安装必要依赖
RUN apt-get update && apt-get install -y --no-install-recommends \\
    wget gnupg ca-certificates fonts-liberation libappindicator3-1 \\
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libc6 libcairo2 libcups2 \\
    libdbus-1-3 libdrm2 libexpat1 libfontconfig1 libgbm1 libgcc1 \\
    libglib2.0-0 libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 \\
    libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 \\
    libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 \\
    libxi6 libxrandr2 libxrender1 libxss1 libxtst6 lsb-release \\
    xdg-utils libu2f-udev libvulkan1 xvfb \\
    && rm -rf /var/lib/apt/lists/* && apt-get clean

# 强制禁用D-Bus
RUN systemctl disable dbus 2>/dev/null || true \\
    && systemctl mask dbus 2>/dev/null || true \\
    && rm -rf /run/dbus /var/run/dbus \\
    && mkdir -p /run/dbus \\
    && chmod 000 /run/dbus

# 设置工作目录
WORKDIR /app

# 强制环境变量
ENV NODE_ENV=production
ENV PORT=3001
ENV BROWSER_HEADLESS=true

# D-Bus完全禁用
ENV DISABLE_DBUS=1
ENV DISABLE_DEV_SHM_USAGE=1
ENV NO_SANDBOX=1
ENV DISABLE_GPU=1
ENV ENABLE_LOG_FILTER=1
ENV DBUS_SESSION_BUS_ADDRESS=""
ENV DBUS_SYSTEM_BUS_ADDRESS=""
ENV NO_DBUS=1
ENV NO_AT_BRIDGE=1
ENV GSETTINGS_BACKEND=memory
ENV GDK_BACKEND=x11

# 复制和安装依赖
COPY package*.json ./
RUN npm ci --only=production --no-audit --no-fund

# 安装Playwright
RUN npx playwright install chromium --with-deps

# 复制应用代码
COPY . .

EXPOSE 3001
CMD ["npm", "start"]`;
    }

    /**
     * 生成浏览器启动配置
     */
    generateBrowserConfig() {
        return `const { chromium } = require('playwright');

// 强制D-Bus禁用配置
const browserConfig = {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-dbus',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-features=TranslateUI',
        '--disable-component-extensions-with-background-pages',
        '--disable-extensions-http-throttling',
        '--disable-ipc-flooding-protection',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
    ],
    env: {
        ...process.env,
        DBUS_SESSION_BUS_ADDRESS: '',
        DBUS_SYSTEM_BUS_ADDRESS: '',
        NO_DBUS: '1',
        DISABLE_DBUS: '1',
        NO_AT_BRIDGE: '1',
        GSETTINGS_BACKEND: 'memory',
        GDK_BACKEND: 'x11'
    }
};

module.exports = browserConfig;`;
    }

    /**
     * 生成验证脚本
     */
    generateValidationScript() {
        return `#!/usr/bin/env node

/**
 * Zeabur环境变量验证脚本
 * 验证所有必需的环境变量是否正确配置
 */

const requiredVars = [
    'DISABLE_DBUS',
    'DISABLE_DEV_SHM_USAGE',
    'NO_SANDBOX',
    'DISABLE_GPU',
    'ENABLE_LOG_FILTER',
    'NODE_ENV',
    'BROWSER_HEADLESS'
];

const forbiddenVars = [
    'DISPLAY',
    'XVFB_WHD',
    'DBUS_SESSION_BUS_ADDRESS'
];

console.log('🔍 Zeabur环境变量验证');
console.log('='.repeat(50));

let hasErrors = false;

// 检查必需变量
console.log('\\n📋 必需变量检查:');
requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value === '1' || value === 'true' || value === 'production') {
        console.log(\`✅ \${varName}=\${value}\`);
    } else {
        console.log(\`❌ \${varName} 未正确设置 (当前值: \${value || 'undefined'})\`);
        hasErrors = true;
    }
});

// 检查禁止变量
console.log('\\n🚫 禁止变量检查:');
forbiddenVars.forEach(varName => {
    const value = process.env[varName];
    if (value) {
        console.log(\`❌ \${varName} 应该被移除 (当前值: \${value})\`);
        hasErrors = true;
    } else {
        console.log(\`✅ \${varName} 已正确移除\`);
    }
});

if (hasErrors) {
    console.log('\\n❌ 环境变量配置存在问题，请修复后重新部署');
    process.exit(1);
} else {
    console.log('\\n✅ 所有环境变量配置正确');
    process.exit(0);
}`;
    }

    /**
     * 生成所有配置文件
     */
    generateAllConfigs() {
        const configs = {
            zeaburCommands: this.generateZeaburCommands(),
            dockerfile: this.generateDockerfileFix(),
            browserConfig: this.generateBrowserConfig(),
            validationScript: this.generateValidationScript(),
            environmentFile: Object.entries(this.requiredEnvVars)
                .map(([key, value]) => `${key}=${value}`)
                .join('\n')
        };

        // 写入文件
        fs.writeFileSync('zeabur-commands.sh', 
            '#!/bin/bash\n' + configs.zeaburCommands.join('\n') + '\n',
            { mode: 0o755 }
        );

        fs.writeFileSync('Dockerfile.forced-fix', configs.dockerfile);
        fs.writeFileSync('browser-config.forced.js', configs.browserConfig);
        fs.writeFileSync('validate-zeabur-env.js', configs.validationScript);
        fs.writeFileSync('zeabur-production.env', configs.environmentFile);

        return configs;
    }

    /**
     * 运行完整修复流程
     */
    async runFix() {
        console.log('🚀 Zeabur D-Bus错误强制修复开始\n');
        
        const configs = this.generateAllConfigs();
        
        console.log('✅ 已生成以下修复文件:');
        console.log('- zeabur-commands.sh - Zeabur控制台命令');
        console.log('- Dockerfile.forced-fix - 强制Docker配置');
        console.log('- browser-config.forced.js - 强制浏览器配置');
        console.log('- validate-zeabur-env.js - 环境变量验证脚本');
        console.log('- zeabur-production.env - 生产环境变量文件');
        
        console.log('\n📋 立即执行步骤:');
        console.log('1. 执行: ./zeabur-commands.sh');
        console.log('2. 重新部署服务');
        console.log('3. 运行: node validate-zeabur-env.js');
        
        return configs;
    }
}

// 运行修复
if (require.main === module) {
    const fixer = new ForceDBusFix();
    fixer.runFix()
        .then(() => {
            console.log('\n✅ 强制修复配置已生成完成！');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ 修复失败:', error);
            process.exit(1);
        });
}

module.exports = ForceDBusFix;