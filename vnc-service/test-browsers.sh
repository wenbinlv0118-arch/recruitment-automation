#!/bin/bash

# 浏览器安装和Playwright兼容性测试脚本
# 用于验证VNC环境中的浏览器安装状态

echo "=== 浏览器安装测试 ==="

# 设置显示环境
export DISPLAY=:1

# 测试函数：检查浏览器是否可执行
test_browser() {
    local browser_name="$1"
    local browser_cmd="$2"
    
    echo "\n--- 测试 $browser_name ---"
    
    # 检查命令是否存在
    if command -v "$browser_cmd" >/dev/null 2>&1; then
        echo "✓ $browser_name 命令找到: $(which "$browser_cmd")"
        
        # 检查版本信息
        echo "版本信息:"
        case "$browser_cmd" in
            "chromium-browser")
                "$browser_cmd" --version 2>/dev/null || echo "无法获取版本信息"
                ;;
            "google-chrome-stable")
                "$browser_cmd" --version 2>/dev/null || echo "无法获取版本信息"
                ;;
            "firefox")
                "$browser_cmd" --version 2>/dev/null || echo "无法获取版本信息"
                ;;
        esac
        
        # 测试基本启动（快速退出）
        echo "测试基本启动能力..."
        case "$browser_cmd" in
            "chromium-browser"|"google-chrome-stable")
                timeout 5s "$browser_cmd" --no-sandbox --disable-dev-shm-usage --headless --dump-dom about:blank >/dev/null 2>&1
                if [ $? -eq 0 ] || [ $? -eq 124 ]; then
                    echo "✓ $browser_name 基本启动测试通过"
                else
                    echo "✗ $browser_name 基本启动测试失败"
                fi
                ;;
            "firefox")
                timeout 5s "$browser_cmd" --headless --screenshot=/tmp/test.png about:blank >/dev/null 2>&1
                if [ $? -eq 0 ] || [ $? -eq 124 ]; then
                    echo "✓ $browser_name 基本启动测试通过"
                    rm -f /tmp/test.png
                else
                    echo "✗ $browser_name 基本启动测试失败"
                fi
                ;;
        esac
        
    else
        echo "✗ $browser_name 命令未找到"
        return 1
    fi
}

# 测试所有浏览器
test_browser "Chromium" "chromium-browser"
test_browser "Google Chrome" "google-chrome-stable"
test_browser "Firefox" "firefox"

# 检查软链接
echo "\n--- 软链接检查 ---"
for link in "/usr/local/bin/chromium-browser" "/usr/local/bin/google-chrome" "/usr/local/bin/firefox"; do
    if [ -L "$link" ]; then
        echo "✓ $link -> $(readlink "$link")"
    else
        echo "✗ $link 软链接不存在"
    fi
done

# Playwright兼容性检查
echo "\n--- Playwright兼容性检查 ---"
echo "检查Playwright所需的浏览器可执行文件..."

# Playwright通常查找的浏览器路径
playwright_browsers=(
    "/usr/bin/chromium-browser:Chromium"
    "/usr/bin/google-chrome-stable:Chrome"
    "/usr/bin/firefox:Firefox"
)

for browser_info in "${playwright_browsers[@]}"; do
    IFS=':' read -r browser_path browser_name <<< "$browser_info"
    if [ -x "$browser_path" ]; then
        echo "✓ $browser_name 可执行文件存在: $browser_path"
    else
        echo "✗ $browser_name 可执行文件不存在: $browser_path"
    fi
done

# 环境变量检查
echo "\n--- 环境变量检查 ---"
echo "DISPLAY: ${DISPLAY:-未设置}"
echo "PATH: $PATH"

# 系统资源检查
echo "\n--- 系统资源检查 ---"
echo "内存使用情况:"
free -h
echo "\n磁盘空间:"
df -h /tmp

echo "\n=== 测试完成 ==="
echo "如果所有浏览器都显示 ✓，则Playwright应该能够正常工作。"
echo "如果有 ✗ 标记，请检查对应的浏览器安装。"