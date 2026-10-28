# QuickRequest

[萌娘百科](https://zh.moegirl.org.cn/)小工具 `Gadget-QuickRequest`：统一承载全部「发帖式请求」——填表单、预览、把请求发到对应版面或讨论页。阶段 1 覆盖编辑请求（含转换表变体）、移动请求、创建请求；阶段 2 覆盖用户组申请/提名（14 个申请类型变体）；封禁申诉、删除请求等随后续里程碑并入（见 PR #1153 的方案 §6）。

源码为 TypeScript（`src/`），经 **esbuild** 打包为单文件产物，直接写入 [`src/gadgets/QuickRequest/`](../../src/gadgets/QuickRequest/)（wiki 部署读取该位置），由 postCommit CI 自动重建并提交。

> [!WARNING]
> **产物是编译生成的，请勿手改。**
> 改 `src/**/*.ts` → 根目录 `npm run package:build` → 重新生成产物。

## 功能

- **全局入口**：`window.libQuickRequest.open(type)`——edit / pageInfo 等调用方经此发起请求（与 site-lib 暴露 `window.libGetPageNames` 的做法一致）。加载方式按调用方受众选择：受众与本包一致（`rights: [edit]`）的入口（如 edit）可用静态依赖；对匿名用户也加载的入口（pageInfo）应去掉静态依赖、点击时 `mw.loader.using("ext.gadget.QuickRequest")` 按需加载——依赖链不受 rights 过滤（站内 lib 类 gadget 以 `rights: [hidden]` 靠依赖拉起即是此机制），静态依赖会把本包及其重依赖拉给全站。`open("edit")` 在转换表页面（`MediaWiki:Conversiontable/zh-*`）自动落到 `editConversiontable` 类型。
- **加载形态**：definition 为 `default: true` + `hidden: true`，与 site-js 相同——默认全站启用、不出现在偏好设置，入口可见性由各类型的 availability 与 `rights: [edit]` 控制。模块求值不发起任何 API 请求，配置页在首次 `open` 时才预取（幂等）。
- **发送流程**：填参数（必填项即时校验、组约束整组提示）→「预览」查看渲染结果 →「提交请求」。预览是叠在主对话框之上的独立对话框，「返回」只关预览、主框原样保留，可反复修改再次预览；也可展开查看待提交的 wikitext。
- **预览**：`action=parse` 带 `pst=1`，先做保存前变换（`{{subst:}}`、模板内的 `~~~~`）再解析，与真实保存后的渲染一致；`title` 传发帖目标页，`{{ARTICLEPAGENAME}}` 等页面上下文相关魔法字按目标页解析。
- **发送**：默认 `action=discussiontoolsedit` + `paction=addtopic`（requestDeletion 已验证），带 `sectiontitle` 与编辑标签 `Automation tool|QuickRequest`（需站内预先定义，部署前置事项）；成功后回读新章节锚点，提示「提交成功，3 秒后跳转」后跳到新话题，已在目标页时用 hash + reload。
- **用户组申请（阶段 2）**：`open("userGroup")` 打开「权限申请」对话框——顶部「申请类型」下拉切换 14 个变体（维护姬 / 管理员 / 用户查核员 / 监督员 / 界面管理员 / 机器人（含追加任务、机器用户）/ 文件维护员 / 优质编辑者、技术编辑员、荣誉维护人员、IP封禁豁免者、手动确认用户），映射 7 个基模板（`Template:权限申请/*`）。发帖走 **append 模式**（`action=edit` + `appendtext`）：申请族模板的正文以 `== X申请 - User:{{subst:REVISIONUSER}} ==` 开头、标题由模板在存盘替换时生成，addtopic 的 sectiontitle 会再叠一层标题造成重复——append 只追加正文，与现行入口 `section=new&nosummary=1`（隐藏标题框，MediaWiki 因此不写标题行）的保存结果一致。入口为权限变更版（`萌娘百科_talk:讨论版/权限变更`）页面的 p-cactions「发起权限申请」（与页顶模板渲染的现行按钮并存，替换需站内配合，列入部署前置事项）；可用性沿用现行申请按钮的守卫：已登录 + 自动确认用户。站内无辞职模板（辞职历来是自由发帖），本类型只覆盖申请/提名。
- **提交前确认**：edit 类型带方针修改提醒（editRequestWarning 的迁移）——当前页属于「萌娘百科方针 / 萌娘百科指引」分类（读 `mw.config` 的 `wgCategories`，零请求）且用户不在跳过名单（patroller / sysop / techeditor / interface-admin / staff）时，主对话框打开即以横幅提示，提交前再逐条确认。
- **失败处理**：登录失效、限流、页面保护、滥用过滤器等给出中文说明，可在同一对话框内「重试」，已填内容不丢。
- **签名**：不外部追加——各模板以 `sign` 参数的缺省值输出 `——~~~~`。

## 配置

### 请求类型（`MediaWiki:Gadget-QuickRequest.json`）

类型的内容配置由站内 JSON 页提供，内容即仓库里的 [`Gadget-QuickRequest.json`](../../src/gadgets/QuickRequest/Gadget-QuickRequest.json)（随小工具一同部署）：

```json
{
    "types": {
        "edit": {
            "template": "Template:编辑请求",
            "requireAnyOf": ["original", "new"],
            "parameters": [
                { "key": "original", "label": "需要删除/修改的旧内容", "type": "multiline" },
                { "key": "new", "label": "需要新增/修改后的内容", "type": "multiline" },
                { "key": "reason", "label": "修改原因", "type": "text" }
            ]
        }
    }
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `types.<id>.template` | 与 `variants` 至少一项 | **可传参的基模板**页名，如 `Template:编辑请求`。`编辑请求/comment`、`移动请求预载` 等预载脚手架不接受外部传参，不可用于此 |
| `types.<id>.parameters[].key` | 是 | 模板参数名；纯数字键（如 `1`）映射为模板位置参数 |
| `types.<id>.parameters[].label` | 是 | 界面上显示的字段名 |
| `types.<id>.parameters[].type` | 否 | `page`（标题联想）/ `user`（用户名联想）/ `multiline`（多行）/ `text`（单行，缺省） |
| `types.<id>.parameters[].required` | 否 | 是否必填，缺省 `false` |
| `types.<id>.parameters[].auto` | 否 | `currentPage`：打开时自动填入当前页面名（取代旧的 `preloadparams[]`/`$1` 预填） |
| `types.<id>.parameters[].default` | 否 | 初始值，缺省为空 |
| `types.<id>.requireAnyOf` | 否 | 组约束：所列键至少填一项。edit 的 `original`/`new` 用它表达「仅删除 / 仅新增 / 修改」三态（模板仅在全空时报错）；只保留真实存在的键 |
| `types.<id>.fixedParams` | 否 | 固定参数：每次调用都带上、不在表单中展示（值同样做顶层管道转义） |
| `types.<id>.variants[]` | 否 | 同型多模板变体（userGroup 用）：存在时表单顶部出现「申请类型」下拉，类型级 `template`/`parameters`/`requireAnyOf` 不再使用 |
| `types.<id>.variants[].id` | 是 | 变体 id，类型内唯一（重复 id 只保留首个） |
| `types.<id>.variants[].label` | 是 | 变体下拉框显示名 |
| `types.<id>.variants[].template` | 是 | 该变体的基模板页名 |
| `types.<id>.variants[].parameters` / `requireAnyOf` / `fixedParams` | 否 | 语义同类型级字段，按变体各自校验（`requireAnyOf` 按变体自身参数过滤） |

值为空的参数不会写进模板调用（不产生 `|key=`）；固定参数先于用户参数输出。校验不通过的条目（含变体）会被静默丢弃；整页解析失败或一个合法类型都没有时，点入口会提示配置读取失败。

## 目录结构

```text
src/
├── index.ts           # 全局入口 window.libQuickRequest、登录守卫、主/预览对话框编排与配置失败归因
├── constants.ts       # 配置页名、对话框尺寸与高度上限、change tag、目标版面、转换表/方针分类/跳过名单常量、标题后缀
├── types.ts           # 配置/参数/类型定义、对话框数据与关闭结果、window 增广（QuickRequest / libQuickRequest）
├── errors.ts          # 错误码 → 中文说明（含防滥用过滤器分支）、从 reject 载荷取服务端 info
├── api.ts             # mw.Api 惰性单例；读取页面 wikitext 与分类、parse 预览（pst=true）
├── config.ts          # 配置页 JSON 的校验/合并/预取（幂等）、组约束判断、按 id 取类型条目
├── wikitext.ts        # 拼模板调用（固定参数 + 用户参数，顶层管道转义）、subst 改写（预览与发送共用的唯一变换点）
├── fields.ts          # 参数控件工厂（page/user/multiline/text）、取值、必填校验（仅在有效性翻转时动 DOM）
├── registry.ts        # 请求类型注册表（目标版面、章节标题、发帖方式、方针提醒）、转换表特例的 id 解析、上下文收集
├── entries.ts         # 自有入口挂载（权限变更版「发起权限申请」；阶段 3-5 在此追加）
├── openWindow.ts      # 独立 WindowManager 挂载对话框，关闭后清理并回调（嵌套弹窗的前提）
├── messageDialog.ts   # 通用消息框、「关闭」错误提示、「关闭/重试」确认、「返回修改/继续提交」确认
├── send.ts            # addtopic 发帖与 append 追加发帖（多参 reject 取错误码）、回读新章节锚点、跳转
├── mainDialog.ts      # 主对话框：发至展示、申请类型下拉（变体）、参数区、组约束提示、开框确认横幅、编辑摘要、校验与预览请求
├── previewDialog.ts   # 预览对话框：渲染 HTML、折叠 wikitext、提交前确认、发送/重试、提交中按钮态
└── oo.d.ts            # 类型补充：mw.widgets 的两个输入框、OO.ui.ProcessDialog.$body
tests/
├── wikitext.test.ts   # 模板调用拼装（含固定参数）、subst
├── config.test.ts     # 配置校验/丢弃/覆盖合并/变体、组约束
└── setup.ts           # wgULS 直通实现（node 环境没有 site-lib，且 errors.ts 的文案表在模块求值时调用它）
scripts/build.js       # esbuild 打包 + 完整性自检 + 幂等检查
vitest.config.ts       # vitest 配置（node 环境，覆盖率只统计 wikitext.ts 与 config.ts）
```

## 构建与门禁

依赖统一由仓库根目录管理，本包不设独立 package.json：

```bash
npm run package:build   # 构建产物 → src/gadgets/QuickRequest/（postCommit CI 亦自动执行并提交）
npm run package:test    # 构建幂等检查 + 单元测试（vitest）
npm test                # 全仓门禁（eslint / stylelint / tsc 覆盖本包源码与测试；产物不参与 lint）
```

- 打包器与 [UserMessages](../UserMessages/scripts/build.js) 同款：esbuild `bundle` + `format: "esm"` + `target: "es2020"` + `minifySyntax`，产物不压缩（压缩交给界面库部署侧的 terser）；`charset: "utf8"` 保留中文字面量，`banner` 带 `"use strict"`。
- 类型来自 `@types/oojs-ui`（列在 `packages/tsconfig.json` 的 `types` 里）、`types-mediawiki`，以及仓库共享的 [`src/@types/site-lib.d.ts`](../../src/@types/site-lib.d.ts)（`wgULS` / `libPrefixNumber` / `libGetPageNames`）。包内 `oo.d.ts` 只声明这两个类型包没收录的 `mw.widgets.TitleInputWidget` / `UserInputWidget` 与 `OO.ui.ProcessDialog.$body`。
- 产物由 `src/gadgets/QuickRequest/.eslint-exemptions.yaml` 排除在 lint 之外；`Gadget-QuickRequest.json`（手工维护，非构建产物）登记在 `scripts/buildPackages/exclusions.yaml`。包内不写行内 `eslint-disable`：与 jQuery Promise / OOUI 打交道的三条规则在 `eslint.config.js` 里对 `packages/QuickRequest/src` 整目录关闭（与 UserMessages 相同）。
- 单元测试只覆盖 `src/wikitext.ts` 与 `src/config.ts` 的纯逻辑：模板调用拼装（空值省略、固定参数）、`{{` → `{{subst:`、配置校验/丢弃/覆盖合并/变体、组约束。其余模块要完整的 OOUI / `mw.Api` 运行时，不在单测范围内；覆盖率报告写到 `.cache/coverage/QuickRequest`（已 gitignore）。
