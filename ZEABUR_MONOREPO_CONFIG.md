# Zeabur Monorepo 部署配置说明

## 🎯 配置策略

您说得完全正确！我们已经将所有服务统一采用 `root_dir` 策略，这是 Zeabur Monorepo 的最佳实践。

### 配置结构对比

#### ❌ 之前的复杂配置：
```json
{
  "dockerfile": "vnc-service/Dockerfile",
  "context": "vnc-service"
}
```

#### ✅ 现在的简化配置：
```json
{
  "root_dir": "vnc-service"
}
```

## 📁 目录结构与 Dockerfile 位置

### 标准化目录结构：
```
recruitment-automation/
├── backend/
│   ├── Dockerfile          # 标准 Dockerfile
│   ├── Dockerfile.standalone # 独立部署版本（可选）
│   ├── package.json
│   └── src/
├── frontend/
│   ├── package.json
│   └── src/
├── vnc-service/
│   ├── Dockerfile          # 标准 Dockerfile  
│   ├── Dockerfile.standalone # 独立部署版本（可选）
│   ├── start-vnc.sh
│   └── verify-browsers.sh
└── zbpack.json             # Monorepo 配置
```

## 🔧 Zeabur 部署配置

### 当前 zbpack.json 配置：

```json
{
  "services": {
    "backend": {
      "root_dir": "backend",
      "environment": "docker",
      "framework": "express",
      "node_version": "20"
    },
    "frontend": {
      "root_dir": "frontend", 
      "environment": "static",
      "framework": "react",
      "spa": true
    },
    "vnc-browser": {
      "root_dir": "vnc-service",
      "environment": "docker",
      "ports": {
        "6080": "HTTP",
        "5900": "TCP"
      }
    }
  }
}
```

## 🚀 部署优势

### 1. **简化配置**
- 每个服务只需指定 `root_dir`
- Zeabur 自动识别对应目录的 Dockerfile
- 无需复杂的 context 和 dockerfile 路径配置

### 2. **标准化结构**
- 每个服务目录包含自己的 Dockerfile
- 构建上下文自动设置为服务根目录
- 符合 Monorepo 最佳实践

### 3. **独立构建**
- 每个服务有独立的构建环境
- 资源配置可以单独优化
- 部署时只构建选定的服务

## 📋 部署步骤

### 1. 提交配置更改
```bash
git add .
git commit -m "feat: 优化Zeabur Monorepo配置 - 统一root_dir策略"
git push origin develop
```

### 2. 在 Zeabur 控制台部署
1. **选择 Git Service**
2. **选择仓库**: `recruitment-automation`
3. **选择分支**: `develop` 
4. **选择服务**:
   - Backend: 会自动检测到 `backend` 目录
   - Frontend: 会自动检测到 `frontend` 目录  
   - VNC Service: 会自动检测到 `vnc-service` 目录

### 3. 配置环境变量
Zeabur 会自动加载 zbpack.json 中定义的环境变量，无需手动配置。

## 🎯 预期效果

### ✅ 配置简化
- 移除复杂的路径配置
- 每个服务只需一个 `root_dir` 参数

### ✅ 构建优化  
- Zeabur 自动识别服务结构
- 构建上下文正确设置
- 依赖安装和文件复制路径正确

### ✅ 维护性提升
- 标准化的 Dockerfile 位置
- 清晰的服务边界
- 易于理解和维护的配置

## 🔍 验证清单

部署后验证以下功能：

- [ ] **后端服务**: Playwright 浏览器正常工作
- [ ] **前端服务**: React 应用正常访问  
- [ ] **VNC 服务**: 可通过 Web 访问远程桌面
- [ ] **服务通信**: 前后端和 VNC 服务间通信正常
- [ ] **浏览器验证**: 三个浏览器都可正常使用

---

**总结**: 这种配置方式完全符合 Zeabur Monorepo 的设计理念，让每个服务都有清晰的边界和独立的构建环境，同时简化了配置复杂度。