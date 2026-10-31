# Watermark

[萌娘百科](https://zh.moegirl.org.cn/) 小工具 `Gadget-Watermark`：对非自动确认用户在历史版本页、显示标题与页名不符的用户（讨论）页、草稿页铺设全屏平铺水印。由迁移前 `Gadget-site-js` 内嵌的自建实现（SVG foreignObject 背景 + 每秒轮询防篡改）改为基于 [watermark-js-plus](https://github.com/zhensherlock/watermark-js-plus)（MIT）的独立 gadget，防篡改由库的 `mutationObserve`（MutationObserver）承担。

源码为 TypeScript（`src/`），经 **esbuild** 打包为单文件产物（按需入口 `watermark-js-plus/es`），直接写入 [`src/gadgets/Watermark/`](../../src/gadgets/Watermark/)（wiki 部署读取该位置），由 postCommit CI 自动重建并提交。

> [!WARNING]
> **产物是编译生成的，请勿手改。**
> 改 `src/**/*.ts` → 根目录 `npm run package:build` → 重新生成产物。

## 场景判定（`src/conditions.ts`）

两阶段判定，均为纯函数（单测覆盖）：

1. `decideScene`：仅凭 mw.config 与显示标题判定——历史版本（`wgCurRevisionId` / `wgRevisionId` 均为正且不等）→ 用户页复核 → 草稿（NS 118）；`autoconfirmed` 用户直接跳过。
2. `hasVariantMatch`：显示标题与页名不符的用户页，经 `prop=info&inprop=varianttitles` 复核，标题与任一语言变体一致（如简繁转换）即视为正常显示。

## 视觉与防篡改（`src/options.ts`）

- 视觉基线沿用迁移前实现：300×300 平铺、-15° 旋转、24px 黑字、0.17 透明度、`\n` 双行文案。
- `rotate` 与 `textRowMaxWidth` 显式给出：库默认 45° 与自动折行都会改变现有视觉。
- 防篡改：`mutationObserve`（默认开启）监听水印节点的属性、子树与文本变化及被父元素移除，自动重建；替代原每秒轮询 9 项样式断言的实现，并移除原「超 20 次重建 alert」。

## 构建与测试

```bash
npm run package:build   # 构建，产物写入 src/gadgets/Watermark/
npm run package:test    # CI 门禁：幂等构建检查 + vitest（含覆盖率）
```
