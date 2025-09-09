/**
 * 数据库迁移脚本
 * 用于在 SQLite 和 Supabase 之间迁移数据
 */

const { DatabaseAdapter } = require('./adapter');

async function migrate() {
  console.log('🔄 开始数据库迁移...');
  
  try {
    const adapter = new DatabaseAdapter();
    await adapter.initialize();
    
    if (adapter.isSQLite()) {
      console.log('检测到 SQLite 数据库，开始迁移到 Supabase...');
      const success = await adapter.migrateToSupabase();
      
      if (success) {
        console.log('🎉 迁移完成！');
        console.log('💡 请更新 .env 文件中的 DATABASE_TYPE=supabase');
      } else {
        console.error('❌ 迁移失败');
        process.exit(1);
      }
    } else {
      console.log('✅ 已在使用 Supabase 数据库');
    }
    
    adapter.close();
  } catch (error) {
    console.error('迁移过程中发生错误:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  migrate();
}

module.exports = migrate;
