const path = require('path');

/**
 * 获取后端存储根目录
 * 优先使用环境变量 BACKEND_STORAGE_ROOT，否则回退到项目内 storage 目录
 * @returns {string} 存储根路径
 */
function getStorageRoot() {
  if (process.env.BACKEND_STORAGE_ROOT) {
    return process.env.BACKEND_STORAGE_ROOT;
  }
  // 默认回退到源码目录相对路径，保证开发模式无改动
  return path.join(__dirname, '../../storage');
}

/**
 * 组合子目录路径
 * @param {string} sub 子目录名称
 * @returns {string} 完整子目录路径
 */
function storageSubdir(sub) {
  return path.join(getStorageRoot(), sub);
}

/**
 * 获取 OCR 相关路径配置
 * 优先使用环境变量进行覆盖；提供合理的本地默认值以便 Electron 打包运行
 * @returns {{cachePath: string, langPath: string, workerPath: string, corePath: string}}
 */
function getOcrConfig() {
  // 语言数据路径：允许通过 OCR_LANG_PATH 指定本地目录；否则使用官方公开 CDN
  const langPath = process.env.OCR_LANG_PATH || 'https://tessdata.projectnaptha.com/4.0.0';

  // 缓存目录：将下载的 *.traineddata 持久化到应用存储目录
  const cachePath = process.env.OCR_CACHE_DIR || storageSubdir('ocr-cache');

  // worker 脚本路径（Node 环境）：指向 tesseract.js 提供的 Node worker 入口
  let workerPath;
  try {
    workerPath = require.resolve('tesseract.js/src/worker-script/node/index.js');
  } catch (e) {
    // 兜底到常见的 node_modules 相对位置
    workerPath = path.join(__dirname, '../../../node_modules/tesseract.js/src/worker-script/node/index.js');
  }

  // core 路径：传入目录以便自动选择合适的 wasm.js 变体
  let corePath;
  try {
    // 通过定位某个 wasm.js 文件获取其所在目录
    corePath = path.dirname(require.resolve('tesseract.js-core/tesseract-core.wasm.js'));
  } catch (e) {
    corePath = path.join(__dirname, '../../../node_modules/tesseract.js-core');
  }

  return { cachePath, langPath, workerPath, corePath };
}

module.exports = {
  getStorageRoot,
  storageSubdir,
  getOcrConfig,
};