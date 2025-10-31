// Electron 主进程：创建窗口、启动后端、管理首次运行初始化
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { fork } = require('child_process');
const http = require('http');
const https = require('https');
const { findAvailablePort } = require('./src/utils/port');

let mainWindow = null;
let backendProcess = null;
let backendPort = 5001;
let backendHealthy = false;

/**
 * 加载后端 .env 配置（开发与打包双环境）
 * 目的：确保 LLM_API_KEY 等配置被注入到子进程，即使 dotenv 未能自动读取。
 */
function loadBackendEnv() {
  const isDev = !app.isPackaged;
  const candidates = [
    isDev
      ? path.resolve(__dirname, '../backend/.env')
      : path.join(process.resourcesPath, 'app', 'backend', '.env'),
    isDev
      ? path.resolve(__dirname, '../backend/.env.backup')
      : path.join(process.resourcesPath, 'app', 'backend', '.env.backup'),
  ];

  const envVars = {};
  for (const p of candidates) {
    try {
      if (!fs.existsSync(p)) continue;
      const text = fs.readFileSync(p, 'utf8');
      for (const line of text.split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m) continue;
        const key = m[1];
        let val = m[2];
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith('\'') && val.endsWith('\''))) {
          val = val.slice(1, -1);
        }
        envVars[key] = val;
      }
      break;
    } catch (e) {
      console.warn('读取 .env 失败:', p, e);
    }
  }

  if (!envVars.LLM_API_URL && envVars.LLM_BASE_URL) {
    envVars.LLM_API_URL = envVars.LLM_BASE_URL;
  }

  return envVars;
}

/**
 * 健康检查：轮询后端 /api/health 直到成功或超时
 * @param {number} port 端口
 * @param {number} timeoutMs 超时时间，默认20秒
 * @returns {Promise<boolean>} 是否健康
 */
function waitForBackendHealth(port, timeoutMs = 20000) {
  const start = Date.now();
  return new Promise((resolve) => {
    const tryCheck = () => {
      const req = http.request({
        host: '127.0.0.1',
        port,
        path: '/api/health',
        method: 'GET',
        timeout: 3000,
      }, (res) => {
        if (res.statusCode === 200) {
          backendHealthy = true;
          resolve(true);
        } else if (Date.now() - start < timeoutMs) {
          setTimeout(tryCheck, 500);
        } else {
          resolve(false);
        }
      });
      req.on('error', () => {
        if (Date.now() - start < timeoutMs) {
          setTimeout(tryCheck, 500);
        } else {
          resolve(false);
        }
      });
      req.end();
    };
    tryCheck();
  });
}

/**
 * 首次运行初始化：创建用户数据目录下所需资源
 * - storage: 后端写入目录
 * - playwright-browsers: Playwright 浏览器下载目录
 */
function ensureFirstRunResources() {
  const userData = app.getPath('userData');
  const storageRoot = path.join(userData, 'storage');
  const pwBrowsers = path.join(userData, 'playwright-browsers');
  fs.ensureDirSync(storageRoot);
  fs.ensureDirSync(path.join(storageRoot, 'resumes'));
  fs.ensureDirSync(path.join(storageRoot, 'resume_library'));
  fs.ensureDirSync(path.join(storageRoot, 'cache'));
  // OCR 缓存目录：用于持久化 *.traineddata，避免重复下载
  fs.ensureDirSync(path.join(storageRoot, 'ocr-cache'));
  fs.ensureDirSync(pwBrowsers);

  // 将内置的 OCR 语言文件复制到缓存目录（仅首次缺失时）
  try {
    const ocrCacheDir = path.join(storageRoot, 'ocr-cache');
    const sources = [];
    if (app.isPackaged) {
      sources.push(path.join(process.resourcesPath, 'bundled-ocr', 'eng.traineddata'));
      sources.push(path.join(process.resourcesPath, 'bundled-ocr', 'chi_sim.traineddata'));
    } else {
      // 开发模式下使用后端根目录中的语言文件
      sources.push(path.resolve(__dirname, '../backend/eng.traineddata'));
      sources.push(path.resolve(__dirname, '../backend/chi_sim.traineddata'));
    }
    for (const src of sources) {
      const basename = path.basename(src);
      const dest = path.join(ocrCacheDir, basename);
      if (fs.existsSync(src) && !fs.existsSync(dest)) {
        fs.copyFileSync(src, dest);
      }
    }
  } catch (e) {
    console.warn('复制内置 OCR 语言文件到缓存失败:', e);
  }

  return { storageRoot, pwBrowsers };
}

/**
 * 启动后端进程：自适应端口并注入必要环境变量
 * @returns {Promise<number>} 实际监听端口
 */
