import { describe, expect, test } from "bun:test";
import { getHostMetadata } from "../src/host-adapter";
import { buildCoverageReport } from "../src/report";
import { zhCN } from "../src/translations/zh-CN";
import { createFakeHost } from "./fixtures/fake-host";
import { minimalLocale } from "./fixtures/minimal-locale";

describe("coverage and drift reporting", () => {
  test("the OMP 18.2.1 locale has complete P0 coverage", () => {
    const report = buildCoverageReport(getHostMetadata(), zhCN);

    expect(report.totalUiSettings).toBe(377);
    expect(report.translatedSettings).toBe(report.totalUiSettings);
    expect(report.completeSettings).toBe(report.totalUiSettings);
    expect(report.partialSettings).toBe(0);
    expect(report.untranslatedPaths).toEqual([]);
    expect(report.stalePaths).toEqual([]);
    expect(report.optionMismatches).toEqual([]);
    expect(report.sourceHashMismatches).toEqual([]);
    expect(report.missingTabs).toEqual([]);
    expect(report.missingGroups).toEqual([]);
  });

  test("keeps product and technical names restrained instead of forcing full Chinese", () => {
    expect(zhCN.settings["advisor.enabled"]?.label).toContain("Advisor");
    expect(zhCN.settings["prewalk.enabled"]?.label).toContain("Prewalk");
    expect(zhCN.settings["compaction.methodOrder"]?.options?.snapcompact?.label).toBe("Snapcompact");
    expect(zhCN.settings["compaction.methodOrder"]?.options?.shake?.label).toBe("Shake");
    expect(zhCN.settings["update.channel"]?.options?.canary?.label).toBe("Canary");
  });

  test("reports upstream additions as English fallback", () => {
    const report = buildCoverageReport(createFakeHost(), minimalLocale);

    expect(report.totalUiSettings).toBe(3);
    expect(report.translatedSettings).toBe(2);
    expect(report.completeSettings).toBe(2);
    expect(report.untranslatedPaths).toEqual(["unlistedSetting"]);
  });

  test("reports stale paths, changed source text, and option value drift", () => {
    const host = createFakeHost();
    const locale = structuredClone(minimalLocale);
    const mutableSettings = locale.settings as unknown as Record<
      string,
      {
        sourceHash: string;
        label?: string;
        description?: string;
        options?: Record<string, { label?: string; description?: string }>;
      }
    >;
    Object.assign(mutableSettings, {
      removedSetting: { sourceHash: "stale", label: "已删除", description: "已删除" },
    });
    mutableSettings.autoResume!.sourceHash = "outdated";
    delete mutableSettings["power.sleepPrevention"]!.options!.system;
    Object.assign(mutableSettings["power.sleepPrevention"]!.options!, {
      renamed: { label: "猜测值" },
    });

    const report = buildCoverageReport(host, locale);

    expect(report.stalePaths).toEqual(["removedSetting"]);
    expect(report.sourceHashMismatches).toEqual(["autoResume"]);
    expect(report.optionMismatches).toEqual([
      {
        path: "power.sleepPrevention",
        missingValues: ["system"],
        staleValues: ["renamed"],
      },
    ]);
    expect(report.partialPaths).toEqual(["autoResume", "power.sleepPrevention"]);
  });
});
