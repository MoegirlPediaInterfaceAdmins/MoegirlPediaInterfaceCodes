// 页面缓存域：URL 级内存缓存 + getPageWithCaching。行为基准 = legacy
// getpage.ts（commit 02c8dec）；pg.cache.pages 域状态改模块自持（purgePopups
// 经 clearPages 入口清空）。
import { log } from "../core/log.ts";
import { fakeDownload, startDownload, type DownloadOwner, type Downloader } from "./downloader.ts";

export interface CachedPage {
    url: string;
    data: string | undefined;
    lastModified: Date | string | null;
}

// legacy pg.cache.pages
export const pages: CachedPage[] = [];

// legacy pg.fn.purgePopups 内联的 pg.cache.pages = [] 等价入口（阶段 4 actions 调）
export const clearPages = (): void => {
    pages.length = 0;
};

const findInPageCache = (url: string): number => {
    for (let i = 0; i < pages.length; ++i) {
        if (url === pages[i].url) {
            return i;
        }
    }
    return -1;
};

const addPageToCache = (download: Downloader): void => {
    log(`addPageToCache ${download.url}`);
    pages.push({
        url: download.url,
        data: download.data,
        lastModified: download.lastModified,
    });
};

const getPage = (url: string, onComplete: (d: Downloader) => void | Promise<void>, owner: GetPageOwner): Downloader => {
    log("getPage");
    const callback = (d: Downloader): void => {
        if (!d.aborted) {
            addPageToCache(d);
            void onComplete(d);
        }
    };
    return startDownload(url, owner.idNumber, callback);
};

// 归属弹窗最小接口：中止集合 + 弹窗编号（缓存命中的 fakeDownload id 参数）
export type GetPageOwner = DownloadOwner & { idNumber?: number };

export const getPageWithCaching = (url: string, onComplete: (d: Downloader) => void | Promise<void>, owner: GetPageOwner): void => {
    log(`getPageWithCaching, url=${url}`);
    const i = findInPageCache(url);
    if (i > -1) {
        const page = pages[i];
        fakeDownload(url, owner.idNumber, onComplete, page.data, page.lastModified, owner);
        return;
    }
    const d = getPage(url, onComplete, owner);
    owner.downloads.add(d);
    d.owner = owner;
};
