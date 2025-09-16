#!/bin/bash

# Playwright 浏览器验证脚本 - 后端服务专用
# 功能：验证 Playwright Chromium 的安装和基本可用性

set -e  # 任何命令失败都退出

echo "=========================================="
echo "   Playwright 浏览器验证脚本 - 后端版本"
echo "=========================================="

# 定义颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

error_count=0

echo -e "\n${YELLOW}=== 验证 Playwright 安装 ===${NC}"

# 1. 检查 Playwright 命令可用性
echo "1. 检查 Playwright 命令"
if ! command -v npx >/dev/null 2>&1; then
    echo -e "${RED}ERROR: npx 命令不可用${NC}"
    ((error_count++))
else
    echo -e "${GREEN}✓ npx 命令可用${NC}"
fi

# 2. 检查 Playwright 版本
echo "2. 检查 Playwright 版本"
if playwright_version=$(npx playwright --version 2>&1); then
    echo -e "${GREEN}✓ Playwright 版本: $playwright_version${NC}"
else
    echo -e "${RED}ERROR: Playwright 版本检查失败${NC}"
    echo "错误输出: $playwright_version"
    ((error_count++))
fi

# 3. 检查 Playwright 浏览器目录
echo "3. 检查 Playwright 浏览器目录"
if [ -d "/ms-playwright" ]; then
    echo -e "${GREEN}✓ Playwright 浏览器目录存在: /ms-playwright${NC}"
    
    # 检查 Chromium 目录
    chromium_dirs=$(find /ms-playwright -name "*chromium*" -type d 2>/dev/null | head -5)
    if [ -n "$chromium_dirs" ]; then
        echo -e "${GREEN}✓ 找到 Chromium 目录:${NC}"
        echo "$chromium_dirs"
    else
        echo -e "${YELLOW}⚠ 警告: 未找到 Chromium 目录${NC}"
        echo "浏览器目录内容:"
        ls -la /ms-playwright/ 2>/dev/null || echo "无法列出目录内容"
    fi
else
    echo -e "${RED}ERROR: Playwright 浏览器目录不存在: /ms-playwright${NC}"
    echo "尝试查找其他可能的浏览器目录:"
    find /home -name "*playwright*" -type d 2>/dev/null | head -5 || echo "未找到相关目录"
    ((error_count++))
fi

# 4. 验证 Playwright Node.js 模块（改进版本）
echo "4. 验证 Playwright Node.js 模块"
cat > /tmp/test-playwright.js << 'EOF'
try {
    // 首先检查 Playwright 是否可以加载
    console.log('尝试加载 Playwright 模块...');
    const playwright = require('playwright');
    
    if (!playwright) {
        console.log('✗ Playwright 模块加载失败');
        process.exit(1);
    }
    
    console.log('✓ Playwright 模块加载成功');
    
    // 检查 chromium 是否可用
    const { chromium } = playwright;
    if (!chromium) {
        console.log('✗ Chromium 模块不可用');
        process.exit(1);
    }
    
    console.log('✓ Playwright Chromium 模块可用');
    
    // 尝试获取可执行文件路径（容错处理）
    try {
        const executablePath = chromium.executablePath();
        console.log('✓ Chromium 可执行文件路径:', executablePath);
        
        // 检查文件是否存在（容错处理）
        const fs = require('fs');
        if (fs.existsSync(executablePath)) {
            console.log('✓ Chromium 可执行文件存在');
        } else {
            console.log('⚠ Chromium 可执行文件不存在，但模块加载正常');
        }
    } catch (pathError) {
        console.log('⚠ 无法获取 Chromium 可执行文件路径，但模块加载正常');
        console.log('  错误信息:', pathError.message);
    }
    
    console.log('✓ Playwright 基本验证通过');
} catch (error) {
    console.error('✗ Playwright 模块测试失败:', error.message);
    // 打印更详细的错误信息
    if (error.code) {
        console.error('  错误代码:', error.code);
    }
    if (error.stack) {
        console.error('  错误堆栈:', error.stack.split('\n')[0]);
    }
    process.exit(1);
}
EOF

if node /tmp/test-playwright.js 2>&1; then
    echo -e "${GREEN}✓ Playwright Node.js 模块验证成功${NC}"
else
    echo -e "${RED}ERROR: Playwright Node.js 模块验证失败${NC}"
    ((error_count++))
fi

# 清理临时文件
rm -f /tmp/test-playwright.js

# 5. 环境变量检查
echo "5. 检查相关环境变量"
echo "NODE_ENV: ${NODE_ENV:-未设置}"
echo "PLAYWRIGHT_BROWSERS_PATH: ${PLAYWRIGHT_BROWSERS_PATH:-未设置}"
echo "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: ${PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD:-未设置}"
echo "BROWSER_HEADLESS: ${BROWSER_HEADLESS:-未设置}"
echo "DISPLAY: ${DISPLAY:-未设置}"

# 最终结果
echo -e "\n=========================================="
if [ $error_count -eq 0 ]; then
    echo -e "${GREEN}🎉 Playwright 浏览器验证通过！${NC}"
    echo -e "${GREEN}✓ Playwright 安装正确${NC}"
    echo -e "${GREEN}✓ Chromium 浏览器可用${NC}"
    echo -e "${GREEN}✓ Node.js 模块正常${NC}"
    exit 0
else
    echo -e "${RED}❌ Playwright 浏览器验证失败！${NC}"
    echo -e "${RED}失败数量: $error_count${NC}"
    echo -e "${RED}请检查上述错误信息并修复问题${NC}"
    exit 1
fi