// namespaces 域镜像测试：行为基准 = legacy src/modules/namespaces.ts
// （commit 02c8dec），含萌百 interwiki 定制（zh→en|ja、en→zh|ja、ja→zh|en）
// 与 30+ 语言的重定向关键字表（zh 分支含「重定向」）。
import { beforeEach, describe, expect, it } from "vitest";
import { installMw } from "../../helpers/mockMw.ts";
import {
    nsRe,
    nsReImage,
    nsState,
    setInterwiki,
    setNamespaces,
    setRedirs,
    upcaseFirst,
} from "../../../src/title/namespaces.ts";

// nsState 是模块级单例；各用例按需重置回「装配前」形态再触发 setter
// （id 为硬编码常量初值即终值，重置其余装配态即可）
const resetNsState = (): void => {
    nsState.interwiki = undefined;
    nsState.re.interwiki = null;
    nsState.re.redirect = null;
};

beforeEach(() => {
    installMw();
    resetNsState();
});

describe("setNamespaces", () => {
    it("设置七个命名空间 id 常量", () => {
        setNamespaces();
        expect(nsState.specialId).toBe(-1);
        expect(nsState.mainspaceId).toBe(0);
        expect(nsState.imageId).toBe(6);
        expect(nsState.userId).toBe(2);
        expect(nsState.usertalkId).toBe(3);
        expect(nsState.categoryId).toBe(14);
        expect(nsState.templateId).toBe(10);
    });
});

describe("upcaseFirst", () => {
    it("首字母大写", () => {
        expect(upcaseFirst("special")).toBe("Special");
    });

    it("非 ASCII 首字符原样返回", () => {
        expect(upcaseFirst("文件")).toBe("文件");
    });

    it("空串返回空串", () => {
        expect(upcaseFirst("")).toBe("");
    });
});

describe("nsRe", () => {
    it("收集 wgNamespaceIds 中该 id 的全部本地化别名（明文 + encodeURI 两种变体）", () => {
        // 默认 config 键序：special, file, image, 文件, 档案, template, 模板,
        // category, 分类, user, 用户；id=6 的别名依序产出 8 个变体
        expect(nsRe(6)).toBe("(?:File|File|Image|Image|文件|%E6%96%87%E4%BB%B6|档案|%E6%A1%A3%E6%A1%88)");
    });

    it("别名先 upcaseFirst 再转义", () => {
        // mockWw 默认 config 的 -1 键序：special, 特殊（shared helper 后补）
        expect(nsRe(-1)).toBe("(?:Special|Special|特殊|%E7%89%B9%E6%AE%8A)");
    });

    it("含空格的别名把空格放宽为 [ _]", () => {
        installMw({
            config: {
                wgNamespaceIds: {
                    project: 4,
                    "project talk": 4,
                    proj: 4,
                },
            },
        });
        expect(nsRe(4)).toBe("(?:Project|Project|Project[ _]talk|Project%20talk|Proj|Proj)");
    });

    it("无匹配别名时产出空模式", () => {
        expect(nsRe(999)).toBe("(?:)");
    });

    it("namespaceId 缺省（未装配 ns 状态的调用路径）产出空模式", () => {
        expect(nsRe()).toBe("(?:)");
    });
});

describe("nsReImage", () => {
    it("初值即常量，等价于 nsRe(6)", () => {
        // ns id 为硬编码常量（初值即终值），不再有「装配前退化」形态
        expect(nsReImage()).toBe(nsRe(6));
    });
});

describe("setInterwiki（萌百定制）", () => {
    it("zh 站 → en|ja（注意：| 不分组，legacy 原样）", () => {
        setInterwiki();
        expect(nsState.interwiki).toBe("en|ja");
        expect(nsState.re.interwiki?.source).toBe("^en|ja:");
        expect(nsState.re.interwiki?.test("en:Foo")).toBe(true);
        expect(nsState.re.interwiki?.test("ja:Foo")).toBe(true);
        expect(nsState.re.interwiki?.test("zh:Foo")).toBe(false);
    });

    it("en 站 → zh|ja", () => {
        installMw({ config: { wgContentLanguage: "en" } });
        setInterwiki();
        expect(nsState.interwiki).toBe("zh|ja");
        expect(nsState.re.interwiki?.source).toBe("^zh|ja:");
    });

    it("ja 站 → zh|en", () => {
        installMw({ config: { wgContentLanguage: "ja" } });
        setInterwiki();
        expect(nsState.interwiki).toBe("zh|en");
        expect(nsState.re.interwiki?.source).toBe("^zh|en:");
    });

    it("其他语言：interwiki 保持 undefined，正则退化为 ^undefined:（legacy 原样保留）", () => {
        installMw({ config: { wgContentLanguage: "fr" } });
        setInterwiki();
        expect(nsState.interwiki).toBeUndefined();
        expect(nsState.re.interwiki?.source).toBe("^undefined:");
    });
});

