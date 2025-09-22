#!/bin/bash

# 生产环境部署综合验证脚本
# 整合所有验证功能，确保生产环境部署的完整性和可靠性
# 作者: AI Assistant
# 版本: 1.0.0

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 全局变量
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="$PROJECT_ROOT/reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
VALIDATION_LOG="$REPORTS_DIR/production-validation-$TIMESTAMP.log"

# 验证结果统计
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# 创建报告目录
mkdir -p "$REPORTS_DIR"

# 日志函数
log() {
    echo -e "$1" | tee -a "$VALIDATION_LOG"
}

log_info() {
    log "${BLUE}[INFO]${NC} $1"
}

log_success() {
    log "${GREEN}[SUCCESS]${NC} $1"
    ((PASSED_CHECKS++))
}

log_warning() {
    log "${YELLOW}[WARNING]${NC} $1"
    ((WARNING_CHECKS++))
}

log_error() {
    log "${RED}[ERROR]${NC} $1"
    ((FAILED_CHECKS++))
}

log_header() {
    log ""
    log "${PURPLE}========================================${NC}"
    log "${PURPLE}$1${NC}"
    log "${PURPLE}========================================${NC}"
}

# 检查必需工具
check_required_tools() {
    log_header "检查必需工具"
    
    local tools=("node" "npm" "curl" "jq")
    local missing_tools=()
    
    for tool in "${tools[@]}"; do
        if command -v "$tool" >/dev/null 2>&1; then
            log_success "✅ $tool 已安装"
        else
            log_error "❌ $tool 未安装"
            missing_tools+=("$tool")
        fi
        ((TOTAL_CHECKS++))
    done
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        log_error "缺少必需工具: ${missing_tools[*]}"
        log_info "请安装缺少的工具后重新运行验证"
        return 1
    fi
    
    return 0
}

