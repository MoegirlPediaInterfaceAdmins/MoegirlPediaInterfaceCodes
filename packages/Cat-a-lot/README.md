# Cat-a-lot

[萌娘百科](https://zh.moegirl.org.cn/) 小工具 `Gadget-Cat-a-lot` 的源码包：在分类页、文件列表与受支持的特殊页上批量添加、复制、移动或移除分类。

源码为 **TypeScript + Vue SFC**（`src/`），经仓库根目录的 **esbuild** 打包为单文件产物；构建产物不进入仓库。Vue 与 Codex 仍由 ResourceLoader 提供，不打包进小工具。

> [!NOTE]
> **产物由源码编译生成。** 修改请在 `src/` 内进行，本地在仓库根目录执行 `npm run package:build` 重新生成并验证。

## 功能

- **选择页面**：在分类页、`Special:Search`、`Special:Listfiles`、`Special:Uncategorizedfiles`、`Special:Uncategorizedpages`、`Special:Unusedfiles`、`Special:Mostlinkedcategories`、`Special:Prefixindex` 的浏览模式下，为列表/表格中的页面或文件加可点击标签；支持单击、Shift 范围选择、全选/清空。
- **分类树**：当前分类的父分类/子分类列表；父分类、子分类可点击导航；子分类数量由偏好控制；没有 `categorymembers` 权限时给出提示，但仍可手动输入目标分类。
- **搜索建议**：`action=opensearch`（POST）按 `namespace=14` 推荐分类，支持键盘上下选择与 Enter。
- **批量操作**：增加、复制、移动、移除分类；移动/移除只改分类链接，保留原 sortkey；同一分类移动为 no-op。
- **安全与冲突**：目标分类在批处理前和逐页计算时校验；编辑带 `basetimestamp` / `starttimestamp`；响应不确定时回读页面确认是否已提交；API 请求 30 秒超时，Stop 会中断当前请求和页面间延迟。
- **偏好**：监视列表行为、标记小编辑、允许非文件页面与子分类、子分类显示上限；面板高度持久化。
- **权限与速率**：普通用户单次最多 50 页、每页间隔 20 秒；`bot` / `flood` 用户组无此限制；sysop/staff 批次超过 10 页时可自授权 2 小时临时机器用户，结束后自动撤销。
- **标签**：普通用户使用 `Cat-a-lot`；`bot` / `flood` 用户组使用 `Cat-a-lot|Bot` 并同时提交 `bot=1`。
- **编辑摘要**：页面编辑摘要与临时机器用户的 `userrights` 理由固定使用简体中文，不随界面语言变体转换。
- **界面**：Vue + Codex 组件，支持 Vector 2022 / MoeSkin 浅色与深色模式；设置/折叠按钮使用 Codex 图标；初始停靠位置可通过配置设为右下角（默认）或左下角。

## 配置

### 用户级配置（`window.CatALotPrefs`）

可在个人 JS 中覆盖以下字段（会被校验/限制范围）：

```js
window.CatALotPrefs = {
    // preferences | nochange | watch | unwatch
    watchlist: "preferences",
    // 是否把编辑标记为小编辑
    minor: false,
    // 是否允许对非文件页面（含子分类）执行分类操作
    editpages: true,
    // 分类树中最多显示的子分类数（1–500）
    subcatcount: 50,
    // 初始选项卡位置：bottom-right（默认，右下角）| bottom-left（左下角）
    position: "bottom-right",
};
```

`position` 决定页面加载时选项卡的初始停靠位置，默认 `bottom-right`（右下角）；设为 `bottom-left` 时停靠在左下角。非法值回退默认值，该字段随其他偏好写入本地存储。

本地存储键：

- `ext.gadget.Cat-a-lot-prefs`：上述偏好；
- `ext.gadget.Cat-a-lot-height`：面板高度（260–760）。

### 加载权限

`definition.yaml` 保留 `rights: [autopatrol]`，即只有拥有 `autopatrol` 权限的用户才会加载本小工具。这是既有设计，不在本包内调整站点权限模型。

## 目录结构

```text
src/
├── index.ts              # 入口：站点守卫、$.ready、挂载
├── CatALot.vue           # Vue SFC：template + 极薄 script
├── app.ts                # defineComponent、setup、Codex 组件注册
├── runtime.ts            # mw.loader.require("vue"/"@wikimedia/codex") 运行时边界
├── components.d.ts       # Codex 组件的 GlobalComponents 声明（供 vue-tsc）
├── state.ts              # 响应式 UI 状态、方法、computed
├── batch.ts              # 批处理会话：预留、权限、循环、停止、结果
├── api.ts                # mw.Api 封装（全部 POST + 超时 + abort）
├── prefs.ts              # 偏好默认值、校验、读写、高度
├── wikitext.ts           # 分类规范化/校验/正则/增删改
├── selection.ts          # 目标链接收集、选择、清理
├── localization.ts       # uls、文本安全 notify、错误格式化
├── icons.ts              # Codex 图标路径
├── constants.ts          # 存储键、限制、class 名、标签、特殊页
├── types.ts              # 共享类型
├── globals.d.ts          # Window.CatALotPrefs、*.css
└── index.css             # 小工具样式（由 postcss 链处理）
tests/                    # vitest（jsdom）
scripts/
├── build.js              # esbuild + 产物门禁 + 幂等检查
└── vueSfcPlugin.js       # 基于 vue/compiler-sfc 的包内 SFC 插件
```

## Vue SFC 与工具链

- 模板放在 `CatALot.vue`，由 `vue-tsc` 检查模板/脚本，由 `eslint-plugin-vue` 的 `flat/essential` 规则 lint。
- **样式不放 SFC `<style>`**：继续使用 `src/index.css`，以保留仓库的 PostCSS / Stylelint 覆盖；SFC 中出现 `<style>` 会让构建直接报错。
- SFC 构建是包内 `vueSfcPlugin.js`：用 `vue/compiler-sfc` 预编译模板，并把生成的 Vue helper 导入改写为从 `runtime.ts` 的 `mw.loader.require("vue")` 取值，构建产物里不会出现静态 `import ... from "vue"`，也不会把 Vue 打包进去。
- Codex 组件在模板中是全局组件；`components.d.ts` 声明 `GlobalComponents`，具体 props/事件以实际 Codex 版本为准。

## 构建与测试

依赖统一由仓库根目录管理，本包不设独立 `package.json`：

```bash
npm run package:build                         # 构建本包产物到 dist/（不入库）
node packages/Cat-a-lot/scripts/build.js      # 只构建本包
node packages/Cat-a-lot/scripts/build.js --check-idempotent
npx vue-tsc -p packages/tsconfig.json --noEmit
npx vitest run --coverage --root packages/Cat-a-lot
npm run package:test                          # 全包构建幂等 + 单测
```

## 已知限制

- 分类链接匹配不解析 `<nowiki>` / 注释：若页面在注释或 nowiki 中写了同名分类，仍可能被匹配。这是当前实现与上游简化实现的共同限制。
- SFC 不承载 scoped 样式；样式统一由 `index.css` 和仓库 PostCSS 链处理。
- Codex 图标来自 Codex 图标集（GPL-2.0-or-later），线上没有 `@wikimedia/codex-icons` 模块，因此只内联本包用到的 `path`。
