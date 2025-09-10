#!/bin/bash

# GitHub CLI 快速配置脚本
# 使用方法: ./setup-github-cli.sh

set -e

echo "🚀 GitHub CLI 配置脚本"
echo "========================"

# 检查是否已安装 GitHub CLI
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI 未安装"
    echo "正在安装 GitHub CLI..."
    
    # 检查是否有 Homebrew
    if command -v brew &> /dev/null; then
        brew install gh
        echo "✅ GitHub CLI 安装完成"
    else
        echo "❌ 请先安装 Homebrew 或手动安装 GitHub CLI"
        echo "Homebrew 安装: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
else
    echo "✅ GitHub CLI 已安装: $(gh --version | head -n1)"
fi

# 检查认证状态
echo "\n🔐 检查认证状态..."
if gh auth status &> /dev/null; then
    echo "✅ 已认证到 GitHub"
    gh auth status
    
    read -p "\n是否要重新配置认证? (y/N): " reconfigure
    if [[ $reconfigure =~ ^[Yy]$ ]]; then
        gh auth logout
        echo "已登出，准备重新认证..."
    else
        echo "保持当前认证状态"
        exit 0
    fi
else
    echo "❌ 未认证到 GitHub"
fi

# 选择认证方式
echo "\n🔑 选择认证方式:"
echo "1) 浏览器登录 (推荐)"
echo "2) Personal Access Token"
read -p "请选择 (1-2): " auth_method

case $auth_method in
    1)
        echo "\n🌐 使用浏览器登录..."
        gh auth login
        ;;
    2)
        echo "\n🔐 使用 Personal Access Token"
        echo "请确保你的 Token 包含以下权限:"
        echo "  ✅ repo (完整仓库访问)"
        echo "  ✅ workflow (GitHub Actions)"
        echo "  ✅ write:packages (包管理)"
        echo "  ✅ read:packages (包下载)"
        echo "  ✅ user (用户信息)"
        echo "  ✅ read:org (组织信息，如果需要)"
        echo ""
        echo "Token 创建地址: https://github.com/settings/tokens"
        echo ""
        read -s -p "请输入你的 Personal Access Token: " token
        echo ""
        
        # 使用 Token 登录
        echo "$token" | gh auth login --with-token
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

# 验证认证
echo "\n✅ 验证认证状态..."
if gh auth status; then
    echo "\n🎉 GitHub CLI 配置成功!"
    
    # 测试基本功能
    echo "\n🧪 测试基本功能..."
    echo "当前用户: $(gh api user --jq '.login')"
    
    # 如果在项目目录中，显示项目信息
    if [ -d ".git" ]; then
        echo "\n📊 项目 GitHub Actions 状态:"
        if gh run list --limit 3 2>/dev/null; then
            echo "✅ 可以访问 GitHub Actions"
        else
            echo "⚠️  无法访问 GitHub Actions (可能需要更多权限)"
        fi
    fi
    
    echo "\n📝 常用命令:"
    echo "  gh run list          # 查看工作流运行状态"
    echo "  gh run view --log    # 查看最新运行日志"
    echo "  gh workflow run      # 手动触发工作流"
    echo "  gh auth status       # 检查认证状态"
    
else
    echo "❌ 认证失败，请检查配置"
    exit 1
fi

echo "\n🎯 配置完成! 你现在可以使用 GitHub CLI 了。"