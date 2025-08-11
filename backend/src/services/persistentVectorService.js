const crypto = require('crypto');

/**
 * 持久化向量化服务类
 * 使用数据库存储向量数据，避免重启后数据丢失
 */
class PersistentVectorService {
  constructor(dbManager) {
    this.dbManager = dbManager;
    this.vocabulary = new Set();
    this.wordFrequencies = new Map();
    this.documentCount = 0;
    this.lastQueryText = '';
    this.lastStoredText = '';
    
    // 中文停用词
    this.stopWords = new Set([
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'
    ]);
    
    console.log('🚀 持久化向量化服务初始化完成');
  }

  /**
   * 初始化数据库表
   */
  async initTables() {
    const tables = [
      `CREATE TABLE IF NOT EXISTS vector_embeddings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chunk_id TEXT UNIQUE NOT NULL,
        document_id TEXT NOT NULL,
        embedding_data TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS vector_vocabulary (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT UNIQUE NOT NULL,
        frequency INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      `CREATE TABLE IF NOT EXISTS vector_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const table of tables) {
      await this.dbManager.run(table);
    }
    
    // 加载词汇表和统计信息
    await this.loadVocabulary();
    await this.loadStats();
  }

  /**
   * 加载词汇表
   */
  async loadVocabulary() {
    try {
      const sql = 'SELECT word, frequency FROM vector_vocabulary';
      const rows = await this.dbManager.all(sql);
      
      this.vocabulary.clear();
      this.wordFrequencies.clear();
      
      rows.forEach(row => {
        this.vocabulary.add(row.word);
        this.wordFrequencies.set(row.word, row.frequency);
      });
      
      console.log(`📚 加载词汇表: ${this.vocabulary.size} 个词汇`);
    } catch (error) {
      console.warn('加载词汇表失败:', error);
    }
  }

  /**
   * 保存词汇表
   */
  async saveVocabulary() {
    try {
      for (const [word, frequency] of this.wordFrequencies) {
        const sql = `
          INSERT OR REPLACE INTO vector_vocabulary (word, frequency)
          VALUES (?, ?)
        `;
        await this.dbManager.run(sql, [word, frequency]);
      }
    } catch (error) {
      console.warn('保存词汇表失败:', error);
    }
  }

  /**
   * 加载统计信息
   */
  async loadStats() {
    try {
      const sql = 'SELECT key, value FROM vector_stats';
      const rows = await this.dbManager.all(sql);
      
      for (const row of rows) {
        if (row.key === 'document_count') {
          this.documentCount = parseInt(row.value) || 0;
        }
      }
    } catch (error) {
      console.warn('加载统计信息失败:', error);
    }
  }

  /**
   * 保存统计信息
   */
  async saveStats() {
    try {
      const sql = `
        INSERT OR REPLACE INTO vector_stats (key, value)
        VALUES (?, ?)
      `;
      await this.dbManager.run(sql, ['document_count', this.documentCount.toString()]);
    } catch (error) {
      console.warn('保存统计信息失败:', error);
    }
  }

