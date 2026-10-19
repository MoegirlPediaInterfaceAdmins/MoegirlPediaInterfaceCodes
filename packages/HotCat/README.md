# HotCat

[萌娘百科](https://zh.moegirl.org.cn/) [HotCat](https://zh.moegirl.org.cn/Help:HotCat小工具) 小工具（`Gadget-HotCat`）的源码包。源码为 TypeScript（`src/`，按域分层），经 **esbuild** 打包为单文件产物，直接写入 [`src/gadgets/HotCat/`](../../src/gadgets/HotCat/)（wiki 部署读取该位置），由 postCommit CI 自动重建并提交。

> [!WARNING]
> **产物是编译生成的，请勿手改。**
> 源码（`src/**/*.ts`）→ 根目录 `npm run package:build` → `src/gadgets/HotCat/Gadget-HotCat.js`，一切修改在源码进行，产物由 CI 自动重建。

## 来源与版权

HotCat V2.46。

- 上游源码：共享资源 [MediaWiki:Gadget-HotCat.js](https://commons.wikimedia.org/wiki/MediaWiki:Gadget-HotCat.js)，基线 [oldid 1093305835](https://commons.wikimedia.org/wiki/_?oldid=1093305835)；上游更新后请同步更新该链接。
- 全部内容引自上述共享资源页面；合并了 User:Func 对繁体分类的修正：
  - 本页面 diff：<https://zh.moegirl.org.cn/_?diff=5710070&oldid=5611586>
  - User:Func 的修正：<https://zh.moegirl.org.cn/_?diff=4533156&oldid=5710033>
- 萌百本地化修改：`alert` 改为 OOUI 版本；JSONP 改为原生请求（commit [1348599](https://github.com/MoegirlPediaInterfaceAdmins/MoegirlPediaInterfaceCodes/commit/134859937c596c818e4a33f9d174022dc79d7bb8)）。
- 文档：<https://commons.wikimedia.org/wiki/Help:Gadget-HotCat>
- 主要作者列表：<https://commons.wikimedia.org/wiki/Help:Gadget-HotCat/Version_history>
- 许可证：**Quadruple licensed GFDL, GPL, LGPL and Creative Commons Attribution 3.0 (CC-BY-3.0)**。
- 行为基准 = 迁移前的单文件版 `src/gadgets/HotCat/Gadget-HotCat.js` @ commit `79559658`（3198 行）。

## 目录结构与包划分

本包不设独立 `package.json`，依赖与 lint/构建配置统一由仓库根目录管理。源码按「域」拆分，每个域只导出该域的职责，跨域共享的可变状态收敛在 `runtime.ts`：

```text
src/
├── index.ts              # 入口：同步副作用 + await $.ready 后的有序 bootstrap（唯一碰 window 的模块）
├── runtime.ts            # 站点上下文（mw.config）与 legacy IIFE 闭包内的可变状态（editors/pageText/…）
├── types.ts              # 跨域类型（SiteConfig / ApiResponse / CommitForm / ChangeResult…）
├── globals.d.ts          # 站点全局声明（window.hotcat_*、oouiDialog、UFUI…）
├── config/
│   ├── hotcat.ts         # window.HotCat 默认值（用户脚本的兼容面）
│   ├── messages.ts       # 文案类型
│   └── i18n.ts           # 简体中文覆盖层（$.extend 浅合并）
├── util/
│   ├── dom.ts            # make / hasClass / findByClass / forceRedraw
│   ├── text.ts           # param / title / capitalize / escapeRE / substitute / wikiPagePath
│   └── events.ts         # keyCode 常量、evtKeys / evtKill
├── wikitext/
│   ├── patterns.ts       # 空白/命名空间正则、autoLocalize、initLocalization、findCatsRE
│   ├── find.ts           # find_category（wikitext 内容模型）
│   ├── change.ts         # change_category（增/删/改索引）
│   └── list.ts           # list_categorys
├── api/
│   ├── http.ts           # jQuery JSON 请求的类型化包装
│   ├── page.ts           # setPage / initiateEdit / resolveOne / resolveMulti
│   ├── suggestions.ts    # 建议引擎、方案表、filterAndSortTitles
│   └── summary.ts        # multiChangeMsg / currentTimestamp / performChanges
├── ui/
│   ├── editor.ts         # CategoryEditor（五态状态机 + 建议显示，薄协调层）
│   └── editor/           # 编辑器内部模块
│       ├── form.ts       # 内联表单 DOM 构建
│       ├── suggest.ts    # 建议请求发出与批次状态
│       └── selection.ts  # 输入框选区操作
│   ├── multi.ts          # 保存按钮、激活切换、消歧义、批量提交
│   ├── setup.ts          # 分类栏解析、上传页集成、隐藏表单、getState/setState/closeForm
│   └── dialogs.ts        # oouiDialog.alert 统一封装
└── core/
    ├── initialize.ts     # window.hotcat_* / JSconfig 折叠、changeTag 兼容段、RTL
    └── run.ts            # can_edit / reallyRun / run（一次性闸门）
tests/                    # vitest（jsdom + 真 jQuery）
└── fixtures/internals.ts # 差分验证的内部导出面（供 .cache 下的 differential.mjs 打包）
scripts/
├── build.js              # esbuild 构建 + 产物门禁 + 幂等检查
└── terser-check.js       # 部署链等价门禁（acorn es2020 + tsc es2020 emit + 仓库 terser 配置）
```

## 构建

```bash
# 仓库根目录
npm run package:build                         # 构建产物 → src/gadgets/HotCat/
node packages/HotCat/scripts/build.js --check-idempotent   # 幂等 + 与磁盘产物一致
node packages/HotCat/scripts/terser-check.js  # 部署链等价门禁
```

构建细节：

- `entryPoints: src/index.ts`，`bundle: true`，`format: "esm"`（裸顶层语句，gadget 由 `mw.loader.implement` 隔离作用域）；
- `target: es2020` 与部署侧 `tsconfig.production.json` / terser `ecma` 一致；
- 只开 `minifySyntax`，压缩留给部署侧 terser（避免二次压缩）；
- banner 写入「请勿手改」与仓库地址，并显式加 `"use strict"`（legacy 依赖严格模式下的 `this` 语义）；
- 产物门禁：banner 在头部、无残留 `import/export`、无 BOM/CR、以换行结尾。

## 测试范围

`npm test` 中的 `test:tsc` 会检查本包源码与测试；`npm run package:test` 会运行本包的构建幂等、terser 门禁与 vitest（146 个用例）：

| 文件 | 覆盖对象 |
| --- | --- |
| `tests/wikitext.test.ts` | 分类增删改（含插入点、跨语言链接、隐藏分类、模板分类）、`find_category`（once/批量、注释/nowiki、中文别名） |
| `tests/text.test.ts` | `substitute` / `replaceShortcuts` / `capitalize` / `escapeRE` / `param` / `title` / `wikiPagePath` / `evtKeys` / `evtKill` |
| `tests/config.test.ts` | HC 默认值、`disable()` / `isSupportedContentModel()`、中文覆盖、`addShortcuts`、`initialize` 的 window 覆盖与 changeTag 兼容段 |
| `tests/suggestions.test.ts` | 五个建议引擎的解析、`filterAndSortTitles`（黑名单/前缀优先/去重/排除当前页） |
| `tests/api.test.ts` | `setPage` 状态灌入、`initiateEdit` 成功/失败/重入、`resolveOne`（缺失/重定向/消歧义/黑名单）、`resolveMulti` |
| `tests/editor.test.ts` | 构造、展开表单、输入清洗、接受/取消、删除/恢复、收起/回退、建议列表选择 |
| `tests/setup.test.ts` | 分类栏/隐藏分类装配、打印页脚兜底、提交表单、`getState`/`setState`、`closeForm` |
| `tests/summary.test.ts` | 多分类摘要、200 字符截断、自动提交 change tag、自我编辑冲突、源码缺失 |
| `tests/multi.test.ts` | 保存按钮的创建与启用、激活切换、消歧义菜单、批量提交 |

覆盖率（istanbul）只统计可独立测的源码（入口 `index.ts`/`run.ts` 与纯类型文件不在口径内），当前约 77% 语句 / 62% 分支；DOM 生命周期分支主要由差分验证兜底，因此不设 100% 阈值门禁（做法同 `packages/UserMessages`）。
