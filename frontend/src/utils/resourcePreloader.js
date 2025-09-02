/**
 * 资源预加载器
 * 优化关键资源的加载时机
 */
class ResourcePreloader {
  constructor() {
    this.cache = new Map();
    this.preloadQueue = [];
    this.isPreloading = false;
  }
  
  /**
   * 预加载CSS文件
   */
  preloadCSS(href) {
    if (this.cache.has(href)) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'style';
      link.href = href;
      link.onload = () => {
        this.cache.set(href, true);
        resolve();
      };
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }
  
  /**
   * 预加载JavaScript文件
   */
  preloadJS(src) {
    if (this.cache.has(src)) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'script';
      link.href = src;
      link.onload = () => {
        this.cache.set(src, true);
        resolve();
      };
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }
  
  /**
   * 预加载图片
   */
  preloadImage(src) {
    if (this.cache.has(src)) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(src, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = src;
    });
  }
  
  /**
   * 批量预加载资源
   */
  async preloadResources(resources) {
    const promises = resources.map(resource => {
      switch (resource.type) {
        case 'css':
          return this.preloadCSS(resource.url);
        case 'js':
          return this.preloadJS(resource.url);
        case 'image':
          return this.preloadImage(resource.url);
        default:
          return Promise.resolve();
      }
    });
    
    try {
      await Promise.all(promises);
      console.log('资源预加载完成');
    } catch (error) {
      console.error('资源预加载失败:', error);
    }
  }
  
  /**
   * 获取缓存的资源
   */
  getCachedResource(key) {
    return this.cache.get(key);
  }
  
  /**
   * 清理缓存
   */
  clearCache() {
    this.cache.clear();
  }
}

// 创建全局实例
const resourcePreloader = new ResourcePreloader();

// 预加载关键资源
const criticalResources = [
  { type: 'css', url: '/static/css/main.css' },
  { type: 'js', url: '/static/js/vendor.js' }
];

// 在页面加载完成后预加载
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(() => {
      resourcePreloader.preloadResources(criticalResources);
    }, 1000);
  });
}

export default resourcePreloader;
