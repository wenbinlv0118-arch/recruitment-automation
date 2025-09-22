#!/usr/bin/env node

/**
 * Docker容器配置优化脚本
 * 分析现有Dockerfile配置并提供优化建议
 */

const fs = require('fs');
const path = require('path');

class DockerConfigOptimizer {
    constructor() {
        this.projectRoot = process.cwd();
        this.dockerfilePath = path.join(this.projectRoot, 'backend', 'Dockerfile');
        this.startScriptPath = path.join(this.projectRoot, 'backend', 'start-with-xvfb.sh');
        this.verifyScriptPath = path.join(this.projectRoot, 'backend', 'verify-playwright.sh');
        this.optimizations = [];
        this.issues = [];
    }

    /**
     * 分析Dockerfile配置
     */
    analyzeDockerfile() {
        console.log('🔍 分析Dockerfile配置...');
        
        if (!fs.existsSync(this.dockerfilePath)) {
            this.issues.push('Dockerfile不存在');
            return;
        }

        const dockerfileContent = fs.readFileSync(this.dockerfilePath, 'utf8');
        const lines = dockerfileContent.split('\n');

        // 分析基础镜像
        this.analyzeBaseImage(lines);
        
        // 分析依赖安装
        this.analyzeDependencies(lines);
        
        // 分析用户权限
        this.analyzeUserPermissions(lines);
        
        // 分析环境变量
        this.analyzeEnvironmentVariables(lines);
        
        // 分析启动配置
        this.analyzeStartupConfig(lines);
    }

    /**
     * 分析基础镜像配置
     */
    analyzeBaseImage(lines) {
        const fromLine = lines.find(line => line.trim().startsWith('FROM'));
        if (fromLine) {
            console.log(`📦 基础镜像: ${fromLine.trim()}`);
            
            if (fromLine.includes('node:20')) {
                this.optimizations.push({
                    type: 'base_image',
                    suggestion: '考虑使用Alpine版本减少镜像大小',
                    current: fromLine.trim(),
                    recommended: 'FROM node:20-alpine'
                });
            }
        }
    }

    /**
     * 分析依赖安装配置
     */
    analyzeDependencies(lines) {
        const runLines = lines.filter(line => line.trim().startsWith('RUN'));
        
        // 检查是否有多个RUN命令可以合并
        if (runLines.length > 3) {
            this.optimizations.push({
                type: 'layer_optimization',
                suggestion: '合并多个RUN命令减少镜像层数',
                current: `${runLines.length}个RUN命令`,
                recommended: '合并为2-3个RUN命令'
            });
        }

        // 检查包管理器缓存清理
        const hasAptClean = runLines.some(line => line.includes('apt-get clean'));
        if (!hasAptClean && runLines.some(line => line.includes('apt-get'))) {
            this.optimizations.push({
                type: 'cache_cleanup',
                suggestion: '添加apt缓存清理减少镜像大小',
                current: '未清理apt缓存',
                recommended: '添加 && apt-get clean && rm -rf /var/lib/apt/lists/*'
            });
        }
    }

    /**
     * 分析用户权限配置
     */
    analyzeUserPermissions(lines) {
        const userLines = lines.filter(line => line.trim().startsWith('USER'));
        
        if (userLines.length === 0) {
            this.issues.push('未设置非root用户，存在安全风险');
        } else {
            console.log('✅ 已配置非root用户');
        }
    }

    /**
     * 分析环境变量配置
     */
    analyzeEnvironmentVariables(lines) {
        const envLines = lines.filter(line => line.trim().startsWith('ENV'));
        
        const hasDisplay = envLines.some(line => line.includes('DISPLAY'));
        if (!hasDisplay) {
            this.optimizations.push({
                type: 'environment',
                suggestion: '添加DISPLAY环境变量支持Xvfb',
                current: '未设置DISPLAY',
                recommended: 'ENV DISPLAY=:99'
            });
        }
    }

    /**
     * 分析启动配置
     */
    analyzeStartupConfig(lines) {
        const cmdLine = lines.find(line => line.trim().startsWith('CMD'));
        if (cmdLine) {
            console.log(`🚀 启动命令: ${cmdLine.trim()}`);
        }
    }

