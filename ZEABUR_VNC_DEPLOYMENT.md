# Zeabur平台VNC服务部署指南

## 概述

本指南将帮助您在Zeabur平台上部署VNC远程桌面服务，实现智能寻聘系统的实时监控功能。

## 前置条件

- ✅ 代码已推送到GitHub仓库
- ✅ 拥有Zeabur账户
- ✅ 项目已连接到Zeabur

## 部署步骤

### 1. 登录Zeabur控制台

访问 [https://zeabur.com](https://zeabur.com) 并登录您的账户。

### 2. 选择项目

在Zeabur控制台中选择您的 `recruitment-automation` 项目。

### 3. 添加VNC服务

#### 3.1 创建新服务
1. 点击 "Add Service" 按钮
2. 选择 "Git Repository"
3. 选择您的GitHub仓库 `recruitment-automation`
4. 服务名称设置为: `vnc-browser`

#### 3.2 配置构建设置
1. **Root Directory**: 设置为 `vnc-service`
2. **Build Command**: 保持默认（Docker自动检测）
3. **Output Directory**: 保持默认

### 4. 配置环境变量

在服务设置的 "Environment" 标签页中添加以下环境变量：

```bash
# VNC基础配置
VNC_RESOLUTION=1280x720
VNC_PASSWORD=vnc123
VNC_PORT=5900
NO_VNC_PORT=6080
DISPLAY=:1

# 可选配置
DEBIAN_FRONTEND=noninteractive
```

### 5. 配置端口映射

#### 5.1 添加端口
1. 在 "Networking" 标签页中
2. 点击 "Add Port"
3. 设置端口映射:
   - **Container Port**: `6080`
   - **Protocol**: `HTTP`
   - **Public**: `Yes`

#### 5.2 获取访问域名
部署完成后，Zeabur会自动分配域名，例如:
```
https://vnc-browser-recruitment.zeabur.app
```

### 6. 部署服务

1. 点击 "Deploy" 按钮
2. 等待构建和部署完成（约5-10分钟）
3. 查看部署日志确认服务正常启动

## 部署验证

### 1. 检查服务状态

在Zeabur控制台中查看服务状态：
- ✅ 状态显示为 "Running"
- ✅ 没有错误日志
- ✅ 端口6080正常监听

### 2. 测试VNC连接

#### 2.1 Web访问测试
访问分配的域名，例如:
```
https://vnc-browser-recruitment.zeabur.app
```

应该看到noVNC的连接界面。

#### 2.2 连接测试
1. 点击 "Connect" 按钮
2. 输入VNC密码: `vnc123`
3. 成功连接后应该看到Ubuntu桌面

### 3. 浏览器功能测试

在VNC桌面中：
1. 打开Chromium浏览器
2. 访问测试网站
3. 验证浏览器功能正常

## 前端集成配置

### 1. 更新VNC服务器地址

在 `frontend/src/components/Browser.js` 中更新VNC服务器配置：

```javascript
// 更新为实际的Zeabur域名
const VNC_SERVER_URL = 'vnc-browser-recruitment.zeabur.app';
const VNC_WEB_PORT = 443; // HTTPS端口
const vncUrl = `https://${VNC_SERVER_URL}`;
```

### 2. 测试前端集成

1. 在智能寻聘系统中打开"浏览器"功能
2. 切换到"VNC远程桌面"模式
3. 验证连接状态指示器
4. 确认可以正常显示VNC桌面

## 性能优化

### 1. 资源配置

根据使用需求调整Zeabur服务配置：

```yaml
# 推荐配置
CPU: 1 Core
Memory: 1GB
Storage: 10GB
```

### 2. 网络优化

```bash
# 降低分辨率以节省带宽
VNC_RESOLUTION=1024x768

# 或提高分辨率以获得更好体验
VNC_RESOLUTION=1920x1080
```

## 监控和维护

### 1. 日志监控

在Zeabur控制台中定期检查：
- 服务运行日志
- 错误和警告信息
- 资源使用情况

### 2. 健康检查

服务包含自动健康检查：
```bash
# 每30秒检查一次
curl -f http://localhost:6080/ || exit 1
```

### 3. 自动重启

Supervisor会自动重启失败的进程：
- Xvfb (虚拟显示)
- x11vnc (VNC服务器)
- noVNC (Web客户端)
- Chromium (浏览器)

## 故障排除

### 1. 部署失败

**问题**: 构建过程中出错

**解决方案**:
1. 检查Dockerfile语法
2. 验证基础镜像可用性
3. 查看构建日志详细信息

### 2. 服务无法启动

**问题**: 服务状态显示错误

**解决方案**:
1. 检查环境变量配置
2. 验证端口映射设置
3. 查看服务启动日志

### 3. VNC连接失败

**问题**: 无法连接到VNC桌面

**解决方案**:
1. 验证VNC密码正确
2. 检查防火墙设置
3. 确认端口6080可访问

### 4. 浏览器无法启动

**问题**: 在VNC桌面中无法启动Chromium浏览器

**常见错误**:
- `chromium-browser: command not found`
- 浏览器进程启动失败
- 显示相关错误

**解决方案**:
1. **手动启动浏览器**:
   ```bash
   # 在VNC桌面的终端中执行
   /usr/local/bin/start-browser.sh
   ```

2. **检查可用浏览器**:
   ```bash
   # 检查Chromium
   which chromium-browser
   
   # 检查Chrome
   which google-chrome
   
   # 检查Firefox
   which firefox
   ```

3. **使用替代启动命令**:
   ```bash
   # 尝试不同的启动方式
   chromium-browser --no-sandbox --disable-dev-shm-usage
   google-chrome --no-sandbox --disable-dev-shm-usage
   firefox
   ```

4. **检查服务日志**:
   在Zeabur控制台查看browser服务的日志信息

### 4. 前端集成问题

**问题**: 前端无法连接VNC服务

**解决方案**:
1. 更新VNC服务器地址
2. 检查CORS设置
3. 验证HTTPS配置

## 安全配置

### 1. 密码安全

```bash
# 使用强密码
VNC_PASSWORD=your_strong_password_here
```

### 2. 访问控制

- 仅允许授权用户访问
- 定期更换VNC密码
- 监控访问日志

### 3. HTTPS加密

Zeabur自动提供HTTPS加密，确保数据传输安全。

## 成本估算

### Zeabur定价（参考）

```
基础配置:
- CPU: 1 Core
- Memory: 1GB
- 预估月费用: $5-10 USD

高性能配置:
- CPU: 2 Cores  
- Memory: 2GB
- 预估月费用: $15-25 USD
```

*实际费用请参考Zeabur官方定价*

## 扩展功能

### 1. 多用户支持

可以配置多个VNC端口支持多用户同时使用：

```bash
# 用户1
VNC_PORT_1=5901
NO_VNC_PORT_1=6081

# 用户2  
VNC_PORT_2=5902
NO_VNC_PORT_2=6082
```

### 2. 录屏功能

添加屏幕录制功能：

```bash
# 安装ffmpeg并配置录屏
ffmpeg -f x11grab -video_size 1280x720 -i :1 output.mp4
```

### 3. 文件传输

通过HTTP服务器实现文件上传下载：

```bash
# 启动文件服务器
python3 -m http.server 8000
```

## 技术支持

如遇到问题，请按以下顺序排查：

1. **查看部署日志**: Zeabur控制台 → 服务 → Logs
2. **检查服务状态**: 确认所有进程正常运行
3. **验证网络连接**: 测试端口可访问性
4. **联系技术支持**: 提供详细错误信息

## 更新和维护

### 1. 代码更新

```bash
# 推送新代码
git add .
git commit -m "更新VNC服务配置"
git push origin develop
```

Zeabur会自动检测代码变更并重新部署。

### 2. 配置更新

在Zeabur控制台中直接修改环境变量，服务会自动重启。

### 3. 版本管理

建议使用Git标签管理版本：

```bash
git tag -a v1.1.0 -m "VNC功能发布"
git push origin v1.1.0
```

---

## 总结

通过本指南，您应该能够成功在Zeabur平台上部署VNC远程桌面服务，并将其集成到智能寻聘系统中。这将大大提升用户体验，允许实时监控自动化脚本的执行过程。

如有任何问题，请参考故障排除部分或联系技术支持。