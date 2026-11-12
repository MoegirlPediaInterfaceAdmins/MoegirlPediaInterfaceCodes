# MoeUpload

MediaWiki `Special:Upload` 的纯前端替换方案。脚本在原生上传页接管 DOM，渲染 React 应用，提供批量上传体验；主站则通过弹窗入口上传到共享站。产物只有 JS + CSS，不涉及任何 PHP，作为站点 Gadget 运行。

代码按 React 18 API 编写，构建时经 `preact/compat` 运行在 Preact 上。产物不自行加载 ResourceLoader 模块，所需的 `mw.Api`、`mw.util`、OOUI 样式与站点联想组件由宿主 Gadget 预加载。

## 功能

- **批量上传**：拖拽、多选、`Ctrl/Cmd+V` 粘贴；队列缩略图、逐文件状态机、失败重试
- **文件类型白名单**：仅允许图片/音频/视频扩展名，白名单外的拖入与粘贴即时跳过（URL 不受限）
- **大文件分块上传**：超过阈值自动走 stash + chunk 分块，上传中显示不定态进度条，可取消
- **URL 上传**：多行文本框一行一个直链，批量入队，文件名自动推断（入队后可改）；由服务器拉取（按 `upload_by_url` 权限自动显隐）
- **上传新版本**：从文件页「上传新版本」进入（`?wpForReUpload=1&wpDestFile=X`）时自动绑定目标文件名并保留原描述页
- **冲突提醒**：一次点击完成上传；服务器返回 warnings（重名、内容重复、滥用过滤器拦截等）时，批次结束弹一次汇总窗，每个文件的警告以红色文字显示在其卡片上；用户可自行改名后「重试」（复用 filekey 不重传）或显式「覆盖上传」
- **审核队列识别**：站点启用 Moderation 扩展时，`moderation-image-queued` 响应显示为「已进入审核队列」终态而非错误
- **主站上传弹窗**：主站（zh）经工具栏「MoeUpload」、MoeSkin 页面工具按钮或 `mw.hook('moeupload.open')` 打开上传弹窗，上传经跨站 API（`mw.ForeignApi`）直接打到共享站
- **内置元数据规范**：字段 schema、许可协议、wikitext 组装模板集中定义于 `src/config/defaults.ts`，支持「应用到全部」
- **OOUI 主题适配**：内置深色表面、控件、遮罩、弹窗层级与 Vector 夜间图标覆盖，与 Vector 2022、MoeSkin 及暗色模式融合
- **移动端适配**：响应式布局，桌面/移动皮肤均可用

## 项目架构

### 目录结构

```text
src/
├── main.ts / takeover.tsx   # 入口：boot 按宿主分流 → 共享站上传页接管（takeover）
├── dialog.tsx               # 主站上传弹窗：触发入口 + ProcessDialog 包 App
├── types.ts + types/mw.d.ts # 共享类型 + mw/mw.widgets ambient 声明
├── api/                     # client(mw.Api 薄适配、上传目标分流)、upload(stash 分块/finalize/url)
├── state/                   # queue(useReducer 队列) + pipeline(上传编排)
├── logic/                   # 文件名清洗/wikitext 组装/格式化（纯函数，单测覆盖）
├── config/                  # DEFAULT_CONFIG + sites.ts（共享站 API/宿主分流常量）
├── components/              # App、Dropzone、QueueItem、MetaForm、UrlPanel、widgets/
│   └── widgets/             # mw.widgets 的 React 包装（TitleInput/CategorySelect）
├── locale/                  # i18n.ts（选语种 + t()）、warnings.ts、types.ts、index.ts
└── styles/                  # app.scss 仅 @use；_tokens/_base/_takeover/_dropzone/
                             # _url-panel/_toolbar/_queue/_dialog/_ooui-theme/_responsive
i18n/                        # 纯 JSON 文案：zh-hans 基准 + zh-hant/zh-tw/zh-hk 叠加层（只列差异）
mock/api-server.ts           # Action API 模拟器（单测夹具）
tests/                       # vitest（node，纯逻辑）
scripts/                     # build.js / build-css.js / vite-build.js（Vite API 构建） / terser-check.js
```

### 入口与宿主分流

同一份产物按宿主分流（域名清单在 `src/config/sites.ts`）：

- **共享站 `Special:Upload`** → 页面接管（takeover），隐藏原生表单并挂载 React 应用，上传请求发往本站 API。
- **主站 zh/mzh** → `initDialogTrigger()` 注册弹窗入口（portlet + MoeSkin pagetools + `mw.hook('moeupload.open')`），弹窗内上传通过 `mw.ForeignApi(COMMONS_API_URL, {anonymous:false})` 发往共享站。zh 的 `Special:Upload` 不接管。

所有上传请求统一通过 `api/client.ts` 的 `getUploadApi()` 发起；`setUploadTarget()` 在页面初始化时注册当前上传目标。

### 数据流

组件 dispatch → `queueReducer` → `pipeline` 通过回调函数修改状态。异步流程从 `stateRef.current` 读取最新队列（`useReducer` 的 `state` 在异步流程里是旧快照）。每个队列条目持有一个 `AbortController`，保存在 `App` 的 `aborts` ref 中，取消即 abort。

### 上传管线

```text
加入队列（填写元数据：schema 表单+许可+分类；「上传新版本」条目跳过校验）
  → 点击「上传」→ 元数据校验(纯本地) → stash 暂存(分块/不定态进度/可取消) → finalize 提交(+描述wikitext)
  ─┬─ 成功 → 完成(文件页链接)
   ├─ moderation 拦截(moderation-image-queued) → 已进入审核队列(终态，原描述页保留)
   └─ 服务器 warnings(重名/内容重复/滥用过滤器等) → 条目上红色警告提示 + 批次汇总弹窗
      → 用户自行处理：改名后「重试」(复用 filekey 不重传) 或显式「覆盖上传」
```

### 样式与文案

- 样式使用 BEM 前缀 `.moeupload-`，入口 `src/styles/app.scss` 只做 `@use` 汇总；暗色模式使用 `--mu-*` CSS 变量，OOUI 覆盖集中在 `_ooui-theme.scss` 并限定在 `body.moeupload-active` / `body.moeupload-dialog-active` 下。
- 界面文案统一中文，基准表为 `i18n/zh-hans.json`，组件中通过 `t('key')` 取词；繁体文案是叠加层，只写与上一级译文真正不同的条目，由 `tests/locale.test.ts` 校验。
- API 响应类型来自 `types-mediawiki-response`，全局 `mw.*` 来自 `types-mediawiki`，`mw.widgets` 缺少的声明补在 `src/types/mw.d.ts`。
