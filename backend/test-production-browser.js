/**
 * 生产环境浏览器配置测试脚本
 * 用于验证Playwright浏览器在生产环境中的启动和配置
 */

const { chromium } = require('playwright');
const path = require('path');
require('dotenv').config();

/**
 * 生产环境浏览器测试类
 */
class ProductionBrowserTest {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.testResults = [];
        this.isProduction = process.env.NODE_ENV === 'production';
        this.isZeabur = process.env.ZEABUR_ENVIRONMENT === 'production';
    }

    /**
     * 获取生产环境浏览器配置
     */
    getBrowserConfig() {
        const config = {
            headless: true, // 生产环境必须使用headless模式
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding'
            ]
        };

        // Zeabur特定配置
        if (this.isZeabur) {
            config.args.push(
                '--memory-pressure-off',
                '--max_old_space_size=512',
                '--disable-extensions',
                '--disable-plugins'
            );
        }

        console.log('🔧 浏览器配置:', JSON.stringify(config, null, 2));
        return config;
    }

    /**
     * 测试浏览器启动
     */
    async testBrowserLaunch() {
        try {
            console.log('🚀 测试浏览器启动...');
            
            const config = this.getBrowserConfig();
            const startTime = Date.now();
            
            this.browser = await chromium.launch(config);
            
            const launchTime = Date.now() - startTime;
            console.log(`✅ 浏览器启动成功 (耗时: ${launchTime}ms)`);
            
            this.testResults.push({
                test: '浏览器启动',
                status: 'success',
                launchTime: `${launchTime}ms`
            });
            
            return true;
        } catch (error) {
            console.error('❌ 浏览器启动失败:', error.message);
            this.testResults.push({
                test: '浏览器启动',
                status: 'failed',
                error: error.message
            });
            return false;
        }
    }

    /**
     * 测试浏览器上下文创建
     */
    async testContextCreation() {
        try {
            console.log('📄 测试浏览器上下文创建...');
            
            if (!this.browser) {
                throw new Error('浏览器未启动');
            }

            const startTime = Date.now();
            
            this.context = await this.browser.newContext({
                viewport: { width: 1280, height: 720 },
                userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            });
            
            const creationTime = Date.now() - startTime;
            console.log(`✅ 浏览器上下文创建成功 (耗时: ${creationTime}ms)`);
            
            this.testResults.push({
                test: '上下文创建',
                status: 'success',
                creationTime: `${creationTime}ms`
            });
            
            return true;
        } catch (error) {
            console.error('❌ 浏览器上下文创建失败:', error.message);
            this.testResults.push({
                test: '上下文创建',
                status: 'failed',
                error: error.message
            });
            return false;
        }
    }

    /**
     * 测试页面创建和导航
     */
    async testPageNavigation() {
        try {
            console.log('🌐 测试页面创建和导航...');
            
            if (!this.context) {
                throw new Error('浏览器上下文未创建');
            }

            const startTime = Date.now();
            
            this.page = await this.context.newPage();
            
            // 测试导航到一个简单的页面
            await this.page.goto('data:text/html,<html><body><h1>Test Page</h1></body></html>');
            
            // 验证页面内容
            const title = await this.page.textContent('h1');
            if (title !== 'Test Page') {
                throw new Error('页面内容验证失败');
            }
            
            const navigationTime = Date.now() - startTime;
            console.log(`✅ 页面导航成功 (耗时: ${navigationTime}ms)`);
            
            this.testResults.push({
                test: '页面导航',
                status: 'success',
                navigationTime: `${navigationTime}ms`
            });
            
            return true;
        } catch (error) {
            console.error('❌ 页面导航失败:', error.message);
            this.testResults.push({
                test: '页面导航',
                status: 'failed',
                error: error.message
            });
            return false;
        }
    }

    /**
     * 测试JavaScript执行
     */
    async testJavaScriptExecution() {
        try {
            console.log('⚡ 测试JavaScript执行...');
            
            if (!this.page) {
                throw new Error('页面未创建');
            }

            const startTime = Date.now();
            
            // 执行简单的JavaScript
            const result = await this.page.evaluate(() => {
                return {
                    userAgent: navigator.userAgent,
                    platform: navigator.platform,
                    memory: performance.memory ? {
                        used: performance.memory.usedJSHeapSize,
                        total: performance.memory.totalJSHeapSize,
                        limit: performance.memory.jsHeapSizeLimit
                    } : null,
                    timestamp: Date.now()
                };
            });
            
            const executionTime = Date.now() - startTime;
            console.log(`✅ JavaScript执行成功 (耗时: ${executionTime}ms)`);
            console.log('📊 浏览器信息:', JSON.stringify(result, null, 2));
            
            this.testResults.push({
                test: 'JavaScript执行',
                status: 'success',
                executionTime: `${executionTime}ms`,
                browserInfo: result
            });
            
            return true;
        } catch (error) {
            console.error('❌ JavaScript执行失败:', error.message);
            this.testResults.push({
                test: 'JavaScript执行',
                status: 'failed',
                error: error.message
            });
            return false;
        }
    }

    /**
     * 测试内存使用情况
     */
    async testMemoryUsage() {
        try {
            console.log('💾 测试内存使用情况...');
            
            if (!this.page) {
                throw new Error('页面未创建');
            }

            // 获取内存使用情况
            const memoryInfo = await this.page.evaluate(() => {
                if (performance.memory) {
                    return {
                        used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                        total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                        limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
                    };
                }
                return null;
            });

            if (memoryInfo) {
                console.log(`✅ 内存使用情况: ${memoryInfo.used}MB / ${memoryInfo.total}MB (限制: ${memoryInfo.limit}MB)`);
                
                // 检查内存使用是否合理
                if (memoryInfo.used > 100) {
                    console.log('⚠️ 内存使用较高，可能需要优化');
                }
                
                this.testResults.push({
                    test: '内存使用',
                    status: 'success',
                    memoryInfo: memoryInfo
                });
            } else {
                console.log('⚠️ 无法获取内存信息（可能是浏览器限制）');
                this.testResults.push({
                    test: '内存使用',
                    status: 'warning',
                    message: '无法获取内存信息'
                });
            }
            
            return true;
        } catch (error) {
            console.error('❌ 内存测试失败:', error.message);
            this.testResults.push({
                test: '内存使用',
                status: 'failed',
                error: error.message
            });
            return false;
        }
    }

    /**
     * 清理资源
     */
    async cleanup() {
        try {
            console.log('🧹 清理浏览器资源...');
            
            if (this.page) {
                await this.page.close();
                this.page = null;
            }
            
            if (this.context) {
                await this.context.close();
                this.context = null;
            }
            
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }
            
            console.log('✅ 资源清理完成');
            return true;
        } catch (error) {
            console.error('❌ 资源清理失败:', error.message);
            return false;
        }
    }

    /**
     * 生成测试报告
     */
    generateReport() {
        console.log('\n📊 生产环境浏览器测试报告');
        console.log('================================');
        console.log(`测试时间: ${new Date().toISOString()}`);
        console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
        console.log(`Zeabur环境: ${this.isZeabur ? '是' : '否'}`);
        console.log('');

        let successCount = 0;
        let failedCount = 0;
        let warningCount = 0;

        this.testResults.forEach(result => {
            const icon = result.status === 'success' ? '✅' : 
                        result.status === 'warning' ? '⚠️' : '❌';
            
            console.log(`${icon} ${result.test}: ${result.status}`);
            
            if (result.launchTime) console.log(`   启动时间: ${result.launchTime}`);
            if (result.creationTime) console.log(`   创建时间: ${result.creationTime}`);
            if (result.navigationTime) console.log(`   导航时间: ${result.navigationTime}`);
            if (result.executionTime) console.log(`   执行时间: ${result.executionTime}`);
            if (result.memoryInfo) {
                console.log(`   内存使用: ${result.memoryInfo.used}MB / ${result.memoryInfo.total}MB`);
            }
            if (result.error) console.log(`   错误: ${result.error}`);
            if (result.message) console.log(`   说明: ${result.message}`);

            if (result.status === 'success') successCount++;
            else if (result.status === 'failed') failedCount++;
            else if (result.status === 'warning') warningCount++;
        });

        console.log('');
        console.log(`总计: ${this.testResults.length} 项测试`);
        console.log(`成功: ${successCount} 项`);
        console.log(`警告: ${warningCount} 项`);
        console.log(`失败: ${failedCount} 项`);

        return failedCount === 0;
    }

    /**
     * 运行所有测试
     */
    async runAllTests() {
        console.log('🚀 开始生产环境浏览器测试...\n');

        try {
            // 运行各项测试
            await this.testBrowserLaunch();
            await this.testContextCreation();
            await this.testPageNavigation();
            await this.testJavaScriptExecution();
            await this.testMemoryUsage();

            // 生成报告
            const allPassed = this.generateReport();

            console.log('\n' + (allPassed ? '✅ 所有浏览器测试通过' : '❌ 部分浏览器测试失败'));
            
            return allPassed;
        } finally {
            // 确保清理资源
            await this.cleanup();
        }
    }
}

/**
 * 主执行函数
 */
async function main() {
    try {
        const tester = new ProductionBrowserTest();
        const success = await tester.runAllTests();
        
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('❌ 浏览器测试执行失败:', error);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = ProductionBrowserTest;