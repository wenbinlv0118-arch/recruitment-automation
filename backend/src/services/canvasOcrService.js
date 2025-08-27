const { createWorker } = require('tesseract.js');
const fs = require('fs-extra');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Canvas截图和OCR识别服务
 * 用于从canvas元素截图并通过OCR识别文字内容
 */
class CanvasOcrService {
  constructor() {
    this.worker = null;
    this.isInitialized = false;
  }

  /**
   * 初始化OCR工作器
   */
  async initializeOcr() {
    try {
      if (this.isInitialized) {
        return;
      }

      logger.info('正在初始化OCR工作器...');
      this.worker = await createWorker('chi_sim+eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            logger.info(`OCR识别进度: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      this.isInitialized = true;
      logger.info('OCR工作器初始化完成');
    } catch (error) {
      logger.error('OCR工作器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 截取canvas元素的截图
   * @param {Object} frame - Playwright frame对象
   * @param {string} canvasSelector - canvas元素选择器
   * @returns {Buffer} 截图的Buffer数据
   */
  async captureCanvasScreenshot(frame, canvasSelector = 'canvas#resume') {
    try {
      logger.info(`正在截取canvas元素: ${canvasSelector}`);
      
      // 等待canvas元素加载
      await frame.waitForSelector(canvasSelector, { timeout: 10000 });
      
      // 获取canvas元素
      const canvasElement = await frame.$(canvasSelector);
      if (!canvasElement) {
        throw new Error(`未找到canvas元素: ${canvasSelector}`);
      }

      // 截取canvas元素的截图 (PNG格式不支持quality参数)
      const screenshot = await canvasElement.screenshot({
        type: 'png'
      });

      logger.info('Canvas截图完成');
      return screenshot;
    } catch (error) {
      logger.error('Canvas截图失败:', error);
      throw error;
    }
  }

  /**
   * 使用OCR识别图片中的文字
   * @param {Buffer} imageBuffer - 图片Buffer数据
   * @returns {string} 识别出的文字内容
   */
  async recognizeTextFromImage(imageBuffer) {
    try {
      // 确保OCR工作器已初始化
      await this.initializeOcr();
      
      logger.info('开始OCR文字识别...');
      
      // 使用OCR识别文字
      const { data: { text } } = await this.worker.recognize(imageBuffer);
      
      // 清理识别结果
      const cleanedText = this.cleanOcrText(text);
      
      logger.info(`OCR识别完成，识别出 ${cleanedText.length} 个字符`);
      return cleanedText;
    } catch (error) {
      logger.error('OCR文字识别失败:', error);
      throw error;
    }
  }

  /**
   * 清理OCR识别结果
   * @param {string} text - 原始OCR文字
   * @returns {string} 清理后的文字
   */
  cleanOcrText(text) {
    if (!text) return '';
    
    return text
      // 移除多余的空白字符
      .replace(/\s+/g, ' ')
      // 移除特殊字符
      .replace(/[\x00-\x1F\x7F]/g, '')
      // 修复常见的OCR错误
      .replace(/０/g, '0')
      .replace(/１/g, '1')
      .replace(/２/g, '2')
      .replace(/３/g, '3')
      .replace(/４/g, '4')
      .replace(/５/g, '5')
      .replace(/６/g, '6')
      .replace(/７/g, '7')
      .replace(/８/g, '8')
      .replace(/９/g, '9')
      // 修复常见标点符号
      .replace(/，/g, ',')
      .replace(/。/g, '.')
      .replace(/：/g, ':')
      .replace(/；/g, ';')
      .trim();
  }

  /**
   * 从canvas元素截图并识别文字（完整流程）
   * @param {Object} frame - Playwright frame对象
   * @param {string} canvasSelector - canvas元素选择器
   * @returns {string} 识别出的文字内容
   */
  async captureAndRecognizeCanvas(frame, canvasSelector = 'canvas#resume') {
    try {
      logger.info('开始canvas截图和OCR识别流程');
      
      // 1. 截取canvas截图
      const screenshot = await this.captureCanvasScreenshot(frame, canvasSelector);
      
      // 2. 保存截图到临时文件（用于调试）
      const tempDir = path.join(__dirname, '../../temp');
      await fs.ensureDir(tempDir);
      const tempImagePath = path.join(tempDir, `canvas_${Date.now()}.png`);
      await fs.writeFile(tempImagePath, screenshot);
      logger.info(`截图已保存到: ${tempImagePath}`);
      
      // 3. OCR识别文字
      const recognizedText = await this.recognizeTextFromImage(screenshot);
      
      // 4. 清理临时文件
      setTimeout(() => {
        fs.remove(tempImagePath).catch(err => {
          logger.warn('清理临时截图文件失败:', err);
        });
      }, 60000); // 1分钟后清理
      
      logger.info('Canvas截图和OCR识别流程完成');
      return recognizedText;
    } catch (error) {
      logger.error('Canvas截图和OCR识别流程失败:', error);
      throw error;
    }
  }

  /**
   * 销毁OCR工作器
   */
  async destroy() {
    try {
      if (this.worker) {
        await this.worker.terminate();
        this.worker = null;
        this.isInitialized = false;
        logger.info('OCR工作器已销毁');
      }
    } catch (error) {
      logger.error('销毁OCR工作器失败:', error);
    }
  }
}

module.exports = CanvasOcrService;