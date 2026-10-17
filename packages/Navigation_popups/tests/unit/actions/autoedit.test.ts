// autoedit 域单元测试：命令解析族（parseCmd/parseSubstitute/execCmds/
// unEscape/skipOver/skipToEnd/findNext/substitute）、setCheckbox、autoEdit
// 的 URL 参数矩阵（wpChangeTags 注入、autoimpl 门控、autowatchlist、
// alreadyRan 防重、autoedit 应用、wikEd、autorv 拉取）、autoEdit2
// （autosummary/autosummaryprompt/autorv 摘要展开）、autoEdit3（actoken
// 门控、wpSave 点击、banner）、bannerMessage、getRvSummary。
// 行为基准 = legacy src/modules/autoedit.ts（commit 02c8dec），怪癖用例
// 名标「照搬勿修」。
//
// 装配形态：fresh 模块图（模块级注册缝与 autoEdit.alreadyRan 逐用例重置）
// + installMw；URL 参数经 history.replaceState 驱动（mockMw 的
// getParamValue 读 location.href，不额外解码——用例直接给解码后的值）。
// jsdom 的 HTMLFormElement 无 named getter，wpTextbox1 等控件按
// selection.test.ts 先例手动挂到 form 同名属性上。
import { afterEach, describe, expect, it, vi } from "vitest";
import { installMw } from "../../helpers/mockMw.ts";
import { installXhr } from "../../helpers/mockXhr.ts";
import * as Autoedit from "../../../src/actions/autoedit.ts";
import type * as SiteinfoNs from "../../../src/api/siteinfo.ts";
import type * as NetNs from "../../../src/net/downloader.ts";

type EditCmd = Autoedit.EditCmd;
type Siteinfo = typeof SiteinfoNs;
type Downloader = NetNs.Downloader;

interface Fresh {
    autoedit: typeof Autoedit;
    siteinfo: Siteinfo;
}

const fresh = async (): Promise<Fresh> => {
    vi.resetModules();
    const [autoedit, siteinfo] = await Promise.all([
        import("../../../src/actions/autoedit.ts"),
        import("../../../src/api/siteinfo.ts"),
    ]);
    installMw({ sessionId: "session-xyz" });
    return { autoedit, siteinfo };
};

// URL 参数驱动：mock 的 getParamValue 恒读 location.href 且不做百分号解码
// （真 mw.util 会解码），故用例的参数值一律取 ASCII——文案断言走 i18n 表
// 路径（不经 URL），不受此限制
const setUrl = (params: string): void => {
    window.history.replaceState({}, "", params ? `/?${params}` : "/");
};

interface EditformFixture {
    form: HTMLFormElement;
    box: HTMLTextAreaElement | null;
    minor: HTMLInputElement;
    watch: HTMLInputElement;
    summary: HTMLInputElement | null;
    save: HTMLInputElement | null;
}

interface EditformOptions {
    box?: string | null;
    minorChecked?: boolean;
    watchChecked?: boolean;
    summary?: string | null;
    save?: boolean;
}

const installEditform = (options: EditformOptions = {}): EditformFixture => {
    const form = document.createElement("form");
    form.setAttribute("action", "/index.php?title=Foo&action=submit");
    document.body.appendChild(form);
    const attach = <T extends HTMLElement>(element: T, name: string): T => {
        element.setAttribute("name", name);
        form.appendChild(element);
        (form as unknown as Record<string, unknown>)[name] = element;
        return element;
    };
    let box: HTMLTextAreaElement | null = null;
    if (options.box !== null) {
        const textarea = document.createElement("textarea");
        textarea.value = options.box ?? "";
        box = attach(textarea, "wpTextbox1");
    }
    const minor = attach(document.createElement("input"), "wpMinoredit");
    minor.type = "checkbox";
    minor.checked = options.minorChecked ?? false;
    const watch = attach(document.createElement("input"), "wpWatchthis");
    watch.type = "checkbox";
    watch.checked = options.watchChecked ?? false;
    let summary: HTMLInputElement | null = null;
    if (options.summary !== null) {
        summary = attach(document.createElement("input"), "wpSummary");
        summary.value = options.summary ?? "";
    }
    let save: HTMLInputElement | null = null;
    if (options.save) {
        save = attach(document.createElement("input"), "wpSave");
        save.type = "button";
        save.value = "保存页面";
    }
    (document as unknown as Record<string, unknown>).editform = form;
    return { form, box, minor, watch, summary, save };
};

