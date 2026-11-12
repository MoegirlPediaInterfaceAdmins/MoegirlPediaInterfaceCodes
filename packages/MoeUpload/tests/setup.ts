// 单测在 Node 运行，没有站点页面的 mw 全局：提供与 Gadget 环境同形的最小桩，
// 避免纯逻辑模块在导入期读取 mw.config 时报错（产品代码不再做 mw 缺失判断）。

(globalThis as unknown as { mw: unknown }).mw = {
    config: {
        get: (_key: string, fallback?: unknown) => fallback,
    },
    util: {
        getUrl: (title: string): string => `/${encodeURIComponent(title)}`,
    },
};
