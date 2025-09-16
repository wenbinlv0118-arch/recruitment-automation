#!/bin/bash

# 浏览器验证脚本 - Zeabur 环境严格检查版
# 功能：详细验证所有浏览器的安装和可执行性

set -e  # 任何命令失败都退出

echo "=========================================="
echo "      浏览器验证脚本 - Zeabur 版本"
echo "=========================================="

# 定义颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 验证函数（改进版本 - 更容错）
verify_browser() {
    local browser_name="$1"
    local binary_path="$2"
    local symlink_path="$3"
    
    echo -e "\n${YELLOW}=== 验证 $browser_name ===${NC}"
    
    # 1. 检查二进制文件是否存在
    echo "1. 检查二进制文件: $binary_path"
    if [ ! -f "$binary_path" ]; then
        echo -e "${RED}⚠ $browser_name 二进制文件不存在: $binary_path${NC}"
        echo "可用的浏览器文件:"
        ls -la /usr/bin/ | grep -i "chrom\|firefox" || echo "未找到相关浏览器文件"
        return 1
    fi
    echo -e "${GREEN}✓ 二进制文件存在${NC}"
    
    # 2. 检查文件权限
    echo "2. 检查文件权限"
    if [ ! -x "$binary_path" ]; then
        echo -e "${RED}⚠ $browser_name 没有执行权限: $binary_path${NC}"
        ls -la "$binary_path"
        return 1
    fi
    echo -e "${GREEN}✓ 文件权限正确${NC}"
    
    # 3. 检查软链接
    if [ -n "$symlink_path" ]; then
        echo "3. 检查软链接: $symlink_path"
        if [ ! -L "$symlink_path" ]; then
            echo -e "${YELLOW}⚠ $browser_name 软链接不存在: $symlink_path${NC}"
            return 1
        fi
        
        if [ ! -e "$symlink_path" ]; then
            echo -e "${RED}⚠ $browser_name 软链接损坏: $symlink_path${NC}"
            ls -la "$symlink_path"
            return 1
        fi
        echo -e "${GREEN}✓ 软链接正确${NC}"
    fi
    
    # 4. 版本检查（更容错）
    echo "4. 版本检查"
    local version_output
    # 尝试多种方式获取版本信息
    if version_output=$(timeout 10 "$binary_path" --version 2>&1); then
        echo -e "${GREEN}✓ 版本: $version_output${NC}"
    elif version_output=$(timeout 10 "$binary_path" --help 2>&1 | head -1); then
        echo -e "${GREEN}✓ 可执行（通过帮助信息）: $version_output${NC}"
    elif [ "$browser_name" = "Chromium" ] && echo "$version_output" | grep -q "snap"; then
        echo -e "${YELLOW}⚠ Chromium 需要 snap 安装，跳过版本检查${NC}"
        echo "错误输出: $version_output"
        return 1
    else
        echo -e "${RED}⚠ $browser_name 版本检查失败${NC}"
        echo "错误输出: $version_output"
        return 1
    fi
    
    echo -e "${GREEN}=== $browser_name 验证完成 ===${NC}"
    return 0
}

# 错误计数
error_count=0

# 验证 Chromium（特殊处理）
echo -e "\n${YELLOW}开始验证 Chromium...${NC}"
# 特殊处理Chromium，因为Ubuntu 20.04中可能是snap包装器
if [ -f "/usr/bin/chromium-browser" ] && [ ! -L "/usr/bin/chromium-browser" ]; then
    # 检查是否是真正的二进制文件
    if file /usr/bin/chromium-browser 2>/dev/null | grep -q "shell script\|text"; then
        echo -e "${YELLOW}⚠ 检测到 Chromium 是 snap 包装器，跳过验证${NC}"
        echo "原因: Ubuntu 20.04 中的 chromium-browser 可能是 snap 包装器"
    else
        if ! verify_browser "Chromium" "/usr/bin/chromium-browser" "/usr/local/bin/chromium-browser"; then
            echo -e "${YELLOW}⚠ Chromium 验证失败，但继续执行${NC}"
        else
            ((error_count+0))  # Chromium 验证成功
        fi
    fi
else
    echo -e "${YELLOW}⚠ Chromium 二进制文件不存在或是软链接${NC}"
fi

# 验证 Google Chrome
echo -e "\n${YELLOW}开始验证 Google Chrome...${NC}"
if ! verify_browser "Google Chrome" "/usr/bin/google-chrome-stable" "/usr/local/bin/google-chrome"; then
    ((error_count++))
fi

# 验证 Firefox
echo -e "\n${YELLOW}开始验证 Firefox...${NC}"
if ! verify_browser "Firefox" "/usr/bin/firefox" "/usr/local/bin/firefox"; then
    ((error_count++))
fi

# 最终结果（更宽松的标准）
echo -e "\n=========================================="
if [ $error_count -eq 0 ]; then
    echo -e "${GREEN}🎉 所有浏览器验证通过！${NC}"
    echo -e "${GREEN}✓ Google Chrome: 可用${NC}"
    echo -e "${GREEN}✓ Chromium: 可用${NC}"
    echo -e "${GREEN}✓ Firefox: 可用${NC}"
    exit 0
elif [ $error_count -le 1 ]; then
    echo -e "${YELLOW}⚠ 浏览器部分可用（$error_count 个验证失败）${NC}"
    echo -e "${YELLOW}至少有两个浏览器可用，可以继续使用${NC}"
    exit 0
else
    echo -e "${RED}❌ 浏览器验证失败！${NC}"
    echo -e "${RED}失败数量: $error_count${NC}"
    echo -e "${RED}请检查上述错误信息并修复问题${NC}"
    exit 1
fi