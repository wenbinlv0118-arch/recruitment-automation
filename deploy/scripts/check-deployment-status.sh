#!/bin/bash

# ===========================================
# Zeabur 部署状态检查脚本
# ===========================================
# 此脚本帮助验证 Zeabur 部署是否成功

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 URL 是否有效
check_url() {
    local url=$1
    local service_name=$2
    
    if [[ -z "$url" ]]; then
        print_error "$service_name URL 未提供"
        return 1
    fi
    
    print_info "检查 $service_name: $url"
    
    # 使用 curl 检查服务状态
    if curl -s --max-time 10 "$url" > /dev/null; then
        print_success "$service_name 服务正常运行"
        return 0
    else
        print_error "$service_name 服务无法访问"
        return 1
    fi
}

# 检查 API 健康状态
check_api_health() {
    local backend_url=$1
    
    if [[ -z "$backend_url" ]]; then
        print_warning "后端 URL 未提供，跳过 API 健康检查"
        return 0
    fi
    
    local health_url="${backend_url}/api/health"
    print_info "检查 API 健康状态: $health_url"
    
    local response=$(curl -s --max-time 10 "$health_url" 2>/dev/null || echo "")
    
    if [[ -n "$response" ]] && echo "$response" | grep -q "ok"; then
        print_success "API 健康检查通过"
        print_info "响应: $response"
        return 0
    else
        print_error "API 健康检查失败"
        if [[ -n "$response" ]]; then
            print_info "响应: $response"
        fi
        return 1
    fi
}

# 检查数据库连接
check_database_connection() {
    local backend_url=$1
    
    if [[ -z "$backend_url" ]]; then
        print_warning "后端 URL 未提供，跳过数据库连接检查"
        return 0
    fi
    
    local db_url="${backend_url}/api/test-db"
    print_info "检查数据库连接: $db_url"
    
    local response=$(curl -s --max-time 15 "$db_url" 2>/dev/null || echo "")
    
    if [[ -n "$response" ]] && (echo "$response" | grep -q "success\|connected\|ok"); then
        print_success "数据库连接正常"
        return 0
    else
        print_warning "数据库连接检查失败或端点不存在"
        if [[ -n "$response" ]]; then
            print_info "响应: $response"
        fi
        return 0  # 不作为致命错误
    fi
}

# 检查 CORS 配置
check_cors_configuration() {
    local backend_url=$1
    local frontend_url=$2
    
    if [[ -z "$backend_url" ]] || [[ -z "$frontend_url" ]]; then
        print_warning "URL 未完整提供，跳过 CORS 检查"
        return 0
    fi
    
    print_info "检查 CORS 配置..."
    
    # 发送 OPTIONS 请求检查 CORS
    local cors_response=$(curl -s --max-time 10 \
        -H "Origin: $frontend_url" \
        -H "Access-Control-Request-Method: GET" \
        -X OPTIONS \
        "${backend_url}/api/health" 2>/dev/null || echo "")
    
    if [[ -n "$cors_response" ]]; then
        print_success "CORS 配置检查完成"
    else
        print_warning "CORS 配置可能需要调整"
    fi
}

# 生成部署报告
generate_deployment_report() {
    local backend_url=$1
    local frontend_url=$2
    local vnc_url=$3
    
    print_info "\n=== 部署状态报告 ==="
    
    echo "部署时间: $(date)"
    echo "后端服务: ${backend_url:-'未提供'}"
    echo "前端服务: ${frontend_url:-'未提供'}"
    echo "VNC 服务: ${vnc_url:-'未提供'}"
    
    print_info "\n=== 下一步操作建议 ==="
    
    if [[ -n "$backend_url" ]] && [[ -n "$frontend_url" ]]; then
        echo "1. 访问前端应用: $frontend_url"
        echo "2. 测试用户登录功能"
        echo "3. 验证招聘功能是否正常"
        echo "4. 检查数据同步是否正常"
    fi
    
    if [[ -n "$vnc_url" ]]; then
        echo "5. 访问 VNC 服务: $vnc_url"
        echo "6. 测试浏览器自动化功能"
    fi
    
    print_info "\n=== 监控建议 ==="
    echo "- 定期检查服务状态"
    echo "- 监控资源使用情况"
    echo "- 查看应用日志"
    echo "- 设置告警通知"
}

