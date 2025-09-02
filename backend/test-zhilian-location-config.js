/**
 * 智联招聘工作地点配置功能测试脚本
 * 测试修复后的工作地点配置是否正常工作
 */

const ZhilianService = require('./src/services/zhilianService');
const logger = require('./src/utils/logger');

async function testLocationConfig() {
  console.log('开始测试智联招聘工作地点配置功能...');
  
  const zhilianService = new ZhilianService();
  
  try {
    // 1. 初始化浏览器
    console.log('\n1. 初始化浏览器...');
    await zhilianService.initializeBrowser();
    console.log('✅ 浏览器初始化成功');
    
    // 2. 打开智联招聘网站
    console.log('\n2. 打开智联招聘网站...');
    await zhilianService.openZhilianWebsite();
    console.log('✅ 智联招聘网站打开成功');
    
    // 3. 检查登录状态
    console.log('\n3. 检查登录状态...');
    const loginStatus = await zhilianService.checkLoginStatus();
    console.log(`登录状态: ${loginStatus ? '已登录' : '未登录'}`);
    
    if (!loginStatus) {
      console.log('⚠️ 用户未登录，需要先登录才能使用工作地点配置功能');
      console.log('请在浏览器中手动登录，然后按任意键继续...');
      
      // 等待用户手动登录
      await new Promise(resolve => {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.on('data', () => {
          process.stdin.setRawMode(false);
          process.stdin.pause();
          resolve();
        });
      });
      
      // 再次检查登录状态
      const newLoginStatus = await zhilianService.checkLoginStatus();
      if (!newLoginStatus) {
        console.log('❌ 仍未登录，测试终止');
        return;
      }
      console.log('✅ 登录成功，继续测试');
    }
    
    // 4. 导航到简历搜索页面
    console.log('\n4. 导航到简历搜索页面...');
    await zhilianService.navigateToResumeSearch();
    console.log('✅ 简历搜索页面导航成功');
    
    // 5. 等待页面完全加载
    console.log('\n5. 等待页面完全加载...');
    await zhilianService.waitForPageFullyLoaded();
    console.log('✅ 页面加载完成');
    
    // 6. 检查页面状态和元素
    console.log('\n6. 检查页面状态和元素...');
    const currentUrl = zhilianService.page.url();
    const pageTitle = await zhilianService.page.title();
    console.log(`当前页面URL: ${currentUrl}`);
    console.log(`页面标题: ${pageTitle}`);
    
    // 检查关键词面板是否存在
    const keywordPanel = await zhilianService.page.$('div.keyword-panel.sticky-pane');
    console.log(`关键词面板存在: ${!!keywordPanel}`);
    
    if (!keywordPanel) {
      // 尝试查找其他可能的面板元素
      const alternativePanels = [
        'div.keyword-panel',
        'div.filter-panel',
        'div.search-panel',
        '[class*="keyword"]',
        '[class*="filter"]'
      ];
      
      for (const selector of alternativePanels) {
        const element = await zhilianService.page.$(selector);
        if (element) {
          console.log(`找到替代面板: ${selector}`);
          break;
        }
      }
    }
    
    // 7. 测试工作地点配置功能（完整流程）
    console.log('\n7. 测试工作地点配置功能...');
    const testLocation = '北京';
    
    try {
      // 7.1 点击工作地点配置组件
      console.log('7.1 点击工作地点配置组件...');
      const keywordPanel = await zhilianService.page.$('div.keyword-panel.sticky-pane');
      const panelWrapper = await keywordPanel.$('div.keyword-panel__wrapper');
      const locationComponent = await panelWrapper.$('div.keyword-panel-city.keyword-panel__city');
      
      await locationComponent.click();
      await zhilianService.page.waitForTimeout(2000);
      console.log('✅ 工作地点配置组件点击成功');
      
      // 7.2 检查并清除现有地点配置
      console.log('7.2 检查并清除现有地点配置...');
      const existingTags = await zhilianService.page.$$('ul.s-tags li.s-tags__item');
      console.log(`找到 ${existingTags.length} 个现有地点配置`);
      
      for (let i = 0; i < existingTags.length; i++) {
        try {
          const closeButton = await existingTags[i].$('i.s-tags__close.s-icon.s-icon-guanbi');
          if (closeButton) {
            await closeButton.click();
            await zhilianService.page.waitForTimeout(500);
            console.log(`✅ 已清除第 ${i + 1} 个现有地点配置`);
          }
        } catch (error) {
          console.log(`清除第 ${i + 1} 个地点配置失败:`, error.message);
        }
      }
      
      // 7.3 输入新的工作地点
      console.log('7.3 输入新的工作地点...');
      const searchInput = await zhilianService.page.$('input[placeholder="搜索城市名/区县"]');
      if (!searchInput) {
        throw new Error('未找到搜索输入框');
      }
      
      await searchInput.click();
      await zhilianService.page.waitForTimeout(500);
      await searchInput.fill('');
      await searchInput.type(testLocation);
      await zhilianService.page.waitForTimeout(2000);
      console.log(`✅ 已输入地点: ${testLocation}`);
      
      // 7.4 等待并点击下拉列表中的第一个选项
      console.log('7.4 等待并点击下拉列表中的第一个选项...');
      try {
        // 等待下拉列表出现
        await zhilianService.page.waitForSelector('mark.search-mark', { timeout: 5000 });
        
        // 点击第一个匹配项
        const firstOption = await zhilianService.page.$('mark.search-mark');
        if (firstOption) {
          await firstOption.click();
          await zhilianService.page.waitForTimeout(1000);
          console.log('✅ 已点击下拉列表第一个选项');
        } else {
          throw new Error('未找到下拉列表选项');
        }
      } catch (error) {
        console.log('点击下拉列表选项失败:', error.message);
        // 尝试其他可能的选择器
        const alternativeSelectors = [
          'div.s-cascader__menu .s-cascader__menu-item:first-child',
          'div.s-cascader__menu li:first-child',
          '.cascader-option:first-child',
          '[class*="option"]:first-child'
        ];
        
        let optionClicked = false;
        for (const selector of alternativeSelectors) {
          try {
            const option = await zhilianService.page.$(selector);
            if (option) {
              await option.click();
              await zhilianService.page.waitForTimeout(1000);
              console.log(`✅ 使用备用选择器点击选项: ${selector}`);
              optionClicked = true;
              break;
            }
          } catch (altError) {
            continue;
          }
        }
        
        if (!optionClicked) {
          console.log('⚠️ 未能点击任何下拉选项，继续执行确认操作');
        }
      }
      
      // 7.5 点击确认按钮
      console.log('7.5 点击确认按钮...');
      const confirmButton = await zhilianService.page.$('button.s-button.s-cascader__footer-button.s-button--primary.s-button--medium');
      if (!confirmButton) {
        throw new Error('未找到确认按钮');
      }
      
      const buttonText = await confirmButton.textContent();
      console.log(`确认按钮文本: ${buttonText}`);
      
      await confirmButton.click();
      await zhilianService.page.waitForTimeout(2000);
      console.log('✅ 确认按钮点击成功');
      
      console.log(`✅ 工作地点配置完整流程成功: ${testLocation}`);
      
    } catch (error) {
      console.log(`❌ 工作地点配置失败: ${error.message}`);
    }
    
    // 8. 等待一段时间观察结果
    console.log('\n8. 等待观察配置结果...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n🎉 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
    logger.error('工作地点配置测试失败:', error);
  } finally {
    // 清理资源
    try {
      console.log('\n清理测试资源...');
      await zhilianService.closeBrowser();
      console.log('✅ 浏览器已关闭');
    } catch (cleanupError) {
      console.error('清理资源时发生错误:', cleanupError);
    }
  }
}

// 运行测试
if (require.main === module) {
  testLocationConfig().catch(error => {
    console.error('测试失败，请查看上述错误信息');
    process.exit(1);
  });
}

module.exports = testLocationConfig;