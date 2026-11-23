import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../modules/exec.js", () => ({
    "default": vi.fn(() => Promise.resolve("https://registry.npmjs.org/")),
}));

const fetchMock = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", fetchMock);

const okResponse = (packageInfo) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve(packageInfo),
});
const errorResponse = (status, statusText = "Error") => ({
    ok: false,
    status,
    statusText,
    text: () => Promise.resolve("error body"),
});
const importModule = async () => (await import("../../modules/fetchNPMPackageInfo.js")).default;

beforeEach(() => {
    vi.resetModules();
});

afterEach(() => {
    fetchMock.mockReset();
});

describe("fetchNPMPackageInfo", () => {
    it("作用域包按未编码的 registry 路径请求（npm registry 同时接受 @scope/pkg 与 @scope%2Fpkg）", async () => {
        const packageInfo = { "dist-tags": { latest: "1.2.3" } };
        fetchMock.mockResolvedValue(okResponse(packageInfo));
        const fetchNPMPackageInfo = await importModule();
        await expect(fetchNPMPackageInfo("@scope/pkg")).resolves.toBe(packageInfo);
        expect(fetchMock).toHaveBeenCalledOnce();
        expect(fetchMock.mock.calls[0][0]).toBe("https://registry.npmjs.org/@scope/pkg");
    });

    it("网络错误重试一次后成功", async () => {
        const packageInfo = { "dist-tags": { latest: "2.0.0" } };
        fetchMock.mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(okResponse(packageInfo));
        const fetchNPMPackageInfo = await importModule();
        await expect(fetchNPMPackageInfo("retry-pkg")).resolves.toBe(packageInfo);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("4xx 不重试，直接抛错", async () => {
        fetchMock.mockResolvedValue(errorResponse(404, "Not Found"));
        const fetchNPMPackageInfo = await importModule();
        await expect(fetchNPMPackageInfo("missing-pkg")).rejects.toThrow(/404/);
        expect(fetchMock).toHaveBeenCalledOnce();
    });

    it("5xx 重试达到上限后抛错", async () => {
        fetchMock.mockResolvedValue(errorResponse(503, "Service Unavailable"));
        const fetchNPMPackageInfo = await importModule();
        await expect(fetchNPMPackageInfo("unstable-pkg")).rejects.toThrow(/503/);
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    it("同一包命中缓存时只请求一次", async () => {
        const packageInfo = { "dist-tags": { latest: "3.0.0" } };
        fetchMock.mockResolvedValue(okResponse(packageInfo));
        const fetchNPMPackageInfo = await importModule();
        await fetchNPMPackageInfo("cached-pkg");
        await fetchNPMPackageInfo("cached-pkg");
        expect(fetchMock).toHaveBeenCalledOnce();
    });
});
