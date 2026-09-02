"use strict";
(async () => {
    await $.ready;
    /**
     * @type { HTMLInputElement | null }
     */
    const wpReason = document.getElementsByName("wpReason")?.[0];
    if (!wpReason) {
        return;
    }
    const api = new mw.Api();
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
    const reason = root.querySelector(".mw-parser-output > .infoBox.will2Be2Deleted #reason");
    const actor = root.querySelector(".mw-parser-output > .infoBox.will2Be2Deleted #actor a");
    if (reason && actor) {
        wpReason.value = `删除被挂删的页面，[[User_talk:${actor.innerText}|${actor.innerText}]]的挂删理由：${reason.innerText}`;
    }
})();
