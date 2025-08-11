// 浏览器配置
const BROWSER_CONFIG = {
  headless: false,
  slowMo: 1000,
  args: [
    '--disable-extensions',
    '--disable-plugins',
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-web-security',
    '--disable-features=VizDisplayCompositor'
  ]
};

// 浏览器上下文配置
const CONTEXT_CONFIG = {
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
};

// Socket.IO配置
const SOCKET_CONFIG = {
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    methods: ["GET", "POST", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  upgradeTimeout: 10000,
  maxHttpBufferSize: 1e8
};

module.exports = {
  BROWSER_CONFIG,
  CONTEXT_CONFIG,
  SOCKET_CONFIG
}; 