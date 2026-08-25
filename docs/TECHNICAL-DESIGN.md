# omp-settings-zh 技术设计

- 状态：实现前设计
- 目标基线：OMP 18.0.4
- 核心约束：不分叉、不重写设置面板、不修改配置语义

## 1. 结论

实现一个 OMP Extension，在扩展工厂初始化阶段为官方设置 Schema 的 UI 元数据应用简体中文覆盖，然后继续使用内置 `/settings` 和 `SettingsSelectorComponent`。

不创建第二套设置编辑器。插件只维护翻译数据、适配层和兼容检查。

## 2. 已核验的上游事实

OMP 18.0.4 当前实现具备以下条件：

1. 设置由 `packages/coding-agent/src/config/settings-schema.ts` 中的 `SETTINGS_SCHEMA` 统一定义。
2. 设置 UI 元数据包含 `label`、`description`、`warning`、`group` 和静态 `options`。
3. 页签和分组分别由 `TAB_METADATA`、`TAB_GROUPS` 定义。
4. `/settings` 调用官方 `showSettingsSelector()`，最终构造 `SettingsSelectorComponent`。
5. 设置面板通过 `getAllSettingDefs()` 延迟生成派生定义并在进程内缓存；带 UI 元数据但未声明有限选项的 `number` 和 `array` 设置会被刻意排除，只能通过配置文件编辑。
6. 当前 Schema、页签和分组对象未冻结。
7. Extension 在运行时支持从宿主包导入公开子路径；插件清单可通过 `package.json#omp.extensions` 声明入口。
8. 扩展命令不能覆盖内置 `/settings`，这也符合本项目不替换命令的边界。

这些是当前版本事实，不视为永久稳定 API。适配层必须隔离这一风险。

## 3. 方案比较

### 3.1 完整 OMP 中文分支

拒绝。它复制全部功能代码、构建链和发布责任，安全与功能更新依赖人工同步。

### 3.2 自建 `/settings-zh` 面板

拒绝。必须复制布尔、枚举、数字、文本、多选、凭据、条件显示、主题预览和插件管理逻辑，必然与上游分叉。

### 3.3 修改官方源码或二进制

拒绝。升级会覆盖补丁，也无法通过 OMP 原生插件管理安装和卸载。

### 3.4 运行时元数据覆盖

采用。保留官方行为，只改变显示文案；兼容失败时可完整退回英文。

## 4. 计划包结构

```text
omp-settings-zh/
├── package.json
├── src/
│   ├── index.ts                 # Extension 入口
│   ├── apply-translations.ts    # 原子预检、应用和回滚
│   ├── compatibility.ts         # OMP 版本与结构检查
│   ├── host-adapter.ts          # 唯一允许接触 OMP 内部元数据的模块
│   ├── report.ts                # 覆盖率和漂移报告
│   └── translations/
│       └── zh-CN.ts             # 简体中文翻译数据
├── scripts/
│   ├── check-coverage.ts        # 开发期覆盖检查
│   └── diff-upstream.ts         # 上游 Schema 漂移检查
├── test/
│   ├── apply-translations.test.ts
│   ├── compatibility.test.ts
│   ├── coverage.test.ts
│   └── fixtures/
└── docs/
```

业务逻辑不得散落到翻译文件；OMP 内部导入不得散落到 `host-adapter.ts` 之外。

## 5. 插件清单

计划使用普通 npm/Git 包，并声明 OMP 扩展入口：

```json
{
  "name": "omp-settings-zh",
  "version": "0.1.0",
  "type": "module",
  "license": "MIT",
  "omp": {
    "extensions": ["./src/index.ts"]
  },
  "peerDependencies": {
    "@oh-my-pi/pi-coding-agent": ">=18.0.4 <19"
  }
}
```

开发依赖用于类型检查和测试；运行时必须使用 OMP 宿主提供的模块实例，不得把另一份 coding-agent 打进插件。

## 6. 宿主适配层

`host-adapter.ts` 计划集中导入：

- `VERSION`；
- `SETTINGS_SCHEMA`；
- `SETTING_TABS`；
- `TAB_METADATA`；
- `TAB_GROUPS`；
- `getAllSettingDefs()`。

来源分别是 OMP 包根导出、`config/settings-schema` 和 `modes/components/settings-defs` 子路径。

适配层向内部仅暴露本项目定义的窄接口：

- 当前 OMP 版本；
- 可遍历的页签、分组、设置和选项引用；
- 当前派生设置定义；
- 元数据快照、应用与恢复操作。

上游路径或结构变化时，只修改适配层。

## 7. 翻译数据模型

翻译必须按稳定标识关联：

- 页签：按 `SettingTab` ID；
- 分组：按“页签 ID + 官方英文分组名”；
- 设置：按完整 `SettingPath`；
- 选项：按设置路径和原始 `value`。

建议逻辑结构：

```ts
interface LocalePack {
  locale: "zh-CN";
  sourceOmpVersion: string;
  tabs: Record<string, string>;
  groups: Record<string, Record<string, string>>;
  settings: Record<string, {
    label: string;
    description: string;
    warning?: string;
    options?: Record<string, {
      label: string;
      description?: string;
    }>;
  }>;
}
```

不得按数组下标或英文文案全局替换。相同英文词在不同语境中可能需要不同译法。

## 8. 初始化时序

