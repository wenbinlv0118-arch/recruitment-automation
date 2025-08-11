/**
 * 筛选器匹配功能测试文件
 * 用于验证修复后的筛选器匹配逻辑
 */

const { chromium } = require('playwright');

class FilterMatchingTester {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async init() {
    try {
      this.browser = await chromium.launch({ 
        headless: false,
        slowMo: 1000 
      });
      this.page = await this.browser.newPage();
      
      // 设置视口大小
      await this.page.setViewportSize({ width: 1920, height: 1080 });
      
      console.log('浏览器初始化成功');
      return true;
    } catch (error) {
      console.error('浏览器初始化失败:', error);
      return false;
    }
  }

  async testZhilianPage() {
    try {
      console.log('开始测试智联招聘页面...');
      
      // 访问智联招聘搜索页面
      await this.page.goto('https://sou.zhaopin.com/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      console.log('成功访问智联招聘页面');
      
      // 等待页面加载
      await this.page.waitForTimeout(5000);
      
      // 测试页面结构分析
      const pageStructure = await this.analyzePageStructure();
      console.log('页面结构分析结果:', {
        filterElementsCount: pageStructure?.filterElements?.length || 0,
        textContentCount: pageStructure?.textContent?.length || 0
      });
      
      // 测试筛选器信息获取
      const filterInfo = await this.getPageFilterInfo();
      console.log('筛选器信息:', {
        elementsCount: filterInfo?.filterElements?.length || 0,
        textsCount: filterInfo?.filterTexts?.length || 0,
        classesCount: filterInfo?.filterClasses?.length || 0
      });
      
      // 显示前几个筛选器元素
      if (filterInfo?.filterElements) {
        console.log('前5个筛选器元素:');
        filterInfo.filterElements.slice(0, 5).forEach((element, index) => {
          console.log(`  ${index + 1}. ${element.tagName} - ${element.className} - ${element.text}`);
        });
      }
      
      return true;
      
    } catch (error) {
      console.error('测试智联招聘页面失败:', error);
      return false;
    }
  }

  async analyzePageStructure() {
    try {
      console.log('开始分析页面结构...');
      
      const pageStructure = await this.page.evaluate(() => {
        const structure = {
          filterElements: [],
          textContent: [],
          attributes: [],
          classNames: [],
          dataAttributes: []
        };
        
        // 查找所有可能的筛选器元素
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach((element, index) => {
          if (index > 1000) return; // 限制分析的元素数量
          
          const tagName = element.tagName.toLowerCase();
          const className = element.className;
          const id = element.id;
          const text = element.textContent?.trim();
          
          // 检查是否包含筛选相关的关键词
          const filterKeywords = [
            '筛选', 'filter', '选择', 'select', '选项', 'option',
            '行业', 'industry', '地区', 'location', '城市', 'city',
            '规模', 'size', '薪资', 'salary', '经验', 'experience',
            '学历', 'education', '性质', 'nature', '融资', 'funding'
          ];
          
          const hasFilterKeyword = filterKeywords.some(keyword => 
            (className && className.toLowerCase().includes(keyword.toLowerCase())) ||
            (id && id.toLowerCase().includes(keyword.toLowerCase())) ||
            (text && text.toLowerCase().includes(keyword.toLowerCase()))
          );
          
          if (hasFilterKeyword && element.offsetWidth > 0 && element.offsetHeight > 0) {
            structure.filterElements.push({
              tagName,
              className,
              id,
              text: text?.substring(0, 100),
              rect: element.getBoundingClientRect(),
              attributes: Array.from(element.attributes).map(attr => ({
                name: attr.name,
                value: attr.value
              }))
            });
          }
        });
        
        // 收集页面文本内容
        const textNodes = document.querySelectorAll('body *');
        textNodes.forEach(node => {
          if (node.textContent && node.textContent.trim().length > 2) {
            structure.textContent.push({
              text: node.textContent.trim().substring(0, 50),
              tagName: node.tagName.toLowerCase(),
              className: node.className
            });
          }
        });
        
        return structure;
      });
      
      return pageStructure;
      
    } catch (error) {
      console.error('页面结构分析失败:', error);
      return null;
    }
  }

  async getPageFilterInfo() {
    try {
      console.log('获取页面筛选器信息...');
      
      const filterInfo = await this.page.evaluate(() => {
        const info = {
          filterElements: [],
          filterTexts: [],
          filterClasses: [],
          filterIds: []
        };
        
        // 查找所有可能的筛选器元素
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach((element, index) => {
          if (index > 2000) return; // 限制分析的元素数量
          
          const tagName = element.tagName.toLowerCase();
          const className = element.className;
          const id = element.id;
          const text = element.textContent?.trim();
          
          // 检查是否包含筛选相关的关键词
          const filterKeywords = [
            '筛选', 'filter', '选择', 'select', '选项', 'option',
            '行业', 'industry', '地区', 'location', '城市', 'city',
            '规模', 'size', '薪资', 'salary', '经验', 'experience',
            '学历', 'education', '性质', 'nature', '融资', 'funding',
            '条件', 'condition', '搜索', 'search'
          ];
          
          const hasFilterKeyword = filterKeywords.some(keyword => 
            (className && className.toLowerCase().includes(keyword.toLowerCase())) ||
            (id && id.toLowerCase().includes(keyword.toLowerCase())) ||
            (text && text.toLowerCase().includes(keyword.toLowerCase()))
          );
          
          if (hasFilterKeyword && element.offsetWidth > 0 && element.offsetHeight > 0) {
            info.filterElements.push({
              tagName,
              className,
              id,
              text: text?.substring(0, 100),
              rect: element.getBoundingClientRect(),
              attributes: Array.from(element.attributes).map(attr => ({
                name: attr.name,
                value: attr.value
              }))
            });
            
            if (text) info.filterTexts.push(text.substring(0, 50));
            if (className) info.filterClasses.push(className);
            if (id) info.filterIds.push(id);
          }
        });
        
        return info;
      });
      
      return filterInfo;
      
    } catch (error) {
      console.error('获取页面筛选器信息失败:', error);
      return null;
    }
  }

  async testFilterSelectors() {
    try {
      console.log('测试筛选器选择器...');
      
      // 测试各种筛选器类型的选择器
      const filterTypes = ['industry', 'location', 'company-size', 'salary-range'];
      
      for (const filterType of filterTypes) {
        console.log(`\n测试 ${filterType} 筛选器选择器:`);
        
        // 生成选择器
        const selectors = await this.generateTestSelectors(filterType);
        console.log(`  生成的选择器数量: ${selectors.length}`);
        
        // 测试每个选择器
        for (const selector of selectors.slice(0, 5)) { // 只测试前5个
          try {
            const element = await this.page.$(selector);
            if (element && await element.isVisible()) {
              console.log(`    ✓ ${selector} - 找到元素`);
            } else {
              console.log(`    ✗ ${selector} - 未找到或不可见`);
            }
          } catch (e) {
            console.log(`    ✗ ${selector} - 选择器错误: ${e.message}`);
          }
        }
      }
      
    } catch (error) {
      console.error('测试筛选器选择器失败:', error);
    }
  }

  async generateTestSelectors(filterType) {
    const staticSelectors = {
      'industry': [
        '.filter-item[data-type="industry"]',
        '.industry-filter .filter-item',
        '[data-key="industry"] .filter-item',
        '.filter-item:has-text("行业")',
        '[data-type="industry"]',
        '.industry-option'
      ],
      'location': [
        '.filter-item[data-type="location"]',
        '.location-filter .filter-item',
        '[data-key="city"] .filter-item',
        '.filter-item:has-text("地区")',
        '[data-type="city"]',
        '.city-option'
      ],
      'company-size': [
        '.filter-item[data-type="company-size"]',
        '.company-size-filter .filter-item',
        '.filter-item:has-text("规模")',
        '[data-type="company-size"]',
        '.size-option'
      ],
      'salary-range': [
        '.filter-item[data-type="salary"]',
        '.salary-filter .filter-item',
        '.filter-item:has-text("薪资")',
        '[data-type="salary"]',
        '.salary-option'
      ]
    };
    
    return staticSelectors[filterType] || [];
  }

  async close() {
    try {
      if (this.page) {
        await this.page.close();
      }
      if (this.browser) {
        await this.browser.close();
      }
      console.log('测试环境已关闭');
    } catch (error) {
      console.error('关闭测试环境失败:', error);
    }
  }
}

// 运行测试
async function runTest() {
  const tester = new FilterMatchingTester();
  
  try {
    // 初始化
    const initSuccess = await tester.init();
    if (!initSuccess) {
      console.error('测试初始化失败');
      return;
    }
    
    // 测试智联招聘页面
    const pageTestSuccess = await tester.testZhilianPage();
    if (!pageTestSuccess) {
      console.error('页面测试失败');
      return;
    }
    
    // 测试筛选器选择器
    await tester.testFilterSelectors();
    
    console.log('\n测试完成！');
    
  } catch (error) {
    console.error('测试运行失败:', error);
  } finally {
    // 等待一段时间后关闭
    await new Promise(resolve => setTimeout(resolve, 10000));
    await tester.close();
  }
}

// 如果直接运行此文件，则执行测试
if (require.main === module) {
  runTest();
}

module.exports = FilterMatchingTester;
