// Title 解析域镜像测试：行为基准 = legacy src/modules/titles.ts（commit 02c8dec），
// 其依赖的 pg.wiki/pg.re 站点派生值（titlebase、main/Special 页正则等）在重写版
// 由 title 模块的可注入 wiki 状态承载——本文件的 fixtures 按 legacy init.ts 的
// setTitleBase/setMainRegex/setRegexps/setMisc 公式，用 mockMw 的萌百站形态构造。
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MockMw } from "../../helpers/mockMw.ts";
import { installMw } from "../../helpers/mockMw.ts";
import {
    Stringwrapper,
    Title,
    anchorContainsImage,
    isDisambig,
    isInMainNamespace,
    isInStrippableNamespace,
    isPopupLink,
    isValidImageName,
    parseParams,
    parenSplit,
    safeDecodeURI,
    stubCount,
    wiki,
} from "../../../src/title/title.ts";
import * as nsModuleRef from "../../../src/title/namespaces.ts";

import type * as TitleModuleNs from "../../../src/title/title.ts";
import type * as NamespacesModuleNs from "../../../src/title/namespaces.ts";

type TitleModule = typeof TitleModuleNs;
type NamespacesModule = typeof NamespacesModuleNs;

const SITEBASE = "zh.moegirl.org.cn";
const TITLEBASE = `https://${SITEBASE}/index.php?title=`;
const ARTICLEBASE = `https://${SITEBASE}`;

// legacy init.ts fetchSpecialPageNames 取回的 specialpagealiases 萌百形态子集
// （本域只消费 Contributions/Diff/Emailuser/Whatlinkshere 四个 realname）
const SPECIAL_PAGE_ALIASES: { realname: string; aliases: string[] }[] = [
    { realname: "Contributions", aliases: ["Contributions", "贡献"] },
    { realname: "Diff", aliases: ["diff"] },
    { realname: "Emailuser", aliases: ["Emailuser"] },
    { realname: "Whatlinkshere", aliases: ["Whatlinkshere"] },
];

// legacy init.ts setRegexps 的 ipUser 常量（^ 只约束 IPv6 支、$ 只约束 IPv4 支，
// legacy 原样）
const IP_USER_SOURCE = "^(?::(?::|(?::[0-9A-Fa-f]{1,4}){1,7})|[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){0,6}::|[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){7})|(((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9]))$";

// legacy options.ts 的选项默认值（isDisambig/stubCount 依赖的正则源）
const DAB_REGEXP_SOURCE = "disambiguation\\}\\}|\\{\\{\\s*(d(ab|isamb(ig(uation)?)?)|(((geo|hn|road?|school|number)dis)|[234][lc][acw]|(road|ship)index))\\s*(\\|[^}]*)?\\}\\}|is a .*disambiguation.*page";
const STUB_REGEXP_SOURCE = "(sect)?stub[}][}]|This .*-related article is a .*stub";

