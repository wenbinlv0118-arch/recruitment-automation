#!/bin/bash

# VNC性能测试脚本
# 用于测试VNC优化后的性能表现

echo "=== VNC性能优化测试 ==="
echo "测试开始时间: $(date)"
echo ""

# 测试配置
TEST_DURATION=30  # 测试持续时间（秒）
SAMPLE_INTERVAL=2 # 采样间隔（秒）
LOG_FILE="/tmp/vnc-performance-test-$(date +%Y%m%d-%H%M%S).log"

echo "测试配置:"
echo "  - 测试持续时间: ${TEST_DURATION}秒"
echo "  - 采样间隔: ${SAMPLE_INTERVAL}秒"
echo "  - 日志文件: $LOG_FILE"
echo ""

# 创建日志文件
touch "$LOG_FILE"
echo "时间戳,CPU使用率(%),内存使用率(%),VNC连接数,NoVNC连接数,Xvfb进程状态,浏览器进程状态" > "$LOG_FILE"

# 性能基线测试
echo "1. 系统基线性能:"
echo "  - CPU核心数: $(nproc)"
echo "  - 总内存: $(free -h | grep Mem | awk '{print $2}')"
echo "  - 可用内存: $(free -h | grep Mem | awk '{print $7}')"
echo "  - 磁盘空间: $(df -h / | tail -1 | awk '{print $4}' | head -1)"
echo ""

# VNC服务状态检查
echo "2. VNC服务状态检查:"
XVFB_STATUS=$(pgrep -f Xvfb >/dev/null && echo "运行" || echo "停止")
FLUXBOX_STATUS=$(pgrep -f fluxbox >/dev/null && echo "运行" || echo "停止")
X11VNC_STATUS=$(pgrep -f x11vnc >/dev/null && echo "运行" || echo "停止")
NOVNC_STATUS=$(pgrep -f novnc_proxy >/dev/null && echo "运行" || echo "停止")
BROWSER_STATUS=$(pgrep -f 'chromium\|chrome\|firefox' >/dev/null && echo "运行" || echo "停止")

echo "  - Xvfb: $XVFB_STATUS"
echo "  - Fluxbox: $FLUXBOX_STATUS"
echo "  - X11VNC: $X11VNC_STATUS"
echo "  - NoVNC: $NOVNC_STATUS"
echo "  - 浏览器: $BROWSER_STATUS"
echo ""

# 检查VNC配置
echo "3. VNC配置验证:"
echo "  - VNC分辨率: ${VNC_RESOLUTION:-'未设置'}"
echo "  - VNC质量: ${VNC_QUALITY:-'未设置'}"
echo "  - VNC压缩级别: ${VNC_COMPRESS_LEVEL:-'未设置'}"
echo "  - VNC端口: ${VNC_PORT:-5901}"
echo "  - NoVNC端口: ${NO_VNC_PORT:-6080}"
echo ""

# 端口监听检查
echo "4. 端口监听状态:"
VNC_PORT_STATUS=$(netstat -ln | grep ":${VNC_PORT:-5901}" >/dev/null && echo "监听中" || echo "未监听")
NOVNC_PORT_STATUS=$(netstat -ln | grep ":${NO_VNC_PORT:-6080}" >/dev/null && echo "监听中" || echo "未监听")
echo "  - VNC端口 ${VNC_PORT:-5901}: $VNC_PORT_STATUS"
echo "  - NoVNC端口 ${NO_VNC_PORT:-6080}: $NOVNC_PORT_STATUS"
echo ""

# 开始性能监控
echo "5. 开始性能监控测试 (${TEST_DURATION}秒)..."
echo "   监控指标: CPU使用率、内存使用率、连接数、进程状态"
echo ""

# 性能数据收集
START_TIME=$(date +%s)
SAMPLE_COUNT=0
TOTAL_CPU=0
TOTAL_MEM=0
MAX_CPU=0
MAX_MEM=0
MIN_CPU=100
MIN_MEM=100

