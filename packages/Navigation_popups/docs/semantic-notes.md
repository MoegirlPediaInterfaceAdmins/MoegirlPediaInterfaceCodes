# 已知行为差异登记（重写版 vs legacy）

本文件是**重写版与 legacy 之间的语义偏差登记簿**，供维护者对照与未来上游同步评估使用。
重写版的验收原则是「功能一致即可，不追求逐字节一致」；凡有意的差异都必须在此登记，
并写明 legacy 行为、重写版行为、用户可见性评估与安全/正确性论据。

## 0. 基准与存档

- **legacy（行为基准）**＝萌百现行单文件版 `Gadget-popups.js`，
  即 [MoegirlPediaInterfaceCodes] `src/gadgets/Navigation_popups/Gadget-popups.js`
  @ commit `5adc9438`（6529 行，磁盘上含末尾空行共 6530 行；上游基线 oldid=1322962085）。
- **legacy TS 存档**＝本仓 `.zcode/legacy-src/`（已退役的移植版拆分，行为源与上一条相同，
  commit `02c8dec`）。下文凡引用行号，单文件版与存档分别标注。
- **重写版**＝本仓 `src/` 的从零实现（`f594e2a` 起分阶段落地）。
- 状态标记（逐条标注）：**开放差异**（当前仍存在、需维护者知悉）/
  **不复存在**（旧差异已消解）/ **无用户可见差异**（源码形态不同但运行期等价）。

> [!IMPORTANT]
> 本文件的「重写版行为」以**工作树当前状态**（阶段 5 装配完成：boot/entry 落地、`mw.hook`
> 动态重扫已实现、`window.pg` 四域兼容面已装配、构建门禁全部通过）为准撰写。若你正阅读的是
> 尚未合入上述改动的旧版本，条目 A1/A2 与 §D 第 4/8 项（`rollup.config.js` 的循环依赖
> 白名单策略）请以合入后状态为准。

## A. 差异条目（逐条，含状态标注）

### A1. 兼容约定落实：`mw.hook` 动态内容重扫（**已实现**，非偏差）

本条是 `.zcode/rewrite-plan.md` §5 兼容约定第 6 条的落实跟踪，不算语义偏差——该条约定
完全成立，legacy 确有 `mw.hook` 注册。

- **约定（legacy 行为）**：legacy 移植存档 `.zcode/legacy-src/src/entry.ts:47-87` 的 IIFE
  （单文件版对应 `6496-6528`）——
  ① 启动时对现有 `.mw-parser-output` 逐个调用 `dynamicContentHandler`（存档 `entry.ts:78-82`；单文件版 `6523`）；
  ② `mw.hook("wikipage.content").add(dynamicContentHandler)`（存档 `:83`；单文件版 `6524`）；
  ③ `mw.hook("ext.echo.overlay.beforeShowingOverlay").add(($overlay) => dynamicContentHandler($overlay.find(".mw-echo-state")))`（存档 `:84-86`；单文件版 `6525-6527`）。
  `dynamicContentHandler` 的语义（存档 `:49-77`）：传入容器 `id === "mw-content-text"` 时**首个跳过一次**（`once` 旗标）；
  否则（经 `setupPopups(doIt)` 等站点初始化完成后）为当前可见弹窗重新挂 `posCheckerHook`，
  并对容器内链接置 `ranSetupTooltipsAlready = false` 后逐容器重跑 `setupTooltips`。
- **重写版行为**：按该约定实现——`src/entry.ts` 的 ready/load 回调中（双载入守卫通过后、与
  boot 调度并列）完成 hook 注册与启动期 `.mw-parser-output` 扫描，`dynamicContentHandler`
  的 `once` 跳过、`posCheckerHook` 复挂、`ranSetupTooltipsAlready` 重置逐项等价
  （`tests/unit/entry-hooks.test.ts` 8 用例锁定；legacy 原文的 `links &&` 未定义防御因
  重写版 `eventsState.current.links` 恒为数组而无对应分支）。
- **用户可见性**：实现落地后**不可见**（与 legacy 等价）；若缺失则用户能察觉——echo 通知面板
  （`.mw-echo-state`）与运行期注入的正文（VisualEditor/wikEd/其他小工具）内链接不会弹出弹窗。
- **论据**：约定条款有 legacy 双源支撑（单文件版 `6524-6525` 行 + 移植存档 `entry.ts:83-84`），
  不存在「臆断」问题；重写版的架构约束（模块顶层零副作用）要求把该注册放入 `boot()`/entry 的
  显式调用链而非模块求值期，重写版实现正是这样做的。

