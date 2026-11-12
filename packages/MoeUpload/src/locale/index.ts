// 语言资源统一出口：文案在 i18n/*.json，逻辑在同目录 i18n.ts / warnings.ts
export { t } from "./i18n";
export { describeWarnings } from "./warnings";
export type { MessageKey } from "./types";
