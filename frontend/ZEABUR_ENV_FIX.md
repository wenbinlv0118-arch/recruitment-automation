# Zeabur环境变量修复指南

## 🚨 问题诊断

你在Zeabur控制台中发现了错误的环境变量配置：
```
VITE_API_BASE_URL=https://recruitment-automation-backend.zeabur.app
VITE_APP_VERSION=1.0.0
```

**问题**: React应用无法识别 `VITE_` 前缀的环境变量！

## ✅ 正确的配置

### 在Zeabur控制台中设置以下环境变量：

```bash
# 🔧 必需的React环境变量
REACT_APP_API_BASE_URL=https://recruitment-automation-backend.zeabur.app
REACT_APP_SOCKET_URL=wss://recruitment-automation-backend.zeabur.app
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key

# 🔧 应用配置
REACT_APP_MAX_FILE_SIZE=10485760
REACT_APP_ALLOWED_FILE_TYPES=.pdf,.doc,.docx,.txt
REACT_APP_THEME=light
REACT_APP_LANGUAGE=zh-CN
REACT_APP_TIMEZONE=Asia/Shanghai
REACT_APP_VERSION=1.0.0

# 🔧 功能开关
REACT_APP_ENABLE_SERVICE_WORKER=true
REACT_APP_ENABLE_CSP=true
REACT_APP_CACHE_DURATION=3600000

# 🔧 Zeabur部署配置
ZBPACK_SPA=true
NODE_ENV=production
```

## 🗑️ 需要删除的错误变量

在Zeabur控制台中删除以下变量：
```bash
❌ VITE_API_BASE_URL
❌ VITE_APP_VERSION
```

## 📋 修复步骤

### 1. 登录Zeabur控制台
- 进入你的项目
- 选择前端服务
- 点击「环境变量」标签

### 2. 删除错误的变量
- 找到所有 `VITE_` 前缀的变量
- 点击删除按钮移除它们

### 3. 添加正确的变量
- 点击「添加环境变量」
- 逐一添加上面列出的 `REACT_APP_` 前缀变量
- 确保值正确无误

### 4. 保存并重新部署
- 点击「保存」
- 触发重新部署
- 等待部署完成

## 🔍 验证修复

部署完成后，检查以下内容：

1. **浏览器控制台**: 不应该有JavaScript错误
2. **网络标签**: API请求应该正常发送
3. **应用功能**: 所有功能应该正常工作

## 🤔 为什么会出现这个问题？

- **Vite** 是一个构建工具，使用 `VITE_` 前缀
- **Create React App** 使用 `REACT_APP_` 前缀
- 你的项目是基于 Create React App 的React应用
- 因此必须使用 `REACT_APP_` 前缀

## 📞 如果仍有问题

如果修复后仍有问题，请检查：

1. **构建日志**: 查看Zeabur的构建日志是否有错误
2. **浏览器缓存**: 清除浏览器缓存后重试
3. **环境变量**: 确认所有必需的环境变量都已设置
4. **服务配置**: 确认服务类型为「Static」且启用了SPA模式

---

💡 **提示**: 本地开发时，环境变量从 `.env` 文件读取；生产环境时，从Zeabur控制台设置的环境变量读取。