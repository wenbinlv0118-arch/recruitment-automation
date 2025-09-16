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

# 验证函数
verify_browser() {
    local browser_name="$1"
    local binary_path="$2"
    local symlink_path="$3"
    
    echo -e "\n${YELLOW}=== 验证 $browser_name ===${NC}"
    
    # 1. 检查二进制文件是否存在
    echo "1. 检查二进制文件: $binary_path"
    if [ ! -f "$binary_path" ]; then
        echo -e "${RED}ERROR: $browser_name 二进制文件不存在: $binary_path${NC}"
        echo "可用的浏览器文件:"
        ls -la /usr/bin/ | grep -i "chrom\|firefox" || echo "未找到相关浏览器文件"
        return 1
    fi
    echo -e "${GREEN}✓ 二进制文件存在${NC}"
    
    # 2. 检查文件权限
    echo "2. 检查文件权限"
    if [ ! -x "$binary_path" ]; then
        echo -e "${RED}ERROR: $browser_name 没有执行权限: $binary_path${NC}"
        ls -la "$binary_path"
        return 1
    fi
    echo -e "${GREEN}✓ 文件权限正确${NC}"
    
    # 3. 检查软链接
    if [ -n "$symlink_path" ]; then
        echo "3. 检查软链接: $symlink_path"
        if [ ! -L "$symlink_path" ]; then
            echo -e "${RED}ERROR: $browser_name 软链接不存在: $symlink_path${NC}"
            return 1
        fi
        
        if [ ! -e "$symlink_path" ]; then
            echo -e "${RED}ERROR: $browser_name 软链接损坏: $symlink_path${NC}"
            ls -la "$symlink_path"
            return 1
        fi
        echo -e "${GREEN}✓ 软链接正确${NC}"
    fi
    
    # 4. 版本检查
    echo "4. 版本检查"
    local version_output
    if version_output=$("$binary_path" --version 2>&1); then
        echo -e "${GREEN}✓ 版本: $version_output${NC}"
    else
        echo -e "${RED}ERROR: $browser_name 版本检查失败${NC}"
        echo "错误输出: $version_output"
        return 1
    fi
    
    # 5. 基本可执行性测试（仅帮助信息）
    echo "5. 基本可执行性测试"
    if "$binary_path" --help >/dev/null 2>&1 || "$binary_path" -h >/dev/null 2>&1; then
        echo -e "${GREEN}✓ 基本可执行性测试通过${NC}"
    else
        echo -e "${YELLOW}⚠ 警告: 帮助信息测试失败，但可能正常（某些浏览器不支持 --help）${NC}"
    fi
    
    echo -e "${GREEN}=== $browser_name 验证完成 ===${NC}"
    return 0
}

# 错误计数
error_count=0

# 验证 Chromium
echo -e "\n${YELLOW}开始验证 Chromium...${NC}"
if ! verify_browser "Chromium" "/usr/bin/chromium-browser" "/usr/local/bin/chromium-browser"; then
    ((error_count++))
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

# 最终结果
echo -e "\n=========================================="
if [ $error_count -eq 0 ]; then
    echo -e "${GREEN}🎉 所有浏览器验证通过！${NC}"
    echo -e "${GREEN}✓ Chromium: 可用${NC}"
    echo -e "${GREEN}✓ Google Chrome: 可用${NC}"
    echo -e "${GREEN}✓ Firefox: 可用${NC}"
    exit 0
else
    echo -e "${RED}❌ 浏览器验证失败！${NC}"
    echo -e "${RED}失败数量: $error_count${NC}"
    echo -e "${RED}请检查上述错误信息并修复问题${NC}"
    exit 1
fi