// mw.* 的可编程 mock：覆盖重写版用到的全部 MediaWiki API 面
// （docs/functional-spec.md §13）。installMw() 以 vi.stubGlobal 挂载，
// vitest 配置 unstubGlobals: true 保证测试文件间自动清理。
// 需要断言/编程响应的成员（api.get、message().text 等）均为 vi.fn，
// 其余（config.get、util.getParamValue）为真实语义的稳定实现。
import { vi, type Mock } from "vitest";

/** hook 成员的可调用 mock 形态（add/remove 登记与注销 handler，fire 逐个调用） */
export type MockHookMember = Mock<(...data: unknown[]) => unknown>;

export interface MockApiOptions {
    ajax?: { headers?: Record<string, string> };
}

export interface MockApi {
    get: ReturnType<typeof vi.fn>;
    postWithToken: ReturnType<typeof vi.fn>;
    loadMessagesIfMissing: ReturnType<typeof vi.fn>;
    /** 构造参数，供断言 Api-User-Agent 之类的头 */
    options: MockApiOptions;
}

export interface MockMessage {
    /** 透传构造参数，供用例断言 message(key, ...params) 的调用面 */
    key: string;
    params: unknown[];
    text: ReturnType<typeof vi.fn>;
    parseDom: ReturnType<typeof vi.fn>;
}

export interface MockHook {
    add: MockHookMember;
    fire: MockHookMember;
    remove: MockHookMember;
}

export interface MockMw {
    config: { get: (key: string) => unknown };
    util: {
        getParamValue: (key: string, url?: string) => string | null;
        escapeRegExp: (str: string) => string;
    };
    user: {
        options: { get: (key: string) => string | null };
        sessionId: () => string;
    };
    hook: (name: string) => MockHook;
    Api: new (options?: MockApiOptions) => MockApi;
    message: (key: string, ...params: unknown[]) => MockMessage;
    notify: ReturnType<typeof vi.fn>;
    loader: { load: ReturnType<typeof vi.fn>; using: ReturnType<typeof vi.fn> };
    Title: { newFromText: ReturnType<typeof vi.fn> };
    RegExp: { escape: (str: string) => string };
}

export interface InstallMwOptions {
    /** 覆盖默认的 mw.config.get 值（wgXxx） */
    config?: Record<string, unknown>;
    userOptions?: Record<string, string>;
    sessionId?: string;
}

// 默认站点形态对齐萌百（zh.moegirl.org.cn）；只放 src 代码真实读取的键，
// 个别键的本地化值可被用例覆盖（如 wgFormattedNamespaces）
const defaultConfig = (): Record<string, unknown> => ({
    wgArticlePath: "/$1",
    wgContentLanguage: "zh",
    wgDBname: "zh_moegirl",
    wgFormattedNamespaces: {
        "-1": "Special",
        0: "",
        1: "Talk",
        2: "User",
        3: "User talk",
        6: "File",
        10: "Template",
        14: "Category",
    },
    wgNamespaceIds: {
        special: -1,
        特殊: -1,
        file: 6,
        image: 6,
        文件: 6,
        档案: 6,
        template: 10,
        模板: 10,
        category: 14,
        分类: 14,
        user: 2,
        用户: 2,
    },
    wgPageName: "Main_Page",
    wgScript: "/index.php",
    wgScriptPath: "",
    wgServer: "https://zh.moegirl.org.cn",
    wgServerName: "zh.moegirl.org.cn",
    wgUserGroups: [] as string[],
    wgUserLanguage: "zh-cn",
    wgUserName: null as string | null,
});

export interface InstalledMw {
    mw: MockMw;
    /** mw.config.get 背后的数据表（可就地改值，立即生效） */
    config: Record<string, unknown>;
    /** 每个名字的 hook 实例（按需创建，可断言 add/fire） */
    hooks: Map<string, MockHook>;
    /** 全部 mw.Api 实例（构造即登记） */
    apiInstances: MockApi[];
    /** mw.message 工厂 */
    message: (key: string, ...params: unknown[]) => MockMessage;
}

export const installMw = (options: InstallMwOptions = {}): InstalledMw => {
    const config = { ...defaultConfig(), ...options.config };
    const userOptions: Record<string, string | null> = {
        timecorrection: null,
        date: "",
        ...options.userOptions,
    };
    const sessionId = options.sessionId ?? "mock-session-id";
    const hooks = new Map<string, MockHook>();
    const apiInstances: MockApi[] = [];

    const message = (key: string, ...params: unknown[]): MockMessage => ({
        key,
        params,
        // 默认返回键名本身（中性可断言）；用例可对单个返回值编程
        text: vi.fn(() => key),
        parseDom: vi.fn(() => key),
    });

    // 真实可编程的 Hook 形态：add 登记 handler、fire 逐个调用登记项（可反复
    // fire）、remove 注销。成员签名取 (...data: unknown[]) 而非 handler 形参，
    // 调用侧（fire($content) 传 JQuery、add(fn) 传函数）才都无需断言；
    // add/remove 运行时过滤出函数项。不用真实 MW 的「后注册者补放到上次 fire
    // 数据」记忆语义——本仓库只在 ready 装配期注册、之后 fire，该语义无用武之地。
    const getHook = (name: string): MockHook => {
        const existing = hooks.get(name);
        if (existing) {
            return existing;
        }
        const registered: ((...data: unknown[]) => unknown)[] = [];
        const handlers = (data: unknown[]): ((...data: unknown[]) => unknown)[] => data.filter((item): item is (...data: unknown[]) => unknown => typeof item === "function");
        const hook: MockHook = {
            add: vi.fn((...data: unknown[]) => {
                registered.push(...handlers(data));
            }),
            fire: vi.fn((...data: unknown[]) => {
                for (const fn of registered) {
                    fn(...data);
                }
            }),
            remove: vi.fn((...data: unknown[]) => {
                for (const fn of handlers(data)) {
                    const index = registered.indexOf(fn);
                    if (index >= 0) {
                        registered.splice(index, 1);
                    }
                }
            }),
        };
        hooks.set(name, hook);
        return hook;
    };

    class MockApi {
        get = vi.fn();
        postWithToken = vi.fn();
        loadMessagesIfMissing = vi.fn();
        options: MockApiOptions;

        constructor(constructorOptions?: MockApiOptions) {
            this.options = constructorOptions ?? {};
            apiInstances.push(this);
        }
    }

    const mw: MockMw = {
        config: {
            get: (key: string): unknown => config[key],
        },
        util: {
            getParamValue: (key: string, url?: string): string | null => {
                const search = (url ?? globalThis.location.href).split("?")[1] ?? "";
                for (const pair of search.split("&")) {
                    const [k, ...rest] = pair.split("=");
                    if (k === key) {
                        return rest.join("=");
                    }
                }
                return null;
            },
            escapeRegExp: (str: string): string => str.replace(/([\\{}()|.?*+\-^$[\]])/g, "\\$1"),
        },
        user: {
            options: { get: (key: string): string | null => userOptions[key] ?? null },
            sessionId: (): string => sessionId,
        },
        hook: getHook,
        Api: MockApi,
        message,
        notify: vi.fn(),
        loader: { load: vi.fn(), using: vi.fn() },
        Title: { newFromText: vi.fn() },
        RegExp: {
            escape: (str: string): string => str.replace(/([\\{}()|.?*+\-^$[\]])/g, "\\$1"),
        },
    };

    vi.stubGlobal("mw", mw);
    return { mw, config, hooks, apiInstances, message };
};
