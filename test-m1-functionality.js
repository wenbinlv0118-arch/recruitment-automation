#!/usr/bin/env node

/**
 * M1 Pro芯片功能测试脚本
 * 测试关键模块在M1芯片上的运行状况
 */

const { performance } = require('perf_hooks');
const path = require('path');
const fs = require('fs');

// 颜色定义
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

class M1FunctionalityTester {
    constructor() {
        this.results = [];
        this.backendPath = path.join(__dirname, 'backend');
    }

    /**
     * 添加测试结果
     */
    addResult(name, success, duration, error = null) {
        this.results.push({
            name,
            success,
            duration: duration ? `${duration.toFixed(2)}ms` : 'N/A',
            error
        });
    }

    /**
     * 测试SQLite3模块
     */
    async testSQLite3() {
        log('\n🗄️  测试SQLite3模块...', 'blue');
        const start = performance.now();
        
        try {
            // 切换到backend目录进行测试
            process.chdir(this.backendPath);
            const sqlite3 = require(path.join(this.backendPath, 'node_modules', 'sqlite3'));
            
            // 创建内存数据库测试
            const db = new sqlite3.Database(':memory:');
            
            await new Promise((resolve, reject) => {
                db.serialize(() => {
                    db.run("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)");
                    db.run("INSERT INTO test (name) VALUES ('M1 Test')");
                    db.get("SELECT * FROM test WHERE id = 1", (err, row) => {
                        if (err) reject(err);
                        else {
                            if (row && row.name === 'M1 Test') {
                                resolve();
                            } else {
                                reject(new Error('数据不匹配'));
                            }
                        }
                    });
                });
            });
            
            db.close();
            const duration = performance.now() - start;
            this.addResult('SQLite3', true, duration);
            log('✅ SQLite3测试通过', 'green');
            
        } catch (error) {
            const duration = performance.now() - start;
            this.addResult('SQLite3', false, duration, error.message);
            log(`❌ SQLite3测试失败: ${error.message}`, 'red');
        } finally {
            process.chdir(__dirname);
        }
    }

    /**
     * 测试ChromaDB模块
     */
    async testChromaDB() {
        log('\n🔍 测试ChromaDB模块...', 'blue');
        const start = performance.now();
        
        try {
            process.chdir(this.backendPath);
            const { ChromaApi } = require(path.join(this.backendPath, 'node_modules', 'chromadb'));
            
            // 基本加载测试
            const duration = performance.now() - start;
            this.addResult('ChromaDB', true, duration);
            log('✅ ChromaDB测试通过', 'green');
            
        } catch (error) {
            const duration = performance.now() - start;
            this.addResult('ChromaDB', false, duration, error.message);
            log(`❌ ChromaDB测试失败: ${error.message}`, 'red');
        } finally {
            process.chdir(__dirname);
        }
    }

    /**
     * 测试Playwright模块
     */
    async testPlaywright() {
        log('\n🎭 测试Playwright模块...', 'blue');
        const start = performance.now();
        
        try {
            process.chdir(this.backendPath);
            const { chromium } = require(path.join(this.backendPath, 'node_modules', 'playwright'));
            
            // 测试浏览器启动
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto('data:text/html,<h1>M1 Test</h1>');
            const title = await page.textContent('h1');
            await browser.close();
            
            if (title === 'M1 Test') {
                const duration = performance.now() - start;
                this.addResult('Playwright', true, duration);
                log('✅ Playwright测试通过', 'green');
            } else {
                throw new Error('页面内容不匹配');
            }
            
        } catch (error) {
            const duration = performance.now() - start;
            this.addResult('Playwright', false, duration, error.message);
            log(`❌ Playwright测试失败: ${error.message}`, 'red');
        } finally {
            process.chdir(__dirname);
        }
    }

    /**
     * 测试Tesseract.js模块
     */
    async testTesseract() {
        log('\n📝 测试Tesseract.js模块...', 'blue');
        const start = performance.now();
        
        try {
            process.chdir(this.backendPath);
            const { createWorker } = require(path.join(this.backendPath, 'node_modules', 'tesseract.js'));
            
            // 基本加载测试（不进行实际OCR以节省时间）
            const duration = performance.now() - start;
            this.addResult('Tesseract.js', true, duration);
            log('✅ Tesseract.js测试通过', 'green');
            
        } catch (error) {
            const duration = performance.now() - start;
            this.addResult('Tesseract.js', false, duration, error.message);
            log(`❌ Tesseract.js测试失败: ${error.message}`, 'red');
        } finally {
            process.chdir(__dirname);
        }
    }

