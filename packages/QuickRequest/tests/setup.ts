// node 环境没有 site-lib。errors.ts 的文案表在模块求值时调用 wgULS，
// 测试文件的顶层赋值会被 import 提升晚于模块求值，故经 setupFiles 在一切 import 之前注入直通实现。
(globalThis as typeof globalThis & { wgULS?: unknown }).wgULS = (hans: string): string => hans;
