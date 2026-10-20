# 功能基准清单（functional spec）

本文档是重写版的**功能验收基准**：重写实现与上游同步评估都以本清单为准（模块划分、加载顺序等实现细节不在对照范围内）。基准来源 = 上游 enwiki [oldid=1322962085] 的功能 + 全部萌百定制 − 萌百已删项，即 legacy 萌百现行版（`Gadget-popups.js` @ commit `5adc9438`）的行为。

标注约定：

- 〔萌百〕= 萌百定制行为，必须保留；
- 〔默认〕给出选项默认值；
- 〔未接线〕= 基准要求、但重写版当前**尚未实现**的项（验收时不得视为通过，见 `docs/semantic-notes.md`）；
- 默认值/条数以 legacy `setOptions`（98 项）与 `popupStrings`（242 键）+ `englishStrings`（216 键）的实际数量为准；与 `src/` 实现不符处已在本文中直接标注。

阶段 5 核对说明：本文档在推倒重写的阶段 5 逐节对照 `src/` 现状复核过一遍；核对中发现的与
legacy 的差异登记在 `docs/semantic-notes.md`。凡本文与 `src/` 实现冲突，以语义笔记的登记为准。

> [!IMPORTANT]
> 本文按「功能域已全部落地、阶段 5 装配合入」为基准撰写；§1 的动态内容重扫（`mw.hook`）
> 已随阶段 5 落地（`src/entry.ts`，语义笔记 A1）。验收以 `npm test` 全部通过 + 真站点冒烟
> （`docs/smoke-test.md`）为准。

## 1. 启动、链接绑定与动态内容

- 入口时序：ready 后 `readyState === "complete"` 直接启动，否则等 window load；启动 = 装配层接线（`abortAll`/`setupPopups`/`modifyWatchlist`）+ 遗留 localStorage 清理 + `window.popupNoTranslation` 挂载 + autoEdit（编辑页自动操作）+ setupPopups（初始化）。
- 双载入守卫：`window.pg` 已存在且非元素节点 ⇒ 静默退出；守卫通过后**加载期立即**装配 `window.pg`（不能推迟到 ready：ready 前的窗口期内第二份实例会通过守卫——legacy 的守卫在 ready 回调内，重写版提前到加载期，语义等价且窗口更小）。
- 动态内容重扫（兼容约定第 6 条）：注册 `mw.hook("wikipage.content")` 与 `mw.hook("ext.echo.overlay.beforeShowingOverlay")`（每段内容重置标记后重新绑定，首个 `#mw-content-text` 跳过一次；echo 面板内 `.mw-echo-state` 重扫），并在启动时对现有 `.mw-parser-output` 各跑一遍；语义见 legacy `entry.ts:47-87`（单文件版 `6496-6528`）。重写版已落地（`src/entry.ts` ready 回调，与 boot 调度并列；详见 `docs/semantic-notes.md` A1）。
- setupPopups（一次性，可带回调）：查 `specialpagealiases`〔萌百：`uselang=content&maxage=3600`〕→ 设置 siteinfo/标题基址/选项/用户信息（`popupReview` 开时查 `list=users&usprop=rights` 得 canReview）/命名空间/interwiki/正则/重定向表/杂项 → setupTooltips → 启用全局鼠标追踪。重写版时序（`src/boot.ts`）：`fetchSpecialPageNames` → `setSiteInfo` → `setTitleBase` → `setOptions` → `void setUserInfo()`（不 await，后台查权限）→ `setNamespaces` → `setInterwiki` → `setRegexps` → `setRedirs` → `setMisc`（状态重置）→ `setupLivePreview(站点配置)` → `setupTooltips()` → `Navpopup.tracker.enable()` → 标记完成。
- 绑定：分批（每批 250 个 `<A>`、间隔 100ms）绑 mouseover/mouseout/mousedown；容器选择器链〔萌百：`.skin-vector-2022 .vector-body` → `#mw_content` → `#content` → `#article` → moeskin `<article>`〕；`popupTocLinks=false`〔默认〕时移除 `#toc` 内链接。
- 链接过滤（isPopupLink）：`.nopopups` 容器 / `nopopup` 属性 / 本页 `#` 锚 / 非本站链接 / Special 页与 `section=N` 等正则排除；但 email/contribs/whatlinkshere/Special:Diff 四类 Special 链接且无 `&limit=` 时放行；vector 菜单标题链排除。

