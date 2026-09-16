import { describe, expect, test } from "bun:test";
import { VERSION } from "@oh-my-pi/pi-coding-agent";
import {
  SETTINGS_SCHEMA,
  SETTING_TABS,
  TAB_GROUPS,
  TAB_METADATA,
} from "@oh-my-pi/pi-coding-agent/config/settings-schema";
import { getAllSettingDefs } from "@oh-my-pi/pi-coding-agent/modes/components/settings-defs";

describe("OMP 18 host contract", () => {
  test("required exports resolve with the expected top-level structure", () => {
    expect(VERSION).toBe("18.2.1");
    expect(SETTING_TABS.length).toBeGreaterThan(0);
    expect(Object.keys(SETTINGS_SCHEMA).length).toBeGreaterThan(0);

    for (const tab of SETTING_TABS) {
      expect(TAB_METADATA[tab]).toEqual({
        label: expect.any(String),
        icon: expect.stringMatching(/^tab\./),
      });
      expect(Array.isArray(TAB_GROUPS[tab])).toBeTrue();
    }
  });

  test("derived definitions match every settings-panel-eligible schema path", () => {
    const panelPaths = Object.entries(SETTINGS_SCHEMA)
      .filter(([, definition]) => {
        if (!("ui" in definition)) return false;
        if (definition.type !== "number" && definition.type !== "array") return true;
        return "options" in definition.ui;
      })
      .map(([path]) => path)
      .sort();
    const derivedPaths = getAllSettingDefs()
      .map((definition) => String(definition.path))
      .sort();

    expect(derivedPaths).toEqual(panelPaths);
  });

  test("metadata targets are mutable in the supported host", () => {
    const firstTab = SETTING_TABS[0];
    const firstUiDefinition = Object.values(SETTINGS_SCHEMA).find(
      (definition) => "ui" in definition,
    );

    expect(firstTab).toBeDefined();
    expect(firstUiDefinition).toBeDefined();
    expect(Object.isFrozen(TAB_METADATA)).toBeFalse();
    expect(Object.isFrozen(TAB_METADATA[firstTab!])).toBeFalse();
    expect(Object.isFrozen(TAB_GROUPS)).toBeFalse();
    expect(Object.isFrozen(firstUiDefinition!.ui)).toBeFalse();
  });
});
