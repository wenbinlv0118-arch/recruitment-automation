// 临时修复：强制启用输入框
// 在浏览器控制台执行此代码

(function() {
    console.log('开始调试输入框问题...');
    
    // 检查当前连接状态
    console.log('当前连接状态:', {
        isConnected: window.appState?.isConnected || '未知',
        isLoading: window.appState?.isLoading || '未知'
    });
    
    // 查找所有输入框
    const inputs = document.querySelectorAll('input[type="text"], input[type="search"], textarea');
    console.log('找到输入框数量:', inputs.length);
    
    inputs.forEach((input, index) => {
        console.log(`输入框 ${index}:`, {
            placeholder: input.placeholder,
            disabled: input.disabled,
            readonly: input.readOnly,
            style: {
                display: input.style.display,
                visibility: input.style.visibility,
                zIndex: input.style.zIndex
            },
            computed: {
                display: window.getComputedStyle(input).display,
                visibility: window.getComputedStyle(input).visibility,
                zIndex: window.getComputedStyle(input).zIndex,
                pointerEvents: window.getComputedStyle(input).pointerEvents
            }
        });
        
        // 强制启用输入框
        input.disabled = false;
        input.readOnly = false;
        input.style.pointerEvents = 'auto';
        input.style.zIndex = '9999';
        
        // 添加事件监听器
        input.addEventListener('focus', () => {
            console.log('输入框获得焦点:', input.placeholder);
        });
        
        input.addEventListener('input', (e) => {
            console.log('输入内容:', e.target.value);
        });
    });
    
    // 检查是否有覆盖层
    const overlays = document.querySelectorAll('div[style*="fixed"], div[style*="absolute"]');
    console.log('可能的覆盖层数量:', overlays.length);
    
    // 强制移除可能的覆盖层
    overlays.forEach((overlay, index) => {
        const rect = overlay.getBoundingClientRect();
        if (rect.bottom < 100) { // 只检查底部区域
            console.log(`覆盖层 ${index}:`, {
                tagName: overlay.tagName,
                className: overlay.className,
                rect: rect,
                zIndex: window.getComputedStyle(overlay).zIndex
            });
        }
    });
    
    console.log('调试完成！');
})();