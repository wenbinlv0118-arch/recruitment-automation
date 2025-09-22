# Docker镜像加速器配置指南

## 问题背景

根据网络连接测试结果，当前环境存在以下问题：
- 部分Docker镜像拉取失败（如 `node:20-slim`、`nginx:alpine`）
- 网络连接不稳定，影响镜像构建和部署
- 代理配置可能导致连接超时

## 解决方案：配置国内镜像加速器

### 方案一：Docker Desktop GUI配置（推荐）

1. **打开Docker Desktop**
   - 点击Docker Desktop图标
   - 进入Settings（设置）

2. **配置镜像源**
   - 选择 "Docker Engine"
   - 在JSON配置中添加镜像源：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://ccr.ccs.tencentyun.com"
  ],
  "insecure-registries": [],
  "debug": false,
  "experimental": false
}
```

3. **应用配置**
   - 点击 "Apply & Restart"
   - 等待Docker重启完成

### 方案二：命令行配置

1. **创建或编辑daemon.json文件**
```bash
# macOS路径
sudo mkdir -p ~/.docker
echo '{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://ccr.ccs.tencentyun.com"
  ]
}' > ~/.docker/daemon.json
```

2. **重启Docker服务**
```bash
# 重启Docker Desktop
# 或使用命令行重启Docker守护进程
```

## 推荐的镜像源列表

### 国内主要镜像源

| 提供商 | 镜像源地址 | 特点 |
|--------|------------|------|
| 中科大 | `https://docker.mirrors.ustc.edu.cn` | 稳定性好，速度快 |
| 网易 | `https://hub-mirror.c.163.com` | 老牌镜像源，可靠 |
| 百度云 | `https://mirror.baidubce.com` | 带宽充足 |
| 腾讯云 | `https://ccr.ccs.tencentyun.com` | 企业级稳定性 |
| 阿里云 | `https://registry.cn-hangzhou.aliyuncs.com` | 需要注册获取专属地址 |

### 阿里云镜像加速器（个人专属）

1. 访问 [阿里云容器镜像服务](https://cr.console.aliyun.com/)
2. 登录后获取专属加速器地址
3. 格式：`https://xxxxxx.mirror.aliyuncs.com`

## 配置验证

### 1. 检查配置是否生效
```bash
# 查看Docker信息，确认镜像源配置
docker info | grep -A 10 "Registry Mirrors"
```

### 2. 测试镜像拉取
```bash
# 测试拉取之前失败的镜像
docker pull node:20-slim
docker pull nginx:alpine
```

### 3. 验证构建功能
```bash
# 测试后端镜像构建
cd backend
docker build -t test-backend-build .
```

## 故障排除

### 常见问题及解决方案

#### 1. 配置后仍然无法拉取镜像

**可能原因**：
- Docker未完全重启
- 镜像源暂时不可用
- 网络防火墙限制

**解决方案**：
```bash
# 完全重启Docker
# 1. 退出Docker Desktop
# 2. 重新启动Docker Desktop
# 3. 等待完全启动后测试

# 或者清理Docker缓存
docker system prune -a
```

#### 2. 特定镜像仍然拉取失败

**解决方案**：
```bash
# 尝试手动指定镜像源
docker pull docker.mirrors.ustc.edu.cn/library/node:20-slim

# 或者使用tag重新标记
docker tag docker.mirrors.ustc.edu.cn/library/node:20-slim node:20-slim
```

#### 3. 代理冲突问题

如果系统配置了HTTP代理，可能与镜像源冲突：

```bash
# 临时禁用代理测试
unset http_proxy
unset https_proxy
unset HTTP_PROXY
unset HTTPS_PROXY

# 测试拉取镜像
docker pull node:20-slim
```

## 生产环境建议

### 1. 企业级配置

对于生产环境，建议：
- 使用企业专属的镜像仓库
- 配置多个备用镜像源
- 定期同步和缓存常用镜像

### 2. 安全考虑

- 验证镜像源的可信度
- 使用HTTPS协议的镜像源
- 定期更新镜像源列表

### 3. 监控和维护

```bash
# 定期检查镜像源可用性
curl -I https://docker.mirrors.ustc.edu.cn/v2/

# 监控拉取速度
time docker pull alpine:latest
```

## 配置模板

### 完整的daemon.json配置

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://ccr.ccs.tencentyun.com"
  ],
  "insecure-registries": [],
  "debug": false,
  "experimental": false,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ]
}
```

## 下一步操作

1. **立即配置**：选择方案一或方案二进行配置
2. **验证测试**：按照验证步骤确认配置生效
3. **构建测试**：重新尝试构建后端和VNC镜像
4. **文档更新**：将成功的配置记录到部署文档中

---

**注意**：配置完成后，建议重新运行之前失败的Docker构建命令，验证问题是否解决。