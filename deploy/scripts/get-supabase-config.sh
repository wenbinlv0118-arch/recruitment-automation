#!/bin/bash

echo "🔍 请在Supabase项目中获取以下信息："
echo "1. 进入项目 Settings > API"
echo "2. 复制以下信息："
echo "   - Project URL (SUPABASE_URL)"
echo "   - anon public key (SUPABASE_ANON_KEY)"
echo "   - service_role secret key (SUPABASE_SERVICE_KEY)"
echo ""
echo "3. 在SQL Editor中执行 deploy/scripts/init-database.sql"
echo ""
echo "✅ 完成后，将信息填入 deploy/config/.env.production"