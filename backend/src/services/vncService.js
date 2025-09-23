/**
 * VNC服务通信模块
 * 处理与远程VNC服务的交互和浏览器会话管理
 */

const axios = require('axios');
const logger = require('../utils/logger');
const { environmentConfig } = require('../config/environmentConfig');

class VncService {
  constructor() {
    this.config = environmentConfig.getConfig();
    this.vncConfig = this.config.vncConfig;
    this.serviceUrls = this.config.serviceUrls;
    this.isEnabled = this.vncConfig.enabled;
    
    if (this.isEnabled) {
      logger.info('VNC服务已启用', {
        serverUrl: this.vncConfig.serverUrl,
        display: this.vncConfig.display
      });
    }
  }

  /**
   * 检查VNC服务是否可用
   * @returns {Promise<boolean>}
   */
  async isVncServiceAvailable() {
    if (!this.isEnabled || !this.vncConfig.serverUrl) {
      return false;
    }

    try {
      const response = await axios.get(`${this.vncConfig.serverUrl}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      logger.warn('VNC服务健康检查失败', { error: error.message });
      return false;
    }
  }

  /**
   * 获取VNC会话信息
   * @returns {Promise<Object|null>}
   */
  async getVncSession() {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const response = await axios.get(`${this.vncConfig.serverUrl}/api/session`, {
        timeout: 10000
      });
      return response.data;
    } catch (error) {
      logger.error('获取VNC会话信息失败', { error: error.message });
      return null;
    }
  }

  /**
   * 创建新的VNC会话
   * @param {Object} options - 会话选项
   * @returns {Promise<Object|null>}
   */
  async createVncSession(options = {}) {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const sessionData = {
        display: this.vncConfig.display,
        resolution: options.resolution || '1920x1080',
        password: this.vncConfig.password,
        ...options
      };

      const response = await axios.post(
        `${this.vncConfig.serverUrl}/api/session`,
        sessionData,
        { timeout: 15000 }
      );

      logger.info('VNC会话创建成功', { sessionId: response.data.sessionId });
      return response.data;
    } catch (error) {
      logger.error('创建VNC会话失败', { error: error.message });
      return null;
    }
  }

  /**
   * 获取浏览器配置（适配VNC环境）
   * @returns {Object}
   */
  getBrowserConfigForVnc() {
    if (!this.isEnabled) {
      return environmentConfig.getBrowserConfig();
    }

    const baseConfig = environmentConfig.getBrowserConfig();
    
    // VNC环境下的特殊配置
    const vncConfig = {
      ...baseConfig,
      headless: false, // VNC环境下不使用headless
      args: [
        ...baseConfig.args,
        `--display=${this.vncConfig.display}`,
        '--enable-logging',
        '--log-level=0',
        '--remote-debugging-port=0',
        '--disable-background-networking',
        '--disable-background-timer-throttling'
      ],
      env: {
        DISPLAY: this.vncConfig.display,
        VNC_SERVER: this.vncConfig.serverUrl,
        BROWSER_VNC_MODE: 'true'
      }
    };

    return vncConfig;
  }

  /**
   * 发送命令到VNC服务
   * @param {string} command - 命令类型
   * @param {Object} data - 命令数据
   * @returns {Promise<Object|null>}
   */
  async sendVncCommand(command, data = {}) {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const response = await axios.post(
        `${this.vncConfig.serverUrl}/api/command`,
        { command, data },
        { timeout: 10000 }
      );
      return response.data;
    } catch (error) {
      logger.error('发送VNC命令失败', { command, error: error.message });
      return null;
    }
  }

  /**
   * 截取VNC屏幕截图
   * @returns {Promise<string|null>} Base64编码的截图
   */
  async takeVncScreenshot() {
    if (!this.isEnabled) {
      return null;
    }

    try {
      const response = await axios.get(
        `${this.vncConfig.serverUrl}/api/screenshot`,
        { timeout: 15000 }
      );
      return response.data.screenshot;
    } catch (error) {
      logger.error('获取VNC截图失败', { error: error.message });
      return null;
    }
  }

  /**
   * 清理VNC会话
   * @param {string} sessionId - 会话ID
   * @returns {Promise<boolean>}
   */
  async cleanupVncSession(sessionId) {
    if (!this.isEnabled || !sessionId) {
      return true;
    }

    try {
      await axios.delete(
        `${this.vncConfig.serverUrl}/api/session/${sessionId}`,
        { timeout: 10000 }
      );
      logger.info('VNC会话清理成功', { sessionId });
      return true;
    } catch (error) {
      logger.error('清理VNC会话失败', { sessionId, error: error.message });
      return false;
    }
  }

  /**
   * 获取VNC服务状态
   * @returns {Object}
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      config: this.vncConfig,
      serviceUrls: this.serviceUrls
    };
  }
}

// 创建全局实例
const vncService = new VncService();

module.exports = {
  vncService,
  VncService
};