## 2. 悬停触发与隐藏

- `popupModifier` 开启时响应修饰键（enable=按下才弹 / disable=按下不弹）。
- `removeTitles=true`〔默认〕时暂存并清空锚点原生 title；同链接弹窗已可见则跳过。
- 静止检测：悬停后 `popupDelay`〔默认 0.5s〕内鼠标静止（间隔 delay/2 轮询）才显示；显示后每 600ms 检查重定位。
- simplePopups 模式：先渲染简版骨架，`popupPreviewButton` 时附「show preview」按钮转完整预览。
- 隐藏：mouseout 后鼠标仍在弹窗内（fuzz=5 容差）或菜单展开中则保留；`popupHideDelay`〔默认 0.5s〕延迟隐藏；killPopup（mousedown）中止该弹窗全部下载。
- 拖拽：`popupDraggable=true`〔默认〕，150ms 后可拖；无 handle 时需按住 Shift（`shiftKey` 读取保留 try/catch，上游老浏览器路径）；`popupDragHandle` 指定把手。
- 修饰键：`popupModifier` 开启时按 `popupModifierAction`（`enable`=按下才弹 / `disable`=按下不弹）在 keydown/keyup 上挂全局监听，退出时摘除两类监听（挂时只挂其一）。

## 3. 弹窗本体与结构

- 每弹窗一个 `div.navpopup`（absolute、minWidth 350、id=`navpopup_maindiv<uid>`、点击置顶）；hooks：create/unhide/hide × before/after（uid 去重、返回 true 注销）——懒加载〔默认开〕、maxWidth〔默认 350〕、快捷键挂载都靠 hooks。
- 定位：右溢出时移出屏幕测量宽度再贴右缘（tooWide 一次性豁免）。
- 结构 7 种：original/nostalgia/fancy/fancy2/menus/shortmenus〔默认〕/lite；布局槽顺序见 popupLayout（menus 系列把 TopLinks 提到 Title 前）；`setPopupHTML` 目标不存在时 600ms 轮询重试；`popupActiveNavlinks` 时 TopLinks 槽内递归绑定子弹窗〔`popupSubpopups=true` 默认〕。
- 槽位与 id 约定：`.navpopup` 容器 + `popup<槽名><idNumber>` 形式的槽 div（`popupTitle`/`popupTopLinks`/`popupData`/`popupPreview`/`popupPreviewMore`/`popupRedir*`/`popupMiscTools`/`popupPostPreview`/`popupFixDab`/`popupError` 等）；`popupSecondPreview` 复用 `popupPreview` 样式类（id 仍按槽名生成）；`popupImage` 槽骨架为 `<a id="popupImageLink<N>"><img id="popupImg<N>">`。结构表在 `src/core/structures.ts`，槽填充器由 `src/navlinks/navlinks.ts` 与 `src/preview/images.ts` 在模块求值时注册（`registerSlotFiller`）。
- 重定向态：`popupRedir*` 槽显示目标与「修复重定向」链接〔`popupFixRedirs` 默认关，开启时输出「修复重定向」+ 目标/目标与标签两条 autoedit 链接，关闭时输出「重定向 至 <目标链>」〕；`lite` 结构无重定向槽表，重定向状态下无槽可填。

## 4. 导航链接菜单（navlinks）

