const express = require('express');
const router = express.Router();
const resourcePreloader = require('../services/resourcePreloader');

/**
 * 资源状态查询
 * 为什么：在提示用户预加载前展示当前安装/缓存情况
 */
router.get('/api/resources/status', async (req, res) => {
  try {
    const playwrightChromiumInstalled = await resourcePreloader.isPlaywrightChromiumInstalled();
    const ocr = await resourcePreloader.getOcrLangStatus(['eng', 'chi_sim']);
    res.json({ ok: true, playwrightChromiumInstalled, ocr });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * 资源预加载
 * 为什么：在用户允许并联网时提前下载关键资源，减少首次等待
 */
router.post('/api/resources/preload', async (req, res) => {
  try {
    const { playwright = true, ocrLangs = ['eng', 'chi_sim'], async = true } = req.body || {};

    // 异步模式：启动任务后立即返回
    if (async) {
      setImmediate(async () => {
        if (playwright) {
          const installed = await resourcePreloader.isPlaywrightChromiumInstalled();
          if (!installed) await resourcePreloader.preloadPlaywrightChromium();
        }
        if (ocrLangs && ocrLangs.length) {
          const status = await resourcePreloader.getOcrLangStatus(ocrLangs);
          const missing = ocrLangs.filter(l => !status[l]);
          if (missing.length) await resourcePreloader.preloadOcrLangs(missing);
        }
      });
      return res.json({ ok: true, started: true });
    }

    // 同步模式：等待任务完成后返回结果
    let playwrightOk = true;
    if (playwright) {
      const installed = await resourcePreloader.isPlaywrightChromiumInstalled();
      playwrightOk = installed || await resourcePreloader.preloadPlaywrightChromium();
    }
    let ocrOk = true;
    if (ocrLangs && ocrLangs.length) {
      const status = await resourcePreloader.getOcrLangStatus(ocrLangs);
      const missing = ocrLangs.filter(l => !status[l]);
      ocrOk = missing.length ? await resourcePreloader.preloadOcrLangs(missing) : true;
    }
    res.json({ ok: playwrightOk && ocrOk, playwrightOk, ocrOk });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;