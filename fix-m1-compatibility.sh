#!/bin/bash

# M1 Pro 芯片兼容性修复脚本
# 用于从Intel芯片Mac迁移到M1 Pro芯片Mac

set -e  # 遇到错误立即退出

echo "🚀 开始M1 Pro芯片兼容性修复..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查当前架构
echo -e "${BLUE}📋 检查当前系统架构...${NC}"
ARCH=$(uname -m)
CHIP=$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo "Unknown")
ROSETTA=$(sysctl -n sysctl.proc_translated 2>/dev/null || echo "0")

echo "芯片: $CHIP"
echo "架构: $ARCH"
if [ "$ROSETTA" = "1" ]; then
    echo -e "${YELLOW}⚠️  当前在Rosetta模式下运行${NC}"
else
    echo -e "${GREEN}✅ 当前在原生模式下运行${NC}"
fi

# 检查Node.js版本
echo -e "\n${BLUE}📋 检查Node.js版本...${NC}"
NODE_VERSION=$(node --version)
echo "Node.js版本: $NODE_VERSION"

# 备份重要文件
echo -e "\n${BLUE}💾 备份重要文件...${NC}"
BACKUP_DIR="./backups/m1-migration-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 备份数据库文件
if [ -f "backend/database.db" ]; then
    cp "backend/database.db" "$BACKUP_DIR/database.db.backup"
    echo "✅ 数据库已备份到 $BACKUP_DIR/database.db.backup"
fi

if [ -f "backend/knowledge.db" ]; then
    cp "backend/knowledge.db" "$BACKUP_DIR/knowledge.db.backup"
    echo "✅ 知识库已备份到 $BACKUP_DIR/knowledge.db.backup"
fi

# 备份环境配置
if [ -f "backend/.env" ]; then
    cp "backend/.env" "$BACKUP_DIR/.env.backup"
    echo "✅ 环境配置已备份"
fi

# 清理旧的依赖
echo -e "\n${BLUE}🧹 清理旧的依赖文件...${NC}"

# 后端清理
if [ -d "backend/node_modules" ]; then
    echo "删除后端 node_modules..."
    rm -rf backend/node_modules
fi

if [ -f "backend/package-lock.json" ]; then
    echo "删除后端 package-lock.json..."
    rm backend/package-lock.json
fi

# 前端清理
if [ -d "frontend/node_modules" ]; then
    echo "删除前端 node_modules..."
    rm -rf frontend/node_modules
fi

if [ -f "frontend/package-lock.json" ]; then
    echo "删除前端 package-lock.json..."
    rm frontend/package-lock.json
fi

# 根目录清理
if [ -d "node_modules" ]; then
    echo "删除根目录 node_modules..."
    rm -rf node_modules
fi

if [ -f "package-lock.json" ]; then
    echo "删除根目录 package-lock.json..."
    rm package-lock.json
fi

# 重新安装依赖
echo -e "\n${BLUE}📦 重新安装依赖...${NC}"

# 安装根目录依赖
echo "安装根目录依赖..."
npm install

# 安装后端依赖
echo "安装后端依赖..."
cd backend
npm install

# 特别处理SQLite3 - 强制重新编译
echo -e "\n${YELLOW}🔧 重新编译SQLite3...${NC}"
npm rebuild sqlite3

# 检查SQLite3是否正常工作
echo "测试SQLite3..."
node -e "try { const sqlite3 = require('sqlite3'); console.log('✅ SQLite3 工作正常'); } catch(e) { console.log('❌ SQLite3 错误:', e.message); process.exit(1); }"

cd ..

# 安装前端依赖
echo "安装前端依赖..."
cd frontend
npm install
cd ..

# 重新安装Playwright浏览器
echo -e "\n${BLUE}🌐 重新安装Playwright浏览器...${NC}"
cd backend
npx playwright install
cd ..

# 运行测试
echo -e "\n${BLUE}🧪 运行兼容性测试...${NC}"

