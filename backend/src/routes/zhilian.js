const express = require('express');
const ZhilianService = require('../services/zhilianService');
const logger = require('../utils/logger');

const router = express.Router();

// 全局服务实例
let zhilianService = null;

/**
 * 初始化智联招聘服务
 * @param {Object} io - Socket.IO实例
 * @returns {ZhilianService} 智联招聘服务实例
 */
function initializeZhilianService(io) {
  if (!zhilianService) {
    zhilianService = new ZhilianService(io);
  }
  return zhilianService;
}

/**
 * 启动智联招聘智能寻聘
 * POST /api/zhilian/start
 * 
 * 请求体参数:
 * {
 *   "mode": "search",
 *   "filters": {
 *     "keywords": "Java开发工程师",
 *     "education": "本科",
 *     "experience": "3-5年",
 *     "salary": "15-25K",
 *     "location": "北京"
 *   },
 *   "targetCount": 20
 * }
 */
router.post('/start', async (req, res) => {
  try {
    logger.info('收到启动智联招聘智能寻聘请求');
    
    const { mode, filters = {}, targetCount = 10 } = req.body;
    
    // 验证参数
    if (!mode) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: mode'
      });
    }
    
    // 支持的模式
    const supportedModes = ['search', 'recommended', 'communication'];
    if (!supportedModes.includes(mode)) {
      return res.status(400).json({
        success: false,
        message: `不支持的模式: ${mode}，支持的模式: ${supportedModes.join(', ')}`
      });
    }
    
    // 检查VNC服务状态
    const { vncService } = require('../services/vncService');
    const isVncAvailable = await vncService.isVncServiceAvailable();
    
    if (isVncAvailable) {
      logger.info('检测到VNC服务可用，将在VNC环境下启动浏览器');
    }
    
    // 获取Socket.IO实例
    const io = req.app.get('io');
    
    // 初始化服务实例
    const service = initializeZhilianService(io);
    
    // 检查是否已有任务在运行
    const currentStatus = service.getStatus();
    if (currentStatus.browsing.isActive) {
      return res.status(409).json({
        success: false,
        message: '智联招聘智能寻聘任务正在运行中，请等待完成或先停止当前任务'
      });
    }
    
    // 如果VNC可用，创建VNC会话
    let vncSession = null;
    if (isVncAvailable) {
      try {
        vncSession = await vncService.createVncSession({
          resolution: '1920x1080',
          purpose: 'zhilian_recruitment'
        });
        logger.info('VNC会话创建成功', { sessionId: vncSession?.sessionId });
      } catch (vncError) {
        logger.warn('VNC会话创建失败，继续使用普通模式', { error: vncError.message });
      }
    }
    
    // 异步执行浏览任务
    service.startBrowsing(mode, filters, targetCount)
      .then(() => {
        logger.info('智联招聘智能寻聘任务完成');
        if (io) {
          io.emit('zhilianTaskCompleted', {
            success: true,
            message: '智联招聘智能寻聘任务完成',
            status: service.getStatus()
          });
        }
      })
      .catch((error) => {
        logger.error('智联招聘智能寻聘任务失败:', error);
        if (io) {
          io.emit('zhilianTaskError', {
            success: false,
            message: '智联招聘智能寻聘任务失败',
            error: error.message,
            status: service.getStatus()
          });
        }
      });
    
    // 立即返回启动成功响应
    res.json({
      success: true,
      message: '智联招聘智能寻聘任务已启动',
      data: {
        mode,
        filters,
        targetCount,
        status: service.getStatus(),
        vncEnabled: isVncAvailable,
        vncSession: vncSession
      }
    });
    
    logger.info(`智联招聘智能寻聘任务已启动，模式: ${mode}，目标数量: ${targetCount}`);
    
  } catch (error) {
    logger.error('启动智联招聘智能寻聘失败:', error);
    res.status(500).json({
      success: false,
      message: '启动智联招聘智能寻聘失败',
      error: error.message
    });
  }
});

// 移除了专门的搜索候选人接口 /search-candidates
// 现在所有模式（包括搜索）都通过统一的 /start-browsing 接口处理
// 这确保了不同模式的独立性，避免硬编码的搜索逻辑绑定

/**
 * 启动候选人浏览
 * POST /api/zhilian/start-browsing
 */