- DSL：`<<id|text|key=value>>` 标签、`if(cond){..}else{..}`（cond ∈ user/talk/admin/oldid/rcid/ipuser/mainspace_en/wikimedia/diff）、`<menu>/<menurow>` 嵌套下拉、`*` 分隔符，递归 ≤10 层（`if` 可判定的条件名之外的写法原样保留）。
- navlink id 全集：**60 个**（`src/navlinks/navlinks.ts` 主 `switch` 的 case 数与 `defaultNavlinkSpec`/结构填充器引用一致）：undelete、whatLinksHere、relatedChanges、move、contribs、deletedContribs、email、block、unblock、userlog、blocklog、pagelog、protectlog、deletelog、userSpace、search、thank、watch、unwatch、history、historyfeed、unprotect、protect、delete、markpatrolled、edit、view、purge、render、raw、new、mainlink、userPage、article、monobook、editMonobook、editArticle、userTalk、talk、arin、count、google、editors、globalsearch、lastEdit、oldEdit、editOld、undo、revert、nullEdit、diffCur、editUserTalk、editTalk、newUserTalk、newTalk、lastContrib、sinceMe、togglePreviews、disablePopups、purgePopups；未知 id 渲染 `Unknown navlink type: <id>`。
- 快捷键字母全集（共 27 键，与各 navlink 的 `shortcut=` 声明一一对应）：空格 mainlink、`/` lastEdit、`#` count、`+` new/newTalk/newUserTalk、`B` blocklog、`E` email/editors、`G` google、`L` userlog、`P` purge、`S` render、`a` article、`b` block、`c` contribs、`d` delete、`e` edit/editOld、`g` globalsearch、`h` history、`l` whatLinksHere、`m` move、`n` nullEdit、`p` protect、`r` relatedChanges、`s` search、`t` talk/userTalk、`u` userPage、`v` revert/view、`w` watch。
- `shortmenus` 默认布局：`<b><<mainlink|shortcut= >></b>` + 操作（actions）下拉 + 用户（user）下拉 + popups 菜单〔`popupSetupMenu` 默认开，含 切换预览/重置/禁用 三项〕；`popupActionsMenu` 关闭时 actions 改为非菜单的平铺形态。（原始 `nostalgia` 布局见 `defaultNavlinkSpec`。）
- 编辑计数工具默认 supercount，URL 模板 `https://xtools.wmflabs.org/ec?user=$1&project=$2.$3&uselang=<wgUserLanguage>`（主机名只取前两段），`popupEditCounterTool=custom` 时用 `popupEditCounterUrl`；globalsearch 用 global-search.toolforge.org；arin 走 `ws.arin.net` whois。**注意：`arin`/`count` 与 DSL 中的 `if(wikimedia){…}` 均要求 `siteState.wikimedia`**（主机名匹配 `*wiki(pedia|…).org` 等），萌百 `zh.moegirl.org.cn` 不满足，故这些项在萌百**不出现**——与 legacy 行为一致。
- action=edit 链接追加 `&wpChangeTags=Popups%2CAutomation%20tool`〔萌百〕。
- 新窗口策略：per-id `popupLinksNewWindow`（默认 lastContrib/sinceMe）+ 全局 `popupNewWindows`。
- 魔法链接：`<<lastContrib>>`/`<<sinceMe>>` 走 `magicHistoryLink`（`onclick` 调 `pg.fn.getLastContrib`/`getDiffSinceMyEdit`）；`<<togglePreviews>>`/`<<disablePopups>>`/`<<purgePopups>>` 走 `popupMenuLink`（`href="javascript:pg.fn.<id>()"`）。

## 5. 页面预览