  /**
   * 文本预处理
   */
  preprocessText(text) {
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 中文分词
   */
  tokenize(text) {
    const words = [];
    const preprocessed = this.preprocessText(text);
    const chars = preprocessed.split('');
    
    for (let i = 0; i < chars.length; i++) {
      if (chars[i].trim() && !this.stopWords.has(chars[i])) {
        words.push(chars[i]);
      }
      
      if (i < chars.length - 1 && chars[i].trim() && chars[i + 1].trim()) {
        const bigram = chars[i] + chars[i + 1];
        if (!this.stopWords.has(bigram)) {
          words.push(bigram);
        }
      }
      
      if (i < chars.length - 2 && chars[i].trim() && chars[i + 1].trim() && chars[i + 2].trim()) {
        const trigram = chars[i] + chars[i + 1] + chars[i + 2];
        if (!this.stopWords.has(trigram)) {
          words.push(trigram);
        }
      }
    }
    
    return words.filter(word => word.length > 0);
  }

  /**
   * 计算TF-IDF向量
   */
  calculateTFIDFVector(text) {
    const words = this.tokenize(text);
    const wordCount = {};
    
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // 更新词汇表
    Object.keys(wordCount).forEach(word => {
      if (!this.vocabulary.has(word)) {
        this.vocabulary.add(word);
      }
      this.wordFrequencies.set(word, (this.wordFrequencies.get(word) || 0) + 1);
    });
    
    // 计算TF-IDF
    const vector = new Array(this.vocabulary.size).fill(0);
    const vocabularyArray = Array.from(this.vocabulary);
    
    words.forEach(word => {
      const wordIndex = vocabularyArray.indexOf(word);
      if (wordIndex !== -1) {
        const tf = wordCount[word] / words.length;
        const idf = Math.log(Math.max(this.documentCount, 1) / Math.max(this.wordFrequencies.get(word) || 1, 1));
        vector[wordIndex] = tf * idf;
      }
    });
    
    return vector;
  }

  /**
   * 从词汇计算TF-IDF向量（指定维度）
   */
  calculateTFIDFVectorFromWords(words, dimension) {
    const wordCount = {};
    
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // 计算TF-IDF
    const vector = new Array(dimension).fill(0);
    const vocabularyArray = Array.from(this.vocabulary);
    
    words.forEach(word => {
      const wordIndex = vocabularyArray.indexOf(word);
      if (wordIndex !== -1 && wordIndex < dimension) {
        const tf = wordCount[word] / words.length;
        const idf = Math.log(Math.max(this.documentCount, 1) / Math.max(this.wordFrequencies.get(word) || 1, 1));
        vector[wordIndex] = tf * idf;
      }
    });
    
    return vector;
  }

  /**
   * 获取文本嵌入向量
   */
  async getEmbeddings(texts) {
    try {
      console.log(`🔍 持久化向量化，输入类型: ${Array.isArray(texts) ? 'array' : 'string'}`);
      
      if (Array.isArray(texts)) {
        const embeddings = texts.map(text => this.calculateTFIDFVector(text));
        console.log(`✅ 批量向量化完成，数量: ${embeddings.length}`);
        return embeddings;
      } else {
        this.lastQueryText = texts; // 记录查询文本
        const embedding = this.calculateTFIDFVector(texts);
        console.log('✅ 单个文本向量化完成');
        return embedding;
      }
    } catch (error) {
      console.error('❌ 向量化失败:', error);
      throw error;
    }
  }

  /**
   * 计算余弦相似度
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) {
      return 0;
    }

    if (vecA.length !== vecB.length) {
      // 修复向量维度不匹配问题
      console.warn(`向量维度不匹配: vecA(${vecA.length}) vs vecB(${vecB.length})`);
      
      // 使用较短的维度作为统一维度
      const minLength = Math.min(vecA.length, vecB.length);
      const normalizedVecA = vecA.slice(0, minLength);
      const normalizedVecB = vecB.slice(0, minLength);
      
      return this.cosineSimilarityInternal(normalizedVecA, normalizedVecB);
    }

    return this.cosineSimilarityInternal(vecA, vecB);
  }

  /**
   * 内部余弦相似度计算
   */
  cosineSimilarityInternal(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * 存储文档块向量
   */
  async storeDocumentVectors(chunks, documentId, metadata = {}) {
    try {
      console.log(`📝 开始存储文档向量，文档ID: ${documentId}，块数: ${chunks.length}`);
      
      // 确保数据库表已创建
      await this.initTables();
      
      this.documentCount++;
      
      // 验证输入
      if (!chunks || chunks.length === 0) {
        throw new Error('文档块不能为空');
      }
      
      // 过滤空内容
      const validChunks = chunks.filter(chunk => chunk && chunk.trim().length > 0);
      if (validChunks.length === 0) {
        throw new Error('没有有效的文档内容');
      }
      
      console.log(`📊 有效文档块数量: ${validChunks.length}`);
      
      const embeddings = await this.getEmbeddings(validChunks);
      const embeddingsArray = Array.isArray(embeddings) ? embeddings : [embeddings];
      
      // 验证向量化结果
      if (!embeddingsArray || embeddingsArray.length === 0) {
        throw new Error('向量化失败，没有生成有效的向量');
      }
      
      console.log(`📊 生成的向量数量: ${embeddingsArray.length}`);
      
      // 存储向量和元数据
      for (let i = 0; i < validChunks.length; i++) {
        const chunkId = `${documentId}_${i}`;
        const embedding = embeddingsArray[i] || embeddingsArray[0];
        
        // 验证向量数据
        if (!embedding || !Array.isArray(embedding)) {
          console.warn(`⚠️ 跳过无效向量: chunk ${i}`);
          continue;
        }
        
        const sql = `
          INSERT OR REPLACE INTO vector_embeddings 
          (chunk_id, document_id, embedding_data, content, metadata)
          VALUES (?, ?, ?, ?, ?)
        `;
        
        await this.dbManager.run(sql, [
          chunkId,
          documentId,
          JSON.stringify(embedding),
          validChunks[i],
          JSON.stringify({ ...metadata, chunk_index: i })
        ]);
      }

      // 保存词汇表和统计信息
      await this.saveVocabulary();
      await this.saveStats();

      console.log(`✅ 成功存储 ${validChunks.length} 个文档块的向量`);
      return true;
    } catch (error) {
      console.error('❌ 存储文档向量失败:', error);
      throw error;
    }
  }

  /**
   * 检索相似文档
   */
  async retrieveSimilar(query, limit = 5, threshold = 0.1) {
    try {
      const queryEmbedding = await this.getEmbeddings(query);
      const results = [];

      // 从数据库加载所有向量
      const sql = 'SELECT chunk_id, document_id, embedding_data, content, metadata FROM vector_embeddings';
      const rows = await this.dbManager.all(sql);

      console.log(`🔍 开始向量相似度检索，查询向量维度: ${queryEmbedding.length}, 文档块数量: ${rows.length}`);

      for (const row of rows) {
        try {
          const embedding = JSON.parse(row.embedding_data);
          this.lastStoredText = row.content; // 记录存储的文本
          
          const similarity = this.cosineSimilarity(queryEmbedding, embedding);
          
          if (similarity >= threshold) {
            results.push({
              content: row.content,
              similarity,
              metadata: JSON.parse(row.metadata || '{}')
            });
          }
        } catch (error) {
          console.warn(`解析向量数据失败: ${row.chunk_id}`, error);
        }
      }

      console.log(`✅ 向量相似度检索完成，找到 ${results.length} 个结果`);
      
      // 按相似度排序
      results.sort((a, b) => b.similarity - a.similarity);
      return results.slice(0, limit);
    } catch (error) {
      console.error('❌ 检索相似文档失败:', error);
      return [];
    }
  }

  /**
   * 混合搜索
   */
  async hybridSearch(query, limit = 5) {
    try {
      console.log(`🔍 开始混合搜索: ${query}`);
      
      // 1. TF-IDF向量搜索
      let tfidfResults = [];
      try {
        tfidfResults = await this.retrieveSimilar(query, limit * 2);
        console.log(`📊 TF-IDF搜索结果: ${tfidfResults.length} 个`);
      } catch (vectorError) {
        console.warn('⚠️ 向量搜索失败，继续使用关键词搜索:', vectorError.message);
      }
      
      // 2. 关键词搜索
      let keywordResults = [];
      try {
        keywordResults = await this.keywordSearch(query, limit * 2);
        console.log(`🔑 关键词搜索结果: ${keywordResults.length} 个`);
      } catch (keywordError) {
        console.warn('⚠️ 关键词搜索失败:', keywordError.message);
      }
      
      // 3. 合并结果
      const mergedResults = this.mergeResults(tfidfResults, keywordResults);
      console.log(`🔄 合并后结果: ${mergedResults.length} 个`);
      
      // 4. 如果合并结果为空，尝试更宽松的搜索
      if (mergedResults.length === 0) {
        console.log('🔄 合并结果为空，尝试更宽松的关键词搜索');
        try {
          const fallbackResults = await this.keywordSearch(query, limit, 0.1); // 降低阈值
          return fallbackResults.slice(0, limit);
        } catch (fallbackError) {
          console.error('❌ 宽松搜索也失败:', fallbackError);
        }
      }
      
      return mergedResults.slice(0, limit);
    } catch (error) {
      console.error('❌ 混合搜索失败:', error);
      // 最后的回退方案
      try {
        console.log('🔄 回退到关键词搜索');
        return await this.keywordSearch(query, limit);
      } catch (fallbackError) {
        console.error('❌ 关键词搜索也失败:', fallbackError);
        return [];
      }
    }
  }

  /**
   * 关键词搜索
   */
  async keywordSearch(query, limit = 5, threshold = 0.3) {
    try {
      console.log(`🔑 开始关键词搜索: ${query}`);
      const keywords = this.tokenize(query);
      console.log(`🔍 提取关键词: ${keywords.join(', ')}`);
      
      const results = [];

      const sql = 'SELECT chunk_id, document_id, content, metadata FROM vector_embeddings';
      const rows = await this.dbManager.all(sql);
      console.log(`📊 数据库中共有 ${rows.length} 个文档块`);

      for (const row of rows) {
        try {
          const content = row.content.toLowerCase();
          let score = 0;
          let matchedKeywords = [];
          
          for (const keyword of keywords) {
            if (content.includes(keyword)) {
              score += 1;
              matchedKeywords.push(keyword);
            }
          }
          
          const similarity = score / keywords.length;
          if (similarity >= threshold) {
            const metadata = JSON.parse(row.metadata || '{}');
            results.push({
              content: row.content,
              similarity: similarity,
              metadata: metadata,
              matchedKeywords: matchedKeywords
            });
          }
        } catch (error) {
          console.warn(`处理文档块失败: ${row.chunk_id}`, error);
        }
      }

      console.log(`✅ 关键词搜索完成，找到 ${results.length} 个匹配结果`);
      results.sort((a, b) => b.similarity - a.similarity);
      return results.slice(0, limit);
    } catch (error) {
      console.error('❌ 关键词搜索失败:', error);
      return [];
    }
  }

  /**
   * 合并搜索结果
   */
  mergeResults(tfidfResults, keywordResults) {
    const merged = new Map();
    
    tfidfResults.forEach(result => {
      const key = `${result.metadata.documentId}_${result.metadata.chunk_index}`;
      merged.set(key, result);
    });
    
    keywordResults.forEach(result => {
      const key = `${result.metadata.documentId}_${result.metadata.chunk_index}`;
      if (merged.has(key)) {
        const existing = merged.get(key);
        if (result.similarity > existing.similarity) {
          merged.set(key, result);
        }
      } else {
        merged.set(key, result);
      }
    });
    
    return Array.from(merged.values()).sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * 删除文档向量
   */
  async deleteDocumentVectors(documentId) {
    try {
      const sql = 'DELETE FROM vector_embeddings WHERE document_id = ?';
      const result = await this.dbManager.run(sql, [documentId]);
      
      console.log(`✅ 删除了 ${result.changes} 个文档块的向量`);
      return true;
    } catch (error) {
      console.error('❌ 删除文档向量失败:', error);
      throw error;
    }
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    try {
      const sql = 'SELECT COUNT(*) as total FROM vector_embeddings';
      const result = await this.dbManager.get(sql);
      
      return {
        totalEmbeddings: result.total || 0,
        totalChunks: result.total || 0,
        vocabularySize: this.vocabulary.size,
        documentCount: this.documentCount,
        memoryUsage: process.memoryUsage(),
        mode: 'persistent'
      };
    } catch (error) {
      console.warn('获取统计信息失败:', error);
      return {
        totalEmbeddings: 0,
        totalChunks: 0,
        vocabularySize: 0,
        documentCount: 0,
        memoryUsage: process.memoryUsage(),
        mode: 'persistent'
      };
    }
  }

  /**
   * 清空所有数据
   */
  async clear() {
    try {
      await this.dbManager.run('DELETE FROM vector_embeddings');
      await this.dbManager.run('DELETE FROM vector_vocabulary');
      await this.dbManager.run('DELETE FROM vector_stats');
      
      this.vocabulary.clear();
      this.wordFrequencies.clear();
      this.documentCount = 0;
      
      console.log('✅ 已清空所有向量数据');
    } catch (error) {
      console.error('❌ 清空数据失败:', error);
      throw error;
    }
  }
}

module.exports = PersistentVectorService; 