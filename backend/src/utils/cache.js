const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const Logger = require('./logger');

/**
 * 缓存配置选项
 * @typedef {Object} CacheOptions
 * @property {number} [maxMemorySize=1000] - 最大内存缓存条目数
 * @property {number} [maxFileSize=104857600] - 最大文件缓存大小 (100MB)
 * @property {string} [cacheDir] - 缓存目录路径
 * @property {number} [defaultTTL=3600000] - 默认缓存时间 (1小时)
 */

/**
 * 缓存条目类型
 * @typedef {Object} CacheEntry
 * @property {*} value - 缓存的值
 * @property {number} expireTime - 过期时间戳
 * @property {number} timestamp - 创建时间戳
 * @property {string} [key] - 原始键名 (仅文件缓存)
 */

/**
 * 缓存统计信息
 * @typedef {Object} CacheStats
 * @property {number} memorySize - 当前内存缓存大小
 * @property {number} maxMemorySize - 最大内存缓存大小
 * @property {string} cacheDir - 缓存目录路径
 */

/**
 * 缓存类
 * 提供内存缓存和文件缓存功能，支持自动过期和清理
 * 
 * @example
 * ```javascript
 * const cache = new Cache({
 *   maxMemorySize: 500,
 *   defaultTTL: 1800000 // 30分钟
 * });
 * 
 * // 设置缓存
 * await cache.set('user:123', { name: 'John', age: 30 });
 * 
 * // 获取缓存
 * const user = await cache.get('user:123');
 * 
 * // 删除缓存
 * await cache.delete('user:123');
 * ```
 */
class Cache {
  /**
   * 创建缓存实例
   * @param {CacheOptions} options - 缓存配置选项
   */
  constructor(options = {}) {
    this.memoryCache = new Map();
    this.maxMemorySize = options.maxMemorySize || 1000; // 最大内存缓存条目数
    this.maxFileSize = options.maxFileSize || 100 * 1024 * 1024; // 最大文件缓存大小 (100MB)
    this.cacheDir = options.cacheDir || path.join(__dirname, '../../storage/cache');
    this.defaultTTL = options.defaultTTL || 3600000; // 默认缓存时间 1小时
    
    // 确保缓存目录存在
    this.ensureCacheDir();
    
    // 定期清理过期缓存
    this.startCleanupInterval();
  }

  /**
   * 确保缓存目录存在
   * @private
   * @returns {Promise<void>}
   */
  async ensureCacheDir() {
    try {
      await fs.ensureDir(this.cacheDir);
      Logger.log('缓存目录已创建:', this.cacheDir);
    } catch (error) {
      Logger.error('创建缓存目录失败:', error);
    }
  }

  /**
   * 生成缓存键
   * @param {string} key - 原始键名
   * @returns {string} MD5哈希后的键名
   * @private
   */
  generateKey(key) {
    return crypto.createHash('md5').update(String(key)).digest('hex');
  }

  /**
   * 设置内存缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {number} ttl - 生存时间 (毫秒)
   * @returns {boolean} 是否设置成功
   */
  setMemory(key, value, ttl = this.defaultTTL) {
    try {
      const cacheKey = this.generateKey(key);
      const expireTime = Date.now() + ttl;
      
      this.memoryCache.set(cacheKey, {
        value,
        expireTime,
        timestamp: Date.now()
      });

      // 检查内存缓存大小
      if (this.memoryCache.size > this.maxMemorySize) {
        this.cleanupMemoryCache();
      }

      Logger.log('内存缓存设置成功:', key);
      return true;
    } catch (error) {
      Logger.error('设置内存缓存失败:', error);
      return false;
    }
  }

  /**
   * 获取内存缓存
   * @param {string} key - 缓存键
   * @returns {*} 缓存值，如果不存在或已过期则返回null
   */
  getMemory(key) {
    try {
      const cacheKey = this.generateKey(key);
      const cached = this.memoryCache.get(cacheKey);
      
      if (!cached) {
        return null;
      }

      // 检查是否过期
      if (Date.now() > cached.expireTime) {
        this.memoryCache.delete(cacheKey);
        return null;
      }

      Logger.log('内存缓存命中:', key);
      return cached.value;
    } catch (error) {
      Logger.error('获取内存缓存失败:', error);
      return null;
    }
  }

  /**
   * 设置文件缓存
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {number} ttl - 生存时间 (毫秒)
   * @returns {Promise<boolean>} 是否设置成功
   */
  async setFile(key, value, ttl = this.defaultTTL) {
    try {
      const cacheKey = this.generateKey(key);
      const filePath = path.join(this.cacheDir, `${cacheKey}.json`);
      
      const cacheData = {
        value,
        expireTime: Date.now() + ttl,
        timestamp: Date.now(),
        key: key
      };

      await fs.writeJson(filePath, cacheData, { spaces: 2 });
      
      Logger.log('文件缓存设置成功:', key);
      return true;
    } catch (error) {
      Logger.error('设置文件缓存失败:', error);
      return false;
    }
  }

