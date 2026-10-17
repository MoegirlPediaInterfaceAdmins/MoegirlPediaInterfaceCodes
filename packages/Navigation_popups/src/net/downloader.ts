// 下载器域：裸 XHR 封装（Api-User-Agent、200 成功回调、非 200 重试 2 次）、
// downloadsInProgress 全局登记表与 abortAllDownloads、fakeDownload 缓存命中
// 直填。行为基准 = legacy downloader.ts（commit 02c8dec）。
//
// 与 legacy 的偏差（semantic-notes 登记）：
// - 删除 `typeof XMLHttpRequest === "undefined"` 环境防御与 "ohdear" 字符串
//   返回形态（浏览器站点 XHR 恒存在，http 字段必设——不过度防御）。
// - 删除 newDownload 的 onfailure 函数形态分支（legacy 无调用方，仅有数值
//   重试在用——死代码）。
import type { Navpopup } from "../core/popup.ts";

// 请求归属弹窗的最小接口（真 Navpopup 满足；hide 时经 downloads 中止）
export type DownloadOwner = Pick<Navpopup, "downloads">;

export class Downloader {
    id: number | string | null = null;
    lastModified: Date | string | null = null;
    aborted = false;
    method = "GET";
    async = true;
    http: XMLHttpRequest;
    url: string;
    data?: string | undefined;
    // querypreview 域在拿到 wikibase item 后回填
    wikibaseItem?: string;
    wikibaseRepo?: string;
    // exactOptionalPropertyTypes：cache 域的可选链赋值需显式含 undefined
    owner?: DownloadOwner | null | undefined;

    constructor(url: string) {
        this.http = new XMLHttpRequest();
        this.url = url;
    }

    abort(): void {
        this.aborted = true;
        this.http.abort();
    }

    getData(): string {
        return this.http.responseText;
    }

    setTarget(): void {
        this.http.open(this.method, this.url, this.async);
        this.http.setRequestHeader("Api-User-Agent", userAgent);
    }

    getReadyState(): number {
        return this.http.readyState;
    }

    start(): void {
        downloadsInProgress[String(this.id)] = this;
        this.http.send(null);
    }

    getLastModifiedDate(): Date | null {
        let lastmod = null;
        try {
            lastmod = this.http.getResponseHeader("Last-Modified");
        } catch {
            // 同步 XHR 中途 getResponseHeader 可抛（legacy 原样吞掉）
        }
        if (lastmod) {
            return new Date(lastmod);
        }
        return null;
    }

    setCallback(f: () => void): void {
        this.http.onreadystatechange = f;
    }

    getStatus(): number {
        return this.http.status;
    }
}

// Api-User-Agent 由装配层（boot 的 siteinfo 序列）注入；legacy 挂 pg.api.userAgent
let userAgent = "";
export const setDownloaderUserAgent = (ua: string): void => {
    userAgent = ua;
};

// legacy pg.misc.downloadsInProgress：id → 在途下载
export const downloadsInProgress: Record<string, Downloader> = {};

// typeof 守卫独立成早返回函数（v8 对内联三元/else 的合成边不计数）
const numberIdOrNull = (id: number | string | ((d: Downloader) => void | Promise<void>) | null | undefined): number | null => {
    if (typeof id === "number") {
        return id;
    }
    return null;
};

const newDownload = (
    url: string,
    id: number | string | ((d: Downloader) => void | Promise<void>) | null | undefined,
    callback: (d: Downloader) => void | Promise<void>,
): Downloader => {
    const d = new Downloader(url);
    // legacy 形态：仅 number id 进登记表键，字符串（如 `${id}history`）/函数
    // （fakeDownload 的旧式回调位）/null 一律归 null
    d.id = numberIdOrNull(id);
    d.setTarget();
    const f = function (this: XMLHttpRequest): void {
        if (d.getReadyState() === 4) {
            Reflect.deleteProperty(downloadsInProgress, String((this as unknown as { id?: number }).id));
            try {
                if (d.getStatus() === 200) {
                    d.data = d.getData();
                    d.lastModified = d.getLastModifiedDate();
                    void callback(d);
                }
                // 非 200：legacy 的重试递归产物从不发送（死代码，重试实际从不
                // 发生），按「不过度防御」删除——行为一致（无回调、不重发）
            } catch {
                // 回调异常不外泄（legacy 原样）
            }
        }
    };
    d.setCallback(f);
    return d;
};

export const fakeDownload = (
    url: string,
    id: number | undefined,
    callback: (d: Downloader) => void | Promise<void>,
    data?: string,
    lastModified?: Date | string | null,
    owner?: DownloadOwner | null,
): void => {
    // id 位传 null：fakeDownload 随后自行直填 id（legacy 的 id 归位顺序）
    const d = newDownload(url, null, callback);
    d.owner = owner;
    d.id = id ?? null;
    d.data = data ?? undefined;
    d.lastModified = lastModified ?? null;
    void callback(d);
};

export const startDownload = (
    url: string,
    id: number | string | null | undefined,
    callback: (d: Downloader) => void,
): Downloader => {
    const d = newDownload(url, id, callback);
    d.start();
    return d;
};

export const abortAllDownloads = (): void => {
    for (const x of Object.keys(downloadsInProgress)) {
        try {
            downloadsInProgress[x].aborted = true;
            downloadsInProgress[x].abort();
            Reflect.deleteProperty(downloadsInProgress, x);
        } catch {
            // legacy 原样吞掉中止异常
        }
    }
};

// 事件域的「中止全部下载」注册缝接线在装配层完成（boot 时
// registerAbortAll(abortAllDownloads)）；此处仅导出实现