- 预览分派优先级（`nonsimplePopupContent`，锚点形态判定，顺序即优先级）：脚注/引用 → diff（`diff=…` 且 `popupPreviewDiffs`）→ 历史（`action=history` 且 `popupPreviewHistory`）→ 贡献（contribs 正则）→ 链入（backlinks 正则）→ 图片页（File 名字空间，且 `imagePopupsForImages` 或锚点不含图片）→ 其余（分类成员 + 用户信息按需追加，最后 revision 预览）；分类/用户预览与 revision 预览**并存**是上游设计。
- 七类 API 查询（`loadAPIPreview` 的 queryType，各有独立 HTML 生成器）：`revision`（条目/模板正文与统计）、`history`（`rvlimit=popupHistoryPreviewLimit`）、`contribs`（`list=usercontribs&uclimit=popupContribsPreviewLimit`）、`userinfo`（IP → `list=blocks`；注册用户 → `list=users|usercontribs`〔萌百未部署 CentralAuth，globaluserinfo 族参数已移除，见 semantic-notes A11〕，随后 `loadMessagesIfMissing` 批量取用户组消息）、`category`（`list=categorymembers`）、`backlinks`（`list=backlinks`）、`imagepagepreview`（`prop=revisions|imageinfo`，`popupImageLinks` 开时附 `list=imageusage`）；另有两个独立 JSONP/表格路径：commons 共享资源页二段查询（见 §7）与 diff 的 `action=compare`（见 §6）。结果按 queryType 写入不同槽：`imagelinks`/`category` → `popupPostPreview`，`userinfo` → `popupUserData`，其余 → `popupPreview`（`revision` 走 `insertPreview` 管线，生成器失败时改写失败提示，见 semantic-notes A12）。
- revision 查询：`action=query&prop=revisions|pageprops|info|images|categories&rvslots=main&rvprop=ids|timestamp|flags|comment|user|content&cllimit=max&imlimit=max`（oldid 用 revids，否则 titles；萌百未部署 Wikibase，`meta=wikibase` 已移除，见 semantic-notes A11）；提取 wikitext/lastModified/wikibase item。
- 重定向跟随：wikitext 命中重定向正则〔萌百：含 `#重定向` 等本地化变体〕→ 显示目标 + 可选修复链接 → 对目标继续预览。
- 统计数据（popupData 槽）8 过滤器：小作品〔`popupStubRegexp`〕、消歧义〔`popupDabRegexp`，主名字空间限定 unless `popupAllDabsStubs`〕、页面大小（>949 字节显示 kB〔萌百：译注「以1000为一进」〕）、内链计数、图片计数（含 infobox 类变量〔`popupImageVarsRegexp`〕）、分类计数、最后修改年龄〔萌百：moment 精确日历差值，中文单位〕、wikibase 链接。
- 摘要提取（previewmaker）：截断至 `max(10^4, 2*popupMaxPreviewCharacters)`〔默认 600 字符/5 句〕；清洗管线 `makePreview` 依序 kill 注释/div/galleries/box 模板/模板（`popupPreviewKillTemplates` 开，否则走跨行模板的保守路径）/表格/图片（按动态收集的 File/Category 本地化别名）/HTML/chunks → `mopup` → `firstBit` → `killBadWhitespace`；**Template 与 File 名字空间只 killHTML**（源码即内容，保留 wiki 标记）；`firstBit` 支持裁标题（`popupPreviewCutHeadings`）、首段模式（`popupPreviewFirstParOnly`）、按句切分（含缩写/头衔等非句尾判定）；`more...` 链接点击后 +2000 字符/+20 句重算。
- wiki→HTML：Insta 引擎（`wiki2html`；标题/列表/`<pre>`/表格/hr/块图片 + 内链含管道与 interwiki/外链/签名/粗斜体/nowiki，链接基于 wgArticlePath；表格属性因模板不含占位符而恒被丢弃等上游怪癖照搬）。
- 锚点链接：`anchorize` 先在 wikitext 中定位同章节标题（`== 标题 ==`）或 `{{anchor|…}}`（模板名由 `popupAnchorRegexp` 默认 `anchors?` 指定），命中则从该处截断预览；逐行回退时先剥离链接与引号标记再匹配。
- 模板页〔`popupPreviewRawTemplates` 默认开〕在 Template 名字空间显示**源码**（`<span style="font-family: monospace;">` 内，`entify` 转义后按字面 `\n` 两字符切分——legacy 源即如此，常规 wikitext 上该 split 永不命中，照搬勿修）。
- 统计摘要有个 legacy 怪癖照搬：`getPageInfo` 在同一路径上被调用两次（首次返回值丢弃），副作用层面两次结果一致。
- 编辑摘要的 `/* 章节 */` 渲染（`Previewmaker` 的 autocomment 路径）：生成指向该章节的 `→` 链接。
- 预览清洗的 `killComments`/`killDivs` 等均有对应「不过度防御」删减（不可达兜底），见 `docs/semantic-notes.md` A5。

