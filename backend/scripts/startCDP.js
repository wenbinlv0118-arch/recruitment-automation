#!/usr/bin/env node

/**
 * CDP服务启动脚本
 * 用于初始化和启动Chrome DevTools Protocol服务
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { cdpConfig, getEnvironmentConfig, validateConfig } = require('../config/cdpConfig');

/**
 * CDP启动器类
 */
class CDPLauncher {
  constructor(options = {}) {
    this.options = {
      environment: process.env.NODE_ENV || 'development',
      port: process.env.CDP_DEBUG_PORT || 9222,
      headless: process.env.CDP_HEADLESS !== 'false',
      verbose: process.env.CDP_VERBOSE === 'true',
      ...options
    };
    
    this.config = getEnvironmentConfig(this.options.environment);
    this.chromeProcess = null;
    this.isRunning = false;
  }

  /**
   * 启动CDP服务
   */
  async start() {
    try {
      console.log('🚀 启动CDP服务...');
      console.log(`环境: ${this.options.environment}`);
      console.log(`端口: ${this.options.port}`);
      console.log(`无头模式: ${this.options.headless}`);
      
      // 验证配置
      const validation = validateConfig(this.config);
      if (!validation.valid) {
        console.error('❌ 配置验证失败:');
        validation.errors.forEach(error => console.error(`  - ${error}`));
        process.exit(1);
      }
      
      if (validation.warnings.length > 0) {
        console.warn('⚠️  配置警告:');
        validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
      }
      
      // 检查端口是否被占用
      const isPortInUse = await this.checkPort(this.options.port);
      if (isPortInUse) {
        console.warn(`⚠️  端口 ${this.options.port} 已被占用，尝试终止现有进程...`);
        await this.killExistingChrome();
      }
      
      // 准备用户数据目录
      await this.prepareUserDataDir();
      
      // 启动Chrome
      await this.launchChrome();
      
      // 等待Chrome启动完成
      await this.waitForChrome();
      
      console.log('✅ CDP服务启动成功!');
      console.log(`🌐 调试地址: http://localhost:${this.options.port}`);
      
      // 设置进程退出处理
      this.setupExitHandlers();
      
      return true;
      
    } catch (error) {
      console.error('❌ CDP服务启动失败:', error.message);
      await this.cleanup();
      throw error;
    }
  }

