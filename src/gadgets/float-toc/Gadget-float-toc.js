"use strict";
// <pre>
$(async () => {
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
    const key = `${mw.config.get("wgArticleId")}-${mw.config.get("wgCurRevisionId")}`;
    const localObjectStorage = new LocalObjectStorage("AnnTools-float-toc", { expires: [30, "days"] });
    // 清理旧版缓存格式
    localObjectStorage.removeItem("cache");
    // 移除同一页面的历史版本缓存
    const sameArticleId = {};
    for (const k of localObjectStorage.getAllKeys()) {
        if (!/^\d+-\d+$/.test(k)) {
            localObjectStorage.removeItem(k);
            continue;
        }
        const ids = k.match(/\d+/g);
        (sameArticleId[ids[0]] ||= []).push(ids[1]);
    }
    for (const aid of Object.keys(sameArticleId)) {
        const revisions = sameArticleId[aid];
        if (revisions.length < 2) {
            continue;
        }
        revisions.sort((a, b) => +b - +a);
        revisions.slice(1).forEach((cid) => localObjectStorage.removeItem(`${aid}-${cid}`));
    }
    const cachedSections = localObjectStorage.getItem(key);
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
    } else if (cachedSections !== null) { // 有缓存时，不再请求 API
        apiResult = {
            parse: {
                sections: cachedSections,
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
    const { sections } = apiResult.parse;
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
    localObjectStorage.setItem(key, apiResult.parse.sections);
});
// </pre>
