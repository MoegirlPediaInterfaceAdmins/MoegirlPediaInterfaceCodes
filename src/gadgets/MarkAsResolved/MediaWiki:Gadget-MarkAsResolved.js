// <pre>
"use strict";
(async () => {
    const wgUserGroups = mw.config.get("wgUserGroups");
    if (!/^萌娘百科_talk:讨论版\/[^/]+$/.test(mw.config.get("wgPageName"))) { return; }
    if (!wgUserGroups.includes("sysop") && !wgUserGroups.includes("patroller")) { return; }
    // mw.loader.load(`${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/User:AnnAngela/js/quick-save.js/style.css?action=raw&ctype=text/css`, "text/css");
    let runningFlag = false;
    const container = $("<div class=\"AnnTools_Frame\" style=\"display: none;\"><div class=\"AnnTools_Frame_Head\"><div class=\"AnnTools_Frame_Title\">公共讨论页段落状态标记工具</div><span class=\"AnnTools_Frame_Close\">×</span></div><div class=\"AnnTools_Frame_Content\"><div class=\"AnnTools_Confirm\" id=\"AnnTools_Confirm_First\"><div class=\"AnnTools_Confirm_Content\">请问你是要标记这个段落吗？<br>段落标题：<span class=\"AnnTools_SectionTitle\"></span></div><div class=\"AnnTools_Confirm_Yes\">是呀是呀</div><div class=\"AnnTools_Confirm_No\">并不是呢</div></div><div class=\"AnnTools_Confirm AnnTools_Confirm_expand\" id=\"AnnTools_Confirm_Second\"><div class=\"AnnTools_Confirm_Content\">请问你想标记这个段落为什么状态？<br>段落标题：<span class=\"AnnTools_SectionTitle\"></span><dl><dt>状态：</dt><dd><ul class=\"AnnTools_form\" style=\"column-width: 12em;\"><li><input class=\"AnnTools_radio\" value=\"r\" id=\"AnnTools_radio_r\" type=\"radio\" checked=\"checked\"><label for=\"AnnTools_radio_r\">问题已解决</label></li><li><input class=\"AnnTools_radio\" value=\"p\" id=\"AnnTools_radio_p\" type=\"radio\"><label for=\"AnnTools_radio_p\">问题已答复</label></li><li><input class=\"AnnTools_radio\" value=\"a\" id=\"AnnTools_radio_a\" type=\"radio\"><label for=\"AnnTools_radio_a\">请求已接受</label></li><li><input class=\"AnnTools_radio\" value=\"s\" id=\"AnnTools_radio_s\" type=\"radio\"><label for=\"AnnTools_radio_s\">请求被暂缓</label></li><li><input class=\"AnnTools_radio\" value=\"w\" id=\"AnnTools_radio_w\" type=\"radio\" ><label for=\"AnnTools_radio_w\">请求被撤回</label></li><li><input class=\"AnnTools_radio\" value=\"d\" id=\"AnnTools_radio_d\" type=\"radio\"><label for=\"AnnTools_radio_d\">请求被拒绝</label></li><li><input class=\"AnnTools_radio\" value=\"n\" id=\"AnnTools_radio_n\" type=\"radio\"><label for=\"AnnTools_radio_n\">无人回复<s>（点名批评）</s></label></li></ul></dd><dt>存档用时：</dt><dd><input id=\"AnnTools_archive_offset\" type=\"number\" min=\"1\" max=\"30\" step=\"1\" list=\"AnnTools_archive_offset_datalist\"><datalist id=\"AnnTools_archive_offset_datalist\"><option value=\"1\"><option value=\"3\"><option value=\"10\"><option value=\"12450\"><option value=\"114514\"></datalist></dd><dt>前置留言：</dt><dd><input id=\"AnnTools_precomment\" type=\"text\" size=\"255\" placeholder=\"（但是如果不写就啥也没有）\"></dd><dt>留言：</dt><dd><input id=\"AnnTools_comment\" type=\"text\" size=\"255\" placeholder=\"（但是如果不写就啥也没有）\"></dd></dl></div><div class=\"AnnTools_Confirm_Yes\">就是这样</div><div class=\"AnnTools_Confirm_No\">我再想想</div><div class=\"AnnTools_status\"></div></div></div></div>").appendTo("body");
    const api = new mw.Api();
    // container.find("#AnnTools_comment").val(localStorage.getItem("AnnTools_MarkAsResolved_comment") || "");
    const offsets = {
        n: 10,
        s: 10,
        _default: 3,
    };
    const toggle = (type) => {
        const isHide = type === "hide";
        $(`.AnnTools_form .AnnTools_radio${isHide ? ":not(:checked)" : ""}`).closest("li")[isHide ? "hide" : "show"]();
        $("#AnnTools_archive_offset, #AnnTools_precomment, #AnnTools_comment").each((_, input) => {
            const $input = $(input);
            if (!isHide || ($input.val() || "").length === 0) {
                $input.closest("dd")[isHide ? "hide" : "show"]();
                $input.closest("dd").prev("dt")[isHide ? "hide" : "show"]();
            }
        });
        const inputs = container.find("input");
        if (isHide) {
            inputs.attr("disabled", "disabled");
        } else {
            inputs.removeAttr("disabled");
        }
    };
    const formatOffset = (offset) => Math.max(1, Math.min(30, Math.round(offset)));
    const offsetInput = $("#AnnTools_archive_offset");
    offsetInput.on("click change keydown keyup keypress input paste", () => {
        const value = offsetInput.val();
        if (value.length > 0) {
            offsetInput.val(formatOffset(value));
        }
    });
    const updateDefaultOffset = (type) => {
        offsetInput.attr("placeholder", typeof offsets[type] === "number" ? offsets[type] : offsets._default);
        offsetInput.val("");
    };
    container.on("click", (event) => {
        if (runningFlag) {
            return;
        }
        const target = $(event.target);
        if (target.is(".AnnTools_Frame_Close") && !target.is(".disable")) {
            container.fadeOut(370).queue(function () {
                container.find(".AnnTools_Confirm").removeAttr("style");
                $(this).dequeue();
            });
            toggle("show");
        } else if (target.is("#AnnTools_Confirm_First .AnnTools_Confirm_Yes")) {
            container.find("#AnnTools_Confirm_First").hide();
            container.find("#AnnTools_Confirm_Second").show();
        } else if (target.is("#AnnTools_Confirm_Second .AnnTools_Confirm_Yes")) {
            container.trigger("submit");
        } else if (target.is(".AnnTools_Confirm_No")) {
            container.fadeOut(370).queue(function () {
                container.find(".AnnTools_Confirm").removeAttr("style");
                $(this).dequeue();
            });
            toggle("show");
        } else if (target.is(".AnnTools_radio")) {
            target.closest(".AnnTools_form").find(".AnnTools_radio:checked").prop("checked", false);
            target.prop("checked", true);
            updateDefaultOffset(target.val());
        }
    }).on("submit", async () => {
        try {
            if (typeof Object.fromEntries !== "function") {
                throw new Error("请更新浏览器到最新版本以使用本工具（最低可用版本为 Chrome & Edge: 73+, Firefox: 63+, Safari: 12.1+）");
            }
            runningFlag = true;
            container.find(".AnnTools_Confirm_Yes, .AnnTools_Confirm_No").text("正在运行");
            container.find(".AnnTools_status").text("正在标记中……");
            toggle("hide");
            const c = $("#AnnTools_comment").val();
            const v = container.find(".AnnTools_radio:checked").val();
            const pc = $("#AnnTools_precomment").val() || "";
            let o = offsetInput.val();
            o = formatOffset(o.length > 0 ? o : offsetInput.attr("placeholder"));
            const hash = container.data("sectionTitle");
            const toclist = Object.fromEntries((await api.post({
                action: "parse",
                format: "json",
                pageid: mw.config.get("wgArticleId"),
                prop: "sections",
            })).parse.sections.map(({ anchor, index }) => [anchor, index]));
            if (!(hash in toclist)) {
                throw new Error("请移除该标题内的模板后再行操作……");
            }
            const section = toclist[hash];
            await api.postWithToken("csrf", {
                action: "edit",
                pageid: mw.config.get("wgArticleId"),
                section,
                summary: `标记讨论串「/* ${container.data("sectionTitle")} */」状态为【${container.find(".AnnTools_radio:checked + label").text()}】`,
                tags: "Automation tool",
                nocreate: true,
                appendtext: `${pc.length > 0 ? `\n:${pc}——~~~~` : ""}\n\n{{MarkAsResolved|time={{subst:#timel:Ymd}}|status=${v}|archive-offset=${o}|comment=${c}|sign=~~~~}}`,
            });
            container.find(".AnnTools_status").text("编辑完成！即将刷新！").addClass("AnnTools_WorkDetail_Succeed");
            // localStorage.setItem("AnnTools_MarkAsResolved_comment", c);
            setTimeout(() => { location.reload(false); }, 1307);
        } catch (e) {
            console.error("MarkAsResolved.js", e);
            container.find(".AnnTools_status").text(`发生错误：${e}`);
            runningFlag = false;
            container.find(".AnnTools_Confirm_Yes").text("就是这样");
            container.find(".AnnTools_Confirm_No").text("我再想想");
            toggle("show");
        }
    });
    $("#mw-content-text > .mw-parser-output > h2, #mw-content-text > .mw-parser-output > .discussionContainer > h2").each(function () {
        const self = $(this);
        const content = self.nextUntil("h2").not("h2");
        if (content.hasClass("saveNotice") || content.hasClass("MarkAsResolved")) { return; }
        const sectionTitle = self.find(".mw-headline").attr("id");
        const href = self.find('.mw-editsection a[href*="action=edit"]').attr("href");
        const a = $("<a>");
        a.attr({ href }).prop("draggable", false).addClass("AnnTools_MarkAsResolved").text("标记状态");
        self.find(".mw-editsection-bracket").first()
            .after('<span class="mw-editsection-divider"> | </span>')
            .after(a);
        a.on("click", () => {
            if (!container.is(":visible")) {
                container.find(".AnnTools_SectionTitle").text(sectionTitle);
                updateDefaultOffset($(".AnnTools_radio:checked").val());
                container.data({
                    sectionTitle,
                }).fadeIn(370);
            }
            return false;
        });
        const quicksave = self.find(".AnnTools_QuickSave");
        if (quicksave[0]) {
            const divider = quicksave.next(".mw-editsection-divider");
            if (divider.length > 0) {
                self.find(".mw-editsection .mw-editsection-bracket").first().after(divider).after(quicksave);
            }
        }
    });
})();
// </pre>