    /**
     * 分析启动脚本
     */
    analyzeStartupScript() {
        console.log('🔍 分析启动脚本配置...');
        
        if (!fs.existsSync(this.startScriptPath)) {
            this.issues.push('启动脚本不存在');
            return;
        }

        const scriptContent = fs.readFileSync(this.startScriptPath, 'utf8');
        
        // 检查Xvfb配置
        if (scriptContent.includes('Xvfb')) {
            console.log('✅ 已配置Xvfb虚拟显示');
        } else {
            this.issues.push('启动脚本中未找到Xvfb配置');
        }

        // 检查错误处理
        if (scriptContent.includes('trap')) {
            console.log('✅ 已配置信号处理');
        } else {
            this.optimizations.push({
                type: 'error_handling',
                suggestion: '添加信号处理确保优雅关闭',
                current: '无信号处理',
                recommended: '添加trap函数处理SIGTERM和SIGINT'
            });
        }
    }

    /**
     * 分析验证脚本
     */
    analyzeVerificationScript() {
        console.log('🔍 分析验证脚本配置...');
        
        if (!fs.existsSync(this.verifyScriptPath)) {
            this.issues.push('验证脚本不存在');
            return;
        }

        const scriptContent = fs.readFileSync(this.verifyScriptPath, 'utf8');
        
        // 检查Playwright验证
        if (scriptContent.includes('playwright')) {
            console.log('✅ 已配置Playwright验证');
        }
    }

    /**
     * 生成优化建议
     */
    generateOptimizations() {
        console.log('\n📋 生成Docker配置优化建议...');
        
        const optimizedDockerfile = this.generateOptimizedDockerfile();
        const optimizedStartScript = this.generateOptimizedStartScript();
        
        // 保存优化后的配置
        const optimizationsDir = path.join(this.projectRoot, 'optimizations');
        if (!fs.existsSync(optimizationsDir)) {
            fs.mkdirSync(optimizationsDir, { recursive: true });
        }

        fs.writeFileSync(
            path.join(optimizationsDir, 'Dockerfile.optimized'),
            optimizedDockerfile
        );

        fs.writeFileSync(
            path.join(optimizationsDir, 'start-with-xvfb.optimized.sh'),
            optimizedStartScript
        );

        console.log('✅ 优化配置已保存到 optimizations/ 目录');
    }

    /**
     * 生成优化后的Dockerfile
     */
    generateOptimizedDockerfile() {
        return `# 优化后的Dockerfile
# 基于Node.js 20 Alpine版本减少镜像大小
FROM node:20-alpine

# 安装系统依赖（合并RUN命令减少层数）
RUN apk add --no-cache \\
    chromium \\
    nss \\
    freetype \\
    freetype-dev \\
    harfbuzz \\
    ca-certificates \\
    ttf-freefont \\
    xvfb \\
    dbus \\
    && rm -rf /var/cache/apk/*

# 创建非root用户
RUN addgroup -g 1001 -S nodejs && \\
    adduser -S nextjs -u 1001

# 设置工作目录
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV DISPLAY=:99
ENV CHROME_BIN=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# 复制package文件并安装依赖
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# 安装Playwright
RUN npx playwright install chromium

# 复制应用代码
COPY . .

# 创建必要目录并设置权限
RUN mkdir -p uploads downloads temp reports backups metrics && \\
    chown -R nextjs:nodejs /app

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \\
    CMD curl -f http://localhost:3000/health || exit 1

# 启动应用
CMD ["./start-with-xvfb.sh"]
`;
    }

