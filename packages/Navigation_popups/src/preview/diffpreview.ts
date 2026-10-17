// diff 预览域：loadDiff 发起 compare + revisions 查询并把 diff 表格渲染进
// popupPreview 槽，及 addReviewLink 巡查链接、titledDiffLink 差异链接构造。
// 行为基准 = legacy src/modules/diffpreview.ts（commit 02c8dec）逐字照搬。
//
// legacy pg 动态域映射：pg.wiki.apiwikibase → siteinfo 的 siteState；
// pg.user.canReview → siteinfo 的 userState；pg.option（popupDiffMaxLines/
// popupDiffContextLines）→ getValueOf（装配层已注册同默认值）；
// pg.fn.{pending,completed}NavpopTask → pipeline 域同名导出；
// getPageWithCaching → net/cache 域；String.prototype.parenSplit/entify →
// title/core 域的显式函数（见 diff.ts）。
//
// 选项读取的唯一语义偏差（既有适配约定）：legacy 在截断段直接读
// pg.option.popupDiffMaxLines / pg.option.popupDiffContextLines（每次调用现读），
// 重写版统一经 getValueOf（首次读取即固化，与 legacy 的 getValueOf 路径一致）。
// 差异仅在「运行中修改这两个选项」时可见；选项在 boot 装配期一次性写入且
// 站点脚本按启动期配置使用，故无实际影响。
//
// legacy 的 `mw.loader.using(["mediawiki.api"])` 注释与 API 客户端单例化
// 均由 siteinfo 域的 getMwApi 承接（浏览器加载器语义在重写版无对应物）。
//
// 阶段缝（既有协调约定，无用户可见行为差异）：loadDiff 签名冻结为同步 void
// 返回（events 分派段的打桩契约），内部异步链照 legacy 的 async 主体展开。
import { pendingNavpopTask, completedNavpopTask } from "../preview/pipeline.ts";
import { countCrossings, diff, diffString, entryOf, shortenDiffString } from "./diff.ts";
import type { DiffCell } from "./diff.ts";
import type { Downloader } from "../net/downloader.ts";
import { getPageWithCaching } from "../net/cache.ts";
import { errlog } from "../core/log.ts";
import { setPopupHTML, setPopupTipsAndHTML } from "../core/htmlout.ts";
import { getMwApi, siteState, userState } from "../api/siteinfo.ts";
import { generalLink, titledWikiLink } from "../navlinks/links.ts";
import type { Navpopup } from "../core/popup.ts";
import { getValueOf } from "../core/options.ts";
import { formattedDateTime } from "../api/queries.ts";
import { popupString, simplePrintf, tprintf } from "../core/strings.ts";
import type { Title } from "../title/title.ts";
import { getJsObj, assume } from "../core/tools.ts";

// one revision from the API (prop=revisions), as consumed here
export interface RevisionData {
    revid?: number;
    timestamp?: string;
    slots?: { main?: { content?: string } };
    [key: string]: unknown;
}
// the half of Navpopup.diffData describing one side of a pending diff
export interface DiffSide {
    revid?: number;
    revision?: RevisionData;
}

declare module "../core/popup.ts" {
    interface Navpopup {
        // per-popup diff state, filled by loadDiff/doneDiff (legacy Navpopup.diffData)
        diffData?: { oldRev: DiffSide; newRev: DiffSide };
    }
}