// 捕获 setupPopups 注册缝的回调但不立即执行：便于在回调运行前改 URL/DOM
const captureCallback = (mod: typeof Autoedit): { run: () => void; captured: () => boolean } => {
    let captured: (() => void) | null = null;
    mod.registerSetupPopups((callback) => {
        captured = callback ?? null;
    });
    return {
        run: () => {
            captured?.();
        },
        captured: () => captured !== null,
    };
};

const RV_JSON = JSON.stringify({
    query: {
        pages: {
            42: {
                revisions: [
                    { timestamp: "2024-01-02T03:04:05Z", revid: 42, user: "Alice" },
                ],
            },
        },
    },
});

const RV_JSON_HIDDEN = JSON.stringify({
    query: {
        pages: {
            42: {
                revisions: [
                    { timestamp: "2024-01-02T03:04:05Z", revid: 42, user: "Alice", userhidden: true },
                ],
            },
        },
    },
});

const downloaderWith = (data?: string): Downloader => ({ data } as unknown as Downloader);

afterEach(() => {
    setUrl("");
    document.body.innerHTML = "";
    document.title = "";
    Reflect.deleteProperty(document, "editform");
});

describe("autoClickToken", () => {
    it("返回 mw.user.sessionId()", () => {
        installMw({ sessionId: "session-xyz" });
        expect(Autoedit.autoClickToken()).toBe("session-xyz");
    });
});

