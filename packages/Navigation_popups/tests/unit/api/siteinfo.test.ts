// siteinfo 域镜像测试：setSiteInfo（wikimedia/isLocal/commons/sitebase，
// popupLocalDebug 分支）、setTitleBase/setRegexps（title.wiki 基址与全正则
// 装配）、fetchSpecialPageNames（uselang=content&maxage=3600 萌百定制）、
// setUserInfo（popupReview 的 canReview）、getMwApi（单例 + Api-User-Agent）。
// 行为基准 = legacy init.ts（commit 02c8dec）。
import { afterEach, describe, expect, it, vi } from "vitest";
import { installMw } from "../../helpers/mockMw.ts";
import { installXhr } from "../../helpers/mockXhr.ts";
import type * as SiteNs from "../../../src/api/siteinfo.ts";
import type * as TitleNs from "../../../src/title/title.ts";
import type * as NamespacesNs from "../../../src/title/namespaces.ts";
import type * as OptionsNs from "../../../src/core/options.ts";

type Site = typeof SiteNs;
type Title = typeof TitleNs;
type Namespaces = typeof NamespacesNs;
type Options = typeof OptionsNs;

interface Fresh {
    site: Site;
    title: Title;
    namespaces: Namespaces;
    options: Options;
    apiInstances: ReturnType<typeof installMw>["apiInstances"];
}

const fresh = async (): Promise<Fresh> => {
    vi.resetModules();
    const site = await import("../../../src/api/siteinfo.ts");
    const title = await import("../../../src/title/title.ts");
    const namespaces = await import("../../../src/title/namespaces.ts");
    const options = await import("../../../src/core/options.ts");
    const installed = installMw();
    options.setOptions();
    namespaces.setNamespaces();
    return { site, title, namespaces, options, apiInstances: installed.apiInstances };
};

let windowOptionKeys: string[] = [];
const setWindowOption = (name: string, value: unknown): void => {
    (window as unknown as Record<string, unknown>)[name] = value;
    windowOptionKeys.push(name);
};

const ALIASES = [
    { realname: "Contributions", aliases: ["Contributions", "贡献"] },
    { realname: "Diff", aliases: ["diff"] },
    { realname: "Emailuser", aliases: ["Emailuser"] },
    { realname: "Whatlinkshere", aliases: ["Whatlinkshere"] },
    // 无对应正则的杂项：setRegexps 循环的跳过分支
    { realname: "Watchlist", aliases: ["Watchlist"] },
];

const applySiteData = async (): Promise<Fresh> => {
    const mod = await fresh();
    mod.site.siteState.specialpagealiases = ALIASES;
    mod.site.setSiteInfo();
    mod.site.setTitleBase();
    mod.site.setRegexps();
    return mod;
};

const titleRe = (mod: Fresh): Title["wiki"]["re"] => mod.title.wiki.re;

afterEach(() => {
    Reflect.deleteProperty(window, "popupLocalDebug");
    for (const key of windowOptionKeys) {
        Reflect.deleteProperty(window, key);
    }
    windowOptionKeys = [];
});

describe("setSiteInfo", () => {
    it("默认分支：jsdom 的 localhost 站点形态", async () => {
        const { site } = await fresh();
        site.setSiteInfo();
        expect(site.siteState.hostname).toBe("localhost");
        expect(site.siteState.isLocal).toBe(true);
        expect(site.siteState.wikimedia).toBe(false);
        expect(site.siteState.commons).toBeNull();
        expect(site.siteState.lang).toBe("zh");
        // jsdom 默认 :3000 端口计入 sitebase
        expect(site.siteState.sitebase).toMatch(/^localhost:\d+$/);
    });

    it("popupLocalDebug：en.wikipedia.org 的 wikimedia 形态", async () => {
        const { site } = await fresh();
        window.popupLocalDebug = true;
        site.setSiteInfo();
        expect(site.siteState.hostname).toBe("en.wikipedia.org");
        expect(site.siteState.wikimedia).toBe(true);
        expect(site.siteState.commons).toBe("commons.wikimedia.org");
        // localDebug 下 setTitleBase 用 http: 协议
        site.setTitleBase();
        expect(site.siteState.titlebase).toMatch(/^http:\/\/en\.wikipedia\.org/);
    });

    it("hostname 即 commons 站：wikimedia 真但不设 commons；port 为空不入 sitebase", async () => {
        const { site } = await fresh();
        // jsdom 的 Location 属性 unforgeable（defineProperty 不生效），
        // 以 stubGlobal 整体替换 location（unstubGlobals 自动清理）
        vi.stubGlobal("location", { hostname: "commons.wikimedia.org", port: "", protocol: "https:" });
        site.setSiteInfo();
        site.setTitleBase();
        expect(site.siteState.wikimedia).toBe(true);
        expect(site.siteState.commons).toBeNull();
        expect(site.siteState.sitebase).toBe("commons.wikimedia.org");
        expect(site.siteState.titlebase).toBe("https://commons.wikimedia.org/index.php?title=");
    });
});