export const loadDiff = (article: Title, oldid: string | null, diff: string, navpop: Navpopup): void => {
    navpop.diffData = {
        oldRev: {},
        newRev: {},
    };
    // await mw.loader.using(["mediawiki.api"]);
    const api = getMwApi();
    const params: {
        action: string;
        prop: string;
        fromtitle?: string;
        torelative?: string;
        fromrev?: string | number;
        torev?: string | number;
    } = {
        action: "compare",
        prop: "ids|title",
    };
    params.fromtitle = article.toString();
    switch (diff) {
        case "cur":
            switch (oldid) {
                case null:
                case "":
                case "prev":
                    params.torelative = "prev";
                    break;
                default:
                    params.fromrev = oldid;
                    params.torelative = "cur";
                    break;
            }
            break;
        case "prev":
            if (oldid && oldid !== "cur") {
                params.fromrev = oldid;
            }
            params.torelative = "prev";
            break;
        case "next":
            params.fromrev = oldid ?? 0;
            params.torelative = "next";
            break;
        default:
            params.fromrev = oldid ?? 0;
            params.torev = diff;
            break;
    }
    void (async (): Promise<void> => {
        const data = await api.get(params) as { compare: { fromrevid: number; torevid: number } };
        // 闭包同步赋值前无人能清空（assume 承载该运行时不变量；legacy 裸属性访问）
        const diffData = assume(navpop.diffData);
        diffData.oldRev.revid = data.compare.fromrevid;
        diffData.newRev.revid = data.compare.torevid;
        void addReviewLink(navpop, "popupMiscTools");
        const go = () => {
            pendingNavpopTask(navpop);
            let url = `${siteState.apiwikibase}?format=json&formatversion=2&action=query&`;
            url += `revids=${String(navpop.diffData?.oldRev.revid)}|${String(navpop.diffData?.newRev.revid)}`;
            url += "&prop=revisions&rvslots=main&rvprop=ids|timestamp|content";
            getPageWithCaching(url, doneDiff, navpop);
            return true;
        };
        if (navpop.visible || !getValueOf("popupLazyDownloads")) {
            go();
        } else {
            navpop.addHook(go, "unhide", "before", "DOWNLOAD_DIFFS");
        }
    })();
};
// 测试导出面：legacy 私有的巡查链接/回调/裁剪/diff 表格辅助在此导出为同名
// 函数以便直接单测（queries 域同款约定），运行时调用关系不变。
export const addReviewLink = async (navpop: Navpopup, target: string): Promise<void> => {
    if (!userState.canReview) {
        return;
    }
    const diffData = navpop.diffData;
    if (!diffData) {
        return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-conversion -- `?? NaN` keeps Number()-equivalent semantics (ToNumber(undefined) = NaN) on a revid that may be absent; the rule only sees the post-?? number type
    if (+(diffData.newRev.revid ?? NaN) <= +(diffData.oldRev.revid ?? NaN)) {
        return;
    }
    const params = {
        action: "query",
        prop: "info|flagged",
        revids: diffData.oldRev.revid,
        formatversion: 2,
    };
    const data = await getMwApi().get(params) as { query: { pages: { flagged?: { stable_revid?: number } }[] } };

    const stable_revid = data.query.pages[0].flagged?.stable_revid ?? 0;
    if (stable_revid === diffData.oldRev.revid) {
        const a = document.createElement("a");
        a.innerHTML = popupString("mark patrolled");
        a.title = popupString("markpatrolledHint");
        a.onclick = async () => {
            const params = {
                action: "review",
                revid: diffData.newRev.revid,
                comment: tprintf("defaultpopupReviewedSummary", [diffData.oldRev.revid, diffData.newRev.revid]),
            };
            try {
                await getMwApi().postWithToken("csrf", params);
                a.style.display = "none";
            } catch {
                alert(popupString("Could not marked this edit as patrolled"));
            }
        };
        setPopupHTML(a, target, navpop.idNumber, null, true);
    }
};
export const doneDiff = (download: Downloader): void => {
    // owner 位由 getPageWithCaching(url, doneDiff, navpop) 装配；类型层 Downloader
    // 只约定最小中止面，收窄回 Navpopup（legacy 无类型直传，运行时同一对象）
    const navpop = download.owner as Navpopup | null | undefined;
    const diffData = navpop?.diffData;
    if (!navpop || !diffData) {
        return;
    }
    completedNavpopTask(navpop);
    let pages: { revisions?: RevisionData[] }[] | undefined;
    let revisions: RevisionData[] = [];
    try {
        pages = (getJsObj(download.data ?? "") as { query?: { pages?: { revisions?: RevisionData[] }[] } }).query?.pages;
        if (pages) {
            for (const page of pages) {
                revisions = revisions.concat(page.revisions ?? []);
            }
        }
        for (const revision of revisions) {
            if (revision.revid === diffData.oldRev.revid) {
                diffData.oldRev.revision = revision;
            } else if (revision.revid === diffData.newRev.revid) {
                diffData.newRev.revision = revision;
            }
        }
    } catch {
        // istanbul ignore next -- try 体内 getJsObj 自吞 JSON.parse 异常并返回
        // 哨兵 1，其余为贯穿可选链的属性访问；download.data 契约恒为 string，
        // 任意 JSON 形态都不抛，catch 结构性不可达（legacy :158-160 同款照搬）
        errlog("Could not get diff");
    }
    insertDiff(navpop);
};
export const rmBoringLines = (a: DiffCell[], b: DiffCell[], _context?: number) => {
    let context = _context;
    if (typeof context === "undefined") {
        context = 2;
    }
    const aa: (number | undefined)[] = [],
        aaa: DiffCell[] = [];
    const bb: (number | undefined)[] = [],
        bbb: DiffCell[] = [];
    let i: number, j: number;
    for (i = 0; i < a.length; ++i) {
        const entry = entryOf(a[i]);
        if (!entry.paired) {
            aa[i] = 1;
        } else if (countCrossings(b, a, i, true)) {
            aa[i] = 1;
            // istanbul ignore next -- ?? -1 兜底侧结构性不可达：上方
            // countCrossings 的 row 守卫已确保 a[i] 的 row 为 number
            // （legacy :179 同款表达式，照搬保留）
            bb[entry.row ?? -1] = 1;
        }
    }
    for (i = 0; i < b.length; ++i) {
        if (bb[i] === 1) {
            continue;
        }
        const entry = entryOf(b[i]);
        if (!entry.paired) {
            bb[i] = 1;
        }
    }
    for (i = 0; i < b.length; ++i) {
        if (bb[i] === 1) {
            for (j = Math.max(0, i - context); j < Math.min(b.length, i + context); ++j) {
                if (!bb[j]) {
                    bb[j] = 1;
                    // istanbul ignore next -- ?? -1 兜底侧结构性不可达：bb[j] 为洞
                    // 蕴含 b[j] 未被标记（未配对侧在上一循环已全标），即 b[j] 为
                    // diff() 配对产物、row 恒为 number（legacy :196 同款照搬）
                    aa[entryOf(b[j]).row ?? -1] = 0.5;
                }
            }
        }
    }
    for (i = 0; i < a.length; ++i) {
        if (aa[i] === 1) {
            for (j = Math.max(0, i - context); j < Math.min(a.length, i + context); ++j) {
                if (!aa[j]) {
                    aa[j] = 1;
                    // istanbul ignore next -- ?? -1 兜底侧结构性不可达：同上，
                    // aa[j] 为洞蕴含 a[j] 为配对产物、row 恒为 number
                    // （legacy :206 同款照搬）
                    bb[entryOf(a[j]).row ?? -1] = 0.5;
                }
            }
        }
    }
    for (i = 0; i < bb.length; ++i) {
        if ((bb[i] ?? 0) > 0) {
            const entry = entryOf(b[i]);
            if (entry.paired) {
                // istanbul ignore next -- ?? "" 兜底侧结构性不可达：配对单元由
                // diff() 的配对赋值构造，text 恒存在（legacy :215 同款照搬）
                bbb.push(entry.text ?? "");
            } else {
                bbb.push(b[i]);
            }
        }
    }
    for (i = 0; i < aa.length; ++i) {
        if ((aa[i] ?? 0) > 0) {
            const entry = entryOf(a[i]);
            if (entry.paired) {
                // istanbul ignore next -- 同上：配对单元的 text 恒存在
                // （legacy :225 同款照搬）
                aaa.push(entry.text ?? "");
            } else {
                aaa.push(a[i]);
            }
        }
    }
    return {
        a: aaa,
        b: bbb,
    };
};
export const stripOuterCommonLines = (a: string[], b: string[], context: number) => {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) {
        ++i;
    }
    let j = a.length - 1;
    let k = b.length - 1;
    while (j >= 0 && k >= 0 && a[j] === b[k]) {
        --j;
        --k;
    }
    return {
        a: a.slice(Math.max(0, i - 1 - context), Math.min(a.length + 1, j + context + 1)),
        b: b.slice(Math.max(0, i - 1 - context), Math.min(b.length + 1, k + context + 1)),
    };
};
export const insertDiff = (navpop: Navpopup): void => {
    const oldContent = navpop.diffData?.oldRev.revision?.slots?.main?.content;
    const newContent = navpop.diffData?.newRev.revision?.slots?.main?.content;
    // 任一侧修订缺 content（API 未返回/未匹配上 revid）时不渲染（legacy 原样）
    if (oldContent === undefined || newContent === undefined) {
        return;
    }
    let oldlines = oldContent.split("\n");
    let newlines = newContent.split("\n");
    let inner = stripOuterCommonLines(oldlines, newlines, +(getValueOf("popupDiffContextLines") as string | number));
    oldlines = inner.a;
    newlines = inner.b;
    let truncated = false;
    // legacy 此处的裸 getValueOf("popupDiffMaxLines") 无副作用无返回值，
    // 下一行才是真实读取（getValueOf 幂等），照搬保留以对齐调用序
    getValueOf("popupDiffMaxLines");
    const maxLines = +(getValueOf("popupDiffMaxLines") as string | number);
    if (oldlines.length > maxLines || newlines.length > maxLines) {
        truncated = true;
        inner = stripOuterCommonLines(oldlines.slice(0, maxLines), newlines.slice(0, maxLines), +(getValueOf("popupDiffContextLines") as string | number));
        oldlines = inner.a;
        newlines = inner.b;
    }
    const lineDiff = diff(oldlines, newlines);
    const lines2 = rmBoringLines(lineDiff.o, lineDiff.n);
    const oldlines2 = lines2.a;
    const newlines2 = lines2.b;
    // legacy 依 String.prototype.parenSplit.isNative 判定；重写版无原型补丁，
    // 等价于原生的 false 分支（见 diff.ts 的 diffString 注释）
    const simpleSplit = false;
    let html = "<hr />";
    if (getValueOf("popupDiffDates")) {
        html += diffDatesTable(navpop);
        html += "<hr />";
    }
    html += shortenDiffString(diffString((oldlines2 as string[]).join("\n"), (newlines2 as string[]).join("\n"), simpleSplit), +(getValueOf("popupDiffContextCharacters") as string | number)).join("<hr />");
    setPopupTipsAndHTML(html.split("\n").join("<br>") + (truncated ? `<hr /><b>${popupString("Diff truncated for performance reasons")}</b>` : ""), "popupPreview", navpop.idNumber);
};
export const diffDatesTable = (navpop: Navpopup) => {
    const newRevision = navpop.diffData?.newRev.revision;
    const oldRevision = navpop.diffData?.oldRev.revision;
    let html = '<table class="popup_diff_dates">';
    if (newRevision && oldRevision) {
        html += diffDatesTableRow(newRevision, tprintf("New revision"));
        html += diffDatesTableRow(oldRevision, tprintf("Old revision"));
    }
    html += "</table>";
    return html;
};
export const diffDatesTableRow = (revision: RevisionData, label: string) => {
    const lastModifiedDate = new Date(revision.timestamp ?? "");
    const txt = formattedDateTime(lastModifiedDate);
    const revlink = generalLink({
        url: `${mw.config.get("wgScript")}?oldid=${String(revision.revid)}`,
        text: label,
        title: label,
    });
    return simplePrintf("<tr><td>%s</td><td>%s</td></tr>", [revlink, txt]);
};
export interface DiffLinkSpec {
    article: Title;
    // widened arms mirror LinkSpec so NavlinkTag (typed as LinkSpec) can be
    // handed to the diff link builders (exactOptionalPropertyTypes)
    to?: string | null | undefined;
    from?: string | number | null;
    newWin?: boolean | null | undefined;
    noPopup?: boolean | number | null | undefined;
    text?: string | undefined;
    title?: string | null | undefined;
}
export const titledDiffLink = (l: DiffLinkSpec): string | null => titledWikiLink({
    article: l.article,
    action: `${String(l.to)}&oldid=${String(l.from)}`,
    newWin: l.newWin,
    noPopup: l.noPopup,
    text: l.text,
    title: l.title,
    actionName: "diff",
});
