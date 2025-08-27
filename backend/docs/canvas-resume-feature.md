# Canvas Resume 内容提取功能

## 功能概述

本功能专门用于识别和提取Boss直聘中`canvas#resume`元素的文字内容。当Boss直聘使用canvas元素来渲染简历内容时，传统的DOM文本提取方法无法获取到canvas中的文字信息，因此需要特殊的处理方式。

## 技术实现

### 支持的提取策略

1. **Data属性提取**
   - 检查canvas元素的`data-text`、`data-content`、`data-resume`属性
   - 这些属性通常包含canvas渲染的原始文本数据

2. **隐藏元素提取**
   - 查找canvas父元素中的隐藏文本元素
   - 支持`display: none`、`visibility: hidden`、`.sr-only`、`.visually-hidden`等隐藏方式

3. **Script数据提取**
   - 扫描页面中的script标签，查找包含简历数据的JSON对象
   - 解析JSON中的`content`、`text`、`resume`字段

### 核心函数

#### `extractCanvasResumeContent(frame)`
用于从iframe中的canvas#resume元素提取文字内容。

```javascript
/**
 * 从canvas#resume元素中提取文字内容
 * @param {Frame} frame - Playwright frame对象
 * @returns {string|null} 提取的文字内容或null
 */
async extractCanvasResumeContent(frame)
```

#### `extractCanvasResumeContentFromPage()`
用于从主页面的canvas#resume元素提取文字内容。

```javascript
/**
 * 从主页面的canvas#resume元素中提取文字内容
 * @returns {string|null} 提取的文字内容或null
 */
async extractCanvasResumeContentFromPage()
```

## 集成方式

### 在iframe中使用

```javascript
// 在extractResumeContentFromIframe函数中
const canvasContent = await this.extractCanvasResumeContent(frame);
if (canvasContent) {
  logger.info(`从canvas#resume提取简历内容成功，长度: ${canvasContent.length}`);
  return canvasContent;
}
```

### 在主页面中使用

```javascript
// 在extractResumeContentFromPage函数中
const canvasContent = await this.extractCanvasResumeContentFromPage();
if (canvasContent) {
  logger.info(`从canvas#resume提取简历内容成功，长度: ${canvasContent.length}`);
  return canvasContent;
}
```

### 在extractAndImportResume中使用

```javascript
// 优先尝试canvas提取，失败后回退到传统DOM提取
const canvasContentFromFrame = await this.extractCanvasResumeContent(frame);
if (canvasContentFromFrame) {
  resumeContent = canvasContentFromFrame;
} else {
  const canvasContentFromPage = await this.extractCanvasResumeContentFromPage();
  if (canvasContentFromPage) {
    resumeContent = canvasContentFromPage;
  }
}
```

## 测试验证

运行测试脚本验证功能：

```bash
node test/canvas-resume-test.js
```

测试覆盖以下场景：
1. Canvas元素带有data-text属性
2. Canvas父元素包含隐藏文本
3. Script标签包含简历数据

## 使用注意事项

1. **优先级策略**：canvas提取优先于传统DOM提取，确保在canvas可用时优先使用
2. **错误处理**：所有提取操作都包含try-catch错误处理，失败时不会影响后续流程
3. **兼容性**：保持与现有DOM提取方式的兼容，作为增强功能而非替代
4. **性能考虑**：canvas提取操作相对轻量，不会显著影响整体性能

## 日志输出

功能运行时会输出详细的日志信息：

```
[INFO] 从canvas#resume提取简历内容成功，长度: 1234
[INFO] 从iframe中的canvas#resume提取简历内容成功，长度: 1234
[INFO] 从主页面的canvas#resume提取简历内容成功，长度: 1234
[ERROR] 从canvas#resume提取内容失败: Error message
```

## 更新历史

- **2024-01-XX**: 初始版本，支持canvas#resume元素的文字内容提取
- 支持data属性、隐藏元素、script数据三种提取策略
- 集成到现有的简历提取流程中
- 添加完整的测试覆盖