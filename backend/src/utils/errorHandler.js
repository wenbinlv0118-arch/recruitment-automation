const Logger = require('./logger');

class ErrorHandler {
  constructor() {
    this.errorTypes = {
      VALIDATION_ERROR: 'VALIDATION_ERROR',
      AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
      AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
      NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
      CONFLICT_ERROR: 'CONFLICT_ERROR',
      RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
      NETWORK_ERROR: 'NETWORK_ERROR',
      DATABASE_ERROR: 'DATABASE_ERROR',
      FILE_ERROR: 'FILE_ERROR',
      EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
      UNKNOWN_ERROR: 'UNKNOWN_ERROR'
    };
  }

  /**
   * 创建标准错误对象
   */
  createError(type, message, details = null, statusCode = 500) {
    const error = new Error(message);
    error.type = type;
    error.details = details;
    error.statusCode = statusCode;
    error.timestamp = new Date().toISOString();
    error.stack = error.stack;
    
    return error;
  }

  /**
   * 处理验证错误
   */
  handleValidationError(field, message, value = null) {
    const error = this.createError(
      this.errorTypes.VALIDATION_ERROR,
      `验证失败: ${message}`,
      { field, value },
      400
    );
    
    Logger.warn('验证错误:', { field, message, value });
    return error;
  }

  /**
   * 处理认证错误
   */
  handleAuthenticationError(message = '认证失败') {
    const error = this.createError(
      this.errorTypes.AUTHENTICATION_ERROR,
      message,
      null,
      401
    );
    
    Logger.warn('认证错误:', message);
    return error;
  }

  /**
   * 处理授权错误
   */
  handleAuthorizationError(message = '权限不足') {
    const error = this.createError(
      this.errorTypes.AUTHORIZATION_ERROR,
      message,
      null,
      403
    );
    
    Logger.warn('授权错误:', message);
    return error;
  }

  /**
   * 处理资源未找到错误
   */
  handleNotFoundError(resource, id = null) {
    const message = id ? `${resource} (ID: ${id}) 未找到` : `${resource} 未找到`;
    const error = this.createError(
      this.errorTypes.NOT_FOUND_ERROR,
      message,
      { resource, id },
      404
    );
    
    Logger.warn('资源未找到:', { resource, id });
    return error;
  }

  /**
   * 处理冲突错误
   */
  handleConflictError(message, details = null) {
    const error = this.createError(
      this.errorTypes.CONFLICT_ERROR,
      message,
      details,
      409
    );
    
    Logger.warn('冲突错误:', message);
    return error;
  }

  /**
   * 处理网络错误
   */
  handleNetworkError(url, error = null) {
    const message = `网络请求失败: ${url}`;
    const errorObj = this.createError(
      this.errorTypes.NETWORK_ERROR,
      message,
      { url, originalError: error?.message },
      503
    );
    
    Logger.error('网络错误:', { url, error: error?.message });
    return errorObj;
  }

  /**
   * 处理数据库错误
   */
  handleDatabaseError(operation, error = null) {
    const message = `数据库操作失败: ${operation}`;
    const errorObj = this.createError(
      this.errorTypes.DATABASE_ERROR,
      message,
      { operation, originalError: error?.message },
      500
    );
    
    Logger.error('数据库错误:', { operation, error: error?.message });
    return errorObj;
  }

  /**
   * 处理文件操作错误
   */
  handleFileError(operation, filePath, error = null) {
    const message = `文件操作失败: ${operation}`;
    const errorObj = this.createError(
      this.errorTypes.FILE_ERROR,
      message,
      { operation, filePath, originalError: error?.message },
      500
    );
    
    Logger.error('文件错误:', { operation, filePath, error: error?.message });
    return errorObj;
  }

  /**
   * 处理外部API错误
   */
  handleExternalApiError(api, endpoint, error = null) {
    const message = `外部API调用失败: ${api}`;
    const errorObj = this.createError(
      this.errorTypes.EXTERNAL_API_ERROR,
      message,
      { api, endpoint, originalError: error?.message },
      502
    );
    
    Logger.error('外部API错误:', { api, endpoint, error: error?.message });
    return errorObj;
  }

  /**
   * 处理未知错误
   */
  handleUnknownError(error, context = null) {
    const errorObj = this.createError(
      this.errorTypes.UNKNOWN_ERROR,
      '发生未知错误',
      { 
        originalError: error?.message,
        context,
        stack: error?.stack
      },
      500
    );
    
    Logger.error('未知错误:', { 
      message: error?.message, 
      context, 
      stack: error?.stack 
    });
    return errorObj;
  }

  /**
   * 格式化错误响应
   */
  formatErrorResponse(error) {
    const response = {
      success: false,
      error: {
        type: error.type || this.errorTypes.UNKNOWN_ERROR,
        message: error.message,
        statusCode: error.statusCode || 500,
        timestamp: error.timestamp || new Date().toISOString()
      }
    };

    // 只在开发环境包含详细信息
    if (process.env.NODE_ENV === 'development') {
      response.error.details = error.details;
      response.error.stack = error.stack;
    }

    return response;
  }

  /**
   * 处理Socket.IO错误
   */
  handleSocketError(socket, error, event = null) {
    const errorResponse = this.formatErrorResponse(error);
    
    // 发送错误到客户端
    socket.emit('error', errorResponse);
    
    // 记录错误
    Logger.error('Socket错误:', {
      socketId: socket.id,
      event,
      error: errorResponse
    });
  }

  /**
   * 处理Express错误中间件
   */
  handleExpressError(error, req, res, next) {
    const errorResponse = this.formatErrorResponse(error);
    
    // 记录错误
    Logger.error('Express错误:', {
      method: req.method,
      url: req.url,
      error: errorResponse
    });

    // 发送错误响应
    res.status(errorResponse.error.statusCode).json(errorResponse);
  }

  /**
   * 异步错误包装器
   */
  async wrapAsync(fn) {
    return async (req, res, next) => {
      try {
        await fn(req, res, next);
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * 重试机制
   */
  async retry(operation, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        Logger.warn(`操作失败，第 ${attempt} 次重试:`, error.message);
        await this.sleep(delay * attempt); // 指数退避
      }
    }
    
    throw lastError;
  }

  /**
   * 延迟函数
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 错误分类
   */
  classifyError(error) {
    if (error.name === 'ValidationError') {
      return this.errorTypes.VALIDATION_ERROR;
    }
    
    if (error.name === 'UnauthorizedError') {
      return this.errorTypes.AUTHENTICATION_ERROR;
    }
    
    if (error.code === 'ENOENT') {
      return this.errorTypes.FILE_ERROR;
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return this.errorTypes.NETWORK_ERROR;
    }
    
    if (error.code === 'ER_DUP_ENTRY') {
      return this.errorTypes.CONFLICT_ERROR;
    }
    
    return this.errorTypes.UNKNOWN_ERROR;
  }

  /**
   * 获取错误统计信息
   */
  getErrorStats() {
    return {
      errorTypes: this.errorTypes,
      timestamp: new Date().toISOString()
    };
  }
}

// 创建全局错误处理器实例
const globalErrorHandler = new ErrorHandler();

module.exports = {
  ErrorHandler,
  globalErrorHandler
}; 