### A2. `window.pg` 兼容面缩小为四域（`fn`/`option`/`string`/`wiki`）（**开放差异**）

- **legacy 行为**：`pg` 字面量含 18 个域（`api`/`re`/`ns`/`string`/`wiki`/`user`/`misc`/
  `option`/`optionDefault`/`flag`/`cache`/`structures`/`timer`/`counter`/`current`/`fn`/
  `endoflist`/`idNumber`），全部挂在 `window.pg` 上；`javascript:pg.fn.*` 与用户脚本调试
  都直接读它。
- **重写版行为**：`src/state.ts` 只装配 `fn`（7 个 legacy `pg.fn.*` + 3 个 DSL 魔法链接
  构造器）、`option`（= `optionStore`）、`string`（= `englishStrings`）、`wiki`
  （= `siteState`）四个域，函数值与模块导出**引用相等**。其余 14 个域不对外暴露。
- **用户可见性**：仅在**第三方脚本/用户脚本直接读写 `pg.current`、`pg.cache`、`pg.misc`、
  `pg.structures` 等内部域**时可见；`javascript:pg.fn.*` 内联 URL、`window.popupXxx`
  选项覆盖链、`pg.option`/`pg.wiki` 读取均不受影响。
- **论据**：内部域属实现细节，重写版以模块级单例（`eventsState`/`optionStore`/`nsState`
  等）替代；暴露它们会把重写版的内部结构固定为长期兼容的接口，与「不承诺内部形状」的取舍一致。
- 附带细节：legacy `purgePopups` 以 `pg.option = {}` **整体替换**选项对象（旧引用会失效），
  重写版 `purgePopups`（`src/navlinks/links.ts`）改为**就地清键**，因此 `window.pg.option`
  引用在整个生命周期内始终有效——对外表现更稳定，与 legacy 的「重置后重新默认化」等价。

### A3. 下载器防御面删除，且「失败重试 2 次」本是死代码（**开放差异**）

- **legacy 行为**：`newDownload` 有 4 处相关形态——① `typeof XMLHttpRequest === "undefined"`
  时 `http` 缺省，构造后返回字符串 `"ohdear"`；② 每个方法都带 `if (!this.http) return` 守卫；
  ③ 非 200 响应时 `onfailure` 为数值（默认 2）则递归 `newDownload(url, id, callback, onfailure - 1)`；
  ④ `onfailure` 为函数则调用之。单文件版 `1249`、`1320-1345` 行；存档
  `.zcode/legacy-src/src/modules/downloader.ts:21`、`99-125`。
- **重写版行为**（`src/net/downloader.ts`，文件头自述偏差）：删除 ①②（`http` 为必设字段，
  无 `"ohdear"` 返回形态）、删除 ④（无调用方）、**删除 ③ 的重试递归**。
- **关键事实（文档说法更正）**：③ 的重试**从不实际发生**——递归调用 `newDownload(...)`
  的返回值被丢弃，既不 `start()` 也不返回给调用方，因此不会发出任何新请求。也就是说
  legacy 的真实行为与重写版一致：**非 200 时不回调、不重发**。此前文档（含本仓
  `docs/functional-spec.md` §13 与 README 门禁注释）写的「失败重试 2 次」照抄了 legacy
  代码形状，实际观察不到重试行为；重写版按「不过度防御」删除死代码，并以本条目更正此前的说法。
- **用户可见性**：不可见（请求失败时两者都只表现为「弹窗数据不出现」）。
- **论据**：`XMLHttpRequest` 在目标环境（MediaWiki 站点）恒存在；`onfailure` 函数形态
  legacy 全仓无调用方；重试分支不存在可达的执行路径。

### A4. `mw.util.escapeRegExp` 运行时回退删除（**开放差异**）

- **legacy 行为**：`globals.ts` 在模块求值期做运行时特性检测——`!mw.util.escapeRegExp` 时
  用已废弃的 `mw.RegExp.escape` 补上（存档 `.zcode/legacy-src/src/globals.ts:38-45`）。
- **重写版行为**：无该回退，直接使用 `mw.util.escapeRegExp`（`src/api/siteinfo.ts`、
  `src/core/tools.ts`、`src/navlinks/links.ts`、`src/title/namespaces.ts`）。
- **用户可见性**：仅在**缺少 `mw.util.escapeRegExp` 的老旧 MediaWiki 安装**上可见
  （此时重写版会在正则构造处抛错）。萌百现行版本与该回退引入时（2020 年前后）相比，
  `mw.util.escapeRegExp` 早已是稳定 API。
