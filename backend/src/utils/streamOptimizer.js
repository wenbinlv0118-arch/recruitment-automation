const stream = require('stream');
const { promisify } = require('util');
const pipeline = promisify(stream.pipeline);

/**
 * 流处理优化器
 * 优化大文件和大数据的处理，减少内存占用
 */
class StreamOptimizer {
  constructor() {
    this.defaultChunkSize = 64 * 1024; // 64KB
    this.maxBufferSize = 1024 * 1024; // 1MB
  }

  /**
   * 创建优化的读取流
   */
  createOptimizedReadStream(filePath, options = {}) {
    const fs = require('fs');
    
    const streamOptions = {
      highWaterMark: options.chunkSize || this.defaultChunkSize,
      ...options
    };
    
    return fs.createReadStream(filePath, streamOptions);
  }

  /**
   * 创建优化的写入流
   */
  createOptimizedWriteStream(filePath, options = {}) {
    const fs = require('fs');
    
    const streamOptions = {
      highWaterMark: options.chunkSize || this.defaultChunkSize,
      ...options
    };
    
    return fs.createWriteStream(filePath, streamOptions);
  }

  /**
   * 流式处理大型JSON文件
   */
  async processLargeJsonStream(inputPath, outputPath, processor) {
    const fs = require('fs');
    const { Transform } = require('stream');
    
    const transformStream = new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        try {
          const processed = processor(chunk);
          callback(null, processed);
        } catch (error) {
          callback(error);
        }
      }
    });
    
    const readStream = this.createOptimizedReadStream(inputPath);
    const writeStream = this.createOptimizedWriteStream(outputPath);
    
    await pipeline(readStream, transformStream, writeStream);
  }

  /**
   * 分块处理大数组
   */
  async processLargeArrayInChunks(array, processor, chunkSize = 1000) {
    const results = [];
    
    for (let i = 0; i < array.length; i += chunkSize) {
      const chunk = array.slice(i, i + chunkSize);
      const chunkResults = await processor(chunk);
      results.push(...chunkResults);
      
      // 允许事件循环处理其他任务
      await new Promise(resolve => setImmediate(resolve));
    }
    
    return results;
  }

  /**
   * 内存友好的文件复制
   */
  async copyFileWithStreams(sourcePath, destPath) {
    const readStream = this.createOptimizedReadStream(sourcePath);
    const writeStream = this.createOptimizedWriteStream(destPath);
    
    await pipeline(readStream, writeStream);
  }

  /**
   * 创建背压控制的转换流
   */
  createBackpressureTransform(processor, options = {}) {
    const { Transform } = require('stream');
    
    return new Transform({
      objectMode: options.objectMode || false,
      highWaterMark: options.highWaterMark || this.defaultChunkSize,
      transform(chunk, encoding, callback) {
        try {
          const result = processor(chunk, encoding);
          
          if (result instanceof Promise) {
            result
              .then(data => callback(null, data))
              .catch(error => callback(error));
          } else {
            callback(null, result);
          }
        } catch (error) {
          callback(error);
        }
      }
    });
  }
}

module.exports = new StreamOptimizer();