# 人工冒烟清单（发版前真站点验证）

> [!IMPORTANT]
> **使用前提**：本清单要求产物包含**完整功能域与 boot 装配**——阶段 5 已合入，
> `npm run build` 产出完整产物（约 255 KB）。产物以 GitHub Release assets 形式发布、
> 部署到站点后，即可按本清单验证。

本清单用于**真站点部署后的人工验证**：静态门禁（eslint/tsc/terser/acorn/coverage）只保证
构建期正确性，运行时行为是否一致、萌百定制是否正常，只能靠人工逐项检查核心路径。每次产物
变更并部署后，请按本清单逐项执行；不通过的项记入发布说明并创建修复任务。

- 前置：产物已部署（`Gadget-popups.js` + `Gadget-popups.css`），浏览器开发者工具已打开，
  网络面板与 Console 可见。
- 打开弹窗调试日志：`window.popupDebug = true;`（须在脚本执行前或刷新后设置），
  此后 Console 会输出 `setupTooltips …`、`running popup<Slot>(…)` 等日志。
- 弹窗插桩查看：静态规则为 `.navpopup`（每个弹窗一个 `div.navpopup`，
  id 形如 `navpopup_maindiv<N>`），槽位 id 形如 `popupPreview<N>`、`popupData<N>`、
  `popupWarnRedir<N>`、`popupImg<N>`、`popupImageLink<N>`。用
  `document.querySelectorAll(".navpopup")` 查看当前打开的弹窗。

## 1. 悬停普通条目链接

- [ ] **弹窗出现**：悬停正文中的蓝链（条目名字空间），等待 `popupDelay`（默认 0.5s）内保持
      静止 → 出现弹窗。
- [ ] **结构完整**（默认结构 `shortmenus`）：弹窗上部有 `popupTopLinks<N>`（菜单式顶部链接，
      默认含 `actions` / `user`（登录用户）/ `popupsMenu` 三个下拉）与 `popupTitle<N>`；
      中部 `popupData<N>` 有统计摘要；下部 `popupPreview<N>` 有正文预览。
- [ ] **顶部链接菜单**：**悬停**（CSS `.popup_drop:hover .popup_menu` 的纯 CSS 展开，非点击）
      `actions` 下拉标题 → 菜单显示（`.popup_menu`），含编辑/历史/监视等项；
      `user` 下拉含用户页/贡献/日志等；`popupsMenu` 下拉含 切换预览 / 重置 / 禁用 三项。
- [ ] **预览 wikitext 渲染**：预览区出现正文文本、内链可点、首段截断处有 `more...` 链接；
      点击后预览增长（+2000 字符 / +20 句）。
- [ ] **移出消失**：鼠标移出弹窗与锚点（默认 0.5s 隐藏延迟）后弹窗消失；快速掠过时不出现弹窗
      （静止检测）；拖拽弹窗（默认开启 `popupDraggable`，无把手时按住 Shift 拖动）后位置保持。
- [ ] **截图与渲染对照**：预览区字体/行距正常（CSS 已加载：渲染后
      `getComputedStyle(document.querySelector(".navpopup")).fontSize` 为 `11px`）。

## 2. 重定向条目

- [ ] **redir 区出现**：悬停一个重定向页链接 → 弹窗内出现 `popupWarnRedir<N>` 提示
      （默认输出 `重定向至 …`；开启 `popupFixRedirs` 时为 `修复重定向` 相关链接；
      `popupNavLinks`/`popupAppendRedirNavLinks` 关闭时该槽内容为另一种形态）。
- [ ] **跟随重定向**：弹窗标题区（`popupRedirTitle<N>`）与预览区显示**重定向目标**页内容，
      而不是重定向页自身；目标页顶部有 `popupRedirTopLinks<N>`。
- [ ] **锚点透传**：悬停 `重定向页#章节` 形式的链接 → 预览定位到目标的对应章节。

## 3. 二段查询与各名字空间预览

- [ ] **历史页**：悬停某条目的 `&action=history` 链接 → 弹出历史预览表格
      （按日分组、`cur`/`last` 差异链接、时间戳 oldid 链接、用户列、摘要列）。
- [ ] **贡献页**：悬停用户贡献链接（Special:Contributions）→ 贡献预览表格
      （首列 `diff | hist`、第三列为页面名）。
- [ ] **分类页**：悬停 `Category:` 链接 → `popupPostPreview<N>` 出现成员列表 + 「以及其他页面」；
      空分类显示空提示。
- [ ] **图片页 / 文件页**：悬停 `File:` 链接 → `popupImg<N>` 显示缩略图、
      `popupImageLink<N>` 可点（默认 `popupThumbAction=imagepage`：点击进入描述页）、
      统计摘要 + 文件链接列表（`popupImageLinks` 默认开）。
