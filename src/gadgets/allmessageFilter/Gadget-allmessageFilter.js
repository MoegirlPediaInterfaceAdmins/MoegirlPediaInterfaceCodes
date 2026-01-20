"use strict";
// <pre>
((isCompleted) => {
    const run = () => {
        if (mw.config.get("wgNamespaceNumber") !== -1 || mw.config.get("wgCanonicalSpecialPageName") !== "Allmessages") {
            return;
        }
        mw.util.addCSS([
            ".TablePager_nav {",
            "    user-select: none;",
            "}",
            ".TablePager_nav-enabled {",
            "    cursor: pointer;",
            "}",
            "#mw-allmessages-filter-status {",
            "    color: red;",
            "}",
        ].join("\n"));
        const containter = $("<fieldset/>"),
            api = new mw.Api(),
            length = +$("#mw-table_pager_limit_label").val();
        let index = 0,
            filter, rfilter, am;
        const enablePrevLink = (b) => {
            if (!b) {
                $(".TablePager_nav-prev div").removeClass("TablePager_nav-enabled").addClass("TablePager_nav-disabled");
            } else {
                $(".TablePager_nav-prev div").removeClass("TablePager_nav-disabled").addClass("TablePager_nav-enabled");
            }
        };
        const enableNextLink = (b) => {
            if (!b) {
                $(".TablePager_nav-next div").removeClass("TablePager_nav-enabled").addClass("TablePager_nav-disabled");
            } else {
                $(".TablePager_nav-next div").removeClass("TablePager_nav-disabled").addClass("TablePager_nav-enabled");
            }
        };
        const check = (am) => {
            if (am.length <= length) {
                enableNextLink(false);
                enablePrevLink(false);
            } else if (index === 0) {
                enablePrevLink(false);
                enableNextLink(true);
            } else if (index + length < am.length) {
                enablePrevLink(true);
                enableNextLink(true);
            } else {
                enablePrevLink(true);
                enableNextLink(false);
            }
        };
        const load = (_am) => {
            check(am);
            const head = $("#mw-allmessagestable thead");
            if (head.find("tr").length !== 1) {
                head.find("td:first").removeAttr("rowspan");
                head.find("tr:first td:last").text("当前信息文字");
                head.find("tr:not(:first)").remove();
            }
            const list = $("#mw-allmessagestable tbody");
            list.empty();
            _am.forEach((n) => {
                const name = n.name, text = n["*"];
                const row = $("<tr/>");
                row.attr("id", name).append('<td class="am_title"></td><td class="am_default"></td>');
                $("<a/>").addClass("external").attr({
                    href: `${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/MediaWiki:${name}`,
                    rel: "nofollow",
                }).html(name.replace(rfilter, `<span style="font-weight: bold;">${filter}</span>`)).appendTo(row.find(".am_title"));
                row.find(".am_default").text(text);
                list.append(row);
            });
        };
        const init = () => {
            if (!$("#mw-allmessages-form")[0]) {
                return;
            }
            $("#mw-allmessages-form").remove();
            $(".TablePager_nav td").remove();
            $(".TablePager_nav tr").append('<td style="width: 50%;" class="TablePager_nav-prev"><div class="TablePager_nav-disabled">上一页</div></td><td style="width: 50%;" class="TablePager_nav-next"><div class="TablePager_nav-disabled">下一页</div></td>');
            $(".TablePager_nav-prev div").on("click", function () {
                if ($(this).hasClass("TablePager_nav-disabled")) {
                    return false;
                }
                index -= length;
                index = Math.max(index, 0);
                load(am.slice(index, index + length));
            });
            $(".TablePager_nav-next div").on("click", function () {
                if ($(this).hasClass("TablePager_nav-disabled")) {
                    return false;
                }
                index += length;
                load(am.slice(index, index + length));
            });
        };
        $(".mw-htmlform-ooui-wrapper").after(containter);
        containter.append("<legend>搜索</legend>");
        const table = $("<table/>");
        containter.append(table);
        table.append("<tr></tr><tr></tr>");
        $("<td/>").addClass("mw-label").html('<label for="mw-allmessages-filter">以含有此字符串过滤：</label>').appendTo(table.find("tr:first"));
        $("<td/>").addClass("mw-input").html('<input size="20" value="" id="mw-allmessages-filter">').appendTo(table.find("tr:first"));
        $("<td/>").appendTo(table.find("tr:last"));
        const submit = $("<button/>");
        submit.text("搜索");
        $("<td/>").addClass("mw-input").append(submit).appendTo(table.find("tr:last"));
        const input = $("#mw-allmessages-filter");
        submit.on("click", async () => {
            if (!input.val()) {
                return oouiDialog.alert("请输入内容以搜索系统消息");
            }
            $("#mw-allmessages-filter-status").remove();
            init();
            filter = input.val();
            rfilter = RegExp(filter, "i");
            containter.append('<div id="mw-allmessages-filter-status">正在加载中……</div>');
            try {
                const data = await api.post({
                    action: "query",
                    assertuser: mw.config.get("wgUserName"),
                    format: "json",
                    meta: "allmessages",
                    amfilter: filter,
                });
                am = data.query.allmessages;
                index = 0;
                $("#mw-allmessages-filter-status").remove();
                load(am.slice(index, index + length));
            } catch (e) {
                console.error(e);
                $("#mw-allmessages-filter-status").remove();
                containter.append('<div id="mw-allmessages-filter-status">发生错误，请重试！</div>');
            }
        });
        input.on("keypress", (e) => {
            if (e.key === "Enter") {
                submit.trigger("click");
            }
        });
    };
    if (isCompleted) {
        run();
    } else {
        $(window).on("load", run);
    }
})(document.readyState === "complete");
// </pre>
