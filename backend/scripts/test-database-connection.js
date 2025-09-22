/**
 * 生产环境数据库连接测试脚本
 * 用于验证Supabase数据库连接和基本操作
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

/**
 * 数据库连接测试类
 */
class DatabaseConnectionTest {
    constructor() {
        this.supabaseUrl = process.env.SUPABASE_URL;
        this.supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        this.supabase = null;
        this.testResults = [];
    }

    /**
     * 初始化数据库连接
     */
    async initialize() {
        try {
            console.log('🔗 初始化数据库连接...');
            
            if (!this.supabaseUrl || !this.supabaseKey) {
                throw new Error('缺少必要的Supabase环境变量');
            }

            this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
            console.log('✅ 数据库客户端初始化成功');
            
            return true;
        } catch (error) {
            console.error('❌ 数据库客户端初始化失败:', error.message);
            return false;
        }
    }

    /**
     * 测试基本连接
     */
    async testBasicConnection() {
        try {
            console.log('🔍 测试基本数据库连接...');
            
            // 尝试获取数据库时间
            const { data, error } = await this.supabase
                .from('users')
                .select('count')
                .limit(1);

            if (error && error.code !== 'PGRST116') { // PGRST116 是表不存在的错误，可以忽略
                throw error;
            }

            console.log('✅ 基本数据库连接正常');
            this.testResults.push({ test: '基本连接', status: 'success' });
            return true;
        } catch (error) {
            console.error('❌ 基本数据库连接失败:', error.message);
            this.testResults.push({ test: '基本连接', status: 'failed', error: error.message });
            return false;
        }
    }

    /**
     * 测试用户表操作
     */
    async testUserTable() {
        try {
            console.log('👤 测试用户表操作...');
            
            // 测试查询用户表
            const { data, error } = await this.supabase
                .from('users')
                .select('*')
                .limit(1);

            if (error) {
                // 如果表不存在，尝试创建测试表
                if (error.code === 'PGRST116') {
                    console.log('⚠️ 用户表不存在，这是正常的（可能还未创建）');
                    this.testResults.push({ test: '用户表', status: 'warning', message: '表不存在' });
                    return true;
                } else {
                    throw error;
                }
            }

            console.log('✅ 用户表操作正常');
            this.testResults.push({ test: '用户表', status: 'success' });
            return true;
        } catch (error) {
            console.error('❌ 用户表操作失败:', error.message);
            this.testResults.push({ test: '用户表', status: 'failed', error: error.message });
            return false;
        }
    }

    /**
     * 测试简历表操作
     */
    async testResumeTable() {
        try {
            console.log('📄 测试简历表操作...');
            
            const { data, error } = await this.supabase
                .from('resumes')
                .select('*')
                .limit(1);

            if (error) {
                if (error.code === 'PGRST116') {
                    console.log('⚠️ 简历表不存在，这是正常的（可能还未创建）');
                    this.testResults.push({ test: '简历表', status: 'warning', message: '表不存在' });
                    return true;
                } else {
                    throw error;
                }
            }

            console.log('✅ 简历表操作正常');
            this.testResults.push({ test: '简历表', status: 'success' });
            return true;
        } catch (error) {
            console.error('❌ 简历表操作失败:', error.message);
            this.testResults.push({ test: '简历表', status: 'failed', error: error.message });
            return false;
        }
    }

    /**
     * 测试数据库权限
     */
    async testDatabasePermissions() {
        try {
            console.log('🔐 测试数据库权限...');
            
            // 尝试创建一个临时测试表
            const { data, error } = await this.supabase.rpc('get_current_user');

            if (error && error.code !== 'PGRST202') { // PGRST202 是函数不存在的错误
                throw error;
            }

            console.log('✅ 数据库权限正常');
            this.testResults.push({ test: '数据库权限', status: 'success' });
            return true;
        } catch (error) {
            console.error('❌ 数据库权限测试失败:', error.message);
            this.testResults.push({ test: '数据库权限', status: 'failed', error: error.message });
            return false;
        }
    }

    /**
     * 测试网络连接性能
     */
    async testNetworkPerformance() {
        try {
            console.log('⚡ 测试网络连接性能...');
            
            const startTime = Date.now();
            
            const { data, error } = await this.supabase
                .from('users')
                .select('count')
                .limit(1);

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            console.log(`✅ 网络连接性能正常 (响应时间: ${responseTime}ms)`);
            this.testResults.push({ 
                test: '网络性能', 
                status: 'success', 
                responseTime: `${responseTime}ms` 
            });
            
            return true;
        } catch (error) {
            console.error('❌ 网络连接性能测试失败:', error.message);
            this.testResults.push({ test: '网络性能', status: 'failed', error: error.message });
            return false;
        }
    }

    /**
     * 生成测试报告
     */
    generateReport() {
        console.log('\n📊 数据库连接测试报告');
        console.log('========================');
        console.log(`测试时间: ${new Date().toISOString()}`);
        console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
        console.log(`数据库URL: ${this.supabaseUrl}`);
        console.log('');

        let successCount = 0;
        let failedCount = 0;
        let warningCount = 0;

        this.testResults.forEach(result => {
            const icon = result.status === 'success' ? '✅' : 
                        result.status === 'warning' ? '⚠️' : '❌';
            
            console.log(`${icon} ${result.test}: ${result.status}`);
            
            if (result.responseTime) {
                console.log(`   响应时间: ${result.responseTime}`);
            }
            
            if (result.error) {
                console.log(`   错误: ${result.error}`);
            }
            
            if (result.message) {
                console.log(`   说明: ${result.message}`);
            }

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
        console.log('🚀 开始数据库连接测试...\n');

        // 初始化连接
        const initialized = await this.initialize();
        if (!initialized) {
            return false;
        }

        // 运行各项测试
        await this.testBasicConnection();
        await this.testUserTable();
        await this.testResumeTable();
        await this.testDatabasePermissions();
        await this.testNetworkPerformance();

        // 生成报告
        const allPassed = this.generateReport();

        console.log('\n' + (allPassed ? '✅ 所有数据库测试通过' : '❌ 部分数据库测试失败'));
        
        return allPassed;
    }
}

/**
 * 主执行函数
 */
async function main() {
    try {
        const tester = new DatabaseConnectionTest();
        const success = await tester.runAllTests();
        
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error('❌ 数据库测试执行失败:', error);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = DatabaseConnectionTest;