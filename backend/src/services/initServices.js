const zhilianService = require('./zhilianService');
const candidateService = require('./candidateService');
const LLMService = require('./llmService');
const KnowledgeService = require('./knowledgeService');

// 初始化服务容器
const services = {
  zhilianService,
  candidateService,
  llmService: null,
  knowledgeService: null
};

/**
 * 初始化所有服务
 * @returns {Object} 包含所有初始化服务的对象
 */
async function initAllServices() {
  // 初始化大语言模型服务
  try {
    services.llmService = new LLMService();
    console.log('大语言模型服务初始化成功');
  } catch (error) {
    console.error('大语言模型服务初始化失败:', error.message);
    console.log('将使用模拟模式运行');
    services.llmService = null;
  }

  // 初始化知识库服务
  try {
    const { DatabaseAdapter } = require('../database/adapter');
    const dbAdapter = new DatabaseAdapter();
    services.knowledgeService = new KnowledgeService(dbAdapter);
    console.log('知识库服务初始化成功');
  } catch (error) {
    console.error('知识库服务初始化失败:', error.message);
    services.knowledgeService = null;
  }

  return services;
}

module.exports = {
  initAllServices,
  services
};