import type zhHansMessages from "../../i18n/zh-hans.json";

// 文案键 = 简体基准表的键；繁体层出现基准表以外的键由 tests/locale.test.ts 拦下
type MessageKey = keyof typeof zhHansMessages;

export type { MessageKey };