- **论据**：目标站点为萌百现行 MediaWiki，API 恒存在；按「不过度防御」删除。

### A5. 其余按「不过度防御」删除的不可达防御（**开放差异**）

以下分支在 legacy 中结构性不可达（或仅服务于已消失的运行环境），重写版删除：

| 位置 | legacy 防御 | 重写版 |
| --- | --- | --- |
| `src/core/selection.ts`（文件头注释） | `getEditboxSelection` 读 `document.editform`、`doSeparateSelectionPopup` 读 `box.parentNode` 两处 `try/catch`（存档 `selpop.ts:10`、`59-65`）；仅为跨域 iframe 场景服务 | 删除；gadget 恒在主文档运行，`document.editform` 属性访问不会抛 |
| `src/core/htmlout.ts`（`fillEmptySpans`） | 未知结构名时向 `popupError` 槽写错误文案，但实参序颠倒（`str`/`elementId` 对调）导致目标元素永不存在 → 600ms 轮询空转，可观察行为等于什么都不做 | 删除该分支；结构表缺失时原地崩溃 |
| `src/preview/previewmaker.ts:133` | `makeRegexp` 对「既非 string 也非 RegExp」的第三类入参打印日志兜底 | 删除；`string \| RegExp` 二值域已穷尽 |
| `src/preview/previewmaker.ts:379` | `showPreview` 开头 `typeof html !== typeof ""` 提前返回 | 删除；`makePreview()` 后 `html` 恒为 string，空字符串由后续空白正则同等拦截 |
| `src/core/htmlout.ts`（`imageHTML`） | 首参 `article` 从未被读取 | 弃用形参，签名收敛为 `imageHTML(idNumber)` |

- **用户可见性**：均不可见（删除的分支本身不产生可观察副作用）。
- **论据**：不可达分支无法被测试覆盖，而 coverage 四项 100% 常开；按项目「不过度防御」
  原则删除代码而非写 coverage ignore。

### A6. diff 截断段的选项读取路径：混合读 → 统一 `getValueOf`（**无用户可见差异**）

- **legacy 行为**：`insertDiff` 里读取形态是混合的——首次裁剪用 `getValueOf("popupDiffContextLines")`
  （单文件 `5449`；存档 `diffpreview.ts:260`），随后有一行**裸** `getValueOf("popupDiffMaxLines")`
  （无返回值、只为走默认化；单文件 `5453`；存档 `:264`），接着才用 `pg.option.popupDiffMaxLines`
  直读（单文件 `5454-5456`；存档 `:265,268`）。
- **重写版行为**（`src/preview/diffpreview.ts:316`、`322-326`）：同一批调用点统一经 `getValueOf(...)`
  取值；裸 `getValueOf("popupDiffMaxLines")` 调用行**照搬保留**以对齐调用序。
- **校正（两处此前的表述都不准确）**：① 重写版**没有**「在函数入口首读后固化到局部」——各使用点
  仍是逐次取值；② 更重要的是，**legacy 的直读并不会产生可观察的行为差异**：由于那行裸 `getValueOf`
  在**同一个函数调用内先于**所有 `pg.option.*` 直读执行，而 `getValueOf` 内部的 `defaultize`
  会在值为 `null`/`undefined` 时把默认值写回 `optionStore`，因此直读拿到的必然已是默认化后的值
  （`popupDiffContextLines` 亦然，它由 `:260` 的 `getValueOf` 先默认化）。故即使有脚本运行中把
  `pg.option.popupDiffMaxLines` 置 `null`/删键，两侧结果相同（都回到默认 100）。**结论：纯形态差异，
  无用户可见差异**，无需在同步时特殊处理。
- **论据**：统一走 `getValueOf` 是重写版的取值规范（`window.popupXxx` 覆盖链 + 默认值兜底的唯一入口）；
  保留裸调用行是为了不让调用序相对 legacy 漂移（该行的存在本身是 legacy 的遗留形态）。

### A7. `simpleSplit` 固定为 `false`（**开放差异**）

- **legacy 行为**：`insertDiff` 内 `const simpleSplit = !String.prototype.parenSplit.isNative;`
  ——是否走 `\b` 分割的「简化引擎」取决于 `parenSplit` 补丁是否安装。现代引擎原生
  `split` 保留捕获组，补丁走 `isNative = true` 分支，故 `simpleSplit` 恒为 `false`
  （`\b` 分支为旧浏览器补丁路径）。单文件 `5464`；存档 `diffpreview.ts:276`。