async function startBackend() {
  backendPort = await findAvailablePort(5001, 40);
  const { storageRoot, pwBrowsers } = ensureFirstRunResources();
  const envFromFile = loadBackendEnv();

  const isDev = !app.isPackaged;
  // 打包模式下，强制使用解包目录 app，确保模块解析来自 app/node_modules
  const backendEntry = isDev
    ? path.resolve(__dirname, '../backend/src/index.js')
    : path.join(process.resourcesPath, 'app', 'backend', 'src', 'index.js');

  // 记录后端入口用于调试
  console.log('[backend] entry =', backendEntry);

  // 启动后端
  backendProcess = fork(backendEntry, [], {
    env: {
      ...process.env,
      ...envFromFile,
      // 强制以 Node 模式运行子进程，避免 Electron 子进程误启动 UI
      ELECTRON_RUN_AS_NODE: '1',
      PORT: String(backendPort),
      BACKEND_STORAGE_ROOT: storageRoot,
      PLAYWRIGHT_BROWSERS_PATH: pwBrowsers,
      PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '0', // 首次运行允许下载
      ELECTRON_MODE: '1',
      // 提供 NODE_PATH，确保子进程能从 app/node_modules 解析依赖
      NODE_PATH: path.join(process.resourcesPath, 'app', 'node_modules'),
      // 提供 OCR_LANG_PATH，指向内置语言目录（打包）或后端目录（开发）
      OCR_LANG_PATH: app.isPackaged
        ? path.join(process.resourcesPath, 'bundled-ocr')
        : path.resolve(__dirname, '../backend'),
    },
    stdio: 'pipe',
    // 设置工作目录以增强模块解析的稳定性
    cwd: isDev
      ? path.resolve(__dirname, '../backend')
      : path.join(process.resourcesPath, 'app'),
  });

  // 输出日志到控制台与文件
  const logsDir = path.join(app.getPath('userData'), 'logs');
  fs.ensureDirSync(logsDir);
  const logFile = path.join(logsDir, 'backend.log');
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  backendProcess.stdout?.on('data', (d) => { process.stdout.write(d); logStream.write(d); });
  backendProcess.stderr?.on('data', (d) => { process.stderr.write(d); logStream.write(d); });

  backendProcess.on('exit', (code) => {
    logStream.end();
    backendHealthy = false;
    console.log(`[backend] 退出，code=${code}`);
  });

  await waitForBackendHealth(backendPort);
  return backendPort;
}

/**
 * 创建主窗口并加载页面（开发/生产自动切换）
 */
async function createWindow() {
  const isDev = !app.isPackaged;
  // 开发模式：复用现有后端(默认5001)，避免端口冲突
  if (isDev) {
    backendPort = 5001;
    await waitForBackendHealth(backendPort, 5000);
  } else {
    // 生产模式：随应用启动后端
    await startBackend();
  }

  // 创建窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    // 开发模式：直接加载 CRA dev server
    await mainWindow.loadURL('http://localhost:3000');
  } else {
    // 生产模式：加载打包后的静态文件
    const indexPath = path.join(__dirname, '../frontend/build/index.html');
    await mainWindow.loadURL(`file://${indexPath}`);
  }

  // 联网时提示是否预加载资源（Playwright 浏览器与 OCR 语言）
  setTimeout(async () => {
    try {
      const online = await isOnline(4000);
      if (!online) return;

      const status = await getResourceStatus();
      const needPlaywright = !status.playwrightChromiumInstalled;
      const needOcr = !(status.ocr?.eng) || !(status.ocr?.chi_sim);
      if (!needPlaywright && !needOcr) return;

      const result = await dialog.showMessageBox(mainWindow, {
        type: 'question',
        buttons: ['预加载', '稍后'],
        defaultId: 0,
        cancelId: 1,
        title: '预加载必要资源',
        message: '检测到网络可用，是否预加载 Playwright 浏览器与 OCR 语言数据？',
        detail: '预加载将减少首次使用等待时间（可能消耗数百MB流量）。',
      });

      if (result.response === 0) {
        // 仅预加载缺失项，异步模式触发后端任务
        await preloadResources({
          playwright: needPlaywright,
          ocrLangs: [
            ...(status.ocr?.eng ? [] : ['eng']),
            ...(status.ocr?.chi_sim ? [] : ['chi_sim']),
          ],
          async: true,
        });
        await dialog.showMessageBox(mainWindow, {
          type: 'info',
          buttons: ['好的'],
          message: '已开始预加载资源',
          detail: '您可以正常使用应用，预加载在后台进行。',
        });
      }
    } catch (e) {
      console.warn('资源预加载提示流程失败:', e);
    }
  }, 1500);
}

/**
 * IPC: 渲染进程查询后端运行信息
 */
ipcMain.handle('get-backend-info', async () => ({
  port: backendPort,
  healthy: backendHealthy,
}));

/**
 * IPC: 采集自动化日志并写入文件
 * 为什么：在打包环境运行自动化验证时需要落盘日志，便于问题定位
 */
ipcMain.handle('append-log', async (_event, line) => {
  try {
    const logsDir = path.join(app.getPath('userData'), 'logs');
    fs.ensureDirSync(logsDir);
    const logFile = path.join(logsDir, 'automation.log');
    const stamp = new Date().toISOString();
    const text = `[${stamp}] ${String(line || '')}\n`;
    fs.appendFileSync(logFile, text, 'utf8');
  } catch (e) {
    // 主进程仅吞吐错误到控制台，避免阻塞渲染进程
    console.warn('写入 automation.log 失败:', e.message);
  }
});

/**
 * 应用生命周期管理
 */
app.on('ready', async () => {
  await createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    await createWindow();
  }
});

app.on('before-quit', () => {
  if (backendProcess && !backendProcess.killed) {
    backendProcess.kill('SIGTERM');
  }
});

/**
 * 网络连通性检测（简单 HEAD 请求）
 * 为什么：仅在联网时弹预加载提示，避免打扰用户
 */
function isOnline(timeoutMs = 3000) {
  return new Promise((resolve) => {
    const req = https.request(
      'https://tessdata.projectnaptha.com/',
      { method: 'HEAD', timeout: timeoutMs },
      () => resolve(true)
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

/**
 * 查询后端资源状态
 */
function getResourceStatus() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      host: '127.0.0.1',
      port: backendPort,
      path: '/api/resources/status',
      method: 'GET',
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

/**
 * 触发后端资源预加载
 */
function preloadResources({ playwright, ocrLangs, async }) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ playwright, ocrLangs, async });
    const req = http.request({
      host: '127.0.0.1',
      port: backendPort,
      path: '/api/resources/preload',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString())); }
        catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}