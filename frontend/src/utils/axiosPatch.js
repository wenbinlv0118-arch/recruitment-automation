import axios from 'axios';

/**
 * 打包环境axios补丁：统一设置默认 baseURL 指向本地后端端口
 * 为什么：部分组件直接使用 axios 以相对路径 `/api/...` 进行请求，在 Electron 打包环境下会失败。
 * 通过从 preload 获取端口，设置 `axios.defaults.baseURL = http://127.0.0.1:PORT`。
 */
export async function applyElectronAxiosBasePatch() {
  // 函数级注释：此函数在应用启动阶段设置 axios 的默认后端地址，保证打包环境能正常请求。
  try {
    if (typeof window === 'undefined') return;
    if (!window.backend || typeof window.backend.getBackendInfo !== 'function') return;
    const info = await window.backend.getBackendInfo();
    if (!info || !info.port) return;
    axios.defaults.baseURL = `http://127.0.0.1:${info.port}`;
  } catch (_) {
    // 忽略错误，保持原有行为
  }
}