- **重写版行为**：不安装任何原型补丁，`parenSplit` 是显式函数（`src/title/title.ts:106`
  即 `str.split(re)`，语义等于 legacy 的 `isNative = true` 分支），调用点
  `src/preview/diffpreview.ts:336` 直接写为 `const simpleSplit = false;`。
- **用户可见性**：仅在**原生 `split` 不保留捕获组的早期引擎**上可见（现代浏览器不可能）。
- **论据**：`diffString` 仍保留 `simpleSplit` 形参与 `\b` 分支本体，并由单测直调覆盖该分支
  （`tests/unit/preview/diff.test.ts`），行为等价性可验证。

### A8. `NavlinkParams` 类型放宽（仅类型层）（**无用户可见差异**）

- **legacy 标注**：`Record<string, string | null>`（存档 `types/pg.ts:51`、
  `modules/navlinks.ts:30,34,101,143`），但实际来源 `parseParams`（`src/title/title.ts:437`）
  产出含 `undefined` 值的表。
- **重写版行为**：`export type NavlinkParams = Record<string, string | null | undefined>`
  （`src/navlinks/navlinks.ts:43`），按真实形态放宽。
- **用户可见性**：不可见——**纯类型层**差异，运行时逐字一致（同一 `parseParams` 产物、
  同一渲染分支）。
- **论据**：类型标注应与运行时真实形态一致，否则每个使用点都要 `assume` 掩盖。

### A9. wikimedia 站点判定正则锚定（**开放差异**，2026-10-17 由 CodeQL 意见引入）

- **legacy 行为**：`/(wiki([pm]edia|source|books|news|quote|versity|species|voyage|data)|metawiki|wiktionary|mediawiki)[.]org/.test(hostname)`（单文件版 `4527`）——未锚定，主机名**包含**上述域名即判为 wikimedia 站；`"wikipedia.org.example.com"`、`"notwikimedia.org"` 之类拼接主机名也会命中，并随之启用 commons 图片链与 wikimedia 分支。
- **重写版行为**：`/(?:^|[.])(?:wiki(?:[pm]edia|source|books|news|quote|versity|species|voyage|data)|metawiki|wiktionary|mediawiki)[.]org$/.test(hostname)`（`src/api/siteinfo.ts`）——前界 `^|[.]` + 尾界 `$`，仅当主机名以合法的域名段结尾（裸域或任意父域下的子域）时命中。
- **用户可见性**：对所有真实部署站点（`zh.moegirl.org.cn`、`commons.wikimedia.org` 及各 wikimedia 子域）判定结果与 legacy 完全一致；仅当本小工具被部署到拼接了 wikimedia 域名的第三方主机时行为不同（legacy 误判为 wikimedia 站，重写版不判为）。
- **论据**：`hostname` 取自 `location.hostname`，正常部署下并非攻击者可控，但锚定消除了「站点判定被主机名拼接欺骗」的理论面，且对全部合法主机等价；CodeQL `js/regex/missing-anchor-of-hostname-pattern` 据此关闭。测试覆盖见 `tests/unit/api/siteinfo.test.ts`（后缀拼接、前缀拼接、深层子域三例）。

### A10. `getJsObj` 的 warnings 遍历按对象形态兼容（**开放差异**，2026-10-20 issue #1140）

- **legacy 行为**：`for (const warning of json_ret.warnings)` 把 `warnings` 当数组遍历。MediaWiki 实际返回对象（键=模块名，值为 formatversion=1 的 `{"*":…}` 或 formatversion=2 的 `{warnings:…}`），`for...of` 遍历对象抛 `TypeError`，被 `catch` 吞掉后返回哨兵值 1——带 warning 的**有效响应**整体被当作解析失败。维基百科部署了全部相关扩展、正常响应不带 warning，故上游从不触发。
- **重写版行为**：`for (const warning of Object.values(json_ret.warnings))`（`src/core/tools.ts`）——对象与数组两种形态统一取值遍历；逐条 log 的 if/else 形态照搬 legacy（缺 `*` 字段时回退 log 其 `warnings` 字段）。
- **用户可见性**：无 warning 时行为不变；有 warning 时从「预览直出 JSON 原文 / 用户信息区空白」变为正常渲染（正文数据本身不受 warning 影响）。
- **论据**：issue #1140 实测萌百对预览查询必带 warning（缺 Wikibase/CentralAuth，见 A11），本条与 A11 组合消除「JSON 原文当 wikitext 渲染」的失效形态；即使未来站点补装扩展，本条也无副作用。测试覆盖见 `tests/unit/core/tools.test.ts`（对象 v1/v2 两形态 + 数组回归）。

