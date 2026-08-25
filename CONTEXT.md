# Project Context

## 项目一句话

`omp-settings-zh` 是官方 OMP 的简体中文设置文案扩展：只改变 `/settings` 的显示元数据，不分叉 OMP，不改变设置行为。

## 当前阶段

- 已完成需求和技术设计。
- 尚未创建插件入口、翻译数据和测试。
- 尚未初始化 Git 仓库或创建 GitHub 仓库。
- 当前目标基线为 OMP 18.0.4。

## 核心问题

中文用户需要理解大量英文设置说明；完整汉化分支又会滞后于 OMP 官方功能和安全更新。项目要在“中文可读”与“跟随官方”之间建立低耦合方案。

## 已决策

1. 继续使用官方 OMP 二进制。
2. 使用 OMP Extension 实现，发布形态为可安装 Plugin。
3. 不注册或覆盖 `/settings` 命令。
4. 不复制 `SettingsSelectorComponent`。
5. 在扩展初始化阶段覆盖官方设置 UI 元数据。
6. 翻译只按页签 ID、设置路径和选项 value 匹配。
7. 新增或未翻译设置自动回退英文。
8. 关键兼容失败时整体不应用翻译。
9. 运行时不联网、不读取设置值、不写配置文件。
10. 先通过 GitHub 仓库安装，首版不要求发布 npm 包。
11. 长期目标是推动 OMP 上游提供正式设置 Locale API。

## 领域词汇

- **宿主（Host）**：用户实际运行的官方 OMP。
- **Extension**：在 OMP 进程中执行的运行时扩展工厂。
- **Plugin**：通过 OMP 插件管理器安装、启用和卸载的包；包含 Extension 入口。
- **设置 Schema**：`SETTINGS_SCHEMA`，设置类型、默认值和 UI 元数据的单一来源。
- **显示元数据**：`label`、`description`、`warning`、`group` 和选项显示文案。
- **派生定义**：由 Schema 延迟生成并缓存、供设置面板渲染的 `SettingDef[]`。
- **Locale Pack**：按稳定标识组织的完整简体中文翻译数据。
- **英文回退**：没有安全匹配的翻译时保留宿主原始文案。
- **漂移（Drift）**：上游新增、删除、移动设置，或修改选项值和英文语义。
- **失败关闭（Fail closed）**：插件停止应用翻译并保留官方英文，而不是冒险部分修改宿主结构。

## 不变量

实现和评审必须持续维护：

- 启用前后设置路径集合相同；
- 启用前后设置类型、默认值、当前值和选项 value 相同；
- 启用前后条件显示和保存逻辑相同；
- 翻译不触碰凭据和用户配置值；
- 任意失败不会阻止 OMP 启动；
- 卸载后无需迁移或清理用户配置；
- 运行时无网络和遥测；
- OMP 内部接口只存在于一个适配模块；
- 新上游设置不会因缺少翻译而消失。

## 上游事实依据

基于 OMP v18.0.4 核验：

- 设置单一来源：`packages/coding-agent/src/config/settings-schema.ts`
- 派生设置定义：`packages/coding-agent/src/modes/components/settings-defs.ts`
- 设置面板：`packages/coding-agent/src/modes/components/settings-selector.ts`
- `/settings` 注册：`packages/coding-agent/src/slash-commands/builtin-modes.ts`
- Extension API：`docs/extensions.md`
- Extension 加载：`docs/extension-loading.md`
- Plugin 安装：`docs/plugin-manager-installer-plumbing.md`

官方仓库：https://github.com/can1357/oh-my-pi

重要实现事实：

- `SETTINGS_SCHEMA`、`TAB_METADATA` 和 `TAB_GROUPS` 当前未冻结；
- `getAllSettingDefs()` 延迟构建并缓存派生定义；
- Extension 命令与内置命令冲突时会被跳过；
- Plugin 通过 `package.json#omp.extensions` 声明入口；
- Git 安装支持 `github:user/repo` 形式。

这些属于当前版本实现事实，不是假定的稳定 API。兼容预检和适配层不可省略。

## 翻译来源策略

- 译文只以 OMP 18.0.4 官方 `SETTINGS_SCHEMA` 英文显示元数据为语义来源；
- 使用本项目自己的 LLM 能力生成初稿，再按路径、选项 `value`、英文原文哈希和术语规范复核；
- 不复制或改写第三方中文分支译文；
- 采用克制翻译：优先翻译行为、条件、风险和普通界面词，产品名、工具名、协议、缩写及更清楚的英文技术名称保留原文；
- 不复制 OMP 功能代码、提示词、构建产物或二进制。

## 实现启动顺序

下一次开始编码时按顺序执行：

1. 初始化 Git 仓库和最小 TypeScript/Bun 包；
2. 写宿主契约测试，先证明目标导出可解析；
3. 定义 Locale Pack 类型和最小两项翻译夹具；
4. 用测试驱动实现预检、Mutation Plan、应用和回滚；
5. 接入真实宿主适配层；
6. 提取并复核完整翻译；
7. 实现覆盖和漂移检查；
8. 本地 `omp plugin link`；
9. 打开真实 `/settings` 验证；
10. 完成开源发布文件、CI 和 GitHub 仓库。

不要从批量翻译开始。先证明适配和回滚机制正确，避免在错误架构上积累大量文案。

## 文档优先级

发生冲突时：

1. `docs/PRD.md` 定义用户行为和验收；
2. `docs/TECHNICAL-DESIGN.md` 定义实现边界；
3. `docs/TRANSLATION-GUIDE.md` 定义翻译质量；
4. `docs/OPEN-SOURCE-RELEASE.md` 定义公开发布门禁；
5. `CONTRIBUTING.md` 定义贡献流程。

上游真实行为与本文档冲突时，以当前官方源码为事实，并在编码前更新相关文档。
