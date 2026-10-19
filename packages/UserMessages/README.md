# UserMessages

[萌娘百科](https://zh.moegirl.org.cn/) 小工具 `Gadget-UserMessages`：在用户页、用户讨论页与指定特殊页挂「向用户发送提醒」入口，选模板、填参数、预览后把提醒发到对方讨论页。

源码为 TypeScript（`src/`），经 **esbuild** 打包为单文件产物，直接写入 [`src/gadgets/UserMessages/`](../../src/gadgets/UserMessages/)（wiki 部署读取该位置），由 postCommit CI 自动重建并提交。

> [!WARNING]
> **产物是编译生成的，请勿手改。**
> 改 `src/**/*.ts` → 根目录 `npm run package:build` → 重新生成产物。

## 功能

- **入口**：`p-cactions` 的「向用户发送提醒」。命名空间 2（User）、3（User talk），以及特殊页 `Special:Contributions`、`DeletedContributions`、`Block`、`Log`；取不到目标用户时不挂入口。
- **发送流程**：选择模板 → 填写参数（必填项即时校验）→「预览」查看渲染结果 →「发送提醒」。
- **预览**：`action=parse` 带 `pst=1`，先做保存前变换（`{{subst:}}`、`~~~~`）再解析，与真实保存后的渲染一致。预览是叠在主对话框之上的独立对话框，「返回」只关预览、主框原样保留；也可展开查看待提交的 wikitext。
- **自定义内容**：勾选后拉取所选模板的源码（去掉 `<noinclude>` / `<includeonly>`）直接改写；该模式不加 `subst:`，签名、摘要、预览与发送不变。
- **发送**：向 `User talk:<用户名>` 追加新章节（`section=new` + 空 `sectiontitle`，避免与模板自带标题重复），正文末尾自动补签名，并带上编辑标签 `Automation tool|UserMessages`。
- **发送后**：回读该修订最后一个章节的锚点，提示「发送成功，3 秒后跳转」，随后跳到新章节；已在目标讨论页时用 hash + reload，否则直接跳转。
- **失败处理**：登录失效、限流、页面保护、滥用过滤器等给出中文说明，可在同一对话框内「重试」，已填内容不丢。
- **记忆**：上次选择的模板与编辑摘要存在 `localStorage`（键 `usermessages-state`）。

## 配置

### 模板列表（`MediaWiki:Gadget-UserMessages.json`）

模板由站内 JSON 页提供，内容即仓库里的 [`Gadget-UserMessages.json`](../../src/gadgets/UserMessages/Gadget-UserMessages.json)（随小工具一同部署）：

```json
{
    "templates": [
        {
            "title": "欢迎",
            "template": "Template:UserMessages/Welcome",
            "summary": "Welcome to Moegirlpedia~",
            "parameters": []
        },
        {
            "title": "可收录页面打回",
            "template": "Template:UserMessages/MovedToUserSubpage",
            "summary": "页面打回通知",
            "parameters": [
                { "key": "1", "label": "页面名", "type": "page", "required": true },
                { "key": "2", "label": "原因", "type": "multiline", "required": true }
            ]
        }
    ]
}
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | 是 | 下拉列表里显示的名字 |
| `template` | 是 | 模板页名，如 `Template:UserMessages/Welcome` |
| `summary` | 否 | 选中该模板时自动填入的编辑摘要 |
| `parameters[].key` | 是 | 模板参数名，如 `1` |
| `parameters[].label` | 是 | 界面上显示的字段名 |
| `parameters[].type` | 否 | `page`（标题联想）/ `user`（用户名联想）/ `multiline`（多行）/ `text`（单行，缺省） |
| `parameters[].required` | 否 | 是否必填，缺省 `false` |
| `parameters[].default` | 否 | 初始值，缺省为空 |

值为空的参数不会写进模板调用（不产生 `|key=`）。校验不通过的条目会被静默丢弃；整页解析失败或一个合法模板都没有时，点入口会提示配置读取失败。

### 用户级配置（`window.UserMessages`）

```js
window.UserMessages = {
    // 追加在预置模板之后；title 与预置重名时覆盖预置项
    templates: [
        { title: "提醒", template: "Template:UserMessages/Reminder", summary: "提醒", parameters: [] },
    ],
    // 正文末尾的签名，缺省 " ——~~~~"；传空串表示不加签名
    signatureSuffix: " ——~~~~",
};
```

## 目录结构

```text
src/
├── index.ts           # 入口：命名空间守卫、入口链接、主/预览对话框的编排与配置失败归因
├── constants.ts       # 配置页名、storage 键、对话框尺寸与高度上限、允许的命名空间/特殊页、默认签名、talkPageTitle
├── types.ts           # 配置/模板/参数类型、window.UserMessages 增广、两个对话框的打开数据与关闭结果、发送结果
├── errors.ts          # 错误码 → 中文说明（含防滥用过滤器分支）、从 reject 载荷取服务端 info
├── api.ts             # mw.Api 单例；读取页面 wikitext、parse 预览（pst=true）
├── config.ts          # 配置页 JSON 的校验/合并/预取（幂等），window.UserMessages.templates 与签名覆盖
├── storage.ts         # localStorage 读写（上次模板与编辑摘要），失败静默
├── wikitext.ts        # 拼模板调用、subst 改写、去 noinclude、拼签名（预览与发送共用的唯一变换点）
├── fields.ts          # 参数控件工厂（page/user/multiline/text）、取值、必填校验（仅在有效性翻转时动 DOM）
├── openWindow.ts      # 独立 WindowManager 挂载对话框，关闭后清理并回调（嵌套弹窗的前提）
├── messageDialog.ts   # 通用消息框、「关闭」错误提示、「关闭/重试」确认
├── send.ts            # 发送新章节（多参 reject 取错误码）、回读新章节锚点、拼/跳新章节 URL
├── mainDialog.ts      # 主对话框：模板下拉、自定义内容、参数区、编辑摘要、校验与预览请求
├── previewDialog.ts   # 预览对话框：渲染 HTML、折叠 wikitext、发送/重试、发送中按钮态
└── oo.d.ts            # 类型补充：mw.widgets 的两个输入框、OO.ui.ProcessDialog.$body
tests/
└── wikitext.test.ts   # 单元测试：模板调用拼装、subst、noinclude/includeonly、签名
scripts/build.js       # esbuild 打包 + 完整性自检 + 幂等检查
vitest.config.ts       # vitest 配置（node 环境，覆盖率只统计 wikitext.ts）
```

## 构建与门禁

依赖统一由仓库根目录管理，本包不设独立 package.json：

```bash
npm run package:build   # 构建产物 → src/gadgets/UserMessages/（postCommit CI 亦自动执行并提交）
npm run package:test    # 构建幂等检查 + 单元测试（vitest）
npm test                # 全仓门禁（eslint / stylelint / tsc 覆盖本包源码与测试；产物不参与 lint）
```

- 打包器与 [JSONViewer](../JSONViewer/scripts/build.js) 同款：esbuild `bundle` + `format: "esm"` + `target: "es2020"` + `minifySyntax`，产物不压缩（压缩交给界面库部署侧的 terser）；`charset: "utf8"` 保留中文字面量，`banner` 带 `"use strict"`。
- 类型来自 `@types/oojs-ui`（列在 `packages/tsconfig.json` 的 `types` 里）、`types-mediawiki`，以及仓库共享的 [`src/@types/site-lib.d.ts`](../../src/@types/site-lib.d.ts)（`wgULS`）。包内 `oo.d.ts` 只声明这两个类型包没收录的 `mw.widgets.TitleInputWidget` / `UserInputWidget` 与 `OO.ui.ProcessDialog.$body`。
- 产物由 `src/gadgets/UserMessages/.eslint-exemptions.yaml` 排除在 lint 之外。包内不写行内 `eslint-disable`：与 jQuery Promise / OOUI 打交道的三条规则（`promise/prefer-await-to-then`、`@typescript-eslint/use-unknown-in-catch-callback-variable`、`@typescript-eslint/no-unnecessary-type-parameters`）在 `eslint.config.js` 里对 `packages/UserMessages/src` 整目录关闭。
- 单元测试只覆盖 `src/wikitext.ts` 的纯字符串变换：模板调用拼装（空值省略）、`{{` → `{{subst:`、`<noinclude>` / `<includeonly>` 剥离、签名拼接。其余模块要完整的 OOUI / `mw.Api` 运行时，不在单测范围内；覆盖率报告写到 `.cache/coverage/UserMessages`（已 gitignore）。