router.post('/start-browsing', async (req, res) => {
  try {
    logger.info('收到启动智联招聘候选人浏览请求');
    
    const { mode, filters = {}, targetCount = 10 } = req.body;
    
    // 验证参数
    if (!mode) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: mode'
      });
    }
    
    // 支持的模式：智联招聘四种模式
    const supportedModes = ['search', 'recommended', 'communication', 'favorites'];
    if (!supportedModes.includes(mode)) {
      return res.status(400).json({
        success: false,
        message: `不支持的模式: ${mode}，支持的模式: ${supportedModes.join(', ')}`
      });
    }
    
    if (!zhilianService) {
      return res.status(400).json({
        success: false,
        message: '智联招聘服务未初始化，请先调用 /init 接口'
      });
    }
    
    // 检查是否已有任务在运行
    const browsingStatus = zhilianService.getBrowsingStatus();
    if (browsingStatus.isActive) {
      return res.status(409).json({
        success: false,
        message: '候选人浏览任务正在运行中，请等待完成或先停止当前任务'
      });
    }
    
    // 异步执行浏览任务
    zhilianService.startBrowsing(mode, filters, targetCount)
      .then(() => {
        logger.info('智联招聘候选人浏览任务完成');
      })
      .catch((error) => {
        logger.error('智联招聘候选人浏览任务失败:', error);
      });
    
    res.json({
      success: true,
      message: '候选人浏览任务已启动',
      data: {
        mode,
        filters,
        targetCount,
        status: zhilianService.getBrowsingStatus()
      }
    });
    
    logger.info(`智联招聘候选人浏览任务已启动，模式: ${mode}，目标数量: ${targetCount}`);
    
  } catch (error) {
    logger.error('启动智联招聘候选人浏览失败:', error);
    res.status(500).json({
      success: false,
      message: '启动候选人浏览失败',
      error: error.message
    });
  }
});

/**
 * 停止候选人浏览
 * POST /api/zhilian/stop-browsing
 */
router.post('/stop-browsing', async (req, res) => {
  try {
    if (!zhilianService) {
      return res.status(400).json({
        success: false,
        message: '智联招聘服务未初始化'
      });
    }
    
    await zhilianService.stopBrowsing();
    
    res.json({
      success: true,
      message: '候选人浏览已停止',
      status: zhilianService.getStatus()
    });
    
  } catch (error) {
    logger.error('停止智联招聘候选人浏览失败:', error);
    res.status(500).json({
      success: false,
      message: '停止候选人浏览失败',
      error: error.message
    });
  }
});

/**
 * 重置候选人浏览状态
 * POST /api/zhilian/reset-browsing
 */
router.post('/reset-browsing', async (req, res) => {
  try {
    if (!zhilianService) {
      return res.status(400).json({
        success: false,
        message: '智联招聘服务未初始化'
      });
    }
    
    await zhilianService.resetBrowsingStatus();
    
    res.json({
      success: true,
      message: '候选人浏览状态已重置',
      status: zhilianService.getStatus()
    });
    
  } catch (error) {
    logger.error('重置智联招聘候选人浏览状态失败:', error);
    res.status(500).json({
      success: false,
      message: '重置候选人浏览状态失败',
      error: error.message
    });
  }
});

/**
 * 获取智联招聘当前状态
 * GET /api/zhilian/status
 */
router.get('/status', async (req, res) => {
  try {
    if (!zhilianService) {
      return res.json({
        success: true,
        data: {
          status: 'not_initialized',
          initialized: false,
          loggedIn: false,
          hasBrowser: false,
          hasPage: false,
          browser: {
            isOpen: false,
            currentUrl: null
          },
          page: {
            isReady: false,
            title: null
          },
          browsing: {
            isActive: false,
            mode: null,
            progress: {
              processed: 0,
              total: 0,
              percentage: 0
            },
            startTime: null,
            lastActivity: null
          },
          resumeProcessing: {
            isActive: false,
            progress: {
              processed: 0,
              total: 0,
              percentage: 0
            },
            startTime: null,
            lastActivity: null
          }
        }
      });
    }
    
    const status = zhilianService.getFrontendStatus();
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    logger.error('获取智联招聘状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取状态失败',
      error: error.message
    });
  }
});

/**
 * 停止智联招聘智能寻聘
 * POST /api/zhilian/stop
 */
router.post('/stop', async (req, res) => {
  try {
    if (!zhilianService) {
      return res.status(400).json({
        success: false,
        message: '智联招聘服务未初始化'
      });
    }
    
    await zhilianService.stopBrowsing();
    
    res.json({
      success: true,
      message: '智联招聘智能寻聘已停止',
      status: zhilianService.getStatus()
    });
    
  } catch (error) {
    logger.error('停止智联招聘智能寻聘失败:', error);
    res.status(500).json({
      success: false,
      message: '停止智联招聘智能寻聘失败',
      error: error.message
    });
  }
});