// 镜像 legacy init.ts 各 setup（mw 为已 install 的 mock；wikiState/nsMod 允许
// 动态 import 的 fresh 模块实例复用同一装配）
const buildTitleWikiFixtures = (mw: MockMw, wikiState: TitleModule["wiki"], nsMod: NamespacesModule): void => {
    const esc = mw.util.escapeRegExp;
    nsMod.setNamespaces();
    const sp = nsMod.nsRe(nsMod.nsState.specialId);
    const userRe = nsMod.nsRe(nsMod.nsState.userId);
    // setTitleBase（protocol/sitebase 取萌百 https 形态）
    wikiState.titlebase = TITLEBASE;
    wikiState.re.basenames = RegExp(`^(${esc(TITLEBASE)}|${esc(ARTICLEBASE)})`);
    // setMainRegex
    const articlePath = String(mw.config.get("wgArticlePath")).replace(/\/\$1/, "");
    const preTitles = `(?:${esc(String(mw.config.get("wgScript")))}|${esc(String(mw.config.get("wgScriptPath")))}/(?:index[.]php|wiki[.]phtml))`;
    wikiState.re.main = RegExp(`[^:]*://${esc(SITEBASE)}(${preTitles}[?]title=|${esc(`${articlePath}/`)})([^&?#]*)[^#]*(?:#(.+))?`);
    // setRegexps（Special 页四正则 + 常量正则）
    wikiState.re.urlNoPopup = RegExp(`((title=|/)${sp}(?:%3A|:)|section=[0-9]|^#$)`);
    wikiState.re.ipUser = RegExp(IP_USER_SOURCE);
    wikiState.re.disambig = RegExp(DAB_REGEXP_SOURCE, "im");
    wikiState.re.stub = RegExp(STUB_REGEXP_SOURCE, "im");
    const buildSpecialPageGroup = (realname: string, aliases: readonly string[]): string => {
        const variants = [esc(realname), esc(encodeURI(realname))];
        for (const alias of aliases) {
            variants.push(esc(alias), esc(encodeURI(alias)));
        }
        return variants.join("|");
    };
    for (const { realname, aliases } of SPECIAL_PAGE_ALIASES) {
        const group = buildSpecialPageGroup(realname, aliases);
        if (realname === "Contributions") {
            wikiState.re.contribs = RegExp(`(title=|/)${sp}(?:%3A|:)(?:${group})(&target=|/|/${userRe}:)(.*)`, "i");
        } else if (realname === "Diff") {
            wikiState.re.specialdiff = RegExp(`/${sp}(?:%3A|:)(?:${group})/([^?#]*)`, "i");
        } else if (realname === "Emailuser") {
            wikiState.re.email = RegExp(`(title=|/)${sp}(?:%3A|:)(?:${group})(&target=|/|/(?:${userRe})?:)(.*)`, "i");
        } else if (realname === "Whatlinkshere") {
            wikiState.re.backlinks = RegExp(`(title=|/)${sp}(?:%3A|:)(?:${group})(&target=|/)([^&]*)`, "i");
        }
    }
    // setMisc 的 decodeExtras
    wikiState.misc.decodeExtras = [
        { from: "%2C", to: "," },
        { from: "_", to: " " },
        { from: "%24", to: "$" },
        { from: "%26", to: "&" },
    ];
};

let mwTable: Record<string, unknown>;

// 测试侧选项基线（与 legacy 默认一致）；用例覆盖 wiki.getOption 后由
// beforeEach 重置，避免跨用例泄漏
const testOptionDefaults: Record<string, unknown> = {
    popupOnlyArticleLinks: true,
    popupAllDabsStubs: false,
};

beforeEach(() => {
    document.body.innerHTML = "";
    const installed = installMw();
    mwTable = installed.config;
    wiki.getOption = (name: string): unknown => testOptionDefaults[name];
    buildTitleWikiFixtures(installed.mw, wiki, nsModuleRef);
});

// 在 mw 配置表里补默认 mock 缺少的 talk 别名（真实萌百 wgNamespaceIds 全集有）
const addNamespaceAlias = (alias: string, id: number): void => {
    (mwTable.wgNamespaceIds as Record<string, number>)[alias] = id;
};

const anchor = (href: string): HTMLAnchorElement => {
    const a = document.createElement("a");
    a.href = href;
    document.body.append(a);
    return a;
};

describe("parenSplit", () => {
    it("按捕获组切分（原生 split 语义）", () => {
        expect(parenSplit("a.b.c", /[.]/)).toEqual(["a", "b", "c"]);
    });

    it("接受字符串分隔符（按字面量切分）", () => {
        expect(parenSplit("a/b", "/")).toEqual(["a", "b"]);
    });
});

describe("Stringwrapper", () => {
    it("默认 value 为 null", () => {
        expect(new Stringwrapper().value).toBeNull();
    });

    it("委托底层字符串的 indexOf/substring/split/parenSplit/replace/toString", () => {
        const w = new Stringwrapper();
        w.value = "a_b:c";
        expect(w.toString()).toBe("a_b:c");
        expect(w.indexOf(":")).toBe(3);
        expect(w.substring(2)).toBe("b:c");
        expect(w.substring(0, 1)).toBe("a");
        expect(w.split("_")).toEqual(["a", "b:c"]);
        expect(w.parenSplit(/([_:])/)).toEqual(["a", "_", "b", ":", "c"]);
        expect(w.replace(/_/, "-")).toBe("a-b:c");
    });
});

