// <pre>
/* 这里的任何JavaScript将只为管理员加载 
 * 请尊重萌娘百科版权，以下代码复制需要注明原自萌娘百科，并且附上URL地址http://zh.moegirl.org.cn/MediaWiki:Group-sysop.js
 * 版权协定：知识共享 署名-非商业性使用-相同方式共享 3.0
 */
"use strict";
(async () => {
    /* 函数定义块 */
    //添加删除原因链接
    function addLink($obj, act) {
        const href = $obj.css("margin-right", "1em")[0].href,
            reasonPageName = href.slice(href.indexOf("title=") + 6, href.indexOf("&action"));
        $obj.after(`<a target="_blank" href="/${reasonPageName}">浏览${act}原因</a>`);
    }
    //防滥用过滤器相关
    // eslint-disable-next-line no-unused-vars
    function abuseLog() {
        if ($(".mw-special-AbuseLog")[0]) {
            const rawInput = $('input[name="wpSearchFilter"]').val().split("|");
            const needToggle = new Set();
            $(".plainlinks li").each(function () {
                const self = $(this);
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
                const bdy = $("body");
                $('form[action="/Special:%E6%BB%A5%E7%94%A8%E6%97%A5%E5%BF%97"] > fieldset').append("<p/>").find("p").append($("<span/>", {
                    text: `点击隐藏/显示防滥用过滤器${Array.from(needToggle.values()).join("、").replace(/、(?=[^、]+$)/, "和")}的日志：`,
                })).append($("<input/>", {
                    val: lastStatus ? "显示" : "隐藏",
                    on: {
                        click: function () {
                            if ($("body").hasClass("AbuseFilterHidden")) {
                                $(this).val("隐藏");
                                localStorage.getItem("AnnTools-abuseLog-hidden", "false");
                            } else {
                                $(this).val("显示");
                                localStorage.getItem("AnnTools-abuseLog-hidden", "true");
                            }
                            bdy.toggleClass("AbuseFilterHidden");
                        },
                    },
                    attr: {
                        type: "button",
                    },
                }));
                if (lastStatus) {
                    bdy.addClass("AbuseFilterHidden");
                }
            }
        }
    }
    //防滥用过滤器列表
    function AbuseList() {
        const idList = $(".TablePager_col_af_id a"),
            lvList = $(".TablePager_col_af_hidden"),
            idLength = idList.last().text().length;
        idList.each(function () {
            let zero = "";
            while ($(this).text().length + zero.length < idLength) {
                zero += "0";
            }
            $(this).prepend(`<span style="speak:none;visibility:hidden;color:transparent;">${zero}</span>`);
        });
        lvList.each(() => {
            // if ($(this).text().length == 2) $(this).prepend('<span style="speak:none;visibility:hidden;color:transparent;">已</span>');
        });
    }
    //评论栏管理链接
    function flowthreadAdminLink() {
        const link = $("<div/>", {
            id: "flowthreadAdminLink",
            css: {
                "font-size": "12px",
                color: "#999",
                "text-align": "right",
            },
        }).append(`<a href="${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/MediaWiki:Flowthread-blacklist" style="margin-right:8px;" target="_blank">关键词过滤名单</a>`)
            .append(`<a href="${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/Special:%E7%AE%A1%E7%90%86FlowThread%E8%AF%84%E8%AE%BA" target="_blank">评论管理</a>`);
        $("#flowthread").append(link);
    }
    //i18n语言链接
    function i18nLink() {
        $('#mw-content-text a.new[href$="/zh-cn"], #mw-content-text a.new[href$="/zh-tw"], #mw-content-text a.new[href$="/zh-hk"]').each((_, ele) => {
            $(ele).removeClass("new").attr({
                title: ele.title.replace(/\/zh-[a-z]+|（页面不存在）/g, ""),
                href: ele.href.replace(/\/zh-[a-z]+/g, ""),
            });
        });
    }
    /* 函数执行块 */
    await $.ready;
    //删除保护原因浏览链接
    if (window.location.href.indexOf("action=delete") !== -1) {
        if ($(".mw-delete-editreasons")[0]) {
            addLink($(".mw-delete-editreasons a"), "删除");
        }
        if ($(".mw-filedelete-editreasons")[0]) {
            addLink($(".mw-filedelete-editreasons a"), "删除");
        }
    }
    if (window.location.href.indexOf("action=protect") !== -1 && $(".mw-protect-editreasons")[0]) {
        addLink($(".mw-protect-editreasons a"), "保护");
    }
    //防滥用过滤器日志
    // abuseLog();
    //防滥用过滤器列表
    if ($(".mw-special-AbuseFilter")[0]) {
        AbuseList();
    }
    //i18n语言链接
    //评论管理
    setInterval(() => {
        i18nLink();
        if ($("#flowthread")[0] && !$("#flowthreadAdminLink")[0]) {
            flowthreadAdminLink();
        }
    }, 100);
    //授权巡查默认15天，机器用户授权增加预置时间选项
    if (mw.config.get("wgCanonicalSpecialPageName") === "Userrights") {
        const wpExpiryPatroller = document.querySelector("#mw-input-wpExpiry-patroller");
        if (wpExpiryPatroller) {
            Array.from(wpExpiryPatroller.options).filter((ele) => {
                return ele.value === "1 week";
            })[0].after(new Option("15天", "15 days"));
            if (!["infinite", "existing"].includes(wpExpiryPatroller.value)) {
                wpExpiryPatroller.value = "15 days";
            }
        }
        const wpExpiryFlood = document.querySelector("#mw-input-wpExpiry-flood");
        if (wpExpiryFlood) {
            Array.from(wpExpiryFlood.options).filter((ele) => {
                return ele.value === "1 day";
            })[0].before(new Option("2小时", "2 hours"), new Option("6小时", "6 hours"), new Option("12小时", "12 hours"));
        }
    }
})();
// </pre>