/**
 * 获取候选人浏览状态
 * GET /api/zhilian/browsing-status
 */
router.get('/browsing-status', async (req, res) => {
  try {
    if (!zhilianService) {
      return res.json({
        success: true,
        data: {
          isActive: false,
          mode: null,
          progress: {
            processed: 0,
            total: 0,
            percentage: 0
          },
          startTime: null,
          lastActivity: null
        }
      });
    }
    
    const browsingStatus = zhilianService.getBrowsingStatus();
    res.json({
      success: true,
      data: browsingStatus
    });
    
  } catch (error) {
    logger.error('获取智联招聘候选人浏览状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取候选人浏览状态失败',
      error: error.message
    });
  }
});

/**
 * 初始化智联招聘服务
 * POST /api/zhilian/init
 */
router.post('/init', async (req, res) => {
  try {
    logger.info('收到初始化智联招聘服务请求');
    
    // 获取Socket.IO实例
    const io = req.app.get('io');
    
    if (!io) {
      logger.error('Socket.IO实例未找到');
      return res.status(500).json({
        success: false,
        message: 'Socket.IO服务未初始化'
      });
    }
    
    // 初始化服务
    const service = initializeZhilianService(io);
    
    // 初始化浏览器
     await service.initializeBrowser();
    
    logger.info('智联招聘服务初始化成功');
    
    res.json({
      success: true,
      message: '智联招聘服务初始化成功',
      data: {
        status: service.getStatus()
      }
    });
    
  } catch (error) {
    logger.error('初始化智联招聘服务失败:', error);
    res.status(500).json({
      success: false,
      message: '初始化智联招聘服务失败',
      error: error.message
    });
  }
});

/**
 * 关闭智联招聘服务
 * POST /api/zhilian/close
 */
router.post('/close', async (req, res) => {
  try {
    if (!zhilianService) {
      return res.json({
        success: true,
        message: '智联招聘服务未初始化，无需关闭'
      });
    }
    
    await zhilianService.closeBrowser();
    zhilianService = null;
    
    res.json({
      success: true,
      message: '智联招聘服务已关闭'
    });
    
  } catch (error) {
    logger.error('关闭智联招聘服务失败:', error);
    res.status(500).json({
      success: false,
      message: '关闭智联招聘服务失败',
      error: error.message
    });
  }
});

/**
 * 检查登录状态
 * GET /api/zhilian/login-status
 */
router.get('/login-status', async (req, res) => {
  try {
    if (!zhilianService) {
      return res.json({
        success: true,
        data: {
          loggedIn: false,
          message: '服务未初始化'
        }
      });
    }
    
    // 先检查登录状态
    const isLoggedIn = await zhilianService.checkLoginStatus();
    
    // 获取完整的状态信息
    const statusData = zhilianService.getStatus();
    
    res.json({
      success: true,
      data: {
        isLoggedIn: isLoggedIn,
        ...statusData
      }
    });
    
  } catch (error) {
    logger.error('检查智联招聘登录状态失败:', error);
    res.status(500).json({
      success: false,
      message: '检查登录状态失败',
      error: error.message
    });
  }
});

/**
 * 执行特定步骤
 * POST /api/zhilian/execute-step
 * 
 * 请求体参数:
 * {
 *   "step": "open_website" | "check_login" | "initialize_browser"
 * }
 */
router.post('/execute-step', async (req, res) => {
  try {
    const { step } = req.body;
    
    if (!step) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: step'
      });
    }
    
    if (!zhilianService) {
      return res.status(400).json({
        success: false,
        message: '智联招聘服务未初始化'
      });
    }
    
    let result = false;
    
    switch (step) {
      case 'initialize_browser':
        result = await zhilianService.initializeBrowser();
        break;
      case 'open_website':
        result = await zhilianService.navigateToZhilian();
        break;
      case 'check_login':
        result = await zhilianService.checkLoginStatus();
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
        status: zhilianService.getStatus()
      }
    });
    
  } catch (error) {
    logger.error(`执行智联招聘步骤失败:`, error);
    res.status(500).json({
      success: false,
      message: '执行步骤失败',
      error: error.message
    });
  }
});

/**
 * 启动简历处理
 * POST /api/zhilian/start-resume-processing
 */
