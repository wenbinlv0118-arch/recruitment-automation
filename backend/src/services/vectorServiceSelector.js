const VectorService = require('./vectorService');
const LightweightVectorService = require('./lightweightVectorService');

/**
 * 简单的LRU缓存实现
 */
class LRUCache {
  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  get(key) {
    if (this.cache.has(key)) {
      const value = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, value);
      return value;
    }
    return null;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

/**
 * 向量化服务选择器
 * 根据配置和环境自动选择最适合的向量化方案
 */
class VectorServiceSelector {
  constructor() {
    this.services = new Map();
    this.currentService = null;
    this.servicePriority = this.determineServicePriority();
    
    // 性能优化：添加向量缓存
    this.embeddingCache = new LRUCache(2000);
    this.searchCache = new LRUCache(1000);
    
    // 性能监控
    this.performanceMetrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      lastRequestTime: null
    };
    
    this.initializeServices();
    console.log(`🔧 向量化服务选择器初始化完成，优先级: ${this.servicePriority.join(' > ')}`);
  }

  /**
   * 确定服务优先级
   */
  determineServicePriority() {
    const priority = [];
    
    // 检查本地模型是否可用
    try {
      require('@xenova/transformers');
      if (process.env.USE_LOCAL_MODEL === 'true') {
        priority.push('local');
      }
    } catch (error) {
      console.log('⚠️  本地模型不可用');
    }
    
    // 检查 Hugging Face API
    if (process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_API_KEY !== 'your_huggingface_api_key_here') {
      priority.push('huggingface');
    }
    
    // 轻量级服务总是可用
    priority.push('lightweight');
    
    // 模拟模式作为最后的备选
    priority.push('mock');
    
    return priority;
  }

  /**
   * 初始化所有可用的服务
   */
  async initializeServices() {
    // 初始化轻量级服务
    try {
      this.services.set('lightweight', new LightweightVectorService());
      console.log('✅ 轻量级向量化服务初始化成功');
    } catch (error) {
      console.error('❌ 轻量级向量化服务初始化失败:', error.message);
    }

    // 初始化完整向量化服务
    try {
      this.services.set('full', new VectorService());
      console.log('✅ 完整向量化服务初始化成功');
    } catch (error) {
      console.error('❌ 完整向量化服务初始化失败:', error.message);
    }

    // 选择最佳服务
    await this.selectBestService();
  }

  /**
   * 选择最佳服务
   */
  async selectBestService() {
    for (const serviceType of this.servicePriority) {
      try {
        if (serviceType === 'local' || serviceType === 'huggingface') {
          // 使用完整服务
          if (this.services.has('full')) {
            const fullService = this.services.get('full');
            if (fullService.vectorizationMode === serviceType) {
              this.currentService = fullService;
              console.log(`✅ 选择服务: ${serviceType}`);
              return;
            }
          }
        } else if (serviceType === 'lightweight') {
          // 使用轻量级服务
          if (this.services.has('lightweight')) {
            this.currentService = this.services.get('lightweight');
            console.log(`✅ 选择服务: ${serviceType}`);
            return;
          }
        } else if (serviceType === 'mock') {
          // 使用完整服务的模拟模式
          if (this.services.has('full')) {
            const fullService = this.services.get('full');
            if (fullService.vectorizationMode === 'mock') {
              this.currentService = fullService;
              console.log(`✅ 选择服务: ${serviceType}`);
              return;
            }
          }
        }
      } catch (error) {
        console.log(`⚠️  服务 ${serviceType} 不可用:`, error.message);
      }
    }
    
    // 如果所有服务都不可用，使用轻量级服务作为默认
    if (this.services.has('lightweight')) {
      this.currentService = this.services.get('lightweight');
      console.log('✅ 使用默认服务: lightweight');
    } else {
      throw new Error('没有可用的向量化服务');
    }
  }

  /**
   * 获取当前服务
   */
  getCurrentService() {
    if (!this.currentService) {
      throw new Error('向量化服务未初始化');
    }
    return this.currentService;
  }

  /**
   * 获取文本嵌入向量（带缓存和性能监控）
   */
  async getEmbeddings(texts) {
    const startTime = Date.now();
    this.performanceMetrics.totalRequests++;
    this.performanceMetrics.lastRequestTime = new Date();
    
    try {
      // 检查缓存
      const cacheKey = Array.isArray(texts) ? texts.join('|||') : texts;
      const cachedResult = this.embeddingCache.get(cacheKey);
      
      if (cachedResult) {
        this.performanceMetrics.cacheHits++;
        console.log('🚀 向量缓存命中');
        return cachedResult;
      }
      
      this.performanceMetrics.cacheMisses++;
      
      // 调用实际服务
      const result = await this.getCurrentService().getEmbeddings(texts);
      
      // 缓存结果
      this.embeddingCache.set(cacheKey, result);
      
      // 更新性能指标
      const responseTime = Date.now() - startTime;
      this.performanceMetrics.averageResponseTime = 
        (this.performanceMetrics.averageResponseTime * (this.performanceMetrics.totalRequests - 1) + responseTime) / 
        this.performanceMetrics.totalRequests;
      
      return result;
    } catch (error) {
      console.error('❌ 获取嵌入向量失败:', error);
      throw error;
    }
  }

  /**
   * 存储文档块向量
   */
  async storeDocumentVectors(chunks, documentId, metadata = {}) {
    return await this.getCurrentService().storeDocumentVectors(chunks, documentId, metadata);
  }

