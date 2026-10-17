// 页面缓存域镜像测试：URL 级内存缓存（命中走 fakeDownload 直填、未命中走
// 网络并回填缓存与 owner.downloads）、aborted 跳过。行为基准 = legacy
// getpage.ts（commit 02c8dec；pg.cache.pages 域状态改模块自持）。
import { describe, expect, it, vi } from "vitest";
import { installMw } from "../../helpers/mockMw.ts";
import { installXhr } from "../../helpers/mockXhr.ts";
import type * as CacheNs from "../../../src/net/cache.ts";
import type { DownloadOwner, Downloader } from "../../../src/net/downloader.ts";

type Cache = typeof CacheNs;

const fresh = async (): Promise<Cache> => {
    vi.resetModules();
    return await import("../../../src/net/cache.ts");
};

const makeOwner = (idNumber: number): DownloadOwner & { idNumber: number } => ({
    downloads: new Set(),
    idNumber,
});

const URL_A = "https://zh.moegirl.org.cn/api.php?titles=A";

describe("getPageWithCaching", () => {
    it("未命中：走网络，完成后回调并入缓存、登记 owner.downloads", async () => {
        const cache = await fresh();
        installMw();
        installXhr(() => ({ status: 200, responseText: "BODY-A" }));
        const owner = makeOwner(11);
        const cb = vi.fn();
        cache.getPageWithCaching(URL_A, cb, owner);
        await vi.waitFor(() => {
            expect(cb).toHaveBeenCalledOnce();
        });
        const d = cb.mock.calls[0]?.[0] as { url: string; data?: string; owner?: unknown };
        expect(d.url).toBe(URL_A);
        expect(d.data).toBe("BODY-A");
        expect(d.owner).toBe(owner);
        // 网络下载登记进归属弹窗的中止集合
        expect(owner.downloads.size).toBe(1);
        // 回填缓存（data/lastModified）
        expect(cache.pages).toHaveLength(1);
        expect(cache.pages[0]?.url).toBe(URL_A);
        expect(cache.pages[0]?.data).toBe("BODY-A");
    });

    it("命中：fakeDownload 直填，不发网络请求，id 取 owner.idNumber", async () => {
        const cache = await fresh();
        installMw();
        const { sent } = installXhr(() => ({ status: 200, responseText: "should-not-fire" }));
        const owner = makeOwner(12);
        // 预热缓存后再调（跳过未命中的网络路径）
        cache.pages.push({ url: URL_A, data: "CACHED", lastModified: null });
        const cb = vi.fn();
        cache.getPageWithCaching(URL_A, cb, owner);
        expect(cb).toHaveBeenCalledOnce();
        const d = cb.mock.calls[0]?.[0] as { data?: string; id: number | string | null };
        expect(d.data).toBe("CACHED");
        expect(d.id).toBe(12);
        expect(sent).toHaveLength(0);
        // 命中路径不重复入缓存
        expect(cache.pages).toHaveLength(1);
    });

    it("aborted：完成回调被抑制且不入缓存（legacy callback 守卫）", async () => {
        const cache = await fresh();
        installMw();
        installXhr(() => ({ status: 200, responseText: "LATE", delay: 40 }));
        const owner = makeOwner(13);
        const cb = vi.fn();
        cache.getPageWithCaching(URL_A, cb, owner);
        // 响应到达前把下载标记为 aborted（不经 Downloader.abort，保留 XHR
        // 推进——覆盖 callback 守卫本体而非中止抑制）
        // downloads 集合的元素类型是最小中止接口，实际实例即 Downloader
        const dl = [...owner.downloads][0] as Downloader;
        dl.aborted = true;
        await new Promise((resolve) => {
            setTimeout(resolve, 60);
        });
        expect(cb).not.toHaveBeenCalled();
        expect(cache.pages).toHaveLength(0);
    });

    it("clearPages：清空缓存（pg.fn.purgePopups 的等价入口）；查找跳过不匹配项", async () => {
        const cache = await fresh();
        installMw();
        installXhr(() => ({ status: 200, responseText: "unused" }));
        cache.pages.push({ url: "https://other", data: "other", lastModified: null });
        cache.pages.push({ url: URL_A, data: "x", lastModified: null });
        cache.clearPages();
        expect(cache.pages).toHaveLength(0);
        // 不匹配项遍历后命中末项
        cache.pages.push({ url: "https://other", data: "other", lastModified: null });
        cache.pages.push({ url: URL_A, data: "A2", lastModified: null });
        const owner = makeOwner(14);
        const cb = vi.fn();
        cache.getPageWithCaching(URL_A, cb, owner);
        const d = cb.mock.calls[0]?.[0] as { data?: string };
        expect(d.data).toBe("A2");
    });
});
