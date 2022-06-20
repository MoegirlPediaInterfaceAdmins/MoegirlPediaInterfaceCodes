// <pre>
"use strict";
$(() => (async () => {
    if (mw.config.get("wgNamespaceNumber") !== 14 || !mw.config.get("wgIsArticle") || !mw.config.get("wgUserGroups").includes("sysop")) { return; }
    let globalDeletionLock = false;
    const categories = {
        "zh.moegirl.org.cn": "即将删除的页面",
        "commons.moegirl.org.cn": "即将删除的页面",
        "en.moegirl.org.cn": "Pages awaiting deletion",
        "ja.moegirl.org.cn": "削除依頼中のページ",
        "library.moegirl.org.cn": "即将删除的页面",
    };
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    class Thread {
        array;
        callback;
        constructor(array, callback) {
            this.array = array;
            this.callback = callback;
        }
        async generateThread() {
            await sleep(Math.ceil(100 * Math.random()));
            while (this.array.length > 0) {
                const target = this.array.shift();
                if (!target) {
                    continue;
                }
                try {
                    await this.callback(target);
                } catch (e) {
                    console.error("Thread ignored Error:", e);
                }
            }
        }
        // temp throttle start
        // eslint-disable-next-line no-unused-vars
        generateThreads(length) {
            return Array.from({ length: 1 }, () => this.generateThread());
        }
        // temp throttle end
    }
    await mw.loader.using(["mediawiki.util", "mediawiki.api"]);
    // temp throttle start
    const postMethods = ["post", "postWithToken"];
    const api = new Proxy(new mw.Api(), {
        get(t, p) {
            if (postMethods.includes(p/*  as string */)) {
                return (...args) => sleep(200).then(() => t[p](...args));
            }
            return t[p];
        },
    });
    // temp throttle end
    const container = $(".mw-category-generated");
    const node = $("<p/>").attr("id", "deletionControl");
    const portletLink = $(mw.util.addPortletLink("p-cactions", "#", "批量删除本分类下页面", "startDeletion", "批量删除本分类下页面"));
    portletLink.attr("class", "sysop-show").on("click", () => {
        if ($("#deletionControl")[0] || globalDeletionLock) { return false; }
        container.before(node);
        node.text("请选择要删除的页面：").append('（已选：<span id="deletionSelectingNumber"> - </span>/总计：<span id="deletionTotalNumber"> - </span>）').append($("<input/>").attr({
            type: "button",
            value: "全选",
            id: "selectAll",
        })).append($("<input/>").attr({
            type: "button",
            value: "全不选",
            id: "selectNone",
        })).append($("<input/>").attr({
            type: "button",
            value: "提交",
            id: "runDeletion",
        })).append($("<input/>").attr({
            type: "button",
            value: "取消",
            id: "cancelDeletion",
        }));
        $("body").addClass("deletion");
        $(".mw-category-generated li").prepend($("<input/>").attr({
            type: "checkbox",
            "class": "selectBox",
        })).find(".stub").toggleClass("stub _stub");
        $("#deletionTotalNumber").text($(".mw-category-generated li :checkbox").length);
        $(".mw-category-generated li :checkbox").on("change", () => {
            $("#deletionSelectingNumber").text($(".mw-category-generated li :checkbox:checked").length);
        }).change();
        $(".mw-category-generated > div > p").each((_, ele) => {
            $("<input/>").attr({
                type: "button",
                value: "全选本类别页面",
                "class": "deletionControlButton",
            }).appendTo(ele).on("click", (_, ele) => {
                $(ele).closest(".mw-category-generated > div").find(":checkbox:not(:disabled)").prop("checked", "checked").first().change();
            });
            $("<input/>").attr({
                type: "button",
                value: "全不选本类别页面",
                "class": "deletionControlButton",
            }).appendTo(ele).on("click", (_, ele) => {
                $(ele).closest(".mw-category-generated > div").find(":checkbox:not(:disabled)").removeAttr("checked").first().change();
            });
        });
        return false;
    });
    const pages = [];
    const isThatCategory = mw.config.get("wgTitle") === categories[location.hostname];
    if (isThatCategory) {
        globalDeletionLock = true;
        portletLink.find("a").text("正在加载中……");
        const users = await (async () => {
            const result = [];
            const eol = Symbol();
            let aufrom = undefined;
            while (aufrom !== eol) {
                const _result = await api.post({
                    action: "query",
                    list: "allusers",
                    aurights: "rollback",
                    aulimit: "max",
                    aufrom,
                });
                if (_result.continue) {
                    aufrom = _result.continue.aufrom;
                } else {
                    aufrom = eol;
                }
                result.push(..._result.query.allusers.map(({ name }) => name));
            }
            return result;
        })();
        await Promise.all(new Thread(await (async () => {
            const result = [];
            const eol = Symbol();
            let cmcontinue = undefined;
            while (cmcontinue !== eol) {
                const _result = await api.post({
                    action: "query",
                    format: "json",
                    list: "categorymembers",
                    cmtitle: mw.config.get("wgPageName"),
                    cmprop: "ids|title",
                    cmtype: "page|subcat|file",
                    cmlimit: "max",
                    cmcontinue,
                });
                if (_result.continue) {
                    cmcontinue = _result.continue.cmcontinue;
                } else {
                    cmcontinue = eol;
                }
                result.push(..._result.query.categorymembers);
            }
            return result.filter(({ title }) => document.querySelector(`a[href="/${encodeURI(title)}"], a[href="/${mw.util.wikiUrlencode(title)}"]`));
        })(), async ({ title, pageid }) => {
            for (let retryTimes = 0; retryTimes < 3; retryTimes++) {
                try {
                    const renderedHTML = await $.get(`${mw.config.get("wgServer") + mw.config.get("wgScriptPath")}/index.php?action=render&title=${mw.util.rawurlencode(title)}&uselang=zh&_=${Math.random().toString().substring(2)}`);
                    const root = $("<div/>").html(renderedHTML);
                    const reason = root.find(".mw-parser-output > .infoBox.will2Be2Deleted #reason");
                    const actor = root.find(".mw-parser-output > .infoBox.will2Be2Deleted #actor a").first();
                    const link = $(`a[href="/${encodeURI(title)}"], a[href="/${mw.util.wikiUrlencode(title)}"]`);
                    if (reason.length === 1 && actor.length === 1) {
                        const data = await api.post({
                            action: "query",
                            rvprop: "user|content",
                            prop: "revisions",
                            titles: title,
                        });
                        const user = data.query.pages[pageid].revisions[0].user;
                        const isTrusted = user === actor.text() && users.includes(user);
                        pages.push({
                            title,
                            user,
                            isTrusted,
                            reason: reason.text(),
                        });
                        link.addClass("checked");
                        if (!isTrusted) {
                            link.after(`<a href="/${mw.util.wikiUrlencode(title)}" target="_blank" class="linksBlank external">${link.html()}</a>  禁止删除：该次挂删不可靠，请手动检查（${user !== actor.text() ? "最后编辑者与挂删人不符" : "最后编辑者没有巡查权限"}）`).remove();
                        } else {
                            link.after(`<div style="clear: both; float: none">挂删人：<a href="/User:${user}" class="mw-userlink bypass"><bdi>${user}</bdi></a></div><div style="clear: both; float: none">挂删理由：${reason.text()}</div>`);
                        }
                    } else {
                        pages.push({
                            title,
                            user: actor.text(),
                            isTrusted: false,
                            reason: reason.text(),
                        });
                        link.after(`<a href="/${mw.util.wikiUrlencode(title)}" target="_blank" class="linksBlank bypass external">${link.html()}</a>  禁止删除：该次挂删不可靠，请手动检查（挂删模板未给出理由或挂删人）`).remove();
                    }
                    return;
                } catch (e) {
                    console.error("Deletion.js", e);
                }
            }
            await oouiDialog.alert("出现错误，请刷新重试或联系维护人员！", {
                title: "批量删除分类下页面工具",
            });
        }).generateThreads(3));
        container.find("li a").not(".bypass, .disabled, .undelectable, .checked").each((_, _link) => {
            const link = $(_link);
            link.after(`<a href="${link.attr("href")}" target="_blank" class="linksBlank bypass external">${link.html()}</a>  禁止删除：该页面未被挂删`).remove();
        });
        globalDeletionLock = false;
        mw.hook("wikipage.content").fire($(".mw-userlink.bypass"));
        portletLink.find("a").text("批量删除本分类下页面");
    }
    $("body").on("click", async ({ target }) => {
        const self = $(target);
        if (self.is("#selectAll")) {
            container.find("li :checkbox:not(:disabled)").prop("checked", "checked").first().change();
        } else if (self.is("#selectNone")) {
            container.find("li :checkbox:not(:disabled)").removeAttr("checked").first().change();
        } else if (self.is("#cancelDeletion")) {
            if (globalDeletionLock) { return false; }
            $("#deletionControl, .deletionControlButton").remove();
            container.find("._stub").toggleClass("stub _stub");
            container.find(".selectBox").remove();
            $(".disabled").removeClass("disabled");
        } else if (self.is("#runDeletion")) {
            if (globalDeletionLock) { return false; }
            if (!await oouiDialog.confirm(`您确定要删除这些页面吗？（选中了${$(".mw-category-generated li :checkbox:checked").length}个页面）`, {
                title: "批量删除分类下页面工具",
            })) { return; }
            container.find(".deletionResult").remove();
            container.find(".selectBox").attr("disabled", "disabled");
            $("#deletionControl").append('<br><span id="result_text"><img src="https://img.moegirl.org.cn/common/d/d1/Windows_10_loading.gif" style="height: 1em; margin-top: -.25em;"><span id="deletionStatus"></span></span>');
            const statu = $("#deletionStatus");
            // eslint-disable-next-line require-atomic-updates
            globalDeletionLock = true;
            container.find("a:not(.bypass)").each((_, ele) => {
                const self = $(ele);
                if (/User:AnnAngela\/SandBox/.test(self.text()) || !self.closest("li").find(":checked")[0]) {
                    self.addClass("disabled");
                }
            });
            try {
                statu.text("正在删除，已完成删除的页面将会被删除线划去……");
                await Promise.all(new Thread(container.find("a").not(".bypass, .disabled, .undelectable").toArray(), async (ele) => {
                    const self = $(ele);
                    if (self.text().trim() === "") { return; }
                    self.css("margin-right", "2em");
                    const link = decodeURIComponent(self.attr("href").replace("/", "")).replace(/_/g, " ");
                    const page = pages.filter(({ title }) => title === link)[0];
                    try {
                        await api.postWithToken("csrf", {
                            action: "delete",
                            format: "json",
                            title: link,
                            tags: "Automation tool",
                            reason: `批量删除【${mw.config.get("wgPageName")}】下的页面${isThatCategory && page.isTrusted && page.reason && page.user ? `（[[User_talk:${page.user}|${page.user}]]的挂删理由：${page.reason} ）` : ""}`,
                        }, {
                            timeout: 99999,
                        });
                        self.css("text-decoration", "line-through").after('<span class="deletionResult"> 删除成功</span>');
                    } catch (e) {
                        self.after(`<span class="deletionResult">   删除失败：${e instanceof Error ? `${e} ${e.stack.split("\n")[1].trim()}` : JSON.stringify(e)}</span>`);
                    }
                }).generateThreads(3));
                $("#result_text").text("删除已完成！");
            } catch (e) {
                statu.text(`发生错误：${e instanceof Error ? `${e} ${e.stack.split("\n")[1].trim()}` : JSON.stringify(e)}`);
            }
        } else if (self.is("a") && globalDeletionLock) {
            window.open(self[0]/*  as HTMLLinkElement */.href, "_blank");
            return false;
        }
    });
})());
// </pre>