  /**
   * 检索相似文档（带缓存和性能监控）
   */
  async retrieveSimilar(query, limit = 5, threshold = 0.3) {
    const startTime = Date.now();
    this.performanceMetrics.totalRequests++;
    this.performanceMetrics.lastRequestTime = new Date();
    
    try {
      // 检查搜索缓存
      const cacheKey = `search:${query}:${limit}:${threshold}`;
      const cachedResult = this.searchCache.get(cacheKey);
      
      if (cachedResult) {
        this.performanceMetrics.cacheHits++;
        console.log('🚀 搜索缓存命中');
        return cachedResult;
      }
      
      this.performanceMetrics.cacheMisses++;
      
      // 调用实际服务
      const result = await this.getCurrentService().retrieveSimilar(query, limit, threshold);
      
      // 缓存结果
      this.searchCache.set(cacheKey, result);
      
      // 更新性能指标
      const responseTime = Date.now() - startTime;
      this.performanceMetrics.averageResponseTime = 
        (this.performanceMetrics.averageResponseTime * (this.performanceMetrics.totalRequests - 1) + responseTime) / 
        this.performanceMetrics.totalRequests;
      
      return result;
    } catch (error) {
      console.error('❌ 相似度检索失败:', error);
      throw error;
    }
  }

  /**
   * 关键词搜索
   */
  async keywordSearch(query, limit = 5) {
    return await this.getCurrentService().keywordSearch(query, limit);
  }

  /**
   * 混合搜索
   */
  async hybridSearch(query, limit = 5) {
    return await this.getCurrentService().hybridSearch(query, limit);
  }

  /**
   * 删除文档向量
   */
  async deleteDocumentVectors(documentId) {
    return await this.getCurrentService().deleteDocumentVectors(documentId);
  }

  /**
   * 获取统计信息（包含缓存和性能指标）
   */
  getStats() {
    const stats = this.getCurrentService().getStats();
    return {
      ...stats,
      availableServices: Array.from(this.services.keys()),
      currentService: this.getCurrentServiceType(),
      servicePriority: this.servicePriority,
      // 缓存统计
      cache: {
        embeddingCacheSize: this.embeddingCache.size(),
        searchCacheSize: this.searchCache.size(),
        embeddingCacheHits: this.performanceMetrics.cacheHits,
        searchCacheHits: this.performanceMetrics.cacheHits,
        totalCacheHits: this.performanceMetrics.cacheHits,
        totalCacheMisses: this.performanceMetrics.cacheMisses,
        cacheHitRate: this.performanceMetrics.totalRequests > 0 ? 
          (this.performanceMetrics.cacheHits / this.performanceMetrics.totalRequests * 100).toFixed(2) + '%' : '0%'
      },
      // 性能指标
      performance: {
        totalRequests: this.performanceMetrics.totalRequests,
        averageResponseTime: Math.round(this.performanceMetrics.averageResponseTime) + 'ms',
        lastRequestTime: this.performanceMetrics.lastRequestTime,
        uptime: process.uptime() + 's'
      }
    };
  }

  /**
   * 获取当前服务类型
   */
  getCurrentServiceType() {
    if (!this.currentService) return 'none';
    
    if (this.currentService instanceof LightweightVectorService) {
      return 'lightweight';
    } else {
      return this.currentService.vectorizationMode || 'unknown';
    }
  }

  /**
   * 切换服务
   */
  async switchService(serviceType) {
    if (this.services.has(serviceType)) {
      this.currentService = this.services.get(serviceType);
      console.log(`🔄 切换到服务: ${serviceType}`);
      return true;
    } else {
      console.error(`❌ 服务 ${serviceType} 不可用`);
      return false;
    }
  }

  /**
   * 清空所有数据
   */
  clear() {
    for (const service of this.services.values()) {
      if (service.clear) {
        service.clear();
      }
    }
    
    // 清空缓存
    this.embeddingCache.clear();
    this.searchCache.clear();
    
    // 重置性能指标
    this.performanceMetrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageResponseTime: 0,
      lastRequestTime: null
    };
    
    console.log('🧹 已清空所有数据和缓存');
  }

  /**
   * 获取服务状态
   */
  getServiceStatus() {
    const status = {
      currentService: this.getCurrentServiceType(),
      availableServices: [],
      servicePriority: this.servicePriority,
      // 缓存状态
      cache: {
        embeddingCacheSize: this.embeddingCache.size(),
        searchCacheSize: this.searchCache.size(),
        cacheHitRate: this.performanceMetrics.totalRequests > 0 ? 
          (this.performanceMetrics.cacheHits / this.performanceMetrics.totalRequests * 100).toFixed(2) + '%' : '0%'
      }
    };

    for (const [name, service] of this.services) {
      status.availableServices.push({
        name,
        type: service instanceof LightweightVectorService ? 'lightweight' : 'full',
        mode: service.vectorizationMode || 'lightweight',
        stats: service.getStats ? service.getStats() : null
      });
    }

    return status;
  }

  /**
   * 缓存管理
   */
  manageCache(action, cacheType = 'all') {
    switch (action) {
      case 'clear':
        if (cacheType === 'embedding' || cacheType === 'all') {
          this.embeddingCache.clear();
          console.log('🧹 已清空向量缓存');
        }
        if (cacheType === 'search' || cacheType === 'all') {
          this.searchCache.clear();
          console.log('🧹 已清空搜索缓存');
        }
        break;
      
      case 'stats':
        return {
          embeddingCache: {
            size: this.embeddingCache.size(),
            maxSize: this.embeddingCache.maxSize
          },
          searchCache: {
            size: this.searchCache.size(),
            maxSize: this.searchCache.maxSize
          },
          performance: this.performanceMetrics
        };
      
      case 'resize':
        // 可以在这里添加动态调整缓存大小的逻辑
        console.log('📏 缓存大小调整功能待实现');
        break;
      
      default:
        console.log('❓ 未知的缓存管理操作');
    }
  }
}

module.exports = VectorServiceSelector; 