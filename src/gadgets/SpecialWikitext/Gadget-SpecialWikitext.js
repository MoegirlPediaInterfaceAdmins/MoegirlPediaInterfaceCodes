/* eslint-disable camelcase */
"use strict";
// <pre>
(async () => {
    if (mw.config.get("wgIsSpecialWikitextPreview")) {
        return;
    }
    mw.config.set("wgIsSpecialWikitextPreview", true);
    await $.ready;

    const getCleanText = (input) => typeof input === "string" || input ? `${input}`.trim() : "";

    /* 与[[Module:SpecialWikitext]]保持一致 */
    const wikiTextKey = "_addText";
    const lua_addText = (input_str, new_str, _escape) => {
        let input_string = input_str;
        if (new_str !== "") {
            if (input_string !== "") {
                input_string += "\n";
            }
            let text = new_str;
            if (_escape) {
                const escape_str = JSON.parse(`[${JSON.stringify(
                    `${new_str}`.replace(/\\([ux])/ig, "$1"),
                ).replace(/\\\\/g, "\\")}]`)[0];
                text = escape_str;
            }
            input_string += text;
        }
        return input_string;
    };
    const lua_getString = (str) => {
        let test_str = /[^\n]*\*\//.exec(str);
        if (test_str) {
            test_str = test_str[0] || "";
            test_str = test_str.substr(0, test_str.length - 2);
        } else {
            test_str = str;
        }
        const trim_check = getCleanText(test_str);
        const first_char = trim_check.charAt(0);
        if (first_char === trim_check.charAt(trim_check.length - 1) && (first_char === "'" || first_char === '"')) {
            return trim_check.substr(1, trim_check.length - 2);
        }
        return test_str;
    };
    const lua_getContentText = (str) => {
        let wikitext = "";
        try {
            str.replace(new RegExp(`${wikiTextKey}\\s*\\{[^c\\}]*content\\s*:\\s*[^\n]*`, "g"), (text) => {
                const temp_text = (/content\s*:\s*[^\n]*/.exec(text) || ["content:"])[0]
                    .replace(/^[\s\uFEFF\xA0\t\r\n\f ;}]+|[\s\uFEFF\xA0\t\r\n\f ;}]+$/g, "")
                    .replace(/\s*content\s*:\s*/, "");
                if (wikitext !== "") {
                    wikitext += "\n";
                }
                wikitext += lua_getString(temp_text);
                return text;
            });
        } catch {
            return "";
        }
        return wikitext;
    };
    const lua_getObjText = (str) => {
        let wikitext = "";
        try {
            str.replace(new RegExp(`${wikiTextKey}\\s*[\\=:]\\s*[^\n]*`, "g"), (text) => {
                const temp_text = text.replace(/^[\s\uFEFF\xA0\t\r\n\f ;}]+|[\s\uFEFF\xA0\t\r\n\f ;}]+$/g, "")
                    .replace(new RegExp(`${wikiTextKey}\\s*[\\=:]\\s*`), "");
                if (wikitext !== "") {
                    wikitext += "\n";
                }
                wikitext += lua_getString(temp_text);
                return text;
            });
        } catch {
            return "";
        }
        return wikitext;
    };
    const lua_getCSSwikitext = (input_string) => {
        let wikitext = "";
        const css_text = getCleanText(input_string || $("#wpTextbox1").val() || "");
        if (css_text === "") {
            return "";
        }
        wikitext = lua_addText(wikitext, lua_getContentText(css_text), true);
        wikitext = lua_addText(wikitext, lua_getObjText(css_text), true);
        return wikitext;
    };
    const lua_getJSwikitext = (input_string) => {
        let wikitext = "";
        const js_text = getCleanText(input_string || $("#wpTextbox1").val() || "");
        if (js_text === "") {
            return "";
        }
        wikitext = lua_addText(wikitext, lua_getObjText(js_text), true);
        return wikitext;
    };
    const lua_getJSONwikitext = (input_string) => {
        let wikitext = "";
        const json_text = getCleanText(input_string || $("#wpTextbox1").val() || "");
        if (json_text === "") {
            return "";
        }
        try {
            const json_data = JSON.parse(json_text);
            Object.keys(json_data).forEach((key) => {
                const k = key, v = json_data[key];
                if (new RegExp(wikiTextKey).exec(k) && typeof v === "string") {
                    wikitext = lua_addText(wikitext, v);
                }
                if (typeof v !== "string") {
                    for (const prop in v) {
                        if (Object.hasOwnProperty.bind(v)(prop)) {
                            const testArr_k = prop, testArr_v = v[prop];
                            if (new RegExp(wikiTextKey).exec(testArr_k) && typeof testArr_v === "string") {
                                wikitext = lua_addText(wikitext, testArr_v);
                            }
                        }
                    }
                }
            });
        } catch {
            return "";
        }
        return wikitext;
    };
    const lua_check = (input_string, content_model) => {
        const contentModel = `${content_model || mw.config.get("wgPageContentModel")}`.toLowerCase();
        switch (contentModel) {
            case "json":
                return lua_getJSONwikitext(input_string);
            case "js":
            case "javascript":
            case "text":
            case "wiki":
                return lua_getJSwikitext(input_string);
            case "css":
            case "sanitized-css":
                return lua_getCSSwikitext(input_string);
            default:
                return "";
        }
    };
    /* 与[[Module:SpecialWikitext]]保持一致 */

    const api = new mw.Api();
    const wgPageName = mw.config.get("wgPageName");
    const wgRevisionId = mw.config.get("wgRevisionId");
    const wgUserName = mw.config.get("wgUserName");
    const noticeHTML = {
        loading: `<div class="mw-_addText-preview-loading"><div class="quotebox" style="margin: auto; width: 50%; padding: 6px; border: 1px solid #aaa; font-size: 88%; background-color: #F9F9F9;"><div class="mw-_addText-preview-loading-content" style="background-color: #F9F9F9; color: black; text-align: center; font-size: larger;"><img src="https://storage.moegirl.org.cn/moegirl/commons/d/d1/Windows_10_loading.gif" decoding="async" data-file-width="64" data-file-height="64" style="width: 32px; height: 32px;"> ${wgULS("预览加载中...", "預覽載入中...")} </div></div></div>`,
        fail: `<img src="https://storage.moegirl.org.cn/moegirl/commons/5/5f/Ambox_warning_orange.svg" decoding="async" data-file-width="48" data-file-height="48" width="32" height="32">${wgULS("预览加载失败", "預覽載入失敗")}`,
    };
    const mwConfigIfMatchInLowerCase = (key, preferValues) => {
        const data = getCleanText(mw.config.get(key)).toLowerCase();
        if (!data) {
            return false;
        }
        return (Array.isArray(preferValues) ? preferValues : preferValues ? [preferValues] : []).includes(data);
    };
    const getLanguage = () => {
        const lang = mw.config.get("wgUserLanguage");
        if (lang.includes("zh")) {
            return mw.config.get("wgUserVariant");
        }
        return lang;
    };
    const loadingFailNotice = () => $(".mw-_addText-preview-loading-content").html(noticeHTML.fail);
    const removeLoadingNotice = () => $(".mw-_addText-preview-loading").empty();
    const addParsedWikitext = (html) => {
        const previewLoading = $(".mw-_addText-preview-loading");
        if (previewLoading.length > 0) {
            previewLoading.html(html);
            return;
        }
        const node = $(html);
        for (const selector of [".diff-currentversion-title", ".previewnote", ".mw-undelete-revision", "#mw-content-text"]) {
            const anchor = $(selector);
            if (anchor.length > 0) {
                anchor.after(node);
                return;
            }
        }
    };
    const addLoadingNotice = () => addParsedWikitext(noticeHTML.loading);
    const ifNeedPreview = () => document.body.innerHTML.includes("_addText");
    const mwAddWikiText = async (wikitext, pagename, isPreview) => {
        const text = getCleanText(wikitext);
        if (text.length === 0) {
            removeLoadingNotice();
            return;
        }
        const params = {
            action: "parse",
            assertuser: wgUserName,
            uselang: getLanguage(),
            useskin: mw.config.get("skin"),
            title: pagename,
            text,
            contentmodel: "wikitext",
            prop: "text",
            format: "json",
        };
        if (isPreview) {
            params.preview = true;
            params.disableeditsection = true;
        }
        try {
            const data = await api.post(params);
            const parsedWikitext = data?.parse?.text?.["*"];
            if (!parsedWikitext) {
                return;
            }
            const parsedHTML = getCleanText(parsedWikitext);
            if (parsedHTML !== "") {
                addParsedWikitext(parsedHTML);
            } else {
                removeLoadingNotice();
            }
        } catch (e) {
            console.error(e);
            loadingFailNotice();
        }
    };
    const mwAddLuaText = async (wikitext, isPreview, callback) => {
        const temp_module_name = "AddText/Temp/Module/Data.lua";
        const module_call = {
            wikitext: "#invoke:",
            pagename: "Module:",
        };
        const text = getCleanText(wikitext);
        if (text.length === 0) {
            removeLoadingNotice();
            return;
        }
        const params = {
            action: "parse",
            assertuser: wgUserName,
            uselang: getLanguage(),
            useskin: mw.config.get("skin"),
            format: "json",
            title: wgPageName,
            text: `{{${module_call.wikitext}${temp_module_name}|main}}`,
            prop: "text",
            contentmodel: "wikitext",
            templatesandboxtitle: module_call.pagename + temp_module_name,
            templatesandboxtext: `return {main=function()\nxpcall(function()\n${wikitext}\nend,function()end)\nlocal moduleWikitext = package.loaded["Module:ModuleWikitext"]\nif moduleWikitext then\nlocal wikitext = moduleWikitext.main()\nif mw.text.trim(wikitext)~=''then\nreturn mw.getCurrentFrame():preprocess(moduleWikitext.main())\nend\nend\nreturn ''\nend}`,
            templatesandboxcontentmodel: "Scribunto",
            templatesandboxcontentformat: "text/plain",
        };
        if (isPreview) {
            params.preview = true;
            params.disableeditsection = true;
        }
        try {
            const data = await api.post(params);
            const parsedWikitext = data?.parse?.text?.["*"];
            if (!parsedWikitext) {
                return;
            }
            const parsedHTML = getCleanText(parsedWikitext);
            if (parsedHTML !== "") {
                if (!$(parsedHTML).find(".scribunto-error").text().includes(temp_module_name)) {
                    if (typeof callback === "function") {
                        callback(parsedHTML);
                    } else {
                        addParsedWikitext(parsedHTML);
                    }
                } else {
                    removeLoadingNotice();
                }
            } else {
                removeLoadingNotice();
            }
        } catch (e) {
            console.error(e);
            loadingFailNotice();
        }
    };
    const mwGetFromNowRevision = async () => {
        try {
            const data = await api.post({
                action: "parse",
                assertuser: wgUserName,
                oldid: wgRevisionId,
                prop: "wikitext",
            });
            const parsedWikitext = data?.parse?.wikitext?.["*"];
            if (!parsedWikitext) {
                return;
            }
            const parsedHTML = lua_check(getCleanText(parsedWikitext));
            const pageContent = getCleanText(`${document.querySelector("#mw-clearyourcache") ? "{{#invoke:SpecialWikitext/Template|int|clearyourcache}}" : ""}${parsedHTML}`);
            if (pageContent) {
                mwAddWikiText(pageContent, wgPageName, true);
            } else {
                removeLoadingNotice();
            }
        } catch (e) {
            console.error(e);
            removeLoadingNotice();
        }
    };
    const mwApplyNotice = async (pagename, subPagename) => {
        try {
            const data = await api.post({
                action: "parse", // get the original wikitext content of a page
                assertuser: wgUserName,
                uselang: getLanguage(),
                useskin: mw.config.get("skin"),
                title: `${pagename}${subPagename}`,
                text: `${"{{#invoke:SpecialWikitext/Template|getNotices|"}${pagename}|${subPagename}}}`,
                prop: "text",
                format: "json",
            });
            const parsedWikitext = data?.parse?.text?.["*"];
            if (!parsedWikitext) {
                return;
            }
            const parsedHTML = getCleanText(parsedWikitext);
            if (getCleanText($(parsedHTML).text())) {
                addParsedWikitext(parsedHTML);
            }
        } catch (e) {
            console.error(e);
        }
    };
    (() => {
        if (mwConfigIfMatchInLowerCase("wgPageContentModel", ["javascript", "js", "json", "text", "css", "sanitized-css"])) {
            if (document.querySelector(".previewnote")) {
                const previewNode = $(".previewnote .mw-message-box-warning > p > b a");
                if (previewNode.length > 0) {
                    const path = decodeURI(previewNode.attr("href")).replace(/^\//, "");
                    if (path !== wgPageName) {
                        return;
                    }
                }
                const addWikitext = `${lua_check()}`;
                if (addWikitext) {
                    addLoadingNotice();
                    mwAddWikiText(addWikitext, wgPageName, true);
                }
            } else if (!document.querySelector(".mw-_addText-content") && mwConfigIfMatchInLowerCase("wgAction", "view")) {
                if (!ifNeedPreview()) {
                    return;
                }
                $("#mw-clearyourcache").empty();
                if (!document.querySelector("#wpTextbox1")) {
                    addLoadingNotice();// 放置提示，提示使用者等待AJAX
                    mwGetFromNowRevision();
                }
            } else if (document.querySelector("#mw-revision-info") && mwConfigIfMatchInLowerCase("wgAction", "view")) {
                if (!document.querySelector("#wpTextbox1")) {
                    $("#mw-clearyourcache").html(noticeHTML.loading);
                    mwGetFromNowRevision();
                }
            } else {
                removeLoadingNotice();
            }
        } else if (mwConfigIfMatchInLowerCase("wgPageContentModel", ["scribunto", "lua"])) {
            if (!ifNeedPreview()) {
                return;
            }
            if (document.querySelector("#wpTextbox1") && document.querySelector("table.diff") && !document.querySelector(".previewnote") && !mwConfigIfMatchInLowerCase("wgAction", "view")) {
                $("#wikiDiff").after(noticeHTML.loading);
                mwAddLuaText($("#wpTextbox1").val(), true);
            }
        } else if (document.querySelector(".mw-undelete-revision")) {
            if (!ifNeedPreview()) {
                return;
            }
            if (document.querySelector(".specialWikitextJSON, pre, .mw-json")) {
                const $tryGetWiki = $("textarea").val();
                const tryAddWiki = getCleanText(lua_getJSONwikitext($tryGetWiki)) || getCleanText(lua_getCSSwikitext($tryGetWiki));
                if (tryAddWiki) {
                    addLoadingNotice();
                    mwAddWikiText(tryAddWiki, mw.config.get("wgRelevantPageName"), true);
                } else if (/Module[_ ]wikitext.*_addText/i.exec($(".mw-parser-output").text())) {
                    // 预览失效时启用下方一行
                    // mwAddLuaText($tryGetWiki, mw.config.get("wgRelevantPageName"), true);
                }
            }
        } else if (!document.querySelector(".mw-editnotice") && mwConfigIfMatchInLowerCase("wgCanonicalNamespace", "special")) {
            const fullPagename = getCleanText(mw.config.get("wgCanonicalSpecialPageName"));
            const subPagename = fullPagename.replace(RegExp(`^${mw.config.get("wgCanonicalNamespace")}:[^/]+`), "");
            if (fullPagename) {
                const fullpagename = `${mw.config.get("wgCanonicalNamespace")}:${fullPagename}`;
                mwApplyNotice(fullpagename, subPagename);
            }
        } else {
            removeLoadingNotice();
        }
    })();
    (async () => {
        if (!ifNeedPreview()) {
            return;
        }
        const testcaseList = document.querySelectorAll(".special-wikitext-preview-testcase");
        if (testcaseList.length <= 0) {
            return;
        }
        const wikitextPackages = [];
        for (const testcaseNode of testcaseList) {
            const codeNode = testcaseNode.querySelector(".specialWikitextJSON, pre, .mw-json");
            if (!codeNode) {
                continue;
            }
            const lang = getCleanText(codeNode.getAttribute("lang")).toLowerCase();
            const code = getCleanText(codeNode.innerText);
            if (!code) {
                continue;
            }
            if (["javascript", "js", "css", "json", "wiki", "text"].includes(lang)) {
                const addWikitext = getCleanText(lua_check(code, lang));
                if (addWikitext) {
                    const i = `${wikitextPackages.length}`;
                    $(testcaseNode).attr("data-preview-id", i).prepend(noticeHTML.loading);
                    wikitextPackages.push(`<div class="special-wikitext-preview-testcase" data-preview-id="${i}">\n${addWikitext}\n</div>`);
                }
            } else if (["lua", "scribunto"].includes(lang)) {
                mwAddLuaText(code, true, (wikitext) => $(testcaseNode).prepend(wikitext));
            }
        }
        const wikitextPackage = getCleanText(wikitextPackages.join(""));
        if (!wikitextPackage) {
            return;
        }
        const wikitext = `<div class="special-wikitext-preview-testcase-container">${wikitextPackage}</div>`;
        const params = {
            action: "parse",
            assertuser: wgUserName,
            text: wikitext,
            contentmodel: "wikitext",
            prop: "text",
            format: "json",
            preview: true,
            disableeditsection: true,
        };
        try {
            const data = await api.post(params);
            const parsedWikitext = data?.parse?.text?.["*"];
            if (!parsedWikitext) {
                return;
            }
            const parsedHTML = getCleanText(parsedWikitext);
            if (!parsedHTML) {
                return;
            }
            const parsedNodes = $(parsedHTML);
            for (let i = 0; i <= wikitextPackages.length; i++) {
                $(`.special-wikitext-preview-testcase[data-preview-id=${i}]`).find(".mw-_addText-preview-loading").before(parsedNodes.find(`.special-wikitext-preview-testcase-container > .special-wikitext-preview-testcase[data-preview-id=${i}]`));
            }
            removeLoadingNotice();
        } catch (e) {
            console.error(e);
        }
    })();
})();
// </pre>
