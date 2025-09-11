#!/bin/bash
# Zeabur部署验证脚本

echo "🔍 验证Zeabur部署配置..."

# 检查构建输出
if [ -d "build" ]; then
  echo "✅ build目录存在"
  
  if [ -f "build/index.html" ]; then
    echo "✅ index.html存在"
  else
    echo "❌ index.html不存在"
    exit 1
  fi
  
  if [ -d "build/static/js" ]; then
    js_files=$(ls build/static/js/*.js 2>/dev/null | wc -l)
    if [ $js_files -gt 0 ]; then
      echo "✅ JavaScript文件存在 ($js_files 个)"
    else
      echo "❌ 没有找到JavaScript文件"
      exit 1
    fi
  else
    echo "❌ static/js目录不存在"
    exit 1
  fi
else
  echo "❌ build目录不存在，请先运行 npm run build"
  exit 1
fi

echo "
📋 Zeabur部署检查清单:"
echo "1. 在Zeabur控制台中设置以下环境变量:"
echo "   - REACT_APP_API_BASE_URL"
echo "   - REACT_APP_SUPABASE_URL"
echo "   - REACT_APP_SUPABASE_ANON_KEY"
echo "   - ZBPACK_SPA=true"
echo "
2. 确保前端服务配置:"
echo "   - 服务类型: Static"
echo "   - 框架: React"
echo "   - SPA模式: 启用"
echo "   - 构建命令: cd frontend && npm ci && npm run build"
echo "   - 输出目录: frontend/build"
echo "
3. 部署后验证:"
echo "   - 访问部署的URL"
echo "   - 检查浏览器开发者工具"
echo "   - 确认JavaScript文件正确加载"
echo "
✅ 验证完成！"