## 6. diff / 历史 / 贡献预览

- diff：`action=compare` 取 fromrevid/torevid（diff=cur/prev/next/具体 revid 组合矩阵）→ 取两版 wikitext → stripOuterCommonLines（context 2 行）→ 超 `popupDiffMaxLines`〔默认 100〕行截断标注「出于性能考虑，差异已被截断」→ 自实现 diff 算法 → rmBoringLines → wiki 词法 token 化 diffString（`<ins>/<del class=popupDiff>`）→ shorten（context `popupDiffContextCharacters` 默认 40 字符）→〔`popupDiffDates` 默认开〕`table.popup_diff_dates` 新旧日期表。**引擎选择**：`simpleSplit` 在 legacy 依原型补丁是否安装判定，重写版固定为 `false`（原生 split 分支，语义等价）——见 `docs/semantic-notes.md` A7。
- canReview 时附「标记为已巡查」（flagged info 查询 + review 提交）。
- 历史预览：rvlimit=25〔`popupHistoryPreviewLimit`〕的 editPreviewTable（按日分组、cur/last 链接、时间 oldid 链接、用户列、小编辑标记〔萌百：硬编码「小 」加粗〕、摘要列 `/* 章节 */` 渲染含锚点链接）。
- 贡献预览：usercontribs limit=25〔`popupContribsPreviewLimit`〕同表格（首列 diff|hist、第三列页面名；userhidden → `popupRevDelUrl`）。
- lastContrib/sinceMe：rvlimit=50〔`popupHistoryLimit`〕找最近非首位编辑者 / 我的最后编辑 → alert 或跳转 diff。
- wikEd 编辑框内容先经 `WikEdUpdateFrame()` 同步。
- 时间格式（历史/贡献表与 diff 日期表共用）：timecorrection 非 `ZoneInfo|…` 或缺 `formatToParts` → 偏移量修正；`date` 选项 ISO 8601 → 手动 zeroFill；否则 Intl.DateTimeFormat（用户时区 + locales：html[lang]→en 时按 mdy/dmy 选 en-US/en-GB，`popupLocale` 可覆盖）。

## 7. 图片与文件页预览

- `prop=imageinfo&iiprop=url|mime&iiurlwidth=200`〔`popupImageSizeLarge`〕；`popupImages` 关或文件名含 `{` 跳过；懒加载 hook；`popupNeverGetThumbs` 控制是否强取缩图。
- 缩图填充 `#popupImg<id>`（宽 60〔`popupImageSize`〕，thumburl 优先）；点击行为 `popupThumbAction`〔默认 imagepage：非 File 主题→描述页并递归；File→切换大小〕。另注：`loadImage` 开头的 `typeof image.stripNamespace !== "function"` 防御检查为 legacy 恒假分支，照搬保留（`istanbul ignore`）。
- 条目 wikitext 提取首个合法图片（`<!--..popup` 注释内除外）作预览缩图。
- 文件页悬停：alt 文本〔父锚点内 img.alt〕+ 文件页 wikitext 预览 + 统计 + `list=imageusage` 使用列表〔`popupImageLinks` 默认开，空列表显示「未找到文件链接」〕；`imagerepository === "shared"` 时 JSONP 请求 commons〔`callback=pg.fn.APIsharedImagePagePreviewHTML&requestid=<N>`，附「来自维基共享的图片：图片描述页」链接与 commons 侧正文预览〕。**触发条件只看 API 返回的 `imagerepository`**；请求与链接主机取 `siteState.apicommonsbase`/`commonsbase`，后者由 `siteState.commons`（wikimedia 站点且非 commons 自身时才有值）派生——非 wikimedia 站点该字段为 null，字符串化为 `null` 主机名（与 legacy 一致；实际只有共享文件仓库站点会返回 shared，故不构成现实问题）。萌百主站返回本地仓库，通常不触发（该代码路径的存在性验证见冒烟清单 §3）。

