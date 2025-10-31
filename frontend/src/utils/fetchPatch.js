/**
 * 打包环境fetch补丁：重写以`/api`开头的相对路径到本地后端端口
 * 为什么：历史代码在开发模式依赖 CRA 代理使用相对路径 `'/api'`。在 Electron 打包环境下页面以 `file://` 方式加载，
 * 直接 `fetch('/api/...')` 会失败。通过预加载暴露的端口，将相对路径自动改写为 `http://127.0.0.1:PORT/api/...`。
 * 使用方式：在入口文件调用 `applyElectronFetchBasePatch()` 即可。
 */
export async function applyElectronFetchBasePatch() {
  // 函数级注释：此函数在打包环境下运行，确保旧代码中的相对路径API请求能够正常连接后端。
  try {
    if (typeof window === 'undefined') return;
    // 避免重复打补丁
    if (window.__fetchPatched) return;
    // 仅在 Electron 打包环境尝试获取后端端口
    if (!window.backend || typeof window.backend.getBackendInfo !== 'function') return;
    const info = await window.backend.getBackendInfo();
    if (!info || !info.port) return;
    const base = `http://127.0.0.1:${info.port}`;

    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      try {
        // 支持字符串与 Request 对象两种形式
        const urlStr = typeof input === 'string' ? input : (input && input.url) || '';
        if (urlStr.startsWith('/api')) {
          const newUrl = base + urlStr;
          return originalFetch(newUrl, init);
        }
        return originalFetch(input, init);
      } catch (_) {
        return originalFetch(input, init);
      }
    };

    window.__fetchPatched = true;
  } catch (e) {
    // 静默失败，保持原行为
  }
}