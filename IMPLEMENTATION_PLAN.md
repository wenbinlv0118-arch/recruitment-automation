## 阶段 1: 右键复制逻辑优化（Boss直聘）
**目标**: 拖选完成后右键坐标强制夹紧在 iframe 范围内，确保复制按钮出现。
**成功标准**: 在含 `canvas#resume` 的 iframe 内，右键菜单稳定出现，复制成功率提升；相关函数含中文级别注释。
**测试**: 运行页面自动化用例，验证 `performRightClickCopy` 在提供 `iframeBounds` 时能将坐标夹紧到 iframe 内部并完成复制。
**状态**: 完成

## 阶段 2: 更新 macOS DMG 安装包
**目标**: 构建包含上述优化后的应用安装包（DMG）。
**成功标准**: 在 `dist/` 目录生成 `Recruitment Automation-<version>-arm64.dmg`，可安装运行。
**测试**: 执行 `npm run build:renderer && npm run dist:mac`，检查 `dist/` 产物及日志无致命错误。
**状态**: 完成