const fs = require('fs');
const path = require('path');

/**
 * 选择器解析工具（同时适配 Playwright 与 Puppeteer）
 * 设计目标：
 * - 通过远程配置（aliases.json）驱动，在 UI 文本频繁变更时保持稳定
 * - 优先使用稳定信号（结构/属性/路由），文本作为辅助与兜底
 * - 对 Playwright 返回 Locator；对 Puppeteer 返回 ElementHandle
 */

// 简单内存缓存，减少频繁读取
let cachedConfig = null;
let lastLoadTs = 0;

/**
 * 加载别名配置（优先从工作目录 public，其次从 backend/public）
 * 为什么：
 * - 部署时通常将 public 作为静态根，读取文件比 HTTP 依赖更少、失败率更低
 * - 保持每次调用都能获取最新文件（不做持久缓存），便于远程热更新
 */
function loadAliasesConfig() {
  const now = Date.now();
  // 简易 3 秒缓存窗口，避免同一流程内重复 IO
  if (cachedConfig && now - lastLoadTs < 3000) return cachedConfig;

  const candidatePaths = [
    path.join(process.cwd(), 'public', 'config', 'aliases.json'),
    path.join(process.cwd(), 'backend', 'public', 'config', 'aliases.json'),
    path.join(__dirname, '../public', 'config', 'aliases.json')
  ];

  let jsonStr = null;
  for (const p of candidatePaths) {
    try {
      if (fs.existsSync(p)) {
        jsonStr = fs.readFileSync(p, 'utf8');
        break;
      }
    } catch (_) {}
  }

  if (!jsonStr) {
    throw new Error('未找到 aliases.json 配置文件，请确认已放置于 public/config/ 目录');
  }

  try {
    cachedConfig = JSON.parse(jsonStr);
    lastLoadTs = now;
    return cachedConfig;
  } catch (err) {
    throw new Error('解析 aliases.json 失败: ' + err.message);
  }
}

/**
 * 文本相似度（极简版）
 * 为什么：
 * - 轻量模糊匹配，容忍小范围差异（如“人才搜索” vs “搜索人才”）
 */
function textSimilarity(a, b) {
  if (!a || !b) return 0;
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  if (na === nb) return 1;
  // 子串包含给予一定分数
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  // 词集合重合度
  const sa = new Set(na.split(/\s+/));
  const sb = new Set(nb.split(/\s+/));
  let inter = 0;
  sa.forEach(w => { if (sb.has(w)) inter++; });
  const union = sa.size + sb.size - inter;
  return union ? inter / union : 0;
}

/**
 * 判断上下文是否为 Playwright（存在 locator 方法）
 * 为什么：
 * - 便于在不同自动化引擎间采用各自最佳的查询方式
 */
function isPlaywrightContext(context) {
  return !!(context && typeof context.locator === 'function');
}

/**
 * 在当前上下文内尝试一组 CSS 选择器并返回第一个可见 Locator
 * Playwright 分支：使用 locator判断可见性
 * Puppeteer 分支：使用 $ 查询并通过样式与尺寸判断可见性
 */
