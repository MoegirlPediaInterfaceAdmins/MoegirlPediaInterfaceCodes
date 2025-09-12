// <pre>
/* 这里的任何JavaScript将只为管理员加载
 * 请尊重萌娘百科版权，以下代码复制需要注明原自萌娘百科，并且附上URL地址http://zh.moegirl.org.cn/MediaWiki:Group-sysop.js
 * 版权协定：知识共享 署名-非商业性使用-相同方式共享 3.0
 */
"use strict";
(async () => {
    /* 函数定义块 */
    // 添加删除原因链接
    const addLink = ($obj, act) => {
        const href = $obj.css("margin-left", "1em")[0].href,
            reasonPageName = href.slice(href.indexOf("title=") + 6, href.indexOf("&action"));
        $obj.before(`<a target="_blank" href="/${reasonPageName}">浏览${act}原因</a>`);
    };
    // 防滥用过滤器相关
    // eslint-disable-next-line no-unused-vars
    const abuseLog = () => {
        if ($(".mw-special-AbuseLog")[0]) {
            const rawInput = $('input[name="wpSearchFilter"]').val().split("|");
            const needToggle = new Set();
            $(".plainlinks li").each((_, ele) => {
                const self = $(ele);
                let id = -1;
                switch (true) {
                    case self.find('a[href="/Special:%E6%BB%A5%E7%94%A8%E8%BF%87%E6%BB%A4%E5%99%A8/1"]')[0] && !rawInput.includes("1"):
                        id = 1;
                        break;
                    case self.find('a[href="/Special:%E6%BB%A5%E7%94%A8%E8%BF%87%E6%BB%A4%E5%99%A8/11"]')[0] && !rawInput.includes("11"):
                        id = 11;
                        break;
                }
                if (id !== -1) {
                    needToggle.add(id);
                    self.addClass("AbuseFilterNeedHidden");
                }
            });
            if ($(".AbuseFilterNeedHidden")[0]) {
                mw.loader.addStyleTag("body.AbuseFilterHidden .AbuseFilterNeedHidden { display: none; } ");
                const lastStatus = localStorage.getItem("AnnTools-abuseLog-hidden") === "true";
                const body = $("body");
                const input = $("<input/>", {
                    val: lastStatus ? "显示" : "隐藏",
                    attr: {
                        type: "button",
                    },
                });
                input.on({
                    click: () => {
                        if ($("body").hasClass("AbuseFilterHidden")) {
                            input.val("隐藏");
                            localStorage.getItem("AnnTools-abuseLog-hidden", "false");
                        } else {
                            input.val("显示");
                            localStorage.getItem("AnnTools-abuseLog-hidden", "true");
                        }
                        body.toggleClass("AbuseFilterHidden");
                    },
                });
                $('form[action="/Special:%E6%BB%A5%E7%94%A8%E6%97%A5%E5%BF%97"] > fieldset').append("<p/>").find("p").append($("<span/>", {
                    text: `点击隐藏/显示防滥用过滤器${Array.from(needToggle.values()).join("、").replace(/、(?=[^、]+$)/, "和")}的日志：`,
                })).append(input);
                if (lastStatus) {
                    body.addClass("AbuseFilterHidden");
                }
            }
        }
    };
    // 防滥用过滤器列表
    const AbuseList = () => {
        const idList = $(".TablePager_col_af_id a"),
            // lvList = $(".TablePager_col_af_hidden"),
            idLength = idList.last().text().length;
        idList.each((_, ele) => {
            const $ele = $(ele);
            let zero = "";
            while ($ele.text().length + zero.length < idLength) {
                zero += "0";
            }
            $ele.prepend(`<span style="speak:none;visibility:hidden;color:transparent;">${zero}</span>`);
        });
        /* lvList.each((_, ele) => {
            const $ele = $(ele);
            if ($ele.text().length === 2) {
                $ele.prepend('<span style="speak:none;visibility:hidden;color:transparent;">已</span>');
            }
        }); */
    };
    // i18n语言链接
    const i18nLink = () => {
        $('#mw-content-text a.new[href$="/zh-cn"], #mw-content-text a.new[href$="/zh-tw"], #mw-content-text a.new[href$="/zh-hk"]').each((_, ele) => {
            $(ele).removeClass("new").attr({
                title: ele.title.replace(/\/zh-[a-z]+|（页面不存在）/g, ""),
                href: ele.href.replace(/\/zh-[a-z]+/g, ""),
            });
        });
    };
    /* 函数执行块 */
    await $.ready;
    // 删除、保护、版本删除原因浏览链接
    if (mw.config.get("wgAction") === "delete") {
        if ($(".mw-delete-editreasons")[0]) {
            addLink($(".mw-delete-editreasons > a"), "删除");
        }
        if ($(".mw-filedelete-editreasons")[0]) {
            addLink($(".mw-filedelete-editreasons > a"), "删除");
        }
    }
    if (/protect$/.test(mw.config.get("wgAction")) && $(".mw-protect-editreasons")[0]) {
        addLink($(".mw-protect-editreasons > a"), "保护");
    }
    if (mw.config.get("wgCanonicalSpecialPageName") === "Revisiondelete" && $(".mw-revdel-editreasons")[0]) {
        addLink($(".mw-revdel-editreasons > a"), "删除");
    }
    // 防滥用过滤器日志
    // abuseLog();
    // 防滥用过滤器列表
    if (mw.config.get("wgPageName") === "Special:滥用过滤器") {
        AbuseList();
    }
    // i18n语言链接
    i18nLink();
    // 授权巡查默认15天，机器用户授权增加预置时间选项，手确默认7天
    if (mw.config.get("wgCanonicalSpecialPageName") === "Userrights") {
        const wpExpiryPatroller = document.querySelector("#mw-input-wpExpiry-patroller");
        if (wpExpiryPatroller && !document.getElementById("wpGroup-patroller").checked) {
            Array.from(wpExpiryPatroller.options).filter((ele) => ele.value === "1 week")[0].after(new Option("15天", "15 days"));
            wpExpiryPatroller.value = "15 days";
        }
        const wpExpiryFlood = document.querySelector("#mw-input-wpExpiry-flood");
        if (wpExpiryFlood) {
            Array.from(wpExpiryFlood.options).filter((ele) => ele.value === "1 day")[0].before(new Option("2小时", "2 hours"), new Option("6小时", "6 hours"), new Option("12小时", "12 hours"));
        }
        const wpExpiryManuallyConfirmed = document.querySelector("#mw-input-wpExpiry-manually-confirmed");
        if (wpExpiryManuallyConfirmed && !document.getElementById("wpGroup-manually-confirmed").checked) {
            wpExpiryManuallyConfirmed.value = "1 week";
        }
    }
    // 替换文本默认不勾选「通过Special:最近更改和监视列表通知这些编辑」
    if (mw.config.get("wgCanonicalSpecialPageName") === "ReplaceText" && $("#powersearch")[0]) {
        $('input[name="botEdit"]').prop("checked", true);
    }
    // 批量删除默认选择运行者为「you」
    if (mw.config.get("wgCanonicalSpecialPageName") === "DeleteBatch" && $("#wpMode")[0]) {
        $("#wpMode").val("you");
    }
})();
// </pre>
