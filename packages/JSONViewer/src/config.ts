import type { JsonViewProps } from "react18-json-view";

/**
 * JSONViewer 配置存储：把 window 上的全局变量包装为可订阅的响应式来源。
 * 在 gadget 模块顶层为它们安装 getter/setter，并在安装前捕获已有值，
 * 使配置的读取不依赖 `user`（common.js）模块与 gadget 模块之间的执行顺序。
 */

/** 主题取值取自渲染库的 props 类型，避免手抄一份后与库的版本脱节 */
type Theme = NonNullable<JsonViewProps["theme"]>;

declare global {
    interface Window {
        jsonViewerTheme?: Theme;
        /** 强制启用暗色模式；不设置时跟随皮肤探测 */
        jsonViewerDark?: boolean;
    }
}

const DEFAULT_THEME = "vscode";

interface JSONViewerConfig {
    theme: Theme;
    /** 强制暗色；仅 true 生效，undefined 与 false 都由皮肤探测决定 */
    dark: boolean | undefined;
}

const listeners = new Set<() => void>();

/**
 * 当前配置快照：仅在安装或属性被写入时重算。
 * 引用稳定满足 useSyncExternalStore 对 getSnapshot 的要求（每次返回新对象会导致无限重渲染）。
 */
let snapshot: JSONViewerConfig = { theme: DEFAULT_THEME, dark: undefined };

const recompute = (): void => {
    snapshot = {
        theme: window.jsonViewerTheme ?? DEFAULT_THEME,
        dark: window.jsonViewerDark,
    };
};

const notify = (): void => {
    recompute();
    // 先复制再遍历：遍历期间新增的订阅者从下一次通知开始收到回调
    for (const listener of [...listeners]) {
        listener();
    }
};

/** 为某个 window 配置项安装响应式访问器；接管失败时该属性退化为普通属性 */
const installAccessor = (
    key: "jsonViewerTheme" | "jsonViewerDark",
    initial: unknown,
): void => {
    const descriptor = Reflect.getOwnPropertyDescriptor(window, key);
    // 属性已被他处定义为不可配置：无法接管，对该属性的赋值不会触发通知
    if (descriptor && !descriptor.configurable) {
        return;
    }
    let value = initial;
    Reflect.defineProperty(window, key, {
        configurable: true,
        enumerable: true,
        get: () => value,
        set: (next: unknown) => {
            if (next === value) {
                return;
            }
            value = next;
            notify();
        },
    });
};

let installed = false;

/** 在 gadget 模块顶层调用一次，尽早安装访问器 */
export const initConfigStore = (): void => {
    if (installed) {
        return;
    }
    installed = true;
    installAccessor("jsonViewerTheme", window.jsonViewerTheme);
    installAccessor("jsonViewerDark", window.jsonViewerDark);
    recompute();
};

export const getConfig = (): JSONViewerConfig => snapshot;

/** 订阅配置变化，返回取消订阅函数 */
export const subscribeConfig = (listener: () => void): () => void => {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
};