  /**
   * 启动Chrome进程
   */
  async launchChrome() {
    const chromeArgs = [
      `--remote-debugging-port=${this.options.port}`,
      `--user-data-dir=${this.config.chrome.userDataDir}`,
      `--window-size=${this.config.chrome.windowSize.width},${this.config.chrome.windowSize.height}`,
      ...this.config.chrome.args
    ];
    
    // 添加无头模式参数
    if (this.options.headless) {
      chromeArgs.push('--headless');
    }
    
    // VNC环境配置
    if (this.config.integration.vnc.enabled) {
      process.env.DISPLAY = this.config.integration.vnc.display;
      console.log(`🖥️  VNC显示: ${process.env.DISPLAY}`);
    }
    
    console.log('🔧 Chrome启动参数:');
    if (this.options.verbose) {
      chromeArgs.forEach(arg => console.log(`  ${arg}`));
    } else {
      console.log(`  共 ${chromeArgs.length} 个参数`);
    }
    
    // 启动Chrome进程
    this.chromeProcess = spawn(this.config.chrome.executablePath, chromeArgs, {
      stdio: this.options.verbose ? 'inherit' : 'pipe',
      detached: false
    });
    
    // 处理Chrome进程事件
    this.chromeProcess.on('error', (error) => {
      console.error('❌ Chrome进程错误:', error.message);
      this.isRunning = false;
    });
    
    this.chromeProcess.on('exit', (code, signal) => {
      console.log(`🔄 Chrome进程退出: code=${code}, signal=${signal}`);
      this.isRunning = false;
    });
    
    // 捕获Chrome输出（非详细模式）
    if (!this.options.verbose && this.chromeProcess.stdout) {
      this.chromeProcess.stdout.on('data', (data) => {
        if (this.config.logging.verbose) {
          console.log('Chrome stdout:', data.toString().trim());
        }
      });
    }
    
    if (!this.options.verbose && this.chromeProcess.stderr) {
      this.chromeProcess.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (message && !message.includes('DevTools listening')) {
          console.warn('Chrome stderr:', message);
        }
      });
    }
    
    this.isRunning = true;
    console.log(`🎯 Chrome进程已启动 (PID: ${this.chromeProcess.pid})`);
  }

  /**
   * 等待Chrome启动完成
   */
  async waitForChrome() {
    const maxAttempts = 30;
    const delay = 1000;
    
    console.log('⏳ 等待Chrome启动完成...');
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.checkChromeHealth();
        if (response) {
          console.log(`✅ Chrome已就绪 (尝试 ${attempt}/${maxAttempts})`);
          return true;
        }
      } catch (error) {
        // 忽略连接错误，继续尝试
      }
      
      if (attempt < maxAttempts) {
        await this.sleep(delay);
      }
    }
    
    throw new Error('Chrome启动超时');
  }

  /**
   * 检查Chrome健康状态
   */
  async checkChromeHealth() {
    const http = require('http');
    
    return new Promise((resolve, reject) => {
      const req = http.get(`http://localhost:${this.options.port}/json/version`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const info = JSON.parse(data);
            resolve(info);
          } catch (error) {
            reject(error);
          }
        });
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error('请求超时'));
      });
    });
  }

  /**
   * 检查端口是否被占用
   */
  async checkPort(port) {
    const net = require('net');
    
    return new Promise((resolve) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.close(() => resolve(false));
      });
      
      server.on('error', () => resolve(true));
    });
  }

  /**
   * 终止现有的Chrome进程
   */
  async killExistingChrome() {
    try {
      const { exec } = require('child_process');
      const platform = os.platform();
      
      let killCommand;
      if (platform === 'win32') {
        killCommand = `taskkill /F /IM chrome.exe`;
      } else {
        killCommand = `pkill -f "remote-debugging-port=${this.options.port}"`;
      }
      
      await new Promise((resolve, reject) => {
        exec(killCommand, (error, stdout, stderr) => {
          if (error && !error.message.includes('No such process')) {
            console.warn('终止现有Chrome进程时出现警告:', error.message);
          }
          resolve();
        });
      });
      
      // 等待进程完全终止
      await this.sleep(2000);
      
    } catch (error) {
      console.warn('终止现有Chrome进程失败:', error.message);
    }
  }

  /**
   * 准备用户数据目录
   */
  async prepareUserDataDir() {
    const userDataDir = this.config.chrome.userDataDir;
    
    try {
      // 确保目录存在
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
        console.log(`📁 创建用户数据目录: ${userDataDir}`);
      } else {
        console.log(`📁 使用现有用户数据目录: ${userDataDir}`);
      }
      
      // 清理锁文件
      const lockFiles = ['SingletonLock', 'SingletonSocket', 'SingletonCookie'];
      for (const lockFile of lockFiles) {
        const lockPath = path.join(userDataDir, lockFile);
        if (fs.existsSync(lockPath)) {
          try {
            fs.unlinkSync(lockPath);
            console.log(`🔓 清理锁文件: ${lockFile}`);
          } catch (error) {
            console.warn(`清理锁文件失败: ${lockFile}`, error.message);
          }
        }
      }
      
    } catch (error) {
      console.error('准备用户数据目录失败:', error.message);
      throw error;
    }
  }

  /**
   * 设置进程退出处理
   */
  setupExitHandlers() {
    const exitHandler = async (signal) => {
      console.log(`\n🛑 接收到退出信号: ${signal}`);
      await this.cleanup();
      process.exit(0);
    };
    
    process.on('SIGINT', exitHandler);
    process.on('SIGTERM', exitHandler);
    process.on('SIGHUP', exitHandler);
    
    process.on('uncaughtException', async (error) => {
      console.error('❌ 未捕获的异常:', error);
      await this.cleanup();
      process.exit(1);
    });
    
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('❌ 未处理的Promise拒绝:', reason);
      await this.cleanup();
      process.exit(1);
    });
  }

  /**
   * 清理资源
   */
  async cleanup() {
    console.log('🧹 清理CDP服务资源...');
    
    if (this.chromeProcess && this.isRunning) {
      try {
        console.log('🔄 终止Chrome进程...');
        this.chromeProcess.kill('SIGTERM');
        
        // 等待进程优雅退出
        await this.sleep(3000);
        
        if (this.isRunning) {
          console.log('🔨 强制终止Chrome进程...');
          this.chromeProcess.kill('SIGKILL');
        }
        
      } catch (error) {
        console.warn('终止Chrome进程时出现错误:', error.message);
      }
    }
    
    this.isRunning = false;
    console.log('✅ 清理完成');
  }

  /**
   * 休眠函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取状态
   */
  getStatus() {
    return {
      running: this.isRunning,
      pid: this.chromeProcess ? this.chromeProcess.pid : null,
      port: this.options.port,
      environment: this.options.environment,
      headless: this.options.headless
    };
  }
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const options = {};
  
  // 解析命令行参数
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--port':
        options.port = parseInt(args[++i]);
        break;
      case '--headless':
        options.headless = true;
        break;
      case '--no-headless':
        options.headless = false;
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--env':
        options.environment = args[++i];
        break;
      case '--help':
        console.log(`
CDP服务启动脚本

用法: node startCDP.js [选项]

选项:
  --port <端口>      调试端口 (默认: 9222)
  --headless         启用无头模式
  --no-headless      禁用无头模式
  --verbose          详细输出
  --env <环境>       环境名称 (development/production/test)
  --help             显示帮助信息

环境变量:
  CDP_DEBUG_PORT     调试端口
  CDP_HEADLESS       无头模式 (true/false)
  CDP_VERBOSE        详细输出 (true/false)
  NODE_ENV           环境名称
`);
        process.exit(0);
        break;
    }
  }
  
  const launcher = new CDPLauncher(options);
  
  try {
    await launcher.start();
    
    // 保持进程运行
    console.log('\n💡 按 Ctrl+C 停止服务\n');
    
    // 定期输出状态
    setInterval(() => {
      const status = launcher.getStatus();
      if (status.running) {
        console.log(`📊 CDP服务运行中 - PID: ${status.pid}, 端口: ${status.port}`);
      }
    }, 30000); // 每30秒输出一次状态
    
  } catch (error) {
    console.error('❌ 启动失败:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = CDPLauncher;