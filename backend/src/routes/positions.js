const express = require('express');
const router = express.Router();
const PositionService = require('../services/positionService');

// 获取所有岗位
router.get('/', async (req, res) => {
  try {
    const positions = await PositionService.getPositions();
    res.json({ success: true, data: positions });
  } catch (error) {
    console.error('获取岗位列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 根据ID获取岗位
router.get('/:id', async (req, res) => {
  try {
    const position = await PositionService.getPositionById(req.params.id);
    if (!position) {
      return res.status(404).json({ success: false, error: '岗位不存在' });
    }
    res.json({ success: true, data: position });
  } catch (error) {
    console.error('获取岗位详情失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 通过对话创建岗位
router.post('/create-from-dialog', async (req, res) => {
  try {
    const { userMessage } = req.body;
    
    if (!userMessage) {
      return res.status(400).json({ success: false, error: '用户消息不能为空' });
    }

    const result = await PositionService.createPositionFromDialog(userMessage);
    res.json(result);
  } catch (error) {
    console.error('通过对话创建岗位失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 更新岗位信息
router.put('/:id', async (req, res) => {
  try {
    const positionId = req.params.id;
    const updatedData = req.body;
    
    if (!positionId) {
      return res.status(400).json({ success: false, error: '岗位ID不能为空' });
    }

    const result = await PositionService.updatePosition(positionId, updatedData);
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('更新岗位失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 删除岗位
router.delete('/:id', async (req, res) => {
  try {
    const positionId = req.params.id;
    
    if (!positionId) {
      return res.status(400).json({ success: false, error: '岗位ID不能为空' });
    }

    const result = await PositionService.deletePosition(positionId);
    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error) {
    console.error('删除岗位失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router; 