router.post('/start-resume-processing', async (req, res) => {
  try {
    logger.info('收到启动智联招聘简历处理请求');
    
    if (!zhilianService) {
      return res.status(400).json({
        success: false,
        message: '智联招聘服务未初始化，请先调用 /init 接口'
      });
    }
    
    // 检查是否已有任务在运行
    const currentStatus = zhilianService.getStatus();
    if (currentStatus.resumeProcessing.isActive) {
      return res.status(409).json({
        success: false,
        message: '简历处理任务正在运行中，请等待完成或先停止当前任务'
      });
    }
    
    // 获取Socket.IO实例
    const io = req.app.get('io');
    
    // 异步执行简历处理任务
    zhilianService.startResumeProcessing()
      .then(() => {
        logger.info('智联招聘简历处理任务完成');
        if (io) {
          io.emit('zhilianResumeProcessingCompleted', {
            success: true,
            message: '智联招聘简历处理任务完成',
            status: zhilianService.getStatus()
          });
        }
      })
      .catch((error) => {
        logger.error('智联招聘简历处理任务失败:', error);
        if (io) {
          io.emit('zhilianResumeProcessingError', {
            success: false,
            message: '智联招聘简历处理任务失败',
            error: error.message,
            status: zhilianService.getStatus()
          });
        }
      });
    
    res.json({
      success: true,
      message: '简历处理任务已启动',
      data: {
        status: zhilianService.getStatus()
      }
    });
    
    logger.info('智联招聘简历处理任务已启动');
    
  } catch (error) {
    logger.error('启动智联招聘简历处理失败:', error);
    res.status(500).json({
      success: false,
      message: '启动简历处理失败',
      error: error.message
    });
  }
});

/**
 * 停止简历处理
 * POST /api/zhilian/stop-resume-processing
 */
router.post('/stop-resume-processing', async (req, res) => {
  try {
    if (!zhilianService) {
      return res.status(400).json({
        success: false,
        message: '智联招聘服务未初始化'
      });
    }
    
    await zhilianService.stopResumeProcessing();
    
    res.json({
      success: true,
      message: '简历处理已停止',
      status: zhilianService.getStatus()
    });
    
  } catch (error) {
    logger.error('停止智联招聘简历处理失败:', error);
    res.status(500).json({
      success: false,
      message: '停止简历处理失败',
      error: error.message
    });
  }
});

/**
 * 获取简历处理状态
 * GET /api/zhilian/resume-processing-status
 */
router.get('/resume-processing-status', async (req, res) => {
  try {
    if (!zhilianService) {
      return res.json({
        success: true,
        data: {
          isActive: false,
          progress: {
            processed: 0,
            total: 0,
            percentage: 0
          },
          startTime: null,
          lastActivity: null
        }
      });
    }
    
    const resumeProcessingStatus = zhilianService.getResumeProcessingStatus();
    res.json({
      success: true,
      data: resumeProcessingStatus
    });
    
  } catch (error) {
    logger.error('获取智联招聘简历处理状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取简历处理状态失败',
      error: error.message
    });
  }
});

/**
 * 导航到互动版块（沟通页面）
 * POST /api/zhilian/navigate-to-communication
 */
