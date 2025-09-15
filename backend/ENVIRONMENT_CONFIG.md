# 环境配置管理

本项目采用统一的环境配置管理模块，解决了不同环境下浏览器启动参数不一致的问题。

## 问题背景

之前项目在不同环境下会出现以下问题：
- 本地开发环境未正确设置环境变量，导致浏览器以非headless模式启动
- Zeabur部署环境自动设置环境变量，使用headless模式
- 浏览器启动参数在不同环境下不一致，导致兼容性问题

## 解决方案

### 1. 环境配置模块

创建了统一的环境配置管理模块 `src/config/environmentConfig.js`，包含：

- **环境检测**：自动识别本地、开发、生产、Zeabur等环境
- **配置生成**：根据环境自动生成最优的浏览器启动参数
- **配置验证**：验证环境配置的有效性和一致性

### 2. 启动脚本优化

在 `package.json` 中添加了多个启动脚本：

```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js",
    "start:prod": "NODE_ENV=production node src/index.js",
    "start:zeabur": "NODE_ENV=production ZEABUR_ENVIRONMENT=true node src/index.js",
    "start:headless": "HEADLESS_MODE=true node src/index.js",
    "test:env": "node scripts/test-env-config.js",
    "test:env:prod": "NODE_ENV=production node scripts/test-env-config.js",
    "test:env:zeabur": "NODE_ENV=production ZEABUR_ENVIRONMENT=true node scripts/test-env-config.js"
  }
}
```

### 3. 环境配置文件

- `.env.local`：本地开发环境配置（优先级最高）
- `.env.production`：生产环境配置
- `.env`：默认环境配置

## 使用方法

### 本地开发

1. **默认开发模式**（显示浏览器界面）：
   ```bash
   npm run dev
   # 或
   npm start
   ```

2. **本地无头模式测试**：
   ```bash
   npm run start:headless
   ```

3. **本地生产模式测试**：
   ```bash
   npm run start:prod
   ```

4. **模拟Zeabur环境测试**：
   ```bash
   npm run start:zeabur
   ```

### 环境配置测试

运行环境配置测试脚本，验证配置是否正确：

```bash
# 测试当前环境配置
npm run test:env

# 测试生产环境配置
npm run test:env:prod

# 测试Zeabur环境配置
npm run test:env:zeabur
```

### 自定义配置

1. **修改本地配置**：
   编辑 `backend/.env.local` 文件：
   ```env
   # 设置为生产环境模式
   NODE_ENV=production
   
   # 启用无头模式
   HEADLESS_MODE=true
   
   # 模拟Zeabur环境
   ZEABUR_ENVIRONMENT=true
   ```

2. **临时环境变量**：
   ```bash
   # 临时设置环境变量
   NODE_ENV=production HEADLESS_MODE=true npm start
   ```

## 环境类型说明

### 本地环境 (Local)
- 检测条件：存在 `.env.local` 文件
- 特点：优先级最高，用于本地开发调试
- 浏览器模式：根据 `HEADLESS_MODE` 环境变量决定

### 开发环境 (Development)
- 检测条件：`NODE_ENV !== 'production'` 且非Zeabur环境
- 特点：显示浏览器界面，便于调试
- 浏览器模式：非headless模式

### 生产环境 (Production)
- 检测条件：`NODE_ENV === 'production'`
- 特点：无头模式，性能优化
- 浏览器模式：headless模式

### Zeabur环境 (Zeabur)
- 检测条件：`ZEABUR_ENVIRONMENT` 环境变量存在
- 特点：云端部署环境，容器化运行
- 浏览器模式：headless模式，容器优化参数

## 配置验证

环境配置模块会自动验证：

- ✅ 环境变量设置是否正确
- ✅ 浏览器启动参数是否兼容
- ✅ 平台特定配置是否适用
- ⚠️  潜在的配置冲突或问题

## 故障排除

### 1. 浏览器启动失败

运行环境配置测试：
```bash
npm run test:env
```

检查输出中的错误信息和建议。

### 2. 环境变量未生效

确认环境配置文件加载顺序：
1. `.env.local`（最高优先级）
2. `.env.production`（生产环境）
3. `.env`（默认）

### 3. Mac环境显示问题

如果在Mac环境下遇到GPU相关错误，可以：

1. 使用无头模式：
   ```bash
   npm run start:headless
   ```

2. 或在 `.env.local` 中设置：
   ```env
   HEADLESS_MODE=true
   ```

## 部署说明

### Zeabur部署

Zeabur会自动设置以下环境变量：
- `NODE_ENV=production`
- `ZEABUR_ENVIRONMENT=true`

无需额外配置，系统会自动使用最优的容器化浏览器参数。

### 其他云平台

确保设置正确的环境变量：
```env
NODE_ENV=production
HEADLESS_MODE=true
```

## 更新日志

- **v1.0.0**: 初始版本，基础环境配置管理
- **v1.1.0**: 添加环境配置验证和测试脚本
- **v1.2.0**: 优化浏览器启动参数，支持多平台