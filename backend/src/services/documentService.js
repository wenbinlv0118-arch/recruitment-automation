const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const xlsx = require('xlsx');
const fs = require('fs').promises;
const path = require('path');

/**
 * 文档处理服务类
 * 负责文档上传、解析、分块等功能
 */
class DocumentService {
  constructor(dbManager) {
    this.dbManager = dbManager;
    this.uploadDir = path.join(__dirname, '../../uploads');
    this.ensureUploadDir();
  }

  /**
   * 确保上传目录存在
   */
  async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch (error) {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * 设置文件上传配置
   */
  setupUpload() {
    return multer({
      storage: multer.diskStorage({
        destination: this.uploadDir,
        filename: (req, file, cb) => {
          const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2)}-${file.originalname}`;
          cb(null, uniqueName);
        }
      }),
      limits: { 
        fileSize: 50 * 1024 * 1024, // 50MB
        files: 10 // 最多10个文件
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
          'text/markdown'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('不支持的文件类型'), false);
        }
      }
    });
  }

  /**
   * 保存文档记录到数据库
   */
  async saveDocument(file, companyId, title) {
    const sql = `
      INSERT INTO documents (company_id, title, file_path, file_type, file_size, status)
      VALUES (?, ?, ?, ?, ?, 'processing')
    `;
    
    const result = await this.dbManager.run(sql, [
      companyId,
      title || file.originalname,
      file.path,
      file.mimetype,
      file.size
    ]);

    return {
      id: result.id,
      title: title || file.originalname,
      file_path: file.path,
      file_type: file.mimetype,
      file_size: file.size
    };
  }

  /**
   * 解析文档内容
   */
  async parseDocument(filePath, fileType) {
    try {
      switch (fileType) {
        case 'application/pdf':
          return await this.parsePDF(filePath);
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.parseDOCX(filePath);
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
          return await this.parseXLSX(filePath);
        case 'text/plain':
        case 'text/markdown':
          return await this.parseTXT(filePath);
        default:
          throw new Error('不支持的文件类型');
      }
    } catch (error) {
      console.error('文档解析失败:', error);
      throw new Error(`文档解析失败: ${error.message}`);
    }
  }

  /**
   * 解析PDF文档
   */
  async parsePDF(filePath) {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  }

  /**
   * 解析Word文档
   */
  async parseDOCX(filePath) {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  /**
   * 解析Excel文档
   */
  async parseXLSX(filePath) {
    const workbook = xlsx.readFile(filePath);
    let content = '';
    
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
      
      content += `工作表: ${sheetName}\n`;
      for (const row of jsonData) {
        if (row.length > 0) {
          content += row.join('\t') + '\n';
        }
      }
      content += '\n';
    }
    
    return content;
  }

  /**
   * 解析文本文件
   */
  async parseTXT(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  }

  /**
   * 文档分块
   */
  chunkDocument(content, chunkSize = 1000) {
    if (!content || content.length === 0) {
      return [];
    }

    // 按句子分割
    const sentences = content.split(/[。！？.!?]/).filter(s => s.trim().length > 0);
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      if ((currentChunk + trimmedSentence).length > chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = trimmedSentence;
      } else {
        currentChunk += (currentChunk ? '。' : '') + trimmedSentence;
      }
    }

    // 添加最后一个块
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    // 如果内容太短，直接返回
    if (chunks.length === 0 && content.length > 0) {
      chunks.push(content);
    }

    return chunks;
  }

  /**
   * 保存文档块到数据库
   */
  async saveDocumentChunks(documentId, chunks) {
    const sql = `
      INSERT INTO document_chunks (document_id, content, chunk_index, tags)
      VALUES (?, ?, ?, ?)
    `;

    for (let i = 0; i < chunks.length; i++) {
      await this.dbManager.run(sql, [
        documentId,
        chunks[i],
        i,
        JSON.stringify({ chunk_index: i, total_chunks: chunks.length })
      ]);
    }
  }

  /**
   * 更新文档状态
   */
  async updateDocumentStatus(documentId, status) {
    const sql = `UPDATE documents SET status = ? WHERE id = ?`;
    await this.dbManager.run(sql, [status, documentId]);
  }

  /**
   * 获取文档列表
   */
  async getDocuments(companyId) {
    const sql = `
      SELECT id, title, file_type, file_size, upload_time, status, file_path
      FROM documents 
      WHERE company_id = ?
      ORDER BY upload_time DESC
    `;
    
    return await this.dbManager.all(sql, [companyId]);
  }

  /**
   * 获取文档详情
   */
  async getDocument(documentId) {
    const sql = `SELECT * FROM documents WHERE id = ?`;
    return await this.dbManager.get(sql, [documentId]);
  }

  /**
   * 获取文档块
   */
  async getDocumentChunks(documentId) {
    const sql = `
      SELECT * FROM document_chunks 
      WHERE document_id = ?
      ORDER BY chunk_index
    `;
    
    return await this.dbManager.all(sql, [documentId]);
  }

  /**
   * 删除文档
   */
  async deleteDocument(documentId) {
    // 获取文档信息
    const document = await this.getDocument(documentId);
    if (!document) {
      throw new Error('文档不存在');
    }

    console.log(`删除文档: ${document.title}, 状态: ${document.status}`);

    // 删除文件
    try {
      await fs.unlink(document.file_path);
      console.log(`文件删除成功: ${document.file_path}`);
    } catch (error) {
      console.warn('删除文件失败:', error);
      // 文件不存在或已被删除，继续执行
    }

    // 删除数据库记录
    try {
      await this.dbManager.run('DELETE FROM document_chunks WHERE document_id = ?', [documentId]);
      console.log(`文档块删除成功: document_id=${documentId}`);
    } catch (error) {
      console.warn('删除文档块失败:', error);
    }

    try {
      await this.dbManager.run('DELETE FROM documents WHERE id = ?', [documentId]);
      console.log(`文档记录删除成功: id=${documentId}`);
    } catch (error) {
      console.error('删除文档记录失败:', error);
      throw error;
    }
  }
}

module.exports = DocumentService; 