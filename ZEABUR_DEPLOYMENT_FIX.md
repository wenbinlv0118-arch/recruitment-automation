# Zeabur生产环境D-Bus错误修复指南

## 立即执行步骤

1. 缺失环境变量: DISABLE_DEV_SHM_USAGE, NO_SANDBOX, DISABLE_GPU, ENABLE_LOG_FILTER: 立即在Zeabur控制台添加这些环境变量

## 验证步骤
1. 重新部署后检查日志
2. 确认D-Bus错误不再出现
3. 验证服务正常运行

## 紧急联系
如果问题仍然存在，请提供完整的部署日志进行进一步分析。
