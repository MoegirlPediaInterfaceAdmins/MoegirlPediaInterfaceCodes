// <pre>
"use strict";

(async () => {
    if (!["Recentchanges", "Watchlist", "Recentchangeslinked"].includes(mw.config.get("wgCanonicalSpecialPageName"))) {
        return;
    }

    const api = new mw.Api();

    /** 审核结果图标HTML */
    const modIcons = {
        0: '<i class="mod-icon" title="Pending"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" fill="#666" width="1em"><path d="M320 400c-75.85 0-137.25-58.71-142.9-133.11L72.2 185.82c-13.79 17.3-26.48 35.59-36.72 55.59a32.35 32.35 0 0 0 0 29.19C89.71 376.41 197.07 448 320 448c26.91 0 52.87-4 77.89-10.46L346 397.39a144.13 144.13 0 0 1-26 2.61zm313.82 58.1l-110.55-85.44a331.25 331.25 0 0 0 81.25-102.07 32.35 32.35 0 0 0 0-29.19C550.29 135.59 442.93 64 320 64a308.15 308.15 0 0 0-147.32 37.7L45.46 3.37A16 16 0 0 0 23 6.18L3.37 31.45A16 16 0 0 0 6.18 53.9l588.36 454.73a16 16 0 0 0 22.46-2.81l19.64-25.27a16 16 0 0 0-2.82-22.45zm-183.72-142l-39.3-30.38A94.75 94.75 0 0 0 416 256a94.76 94.76 0 0 0-121.31-92.21A47.65 47.65 0 0 1 304 192a46.64 46.64 0 0 1-1.54 10l-73.61-56.89A142.31 142.31 0 0 1 320 112a143.92 143.92 0 0 1 144 144c0 21.63-5.29 41.79-13.9 60.11z"></path></svg></i>',

        1: '<i class="mod-icon" title="Approved"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="#28a745" width="1em"><path d="M104 224H24c-13.3 0-24 10.7-24 24v240c0 13.3 10.7 24 24 24h80c13.3 0 24-10.7 24-24V248c0-13.3-10.7-24-24-24zM64 472c-13.3 0-24-10.7-24-24s10.7-24 24-24 24 10.7 24 24-10.7 24-24 24zM384 81.5c0 42.4-26 66.2-33.3 94.5h101.7c33.4 0 59.4 27.7 59.6 58.1 .1 17.9-7.5 37.2-19.4 49.2l-.1 .1c9.8 23.3 8.2 56-9.3 79.5 8.7 25.9-.1 57.7-16.4 74.8 4.3 17.6 2.2 32.6-6.1 44.6C440.2 511.6 389.6 512 346.8 512l-2.8 0c-48.3 0-87.8-17.6-119.6-31.7-16-7.1-36.8-15.9-52.7-16.2-6.5-.1-11.8-5.5-11.8-12v-213.8c0-3.2 1.3-6.3 3.6-8.5 39.6-39.1 56.6-80.6 89.1-113.1 14.8-14.8 20.2-37.2 25.4-58.9C282.5 39.3 291.8 0 312 0c24 0 72 8 72 81.5z"></path></svg></i>',

        2: '<i class="mod-icon" title="Rejected"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="#dc3545" width="1em"><path d="M0 56v240c0 13.3 10.7 24 24 24h80c13.3 0 24-10.7 24-24V56c0-13.3-10.7-24-24-24H24C10.7 32 0 42.7 0 56zm40 200c0-13.3 10.7-24 24-24s24 10.7 24 24-10.7 24-24 24-24-10.7-24-24zm272 256c-20.2 0-29.5-39.3-33.9-57.8-5.2-21.7-10.6-44.1-25.4-58.9-32.5-32.5-49.5-74-89.1-113.1a12 12 0 0 1 -3.6-8.5V59.9c0-6.5 5.2-11.9 11.8-12 15.8-.3 36.7-9.1 52.7-16.2C256.2 17.6 295.7 0 344 0h2.8c42.8 0 93.4 .4 113.8 29.7 8.4 12.1 10.4 27 6.1 44.6 16.3 17.1 25.1 48.9 16.4 74.8 17.5 23.4 19.1 56.1 9.3 79.5l.1 .1c11.9 11.9 19.5 31.3 19.4 49.2-.2 30.4-26.2 58.1-59.6 58.1H350.7C358 364.3 384 388.1 384 430.5 384 504 336 512 312 512z"></path></svg></i>',
    };
    modIcons[4] = modIcons[0];

    /** 最近更改行，暂时设置最大100避免请求过多导致WAF */
    const $changelistLines = $(".mw-changeslist-line[data-mw-revid]").slice(0, 150);

    /**
     * 按照修订版本列表读取审核状态
     * - `0`和`4`为未审核，`1`为审核通过，`2`为未通过
     * @param {(string | number)[]} revids 修订版本列表
     * @returns {{ revid: number, status: 0 | 1 | 2 | 4 }[]}
     */
    const queryModerationStatus = async (revids) => {
        const { query: { pages } } = await api.post({
            action: "query",
            format: "json",
            prop: "revisions",
            revids,
            rvprop: "ids",
        });
        return Object.values(pages)
            .map(({ revisions }) => revisions)
            .flat()
            .map(({ revid, moderation }) => ({ revid, status: moderation.status_code }));
    };

    /**
     * 将revid拆分为50个一组的二维数组
     * @param {number[]} revids
     * @returns {number[][]}
     */
    const sliceRevids = (revids) => {
        const result = [];
        for (let i = 0; i < revids.length; i += 50) {
            result.push(revids.slice(i, i + 50));
        }
        return result;
    };

    const promises = sliceRevids($changelistLines.map((_, ele) => ele.dataset.mwRevid).get())
        .map(queryModerationStatus);
    const res = (await Promise.all(promises)).flat();

    $changelistLines.each((_, ele) => {
        const status = res.find(({ revid }) => revid === +ele.dataset.mwRevid)?.status;
        if (status === undefined) {
            return;
        }
        if (ele.tagName === "TABLE") {
            $(ele).find(".mw-changeslist-line-inner").prepend(modIcons[status]);
        } else {
            $(ele).find(".mw-enhanced-rc-time").before($(modIcons[status]));
        }
    });
})();
// </pre>
