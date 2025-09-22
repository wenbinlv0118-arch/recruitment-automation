
/**
 * 生产环境安全中间件
 * 自动生成 - 请勿手动修改
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');

// CORS配置
const corsOptions = {
  "origin": [
    "https://recruitment-automation-frontend.zeabur.app"
  ],
  "methods": [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "OPTIONS"
  ],
  "allowedHeaders": [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin"
  ],
  "credentials": true,
  "maxAge": 86400,
  "optionsSuccessStatus": 200
};

// 安全头部配置
const helmetOptions = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "https:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
};

// 速率限制配置 - 配置为与trust proxy兼容
const globalLimiter = rateLimit({
  "windowMs": 900000,
  "max": 1000,
  "message": "请求过于频繁，请稍后再试",
  "standardHeaders": true,
  "legacyHeaders": false,
  "trustProxy": true
});
const apiLimiter = rateLimit({
  "windowMs": 900000,
  "max": 500,
  "message": "API请求过于频繁，请稍后再试",
  "trustProxy": true
});
const authLimiter = rateLimit({
  "windowMs": 900000,
  "max": 10,
  "message": "登录尝试过于频繁，请15分钟后再试",
  "skipSuccessfulRequests": true,
  "trustProxy": true
});
const uploadLimiter = rateLimit({
  "windowMs": 3600000,
  "max": 50,
  "message": "文件上传过于频繁，请稍后再试",
  "trustProxy": true
});

// 输入验证中间件
const validateInput = (req, res, next) => {
  // 实现输入验证逻辑
  const validation = {
  "fileUpload": {
    "maxSize": 10485760,
    "allowedTypes": [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"
    ],
    "maxFiles": 5
  },
  "string": {
    "maxLength": 10000,
    "minLength": 1,
    "sanitize": true,
    "allowedChars": {}
  },
  "email": {
    "pattern": {},
    "maxLength": 254
  },
  "password": {
    "minLength": 8,
    "maxLength": 128,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true,
    "requireSpecialChars": true
  }
};
  
  // 验证文件上传
  if (req.files) {
    for (const file of req.files) {
      if (file.size > validation.fileUpload.maxSize) {
        return res.status(400).json({ error: '文件大小超过限制' });
      }
      if (!validation.fileUpload.allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: '不支持的文件类型' });
      }
    }
  }
  
  next();
};

module.exports = {
  cors: cors(corsOptions),
  helmet: helmet(helmetOptions),
  globalLimiter,
  apiLimiter,
  authLimiter,
  uploadLimiter,
  validateInput
};
