/**
 * 浏览器显示配置文件
 * 用于统一 Chromium 和 Chrome 的显示效果，解决页面渲染差异问题
 */

module.exports = {
  /**
   * 智联招聘浏览器显示配置
   * 针对智联招聘页面优化，确保在不同浏览器中显示一致
   */
  zhilian: {
    // 启动参数 - 显示和缩放相关
    launchArgs: [
      // 基础显示参数
      '--force-device-scale-factor=1', // 强制设备缩放比例为1
      '--high-dpi-support=1', // 启用高DPI支持
      '--force-color-profile=srgb', // 强制使用sRGB颜色配置
      
      // 生产环境虚拟显示支持
      '--virtual-time-budget=5000', // 虚拟时间预算
      '--run-all-compositor-stages-before-draw', // 在绘制前运行所有合成器阶段
      '--disable-background-networking', // 禁用后台网络
      '--disable-default-apps', // 禁用默认应用
      '--disable-extensions', // 禁用扩展
      '--disable-plugins', // 禁用插件
      '--disable-sync', // 禁用同步
      '--disable-translate', // 禁用翻译
      '--no-first-run', // 跳过首次运行
      '--no-default-browser-check', // 不检查默认浏览器
      '--disable-infobars', // 禁用信息栏
      
      // 窗口和渲染优化
      '--disable-features=CalculateNativeWinOcclusion,TranslateUI,VizDisplayCompositor', // 禁用窗口遮挡计算、翻译UI和显示合成器
      '--disable-backgrounding-occluded-windows', // 禁用被遮挡窗口的后台处理
      '--disable-renderer-backgrounding', // 禁用渲染器后台处理
      '--disable-component-extensions-with-background-pages', // 禁用带后台页面的组件扩展
      '--disable-background-downloads', // 禁用后台下载
      
      // 窗口大小设置
      '--window-size=1920,1080', // 设置窗口大小
      '--start-maximized', // 启动时最大化窗口
      '--disable-web-security', // 禁用网页安全限制
      '--enable-viewport-meta', // 启用视口元标签支持
      '--force-viewport-meta-tag', // 强制使用视口元标签
      
      // 字体渲染优化
      '--disable-font-subpixel-positioning', // 禁用字体子像素定位
      '--enable-font-antialiasing', // 启用字体抗锯齿
      
      // CSS 渲染优化
      '--disable-partial-raster', // 禁用部分光栅化
      '--disable-skia-runtime-opts', // 禁用Skia运行时优化
      
      // 内存和性能优化
      '--aggressive-cache-discard', // 激进缓存丢弃
      '--memory-pressure-off', // 关闭内存压力
      '--max_old_space_size=4096', // 设置最大内存使用量
      '--js-flags=--max-old-space-size=4096', // JS标志设置最大内存
      '--disable-background-timer-throttling', // 禁用后台定时器节流
    ],
    
    // 上下文配置
    contextOptions: {
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1, // 设备像素比为1
      isMobile: false, // 桌面设备
      hasTouch: false, // 禁用触摸
      colorScheme: 'light', // 浅色主题
      reducedMotion: 'no-preference', // 动画偏好
      timezoneId: 'Asia/Shanghai', // 时区设置
      permissions: ['clipboard-read', 'clipboard-write'], // 权限设置
    },
    
    // 页面设置
    pageOptions: {
      // 额外的页面级别设置
      extraHTTPHeaders: {
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    }
  },
  
  /**
   * Boss直聘浏览器显示配置
   * 为保持一致性，也应用相同的显示优化
   */
  boss: {
    // Boss直聘配置 - 优化版本
    launchArgs: [
      '--force-device-scale-factor=1',
      '--window-size=1920,1080',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-infobars',
      '--disable-features=TranslateUI,VizDisplayCompositor',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-component-extensions-with-background-pages',
      '--disable-background-downloads',
      '--aggressive-cache-discard',
      '--memory-pressure-off',
      '--max_old_space_size=4096',
      '--js-flags=--max-old-space-size=4096'
    ],
    
    contextOptions: {
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      colorScheme: 'light',
      reducedMotion: 'no-preference',
      timezoneId: 'Asia/Shanghai',
      permissions: ['clipboard-read', 'clipboard-write'],
    },
    
    pageOptions: {
      extraHTTPHeaders: {
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    }
  },
  
  /**
   * 通用浏览器显示配置
   * 适用于其他招聘平台或通用场景
   */
  default: {
    launchArgs: [
      '--force-device-scale-factor=1',
      '--high-dpi-support=1',
      '--force-color-profile=srgb',
      '--window-size=1920,1080',
      '--start-maximized',
      '--disable-extensions',
      '--disable-plugins',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-infobars',
      '--disable-features=TranslateUI,VizDisplayCompositor',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-component-extensions-with-background-pages',
      '--disable-background-downloads',
      '--aggressive-cache-discard',
      '--memory-pressure-off',
      '--max_old_space_size=4096',
      '--js-flags=--max-old-space-size=4096',
      '--disable-font-subpixel-positioning',
      '--enable-font-antialiasing'
    ],
    
    contextOptions: {
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
      colorScheme: 'light',
      permissions: ['clipboard-read', 'clipboard-write'],
    }
  },
  
  /**
   * 获取指定平台的显示配置
   * @param {string} platform - 平台名称 ('zhilian', 'bossZhipin', 'default')
   * @returns {Object} 平台对应的显示配置
   */
  getDisplayConfig(platform = 'default') {
    return this[platform] || this.default;
  },
  
  /**
   * 合并自定义配置
   * @param {string} platform - 平台名称
   * @param {Object} customConfig - 自定义配置
   * @returns {Object} 合并后的配置
   */
  mergeConfig(platform, customConfig = {}) {
    const baseConfig = this.getDisplayConfig(platform);
    return {
      launchArgs: [...baseConfig.launchArgs, ...(customConfig.launchArgs || [])],
      contextOptions: { ...baseConfig.contextOptions, ...customConfig.contextOptions },
      pageOptions: { ...baseConfig.pageOptions, ...customConfig.pageOptions }
    };
  }
};