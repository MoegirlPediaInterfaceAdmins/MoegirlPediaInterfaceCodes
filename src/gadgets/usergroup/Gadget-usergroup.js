// <pre>
"use strict";
(async () => {
    await $.ready;
    const localObjectStorage = new LocalObjectStorage("usergroup", { expires: [30, "minutes"] });
    // 以下为需要获取的用户组的列表，按从前往后顺序排序
    // 每个数组第二个元素为颜色，可用关键字、rgba等，参见 [[MediaWiki:Gadget-usergroup.js/color]]
    const groups = [
        ["staff", "#198754"],
        ["bureaucrat", "#6610f2"],
        ["checkuser", "#673ab7"],
        ["suppress", "#9c27b0"],
        ["sysop", "#ec407a"],
        ["interface-admin", "#f55b42"],
        ["patroller", "#f77f38"],
        ["honoredmaintainer", "#febd45"],
        ["techeditor", "#3f51b5"],
        ["file-maintainer", "#039be5"],
        ["bot", "#1e88e5"],
        ["flood", "#1e88e5"],
        ["ipblock-exempt", "#29b6f6"],
        ["extendedconfirmed", "#57c2c3"],
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
    const blockLogFlags = [
        ...[
            "anononly",
            "nocreate",
            "noemail",
            "nousertalk",
            "hiddenname",
        ].map((k) => [k, `block-log-flags-${k}`]),
        ...[
            "autoblock",
        ].map((k) => [k, `apihelp-block-param-${k}`]),
    ];
    const { libLocalizedNamespaces, wgUserName } = mw.config.get(["libLocalizedNamespaces", "wgUserName"]);
    let cache;
    const api = new mw.Api();
    const eol = Symbol();
    const toLocalTimeZoneString = (date = new Date()) => `${date.getFullYear()}/${libPrefixNumber(date.getMonth() + 1)}/${libPrefixNumber(date.getDate())} ${libPrefixNumber(date.getHours())}:${libPrefixNumber(date.getMinutes())}:${libPrefixNumber(date.getSeconds())}.${libPrefixNumber(date.getMilliseconds(), 3)}`;
    let loadMessagesPromise = Promise.resolve(true);
    try {
        cache = localObjectStorage.getItem("cache");
        if (!cache || !cache.groups) {
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
                assertuser: wgUserName,
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
            groups: result,
        };
        localObjectStorage.setItem("cache", cache);
    }
    const blockCache = localObjectStorage.getItem("blockCache", {});
    const now = Date.now();
    for (const [username, { timestamp, isBlocked }] of Object.entries(blockCache)) {
        if (typeof username !== "string" || typeof timestamp !== "number" || typeof isBlocked !== "boolean" || now - timestamp > 30 * 60 * 1000) {
            Reflect.deleteProperty(blockCache, username);
        }
    }
    localObjectStorage.setItem("blockCache", blockCache);
    const usernameToGroups = new Map();
    for (const group of groupsKey) {
        for (const name of cache.groups[group]) {
            if (!usernameToGroups.has(name)) {
                usernameToGroups.set(name, []);
            }
            usernameToGroups.get(name).push(group);
        }
    }
    /**
     * @type { <E extends Element = HTMLElement>(selectors: string) => E[] }
     */
    const querySelectorAll = (selector) => [...document.querySelectorAll(selector)];
    const markBlocked = (ele, blockInfo) => {
        ele.classList.add("markBlockInfo");
        ele.classList.remove("unknownBlockInfo");
        if (blockInfo.isBlocked) {
            ele.style.textDecoration = blockInfo.isPartial ? "underline dotted" : "underline wavy";
            const sup = document.createElement("sup");
            sup.classList.add("detailedBlockInfo");
            sup.title = blockInfo.info;
            sup.textContent = blockInfo.isPartial ? "[限+]" : "[封+]";
            ele.after(sup);
        }
    };
    const hook = async () => {
        const unknownUsernames = new Set();
        const elements = querySelectorAll("a.mw-userlink:not(.markrights), .userlink > a:not(.markrights)");
        for (let _i = 0; _i < elements.length; _i++) {
            if (_i > 0 && _i % 50 === 0) {
                await scheduler.yield();
            }
            const ele = elements[_i];
            if (ele.closest(".navbox")) {
                continue;
            }
            ele.classList.add("markrights");
            const url = new URL(ele.href, location.origin);
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
            const userGroups = usernameToGroups.get(username);
            if (userGroups) {
                for (const group of userGroups) {
                    const sup = document.createElement("sup");
                    sup.classList.add(`markrights-${group}`);
                    ele.after(sup);
                }
            }
            if (!ele.classList.contains("markBlockInfo")) {
                const blockInfo = blockCache[username];
                if (blockInfo?.timestamp) {
                    markBlocked(ele, blockInfo);
                } else {
                    ele.classList.add("unknownBlockInfo");
                    unknownUsernames.add(username);
                }
            }
        }
        if (unknownUsernames.size > 0) {
            const messages = blockLogFlags.map(([_, msg]) => msg);
            loadMessagesPromise = api.loadMessagesIfMissing(messages);
            const hasApihighlimits = (await mw.user.getRights()).includes("apihighlimits");
            const singleRequestLimit = hasApihighlimits ? 500 : 50;
            const targets = [...unknownUsernames.values()];
            for (let i = 0, l = Math.ceil(targets.length / singleRequestLimit); i < l; i++) {
                let bkcontinue = undefined;
                const target = targets.slice(i * singleRequestLimit, (i + 1) * singleRequestLimit);
                const blockedUserName = new Set();
                const now = Date.now();
                while (bkcontinue !== eol) {
                    const _result = await api.post({
                        action: "query",
                        assertuser: wgUserName,
                        list: "blocks",
                        bkusers: target,
                        bklimit: "max",
                        bkprop: "id|user|by|timestamp|expiry|reason|flags|restrictions",
                        bkcontinue,
                    });
                    if (_result.continue) {
                        bkcontinue = _result.continue.bkcontinue;
                    } else {
                        bkcontinue = eol;
                    }
                    for (const blockInfo of _result.query.blocks) {
                        blockedUserName.add(blockInfo.user);
                        const isPartial = blockInfo.restrictions && Object.keys(blockInfo.restrictions).length > 0;
                        let info = `${blockInfo.id} - \n    被U:${blockInfo.by}${wgULS("封禁", "封鎖")}于${toLocalTimeZoneString(new Date(blockInfo.timestamp))}，`;
                        if (moment(blockInfo.expiry).isValid()) {
                            info += `${wgULS("持续", "持續")}至${toLocalTimeZoneString(new Date(blockInfo.expiry))}`;
                        } else {
                            info += wgULS("持续时间为无限期", "持續時間為不限期");
                        }
                        info += `\n    ${wgULS("封禁类型", "封鎖類型")}：${isPartial ? wgULS("部分封禁", "部分封鎖") : wgULS("全站封禁", "全站封鎖")}`;
                        if (blockInfo.restrictions) {
                            const restrictions = [];
                            if (blockInfo.restrictions.pages) {
                                blockInfo.restrictions.pages.forEach((pages) => {
                                    restrictions.push(`${wgULS("页面", "頁面")}：${pages.title}`);
                                });
                            }
                            if (blockInfo.restrictions.namespaces) {
                                blockInfo.restrictions.namespaces.forEach((ns) => {
                                    restrictions.push(`${wgULS("命名空间", "命名空間")}：${libLocalizedNamespaces[ns]}`);
                                });
                            }
                            if (restrictions.length > 0) {
                                info += `\n    ${wgULS("限制范围", "限制範圍")}：${restrictions.join("；")}`;
                            }
                        }
                        info += `\n    ${wgULS("额外限制", "額外限制")}：`;
                        if (!Reflect.has(blockInfo, "allowusertalk")) {
                            blockInfo.nousertalk = true;
                        }
                        const flags = [];
                        await loadMessagesPromise;
                        for (const [flag, commentKey] of blockLogFlags) {
                            if (Reflect.has(blockInfo, flag)) {
                                flags.push(mw.msg(commentKey));
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
                            isPartial,
                            info,
                        };
                    };
                }
                for (const username of target.filter((username) => !blockedUserName.has(username))) {
                    blockCache[username] = {
                        timestamp: now,
                        isBlocked: false,
                    };
                }
            }
            for (const ele of querySelectorAll(".unknownBlockInfo")) {
                const { username } = ele.dataset;
                const blockInfo = blockCache[username];
                if (blockInfo?.timestamp) {
                    markBlocked(ele, blockInfo);
                }
            }
            localObjectStorage.setItem("blockCache", blockCache);
        }
    };
    let currentHook = Promise.resolve();
    let hookPending = false;
    const guardedHook = () => {
        if (hookPending) {
            return;
        }
        hookPending = true;
        const prev = currentHook;
        currentHook = (async () => {
            await prev;
            hookPending = true;
            await hook();
            hookPending = false;
        })();
    };
    guardedHook();
    mw.hook("wikipage.content").add(guardedHook);
    mw.hook("anntools.usergroup").add(guardedHook);
    if (document.readyState !== "complete") {
        $(window).on("load", guardedHook);
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
