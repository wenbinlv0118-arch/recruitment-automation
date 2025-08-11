const { HfInference } = require('@huggingface/inference');

// 尝试导入本地模型，如果失败则使用模拟模式
let pipeline = null;
try {
  const transformers = require('@xenova/transformers');
  pipeline = transformers.pipeline;
  console.log('✅ 成功导入本地向量化模型');
} catch (error) {
  console.log('⚠️  本地向量化模型不可用，将使用模拟模式:', error.message);
}

/**
 * 向量化服务类
 * 支持多种向量化方案：本地模型、Hugging Face API、模拟模式
 */
class VectorService {
  constructor() {
    this.hf = process.env.HUGGINGFACE_API_KEY ? new HfInference(process.env.HUGGINGFACE_API_KEY) : null;
    this.embeddingModel = 'sentence-transformers/all-MiniLM-L6-v2';
    this.embeddings = new Map(); // 简单的内存存储，生产环境建议使用向量数据库
    this.documentChunks = new Map();
    
    // 向量化模式优先级：本地模型 > Hugging Face API > 模拟模式
    this.vectorizationMode = this.determineVectorizationMode();
    
    // 初始化本地模型（异步）
    this.localModel = null;
    this.initLocalModel();
    
    console.log(`🔧 向量服务初始化完成，模式: ${this.vectorizationMode}`);
  }

  /**
   * 确定向量化模式
   */
  determineVectorizationMode() {
    if (process.env.USE_LOCAL_MODEL === 'true' && pipeline) {
      return 'local';
    } else if (process.env.HUGGINGFACE_API_KEY && process.env.HUGGINGFACE_API_KEY !== 'your_huggingface_api_key_here') {
      return 'huggingface';
    } else {
      return 'mock';
    }
  }

  /**
   * 初始化本地模型
   */
  async initLocalModel() {
    try {
      if (this.vectorizationMode === 'local' && pipeline) {
        console.log('🚀 正在初始化本地向量化模型...');
        this.localModel = await pipeline('feature-extraction', this.embeddingModel, {
          quantized: false,
          progress_callback: (progress) => {
            if (progress.status === 'progress') {
              console.log(`📥 模型下载进度: ${Math.round(progress.progress * 100)}%`);
            }
          }
        });
        console.log('✅ 本地向量化模型初始化成功');
      } else if (this.vectorizationMode === 'local' && !pipeline) {
        console.log('⚠️  本地模型库不可用，回退到模拟模式');
        this.vectorizationMode = 'mock';
      }
    } catch (error) {
      console.error('❌ 本地模型初始化失败:', error.message);
      console.log('🔄 回退到模拟模式');
      this.vectorizationMode = 'mock';
    }
  }

  /**
   * 获取文本嵌入向量
   */
  async getEmbeddings(texts) {
    try {
      console.log(`🔍 获取嵌入向量，模式: ${this.vectorizationMode}, 输入类型: ${Array.isArray(texts) ? 'array' : 'string'}`);
      
      // 等待本地模型初始化完成
      if (this.vectorizationMode === 'local' && !this.localModel) {
        console.log('⏳ 等待本地模型初始化...');
        await this.waitForLocalModel();
      }
      
      switch (this.vectorizationMode) {
        case 'local':
          return await this.getLocalEmbeddings(texts);
        case 'huggingface':
          return await this.getHuggingFaceEmbeddings(texts);
        case 'mock':
        default:
          return this.getMockEmbeddings(texts);
      }
    } catch (error) {
      console.error('❌ 获取嵌入向量失败:', error);
      console.log('🔄 回退到模拟模式');
      return this.getMockEmbeddings(texts);
    }
  }