    /**
     * 测试@xenova/transformers模块
     */
    async testTransformers() {
        log('\n🤖 测试@xenova/transformers模块...', 'blue');
        const start = performance.now();
        
        try {
            process.chdir(this.backendPath);
            const transformers = require(path.join(this.backendPath, 'node_modules', '@xenova', 'transformers'));
            
            // 基本加载测试
            const duration = performance.now() - start;
            this.addResult('@xenova/transformers', true, duration);
            log('✅ @xenova/transformers测试通过', 'green');
            
        } catch (error) {
            const duration = performance.now() - start;
            this.addResult('@xenova/transformers', false, duration, error.message);
            log(`❌ @xenova/transformers测试失败: ${error.message}`, 'red');
        } finally {
            process.chdir(__dirname);
        }
    }

    /**
     * 测试系统信息
     */
    getSystemInfo() {
        const os = require('os');
        const { execSync } = require('child_process');
        
        try {
            const chip = execSync('sysctl -n machdep.cpu.brand_string', { encoding: 'utf8' }).trim();
            const rosetta = execSync('sysctl -n sysctl.proc_translated 2>/dev/null || echo "0"', { encoding: 'utf8' }).trim();
            
            return {
                chip,
                arch: os.arch(),
                platform: os.platform(),
                nodeVersion: process.version,
                rosetta: rosetta === '1' ? '启用' : '原生',
                cpus: os.cpus().length,
                memory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`
            };
        } catch (error) {
            return {
                chip: 'Unknown',
                arch: os.arch(),
                platform: os.platform(),
                nodeVersion: process.version,
                rosetta: 'Unknown',
                cpus: os.cpus().length,
                memory: `${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`
            };
        }
    }

    /**
     * 生成测试报告
     */
    generateReport() {
        const systemInfo = this.getSystemInfo();
        const timestamp = new Date().toISOString();
        
        log('\n📊 测试报告', 'blue');
        log('='.repeat(50), 'blue');
        
        // 系统信息
        log('\n🖥️  系统信息:', 'yellow');
        log(`芯片: ${systemInfo.chip}`);
        log(`架构: ${systemInfo.arch}`);
        log(`平台: ${systemInfo.platform}`);
        log(`Node.js: ${systemInfo.nodeVersion}`);
        log(`Rosetta: ${systemInfo.rosetta}`);
        log(`CPU核心: ${systemInfo.cpus}`);
        log(`内存: ${systemInfo.memory}`);
        
        // 测试结果
        log('\n🧪 测试结果:', 'yellow');
        const passed = this.results.filter(r => r.success).length;
        const total = this.results.length;
        
        this.results.forEach(result => {
            const status = result.success ? '✅' : '❌';
            const color = result.success ? 'green' : 'red';
            log(`${status} ${result.name.padEnd(20)} ${result.duration.padStart(10)} ${result.error || ''}`, color);
        });
        
        log(`\n📈 总体结果: ${passed}/${total} 通过`, passed === total ? 'green' : 'yellow');
        
        // 保存报告到文件
        const reportContent = `M1 Pro功能测试报告\n生成时间: ${timestamp}\n\n系统信息:\n${JSON.stringify(systemInfo, null, 2)}\n\n测试结果:\n${this.results.map(r => `${r.name}: ${r.success ? '通过' : '失败'} (${r.duration}) ${r.error || ''}`).join('\n')}\n\n总体结果: ${passed}/${total} 通过`;
        
        const reportPath = path.join(__dirname, 'M1_FUNCTIONALITY_TEST_REPORT.txt');
        fs.writeFileSync(reportPath, reportContent);
        log(`\n📄 详细报告已保存到: ${reportPath}`, 'blue');
        
        return passed === total;
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        log('🚀 开始M1 Pro功能测试...', 'blue');
        log('测试时间: ' + new Date().toLocaleString(), 'blue');
        
        await this.testSQLite3();
        await this.testChromaDB();
        await this.testPlaywright();
        await this.testTesseract();
        await this.testTransformers();
        
        const allPassed = this.generateReport();
        
        if (allPassed) {
            log('\n🎉 所有测试通过！M1 Pro兼容性良好。', 'green');
            return true;
        } else {
            log('\n⚠️  部分测试失败，请检查错误信息并运行修复脚本。', 'yellow');
            return false;
        }
    }
}

// 主函数
async function main() {
    const tester = new M1FunctionalityTester();
    
    try {
        const success = await tester.runAllTests();
        process.exit(success ? 0 : 1);
    } catch (error) {
        log(`\n💥 测试过程中发生错误: ${error.message}`, 'red');
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = M1FunctionalityTester;