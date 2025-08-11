/**
 * Socket.IO事件处理模块
 * 集中管理所有Socket连接和事件响应
 */

/**
 * 设置Socket.IO事件处理器
 * @param {Object} io - Socket.IO实例
 * @param {Object} zhilianService - 智联招聘自动化服务
 * @param {Object} candidateService - 候选人智能服务
 * @param {Object} llmService - 大语言模型服务
 * @param {Object} knowledgeService - 知识库服务
 */
function setupSocketHandlers(io, zhilianService, candidateService, llmService, knowledgeService) {
  io.on('connection', (socket) => {
    console.log('客户端已连接:', socket.id);

    // 处理智能寻聘请求
    socket.on('startRecruitment', async (data) => {
      try {
        socket.emit('statusUpdate', { 
          status: 'starting', 
          message: '正在启动浏览器...' 
        });
        await zhilianService.startRecruitment(socket, data);
      } catch (error) {
        console.error('智能寻聘失败:', error);
        socket.emit('error', { 
          message: '智能寻聘失败: ' + error.message 
        });
      }
    });

    // 处理验证码输入
    socket.on('submitVerificationCode', async (code) => {
      try {
        await zhilianService.submitVerificationCode(socket, code);
      } catch (error) {
        console.error('验证码提交失败:', error);
        socket.emit('error', { 
          message: '验证码提交失败: ' + error.message 
        });
      }
    });

    // 处理设置筛选条件
    socket.on('setFilterConditions', async (filter) => {
      try {
        console.log('设置筛选条件:', filter);
        candidateService.setFilterConditions(filter);
        socket.emit('filterUpdated', { 
          status: 'success', 
          message: '筛选条件已更新',
          filter: filter
        });
      } catch (error) {
        console.error('设置筛选条件失败:', error);
        socket.emit('error', { 
          message: '设置筛选条件失败: ' + error.message 
        });
      }
    });

    // 处理筛选候选人
    socket.on('filterCandidates', async () => {
      try {
        console.log('开始筛选候选人');
        const candidates = await candidateService.filterCandidates(socket);
        socket.emit('candidatesFiltered', { 
          status: 'success', 
          message: `已筛选出 ${candidates.length} 位候选人`,
          candidates: candidates
        });
      } catch (error) {
        console.error('筛选候选人失败:', error);
        socket.emit('error', { 
          message: '筛选候选人失败: ' + error.message 
        });
      }
    });

    // 处理与候选人对话
    socket.on('talkWithCandidate', async (data) => {
      try {
        console.log('与候选人对话:', data);
        const result = await candidateService.talkWithCandidate(socket, data.resumeId, data.message);
        socket.emit('talkCompleted', result);
      } catch (error) {
        console.error('与候选人对话失败:', error);
        socket.emit('error', { 
          message: '与候选人对话失败: ' + error.message 
        });
      }
    });

    // 处理获取候选人简历
    socket.on('getCandidateResume', async (resumeId) => {
      try {
        console.log('获取候选人简历:', resumeId);
        const result = await candidateService.getCandidateResume(socket, resumeId);
        socket.emit('resumeRetrieved', result);
      } catch (error) {
        console.error('获取候选人简历失败:', error);
        socket.emit('error', { 
          message: '获取候选人简历失败: ' + error.message 
        });
      }
    });

    // 处理公司搜索请求
    socket.on('startCompanySearch', async (data) => {
      try {
        console.log('启动公司搜索:', data);
        
        // 创建公司搜索服务实例
        const CompanySearchService = require('./companySearchService');
        const companySearchService = new CompanySearchService();
        
        // 启动公司搜索流程
        await companySearchService.startCompanySearch(socket, data);
        
      } catch (error) {
        console.error('启动公司搜索失败:', error);
        socket.emit('companySearchError', { 
          message: '启动公司搜索失败: ' + error.message 
        });
      }
    });

    // 处理公司搜索筛选条件
    socket.on('executeCompanySearch', async (data) => {
      try {
        console.log('执行公司搜索:', data);
        
        // 创建公司搜索服务实例
        const CompanySearchService = require('./companySearchService');
        const companySearchService = new CompanySearchService();
        
        // 执行搜索
        const result = await companySearchService.executeSearch(socket, data.filters);
        
        // 发送搜索结果
        socket.emit('companySearchResults', {
          status: 'completed',
          companies: result.companies,
          recommendations: result.recommendations
        });
        
      } catch (error) {
        console.error('执行公司搜索失败:', error);
        socket.emit('companySearchError', { 
          message: '执行公司搜索失败: ' + error.message 
        });
      }
    });

    // 处理公司搜索筛选条件配置
    socket.on('configureCompanyFilters', async (data) => {
      try {
        console.log('配置公司搜索筛选条件:', data);
        
        // 这里可以添加筛选条件配置逻辑
        socket.emit('companySearchStatus', { 
          status: 'filters_configured', 
          message: '筛选条件已配置，正在执行搜索...',
          sessionId: data.sessionId
        });
        
      } catch (error) {
        console.error('配置公司搜索筛选条件失败:', error);
        socket.emit('companySearchError', { 
          message: '配置筛选条件失败: ' + error.message 
        });
      }
    });

    // 处理用户对话消息
    socket.on('userMessage', async (data) => {
      try {
        console.log('收到用户消息:', data);
        
        if (llmService) {
          socket.emit('statusUpdate', { 
            status: 'thinking', 
            message: '正在思考...' 
          });
          
          const messages = llmService.generateThinkingChainPrompt(data.message);
          let thinkingStepsSent = false;
          
          const response = await llmService.chatWithLLM(messages, (content) => {
            if (!thinkingStepsSent) {
              socket.emit('thinking', { content: content });
              thinkingStepsSent = true;
            }
          }, (finalAnswer) => {
            socket.emit('finalAnswer', { content: finalAnswer });
          });
          
          socket.emit('aiMessage', { content: response });
        } else {
          socket.emit('statusUpdate', { 
            status: 'thinking', 
            message: '正在思考...' 
          });
          
          const thinkingSteps = [
            "👉 分析用户需求：用户希望了解如何使用智能寻聘功能",
            "👉 思考实现方案：我需要解释智能寻聘的工作流程",
            "👉 制定执行步骤：首先需要登录智联招聘账号，然后设置筛选条件，最后开始筛选候选人"
          ];
          
          socket.emit('thinking', { content: thinkingSteps });
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          socket.emit('aiMessage', { 
            content: '智能寻聘功能可以帮助您自动在智联招聘上寻找合适的候选人。使用流程如下：\n\n1. 提供您的智联招聘账号信息\n2. 设置筛选条件（如技能、经验、薪资等）\n3. 启动筛选过程\n4. 查看筛选结果并与候选人互动\n\n请提供您的手机号码，我将帮您启动智能寻聘流程。' 
          });
        }
      } catch (error) {
        console.error('处理用户消息失败:', error);
        socket.emit('error', { 
          message: '处理消息失败: ' + error.message 
        });
      }
    });

    // 处理知识库AI对话
    socket.on('knowledgeChat', async (data) => {
      try {
        console.log('收到知识库对话请求:', data);
        
        if (!knowledgeService) {
          socket.emit('knowledgeChat', { 
            response: '抱歉，知识库服务暂时不可用，请稍后再试。' 
          });
          return;
        }

        const { query, companyId } = data;
        
        if (!query || !companyId) {
          socket.emit('knowledgeChat', { 
            response: '请提供查询内容和公司ID。' 
          });
          return;
        }

        // 检索相关知识
        const results = await knowledgeService.retrieveKnowledge(query, companyId, 5);
        const context = knowledgeService.buildContext(results);

        // 使用LLM生成回答
        let response;
        if (llmService) {
          response = await llmService.chatWithKnowledgeBase(query, context);
        } else {
          if (results.length > 0) {
            response = `基于企业知识库，我为您找到以下相关信息：\n\n${results.map((result, index) => 
              `${index + 1}. ${result.content.substring(0, 200)}...\n   相关度: ${(result.similarity * 100).toFixed(1)}%\n`
            ).join('\n')}\n\n这些信息应该能帮助回答您的问题。如果您需要更详细的信息，请告诉我。`;
          } else {
            response = '抱歉，在企业知识库中没有找到与您问题相关的内容。请尝试使用不同的关键词或查看文档管理中的可用文档。';
          }
        }

        socket.emit('knowledgeChat', { response });
        
      } catch (error) {
        console.error('知识库对话失败:', error);
        socket.emit('knowledgeChat', { 
          response: '抱歉，知识库对话服务出现错误，请稍后再试。' 
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('客户端断开连接:', socket.id);
    });
  });
}

module.exports = {
  setupSocketHandlers
};