### A11. 预览查询移除萌百未部署扩展的参数（**开放差异**，2026-10-20 issue #1140）

- **legacy 行为**：revision 查询拼 `&meta=wikibase`，userinfo 查询拼 `&meta=globaluserinfo&guiprop=groups|unattached&guiuser=…`（维基媒体站的 Wikibase / CentralAuth 扩展模块）。
- **重写版行为**：两处参数移除（`src/api/queries.ts`）。`APIrevisionPreviewHTML` 对 `query.wikibase.repo` 的拼接与 userinfo 对 `globaluserinfo` 的读取逻辑**保留**（可选链数据驱动：无数据即跳过，pageinfo 的 wikibase 链接在 `wikibaseItem` 缺失时不显示），站点将来接入对应扩展时把参数加回即可。
- **用户可见性**：萌百站上消除每条预览查询必带的 unrecognized warning（含 `main` 模块的 `Unrecognized parameters: guiprop, guiuser.`）；wikibase 链接与全局组/LOCKED/HIDDEN 展示在萌百本就无数据来源（pageprops 不含 `wikibase_item`、无 globaluserinfo 响应），用户可见输出不变。
- **论据**：实测（2026-10-20，GET/POST 一致）萌百 API 对上述参数全部报 warning；warning 本身不破坏数据，但与 A10 修复前的 `getJsObj` 组合曾使全部预览失效。参数移除后 `q.wikibase` 恒 undefined，`wikibaseRepo` 落空字符串，pageinfo 侧 `!wikibaseItem || !wikibaseRepo` 跳过——与现状等价。测试覆盖见 `tests/unit/api/queries.test.ts`（userinfo/revision 两 URL 断言）。

### A12. `showAPIPreview` 的 revision 分支承载生成器返回值（**开放差异**，2026-10-20 issue #1140；2026-10-21 按 gui-ying233 评审意见补齐非 wikitext 源码预览）

- **legacy 行为**：`case "revision"` 忽略 htmlGenerator 的返回值，直接 `insertPreview(download)`——提取失败或非 wikitext 内容模型（`download.data` 未被替换为 wikitext 正文）时，把原始 JSON 响应当 wikitext 渲染进弹窗。
- **重写版行为**：返回值为非空字符串时写入 `popupPreview` 槽并终止，不进入 `insertPreview`（`src/api/queries.ts`）；`undefined`（wikitext 成功或 missing 页）路径不变。返回值承载三类内容：提取失败文案（`"Revision preview failed :("`）、**非 wikitext 内容模型的源码预览**（`APIrevisionPreviewHTML` 在 slots 确有源码但 contentmodel 非 wikitext 时，按行数（借 `popupMaxPreviewSentences`，默认 5）与字符数（`popupMaxPreviewCharacters`，默认 600）双重截断、`entify` 转义后包进 `<pre>` 返回），以及**正文不可用提示**（修订条目存在但 content 缺失——RevDel 隐藏、权限不足——或无修订条目时返回 `popupString("revdel")`，2026-10-21 按 Copilot 评审意见补齐——此前该场景落穿返回 `undefined`，JSON 依旧直出）。
- **用户可见性**：提取失败场景从「JSON 原文直出」变为「明确的失败提示」；CSS/JS/JSON 页面从「JSON 原文直出」变为「截断的源码预览」；正文被隐藏的修订从「JSON 原文直出」变为「历史版本被隐藏」提示（初版 A12 曾误称失败提示覆盖非 wikitext 场景——失败文案只在响应解析失败时返回，contentmodel 不匹配走的是成功返回 `undefined` 的路径，JSON 依旧直出，经 gui-ying233 评审指出后补齐）；wikitext 成功路径与 missing 页路径无变化。
- **论据**：失败文案是 htmlGenerator 的既有约定（其余 queryType 均直接入槽），revision 分支此前独弃之；非 wikitext 源码若交给 wikitext 渲染管线（previewmaker 的 killTemplates/wiki2html）只会产出无意义输出，`<pre>` 直出是源码页面的自然形态；正文不可用的兜底放在 wikibase_item 提取之后，保证 pageprops 副作用不受影响。测试覆盖见 `tests/unit/api/queries.test.ts`（失败文案入槽、`undefined` 不触槽、非 wikitext `<pre>` 输出、行数截断与实体转义、RevDel/无 slots/无修订条目返回 revdel）。

### A13. 显示名链接的管道符后缀截断（**开放差异**，2026-10-20 issue #1140；同日按 Sourcery 评审意见收紧为仅标题段）

