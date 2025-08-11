// Socket连接稳定性验证脚本
(function() {
    'use strict';
    
    console.log('🔍 开始验证Socket连接稳定性...');
    
    // 记录连接事件
    let connectionEvents = [];
    let startTime = Date.now();
    
    // 监听Socket事件
    const originalEmit = window.socket?.emit;
    if (window.socket) {
        window.socket.onAny((event, ...args) => {
            connectionEvents.push({
                time: Date.now() - startTime,
                event: event,
                data: args
            });
            console.log(`📡 Socket事件: ${event}`, args);
        });
    }
    
    // 监控连接状态
    const checkConnection = setInterval(() => {
        const connected = window.socket?.connected || false;
        const id = window.socket?.id || '未连接';
        
        console.log(`⏱️ ${Date.now() - startTime}ms - 连接状态: ${connected ? '✅已连接' : '❌未连接'} (${id})`);
        
        // 显示连接统计
        const connects = connectionEvents.filter(e => e.event === 'connect').length;
        const disconnects = connectionEvents.filter(e => e.event === 'disconnect').length;
        
        console.log(`📊 连接统计: 连接${connects}次, 断开${disconnects}次`);
        
        // 如果连接稳定，停止监控
        if (connected && connects === 1 && Date.now() - startTime > 10000) {
            console.log('🎉 Socket连接已稳定！修复成功');
            clearInterval(checkConnection);
        }
        
        // 如果频繁重连，发出警告
        if (connects > 3 || disconnects > 3) {
            console.warn('⚠️ 检测到频繁重连，可能需要进一步调试');
        }
    }, 2000);
    
    // 5分钟后自动停止监控
    setTimeout(() => {
        clearInterval(checkConnection);
        console.log('📋 最终连接统计:', {
            总连接次数: connectionEvents.filter(e => e.event === 'connect').length,
            总断开次数: connectionEvents.filter(e => e.event === 'disconnect').length,
            事件总数: connectionEvents.length,
            运行时间: Date.now() - startTime + 'ms'
        });
    }, 300000);
    
    // 提供手动检查函数
    window.socketDiagnostics = {
        getEvents: () => connectionEvents,
        isStable: () => {
            const connects = connectionEvents.filter(e => e.event === 'connect').length;
            return connects === 1 && window.socket?.connected;
        },
        forceReconnect: () => {
            if (window.socket) {
                window.socket.disconnect();
                setTimeout(() => window.socket.connect(), 1000);
            }
        }
    };
    
    console.log('✅ 验证脚本已启动');
    console.log('使用方法:');
    console.log('- socketDiagnostics.getEvents() - 查看所有事件');
    console.log('- socketDiagnostics.isStable() - 检查连接是否稳定');
    console.log('- socketDiagnostics.forceReconnect() - 强制重连');
})();