describe("Title 构造与 setUtf", () => {
    it("空入参落为空串", () => {
        expect(new Title().value).toBe("");
        expect(new Title().anchor).toBe("");
        expect(new Title(null).value).toBe("");
    });

    it("下划线转空格", () => {
        const t = new Title("Foo_bar");
        expect(t.value).toBe("Foo bar");
        expect(t.anchor).toBe("");
        expect(t.ns).toBeUndefined();
    });

    it("井号拆锚点（锚点内下划线保留），标记 ns 置空", () => {
        const t = new Title("Foo#An_chor");
        expect(t.value).toBe("Foo");
        expect(t.anchor).toBe("An_chor");
        expect(t.ns).toBeNull();
    });

    it("接受 Stringwrapper 入参", () => {
        const w = new Stringwrapper();
        w.value = "Foo_bar#X";
        const t = new Title(w);
        expect(t.value).toBe("Foo bar");
        expect(t.anchor).toBe("X");
    });
});

describe("Title toString / 锚点", () => {
    it("toString 默认拼锚点，omitAnchor 只出标题", () => {
        const t = new Title("Foo#Bar");
        expect(t.toString()).toBe("Foo#Bar");
        expect(t.toString(true)).toBe("Foo");
    });

    it("无锚点时 toString 不拼 #", () => {
        expect(new Title("Foo").toString()).toBe("Foo");
    });

    it("anchorString：无锚点返回空串", () => {
        expect(new Title("Foo").anchorString()).toBe("");
    });

    it("anchorString：非点编码锚点原样返回", () => {
        expect(new Title("Foo#bar").anchorString()).toBe("bar");
    });

    it("anchorString：.XX 点编码序列解码", () => {
        expect(new Title("Foo#.E4.B8.83").anchorString()).toBe("七");
    });

    it("anchorString：畸形百分号序列解码失败时保留原样（try/catch 萌百定制）", () => {
        // ".E4.B9" → "%E4%B9" 是不完整 UTF-8 序列，decodeURIComponent 抛出
        expect(new Title("Foo#a.E4.B9").anchorString()).toBe("a%E4%B9");
    });

    it("urlAnchor：锚点不含模式字面量时原样返回（legacy 原样：模式以字符串形式传入）", () => {
        const t = new Title("Foo#abc%E4%B8def");
        expect(t.urlAnchor()).toBe("abc%E4%B8def");
    });

    it("urlAnchor：命中模式字面量时对余段做 % → . 替换（legacy 原样怪癖）", () => {
        const t = new Title("Foo#x/((?:[%][0-9A-F]{2})+)/y%E4");
        expect(t.urlAnchor()).toBe("xy.E4");
    });

    it("anchorFromUtf：空格转下划线、百分号转点、冒号与单引号特殊处理", () => {
        const t = new Title("Foo");
        t.anchorFromUtf("七 x");
        expect(t.anchor).toBe(".E4.B8.83_x");
        const t2 = new Title("Foo");
        t2.anchorFromUtf("it's");
        expect(t2.anchor).toBe("it.27s");
    });
});

describe("Title 解码", () => {
    it("decodeEscapes：无 %XX 序列时把孤立 % 补成 %25", () => {
        expect(new Title().decodeEscapes("ab%zz")).toBe("ab%25zz");
    });

    it("decodeEscapes：解码 %XX 序列", () => {
        expect(new Title().decodeEscapes("A%E4%B8%83B")).toBe("A七B");
    });

    it("decodeEscapes：接受 Stringwrapper 入参", () => {
        expect(new Title().decodeEscapes(new Title("A%E4%B8%83"))).toBe("A七");
    });

    it("decodeNasties：解码并去尾部空格/下划线", () => {
        const t = new Title();
        expect(t.decodeNasties("Foo_ ")).toBe("Foo");
        expect(t.decodeNasties("A%E4%B8%83")).toBe("A七");
    });

    it("decodeNasties：畸形序列时原样返回输入", () => {
        const t = new Title();
        expect(t.decodeNasties("%E4%B9")).toBe("%E4%B9");
    });

    it("hintValue：null value 返回空串，正常 value 经 decodeExtras", () => {
        expect(Title.fromURL("https://example.com/x").hintValue()).toBe("");
        expect(new Title("Foo_bar").hintValue()).toBe("Foo bar");
    });
});

