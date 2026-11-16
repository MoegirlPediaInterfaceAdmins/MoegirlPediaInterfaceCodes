import { vi } from "vitest";

const NAMESPACE_IDS = new Map<string, number>([
    ["category", 14],
    ["cat", 14],
    ["分类", 14],
    ["分類", 14],
    ["file", 6],
    ["image", 6],
    ["文件", 6],
    ["檔案", 6],
    ["template", 10],
    ["模板", 10],
]);

const INVALID_TITLE = /[[\]{}|<>#]/u;

const hasControlCharacter = (text: string): boolean => {
    for (const character of text) {
        const code = character.codePointAt(0) ?? 0;
        if (code < 0x20 || code === 0x7F) {
            return true;
        }
    }
    return false;
};

const namespaceName = (ns: number): string => {
    if (ns === 14) {
        return "Category";
    }
    if (ns === 6) {
        return "File";
    }
    if (ns === 10) {
        return "Template";
    }
    return "";
};

interface TitleStub {
    getNamespaceId(): number;
    getMainText(): string;
    getPrefixedText(): string;
}

const parseTitle = (raw: string, fallbackNamespace = 0): TitleStub | null => {
    const text = raw.trim();
    if (!text || INVALID_TITLE.test(text) || hasControlCharacter(text)) {
        return null;
    }
    let namespace = fallbackNamespace;
    let main = text;
    const match = /^([^:]+):(.*)$/u.exec(text);
    if (match) {
        const prefix = NAMESPACE_IDS.get(match[1].toLowerCase());
        if (prefix !== undefined) {
            namespace = prefix;
            main = match[2].trim();
        }
    }
    if (!main) {
        return null;
    }
    const normalized = `${main.charAt(0).toUpperCase()}${main.slice(1)}`;
    return {
        getNamespaceId: () => namespace,
        getMainText: () => normalized,
        getPrefixedText: () => namespace === 0 ? normalized : `${namespaceName(namespace)}:${normalized}`,
    };
};

interface MwStubOptions {
    groups?: string[];
    userName?: string;
    namespaceNumber?: number;
    specialPageName?: string | false;
    action?: string;
    title?: string;
    storage?: Record<string, string>;
}

const installMw = (options: MwStubOptions = {}) => {
    const storage = new Map(Object.entries(options.storage ?? {}));
    const configValues: Record<string, unknown> = {
        wgUserGroups: options.groups ?? [],
        wgUserName: options.userName ?? "TestUser",
        wgNamespaceNumber: options.namespaceNumber ?? 14,
        wgCanonicalSpecialPageName: options.specialPageName ?? false,
        wgAction: options.action ?? "view",
        wgTitle: options.title ?? "Test",
    };
    const mwStub = {
        config: {
            get: vi.fn((key: string) => configValues[key] ?? null),
        },
        storage: {
            get: vi.fn((key: string) => storage.get(key) ?? null),
            set: vi.fn((key: string, value: string) => {
                storage.set(key, value);
            }),
            remove: vi.fn((key: string) => {
                storage.delete(key);
            }),
        },
        notify: vi.fn(),
        log: {
            error: vi.fn(),
        },
        Title: {
            newFromText: vi.fn((text: string, namespace?: number) => parseTitle(text, namespace)),
        },
        util: {
            getParamValue: vi.fn(() => null),
        },
    };
    vi.stubGlobal("mw", mwStub);
    return { mw: mwStub, storage };
};

export type { TitleStub, MwStubOptions };
export { parseTitle, installMw };
