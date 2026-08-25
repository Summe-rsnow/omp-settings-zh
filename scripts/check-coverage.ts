import { getHostMetadata } from "../src/host-adapter";
import { buildCoverageReport } from "../src/report";
import { zhCN } from "../src/translations/zh-CN";

const report = buildCoverageReport(getHostMetadata(), zhCN);
console.log(
  `OMP ${zhCN.sourceOmpVersion} 设置翻译：${report.completeSettings}/${report.totalUiSettings} 完整，` +
    `${report.partialSettings} 部分，${report.untranslatedPaths.length} 未翻译`,
);

const failed =
  report.completeSettings !== report.totalUiSettings ||
  report.stalePaths.length > 0 ||
  report.optionMismatches.length > 0 ||
  report.sourceHashMismatches.length > 0 ||
  report.missingTabs.length > 0 ||
  report.missingGroups.length > 0;
if (failed) {
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
}