describe("autoedit 命令解析族", () => {
    it("parseCmd：空串返回空命令列表", async () => {
        const { autoedit } = await fresh();
        expect(autoedit.parseCmd("")).toEqual([]);
    });

    it("parseCmd：非 s 开头返回 false", async () => {
        const { autoedit } = await fresh();
        expect(autoedit.parseCmd("x/y/z/")).toBe(false);
    });

    it("parseCmd：单条 s 命令解析出 from/to/flags/remainder", async () => {
        const { autoedit } = await fresh();
        const list = autoedit.parseCmd("s/a/b/g");
        expect(Array.isArray(list)).toBe(true);
        const cmd = (list as EditCmd[])[0];
        expect(cmd.from).toBe("a");
        expect(cmd.to).toBe("b");
        expect(cmd.flags).toBe("g");
        expect(cmd.remainder).toBe("");
    });

    it("parseCmd：分号串接多条命令（递归 remainder）", async () => {
        const { autoedit } = await fresh();
        const list = autoedit.parseCmd("s/a/b/;s/c/d/g") as EditCmd[];
        expect(list).toHaveLength(2);
        expect([list[0].from, list[0].flags]).toEqual(["a", ""]);
        expect([list[1].from, list[1].flags]).toEqual(["c", "g"]);
    });

    it("parseCmd：s 命令字段缺分隔符时整串返回 false（照搬勿修）", async () => {
        const { autoedit } = await fresh();
        expect(autoedit.parseCmd("s abc")).toBe(false);
    });

    it("parseCmd：尾部残留非 s 时把 false 也 concat 进列表（照搬勿修）", async () => {
        const { autoedit } = await fresh();
        const list = autoedit.parseCmd("s/a/b/g;x") as unknown[];
        expect(list).toHaveLength(2);
        // legacy 的 `[p].concat(parseCmd(p.remainder) as EditCmd[])` 不去除 false
        expect(list[1]).toBe(false);
        // 该 false 项令 execCmds 抛 TypeError（autoEdit 的 catch 兜底依据）
        expect(() => autoedit.execCmds("abc", list as EditCmd[])).toThrow(TypeError);
    });

    it("parseSubstitute：长度不足 4 返回 false", async () => {
        const { autoedit } = await fresh();
        expect(autoedit.parseSubstitute("s/a")).toBe(false);
    });

    it("parseSubstitute：from 段缺少分隔符返回 false", async () => {
        const { autoedit } = await fresh();
        expect(autoedit.parseSubstitute("sa/b")).toBe(false);
    });

    it("parseSubstitute：to 段缺少分隔符返回 false", async () => {
        const { autoedit } = await fresh();
        expect(autoedit.parseSubstitute("s/a/b")).toBe(false);
    });

    it("parseSubstitute：分隔符任意字符（~ 与 |）", async () => {
        const { autoedit } = await fresh();
        const tilde = autoedit.parseSubstitute("s~a~b~g") as EditCmd;
        expect([tilde.from, tilde.to, tilde.flags, tilde.remainder]).toEqual(["a", "b", "g", ""]);
        const pipe = autoedit.parseSubstitute("s|a|b|") as EditCmd;
        expect([pipe.from, pipe.to, pipe.flags, pipe.remainder]).toEqual(["a", "b", "", ""]);
    });

    it("parseSubstitute：flags 到串尾（skipToEnd 分支）与分号截断（skipOver 分支）", async () => {
        const { autoedit } = await fresh();
        const toEnd = autoedit.parseSubstitute("s/a/b/gi") as EditCmd;
        expect([toEnd.flags, toEnd.remainder]).toEqual(["gi", ""]);
        const withSemi = autoedit.parseSubstitute("s/a/b/g;c") as EditCmd;
        expect([withSemi.flags, withSemi.remainder]).toEqual(["g", "c"]);
    });

    it("parseSubstitute：\\sep 转义的分隔符不结束段（findNext 跳过转义）", async () => {
        const { autoedit } = await fresh();
        const cmd = autoedit.parseSubstitute(String.raw`s/a\/b/c/`) as EditCmd;
        expect([cmd.from, cmd.to]).toEqual(["a/b", "c"]);
    });

    it("unEscape：先折叠 \\\\，再还原 \\sep，最后展开 \\n", async () => {
        const { autoedit } = await fresh();
        expect(autoedit.unEscape(String.raw`a\\b`, "~")).toBe(String.raw`a\b`);
        expect(autoedit.unEscape(String.raw`a\~b`, "~")).toBe("a~b");
        expect(autoedit.unEscape(String.raw`a\nb`, "~")).toBe("a\nb");
        // 折叠先于展开：\\n 也成换行（照搬勿修）
        expect(autoedit.unEscape(String.raw`a\\nb`, "~")).toBe("a\nb");
    });

    it("skipOver：找不到分隔符返回 false，找到则切段并 unEscape", async () => {
        const { autoedit } = await fresh();
        expect(autoedit.skipOver("abc", "/")).toBe(false);
        expect(autoedit.skipOver(String.raw`a\/b/c/d`, "/")).toEqual({ segment: "a/b", remainder: "c/d" });
    });

    it("skipToEnd：整段 + 空 remainder", async () => {
        const { autoedit } = await fresh();
        expect(autoedit.skipToEnd("abc")).toEqual({ segment: "abc", remainder: "" });
    });

    it("findNext：返回分隔符下标，转义处跳过两格", async () => {
        const { autoedit } = await fresh();
        expect(autoedit.findNext("abc", "b")).toBe(1);
        expect(autoedit.findNext("abc", "z")).toBe(-1);
        // i 命中 "\\" 后 i += 2 再比对：紧邻的转义分隔符被跳过（照搬勿修）
        expect(autoedit.findNext(String.raw`a\~b~c`, "~")).toBe(4);
        expect(autoedit.findNext(String.raw`\~`, "~")).toBe(-1);
    });

    it("execCmds：false 与空列表原样返回，命令依序作用于数据", async () => {
        const { autoedit } = await fresh();
        expect(autoedit.execCmds("abc", false)).toBe("abc");
        expect(autoedit.execCmds("abc", [])).toBe("abc");
        const list = autoedit.parseCmd("s/a/x/g;s/x/y/g") as EditCmd[];
        expect(autoedit.execCmds("abc", list)).toBe("ybc");
    });

    it("substitute：RegExp 标志与 $1 反向引用", async () => {
        const { autoedit } = await fresh();
        const flags = autoedit.parseSubstitute("s/a/x/g") as EditCmd;
        expect(flags.action("banana", flags)).toBe("bxnxnx");
        const backref = autoedit.parseSubstitute("s/(b)/[$1]/") as EditCmd;
        expect(backref.action("abc", backref)).toBe("a[b]c");
    });
});

