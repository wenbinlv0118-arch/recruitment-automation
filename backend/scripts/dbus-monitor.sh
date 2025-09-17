#!/bin/bash

# D-Bus错误监控和预防脚本
# 用于生产环境检测和预防D-Bus相关错误

set -e

echo "=== D-Bus错误监控和预防脚本 ==="
echo "启动时间: $(date)"

# 检查D-Bus环境变量配置
check_dbus_env() {
    echo "\n=== 检查D-Bus环境变量配置 ==="
    
    # 检查关键环境变量
    local vars=("DBUS_SESSION_BUS_ADDRESS" "DBUS_SYSTEM_BUS_ADDRESS" "NO_DBUS" "DISABLE_DBUS")
    
    for var in "${vars[@]}"; do
        if [ -z "${!var}" ] && [ "$var" != "DBUS_SESSION_BUS_ADDRESS" ] && [ "$var" != "DBUS_SYSTEM_BUS_ADDRESS" ]; then
            echo "⚠️  警告: $var 未设置"
        else
            echo "✅ $var = ${!var:-'(空字符串)'}"
        fi
    done
}

# 检查D-Bus套接字文件
check_dbus_sockets() {
    echo "\n=== 检查D-Bus套接字文件 ==="
    
    local sockets=("/run/dbus/system_bus_socket" "/var/run/dbus/system_bus_socket")
    
    for socket in "${sockets[@]}"; do
        if [ -e "$socket" ]; then
            echo "📁 发现套接字文件: $socket"
            ls -la "$socket" 2>/dev/null || echo "无法读取文件权限"
        else
            echo "❌ 套接字文件不存在: $socket"
        fi
    done
}

# 检查D-Bus进程
check_dbus_processes() {
    echo "\n=== 检查D-Bus相关进程 ==="
    
    local dbus_procs=$(ps aux | grep -i dbus | grep -v grep || true)
    
    if [ -z "$dbus_procs" ]; then
        echo "✅ 没有发现D-Bus相关进程"
    else
        echo "⚠️  发现D-Bus相关进程:"
        echo "$dbus_procs"
    fi
}

# 监控日志中的D-Bus错误
monitor_dbus_errors() {
    echo "\n=== 监控D-Bus错误日志 ==="
    
    # 检查常见的D-Bus错误模式
    local error_patterns=(
        "Failed to connect to the bus"
        "Failed to connect to socket.*dbus"
        "Address does not contain a colon"
        "No such file or directory.*dbus"
    )
    
    for pattern in "${error_patterns[@]}"; do
        echo "🔍 搜索错误模式: $pattern"
        
        # 在当前目录及子目录中搜索日志文件
        find . -name "*.log" -o -name "*.out" -o -name "*.err" 2>/dev/null | \
        xargs grep -l "$pattern" 2>/dev/null | \
        while read -r file; do
            echo "  ❌ 在 $file 中发现错误"
            grep "$pattern" "$file" | tail -3
        done
    done
}

# 应用D-Bus禁用配置
apply_dbus_disable() {
    echo "\n=== 应用D-Bus禁用配置 ==="
    
    # 设置环境变量
    export DBUS_SESSION_BUS_ADDRESS=""
    export DBUS_SYSTEM_BUS_ADDRESS=""
    export NO_DBUS=1
    export DISABLE_DBUS=1
    export NO_AT_BRIDGE=1
    export GSETTINGS_BACKEND=memory
    export GDK_BACKEND=x11
    export DBUS_FATAL_WARNINGS=0
    export DBUS_VERBOSE=0
    export XDG_RUNTIME_DIR="/tmp"
    export PULSE_RUNTIME_PATH="/tmp"
    export DISABLE_DESKTOP_NOTIFICATIONS=1
    export DISABLE_SYSTEM_NOTIFICATIONS=1
    
    echo "✅ D-Bus禁用环境变量已设置"
    
    # 创建虚拟套接字文件（如果不存在）
    if [ ! -e "/run/dbus/system_bus_socket" ]; then
        mkdir -p /run/dbus 2>/dev/null || true
        touch /run/dbus/system_bus_socket 2>/dev/null || true
        chmod 000 /run/dbus/system_bus_socket 2>/dev/null || true
        echo "✅ 创建虚拟D-Bus套接字文件"
    fi
}

# 生成监控报告
generate_report() {
    echo "\n=== D-Bus监控报告 ==="
    echo "报告生成时间: $(date)"
    echo "主机名: $(hostname)"
    echo "用户: $(whoami)"
    echo "工作目录: $(pwd)"
    echo "Node.js版本: $(node --version 2>/dev/null || echo '未安装')"
    echo "操作系统: $(uname -a)"
}

# 主函数
main() {
    generate_report
    check_dbus_env
    check_dbus_sockets
    check_dbus_processes
    monitor_dbus_errors
    apply_dbus_disable
    
    echo "\n=== D-Bus监控完成 ==="
    echo "如果发现任何错误，请检查上述输出并采取相应措施"
}

# 如果脚本被直接执行
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi