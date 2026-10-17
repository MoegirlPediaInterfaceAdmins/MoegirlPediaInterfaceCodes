// autoedit 域：编辑页 URL 协议驱动的自动编辑——autoedit 命令串（s 替换命令
// 的解析与执行）、wpChangeTags 注入、autominor/autowatch 勾选、autorv 摘要
// 展开（getRvSummary）、autoclick 按钮点击与横幅提示（bannerMessage）。
// 行为基准 = legacy src/modules/autoedit.ts（commit 02c8dec），逐字照搬含
// 怪癖（parseCmd 递归尾巴的 concat 元素、findNext 的转义跳过、skipOver 的
// 游标语义、bannerMessage 无 h1 时的崩溃点等）。
//
// 与 legacy 的结构差异（均为既定适配，无用户可见行为差异）：
// - pg.wiki.apiwikibase → siteinfo 域 siteState.apiwikibase
// - pg.escapeQuotesHTML → tools 域 escapeQuotesHTML（模块静态导入恒有定义，
//   legacy 的 ?. 可选链与 ?? "" 兜底随挂载点消失而退化）
// - setupPopups（init 域，阶段 5 由 boot 装配）与 pg.fn.modifyWatchlist
//   （links/popupActions 域，阶段 4 后续批次）尚未移植，按 events 域
//   registerAbortAll 先例改为注册缝：未注册时对应步骤跳过，装配期接线
// - 模块私有成员（命令解析族、autoEdit2/autoEdit3、bannerMessage、
//   getRvSummary）导出以供单元测试直调，行为不变
import { siteState } from "../api/siteinfo.ts";
import { popupString, simplePrintf, tprintf } from "../core/strings.ts";
import { anyChild, assume, escapeQuotesHTML, getJsObj } from "../core/tools.ts";
import { startDownload, type Downloader } from "../net/downloader.ts";

// setupPopups 注册缝：legacy autoEdit 直调 init 域的 setupPopups(callback)，
// 回调在站点初始化完成后执行（已初始化则立即执行）。重写版的初始化编排归
// boot（阶段 5），注册前 autoEdit 仅执行不依赖初始化的前置处理
export type SetupPopupsCallback = () => void;
export type SetupPopupsHook = (callback?: SetupPopupsCallback) => void | Promise<void>;
let setupPopupsHook: SetupPopupsHook | null = null;

export const registerSetupPopups = (fn: SetupPopupsHook | null): void => {
    setupPopupsHook = fn;
};

// pg.fn.modifyWatchlist 注册缝（实现见 legacy links.ts 的 pg.fn.modifyWatchlist）
export type ModifyWatchlistHook = (title: string | null, action: string | null) => void | Promise<void>;
let modifyWatchlistHook: ModifyWatchlistHook | null = null;

export const registerModifyWatchlist = (fn: ModifyWatchlistHook | null): void => {
    modifyWatchlistHook = fn;
};

export interface EditCmd {
    action: (data: string, cmdBody: EditCmd) => string;
    from: string;
    to: string;
    flags: string;
    remainder: string;
}

export const substitute = (data: string, cmdBody: EditCmd): string => {
    const fromRe = RegExp(cmdBody.from, cmdBody.flags);
    return data.replace(fromRe, cmdBody.to);
};

export const execCmds = (_data: string, cmdList: false | EditCmd[]): string => {
    let data = _data;
    if (!cmdList) {
        return data;
    }
    for (const cmd of cmdList) {
        data = cmd.action(data, cmd);
    }
    return data;
};

export const parseCmd = (str: string): false | EditCmd[] => {
    if (!str.length) {
        return [];
    }
    let p: false | EditCmd;
    switch (str.charAt(0)) {
        case "s":
            p = parseSubstitute(str);
            break;
        default:
            return false;
    }
    if (p) {
        return [p].concat(parseCmd(p.remainder) as EditCmd[]);
    }
    return false;
};

export const unEscape = (str: string, sep: string): string => str.split("\\\\").join("\\").split(`\\${sep}`).join(sep).split("\\n").join("\n");

export const parseSubstitute = (_str: string): false | EditCmd => {
    let str = _str;
    let from: string, to: string, flags: string, tmp: false | { segment: string; remainder: string };
    if (str.length < 4) {
        return false;
    }
    const sep = str.charAt(1);
    str = str.substring(2);
    tmp = skipOver(str, sep);
    if (tmp) {
        from = tmp.segment;
        str = tmp.remainder;
    } else {
        return false;
    }
    tmp = skipOver(str, sep);
    if (tmp) {
        to = tmp.segment;
        str = tmp.remainder;
    } else {
        return false;
    }
    flags = "";
    if (str.length) {
        tmp = skipOver(str, ";") || skipToEnd(str);
        flags = tmp.segment;
        str = tmp.remainder;
    }
    return {
        action: substitute,
        from,
        to,
        flags,
        remainder: str,
    };
};

export const skipOver = (str: string, sep: string): false | { segment: string; remainder: string } => {
    const endSegment = findNext(str, sep);
    if (endSegment < 0) {
        return false;
    }
    const segment = unEscape(str.substring(0, endSegment), sep);
    return {
        segment,
        remainder: str.substring(endSegment + 1),
    };
};

export const skipToEnd = (str: string): { segment: string; remainder: string } => ({
    segment: str,
    remainder: "",
});

export const findNext = (str: string, ch: string): number => {
    for (let i = 0; i < str.length; ++i) {
        if (str.charAt(i) === "\\") {
            i += 2;
        }
        if (str.charAt(i) === ch) {
            return i;
        }
    }
    return -1;
};

export const setCheckbox = (param: string, box: HTMLInputElement | undefined): void => {
    const val = mw.util.getParamValue(param);
    if (val && box) {
        switch (val) {
            case "1":
            case "yes":
            case "true":
                box.checked = true;
                break;
            case "0":
            case "no":
            case "false":
                box.checked = false;
        }
    }
};

// 自动编辑执行端。类型形态照搬 legacy：调用方另读 alreadyRan 做单次守卫
export const autoEdit: (() => void) & { alreadyRan?: boolean } = () => {
    if (!document.editform) {
        return false;
    }
    if ((mw.util.getParamValue("wpChangeTags") ?? "").includes("Popups")) {
        const wpChangeTags = document.createElement("input");
        wpChangeTags.type = "hidden";
        wpChangeTags.name = "wpChangeTags";
        wpChangeTags.value = "Popups";
        document.editform.append(wpChangeTags);
        document.editform.action += "&wpChangeTags=Popups";
        if (mw.util.getParamValue("autoclick") === "wpSave") {
            wpChangeTags.value += ",Automation tool";
            document.editform.action += "%2CAutomation%20tool";
        }
    }
    if (setupPopupsHook) {
        void setupPopupsHook(() => {
            if (mw.util.getParamValue("autoimpl") !== popupString("autoedit_version")) {
                return false;
            }
            if (mw.util.getParamValue("autowatchlist") && mw.util.getParamValue("actoken") === autoClickToken()) {
                void modifyWatchlistHook?.(mw.util.getParamValue("title"), mw.util.getParamValue("action"));
            }
            if (!document.editform) {
                return false;
            }
            if (autoEdit.alreadyRan) {
                return false;
            }
            autoEdit.alreadyRan = true;
            const cmdString = mw.util.getParamValue("autoedit");
            if (cmdString) {
                try {
                    const editbox = document.editform.wpTextbox1;
                    if (!editbox) {
                        return;
                    }
                    const cmdList = parseCmd(cmdString);
                    const input = editbox.value;
                    const output = execCmds(input, cmdList);
                    editbox.value = output;
                } catch {
                    return;
                }
                if (typeof wikEdUseWikEd !== "undefined") {
                    if (wikEdUseWikEd) {
                        WikEdUpdateFrame();
                    }
                }
            }
            setCheckbox("autominor", document.editform.wpMinoredit);
            setCheckbox("autowatch", document.editform.wpWatchthis);
            const rvid = mw.util.getParamValue("autorv");
            if (rvid) {
                const url = `${siteState.apiwikibase}?action=query&format=json&formatversion=2&prop=revisions&revids=${rvid}`;
                startDownload(url, null, autoEdit2);
            } else {
                autoEdit2();
            }
            return undefined;
        });
    }
    return undefined;
};

export const autoEdit2 = (d?: Downloader): void => {
    let summary = mw.util.getParamValue("autosummary");
    let summaryprompt: string | null | boolean = mw.util.getParamValue("autosummaryprompt");
    let summarynotice = "";
    if (d?.data && mw.util.getParamValue("autorv")) {
        const s = getRvSummary(summary, d.data);
        if (s === false) {
            summaryprompt = true;
            summarynotice = popupString("Failed to get revision information, please edit manually.\n\n");
            summary = simplePrintf(assume<string>(summary), [mw.util.getParamValue("autorv"), "(unknown)", "(unknown)"]);
        } else {
            summary = s;
        }
    }
    if (summaryprompt) {
        const txt = summarynotice + popupString("Enter a non-empty edit summary or press cancel to abort");
        const response = prompt(txt, summary as string | undefined);
        if (response) {
            summary = response;
        } else {
            return;
        }
    }
    if (summary) {
        if (document.editform?.wpSummary) {
            document.editform.wpSummary.value = summary;
        }
    }
    setTimeout(autoEdit3, 100);
};

export const autoClickToken = (): string => mw.user.sessionId();

export const autoEdit3 = (): void => {
    if (mw.util.getParamValue("actoken") !== autoClickToken()) {
        return;
    }
    const btn = mw.util.getParamValue("autoclick");
    if (btn) {
        if (document.editform?.[btn]) {
            const button = document.editform[btn] as HTMLButtonElement | HTMLInputElement;
            const msg = tprintf("The %s button has been automatically clicked. Please wait for the next page to load.", [button.value]);
            bannerMessage(msg);
            document.title = `(${document.title})`;
            button.click();
        } else {
            alert(tprintf("Could not find button %s. Please check the settings in your javascript file.", [btn]));
        }
    }
};

// 横幅提示：legacy 按 <h1> 定位插入点；无 h1 时 headings[0] 为 undefined，
// 访问 .parentNode 即抛 TypeError——照搬勿修（真实编辑页恒有 h1，测试锁定）
export const bannerMessage = (s: string): void => {
    const headings = document.getElementsByTagName("h1");
    const div = document.createElement("div");
    div.innerHTML = `<font size=+1><b>${escapeQuotesHTML(s)}</b></font>`;
    headings[0].parentNode?.insertBefore(div, headings[0]);
};

// MediaWiki API revisions 响应的一页（getRvSummary 只读 revisions[0]）
interface RvPage {
    revisions?: { timestamp: string; revid: number; user: string; userhidden?: boolean }[];
}

export const getRvSummary = (template: string | null, json: string | undefined): false | string => {
    try {
        const o = getJsObj(json ?? "") as { query?: { pages?: Record<string, RvPage> } };
        const edit = anyChild(o.query?.pages ?? {});
        const revision = edit?.revisions?.[0];
        if (!revision) {
            return false;
        }
        const timestamp = revision.timestamp.split(/[A-Z]/g).join(" ").replace(/^ *| *$/g, "");
        return simplePrintf(assume<string>(template), [revision.revid, timestamp, revision.userhidden ? "(hidden)" : revision.user]);
    } catch {
        return false;
    }
};
