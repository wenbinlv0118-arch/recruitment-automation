# 弹窗基础模式 (Modal Base Pattern)

## 概述

弹窗基础模式是一个标准化的右侧抽屉式弹窗实现，提供了流畅的动画效果和一致的用户体验。当弹窗出现时，页面会形成左中右三部分的布局，左侧导航栏保持激活状态，中间内容区域被适当压缩。

## 核心特性

### 1. 布局结构
- **左侧**: 导航栏 (256px 固定宽度)
- **中间**: 主要内容区域 (动态宽度，弹窗出现时被压缩)
- **右侧**: 弹窗区域 (33.33% 宽度)

### 2. 动画效果
- **滑入/滑出**: 使用 `cubic-bezier(0.25, 0.46, 0.45, 0.94)` 缓动函数
- **动画时长**: 0.4s (主要动画) / 0.25s (交互动画)
- **进入动画**: 内容从右侧滑入，带有渐进式延迟
- **悬停效果**: 卡片轻微上移，按钮缩放反馈

### 3. 性能优化
- 使用 `will-change` 属性优化动画性能
- 使用 `transform` 而非改变位置属性
- 添加 `backface-visibility` 和 `perspective` 优化3D变换

## 使用方法

### 1. 基础用法

```jsx
import ModalBasePattern from './components/ModalBasePattern';

function MyComponent() {
  const [visible, setVisible] = useState(false);

  return (
    <ModalBasePattern
      visible={visible}
      onClose={() => setVisible(false)}
      title="我的弹窗"
    >
      <div>弹窗内容</div>
    </ModalBasePattern>
  );
}
```

### 2. 使用样式组件

```jsx
import { BaseCard, BaseActionButton } from './components/ModalBasePattern';

function MyModal() {
  return (
    <ModalBasePattern visible={visible} onClose={onClose} title="标题">
      <BaseCard>
        <h3>卡片标题</h3>
        <p>卡片内容</p>
      </BaseCard>
      
      <BaseActionButton onClick={handleAction}>
        <Icon />
      </BaseActionButton>
    </ModalBasePattern>
  );
}
```

### 3. 在主应用中集成

需要在主应用组件中添加以下样式：

```jsx
// 头部样式
const StyledHeader = styled(Header)`
  width: ${props => props.hasModal ? 'calc(100% - 256px - 33.33%)' : 'calc(100% - 256px)'};
  transition: width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: width;
`;

// 内容区域样式
const StyledContent = styled(Content)`
  width: ${props => props.hasModal ? 'calc(100% - 256px - 33.33%)' : 'calc(100% - 256px)'};
  transition: width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: width;
`;

// 输入框样式
const InputContainer = styled.div`
  width: ${props => props.hasModal ? 'calc(100% - 256px - 33.33%)' : 'calc(100% - 256px)'};
  transition: width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  will-change: width;
`;
```

## 样式规范

### 1. 动画参数
```css
/* 主要动画 */
transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);

/* 交互动画 */
transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);

/* 进入动画 */
@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translateX(50px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}
```

### 2. 布局参数
```css
/* 弹窗宽度 */
width: 33.33%;

/* 中间内容区域宽度 */
width: calc(100% - 256px - 33.33%);

/* 左侧导航栏宽度 */
width: 256px;
```

### 3. 性能优化属性
```css
will-change: transform;
backface-visibility: hidden;
perspective: 1000px;
```

## 组件API

### ModalBasePattern Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| visible | boolean | false | 控制弹窗显示/隐藏 |
| onClose | function | - | 关闭弹窗的回调函数 |
| title | string | - | 弹窗标题 |
| children | ReactNode | - | 弹窗内容 |
| dataAttribute | string | "base-drawer" | 用于DOM查询的data属性 |

### 导出的样式组件

- `BaseDrawer`: 主容器
- `BaseDrawerHeader`: 头部区域
- `BaseDrawerTitle`: 标题组件
- `BaseCloseButton`: 关闭按钮
- `BaseDrawerBody`: 内容区域
- `BaseCard`: 基础卡片样式
- `BaseActionButton`: 基础操作按钮

## 最佳实践

### 1. 状态管理
```jsx
const [modalVisible, setModalVisible] = useState(false);

// 传递给主应用组件
<StyledHeader hasModal={modalVisible}>
<StyledContent hasModal={modalVisible}>
<InputContainer hasModal={modalVisible}>
```

### 2. 内容组织
- 使用 `BaseCard` 包装主要内容
- 使用 `BaseActionButton` 创建操作按钮
- 内容按顺序排列，自动应用进入动画

### 3. 性能考虑
- 避免在弹窗内容中使用大量DOM元素
- 使用 `React.memo` 优化子组件渲染
- 合理使用 `useCallback` 和 `useMemo`

## 示例实现

参考 `ResumeRecommendationModal.js` 的实现，展示了如何使用弹窗基础模式创建具体的业务组件。

## 注意事项

1. 确保主应用组件正确传递 `hasModal` 属性
2. 弹窗内容会自动应用进入动画，无需手动处理
3. 关闭动画有50ms延迟，确保动画完成
4. 样式组件可以单独导入使用，也可以组合使用 