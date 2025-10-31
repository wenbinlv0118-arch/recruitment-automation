const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs-extra');
const { storageSubdir } = require('../utils/envPaths');

class DatabaseManager {
  constructor() {
    // 设计原因：打包后的应用资源目录通常是只读的，直接写入会失败。
    // 因此数据库文件应放在用户数据目录（通过 BACKEND_STORAGE_ROOT 注入），
    // 开发模式下回退到项目内的 storage 目录，保证路径一致性与可写性。
    this.dbPath = storageSubdir('knowledge.db');
    this.db = null;
  }

  async init() {
    /**
     * 初始化数据库连接（为什么）
     * - 在 Electron 打包环境中，确保数据库位于用户数据目录以避免只读限制
     * - 在首次运行时创建父目录，避免路径不存在导致连接失败
     */
    return new Promise((resolve, reject) => {
      // 确保数据库父目录存在
      try {
        fs.ensureDirSync(path.dirname(this.dbPath));
      } catch (e) {
        console.error('创建数据库目录失败:', e);
      }
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('数据库连接失败:', err);
          reject(err);
        } else {
          console.log('数据库连接成功');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async createTables() {
    /**
     * 创建必要表结构（为什么）
     * - 使用 IF NOT EXISTS 保证幂等，适配首次运行和后续运行
     * - 将数据结构初始化逻辑集中在此，避免散落在各服务中
     */
    const tables = [
      `CREATE TABLE IF NOT EXISTS companies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        company_id INTEGER,
        title TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER,
        upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'processing',
        metadata TEXT,
        FOREIGN KEY (company_id) REFERENCES companies(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS document_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id INTEGER,
        content TEXT NOT NULL,
        chunk_index INTEGER,
        tags TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (document_id) REFERENCES documents(id)
      )`,
      
      `CREATE TABLE IF NOT EXISTS retrieval_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        retrieved_chunks TEXT,
        response_quality INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }
    
    console.log('数据库表创建完成');
  }

  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = DatabaseManager;