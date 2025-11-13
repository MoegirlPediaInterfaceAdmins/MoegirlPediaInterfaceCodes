// <pre>
"use strict";
$(() => (async () => {
    const diffDate = (_a, _b) => {
        const a = moment(_a);
        const b = moment(_b);
        const isBefore = b.isBefore(a);
        let diff = b.diff(a);
        if (isBefore) {
            diff *= -1;
        }
        let result = "";
        const units = [
            { label: "年", duration: 365 * 24 * 60 * 60 * 1000 },
            { label: "月", duration: 30 * 24 * 60 * 60 * 1000 },
            { label: "日", duration: 24 * 60 * 60 * 1000 },
            { label: "小时", duration: 60 * 60 * 1000 },
            { label: "分", duration: 60 * 1000 },
            { label: "秒", duration: 1000 },
        ];
        for (const unit of units) {
            if (diff >= unit.duration) {
                const value = Math.floor(diff / unit.duration);
                diff -= value * unit.duration;
                if (value > 0) {
                    result += `${value}${unit.label}`;
                }
            }
        }
        return result.replace(/(\d) /g, "$1").replace(/^(?:0\D+)+$/, "").replace(/(\D)(?:0\D+)+$/, "$1");
    };
    const autoRetryAsyncFunction = async (asyncFunction, retryTimes = 3) => {
        for (let i = retryTimes; i > 0; i--) {
            try {
                return await asyncFunction();
            } catch (e) {
                console.error(`autoRetryAsyncFunction [${retryTimes - i + 1}/${retryTimes}]`, e);
            }
        }
    };
    try {
        let wheeled = false;
        $(window).one("wheel", () => {
            wheeled = true;
            $("html, body").stop(true);
        });
        if (!mw.config.get("wgUserGroups").includes("sysop") && !mw.config.get("wgUserGroups").includes("patroller")) {
            return;
        }
        if (mw.config.get("wgArticleId") !== 38120) {
            return;
        }
        const container = $("#__anntools__inject__");
        if (!container.length) {
            return;
        }
        container.removeAttr("style").empty().html("<div id=\"Anntools-backlog-loading\" style=\"text-align: center;\"><hr>正在加载中……</a>").show();
        const now = moment();
        const nowYear = RegExp(`${new Date().getFullYear()}年`, "g");
        const users = new Set();
        const loghiddenMsg = "<i><b>（日志被隐藏）</b></i>";
        const userhiddenMsg = "<i><b>（用户名被隐藏）</b></i>";
        const userRights = await autoRetryAsyncFunction(async () => await mw.user.getRights());
        const hasSuppressionlogRight = userRights.includes("suppressionlog");
        const hasDeletelogentryRight = userRights.includes("deletelogentry");
        const wgUserName = mw.config.get("wgUserName");
        let scrollFlag = false;
        const api = new mw.Api();
        const blockLogResult = await autoRetryAsyncFunction(async () => await api.post({
            action: "query",
            assertuser: wgUserName,
            format: "json",
            list: "logevents",
            leprop: "ids|title|type|user|timestamp|details|parsedcomment|tags",
            letype: "block",
            leend: moment().subtract(7, "days").toISOString(),
            lelimit: "10",
            formatversion: 2,
        }));
        if (blockLogResult && blockLogResult.query && blockLogResult.query.logevents) {
            const blocklogevents = blockLogResult.query.logevents;
            container.append("<hr>");
            if (blocklogevents.length > 0) {
                const blocklogFlags = {
                    anononly: "仅封禁匿名用户",
                    nocreate: "阻止创建新账号",
                    autoblock: "自动封禁该用户最后使用的IP地址，以及其随后试图用于编辑的所有IP地址",
                    noemail: "阻止用户发送电子邮件",
                    nousertalk: "阻止用户在封禁期间编辑自己的讨论页",
                    hiddenname: "隐藏用户名",
                };
                const actions = {
                    block: "封禁",
                    reblock: "更改封禁",
                    unblock: "解封",
                };
                const lastBlockLogIdFromLocalStorage = +(localStorage.getItem("AnnTools-Backlog-lastBlockLogId") || "-1");
                let lastBlockLogIdFromBlockLogEvents = -1;
                const blocklogeventsContainerRoot = $("<div/>");
                container.append(blocklogeventsContainerRoot);
                blocklogeventsContainerRoot.addClass("blocklogevents");
                blocklogeventsContainerRoot.append('<div class="blocklogevents-table-caption">最近7天内最新10次封禁日志 [<a id="expand-blocklogevents">扩展/收缩列表</a>]</div>');
                const blocklogeventsContainer = $("<table/>");
                blocklogeventsContainer.addClass("wikitable blocklogevents-table");
                blocklogeventsContainer.html("<thead><tr><th>时间</th><th>执行者</th><th>目标</th><th>类型</th><th>结束时间</th><th>额外限制</th><th>备注</th><th>操作</th></tr></thead><tbody></tbody>");
                blocklogeventsContainerRoot.append(blocklogeventsContainer);
                $("#expand-blocklogevents").on("click", () => {
                    blocklogeventsContainerRoot.toggleClass("expand");
                });
                const blocklogeventTemplate = $("<tr/>");
                blocklogeventTemplate.html(`${"<td class=\"style-justify\"></td><td class=\"style-justify userColumn\"></td>"}${"<td class=\"style-justify\"></td>".repeat(3)}<td></td><td class="word-break-all"></td><td class="style-justify"></td>`);
                blocklogevents.forEach(({
                    logid,
                    action,
                    actionhidden,
                    suppressed,
                    title,
                    user,
                    timestamp,
                    tags,
                    parsedcomment,
                    params,
                    userhidden,
                }) => {
                    const {
                        duration: _duration,
                        expiry,
                        flags: _flags,
                    } = params || {};
                    const _loghidden = actionhidden || suppressed;
                    const loghidden = !hasSuppressionlogRight && _loghidden;
                    const _target = loghidden ? loghiddenMsg : title;
                    const flagsExist = Array.isArray(_flags);
                    const flags = loghidden ? [loghiddenMsg] : flagsExist ? _flags : ["noautoblock"];
                    if (_loghidden && hasSuppressionlogRight) {
                        flags.push(loghiddenMsg);
                    }
                    users.add(user);
                    let isIPAddressOrRange = false,
                        target = _target;
                    if (!loghidden) {
                        target = _target.replace(/^user:/i, "");
                        isIPAddressOrRange = mw.util.isIPAddress(target, true);
                        if (flags) {
                            const noautoblockIndex = flags.indexOf("noautoblock");
                            if (noautoblockIndex === -1) {
                                flags.push("autoblock");
                            } else {
                                flags.splice(noautoblockIndex, 1);
                            }
                        }
                    }
                    let endTime = loghidden ? loghiddenMsg : "-";
                    if (expiry) {
                        const expiryMoment = moment(expiry);
                        endTime = `<span title="${expiry}">${expiryMoment.format("YYYY[年]M[月]D[日 (]dd[)<br>]HH[:]mm[:]ss").replace(nowYear, "")}${now.diff(expiryMoment) > 0 ? "（已过期）" : ""}</span>`;
                    }
                    let duration;
                    if (_duration && !moment(_duration).isValid()) {
                        duration = "持续时间为";
                        if (/in(?:de)?finite|infinity|never/i.test(_duration)) {
                            duration += "无限期";
                        } else {
                            duration += diffDate(expiry, timestamp);
                        }
                        duration = `<span title="${_duration}">${duration}</span>`;
                        if (endTime !== "-") {
                            endTime = `${duration}<hr>${endTime}`;
                        } else {
                            endTime = duration;
                        }
                    }
                    const blocklogevent = blocklogeventTemplate.clone();
                    blocklogevent.attr("data-user", user);
                    const userString = `<a href="/User:${encodeURIComponent(user)}" class="mw-userlink" title="User:${user}"><bdi>${user}</bdi></a><br><span class="mw-usertoollinks">（<a href="/User_talk:${encodeURIComponent(user)}" class="mw-usertoollinks-talk" title="User talk:${user}">讨论</a> | <a href="/Special:%E7%94%A8%E6%88%B7%E8%B4%A1%E7%8C%AE/${encodeURIComponent(user)}" class="mw-usertoollinks-contribs" title="Special:用户贡献/${user}">贡献</a>）</span>`;
                    [
                        `<span title="${timestamp}">${moment(timestamp).format("YYYY[年]M[月]D[日 (]dd[)<br>]HH[:]mm[:]ss").replace(nowYear, "")}</span>`,
                        userhidden ? hasSuppressionlogRight ? `${userString}<hr>${userhiddenMsg}` : userhiddenMsg : userString,
                        isIPAddressOrRange || loghidden ? `<span title="${_target}">${target}</span>` : `<a href="/User:${encodeURIComponent(target)}" class="mw-userlink" title="${_target}"><bdi>${target}</bdi></a><br><span class="mw-usertoollinks">（<a href="/User_talk:${encodeURIComponent(target)}" class="mw-usertoollinks-talk" title="User talk:${target}">讨论</a> | <a href="/Special:%E7%94%A8%E6%88%B7%E8%B4%A1%E7%8C%AE/${encodeURIComponent(target)}" class="mw-usertoollinks-contribs" title="Special:用户贡献/${target}">贡献</a><span class="checkuser-show"> | <a href="/Special:用户查核/${encodeURIComponent(target)}" class="mw-usertoollinks-checkuser" title="Special:用户查核/${target}">查核</a></span>）</span>`,
                        actions[action] || action,
                        endTime,
                        flags ? flags.length > 0 ? `<ul class="blocklogevents-ul">${flags.map((f) => `<li class="blocklogevents-flags-${f}" ${blocklogFlags[f] ? "" : "style=\"font-style: italic;\""} title="${f}">${blocklogFlags[f] || f}</li>`).join("")}</ul>` : "（无）" : "-",
                        (parsedcomment || "（无）") + (tags.length ? `<br>（<a href="/Special:%E6%A0%87%E7%AD%BE" title="Special:标签">${tags.length}个标签</a>：${tags.join("、")}）` : ""),
                        (action === "unblock" ? "-" : loghidden ? loghiddenMsg : `<span class="mw-logevent-actionlink"><a href="/Special:%E8%A7%A3%E9%99%A4%E5%B0%81%E7%A6%81/${encodeURIComponent(target)}" title="Special:解除封禁/${target}">解封</a> | <a href="/Special:%E5%B0%81%E7%A6%81/${encodeURIComponent(target)}" title="Special:封禁/${target}">更改封禁</a></span>`) + (hasDeletelogentryRight ? `<hr style="margin: 2px 7px;"><a href="/index.php?action=historysubmit&type=logging&revisiondelete=1&ids%5B${encodeURIComponent(logid)}%5D=1" title="删除/还原版本">显示/隐藏选择的版本</a>` : ""),
                    ].forEach((data, index) => {
                        const cell = blocklogevent.children("td").eq(index);
                        cell.html(data);
                        if (["-", "（无）"].includes(data)) {
                            cell.addClass("style-justify");
                        }
                    });
                    if (lastBlockLogIdFromLocalStorage !== -1 && logid > lastBlockLogIdFromLocalStorage) {
                        blocklogevent.attr("data-new-log", "true").children().css("background-color", "#eef").attr("title", "上次查看后出现的新的封禁日志");
                    }
                    if (logid > lastBlockLogIdFromBlockLogEvents) {
                        lastBlockLogIdFromBlockLogEvents = logid;
                    }
                    blocklogeventsContainer.children("tbody").append(blocklogevent);
                });
                if (blocklogeventsContainer.find('[data-new-log="true"]').length === 0) {
                    blocklogeventsContainerRoot.addClass("nothing-new");
                    blocklogeventsContainer.find("caption").append("[自今日上次查看以来无新的记录]");
                }
                if (lastBlockLogIdFromBlockLogEvents > lastBlockLogIdFromLocalStorage) {
                    localStorage.setItem("AnnTools-Backlog-lastBlockLogId", `${lastBlockLogIdFromBlockLogEvents}`);
                }
                scrollFlag = true;
            } else {
                container.append("<div style=\"text-align: center;\">最近7天内无封禁记录=。=</div>");
            }
        }
        const abuseLogResult = await autoRetryAsyncFunction(async () => await api.post({
            action: "query",
            assertuser: wgUserName,
            format: "json",
            list: "abuselog",
            afllimit: "500",
            aflprop: "timestamp|user|action|filter|result|ids|title",
            formatversion: 2,
        }));
        if (abuseLogResult && abuseLogResult.query && abuseLogResult.query.abuselog) {
            const veryFirstAbuselogId = abuseLogResult.query.abuselog.slice(-1)[0].id;
            const abuseLogAcceptedFlags = ["block", "blockautopromote", "degroup"];
            const abuselogevents = abuseLogResult.query.abuselog.filter(({
                result: _result,
            }) => {
                let result = false;
                _result.split(/,\s*/).forEach((tag) => {
                    if (abuseLogAcceptedFlags.includes(tag)) {
                        result = true;
                    }
                });
                return result;
            }).slice(0, 10);
            container.append("<hr>");
            if (abuselogevents.length > 0) {
                const abuselogFlags = {
                    tag: "标签",
                    block: "<span style=\"color: red;\">封禁</span>",
                    blockautopromote: "<span style=\"font-weight: bold;\">撤销自动确认</span>",
                    warn: "警告",
                    degroup: "<span style=\"font-weight: bold;\">从用户组移除</span>",
                    disallow: "阻止该编辑",
                };
                const abuselogActions = {
                    edit: "编辑",
                };
                const lastAbuseLogIdFromLocalStorage = +(localStorage.getItem("AnnTools-Backlog-lastAbuseLogId") || "-1");
                let lastAbuseLogIdFromAbuseLogEvents = -1;
                const abuselogeventsContainerRoot = $("<div/>");
                container.append(abuselogeventsContainerRoot);
                abuselogeventsContainerRoot.addClass("abuselogevents");
                abuselogeventsContainerRoot.append(`<div class="abuselogevents-table-caption" title="第一条日志ID：${veryFirstAbuselogId}">最近500条滥用日志中最新10条带有“禁止自动授权、从用户组移除、封禁”中部分或全部设定的过滤器的日志 [<a id="expand-abuselogevents">扩展/收缩列表</a>]</div>`);
                const abuselogeventsContainer = $("<table/>");
                abuselogeventsContainer.addClass("wikitable abuselogevents-table");
                abuselogeventsContainer.html("<thead><tr><th>时间</th><th>用户</th><th>页面</th><th>操作</th><th>过滤器</th><th>过滤器描述</th><th>采取的行动</th><th>操作</th></tr></thead><tbody></tbody>");
                abuselogeventsContainerRoot.append(abuselogeventsContainer);
                $("#expand-abuselogevents").on("click", () => {
                    abuselogeventsContainerRoot.toggleClass("expand");
                });
                const abuselogeventTemplate = $("<tr/>");
                abuselogeventTemplate.html("<td class=\"style-justify\"></td>".repeat(8));
                /* let lastTimestamp = moment(aflend || 0); */
                abuselogevents.forEach(({
                    action: _action,
                    filter: description,
                    filter_id: filterID,
                    id,
                    result: _result,
                    timestamp,
                    title,
                    user,
                }) => {
                    /* const time = moment(timestamp);
                    if (time.diff(lastTimestamp) > 0) {
                        lastTimestamp = time;
                    } */
                    const action = abuselogActions[_action] || _action;
                    const result = _result.split(",").map((r) => abuselogFlags[r] || r);
                    const abuselogevent = abuselogeventTemplate.clone();
                    [
                        `<span title="${timestamp}">${moment(timestamp).format("YYYY[年]M[月]D[日 (]dd[) ]HH[:]mm[:]ss").replace(nowYear, "")}</span>`,
                        `<a href="/User:${encodeURIComponent(user)}" class="mw-userlink" title="User:${user}"><bdi>${user}</bdi></a><span class="mw-usertoollinks">（<a href="/User_talk:${encodeURIComponent(user)}" class="mw-usertoollinks-talk" title="User talk:${user}">讨论</a> | <a href="/Special:%E7%94%A8%E6%88%B7%E8%B4%A1%E7%8C%AE/${encodeURIComponent(user)}" class="mw-usertoollinks-contribs" title="Special:用户贡献/${user}">贡献</a><span class="checkuser-show"> | <a href="/Special:用户查核/${encodeURIComponent(user)}" class="mw-usertoollinks-checkuser" title="Special:用户查核/${user}">查核</a></span>）</span>`,
                        `<a href="/${encodeURIComponent(title)}" title="${title}">${title}</a>`,
                        `<span title="${_action}">${action}</span<`,
                        `<a href="/Special:%E6%BB%A5%E7%94%A8%E8%BF%87%E6%BB%A4%E5%99%A8/${encodeURIComponent(filterID)}" title="Special:滥用过滤器/${filterID}">过滤器${filterID}</a>`,
                        description,
                        `<span title="${_result}">${result.join("、")}</span>`,
                        `<a href="/Special:%E6%BB%A5%E7%94%A8%E6%97%A5%E5%BF%97/${encodeURIComponent(id)}" title="Special:滥用日志/${id}">详情</a> | <a href="/Special:%E6%BB%A5%E7%94%A8%E8%BF%87%E6%BB%A4%E5%99%A8/examine/log/${encodeURIComponent(id)}" title="Special:滥用过滤器/examine/log/${id}">检查</a>${_result.includes("block") ? ` | <span class="mw-logevent-actionlink"><a href="/Special:%E8%A7%A3%E9%99%A4%E5%B0%81%E7%A6%81/${encodeURIComponent(user)}" title="Special:解除封禁/${user}">解封</a> | <a href="/Special:%E5%B0%81%E7%A6%81/${encodeURIComponent(user)}" title="Special:封禁/${user}">更改封禁</a></span>` : ""}`,
                    ].forEach((data, index) => {
                        const cell = abuselogevent.children("td").eq(index);
                        cell.html(data);
                    });
                    if (lastAbuseLogIdFromLocalStorage !== -1 && id > lastAbuseLogIdFromLocalStorage) {
                        abuselogevent.attr("data-new-log", "true").children().css("background-color", "#eef").attr("title", "上次查看后出现的新的滥用日志");
                    }
                    if (id > lastAbuseLogIdFromAbuseLogEvents) {
                        lastAbuseLogIdFromAbuseLogEvents = id;
                    }
                    abuselogeventsContainer.children("tbody").append(abuselogevent);
                });
                if (abuselogeventsContainer.find('[data-new-log="true"]').length === 0) {
                    abuselogeventsContainerRoot.addClass("nothing-new");
                    abuselogeventsContainer.find("caption").append("[自今日上次查看以来无新的记录]");
                }
                if (lastAbuseLogIdFromAbuseLogEvents > lastAbuseLogIdFromLocalStorage) {
                    localStorage.setItem("AnnTools-Backlog-lastAbuseLogId", `${lastAbuseLogIdFromAbuseLogEvents}`);
                }
                scrollFlag = true;
                /* $("#abuselogevents-mark-as-readed").on("click", () => {
                    lastTimestamp.add(1000);
                    localStorage.setItem("AnnTools-aflend", lastTimestamp.toISOString());
                    $("#abuselogevents-mark-as-readed").replaceWith("<span>设置成功</span>");
                }); */
            } else {
                container.append("<div style=\"text-align: center;\">无新的滥用日志</div>");
            }
        }
        mw.hook("wikipage.content").fire(container);
        const sortIndex = ["zh.moegirl.org.cn", "commons.moegirl.org.cn", "en.moegirl.org.cn", "ja.moegirl.org.cn", "library.moegirl.org.cn"];
        const splitIndex = 2;
        const result = await Promise.all([{
            domain: "zh.moegirl.org.cn",
            cmtitle: "Category:即将删除的页面",
        }, {
            domain: "commons.moegirl.org.cn",
            cmtitle: "Category:即将删除的页面",
        }, {
            domain: "en.moegirl.org.cn",
            cmtitle: "Category:Pages_awaiting_deletion",
        }, {
            domain: "ja.moegirl.org.cn",
            cmtitle: "カテゴリ:削除依頼中のページ",
        }, {
            domain: "library.moegirl.org.cn",
            cmtitle: "Category:即将删除的页面",
        }].map(async ({ domain, cmtitle }) => {
            try {
                const api2 = domain === "zh.moegirl.org.cn" ? api : new mw.ForeignApi(`https://${domain}/api.php`);
                let count = 0;
                const eol = Symbol();
                let cmcontinue = undefined;
                const f = async () => await api2.get({
                    action: "query",
                    assertuser: wgUserName,
                    format: "json",
                    list: "categorymembers",
                    cmtitle,
                    cmprop: "ids",
                    cmtype: "page|subcat|file",
                    cmlimit: "max",
                    cmcontinue,
                });
                while (cmcontinue !== eol) {
                    const _result = await autoRetryAsyncFunction(f);
                    if (_result && _result.query) {
                        if (_result.continue) {
                            // eslint-disable-next-line require-atomic-updates
                            cmcontinue = _result.continue.cmcontinue;
                        } else {
                            // eslint-disable-next-line require-atomic-updates
                            cmcontinue = eol;
                        }
                        count += _result.query.categorymembers.length;
                    } else {
                        console.info(domain, cmtitle, _result);
                        count = -1;
                        // eslint-disable-next-line require-atomic-updates
                        cmcontinue = eol;
                    }
                }
                return { domain, cmtitle, count };
            } catch (error) {
                console.error(`Failed to fetch data from ${domain}:`, error);
                return { domain, cmtitle, count: -1 };
            }
        }));
        result.sort(({ domain: d1 }, { domain: d2 }) => sortIndex.indexOf(d1) - sortIndex.indexOf(d2));
        container.append("<hr>");
        const pageAwaitingDelectionContainerRoot = $("<div/>");
        container.append(pageAwaitingDelectionContainerRoot);
        pageAwaitingDelectionContainerRoot.addClass("pageAwaitingDelection");
        const pageAwaitingDelectionContainer = $("<div/>");
        pageAwaitingDelectionContainer.addClass("pageAwaitingDelection-table");
        pageAwaitingDelectionContainer.html('<div class="pageAwaitingDelection-caption">即将删除的页面统计</div><div class="br"></div>');
        pageAwaitingDelectionContainerRoot.append(pageAwaitingDelectionContainer);
        result.forEach(({ domain, cmtitle, count }, index) => {
            const self = $("<div/>");
            if (index === splitIndex) {
                pageAwaitingDelectionContainer.append('<div class="br"></div>');
            }
            pageAwaitingDelectionContainer.append(self);
            self.html(`<a href="https://${domain}/${encodeURIComponent(cmtitle)}" target="_blank" rel="nofollow noreferrer noopener" class="external text">${domain.match(/^[^.]+/)[0]}:${cmtitle}: ${count}页面</a>`);
            if (count > 0) {
                self.addClass("has-page");
            } else if (count === -1) {
                self.addClass("warning");
            }
        });
        if (scrollFlag && !wheeled) {
            $("html, body").animate({
                scrollTop: $("#mw-content-text").offset().top,
            }, 730);
        }
    } catch (reason) {
        console.error(reason);
        const errorInfoNode = $("<div>").css({
            border: "2px solid rgb(0, 0, 0)",
            margin: "14px 40px 10px",
            padding: "10px 15px",
            "background-color": "rgb(254, 237, 232)",
        });
        $("#__anntools__inject__").after(errorInfoNode);
        if (reason instanceof Error) {
            errorInfoNode.html(`<p>日志查核工具发生错误：</p><dl><dt>错误类型：</dt><dd>${$("<span/>").text(reason.name).html()}</dd><dt>错误信息：</dt><dd><pre>${$("<span/>").text(`${reason.toString()}\n${reason.stack.split("\n").slice(1).join("\n")}`).html()}</pre></dd></dl>`);
        } else {
            errorInfoNode.html(`<p>日志查核工具发生错误：</p><pre>${$("<span/>").text(JSON.stringify(reason, undefined, 4)).html()}</pre>`);
        }
    } finally {
        $("#Anntools-backlog-loading").remove();
        if (mw.config.exists("useravatar")) {
            mw.config.get("useravatar")();
            $(window).trigger("resize");
        }
        $(window).on({
            focus: () => {
                $(window).trigger("resize");
            },
            blur: () => {
                $(window).trigger("resize");
            },
        });
        setTimeout(() => {
            $(window).trigger("resize");
        }, 100);
    }
})());
// </pre>