- **legacy 行为**：URL 解码后原样返回标题——萌百显示名系统（服务端扩展，用户页 H1 渲染为「用户名 | 昵称」）在讨论串等动态视图产出的链接把「真实标题 | 显示别名」整串编码进 `title=`（`|` 为 `%7C`），解码后 popups 把整串当标题：弹窗标题污染、`ususers`/`titles` 查询无效用户名与不存在页面、编辑导航链指向非法标题（如 `User_talk:名_%7C_昵称&action=edit`）。
- **重写版行为**：模块级 `stripDisplayAlias`（`src/title/title.ts`）在 URL 解码后统一套用于 fromURL 的 main（含 Safari 回退路径）/contribs/email/backlinks 分支——解码产物含 `|` 时截到首个 `|` 之前，仅作用于 `#` 之前的**标题段**（锚点段的 `|` 属章节文本，原样保留），截断后的尾空白随截断剥离。MW 标题字符集不含 `|`，URL 解码产物含 `|` 的标题即显示名拼接产物。
- **用户可见性**：悬停显示名链接时弹窗标题、用户信息查询、编辑等导航链全部还原为真实标题；标题干净而锚点含 `|` 的链接不再受影响（初版在 `decodeNasties` 内截断整串曾误伤锚点段，按评审意见收紧后消除）。剩余取舍：字面 `%7C` 标题（href 为 `%257C`）经 `decodeEscapes` + `decodeURI` 两步解码后与显示名同形，客户端无法区分——取显示名（现实高频）舍 `%7C` 字面标题（MW 上趋近零频率）。
- **论据**：显示名链接的 `%7C` 在 query 解析时不会被服务端拆分（与多值参数的字面 `|` 不同），必须客户端截断；`userName()` 的 `split("/")[0]` 不处理 `|`，故截断放在 URL 解码后的统一出口并覆盖全部 fromURL 分支（Safari 回退路径曾按评审意见补齐，翌日随 A14 整体删除）。`fromWikiText` 走 `myDecodeURI` 不受影响，wikitext 内链的管道符在 parenSplit 阶段已拆。测试覆盖见 `tests/unit/title/title.test.ts`（title= 显示名、显示名+锚点共存、双重编码显示名、Contributions target 显示名、锚点含 `|` 完整保留）。

### A14. Safari `%25` 双重解码路径与 `flag.isSafari` 状态整体删除（**开放差异**，2026-10-21 issue #1140 跟进清理）

- **legacy 行为**：`fromURL` 的 main 分支在 `pg.flag.isSafari` 真值且标题段匹配 `/%25[0-9A-Fa-f]{2}/` 时走 `decodeURIComponent(unescape(extracted))`（`unescape` 为 Annex B 废弃 API），修补旧 Safari 引擎「把 href 里 UTF-8 字符串中的 `%` 再编码成 `%25`」的缺陷（英文维基 Gadget-popups.js/sandbox 讨论页记载）。
- **重写版行为**：该分支与 `TitleWikiState.flag`（`isSafari` 为其唯一字段）整体删除（`src/title/title.ts`），fromURL 统一走 `decodeNasties` 主路径。
- **用户可见性**：无——`wiki.flag.isSafari` 在 `src/` 内从未有装配赋值点（无 UA 检测），生产恒为 `false`，该分支仅测试直设可达，删除不改变任何生产行为。
- **论据**：三重验证支持删除。其一，修补的引擎缺陷已消亡——现代浏览器（含 Safari）的 `a.href` 按 DOM 标准返回字面属性值、不做百分号解码，即使补上装配也不会以「修复真实问题」的方式触发。其二，分支无独立价值——设计场景（`%25E4%25B8%2583` 双重编码）下主路径 `decodeEscapes` + `decodeURI` 同样正确解出原文（实测一致）；正常单层编码的非 ASCII 标题（`%E4%B8%83`）走该路径反而产出乱码（`unescape` 的 Latin-1 语义逐字节变字符，实测），装配后只剩误伤能力。其三，维护负资产——`unescape` 需 eslint-disable 压制，状态声明误导阅读者以为 Safari 兼容在工作，三个测试用例中两个的断言值在两条路径下同值、掩盖真实差异。若未来需恢复旧 Safari 兼容，以本条目与 legacy 基准（commit 02c8dec）为准复原。测试覆盖见 `tests/unit/title/title.test.ts`（`A%2541` 双层解码、`%257C` 双重编码显示名截断均改由主路径用例承载）。

## B. 明知故留的 legacy 死分支（`istanbul ignore` 清单）