## 8. 分类 / 链入 / 用户信息预览

- 分类：`list=categorymembers` → 成员列表 + continue 时「以及其他页面」；空 → 「空的分类」。
- 链入（Whatlinkshere 悬停）：`list=backlinks` → 列表 + 「以及更多」。
- 用户（悬停用户页/用户讨论，`popupUserInfo` 默认开）：IP → `list=blocks`；注册用户 → `list=users|usercontribs`〔萌百未部署 CentralAuth，`meta=globaluserinfo` 已移除；全局 LOCKED/HIDDEN/全局组仅在站点接入 CentralAuth 并恢复参数后可见〕。渲染：非法/IP 用户名提示、BLOCKED/部分封禁、全局 LOCKED/HIDDEN（校验 unattached 含本库 wgDBname）、性别 ♀/♂〔`popupShowGender` 默认开〕、本地用户组〔萌百：滤 `*`/`user`/`autoconfirmed`，非自动确认加粗 `group-no-autoconfirmed`，组名经 `mw.message("group-X-member", gender)` 并 loadMessagesIfMissing〕、全局组（斜体）、编辑数 + 注册日期、最后编辑日期、IP 封禁段。分隔符〔萌百：`separator`「、」/`comma`「，」〕。
- 时间格式化：timecorrection 无 `ZoneInfo|` 或无 `formatToParts` → 偏移量修正；`date` 选项 ISO 8601 → 手动 zeroFill；否则 Intl.DateTimeFormat（用户时区 + locales：html[lang]→en 时 mdy/dmy 选 en-US/en-GB，`popupLocale` 可覆盖）。

## 9. 消歧义 / 红链修复

- `popupFixDabs=true` 且命中消歧义正则且非 Special 且有讨论页 → 列出 wikitext 全部 `[[链接]]`（滤 `^[a-z]*:`/Special/Image/Category 前缀、排序去重），每项生成 autoedit 改链命令 +〔`popupDabWiktionary` 默认 `last`，`first` 时 unshift〕wiktionary 项 + 「移除链接」项；被编辑页 = 子弹窗场景取 `navpop.parentPopup.article`。`listLinks` 恒推入至少一条 remove 链接，其空列表早退为 legacy 不可达防御，照搬保留。
- `popupRedlinkRemoval` 且锚点 `className === "new"`（严格相等，非 classList 判定）→ 红链移除 autoedit。

## 10. 自动编辑（autoedit）