describe("setCheckbox", () => {
    it("1/yes/true 勾选，0/no/false 取消勾选（其余值不动）", async () => {
        const { autoedit } = await fresh();
        const box = document.createElement("input");
        box.type = "checkbox";
        for (const on of ["1", "yes", "true"]) {
            box.checked = false;
            setUrl(`autominor=${on}`);
            autoedit.setCheckbox("autominor", box);
            expect(box.checked).toBe(true);
        }
        for (const off of ["0", "no", "false"]) {
            box.checked = true;
            setUrl(`autominor=${off}`);
            autoedit.setCheckbox("autominor", box);
            expect(box.checked).toBe(false);
        }
        box.checked = false;
        setUrl("autominor=maybe");
        autoedit.setCheckbox("autominor", box);
        expect(box.checked).toBe(false);
    });

    it("参数缺失或 box 未提供时不动作", async () => {
        const { autoedit } = await fresh();
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = true;
        setUrl("");
        autoedit.setCheckbox("autominor", box);
        expect(box.checked).toBe(true);
        setUrl("autominor=1");
        autoedit.setCheckbox("autominor", undefined);
        expect(box.checked).toBe(true);
    });
});

describe("autoEdit（URL 参数驱动）", () => {
    it("无 editform 时直接返回（不动 alreadyRan、不注入标签）", async () => {
        const { autoedit } = await fresh();
        setUrl("wpChangeTags=Popups&autoclick=wpSave");
        autoedit.autoEdit();
        expect(autoedit.autoEdit.alreadyRan).toBeUndefined();
        expect(document.querySelector('input[name="wpChangeTags"]')).toBeNull();
    });

    it("wpChangeTags 含 Popups：注入 hidden input 并改 form action", async () => {
        const { autoedit } = await fresh();
        const fixture = installEditform();
        setUrl("wpChangeTags=Popups");
        autoedit.autoEdit();
        const injected = fixture.form.querySelector<HTMLInputElement>('input[name="wpChangeTags"]');
        expect(injected?.type).toBe("hidden");
        expect(injected?.value).toBe("Popups");
        expect(fixture.form.getAttribute("action")).toContain("&wpChangeTags=Popups");
        expect(fixture.form.getAttribute("action")).not.toContain("Automation");
    });

    it("wpChangeTags 含 Popups 且 autoclick=wpSave：追加 Automation tool（萌百定制）", async () => {
        const { autoedit } = await fresh();
        const fixture = installEditform();
        setUrl("wpChangeTags=Popups&autoclick=wpSave");
        autoedit.autoEdit();
        const injected = fixture.form.querySelector<HTMLInputElement>('input[name="wpChangeTags"]');
        expect(injected?.value).toBe("Popups,Automation tool");
        expect(fixture.form.getAttribute("action")).toContain("%2CAutomation%20tool");
    });

    it("wpChangeTags 不含 Popups 时不注入", async () => {
        const { autoedit } = await fresh();
        const fixture = installEditform();
        setUrl("wpChangeTags=Other");
        autoedit.autoEdit();
        expect(fixture.form.querySelector('input[name="wpChangeTags"]')).toBeNull();
    });

    it("setupPopups 注册缝未接线时回调体不执行（阶段 5 boot 接线前）", async () => {
        const { autoedit } = await fresh();
        const fixture = installEditform({ box: "abc" });
        setUrl("autoimpl=np20140416&autoedit=s/a/b/");
        autoedit.autoEdit();
        expect(fixture.box?.value).toBe("abc");
        expect(autoedit.autoEdit.alreadyRan).toBeUndefined();
    });

    it("autoimpl 与 popupString(autoedit_version) 不符时早退", async () => {
        const { autoedit } = await fresh();
        const fixture = installEditform({ box: "abc" });
        const seam = captureCallback(autoedit);
        setUrl("autoimpl=other&autoedit=s/a/b/&autominor=1");
        autoedit.autoEdit();
        expect(seam.captured()).toBe(true);
        seam.run();
        expect(fixture.box?.value).toBe("abc");
        expect(fixture.minor.checked).toBe(false);
        expect(autoedit.autoEdit.alreadyRan).toBeUndefined();
    });

    it("完整命中：autoedit 命令应用、autominor/autowatch 勾选、autosummary 落位、alreadyRan 置位", async () => {
        const { autoedit } = await fresh();
        const fixture = installEditform({ box: "a", watchChecked: true });
        const seam = captureCallback(autoedit);
        setUrl("autoimpl=np20140416&autoedit=s/a/b/&autominor=1&autowatch=0&autosummary=sum-1&title=Foo&action=submit");
        autoedit.autoEdit();
        seam.run();
        expect(fixture.box?.value).toBe("b");
        expect(fixture.minor.checked).toBe(true);
        expect(fixture.watch.checked).toBe(false);
        expect(fixture.summary?.value).toBe("sum-1");
        expect(autoedit.autoEdit.alreadyRan).toBe(true);
    });

    it("alreadyRan 防重：第二次回调不再应用命令", async () => {
        const { autoedit } = await fresh();
        const fixture = installEditform({ box: "a" });
        const seam = captureCallback(autoedit);
        setUrl("autoimpl=np20140416&autoedit=s/a/b/");
        autoedit.autoEdit();
        seam.run();
        expect(fixture.box?.value).toBe("b");
        setUrl("autoimpl=np20140416&autoedit=s/b/c/");
        autoedit.autoEdit();
        seam.run();
        expect(fixture.box?.value).toBe("b");
    });

    it("回调运行时 editform 消失则早退（不崩、命令不应用）", async () => {
        const { autoedit } = await fresh();
        installEditform({ box: "a" });
        const seam = captureCallback(autoedit);
        setUrl("autoimpl=np20140416&autoedit=s/a/b/");
        autoedit.autoEdit();
        expect(seam.captured()).toBe(true);
        Reflect.deleteProperty(document, "editform");
        expect(() => {
            seam.run();
        }).not.toThrow();
        expect(autoedit.autoEdit.alreadyRan).toBeUndefined();
    });

    it("autowatchlist 且 actoken 相符：经注册缝调用 modifyWatchlist(title, action)", async () => {
        const { autoedit } = await fresh();
        installEditform();
        const watchlist = vi.fn();
        autoedit.registerModifyWatchlist(watchlist);
        const seam = captureCallback(autoedit);
        setUrl("autoimpl=np20140416&autowatchlist=1&actoken=session-xyz&title=Foo&action=watch");
        autoedit.autoEdit();
        seam.run();
        expect(watchlist).toHaveBeenCalledExactlyOnceWith("Foo", "watch");
    });

    it("autowatchlist 但 actoken 不符：不调用 modifyWatchlist", async () => {
        const { autoedit } = await fresh();
        installEditform();
        const watchlist = vi.fn();
        autoedit.registerModifyWatchlist(watchlist);
        const seam = captureCallback(autoedit);
        setUrl("autoimpl=np20140416&autowatchlist=1&actoken=wrong");
        autoedit.autoEdit();
        seam.run();
        expect(watchlist).not.toHaveBeenCalled();
    });

    it("autowatchlist 命中但 modifyWatchlist 注册缝未接线：跳过不崩", async () => {
        const { autoedit } = await fresh();
        installEditform();
        const seam = captureCallback(autoedit);
        setUrl("autoimpl=np20140416&autowatchlist=1&actoken=session-xyz");
        autoedit.autoEdit();
        expect(() => {
            seam.run();
        }).not.toThrow();
        expect(autoedit.autoEdit.alreadyRan).toBe(true);
    });

    it("wikEd 启用时命令应用后刷帧（typeof 守卫真值与全局函数调用）", async () => {
        const { autoedit } = await fresh();
        const fixture = installEditform({ box: "a" });
        const updateFrame = vi.fn();
        vi.stubGlobal("wikEdUseWikEd", true);
        vi.stubGlobal("WikEdUpdateFrame", updateFrame);
        const seam = captureCallback(autoedit);
        setUrl("autoimpl=np20140416&autoedit=s/a/b/");
        autoedit.autoEdit();
        seam.run();
        expect(fixture.box?.value).toBe("b");
        expect(updateFrame).toHaveBeenCalledOnce();
    });

    it("wikEd 全局存在但关闭时不刷帧（typeof 守卫与真值两分支）", async () => {
        const { autoedit } = await fresh();
        installEditform({ box: "a" });
        const updateFrame = vi.fn();
        vi.stubGlobal("wikEdUseWikEd", false);
        vi.stubGlobal("WikEdUpdateFrame", updateFrame);
        const seam = captureCallback(autoedit);
        setUrl("autoimpl=np20140416&autoedit=s/a/b/");
        autoedit.autoEdit();
        seam.run();
        expect(updateFrame).not.toHaveBeenCalled();
    });

    it("表单无 wpTextbox1 时命令段早退（复选框不再设置）", async () => {
        const { autoedit } = await fresh();
        installEditform({ box: null, minorChecked: false });
        const seam = captureCallback(autoedit);
        setUrl("autoimpl=np20140416&autoedit=s/a/b/&autominor=1");
        autoedit.autoEdit();
        seam.run();
        expect(autoedit.autoEdit.alreadyRan).toBe(true);
    });

    it("畸形命令（尾部 false 项）在 try/catch 内吞掉：不设置复选框、不崩", async () => {
        const { autoedit } = await fresh();
        const fixture = installEditform({ box: "a" });
        const seam = captureCallback(autoedit);
        // parseCmd 把尾部 false 也 concat 进列表，execCmds 对它取 action 抛
        // TypeError——autoEdit 的 catch 兜底（后续步骤一并跳过）
        setUrl("autoimpl=np20140416&autoedit=s/a/b/g;x&autominor=1");
        autoedit.autoEdit();
        expect(() => {
            seam.run();
        }).not.toThrow();
        expect(fixture.box?.value).toBe("a");
        expect(fixture.minor.checked).toBe(false);
    });

    it("autorv：按 siteState.apiwikibase 拼 URL 拉取并回填展开摘要", async () => {
        const { autoedit, siteinfo } = await fresh();
        const { sent } = installXhr(() => ({ status: 200, responseText: RV_JSON }));
        siteinfo.siteState.apiwikibase = "https://zh.moegirl.org.cn/api.php";
        const fixture = installEditform({ summary: "" });
        const seam = captureCallback(autoedit);
        setUrl("autoimpl=np20140416&autorv=42&autosummary=rv-$1-$2-$3");
        autoedit.autoEdit();
        seam.run();
        await vi.waitFor(() => {
            expect(fixture.summary?.value).toBe("rv-42-2024-01-02 03:04:05-Alice");
        });
        expect(sent[0]?.url).toBe("https://zh.moegirl.org.cn/api.php?action=query&format=json&formatversion=2&prop=revisions&revids=42");
    });
});

