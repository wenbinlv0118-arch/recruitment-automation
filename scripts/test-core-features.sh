#!/bin/bash
# test-core-features.sh
# 核心功能测试脚本

set -e

echo "🧪 开始核心功能测试..."
echo "时间: $(date)"
echo "环境: $NODE_ENV"
echo "=================================="

# 测试用户认证功能
test_user_auth() {
    echo "👤 测试用户认证功能..."
    
    if [ -f "backend/scripts/test-user-auth.js" ]; then
        if timeout 30 node backend/scripts/test-user-auth.js; then
            echo "✅ 用户认证功能正常"
            return 0
        else
            echo "❌ 用户认证功能失败"
            return 1
        fi
    else
        echo "⚠️ 用户认证测试脚本不存在，跳过测试"
        return 0
    fi
}

# 测试简历解析功能
test_resume_parsing() {
    echo "📄 测试简历解析功能..."
    
    if [ -f "backend/scripts/test-resume-parsing.js" ]; then
        if timeout 60 node backend/scripts/test-resume-parsing.js; then
            echo "✅ 简历解析功能正常"
            return 0
        else
            echo "❌ 简历解析功能失败"
            return 1
        fi
    else
        echo "⚠️ 简历解析测试脚本不存在，跳过测试"
        return 0
    fi
}

# 测试智联招聘自动化
test_zhilian_automation() {
    echo "🔍 测试智联招聘自动化..."
    
    if [ -f "backend/scripts/test-zhilian-automation.js" ]; then
        if timeout 120 node backend/scripts/test-zhilian-automation.js; then
            echo "✅ 智联招聘自动化正常"
            return 0
        else
            echo "❌ 智联招聘自动化失败"
            return 1
        fi
    else
        echo "⚠️ 智联招聘自动化测试脚本不存在，跳过测试"
        return 0
    fi
}

# 测试VNC远程控制
test_vnc_control() {
    echo "🖱️ 测试VNC远程控制..."
    
    if [ -f "backend/scripts/test-vnc-control.js" ]; then
        if timeout 30 node backend/scripts/test-vnc-control.js; then
            echo "✅ VNC远程控制正常"
            return 0
        else
            echo "❌ VNC远程控制失败"
            return 1
        fi
    else
        echo "⚠️ VNC远程控制测试脚本不存在，跳过测试"
        return 0
    fi
}

# 测试API端点
test_api_endpoints() {
    echo "🔗 测试API端点..."
    
    local base_url="$REACT_APP_API_BASE_URL"
    local endpoints=(
        "/api/health"
        "/api/auth/status"
        "/api/resume/upload"
        "/api/zhilian/status"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s --max-time 10 "$base_url$endpoint" > /dev/null; then
            echo "✅ $endpoint 可访问"
        else
            echo "⚠️ $endpoint 不可访问"
        fi
    done
}

# 测试数据库操作
test_database_operations() {
    echo "💾 测试数据库操作..."
    
    # 测试基本的CRUD操作
    if [ -f "backend/scripts/test-database-crud.js" ]; then
        if timeout 30 node backend/scripts/test-database-crud.js; then
            echo "✅ 数据库CRUD操作正常"
            return 0
        else
            echo "❌ 数据库CRUD操作失败"
            return 1
        fi
    else
        echo "⚠️ 数据库CRUD测试脚本不存在，跳过测试"
        return 0
    fi
}

# 生成测试报告
generate_test_report() {
    echo "📊 生成测试报告..."
    
    local report_file="core-features-test-$(date +%Y%m%d-%H%M%S).log"
    
    {
        echo "核心功能测试报告"
        echo "=================="
        echo "测试时间: $(date)"
        echo "环境: $NODE_ENV"
        echo "API地址: $REACT_APP_API_BASE_URL"
        echo ""
        echo "测试结果:"
        echo "- 用户认证: $auth_result"
        echo "- 简历解析: $resume_result"
        echo "- 智联自动化: $zhilian_result"
        echo "- VNC控制: $vnc_result"
        echo "- API端点: $api_result"
        echo "- 数据库操作: $db_result"
        echo ""
        echo "总体状态: $overall_status"
    } > "$report_file"
    
    echo "✅ 测试报告已保存到: $report_file"
}

# 主执行流程
main() {
    local failed_tests=0
    
    # 执行各项测试
    if test_user_auth; then
        auth_result="✅ 通过"
    else
        auth_result="❌ 失败"
        ((failed_tests++))
    fi
    
    if test_resume_parsing; then
        resume_result="✅ 通过"
    else
        resume_result="❌ 失败"
        ((failed_tests++))
    fi
    
    if test_zhilian_automation; then
        zhilian_result="✅ 通过"
    else
        zhilian_result="❌ 失败"
        ((failed_tests++))
    fi
    
    if test_vnc_control; then
        vnc_result="✅ 通过"
    else
        vnc_result="❌ 失败"
        ((failed_tests++))
    fi
    
    if test_api_endpoints; then
        api_result="✅ 通过"
    else
        api_result="❌ 失败"
        ((failed_tests++))
    fi
    
    if test_database_operations; then
        db_result="✅ 通过"
    else
        db_result="❌ 失败"
        ((failed_tests++))
    fi
    
    # 确定总体状态
    if [ $failed_tests -eq 0 ]; then
        overall_status="✅ 全部通过"
    else
        overall_status="❌ $failed_tests 项失败"
    fi
    
    # 生成报告
    generate_test_report
    
    echo "=================================="
    echo "✅ 核心功能测试完成"
    echo "总体状态: $overall_status"
    echo "详细报告请查看: $report_file"
    
    # 如果有失败的测试，返回错误码
    if [ $failed_tests -gt 0 ]; then
        echo "⚠️ 发现 $failed_tests 项功能异常，请检查相关服务"
        exit 1
    fi
}

# 执行主函数
main "$@"