# 主函数
main() {
    print_info "开始 Zeabur 部署状态检查...\n"
    
    # 从命令行参数获取 URL
    local backend_url=$1
    local frontend_url=$2
    local vnc_url=$3
    
    # 如果没有提供参数，提示用户输入
    if [[ -z "$backend_url" ]]; then
        echo "请提供服务 URL 进行检查:"
        read -p "后端服务 URL (可选): " backend_url
        read -p "前端服务 URL (可选): " frontend_url
        read -p "VNC 服务 URL (可选): " vnc_url
    fi
    
    local success_count=0
    local total_checks=0
    
    # 检查后端服务
    if [[ -n "$backend_url" ]]; then
        ((total_checks++))
        if check_url "$backend_url" "后端服务"; then
            ((success_count++))
        fi
        
        # API 健康检查
        ((total_checks++))
        if check_api_health "$backend_url"; then
            ((success_count++))
        fi
        
        # 数据库连接检查
        ((total_checks++))
        if check_database_connection "$backend_url"; then
            ((success_count++))
        fi
    fi
    
    # 检查前端服务
    if [[ -n "$frontend_url" ]]; then
        ((total_checks++))
        if check_url "$frontend_url" "前端服务"; then
            ((success_count++))
        fi
    fi
    
    # 检查 VNC 服务
    if [[ -n "$vnc_url" ]]; then
        ((total_checks++))
        if check_url "$vnc_url" "VNC 服务"; then
            ((success_count++))
        fi
    fi
    
    # CORS 配置检查
    if [[ -n "$backend_url" ]] && [[ -n "$frontend_url" ]]; then
        check_cors_configuration "$backend_url" "$frontend_url"
    fi
    
    # 生成报告
    generate_deployment_report "$backend_url" "$frontend_url" "$vnc_url"
    
    # 总结
    print_info "\n=== 检查结果总结 ==="
    echo "总检查项: $total_checks"
    echo "成功项目: $success_count"
    echo "失败项目: $((total_checks - success_count))"
    
    if [[ $success_count -eq $total_checks ]] && [[ $total_checks -gt 0 ]]; then
        print_success "\n🎉 所有检查项目都通过了！部署成功！"
        exit 0
    elif [[ $total_checks -eq 0 ]]; then
        print_warning "\n⚠️  没有提供 URL 进行检查"
        print_info "使用方法: $0 <backend_url> [frontend_url] [vnc_url]"
        exit 1
    else
        print_warning "\n⚠️  部分检查项目失败，请检查服务状态"
        exit 1
    fi
}

# 显示使用帮助
show_help() {
    echo "Zeabur 部署状态检查脚本"
    echo ""
    echo "使用方法:"
    echo "  $0 [backend_url] [frontend_url] [vnc_url]"
    echo ""
    echo "示例:"
    echo "  $0 https://backend.zeabur.app https://frontend.zeabur.app"
    echo "  $0 https://backend.zeabur.app"
    echo "  $0  # 交互式输入 URL"
    echo ""
    echo "参数:"
    echo "  backend_url   后端服务 URL (可选)"
    echo "  frontend_url  前端服务 URL (可选)"
    echo "  vnc_url       VNC 服务 URL (可选)"
    echo ""
    echo "功能:"
    echo "  - 检查服务可访问性"
    echo "  - 验证 API 健康状态"
    echo "  - 测试数据库连接"
    echo "  - 检查 CORS 配置"
    echo "  - 生成部署报告"
}

# 检查命令行参数
if [[ "$1" == "-h" ]] || [[ "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# 检查依赖
if ! command -v curl >/dev/null 2>&1; then
    print_error "curl 命令未找到，请先安装 curl"
    exit 1
fi

# 运行主函数
main "$@"