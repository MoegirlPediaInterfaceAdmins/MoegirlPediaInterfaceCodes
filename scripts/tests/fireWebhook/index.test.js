import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// 被测对象是入口脚本（import 即执行全部流程），mock 掉全部 I/O 依赖后按用例
// vi.resetModules() + 重新动态 import 来驱动；雷模块的处理惯例见 createCommit.test.js。
// summarizeNeeds 保持真实实现——重试循环的前提是汇总结果正确
vi.mock("../../modules/octokit.js", () => ({
    isInGithubActions: true,
    isInMasterBranch: true,
    workflowLink: "https://github.com/example/example/actions/runs/123",
}));

const eventState = vi.hoisted(() => ({ event: {} }));
vi.mock("../../modules/workflowEvent.js", () => ({
    "default": () => eventState.event,
    readWorkflowEvent: () => eventState.event,
}));

vi.mock("../../modules/git.js", () => ({
    "default": { log: vi.fn() },
}));

const fetchState = vi.hoisted(() => ({ getResponse: null }));

const makeResponse = ({ ok = false, status = 429, statusText = "Too Many Requests", headers = {} }) => ({
    ok,
    status,
    statusText,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    text: () => Promise.resolve(""),
    json: () => Promise.resolve({ ok: true }),
});

// 用抛哨兵异常代替真实退出，使动态 import 以该异常 reject，退出码可从异常上断言
class ExitSentinel extends Error {
    constructor(code) {
        super(`process.exit(${code})`);
        this.exitCode = code;
    }
}

let exitSpy;
let setTimeoutSpy;

// 预热模块图：首个 import 走 vite 模块转换的真实 I/O，若发生在启用假定时器之后，
// I/O 回调会被假时钟饿死（首个用例挂死）。预热放在假定时器之前完成，
// 之后各用例 resetModules 重评估只剩微任务，advanceTimersByTimeAsync 才能推进
beforeAll(async () => {
    vi.spyOn(process, "exit").mockImplementation(() => {});
    vi.stubEnv("ANN_SERVER_SECRET_API_KEY", "test-key");
    vi.stubEnv("needs", JSON.stringify({ build: { result: "success" } }));
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(makeResponse({ ok: true, status: 200, statusText: "OK" }))));
    await import("../../fireWebhook/index.js").catch(() => {});
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    exitSpy = vi.spyOn(process, "exit").mockImplementation((code) => {
        throw new ExitSentinel(code);
    });
    vi.stubEnv("ANN_SERVER_SECRET_API_KEY", "test-key");
    vi.stubEnv("needs", JSON.stringify({ build: { result: "success" } }));
    eventState.event = { head_commit: { id: "a1b2c3d", message: "commit message" } };
    fetchState.getResponse = () => makeResponse({});
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(fetchState.getResponse())));
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    exitSpy.mockRestore();
    setTimeoutSpy.mockRestore();
    vi.useRealTimers();
});

// 失败路径驱动方式：启动 import（不 await）后小步循环推进假时钟直到脚本收尾。
// 不用单次大步 advance：首个用例的 import 涉及 vite 模块转换的真实 I/O，
// 一次 advance 的微任务引导可能等不到第一个定时器入队，逐轮推进可保证推进
const runScript = async () => {
    let settled = false;
    const importPromise = (async () => {
        try {
            await import("../../fireWebhook/index.js");
            return null;
        } catch (error) {
            return error;
        } finally {
            settled = true;
        }
    })();
    for (let i = 0; i < 200 && !settled; i++) {
        await vi.advanceTimersByTimeAsync(5000);
    }
    return importPromise;
};

describe("fireWebhook 重试退避", () => {
    it("数字型 Retry-After 按服务端要求延迟（2s）", async () => {
        fetchState.getResponse = () => makeResponse({ headers: { "retry-after": "2" } });
        const rejection = await runScript();
        expect(rejection).toBeInstanceOf(ExitSentinel);
        expect(rejection.exitCode).toBe(1);
        expect(fetch).toHaveBeenCalledTimes(10);
        const delays = setTimeoutSpy.mock.calls.filter(([, delay]) => delay >= 1000).map(([, delay]) => delay);
        expect(delays).toEqual(new Array(9).fill(2000));
    });

    it("超大数字型 Retry-After 封顶 60s，不被 setTimeout 的 32 位上限折叠成 1ms", async () => {
        // 3000000s = 3e9ms，超过 setTimeout 2^31-1ms 上限，Node 会折叠为 1ms 造成连打
        fetchState.getResponse = () => makeResponse({ headers: { "retry-after": "3000000" } });
        const rejection = await runScript();
        expect(rejection).toBeInstanceOf(ExitSentinel);
        expect(rejection.exitCode).toBe(1);
        const delays = setTimeoutSpy.mock.calls.filter(([, delay]) => delay >= 1000).map(([, delay]) => delay);
        expect(delays).toEqual(new Array(9).fill(60000));
    });

    it("HTTP 日期形式的 Retry-After 折算为延迟秒数（未超封顶时按折算值延迟）", async () => {
        // 每次取响应都按当前（假）时钟重算日期：写死的日期会在重试推进的时钟下过期，
        // 退化为指数退避；动态生成则每轮都折算出稳定的 30s
        fetchState.getResponse = () => makeResponse({ headers: { "retry-after": new Date(Date.now() + 30 * 1000).toUTCString() } });
        const rejection = await runScript();
        expect(rejection).toBeInstanceOf(ExitSentinel);
        expect(rejection.exitCode).toBe(1);
        const delays = setTimeoutSpy.mock.calls.filter(([, delay]) => delay >= 1000).map(([, delay]) => delay);
        expect(delays).toEqual(new Array(9).fill(30000));
    });

    it("缺失或非法 Retry-After 时落回指数退避（1s 起步、60s 封顶）", async () => {
        fetchState.getResponse = () => makeResponse({ headers: {} });
        const rejection = await runScript();
        expect(rejection).toBeInstanceOf(ExitSentinel);
        expect(rejection.exitCode).toBe(1);
        const delays = setTimeoutSpy.mock.calls.filter(([, delay]) => delay >= 1000).map(([, delay]) => delay);
        expect(delays).toEqual([1000, 2000, 4000, 8000, 16000, 32000, 60000, 60000, 60000]);
    });

    it("成功时以退出码 0 结束且不安排任何重试延迟", async () => {
        fetchState.getResponse = () => makeResponse({ ok: true, status: 200, statusText: "OK" });
        // 成功路径的 exit(0) 在 try 块内，抛哨兵会被脚本自身的 catch 吞掉，
        // 这里改为只记录调用，靠「无 setTimeout 调用」断言未进入重试
        exitSpy.mockImplementation(() => {});
        const rejection = await runScript();
        expect(rejection).toBeNull();
        expect(exitSpy.mock.calls[0][0]).toBe(0);
        expect(setTimeoutSpy).not.toHaveBeenCalled();
    });
});
