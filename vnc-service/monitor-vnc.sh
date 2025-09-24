#!/bin/bash

# VNC性能监控脚本
# 用于监控VNC服务的运行状态和性能指标

echo "=== VNC性能监控报告 ==="
echo "监控时间: $(date)"
echo ""

# 检查VNC相关进程状态
echo "1. VNC服务进程状态:"
echo "  - Xvfb进程: $(pgrep -f Xvfb >/dev/null && echo '运行中' || echo '未运行')"
echo "  - fluxbox进程: $(pgrep -f fluxbox >/dev/null && echo '运行中' || echo '未运行')"
echo "  - x11vnc进程: $(pgrep -f x11vnc >/dev/null && echo '运行中' || echo '未运行')"
echo "  - novnc进程: $(pgrep -f novnc_proxy >/dev/null && echo '运行中' || echo '未运行')"
echo "  - 浏览器进程: $(pgrep -f 'chromium\|chrome\|firefox' >/dev/null && echo '运行中' || echo '未运行')"
echo ""

# 检查X11显示状态
echo "2. X11显示状态:"
if xdpyinfo -display :1 >/dev/null 2>&1; then
    echo "  - X11服务: 正常"
    echo "  - 显示分辨率: $(xdpyinfo -display :1 | grep dimensions | awk '{print $2}')"
    echo "  - 色深: $(xdpyinfo -display :1 | grep 'depth of root' | awk '{print $5}' | head -1)"
else
    echo "  - X11服务: 异常"
fi
echo ""

# 检查VNC端口状态
echo "3. VNC端口状态:"
VNC_PORT=${VNC_PORT:-5901}
NO_VNC_PORT=${NO_VNC_PORT:-6080}
echo "  - VNC端口 $VNC_PORT: $(netstat -ln | grep :$VNC_PORT >/dev/null && echo '监听中' || echo '未监听')"
echo "  - NoVNC端口 $NO_VNC_PORT: $(netstat -ln | grep :$NO_VNC_PORT >/dev/null && echo '监听中' || echo '未监听')"
echo ""

# 系统资源使用情况
echo "4. 系统资源使用:"
echo "  - CPU使用率: $(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1)%"
echo "  - 内存使用: $(free -h | grep Mem | awk '{printf "%.1f%%", $3/$2*100}')"
echo "  - 可用内存: $(free -h | grep Mem | awk '{print $7}')"
echo "  - /tmp空间: $(df -h /tmp | tail -1 | awk '{print "使用:" $3 "/" $2 " (" $5 ")"}')"
echo ""

# VNC相关进程的资源使用
echo "5. VNC进程资源使用:"
for proc in Xvfb fluxbox x11vnc novnc_proxy chromium chrome firefox; do
    PID=$(pgrep -f $proc | head -1)
    if [ -n "$PID" ]; then
        CPU_MEM=$(ps -p $PID -o pid,pcpu,pmem,comm --no-headers 2>/dev/null)
        if [ -n "$CPU_MEM" ]; then
            echo "  - $proc: CPU $(echo $CPU_MEM | awk '{print $2}')%, 内存 $(echo $CPU_MEM | awk '{print $3}')%"
        fi
    fi
done
echo ""

# 检查日志文件大小
echo "6. 日志文件状态:"
LOG_DIR="/var/log/supervisor"
if [ -d "$LOG_DIR" ]; then
    for log in xvfb.log fluxbox.log x11vnc.log novnc.log browser.log; do
        if [ -f "$LOG_DIR/$log" ]; then
            SIZE=$(du -h "$LOG_DIR/$log" | cut -f1)
            LINES=$(wc -l < "$LOG_DIR/$log" 2>/dev/null || echo "0")
            echo "  - $log: $SIZE ($LINES 行)"
        fi
    done
else
    echo "  - 日志目录不存在: $LOG_DIR"
fi
echo ""

# 检查最近的错误日志
echo "7. 最近错误日志 (最后10行):"
if [ -d "$LOG_DIR" ]; then
    for log in xvfb.log fluxbox.log x11vnc.log novnc.log browser.log; do
        if [ -f "$LOG_DIR/$log" ]; then
            ERROR_COUNT=$(grep -i "error\|failed\|exception" "$LOG_DIR/$log" | wc -l)
            if [ $ERROR_COUNT -gt 0 ]; then
                echo "  - $log 错误数量: $ERROR_COUNT"
                echo "    最新错误:"
                grep -i "error\|failed\|exception" "$LOG_DIR/$log" | tail -3 | sed 's/^/      /'
            fi
        fi
    done
fi
echo ""

# 网络连接状态
echo "8. VNC网络连接:"
VNC_CONNECTIONS=$(netstat -an | grep :$VNC_PORT | grep ESTABLISHED | wc -l)
NOVNC_CONNECTIONS=$(netstat -an | grep :$NO_VNC_PORT | grep ESTABLISHED | wc -l)
echo "  - VNC活跃连接: $VNC_CONNECTIONS"
echo "  - NoVNC活跃连接: $NOVNC_CONNECTIONS"
echo ""

# 性能建议
echo "9. 性能建议:"
CPU_USAGE=$(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1 | cut -d'.' -f1)
MEM_USAGE=$(free | grep Mem | awk '{printf "%.0f", $3/$2*100}')

if [ $CPU_USAGE -gt 80 ]; then
    echo "  - ⚠️  CPU使用率过高 ($CPU_USAGE%)，建议优化浏览器参数或增加CPU资源"
fi

if [ $MEM_USAGE -gt 85 ]; then
    echo "  - ⚠️  内存使用率过高 ($MEM_USAGE%)，建议增加内存或优化内存使用"
fi

if [ $VNC_CONNECTIONS -eq 0 ] && [ $NOVNC_CONNECTIONS -eq 0 ]; then
    echo "  - ℹ️  当前无活跃VNC连接，服务处于待机状态"
fi

if [ $CPU_USAGE -lt 50 ] && [ $MEM_USAGE -lt 70 ]; then
    echo "  - ✅ 系统资源使用正常，性能良好"
fi

echo ""
echo "=== 监控报告结束 ==="