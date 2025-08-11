// Socket连接死循环诊断脚本
(function() {
    'use strict';
    
    // 记录连接事件
    const connectionLog = [];
    let disconnectCount = 0;
    let connectCount = 0;
    
    // 重写console.log来捕获Socket相关日志
    const originalLog = console.log;
    console.log = function(...args) {
        const message = args.join(' ');
        if (message.includes('Socket.IO')) {
            connectionLog.push({
                timestamp: new Date().toISOString(),
                type: 'log',
                message: message
            });
            
            if (message.includes('连接成功')) connectCount++;
            if (message.includes('连接断开')) disconnectCount++;
        }
        originalLog.apply(console, args);
    };
    
    // 监听Socket事件
    const checkSocketEvents = setInterval(() => {
        console.log('🔍 Socket诊断报告:');
        console.log(`连接次数: ${connectCount}`);
        console.log(`断开次数: ${disconnectCount}`);
        console.log(`时间: ${new Date().toLocaleTimeString()}`);
        
        if (disconnectCount > 5) {
            console.warn('⚠️ 检测到频繁重连！');
            console.table(connectionLog.slice(-5));
        }
    }, 5000);
    
    // 监听网络状态
    const checkNetwork = () => {
        console.log('🌐 网络状态检查:');
        console.log(`online: ${navigator.onLine}`);
        console.log(`connection: ${navigator.connection?.effectiveType || 'unknown'}`);
    };
    
    // 每10秒检查一次网络
    setInterval(checkNetwork, 10000);
    
    // 捕获页面可见性变化
    document.addEventListener('visibilitychange', () => {
        console.log(`📱 页面可见性: ${document.visibilityState}`);
    });
    
    // 捕获窗口焦点变化
    window.addEventListener('focus', () => {
        console.log('🎯 窗口获得焦点');
    });
    
    window.addEventListener('blur', () => {
        console.log('😴 窗口失去焦点');
    });
    
    // 暴露诊断函数
    window.socketDiagnostics = {
        getLog: () => connectionLog,
        getStats: () => ({ connectCount, disconnectCount }),
        clearLog: () => { connectionLog.length = 0; connectCount = 0; disconnectCount = 0; }
    };
    
    console.log('🔧 Socket诊断脚本已启动');
    console.log('使用 socketDiagnostics.getLog() 查看详细日志');
    console.log('使用 socketDiagnostics.clearLog() 清空日志');
})();