# 检查环境变量
check_environment_variables() {
    log_header "检查环境变量配置"
    
    # 必需的环境变量
    local required_vars=(
        "NODE_ENV"
        "PORT"
        "SUPABASE_URL"
        "SUPABASE_ANON_KEY"
        "JWT_SECRET"
        "CORS_ORIGIN"
    )
    
    # 可选的环境变量
    local optional_vars=(
        "UPLOAD_MAX_SIZE"
        "RATE_LIMIT_WINDOW"
        "RATE_LIMIT_MAX"
        "NODE_OPTIONS"
        "BROWSER_HEADLESS"
        "VNC_PASSWORD"
    )
    
    local missing_required=()
    
    # 检查必需变量
    for var in "${required_vars[@]}"; do
        if [ -n "${!var}" ]; then
            log_success "✅ $var 已设置"
        else
            log_error "❌ $var 未设置"
            missing_required+=("$var")
        fi
        ((TOTAL_CHECKS++))
    done
    
    # 检查可选变量
    for var in "${optional_vars[@]}"; do
        if [ -n "${!var}" ]; then
            log_info "ℹ️  $var 已设置: ${!var}"
        else
            log_warning "⚠️  $var 未设置（可选）"
        fi
        ((TOTAL_CHECKS++))
    done
    
    # 验证特定变量值
    if [ "$NODE_ENV" != "production" ]; then
        log_warning "⚠️  NODE_ENV 应该设置为 'production'，当前值: $NODE_ENV"
    fi
    
    if [ -n "$CORS_ORIGIN" ] && [ "$CORS_ORIGIN" = "*" ]; then
        log_warning "⚠️  CORS_ORIGIN 设置为通配符，生产环境建议设置具体域名"
    fi
    
    if [ ${#missing_required[@]} -gt 0 ]; then
        log_error "缺少必需的环境变量: ${missing_required[*]}"
        return 1
    fi
    
    return 0
}

# 检查项目文件结构
check_project_structure() {
    log_header "检查项目文件结构"
    
    # 必需的文件和目录
    local required_paths=(
        "package.json"
        "backend"
        "frontend"
        "vnc-service"
        "scripts"
        "backend/src"
        "backend/package.json"
        "frontend/package.json"
    )
    
    # 可选但建议的文件
    local optional_paths=(
        "zbpack.json"
        "backend/Dockerfile"
        "vnc-service/Dockerfile"
        "backend/.env.production"
        "deploy/config/.env.zeabur"
        "docs/DEPLOYMENT.md"
        "docs/API.md"
    )
    
    cd "$PROJECT_ROOT"
    
    # 检查必需路径
    for path in "${required_paths[@]}"; do
        if [ -e "$path" ]; then
            log_success "✅ $path 存在"
        else
            log_error "❌ $path 不存在"
        fi
        ((TOTAL_CHECKS++))
    done
    
    # 检查可选路径
    for path in "${optional_paths[@]}"; do
        if [ -e "$path" ]; then
            log_success "✅ $path 存在"
        else
            log_warning "⚠️  $path 不存在（建议创建）"
        fi
        ((TOTAL_CHECKS++))
    done
}

# 检查依赖安装
check_dependencies() {
    log_header "检查依赖安装"
    
    cd "$PROJECT_ROOT"
    
    # 检查根目录依赖
    if [ -f "package.json" ]; then
        if [ -d "node_modules" ]; then
            log_success "✅ 根目录依赖已安装"
        else
            log_warning "⚠️  根目录依赖未安装，尝试安装..."
            if npm install; then
                log_success "✅ 根目录依赖安装成功"
            else
                log_error "❌ 根目录依赖安装失败"
            fi
        fi
        ((TOTAL_CHECKS++))
    fi
    
    # 检查后端依赖
    if [ -f "backend/package.json" ]; then
        cd "$PROJECT_ROOT/backend"
        if [ -d "node_modules" ]; then
            log_success "✅ 后端依赖已安装"
        else
            log_warning "⚠️  后端依赖未安装，尝试安装..."
            if npm install; then
                log_success "✅ 后端依赖安装成功"
            else
                log_error "❌ 后端依赖安装失败"
            fi
        fi
        ((TOTAL_CHECKS++))
        cd "$PROJECT_ROOT"
    fi
    
    # 检查前端依赖
    if [ -f "frontend/package.json" ]; then
        cd "$PROJECT_ROOT/frontend"
        if [ -d "node_modules" ]; then
            log_success "✅ 前端依赖已安装"
        else
            log_warning "⚠️  前端依赖未安装，尝试安装..."
            if npm install; then
                log_success "✅ 前端依赖安装成功"
            else
                log_error "❌ 前端依赖安装失败"
            fi
        fi
        ((TOTAL_CHECKS++))
        cd "$PROJECT_ROOT"
    fi
}

# 运行核心功能测试
run_core_features_test() {
    log_header "运行核心功能测试"
    
    if [ -f "$SCRIPT_DIR/test-core-features.sh" ]; then
        log_info "执行核心功能测试..."
        if bash "$SCRIPT_DIR/test-core-features.sh"; then
            log_success "✅ 核心功能测试通过"
        else
            log_error "❌ 核心功能测试失败"
        fi
        ((TOTAL_CHECKS++))
    else
        log_warning "⚠️  核心功能测试脚本不存在"
        ((TOTAL_CHECKS++))
    fi
}

# 运行数据库连接测试
run_database_test() {
    log_header "运行数据库连接测试"
    
    if [ -f "$SCRIPT_DIR/test-database-connection.js" ]; then
        log_info "执行数据库连接测试..."
        if node "$SCRIPT_DIR/test-database-connection.js"; then
            log_success "✅ 数据库连接测试通过"
        else
            log_error "❌ 数据库连接测试失败"
        fi
        ((TOTAL_CHECKS++))
    else
        log_warning "⚠️  数据库连接测试脚本不存在"
        ((TOTAL_CHECKS++))
    fi
}

# 运行浏览器测试
run_browser_test() {
    log_header "运行浏览器测试"
    
    if [ -f "$SCRIPT_DIR/test-production-browser.js" ]; then
        log_info "执行生产环境浏览器测试..."
        if node "$SCRIPT_DIR/test-production-browser.js"; then
            log_success "✅ 浏览器测试通过"
        else
            log_error "❌ 浏览器测试失败"
        fi
        ((TOTAL_CHECKS++))
    else
        log_warning "⚠️  浏览器测试脚本不存在"
        ((TOTAL_CHECKS++))
    fi
}

# 运行网络和安全测试
run_network_security_test() {
    log_header "运行网络和安全测试"
    
    if [ -f "$SCRIPT_DIR/test-network-security.sh" ]; then
        log_info "执行网络和安全测试..."
        if bash "$SCRIPT_DIR/test-network-security.sh"; then
            log_success "✅ 网络和安全测试通过"
        else
            log_error "❌ 网络和安全测试失败"
        fi
        ((TOTAL_CHECKS++))
    else
        log_warning "⚠️  网络和安全测试脚本不存在"
        ((TOTAL_CHECKS++))
    fi
}

# 运行资源配置验证
run_resource_validation() {
    log_header "运行资源配置验证"
    
    if [ -f "$SCRIPT_DIR/production-resource-validator.js" ]; then
        log_info "执行生产环境资源配置验证..."
        if node "$SCRIPT_DIR/production-resource-validator.js" validate; then
            log_success "✅ 资源配置验证通过"
        else
            log_error "❌ 资源配置验证失败"
        fi
        ((TOTAL_CHECKS++))
    else
        log_warning "⚠️  资源配置验证脚本不存在"
        ((TOTAL_CHECKS++))
    fi
}

# 运行数据持久化验证
run_data_persistence_validation() {
    log_header "运行数据持久化验证"
    
    if [ -f "$SCRIPT_DIR/data-persistence-validator.js" ]; then
        log_info "执行数据持久化验证..."
        if node "$SCRIPT_DIR/data-persistence-validator.js" validate; then
            log_success "✅ 数据持久化验证通过"
        else
            log_error "❌ 数据持久化验证失败"
        fi
        ((TOTAL_CHECKS++))
    else
        log_warning "⚠️  数据持久化验证脚本不存在"
        ((TOTAL_CHECKS++))
    fi
}

# 运行性能监控
run_performance_monitoring() {
    log_header "运行性能监控"
    
    if [ -f "$SCRIPT_DIR/resource-performance-monitor.js" ]; then
        log_info "执行性能监控检查..."
        if node "$SCRIPT_DIR/resource-performance-monitor.js" check; then
            log_success "✅ 性能监控检查通过"
        else
            log_error "❌ 性能监控检查失败"
        fi
        ((TOTAL_CHECKS++))
    else
        log_warning "⚠️  性能监控脚本不存在"
        ((TOTAL_CHECKS++))
    fi
}

# 生成最终报告
generate_final_report() {
    log_header "生成最终验证报告"
    
    local success_rate=0
    if [ $TOTAL_CHECKS -gt 0 ]; then
        success_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    fi
    
    local overall_status="❌ 失败"
    if [ $FAILED_CHECKS -eq 0 ]; then
        if [ $WARNING_CHECKS -eq 0 ]; then
            overall_status="✅ 完全通过"
        else
            overall_status="⚠️ 通过（有警告）"
        fi
    fi
    
    log ""
    log "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    log "${CYAN}║                    生产环境部署验证报告                      ║${NC}"
    log "${CYAN}╠════════════════════════════════════════════════════════════╣${NC}"
    log "${CYAN}║${NC} 验证时间: $(date '+%Y-%m-%d %H:%M:%S')                           ${CYAN}║${NC}"
    log "${CYAN}║${NC} 总体状态: $overall_status                                    ${CYAN}║${NC}"
    log "${CYAN}║${NC} 成功率:   $success_rate%                                        ${CYAN}║${NC}"
    log "${CYAN}║${NC}                                                            ${CYAN}║${NC}"
    log "${CYAN}║${NC} 📊 统计信息:                                               ${CYAN}║${NC}"
    log "${CYAN}║${NC}   • 总检查项: $TOTAL_CHECKS                                    ${CYAN}║${NC}"
    log "${CYAN}║${NC}   • ✅ 通过: $PASSED_CHECKS                                    ${CYAN}║${NC}"
    log "${CYAN}║${NC}   • ❌ 失败: $FAILED_CHECKS                                    ${CYAN}║${NC}"
    log "${CYAN}║${NC}   • ⚠️ 警告: $WARNING_CHECKS                                    ${CYAN}║${NC}"
    log "${CYAN}║${NC}                                                            ${CYAN}║${NC}"
    log "${CYAN}║${NC} 📋 详细报告: $VALIDATION_LOG ${CYAN}║${NC}"
    log "${CYAN}║${NC} 📁 报告目录: $REPORTS_DIR                    ${CYAN}║${NC}"
    log "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    
    # 生成JSON格式的报告
    local json_report="$REPORTS_DIR/production-validation-summary-$TIMESTAMP.json"
    cat > "$json_report" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "overall_status": "$overall_status",
  "success_rate": $success_rate,
  "summary": {
    "total_checks": $TOTAL_CHECKS,
    "passed": $PASSED_CHECKS,
    "failed": $FAILED_CHECKS,
    "warnings": $WARNING_CHECKS
  },
  "reports": {
    "detailed_log": "$VALIDATION_LOG",
    "reports_directory": "$REPORTS_DIR"
  },
  "recommendations": [
    "检查失败的验证项并修复问题",
    "关注警告信息并进行优化",
    "定期运行验证确保系统稳定性",
    "监控生产环境性能指标",
    "建立自动化部署验证流程"
  ]
}
EOF
    
    log_info "JSON格式报告已保存: $json_report"
    
    # 返回适当的退出码
    if [ $FAILED_CHECKS -gt 0 ]; then
        return 1
    else
        return 0
    fi
}

# 显示帮助信息
show_help() {
    cat << EOF
🚀 生产环境部署综合验证脚本

用法:
  $0 [选项] [命令]

命令:
  full                     执行完整验证（默认）
  quick                    执行快速验证（跳过耗时测试）
  tools                    仅检查工具和环境
  structure                仅检查项目结构
  dependencies             仅检查依赖安装
  tests                    仅运行测试
  help                     显示帮助信息

选项:
  --skip-tests            跳过功能测试
  --skip-browser          跳过浏览器测试
  --skip-network          跳过网络测试
  --verbose               详细输出
  --quiet                 静默模式

环境变量:
  NODE_ENV                运行环境（应设置为 production）
  SUPABASE_URL            Supabase项目URL
  SUPABASE_ANON_KEY       Supabase匿名密钥
  JWT_SECRET              JWT密钥
  CORS_ORIGIN             CORS允许的源

示例:
  $0                      # 执行完整验证
  $0 quick                # 执行快速验证
  $0 --skip-tests         # 跳过功能测试
  $0 tools                # 仅检查工具

报告位置:
  详细日志: $REPORTS_DIR/production-validation-TIMESTAMP.log
  JSON报告: $REPORTS_DIR/production-validation-summary-TIMESTAMP.json
EOF
}

# 主函数
main() {
    local command="full"
    local skip_tests=false
    local skip_browser=false
    local skip_network=false
    local verbose=false
    local quiet=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            full|quick|tools|structure|dependencies|tests)
                command="$1"
                shift
                ;;
            --skip-tests)
                skip_tests=true
                shift
                ;;
            --skip-browser)
                skip_browser=true
                shift
                ;;
            --skip-network)
                skip_network=true
                shift
                ;;
            --verbose)
                verbose=true
                shift
                ;;
            --quiet)
                quiet=true
                shift
                ;;
            help|--help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "未知参数: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 设置日志级别
    if [ "$quiet" = true ]; then
        exec > /dev/null 2>&1
    fi
    
    # 开始验证
    log_header "开始生产环境部署验证"
    log_info "验证模式: $command"
    log_info "时间戳: $TIMESTAMP"
    log_info "项目根目录: $PROJECT_ROOT"
    log_info "报告目录: $REPORTS_DIR"
    
    # 根据命令执行相应的验证
    case $command in
        full)
            check_required_tools || exit 1
            check_environment_variables || exit 1
            check_project_structure
            check_dependencies
            
            if [ "$skip_tests" = false ]; then
                run_core_features_test
                run_database_test
                
                if [ "$skip_browser" = false ]; then
                    run_browser_test
                fi
                
                if [ "$skip_network" = false ]; then
                    run_network_security_test
                fi
            fi
            
            run_resource_validation
            run_data_persistence_validation
            run_performance_monitoring
            ;;
            
        quick)
            check_required_tools || exit 1
            check_environment_variables || exit 1
            check_project_structure
            run_resource_validation
            ;;
            
        tools)
            check_required_tools || exit 1
            check_environment_variables || exit 1
            ;;
            
        structure)
            check_project_structure
            ;;
            
        dependencies)
            check_dependencies
            ;;
            
        tests)
            if [ "$skip_tests" = false ]; then
                run_core_features_test
                run_database_test
                
                if [ "$skip_browser" = false ]; then
                    run_browser_test
                fi
                
                if [ "$skip_network" = false ]; then
                    run_network_security_test
                fi
            fi
            ;;
    esac
    
    # 生成最终报告
    generate_final_report
}

# 执行主函数
main "$@"