describe("Title 用户名/命名空间换算", () => {
    it("toUserName：用户（子）页取首段，非用户页清空 value", () => {
        const t = new Title("User:Foo/bar");
        t.toUserName();
        expect(t.value).toBe("Foo");
        const bad = new Title("Foo");
        bad.toUserName();
        expect(bad.value).toBeNull();
    });

    it("toUserName：用户讨论页同样取用户名", () => {
        addNamespaceAlias("user_talk", 3);
        const t = new Title("User talk:Foo");
        t.toUserName();
        expect(t.value).toBe("Foo");
    });

    it("toUserName：withNs 时拼本地化 User 前缀", () => {
        const t = new Title("User:Foo");
        t.toUserName(true);
        expect(t.value).toBe("User:Foo");
    });

    it("userName：成功返回新 Title，失败返回 null", () => {
        expect(new Title("User:Foo").userName()?.value).toBe("Foo");
        expect(new Title("Foo").userName()).toBeNull();
    });

    it("toTalkPage：主名字空间加 Talk 前缀", () => {
        expect(new Title("Foo").toTalkPage()).toBe("Talk:Foo");
    });

    it("toTalkPage：讨论页名字空间前缀用下划线形式", () => {
        addNamespaceAlias("user_talk", 3);
        expect(new Title("User:Foo").toTalkPage()).toBe("User_talk:Foo");
    });

    it("toTalkPage：讨论主题名为空串时退回无前缀标题", () => {
        installMw({
            config: {
                wgFormattedNamespaces: {
                    "-1": "Special",
                    0: "",
                    1: "",
                    2: "User",
                    3: "User talk",
                    6: "File",
                    10: "Template",
                    14: "Category",
                },
            },
        });
        // 重装后重建 fixtures（wgArticlePath/wgScript 等回到默认值）
        const installed = { mw: globalThis.mw as unknown as MockMw };
        buildTitleWikiFixtures(installed.mw, wiki, nsModuleRef);
        expect(new Title("Foo").toTalkPage()).toBe("Foo");
    });

    it("toTalkPage：奇数名字空间与 Special、无讨论页映射的 ns 返回 null", () => {
        addNamespaceAlias("user_talk", 3);
        expect(new Title("User talk:Foo").toTalkPage()).toBeNull();
        expect(new Title("Special:Diff").toTalkPage()).toBeNull();
        // wgFormattedNamespaces 无 id=7：File 的讨论页不存在
        expect(new Title("File:X").toTalkPage()).toBeNull();
    });

    it("toTalkPage：value 为 null 返回 null", () => {
        expect(Title.fromURL("https://example.com/x").toTalkPage()).toBeNull();
    });

    it("namespace：返回本地化名字空间名", () => {
        expect(new Title("Foo").namespace()).toBe("");
        expect(new Title("User:Foo").namespace()).toBe("User");
    });

    it("namespaceId：冒号前缀查 wgNamespaceIds（大小写不敏感、空格转下划线）", () => {
        addNamespaceAlias("user_talk", 3);
        expect(new Title("Foo").namespaceId()).toBe(0);
        expect(new Title("User:Foo").namespaceId()).toBe(2);
        expect(new Title("用户:Foo").namespaceId()).toBe(2);
        expect(new Title("FILE:x").namespaceId()).toBe(6);
        expect(new Title("user talk:x").namespaceId()).toBe(3);
        expect(new Title("Notns:Foo").namespaceId()).toBe(0);
    });

    it("namespaceId：value 为 null 时 try/catch 兜底返回 0（萌百定制）", () => {
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
        const t = Title.fromURL("https://example.com/x");
        expect(t.value).toBeNull();
        expect(t.namespaceId()).toBe(0);
        expect(errSpy).toHaveBeenCalledOnce();
        errSpy.mockRestore();
    });

    it("talkPage / isTalkPage", () => {
        addNamespaceAlias("talk", 1);
        expect(new Title("Foo").talkPage()?.value).toBe("Talk:Foo");
        expect(new Title("Talk:Foo").talkPage()).toBeNull();
        expect(new Title("Talk:Foo").isTalkPage()).toBe(true);
        expect(new Title("Foo").isTalkPage()).toBe(false);
    });

    it("toArticleFromTalkPage：Talk（无前缀主题）与 User talk 两种降级", () => {
        addNamespaceAlias("talk", 1);
        addNamespaceAlias("user_talk", 3);
        expect(new Title("Talk:Foo").toArticleFromTalkPage()).toBe("Foo");
        expect(new Title("User talk:Foo").toArticleFromTalkPage()).toBe("User:Foo");
    });

    it("toArticleFromTalkPage：偶数 ns、null value、映射缺失均返回 null", () => {
        expect(new Title("Foo").toArticleFromTalkPage()).toBeNull();
        expect(Title.fromURL("https://example.com/x").toArticleFromTalkPage()).toBeNull();
        installMw({
            config: {
                wgNamespaceIds: { special: -1, x_talk: 7 },
                wgFormattedNamespaces: { "-1": "Special", 7: "X talk" },
            },
        });
        const installed = { mw: globalThis.mw as unknown as MockMw };
        buildTitleWikiFixtures(installed.mw, wiki, nsModuleRef);
        expect(new Title("X talk:Foo").toArticleFromTalkPage()).toBeNull();
    });

    it("articleFromTalkPage / articleFromTalkOrArticle", () => {
        addNamespaceAlias("talk", 1);
        expect(new Title("Talk:Foo").articleFromTalkPage()?.value).toBe("Foo");
        expect(new Title("Foo").articleFromTalkPage()).toBeNull();
        const talk = new Title("Talk:Foo");
        expect(talk.articleFromTalkOrArticle().value).toBe("Foo");
        const article = new Title("Foo");
        expect(article.articleFromTalkOrArticle()).toBe(article);
    });

    it("isIpUser：IPv4 / IPv6 用户名命中，普通用户名与非用户页不命中", () => {
        expect(new Title("User:1.2.3.4").isIpUser()).toBe(true);
        expect(new Title("User:::1").isIpUser()).toBe(true);
        expect(new Title("User:Bob").isIpUser()).toBe(false);
        expect(new Title("Foo").isIpUser()).toBe(false);
    });

    it("stripNamespace：无冒号原样、未知前缀视为主名字空间、已知前缀剥离", () => {
        expect(new Title("Foo").stripNamespace()).toBe("Foo");
        expect(new Title("Notns:Foo").stripNamespace()).toBe("Notns:Foo");
        expect(new Title("User:Foo").stripNamespace()).toBe("Foo");
        expect(new Title("User:A/B").stripNamespace()).toBe("A/B");
    });
});

