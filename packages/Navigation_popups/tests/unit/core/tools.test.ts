// tools 域单元测试：行为规格 = legacy src/modules/tools.ts（commit 02c8dec）。
// 重写版映射：String.prototype.entify 原型扩展与 pg.escapeQuotesHTML /
// pg.unescapeQuotesHTML 挂载均按「顶层零副作用」原则函数化为导出函数；
// upcaseFirst/simplePrintf/parenSplit 已分别归属 title/strings 域，不在此测。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installMw } from "../../helpers/mockMw.ts";

// 类型静态引入、值每用例动态 import（fresh 模块图约定）
import type * as ToolsNs from "../../../src/core/tools.ts";

type Tools = typeof ToolsNs;

describe("tools 域", () => {
    let tools: Tools;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    beforeEach(async () => {
        vi.resetModules();
        logSpy.mockClear();
        errSpy.mockClear();
        // getJsObj 的 log/errlog 仅在 window.popupDebug 真值时落到 console
        window.popupDebug = true;
        installMw();
        tools = await import("../../../src/core/tools.ts");
    });

    afterEach(() => {
        window.popupDebug = false;
    });

    describe("nonGlobalRegex", () => {
        it("剥离 g 标志，源与其余标志保留", () => {
            const re = tools.nonGlobalRegex(/foo/g);
            expect(re.global).toBe(false);
            expect(re.source).toBe("foo");
        });

        it("多标志正则只去 g（倒序收集的标志集合语义等价）", () => {
            const re = tools.nonGlobalRegex(/x/gimy);
            expect(re.global).toBe(false);
            expect(re.flags).toBe("imy");
        });

        it("非全局正则原样语义（标志保留）", () => {
            const re = tools.nonGlobalRegex(/foo/i);
            expect(re.global).toBe(false);
            expect(re.ignoreCase).toBe(true);
        });

        it("无标志正则产出无标志副本", () => {
            const re = tools.nonGlobalRegex(/foo/);
            expect(re.flags).toBe("");
            expect(re.source).toBe("foo");
        });
    });

    describe("getJsObj", () => {
        it("合法 JSON 原样解析返回", () => {
            expect(tools.getJsObj('{"a":1}')).toEqual({ a: 1 });
            expect(logSpy).not.toHaveBeenCalled();
            expect(errSpy).not.toHaveBeenCalled();
        });

        it("warnings 数组带 * 字段时逐条 log（legacy 调试噪声照搬）", () => {
            const ret = tools.getJsObj('{"warnings":[{"*":"w1"},{"*":"w2"}]}') as { warnings: unknown[] };
            expect(ret.warnings).toHaveLength(2);
            expect(logSpy).toHaveBeenCalledWith("w1");
            expect(logSpy).toHaveBeenCalledWith("w2");
        });

        it("warnings 元素缺 * 字段时回退 log 其 warnings 字段", () => {
            tools.getJsObj('{"warnings":[{"warnings":"plain"}]}');
            expect(logSpy).toHaveBeenCalledWith("plain");
        });

        it("error 对象 errlog 出 code: info", () => {
            const ret = tools.getJsObj('{"error":{"code":"badvalue","info":"oops"}}') as { error: unknown };
            expect(ret.error).toEqual({ code: "badvalue", info: "oops" });
            expect(errSpy).toHaveBeenCalledWith("badvalue: oops");
        });

        it("非法 JSON errlog 并返回 1（legacy 哨兵值照搬）", () => {
            expect(tools.getJsObj("not json")).toBe(1);
            expect(errSpy).toHaveBeenCalledOnce();
        });
    });

    describe("anyChild", () => {
        it("返回对象的首个自有键值（for-in 插入序）", () => {
            expect(tools.anyChild({ b: 1, a: 2 })).toBe(1);
        });

        it("数值型字符串键按数值升序取最小（for-in 语义照搬）", () => {
            expect(tools.anyChild({ 10: "ten", 2: "two" })).toBe("two");
        });

        it("空对象返回 null", () => {
            expect(tools.anyChild({})).toBeNull();
        });
    });

    describe("literalizeRegex", () => {
        it("转义正则元字符（mw.util.escapeRegExp 包装）", () => {
            // installMw 的返回对象不含 util；断言基准取全局 mw 上的同一实现
            expect(tools.literalizeRegex("a.b*c")).toBe(mw.util.escapeRegExp("a.b*c"));
            expect(tools.literalizeRegex("a.b*c")).toContain("\\.");
        });
    });

    describe("entify（legacy String.prototype.entify 函数化）", () => {
        it("四个 HTML 字符替换为实体", () => {
            expect(tools.entify('a&b<c>d"e')).toBe("a&amp;b&lt;c&gt;d&quot;e");
        });

        it("空串与无特殊字符串原样返回", () => {
            expect(tools.entify("")).toBe("");
            expect(tools.entify("plain")).toBe("plain");
        });

        it("已转义串再做实体化（& 先行，不产出 &amp;quot; 级联之外的形态）", () => {
            expect(tools.entify("&quot;")).toBe("&amp;quot;");
        });
    });

    describe("joinPath", () => {
        it("以 / 连接非 null 项", () => {
            expect(tools.joinPath(["a", "b", "c"])).toBe("a/b/c");
        });

        it("null 项被剔除", () => {
            expect(tools.joinPath(["a", null, "b"])).toBe("a/b");
        });

        it("全 null 产出空串", () => {
            expect(tools.joinPath([null, null])).toBe("");
        });
    });

    describe("isString", () => {
        it("原始字符串与 String 包装对象都判真（legacy instanceof 分支照搬）", () => {
            expect(tools.isString("x")).toBe(true);
            // eslint-disable-next-line no-new-wrappers -- 覆盖 instanceof String 分支
            expect(tools.isString(new String("x"))).toBe(true);
        });

        it("数字/正则/对象判假", () => {
            expect(tools.isString(1)).toBe(false);
            expect(tools.isString(/x/)).toBe(false);
            expect(tools.isString({})).toBe(false);
        });
    });

    describe("isRegExp", () => {
        it("正则判真", () => {
            expect(tools.isRegExp(/x/)).toBe(true);
        });

        it("字符串与对象判假", () => {
            expect(tools.isRegExp("x")).toBe(false);
            expect(tools.isRegExp({})).toBe(false);
        });
    });

    describe("assume", () => {
        it("运行时恒等传值（类型层断言函数）", () => {
            const obj = { a: 1 };
            expect(tools.assume(obj)).toBe(obj);
            expect(tools.assume(42)).toBe(42);
        });
    });

    describe("zeroFill", () => {
        it("默认补足 2 位", () => {
            expect(tools.zeroFill(5)).toBe("05");
            expect(tools.zeroFill(42)).toBe("42");
        });

        it("指定位数补零", () => {
            expect(tools.zeroFill(7, 3)).toBe("007");
        });

        it("超长数字不截断", () => {
            expect(tools.zeroFill(12345)).toBe("12345");
        });
    });

    describe("map", () => {
        it("数组分支逐项映射", () => {
            expect(tools.map((x: number) => x * 2, [1, 2, 3])).toEqual([2, 4, 6]);
        });

        it("对象分支键取 String(o)（upstream bug 照搬勿修：全部条目折叠进单键 [object Object]，最后一个键的映射值胜出）", () => {
            const ret = tools.map((x: number) => x + 100, { a: 1, b: 2 }) as Record<string, number>;
            expect(Object.keys(ret)).toEqual(["[object Object]"]);
            expect(ret["[object Object]"]).toBe(102);
        });
    });

    describe("escapeQuotesHTML", () => {
        it("四字符实体化（& 先于其余，避免级联）", () => {
            expect(tools.escapeQuotesHTML('&<>"')).toBe("&amp;&lt;&gt;&quot;");
        });

        it("无特殊字符原样返回", () => {
            expect(tools.escapeQuotesHTML("plain")).toBe("plain");
        });
    });

    describe("unescapeQuotesHTML", () => {
        it("经 textarea 反转义实体（legacy 浏览器惯用法照搬）", () => {
            expect(tools.unescapeQuotesHTML("&amp;&lt;&gt;&quot;")).toBe('&<>"');
        });

        it("普通文本原样返回", () => {
            expect(tools.unescapeQuotesHTML("plain")).toBe("plain");
        });
    });
});
