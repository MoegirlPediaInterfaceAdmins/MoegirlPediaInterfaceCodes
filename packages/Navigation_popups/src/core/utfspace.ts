// 空格只经此常量进入代码：萌百 RL 服务端压缩器会把「只含空白的字符串字面量」
// 压成空串，标题空格随之丢失（站点实测证据见 docs/semantic-notes.md A17）。
// fromCharCode 展开后没有可压缩的字面量，terser 的 evaluate（unsafe:false）也不
// 折叠它——scripts/terser-check.js 的门禁守着这条性质（勿改回字面量）。
export const utfSpace = String.fromCharCode(32);
