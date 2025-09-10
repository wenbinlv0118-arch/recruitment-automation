/**
 * Supabase 数据库管理器
 * 替换原有的 SQLite 数据库管理器
 */

const SupabaseConfig = require('./config');

class SupabaseDatabaseManager {
  constructor() {
    this.config = new SupabaseConfig();
    this.client = this.config.getClient();
    this.serviceClient = this.config.getServiceClient();
  }

  /**
   * 初始化数据库连接
   * @returns {Promise<boolean>} 初始化结果
   */
  async init() {
    try {
      console.log('🔗 正在连接 Supabase 数据库...');
      const isConnected = await this.config.testConnection();
      
      if (isConnected) {
        console.log('✅ Supabase 数据库连接成功');
        return true;
      } else {
        console.error('❌ Supabase 数据库连接失败');
        return false;
      }
    } catch (error) {
      console.error('数据库初始化失败:', error);
      return false;
    }
  }

  /**
   * 执行数据库迁移
   * @returns {Promise<boolean>} 迁移结果
   */
  async runMigrations() {
    try {
      console.log('🔄 开始执行数据库迁移...');
      
      // 检查是否已经存在表
      const { data: tables, error } = await this.client
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
      
      if (error) {
        console.log('表检查失败，可能是首次运行，继续执行迁移...');
      }
      
      console.log('✅ 数据库迁移完成（请在 Supabase Dashboard 中手动执行 SQL 迁移脚本）');
      console.log('📄 迁移脚本位置: supabase/migrations/001_initial_schema.sql');
      
      return true;
    } catch (error) {
      console.error('数据库迁移失败:', error);
      return false;
    }
  }

  // ==================== 公司管理 ====================
  
  /**
   * 获取所有公司
   * @returns {Promise<Array>} 公司列表
   */
  async getCompanies() {
    try {
      const { data, error } = await this.client
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('获取公司列表失败:', error);
      return [];
    }
  }

  /**
   * 创建公司
   * @param {Object} companyData - 公司数据
   * @returns {Promise<Object>} 创建的公司
   */
  async createCompany(companyData) {
    try {
      const { data, error } = await this.client
        .from('companies')
        .insert([companyData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('创建公司失败:', error);
      throw error;
    }
  }

  // ==================== 知识库管理 ====================
  
  /**
   * 获取文档列表
   * @param {number} companyId - 公司ID
   * @returns {Promise<Array>} 文档列表
   */
  async getDocuments(companyId) {
    try {
      const { data, error } = await this.client
        .from('documents')
        .select('*')
        .eq('company_id', companyId)
        .order('upload_time', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('获取文档列表失败:', error);
      return [];
    }
  }

  /**
   * 创建文档记录
   * @param {Object} documentData - 文档数据
   * @returns {Promise<Object>} 创建的文档
   */
  async createDocument(documentData) {
    try {
      const { data, error } = await this.client
        .from('documents')
        .insert([documentData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('创建文档记录失败:', error);
      throw error;
    }
  }

  /**
   * 删除文档
   * @param {number} documentId - 文档ID
   * @returns {Promise<boolean>} 删除结果
   */
  async deleteDocument(documentId) {
    try {
      const { error } = await this.client
        .from('documents')
        .delete()
        .eq('id', documentId);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('删除文档失败:', error);
      return false;
    }
  }

  // ==================== 简历管理 ====================
  
  /**
   * 获取简历列表
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>} 简历列表
   */
  async getResumes(filters = {}) {
    try {
      let query = this.client
        .from('resumes')
        .select(`
          *,
          resume_basic_info(*),
          resume_job_intention(*)
        `);
      
      // 应用过滤条件
      if (filters.source) {
        query = query.eq('source', filters.source);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.minQualityScore) {
        query = query.gte('quality_score', filters.minQualityScore);
      }
      
      query = query.order('created_at', { ascending: false });
      
      // 分页
      if (filters.limit) {
        query = query.limit(filters.limit);
      }
      if (filters.offset) {
        query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('获取简历列表失败:', error);
      return [];
    }
  }

  /**
   * 创建简历记录
   * @param {Object} resumeData - 简历数据
   * @returns {Promise<Object>} 创建的简历
   */
  async createResume(resumeData) {
    try {
      const { data, error } = await this.client
        .from('resumes')
        .insert([resumeData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('创建简历记录失败:', error);
      throw error;
    }
  }

  // ==================== 任务管理 ====================
  
  /**
   * 获取任务列表
   * @param {Object} filters - 过滤条件
   * @returns {Promise<Array>} 任务列表
   */
  async getTasks(filters = {}) {
    try {
      let query = this.client.from('tasks').select('*');
      
      // 应用过滤条件
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }
      if (filters.platform) {
        query = query.eq('platform', filters.platform);
      }
      
      query = query.order('created_at', { ascending: false });
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('获取任务列表失败:', error);
      return [];
    }
  }

  /**
   * 创建任务
   * @param {Object} taskData - 任务数据
   * @returns {Promise<Object>} 创建的任务
   */
  async createTask(taskData) {
    try {
      const { data, error } = await this.client
        .from('tasks')
        .insert([taskData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('创建任务失败:', error);
      throw error;
    }
  }

  /**
   * 更新任务
   * @param {string} taskId - 任务ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object>} 更新的任务
   */
  async updateTask(taskId, updateData) {
    try {
      const { data, error } = await this.client
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('更新任务失败:', error);
      throw error;
    }
  }

  // ==================== 通用方法 ====================
  
  /**
   * 执行原始SQL查询
   * @param {string} sql - SQL查询
   * @param {Array} params - 参数
   * @returns {Promise<Array>} 查询结果
   */
  async query(sql, params = []) {
    try {
      // 注意：Supabase 不直接支持原始SQL，需要使用RPC或特定的查询方法
      console.warn('原始SQL查询在Supabase中需要通过RPC函数实现');
      return [];
    } catch (error) {
      console.error('SQL查询失败:', error);
      return [];
    }
  }

  /**
   * 关闭数据库连接
   */
  close() {
    // Supabase 客户端不需要显式关闭连接
    console.log('Supabase 连接已关闭');
  }

  /**
   * 获取连接信息
   * @returns {Object} 连接信息
   */
  getConnectionInfo() {
    return this.config.getConnectionInfo();
  }
}

module.exports = SupabaseDatabaseManager;