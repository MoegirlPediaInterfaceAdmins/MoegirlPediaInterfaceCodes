"use strict";
// <pre>
$(async () => {
    if (![0, 1, 2, 3, 4, 5, 9, 11, 12, 13, 15, 275, 711, 829, 2301, 2303].includes(mw.config.get("wgNamespaceNumber"))) {
        return;
    }
    if ($("#mw-content-text .mw-headline").length <= 3) {
        return;
    }
    /**
     * @typedef  {object} section
     * @property {string} anchor 锚点
     * @property {number} byteoffset 章节起始点相对页面起始点偏移量
     * @property {string} fromtitle 章节来源页面
     * @property {string} index 章节编号
     * @property {string} level 标题级别
     * @property {string} line 章节标题
     * @property {string} number 章节前导序号
     * @property {string} toclevel 章节层级
     */
    /**
     * 验证缓存有效性
     * @param {*} _cache
     * @returns { { sections: section[], timestamp: number }[] }
     */
    const verifyCache = (_cache) => {
        let cache = JSON.parse(JSON.stringify(_cache));
        try {
            if (!$.isPlainObject(cache)) {
                cache = {};
            }
            const sameArticleId = {};
            Object.keys(cache).forEach((i) => {
                if (!/^\d+-\d+/.test(i) || !Array.isArray(cache[i])) {
                    Reflect.deleteProperty(cache, i);
                }
                if (Array.isArray(cache[i])) { // 处理旧版本缓存
                    cache[i] = {
                        sections: cache[i],
                        timestamp: -1,
                    };
                }
                const articleIdAndCurRevisionId = i.match(/\d+/g);
                (sameArticleId[articleIdAndCurRevisionId[0]] ||= []).push(articleIdAndCurRevisionId[1]);
            });
            Object.keys(sameArticleId).forEach((aid) => { // 移除同一页面的历史版本缓存
                const c = sameArticleId[aid];
                if (c.length < 2) {
                    return;
                }
                c.sort((a, b) => +b - +a);
                c.splice(0, 1);
                c.forEach((cid) => {
                    Reflect.deleteProperty(cache, `${aid}-${cid}`);
                });
            });
            const expired = Date.now() - 30 * 24 * 60 * 60 * 1000;
            cache = Object.fromEntries(
                Object.entries(cache)
                    .filter(({ timestamp }) => timestamp < expired) // 移除过期缓存
                    .sort(({ timestamp: a }, { timestamp: b }) => b - a).slice(0, 50), // 只保留最新 50 个页面
            );
        } catch (e) {
            console.info("AnnTools-float-toc", e);
            cache = {};
        }
        return cache;
    };
    const key = `${mw.config.get("wgArticleId")}-${mw.config.get("wgCurRevisionId")}`;
    const localObjectStorage = new LocalObjectStorage("AnnTools-float-toc");
    const cache = verifyCache(localObjectStorage.getItem("cache"));
    localObjectStorage.setItem("cache", cache);
    let hasTurstTOC, apiResult;
    if (
        document.querySelector("#toc > ul > li")
        && !(
            document.body.classList.contains("widgetTalkTocEnable")
            || document.getElementsByClassName("heading").length > 0 && document.getElementById("heading")
            || document.getElementById("tocBox")
            || document.getElementById("toc2TableSetting")
            || document.querySelector(".toclimit-2, .toclimit-3, .toclimit-4, .toclimit-5, .toclimit-6, .toclimit-7")
        )
    ) { // 当有可信的目录时，不再请求 API
        hasTurstTOC = true;
    } else if (mw.config.get("wgArticleId") <= 0 || mw.config.get("wgCurRevisionId") <= 0 || /action=(?!view)|(?:direction|diffonly)=/i.test(location.search) || mw.config.get("wgCurRevisionId") !== mw.config.get("wgRevisionId")) {
        // 当页面不存在、版本不存在、非阅读模式、不显示正文的差异页面、非当前版本时，不再请求 API
        return;
    } else if (Reflect.has(cache, key)) { // 有缓存时，不再请求 API
        apiResult = {
            parse: {
                sections: cache[key],
            },
        };
    } else {
        apiResult = await new mw.Api().post({
            action: "parse",
            format: "json",
            pageid: mw.config.get("wgArticleId"),
            prop: "sections",
        });
    }
    if (!hasTurstTOC && (!apiResult || !apiResult.parse || !Array.isArray(apiResult.parse.sections) || apiResult.parse.sections.length === 0)) {
        // 当无可信目录且无可信 API 结果时，退出
        return;
    }
    const root = $("<div/>");
    root.addClass("tocfloat").append('<div class="tocfloatlabel">显示目录</div>');
    const container = $("<div/>");
    container.attr("id", "NOTOC").addClass("tocfloatcontent mw-parser-output");
    $("body").append(root);
    root.append(container);
    container.prepend('<div class="toctitle" lang="zh-CN" dir="ltr"><h2>目录</h2></div>');
    if (hasTurstTOC) { // 当有可信目录时，直接克隆
        container.append($("#toc > ul").clone().removeAttr("class style"));
        return;
    }
    const sections = apiResult.parse.sections;
    let html = "",
        currentLevel = 0;
    const wgUserVariant = mw.config.get("wgUserVariant");
    const fallback = {
        "zh-cn": ["zh-hans"],
        "zh-tw": ["zh-hant", "zh-hk"],
        "zh-hk": ["zh-hant", "zh-tw"],
        "zh-hans": ["zh-cn"],
        "zh-hant": ["zh-hk", "zh-tw"],
        zh: ["zh-cn", "zh-hans", "zh-hk", "zh-tw", "zh-hant"],
    };
    const transcode = (_, i) => {
        const transtable = {};
        const transmark = i.match(/[^|:;]+:[^;]+/g);
        for (let j = 0, l = transmark.length; j < l; j++) {
            transmark[j] = transmark[j].split(":");
            transtable[transmark[j][0]] = transmark[j][1];
        }
        if (transtable[wgUserVariant]) {
            return transtable[wgUserVariant];
        }
        const fallbacklist = fallback[wgUserVariant];
        for (let k = 0, len = fallbacklist.length; k < len; k++) {
            if (transtable[fallbacklist[k]]) {
                return transtable[fallbacklist[k]];
            }
        }
        return "在手动语言转换规则中检测到错误"; // 此时转换插件会显示『在手动语言转换规则中检测到错误』
    };
    const sanity = $(document.createElement("span"));
    const sanityClean = (h) => {
        sanity.html(h);
        sanity.find("script, style, link, iframe, frame, object, param, audio, video, base, head, meta, title, body, h1, h2, h3, h4, h5, h6, blockquote, dd, dl, dir, dt, hr, li, ul, ol, pre, abbr, br, cite, data, tt, var, wbr, area, map, track, applet, embed, noembed, picture, source, canvas, noscript, caption, col, colgroup, table, tbody, thead, tfoot, td, th, tr, button, datalist, fieldset, form, input, label, legend, meter, optgroup, option, output, progress, select, textarea, details, dialog, menu, menuitem, summary, shadow, element, content, slot, template, bgsound, blink, center, command, frameset").remove();
        return sanity.html().replace(/-{([^|:;]*?)}-/g, "$1").replace(/-{(?:A\|)?([^|]+?:[^|]+?)}-/g, transcode);
    };
    const temp = document.createElement("div");
    sections.forEach((_a) => {
        const anchor = _a.anchor,
            index = _a.index,
            line = _a.line,
            number = _a.number,
            toclevel = _a.toclevel;
        if (toclevel > currentLevel) {
            while (toclevel > currentLevel) {
                currentLevel++;
                html += "<ul>";
            }
        } else if (toclevel < currentLevel) {
            while (toclevel < currentLevel) {
                currentLevel--;
                html += "</ul></li>";
            }
            html += "</li>";
        } else {
            html += "</li>";
        }
        const a = document.createElement("a");
        a.href = "#";
        a.href += anchor;
        a.innerHTML = `<span class="tocnumber">${number}</span> `;
        const toctext = document.createElement("span");
        toctext.innerHTML = sanityClean(line);
        a.appendChild(toctext);
        temp.innerHTML = "";
        temp.appendChild(a);
        html += `<li class="toclevel-${toclevel} tocsection-${index}">${a.outerHTML}`;
    });
    container.append(`${html}</li></ul>`);
    cache[key] = {
        sections: apiResult.parse.sections,
        timestamp: Date.now(),
    };
    localObjectStorage.setItem("cache", verifyCache(cache));
});
// </pre>