// legacy setRedirs 的多语言重定向关键字表逐项镜像（r=redirect、R=REDIRECT 展开）。
// 表内容与正则形状一并锁死：任何条目增删或顺序调整都会在这里失败。
const REDIR_VARIANTS: Record<string, string[]> = {
    ar: ["REDIRECT", "تحويل"],
    be: ["redirect", "перанакіраваньне"],
    bg: ["redirect", "пренасочване", "виж"],
    bs: ["redirect", "Preusmjeri", "preusmjeri", "PREUSMJERI"],
    bn: ["REDIRECT", "পুনর্নির্দেশ"],
    cs: ["REDIRECT", "PŘESMĚRUJ"],
    cy: ["redirect", "ail-cyfeirio"],
    de: ["REDIRECT", "WEITERLEITUNG"],
    el: ["REDIRECT", "ΑΝΑΚΑΤΕΥΘΥΝΣΗ"],
    eo: ["REDIRECT", "ALIDIREKTU", "ALIDIREKTI"],
    es: ["REDIRECT", "REDIRECCIÓN"],
    et: ["redirect", "suuna"],
    ga: ["redirect", "athsheoladh"],
    gl: ["redirect", "REDIRECCIÓN", "REDIRECIONAMENTO"],
    he: ["REDIRECT", "הפניה"],
    hu: ["REDIRECT", "ÁTIRÁNYÍTÁS"],
    is: ["redirect", "tilvísun", "TILVÍSUN"],
    it: ["REDIRECT", "RINVIA", "Rinvia"],
    ja: ["REDIRECT", "転送"],
    mk: ["redirect", "пренасочување", "види"],
    nds: ["redirect", "wiederleiden"],
    "nds-nl": ["REDIRECT", "DEURVERWIEZING", "DUURVERWIEZING"],
    nl: ["REDIRECT", "DOORVERWIJZING"],
    nn: ["redirect", "omdiriger"],
    pl: ["REDIRECT", "PATRZ", "PRZEKIERUJ", "TAM"],
    pt: ["REDIRECT", "redir"],
    ru: ["REDIRECT", "ПЕРЕНАПРАВЛЕНИЕ", "ПЕРЕНАПР"],
    sk: ["redirect", "presmeruj"],
    sr: ["redirect", "Преусмери", "преусмери", "ПРЕУСМЕРИ", "Preusmeri", "preusmeri", "PREUSMERI"],
    tt: ["REDIRECT", "yünältü", "перенаправление", "перенапр"],
    uk: ["REDIRECT", "ПЕРЕНАПРАВЛЕННЯ", "ПЕРЕНАПР"],
    vi: ["redirect", "đổi"],
    yi: ["REDIRECT", "ווייטערפירן"],
    zh: ["REDIRECT", "重定向"],
};

// legacy setRedirs 构造的重定向匹配正则（i 标志、捕获组布局）
const expectedRedirSource = (variants: string[]): string =>
    `^\\s*[#](${variants.join("|")}).*?\\[{2}([^\\|\\]]*)(|[^\\]]*)?\\]{2}\\s*(.*)`;

describe("setRedirs", () => {
    it.each(Object.entries(REDIR_VARIANTS))("重定向表 [%s] 逐项构造", (lang, variants) => {
        installMw({ config: { wgContentLanguage: lang } });
        setRedirs();
        expect(nsState.re.redirect?.source).toBe(expectedRedirSource(variants));
        expect(nsState.re.redirect?.ignoreCase).toBe(true);
    });

    it("表外语言退化为 redirect|REDIRECT", () => {
        installMw({ config: { wgContentLanguage: "fr" } });
        setRedirs();
        expect(nsState.re.redirect?.source).toBe(expectedRedirSource(["redirect", "REDIRECT"]));
    });

    it("zh：匹配 #重定向 / #redirect（不区分大小写），不匹配其他语言关键字", () => {
        setRedirs();
        expect(nsState.re.redirect?.test("#重定向 [[目标]]")).toBe(true);
        expect(nsState.re.redirect?.test("#redirect [[Target]]")).toBe(true);
        expect(nsState.re.redirect?.test("#WEITERLEITUNG [[Ziel]]")).toBe(false);
    });

    it("de：匹配本地化关键字", () => {
        installMw({ config: { wgContentLanguage: "de" } });
        setRedirs();
        expect(nsState.re.redirect?.test("#WEITERLEITUNG [[Ziel]]")).toBe(true);
    });

    it("捕获组：目标页 / 管道余段 / 尾部", () => {
        setRedirs();
        const m = nsState.re.redirect?.exec("#REDIRECT [[A|B]] tail");
        expect(m?.[1]).toBe("REDIRECT");
        expect(m?.[2]).toBe("A");
        expect(m?.[3]).toBe("|B");
        expect(m?.[4]).toBe("tail");
    });
});
