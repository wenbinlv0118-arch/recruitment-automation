#!/bin/bash
# verify-production-deployment.sh
# 生产环境部署验证脚本

set -e

echo "🚀 开始生产环境部署验证..."
echo "时间: $(date)"
echo "环境: $NODE_ENV"
echo "=================================="

# 检查必要的环境变量
check_env_vars() {
    echo "🔍 检查环境变量..."
    
    required_vars=(
        "NODE_ENV"
        "REACT_APP_API_BASE_URL"
        "SUPABASE_URL"
        "OPENAI_API_KEY"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            echo "❌ 缺少环境变量: $var"
            exit 1
        else
            echo "✅ $var 已设置"
        fi
    done
}

# 检查服务状态
check_services() {
    echo "📡 检查服务状态..."
    
    # 检查前端服务
    if curl -f -s --max-time 30 "$REACT_APP_API_BASE_URL" > /dev/null; then
        echo "✅ 前端服务正常"
    else
        echo "❌ 前端服务异常"
        return 1
    fi
    
    # 检查后端API
    if curl -f -s --max-time 30 "$REACT_APP_API_BASE_URL/api/health" > /dev/null; then
        echo "✅ 后端API正常"
    else
        echo "❌ 后端API异常"
        return 1
    fi
}

# 测试数据库连接
test_database() {
    echo "💾 测试数据库连接..."
    
    if [ -f "backend/scripts/test-database-connection.js" ]; then
        if node backend/scripts/test-database-connection.js; then
            echo "✅ 数据库连接正常"
        else
            echo "❌ 数据库连接失败"
            return 1
        fi
    else
        echo "⚠️ 数据库测试脚本不存在，跳过测试"
    fi
}

# 测试浏览器自动化
test_browser() {
    echo "🤖 测试浏览器自动化..."
    
    if [ -f "backend/test-production-browser.js" ]; then
        if timeout 60 node backend/test-production-browser.js; then
            echo "✅ 浏览器自动化正常"
        else
            echo "❌ 浏览器自动化失败"
            return 1
        fi
    else
        echo "⚠️ 浏览器测试脚本不存在，跳过测试"
    fi
}

# 测试VNC服务
test_vnc() {
    echo "🖥️ 测试VNC服务..."
    
    # 检查VNC端口是否开放
    if command -v nc >/dev/null 2>&1; then
        if nc -z localhost 5901 2>/dev/null; then
            echo "✅ VNC端口5901开放"
        else
            echo "⚠️ VNC端口5901未开放"
        fi
    fi
    
    # 检查VNC Web界面
    if curl -f -s --max-time 10 "http://localhost:6080/vnc.html" > /dev/null; then
        echo "✅ VNC Web界面可访问"
    else
        echo "⚠️ VNC Web界面不可访问"
    fi
}

# 生成验证报告
generate_report() {
    echo "📊 生成验证报告..."
    
    report_file="production-verification-$(date +%Y%m%d-%H%M%S).log"
    
    {
        echo "生产环境验证报告"
        echo "=================="
        echo "验证时间: $(date)"
        echo "环境: $NODE_ENV"
        echo "API地址: $REACT_APP_API_BASE_URL"
        echo ""
        echo "验证结果:"
        echo "- 环境变量: $env_check_result"
        echo "- 服务状态: $service_check_result"
        echo "- 数据库连接: $database_check_result"
        echo "- 浏览器自动化: $browser_check_result"
        echo "- VNC服务: $vnc_check_result"
    } > "$report_file"
    
    echo "✅ 验证报告已保存到: $report_file"
}

# 主执行流程
main() {
    # 执行各项检查
    if check_env_vars; then
        env_check_result="✅ 通过"
    else
        env_check_result="❌ 失败"
    fi
    
    if check_services; then
        service_check_result="✅ 通过"
    else
        service_check_result="❌ 失败"
    fi
    
    if test_database; then
        database_check_result="✅ 通过"
    else
        database_check_result="❌ 失败"
    fi
    
    if test_browser; then
        browser_check_result="✅ 通过"
    else
        browser_check_result="❌ 失败"
    fi
    
    if test_vnc; then
        vnc_check_result="✅ 通过"
    else
        vnc_check_result="❌ 失败"
    fi
    
    # 生成报告
    generate_report
    
    echo "=================================="
    echo "✅ 生产环境验证完成"
    echo "详细报告请查看: $report_file"
    
    # 检查是否有失败项
    if [[ "$env_check_result" == *"失败"* ]] || 
       [[ "$service_check_result" == *"失败"* ]] || 
       [[ "$database_check_result" == *"失败"* ]] || 
       [[ "$browser_check_result" == *"失败"* ]]; then
        echo "⚠️ 发现问题，请检查上述失败项"
        exit 1
    fi
}

# 执行主函数
main "$@"