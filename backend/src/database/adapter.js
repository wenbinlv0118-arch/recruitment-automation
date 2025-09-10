/**
 * 数据库适配器
 * 根据环境配置自动选择 SQLite 或 Supabase
 */

const path = require('path');

class DatabaseAdapter {
  constructor() {
    this.dbType = process.env.DATABASE_TYPE || 'sqlite';
    this.dbManager = null;
  }

  /**
   * 初始化数据库管理器
   * @returns {Promise<Object>} 数据库管理器实例
   */
  async initialize() {
    try {
      if (this.dbType === 'supabase') {
        console.log('🔗 使用 Supabase 数据库');
        const SupabaseDatabaseManager = require('../../../supabase/database-manager');
        this.dbManager = new SupabaseDatabaseManager();
      } else {
        console.log('🔗 使用 SQLite 数据库');
        const SQLiteDatabaseManager = require('./init');
        this.dbManager = new SQLiteDatabaseManager();
      }

      // 初始化数据库连接
      const isInitialized = await this.dbManager.init();
      if (!isInitialized) {
        throw new Error('数据库初始化失败');
      }

      console.log(`✅ ${this.dbType.toUpperCase()} 数据库初始化成功`);
      return this.dbManager;
    } catch (error) {
      console.error('数据库适配器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取数据库管理器
   * @returns {Object} 数据库管理器实例
   */
  getManager() {
    if (!this.dbManager) {
      throw new Error('数据库管理器未初始化，请先调用 initialize()');
    }
    return this.dbManager;
  }

  /**
   * 获取数据库类型
   * @returns {string} 数据库类型
   */
  getType() {
    return this.dbType;
  }

  /**
   * 检查是否为 Supabase
   * @returns {boolean} 是否为 Supabase
   */
  isSupabase() {
    return this.dbType === 'supabase';
  }

  /**
   * 检查是否为 SQLite
   * @returns {boolean} 是否为 SQLite
   */
  isSQLite() {
    return this.dbType === 'sqlite';
  }

  /**
   * 关闭数据库连接
   */
  close() {
    if (this.dbManager && typeof this.dbManager.close === 'function') {
      this.dbManager.close();
    }
  }

  /**
   * 数据库健康检查
   * @returns {Promise<boolean>} 健康状态
   */
  async healthCheck() {
    try {
      if (!this.dbManager) {
        return false;
      }

      if (this.isSupabase()) {
        // Supabase 健康检查
        return await this.dbManager.config.testConnection();
      } else {
        // SQLite 健康检查
        const result = await this.dbManager.get('SELECT 1 as test');
        return result && result.test === 1;
      }
    } catch (error) {
      console.error('数据库健康检查失败:', error);
      return false;
    }
  }

  /**
   * 获取数据库统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStats() {
    try {
      const stats = {
        type: this.dbType,
        healthy: await this.healthCheck(),
        tables: {},
        connectionInfo: null
      };

      if (this.isSupabase()) {
        stats.connectionInfo = this.dbManager.getConnectionInfo();
        
        // 获取表统计
        try {
          const companies = await this.dbManager.getCompanies();
          const resumes = await this.dbManager.getResumes({ limit: 1 });
          const tasks = await this.dbManager.getTasks({ limit: 1 });
          
          stats.tables = {
            companies: companies.length,
            resumes: resumes.length,
            tasks: tasks.length
          };
        } catch (error) {
          console.warn('获取表统计失败:', error.message);
        }
      } else {
        // SQLite 统计
        try {
          const companies = await this.dbManager.all('SELECT COUNT(*) as count FROM companies');
          const documents = await this.dbManager.all('SELECT COUNT(*) as count FROM documents');
          
          stats.tables = {
            companies: companies[0]?.count || 0,
            documents: documents[0]?.count || 0
          };
        } catch (error) {
          console.warn('获取表统计失败:', error.message);
        }
      }

      return stats;
    } catch (error) {
      console.error('获取数据库统计失败:', error);
      return {
        type: this.dbType,
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * 数据迁移（从 SQLite 到 Supabase）
   * @returns {Promise<boolean>} 迁移结果
   */
  async migrateToSupabase() {
    if (this.dbType !== 'sqlite') {
      throw new Error('只能从 SQLite 迁移到 Supabase');
    }

    console.log('🔄 开始数据迁移：SQLite -> Supabase');
    
    try {
      // 初始化 Supabase 管理器
      const SupabaseDatabaseManager = require('../../../supabase/database-manager');
      const supabaseManager = new SupabaseDatabaseManager();
      await supabaseManager.init();

      // 迁移公司数据
      console.log('📋 迁移公司数据...');
      const companies = await this.dbManager.all('SELECT * FROM companies');
      for (const company of companies) {
        await supabaseManager.createCompany({
          name: company.name,
          description: company.description
        });
      }
      console.log(`✅ 已迁移 ${companies.length} 个公司记录`);

      // 迁移文档数据
      console.log('📄 迁移文档数据...');
      const documents = await this.dbManager.all('SELECT * FROM documents');
      for (const doc of documents) {
        await supabaseManager.createDocument({
          company_id: doc.company_id,
          title: doc.title,
          file_path: doc.file_path,
          file_type: doc.file_type,
          file_size: doc.file_size,
          status: doc.status,
          metadata: doc.metadata ? JSON.parse(doc.metadata) : null
        });
      }
      console.log(`✅ 已迁移 ${documents.length} 个文档记录`);

      console.log('🎉 数据迁移完成！');
      console.log('💡 请更新环境变量 DATABASE_TYPE=supabase 以使用 Supabase');
      
      return true;
    } catch (error) {
      console.error('❌ 数据迁移失败:', error);
      return false;
    }
  }
}

// 创建全局实例
let globalAdapter = null;

/**
 * 获取全局数据库适配器实例
 * @returns {Promise<DatabaseAdapter>} 适配器实例
 */
async function getDatabaseAdapter() {
  if (!globalAdapter) {
    globalAdapter = new DatabaseAdapter();
    await globalAdapter.initialize();
  }
  return globalAdapter;
}

/**
 * 重置全局适配器（用于测试）
 */
function resetDatabaseAdapter() {
  if (globalAdapter) {
    globalAdapter.close();
    globalAdapter = null;
  }
}

module.exports = {
  DatabaseAdapter,
  getDatabaseAdapter,
  resetDatabaseAdapter
};