- 仅 `document.editform` 页生效；URL 含 `wpChangeTags=Popups` 时注入 hidden input〔萌百：`autoclick=wpSave` 时追加 `,Automation tool`〕并改 form action（追加 `&wpChangeTags=Popups`，wpSave 时再追加 `%2CAutomation%20tool`）。
- `autoimpl=np20140416`（即 `popupString("autoedit_version")`）且 `actoken=mw.user.sessionId()`、防重入（`autoEdit.alreadyRan`）；`autoedit=` 的 `s<sep>from<sep>to<sep>flags;` 命令串（`\` 转义、`\sep`、`\n`）应用到 wpTextbox1；wikEd 兼容（`WikEdUpdateFrame`）；autowatchlist → `pg.fn.modifyWatchlist`；autominor/autowatch 勾选（`1/yes/true` 勾、`0/no/false` 取消）；autorv → 查询版本并填充 `$1/$2/$3` 摘要模板（查询失败强制 prompt）；autosummaryprompt → prompt 确认；autoclick → 横幅提示 + document.title 加括号 + click。
- revert/undo/nullEdit 的 autoedit URL 生成（含 `popupRevertSummaryPrompt`/`popupMinorReverts` 分支）：固定拼 `autoedit=…&autoclick=…&actoken=…[&autominor=…][&autowatch=…]&autosummary=…&autoimpl=…`。
- watch/unwatch：`postWithToken("watch")` + loadMessagesIfMissing + mw.notify。
- 〔萌百〕`action=edit` 类导航链接的 `wpChangeTags` 仅为 `action=edit` 场景追加，与上述编辑页注入是两条独立路径。

## 11. 选区弹窗 / 快捷键 / 弹窗内动作

- 选区（editform 的 wpTextbox1）：`popupOnEditSelection`〔默认 `cursor`〕= 选区含 `[[..]]` 时解析标题合成锚点直接弹窗跟随光标；`boxpreview` 模式在编辑框上方 `#selectionPreview` 容器直接 wiki2html 渲染（容器不存在时创建并插到 `wpTextbox1` 之前）。选区解析保留上游怪癖：`[[`/`|`/`]]` 的运算符优先级判定、首个 `]]` 之后还有 `[[` 时放弃。跨域 iframe 的两处 `try/catch` 防御已删（见 `docs/semantic-notes.md` A5）。
- 快捷键〔`popupShortcutKeys` 默认关〕：Esc 关闭；字母循环查找 `popupkey` 属性锚点并 jQuery `trigger("focus")`（jQuery focus 走原生焦点路径）；无匹配时把按键交还旧 handler（`document.oldPopupOnkeypress`）。整个功能域建立在 legacy `keypress`/`keyCode`/`window.event` API 之上（刻意保留，文件级 `eslint-disable no-deprecated`）。
- pg.fn 动作（`javascript:` URL 调用，依赖 `window.pg.fn` 四域兼容面）：togglePreviews（翻转 simplePopups + 全弹窗重置 + 中止下载）/purgePopups（全弹窗重置 + 清缓存 + 清选项缓存 + 中止下载）/disablePopups（重置弹窗 + 解绑全部链接，刷新恢复）/getLastContrib/getDiffSinceMyEdit/modifyWatchlist/APIsharedImagePagePreviewHTML。除上述四个域外，其余 `pg.*` 内部域不对外暴露（见 `docs/semantic-notes.md` A2）。
- 脚注预览：悬停 `#cite_note-`/`#_note-`/`#endnote` 等**与本页同标题**的锚点 → 从目标元素向上找最近 `<li>`，其 innerHTML 直接进预览槽（无 API）；跨页或不命中则走常规预览。
- 锚点链接（`a.href` 的 title 参数）与脚注判定、`section=N` 排除等边界见标题域（`src/title/title.ts` 的 `isPopupLink`/`parseParams`）。

## 12. 选项系统与 i18n

- 覆盖链：`window.popupXxx`（用户脚本 common.js 设 window 变量）> 内置默认；无 localStorage 持久化；purgePopups 就地清空选项缓存后按默认值重新初始化（legacy 为整体替换 `pg.option`，表现等价，见 `docs/semantic-notes.md` A2）。默认值全集以 legacy `setOptions` 为准，重写版实为 **98 项**（`src/core/options.ts`），`popupAdminLinks` 随 sysop 组（遍历 `wgUserGroups` 判 `sysop`）。`simplePopups` 开启时 `shouldShow` 直接读取 window 覆盖而不看运行时选项（legacy 语义照搬）。
- i18n：内置英文表 `englishStrings`（**216 键**，defaultpopup*Summary 带 enwiki 署名）+ 萌百翻译表 `popupStrings`（**242 键**，其中 237 项经 `wgULS`，另 5 项为 `web`/`♀`/`♂`/`autoedit_version`/`separator`/`comma` 等直值）；`popupString` 查表链为 window.popupStrings 覆盖 > 萌百表 > 英文表 > 原键兜底，未命中记入 `window.popupNoTranslation` Set 并 console.info（排除 `&autoimpl=np20140416&actoken=` 与 `*Hint` 键）；tprintf 支持 `%s` 与 `$1..$N`。
- 〔萌百〕`localStorage.removeItem("popupNoTranslation")` 清旧版遗留；重写版在 boot 启动时调用一次（`cleanupLegacyNoTranslationStorage`）。
- 站点全局依赖：wgULS、moment（`pageinfo` 的 `formatAge` 日历差值）、wikEd（wikEdUseWikEd/WikEdUpdateFrame）。
- 弹窗调试面：`window.popupDebug`（log/errlog 开关）、`window.popupDebugging`（弹窗内 `popupError` 槽显示 idNumber/pending）、`window.popupLocalDebug`（站点与协议切到 en.wikipedia.org + http:）、`window.popupStrings`（整表覆盖）。