  /**
   * 获取文件缓存
   * @param {string} key - 缓存键
   * @returns {Promise<*>} 缓存值，如果不存在或已过期则返回null
   */
  async getFile(key) {
    try {
      const cacheKey = this.generateKey(key);
      const filePath = path.join(this.cacheDir, `${cacheKey}.json`);
      
      if (!await fs.pathExists(filePath)) {
        return null;
      }

      const cacheData = await fs.readJson(filePath);
      
      // 检查是否过期
      if (Date.now() > cacheData.expireTime) {
        await fs.remove(filePath);
        return null;
      }

      Logger.log('文件缓存命中:', key);
      return cacheData.value;
    } catch (error) {
      Logger.error('获取文件缓存失败:', error);
      return null;
    }
  }

  /**
   * 设置缓存（优先内存，失败则使用文件）
   * @param {string} key - 缓存键
   * @param {*} value - 缓存值
   * @param {number} ttl - 生存时间 (毫秒)
   * @returns {Promise<boolean>} 是否设置成功
   */
  async set(key, value, ttl = this.defaultTTL) {
    // 先尝试内存缓存
    const memorySuccess = this.setMemory(key, value, ttl);
    
    if (!memorySuccess) {
      // 内存缓存失败，使用文件缓存
      return await this.setFile(key, value, ttl);
    }
    
    return true;
  }

  /**
   * 获取缓存（优先内存，失败则使用文件）
   * @param {string} key - 缓存键
   * @returns {Promise<*>} 缓存值，如果不存在或已过期则返回null
   */
  async get(key) {
    // 先尝试内存缓存
    let value = this.getMemory(key);
    
    if (value === null) {
      // 内存缓存未命中，尝试文件缓存
      value = await this.getFile(key);
      
      // 如果文件缓存命中，也设置到内存缓存
      if (value !== null) {
        this.setMemory(key, value, this.defaultTTL);
      }
    }
    
    return value;
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   * @returns {Promise<boolean>} 是否删除成功
   */
  async delete(key) {
    try {
      const cacheKey = this.generateKey(key);
      
      // 删除内存缓存
      this.memoryCache.delete(cacheKey);
      
      // 删除文件缓存
      const filePath = path.join(this.cacheDir, `${cacheKey}.json`);
      if (await fs.pathExists(filePath)) {
        await fs.remove(filePath);
      }
      
      Logger.log('缓存删除成功:', key);
      return true;
    } catch (error) {
      Logger.error('删除缓存失败:', error);
      return false;
    }
  }

  /**
   * 清空所有缓存
   * @returns {Promise<boolean>} 是否清空成功
   */
  async clear() {
    try {
      // 清空内存缓存
      this.memoryCache.clear();
      
      // 清空文件缓存
      await fs.emptyDir(this.cacheDir);
      
      Logger.log('所有缓存已清空');
      return true;
    } catch (error) {
      Logger.error('清空缓存失败:', error);
      return false;
    }
  }

  /**
   * 清理内存缓存
   * 删除过期条目和超出大小限制的条目
   * @private
   */
  cleanupMemoryCache() {
    try {
      const now = Date.now();
      const expiredKeys = [];
      
      // 找出过期的键
      for (const [key, value] of this.memoryCache.entries()) {
        if (now > value.expireTime) {
          expiredKeys.push(key);
        }
      }
      
      // 删除过期的缓存
      expiredKeys.forEach(key => {
        this.memoryCache.delete(key);
      });
      
      // 如果仍然超过最大大小，删除最旧的条目
      if (this.memoryCache.size > this.maxMemorySize) {
        const entries = Array.from(this.memoryCache.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        const toDelete = entries.slice(0, this.memoryCache.size - this.maxMemorySize);
        toDelete.forEach(([key]) => {
          this.memoryCache.delete(key);
        });
      }
      
      Logger.log(`内存缓存清理完成，删除了 ${expiredKeys.length} 个过期条目`);
    } catch (error) {
      Logger.error('清理内存缓存失败:', error);
    }
  }

  /**
   * 清理文件缓存
   * 删除过期的文件缓存
   * @private
   * @returns {Promise<void>}
   */
  async cleanupFileCache() {
    try {
      const files = await fs.readdir(this.cacheDir);
      const now = Date.now();
      let deletedCount = 0;
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const filePath = path.join(this.cacheDir, file);
        try {
          const cacheData = await fs.readJson(filePath);
          
          if (now > cacheData.expireTime) {
            await fs.remove(filePath);
            deletedCount++;
          }
        } catch (error) {
          // 文件损坏，删除
          await fs.remove(filePath);
          deletedCount++;
        }
      }
      
      Logger.log(`文件缓存清理完成，删除了 ${deletedCount} 个过期文件`);
    } catch (error) {
      Logger.error('清理文件缓存失败:', error);
    }
  }

  /**
   * 启动定期清理
   * 每5分钟清理一次过期缓存
   * @private
   */
  startCleanupInterval() {
    // 每5分钟清理一次
    setInterval(() => {
      this.cleanupMemoryCache();
      this.cleanupFileCache();
    }, 5 * 60 * 1000);
  }

  /**
   * 获取缓存统计信息
   * @returns {CacheStats} 缓存统计信息
   */
  getStats() {
    return {
      memorySize: this.memoryCache.size,
      maxMemorySize: this.maxMemorySize,
      cacheDir: this.cacheDir
    };
  }
}

// 创建全局缓存实例
const globalCache = new Cache();

module.exports = {
  Cache,
  globalCache
}; 