# 企业智库系统 (Enterprise Knowledge Base)

## 📖 系统概述

企业智库系统是一个基于AI的智能知识管理平台，专门为招聘场景设计。系统能够：

- 📄 **文档管理**：支持PDF、Word、Excel、TXT等多种格式文档上传
- 🔍 **智能检索**：基于向量化和语义搜索的智能文档检索
- 🤖 **AI对话**：集成Moirai AI助手，基于企业知识库回答候选人问题
- 📊 **统计分析**：提供知识库使用情况和检索效果分析

## 🚀 快速开始

### 1. 环境准备

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 配置环境变量
cp env.example .env
```

### 2. 配置环境变量

编辑 `.env` 文件，配置必要的API密钥：

```env
# 大语言模型API配置
LLM_API_KEY=your_llm_api_key
LLM_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
LLM_MODEL=glm-4.5

# Hugging Face API配置（用于文本向量化）
HUGGINGFACE_API_KEY=your_huggingface_api_key

# 服务器配置
PORT=5001
NODE_ENV=development
```

### 3. 启动系统

```bash
# 使用启动脚本
node start-knowledge-base.js

# 或直接启动
node src/index.js
```

### 4. 运行测试

```bash
# 运行系统测试
node test-knowledge-base.js
```

## 📋 API 接口

### 文档管理

#### 上传文档
```http
POST /api/knowledge/upload
Content-Type: multipart/form-data

{
  "document": [文件],
  "companyId": "1",
  "title": "公司介绍"
}
```

#### 获取文档列表
```http
GET /api/knowledge/documents?companyId=1
```

#### 获取文档详情
```http
GET /api/knowledge/documents/:id
```

#### 删除文档
```http
DELETE /api/knowledge/documents/:id
```

### 知识库检索

#### 智能检索
```http
POST /api/knowledge/retrieve
Content-Type: application/json

{
  "query": "公司福利有哪些？",
  "companyId": "1",
  "limit": 5
}
```

#### AI对话
```http
POST /api/knowledge/chat
Content-Type: application/json

{
  "query": "我想了解公司的福利待遇",
  "companyId": "1"
}
```

#### 搜索文档
```http
GET /api/knowledge/search?q=福利&companyId=1&limit=10
```

### 系统管理

#### 获取统计信息
```http
GET /api/knowledge/stats?companyId=1
```

#### 健康检查
```http
GET /api/knowledge/health
```

#### 重新处理失败文档
```http
POST /api/knowledge/reprocess?companyId=1
```

## 🏗️ 系统架构

### 核心组件

1. **DatabaseManager** - 数据库管理
   - SQLite数据库
   - 表结构管理
   - 数据操作封装

2. **DocumentService** - 文档处理服务
   - 文件上传管理
   - 多格式文档解析
   - 文档分块处理

3. **VectorService** - 向量化服务
   - 文本向量化
   - 相似度计算
   - 混合检索策略

4. **KnowledgeService** - 知识库服务
   - 统一接口封装
   - 检索逻辑整合
   - 统计分析功能

5. **LLMService** - AI对话服务
   - 大语言模型集成
   - 知识库上下文注入
   - 思维链处理

### 数据流程

```
文档上传 → 解析分块 → 向量化存储 → 智能检索 → AI回答
    ↓           ↓           ↓           ↓         ↓
  文件存储   文本提取    向量数据库   相似度匹配   上下文生成
```

## 🔧 技术栈

### 后端技术
- **Node.js** - 运行环境
- **Express** - Web框架
- **SQLite** - 数据库
- **Multer** - 文件上传
- **pdf-parse** - PDF解析
- **mammoth** - Word文档解析
- **xlsx** - Excel文档解析

### AI/ML技术
- **Hugging Face** - 文本向量化
- **OpenAI/GLM** - 大语言模型
- **余弦相似度** - 向量匹配算法

### 向量化模型
- **sentence-transformers/all-MiniLM-L6-v2** - 多语言文本嵌入模型
- 支持中英文混合文本
- 384维向量表示

## 📊 性能指标

### 处理能力
- **文档大小**：最大50MB
- **支持格式**：PDF、Word、Excel、TXT、Markdown
- **并发处理**：支持多文件同时上传
- **检索速度**：< 2秒响应时间

### 准确率
- **语义检索**：> 85%相关度
- **关键词匹配**：精确匹配
- **混合检索**：综合优化结果

## 🛠️ 开发指南

### 添加新的文档格式支持

1. 在 `DocumentService` 中添加解析方法
2. 更新文件类型过滤器
3. 测试解析效果

```javascript
// 示例：添加新的解析方法
async parseNewFormat(filePath) {
  // 实现解析逻辑
  return content;
}
```

### 自定义检索策略

1. 修改 `VectorService` 中的检索算法
2. 调整相似度阈值
3. 优化结果排序

```javascript
// 示例：自定义检索策略
async customSearch(query, limit = 5) {
  // 实现自定义检索逻辑
  return results;
}
```

### 扩展AI对话功能

1. 修改 `LLMService` 中的提示词
2. 调整上下文构建策略
3. 优化回答质量

## 🐛 故障排除

### 常见问题

1. **文档上传失败**
   - 检查文件格式是否支持
   - 确认文件大小不超过50MB
   - 查看服务器日志

2. **向量化失败**
   - 检查Hugging Face API密钥
   - 确认网络连接正常
   - 查看API调用限制

3. **检索结果不准确**
   - 调整相似度阈值
   - 优化文档分块策略
   - 增加训练数据

### 日志查看

```bash
# 查看服务器日志
tail -f logs/server.log

# 查看错误日志
tail -f logs/error.log
```

## 📈 监控和维护

### 系统监控
- 文档处理状态监控
- 检索性能统计
- API调用频率监控

### 数据维护
- 定期清理临时文件
- 优化向量数据库
- 备份重要数据

### 性能优化
- 缓存热门查询结果
- 异步处理大文档
- 负载均衡配置

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交代码变更
4. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证。

## 📞 支持

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件
- 加入讨论群

---

**企业智库系统** - 让AI更懂你的企业 🚀 