describe("autoEdit2", () => {
    it("autosummary 直接写入 wpSummary（无 autorv 时同步走完）", async () => {
        const { autoedit } = await fresh();
        const fixture = installEditform({ summary: "" });
        setUrl("autosummary=direct-summary");
        autoedit.autoEdit2();
        expect(fixture.summary?.value).toBe("direct-summary");
    });

    it("autosummaryprompt：prompt 收到默认摘要，确认后用返回值覆盖", async () => {
        const { autoedit } = await fresh();
        const fixture = installEditform({ summary: "" });
        const promptSpy = vi.fn(() => "manual-summary");
        vi.stubGlobal("prompt", promptSpy);
        setUrl("autosummary=orig-summary&autosummaryprompt=1");
        autoedit.autoEdit2();
        expect(promptSpy).toHaveBeenCalledExactlyOnceWith("输入编辑摘要，或按取消中止操作", "orig-summary");
        expect(fixture.summary?.value).toBe("manual-summary");
    });

    it("autosummaryprompt 取消：中止流程，不写摘要也不触发 autoEdit3 定时器", async () => {
        const { autoedit } = await fresh();
        vi.useFakeTimers();
        try {
            const fixture = installEditform({ summary: "旧摘要", save: true });
            const save = fixture.save;
            const clicked = vi.fn();
            save?.addEventListener("click", clicked);
            vi.stubGlobal("prompt", vi.fn(() => ""));
            setUrl("autosummaryprompt=1&actoken=session-xyz&autoclick=wpSave");
            autoedit.autoEdit2();
            vi.advanceTimersByTime(200);
            expect(fixture.summary?.value).toBe("旧摘要");
            expect(clicked).not.toHaveBeenCalled();
        } finally {
            vi.useRealTimers();
        }
    });

    it("autorv + 响应数据：getRvSummary 展开成功时写入展开摘要", async () => {
        const { autoedit } = await fresh();
        const fixture = installEditform({ summary: "" });
        setUrl("autorv=42&autosummary=rv-$1-$2-$3");
        autoedit.autoEdit2(downloaderWith(RV_JSON));
        expect(fixture.summary?.value).toBe("rv-42-2024-01-02 03:04:05-Alice");
    });

    it("autorv + 响应解析失败：强制 prompt，默认值为未知占位摘要且带失败提示", async () => {
        const { autoedit } = await fresh();
        const fixture = installEditform({ summary: "" });
        const promptSpy = vi.fn(() => "手工摘要");
        vi.stubGlobal("prompt", promptSpy);
        setUrl("autorv=42&autosummary=rv-$1-$2");
        autoedit.autoEdit2(downloaderWith("not json"));
        expect(promptSpy).toHaveBeenCalledOnce();
        const [text, defaultValue] = promptSpy.mock.calls[0] as unknown as [string, string];
        expect(text).toBe("获取修订版本信息失败，请手动修改。\n\n输入编辑摘要，或按取消中止操作");
        expect(defaultValue).toBe("rv-42-(unknown)");
        expect(fixture.summary?.value).toBe("手工摘要");
    });

    it("autorv 无响应数据 / 无 autorv 参数：跳过版本段（d 与 d.data 两分支）", async () => {
        const { autoedit } = await fresh();
        const fixture = installEditform({ summary: "" });
        setUrl("autorv=42&autosummary=asis-summary");
        autoedit.autoEdit2(downloaderWith());
        expect(fixture.summary?.value).toBe("asis-summary");
        setUrl("autosummary=norv-summary");
        autoedit.autoEdit2(downloaderWith(RV_JSON));
        expect(fixture.summary?.value).toBe("norv-summary");
    });

    it("摘要为空且无 prompt 时不写 wpSummary，但仍在 100ms 后驱动 autoEdit3", async () => {
        const { autoedit } = await fresh();
        vi.useFakeTimers();
        try {
            vi.stubGlobal("prompt", vi.fn(() => null));
            // bannerMessage 需要 h1 作插入锚点（真实编辑页恒有）
            document.body.appendChild(document.createElement("h1"));
            const fixture = installEditform({ summary: "旧摘要", save: true });
            const clicked = vi.fn();
            fixture.save?.addEventListener("click", clicked);
            setUrl("actoken=session-xyz&autoclick=wpSave");
            autoedit.autoEdit2();
            expect(fixture.summary?.value).toBe("旧摘要");
            vi.advanceTimersByTime(100);
            expect(clicked).toHaveBeenCalledOnce();
        } finally {
            vi.useRealTimers();
        }
    });

    it("无 wpSummary / 无 editform 时不崩（可选链两分支）", async () => {
        const { autoedit } = await fresh();
        installEditform({ summary: null });
        setUrl("autosummary=some-summary");
        expect(() => {
            autoedit.autoEdit2();
        }).not.toThrow();
        Reflect.deleteProperty(document, "editform");
        expect(() => {
            autoedit.autoEdit2();
        }).not.toThrow();
    });
});

