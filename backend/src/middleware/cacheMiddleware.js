const NodeCache = require('node-cache');

/**
 * 响应缓存中间件
 * 为API响应提供缓存机制
 */
class CacheMiddleware {
  constructor() {
    // 创建不同TTL的缓存实例
    this.shortCache = new NodeCache({ stdTTL: 60 }); // 1分钟
    this.mediumCache = new NodeCache({ stdTTL: 300 }); // 5分钟
    this.longCache = new NodeCache({ stdTTL: 1800 }); // 30分钟
  }

  /**
   * 短期缓存中间件（1分钟）
   */
  shortTerm = (req, res, next) => {
    return this.createCacheMiddleware(this.shortCache)(req, res, next);
  }

  /**
   * 中期缓存中间件（5分钟）
   */
  mediumTerm = (req, res, next) => {
    return this.createCacheMiddleware(this.mediumCache)(req, res, next);
  }

  /**
   * 长期缓存中间件（30分钟）
   */
  longTerm = (req, res, next) => {
    return this.createCacheMiddleware(this.longCache)(req, res, next);
  }

  /**
   * 创建缓存中间件
   */
  createCacheMiddleware(cache) {
    return (req, res, next) => {
      // 只缓存GET请求
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = `${req.originalUrl}_${JSON.stringify(req.query)}`;
      const cachedResponse = cache.get(cacheKey);

      if (cachedResponse) {
        console.log(`📦 缓存命中: ${req.originalUrl}`);
        res.set('X-Cache', 'HIT');
        return res.json(cachedResponse);
      }

      // 重写res.json方法以缓存响应
      const originalJson = res.json;
      res.json = function(data) {
        // 只缓存成功的响应
        if (res.statusCode === 200 && data && data.success !== false) {
          cache.set(cacheKey, data);
          console.log(`💾 缓存存储: ${req.originalUrl}`);
        }
        res.set('X-Cache', 'MISS');
        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * 清除特定模式的缓存
   */
  clearPattern(pattern) {
    [this.shortCache, this.mediumCache, this.longCache].forEach(cache => {
      const keys = cache.keys();
      keys.forEach(key => {
        if (key.includes(pattern)) {
          cache.del(key);
        }
      });
    });
  }

  /**
   * 清除所有缓存
   */
  clearAll() {
    this.shortCache.flushAll();
    this.mediumCache.flushAll();
    this.longCache.flushAll();
    console.log('🗑️ 所有缓存已清除');
  }
}

module.exports = new CacheMiddleware();