# 向量化服务使用指南

## 🚀 概述

本项目提供了三种文本向量化方案，无需依赖 Hugging Face API 即可实现高质量的文本向量化：

1. **本地模型** (推荐) - 使用 `@xenova/transformers` 在本地运行向量化模型
2. **Hugging Face API** - 使用 Hugging Face 云服务
3. **模拟模式** - 基于关键词的轻量级向量化

## 📋 配置选项

### 环境变量配置

在 `.env` 文件中配置以下选项：

```bash
# 向量化模式：local(本地模型) | huggingface(API) | mock(模拟模式)
VECTORIZATION_MODE=local

# 是否强制使用本地模型（忽略API配置）
USE_LOCAL_MODEL=true

# Hugging Face API配置（可选）
HUGGINGFACE_API_KEY=your_huggingface_api_key_here
```

### 模式优先级

1. 如果设置 `USE_LOCAL_MODEL=true`，强制使用本地模型
2. 如果配置了有效的 `HUGGINGFACE_API_KEY`，使用 API 模式
3. 否则使用模拟模式

## 🔧 安装依赖

```bash
cd backend
npm install
```

## 🧪 测试向量化服务

```bash
node test-vector-service.js
```

## 📊 性能对比

| 模式 | 准确性 | 速度 | 资源消耗 | 网络依赖 | 推荐场景 |
|------|--------|------|----------|----------|----------|
| 本地模型 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ❌ | 生产环境 |
| Hugging Face API | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | 开发测试 |
| 模拟模式 | ⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ❌ | 快速原型 |

## 🎯 使用示例

### 基本使用

```javascript
const VectorService = require('./src/services/vectorService');

const vectorService = new VectorService();

// 单个文本向量化
const embedding = await vectorService.getEmbeddings('招聘前端开发工程师');

// 批量文本向量化
const embeddings = await vectorService.getEmbeddings([
  '招聘前端开发工程师',
  '需要React和Vue.js经验',
  'Python后端开发岗位'
]);

// 存储文档向量
await vectorService.storeDocumentVectors(textChunks, 'doc-1', {
  title: '招聘文档',
  category: '技术岗位'
});

// 相似度检索
const results = await vectorService.retrieveSimilar('前端开发', 5);

// 混合搜索
const hybridResults = await vectorService.hybridSearch('前端开发', 5);
```

### 高级功能

```javascript
// 获取服务统计信息
const stats = vectorService.getStats();
console.log('向量化模式:', stats.useMockMode ? '模拟模式' : '真实模式');
console.log('总向量数:', stats.totalEmbeddings);

// 删除文档向量
await vectorService.deleteDocumentVectors('doc-1');

// 清空所有数据
vectorService.clear();
```

## 🔍 模型信息

### 本地模型
- **模型名称**: `sentence-transformers/all-MiniLM-L6-v2`
- **向量维度**: 384
- **首次下载**: 约 90MB
- **内存占用**: 约 200MB

### 模型下载
首次使用本地模型时，系统会自动下载模型文件到：
- macOS/Linux: `~/.cache/huggingface/hub/`
- Windows: `%USERPROFILE%\.cache\huggingface\hub\`

## ⚠️ 注意事项

1. **首次使用**: 本地模型首次启动需要下载模型文件，请确保网络连接正常
2. **内存使用**: 本地模型会占用约 200MB 内存，请确保系统资源充足
3. **模型缓存**: 模型文件会缓存在本地，后续启动无需重新下载
4. **回退机制**: 如果本地模型初始化失败，系统会自动回退到模拟模式

## 🛠️ 故障排除

### 本地模型初始化失败
```bash
# 检查网络连接
ping huggingface.co

# 清理模型缓存
rm -rf ~/.cache/huggingface/hub/

# 重新安装依赖
npm install @xenova/transformers
```

### 内存不足
```bash
# 增加 Node.js 内存限制
node --max-old-space-size=4096 test-vector-service.js
```

### 网络问题
如果无法访问 Hugging Face，可以：
1. 使用代理
2. 切换到模拟模式
3. 使用离线模型文件

## 📈 性能优化

1. **批量处理**: 尽量使用批量向量化而不是单个处理
2. **缓存结果**: 对重复文本进行缓存
3. **异步处理**: 使用异步方式避免阻塞主线程
4. **内存管理**: 定期清理不需要的向量数据

## 🔄 迁移指南

### 从 Hugging Face API 迁移到本地模型

1. 设置环境变量：
```bash
USE_LOCAL_MODEL=true
VECTORIZATION_MODE=local
```

2. 重启服务：
```bash
npm run dev
```

3. 验证迁移：
```bash
node test-vector-service.js
```

### 从模拟模式升级到本地模型

1. 安装依赖：
```bash
npm install @xenova/transformers
```

2. 配置环境变量：
```bash
USE_LOCAL_MODEL=true
```

3. 重启服务并测试

## 📞 技术支持

如果遇到问题，请检查：
1. 环境变量配置是否正确
2. 网络连接是否正常
3. 系统资源是否充足
4. 依赖包是否正确安装

更多信息请参考项目文档或提交 Issue。 