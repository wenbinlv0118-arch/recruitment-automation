# Supabase 配置指南

本指南将帮助您配置 Supabase 数据库，并将现有的 SQLite 数据库迁移到 Supabase。

## 📋 前置条件

- Node.js 16+ 和 npm
- Supabase 账户（免费）
- 现有的项目代码

## 🚀 快速开始

### 1. 安装依赖

如果还没有安装 Supabase 依赖，请运行：

```bash
node install-supabase.js
```

### 2. 创建 Supabase 项目

1. 访问 [Supabase Dashboard](https://supabase.com/dashboard)
2. 点击 "New Project"
3. 选择组织和填写项目信息：
   - **Name**: `recruitment-automation`
   - **Database Password**: 创建一个强密码
   - **Region**: 选择离您最近的区域
4. 等待项目创建完成（通常需要 2-3 分钟）

### 3. 获取项目配置信息

项目创建完成后，在项目设置中获取以下信息：

1. 进入 **Settings** → **API**
2. 复制以下信息：
   - **Project URL** (类似: `https://xxxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (仅用于服务端)

### 4. 配置环境变量

复制 `.env.example` 文件为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入您的 Supabase 配置：

```env
# 数据库配置
DATABASE_TYPE=supabase

# Supabase 配置
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 5. 执行数据库迁移

#### 方法一：使用 Supabase Dashboard（推荐）

1. 在 Supabase Dashboard 中，进入 **SQL Editor**
2. 运行设置脚本查看迁移 SQL：

```bash
npm run supabase:migrate
```

3. 复制输出的 SQL 脚本到 SQL Editor 中执行

#### 方法二：使用迁移脚本

```bash
# 查看迁移脚本内容
npm run supabase:migrate

# 手动复制 SQL 到 Supabase Dashboard 执行
```

### 6. 测试连接

```bash
# 测试 Supabase 连接
npm run supabase:test
```

如果连接成功，您将看到：
- ✅ Supabase 连接成功
- 数据库基本信息
- 测试查询结果

## 📊 数据库结构

迁移脚本将创建以下表：

### 核心表
- `companies` - 公司信息
- `positions` - 职位信息
- `tasks` - 任务管理

### 知识库表
- `documents` - 文档存储
- `document_chunks` - 文档分块
- `retrieval_logs` - 检索日志

### 简历管理表
- `resumes` - 简历主表
- `resume_basic_info` - 基本信息
- `resume_job_intention` - 求职意向
- `resume_work_experiences` - 工作经历
- `resume_education` - 教育背景
- `resume_projects` - 项目经历
- `resume_skills` - 技能信息

### 搜索和分析表
- `company_search_history` - 公司搜索历史
- `company_analysis_reports` - 公司分析报告

## 🔄 数据迁移

如果您有现有的 SQLite 数据需要迁移：

```bash
# 进入后端目录
cd backend

# 运行迁移脚本
npm run db:migrate
```

迁移脚本将：
1. 检测现有 SQLite 数据库
2. 读取所有表数据
3. 将数据导入到 Supabase
4. 验证迁移结果

## 🛠️ 开发工具

### 可用的 npm 脚本

```bash
# 配置 Supabase 项目
npm run supabase:setup

# 测试 Supabase 连接
npm run supabase:test

# 查看迁移脚本
npm run supabase:migrate

# 执行数据迁移（在 backend 目录下）
cd backend && npm run db:migrate
```

### 数据库适配器

项目使用数据库适配器模式，支持：
- SQLite（开发环境）
- Supabase（生产环境）

通过 `DATABASE_TYPE` 环境变量控制：

```env
# 使用 SQLite
DATABASE_TYPE=sqlite

# 使用 Supabase
DATABASE_TYPE=supabase
```

## 🔧 故障排除

### 常见问题

#### 1. 连接失败

**错误**: `Failed to connect to Supabase`

**解决方案**:
- 检查 `SUPABASE_URL` 和 `SUPABASE_ANON_KEY` 是否正确
- 确认 Supabase 项目状态正常
- 检查网络连接

#### 2. 权限错误

**错误**: `Permission denied`

**解决方案**:
- 检查 `SUPABASE_SERVICE_ROLE_KEY` 是否正确
- 确认使用了 service_role key 而不是 anon key

#### 3. 表不存在

**错误**: `Table 'xxx' doesn't exist`

**解决方案**:
- 确认已执行数据库迁移脚本
- 在 Supabase Dashboard 中检查表是否创建成功

#### 4. 迁移失败

**错误**: 数据迁移过程中出错

**解决方案**:
- 检查 SQLite 数据库文件是否存在
- 确认 Supabase 连接正常
- 查看详细错误日志

### 调试模式

启用调试日志：

```env
DEBUG=supabase:*
LOG_LEVEL=debug
```

## 📚 相关资源

- [Supabase 官方文档](https://supabase.com/docs)
- [Supabase JavaScript 客户端](https://supabase.com/docs/reference/javascript)
- [PostgreSQL 文档](https://www.postgresql.org/docs/)
- [项目 API 文档](./API_DOCUMENTATION.md)

## 🆘 获取帮助

如果遇到问题：

1. 查看本文档的故障排除部分
2. 检查 Supabase Dashboard 中的日志
3. 运行 `npm run supabase:test` 诊断连接问题
4. 查看项目 Issues 或创建新的 Issue

---

**注意**: 请妥善保管您的 Supabase 密钥，不要将其提交到版本控制系统中。