describe("autoEdit3", () => {
    it("actoken 不符时不动作", async () => {
        const { autoedit } = await fresh();
        const fixture = installEditform({ save: true });
        document.title = "原标题";
        setUrl("actoken=wrong&autoclick=wpSave");
        autoedit.autoEdit3();
        expect(document.title).toBe("原标题");
        expect(fixture.save?.value).toBe("保存页面");
    });

    it("actoken 相符且 autoclick 命中：横幅提示 + 标题加括号 + 点击按钮", async () => {
        const { autoedit } = await fresh();
        const heading = document.createElement("h1");
        document.body.appendChild(heading);
        const fixture = installEditform({ save: true });
        const clicked = vi.fn();
        fixture.save?.addEventListener("click", clicked);
        document.title = "原标题";
        setUrl("actoken=session-xyz&autoclick=wpSave");
        autoedit.autoEdit3();
        expect(clicked).toHaveBeenCalledOnce();
        expect(document.title).toBe("(原标题)");
        const banner = document.body.querySelector("div");
        expect(banner?.innerHTML).toBe('<font size="+1"><b>按钮 保存页面 已被自动点击，请等待下一个页面加载。</b></font>');
        expect(banner?.previousElementSibling).toBeNull();
    });

    it("autoclick 参数缺失时不动作", async () => {
        const { autoedit } = await fresh();
        installEditform({ save: true });
        document.title = "原标题";
        setUrl("actoken=session-xyz");
        autoedit.autoEdit3();
        expect(document.title).toBe("原标题");
    });

    it("按钮不存在时 alert 提示（tprintf 文案带按钮名）", async () => {
        const { autoedit } = await fresh();
        installEditform();
        const alertSpy = vi.fn();
        vi.stubGlobal("alert", alertSpy);
        setUrl("actoken=session-xyz&autoclick=wpDiff");
        autoedit.autoEdit3();
        expect(alertSpy).toHaveBeenCalledExactlyOnceWith("找不到按钮 wpDiff，请检查您 JavaScript 文件中的设置。");
    });

    it("无 editform 时按钮查找落空走 alert 分支", async () => {
        const { autoedit } = await fresh();
        const alertSpy = vi.fn();
        vi.stubGlobal("alert", alertSpy);
        setUrl("actoken=session-xyz&autoclick=wpSave");
        autoedit.autoEdit3();
        expect(alertSpy).toHaveBeenCalledOnce();
    });
});

