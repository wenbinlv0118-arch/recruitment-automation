const express = require('express');
const router = express.Router();
const BossZhipinService = require('../services/bossZhipinService');
const logger = require('../utils/logger');

// 创建 Boss 直聘服务实例
let bossZhipinService = null;
let io = null;

// 设置Socket.IO实例
router.setIO = function(socketIO) {
  io = socketIO;
};

/**
 * 启动 Boss 直聘智能寻聘
 */
router.post('/start', async (req, res) => {
  try {
    logger.info('收到启动 Boss 直聘智能寻聘请求');
    
    // 如果已有服务实例，先关闭
    if (bossZhipinService) {
      await bossZhipinService.closeBrowser();
    }
    
    // 创建新的服务实例，传递io实例以支持页面切换保护
    bossZhipinService = new BossZhipinService(io);
    
    // 启动初始化流程
    await bossZhipinService.initializeFullProcess();
    
    res.json({
      success: true,
      message: 'Boss 直聘智能寻聘已启动，请使用 App 扫码登录',
      data: {
        status: 'initialized',
        nextStep: 'waiting_for_login'
      }
    });
    
  } catch (error) {
    logger.error('启动 Boss 直聘智能寻聘失败:', error);
    res.status(500).json({
      success: false,
      message: '启动失败: ' + error.message,
      error: error.message
    });
  }
});

/**
 * 获取当前状态
 */
router.get('/status', async (req, res) => {
  try {
    if (!bossZhipinService) {
      return res.json({
        success: true,
        data: {
          status: 'not_initialized',
          isLoggedIn: false,
          hasBrowser: false,
          hasPage: false
        }
      });
    }
    
    const status = bossZhipinService.getCurrentStatus();
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    logger.error('获取 Boss 直聘状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取状态失败: ' + error.message,
      error: error.message
    });
  }
});

/**
 * 检查登录状态
 */
router.post('/check-login', async (req, res) => {
  try {
    if (!bossZhipinService) {
      return res.status(400).json({
        success: false,
        message: 'Boss 直聘服务未初始化'
      });
    }
    
    const isLoggedIn = await bossZhipinService.checkLoginStatus();
    const currentStatus = bossZhipinService.getCurrentStatus();
    
    res.json({
      success: true,
      data: {
        isLoggedIn,
        status: currentStatus.status,
        hasBrowser: currentStatus.hasBrowser,
        hasPage: currentStatus.hasPage
      }
    });
    
  } catch (error) {
    logger.error('检查登录状态失败:', error);
    res.status(500).json({
      success: false,
      message: '检查登录状态失败: ' + error.message,
      error: error.message
    });
  }
});

/**
 * 等待用户登录
 */
router.post('/wait-login', async (req, res) => {
  try {
    if (!bossZhipinService) {
      return res.status(400).json({
        success: false,
        message: 'Boss 直聘服务未初始化'
      });
    }
    
    const { timeout = 300000 } = req.body; // 默认5分钟超时
    
    // 异步等待登录，立即返回响应
    bossZhipinService.waitForUserLogin(timeout)
      .then(() => {
        logger.info('用户登录成功');
      })
      .catch((error) => {
        logger.error('等待用户登录失败:', error);
      });
    
    res.json({
      success: true,
      message: '正在等待用户扫码登录...',
      data: {
        status: 'waiting_for_login',
        timeout: timeout
      }
    });
    
  } catch (error) {
    logger.error('等待用户登录失败:', error);
    res.status(500).json({
      success: false,
      message: '等待用户登录失败: ' + error.message,
      error: error.message
    });
  }
});

/**
 * 停止服务
 */
router.post('/stop', async (req, res) => {
  try {
    if (bossZhipinService) {
      await bossZhipinService.closeBrowser();
      bossZhipinService = null;
      
      res.json({
        success: true,
        message: 'Boss 直聘智能寻聘已停止'
      });
    } else {
      res.json({
        success: true,
        message: 'Boss 直聘智能寻聘未运行'
      });
    }
    
  } catch (error) {
    logger.error('停止 Boss 直聘智能寻聘失败:', error);
    res.status(500).json({
      success: false,
      message: '停止失败: ' + error.message,
      error: error.message
    });
  }
});

/**
 * 执行单个步骤（用于调试）
 */
router.post('/execute-step', async (req, res) => {
  try {
    const { step } = req.body;
    
    if (!bossZhipinService) {
      return res.status(400).json({
        success: false,
        message: 'Boss 直聘服务未初始化'
      });
    }
    
    let result = false;
    
    switch (step) {
      case 'initialize_browser':
        result = await bossZhipinService.initializeBrowser();
        break;
      case 'open_website':
        result = await bossZhipinService.openBossZhipinWebsite();
        break;
      case 'navigate_recruitment':
        result = await bossZhipinService.navigateToRecruitmentPage();
        break;
      case 'select_app_login':
        result = await bossZhipinService.selectAppLoginMethod();
        break;
      case 'check_login':
        result = await bossZhipinService.checkLoginStatus();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: '未知的步骤: ' + step
        });
    }
    
    res.json({
      success: true,
      message: `步骤 ${step} 执行成功`,
      data: {
        step,
        result,
        status: bossZhipinService.getCurrentStatus()
      }
    });
    
  } catch (error) {
    logger.error(`执行步骤 ${req.body.step} 失败:`, error);
    res.status(500).json({
      success: false,
      message: '执行步骤失败: ' + error.message,
      error: error.message
    });
  }
});

