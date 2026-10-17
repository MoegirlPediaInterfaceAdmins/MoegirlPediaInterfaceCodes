// pageinfo 域镜像测试：8 个统计过滤器（小作品/消歧义/页面大小/内链/图片/分类/
// 最后修改/wikibase）与 getPageInfo 装配。行为基准 = legacy src/modules/
// pageinfo.ts（commit 02c8dec）；其依赖的 wiki.re.image/category/disambig/
// stub 站点派生正则按 legacy init.ts setRegexps 公式用 mockMw 的萌百站形态构造。
// formatAge（〔萌百〕moment 精确日历差值）以 moment.now 钩子锁定当前时刻逐
// 借位分支验证；期望串全部按萌百 popupStrings 译文手工推导。
import { afterEach, describe, expect, it, vi } from "vitest";
import moment from "moment";
import { installMw } from "../../helpers/mockMw.ts";
import type * as DownloaderNs from "../../../src/net/downloader.ts";
import type * as NamespacesNs from "../../../src/title/namespaces.ts";
import type * as OptionsNs from "../../../src/core/options.ts";
import type * as PageinfoNs from "../../../src/preview/pageinfo.ts";
import type * as TitleNs from "../../../src/title/title.ts";

type DownloaderModule = typeof DownloaderNs;
type Namespaces = typeof NamespacesNs;
type OptionsModule = typeof OptionsNs;
type Pageinfo = typeof PageinfoNs;
type TitleModule = typeof TitleNs;

interface Fresh {
    pageinfo: Pageinfo;
    title: TitleModule;
    namespaces: Namespaces;
    options: OptionsModule;
    downloader: DownloaderModule;
}

// legacy options.ts 的选项默认值（本域消费的正则源）
const DAB_REGEXP_SOURCE = "disambiguation\\}\\}|\\{\\{\\s*(d(ab|isamb(ig(uation)?)?)|(((geo|hn|road?|school|number)dis)|[234][lc][acw]|(road|ship)index))\\s*(\\|[^}]*)?\\}\\}|is a .*disambiguation.*page";
const STUB_REGEXP_SOURCE = "(sect)?stub[}][}]|This .*-related article is a .*stub";
const IMAGE_VARS_REGEXP = "image|image_(?:file|skyline|name|flag|seal)|cover|badge|logo";

// fresh 模块图：pageinfo 经 options/strings/title 读到的都是新实例（options 的
// getValueOf 首读固化缓存，不同选项开关组合的用例必须各自重载）；wiki 状态的
// image/category/disambig/stub 四正则按 legacy init.ts 公式就地装配
const fresh = async (): Promise<Fresh> => {
    vi.resetModules();
    installMw();
    // 站点运行时由站点注入全局 moment；测试用 node_modules 里的真 moment
    vi.stubGlobal("moment", moment);
    const [pageinfo, title, namespaces, options, downloader] = await Promise.all([
        import("../../../src/preview/pageinfo.ts"),
        import("../../../src/title/title.ts"),
        import("../../../src/title/namespaces.ts"),
        import("../../../src/core/options.ts"),
        import("../../../src/net/downloader.ts"),
    ]);
    namespaces.setNamespaces();
    const im = namespaces.nsRe(namespaces.nsState.imageId);
    title.wiki.re.image = RegExp(
        `(^|\\[\\[)${im}: *([^|\\]]*[^|\\] ])([^0-9\\]]*([0-9]+) *px)?|(?:\\n *[|]?|[|]) *(${IMAGE_VARS_REGEXP}) *= *(?:\\[\\[ *)?(?:${im}:)?([^|]*?)(?:\\]\\])? *[|]? *\\n`,
        "img",
    );
    title.wiki.re.imageBracketCount = 6;
    title.wiki.re.category = RegExp(`\\[\\[${namespaces.nsRe(namespaces.nsState.categoryId)}: *([^|\\]]*[^|\\] ]) *`, "i");
    title.wiki.re.categoryBracketCount = 1;
    title.wiki.re.disambig = RegExp(DAB_REGEXP_SOURCE, "im");
    title.wiki.re.stub = RegExp(STUB_REGEXP_SOURCE, "im");
    return { pageinfo, title, namespaces, options, downloader };
};

