# Docker代理配置清除指南

## 问题诊断

当前Docker配置存在以下问题：
- 代理设置：`http.docker.internal:3128`
- 镜像源配置未生效
- 镜像拉取超时失败

## 解决方案：通过Docker Desktop GUI清除代理

### 步骤1：打开Docker Desktop设置

1. 点击菜单栏中的Docker图标
2. 选择 "Settings" 或 "Preferences"
3. 进入设置界面

### 步骤2：清除代理设置

1. 在左侧菜单中找到 "Resources" → "Proxies"
2. 取消勾选 "Manual proxy configuration"
3. 清空所有代理字段：
   - HTTP proxy
   - HTTPS proxy
   - No proxy
4. 点击 "Apply & Restart"

### 步骤3：配置镜像加速器

1. 在左侧菜单中选择 "Docker Engine"
2. 在JSON配置中添加以下内容：

```json
{
  "registry-mirrors": [
    "https://registry.cn-hangzhou.aliyuncs.com",
    "https://dockerproxy.com",
    "https://docker.nju.edu.cn"
  ],
  "insecure-registries": [],
  "debug": false,
  "experimental": false
}
```

3. 点击 "Apply & Restart"

### 步骤4：验证配置

配置完成后，在终端运行以下命令验证：

```bash
# 检查代理设置（应该为空）
docker info | grep -i proxy

# 检查镜像源配置
docker info | grep -A 5 "Registry Mirrors"

# 测试镜像拉取
docker pull alpine:latest
docker pull node:20-slim
```

## 预期结果

配置成功后应该看到：
- 代理设置为空或不显示
- 镜像源显示配置的加速器地址
- 镜像拉取成功，无超时错误

## 如果仍然失败

1. **完全重启Docker Desktop**：
   - 退出Docker Desktop
   - 等待5秒
   - 重新启动

2. **检查网络连接**：
   ```bash
   ping registry.cn-hangzhou.aliyuncs.com
   ```

3. **尝试不同的镜像源**：
   - 阿里云：`https://registry.cn-hangzhou.aliyuncs.com`
   - 腾讯云：`https://mirror.ccs.tencentyun.com`
   - 华为云：`https://05f073ad3c0010ea0f4bc00b7105ec20.mirror.swr.myhuaweicloud.com`

## 下一步

配置成功后，继续执行以下验证步骤：

1. 测试基础镜像拉取
2. 测试后端项目Docker构建
3. 验证完整的容器化部署流程

---

**注意**：代理配置通常是通过Docker Desktop的GUI界面设置的，命令行修改可能不会完全清除GUI设置的代理。