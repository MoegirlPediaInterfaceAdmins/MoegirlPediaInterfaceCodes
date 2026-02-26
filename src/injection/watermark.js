"use strict";
(async () => {
    const createElement = Document.prototype.createElement.bind(document);
    const getAttribute = Element.prototype.getAttribute;
    const setAttribute = Element.prototype.setAttribute;
    const cloneNode = Node.prototype.cloneNode;
    const appendChild = Node.prototype.appendChild.bind(document.body);
    const contains = Node.prototype.contains.bind(document.body);
    const getComputedStyle = window.getComputedStyle;

    /* 检查是否为维护组成员 */
    const wgUserGroups = mw.config.get("wgUserGroups");
    const wgNamespaceNumber = mw.config.get("wgNamespaceNumber");

    /* 水印 */
    // https://github.com/zloirock/core-js/blob/v3.29.1/packages/core-js/modules/es.unescape.js
    const hex2 = /^[\da-f]{2}$/i;
    const hex4 = /^[\da-f]{4}$/i;
    const unescapeString = (string) => {
        const str = `${string}`;
        let result = "";
        const length = str.length;
        let index = 0;
        let chr, part;
        while (index < length) {
            chr = str.charAt(index++);
            if (chr === "%") {
                if (str.charAt(index) === "u") {
                    part = str.slice(index + 1, index + 5);
                    if (hex4.exec(part)) {
                        result += String.fromCharCode(parseInt(part, 16));
                        index += 5;
                        continue;
                    }
                } else {
                    part = str.slice(index, index + 2);
                    if (hex2.exec(part)) {
                        result += String.fromCharCode(parseInt(part, 16));
                        index += 2;
                        continue;
                    }
                }
            }
            result += chr;
        }
        return result;
    };
    const watermark = (txt, size) => {
        const backgroundImageURL = `url("data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><foreignObject width="${size}" height="${size}"><html xmlns="http://www.w3.org/1999/xhtml" style="width: ${size}px; height: ${size}px;"><head></head><body style="width: ${size}px; height: ${size}px; margin: 0px;"><div style="width: 100% !important; height: 100% !important; opacity: .17 !important; font-size: 24px !important; position: relative !important; color: black !important;"><div style="transform: rotate(-15deg) translateX(-50%) translateY(-50%) !important; word-break: break-all !important; top: 36% !important; left: 50% !important; position: absolute !important; width: 100% !important; text-align: center !important;">${unescapeString(encodeURIComponent(txt))}</div></div></body></html></foreignObject></svg>`)}")`;
        const styleString = `position: fixed !important; z-index: 99999 !important; inset: 0px !important; background-image: ${backgroundImageURL} !important; background-repeat: repeat !important; pointer-events: none !important; display: block !important; visibility: visible !important; width: unset !important; height: unset !important; opacity: unset !important; background-color: unset !important;`;
        const template = createElement("div");
        setAttribute.bind(template)("style", styleString);
        /**
         * @type { typeof template }
         */
        let ele = appendChild(cloneNode.bind(template)(true));
        let recreateCount = 0;
        setInterval(() => {
            const reasons = [];
            if (!contains(ele)) {
                reasons.push("not in body");
            }
            const nowStyleString = getAttribute.bind(ele)("style");
            if (nowStyleString !== styleString) {
                reasons.push(`styleString not match: ${nowStyleString}`);
            }
            const style = getComputedStyle(ele);
            if (style.position !== "fixed") {
                reasons.push(`position not fixed: ${style.position}`);
            }
            if (style.zIndex !== "99999") {
                reasons.push(`z-index not 99999: ${style.zIndex}`);
            }
            if (style.inset !== "0px") {
                reasons.push(`inset not 0px: ${style.inset}`);
            }
            if (style.backgroundImage !== backgroundImageURL) {
                reasons.push(`background-image not match: ${style.backgroundImage}`);
            }
            if (style.backgroundRepeat !== "repeat") {
                reasons.push(`background-repeat not repeat: ${style.backgroundRepeat}`);
            }
            if (style.pointerEvents !== "none") {
                reasons.push(`pointer-events not none: ${style.pointerEvents}`);
            }
            if (style.display !== "block") {
                reasons.push(`display not block: ${style.display}`);
            }
            if (style.visibility !== "visible") {
                reasons.push(`visibility not visible: ${style.visibility}`);
            }
            if (reasons.length > 0) {
                console.info("[watermark] Recreate watermark:", reasons);
                try {
                    ele.remove();
                } finally {
                    ele = appendChild(cloneNode.bind(template)(true));
                    recreateCount++;
                    if (recreateCount > 20) {
                        recreateCount = 0;
                        alert("检测到水印被修改或移除超过20次，可能存在恶意脚本干扰水印显示，请检查浏览器插件或电脑安全状况！");
                    }
                }
            }
        }, 1000);
    };
    /* 获取特定命名空间前缀正则表达式 */
    const getNamespacePrefixRegex = (namespaceNumber) => RegExp(`^(?:${Object.entries(mw.config.get("wgNamespaceIds")).filter((config) => config[1] === namespaceNumber).map((config) => config[0].toLowerCase()).join("|")}):`, "i");
    // 水印
    const wgCurRevisionId = mw.config.get("wgCurRevisionId") || -1;
    const wgRevisionId = mw.config.get("wgRevisionId") || -1;
    if (!wgUserGroups.includes("autoconfirmed")) {
        if (wgCurRevisionId > 0 && wgRevisionId > 0 && wgCurRevisionId !== wgRevisionId) {
            watermark("历史版本，非最新内容<br/>不代表萌娘百科立场", 300);
        } else if ([2, 3].includes(wgNamespaceNumber)) {
            const wgPageName = mw.config.get("wgPageName");
            const namespacePrefixRegex = getNamespacePrefixRegex(wgNamespaceNumber);
            const displayedTitle = $("#firstHeading, #section_0").first().text().replace(/ /g, "_").replace(namespacePrefixRegex, "").trim();
            if (mw.config.get("wgAction") === "view" && mw.config.get("wgArticleId") > 0 && displayedTitle !== wgPageName.replace(/ /g, "_").replace(namespacePrefixRegex, "").trim()) {
                // await mw.loader.using(["mediawiki.api"]);
                const result = await new mw.Api().post({
                    action: "query",
                    prop: "info",
                    inprop: "varianttitles",
                    titles: wgPageName,
                });
                const matchTitles = Object.values(result.query.pages[mw.config.get("wgArticleId")].varianttitles).filter((title) => displayedTitle === title.replace(/ /g, "_").replace(namespacePrefixRegex, "").trim());
                if (matchTitles.length === 0) {
                    watermark("用户页面，非正式条目<br/>不代表萌娘百科立场", 300);
                }
            }
        }
    }
})();
