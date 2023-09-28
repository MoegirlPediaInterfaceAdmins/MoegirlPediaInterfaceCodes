// <pre>
"use strict";
(async () => {
    await $.ready;
    const localObjectStorage = new LocalObjectStorage("usergroup");
    // 以下为需要获取的用户组的列表，按从前往后顺序排序
    // 每个数组第二个元素为颜色，可用关键字、rgba等，参见 [[MediaWiki:Gadget-usergroup.js/color]]
    const groups = [
        ["staff", "#198754"],
        ["bureaucrat", "#6610f2"],
        ["checkuser", "#673ab7"],
        ["suppress", "#9c27b0"],
        ["sysop", "#ec407a"],
        ["interface-admin", "#f44336"],
        ["patroller", "#ff9800"],
        ["honoredmaintainer", "#fbd940"],
        ["techeditor", "#3f51b5"],
        ["file-maintainer", "#039be5"],
        ["bot", "#00acc1"],
        ["flood", "#00acc1"],
        ["ipblock-exempt", "#009688"],
        ["extendedconfirmed", "#2cd5c4"],
        ["manually-confirmed", "#009688"],
        ["goodeditor", "#1aa179"],
        ["special-contributor", "#595c5f"],
    ].reverse();
    // 以下为上方用户组需要显示的文字列表，每个用户组需至少指定`zh`一种语言变种用以fallback，
    // 语言变种名称请使用**全小写**
    const groupStr = {
        bureaucrat: {
            zh: "行",
        },
        checkuser: {
            zh: "查",
        },
        suppress: {
            zh: "监",
            "zh-hant": "監",
            "zh-tw": "監",
            "zh-hk": "監",
        },
        sysop: {
            zh: "管",
        },
        patroller: {
            zh: "维",
            "zh-hant": "維",
            "zh-tw": "維",
            "zh-hk": "維",
        },
        bot: {
            zh: "机",
            "zh-hant": "機",
            "zh-tw": "機",
            "zh-hk": "機",
        },
        flood: {
            zh: "机",
            "zh-hant": "機",
            "zh-tw": "機",
            "zh-hk": "機",
        },
        goodeditor: {
            zh: "优",
            "zh-hant": "優",
            "zh-tw": "優",
            "zh-hk": "優",
        },
        honoredmaintainer: {
            zh: "荣",
            "zh-hant": "榮",
            "zh-tw": "榮",
            "zh-hk": "榮",
        },
        "file-maintainer": {
            zh: "档",
            "zh-hant": "檔",
            "zh-tw": "檔",
            "zh-hk": "檔",
        },
        "interface-admin": {
            zh: "界",
            "zh-hant": "介",
            "zh-tw": "介",
            "zh-hk": "介",
        },
        techeditor: {
            zh: "技",
        },
        "ipblock-exempt": {
            zh: "免",
        },
        "manually-confirmed": {
            zh: "手",
        },
        extendedconfirmed: {
            zh: "延",
        },
        staff: {
            zh: "职",
            "zh-hant": "職",
            "zh-tw": "職",
            "zh-hk": "職",
        },
        "special-contributor": {
            zh: "特",
        },
    };
    const groupsKey = groups.map(([group]) => group);
    const blocklogFlags = Object.entries({
        anononly: wgULS("仅封禁匿名用户", "僅封鎖匿名使用者", null, null, "僅封鎖匿名用戶"),
        nocreate: wgULS("阻止创建新账号", "防止建立新帳號"),
        autoblock: wgULS("自动封禁该用户最后使用的IP地址，以及其随后试图用于编辑的所有IP地址", "自動封鎖最後使用的IP位址，以及在這之後嘗試登入的所有IP位址。"),
        noemail: wgULS("阻止用户发送电子邮件", "阻止使用者發送電子郵件", null, null, "阻止用戶發送電子郵件"),
        nousertalk: wgULS("阻止用户在封禁期间编辑自己的讨论页", "阻止使用者在封鎖期間編輯自己的對話頁", null, null, "阻止用戶在封鎖期間編輯自己的討論頁"),
        hiddenname: wgULS("隐藏用户名", "隱藏使用者名稱", null, null, "隱藏用戶名"),
    });
    let cache;
    const api = new mw.Api();
    const eol = Symbol();
    const fixZero = (n, l = 2) => `${n}`.padStart(l, "0");
    const toLocalTimeZoneString = (date = new Date()) => `${date.getFullYear()}/${fixZero(date.getMonth() + 1)}/${fixZero(date.getDate())} ${fixZero(date.getHours())}:${fixZero(date.getMinutes())}:${fixZero(date.getSeconds())}.${fixZero(date.getMilliseconds(), 3)}`;
    try {
        cache = await localObjectStorage.getItem("cache");
        if (!cache
            || typeof cache.timestamp !== "number" || cache.timestamp < new Date().getTime() - 30 * 60 * 1000
            || !cache.groups) {
            throw new Error();
        } else {
            for (const i of groupsKey) {
                if (!Array.isArray(cache.groups[i])) {
                    throw new Error();
                }
            }
        }
    } catch {
        const result = Object.fromEntries(groupsKey.map((n) => [n, []]));
        let aufrom = undefined;
        while (aufrom !== eol) {
            const _result = await api.post({
                action: "query",
                list: "allusers",
                augroup: groupsKey.join("|"),
                aulimit: "max",
                auprop: "groups",
                aufrom,
            });
            if (_result.continue) {
                aufrom = _result.continue.aufrom;
            } else {
                aufrom = eol;
            }
            _result.query.allusers.forEach(({
                name,
                groups,
            }) => {
                groups.forEach((group) => {
                    if (groupsKey.includes(group)) {
                        result[group] ||= [];
                        if (!result[group].includes(name)) {
                            result[group].push(name);
                        }
                    }
                });
            });
        }
        cache = {
            timestamp: new Date().getTime(),
            groups: result,
        };
    }
    await localObjectStorage.setItem("cache", cache);
    const blockCache = await localObjectStorage.getItem("blockCache", {});
    const now = Date.now();
    for (const [username, { timestamp, isBlocked }] of Object.entries(blockCache)) {
        if (typeof username !== "string" || typeof timestamp !== "number" || typeof isBlocked !== "boolean" || now - timestamp > 30 * 60 * 1000) {
            Reflect.deleteProperty(blockCache, username);
        }
    }
    await localObjectStorage.setItem("blockCache", blockCache);
    /**
     * @type { <E extends Element = HTMLElement>(selectors: string) => E[] }
     */
    const querySelectorAll = (selector) => [...document.querySelectorAll(selector)];
    const markBlocked = (ele, blockInfo) => {
        ele.classList.add("markBlockInfo");
        ele.classList.remove("unknownBlockInfo");
        if (blockInfo.isBlocked) {
            ele.style.textDecoration = "underline wavy";
            const sup = document.createElement("sup");
            sup.classList.add("detailedBlockInfo");
            sup.title = blockInfo.info;
            ele.after(sup);
        }
    };
    const hook = async () => {
        const unknownUsernames = new Set();
        for (const ele of querySelectorAll("a.mw-userlink:not(.markrights), .userlink > a:not(.markrights)")) {
            let parent = ele.parentElement;
            let inNavbox = false;
            while (parent) {
                if (parent.classList.contains("navbox")) {
                    inNavbox = true;
                    break;
                }
                parent = parent.parentElement;
            }
            if (inNavbox) {
                continue;
            }
            ele.classList.add("markrights");
            const url = new URL(new mw.Uri(ele.href));
            let username;
            const pathname = decodeURIComponent(url.pathname);
            const title = url.searchParams.get("title");
            if (/^\/User:[^/=%]+/.test(pathname)) {
                username = pathname.match(/^\/User:([^/=%]+)/)[1].replace(/_/g, " ");
            } else if (/^User:[^/=%]+/.test(title)) {
                username = title.match(/^User:([^/=%]+)/)[1].replace(/_/g, " ");
            }
            if (!username) {
                continue;
            }
            ele.dataset.username = username;
            for (const group of groupsKey) {
                if (cache.groups[group].includes(username)) {
                    const sup = document.createElement("sup");
                    sup.classList.add(`markrights-${group}`);
                    ele.after(sup);
                }
            }
            if (!ele.classList.contains("markBlockInfo")) {
                const blockInfo = blockCache[username];
                if (blockInfo && blockInfo.timestamp) {
                    markBlocked(ele, blockInfo);
                } else {
                    ele.classList.add("unknownBlockInfo");
                    unknownUsernames.add(username);
                }
            }
        }
        if (unknownUsernames.size > 0) {
            const has_apihighlimits = (await mw.user.getRights()).includes("apihighlimits");
            const singleRequestLimit = has_apihighlimits ? 500 : 50;
            const targets = [...unknownUsernames.values()];
            for (let i = 0, l = Math.ceil(targets.length / singleRequestLimit); i < l; i++) {
                let bkcontinue = undefined;
                const target = targets.slice(i * singleRequestLimit, (i + 1) * singleRequestLimit);
                const blockedUserName = [];
                const now = Date.now();
                while (bkcontinue !== eol) {
                    const _result = await api.post({
                        action: "query",
                        list: "blocks",
                        bkusers: target,
                        bklimit: "max",
                        bkprop: "id|user|by|timestamp|expiry|reason|flags",
                        bkcontinue,
                    });
                    if (_result.continue) {
                        bkcontinue = _result.continue.aufrom;
                    } else {
                        bkcontinue = eol;
                    }
                    _result.query.blocks.forEach((blockInfo) => {
                        blockedUserName.push(blockInfo.user);
                        let info = `${blockInfo.id} - \n    被U:${blockInfo.by}${wgULS("封禁", "封鎖")}于${toLocalTimeZoneString(new Date(blockInfo.timestamp))}，`;
                        if (moment(blockInfo.expiry).isValid()) {
                            info += `${wgULS("持续", "持續")}至${toLocalTimeZoneString(new Date(blockInfo.expiry))}`;
                        } else {
                            info += wgULS("持续时间为无限期", "持續時間為不限期");
                        }
                        info += `\n    ${wgULS("额外限制", "額外限制")}：`;
                        if (!Reflect.has(blockInfo, "allowusertalk")) {
                            blockInfo.nousertalk = true;
                        }
                        const flags = [];
                        for (const [flag, comment] of blocklogFlags) {
                            if (Reflect.has(blockInfo, flag)) {
                                flags.push(comment);
                            }
                        }
                        if (flags.length === 0) {
                            flags.push(wgULS("（无）", "（無）"));
                        }
                        info += flags.join("、");
                        info += `\n    ${wgULS("理由", "緣由")}：${blockInfo.reason}`;
                        blockCache[blockInfo.user] = {
                            timestamp: now,
                            isBlocked: true,
                            info,
                        };
                    });
                }
                for (const username of target.filter((username) => !blockedUserName.includes(username))) {
                    blockCache[username] = {
                        timestamp: now,
                        isBlocked: false,
                    };
                }
            }
            for (const ele of querySelectorAll(".unknownBlockInfo")) {
                const { username } = ele.dataset;
                const blockInfo = blockCache[username];
                if (blockInfo && blockInfo.timestamp) {
                    markBlocked(ele, blockInfo);
                }
            }
            await localObjectStorage.setItem("blockCache", blockCache);
        }
        for (const group of groupsKey) {
            for (const node of querySelectorAll(`.markrights-${group}`)) {
                let { nextElementSibling } = node;
                while (nextElementSibling && [...nextElementSibling.classList].filter((className) => className.startsWith("markrights-")).length > 0) {
                    const nextNextElementSibling = nextElementSibling.nextElementSibling;
                    if (nextElementSibling.classList.contains(`.markrights-${group}`)) {
                        nextElementSibling.remove();
                    }
                    nextElementSibling = nextNextElementSibling;
                }
            }
        }
    };
    hook();
    mw.hook("wikipage.content").add(hook);
    mw.hook("anntools.usergroup").add(hook);
    if (document.readyState !== "complete") {
        $(window).on("load", hook);
    }
    const style = ["sup[class^=markrights-]+sup[class^=markrights-] { margin-left: 2px; }"];
    for (const [group, color] of groups) {
        style.push(`.markrights-${group} { color: ${color}; }`);
    }
    for (const [group, strList] of Object.entries(groupStr)) {
        style.push(`html .markrights-${group}::after { content: "${strList.zh}"; }`);
        for (const [lang, str] of Object.entries(strList)) {
            style.push(`html[lang=${lang.toLowerCase()} i] .markrights-${group}::after { content: "${str}"; }`);
        }
    }
    mw.loader.addStyleTag(style.join("\n"));
})();
// </pre>
