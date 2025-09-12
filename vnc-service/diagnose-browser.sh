#!/bin/bash

# 浏览器启动问题诊断脚本
# 用于分析VNC环境中浏览器启动失败的原因

echo "=== VNC浏览器启动诊断工具 ==="
echo "时间: $(date)"
echo ""

# 1. 系统环境检查
echo "1. 系统环境检查:"
echo "  - 操作系统: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'=' -f2 | tr -d '"' || echo '未知')"
echo "  - 内核版本: $(uname -r)"
echo "  - 架构: $(uname -m)"
echo "  - 当前用户: $(whoami)"
echo "  - 用户ID: $(id)"
echo ""

# 2. X11服务检查
echo "2. X11服务检查:"
export DISPLAY=:1
echo "  - DISPLAY环境变量: $DISPLAY"
if xdpyinfo -display :1 >/dev/null 2>&1; then
    echo "  - X11服务状态: ✓ 正常运行"
    echo "  - 显示器信息: $(xdpyinfo -display :1 | grep 'dimensions:' | awk '{print $2}' || echo '未知')"
else
    echo "  - X11服务状态: ✗ 未运行或无法连接"
fi
echo ""

# 3. 浏览器可用性检查
echo "3. 浏览器可用性检查:"
for browser in chromium-browser google-chrome-stable firefox; do
    if command -v $browser >/dev/null 2>&1; then
        echo "  - $browser: ✓ 已安装 ($(which $browser))"
        # 检查浏览器版本
        case $browser in
            chromium-browser)
                VERSION=$(chromium-browser --version 2>/dev/null || echo "版本获取失败")
                ;;
            google-chrome-stable)
                VERSION=$(google-chrome-stable --version 2>/dev/null || echo "版本获取失败")
                ;;
            firefox)
                VERSION=$(firefox --version 2>/dev/null || echo "版本获取失败")
                ;;
        esac
        echo "    版本: $VERSION"
    else
        echo "  - $browser: ✗ 未安装"
    fi
done
echo ""

# 4. 文件系统检查
echo "4. 文件系统检查:"
echo "  - /tmp 目录权限: $(ls -ld /tmp | awk '{print $1}')"
echo "  - /tmp 可用空间: $(df -h /tmp | tail -1 | awk '{print $4}')"
echo "  - /usr/local/bin/index.html: $([ -f '/usr/local/bin/index.html' ] && echo '✓ 存在' || echo '✗ 不存在')"
if [ -f '/usr/local/bin/index.html' ]; then
    echo "    文件大小: $(ls -lh /usr/local/bin/index.html | awk '{print $5}')"
    echo "    文件权限: $(ls -l /usr/local/bin/index.html | awk '{print $1}')"
fi
echo ""

# 5. 内存和资源检查
echo "5. 系统资源检查:"
echo "  - 总内存: $(free -h | grep Mem | awk '{print $2}')"
echo "  - 可用内存: $(free -h | grep Mem | awk '{print $7}')"
echo "  - CPU核心数: $(nproc)"
echo "  - 系统负载: $(uptime | awk -F'load average:' '{print $2}' | xargs)"
echo ""

# 6. 进程检查
echo "6. 相关进程检查:"
echo "  - Xvfb进程: $(pgrep -f Xvfb >/dev/null && echo '✓ 运行中' || echo '✗ 未运行')"
echo "  - fluxbox进程: $(pgrep -f fluxbox >/dev/null && echo '✓ 运行中' || echo '✗ 未运行')"
echo "  - x11vnc进程: $(pgrep -f x11vnc >/dev/null && echo '✓ 运行中' || echo '✗ 未运行')"
echo "  - noVNC进程: $(pgrep -f novnc >/dev/null && echo '✓ 运行中' || echo '✗ 未运行')"
echo "  - 浏览器进程: $(pgrep -f 'chromium\|chrome\|firefox' >/dev/null && echo '✓ 运行中' || echo '✗ 未运行')"
echo ""

# 7. 日志文件检查
echo "7. 日志文件检查:"
for logfile in /var/log/supervisor/browser.log /var/log/supervisor/xvfb.log /var/log/supervisor/fluxbox.log; do
    if [ -f "$logfile" ]; then
        echo "  - $logfile: ✓ 存在 ($(wc -l < "$logfile") 行)"
        echo "    最后5行:"
        tail -5 "$logfile" | sed 's/^/      /'
    else
        echo "  - $logfile: ✗ 不存在"
    fi
    echo ""
done

# 8. 浏览器启动测试
echo "8. 浏览器启动测试:"
if command -v chromium-browser >/dev/null 2>&1; then
    echo "  测试 Chromium 启动..."
    mkdir -p /tmp/test-chrome-data
    timeout 10 chromium-browser --no-sandbox --disable-dev-shm-usage \
        --disable-gpu --headless --dump-dom \
        --user-data-dir=/tmp/test-chrome-data \
        about:blank >/tmp/chrome-test.log 2>&1
    
    if [ $? -eq 0 ]; then
        echo "    ✓ Chromium 基本启动测试通过"
    else
        echo "    ✗ Chromium 基本启动测试失败"
        echo "    错误日志:"
        cat /tmp/chrome-test.log | head -10 | sed 's/^/      /'
    fi
    rm -rf /tmp/test-chrome-data /tmp/chrome-test.log
fi
echo ""

echo "=== 诊断完成 ==="
echo "如果浏览器仍然无法启动，请检查上述输出中的 ✗ 标记项目"
echo "建议优先解决 X11服务、浏览器安装和系统资源问题"