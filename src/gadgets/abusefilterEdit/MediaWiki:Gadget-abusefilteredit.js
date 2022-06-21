"use strict";
$(() => {
    //检测是否使用wikiplus
    function useWikiplus() {
        if (typeof wikiplus === "object" || $("#MoeNotification")[0]) {
            return true;
        }
        return false;
    }
    //针对不同的环境输出不同的字符串
    function ifUseWikiplus(yT, nT) {
        return `${useWikiplus() ? yT : nT}`;
    }
    //AbuseFilterEdit
    if (!$("body.mw-special-AbuseFilter")[0] && !$("#mw-abusefilter-warn-parameters")[0]) {
        return;
    }
    let MAWI, selectOpt, selectVal;
    $("#mw-abusefilter-edit-warn-message").each((_, ele) => {
        const self = $(ele),
            select = self.find("select").appendTo(self);
        let MWFP, MAWP, MWFC, MWFO;
        self.find("td").remove();
        self.append('<td><fieldset><legend>使用现有的消息</legend><table><tr><td class="mw-label">用作警告的系统消息：</td><td class="mw-input" id="mw-abusefilter-edit-warn-message-select"></td></tr><tr><td class="mw-label">操作：</td><td class="mw-input"><p><input id="MWFP" type="button" value="预览消息"><input id="MWFC" type="button" value="清空预览" style="display: none;"><input id="MWFO" type="button" value="在新窗口打开"> </p></td></tr><tr><td id="MAWP" colspan="2"></td></tr><tr><td colspan="2"><p>P.S.只有这里的下拉栏设置的系统消息才是防滥用过滤器使用的系统消息，隔壁是创建用啦！</p></td></tr><tr><td colspan="2" id="MAWI"></td></tr></table></fieldset></td>').find("#mw-abusefilter-edit-warn-message-select").append(select);
        MWFP = $("#MWFP"), MAWP = $("#MAWP"), MWFC = $("#MWFC"), MWFO = $("#MWFO");
        MAWI = $("#MAWI"), selectOpt = select.html(), selectVal = select.val(); //放置到上级作用域链以便其他元素执行
        MWFP.on("click", () => {
            MAWP.load(`${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/Mediawiki:${select.val()}?action=render`);
            MWFC.fadeIn();
        });
        MWFC.on("click", () => {
            MAWP.empty();
            MWFC.fadeOut();
        });
        MWFO.on("click", () => {
            window.open(`${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/Mediawiki:${select.val()}`, "_blank");
        });
    });
    $("#mw-abusefilter-edit-warn-other-label").each((_, ele) => {
        const self = $(ele);
        let MACN, MWCEVB, MACT, pageName, preloadPage, select;
        self.find("#mw-abusefilter-warn-message-other").css({
            visibility: "hidden",
            height: "0",
        }).appendTo(MAWI);
        self.empty();
        self.append(`<td><fieldset><legend>想要创建／${ifUseWikiplus("浏览", "编辑")}的消息：</legend><table><tr><td class="mw-label">作为模板的系统消息：</td><td><select></select></td></tr><tr><td class="mw-label"><p>想要创建／浏览的消息：</p><dl><dd>（无须MediaWiki前缀）</dd></dl></td><td class="mw-input"><input size="45" id="MACN"></td><tr><td class="mw-label">操作：</td><td><input type="button" id="MWCEVB"></td></tr><tr><td colspan="2" id="MACT"></td></tr></table></fieldset></td>`);
        MACN = $("#MACN").val(selectVal), MWCEVB = $("#MWCEVB").val(ifUseWikiplus("创建／浏览所选消息", "创建／编辑所选消息")), MACT = self.find("#MACT"), select = self.find("select").html(selectOpt).val(selectVal);
        MACT.text(`P.S.点击按钮后${ifUseWikiplus("如果输入框内所指消息存在则在新标签页访问该消息页面，否则则打开一个创建该消息的新标签页", "打开一个创建/编辑该消息的新标签页")}`);
        MWCEVB.on("click", () => {
            pageName = `Mediawiki:${MACN.val()}`, preloadPage = `Mediawiki:${select.val()}`;
            $.ajax({
                url: `${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/api.php`,
                beforeSend: function () {
                    MACT.text("正在检查");
                },
                type: "POST",
                data: {
                    action: "query",
                    titles: pageName,
                    format: "json",
                    converttitles: " zh-cn",
                },
                success: function (data) {
                    if (data.query.pages["-1"]) {
                        MACT.text("该消息不存在！即将从新标签页访问该消息页面的创建页！");
                        window.setTimeout(() => {
                            window.open(`${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/index.php?preload=${preloadPage}&action=edit&title=${pageName}`, "_blank");
                        }, 1730);
                    } else {
                        MACT.text(`该消息存在！即将从新标签页访问该消息${ifUseWikiplus("！", "的编辑页！")}`);
                        window.setTimeout(() => {
                            window.open(ifUseWikiplus(`${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/${pageName}`, `${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/index.php?action=edit&title=${encodeURIComponent(pageName)}`), "_blank");
                        }, 1730);
                    }
                },
                error: function () {
                    MACT.text("寿司娘来袭！无法检测页面是否存在！即将从新标签页访问该消息页面的编辑/创建页！");
                    window.setTimeout(() => {
                        window.open(`${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/index.php?preload=${preloadPage}&action=edit&title=${pageName}`, "_blank");
                    }, 1730);
                },
            });
        });
    });
    $("#mw-abusefilter-edit-warn-actions").remove();
});