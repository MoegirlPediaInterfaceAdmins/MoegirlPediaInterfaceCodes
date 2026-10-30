import type { UIText } from "./types.ts";

/*
 * 界面文案的解析：配置页的 label / hint / placeholder 等界面串收 UIText 形态
 * （简体直书或 {hans, hant} 对），渲染时经 wgULS 转到当前用户的语言变体——
 * OOUI 客户端注入的 DOM 不经服务端语言转换，这正是 wgULS 存在的原因。
 */

/**
 * 把配置文案解析为当前用户变体的显示串。
 * @param text 配置形态的文案
 * @returns 显示串；对象形态缺 hant 时回落 hans
 */
const resolveUIText = (text: UIText): string => typeof text === "string" ? text : wgULS(text.hans, text.hant ?? text.hans);

export { resolveUIText };