while [ $(($(date +%s) - START_TIME)) -lt $TEST_DURATION ]; do
    CURRENT_TIME=$(date '+%Y-%m-%d %H:%M:%S')
    
    # 获取CPU和内存使用率
    CPU_USAGE=$(top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1)
    MEM_USAGE=$(free | grep Mem | awk '{printf "%.1f", $3/$2*100}')
    
    # 获取连接数
    VNC_CONNECTIONS=$(netstat -an | grep ":${VNC_PORT:-5901}" | grep ESTABLISHED | wc -l)
    NOVNC_CONNECTIONS=$(netstat -an | grep ":${NO_VNC_PORT:-6080}" | grep ESTABLISHED | wc -l)
    
    # 检查进程状态
    XVFB_RUNNING=$(pgrep -f Xvfb >/dev/null && echo "1" || echo "0")
    BROWSER_RUNNING=$(pgrep -f 'chromium\|chrome\|firefox' >/dev/null && echo "1" || echo "0")
    
    # 记录到日志文件
    echo "$CURRENT_TIME,$CPU_USAGE,$MEM_USAGE,$VNC_CONNECTIONS,$NOVNC_CONNECTIONS,$XVFB_RUNNING,$BROWSER_RUNNING" >> "$LOG_FILE"
    
    # 统计数据
    SAMPLE_COUNT=$((SAMPLE_COUNT + 1))
    TOTAL_CPU=$(echo "$TOTAL_CPU + $CPU_USAGE" | bc -l 2>/dev/null || echo "$TOTAL_CPU")
    TOTAL_MEM=$(echo "$TOTAL_MEM + $MEM_USAGE" | bc -l 2>/dev/null || echo "$TOTAL_MEM")
    
    # 更新最大最小值
    if (( $(echo "$CPU_USAGE > $MAX_CPU" | bc -l 2>/dev/null || echo 0) )); then
        MAX_CPU=$CPU_USAGE
    fi
    if (( $(echo "$CPU_USAGE < $MIN_CPU" | bc -l 2>/dev/null || echo 0) )); then
        MIN_CPU=$CPU_USAGE
    fi
    if (( $(echo "$MEM_USAGE > $MAX_MEM" | bc -l 2>/dev/null || echo 0) )); then
        MAX_MEM=$MEM_USAGE
    fi
    if (( $(echo "$MEM_USAGE < $MIN_MEM" | bc -l 2>/dev/null || echo 0) )); then
        MIN_MEM=$MEM_USAGE
    fi
    
    # 显示实时状态
    printf "\r   进度: %d/%d秒 | CPU: %s%% | 内存: %s%% | VNC连接: %d" \
           $(($(date +%s) - START_TIME)) $TEST_DURATION $CPU_USAGE $MEM_USAGE $VNC_CONNECTIONS
    
    sleep $SAMPLE_INTERVAL
done

echo ""
echo ""

# 计算平均值
if [ $SAMPLE_COUNT -gt 0 ]; then
    AVG_CPU=$(echo "scale=2; $TOTAL_CPU / $SAMPLE_COUNT" | bc -l 2>/dev/null || echo "N/A")
    AVG_MEM=$(echo "scale=2; $TOTAL_MEM / $SAMPLE_COUNT" | bc -l 2>/dev/null || echo "N/A")
else
    AVG_CPU="N/A"
    AVG_MEM="N/A"
fi

# 性能测试结果
echo "6. 性能测试结果:"
echo "  - 测试样本数: $SAMPLE_COUNT"
echo "  - CPU使用率 - 平均: ${AVG_CPU}%, 最大: ${MAX_CPU}%, 最小: ${MIN_CPU}%"
echo "  - 内存使用率 - 平均: ${AVG_MEM}%, 最大: ${MAX_MEM}%, 最小: ${MIN_MEM}%"
echo ""

# 性能评估
echo "7. 性能评估:"
if [ "$AVG_CPU" != "N/A" ] && (( $(echo "$AVG_CPU < 50" | bc -l 2>/dev/null || echo 0) )); then
    echo "  ✅ CPU性能: 优秀 (平均使用率 < 50%)"
elif [ "$AVG_CPU" != "N/A" ] && (( $(echo "$AVG_CPU < 70" | bc -l 2>/dev/null || echo 0) )); then
    echo "  ⚠️  CPU性能: 良好 (平均使用率 < 70%)"
else
    echo "  ❌ CPU性能: 需要优化 (平均使用率 >= 70%)"
fi

if [ "$AVG_MEM" != "N/A" ] && (( $(echo "$AVG_MEM < 60" | bc -l 2>/dev/null || echo 0) )); then
    echo "  ✅ 内存性能: 优秀 (平均使用率 < 60%)"
elif [ "$AVG_MEM" != "N/A" ] && (( $(echo "$AVG_MEM < 80" | bc -l 2>/dev/null || echo 0) )); then
    echo "  ⚠️  内存性能: 良好 (平均使用率 < 80%)"
else
    echo "  ❌ 内存性能: 需要优化 (平均使用率 >= 80%)"
fi

# 服务稳定性检查
if [ "$XVFB_STATUS" = "运行" ] && [ "$X11VNC_STATUS" = "运行" ] && [ "$NOVNC_STATUS" = "运行" ]; then
    echo "  ✅ 服务稳定性: 优秀 (所有核心服务正常运行)"
else
    echo "  ❌ 服务稳定性: 异常 (部分服务未运行)"
fi

echo ""

# 优化建议
echo "8. 优化建议:"
if [ "$AVG_CPU" != "N/A" ] && (( $(echo "$AVG_CPU > 70" | bc -l 2>/dev/null || echo 0) )); then
    echo "  - 建议增加CPU资源或优化浏览器启动参数"
fi

if [ "$AVG_MEM" != "N/A" ] && (( $(echo "$AVG_MEM > 80" | bc -l 2>/dev/null || echo 0) )); then
    echo "  - 建议增加内存资源或启用内存压缩"
fi

if [ "$VNC_PORT_STATUS" = "未监听" ] || [ "$NOVNC_PORT_STATUS" = "未监听" ]; then
    echo "  - 检查VNC服务配置，确保端口正确监听"
fi

if [ "$BROWSER_STATUS" = "停止" ]; then
    echo "  - 检查浏览器启动配置，确保浏览器正常启动"
fi

echo ""
echo "详细性能数据已保存到: $LOG_FILE"
echo "测试完成时间: $(date)"
echo "=== VNC性能测试结束 ==="