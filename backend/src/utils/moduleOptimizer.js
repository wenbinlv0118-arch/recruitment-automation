/**
 * 模块加载优化器
 * 优化模块加载顺序和方式
 */
class ModuleLoadOptimizer {
  constructor() {
    this.lazyModules = new Map();
    this.preloadedModules = new Set();
    this.loadingPromises = new Map();
  }

  /**
   * 延迟加载模块
   */
  lazyRequire(modulePath) {
    if (this.lazyModules.has(modulePath)) {
      return this.lazyModules.get(modulePath);
    }
    
    // 创建延迟加载的代理
    const lazyModule = new Proxy({}, {
      get: (target, prop) => {
        if (!target._loaded) {
          const startTime = Date.now();
          target._module = require(modulePath);
          target._loaded = true;
          const loadTime = Date.now() - startTime;
          
          if (loadTime > 5) {
            console.log(`📦 延迟加载模块 ${modulePath}: ${loadTime}ms`);
          }
        }
        
        return target._module[prop];
      }
    });
    
    this.lazyModules.set(modulePath, lazyModule);
    return lazyModule;
  }

  /**
   * 异步预加载模块
   */
  async preloadModule(modulePath) {
    if (this.preloadedModules.has(modulePath)) {
      return;
    }
    
    if (this.loadingPromises.has(modulePath)) {
      return this.loadingPromises.get(modulePath);
    }
    
    const loadPromise = new Promise((resolve) => {
      setImmediate(() => {
        try {
          const startTime = Date.now();
          require(modulePath);
          const loadTime = Date.now() - startTime;
          
          this.preloadedModules.add(modulePath);
          console.log(`📦 预加载模块 ${modulePath}: ${loadTime}ms`);
          resolve();
        } catch (error) {
          console.warn(`⚠️ 预加载模块失败 ${modulePath}:`, error.message);
          resolve();
        }
      });
    });
    
    this.loadingPromises.set(modulePath, loadPromise);
    return loadPromise;
  }

  /**
   * 批量预加载模块
   */
  async preloadModules(modulePaths) {
    console.log(`📦 开始预加载 ${modulePaths.length} 个模块...`);
    
    const promises = modulePaths.map(path => this.preloadModule(path));
    await Promise.all(promises);
    
    console.log('✅ 模块预加载完成');
  }

  /**
   * 获取加载统计
   */
  getLoadStats() {
    return {
      lazyModulesCount: this.lazyModules.size,
      preloadedModulesCount: this.preloadedModules.size,
      loadingPromisesCount: this.loadingPromises.size,
      preloadedModules: Array.from(this.preloadedModules)
    };
  }
}

module.exports = new ModuleLoadOptimizer();