#!/bin/bash

# ===========================================
# Zeabur 部署准备脚本
# ===========================================
# 此脚本帮助准备 Zeabur 部署所需的配置文件

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

# 检查是否在项目根目录
check_project_root() {
    if [[ ! -f "package.json" ]] || [[ ! -d "backend" ]] || [[ ! -d "frontend" ]]; then
        print_error "请在项目根目录运行此脚本"
        exit 1
    fi
}

# 生成 JWT Secret
generate_jwt_secret() {
    print_info "生成 JWT Secret..."
    if command -v node >/dev/null 2>&1; then
        JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
        print_success "JWT Secret 已生成: ${JWT_SECRET:0:20}..."
        echo "JWT_SECRET=$JWT_SECRET" > .jwt_secret_temp
        print_info "JWT Secret 已保存到 .jwt_secret_temp 文件"
    else
        print_warning "Node.js 未安装，请手动生成 JWT Secret"
        print_info "可以使用在线工具: https://generate-secret.vercel.app/64"
    fi
}

# 检查环境变量文件
check_env_files() {
    print_info "检查环境变量文件..."
    
    # 检查后端环境变量
    if [[ ! -f "backend/.env.production" ]]; then
        print_warning "backend/.env.production 不存在，创建模板文件"
        cat > backend/.env.production << EOF
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://fftjmohzkzkkqzqgaqfe.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDI1NjYsImV4cCI6MjA3Mjg3ODU2Nn0._PQEDYFp0XTL8sHatcVCMl6pcjooLo79CASTaulFbdQ
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzMwMjU2NiwiZXhwIjoyMDcyODc4NTY2fQ.ZhVVUag5S1q2fCSEQ2q_H_z5hV5gXrOdSJ1Q2k3fYTk
JWT_SECRET=请替换为实际的JWT密钥
CORS_ORIGIN=*
EOF
        print_success "已创建 backend/.env.production 模板"
    fi
    
    # 检查前端环境变量
    if [[ ! -f "frontend/.env.production" ]]; then
        print_warning "frontend/.env.production 不存在，创建模板文件"
        cat > frontend/.env.production << EOF
REACT_APP_API_URL=https://your-backend-url.zeabur.app
REACT_APP_SUPABASE_URL=https://fftjmohzkzkkqzqgaqfe.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGptb2h6a3pra3F6cWdhcWZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDI1NjYsImV4cCI6MjA3Mjg3ODU2Nn0._PQEDYFp0XTL8sHatcVCMl6pcjooLo79CASTaulFbdQ
EOF
        print_success "已创建 frontend/.env.production 模板"
    fi
}

# 检查 package.json 脚本
check_package_scripts() {
    print_info "检查 package.json 脚本..."
    
    # 检查后端 package.json
    if [[ -f "backend/package.json" ]]; then
        if ! grep -q '"start"' backend/package.json; then
            print_warning "backend/package.json 缺少 start 脚本"
        else
            print_success "后端 start 脚本存在"
        fi
    fi
    
    # 检查前端 package.json
    if [[ -f "frontend/package.json" ]]; then
        if ! grep -q '"build"' frontend/package.json; then
            print_warning "frontend/package.json 缺少 build 脚本"
        else
            print_success "前端 build 脚本存在"
        fi
    fi
}

# 检查 Git 状态
check_git_status() {
    print_info "检查 Git 状态..."
    
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "当前目录不是 Git 仓库"
        exit 1
    fi
    
    # 检查是否有未提交的更改
    if ! git diff-index --quiet HEAD --; then
        print_warning "有未提交的更改，建议先提交"
        git status --porcelain
    else
        print_success "Git 工作区干净"
    fi
    
    # 检查远程仓库
    if git remote get-url origin > /dev/null 2>&1; then
        REMOTE_URL=$(git remote get-url origin)
        print_success "远程仓库: $REMOTE_URL"
    else
        print_warning "未配置远程仓库"
    fi
}

# 更新前端 API URL
update_frontend_api_url() {
    if [[ -n "$1" ]]; then
        print_info "更新前端 API URL 为: $1"
        sed -i.bak "s|REACT_APP_API_URL=.*|REACT_APP_API_URL=$1|" frontend/.env.production
        print_success "前端 API URL 已更新"
    else
        print_info "跳过前端 API URL 更新（未提供 URL）"
    fi
}

# 显示部署清单
show_deployment_checklist() {
    print_info "\n=== Zeabur 部署清单 ==="
    echo "□ 1. 注册 Zeabur 账户并连接 GitHub"
    echo "□ 2. 创建新项目"
    echo "□ 3. 部署后端服务（Root Directory: backend）"
    echo "□ 4. 配置后端环境变量（参考 deploy/config/.env.zeabur）"
    echo "□ 5. 获取后端 URL"
    echo "□ 6. 更新前端配置文件"
    echo "□ 7. 提交并推送更改"
    echo "□ 8. 部署前端服务（Root Directory: frontend）"
    echo "□ 9. 更新后端 CORS_ORIGIN 为前端 URL"
    echo "□ 10. 测试完整功能"
    print_info "\n详细步骤请参考: deploy/docs/zeabur-deployment-guide.md"
}

# 主函数
main() {
    print_info "开始 Zeabur 部署准备..."
    
    check_project_root
    generate_jwt_secret
    check_env_files
    check_package_scripts
    check_git_status
    
    # 如果提供了后端 URL 参数，更新前端配置
    if [[ -n "$1" ]]; then
        update_frontend_api_url "$1"
    fi
    
    show_deployment_checklist
    
    print_success "\n准备完成！现在可以开始 Zeabur 部署了。"
    print_info "使用方法:"
    print_info "  1. 首次准备: ./deploy/scripts/prepare-zeabur.sh"
    print_info "  2. 更新前端 URL: ./deploy/scripts/prepare-zeabur.sh https://your-backend-url.zeabur.app"
}

# 运行主函数
main "$@"