#!/bin/bash

# VNC服务配置修复脚本
# 用于检查和修复VNC服务的常见配置问题

set -e

echo "=== VNC服务配置修复脚本 ==="
echo "开始时间: $(date)"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否在容器环境中运行
check_container_environment() {
    log_info "检查容器环境..."
    
    if [ -f /.dockerenv ] || [ "$CONTAINER" = "true" ]; then
        log_info "✓ 检测到容器环境"
        export IN_CONTAINER=true
    else
        log_warn "⚠ 未检测到容器环境，某些修复可能不适用"
        export IN_CONTAINER=false
    fi
}

# 检查必要的目录和权限
check_directories() {
    log_info "检查必要的目录和权限..."
    
    # 创建必要的目录
    directories=(
        "/tmp/.X11-unix"
        "/var/log/supervisor"
        "/tmp/chrome-user-data"
        "/root/.vnc"
        "/dev/shm"
    )
    
    for dir in "${directories[@]}"; do
        if [ ! -d "$dir" ]; then
            log_warn "目录不存在，正在创建: $dir"
            mkdir -p "$dir"
        fi
        
        # 设置适当的权限
        case "$dir" in
            "/tmp/.X11-unix")
                chmod 1777 "$dir"
                log_info "✓ 设置 $dir 权限为 1777"
                ;;
            "/tmp/chrome-user-data")
                chmod 755 "$dir"
                log_info "✓ 设置 $dir 权限为 755"
                ;;
            "/dev/shm")
                chmod 1777 "$dir"
                log_info "✓ 设置 $dir 权限为 1777"
                ;;
            *)
                chmod 755 "$dir"
                log_info "✓ 设置 $dir 权限为 755"
                ;;
        esac
    done
}

# 检查环境变量
check_environment_variables() {
    log_info "检查环境变量..."
    
    # 设置默认环境变量
    export DISPLAY=${DISPLAY:-":1"}
    export VNC_PORT=${VNC_PORT:-"5900"}
    export NO_VNC_PORT=${NO_VNC_PORT:-"6080"}
    export VNC_RESOLUTION=${VNC_RESOLUTION:-"1280x720"}
    export VNC_PASSWORD=${VNC_PASSWORD:-"vnc123"}
    
    log_info "✓ DISPLAY: $DISPLAY"
    log_info "✓ VNC_PORT: $VNC_PORT"
    log_info "✓ NO_VNC_PORT: $NO_VNC_PORT"
    log_info "✓ VNC_RESOLUTION: $VNC_RESOLUTION"
}

# 检查和修复X11服务
check_x11_service() {
    log_info "检查X11服务..."
    
    # 检查Xvfb是否安装
    if ! command -v Xvfb >/dev/null 2>&1; then
        log_error "✗ Xvfb未安装"
        return 1
    fi
    
    log_info "✓ Xvfb已安装: $(which Xvfb)"
    
    # 检查X11服务是否运行
    if pgrep -f "Xvfb :1" >/dev/null 2>&1; then
        log_info "✓ X11服务正在运行"
    else
        log_warn "⚠ X11服务未运行，尝试启动..."
        
        # 清理可能存在的锁文件
        rm -f /tmp/.X1-lock
        
        # 启动Xvfb
        /usr/bin/Xvfb :1 -screen 0 ${VNC_RESOLUTION}x24 -ac +extension GLX +render -noreset -dpi 96 &
        sleep 3
        
        # 验证启动
        if xdpyinfo -display :1 >/dev/null 2>&1; then
            log_info "✓ X11服务启动成功"
        else
            log_error "✗ X11服务启动失败"
            return 1
        fi
    fi
}

# 检查和修复VNC服务
check_vnc_service() {
    log_info "检查VNC服务..."
    
    # 检查x11vnc是否安装
    if ! command -v x11vnc >/dev/null 2>&1; then
        log_error "✗ x11vnc未安装"
        return 1
    fi
    
    log_info "✓ x11vnc已安装: $(which x11vnc)"
    
    # 创建VNC密码文件
    if [ ! -f "/root/.vnc/passwd" ]; then
        log_warn "⚠ VNC密码文件不存在，正在创建..."
        mkdir -p /root/.vnc
        x11vnc -storepasswd "$VNC_PASSWORD" /root/.vnc/passwd
        log_info "✓ VNC密码文件创建成功"
    else
        log_info "✓ VNC密码文件已存在"
    fi
    
    # 检查VNC服务是否运行
    if pgrep -f "x11vnc" >/dev/null 2>&1; then
        log_info "✓ VNC服务正在运行"
    else
        log_warn "⚠ VNC服务未运行"
    fi
}

