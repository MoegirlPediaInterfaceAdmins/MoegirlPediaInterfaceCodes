# Navigation popups

[萌娘百科](https://zh.moegirl.org.cn/) [Navigation popups](https://zh.moegirl.org.cn/MediaWiki:Gadget-popups.js) 小工具（`Gadget-popups`）的源码包。JS 源码为 TypeScript（`src/`，按功能域分层），经 **Rollup + esbuild** 打包为单文件产物；CSS 源码为 SCSS（`src/css/`），经 **sass** 编译。两份产物直接写入 [`src/gadgets/Navigation_popups/`](../../src/gadgets/Navigation_popups/)（wiki 部署读取该位置），由 postCommit CI 自动重建并提交。

> [!WARNING]
> **产物是编译生成的，请勿手改，也不要把上游新版代码直接复制粘贴进来。**
> 源码（`src/**/*.ts`）→ 根目录 `npm run package:build` → `src/gadgets/Navigation_popups/`，一切修改在源码进行，产物由 CI 自动重建。
> 萌百版相对上游有大量定制（简繁翻译内置、moment 时间格式化、中文站点适配、Moeskin/vector-2022 容器适配、暗色三变体等）；上游同步必须对照 [docs/functional-spec.md](./docs/functional-spec.md)。

## 迁移说明

本包于 2026-10 自独立仓库 [MoegirlPediaInterfaceAdmins/Navigation_popups](https://github.com/MoegirlPediaInterfaceAdmins/Navigation_popups)（迁移基线 commit `ab6ebb46`，最终发版 v0.2.0）迁入本仓库；独立仓库随之归档，其 git 历史与 Releases 保留在原址供追溯。迁入后不再单独发版，依赖与 lint/构建配置统一由仓库根目录管理。

## 行为基准

- **功能基准 = legacy 萌百现行单文件版**：迁移前的 `src/gadgets/Navigation_popups/Gadget-popups.js` @ commit `5adc9438`（6529 行；上游基线 enwiki [oldid=1322962085](https://en.wikipedia.org/w/index.php?title=MediaWiki:Gadget-popups.js&oldid=1322962085)）。验收原则是**功能一致**，不追求逐字节一致。
- **已知偏差登记在 [docs/semantic-notes.md](./docs/semantic-notes.md)**：新增有意差异必须在该文件追加条目（差异描述 / legacy 行为 / 重写版行为 / 用户可见性 / 论据）。
- 功能清单（应然基准）见 [docs/functional-spec.md](./docs/functional-spec.md)；部署后人工验证按 [docs/smoke-test.md](./docs/smoke-test.md)。

## 来源与授权

- 本小工具源自英文维基百科站内页面 [MediaWiki:Gadget-popups.js](https://en.wikipedia.org/wiki/MediaWiki:Gadget-popups.js)，迁移基线为 [oldid=1322962085](https://en.wikipedia.org/w/index.php?title=MediaWiki:Gadget-popups.js&oldid=1322962085)。上游贡献者名单见该页面编辑历史。
- 许可证：[CC BY-SA-4.0](./LICENSE)，与英文维基百科站内文本授权一致。
- `Gadget-popups.css` 源自 [Gadget-navpop.css oldid=825269631](https://en.wikipedia.org/w/index.php?title=MediaWiki:Gadget-navpop.css&oldid=825269631)（`src/css/main.scss` 平铺部分 + `src/css/_darkmode.scss` 暗色适配）。暗色部分（16 组规则 × 3 皮肤变体）与 `.navpopup` 的 line-height、`.popupPreview td` 的 word-break 均为萌百本地专属，上游同步时勿被上游内容覆盖。

## 目录结构

```text
src/
├── entry.ts            # 入口：双载入守卫、jQuery-ready/load 分支 → boot()（唯一在模块顶层触碰 window/DOM 的模块）
├── boot.ts             # 初始化编排（legacy run.ts + init.ts 的 setupPopups）：站点查询 → 各域 setup → setupTooltips → tracker
├── state.ts            # 类型化状态容器兼 window.pg 兼容面（fn/option/string/wiki 四域）
├── core/               # 弹窗本体与通用件：popup(Navpopup 类)、structures(7 结构 + 槽注册表)、htmlout(槽写入/轮询)、
│                       #   events(链接绑定与悬停隐藏流)、drag、mousetracker、selection(选区弹窗)、
│                       #   shortcutkeys、options(98 项默认值)、strings(i18n 查表 + tprintf)、tools、log
├── title/              # title(Title/Stringwrapper、URL 与 wikitext 互转、isPopupLink)、namespaces(ns/interwiki/重定向正则)
├── net/                # downloader(裸 XHR + abort + 中止全部)、cache(URL 级缓存 + fakeDownload)
├── api/                # siteinfo(站点元数据/基址/正则装配 + mw.Api 单例)、queries(七类 API 预览 + 用户/commons 等生成器)
├── preview/            # pipeline(预览管线/重定向跟随/anchorize)、dispatch(分派 + 脚注)、previewmaker(清洗与截断)、
│                       #   insta(wiki2html 引擎)、pageinfo(8 统计过滤器)、diff(算法)、diffpreview(diff 预览渲染)、
│                       #   images(图片与文件页)、dab(消歧与红链)
├── navlinks/           # navlinks(DSL 解析 + 60 个 navlink + 7 结构槽填充器)、links(链接构造器与 pg.fn.* 实现)
├── actions/            # autoedit(编辑页 URL 协议引擎)
├── i18n/               # popupStrings(242 键萌百/繁简翻译表)
├── types/              # globals.d.ts(站点全局与 DOM 增广声明)
└── css/                # main.scss(上游平铺 + 萌百定制)、_darkmode.scss(16 组 × 三变体 mixin)
tests/                  # vitest（unit 按 src 域镜像 + integration；jsdom + 真 jQuery，coverage 100%）
scripts/                # build.js / build-css.js（构建+幂等检查）、terser-check.js（部署链等价门禁）
docs/                   # functional-spec.md（功能基准）、semantic-notes.md（偏差登记）、smoke-test.md（人工冒烟）
```

## 架构约束

1. **模块顶层零副作用**——模块顶层只做定义（含纯数据表构建与模块内注册表写入：`structures.ts` 的 7 种结构定义、`navlinks.ts`/`images.ts` 向槽填充器注册表 `registerSlotFiller` 的注册，都只写模块内状态）；**只有 `entry.ts` 在模块顶层触碰外部世界**（守卫 + `window.pg = state` + jQuery-ready 注册）。一切初始化经 ready/load 回调调用 `boot()` 显式展开。这是可测性基础（测试可直接 import 任意模块），也是与 legacy「全部代码在 DOM ready 回调内求值」等价性的来源。
2. **循环依赖白名单**——`rollup.config.js` 的 `onwarn` 对 `CIRCULAR_DEPENDENCY` 做白名单判定：环中模块全部在 `KNOWN_CYCLE_MODULES`（options/events/selection/shortcutkeys/queries/pipeline/images/pageinfo/dispatch/dab/diffpreview/links 十二个）内则放行，**任一模块越出白名单即抛错**；其余 rollup 警告一律 fatal。保留该白名单的依据是「模块顶层零副作用」约束（顶层从不求值跨模块绑定），故函数级环在运行期安全，且 preview/event 各域本就相互递归（上游原始设计）；把环全部拆掉需要在五个已定型的域之间引入注册接口，且没有运行期收益。跨域解耦仍优先走显式注册接口（`registerAbortAll`/`registerSetupPopups`/`registerModifyWatchlist`/`registerPositionChecker`/`registerTooltipScanner`/`registerSlotFiller`），**新代码不应扩大环**。
3. **状态收敛**——legacy 的 `pg` 动态域拆为各域模块级单例（`eventsState`/`optionStore`/`nsState`/`siteState`/`userState`），`window.pg` 只保留对外兼容四域（`fn`/`option`/`string`/`wiki`，函数值与模块导出引用相等）。
4. **保持 legacy 行为语义**：DOM0 事件属性接管、`setPopupHTML` 轮询重试、`javascript:` URL 菜单项、XHR 直连下载器等按原行为实现（功能一致优先，不为现代化改变行为）；legacy 的怪癖按注释「照搬勿修」保留。
5. **不可测防御按「不过度防御」删除**，不写 coverage ignore；legacy 结构性不可达的防御分支经评审后保留的，逐条配 `// istanbul ignore …` 与理由（清单见 `docs/semantic-notes.md` §B）。

## 开发与质量门禁

所有命令在**仓库根目录**执行（本包无独立 package.json，依赖与配置统一在根目录）：

```bash
npm ci                    # 安装依赖（仓库根）
npm run package:build     # 构建产物 → src/gadgets/Navigation_popups/（postCommit CI 亦自动执行并提交）
npm run package:test      # 包级门禁：JS 与 CSS 构建幂等检查 + terser-check 部署链等价门禁 + vitest 全量（coverage 100%）
npm test                  # 全仓门禁（含 eslint / stylelint / tsc，覆盖本包源码与产物）
```

门禁对应关系：

| 门禁 | 位置 | 说明 |
| --- | --- | --- |
| eslint（typescript 严集） | 根 `test:eslint` | `packages/*/src\|tests` 走 strict-type-checked + stylistic-type-checked |
| eslint（产物） | 无 | 产物不参与任何 lint（仓库 lint 忽略，构建也不检查），构建只做完整性自检 |
| stylelint（SCSS 源） | 根 `test:stylelint` | postcss-scss 语法（根配置 overrides） |
| stylelint（产物 CSS） | —（ignoreFiles 豁免） | 产物不参与 stylelint（与 prism 产物同策略），构建幂等性保证格式 |
| tsc | 根 `test:tsc` | 双 program `--noEmit` 类型检查：根 tsconfig（src/）与 `packages/tsconfig.json`（本包 src/tests；独立程序，避免根 `src/@types` 的全局声明与包内 `globals.d.ts` 冲突） |
| vitest | 根 `package:test` | jsdom + 真 jQuery；coverage 100% 阈值常开 |
| 构建幂等 | 根 `package:test` | 连续两次构建字节一致，且与磁盘产物一致 |
| terser 部署链 | 根 `package:test` | acorn es2020 parse 门 + tsc es2020 emit → terser 试压缩 |

测试事实：

- **vitest + jsdom + 真 jQuery**（非 mock，保证 `trigger("focus")` 等行为一致）。`setupFiles`（`tests/helpers/setup.ts`）先于任何 src 模块 import 装好 `wgULS`（简体直通）与 `$`；`moment` 等其余站点全局由各测试文件经 `vi.stubGlobal` 注入 node_modules 里的真 moment（`unstubGlobals: true`，测试文件间自动卸载）。`mw` 由 `tests/helpers/mockMw.ts` 的可编程工厂提供。
- 断言写法：上游运行时不变量用 `core/tools.ts` 的 `assume<T>()`（恒等函数、运行时零开销），不用 `!`（被 `no-non-null-assertion` 禁）；与上游行为冲突的规则点用**单行 scoped `eslint-disable-… -- 理由`**；理由必须写明上游行为依据，禁止无理由 disable。数量随代码演进，以 `grep -rn "eslint-disable" src/` 为准。
- 仅有的全局豁免：src 的 `no-use-before-define` 与 `camelcase`（上游自底向上的辅助函数排序与 wiki/DOM 约定标识符 1:1 保留）。**零 `@ts-ignore`/`@ts-nocheck`/`@ts-expect-error`**。

## 上游同步

同步英文维基百科上游更新时：**先读 [docs/functional-spec.md](./docs/functional-spec.md) 确定该功能在本仓的基准形态**，再用萌百代码风格把有价值的变更移植进对应 TS 模块，并在 [docs/semantic-notes.md](./docs/semantic-notes.md) 登记由此产生的偏差。注意事项：

- **萌百版相对上游有大量定制，禁止直接复制粘贴上游代码覆盖模块**。
- 上游是 31 个源文件的拼接产物，本包**不对齐**上游模块名、文件划分与加载顺序，只对齐功能。
- 提交信息与 PR 标题受仓库根 commitlint 约束（Conventional Commits）。