- [ ] **commons 共享资源二段查询**：触发条件为 API 返回 `imagerepository === "shared"`（本地仓库返回 `local`，萌百主站通常不触发），因此在萌百上改为**验证对应代码存在**：
      Console 执行 `typeof pg.fn.APIsharedImagePagePreviewHTML` 应为 `"function"`。
      若在 wikimedia 站点（`commons` 字段非 null）验证：悬停共享文件页 → Network 出现对
      `commons.wikimedia.org` API 的 JSONP 请求，参数含
      `callback=pg.fn.APIsharedImagePagePreviewHTML&requestid=<N>`，弹窗出现
      `来自维基共享的图片：图片描述页` 链接与 commons 侧正文预览。

## 4. diff 预览

- [ ] **历史页链接悬停后显示 diff**：在历史页悬停某行的 `cur`/`last`/`prev`/`next` 差异链接
      （URL 含 `diff=…`）→ 弹窗出现差异渲染：
      `ins.popupDiff`（新增，亮色下背景 `#AFE`）与 `del.popupDiff`（删除，亮色下 `#FFE6E6`）；
      默认顶部有 `table.popup_diff_dates`（新旧版本日期，`popupDiffDates` 默认开）。
- [ ] **截断提示**：对超过 `popupDiffMaxLines`（默认 100 行）的差异，底部出现
      `出于性能考虑，差异已被截断`。
- [ ] **oldid 悬停（无 diff 参数）**：悬停纯 `&oldid=…` 的时间戳链接 → 弹窗显示
      该**旧版本**的页面预览（revision 查询按 `revids=`）；要查看 diff，须悬停带
      `diff=` 的链接。
- [ ] **Special:Diff 链接**：悬停 `Special:Diff/<oldid>[/<diff>]` → 正常出 diff 预览。
- [ ] **巡查链接（可选，需 `review` 权限）**：设置 `window.popupReview = true` 后刷新，
      悬停 diff 链接 → `popupMiscTools<N>` 出现「标记为已巡查」链接；点击后链接消失。

## 5. 历史/贡献表的萌百定制渲染

- [ ] **小编辑「小」标记**：历史页或贡献预览中，小编辑行的摘要列前显示加粗的「小 」（`<b>小 </b>`，带尾随空格；萌百定制硬编码）。
- [ ] **编辑摘要渲染**：摘要列中的 `/* 章节名 */` 渲染为指向该章节的链接；
      无摘要行的显示为普通文本。
- [ ] **日期本地化**：时间戳按用户时区与界面语言渲染（未设置时区或 `date=ISO 8601`
      时为 ISO 形态；否则 `Intl.DateTimeFormat`）；`timecorrection` 非 `ZoneInfo|…` 形态时
      使用偏移量修正路径。

## 6. autoedit URL 协议

前置：打开任意 `?action=edit` 编辑页（此时 `document.editform` 存在）。
`actoken` 必须等于当前会话 id，请在 Console 获取 `mw.user.sessionId()` 后拼进 URL。

- [ ] **命令引擎**：打开形如
      `…?action=edit&autoedit=s/foo/bar/g;&autoclick=wpDiff&actoken=<sessionId>&autoimpl=np20140416`
      的 URL → 编辑框 `wpTextbox1` 中原有的 `foo` 被替换为 `bar`，并自动点击「显示差异」
      （横幅提示出现、页面标题加括号）。
      命令语法：`s<分隔符>from<分隔符>to<分隔符>flags;`（分隔符可用 `/`、`~` 等，
      转义 `\`、`\分隔符`、`\n`）。
- [ ] **impl 守卫**：把 `autoimpl=np20140416` 改成别的值 → 自动编辑**不执行**
      （`autoedit_version` 校验）。
- [ ] **token 守卫**：把 `actoken` 改成错误值 → 不执行。
- [ ] **autominor / autowatch**：追加 `&autominor=1` → 「小编辑」勾选；`&autowatch=1` →
      「监视此页」勾选（`0/no/false` 取消勾选）。
- [ ] **autosummary / autorv**：追加 `&autosummary=测试摘要` → 摘要框写入该文本；
      `&autorv=<revid>` → 摘要按 `$1/$2/$3` 模板展开（查询失败时强制 prompt 确认）。
- [ ] **wpChangeTags 注入**：编辑页 URL 含 `wpChangeTags=Popups` 时，表单内出现
      hidden input `wpChangeTags=Popups`，且 form action 追加该参数；
      若同时 `autoclick=wpSave`，值变为 `Popups,Automation tool`。
- [ ] **萌百定制追加标签**：上述 `autoclick=wpSave` 场景保存后，编辑记录中的标签应含
      `Popups` 与 `Automation tool`。

## 7. `javascript:pg.fn.*` 内联 URL

- [ ] **可达性**：Console 依次执行下列表达式，均应返回 `"function"`：
      `typeof pg.fn.purgePopups`、`typeof pg.fn.disablePopups`、`typeof pg.fn.togglePreviews`、
      `typeof pg.fn.modifyWatchlist`、`typeof pg.fn.getLastContrib`、
      `typeof pg.fn.getDiffSinceMyEdit`、`typeof pg.fn.APIsharedImagePagePreviewHTML`。
- [ ] **togglePreviews**：先通过悬停打开一个正常弹窗 → 执行 `pg.fn.togglePreviews()` → 再次悬停应出现
      **简易弹窗**（仅骨架 + `show preview` 按钮，`simplePopups` 被翻转）；再执行一次恢复。
- [ ] **purgePopups**：执行 `pg.fn.purgePopups()` → 页面缓存清空、在途下载中止、
      `pg.option` 重置（随后悬停会按默认值重新初始化）。
- [ ] **disablePopups**：执行 `pg.fn.disablePopups()` → 现有弹窗消失，此后悬停**不再**出现弹窗
      （解绑），刷新页面恢复。
- [ ] **链接形态**：打开弹窗的 `popupsMenu` 下拉，其中 切换预览 / 重置 / 禁用 三项的
      `href` 应为 `javascript:pg.fn.togglePreviews()` / `pg.fn.purgePopups()` /
      `pg.fn.disablePopups()`（构造器 `popupMenuLink`）。
- [ ] **modifyWatchlist**：悬停条目并点击监视/取消监视项 → Network 出现 `action=watch`
      请求，并有 `mw.notify` 提示。

## 8. 暗色模式（萌百定制）

CSS 变体已在 `dist/Gadget-popups.css` 展开；用开发者工具切换根元素类名即可验证（无需刷新）：

- [ ] **Vector 2022 夜间**：给 `<html>` 加 `skin-theme-clientpref-night` → 弹窗背景转为暗色、
      文字为浅色、`ins.popupDiff`/`del.popupDiff` 背景为半透明色块。
- [ ] **Moeskin 暗色**：给 `<html>` 加 `dark`（萌百自有皮肤暗色类）→ 同上。
- [ ] **跟随系统**：把 `skin-theme-clientpref-night` 换成 `skin-theme-clientpref-os`，
      并在开发者工具中把 `prefers-color-scheme` 切到 `dark` → 同上（该变体在
      `@media screen and (prefers-color-scheme: dark)` 内）；切回 `light` → 恢复亮色。
- [ ] 三种变体共 16 组规则，覆盖 `.navpopup`、`.navpopup hr`、`.popup_menu*`、
      `.popup_drop*`、`.popup_mainlink a`、`.popup_history_row_even`、
      `.popupPreview a.extiw/.external`、`#selectionPreview`、`ins/del.popupDiff` 等。