describe("bannerMessage", () => {
    it("把转义后的消息插到首个 h1 之前", async () => {
        const { autoedit } = await fresh();
        const heading = document.createElement("h1");
        document.body.appendChild(heading);
        autoedit.bannerMessage('<b>hi</b> & "quoted"');
        const banner = document.body.querySelector("div");
        // innerHTML 读回经 jsdom 重序列化：属性值统一双引号，文本节点内的
        // " 不再转义（&quot; 为属性值转义形态，文本中本就不需要）
        expect(banner?.innerHTML).toBe('<font size="+1"><b>&lt;b&gt;hi&lt;/b&gt; &amp; "quoted"</b></font>');
        expect(banner?.nextElementSibling).toBe(heading);
        expect(document.body.firstElementChild).toBe(banner);
    });

    it("无 h1 时访问 headings[0].parentNode 抛 TypeError（照搬勿修）", async () => {
        const { autoedit } = await fresh();
        expect(() => {
            autoedit.bannerMessage("x");
        }).toThrow(TypeError);
    });
});

describe("getRvSummary", () => {
    it("$1/$2/$3 展开为 revid、去 T/Z 的时间戳、用户名", async () => {
        const { autoedit } = await fresh();
        expect(autoedit.getRvSummary("rv-$1-$2-$3", RV_JSON)).toBe("rv-42-2024-01-02 03:04:05-Alice");
    });

    it("userhidden 时第三占位符为 (hidden)", async () => {
        const { autoedit } = await fresh();
        expect(autoedit.getRvSummary("rv-$1-$3", RV_JSON_HIDDEN)).toBe("rv-42-(hidden)");
    });

    it("无 revisions / 无 query / 非法 JSON / json 未提供 均返回 false", async () => {
        const { autoedit } = await fresh();
        expect(autoedit.getRvSummary("rv-$1", JSON.stringify({ query: { pages: { 42: {} } } }))).toBe(false);
        expect(autoedit.getRvSummary("rv-$1", "{}")).toBe(false);
        expect(autoedit.getRvSummary("rv-$1", "not json")).toBe(false);
        expect(autoedit.getRvSummary("rv-$1", undefined)).toBe(false);
    });

    it("revision 缺 timestamp：展开抛错被 catch 兜住返回 false", async () => {
        const { autoedit } = await fresh();
        const malformed = JSON.stringify({ query: { pages: { 42: { revisions: [{}] } } } });
        expect(autoedit.getRvSummary("rv-$1", malformed)).toBe(false);
    });
});