describe("Title URL 换算", () => {
    it("setUrl：value 取井号前段，anchor 按 legacy 公式（用解码后 value 切片）", () => {
        const t = new Title();
        t.setUrl("A#B");
        expect(t.value).toBe("A");
        expect(t.anchor).toBe("");
    });

    it("setUrl：无井号时 value/anchor 均为空串", () => {
        const t = new Title();
        t.setUrl("AB");
        expect(t.value).toBe("");
        expect(t.anchor).toBe("");
    });

    it("append：在当前标题后拼接", () => {
        const t = new Title("Foo");
        t.append("bar");
        expect(t.value).toBe("Foobar");
    });

    it("urlString：默认空格转下划线、锚点经 urlAnchor、encodeURI 且转义 & ? +", () => {
        expect(new Title("Foo Bar#七").urlString()).toBe("Foo_Bar#%E4%B8%83");
        expect(new Title("A&B?C+D").urlString()).toBe("A%26B%3FC%2BD");
    });

    it("urlString：omitAnchor 与 keepSpaces 选项", () => {
        expect(new Title("Foo Bar#七").urlString({ omitAnchor: true })).toBe("Foo_Bar");
        expect(new Title("Foo Bar#七").urlString({ keepSpaces: true })).toBe("Foo%20Bar#%E4%B8%83");
    });

    it("removeAnchor：去掉锚点的新 Title", () => {
        const t = new Title("Foo#Bar");
        const stripped = t.removeAnchor();
        expect(stripped).not.toBe(t);
        expect(stripped.value).toBe("Foo");
        expect(stripped.anchor).toBe("");
    });

    it("toUrl：titlebase 前缀 + urlString", () => {
        expect(new Title("Foo").toUrl()).toBe(`${TITLEBASE}Foo`);
    });
});

