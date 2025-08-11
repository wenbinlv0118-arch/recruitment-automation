# 弹窗基础模式 (Modal Base Pattern)

## 📋 概述

弹窗基础模式是一个标准化的右侧抽屉式弹窗实现，提供了流畅的动画效果和一致的用户体验。当弹窗出现时，页面会形成左中右三部分的布局，左侧导航栏保持激活状态，中间内容区域被适当压缩。

## ✨ 核心特性

- 🎯 **三部分布局**: 左侧导航栏 + 中间内容区域 + 右侧弹窗
- 🎨 **流畅动画**: 使用优化的缓动函数和性能优化
- 📱 **响应式设计**: 自适应不同屏幕尺寸
- ⚡ **性能优化**: 使用CSS硬件加速和优化属性
- 🔧 **易于使用**: 提供完整的组件和样式导出

## 🚀 快速开始

### 1. 安装依赖

确保项目中已安装 `styled-components` 和 `antd`。

### 2. 基础使用

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

### 3. 在主应用中集成

需要在主应用组件中添加布局样式：

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

## 📁 文件结构

```
frontend/
├── src/
│   ├── components/
│   │   ├── ModalBasePattern.js          # 弹窗基础模式组件
│   │   └── ResumeRecommendationModal.js # 实际应用示例
│   ├── examples/
│   │   └── ModalBasePatternExample.js   # 使用示例
│   └── docs/
│       └── ModalBasePattern.md          # 详细文档
└── README_ModalBasePattern.md           # 本文件
```

## 🎨 样式组件

弹窗基础模式提供了以下样式组件：

- `BaseDrawer`: 主容器
- `BaseDrawerHeader`: 头部区域
- `BaseDrawerTitle`: 标题组件
- `BaseCloseButton`: 关闭按钮
- `BaseDrawerBody`: 内容区域
- `BaseCard`: 基础卡片样式
- `BaseActionButton`: 基础操作按钮

## 📖 使用示例

### 用户列表弹窗

```jsx
import { BaseCard, BaseActionButton } from './components/ModalBasePattern';

const UserListModal = ({ visible, onClose, users }) => {
  return (
    <ModalBasePattern visible={visible} onClose={onClose} title="用户列表">
      {users.map(user => (
        <BaseCard key={user.id}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Avatar icon={<UserOutlined />} />
            <div style={{ marginLeft: '12px' }}>
              <div>{user.name}</div>
              <div style={{ color: '#666' }}>{user.email}</div>
            </div>
            <BaseActionButton style={{ marginLeft: 'auto' }}>
              <LikeOutlined />
            </BaseActionButton>
          </div>
        </BaseCard>
      ))}
    </ModalBasePattern>
  );
};
```

### 设置面板弹窗

```jsx
const SettingsModal = ({ visible, onClose }) => {
  return (
    <ModalBasePattern visible={visible} onClose={onClose} title="系统设置">
      <BaseCard>
        <h3>通知设置</h3>
        <p>配置系统通知偏好</p>
        <div style={{ marginTop: '12px' }}>
          <Tag color="blue">邮件通知</Tag>
          <Tag color="green">短信通知</Tag>
        </div>
      </BaseCard>
    </ModalBasePattern>
  );
};
```

## ⚙️ 配置参数

### 动画参数

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

### 布局参数

```css
/* 弹窗宽度 */
width: 33.33%;

/* 中间内容区域宽度 */
width: calc(100% - 256px - 33.33%);

/* 左侧导航栏宽度 */
width: 256px;
```

## 🔧 API 参考

### ModalBasePattern Props

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| visible | boolean | false | 控制弹窗显示/隐藏 |
| onClose | function | - | 关闭弹窗的回调函数 |
| title | string | - | 弹窗标题 |
| children | ReactNode | - | 弹窗内容 |
| dataAttribute | string | "base-drawer" | 用于DOM查询的data属性 |

## 💡 最佳实践

1. **状态管理**: 确保正确传递 `hasModal` 属性给主应用组件
2. **内容组织**: 使用 `BaseCard` 包装主要内容，使用 `BaseActionButton` 创建操作按钮
3. **性能优化**: 避免在弹窗内容中使用大量DOM元素
4. **动画效果**: 内容会自动应用进入动画，无需手动处理

## 🎯 使用场景

- 用户列表展示
- 设置面板
- 文档预览
- 数据详情查看
- 操作确认面板
- 表单编辑界面

## 📝 注意事项

1. 确保主应用组件正确传递 `hasModal` 属性
2. 弹窗内容会自动应用进入动画，无需手动处理
3. 关闭动画有50ms延迟，确保动画完成
4. 样式组件可以单独导入使用，也可以组合使用

## 🔄 未来扩展

- 支持自定义弹窗宽度
- 添加更多动画效果选项
- 支持弹窗位置自定义
- 添加拖拽调整大小功能

---

**当您提到"弹窗基础模式"时，请参考此文档和 `ModalBasePattern.js` 组件的实现。** 