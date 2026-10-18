declare function wgUXS(
    wg: string,
    hans: string,
    hant?: string | null,
    cn?: string | null,
    tw?: string | null,
    hk?: string | null,
    sg?: string | null,
    zh?: string | null,
    mo?: string | null,
    my?: string | null,
): string;

declare const wgULS: typeof wgUXS extends (wg: string, ...rest: infer Rest) => infer ReturnType ? (...args: Rest) => ReturnType : never;

declare const wgUVS: typeof wgULS;

declare function libPrefixNumber(num: number | string, length?: number): string;

type pageNames = {
    /**
     * 讨论页名称，若无讨论页则为 false
     */
    talkPage: string | false;
    /**
     * 当前页面的基础名称（不含名字空间前缀），若当前页面无基础名称则为 false
     */
    basePageName: string | false;
};

/**
 * 获取当前页面的讨论页名称
 */
declare function libGetPageNames(): pageNames;

declare function wgGetEditRequestPreload(pageName?: string, basePageName?: string | false): string;
