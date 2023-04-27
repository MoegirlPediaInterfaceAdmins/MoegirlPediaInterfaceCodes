"use strict";
(async () => {
    await $.ready;
    /**
     * @type { HTMLInputElement | null }
     */
    const wpReason = document.querySelector("#wpReason");
    if (mw.config.get("wgAction") !== "delete" || !wpReason) {
        return;
    }
    const api = new mw.Api();
    if (/(?:^内容|內容|被清空前|页面为空|頁面為空|page was empty|content was|content before blanking was)/i.test(wpReason.value)) {
        wpReason.value = "";
    }
    const html = (await api.post({
        action: "parse",
        pageid: mw.config.get("wgArticleId"),
        prop: "text",
        format: "json",
        formatversion: 2,
    }))?.parse?.text || null;
    if (!html) {
        return;
    }
    const parser = new DOMParser();
    const root = parser.parseFromString(html, "text/html");
    const reason = root.querySelectorAll(".mw-parser-output > .infoBox.will2Be2Deleted #reason");
    const actor = root.querySelectorAll(".mw-parser-output > .infoBox.will2Be2Deleted #actor a");
    if (reason.length === 1 && actor.length === 1) {
        wpReason.value = `删除被挂删的页面，[[User_talk:${actor[0].innerText}|${actor[0].innerText}]]的挂删理由：''${reason[0].innerText}''`;
    }
})();