1. OMP 发现并导入插件入口。
2. Extension 工厂同步执行兼容性预检。
3. 适配层读取当前 Schema 和派生定义结构。
4. 构建完整 Mutation Plan，但不修改宿主对象。
5. 校验所有目标路径、选项值、属性描述符和翻译数据。
6. 保存即将修改字段的原值快照。
7. 一次性应用：页签 → 分组 → Schema UI → 派生 SettingDef。
8. 重新读取关键样本，验证应用结果。
9. 成功则结束初始化；失败则按快照逆序恢复全部字段。
10. 仅在失败或版本不兼容时，于 `session_start` 发出一次通知。

初始化后不得在渲染路径中继续查表。

## 9. 派生定义缓存处理

`getAllSettingDefs()` 首次调用后会缓存由 Schema 生成的 `SettingDef[]`。为避免扩展加载顺序导致缓存中仍为英文：

1. 先修改 Schema UI 元数据；
2. 调用 `getAllSettingDefs()`，确保缓存已建立；
3. 无论缓存是新建还是既存，都对派生 `SettingDef` 应用同一翻译；
4. 仅要求设置面板实际支持的 Schema 路径与派生定义按路径、选项值和分组一致；被上游刻意排除的无有限选项 `number`、`array` 设置仍可翻译 Schema 元数据，但不得视为派生定义缺失。

这样即使其他扩展提前触发了缓存，内置设置面板仍会读取翻译后的派生定义。

## 10. 原子性和回滚

### 10.1 预检

任何写入前必须完成全部校验。以下情况视为关键不兼容：

- 必需导出不存在；
- Schema 不是预期的对象结构；
- 页签列表、元数据或分组表结构错误；
- 核心属性不可写或对象已冻结；
- 设置面板支持的 Schema 路径无法与派生定义匹配。

### 10.2 回滚

应用过程中如果发生异常：

- 恢复所有已写字段；
- 恢复被替换的分组数组引用；
- 不保留部分翻译；
- 将错误压缩为用户可操作的兼容提示；
- 详细堆栈只写入 OMP logger，不包含配置值。

### 10.3 幂等

每次赋值均以原始标识定位并设置最终中文文本。不得基于当前文本拼接、替换或追加。重复执行结果必须完全一致。

## 11. 兼容策略

### 11.1 版本层

- `0.1.0` 明确验证 OMP 18.0.4。
- 同主版本的新版本允许尝试结构预检，不因精确版本不等直接拒绝。
- 主版本变化默认失败关闭，直到 CI 和真实 TUI 验证通过。

### 11.2 结构层

版本号只是提示，最终以运行时结构预检为准。补丁或次版本可能改变内部结构；相反，未来版本也可能保持兼容。

### 11.3 数据层

- 上游新增路径：英文回退，报告为未翻译；
- 上游删除路径：忽略该翻译，开发检查报 stale；
- 选项新增：新增项英文回退；
- 选项删除或改值：不按标签猜测，开发检查报 mismatch；
- 分组移动：以当前页签和官方分组为准重新匹配。

## 12. 运行时行为

正常兼容且成功应用时保持安静，不在每次启动弹通知。

只在以下情况通知：

- 宿主版本主版本不受支持；
- 关键结构不兼容；
- 翻译应用失败并已回滚。

普通缺失翻译只进入开发期覆盖报告，不打扰最终用户。

## 13. 安全与隐私

- 不读取 `settings.get()`，只读取 Schema 元数据；
- 不接触当前配置值和凭据；
- 不写入 `config.yml`；
- 不访问网络；
- 不执行用户输入；
- 不注册工具、模型提供商或命令；
- 日志只包含版本、设置路径和结构错误，不包含设置值。

## 14. 测试策略

### 14.1 单元测试

覆盖：

- 完整翻译；
- 英文回退；
- 页签和分组同步；
- 选项按 value 匹配；
- 未知路径与 stale 路径报告；
- 重复应用幂等；
- 预检失败零写入；
- 中途异常完整回滚；
- 冻结对象失败关闭；
- 敏感元数据不读取当前值。

### 14.2 契约测试

针对安装的目标 OMP 包验证：

- 所需子路径可导入；
- 导出结构符合适配器预期；
- 当前 UI 设置路径和翻译覆盖率；
- 派生定义与 Schema 一一匹配；
- 插件不覆盖内置 `settings` 命令。

### 14.3 真实 OMP 冒烟测试

必须实际执行：

1. `omp plugin link` 安装本地插件；
2. 启动交互式 OMP；
3. 输入 `/settings`；
4. 验证中文页签、分组、设置、说明和选项；
5. 修改各类设置并确认保存；
6. 禁用插件并重新启动；
7. 确认恢复官方英文，配置值未变化。

TUI 验证结果应记录目标 OMP 版本和终端环境。

## 15. 发布流程

每次支持新的 OMP 版本：

1. 更新开发依赖到目标版本；
2. 运行上游差异和覆盖检查；
3. 补充或确认翻译；
4. 运行单元与契约测试；
5. 对真实 `/settings` 完成冒烟验证；
6. 更新兼容矩阵和第三方声明；
7. 发布语义化版本和 GitHub Release。

翻译补充属于补丁版本；新增能力或适配策略变化属于次版本；翻译数据格式或公开安装契约破坏属于主版本。

## 16. 长期演进

应向 OMP 上游提议稳定接口，例如：

```ts
pi.registerSettingsLocale("zh-CN", localePack)
```

理想上游接口负责：

- locale 选择和英文回退；
- Schema 与硬编码设置控件文案翻译；
- 缓存失效；
- 翻译包结构验证；
- 插件卸载后的恢复。

上游接口可用后，本项目必须迁移并删除内部对象修改，而不是长期维护两条实现路径。
