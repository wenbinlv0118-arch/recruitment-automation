// 尝试加载 better-sqlite3，如果失败则提供备用方案
let Database;
try {
  Database = require('better-sqlite3');
} catch (error) {
  console.warn('better-sqlite3 未安装，SQLite 功能将不可用:', error.message);
  Database = null;
}
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor() {
    this.dbPath = path.join(__dirname, '../../storage/knowledge.db');
    this.db = null;
  }

  async init() {
    try {
      // 检查 better-sqlite3 是否可用
      if (!Database) {
        console.warn('SQLite 数据库不可用，请安装 better-sqlite3 依赖');
        return false;
      }
      
      // 确保存储目录存在
      const storageDir = path.dirname(this.dbPath);
      if (!fs.existsSync(storageDir)) {
        fs.mkdirSync(storageDir, { recursive: true });
      }
      
      this.db = new Database(this.dbPath);
      console.log('数据库连接成功');
      await this.createTables();
      return true;
    } catch (error) {
      console.error('数据库连接失败:', error);
      throw error;
    }
  }

  async createTables() {
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
    if (!this.db) {
      return Promise.reject(new Error('数据库未初始化或不可用'));
    }
    try {
      const result = this.db.prepare(sql).run(params);
      return Promise.resolve({ id: result.lastInsertRowid, changes: result.changes });
    } catch (error) {
      return Promise.reject(error);
    }
  }

  get(sql, params = []) {
    if (!this.db) {
      return Promise.reject(new Error('数据库未初始化或不可用'));
    }
    try {
      const result = this.db.prepare(sql).get(params);
      return Promise.resolve(result);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  all(sql, params = []) {
    if (!this.db) {
      return Promise.reject(new Error('数据库未初始化或不可用'));
    }
    try {
      const result = this.db.prepare(sql).all(params);
      return Promise.resolve(result);
    } catch (error) {
      return Promise.reject(error);
    }
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = DatabaseManager;