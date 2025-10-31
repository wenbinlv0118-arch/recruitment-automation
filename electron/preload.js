// 预加载脚本：仅暴露必要的只读信息，避免扩大攻击面
const { contextBridge, ipcRenderer } = require('electron');

/**
 * 向渲染进程暴露受控的后端信息获取接口
 * - getBackendInfo: 获取后端端口、健康状态等
 */
contextBridge.exposeInMainWorld('backend', {
  /**
   * 获取后端运行信息
   * @returns {Promise<{port:number, healthy:boolean}>} 后端端口与健康状态
   */
  getBackendInfo: () => ipcRenderer.invoke('get-backend-info'),
});

/**
 * 暴露简单日志写入接口（为什么）
 * - 支持在打包环境采集自动化流程日志并写入文件
 */
contextBridge.exposeInMainWorld('logs', {
  /**
   * 追加一行日志到 automation.log
   * @param {string} line - 日志文本
   * @returns {Promise<void>} 完成写入
   */
  append: (line) => ipcRenderer.invoke('append-log', String(line || '')),
});