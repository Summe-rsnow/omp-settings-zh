export interface HostOption {
  value: string;
  label: string;
  description?: string;
}

export interface HostUiMetadata {
  tab: string;
  group?: string;
  label: string;
  description: string;
  warning?: string;
  options?: HostOption[] | "runtime";
}

export interface HostSettingDefinition {
  type: string;
  default: unknown;
  values?: readonly string[];
  ui?: HostUiMetadata;
  [key: string]: unknown;
}

export interface HostDerivedDefinition {
  path: string;
  type: string;
  tab: string;
  group?: string;
  label: string;
  description: string;
  warning?: string;
  options?: HostOption[];
  [key: string]: unknown;
}

export interface HostMetadata {
  version: string;
  tabs: readonly string[];
  tabMetadata: Record<string, { label: string; icon: string } | undefined>;
  tabGroups: Record<string, readonly string[] | undefined>;
  schema: Record<string, HostSettingDefinition | undefined>;
  derivedDefinitions: HostDerivedDefinition[];
}

export type CompatibilityResult =
  | { compatible: true }
  | { compatible: false; reason: string };


function isPanelEligible(definition: HostSettingDefinition): boolean {
  if (!definition.ui) return false;
  if (definition.type !== "number" && definition.type !== "array") return true;
  return Array.isArray(definition.ui.options);
}

export function checkHostCompatibility(host: HostMetadata): CompatibilityResult {
  const majorVersion = Number.parseInt(host.version.split(".", 1)[0] ?? "", 10);
  if (majorVersion !== 18) {
    return { compatible: false, reason: `不支持 OMP ${host.version}；当前仅验证 OMP 18.x` };
  }

  if (!Array.isArray(host.tabs) || host.tabs.length === 0) {
    return { compatible: false, reason: "SETTING_TABS 不是非空数组" };
  }
  if (
    typeof host.tabMetadata !== "object" ||
    host.tabMetadata === null ||
    Array.isArray(host.tabMetadata) ||
    typeof host.tabGroups !== "object" ||
    host.tabGroups === null ||
    Array.isArray(host.tabGroups) ||
    typeof host.schema !== "object" ||
    host.schema === null ||
    Array.isArray(host.schema)
  ) {
    return { compatible: false, reason: "设置 Schema、页签元数据或分组表结构无效" };
  }
  if (!Array.isArray(host.derivedDefinitions)) {
    return { compatible: false, reason: "派生设置定义不是数组" };
  }

  for (const tab of host.tabs) {
    if (typeof tab !== "string") return { compatible: false, reason: "SETTING_TABS 包含非字符串 ID" };
    const metadata = host.tabMetadata[tab];
    const groups = host.tabGroups[tab];
    if (
      typeof metadata !== "object" ||
      metadata === null ||
      Array.isArray(metadata) ||
      typeof metadata.label !== "string" ||
      typeof metadata.icon !== "string"
    ) {
      return { compatible: false, reason: `页签 ${tab} 的元数据结构无效` };
    }
    if (!Array.isArray(groups) || !groups.every((group) => typeof group === "string")) {
      return { compatible: false, reason: `页签 ${tab} 的分组结构无效` };
    }
  }

  const derivedByPath = new Map<string, HostDerivedDefinition>();
  for (const definition of host.derivedDefinitions) {
    if (typeof definition !== "object" || definition === null || Array.isArray(definition) || typeof definition.path !== "string") {
      return { compatible: false, reason: "派生设置定义结构无效" };
    }
    if (derivedByPath.has(definition.path)) {
      return { compatible: false, reason: `派生设置路径重复：${definition.path}` };
    }
    derivedByPath.set(definition.path, definition);
  }

  for (const [path, definition] of Object.entries(host.schema)) {
    if (
      typeof definition !== "object" ||
      definition === null ||
      Array.isArray(definition) ||
      typeof definition.type !== "string" ||
      !("default" in definition)
    ) {
      return { compatible: false, reason: `设置 ${path} 的 Schema 结构无效` };
    }
    if (!definition.ui) continue;

    const ui = definition.ui;
    if (
      typeof ui !== "object" ||
      ui === null ||
      Array.isArray(ui) ||
      typeof ui.tab !== "string" ||
      typeof ui.label !== "string" ||
      typeof ui.description !== "string"
    ) {
      return { compatible: false, reason: `设置 ${path} 的 UI 元数据结构无效` };
    }
    if (!host.tabs.includes(ui.tab)) return { compatible: false, reason: `设置 ${path} 引用了未知页签 ${ui.tab}` };
    if (ui.group !== undefined && typeof ui.group !== "string") {
      return { compatible: false, reason: `设置 ${path} 的分组不是字符串` };
    }
    if (ui.options !== undefined && ui.options !== "runtime") {
      if (
        !Array.isArray(ui.options) ||
        !ui.options.every(
          (option) =>
            typeof option === "object" &&
            option !== null &&
            !Array.isArray(option) &&
            typeof option.value === "string" &&
            typeof option.label === "string" &&
            (option.description === undefined || typeof option.description === "string"),
        )
      ) {
        return { compatible: false, reason: `设置 ${path} 的选项结构无效` };
      }
    }

    if (!isPanelEligible(definition)) continue;
    const derived = derivedByPath.get(path);
    if (!derived) return { compatible: false, reason: `设置 ${path} 缺少派生定义` };
    if (
      typeof derived.label !== "string" ||
      typeof derived.description !== "string" ||
      derived.tab !== ui.tab ||
      derived.group !== ui.group
    ) {
      return { compatible: false, reason: `设置 ${path} 的派生定义与 Schema 不一致` };
    }
    if (Array.isArray(ui.options)) {
      const schemaValues = ui.options.map((option) => option.value);
      const derivedValues = derived.options?.map((option) => option.value) ?? [];
      if (schemaValues.length !== derivedValues.length || schemaValues.some((value, index) => value !== derivedValues[index])) {
        return { compatible: false, reason: `设置 ${path} 的派生选项与 Schema 不一致` };
      }
    }
  }

  return { compatible: true };
}