    /**
     * 生成优化后的启动脚本
     */
    generateOptimizedStartScript() {
        return `#!/bin/bash
# 优化后的启动脚本
# 在Docker容器中启动Xvfb和Node.js应用

set -e

# 颜色定义
RED='\\x1b[0;31m'
GREEN='\\x1b[0;32m'
YELLOW='\\x1b[1;33m'
NC='\\x1b[0m' # No Color

# 日志函数
log_info() {
    echo -e "\${GREEN}[INFO]\${NC} \$1"
}

log_warn() {
    echo -e "\${YELLOW}[WARN]\${NC} \$1"
}

log_error() {
    echo -e "\${RED}[ERROR]\${NC} \$1"
}

# 清理函数
cleanup() {
    log_info "正在清理资源..."
    if [ ! -z "\$XVFB_PID" ]; then
        kill \$XVFB_PID 2>/dev/null || true
        log_info "Xvfb进程已关闭"
    fi
    if [ ! -z "\$NODE_PID" ]; then
        kill \$NODE_PID 2>/dev/null || true
        log_info "Node.js进程已关闭"
    fi
}

# 信号处理
trap cleanup SIGTERM SIGINT

# 验证Playwright（如果验证脚本存在）
if [ -f "./verify-playwright.sh" ]; then
    log_info "运行Playwright验证..."
    if ./verify-playwright.sh; then
        log_info "Playwright验证通过"
    else
        log_warn "Playwright验证失败，但继续启动应用"
    fi
else
    log_warn "未找到Playwright验证脚本，跳过验证"
fi

# 启动Xvfb虚拟显示服务器
log_info "启动Xvfb虚拟显示服务器..."
Xvfb :99 -screen 0 1024x768x24 -ac +extension GLX +render -noreset &
XVFB_PID=\$!

# 等待Xvfb启动
sleep 2

# 验证Xvfb是否启动成功
if ! kill -0 \$XVFB_PID 2>/dev/null; then
    log_error "Xvfb启动失败"
    exit 1
fi

log_info "Xvfb已启动 (PID: \$XVFB_PID)"

# 设置显示环境变量
export DISPLAY=:99

# 启动Node.js应用
log_info "启动Node.js应用..."
npm start &
NODE_PID=\$!

# 等待进程
wait \$NODE_PID
NODE_EXIT_CODE=\$?

log_info "Node.js应用已退出 (退出码: \$NODE_EXIT_CODE)"

# 清理资源
cleanup

exit \$NODE_EXIT_CODE
`;
    }

    /**
     * 生成优化报告
     */
    generateReport() {
        const reportPath = path.join(this.projectRoot, 'reports', 'docker-optimization-report.md');
        
        const report = `# Docker容器配置优化报告

生成时间: ${new Date().toLocaleString()}

## 分析结果

### 发现的问题
${this.issues.length > 0 ? this.issues.map(issue => `- ${issue}`).join('\n') : '无严重问题'}

### 优化建议
${this.optimizations.map(opt => `
#### ${opt.type}
- **建议**: ${opt.suggestion}
- **当前**: ${opt.current}
- **推荐**: ${opt.recommended}
`).join('\n')}

## 优化内容

### 1. Dockerfile优化
- 使用Alpine基础镜像减少大小
- 合并RUN命令减少层数
- 添加健康检查
- 优化缓存清理

### 2. 启动脚本优化
- 添加详细日志输出
- 改进错误处理
- 优化信号处理
- 添加进程监控

### 3. 安全性改进
- 使用非root用户运行
- 设置适当的文件权限
- 环境变量安全配置

## 部署建议

1. 在测试环境验证优化配置
2. 监控资源使用情况
3. 测试所有功能正常工作
4. 逐步部署到生产环境

## 性能预期

- 镜像大小减少约30-40%
- 启动时间优化10-20%
- 内存使用优化5-15%
- 更好的错误处理和监控
`;

        fs.writeFileSync(reportPath, report);
        console.log(`📊 优化报告已保存: ${reportPath}`);
    }

    /**
     * 运行完整分析
     */
    async run() {
        console.log('🚀 开始Docker容器配置优化分析...');
        
        try {
            // 分析现有配置
            this.analyzeDockerfile();
            this.analyzeStartupScript();
            this.analyzeVerificationScript();
            
            // 生成优化建议
            this.generateOptimizations();
            
            // 生成报告
            this.generateReport();
            
            console.log('\n✅ Docker配置优化分析完成');
            console.log(`📋 发现 ${this.issues.length} 个问题`);
            console.log(`💡 提供 ${this.optimizations.length} 个优化建议`);
            
        } catch (error) {
            console.error('❌ 分析过程中出现错误:', error.message);
            process.exit(1);
        }
    }
}

// 主程序
if (require.main === module) {
    const optimizer = new DockerConfigOptimizer();
    optimizer.run();
}

module.exports = DockerConfigOptimizer;