async function tryCssCandidates(context, selectors) {
  const list = Array.isArray(selectors) ? selectors : [];
  const isPw = isPlaywrightContext(context);
  if (isPw) {
    for (const sel of list) {
      try {
        const loc = context.locator(sel).first();
        const visible = await loc.isVisible({ timeout: 1000 }).catch(() => false);
        if (visible) return loc;
      } catch (_) {}
    }
    return null;
  } else {
    // Puppeteer：过滤掉 Playwright 专有语法（text=、:has-text）
    const filtered = list.filter(s => !/text=|:has-text\(/i.test(s));
    for (const sel of filtered) {
      try {
        const el = await context.$(sel);
        if (!el) continue;
        const visible = await context.evaluate((node) => {
          if (!node) return false;
          const style = window.getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style && style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
        }, el).catch(() => false);
        if (visible) return el;
      } catch (_) {}
    }
    return null;
  }
}

/**
 * 通过角色/文本匹配定位元素
 * 为什么：
 * - 当 CSS 不稳定时，基于 ARIA/文本的角色定位是可靠的辅助信号
 */
async function tryRoleCandidates(context, roleDefs) {
  if (!Array.isArray(roleDefs)) return null;
  const isPw = isPlaywrightContext(context);
  if (isPw) {
    for (const def of roleDefs) {
      try {
        const role = def.role || 'button';
        const names = def.nameIncludes || [];
        const loc = context.locator(`[role="${role}"]`).filter({ hasText: names[0] || '' }).first();
        const visible = await loc.isVisible({ timeout: 800 }).catch(() => false);
        if (visible) return loc;
        for (const name of names) {
          const l2 = context.locator(`[role="${role}"]`).filter({ hasText: name }).first();
          const v2 = await l2.isVisible({ timeout: 600 }).catch(() => false);
          if (v2) return l2;
        }
      } catch (_) {}
    }
    return null;
  } else {
    // Puppeteer：使用 XPath 基于文本的角色匹配
    for (const def of roleDefs) {
      const role = def.role || 'button';
      const names = def.nameIncludes || [];
      for (const name of names.length ? names : ['']) {
        try {
          const xpath = name
            ? `//*[@role='${role}'][contains(normalize-space(.), '${name}')]`
            : `//*[@role='${role}']`;
          const nodes = await context.$x(xpath);
          if (!nodes || nodes.length === 0) continue;
          // 选择第一个可见节点
          for (const el of nodes) {
            const visible = await context.evaluate((node) => {
              if (!node) return false;
              const style = window.getComputedStyle(node);
              const rect = node.getBoundingClientRect();
              return style && style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
            }, el).catch(() => false);
            if (visible) return el;
          }
        } catch (_) {}
      }
    }
    return null;
  }
}

/**
 * 通过路由模式匹配超链接
 * 为什么：
 * - 路由片段通常更稳定（例如 /search、rd6...），优先作为强信号
 */
async function tryRouteCandidates(context, patterns) {
  if (!Array.isArray(patterns)) return null;
  const isPw = isPlaywrightContext(context);
  if (isPw) {
    for (const pat of patterns) {
      try {
        const loc = context.locator(`a[href*="${pat}"]`).first();
        const visible = await loc.isVisible({ timeout: 800 }).catch(() => false);
        if (visible) return loc;
      } catch (_) {}
    }
    return null;
  } else {
    for (const pat of patterns) {
      try {
        const el = await context.$(`a[href*="${pat}"]`);
        if (!el) continue;
        const visible = await context.evaluate((node) => {
          if (!node) return false;
          const style = window.getComputedStyle(node);
          const rect = node.getBoundingClientRect();
          return style && style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
        }, el).catch(() => false);
        if (visible) return el;
      } catch (_) {}
    }
    return null;
  }
}

/**
 * 通过别名文本模糊匹配按钮或链接
 * 为什么：
 * - 文本是最常变动的部分，但在没有更稳定信号时仍是必要兜底
 */
async function tryAliasText(context, aliases) {
  const candidates = Array.isArray(aliases) ? aliases : [];
  const isPw = isPlaywrightContext(context);
  if (isPw) {
    const tagSets = ['button', 'a', '[role="button"]', '[role="link"]', '*'];
    for (const tag of tagSets) {
      for (const alias of candidates) {
        try {
          const loc = context.locator(`${tag}:has-text("${alias}")`).first();
          const visible = await loc.isVisible({ timeout: 800 }).catch(() => false);
          if (visible) return loc;
        } catch (_) {}
      }
    }
    return null;
  } else {
    // Puppeteer：使用 XPath 的 contains 文本匹配
    const tagXPaths = [
      '//button',
      '//a',
      '//*[@role="button"]',
      '//*[@role="link"]',
      '//*'
    ];
    for (const alias of candidates) {
      for (const base of tagXPaths) {
        try {
          const xpath = `${base}[contains(normalize-space(.), '${alias}')]`;
          const nodes = await context.$x(xpath);
          if (!nodes || nodes.length === 0) continue;
          for (const el of nodes) {
            const visible = await context.evaluate((node) => {
              if (!node) return false;
              const style = window.getComputedStyle(node);
              const rect = node.getBoundingClientRect();
              return style && style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0;
            }, el).catch(() => false);
            if (visible) return el;
          }
        } catch (_) {}
      }
    }
    return null;
  }
}

/**
 * 解析目标动作元素（Page 或 Frame）
 * 参数：
 * - context: Playwright Page/Frame
 * - site: 站点标识（boss | zhilian）
 * - intent: 动作意图（search | communicate 等）
 * 返回：Locator 或 null
 * 为什么：
 * - 将多策略（CSS/角色/路由/别名文本）按稳定性优先级串行尝试，提升鲁棒性
 */
async function resolveActionElement(context, site, intent) {
  const cfg = loadAliasesConfig();
  const siteCfg = cfg?.sites?.[site]?.actions?.[intent];
  if (!siteCfg) return null;

  // 1) 路由模式（强信号）
  const byRoute = await tryRouteCandidates(context, siteCfg.selectors?.routes);
  if (byRoute) return byRoute;

  // 2) CSS 选择器（结构信号）
  const byCss = await tryCssCandidates(context, siteCfg.selectors?.css || []);
  if (byCss) return byCss;

  // 3) 角色/ARIA（可访问性信号）
  const byRole = await tryRoleCandidates(context, siteCfg.selectors?.roles || []);
  if (byRole) return byRole;

  // 4) 别名文本（兜底）
  const byAlias = await tryAliasText(context, siteCfg.aliases || []);
  if (byAlias) return byAlias;

  return null;
}

module.exports = {
  loadAliasesConfig,
  resolveActionElement,
  textSimilarity,
  isPlaywrightContext
};