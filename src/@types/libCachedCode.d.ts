declare module libCachedCode {
    export function getCachedCode(url: string): Promise<string>;

    export function getCachedCode(url: string): Promise<string>;

    export function injectCachedCode(url: string, _type: string): Promise<void>;

    export function batchInjectCachedCode(urls: string[], type: string): Promise<void>[];
}
