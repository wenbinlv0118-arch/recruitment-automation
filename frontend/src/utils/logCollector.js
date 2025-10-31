// 简单日志采集器
// 目的：将自动化触发过程的关键日志写到控制台与 automation.log

/**
 * 记录信息日志（为什么）
 * - 统一日志格式便于定位问题
 * @param {string} category - 类别
 * @param {string} message - 内容
 */
export function info(category, message) {
  const stamp = new Date().toISOString();
  const line = `[INFO][${category}] ${message}`;
  // 控制台输出
  // eslint-disable-next-line no-console
  console.log(`${stamp} ${line}`);
  // Electron 文件落盘
  if (typeof window !== 'undefined' && window.logs && typeof window.logs.append === 'function') {
    window.logs.append(line).catch(() => {});
  }
}

/**
 * 记录错误日志
 * @param {string} category - 类别
 * @param {string|Error} err - 错误对象或文本
 */
export function error(category, err) {
  const stamp = new Date().toISOString();
  const msg = typeof err === 'string' ? err : (err?.message || String(err));
  const line = `[ERROR][${category}] ${msg}`;
  // 控制台输出
  // eslint-disable-next-line no-console
  console.error(`${stamp} ${line}`);
  if (typeof window !== 'undefined' && window.logs && typeof window.logs.append === 'function') {
    window.logs.append(line).catch(() => {});
  }
}