describe("Title.fromURL", () => {
    it("非字符串入参：value 置 null 并返回 this", () => {
        const t = new Title("Foo");
        const ret = t.fromURL(undefined);
        expect(ret).toBe(t);
        expect(ret.value).toBeNull();
        expect(new Title().fromURL(42).value).toBeNull();
    });

    it("articlePath 形式：/标题", () => {
        expect(Title.fromURL(`https://${SITEBASE}/Foo`).value).toBe("Foo");
    });

    it("bot 接口形式：?title= 且 + 视作下划线", () => {
        expect(Title.fromURL(`${TITLEBASE}Foo+Bar`).value).toBe("Foo Bar");
    });

    it("锚点进入 anchor 并可解码回显", () => {
        const t = Title.fromURL(`${TITLEBASE}Foo#Se.C3.B8`);
        expect(t.value).toBe("Foo");
        expect(t.anchor).toBe("Se.C3.B8");
        expect(t.anchorString()).toBe("Seø");
    });

    it("路径中的 & 先行转义为 %26 再解析", () => {
        expect(Title.fromURL(`https://${SITEBASE}/A&B`).value).toBe("A&B");
    });

    it("非本站链接：value 置 null", () => {
        expect(Title.fromURL("https://example.com/wiki/Foo").value).toBeNull();
    });

    it("贡献页路径形式 → 用户页", () => {
        expect(Title.fromURL(`https://${SITEBASE}/Special:Contributions/Foo`).value).toBe("User:Foo");
    });

    it("贡献页 title= 形式 → 用户页（+ 转空格）", () => {
        expect(Title.fromURL(`${TITLEBASE}Special%3AContributions&target=Foo+Bar`).value).toBe("User:Foo Bar");
    });

    it("Emailuser → 用户页", () => {
        expect(Title.fromURL(`https://${SITEBASE}/Special:Emailuser/Foo`).value).toBe("User:Foo");
    });

    it("Whatlinkshere → 目标条目", () => {
        expect(Title.fromURL(`${TITLEBASE}Special:Whatlinkshere/Foo`).value).toBe("Foo");
    });

    it("Special:Diff → Special:Diff 标题", () => {
        expect(Title.fromURL(`https://${SITEBASE}/Special:Diff/12345/67890`).value).toBe("Special:Diff");
    });

    it("Safari 且标题含 %25xx：先 unescape 再 decodeURIComponent", () => {
        wiki.flag.isSafari = true;
        expect(Title.fromURL(`${TITLEBASE}A%2541`).value).toBe("AA");
    });

    it("Safari 但标题不含 %25xx：走 decodeNasties", () => {
        wiki.flag.isSafari = true;
        expect(Title.fromURL(`${TITLEBASE}A%41`).value).toBe("AA");
    });

    it("非 Safari 且标题含 %25xx：走 decodeNasties", () => {
        expect(Title.fromURL(`${TITLEBASE}A%2541`).value).toBe("AA");
    });

    it("fromAnchor：null 锚点与真实锚点", () => {
        expect(Title.fromAnchor(null).value).toBeNull();
        const a = anchor(`${TITLEBASE}Foo`);
        expect(Title.fromAnchor(a).value).toBe("Foo");
    });

    it("fromWikiText：经 myDecodeURI（decodeExtras）后 setUtf", () => {
        expect(Title.fromWikiText("Foo_bar").value).toBe("Foo bar");
        expect(Title.fromWikiText("A%E4%B8%83").value).toBe("A七");
    });

    it("静态工厂返回 Title 实例", () => {
        expect(Title.fromURL(`${TITLEBASE}Foo`)).toBeInstanceOf(Title);
        expect(Title.fromAnchor(null)).toBeInstanceOf(Title);
        expect(Title.fromWikiText("A_B")).toBeInstanceOf(Title);
    });
});

describe("parseParams", () => {
    it("Special:Diff 单 revid → oldid + diff=prev", () => {
        expect(parseParams(`https://${SITEBASE}/Special:Diff/12345`)).toEqual({
            oldid: "12345",
            diff: "prev",
        });
    });

    it("Special:Diff 双 revid → oldid + diff", () => {
        expect(parseParams(`https://${SITEBASE}/Special:Diff/12345/67890`)).toEqual({
            oldid: "12345",
            diff: "67890",
        });
    });

    it("Special:Diff 三段不匹配，落回通用 query 解析（补 prev 后触发互换）", () => {
        expect(parseParams(`https://${SITEBASE}/Special:Diff/1/2/3?diff=9`)).toEqual({
            diff: "prev",
            oldid: "9",
        });
    });

    it("无 ? 返回空对象", () => {
        expect(parseParams("https://x/index.php")).toEqual({});
    });

    it("逐对解析 query（含无值参数）并剥离锚点", () => {
        expect(parseParams("https://x/i.php?foo=bar&baz#frag")).toEqual({
            foo: "bar",
            baz: null,
        });
    });

    it("有 diff 无 oldid 时补 oldid=prev 并互换（diff=prev、oldid 取值）", () => {
        expect(parseParams("https://x/i.php?diff=456")).toEqual({
            diff: "prev",
            oldid: "456",
        });
    });

    it("oldid 为 prev/next/cur 时与 diff 互换", () => {
        expect(parseParams("https://x/i.php?oldid=next&diff=77")).toEqual({
            oldid: "77",
            diff: "next",
        });
    });

    it("常规 oldid/diff 不互换", () => {
        expect(parseParams("https://x/i.php?title=Foo&oldid=123&diff=456")).toEqual({
            title: "Foo",
            oldid: "123",
            diff: "456",
        });
    });
});