router.post('/navigate-to-communication', async (req, res) => {
  try {
    logger.info('收到导航到智联招聘互动版块的请求');
    
    // 获取Socket.IO实例
    const io = req.app.get('io');
    
    // 初始化服务实例
    const service = initializeZhilianService(io);
    
    // 检查服务是否已初始化
    if (!service) {
      return res.status(500).json({
        success: false,
        message: '智联招聘服务未初始化'
      });
    }
    
    // 检查浏览器是否已启动
    if (!service.browser || !service.page) {
      return res.status(400).json({
        success: false,
        message: '请先启动智联招聘服务'
      });
    }
    
    // 执行导航到互动版块
    const result = await service.navigateToCommunicationPage();
    
    if (result.success) {
      // 发送成功事件
      if (io) {
        io.emit('zhilianNavigationSuccess', {
          success: true,
          message: '成功导航到互动版块',
          url: result.url
        });
      }
      
      res.json({
        success: true,
        message: '成功导航到互动版块',
        data: {
          url: result.url,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      // 发送失败事件
      if (io) {
        io.emit('zhilianNavigationError', {
          success: false,
          message: result.message || '导航到互动版块失败',
          error: result.error
        });
      }
      
      res.status(500).json({
        success: false,
        message: result.message || '导航到互动版块失败',
        error: result.error
      });
    }
    
  } catch (error) {
    logger.error('导航到智联招聘互动版块失败:', error);
    
    // 发送错误事件
    const io = req.app.get('io');
    if (io) {
      io.emit('zhilianNavigationError', {
        success: false,
        message: '导航到互动版块时发生错误',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '导航到互动版块失败',
      error: error.message
    });
  }
});

/**
 * 统一的模式导航接口
 * POST /api/zhilian/navigate-to-mode
 */
router.post('/navigate-to-mode', async (req, res) => {
  try {
    const { mode, targetCount } = req.body;
    logger.info(`收到导航到智联招聘${mode}模式的请求`);
    
    // 获取Socket.IO实例
    const io = req.app.get('io');
    
    // 初始化服务实例
    const service = initializeZhilianService(io);
    
    // 检查服务是否已初始化
    if (!service) {
      return res.status(500).json({
        success: false,
        message: '智联招聘服务未初始化'
      });
    }
    
    // 检查浏览器是否已启动
    if (!service.browser || !service.page) {
      return res.status(400).json({
        success: false,
        message: '请先启动智联招聘服务'
      });
    }
    
    let result;
    
    switch (mode) {
      case 'communication':
        result = await service.navigateToCommunicationPage();
        break;
      case 'search':
        result = { success: true, message: '搜索模式已激活' };
        break;
      case 'recommended':
        result = { success: true, message: '推荐模式已激活' };
        break;
      case 'favorites':
        result = { success: true, message: '收藏模式已激活' };
        break;
      default:
        result = { success: false, message: '不支持的模式: ' + mode };
        break;
    }
    
    if (result.success) {
      // 发送成功事件
      if (io) {
        io.emit('zhilianNavigationSuccess', {
          success: true,
          message: `成功导航到${mode}模式`,
          mode: mode,
          url: result.url
        });
      }
      
      res.json({
        success: true,
        message: `成功导航到${mode}模式`,
        data: {
          mode: mode,
          url: result.url,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      // 发送失败事件
      if (io) {
        io.emit('zhilianNavigationError', {
          success: false,
          message: result.message || `导航到${mode}模式失败`,
          mode: mode,
          error: result.error
        });
      }
      
      res.status(500).json({
        success: false,
        message: result.message || `导航到${mode}模式失败`,
        error: result.error
      });
    }
    
  } catch (error) {
    logger.error('导航到智联招聘指定模式失败:', error);
    
    // 发送错误事件
    const io = req.app.get('io');
    if (io) {
      io.emit('zhilianNavigationError', {
        success: false,
        message: '导航到指定模式时发生错误',
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: '导航到指定模式失败',
      error: error.message
    });
  }
});

/**
 * 获取筛选配置
 * GET /api/zhilian/filter-config
 */
router.get('/filter-config', async (req, res) => {
  try {
    const filterConfig = {
      education: [
        { value: '不限', label: '不限' },
        { value: '初中及以下', label: '初中及以下' },
        { value: '高中/中专/技校', label: '高中/中专/技校' },
        { value: '大专', label: '大专' },
        { value: '本科', label: '本科' },
        { value: '硕士', label: '硕士' },
        { value: '博士', label: '博士' }
      ],
      experience: [
        { value: '不限', label: '不限' },
        { value: '应届毕业生', label: '应届毕业生' },
        { value: '1年以下', label: '1年以下' },
        { value: '1-3年', label: '1-3年' },
        { value: '3-5年', label: '3-5年' },
        { value: '5-10年', label: '5-10年' },
        { value: '10年以上', label: '10年以上' }
      ],
      salary: [
        { value: '不限', label: '不限' },
        { value: '3K以下', label: '3K以下' },
        { value: '3-5K', label: '3-5K' },
        { value: '5-10K', label: '5-10K' },
        { value: '10-15K', label: '10-15K' },
        { value: '15-25K', label: '15-25K' },
        { value: '25-50K', label: '25-50K' },
        { value: '50K以上', label: '50K以上' }
      ],
      location: [
        { value: '不限', label: '不限' },
        { value: '北京', label: '北京' },
        { value: '上海', label: '上海' },
        { value: '广州', label: '广州' },
        { value: '深圳', label: '深圳' },
        { value: '杭州', label: '杭州' },
        { value: '南京', label: '南京' },
        { value: '武汉', label: '武汉' },
        { value: '成都', label: '成都' },
        { value: '西安', label: '西安' }
      ]
    };
    
    res.json({
      success: true,
      data: filterConfig
    });
    
  } catch (error) {
    logger.error('获取智联招聘筛选配置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取筛选配置失败',
      error: error.message
    });
  }
});

module.exports = {
  router,
  initializeZhilianService
};