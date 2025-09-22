/**
 * 数据库备份脚本
 * 用于定期备份Supabase数据库
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env.production') });

class DatabaseBackup {
  constructor() {
    this.supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    this.backupDir = path.join(__dirname, '../backups');
  }

  /**
   * 执行完整数据库备份
   */
  async performFullBackup() {
    console.log('🔄 开始数据库备份...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.backupDir, `backup-${timestamp}`);
    
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
    
    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }
    
    const tables = ['users', 'resumes', 'jobs', 'applications'];
    const backupSummary = {
      timestamp: new Date().toISOString(),
      tables: {},
      totalRecords: 0
    };
    
    for (const tableName of tables) {
      try {
        const { data, error } = await this.supabaseClient
          .from(tableName)
          .select('*');
        
        if (error) {
          console.log(`  ⚠️ 表 ${tableName} 备份失败: ${error.message}`);
          backupSummary.tables[tableName] = { status: 'failed', error: error.message };
          continue;
        }
        
        const tableBackupPath = path.join(backupPath, `${tableName}.json`);
        fs.writeFileSync(tableBackupPath, JSON.stringify(data, null, 2));
        
        console.log(`  ✅ 表 ${tableName} 备份完成 (${data.length} 条记录)`);
        backupSummary.tables[tableName] = { 
          status: 'success', 
          records: data.length,
          file: tableBackupPath
        };
        backupSummary.totalRecords += data.length;
        
      } catch (error) {
        console.log(`  ❌ 表 ${tableName} 备份异常: ${error.message}`);
        backupSummary.tables[tableName] = { status: 'error', error: error.message };
      }
    }
    
    // 保存备份摘要
    const summaryPath = path.join(backupPath, 'backup-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(backupSummary, null, 2));
    
    console.log(`
✅ 数据库备份完成!`);
    console.log(`📁 备份位置: ${backupPath}`);
    console.log(`📊 总记录数: ${backupSummary.totalRecords}`);
    
    return backupSummary;
  }

  /**
   * 清理旧备份
   */
  async cleanupOldBackups(retentionDays = 30) {
    console.log(`🧹 清理 ${retentionDays} 天前的备份...`);
    
    if (!fs.existsSync(this.backupDir)) {
      return;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    const backupFolders = fs.readdirSync(this.backupDir)
      .filter(folder => folder.startsWith('backup-'))
      .map(folder => {
        const folderPath = path.join(this.backupDir, folder);
        const stats = fs.statSync(folderPath);
        return { folder, path: folderPath, created: stats.birthtime };
      })
      .filter(backup => backup.created < cutoffDate);
    
    for (const backup of backupFolders) {
      fs.rmSync(backup.path, { recursive: true, force: true });
      console.log(`  🗑️ 删除旧备份: ${backup.folder}`);
    }
    
    console.log(`✅ 清理完成，删除了 ${backupFolders.length} 个旧备份`);
  }
}

// 主函数
async function main() {
  const backup = new DatabaseBackup();
  
  try {
    await backup.performFullBackup();
    await backup.cleanupOldBackups();
    process.exit(0);
  } catch (error) {
    console.error('备份过程中发生错误:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = DatabaseBackup;
