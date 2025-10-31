const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');
const { spawn } = require('child_process');
const { createWorker } = require('tesseract.js');
const { getOcrConfig } = require('../utils/envPaths');

/**
 * 资源预加载服务
 * 目标：在用户允许且联网的情况下预先下载必要资源，降低首次使用等待
 */
class ResourcePreloader {
  /**
   * 解析 Playwright CLI 路径
   * 为什么：在打包/开发环境都能准确找到 CLI
   */
  resolvePlaywrightCli() {
    try {
      const pkg = require.resolve('playwright/package.json');
      const dir = path.dirname(pkg);
      const cli = path.join(dir, 'cli.js');
      if (fs.existsSync(cli)) return cli;
    } catch (e) {
      logger.warn('解析 Playwright CLI 失败:', e.message);
    }
    return null;
  }

  /**
   * 检查 Playwright Chromium 是否已安装
   * 为什么：避免重复下载，节省时间与流量
   * @returns {Promise<boolean>}
   */
  async isPlaywrightChromiumInstalled() {
    try {
      const browsersPath = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(process.cwd(), '.playwright-browsers');
      const exists = await fs.pathExists(browsersPath);
      if (!exists) return false;
      const entries = await fs.readdir(browsersPath);
      return entries.some(name => name.startsWith('chromium'));
    } catch (e) {
      logger.warn('检测 Playwright 浏览器安装状态失败:', e.message);
      return false;
    }
  }

  /**
   * 安装 Playwright Chromium（通过 CLI）
   * 为什么：在未安装时自动拉取浏览器，修复预加载失败问题
   * @returns {Promise<boolean>} 是否成功
   */
  async installPlaywrightChromium() {
    const cli = this.resolvePlaywrightCli();
    if (!cli) {
      logger.error('未找到 Playwright CLI，无法安装浏览器');
      return false;
    }
    logger.info('开始安装 Playwright Chromium 浏览器（CLI）');
    return await new Promise((resolve) => {
      const child = spawn(process.execPath, [cli, 'install', 'chromium'], {
        env: { ...process.env, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '0' },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      child.stdout.on('data', (d) => logger.info(String(d).trim()));
      child.stderr.on('data', (d) => logger.warn(String(d).trim()));
      child.on('error', (e) => {
        logger.error('Playwright 浏览器安装进程错误:', e);
        resolve(false);
      });
      child.on('exit', (code) => {
        logger.info(`Playwright 浏览器安装完成，退出码=${code}`);
        resolve(code === 0);
      });
    });
  }

  /**
   * 预加载 Playwright Chromium
   * 为什么：提前拉取浏览器，减少首次启动的下载等待
   * @returns {Promise<boolean>} 是否成功
   */
  async preloadPlaywrightChromium() {
    try {
      const installed = await this.isPlaywrightChromiumInstalled();
      if (!installed) {
        const ok = await this.installPlaywrightChromium();
        if (!ok) return false;
      }
      const { chromium } = require('playwright');
      logger.info('开始预加载 Playwright Chromium 浏览器');
      const browser = await chromium.launch({ headless: true });
      await browser.close();
      logger.info('Playwright Chromium 预加载完成');
      return true;
    } catch (e) {
      logger.error('Playwright Chromium 预加载失败:', e);
      return false;
    }
  }

  /**
   * 检查 OCR 语言是否已缓存
   * 为什么：识别前置资源充足时可离线或快速执行
   * @param {string[]} langs 语言代码数组
   * @returns {Promise<Record<string, boolean>>}
   */
  async getOcrLangStatus(langs) {
    const { cachePath } = getOcrConfig();
    const status = {};
    for (const lang of langs) {
      const file = path.join(cachePath, `${lang}.traineddata`);
      status[lang] = await fs.pathExists(file);
    }
    return status;
  }

  /**
   * 预加载 OCR 语言数据
   * 为什么：提前拉取 `*.traineddata`，避免识别时频繁下载
   * @param {string[]} langs 语言代码数组
   * @returns {Promise<boolean>} 是否成功
   */
  async preloadOcrLangs(langs) {
    try {
      const ocr = getOcrConfig();
      await fs.ensureDir(ocr.cachePath);
      const langStr = langs.join('+');
      logger.info(`开始预加载 OCR 语言: ${langStr}`);
      const worker = await createWorker(langs[0] || 'eng', 1, {
        cachePath: ocr.cachePath,
        langPath: ocr.langPath,
        workerPath: ocr.workerPath,
        corePath: ocr.corePath,
        logger: m => {
          if (m.status === 'loading language traineddata') {
            logger.info(`OCR 语言下载进度: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      // 仅下载语言数据，不做识别
      await worker.loadLanguage(langStr);
      await worker.terminate();
      logger.info('OCR 语言预加载完成');
      return true;
    } catch (e) {
      logger.error('OCR 语言预加载失败:', e);
      return false;
    }
  }
}

module.exports = new ResourcePreloader();