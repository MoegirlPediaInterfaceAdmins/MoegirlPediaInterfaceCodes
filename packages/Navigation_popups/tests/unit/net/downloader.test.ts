// 下载器域镜像测试：XHR 生命周期（Api-User-Agent 头、200 成功回调带
// data/lastModified、非 200 数值重试 2 次、onfailure 函数分支）、
// downloadsInProgress 登记/完成移除/abortAllDownloads、fakeDownload 直填、
// abort 后回调不再推进。行为基准 = legacy downloader.ts（commit 02c8dec）。
import { describe, expect, it, vi } from "vitest";
import { installMw } from "../../helpers/mockMw.ts";
import { installXhr } from "../../helpers/mockXhr.ts";
import type * as NetNs from "../../../src/net/downloader.ts";

type Net = typeof NetNs;

// fresh 模块图：downloadsInProgress/userAgent 是模块级状态，逐用例重载
const fresh = async (): Promise<Net> => {
    vi.resetModules();
    return await import("../../../src/net/downloader.ts");
};

const OK_BODY = '{"query":{}}';

describe("Downloader", () => {
    it("startDownload：GET + Api-User-Agent 头，200 回调带 data 与 Last-Modified", async () => {
        const net = await fresh();
        installMw();
        net.setDownloaderUserAgent("Navigation popups/1.0 (zh.moegirl.org.cn)");
        const { sent } = installXhr(() => ({
            status: 200,
            responseText: OK_BODY,
            headers: { "Last-Modified": "Mon, 01 Sep 2026 00:00:00 GMT" },
        }));
        const cb = vi.fn();
        const d = net.startDownload("https://zh.moegirl.org.cn/api.php?x=1", 7, cb);
        await vi.waitFor(() => {
            expect(cb).toHaveBeenCalledOnce();
        });
        expect(sent).toHaveLength(1);
        expect(sent[0]?.method).toBe("GET");
        expect(sent[0]?.headers["Api-User-Agent"]).toBe("Navigation popups/1.0 (zh.moegirl.org.cn)");
        expect(d.data).toBe(OK_BODY);
        expect(d.lastModified).toEqual(new Date("Mon, 01 Sep 2026 00:00:00 GMT"));
        // legacy 完成移除的键错位（onreadystatechange 的 this 是 XHR，其上无
        // id，实际删的是 "undefined" 键）——完成的下载留在登记表，照搬勿修
        expect(net.downloadsInProgress["7"]).toBe(d);
    });

    it("200 无 Last-Modified 头：lastModified 为 null", async () => {
        const net = await fresh();
        installMw();
        installXhr(() => ({ status: 200, responseText: OK_BODY }));
        const cb = vi.fn();
        const d = net.startDownload("https://example/noheader", 8, cb);
        await vi.waitFor(() => {
            expect(cb).toHaveBeenCalledOnce();
        });
        expect(d.lastModified).toBeNull();
    });

    it("getResponseHeader 抛错：lastModified 静默为 null（legacy try/catch）", async () => {
        const net = await fresh();
        installMw();
        const { instances } = installXhr(() => ({ status: 200, responseText: OK_BODY, headers: { "Last-Modified": "x" }, delay: 20 }));
        const cb = vi.fn();
        const d = net.startDownload("https://example/boomheader", 6, cb);
        const xhr = instances[0];
        vi.spyOn(xhr, "getResponseHeader").mockImplementation(() => {
            throw new Error("header boom");
        });
        await vi.waitFor(() => {
            expect(cb).toHaveBeenCalledOnce();
        });
        expect(d.lastModified).toBeNull();
    });

    it("进行中登记与 abortAllDownloads：登记表清空且实例标记 aborted", async () => {
        const net = await fresh();
        installMw();
        installXhr(() => ({ status: 200, responseText: OK_BODY, delay: 60 }));
        const cb = vi.fn();
        const d = net.startDownload("https://example/api", 3, cb);
        expect(net.downloadsInProgress["3"]).toBe(d);
        net.abortAllDownloads();
        expect(net.downloadsInProgress["3"]).toBeUndefined();
        expect(d.aborted).toBe(true);
        // 延迟响应到期后回调不推进（abort 抑制）
        await new Promise((resolve) => {
            setTimeout(resolve, 80);
        });
        expect(cb).not.toHaveBeenCalled();
    });

    it("非 200：重试分支静默（legacy 重试创建 Downloader 但从不 start，实际不重发）", async () => {
        const net = await fresh();
        installMw();
        const { sent } = installXhr(() => ({ status: 503, responseText: "" }));
        const cb = vi.fn();
        net.startDownload("https://example/retry", 1, cb);
        await new Promise((resolve) => {
            setTimeout(resolve, 30);
        });
        // legacy 的重试是死代码：newDownload 递归产物无人 start——失败后既不
        // 重发也不回调，照搬勿修（semantic-notes 登记）
        expect(sent).toHaveLength(1);
        expect(cb).not.toHaveBeenCalled();
    });

    it("回调抛错被吞（legacy try/catch 原样）", async () => {
        const net = await fresh();
        installMw();
        installXhr(() => ({ status: 200, responseText: OK_BODY }));
        const boom = vi.fn(() => {
            throw new Error("callback boom");
        });
        expect(() => {
            net.startDownload("https://example/throw", 9, boom);
        }).not.toThrow();
        await new Promise((resolve) => {
            setTimeout(resolve, 20);
        });
        expect(boom).toHaveBeenCalledOnce();
    });

    it("id 形态与缺省直填：字符串 id 归 null、fakeDownload 缺省 data/lastModified/id", async () => {
        const net = await fresh();
        installMw();
        installXhr(() => ({ status: 200, responseText: OK_BODY }));
        // links 域的 `${idNumber}history` 字符串 id：legacy 的 typeof 守卫将其
        // 归 null（字符串 id 从不进登记表键）
        const cb = vi.fn();
        const d = net.startDownload("https://example/strid", "11history", cb);
        await vi.waitFor(() => {
            expect(cb).toHaveBeenCalledOnce();
        });
        expect(d.id).toBeNull();
        // fakeDownload 全缺省：data/lastModified/id 各走回落侧
        const cb2 = vi.fn();
        net.fakeDownload("https://example/bare", undefined, cb2);
        const d2 = cb2.mock.calls[0]?.[0] as { data?: string; lastModified: Date | string | null; id: number | string | null };
        expect(d2.data).toBeUndefined();
        expect(d2.lastModified).toBeNull();
        expect(d2.id).toBeNull();
    });

    it("fakeDownload：不经网络的直填回调（缓存命中路径）", async () => {
        const net = await fresh();
        installMw();
        const { sent } = installXhr(() => ({ status: 200, responseText: OK_BODY }));
        const cb = vi.fn();
        const when = new Date("Tue, 02 Sep 2026 08:00:00 GMT");
        net.fakeDownload("https://example/cached", 4, cb, "cached-body", when, null);
        expect(cb).toHaveBeenCalledOnce();
        const d = cb.mock.calls[0]?.[0] as NetNs.Downloader;
        expect(d.data).toBe("cached-body");
        expect(d.lastModified).toBe(when);
        expect(d.id).toBe(4);
        // 假下载不发请求、不登记进行中
        expect(sent).toHaveLength(0);
        expect(Object.keys(net.downloadsInProgress)).toHaveLength(0);
    });
});
