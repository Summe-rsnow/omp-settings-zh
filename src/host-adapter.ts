import { VERSION } from "@oh-my-pi/pi-coding-agent";
import * as schemaModule from "@oh-my-pi/pi-coding-agent/config/settings-schema";
import type { HostDerivedDefinition, HostMetadata, HostSettingDefinition } from "./compatibility";

const CANONICAL_SETTING_TABS: readonly string[] = [
  "appearance",
  "model",
  "interaction",
  "context",
  "memory",
  "files",
  "shell",
  "tools",
  "tasks",
  "providers",
];

const CANONICAL_TAB_METADATA: Record<string, { label: string; icon: string }> = {
  appearance: { label: "Appearance", icon: "tab.appearance" },
  model: { label: "Model", icon: "tab.model" },
  interaction: { label: "Interaction", icon: "tab.interaction" },
  context: { label: "Context", icon: "tab.context" },
  memory: { label: "Memory", icon: "tab.memory" },
  files: { label: "Files", icon: "tab.files" },
  shell: { label: "Shell", icon: "tab.shell" },
  tools: { label: "Tools", icon: "tab.tools" },
  tasks: { label: "Tasks", icon: "tab.tasks" },
  providers: { label: "Providers", icon: "tab.providers" },
};

const CANONICAL_TAB_GROUPS: Record<string, readonly string[]> = {
  appearance: ["Theme", "Composer", "Status Line", "Display", "Images"],
  model: ["Thinking", "Sampling", "Prompt", "Retry & Fallback", "Advisor", "Prewalk", "Vision"],
  interaction: [
    "Input",
    "Approvals",
    "Notifications",
    "Speech",
    "Collab",
    "Stream",
    "Magic Keywords",
    "Startup & Updates",
    "Power",
    "Agent",
    "Git",
  ],
  context: ["General", "Compaction", "Rules (TTSR)", "Experimental"],
  memory: ["General", "Auto-Learn", "Mnemopi", "Hindsight", "Sharpshooter"],
  files: ["Editing", "Reading", "Read Summaries", "LSP"],
  shell: ["Bash", "Eval & Runtimes"],
  tools: [
    "Available Tools",
    "Todos",
    "Grep & Browser",
    "Computer",
    "Execution",
    "GitHub",
    "Discovery & MCP",
    "Extensions",
    "Developer",
    "Output Limits",
  ],
  tasks: ["Modes", "Isolation", "Subagents", "Commands & Skills"],
  providers: ["Services", "Protocol", "Fireworks", "Tiny Model", "Timeouts", "Privacy"],
};

function deriveDefinitionsFromSchema(
  schema: Record<string, HostSettingDefinition | undefined>,
): HostDerivedDefinition[] {
  const derived: HostDerivedDefinition[] = [];
  for (const [path, definition] of Object.entries(schema)) {
    if (!definition?.ui) continue;
    if (definition.type !== "number" && definition.type !== "array") {
      // eligible
    } else if (!Array.isArray(definition.ui.options)) {
      continue;
    }
    derived.push({
      path,
      type: definition.type,
      tab: definition.ui.tab,
      ...(definition.ui.group !== undefined ? { group: definition.ui.group } : {}),
      label: definition.ui.label,
      description: definition.ui.description,
      ...(definition.ui.warning ? { warning: definition.ui.warning } : {}),
      ...(Array.isArray(definition.ui.options) ? { options: definition.ui.options } : {}),
    });
  }
  return derived;
}

/**
 * The only boundary that knows OMP's unstable settings metadata exports.
 * Every returned collection is the host-owned live object, not a copy.
 */
export function getHostMetadata(): HostMetadata {
  const rawModule = schemaModule as Record<string, unknown>;
  const schema = rawModule.SETTINGS_SCHEMA as Record<string, HostSettingDefinition | undefined>;
  const tabs = (rawModule.SETTING_TABS as readonly string[] | undefined) ?? CANONICAL_SETTING_TABS;
  const tabMetadata =
    (rawModule.TAB_METADATA as Record<string, { label: string; icon: string }> | undefined) ??
    CANONICAL_TAB_METADATA;
  const tabGroups =
    (rawModule.TAB_GROUPS as Record<string, readonly string[]> | undefined) ??
    CANONICAL_TAB_GROUPS;

  return {
    version: VERSION,
    tabs,
    tabMetadata,
    tabGroups,
    schema,
    derivedDefinitions: deriveDefinitionsFromSchema(schema),
  } as unknown as HostMetadata;
}
