const path = require('path');
const fs = require('fs-extra');

// 确保目录存在
const ensureDirectory = (dirPath) => {
  try {
    fs.ensureDirSync(dirPath);
    return true;
  } catch (error) {
    console.error('创建目录失败:', error);
    return false;
  }
};

// 生成唯一文件名
const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, extension);
  return `${nameWithoutExt}_${timestamp}_${randomString}${extension}`;
};

// 验证文件类型
const isValidFileType = (filename, allowedTypes = ['.pdf', '.docx', '.txt']) => {
  const extension = path.extname(filename).toLowerCase();
  return allowedTypes.includes(extension);
};

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// 延迟函数
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 重试函数
const retry = async (fn, maxAttempts = 3, delayMs = 1000) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        throw error;
      }
      await delay(delayMs * attempt);
    }
  }
};

module.exports = {
  ensureDirectory,
  generateUniqueFilename,
  isValidFileType,
  formatFileSize,
  delay,
  retry
}; 