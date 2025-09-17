const { chromium } = require('playwright');

// 强制D-Bus禁用配置
const browserConfig = {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-dbus',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--disable-background-networking',
        '--disable-default-apps',
        '--disable-sync',
        '--disable-translate',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-features=TranslateUI',
        '--disable-component-extensions-with-background-pages',
        '--disable-extensions-http-throttling',
        '--disable-ipc-flooding-protection',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
    ],
    env: {
        ...process.env,
        DBUS_SESSION_BUS_ADDRESS: '',
        DBUS_SYSTEM_BUS_ADDRESS: '',
        NO_DBUS: '1',
        DISABLE_DBUS: '1',
        NO_AT_BRIDGE: '1',
        GSETTINGS_BACKEND: 'memory',
        GDK_BACKEND: 'x11'
    }
};

module.exports = browserConfig;