重写版在以下位置**保留** legacy 结构性不可达的防御分支，逐条配 `// istanbul ignore …`
与理由注释（`grep -rn "istanbul ignore" src/` 共 **25 处**，分布于 7 个文件）。
保留而非删除的原因：这些分支承载 legacy 的表达式形态与调用序，改动会影响渲染/路径语义；
且删掉后若上游同步带回同形代码，会再次引入差异。清单：

| 文件 | 处数 | 位置与理由摘要 |
| --- | --- | --- |
| `src/preview/diff.ts` | 3 | `:55` `?? NaN` 兜底侧（上方 `!row && row !== 0` 守卫已确保 row 为 number）；`:147` `?? -1` 同型；`:167` push 抛错词条的结构性不可达 |
| `src/preview/diffpreview.ts` | 6 | `:198` catch（`getJsObj` 内部捕获并忽略 `JSON.parse` 异常、返回哨兵值，`download.data` 按约定恒为 string）；`:221`/`:241`/`:254` `?? -1`（配对单元 row 恒为 number）；`:266`/`:278` `?? ""`（配对单元 text 恒存在） |
| `src/api/queries.ts` | 4 | `:276` `?? ""`（ipUser 命中蕴含 user 是非空字符串）；`:419`/`:571` catch（同上 `getJsObj` 哨兵值）；`:642` `""`（外层 `if (user.registration)` 已确证真值，同一对象两次读取之间无副作用） |
| `src/preview/images.ts` | 2 | `:30` `typeof image.stripNamespace !== "function"` **恒假**（Title 原型方法恒为 function，legacy `alert("loadImages bad")` 不可达）；`:133` `toggleSize` 绑定于含 `img` 子节点的容器 onclick |
| `src/navlinks/links.ts` | 8 | `:124`/`:704` popupString 三级兜底最终返回键名本身；`:228` split 产物为稠密字符串数组；`:386` `cookieStyle` 参数 legacy 无调用方；`:568` `processAllPopups` 两个条件均为假的分支无调用方可达（三个调用点至少命中一个真值）；`:762`/`:766` catch（`getJsObj` 哨兵）；`:789` `null` 侧（`i === 0` 时 `edits[i-1]` 不可读） |
| `src/preview/dab.ts` | 1 | `:84` `listLinks` 恒推入至少一条 remove 链接，空列表早退不可达 |
| `src/navlinks/navlinks.ts` | 1 | `:197` `type` 恒有定义，`undefined` 侧不可达 |

## C. 旧版 semantic-notes 五条逐条结论

旧五条出自移植版（`git show e16d105:docs/semantic-notes.md`），随推倒重写删除。逐条对照重写版现状
（「仍成立」的条目已改写收录于上文 A/§C，下表给出结论与理由）：

| 旧条目 | 结论 | 说明 |
| --- | --- | --- |
| 1. 模块定义在脚本加载期求值（原为 DOM ready 回调内） | **仍成立（已改写收录）** | 重写版模块顶层零副作用，初始化集中在 `boot()`（ready/load 触发），机制与移植版不同但差异类型相同：模块与 `window.pg` 在**加载期**求值/装配，legacy 全部在 ready 回调内。守卫语义等价（守卫在装入前判定，`window.pg` 同步标记，见 `src/entry.ts`）。可见性：仅「脚本加载后、DOM ready 前」这一瞬间读 `window.pg` 的脚本可见。 |
| 2. 行内注释被剥离（产物只剩 banner） | **仍成立（已改写收录）** | esbuild 转译剥除函数体内的行内注释，产物只保留 `rollup.config.js` 的 banner。实测补充：**class 字段位置的注释会随 class 字段降级移入构造函数而保留**（形态为构造函数内注释），属纯文本差异，不影响行为。 |
| 3. es2020 降级：class 字段编译为 `__publicField` 辅助函数 | **不复存在** | 重写版 esbuild 读取本仓 `tsconfig.json`（`target: es2020`），`useDefineForClassFields` 因此为 **false** 语义，class 字段降级为构造函数内 `this.x = …` 赋值（与 legacy 部署链 tsc es2020 同形），**不产生** `__publicField`/`__defProp` 辅助。实测：以本仓 `rollup.config.js` 对 `src/core/popup.ts` 打包，产物中 `class _Navpopup` 的字段全部为构造器内赋值、辅助函数计数为 0（另见「esbuild 会重命名自引用类并留下 `let X = _X;` 别名，`scripts/build.js` 将其提升为 `const`」）。 |
| 4. 类型转换改写：`Boolean()`/`Number()` → `!!`/`+`（14 处） | **不复存在** | 重写版源码本就零 `Boolean()`/`Number()` 构造调用（grep 全 src 仅命中 1 处说明性注释）。`eslint.config.js` 的 `no-restricted-syntax` 两条禁令**保留**，防回归。 |
| 5. 产物 banner 的 eslint-disable 扩充（3 条） | **不复存在** | 现产物 banner **零 eslint-disable 条目**（见 `rollup.config.js` 的 banner 文本）。产物 lint 改为构建期门禁：`scripts/build.js` 先用本仓 eslint（`fix: true`）整理产物格式、再在**禁止 fix 的情况下复检**，任何 banner 未正当豁免的违规都会使构建失败。旧「规则要求与 es2020 目标直接冲突」的豁免场景已不存在（源码零逻辑赋值运算符；esbuild 的 `let X = _X` 别名由 build.js 提升为 const）。 |

