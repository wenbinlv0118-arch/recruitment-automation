# LLM API 问题修复说明

## 🔍 问题描述

前端无法获取后端调用大模型API返回的内容，主要原因是：

1. **环境变量配置问题**：`.env` 文件中使用了 `LLM_BASE_URL` 而不是 `LLM_API_URL`
2. **端口冲突**：端口5001被占用
3. **错误处理不完善**：前端无法显示有意义的错误信息

## 🛠️ 解决方案

### 第一步：修复环境变量配置

运行修复脚本来解决环境变量名称问题：

```bash
./fix-env.sh
```

该脚本会：
- 自动备份原始的 `.env` 文件
- 将 `LLM_BASE_URL` 重命名为 `LLM_API_URL`
- 验证修复后的配置

修复后的配置应该是：
```bash
# 大语言模型API配置
LLM_API_KEY=d4820908e52b4302a6c0135ec28bb8d9.YH0DoJ2y3mqH3yra
LLM_API_URL=https://open.bigmodel.cn/api/paas/v4/chat/completions
LLM_MODEL=glm-4.5
```

### 第二步：使用LLM功能测试启动脚本

运行LLM功能测试启动脚本：

```bash
./start-llm-test.sh
```

该脚本会：
- 自动验证LLM服务配置
- 解决端口冲突问题
- 启动完整的系统进行测试

### 第三步：手动启动（如果脚本不工作）

1. **停止占用端口的进程**：
```bash
# 检查端口占用
lsof -ti:5001
lsof -ti:3000

# 停止进程
kill -9 <进程ID>
```

2. **启动后端服务**：
```bash
cd backend
npm run dev
```

3. **启动前端服务**：
```bash
cd frontend
npm start
```

## 🔧 故障排除

### 常见错误及解决方案

#### 1. "LLM_API_KEY 环境变量未设置"
- 确保 `backend/.env` 文件存在
- 检查 `LLM_API_KEY` 值是否正确
- 重启后端服务

#### 2. "端口5001已被占用"
- 使用 `lsof -ti:5001` 查看占用进程
- 使用 `kill -9 <进程ID>` 停止进程
- 或者修改 `.env` 文件中的 `PORT` 值

#### 3. "API密钥无效或已过期"
- 检查智谱AI API密钥是否有效
- 确认API密钥有足够的调用额度
- 验证API地址是否正确

#### 4. "连接超时"
- 检查网络连接
- 确认防火墙设置
- 验证API服务是否可用

## 📋 验证步骤

1. **检查环境变量**：
```bash
cd backend
node -e "require('dotenv').config(); console.log('LLM_API_KEY:', process.env.LLM_API_KEY)"
```

2. **测试API连接**：
```bash
curl -H "Authorization: Bearer $LLM_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"model":"glm-4.5","messages":[{"role":"user","content":"你好"}]}' \
     https://open.bigmodel.cn/api/paas/v4/chat/completions
```

3. **检查服务状态**：
```bash
curl http://localhost:5001/api/health
```

## 🎯 预期结果

修复成功后，您应该能够：

1. ✅ 前端正常连接到后端
2. ✅ 发送消息后收到LLM的思维链响应
3. ✅ 看到完整的AI对话流程
4. ✅ 使用智能寻聘等功能

## 📞 获取帮助

如果问题仍然存在，请：

1. 检查后端控制台日志
2. 查看浏览器开发者工具的网络请求
3. 确认所有环境变量配置正确
4. 验证API服务状态

## 🔄 更新日志

- **v1.0** - 初始问题诊断和修复
- **v1.1** - 添加错误处理优化
- **v1.2** - 创建自动化启动脚本
