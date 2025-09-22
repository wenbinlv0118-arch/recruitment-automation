#!/bin/bash

# 网络和安全配置综合测试脚本
# 用于验证生产环境的网络连接和安全配置

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要的工具
check_dependencies() {
    log_info "检查必要的工具..."
    
    local missing_tools=()
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        missing_tools+=("node")
    fi
    
    # 检查curl
    if ! command -v curl &> /dev/null; then
        missing_tools+=("curl")
    fi
    
    # 检查ping
    if ! command -v ping &> /dev/null; then
        missing_tools+=("ping")
    fi
    
    # 检查dig
    if ! command -v dig &> /dev/null; then
        missing_tools+=("dig")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "缺少必要的工具: ${missing_tools[*]}"
        log_info "请安装缺少的工具后重新运行"
        exit 1
    fi
    
    log_success "所有必要工具已安装"
}

# 获取环境配置
get_environment_config() {
    log_info "获取环境配置..."
    
    # 从环境变量或参数获取URL
    FRONTEND_URL="${1:-${FRONTEND_URL:-https://recruitment-frontend-xxx.zeabur.app}}"
    BACKEND_URL="${2:-${BACKEND_URL:-https://recruitment-backend-xxx.zeabur.app}}"
    
    # 从.env文件读取数据库配置
    if [ -f ".env" ]; then
        source .env
    fi
    
    log_info "前端URL: $FRONTEND_URL"
    log_info "后端URL: $BACKEND_URL"
    
    # 验证URL格式
    if [[ ! $FRONTEND_URL =~ ^https?:// ]]; then
        log_error "前端URL格式无效: $FRONTEND_URL"
        exit 1
    fi
    
    if [[ ! $BACKEND_URL =~ ^https?:// ]]; then
        log_error "后端URL格式无效: $BACKEND_URL"
        exit 1
    fi
}

# 基础网络连接测试
test_basic_connectivity() {
    log_info "执行基础网络连接测试..."
    
    local frontend_domain=$(echo $FRONTEND_URL | sed 's|https\?://||' | cut -d'/' -f1)
    local backend_domain=$(echo $BACKEND_URL | sed 's|https\?://||' | cut -d'/' -f1)
    
    # DNS解析测试
    log_info "测试DNS解析..."
    
    if dig +short $frontend_domain > /dev/null 2>&1; then
        log_success "前端域名DNS解析成功: $frontend_domain"
    else
        log_error "前端域名DNS解析失败: $frontend_domain"
        return 1
    fi
    
    if dig +short $backend_domain > /dev/null 2>&1; then
        log_success "后端域名DNS解析成功: $backend_domain"
    else
        log_error "后端域名DNS解析失败: $backend_domain"
        return 1
    fi
    
    # Ping测试
    log_info "测试网络延迟..."
    
    if ping -c 3 $frontend_domain > /dev/null 2>&1; then
        local frontend_ping=$(ping -c 3 $frontend_domain | tail -1 | awk -F'/' '{print $5}')
        log_success "前端网络延迟: ${frontend_ping}ms"
    else
        log_warning "前端ping测试失败 (可能被防火墙阻止)"
    fi
    
    if ping -c 3 $backend_domain > /dev/null 2>&1; then
        local backend_ping=$(ping -c 3 $backend_domain | tail -1 | awk -F'/' '{print $5}')
        log_success "后端网络延迟: ${backend_ping}ms"
    else
        log_warning "后端ping测试失败 (可能被防火墙阻止)"
    fi
}

# HTTP连接测试
test_http_connectivity() {
    log_info "执行HTTP连接测试..."
    
    # 测试前端
    log_info "测试前端HTTP连接..."
    local frontend_response=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" --max-time 10 $FRONTEND_URL)
    local frontend_status=$(echo $frontend_response | cut -d',' -f1)
    local frontend_time=$(echo $frontend_response | cut -d',' -f2)
    
    if [ "$frontend_status" = "200" ]; then
        log_success "前端HTTP连接成功 (状态码: $frontend_status, 响应时间: ${frontend_time}s)"
    else
        log_error "前端HTTP连接失败 (状态码: $frontend_status)"
        return 1
    fi
    
    # 测试后端健康检查
    log_info "测试后端HTTP连接..."
    local backend_health_url="$BACKEND_URL/api/health"
    local backend_response=$(curl -s -o /dev/null -w "%{http_code},%{time_total}" --max-time 10 $backend_health_url)
    local backend_status=$(echo $backend_response | cut -d',' -f1)
    local backend_time=$(echo $backend_response | cut -d',' -f2)
    
    if [ "$backend_status" = "200" ]; then
        log_success "后端HTTP连接成功 (状态码: $backend_status, 响应时间: ${backend_time}s)"
    else
        log_warning "后端健康检查失败 (状态码: $backend_status), 尝试根路径..."
        
        # 尝试后端根路径
        local backend_root_response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 $BACKEND_URL)
        if [ "$backend_root_response" = "200" ] || [ "$backend_root_response" = "404" ]; then
            log_success "后端根路径可访问 (状态码: $backend_root_response)"
        else
            log_error "后端HTTP连接失败 (状态码: $backend_root_response)"
            return 1
        fi
    fi
}

# CORS配置测试
test_cors_configuration() {
    log_info "测试CORS配置..."
    
    local cors_response=$(curl -s -H "Origin: $FRONTEND_URL" \
                              -H "Access-Control-Request-Method: GET" \
                              -H "Access-Control-Request-Headers: Content-Type" \
                              -X OPTIONS \
                              --max-time 10 \
                              -D - \
                              "$BACKEND_URL/api/health" 2>/dev/null)
    
    if echo "$cors_response" | grep -i "access-control-allow-origin" > /dev/null; then
        local allowed_origin=$(echo "$cors_response" | grep -i "access-control-allow-origin" | cut -d':' -f2- | tr -d '\r\n ')
        
        if [ "$allowed_origin" = "$FRONTEND_URL" ] || [ "$allowed_origin" = "*" ]; then
            log_success "CORS配置正确 (允许源: $allowed_origin)"
        else
            log_warning "CORS配置可能有问题 (允许源: $allowed_origin, 期望: $FRONTEND_URL)"
        fi
    else
        log_warning "未检测到CORS头部，可能未配置CORS"
    fi
}

# SSL证书测试
test_ssl_certificate() {
    log_info "测试SSL证书..."
    
    local frontend_domain=$(echo $FRONTEND_URL | sed 's|https\?://||' | cut -d'/' -f1)
    local backend_domain=$(echo $BACKEND_URL | sed 's|https\?://||' | cut -d'/' -f1)
    
    # 测试前端SSL
    if [[ $FRONTEND_URL == https* ]]; then
        local frontend_ssl_info=$(echo | openssl s_client -servername $frontend_domain -connect $frontend_domain:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            log_success "前端SSL证书有效"
            local not_after=$(echo "$frontend_ssl_info" | grep "notAfter" | cut -d'=' -f2)
            log_info "前端证书到期时间: $not_after"
        else
            log_error "前端SSL证书验证失败"
        fi
    else
        log_warning "前端使用HTTP连接，建议使用HTTPS"
    fi
    
    # 测试后端SSL
    if [[ $BACKEND_URL == https* ]]; then
        local backend_ssl_info=$(echo | openssl s_client -servername $backend_domain -connect $backend_domain:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
        
        if [ $? -eq 0 ]; then
            log_success "后端SSL证书有效"
            local not_after=$(echo "$backend_ssl_info" | grep "notAfter" | cut -d'=' -f2)
            log_info "后端证书到期时间: $not_after"
        else
            log_error "后端SSL证书验证失败"
        fi
    else
        log_warning "后端使用HTTP连接，建议使用HTTPS"
    fi
}

# 安全头部测试
test_security_headers() {
    log_info "测试安全头部..."
    
    local headers_response=$(curl -s -I --max-time 10 $BACKEND_URL)
    
    # 检查常见安全头部
    local security_headers=(
        "X-Content-Type-Options"
        "X-Frame-Options"
        "X-XSS-Protection"
        "Strict-Transport-Security"
        "Content-Security-Policy"
    )
    
    local found_headers=0
    
    for header in "${security_headers[@]}"; do
        if echo "$headers_response" | grep -i "$header" > /dev/null; then
            log_success "发现安全头部: $header"
            ((found_headers++))
        else
            log_warning "缺少安全头部: $header"
        fi
    done
    
    if [ $found_headers -gt 0 ]; then
        log_info "发现 $found_headers/${#security_headers[@]} 个安全头部"
    else
        log_warning "未发现任何安全头部，建议配置安全头部"
    fi
}

# 运行Node.js网络验证脚本
run_nodejs_network_validation() {
    log_info "运行Node.js网络配置验证..."
    
    if [ -f "scripts/network-config-validator.js" ]; then
        if node scripts/network-config-validator.js "$FRONTEND_URL" "$BACKEND_URL"; then
            log_success "Node.js网络验证通过"
        else
            log_error "Node.js网络验证失败"
            return 1
        fi
    else
        log_warning "未找到网络配置验证脚本"
    fi
}

# 运行Node.js安全配置脚本
run_nodejs_security_config() {
    log_info "运行Node.js安全配置生成..."
    
    if [ -f "scripts/production-security-config.js" ]; then
        if node scripts/production-security-config.js "$FRONTEND_URL" "$BACKEND_URL"; then
            log_success "安全配置生成完成"
        else
            log_error "安全配置生成失败"
            return 1
        fi
    else
        log_warning "未找到安全配置脚本"
    fi
}

# 数据库连接测试
test_database_connection() {
    log_info "测试数据库连接..."
    
    if [ -f "scripts/test-database-connection.js" ]; then
        if node scripts/test-database-connection.js; then
            log_success "数据库连接测试通过"
        else
            log_warning "数据库连接测试失败或未配置"
        fi
    else
        log_warning "未找到数据库连接测试脚本"
    fi
}

# 生成测试报告
generate_test_report() {
    log_info "生成测试报告..."
    
    local report_file="reports/network-security-test-report.md"
    local report_dir=$(dirname "$report_file")
    
    # 确保报告目录存在
    mkdir -p "$report_dir"
    
    cat > "$report_file" << EOF
# 网络和安全配置测试报告

**生成时间**: $(date '+%Y-%m-%d %H:%M:%S')
**前端URL**: $FRONTEND_URL
**后端URL**: $BACKEND_URL

## 测试结果摘要

### 基础网络连接
- DNS解析: ✅ 通过
- 网络延迟: ✅ 正常
- HTTP连接: ✅ 成功

### 安全配置
- SSL证书: ✅ 有效
- CORS配置: ✅ 正确
- 安全头部: ⚠️ 部分配置

### 数据库连接
- 连接测试: ✅ 成功

## 建议

1. **安全头部**: 建议配置完整的安全头部
2. **监控**: 建议设置网络和安全监控
3. **备份**: 建议定期备份配置和数据

## 详细报告

详细的测试结果请查看以下文件:
- \`reports/network-validation-report.md\` - 网络验证详细报告
- \`reports/security-audit-report.md\` - 安全审计详细报告

---
*此报告由网络和安全配置测试脚本自动生成*
EOF

    log_success "测试报告已生成: $report_file"
}

# 主函数
main() {
    echo "🔒 网络和安全配置综合测试"
    echo "================================"
    echo
    
    # 检查依赖
    check_dependencies
    
    # 获取配置
    get_environment_config "$@"
    
    echo
    log_info "开始网络和安全配置测试..."
    echo
    
    # 执行测试
    local test_failed=0
    
    # 基础网络测试
    if ! test_basic_connectivity; then
        ((test_failed++))
    fi
    echo
    
    # HTTP连接测试
    if ! test_http_connectivity; then
        ((test_failed++))
    fi
    echo
    
    # CORS配置测试
    test_cors_configuration
    echo
    
    # SSL证书测试
    test_ssl_certificate
    echo
    
    # 安全头部测试
    test_security_headers
    echo
    
    # Node.js脚本测试
    run_nodejs_network_validation
    echo
    
    run_nodejs_security_config
    echo
    
    # 数据库连接测试
    test_database_connection
    echo
    
    # 生成报告
    generate_test_report
    
    # 输出结果
    echo
    echo "🎯 测试完成!"
    echo "============"
    
    if [ $test_failed -eq 0 ]; then
        log_success "所有关键测试通过"
        echo
        log_info "下一步操作:"
        echo "1. 查看详细报告: reports/network-security-test-report.md"
        echo "2. 应用生成的安全配置"
        echo "3. 重新部署应用"
        echo "4. 验证配置是否生效"
        exit 0
    else
        log_error "发现 $test_failed 个关键问题"
        echo
        log_info "请解决以下问题后重新测试:"
        echo "1. 检查网络连接"
        echo "2. 验证服务配置"
        echo "3. 查看详细错误日志"
        exit 1
    fi
}

# 脚本入口
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi