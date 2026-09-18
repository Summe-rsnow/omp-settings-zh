import { describe, expect, test } from "bun:test";
import { getHostMetadata } from "../src/host-adapter";

describe("OMP 18 host contract", () => {
  test("required exports resolve with the expected top-level structure", () => {
    const host = getHostMetadata();
    expect(host.version).toBe("18.2.6");
    expect(host.tabs.length).toBeGreaterThan(0);
    expect(Object.keys(host.schema).length).toBeGreaterThan(0);

    for (const tab of host.tabs) {
      expect(host.tabMetadata[tab]).toEqual({
        label: expect.any(String),
        icon: expect.stringMatching(/^tab\./),
      });
      expect(Array.isArray(host.tabGroups[tab])).toBeTrue();
    }
  });

  test("derived definitions match every settings-panel-eligible schema path", () => {
    const host = getHostMetadata();
    const panelPaths = Object.entries(host.schema)
      .filter(([, definition]) => {
        if (!definition || !("ui" in definition)) return false;
        if (definition.type !== "number" && definition.type !== "array") return true;
        return "options" in definition.ui;
      })
      .map(([path]) => path)
      .sort();
    const derivedPaths = host.derivedDefinitions
      .map((definition) => String(definition.path))
      .sort();

    expect(derivedPaths).toEqual(panelPaths);
  });

  test("metadata targets are mutable in the supported host", () => {
    const host = getHostMetadata();
    const firstTab = host.tabs[0];
    const firstUiDefinition = Object.values(host.schema).find(
      (definition) => definition?.ui !== undefined,
    );

    expect(firstTab).toBeDefined();
    expect(firstUiDefinition).toBeDefined();
    expect(Object.isFrozen(host.tabMetadata)).toBeFalse();
    expect(Object.isFrozen(host.tabMetadata[firstTab!])).toBeFalse();
    expect(Object.isFrozen(host.tabGroups)).toBeFalse();
    expect(Object.isFrozen(firstUiDefinition!.ui)).toBeFalse();
  });
});