describe("safeDecodeURI / myDecodeURI", () => {
    it("解码 %XX 并应用 decodeExtras 映射表", () => {
        expect(safeDecodeURI("%E4%B8%83")).toBe("七");
        expect(safeDecodeURI("a%2Cb_c%24d%26e")).toBe("a,b c$d&e");
    });

    it("畸形序列原样返回、空串回退原输入", () => {
        expect(safeDecodeURI("%E4")).toBe("%E4");
        expect(safeDecodeURI("")).toBe("");
    });

    it("decodeExtras 未注入（null）时不做映射", () => {
        wiki.misc.decodeExtras = null;
        expect(safeDecodeURI("a_b")).toBe("a_b");
    });

    it("接受 Stringwrapper 入参", () => {
        const w = new Stringwrapper();
        w.value = "A_B";
        expect(safeDecodeURI(w)).toBe("A B");
    });
});

describe("isDisambig / stubCount", () => {
    it("主名字空间且非讨论页：按消歧义正则判定", () => {
        expect(isDisambig("{{disambiguation}}", new Title("Foo"))).toBe(true);
        expect(isDisambig("plain text", new Title("Foo"))).toBe(false);
    });

    it("讨论页不判定", () => {
        addNamespaceAlias("talk", 1);
        expect(isDisambig("{{disambiguation}}", new Title("Talk:Foo"))).toBe(false);
    });

    it("非主名字空间默认（popupAllDabsStubs=false）不判定，选项开启后判定", () => {
        const userPage = new Title("User:Foo");
        expect(isDisambig("{{disambiguation}}", userPage)).toBe(false);
        wiki.getOption = (): unknown => true;
        expect(isDisambig("{{disambiguation}}", new Title("User:Foo"))).toBe(true);
    });

    it("stubCount：sect 与普通小作品分别计数", () => {
        expect(stubCount("a{{sectstub}}b{{stub}}c", new Title("Foo"))).toEqual({
            real: 1,
            sect: 1,
        });
        expect(stubCount("nothing", new Title("Foo"))).toEqual({ real: 0, sect: 0 });
    });

    it("stubCount：非主名字空间默认返回 false", () => {
        expect(stubCount("{{stub}}", new Title("User:Foo"))).toBe(false);
    });
});

describe("isValidImageName / 命名空间谓词 / anchorContainsImage", () => {
    it("isValidImageName：含花括号即非法（Stringwrapper 入参同理）", () => {
        expect(isValidImageName("File x.jpg")).toBe(true);
        expect(isValidImageName("File{x}.jpg")).toBe(false);
        const w = new Stringwrapper();
        w.value = "a{";
        expect(isValidImageName(w)).toBe(false);
    });

    it("isInStrippableNamespace / isInMainNamespace", () => {
        expect(isInStrippableNamespace(new Title("User:X"))).toBe(true);
        expect(isInStrippableNamespace(new Title("Foo"))).toBe(false);
        expect(isInMainNamespace(new Title("Foo"))).toBe(true);
        expect(isInMainNamespace(new Title("User:X"))).toBe(false);
    });

    it("anchorContainsImage：null / 含 img / 纯文本", () => {
        expect(anchorContainsImage(null)).toBe(false);
        const withImg = anchor("https://x/");
        withImg.append(document.createElement("img"));
        expect(anchorContainsImage(withImg)).toBe(true);
        const withText = anchor("https://x/");
        withText.append(document.createTextNode("alt"));
        expect(anchorContainsImage(withText)).toBe(false);
    });
});