  /**
   * 等待本地模型初始化
   */
  async waitForLocalModel(timeout = 30000) {
    const startTime = Date.now();
    while (!this.localModel && (Date.now() - startTime) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    if (!this.localModel) {
      throw new Error('本地模型初始化超时');
    }
  }

  /**
   * 使用本地模型获取嵌入向量
   */
  async getLocalEmbeddings(texts) {
    if (!this.localModel) {
      throw new Error('本地模型未初始化');
    }

    try {
      if (Array.isArray(texts)) {
        // 批量处理
        const results = await Promise.all(
          texts.map(text => this.localModel(text, { pooling: 'mean', normalize: true }))
        );
        return results.map(result => Array.from(result.data));
      } else {
        // 单个文本
        const result = await this.localModel(texts, { pooling: 'mean', normalize: true });
        return Array.from(result.data);
      }
    } catch (error) {
      console.error('本地模型向量化失败:', error);
      throw error;
    }
  }

  /**
   * 使用 Hugging Face API 获取嵌入向量
   */
  async getHuggingFaceEmbeddings(texts) {
    if (!this.hf) {
      throw new Error('Hugging Face API 未配置');
    }

    try {
      if (Array.isArray(texts)) {
        // 批量处理
        const embeddings = await this.hf.featureExtraction({
          model: this.embeddingModel,
          inputs: texts
        });
        return embeddings;
      } else {
        // 单个文本
        const embedding = await this.hf.featureExtraction({
          model: this.embeddingModel,
          inputs: texts
        });
        return embedding;
      }
    } catch (error) {
      console.error('Hugging Face API 调用失败:', error);
      throw error;
    }
  }

  /**
   * 生成模拟嵌入向量
   */
  getMockEmbeddings(texts) {
    if (Array.isArray(texts)) {
      const mockEmbeddings = texts.map(text => this.generateMockEmbedding(text));
      console.log(`🎭 模拟模式生成 ${mockEmbeddings.length} 个向量`);
      return mockEmbeddings;
    } else {
      const mockEmbedding = this.generateMockEmbedding(texts);
      console.log('🎭 模拟模式生成单个向量');
      return mockEmbedding;
    }
  }

  /**
   * 生成模拟嵌入向量
   */
  generateMockEmbedding(text) {
    // 改进的哈希函数生成固定长度的向量
    const vector = new Array(384).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    
    // 基于词汇的向量生成
    words.forEach((word, wordIndex) => {
      for (let i = 0; i < word.length; i++) {
        const charCode = word.charCodeAt(i);
        const position = (wordIndex * 10 + i) % 384;
        vector[position] += charCode * (i + 1);
      }
    });
    
    // 归一化
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / norm);
  }

  /**
   * 计算余弦相似度
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('向量维度不匹配');
    }

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
      console.log(`开始存储文档向量，文档ID: ${documentId}，块数: ${chunks.length}`);
      
      // 获取嵌入向量
      const embeddings = await this.getEmbeddings(chunks);
      console.log(`获取到嵌入向量，数量: ${Array.isArray(embeddings) ? embeddings.length : 1}`);
      
      // 确保embeddings是数组
      const embeddingsArray = Array.isArray(embeddings) ? embeddings : [embeddings];
      
      // 存储向量和元数据
      for (let i = 0; i < chunks.length; i++) {
        const chunkId = `${documentId}_${i}`;
        const embedding = embeddingsArray[i] || embeddingsArray[0]; // 如果没有对应的向量，使用第一个
        
        this.embeddings.set(chunkId, embedding);
        this.documentChunks.set(chunkId, {
          content: chunks[i],
          documentId,
          chunkIndex: i,
          metadata: { ...metadata, chunk_index: i }
        });
      }

      console.log(`成功存储 ${chunks.length} 个文档块的向量`);
      return true;
    } catch (error) {
      console.error('存储文档向量失败:', error);
      throw error;
    }
  }

  /**
   * 检索相似文档
   */
  async retrieveSimilar(query, limit = 5, threshold = 0.3) {
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
      console.error('检索相似文档失败:', error);
      return [];
    }
  }

  /**
   * 混合搜索（向量 + 关键词）
   */
  async hybridSearch(query, limit = 5) {
    try {
      // 向量搜索
      const vectorResults = await this.retrieveSimilar(query, limit);
      
      // 关键词搜索
      const keywordResults = await this.keywordSearch(query, limit);
      
      // 合并结果
      return this.mergeResults(vectorResults, keywordResults).slice(0, limit);
    } catch (error) {
      console.error('混合搜索失败:', error);
      return [];
    }
  }

  /**
   * 关键词搜索
   */
  async keywordSearch(query, limit = 5) {
    try {
      const keywords = query.toLowerCase().split(/\s+/);
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
      console.error('关键词搜索失败:', error);
      return [];
    }
  }

  /**
   * 合并搜索结果
   */
  mergeResults(vectorResults, keywordResults) {
    const merged = new Map();
    
    // 添加向量搜索结果
    vectorResults.forEach(result => {
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
      
      console.log(`删除了 ${keysToDelete.length} 个文档块的向量`);
      return true;
    } catch (error) {
      console.error('删除文档向量失败:', error);
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
      memoryUsage: process.memoryUsage(),
      useMockMode: this.vectorizationMode === 'mock'
    };
  }

  /**
   * 清空所有数据
   */
  clear() {
    this.embeddings.clear();
    this.documentChunks.clear();
  }
}

module.exports = VectorService; 