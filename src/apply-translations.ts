import { checkHostCompatibility, type HostMetadata, type HostOption } from "./compatibility";
import type { LocalePack, OptionTranslation, SettingTranslation } from "./translations/types";

interface Mutation {
  readonly target: object;
  readonly key: string;
  readonly previous: unknown;
  readonly value: unknown;
  readonly location: string;
}

type MutationPlan =
  | { readonly mutations: readonly Mutation[] }
  | { readonly conflict: string };

export type ApplyTranslationsResult =
  | { status: "applied"; mutationCount: number }
  | { status: "skipped"; reason: string }
  | { status: "rolled-back"; reason: string; rollbackErrors: readonly string[] };

function canWrite(target: object, key: string): boolean {
  const descriptor = Object.getOwnPropertyDescriptor(target, key);
  if (!descriptor) return Object.isExtensible(target);
  if ("value" in descriptor) return descriptor.writable === true;
  return typeof descriptor.set === "function";
}

function queueMutation(
  mutations: Mutation[],
  target: object,
  key: string,
  value: unknown,
  location: string,
): void {
  const previous = Reflect.get(target, key);
  if (Object.is(previous, value)) return;
  mutations.push({ target, key, previous, value, location });
}

function queueTextFields(
  mutations: Mutation[],
  target: object,
  translation: SettingTranslation | OptionTranslation,
  location: string,
): void {
  if (translation.label !== undefined) {
    queueMutation(mutations, target, "label", translation.label, `${location}.label`);
  }
  if (translation.description !== undefined) {
    queueMutation(mutations, target, "description", translation.description, `${location}.description`);
  }
  if ("warning" in translation && translation.warning !== undefined) {
    queueMutation(mutations, target, "warning", translation.warning, `${location}.warning`);
  }
}

function queueOptions(
  mutations: Mutation[],
  options: readonly HostOption[] | undefined,
  translations: Readonly<Record<string, OptionTranslation>> | undefined,
  location: string,
): void {
  if (!options || !translations) return;
  for (const option of options) {
    const translation = translations[option.value];
    if (translation) queueTextFields(mutations, option, translation, `${location}.${option.value}`);
  }
}

function buildMutationPlan(host: HostMetadata, locale: LocalePack): MutationPlan {
  const pendingMutations: Mutation[] = [];
  const derivedByPath = new Map(host.derivedDefinitions.map((definition) => [definition.path, definition]));

  for (const tab of host.tabs) {
    const translatedTab = locale.tabs[tab];
    const metadata = host.tabMetadata[tab];
    if (translatedTab && metadata) {
      queueMutation(pendingMutations, metadata, "label", translatedTab, `tabs.${tab}.label`);
    }

    const groups = host.tabGroups[tab];
    const groupTranslations = locale.groups[tab];
    if (groups && groupTranslations) {
      const translatedGroups = groups.map((group) => groupTranslations[group] ?? group);
      if (translatedGroups.some((group, index) => group !== groups[index])) {
        queueMutation(pendingMutations, host.tabGroups, tab, translatedGroups, `tabGroups.${tab}`);
      }
    }
  }

  for (const [path, translation] of Object.entries(locale.settings)) {
    const schemaDefinition = host.schema[path];
    const ui = schemaDefinition?.ui;
    if (!ui) continue;

    queueTextFields(pendingMutations, ui, translation, `schema.${path}.ui`);
    const translatedGroup = ui.group ? locale.groups[ui.tab]?.[ui.group] : undefined;
    if (translatedGroup) {
      queueMutation(pendingMutations, ui, "group", translatedGroup, `schema.${path}.ui.group`);
    }
    if (Array.isArray(ui.options)) {
      queueOptions(pendingMutations, ui.options, translation.options, `schema.${path}.ui.options`);
    }

    const derived = derivedByPath.get(path);
    if (!derived) continue;
    queueTextFields(pendingMutations, derived, translation, `derived.${path}`);
    const translatedDerivedGroup = derived.group ? locale.groups[derived.tab]?.[derived.group] : undefined;
    if (translatedDerivedGroup) {
      queueMutation(pendingMutations, derived, "group", translatedDerivedGroup, `derived.${path}.group`);
    }
    queueOptions(pendingMutations, derived.options, translation.options, `derived.${path}.options`);
  }

  const mutations: Mutation[] = [];
  const mutationByTarget = new WeakMap<object, Map<string, Mutation>>();
  for (const mutation of pendingMutations) {
    let fields = mutationByTarget.get(mutation.target);
    if (!fields) {
      fields = new Map();
      mutationByTarget.set(mutation.target, fields);
    }
    const existing = fields.get(mutation.key);
    if (existing) {
      if (!Object.is(existing.value, mutation.value)) {
        return {
          conflict: `共享宿主元数据存在冲突译文：${existing.location} 与 ${mutation.location}`,
        };
      }
      continue;
    }
    fields.set(mutation.key, mutation);
    mutations.push(mutation);
  }
  return { mutations };
}

export function applyTranslations(host: HostMetadata, locale: LocalePack): ApplyTranslationsResult {
  const compatibility = checkHostCompatibility(host);
  if (!compatibility.compatible) return { status: "skipped", reason: compatibility.reason };
  if (locale.locale !== "zh-CN") {
    return { status: "skipped", reason: `不支持 Locale Pack：${locale.locale as string}` };
  }

  const plan = buildMutationPlan(host, locale);
  if ("conflict" in plan) return { status: "skipped", reason: plan.conflict };
  const mutations = plan.mutations;
  const unwritable = mutations.find((mutation) => !canWrite(mutation.target, mutation.key));
  if (unwritable) {
    return { status: "skipped", reason: `宿主元数据不可写：${unwritable.location}` };
  }

  let attemptedIndex = -1;
  try {
    for (let index = 0; index < mutations.length; index += 1) {
      attemptedIndex = index;
      const mutation = mutations[index]!;
      if (!Reflect.set(mutation.target, mutation.key, mutation.value)) {
        throw new Error(`写入被拒绝：${mutation.location}`);
      }
    }
    for (const mutation of mutations) {
      if (!Object.is(Reflect.get(mutation.target, mutation.key), mutation.value)) {
        throw new Error(`应用后校验失败：${mutation.location}`);
      }
    }
    return { status: "applied", mutationCount: mutations.length };
  } catch (error) {
    const rollbackErrors: string[] = [];
    for (let index = attemptedIndex; index >= 0; index -= 1) {
      const mutation = mutations[index]!;
      try {
        if (!Reflect.set(mutation.target, mutation.key, mutation.previous)) {
          rollbackErrors.push(`${mutation.location}：恢复被拒绝`);
        }
      } catch (rollbackError) {
        rollbackErrors.push(
          `${mutation.location}：${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
        );
      }
    }
    return {
      status: "rolled-back",
      reason: error instanceof Error ? error.message : String(error),
      rollbackErrors,
    };
  }
}