## 9. 皮肤容器链（萌百定制）

默认 `popupOnlyArticleLinks=true` 时，绑定范围为容器选择链
`.skin-vector-2022 .vector-body` → `#mw_content` → `#content` → `#article` →
裸 `<article>`（Moeskin）→ `document`，逐级回落、命中即止：

- [ ] **Vector 2022**：正文（`.vector-body` 内）链接悬停后出现弹窗。
- [ ] **Moeskin**：页面正文位于裸 `<article>` 内时同样出现弹窗。
- [ ] **范围外不弹**：点击/悬停**侧边栏、页脚**（容器链之外）的链接 → 不出现弹窗。
- [ ] **全站绑定**：Console 执行 `window.popupOnlyArticleLinks = false;` 后刷新 →
      侧边栏链接也能弹出弹窗（回落到 `document`）。

## 10. 双载入守卫与遗留键清理

- [ ] **二次载入静默退出**：在 Console 再次注入同一份产物（例如 `mw.loader.load`
      该 gadget，或把产物粘贴执行）→ **不产生第二套初始化**：无重复 `setupTooltips` 日志、
      无重复绑定、`window.pg` 仍是原对象（`pg` 未被替换）。
- [ ] **守卫判定**：Console 执行 `typeof pg`（应为 `"object"`），并确认
      `pg !== document.createElement("pg")`——守卫仅在 `window.pg` 存在且**不是元素节点**时退出。
- [ ] **localStorage 遗留键清理**：页面加载后 Console 执行
      `localStorage.getItem("popupNoTranslation")` → 应为 `null`（启动时清理旧版遗留键）。
- [ ] **缺译报告集合**：`window.popupNoTranslation` 应为 `Set` 实例；出现缺译文案时
      Console 有 `popupNoTranslation` 的 `console.info` 输出。

## 11. 其他可选路径

- [ ] **脚注/引用预览**：悬停本页 `#cite_note-…` 形态的引用链接 → 预览区直接显示对应
      `<li>` 的内容（无 API 请求）。
- [ ] **快捷键**（需 `window.popupShortcutKeys = true` 后刷新）：弹窗出现时按 `h` 跳到历史
      链接、`Esc` 关闭弹窗；菜单项 `title` 后缀显示快捷键字母。
- [ ] **选区弹窗**（编辑页）：`window.popupOnEditSelection` 默认 `cursor` —— 在 `wpTextbox1`
      中选中含 `[[链接]]` 的文本 → 弹窗跟随光标出现；设为 `boxpreview` 时改为在编辑框上方
      `#selectionPreview` 容器内直接渲染。
- [ ] **调试日志**：`window.popupDebug = true` + 悬停 → Console 依次出现
      `setupTooltips, container=…`、`running popup<槽名>({article:…})` 等日志；
      `window.popupDebugging = true` 时弹窗内 `popupError<N>` 槽显示
      `idNumber=…, pending=…` 调试串。