// 本文件写到 window 上的选项覆盖，用例间统一摘除
const WINDOW_KEYS = ["popupFilters", "extraPopupFilters", "popupLastModified", "popupAllDabsStubs", "popupStrings"];

afterEach(() => {
    for (const key of WINDOW_KEYS) {
        Reflect.deleteProperty(window, key);
    }
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

const setWindow = (key: string, value: unknown): void => {
    (window as unknown as Record<string, unknown>)[key] = value;
};

// runPopupFilters 第三参取 owner.article（真实运行时是 Navpopup 的当前条目）；
// DownloadOwner 最小接口不含 article，测试侧以同构对象注入
const ownerWithArticle = (t: TitleModule, name: string): DownloaderNs.Downloader["owner"] =>
    ({ downloads: new Set(), article: new t.Title(name) }) as unknown as DownloaderNs.Downloader["owner"];

const makeDownload = (dl: DownloaderModule): DownloaderNs.Downloader => new dl.Downloader("https://zh.moegirl.org.cn/api.php?format=json");

// 本地时刻构造（moment 的 year/month/date 等取本地字段，用例内的 now/age 同
// 基准即可，与宿主机时区无关）
const at = (y: number, mo: number, day: number, h = 0, mi = 0, s = 0): Date => new Date(y, mo, day, h, mi, s);

describe("popupFilterPageSize / formatBytes", () => {
    it("0 字节按字节显示", async () => {
        const { pageinfo } = await fresh();
        expect(pageinfo.popupFilterPageSize("")).toBe("0&nbsp;字节");
    });

    it("949 字节仍按字节显示（>949 才转 kB）", async () => {
        const { pageinfo } = await fresh();
        expect(pageinfo.popupFilterPageSize("字".repeat(949))).toBe("949&nbsp;字节");
    });

    it("950 字节转 kB：Math.round(950/100)/10 = 1（萌百 kB 译注「以1000为一进」）", async () => {
        const { pageinfo } = await fresh();
        expect(pageinfo.popupFilterPageSize("x".repeat(950))).toBe("1千字节<sub>（以1000为一进）</sub>");
    });

    it("1234 字节 → 1.2kB（一位小数取整）", async () => {
        const { pageinfo } = await fresh();
        expect(pageinfo.popupFilterPageSize("x".repeat(1234))).toBe("1.2千字节<sub>（以1000为一进）</sub>");
    });
});

describe("popupFilterCountLinks", () => {
    it("0 链接走复数键（legacy 的 num !== 1 判定不区分 0）", async () => {
        const { pageinfo } = await fresh();
        expect(pageinfo.popupFilterCountLinks("plain")).toBe("0&nbsp;个内部链接");
    });

    it("1 链接走单数键", async () => {
        const { pageinfo } = await fresh();
        expect(pageinfo.popupFilterCountLinks("[[A]]")).toBe("1&nbsp;个内部链接");
    });

    it("2 链接走复数键（图片/分类链接同样计入——legacy 启发式照搬）", async () => {
        const { pageinfo } = await fresh();
        expect(pageinfo.popupFilterCountLinks("[[A]][[File:B.jpg]]")).toBe("2&nbsp;个内部链接");
    });
});

describe("popupFilterCountImages", () => {
    it("0 图片走复数键", async () => {
        const { pageinfo } = await fresh();
        expect(pageinfo.popupFilterCountImages("plain text")).toBe("0&nbsp;个文件");
    });

    it("1 图片走单数键（管道参数与 px 后缀不重复计数）", async () => {
        const { pageinfo } = await fresh();
        expect(pageinfo.popupFilterCountImages("[[File:Only.png|thumb|240px]]")).toBe("1&nbsp;个文件");
    });

    it("2 图片：image 小写别名同样命中", async () => {
        const { pageinfo } = await fresh();
        expect(pageinfo.popupFilterCountImages("[[File:W.png|100px]] [[image:W2.jpg]]")).toBe("2&nbsp;个文件");
    });

    it("infobox 类图片变量（popupImageVarsRegexp 分支）也计数", async () => {
        const { pageinfo } = await fresh();
        expect(pageinfo.popupFilterCountImages("{{infobox\n|image = A.jpg\n|caption = x\n}}")).toBe("1&nbsp;个文件");
    });
});

describe("popupFilterCountCategories", () => {
    it("0 分类走复数键", async () => {
        const { pageinfo } = await fresh();
        expect(pageinfo.popupFilterCountCategories("plain")).toBe("0&nbsp;个分类");
    });

    it("1 分类（小写别名 + 管道排序键）", async () => {
        const { pageinfo } = await fresh();
        expect(pageinfo.popupFilterCountCategories("[[category:Z|sort]]")).toBe("1&nbsp;个分类");
    });

    it("2 分类（本地化别名「分类:」）", async () => {
        const { pageinfo } = await fresh();
        expect(pageinfo.popupFilterCountCategories("[[Category:X]] and [[分类:Y]]")).toBe("2&nbsp;个分类");
    });
});

describe("popupFilterLastModified / formatAge（萌百 moment 精确日历差值）", () => {
    const runAt = async (age: Date | null, now: Date): Promise<string> => {
        const { pageinfo, options, downloader } = await fresh();
        options.setOptions();
        // moment() 取当前时刻走 hooks.now（模块加载时已捕获原生 Date.now 引
        // 号），假时钟覆盖不到，直接 spy 到固定时刻
        vi.spyOn(moment, "now").mockReturnValue(now.getTime());
        const d = makeDownload(downloader);
        d.lastModified = age;
        return pageinfo.popupFilterLastModified("", d);
    };

    // [说明, lastModified, now, 期望]——期望由 legacy formatAge 逐分支手工
    // 推导（含「高位有值后低位 0 补位」的 legacy 显示怪癖，如 1 年整 =>
    // 1年0月0天0小时0分0秒）
    const cases: [string, Date, Date, string][] = [
        ["仅 5 秒", at(2026, 8, 15, 12, 0, 0), at(2026, 8, 15, 12, 0, 5), "5秒&nbsp;前的最后版本"],
        ["1 小时 5 分（秒 0 补位）", at(2026, 8, 15, 10, 55, 0), at(2026, 8, 15, 12, 0, 0), "1小时5分0秒&nbsp;前的最后版本"],
        ["整 1 年（全低位 0 补位）", at(2025, 8, 15, 12, 0, 0), at(2026, 8, 15, 12, 0, 0), "1年0月0天0小时0分0秒&nbsp;前的最后版本"],
        ["2 分 30 秒", at(2026, 8, 15, 11, 57, 30), at(2026, 8, 15, 12, 0, 0), "2分30秒&nbsp;前的最后版本"],
        ["秒借位（12:04:45 → 12:05:10）", at(2026, 8, 15, 12, 4, 45), at(2026, 8, 15, 12, 5, 10), "25秒&nbsp;前的最后版本"],
        ["分借位（12:58:05 → 13:00:30）", at(2026, 8, 15, 12, 58, 5), at(2026, 8, 15, 13, 0, 30), "2分25秒&nbsp;前的最后版本"],
        ["时借位（跨日 23:50:20 → 00:10:00）", at(2026, 8, 14, 23, 50, 20), at(2026, 8, 15, 0, 10, 0), "19分40秒&nbsp;前的最后版本"],
        ["日借位·31 天月（1/31 → 3/1）", at(2026, 0, 31, 12, 0, 0), at(2026, 2, 1, 12, 0, 0), "1月1天0小时0分0秒&nbsp;前的最后版本"],
        ["日借位·平年二月（2/28 → 3/1）", at(2025, 1, 28, 12, 0, 0), at(2025, 2, 1, 12, 0, 0), "1天0小时0分0秒&nbsp;前的最后版本"],
        ["日借位·闰年二月（2/29 → 3/1）", at(2024, 1, 29, 12, 0, 0), at(2024, 2, 1, 12, 0, 0), "1天0小时0分0秒&nbsp;前的最后版本"],
        ["日借位·30 天月（4/30 → 5/1）", at(2026, 3, 30, 12, 0, 0), at(2026, 4, 1, 12, 0, 0), "1天0小时0分0秒&nbsp;前的最后版本"],
        ["月借位（2025/11/20 → 2026/1/15）", at(2025, 10, 20, 12, 0, 0), at(2026, 0, 15, 12, 0, 0), "1月25天0小时0分0秒&nbsp;前的最后版本"],
        ["未来 10 秒（isBefore 反向）", at(2026, 8, 15, 12, 0, 10), at(2026, 8, 15, 12, 0, 0), "10秒&nbsp;前的最后版本"],
        ["未来·秒借位（12:01:10 ← 12:00:50）", at(2026, 8, 15, 12, 1, 10), at(2026, 8, 15, 12, 0, 50), "20秒&nbsp;前的最后版本"],
        ["未来·日借位平年二月（3/1 ← 2/28）", at(2026, 2, 1, 12, 0, 0), at(2026, 1, 28, 12, 0, 0), "1天0小时0分0秒&nbsp;前的最后版本"],
        ["时刻完全相等（全 0 差）", at(2026, 8, 15, 12, 0, 0), at(2026, 8, 15, 12, 0, 0), "&nbsp;前的最后版本"],
    ];
    for (const [name, age, now, expected] of cases) {
        it(`日历差值：${name}`, async () => {
            expect(await runAt(age, now)).toBe(expected);
        });
    }

    it("lastModified 为 null：moment(null) 先求值再判空（legacy 顺序照搬），返回空串", async () => {
        const { pageinfo, options, downloader } = await fresh();
        options.setOptions();
        vi.spyOn(moment, "now").mockReturnValue(at(2026, 8, 15, 12, 0, 0).getTime());
        const d = makeDownload(downloader);
        d.lastModified = null;
        expect(pageinfo.popupFilterLastModified("", d)).toBe("");
    });

    it("popupLastModified 关闭（window 覆盖 false）返回空串", async () => {
        const { pageinfo, downloader } = await fresh();
        setWindow("popupLastModified", false);
        vi.spyOn(moment, "now").mockReturnValue(at(2026, 8, 15, 12, 0, 0).getTime());
        const d = makeDownload(downloader);
        d.lastModified = at(2026, 8, 15, 11, 0, 0);
        expect(pageinfo.popupFilterLastModified("", d)).toBe("");
    });
});

describe("popupFilterWikibaseItem", () => {
    it("无 wikibaseItem 返回空串", async () => {
        const { pageinfo, downloader } = await fresh();
        const d = makeDownload(downloader);
        d.wikibaseRepo = "https://www.wikidata.org/wiki/$1";
        expect(pageinfo.popupFilterWikibaseItem("", d)).toBe("");
    });

    it("无 wikibaseRepo 返回空串", async () => {
        const { pageinfo, downloader } = await fresh();
        const d = makeDownload(downloader);
        d.wikibaseItem = "Q42";
        expect(pageinfo.popupFilterWikibaseItem("", d)).toBe("");
    });

    it("齐备时生成链接；模板键缺译首查记 popupNoTranslation 并 console.info 一次（legacy 噪声照搬）", async () => {
        const { pageinfo, downloader } = await fresh();
        const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
        const d = makeDownload(downloader);
        d.wikibaseItem = "Q42";
        d.wikibaseRepo = "https://www.wikidata.org/wiki/Special:EntityPage/$1";
        expect(pageinfo.popupFilterWikibaseItem("", d)).toBe('<a href="https://www.wikidata.org/wiki/Special:EntityPage/Q42">Q42</a>');
        expect(info).toHaveBeenCalledOnce();
        // 同键第二次查询不再重复记录
        expect(pageinfo.popupFilterWikibaseItem("", d)).toBe('<a href="https://www.wikidata.org/wiki/Special:EntityPage/Q42">Q42</a>');
        expect(info).toHaveBeenCalledOnce();
    });
});

describe("popupFilterStubDetect", () => {
    const run = async (data: string, articleName: string): Promise<string> => {
        const { pageinfo, title, downloader } = await fresh();
        return pageinfo.popupFilterStubDetect(data, makeDownload(downloader), new title.Title(articleName));
    };

    it("真实小作品模板 → 小作品", async () => {
        expect(await run("{{stub}}", "条目")).toBe("小作品");
    });

    it("小章节模板 → 小章节", async () => {
        expect(await run("{{sectstub}}", "条目")).toBe("小章节");
    });

    it("真实与小章节并存时优先真实小作品（legacy 判定顺序）", async () => {
        expect(await run("{{stub}} and {{sectstub}}", "条目")).toBe("小作品");
    });

    it("无小作品模板返回空串", async () => {
        expect(await run("普通条目正文", "条目")).toBe("");
    });

    it("非主名字空间且 popupAllDabsStubs 关：stubCount 返回 false，过滤为空串", async () => {
        expect(await run("{{stub}}", "User:X")).toBe("");
    });
});

describe("popupFilterDisambigDetect", () => {
    const run = async (data: string, articleName: string): Promise<string> => {
        const { pageinfo, title, downloader } = await fresh();
        return pageinfo.popupFilterDisambigDetect(data, makeDownload(downloader), new title.Title(articleName));
    };

    it("主名字空间 + 命中消歧义正则 → 消歧义", async () => {
        expect(await run("{{disambiguation}}", "条目")).toBe("消歧义");
    });

    it("主名字空间未命中返回空串", async () => {
        expect(await run("普通条目正文", "条目")).toBe("");
    });

    it("非主名字空间且 popupAllDabsStubs 关：提前返回空串（与 titles.isDisambig 的双重门控是 legacy 原样）", async () => {
        expect(await run("{{disambiguation}}", "User:X")).toBe("");
    });

    it("popupAllDabsStubs 开时非主名字空间也检测", async () => {
        const { pageinfo, title, downloader } = await fresh();
        setWindow("popupAllDabsStubs", true);
        // titles.isDisambig 读的是 wiki.getOption 缝，需同步放开
        title.wiki.getOption = (name: string): unknown => name === "popupAllDabsStubs";
        expect(pageinfo.popupFilterDisambigDetect("{{disambiguation}}", makeDownload(downloader), new title.Title("User:X"))).toBe("消歧义");
    });
});

describe("getPageInfo", () => {
    it("空数据 → Empty page", async () => {
        const { pageinfo, downloader } = await fresh();
        expect(pageinfo.getPageInfo("", makeDownload(downloader))).toBe("空页面");
    });

    it("默认 8 过滤器全链：按注册顺序以逗号连接（wikibase/消歧义无数据不产出）", async () => {
        const { pageinfo, options, downloader, title } = await fresh();
        options.setOptions();
        vi.spyOn(moment, "now").mockReturnValue(at(2026, 8, 15, 12, 0, 5).getTime());
        const d = makeDownload(downloader);
        d.lastModified = at(2026, 8, 15, 12, 0, 0);
        d.owner = ownerWithArticle(title, "测试条目");
        expect(pageinfo.getPageInfo("{{stub}}[[A]][[File:B.jpg]][[Category:C]]", d)).toBe(
            "小作品，41&nbsp;字节，3&nbsp;个内部链接，1&nbsp;个文件，1&nbsp;个分类，5秒&nbsp;前的最后版本",
        );
    });

    it("选项未注册时 ?? [] 兜底；extraPopupFilters 参与；结果 upcaseFirst", async () => {
        const { pageinfo, downloader } = await fresh();
        setWindow("extraPopupFilters", [(): string => "abc def"]);
        expect(pageinfo.getPageInfo("任意正文", makeDownload(downloader))).toBe("Abc def");
    });

    it("用户配置混入 null/非函数项被跳过（typeof 守卫，legacy 原样）", async () => {
        const { pageinfo, downloader } = await fresh();
        setWindow("popupFilters", [null, "junk", pageinfo.popupFilterCountLinks]);
        expect(pageinfo.getPageInfo("[[A]]", makeDownload(downloader))).toBe("1&nbsp;个内部链接");
    });

    it("全部过滤器返回空串时 join 结果为空串，不再大写化", async () => {
        const { pageinfo, downloader } = await fresh();
        setWindow("popupFilters", [pageinfo.popupFilterWikibaseItem]);
        expect(pageinfo.getPageInfo("任意正文", makeDownload(downloader))).toBe("");
    });

    it("download 无 owner 时第三参为 undefined（不消费 article 的过滤器正常）", async () => {
        const { pageinfo, downloader } = await fresh();
        setWindow("popupFilters", [pageinfo.popupFilterPageSize]);
        expect(pageinfo.getPageInfo("12345678", makeDownload(downloader))).toBe("8&nbsp;字节");
    });
});