describe("setTitleBase / setRegexps", () => {
    it("titlebase 家族与 basenames 装配", async () => {
        const { site, title } = await applySiteData();
        expect(site.siteState.titlebase).toMatch(/^https?:\/\/localhost:\d+\/index\.php\?title=$/);
        expect(site.siteState.apiwikibase).toBe(site.siteState.titlebase.replace("index.php?title=", "api.php"));
        expect(title.wiki.titlebase).toBe(site.siteState.titlebase);
        expect(title.wiki.re.basenames).not.toBeNull();
    });

    it("main 主匹配：捕获序 组1=前缀 组2=title 组3=锚点", async () => {
        const mod = await applySiteData();
        const m = titleRe(mod).main?.exec("https://localhost:3000/index.php?title=Foo#Anchor");
        expect(m?.[2]).toBe("Foo");
        expect(m?.[3]).toBe("Anchor");
    });

    it("specialdiff/contribs/email/backlinks：本地化别名组", async () => {
        const mod = await applySiteData();
        const re = titleRe(mod);
        expect(re.specialdiff?.test("/Special:Diff/123456/789")).toBe(true);
        expect(re.specialdiff?.test("/特殊:Diff/123")).toBe(true);
        expect(re.contribs?.test("/index.php?title=Special:Contributions&target=Foo")).toBe(true);
        expect(re.email?.test("/index.php?title=Special:Emailuser&target=Foo")).toBe(true);
        expect(re.backlinks?.test("/index.php?title=Special:Whatlinkshere&target=Foo")).toBe(true);
    });

    it("urlNoPopup：Special 前缀与 section=N 命中", async () => {
        const mod = await applySiteData();
        const re = titleRe(mod);
        expect(re.urlNoPopup?.test("https://localhost:3000/index.php?title=Special:Allpages")).toBe(true);
        expect(re.urlNoPopup?.test("https://localhost:3000/index.php?title=Foo&section=3")).toBe(true);
        expect(re.urlNoPopup?.test("https://localhost:3000/index.php?title=Foo")).toBe(false);
    });

    it("image/category/ipUser/stub/disambig/oldid/diff 装配", async () => {
        const mod = await applySiteData();
        const re = titleRe(mod);
        expect(re.image?.test("[[File:Example.jpg|100px]]")).toBe(true);
        expect(re.imageBracketCount).toBe(6);
        expect(re.category?.test("[[Category:动漫]]")).toBe(true);
        expect(re.ipUser?.test("1.2.3.4")).toBe(true);
        expect(re.ipUser?.test("2001:db8::1")).toBe(true);
        expect(re.ipUser?.test("Foo")).toBe(false);
        // 默认 stub/dab 正则是英文模板族（无 i 标志，大小写敏感）——
        // 萌百站点由用户以 popupStubRegexp/popupDabRegexp 覆盖
        expect(re.stub?.test("{{sectstub}}")).toBe(true);
        expect(re.disambig?.test("{{disambig}}")).toBe(true);
        expect(re.oldid?.test("/index.php?title=Foo&oldid=123")).toBe(true);
        expect(re.diff?.test("/index.php?title=Foo&diff=next")).toBe(true);
    });
});

describe("fetchSpecialPageNames / setUserInfo / getMwApi", () => {
    it("fetchSpecialPageNames：萌百定制参数（uselang=content、maxage=3600）", async () => {
        const { site, apiInstances } = await fresh();
        // 先建单例再取实例（fresh 后 apiInstances 为空）
        site.getMwApi();
        const api = apiInstances[0];
        api.get.mockResolvedValue({ query: { specialpagealiases: ALIASES } });
        await site.fetchSpecialPageNames();
        expect(site.siteState.specialpagealiases).toEqual(ALIASES);
        const params = api.get.mock.calls[0]?.[0] as Record<string, unknown>;
        expect(params.uselang).toBe("content");
        expect(params.maxage).toBe(3600);
        expect(params.siprop).toBe("specialpagealiases");
    });

    it("setUserInfo：popupReview 关（默认）不发请求；开时 rights 判定 canReview", async () => {
        const off = await fresh();
        await off.site.setUserInfo();
        expect(off.site.userState.canReview).toBe(false);
        // 未调 getMwApi 前无实例 = 无请求
        expect(off.apiInstances).toHaveLength(0);
        // 开启判定用独立模块图：选项在 getValueOf 首读时固化（legacy 同款，
        // purgePopups 即为重置缓存而设），先关后开的 window 覆盖互相不可见
        const on = await fresh();
        on.site.getMwApi();
        const api = on.apiInstances[0];
        api.get.mockResolvedValue({ query: { users: [{ rights: ["patrol", "review"] }] } });
        // 选项键不在 Window 声明面（任意 popupXxx 均可作覆盖），经记录表写入
        setWindowOption("popupReview", true);
        try {
            await on.site.setUserInfo();
            expect(on.site.userState.canReview).toBe(true);
            const params = api.get.mock.calls[0]?.[0] as Record<string, unknown>;
            expect(params.usprop).toBe("rights");
        } finally {
            // setWindowOption 的 afterEach 统一回滚
        }
    });

    it("getMwApi：单例、Api-User-Agent 构造、同步 downloader UA", async () => {
        const { site, apiInstances } = await fresh();
        const downloader = await import("../../../src/net/downloader.ts");
        const client1 = site.getMwApi();
        const client2 = site.getMwApi();
        expect(client1).toBe(client2);
        expect(apiInstances).toHaveLength(1);
        const options = apiInstances[0]?.options;
        expect(options.ajax?.headers?.["Api-User-Agent"]).toBe("Navigation popups/1.0 (zh.moegirl.org.cn)");
        // downloader 的 XHR 头与 mw.Api 的 UA 同源（getMwApi 内同步注入）：
        // 发一个真实下载请求断言 header
        const { sent } = installXhr(() => ({ status: 200, responseText: "{}" }));
        downloader.startDownload("https://example/ua", 1, () => {
            // 回调内容无关紧要，仅驱动请求完成
        });
        expect(sent).toHaveLength(1);
        expect(sent[0]?.headers["Api-User-Agent"]).toBe("Navigation popups/1.0 (zh.moegirl.org.cn)");
    });
});
