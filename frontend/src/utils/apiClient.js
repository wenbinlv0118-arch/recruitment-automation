// 简单的前端 API 客户端封装
// 目的：在开发（CRA）与打包（Electron）环境下统一解析后端地址与 Socket 连接
import { io } from 'socket.io-client';

/**
 * 解析后端基础地址（为什么）
 * - Electron 打包环境：通过 preload 暴露的端口拼接 `http://127.0.0.1:PORT`
 * - CRA 开发环境：返回空字符串，使用相对路径 `/api` 与同源 Socket 代理
 * @returns {Promise<string>} 返回基础地址或空字符串
 */
export async function resolveBaseUrl() {
  try {
    if (typeof window !== 'undefined' && window.backend && typeof window.backend.getBackendInfo === 'function') {
      const info = await window.backend.getBackendInfo();
      if (info && info.port) return `http://127.0.0.1:${info.port}`;
    }
  } catch (_) { /* 忽略错误，走相对路径 */ }
  return '';
}

/**
 * 发起 GET 请求
 * @param {string} path - 以 `/api` 开头的接口路径
 * @param {RequestInit} options - fetch 选项
 * @returns {Promise<Response>} fetch 响应
 */
export async function get(path, options = {}) {
  const base = await resolveBaseUrl();
  const url = base ? `${base}${path}` : path;
  return fetch(url, { ...options, method: 'GET' });
}

/**
 * 发起 POST 请求
 * @param {string} path - 以 `/api` 开头的接口路径
 * @param {any} body - 请求体对象
 * @param {RequestInit} options - 额外 fetch 选项
 * @returns {Promise<Response>} fetch 响应
 */
export async function post(path, body, options = {}) {
  const base = await resolveBaseUrl();
  const url = base ? `${base}${path}` : path;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  return fetch(url, { ...options, method: 'POST', headers, body: JSON.stringify(body || {}) });
}

/**
 * 建立 Socket.IO 连接（为什么）
 * - Electron：连接到 `http://127.0.0.1:PORT`，确保与后端端口一致
 * - 开发：传入 `undefined`，使用同源并通过 `setupProxy.js` 代理到后端
 * @param {import('socket.io-client').ManagerOptions & import('socket.io-client').SocketOptions} options - 连接选项
 * @returns {Promise<import('socket.io-client').Socket>} Socket 实例
 */
export async function connectSocket(options = {}) {
  const base = await resolveBaseUrl();
  // 显式设置默认路径，后端使用默认 `/socket.io`
  const merged = { path: '/socket.io', ...options };
  const url = base || undefined; // undefined 则连接到同源（开发模式）
  return io(url, merged);
}

/**
 * 统一的 JSON 解析助手
 * @param {Response} resp - fetch 响应
 * @returns {Promise<any>} 解析后的 JSON
 */
export async function parseJson(resp) {
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { ok: false, raw: text }; }
}