## 13. 下载层与外部依赖

- 自建 Downloader：裸 XHR 拼 `apiwikibase + "?format=json&formatversion=2&action=query&…"`，header `Api-User-Agent: Navigation popups/1.0 (wgServerName)`〔萌百〕，可 abort（弹窗隐藏/清缓存时中止其全部请求），内存缓存 getPageWithCaching（URL 级）+ `fakeDownload` 缓存命中直接填充。**更正**：文档早前写的「失败重试 2 次」源自 legacy 的重试递归代码，但该递归返回值被丢弃、从不重新发送请求——legacy 实际行为即「非 200 不回调、不重发」，重写版删除该死代码（见 `docs/semantic-notes.md` A3）。
- mw.Api 仅用于：specialpagealiases、users rights、compare、flagged、watch/review 提交、loadMessagesIfMissing。
- mw.* 面（重写版实际引用，核对方法 `grep -rn "mw\.[a-zA-Z]*" src/`）：`mw.config.get`（键全集，共 12 个：wgArticlePath/wgContentLanguage/wgDBname/wgFormattedNamespaces/wgNamespaceIds/wgPageName/wgScript/wgScriptPath/wgServerName/wgUserGroups/wgUserLanguage/wgUserName）、`mw.util.getParamValue`/`mw.util.escapeRegExp`、`mw.user.options.get`/`mw.user.sessionId`、`mw.Api`（构造）、`mw.loader.load`、`mw.message`、`mw.notify`、`mw.Title.newFromText`（`src/navlinks/links.ts:613`）。`mw.hook`（动态内容重扫，见 §1）与 `mw.loader.using`（legacy 中即被注释，见 `diffpreview.ts`）当前未被引用。
- interwiki〔萌百：zh→en|ja、en→zh|ja、ja→zh|en；表外语言保持缺省〕，装配在 `src/title/namespaces.ts` 的 `setInterwiki`。

## 14. DOM / CSS 约定（不得改动）

`.navpopup`、`#popupImg<id>`、`#popupImageLink<id>`、`#popupPreview<id>` 等 id 命名规则与 `.popup_menu`、`.popup_drop`、`.popupDiff`、`.popup_history_row_even`、`.popup_mainlink`、`#selectionPreview` 等 class/id 集合必须与 `src/css/main.scss` + `_darkmode.scss` 完全匹配（CSS 不随重写改动）。

- 槽位 id 由 `src/core/htmlout.ts` 的 `emptySpanHTML` 生成（`<div id="<槽名><idNumber>" class="<槽名>">`），`popupSecondPreview` 的 class 别名为 `popupPreview`，`popupDragHandle` 选项命中时对应槽追加 `popupDragHandle` 类。
- 暗色适配（萌百专属，上游无对应）：`_darkmode.scss` 以 `dark-mode-variants` mixin 把 **16 组规则**展开为三个变体——`html.skin-theme-clientpref-night`、`html.dark`（Moeskin 暗色）、`@media (prefers-color-scheme: dark)` 下的 `html.skin-theme-clientpref-os`。产物中 `html.dark`/`html.skin-theme-clientpref-night`/`html.skin-theme-clientpref-os` 各出现 20 次（含合并选择器）。上游同步时勿被上游内容覆盖。
- 弹窗容器链（萌百定制，`src/core/events.ts` 的 `defaultPopupsContainer`）：`.skin-vector-2022 .vector-body` → `#mw_content` → `#content` → `#article` → 裸 `<article>`（Moeskin）→ `document`，逐级回落；`popupOnlyArticleLinks=false` 时直接用 `document`。