## D. 无用户可见差异的形态适配（复核备查）

以下源码形态与 legacy 不同、但运行期语义等价，登记以免在同步/重构时被误判为回归：

1. **原型扩展 → 显式函数**：legacy 的 `String.prototype.parenSplit` 补丁与
   `String.prototype.entify` 扩展（单文件 `2407`、`2427`、`2477`）改为
   `src/title/title.ts` 的 `parenSplit(str, re)` 与 `src/core/tools.ts` 的 `entify(str)`。
   现代引擎原生 `split` 保留捕获组，即 legacy 的 `isNative = true` 分支，语义等价；
   `Stringwrapper.parenSplit` 方法保留（内部转调显式函数）。
2. **产物包装形态**：legacy 单文件的顶层就是 `"use strict";` + **`$(() => { …全部代码… })`**
   （jQuery ready 回调，非 IIFE；脚本末尾以 `});` 闭合）；重写版产物为**裸顶层语句**
   （`format: "es"`，`src/entry.ts` 的守卫与 ready 注册直接成为产物顶层），依赖 mw
   ResourceLoader 的 `mw.loader.implement` 函数作用域隔离顶层名。两者的差异已在 §C 第 1 条
   （加载期 vs ready 内求值）登记。
3. **tree shaking**：移植版为保语句全量而关闭；重写版开启（`treeshake: true`）。顶层副作用
   节点（`window.pg = state`、jQuery-ready 注册）按 rollup 的副作用判定保留；bundle 形状由
   `scripts/build.js` 的单 chunk + 无 `import`/`export` 残留断言把关。
4. **循环依赖策略**：`rollup.config.js` 曾对 `CIRCULAR_DEPENDENCY` 一律抛错（要求无环模块图），
   阶段 5 起改为**白名单放行**——环中模块全部在 `KNOWN_CYCLE_MODULES` 内则放行、越界仍 fatal。
   依据是「模块顶层零副作用」使函数级环运行期安全（preview/event 域本就相互递归，属上游设计）。
   这是**构建配置策略**变化，不改变运行期行为；对维护者的影响是「新环一旦越出白名单会立刻在
   构建期暴露」的守卫依然有效。
5. **`pg.counter.loop`**：legacy `setMisc` 会重置它，但该字段全仓无读取点（唯一定义即
   `setMisc` 本身），重写版不设对应字段（阶段 5 的 `src/boot.ts` 的 `setMisc` 注释已记录）。
6. **加载期等待语句**：`mw.loader.using(["mediawiki.api"])` 在 legacy 中即被注释或由
   `mw.Api` 客户端承接（见 `diffpreview.ts` 文件头），重写版无对应物，无行为差异。
7. **`window.pg` 装配时机**：legacy 在模块求值期构造 `pg` 字面量并判守卫；重写版在
   `entry.ts` 模块求值期构造并判守卫，时机等价（守卫窗口的细微差别见 §C 第 1 条）。
8. **`rollup.config.js` 循环依赖白名单**：见上条第 4 项——构建策略变化，非运行期行为。
9. **测试导出面**：重写版把 legacy 的若干模块私有成员导出以便单测直调（`queries`/`diff`/
   `diffpreview`/`dab`/`navlinks`/`links` 域），运行时调用关系不变——这属于**测试可见面**，不构成
   行为差异。

## E. 维护约定

- 新增有意差异**必须**在本文件追加条目，格式：差异描述 / legacy 行为 / 重写版行为 /
  用户可见性评估 / 安全或正确性论据。
- 差异消除后把条目移入「不复存在」并注明消除原因与对应 commit，不要直接删除历史。
- 与 `docs/functional-spec.md` 的关系：functional-spec 描述**功能基准（应然）**，
  本文件描述**与基准的偏差（实然）**；两者冲突时以本文件为准并修正 functional-spec。