describe("isPopupLink", () => {
    // 置于最前：未装配路径（wiki.re.basenames 未注入）与 legacy 未初始化行为
    // 一致——在 null 上调 .test 直接抛 TypeError
    it("wiki 基址未装配时按 legacy 未初始化路径抛错", () => {
        wiki.re.basenames = null;
        const a = anchor(`${TITLEBASE}Foo`);
        expect(() => {
            isPopupLink(a);
        }).toThrow(TypeError);
    });

    it("本站条目链接放行", () => {
        expect(isPopupLink(anchor(`${TITLEBASE}Foo`))).toBe(true);
        expect(isPopupLink(anchor(`https://${SITEBASE}/Foo`))).toBe(true);
    });

    it("非本站链接拒绝", () => {
        expect(isPopupLink(anchor("https://example.com/Foo"))).toBe(false);
    });

    it("本页 # 空锚拒绝", () => {
        expect(isPopupLink(anchor(`${document.location.href}#`))).toBe(false);
    });

    it("inNopopupSpan 标记 / onmousedown / nopopup 属性拒绝", () => {
        const marked = anchor(`${TITLEBASE}Foo`);
        marked.inNopopupSpan = true;
        expect(isPopupLink(marked)).toBe(false);
        const mousedown = anchor(`${TITLEBASE}Foo`);
        mousedown.onmousedown = () => undefined;
        expect(isPopupLink(mousedown)).toBe(false);
        const noPopup = anchor(`${TITLEBASE}Foo`);
        noPopup.setAttribute("nopopup", "1");
        expect(isPopupLink(noPopup)).toBe(false);
    });

    it("Special 页与 section= 链接默认拒绝", () => {
        expect(isPopupLink(anchor(`${TITLEBASE}Special:Foo`))).toBe(false);
        expect(isPopupLink(anchor(`${TITLEBASE}Foo&section=3`))).toBe(false);
    });

    it("email / contribs / whatlinkshere / specialdiff 四类 Special 链接放行", () => {
        expect(isPopupLink(anchor(`https://${SITEBASE}/Special:Emailuser/Foo`))).toBe(true);
        expect(isPopupLink(anchor(`https://${SITEBASE}/Special:Contributions/Foo`))).toBe(true);
        expect(isPopupLink(anchor(`${TITLEBASE}Special:Whatlinkshere/Foo`))).toBe(true);
        expect(isPopupLink(anchor(`https://${SITEBASE}/Special:Diff/1/2`))).toBe(true);
    });

    it("四类 Special 链接带 &limit= 时拒绝", () => {
        expect(isPopupLink(anchor(`${TITLEBASE}Special:Contributions/Foo&limit=50`))).toBe(false);
    });

    // markNopopupSpanLinks.done 是模块实例级一次性标记（legacy 无重置入口），
    // 需要观察"首次扫描"行为的用例以 vi.resetModules 取 fresh 模块实例
    it("首扫把 .nopopups 容器内链接标记为不弹；之后新增容器不再重扫（done 标记）", async () => {
        vi.resetModules();
        const titleMod = await import("../../../src/title/title.ts");
        const nsMod = await import("../../../src/title/namespaces.ts");
        buildTitleWikiFixtures(globalThis.mw as unknown as MockMw, titleMod.wiki, nsMod);
        const first = anchor(`${TITLEBASE}Foo`);
        const span = document.createElement("span");
        span.className = "nopopups";
        span.append(first);
        document.body.append(span);
        expect(titleMod.isPopupLink(first)).toBe(false);
        // done 已置位：后加入的 nopopups 容器不会被补扫
        const second = anchor(`${TITLEBASE}Bar`);
        const span2 = document.createElement("span");
        span2.className = "nopopups";
        span2.append(second);
        document.body.append(span2);
        expect(titleMod.isPopupLink(second)).toBe(true);
    });

    it("popupOnlyArticleLinks=false 时 vector 菜单标题链排除", async () => {
        vi.resetModules();
        const titleMod = await import("../../../src/title/title.ts");
        const nsMod = await import("../../../src/title/namespaces.ts");
        buildTitleWikiFixtures(globalThis.mw as unknown as MockMw, titleMod.wiki, nsMod);
        titleMod.wiki.getOption = (): unknown => false;
        const menu = document.createElement("div");
        menu.className = "vectorMenu";
        menu.innerHTML = `<h3><a href="${TITLEBASE}Foo">Foo</a></h3>`;
        document.body.append(menu);
        const menuLink = menu.querySelector("a");
        if (!menuLink) {
            throw new Error("fixture missing anchor");
        }
        expect(titleMod.isPopupLink(menuLink)).toBe(false);
    });
});
