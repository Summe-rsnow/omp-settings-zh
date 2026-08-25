export {};

let networkCalls = 0;
const originalFetch = globalThis.fetch;
globalThis.fetch = new Proxy(originalFetch, {
  apply() {
    networkCalls += 1;
    throw new Error("translation initialization attempted a network request");
  },
});

try {
  const [{ applyTranslations }, { getHostMetadata }, { zhCN }] = await Promise.all([
    import("../src/apply-translations"),
    import("../src/host-adapter"),
    import("../src/translations/zh-CN"),
  ]);
  const host = getHostMetadata();
  const behaviorSnapshot = Object.fromEntries(
    Object.entries(host.schema).map(([path, definition]) => [
      path,
      { defaultValue: definition?.default, values: definition?.values },
    ]),
  );

  const result = applyTranslations(host, zhCN);
  if (result.status !== "applied") throw new Error(`${result.status}: ${result.reason}`);
  if (host.tabMetadata.appearance?.label !== "外观") throw new Error("appearance tab was not translated");
  if (host.schema.autoResume?.ui?.label !== "自动恢复") throw new Error("autoResume schema was not translated");
  if (host.derivedDefinitions.find((definition) => definition.path === "autoResume")?.label !== "自动恢复") {
    throw new Error("autoResume derived definition was not translated");
  }

  for (const [path, snapshot] of Object.entries(behaviorSnapshot)) {
    const definition = host.schema[path];
    if (!definition || !Object.is(definition.default, snapshot.defaultValue) || !Object.is(definition.values, snapshot.values)) {
      throw new Error(`setting behavior metadata changed: ${path}`);
    }
  }
  if (networkCalls !== 0) throw new Error(`translation initialization made ${networkCalls} network request(s)`);
  console.log(`插件初始化冒烟通过：${result.mutationCount} 项显示元数据变更，0 次网络请求`);
} finally {
  globalThis.fetch = originalFetch;
}