# 测试后端模块加载
echo "测试后端模块..."
cd backend

# 测试SQLite3
echo -n "SQLite3: "
node -e "try { const sqlite3 = require('sqlite3'); console.log('✅'); } catch(e) { console.log('❌'); }"

# 测试ChromaDB
echo -n "ChromaDB: "
node -e "try { const { ChromaApi } = require('chromadb'); console.log('✅'); } catch(e) { console.log('❌'); }"

# 测试Playwright
echo -n "Playwright: "
node -e "try { const { chromium } = require('playwright'); console.log('✅'); } catch(e) { console.log('❌'); }"

# 测试Tesseract.js
echo -n "Tesseract.js: "
node -e "try { const { createWorker } = require('tesseract.js'); console.log('✅'); } catch(e) { console.log('❌'); }"

# 测试@xenova/transformers
echo -n "@xenova/transformers: "
node -e "try { const transformers = require('@xenova/transformers'); console.log('✅'); } catch(e) { console.log('❌'); }"

cd ..

# 性能基准测试
echo -e "\n${BLUE}📊 运行性能基准测试...${NC}"
echo "启动后端服务进行测试..."

# 创建测试脚本
cat > test-performance.js << 'EOF'
const { performance } = require('perf_hooks');

async function testPerformance() {
    console.log('🚀 开始性能测试...');
    
    // 测试SQLite3性能
    const start1 = performance.now();
    try {
        const sqlite3 = require('sqlite3');
        const db = new sqlite3.Database(':memory:');
        db.close();
        const end1 = performance.now();
        console.log(`SQLite3 初始化: ${(end1 - start1).toFixed(2)}ms`);
    } catch (e) {
        console.log('SQLite3 测试失败:', e.message);
    }
    
    // 测试ChromaDB性能
    const start2 = performance.now();
    try {
        const { ChromaApi } = require('chromadb');
        const end2 = performance.now();
        console.log(`ChromaDB 加载: ${(end2 - start2).toFixed(2)}ms`);
    } catch (e) {
        console.log('ChromaDB 测试失败:', e.message);
    }
    
    console.log('✅ 性能测试完成');
}

testPerformance();
EOF

cd backend && node ../test-performance.js && cd ..
rm test-performance.js

# 生成报告
echo -e "\n${GREEN}📋 生成迁移报告...${NC}"
REPORT_FILE="$BACKUP_DIR/migration-report.txt"

cat > "$REPORT_FILE" << EOF
M1 Pro芯片兼容性修复报告
生成时间: $(date)

系统信息:
- 芯片: $CHIP
- 架构: $ARCH
- Rosetta状态: $([ "$ROSETTA" = "1" ] && echo "启用" || echo "原生")
- Node.js版本: $NODE_VERSION

修复内容:
✅ 清理了所有旧的依赖文件
✅ 重新安装了所有npm包
✅ 重新编译了SQLite3原生模块
✅ 重新安装了Playwright浏览器
✅ 运行了兼容性测试

备份位置:
- 数据库: $BACKUP_DIR/database.db.backup
- 知识库: $BACKUP_DIR/knowledge.db.backup
- 环境配置: $BACKUP_DIR/.env.backup

下一步:
1. 启动应用: npm run dev
2. 测试所有功能
3. 如有问题，可从备份恢复
EOF

echo -e "\n${GREEN}🎉 M1 Pro芯片兼容性修复完成！${NC}"
echo -e "${BLUE}📄 详细报告已保存到: $REPORT_FILE${NC}"
echo -e "\n${YELLOW}下一步操作:${NC}"
echo "1. 运行 'npm run dev' 启动应用"
echo "2. 测试所有功能是否正常"
echo "3. 如遇问题，检查备份目录: $BACKUP_DIR"
echo -e "\n${GREEN}✨ 享受M1 Pro的原生性能吧！${NC}"