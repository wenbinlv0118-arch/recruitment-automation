#!/bin/bash
# 优化后的启动脚本
# 在Docker容器中启动Xvfb和Node.js应用

set -e

# 颜色定义
RED='\x1b[0;31m'
GREEN='\x1b[0;32m'
YELLOW='\x1b[1;33m'
NC='\x1b[0m' # No Color

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

# 清理函数
cleanup() {
    log_info "正在清理资源..."
    if [ ! -z "$XVFB_PID" ]; then
        kill $XVFB_PID 2>/dev/null || true
        log_info "Xvfb进程已关闭"
    fi
    if [ ! -z "$NODE_PID" ]; then
        kill $NODE_PID 2>/dev/null || true
        log_info "Node.js进程已关闭"
    fi
}

# 信号处理
trap cleanup SIGTERM SIGINT

# 验证Playwright（如果验证脚本存在）
if [ -f "./verify-playwright.sh" ]; then
    log_info "运行Playwright验证..."
    if ./verify-playwright.sh; then
        log_info "Playwright验证通过"
    else
        log_warn "Playwright验证失败，但继续启动应用"
    fi
else
    log_warn "未找到Playwright验证脚本，跳过验证"
fi

# 启动Xvfb虚拟显示服务器
log_info "启动Xvfb虚拟显示服务器..."
Xvfb :99 -screen 0 1024x768x24 -ac +extension GLX +render -noreset &
XVFB_PID=$!

# 等待Xvfb启动
sleep 2

# 验证Xvfb是否启动成功
if ! kill -0 $XVFB_PID 2>/dev/null; then
    log_error "Xvfb启动失败"
    exit 1
fi

log_info "Xvfb已启动 (PID: $XVFB_PID)"

# 设置显示环境变量
export DISPLAY=:99

# 启动Node.js应用
log_info "启动Node.js应用..."
npm start &
NODE_PID=$!

# 等待进程
wait $NODE_PID
NODE_EXIT_CODE=$?

log_info "Node.js应用已退出 (退出码: $NODE_EXIT_CODE)"

# 清理资源
cleanup

exit $NODE_EXIT_CODE
