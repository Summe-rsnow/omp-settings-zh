# omp-settings-zh

让官方 [Oh My Pi（OMP）](https://github.com/can1357/oh-my-pi) 的原生 `/settings` 面板显示简体中文。无需中文分支，不替换官方二进制，不改变设置行为。

- 当前版本：`0.1.0`
- 已验证宿主：OMP `18.2.6`
- 运行时：离线，无网络请求和遥测
- 翻译来源：依据 OMP 18.2.6 官方英文 `SETTINGS_SCHEMA`，由本项目独立生成、精校与复核

## 设计边界

插件只在 Extension 初始化阶段覆盖官方设置显示元数据：页签、分组、设置名称、说明、风险警告和静态选项文案。内置 `/settings` 命令、`SettingsSelectorComponent`、设置路径、类型、默认值、当前值、选项 `value`、条件显示和保存逻辑均由官方 OMP 继续负责。

采用克制翻译：普通界面词、行为说明和风险信息使用中文；Advisor、Prewalk、Mnemopi、Snapcompact、MCP、LSP、API、URL、工具名、模型名和提供商名等保留更清楚的英文形式。

插件不会：

- 汉化 OMP 其他 TUI、CLI 帮助、提示词或错误消息；
- 注册或覆盖 `/settings`；
- 读取当前配置值或凭据；
- 写入 `config.yml`；
- 在线翻译、调用 LLM 或发送遥测；
- 打包或修改 OMP 二进制。

## 安装

要求官方 OMP `>=18.0.4 <19`：

```sh
omp plugin install github:rockythink/omp-settings-zh
```

重新启动 OMP，然后照常输入：

```text
/settings
```

插件正常应用时保持安静。关键内部接口不兼容或应用失败时，插件会失败关闭：保留完整官方英文界面，并显示一次兼容性警告。

## 管理

```sh
# 查看插件
omp plugin list --json

# 诊断
omp plugin doctor omp-settings-zh --json

# 禁用、重新启用
omp plugin disable omp-settings-zh
omp plugin enable omp-settings-zh

# 卸载
omp plugin uninstall omp-settings-zh
```

禁用或卸载后，下一次启动恢复官方英文设置；用户配置无需迁移。

## 开发与验证

```sh
bun install
bun run check
omp plugin link . --scope project
```

检查契约：

- `bun test`：单元测试和 OMP 18.2.6 宿主契约测试；
- `bun run typecheck`：TypeScript 类型检查；
- `bun run coverage:check`：P0 翻译完整性；
- `bun run drift:check`：路径、选项值和英文原文哈希漂移；
- `bun run smoke`：真实宿主元数据初始化、行为元数据不变和零网络请求冒烟检查；
- `bun run check`：执行以上全部自动检查。

影响设置面板的改动还必须在真实 OMP 中打开 `/settings`，验证中文搜索、设置编辑、禁用后的英文回退。自动检查不能代替真实 TUI 验证。

## 翻译贡献

翻译必须绑定稳定标识：页签 ID、`tab id + upstream group`、完整 setting path，以及 `setting path + option value`。禁止按英文字符串全局替换。

详见：

- [项目上下文](CONTEXT.md)
- [产品需求](docs/PRD.md)
- [技术设计](docs/TECHNICAL-DESIGN.md)
- [翻译规范](docs/TRANSLATION-GUIDE.md)
- [贡献指南](CONTRIBUTING.md)
- [第三方声明](THIRD_PARTY_NOTICES.md)

## 与上游的关系

本项目不是 Oh My Pi 官方项目。OMP 名称、源码和产品归其原作者及贡献者所有。本项目仅提供独立的简体中文设置显示元数据扩展。

## License

[MIT](LICENSE)