/**
 * 启动候选人浏览
 */
router.post('/start-browsing', async (req, res) => {
  try {
    if (!bossZhipinService) {
      return res.status(400).json({
        success: false,
        message: 'Boss 直聘服务未初始化'
      });
    }
    
    const { mode, filters, targetCount } = req.body;
    
    await bossZhipinService.startBrowsing(mode, filters, targetCount);
    
    res.json({
      success: true,
      message: '候选人浏览已启动',
      data: {
        mode,
        filters,
        targetCount,
        status: 'browsing'
      }
    });
    
  } catch (error) {
    logger.error('启动候选人浏览失败:', error);
    res.status(500).json({
      success: false,
      message: '启动候选人浏览失败: ' + error.message,
      error: error.message
    });
  }
});

/**
 * 停止候选人浏览
 */
router.post('/stop-browsing', async (req, res) => {
  try {
    if (!bossZhipinService) {
      return res.status(400).json({
        success: false,
        message: 'Boss 直聘服务未初始化'
      });
    }
    
    await bossZhipinService.stopBrowsing();
    
    res.json({
      success: true,
      message: '候选人浏览已停止'
    });
    
  } catch (error) {
    logger.error('停止候选人浏览失败:', error);
    res.status(500).json({
      success: false,
      message: '停止候选人浏览失败: ' + error.message,
      error: error.message
    });
  }
});

/**
 * 获取候选人浏览状态
 */
router.get('/browsing-status', async (req, res) => {
  try {
    if (!bossZhipinService) {
      return res.json({
        success: true,
        data: {
          status: 'not_initialized',
          candidates: [],
          processedCount: 0,
          likedCount: 0,
          dislikedCount: 0,
          currentIndex: 0,
          isActive: false
        }
      });
    }
    
    // 获取实际的浏览状态数据
    const browsingStatus = bossZhipinService.getBrowsingStatus();
    
    res.json({
      success: true,
      data: browsingStatus
    });
    
  } catch (error) {
    logger.error('获取候选人浏览状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取候选人浏览状态失败: ' + error.message,
      error: error.message
    });
  }
});

/**
 * 处理候选人操作
 */
router.post('/candidate-action', async (req, res) => {
  try {
    if (!bossZhipinService) {
      return res.status(400).json({
        success: false,
        message: 'Boss 直聘服务未初始化'
      });
    }
    
    const { candidateId, action } = req.body;
    
    // 这里应该实现实际的候选人操作逻辑
    // 暂时返回成功响应
    
    res.json({
      success: true,
      message: `候选人操作 ${action} 执行成功`,
      data: {
        candidateId,
        action,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('处理候选人操作失败:', error);
    res.status(500).json({
      success: false,
      message: '处理候选人操作失败: ' + error.message,
      error: error.message
    });
  }
});

/**
 * 启动简历处理
 */
router.post('/start-resume-processing', async (req, res) => {
  try {
    if (!bossZhipinService) {
      return res.status(400).json({
        success: false,
        message: 'Boss 直聘服务未初始化'
      });
    }
    
    const { settings } = req.body;
    
    await bossZhipinService.startResumeProcessing(settings);
    
    res.json({
      success: true,
      message: '简历处理已启动',
      data: {
        settings,
        status: 'processing_resumes'
      }
    });
    
  } catch (error) {
    logger.error('启动简历处理失败:', error);
    res.status(500).json({
      success: false,
      message: '启动简历处理失败: ' + error.message,
      error: error.message
    });
  }
});

/**
 * 停止简历处理
 */
router.post('/stop-resume-processing', async (req, res) => {
  try {
    if (!bossZhipinService) {
      return res.status(400).json({
        success: false,
        message: 'Boss 直聘服务未初始化'
      });
    }
    
    await bossZhipinService.stopResumeProcessing();
    
    res.json({
      success: true,
      message: '简历处理已停止'
    });
    
  } catch (error) {
    logger.error('停止简历处理失败:', error);
    res.status(500).json({
      success: false,
      message: '停止简历处理失败: ' + error.message,
      error: error.message
    });
  }
});

/**
 * 获取简历处理状态
 */
router.get('/resume-processing-status', async (req, res) => {
  try {
    if (!bossZhipinService) {
      return res.json({
        success: true,
        data: {
          status: 'not_initialized',
          resumes: [],
          processingCount: 0,
          completedCount: 0,
          failedCount: 0,
          currentIndex: 0,
          settings: {},
          startTime: null,
          isActive: false
        }
      });
    }
    
    const status = bossZhipinService.getResumeProcessingStatus();
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    logger.error('获取简历处理状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取简历处理状态失败: ' + error.message,
      error: error.message
    });
  }
});

/**
 * 处理简历
 */
router.post('/process-resume', async (req, res) => {
  try {
    if (!bossZhipinService) {
      return res.status(400).json({
        success: false,
        message: 'Boss 直聘服务未初始化'
      });
    }
    
    const { resumeId, action } = req.body;
    
    // 这里应该实现实际的简历处理逻辑
    // 暂时返回成功响应
    
    res.json({
      success: true,
      message: `简历操作 ${action} 执行成功`,
      data: {
        resumeId,
        action,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    logger.error('处理简历失败:', error);
    res.status(500).json({
      success: false,
      message: '处理简历失败: ' + error.message,
      error: error.message
    });
  }
});

module.exports = router;
