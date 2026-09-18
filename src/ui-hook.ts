import { TabBar } from "@oh-my-pi/pi-tui";
import { SettingsSelectorComponent } from "@oh-my-pi/pi-coding-agent";

interface TabItem {
  id: string;
  label: string;
  short?: string;
  muted?: boolean;
}

interface TabBarDebugState {
  label?: string;
  tabs?: TabItem[];
  activeIndex?: number;
  activeTabId?: string | null;
  activeTabLabel?: string | null;
}

interface TabBarInstance {
  debugState?(): TabBarDebugState;
  setTabs(tabs: TabItem[]): void;
}

const TAB_NAME_MAP: Record<string, string> = {
  appearance: "外观",
  model: "模型",
  interaction: "交互",
  context: "上下文",
  memory: "记忆",
  files: "文件",
  shell: "Shell",
  tools: "工具",
  tasks: "任务",
  providers: "提供商",
  plugins: "插件",
};

let hooked = false;

export function hookSettingsUI(): void {
  if (hooked) return;
  hooked = true;

  // 1. Hook TabBar to translate settings tab labels (Appearance -> 外观, Model -> 模型, etc.)
  const tabBarProto = TabBar?.prototype as unknown as {
    render?(this: TabBarInstance, width: number): string[];
  };

  if (typeof tabBarProto?.render === "function") {
    const originalTabBarRender = tabBarProto.render;
    tabBarProto.render = function (this: TabBarInstance, width: number): string[] {
      const debug = this.debugState?.();
      if (
        debug &&
        Array.isArray(debug.tabs) &&
        debug.tabs.some((t) => t.id === "appearance" && /[A-Za-z]/.test(t.label))
      ) {
        const translatedTabs = debug.tabs.map((t) => {
          const zh = TAB_NAME_MAP[t.id];
          if (!zh) return t;
          const label = t.label.replace(/[A-Za-z]+$/, zh);
          return { ...t, label };
        });
        this.setTabs(translatedTabs);
      }
      return originalTabBarRender.call(this, width);
    };
  }

  // 2. Hook SettingsSelectorComponent to translate "Settings" header and bottom hint lines
  const settingsProto = SettingsSelectorComponent?.prototype as unknown as {
    render?(this: unknown, width: number): string[];
  };

  if (typeof settingsProto?.render === "function") {
    const originalSettingsRender = settingsProto.render;
    settingsProto.render = function (this: unknown, width: number): string[] {
      const lines = originalSettingsRender.call(this, width);
      if (Array.isArray(lines) && lines.length > 0) {
        // Translate "Settings" title in the top border
        if (typeof lines[0] === "string" && lines[0].includes("Settings")) {
          lines[0] = lines[0].replace("Settings", "设置────");
        }

        // Translate bottom navigation hints
        for (let i = Math.max(0, lines.length - 4); i < lines.length; i++) {
          const currentLine = lines[i];
          if (typeof currentLine !== "string") continue;
          let text: string = currentLine;
          if (
            text.includes("Enter/Space to change") ||
            text.includes("Tab to switch tabs") ||
            text.includes("to jump sections") ||
            text.includes("Enter to change")
          ) {
            text = text
              .replace("Enter/Space to change", "回车/空格修改")
              .replace("Enter to change", "回车修改")
              .replace("Tab to jump sections", "Tab 跳转分组")
              .replace("Tab/Enter to settings", "Tab/回车进入设置")
              .replace("↑/↓ to jump sections", "↑/↓ 跳转分组")
              .replace("←/→ to switch tabs", "←/→ 切换页签")
              .replace("Tab to switch tabs", "Tab 切换页签")
              .replace("Tab to jump tabs", "Tab 切换页签")
              .replace("Type to search", "输入以搜索")
              .replace("Esc to exit search", "Esc 退出搜索")
              .replace("Esc to close", "Esc 关闭");
            lines[i] = text;
          }
        }
      }
      return lines;
    };
  }
}
