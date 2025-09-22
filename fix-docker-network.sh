#!/bin/bash

# Docker网络问题修复脚本
# 解决镜像拉取失败和代理冲突问题

echo "🔧 开始修复Docker网络配置..."

# 1. 停止Docker Desktop
echo "📱 停止Docker Desktop..."
osascript -e 'quit app "Docker"'
sleep 5

# 2. 清理Docker配置
echo "🧹 清理Docker配置..."
# 备份现有配置
if [ -f ~/.docker/daemon.json ]; then
    cp ~/.docker/daemon.json ~/.docker/daemon.json.backup
    echo "✅ 已备份现有配置到 daemon.json.backup"
fi

# 3. 创建新的daemon.json配置（无代理，使用阿里云镜像源）
echo "📝 创建新的Docker配置..."
mkdir -p ~/.docker
cat > ~/.docker/daemon.json << 'EOF'
{
  "registry-mirrors": [
    "https://registry.cn-hangzhou.aliyuncs.com",
    "https://dockerproxy.com",
    "https://docker.nju.edu.cn"
  ],
  "insecure-registries": [],
  "debug": false,
  "experimental": false,
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

echo "✅ 新配置已创建"

# 4. 清除环境变量中的代理设置
echo "🚫 清除代理环境变量..."
unset http_proxy
unset https_proxy
unset HTTP_PROXY
unset HTTPS_PROXY
unset no_proxy
unset NO_PROXY

echo "✅ 代理环境变量已清除"

# 5. 重新启动Docker Desktop
echo "🚀 重新启动Docker Desktop..."
open -a Docker

echo "⏳ 等待Docker启动..."
sleep 15

# 6. 验证Docker状态
echo "🔍 验证Docker状态..."
if docker version > /dev/null 2>&1; then
    echo "✅ Docker已成功启动"
    
    echo "📋 当前镜像源配置："
    docker info | grep -A 5 "Registry Mirrors" || echo "未找到镜像源配置"
    
    echo "🧪 测试镜像拉取..."
    if docker pull alpine:latest; then
        echo "✅ 镜像拉取测试成功！"
    else
        echo "❌ 镜像拉取仍然失败"
    fi
else
    echo "❌ Docker启动失败，请手动检查"
fi

echo "🎉 修复脚本执行完成！"
echo "💡 如果问题仍然存在，请尝试："
echo "   1. 手动重启Docker Desktop"
echo "   2. 检查网络连接"
echo "   3. 联系网络管理员检查防火墙设置"