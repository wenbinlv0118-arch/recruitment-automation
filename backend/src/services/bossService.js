const BossZhipinService = require('./bossZhipinService');
const logger = require('../utils/logger');

/**
 * Boss直聘测试服务适配器
 * 为测试流程提供简化的Boss直聘服务接口
 */
class BossService {
  constructor() {
    this.bossZhipinService = null;
  }

  /**
   * 启动Boss直聘服务
   */
  async start() {
    try {
      logger.info('启动Boss直聘测试服务');
      
      // 如果已有服务实例，先关闭
      if (this.bossZhipinService) {
        await this.stop();
      }
      
      // 创建新的服务实例
      this.bossZhipinService = new BossZhipinService();
      
      // 执行初始化流程
      await this.bossZhipinService.initializeFullProcess();
      
      logger.info('Boss直聘测试服务启动成功');
      return {
        success: true,
        message: 'Boss直聘服务启动成功',
        data: {
          status: 'initialized',
          nextStep: 'waiting_for_login'
        }
      };
    } catch (error) {
      logger.error('启动Boss直聘测试服务失败:', error);
      return {
        success: false,
        message: `启动失败: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * 停止Boss直聘服务
   */
  async stop() {
    try {
      if (this.bossZhipinService) {
        await this.bossZhipinService.closeBrowser();
        this.bossZhipinService = null;
        logger.info('Boss直聘测试服务已停止');
      }
      
      return {
        success: true,
        message: 'Boss直聘服务已停止'
      };
    } catch (error) {
      logger.error('停止Boss直聘测试服务失败:', error);
      return {
        success: false,
        message: `停止失败: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * 获取服务状态
   */
  async getStatus() {
    try {
      if (!this.bossZhipinService) {
        return {
          success: true,
          hasBrowser: false,
          hasPage: false,
          isLoggedIn: false,
          status: 'not_initialized'
        };
      }
      
      const status = await this.bossZhipinService.getStatus();
      return {
        success: true,
        hasBrowser: status.hasBrowser || false,
        hasPage: status.hasPage || false,
        isLoggedIn: status.isLoggedIn || false,
        status: status.status || 'unknown'
      };
    } catch (error) {
      logger.error('获取Boss直聘状态失败:', error);
      return {
        success: false,
        hasBrowser: false,
        hasPage: false,
        isLoggedIn: false,
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * 检查登录状态
   */
  async checkLoginStatus() {
    try {
      if (!this.bossZhipinService) {
        return {
          success: false,
          isLoggedIn: false,
          message: 'Boss直聘服务未初始化'
        };
      }
      
      const isLoggedIn = await this.bossZhipinService.checkLoginStatus();
      return {
        success: true,
        isLoggedIn,
        message: isLoggedIn ? '已登录' : '未登录'
      };
    } catch (error) {
      logger.error('检查Boss直聘登录状态失败:', error);
      return {
        success: false,
        isLoggedIn: false,
        message: `检查登录状态失败: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * 获取当前页面信息
   */
  async getCurrentPageInfo() {
    try {
      if (!this.bossZhipinService || !this.bossZhipinService.page) {
        return null;
      }
      
      const url = this.bossZhipinService.page.url();
      const title = await this.bossZhipinService.page.title();
      
      return {
        url,
        title,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('获取Boss直聘页面信息失败:', error);
      return null;
    }
  }
}

// 创建单例实例
const bossService = new BossService();

module.exports = bossService;