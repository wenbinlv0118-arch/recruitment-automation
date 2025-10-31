// 打包环境自动验证脚本
// 目的：在 Electron 打包应用内自动触发三项功能并采集日志
import { resolveBaseUrl, get, post, parseJson } from './apiClient';
import { info, error } from './logCollector';

/**
 * 运行自动化验证流程（为什么）
 * - 帮助在打包环境一键验证后端连通性与关键功能
 * - 依次触发：资源状态/预加载、智联候选人浏览、知识库聊天
 */
export async function runAutoVerification() {
  try {
    // 仅在 Electron 环境尝试自动验证
    const base = await resolveBaseUrl();
    if (!base) {
      info('AutoVerify', '未检测到打包环境，跳过自动验证');
      return;
    }

    // 0. 健康检查
    info('AutoVerify', `后端基础地址: ${base}`);
    const healthResp = await get('/api/health');
    if (!healthResp.ok) {
      error('AutoVerify', `健康检查失败，HTTP ${healthResp.status}`);
      return;
    }
    const health = await parseJson(healthResp);
    info('AutoVerify', `健康检查通过: ${JSON.stringify(health)}`);

    // 1. 资源状态与预加载
    info('Resources', '查询资源状态');
    const resStatusResp = await get('/api/resources/status');
    const resStatus = await parseJson(resStatusResp);
    info('Resources', `状态: ${JSON.stringify(resStatus)}`);

    const needPlaywright = !resStatus.playwrightChromiumInstalled;
    const needOcrEng = !(resStatus.ocr?.eng);
    const needOcrChi = !(resStatus.ocr?.chi_sim);
    if (needPlaywright || needOcrEng || needOcrChi) {
      info('Resources', '触发异步预加载缺失项');
      const preloadResp = await post('/api/resources/preload', {
        playwright: needPlaywright,
        ocrLangs: [
          ...(needOcrEng ? ['eng'] : []),
          ...(needOcrChi ? ['chi_sim'] : []),
        ],
        async: true,
      });
      const preload = await parseJson(preloadResp);
      info('Resources', `预加载触发结果: ${JSON.stringify(preload)}`);
    } else {
      info('Resources', 'Playwright 与 OCR 语言已就绪，跳过预加载');
    }

    // 2. 智联候选人浏览（尽可能自动）
    info('Zhilian', '初始化服务');
    const initResp = await post('/api/zhilian/init', {});
    const init = await parseJson(initResp);
    info('Zhilian', `初始化结果: ${JSON.stringify(init)}`);

    info('Zhilian', '打开智联网站');
    const openResp = await post('/api/zhilian/execute-step', { step: 'open_website' });
    const openRes = await parseJson(openResp);
    info('Zhilian', `打开网站结果: ${JSON.stringify(openRes)}`);

    info('Zhilian', '尝试启动候选人浏览（search 模式）');
    const startResp = await post('/api/zhilian/start-browsing', {
      mode: 'search',
      filters: {},
      targetCount: 5,
    });
    const start = await parseJson(startResp);
    info('Zhilian', `启动浏览结果: ${JSON.stringify(start)}`);

    const statusResp = await get('/api/zhilian/status');
    const status = await parseJson(statusResp);
    info('Zhilian', `当前状态: ${JSON.stringify(status)}`);

    // 3. 知识库聊天（如果未配置 LLM，会记录降级错误）
    info('Knowledge', '检索知识库');
    const retrieveResp = await post('/api/knowledge/retrieve', {
      query: '测试查询',
      companyId: 1,
      limit: 3,
    });
    const retrieve = await parseJson(retrieveResp);
    info('Knowledge', `检索结果: ${JSON.stringify(retrieve)}`);

    info('Knowledge', '尝试触发知识库聊天');
    const chatResp = await post('/api/knowledge/chat', {
      query: '公司福利与加班政策是什么？',
      companyId: 1,
    });
    const chat = await parseJson(chatResp);
    info('Knowledge', `聊天结果: ${JSON.stringify(chat)}`);
  } catch (e) {
    error('AutoVerify', e);
  }
}