# 检查浏览器安装
check_browsers() {
    log_info "检查浏览器安装..."
    
    browsers_found=0
    
    # 检查Chromium
    if command -v chromium-browser >/dev/null 2>&1; then
        log_info "✓ 找到 chromium-browser: $(which chromium-browser)"
        browsers_found=$((browsers_found + 1))
    fi
    
    # 检查Google Chrome
    if command -v google-chrome-stable >/dev/null 2>&1; then
        log_info "✓ 找到 google-chrome-stable: $(which google-chrome-stable)"
        browsers_found=$((browsers_found + 1))
    fi
    
    # 检查Firefox
    if command -v firefox >/dev/null 2>&1; then
        log_info "✓ 找到 firefox: $(which firefox)"
        browsers_found=$((browsers_found + 1))
    fi
    
    if [ $browsers_found -eq 0 ]; then
        log_error "✗ 未找到任何可用的浏览器"
        return 1
    else
        log_info "✓ 找到 $browsers_found 个可用的浏览器"
    fi
}

# 检查supervisor配置
check_supervisor_config() {
    log_info "检查supervisor配置..."
    
    config_file="/etc/supervisor/conf.d/supervisord.conf"
    
    if [ ! -f "$config_file" ]; then
        log_error "✗ supervisor配置文件不存在: $config_file"
        return 1
    fi
    
    log_info "✓ supervisor配置文件存在: $config_file"
    
    # 检查配置文件语法
    if supervisord -c "$config_file" -t >/dev/null 2>&1; then
        log_info "✓ supervisor配置文件语法正确"
    else
        log_error "✗ supervisor配置文件语法错误"
        return 1
    fi
}

# 检查端口占用
check_ports() {
    log_info "检查端口占用..."
    
    # 检查VNC端口
    if netstat -tuln 2>/dev/null | grep -q ":$VNC_PORT "; then
        log_warn "⚠ VNC端口 $VNC_PORT 已被占用"
    else
        log_info "✓ VNC端口 $VNC_PORT 可用"
    fi
    
    # 检查noVNC端口
    if netstat -tuln 2>/dev/null | grep -q ":$NO_VNC_PORT "; then
        log_warn "⚠ noVNC端口 $NO_VNC_PORT 已被占用"
    else
        log_info "✓ noVNC端口 $NO_VNC_PORT 可用"
    fi
}

# 生成诊断报告
generate_diagnostic_report() {
    log_info "生成诊断报告..."
    
    report_file="/tmp/vnc-diagnostic-report.txt"
    
    cat > "$report_file" << EOF
VNC服务诊断报告
生成时间: $(date)

=== 系统信息 ===
操作系统: $(uname -a)
容器环境: $IN_CONTAINER

=== 环境变量 ===
DISPLAY: $DISPLAY
VNC_PORT: $VNC_PORT
NO_VNC_PORT: $NO_VNC_PORT
VNC_RESOLUTION: $VNC_RESOLUTION

=== 进程状态 ===
Xvfb进程: $(pgrep -f "Xvfb :1" >/dev/null 2>&1 && echo "运行中" || echo "未运行")
x11vnc进程: $(pgrep -f "x11vnc" >/dev/null 2>&1 && echo "运行中" || echo "未运行")
fluxbox进程: $(pgrep -f "fluxbox" >/dev/null 2>&1 && echo "运行中" || echo "未运行")
supervisor进程: $(pgrep -f "supervisord" >/dev/null 2>&1 && echo "运行中" || echo "未运行")

=== 端口状态 ===
$(netstat -tuln 2>/dev/null | grep -E ":($VNC_PORT|$NO_VNC_PORT) " || echo "无相关端口监听")

=== 日志文件 ===
$(find /var/log/supervisor -name "*.log" -type f 2>/dev/null | head -10 || echo "无日志文件")

EOF
    
    log_info "✓ 诊断报告已生成: $report_file"
}

# 主函数
main() {
    echo "开始VNC服务配置检查和修复..."
    echo ""
    
    # 执行检查步骤
    check_container_environment
    check_directories
    check_environment_variables
    check_x11_service
    check_vnc_service
    check_browsers
    check_supervisor_config
    check_ports
    generate_diagnostic_report
    
    echo ""
    log_info "=== VNC服务配置检查完成 ==="
    log_info "诊断报告: /tmp/vnc-diagnostic-report.txt"
    echo "结束时间: $(date)"
}

# 运行主函数
main "$@"