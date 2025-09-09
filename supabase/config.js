/**
 * Supabase 配置文件
 * 用于管理 Supabase 项目的连接和配置
 */

const { createClient } = require('@supabase/supabase-js');

/**
 * Supabase 客户端配置
 */
class SupabaseConfig {
  constructor() {
    this.supabaseUrl = process.env.SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_ANON_KEY;
    this.supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error('Supabase URL 和 API Key 是必需的');
    }
    
    // 创建客户端实例
    this.client = createClient(this.supabaseUrl, this.supabaseKey);
    
    // 创建服务端客户端（用于管理操作）
    if (this.supabaseServiceKey) {
      this.serviceClient = createClient(this.supabaseUrl, this.supabaseServiceKey);
    }
  }
  
  /**
   * 获取标准客户端
   * @returns {Object} Supabase 客户端
   */
  getClient() {
    return this.client;
  }
  
  /**
   * 获取服务端客户端
   * @returns {Object} Supabase 服务端客户端
   */
  getServiceClient() {
    if (!this.serviceClient) {
      throw new Error('Service Role Key 未配置');
    }
    return this.serviceClient;
  }
  
  /**
   * 测试数据库连接
   * @returns {Promise<boolean>} 连接状态
   */
  async testConnection() {
    try {
      const { data, error } = await this.client
        .from('companies')
        .select('count')
        .limit(1);
      
      if (error && error.code !== 'PGRST116') { // PGRST116 表示表不存在，这是正常的
        console.error('数据库连接测试失败:', error);
        return false;
      }
      
      console.log('✅ Supabase 数据库连接成功');
      return true;
    } catch (error) {
      console.error('数据库连接测试失败:', error);
      return false;
    }
  }
  
  /**
   * 获取数据库连接信息
   * @returns {Object} 连接信息
   */
  getConnectionInfo() {
    return {
      url: this.supabaseUrl,
      hasServiceKey: !!this.supabaseServiceKey,
      region: this.supabaseUrl?.includes('supabase.co') ? 'cloud' : 'self-hosted'
    };
  }
}

module.exports = SupabaseConfig;