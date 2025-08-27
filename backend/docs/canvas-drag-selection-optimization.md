# Canvas拖拽选区优化说明

## 概述

本文档说明了对拖拽选区服务的优化，确保拖拽操作严格限制在`canvas#resume`元素区域内，避免选择到canvas下方的其他内容。

## 问题背景

用户反馈在Boss直聘简历页面使用拖拽选区功能时，会意外复制到canvas下方的"其他相似经历的牛人"等无关内容。这些内容位于`div.resume-anonymous-geek-card.v2`元素中，不应该被包含在简历内容中。

## Canvas元素信息

```html
<canvas id="resume" width="1800" height="1610" style="width: 900px; height: 805px; transform: translateY(608px); cursor: default;"></canvas>
```

- **元素ID**: `resume`
- **实际尺寸**: 1800x1610像素
- **显示尺寸**: 900x805像素
- **位置变换**: `translateY(608px)`

## 优化措施

### 1. 严格的坐标计算

```javascript
// 计算拖拽起点和终点坐标（严格限制在canvas区域内）
const startX = boundingBox.x + margin;
const startY = boundingBox.y + margin;
const endX = boundingBox.x + boundingBox.width - margin;
const endY = boundingBox.y + boundingBox.height - margin;

// 验证拖拽坐标的有效性
if (startX >= endX || startY >= endY) {
  throw new Error(`无效的拖拽坐标范围`);
}
```

### 2. 增强的拖拽操作

- 添加坐标范围验证
- 增加拖拽范围大小检查
- 添加操作间隔等待时间
- 详细的日志记录

### 3. 内容过滤机制

在DOM提取方法中添加了严格的内容过滤：

```javascript
// 需要排除的选择器
const excludeSelectors = [
  '.resume-anonymous-geek-card',
  'div.resume-anonymous-geek-card.v2',
  '[class*="anonymous"]',
  '[class*="similar"]',
  '[class*="recommend"]',
  '[class*="other"]',
  '[class*="geek-card"]'
];

// 关键词过滤
if (!text.includes('其他相似经历') && 
    !text.includes('牛人') && 
    !text.includes('推荐')) {
  return text.trim();
}
```

## 技术实现

### 核心方法优化

1. **`copyResumeByDragSelection`**: 主要的拖拽选区复制方法
   - 严格的canvas边界框获取
   - 精确的坐标计算
   - 详细的日志记录

2. **`performDragSelection`**: 拖拽操作执行方法
   - 坐标有效性验证
   - 拖拽范围大小检查
   - 操作间隔优化

3. **`copySelectedContent`**: 内容复制方法
   - 多种复制策略
   - 严格的内容过滤
   - 排除无关元素

## 测试验证

运行集成测试验证优化效果：

```bash
node test/drag-selection-integration-test.js
```

测试结果：
- ✅ 拖拽选区服务初始化
- ✅ 拖拽选区优先级验证
- ✅ 内容过滤功能
- ✅ 服务清理功能

## 使用说明

### 调用示例

```javascript
const dragText = await dragSelectionService.copyResumeByDragSelection(page, {
  frameSelector: 'iframe[src*="c-resume"]',
  canvasSelector: 'canvas#resume',
  margin: 5,
  dragSteps: 30,
  waitTime: 500,
  checkPermissions: true
});
```

### 参数说明

- `frameSelector`: iframe选择器（如果简历在iframe中）
- `canvasSelector`: canvas元素选择器
- `margin`: 拖拽边距（像素）
- `dragSteps`: 拖拽平滑步数
- `waitTime`: 操作等待时间（毫秒）
- `checkPermissions`: 是否检查剪贴板权限

## 注意事项

1. **严格区域限制**: 拖拽操作严格限制在canvas元素边界内
2. **内容过滤**: 自动过滤"其他相似经历的牛人"等无关内容
3. **错误处理**: 完善的错误处理和日志记录
4. **性能优化**: 合理的等待时间和操作间隔

## 更新日志

- **2024-01-XX**: 初始版本，实现基础拖拽选区功能
- **2024-01-XX**: 优化canvas区域限制，添加内容过滤机制
- **2024-01-XX**: 增强错误处理和日志记录