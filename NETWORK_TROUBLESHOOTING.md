# 网络连接故障排除指南

## 问题诊断

## 网络问题诊断结果

1. **DNS 解析正常** - 可以正确解析 github.com 的 IP 地址
2. **基本网络连接正常** - 可以 ping 通 8.8.8.8
3. **发现 SOCKS 代理配置** - 系统配置了 SOCKS5 代理 (127.0.0.1:1086)
4. **浏览器与终端环境差异** - 浏览器自动使用代理，终端需手动配置
5. **GitHub CLI 需要代理环境变量** - 必须设置 ALL_PROXY 才能连接

当前检测到的网络问题：
- ❌ 无法连接到 GitHub (github.com)
- ❌ HTTPS 连接超时 (端口 443)
- ❌ SSH 连接超时 (端口 22)
- ❌ Ping 请求 100% 丢包
- ✅ DNS 解析正常 (可以解析到 20.205.243.166)
- ✅ 基本网络连接正常 (可以 ping 8.8.8.8)
- ❌ 终端环境未配置代理
- ✅ 系统已配置 SOCKS5 代理 (127.0.0.1:1086)

## 可能原因

1. **网络连接问题**
   - 本地网络断开
   - 路由器/调制解调器故障
   - ISP 服务中断

2. **防火墙/安全软件**
   - 系统防火墙阻止连接
   - 安全软件拦截
   - 企业网络限制

3. **DNS 解析问题**
   - DNS 服务器无响应
   - DNS 缓存污染

4. **代理设置问题**
   - 代理服务器配置错误
   - 代理服务器不可用

## 解决方案

### 1. 配置代理环境变量 (推荐解决方案)

根据诊断结果，系统已配置 SOCKS5 代理，但终端环境未正确设置代理变量：

```bash
# 设置代理环境变量
export ALL_PROXY=socks5://127.0.0.1:1086
export HTTP_PROXY=socks5://127.0.0.1:1086
export HTTPS_PROXY=socks5://127.0.0.1:1086

# 配置 Git 使用代理
git config --global http.proxy socks5://127.0.0.1:1086
git config --global https.proxy socks5://127.0.0.1:1086

# 测试连接
curl -I https://github.com

# 推送代码
git push origin develop
```

**永久配置方案：**
```bash
# 添加到 ~/.zshrc 或 ~/.bash_profile
echo 'export ALL_PROXY=socks5://127.0.0.1:1086' >> ~/.zshrc
echo 'export HTTP_PROXY=socks5://127.0.0.1:1086' >> ~/.zshrc
echo 'export HTTPS_PROXY=socks5://127.0.0.1:1086' >> ~/.zshrc

# 重新加载配置
source ~/.zshrc
```

### 2. 检查基本网络连接

```bash
# 检查本地网络连接
ping -c 3 8.8.8.8

# 检查其他网站连接
ping -c 3 baidu.com
curl -I https://www.baidu.com

# 查看网络路径
traceroute github.com
```

### 2. 检查 DNS 解析

```bash
# 检查 DNS 解析
nslookup github.com

# 尝试使用不同的 DNS 服务器
nslookup github.com 8.8.8.8
```

### 3. 清除 DNS 缓存 (macOS)

```bash
# 清除 DNS 缓存
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

### 4. 检查代理设置

```bash
# 检查系统代理设置
echo $http_proxy
echo $https_proxy
echo $HTTP_PROXY
echo $HTTPS_PROXY

# 检查 Git 代理设置
git config --global --get http.proxy
git config --global --get https.proxy
```

### 5. 临时禁用代理 (如果有)

```bash
# 取消 Git 代理设置
git config --global --unset http.proxy
git config --global --unset https.proxy

# 取消环境变量代理
unset http_proxy
unset https_proxy
unset HTTP_PROXY
unset HTTPS_PROXY
```

### 6. 检查防火墙设置

**macOS 系统偏好设置：**
1. 打开 "系统偏好设置" > "安全性与隐私" > "防火墙"
2. 确保防火墙没有阻止 Git 或终端应用
3. 临时关闭防火墙测试连接

### 7. 尝试移动热点

如果怀疑是网络环境问题：
1. 使用手机热点连接
2. 测试是否能正常访问 GitHub
3. 如果可以，说明是原网络环境的问题

### 8. 使用 GitHub CLI (配置代理后)

✅ **GitHub CLI 已安装** (版本 2.78.0)

配置代理环境变量后，GitHub CLI 应该能正常工作：

```bash
# 确保代理环境变量已设置
export ALL_PROXY=socks5://127.0.0.1:1086

# 使用 GitHub CLI 认证
gh auth login

# 或使用个人访问令牌
echo "your_token_here" > ~/.github_token
gh auth login --with-token < ~/.github_token

# 测试 GitHub CLI
gh repo view
gh repo sync
```

**当前状态**: 代理配置问题已识别，配置后应能正常访问 GitHub 服务

## 验证修复

网络问题解决后，按以下步骤验证：

```bash
# 1. 测试网络连接
ping -c 3 github.com

# 2. 测试 HTTPS 连接
curl -I https://github.com

# 3. 测试 Git 连接
git ls-remote origin

# 4. 推送代码
git push origin develop
```

## 代理配置故障排除

### 验证代理服务状态

```bash
# 检查代理端口是否监听
lsof -i :1086
netstat -an | grep 1086

# 测试代理连接
curl --proxy socks5://127.0.0.1:1086 -I https://github.com
```

### 常见代理问题解决

1. **代理服务未启动**
   - 检查并启动你的代理客户端 (如 ClashX, V2rayU 等)
   - 确认代理服务正在运行

2. **代理端口不匹配**
   ```bash
   # 检查系统代理设置中的实际端口
   # 系统偏好设置 > 网络 > 高级 > 代理
   # 使用正确的端口号替换 1086
   ```

3. **代理协议类型错误**
   ```bash
   # 如果是 HTTP 代理，使用：
   export HTTP_PROXY=http://127.0.0.1:端口号
   export HTTPS_PROXY=http://127.0.0.1:端口号
   
   # 如果是 SOCKS5 代理，使用：
   export ALL_PROXY=socks5://127.0.0.1:端口号
   ```

## 部署继续方案

如果网络问题暂时无法解决，可以：

1. **使用其他网络环境**
   - 移动热点
   - 公共 WiFi
   - 朋友/同事的网络

2. **延后推送**
   - 代码已在本地提交
   - 网络恢复后直接推送
   - 不影响项目配置完整性

3. **手动部署**
   - 直接在 Vercel/Netlify 控制台上传代码
   - 临时绕过 Git 集成

## 联系支持

如果以上方案都无法解决问题：

1. **GitHub 状态页面**: https://www.githubstatus.com/
2. **网络服务商客服**
3. **IT 支持部门** (企业环境)

---

**解决方案总结**: 
1. 问题根因：终端环境未配置代理，而系统浏览器自动使用了 SOCKS5 代理
2. 解决方法：设置 `ALL_PROXY=socks5://127.0.0.1:1086` 环境变量
3. 当前代码已完全提交到本地仓库，配置代理后可立即推送部署

**快速解决命令**:
```bash
export ALL_PROXY=socks5://127.0.0.1:1086 && git push origin develop
```