import { logger, type ExtensionFactory } from "@oh-my-pi/pi-coding-agent";
import { applyTranslations } from "./apply-translations";
import { getHostMetadata } from "./host-adapter";
import { zhCN } from "./translations/zh-CN";

const extension: ExtensionFactory = (pi) => {
  const result = applyTranslations(getHostMetadata(), zhCN);
  if (result.status === "applied") return;

  logger.error("omp-settings-zh failed closed", {
    status: result.status,
    reason: result.reason,
    rollbackErrors: result.status === "rolled-back" ? result.rollbackErrors : [],
  });

  let notified = false;
  pi.on("session_start", (_event, context) => {
    if (notified) return;
    notified = true;
    context.ui.notify(
      `omp-settings-zh 未应用翻译，已保留官方英文设置：${result.reason}。请更新插件或提交兼容性问题。`,
      "warning",
    );
  });
};

export default extension;
