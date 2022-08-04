(async () => {
    const isNewVersion = mw.config.get("wgVersion").slice(0,4) >= 1.35;
    //添加监督原因链接
    function addLink($obj, act) {
        const href = $obj.css("margin-left", "1em")[0].href,
            reasonPageName = href.slice(href.indexOf("title=") + 6, href.indexOf("&action"));
        $obj.before(`<a target="_blank" href="/${reasonPageName}">浏览${act}原因</a>`);
    }
    //滥用日志
    function hideAbuselogLink() {
        const reasonpage = isNewVersion ? "MediaWiki:Revdelete-reason-dropdown-suppress" : "MediaWiki:Revdelete-reason-dropdown";
        const link = $("<div/>", {
            id: "hideAbuselogLink",
            class: "mw-revdel-editreasons",
            css: {
              "font-size": "90%",
              "text-align": "right",
            },
        }).append('<a target="_blank" href="/index.php?title='+ reasonpage + '&action=edit">编辑隐藏原因</a>');
        $("form[action='/Special:%E6%BB%A5%E7%94%A8%E6%97%A5%E5%BF%97']").append(link);
    }
    /* 函数执行块 */
    await $.ready;
    //隐藏滥用日志原因浏览链接（预留其他接口）
    if (mw.config.get("wgCanonicalSpecialPageName") === "AbuseLog" && window.location.href.includes("&hide=")) {
        hideAbuselogLink();
        addLink($(".mw-revdel-editreasons > a"), "隐藏");
    }
})();
