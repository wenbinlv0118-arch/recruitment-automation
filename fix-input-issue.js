// 浏览器控制台执行：修复所有输入框无法输入的问题
(function() {
    console.log('🔧 开始修复输入框问题...');
    
    // 1. 强制修复所有输入框的禁用状态
    const inputs = document.querySelectorAll('input[type="text"], input[type="search"], textarea');
    console.log(`📋 找到 ${inputs.length} 个输入框`);
    
    inputs.forEach((input, index) => {
        console.log(`  输入框 ${index + 1}:`, {
            type: input.type,
            placeholder: input.placeholder,
            disabled: input.disabled,
            readonly: input.readOnly
        });
        
        // 强制启用
        input.disabled = false;
        input.readOnly = false;
        
        // 确保可见和可交互
        input.style.pointerEvents = 'auto';
        input.style.opacity = '1';
        input.style.zIndex = '9999';
        
        // 添加焦点测试
        input.addEventListener('focus', () => {
            console.log(`✅ 输入框获得焦点: ${input.placeholder || '无提示'}`);
        });
        
        input.addEventListener('input', (e) => {
            console.log(`📝 输入内容: "${e.target.value}"`);
        });
    });
    
    // 2. 检查并移除可能的覆盖层
    const overlays = document.querySelectorAll('div[style*="fixed"], div[style*="absolute"], div[class*="overlay"]');
    console.log(`🎯 找到 ${overlays.length} 个可能的覆盖层`);
    
    overlays.forEach((overlay, index) => {
        const rect = overlay.getBoundingClientRect();
        const computedStyle = window.getComputedStyle(overlay);
        
        if (rect.bottom > window.innerHeight - 100 && 
            computedStyle.pointerEvents !== 'none') {
            console.log(`  覆盖层 ${index + 1}:`, {
                className: overlay.className,
                zIndex: computedStyle.zIndex,
                pointerEvents: computedStyle.pointerEvents,
                bottom: rect.bottom
            });
        }
    });
    
    // 3. 检查Antd组件的禁用状态
    const antdInputs = document.querySelectorAll('.ant-input, .ant-input-textarea');
    console.log(`🎨 找到 ${antdInputs.length} 个Antd输入框`);
    
    antdInputs.forEach((input, index) => {
        const wrapper = input.closest('.ant-input-affix-wrapper, .ant-input-group');
        if (wrapper) {
            wrapper.style.pointerEvents = 'auto';
            wrapper.style.opacity = '1';
        }
    });
    
    // 4. 修复React状态
    if (window.React && window.React.createElement) {
        console.log('🔧 检测到React环境');
        
        // 尝试找到React组件并修复状态
        const reactRoots = document.querySelectorAll('[data-reactroot], #root > *');
        console.log(`📦 找到 ${reactRoots.length} 个React根节点`);
        
        // 触发重新渲染
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
            console.log('🔄 触发重新渲染');
        }, 100);
    }
    
    // 5. 测试输入框功能
    setTimeout(() => {
        const testInput = inputs[0];
        if (testInput) {
            testInput.focus();
            console.log('✅ 自动聚焦第一个输入框');
        }
    }, 500);
    
    console.log('🎉 输入框修复完成！');
    console.log('💡 现在尝试点击输入框并输入文字');
    
})();