const crypto = require('crypto');

/**
 * 轻量级向量化服务类
 * 使用纯JavaScript实现，无需外部依赖
 * 基于TF-IDF和词频统计的向量化方案
 */
class LightweightVectorService {
  constructor() {
    this.embeddings = new Map();
    this.documentChunks = new Map();
    this.vocabulary = new Set();
    this.wordFrequencies = new Map();
    this.documentCount = 0;
    
    // 中文停用词
    this.stopWords = new Set([
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'
    ]);
    
    console.log('🚀 轻量级向量化服务初始化完成');
  }

  /**
   * 文本预处理
   */
  preprocessText(text) {
    return text
      .toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ') // 保留中文、英文、数字
      .replace(/\s+/g, ' ') // 合并空格
      .trim();
  }

  /**
   * 中文分词（简单实现）
   */
  tokenize(text) {
    const words = [];
    const preprocessed = this.preprocessText(text);
    
    // 简单的中文分词：按字符分割，然后组合
    const chars = preprocessed.split('');
    
    for (let i = 0; i < chars.length; i++) {
      // 单字符
      if (chars[i].trim() && !this.stopWords.has(chars[i])) {
        words.push(chars[i]);
      }
      
      // 双字符组合
      if (i < chars.length - 1 && chars[i].trim() && chars[i + 1].trim()) {
        const bigram = chars[i] + chars[i + 1];
        if (!this.stopWords.has(bigram)) {
          words.push(bigram);
        }
      }
      
      // 三字符组合
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
    
    // 计算词频
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    // 构建词汇表（只在第一次调用时）
    if (this.vocabulary.size === 0) {
      Object.keys(wordCount).forEach(word => {
        this.vocabulary.add(word);
        this.wordFrequencies.set(word, (this.wordFrequencies.get(word) || 0) + 1);
      });
    } else {
      // 后续调用时，只添加新词汇
      Object.keys(wordCount).forEach(word => {
        if (!this.vocabulary.has(word)) {
          this.vocabulary.add(word);
        }
        this.wordFrequencies.set(word, (this.wordFrequencies.get(word) || 0) + 1);
      });
    }
    
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
   * 获取文本嵌入向量
   */
  async getEmbeddings(texts) {
    try {
      console.log(`🔍 轻量级向量化，输入类型: ${Array.isArray(texts) ? 'array' : 'string'}`);
      
      if (Array.isArray(texts)) {
        const embeddings = texts.map(text => this.calculateTFIDFVector(text));
        console.log(`✅ 批量向量化完成，数量: ${embeddings.length}`);
        return embeddings;
      } else {
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
    if (vecA.length !== vecB.length) {
      // 修复向量维度不匹配问题
      console.warn(`向量维度不匹配: vecA(${vecA.length}) vs vecB(${vecB.length})`);
      
      // 将较短的向量扩展到与较长向量相同的维度
      const maxLength = Math.max(vecA.length, vecB.length);
      const normalizedVecA = new Array(maxLength).fill(0);
      const normalizedVecB = new Array(maxLength).fill(0);
      
      for (let i = 0; i < vecA.length; i++) {
        normalizedVecA[i] = vecA[i];
      }
      for (let i = 0; i < vecB.length; i++) {
        normalizedVecB[i] = vecB[i];
      }
      
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
      
      this.documentCount++;
      const embeddings = await this.getEmbeddings(chunks);
      
      // 确保embeddings是数组
      const embeddingsArray = Array.isArray(embeddings) ? embeddings : [embeddings];
      
      // 存储向量和元数据
      for (let i = 0; i < chunks.length; i++) {
        const chunkId = `${documentId}_${i}`;
        const embedding = embeddingsArray[i] || embeddingsArray[0];
        
        this.embeddings.set(chunkId, embedding);
        this.documentChunks.set(chunkId, {
          content: chunks[i],
          documentId,
          chunkIndex: i,
          metadata: { ...metadata, chunk_index: i }
        });
      }

      console.log(`✅ 成功存储 ${chunks.length} 个文档块的向量`);
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
      if (this.documentChunks.size === 0) {
        return [];
      }

      const queryEmbedding = await this.getEmbeddings(query);
      const results = [];

      for (const [chunkId, chunk] of this.documentChunks) {
        const embedding = this.embeddings.get(chunkId);
        if (embedding) {
          const similarity = this.cosineSimilarity(queryEmbedding, embedding);
          if (similarity >= threshold) {
            results.push({
              content: chunk.content,
              similarity,
              metadata: chunk.metadata
            });
          }
        }
      }

      // 按相似度排序
      results.sort((a, b) => b.similarity - a.similarity);
      return results.slice(0, limit);
    } catch (error) {
      console.error('❌ 检索相似文档失败:', error);
      return [];
    }
  }

  /**
   * 关键词搜索
   */
  async keywordSearch(query, limit = 5) {
    try {
      const keywords = this.tokenize(query);
      const results = [];

      for (const [chunkId, chunk] of this.documentChunks) {
        const content = chunk.content.toLowerCase();
        let score = 0;
        
        for (const keyword of keywords) {
          if (content.includes(keyword)) {
            score += 1;
          }
        }
        
        if (score > 0) {
          results.push({
            content: chunk.content,
            similarity: score / keywords.length,
            metadata: chunk.metadata
          });
        }
      }

      // 按分数排序
      results.sort((a, b) => b.similarity - a.similarity);
      return results.slice(0, limit);
    } catch (error) {
      console.error('❌ 关键词搜索失败:', error);
      return [];
    }
  }

  /**
   * 混合搜索（TF-IDF + 关键词）
   */
  async hybridSearch(query, limit = 5) {
    try {
      // TF-IDF搜索
      const tfidfResults = await this.retrieveSimilar(query, limit);
      
      // 关键词搜索
      const keywordResults = await this.keywordSearch(query, limit);
      
      // 合并结果
      return this.mergeResults(tfidfResults, keywordResults).slice(0, limit);
    } catch (error) {
      console.error('❌ 混合搜索失败:', error);
      return [];
    }
  }

  /**
   * 合并搜索结果
   */
  mergeResults(tfidfResults, keywordResults) {
    const merged = new Map();
    
    // 添加TF-IDF搜索结果
    tfidfResults.forEach(result => {
      const key = `${result.metadata.documentId}_${result.metadata.chunk_index}`;
      merged.set(key, result);
    });
    
    // 添加关键词搜索结果
    keywordResults.forEach(result => {
      const key = `${result.metadata.documentId}_${result.metadata.chunk_index}`;
      if (merged.has(key)) {
        // 如果已存在，取较高的相似度
        const existing = merged.get(key);
        if (result.similarity > existing.similarity) {
          merged.set(key, result);
        }
      } else {
        merged.set(key, result);
      }
    });
    
    // 转换为数组并排序
    return Array.from(merged.values()).sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * 删除文档向量
   */
  async deleteDocumentVectors(documentId) {
    try {
      const keysToDelete = [];
      
      for (const [chunkId, chunk] of this.documentChunks) {
        if (chunk.documentId === documentId) {
          keysToDelete.push(chunkId);
        }
      }
      
      keysToDelete.forEach(key => {
        this.embeddings.delete(key);
        this.documentChunks.delete(key);
      });
      
      console.log(`✅ 删除了 ${keysToDelete.length} 个文档块的向量`);
      return true;
    } catch (error) {
      console.error('❌ 删除文档向量失败:', error);
      throw error;
    }
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalEmbeddings: this.embeddings.size,
      totalChunks: this.documentChunks.size,
      vocabularySize: this.vocabulary.size,
      documentCount: this.documentCount,
      memoryUsage: process.memoryUsage(),
      mode: 'lightweight'
    };
  }

  /**
   * 清空所有数据
   */
  clear() {
    this.embeddings.clear();
    this.documentChunks.clear();
    this.vocabulary.clear();
    this.wordFrequencies.clear();
    this.documentCount = 0;
  }
}

module.exports = LightweightVectorService; 