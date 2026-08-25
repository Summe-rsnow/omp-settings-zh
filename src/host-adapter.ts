import { VERSION } from "@oh-my-pi/pi-coding-agent";
import {
  SETTINGS_SCHEMA,
  SETTING_TABS,
  TAB_GROUPS,
  TAB_METADATA,
} from "@oh-my-pi/pi-coding-agent/config/settings-schema";
import { getAllSettingDefs } from "@oh-my-pi/pi-coding-agent/modes/components/settings-defs";
import type { HostMetadata } from "./compatibility";

/**
 * The only boundary that knows OMP's unstable settings metadata exports.
 * Every returned collection is the host-owned live object, not a copy.
 */
export function getHostMetadata(): HostMetadata {
  return {
    version: VERSION,
    tabs: SETTING_TABS,
    tabMetadata: TAB_METADATA,
    tabGroups: TAB_GROUPS,
    schema: SETTINGS_SCHEMA,
    derivedDefinitions: getAllSettingDefs(),
  } as unknown as HostMetadata;
}
