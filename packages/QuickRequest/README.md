# QuickRequest

[萌娘百科](https://zh.moegirl.org.cn/)小工具 `Gadget-QuickRequest`：统一承载全部「发帖式请求」——填表单、预览、把请求发到对应版面或讨论页。阶段 1 覆盖编辑请求（含转换表变体）、移动请求、创建请求；阶段 2 覆盖用户组申请/提名（14 个申请类型变体）；阶段 3 覆盖封禁申诉；阶段 4 将 requestDeletion 并入为删除请求（zh 站与共享站）；阶段 5 覆盖反破坏举报申请、用户查核记录、技术编辑请求（见 PR #1153 的方案 §6）。

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
- **封禁申诉（阶段 3）**：封禁提示屏（`MediaWiki:Blockedtext*` → `Template:BlockedUserHelp`，服务端渲染 `<div id="BlockedUserHelp">`）上追加「寻求帮助」按钮。点击时以现行 `Widget:BlockedUserHelp` 的同一条查询（`list=users&usprop=blockinfo`）现查封禁详情，按其逐字格式拼出「封禁信息」文本，经 `open("banAppeal", { 1: 封禁信息 })` 预填进只读字段；用户只填「求助理由」。正文模板 `Template:BlockedUserHelp/request` 同样以 `== 用户被封禁而寻求帮助 ==` 开头（标题由模板生成），故发帖走 **append 模式**，目标为 `User_talk:<用户名>`——新用户的讨论页可能不存在，append 以 `allowCreate` 放开 `nocreate`，与现行 `section=new` 直接建页的行为一致。现行 Widget 注入的同名表单与本按钮并存，替换需站内配合（去掉模板里的 `{{#Widget:BlockedUserHelp}}`），列入部署前置事项。
- **删除请求（阶段 4，requestDeletion 并入）**：`open("delete")` 打开「请求删除」对话框——理由下拉（选项打开时从 `MediaWiki:Filedelete-reason-dropdown`（File 命名空间）/ `MediaWiki:Deletereason-dropdown` 的渲染 HTML 解析，失败降级为只有「其他」）+ 详情 + 批量提删（勾选后展开页面清单，一行一个；仅持有 autopatrol 权限的用户可见）+「按回车提交」偏好（持久化到 LocalObjectStorage，读取时回退旧 `AnnTools-requestDeletion` 键）。正文为手工拼装的纯文本（非模板调用，走程序化表单、不经配置页），标题「请求删除页面:[[页面]] - 用户 - 日期」/批量「批量删除请求 - 用户 - 日期」，格式与旧工具逐字一致；批量清单解析（`cm:`/`zhmoe:` 前缀分流、去重、非法行报错）与重定向检测（按站点分批查询，重定向页以 `{{NoRedirectLink}}` 链接）在预览前完成。入口为 p-cactions「提出删除请求」（zh 站与共享站相同），守卫沿用旧工具：页面已存在且非特殊命名空间、讨论版各级版面自身与已挂 `{{will2Be2Deleted}}` 的页面不显示、巡查员/管理员默认不显示（`?AnnTools-debug=requestDeletion` 调试开关保留）。共享站发起时发帖至主站版面：被申请删除的页面名自动加 `cm:` 前缀，预览解析、发帖、锚点回读经 `mw.ForeignApi` 在主站执行，成功后跳转带主站基址；编辑标签随之从旧工具的 `Automation tool` 换为 `Automation tool|QuickRequest`（部署前置事项）。
- **反破坏举报申请（阶段 5）**：`open("vandalReport", { 1: 用户名 })`——收位置参数 1=被举报者用户名、2=申请理由。正文模板 `Template:编辑请求/反破坏举报申请` 以 `==提请将[[User:…]]列入破坏者列表==` 开头（标题由模板生成），走 **append 模式**。入口为用户页/用户讨论页的 p-cactions「反破坏举报申请」，被举报者按 `wgRelevantUserName` 预填（子页面亦指向页面主人，可改填为分身等），仅巡查员/管理员可见（Abuse 认定按反破坏方针在维护组内讨论，提请属巡查/维护动作）。发帖版面缺省 `萌娘百科_talk:长期破坏者`——模板 doc 标注「目前是」，实际以配置页 `targetPage` 为准。
- **用户查核记录（阶段 5）**：`open("checkuserRecord")`——收 日期/申请者/执行人/被查核对象/事由/结果/备注 命名参数。正文模板 `Template:编辑请求/用户查核记录` 以 `== 新增查核记录 - … ==` 开头（标题含 subst 魔法字、存盘时替换），走 **append 模式**，发到记录页的讨论页（`萌娘百科_talk:用户查核记录`——记录页自身受 patrolleredit 保护，真实话题均在讨论页）。入口为记录页及其讨论页的 p-cactions「新增查核记录」，仅查核员可见。
- **技术编辑请求（阶段 5）**：`open("editTech")`——收 sandbox / test（选填）/ reason。正文模板 `Template:编辑请求/技术` 不带章节标题（区别于其余编辑请求族变体），走 addtopic，章节标题沿用版面既有的「编辑请求 - 用户 - 日期」（真实用例核实）。入口由 pageInfo 在技术页面（模板命名空间或 JS/CSS/JSON 内容模型）的保护信息里、普通编辑请求旁追加「提出技术编辑请求」。
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
| `types.<id>.parameters[].auto` | 否 | `currentPage`：打开时自动填入当前页面名（取代旧的 `preloadparams[]`/`$1` 预填）；只预填、不意味着只读（move 的 `new` 预填后仍可改） |
| `types.<id>.parameters[].readOnly` | 否 | 只读：不让用户改动（如封禁申诉的封禁信息、move 隐藏的 `original`），缺省 `false`；须显式声明，与 `auto` 无绑定 |
| `types.<id>.parameters[].hidden` | 否 | 隐藏：字段不在表单渲染，值仍按预填/自动派生规则并入提交（move 的 `original`——对齐原生移动不显示源页面名），缺省 `false` |
| `types.<id>.parameters[].hint` | 否 | 字段说明，展示为标签旁的帮助图标；缺省不展示 |
| `types.<id>.parameters[].default` | 否 | 初始值，缺省为空；入口预填（preset）的优先级高于它（也高于 `auto`） |
| `types.<id>.requireAnyOf` | 否 | 组约束：所列键至少填一项。edit 的 `original`/`new` 用它表达「仅删除 / 仅新增 / 修改」三态（模板仅在全空时报错）；只保留真实存在的键 |
| `types.<id>.fixedParams` | 否 | 固定参数：每次调用都带上、不在表单中展示（值原样输出，不做管道转义——预览为强制步骤，含管道的输入若拆参在预览可见，用户自行修正；客户端改写反而会破坏 nowiki / pre 等合法输入） |
| `types.<id>.targetPage` | 否 | 发帖目标页，设置时优先于代码里的目标版面/页（vandalReport 的版面在其模板 doc 标注「目前是」，故做成配置项；其余类型的目标页是稳定约定，留在代码里） |
| `types.<id>.variants[]` | 否 | 同型多模板变体（userGroup 用）：存在时表单顶部出现「申请类型」下拉，类型级 `template`/`parameters`/`requireAnyOf` 不再使用 |
| `types.<id>.variants[].id` | 是 | 变体 id，类型内唯一（重复 id 只保留首个） |
| `types.<id>.variants[].label` | 是 | 变体下拉框显示名 |
| `types.<id>.variants[].template` | 是 | 该变体的基模板页名 |
| `types.<id>.variants[].parameters` / `requireAnyOf` / `fixedParams` | 否 | 语义同类型级字段，按变体各自校验（`requireAnyOf` 按变体自身参数过滤） |

值为空的参数不会写进模板调用（不产生 `|key=`）；固定参数先于用户参数输出。校验不通过的条目（含变体）会被静默丢弃；整页解析失败或一个合法类型都没有时，点入口会提示配置读取失败。

以上是**配置页类型**的字段。删除请求（delete）走**程序化表单**、不经配置页：字段与正文/标题构建写在代码里（`src/deleteContent.ts`），可使用配置页暂不提供的控件与行为属性——`dropdown`（选项经 `options` 动态提供）、`checkbox`（值为 `"1"`/空）、`placeholder`（占位提示）、`visibleIf`（按另一字段的值显隐，隐藏字段不参与校验）、`storageKey`（值持久化到 LocalObjectStorage 而不进入正文）、`enterSubmits`（回车触发预览，偏好开启时生效）。

## 目录结构

```text
src/
├── index.ts           # 全局入口 window.libQuickRequest、登录守卫、主/预览对话框编排与配置失败归因
├── constants.ts       # 配置页名、对话框尺寸与高度上限、change tag、目标版面、转换表/方针分类/跳过名单常量、标题后缀
├── types.ts           # 配置/参数/类型定义、对话框数据与关闭结果、window 增广（QuickRequest / libQuickRequest）
├── errors.ts          # 错误码 → 中文说明（含防滥用过滤器分支）、从 reject 载荷取服务端 info
├── api.ts             # mw.Api 惰性单例；目标站 API 选择（ForeignApi 单例）、读取页面 wikitext、parse 预览（pst=true）
├── blockInfo.ts       # 封禁信息：list=users&usprop=blockinfo 查询与封禁信息文本拼装（格式逐字沿用现行 Widget）
├── deleteContent.ts   # 删除请求：批量清单解析/重定向检测/正文与标题拼装、理由下拉解析、表单字段构建（程序化表单）
├── storage.ts         # 持久偏好（LocalObjectStorage，QuickRequest 键；读取回退旧 requestDeletion 键）
├── config.ts          # 配置页 JSON 的校验/合并/预取（幂等）、组约束判断、按 id 取类型条目
├── wikitext.ts        # 拼模板调用（固定参数 + 用户参数，值原样不做转义）、subst 改写（预览与发送共用的唯一变换点）
├── fields.ts          # 参数控件工厂（page/user/multiline/text）、取值、必填校验（仅在有效性翻转时动 DOM）
├── registry.ts        # 请求类型注册表（目标版面/页、章节标题、发帖方式、目标站点、方针提醒）、转换表特例的 id 解析、上下文收集
├── entries.ts         # 自有入口挂载（权限变更版「发起权限申请」、封禁提示屏「寻求帮助」、「提出删除请求」、用户页「反破坏举报申请」、查核记录页「新增查核记录」）
├── openWindow.ts      # 独立 WindowManager 挂载对话框，关闭后清理并回调（嵌套弹窗的前提）
├── messageDialog.ts   # 通用消息框、「关闭」错误提示、「关闭/重试」确认、「返回修改/继续提交」确认
├── send.ts            # addtopic 发帖与 append 追加发帖（多参 reject 取错误码、按目标站选 API）、回读新章节锚点、跳转（跨站带基址）
├── mainDialog.ts      # 主对话框：发至展示、申请类型下拉（变体）、程序化表单路径、字段显隐与持久偏好、组约束提示、开框确认横幅、编辑摘要、校验与预览请求
├── previewDialog.ts   # 预览对话框：渲染 HTML、折叠 wikitext、提交前确认、发送/重试、提交中按钮态
└── oo.d.ts            # 类型补充：mw.widgets 的两个输入框、OO.ui.ProcessDialog.$body
tests/
├── wikitext.test.ts   # 模板调用拼装（含固定参数、封禁信息内链管道）、subst
├── config.test.ts     # 配置校验/丢弃/变体、组约束
├── blockInfo.test.ts  # 封禁信息文本拼装（现行 Widget 逐字格式、限期/无限期、未封禁判空）
├── deleteContent.test.ts # 删除请求正文/标题拼装、批量清单解析与去重/非法行报错、重定向信息归并
├── registry.test.ts   # move 的移动到自身校验（同名/下划线空格/首字母大小写/放行）、阶段 5 类型注册（可见性/目标页/append）
└── setup.ts           # wgULS / libPrefixNumber 直通实现（node 环境没有 site-lib，且 errors.ts 的文案表在模块求值时调用它）
scripts/build.js       # esbuild 打包 + 完整性自检 + 幂等检查
vitest.config.ts       # vitest 配置（node 环境，覆盖率只统计四个纯逻辑模块）
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
- 单元测试只覆盖纯逻辑：`src/wikitext.ts`（模板调用拼装——空值省略、固定参数；`{{` → `{{subst:`）、`src/config.ts`（校验/丢弃/变体、组约束、targetPage）、`src/blockInfo.ts`（封禁信息拼装）、`src/deleteContent.ts`（删除请求正文/标题/批量清单解析）与 `src/registry.ts`（类型级校验与阶段 5 注册记录）。其余模块要完整的 OOUI / `mw.Api` 运行时，不在单测范围内；覆盖率报告写到 `.cache/coverage/QuickRequest`（已 gitignore）。
