const express = require('express');
const router = express.Router();
const CompanySearchService = require('../services/companySearchService');

// 创建公司搜索服务实例
const companySearchService = new CompanySearchService();

/**
 * 启动公司搜索流程
 */
router.post('/start', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: '手机号不能为空'
      });
    }

    // 检查服务状态
    const status = companySearchService.getStatus();
    if (status.isActive) {
      return res.status(400).json({
        success: false,
        error: '公司搜索服务正在运行中'
      });
    }

    // 检查与其他服务的冲突
    const conflicts = await companySearchService.checkConflicts();
    if (conflicts.hasConflict) {
      return res.status(400).json({
        success: false,
        error: conflicts.message
      });
    }

    // 启动搜索流程
    await companySearchService.startCompanySearch(req.io, { phoneNumber });
    
    res.json({
      success: true,
      message: '公司搜索服务启动成功',
      sessionId: status.sessionId
    });

  } catch (error) {
    console.error('启动公司搜索失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 执行公司搜索
 */
router.post('/search', async (req, res) => {
  try {
    const { filterConfig } = req.body;
    
    if (!filterConfig) {
      return res.status(400).json({
        success: false,
        error: '筛选条件不能为空'
      });
    }

    // 检查服务状态
    const status = companySearchService.getStatus();
    if (!status.isActive) {
      return res.status(400).json({
        success: false,
        error: '公司搜索服务未启动'
      });
    }

    // 执行搜索
    const result = await companySearchService.executeSearch(req.io, filterConfig);
    
    res.json({
      success: true,
      message: '搜索完成',
      data: result
    });

  } catch (error) {
    console.error('执行公司搜索失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取搜索状态
 */
router.get('/status', (req, res) => {
  try {
    const status = companySearchService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('获取搜索状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 停止搜索服务
 */
router.post('/stop', async (req, res) => {
  try {
    await companySearchService.cleanup();
    
    res.json({
      success: true,
      message: '公司搜索服务已停止'
    });

  } catch (error) {
    console.error('停止公司搜索失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取筛选选项
 */
router.get('/filter-options', (req, res) => {
  try {
    const options = {
      industries: [
        '互联网', '金融', '教育', '医疗', '制造业', '房地产', '电商', '游戏', 'AI/人工智能', 
        '区块链', '新能源', '生物科技', '咨询', '广告', '媒体', '旅游', '餐饮', '物流'
      ],
      locations: [
        '北京', '上海', '深圳', '广州', '杭州', '南京', '苏州', '成都', '武汉', '西安',
        '天津', '重庆', '青岛', '大连', '厦门', '无锡', '宁波', '佛山', '东莞', '长沙'
      ],
      companySizes: [
        '0-20人', '20-99人', '100-499人', '500-999人', '1000-9999人', '10000人以上'
      ],
      salaryRanges: [
        '3k以下', '3k-5k', '5k-10k', '10k-15k', '15k-30k', '30k-50k', '50k以上'
      ],
      experienceLevels: [
        '应届毕业生', '1年以下', '1-3年', '3-5年', '5-10年', '10年以上'
      ]
    };

    res.json({
      success: true,
      data: options
    });

  } catch (error) {
    console.error('获取筛选选项失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 保存用户筛选偏好
 */
router.post('/save-preferences', async (req, res) => {
  try {
    const { userId, preferences } = req.body;
    
    if (!userId || !preferences) {
      return res.status(400).json({
        success: false,
        error: '用户ID和偏好设置不能为空'
      });
    }

    // 这里可以添加数据库保存逻辑
    // 暂时返回成功
    res.json({
      success: true,
      message: '筛选偏好保存成功'
    });

  } catch (error) {
    console.error('保存筛选偏好失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * 获取用户筛选偏好
 */
router.get('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: '用户ID不能为空'
      });
    }

    // 这里可以添加数据库查询逻辑
    // 暂时返回空数据
    res.json({
      success: true,
      data: null
    });

  } catch (error) {
    console.error('获取筛选偏好失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
