// <pre>
"use strict";
$(() => {
    const wgUserGroups = mw.config.get("wgUserGroups", []);
    if (!wgUserGroups.includes("sysop") && !wgUserGroups.includes("patroller")) {
        return;
    }
    mw.config.set({
        wgRollbacking: false,
        wgRollbackTool: "inited",
    });
    const possibleError = {
        alreadyrolled: wgULS("已被回退", "已被還原"),
        onlyauthor: wgULS("该页面只有一位编辑者参与编辑，无法回退", "該頁面只有一位編輯者參與編輯，無法還原"),
        missingparams: wgULS('必须要有参数"title"或参数"pageid"之一', '必須存在參數"title"或參數"pageid"之一'),
        notitle: wgULS('参数"title"必须被设置', '參數"title"必須被設置'),
        notoken: wgULS('参数"token"必须被设置', '參數"token"必須被設置'),
        nouser: wgULS('参数"user"必须被设置', '參數"user"必須被設置'),
    };
    const loop = (_, ele) => {
        const self = $(ele);
        if (self.data("href")) {
            return;
        }
        self.data("href", self.attr("href")).removeAttr("href") // 取消拖动链接回退
            .attr("title", `${ele.title}（启用自定义摘要）`).css("cursor", "pointer").append("<sup>+</sup>")
            .find("sup").on("click", (e) => e.stopPropagation());
        if ($(".ns-special")[0] && self.text().includes("10")) {
            self.parent().text(wgULS("[超过10次的编辑]", "[超過10次的編輯]")).attr("title", "超过10次的编辑请使用撤销功能，以便检查差异（自定义摘要小工具）");
        }
        ele.onmouseover = $.noop;
        ele.onmouseout = $.noop;
        ele.onmousedown = $.noop;
    };
    const exit = () => {
        const rbcount = $("#rbcount");
        let count = 3;
        setInterval(() => {
            if (--count === 0) {
                window.location.reload();
            }
            rbcount.text(count > 0 ? count : "0");
        }, 1000);
    };
    $(".mw-rollback-link a").each(loop);
    const api = new mw.Api();
    $(document.body).on("click", async (event) => {
        const target = event.target;
        if (!$(target).is(".mw-rollback-link a") || $(target).closest(".jquery-confirmable-button-no")[0]) {
            return true;
        }
        const self = $(target);
        const parent = self.parent();
        if (!self.data("href")) {
            loop(null, target);
        }
        if (!parent.find(self)[0]) {
            return false;
        }
        if (mw.config.get("wgRollbacking")) {
            return false;
        }
        const rollbackSummary = await oouiDialog.prompt(`<ul><li>${wgULS("回退操作的编辑摘要", "還原操作的編輯摘要")}：<code>xxx//Rollback</code></li><li>${wgULS("空白则使用默认回退摘要", "留空則使用默認的還原摘要")}，${wgULS("取消则不进行回退", "取消則不進行還原")}</li></ul><hr>${wgULS("请输入回退摘要", "請輸入還原摘要")}：`, {
            title: "回退小工具",
            size: "medium",
            required: false,
        });
        if (rollbackSummary !== null) {
            const url = new URL(self.data("href"), location.origin);
            self.replaceWith(`<span id="rbing"><img src="https://storage.moegirl.org.cn/moegirl/commons/d/d1/Windows_10_loading.gif" style="height: 1em; margin-top: -.25em;">${wgULS("正在回退中", "正在還原")}……</span>`);
            const rbing = $("#rbing");
            $(".mw-rollback-link a").not(rbing).css({
                color: "#aaa",
                "text-decoration": "none",
            });
            mw.config.set("wgRollbacking", true);
            const summary = rollbackSummary ? `${rollbackSummary} //Rollback` : "//Rollback";
            if (url.searchParams.has("from")) {
                try {
                    await api.post({
                        action: "rollback",
                        assertuser: mw.config.get("wgUserName"),
                        title: url.searchParams.get("title"),
                        user: url.searchParams.get("from"),
                        summary,
                        token: url.searchParams.get("token"),
                        format: "json",
                    });
                    rbing.css("color", "green").html(`成功！${wgULS("将在", "將在")}<span id="rbcount">3</span>秒${wgULS("内刷新", "內重新整理")}`);
                } catch (e) {
                    const errorText = e instanceof Error ? `${e} ${e.stack.split("\n")[1].trim()}` : $.isPlainObject(e) ? JSON.stringify(e) : typeof e === "string" && Reflect.has(possibleError, e) ? possibleError[e] : `${e}`;
                    rbing.css("color", "red").html(`${wgULS("错误", "錯誤")}：${errorText}。${wgULS("将在", "將在")}<span id="rbcount">3</span>${wgULS("秒内刷新", "秒內重新整理")}`);
                } finally {
                    exit();
                }
            } else {
                url.searchParams.set("summary", summary);
                window.open(url, "_self");
            }
        }
        return false;
    });
    new Image().src = "https://storage.moegirl.org.cn/moegirl/commons/d/d1/Windows_10_loading.gif";
    const changesList = document.querySelector(".mw-changeslist");
    if (changesList) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) {
                        return;
                    }
                    const $rollbackLinks = $(node).find(".mw-rollback-link a:not([data-href])").addBack(".mw-rollback-link a:not([data-href])");
                    $rollbackLinks.each(loop);
                });
            });
        });
        observer.observe(changesList, { childList: true });
    }
});
// </pre>
