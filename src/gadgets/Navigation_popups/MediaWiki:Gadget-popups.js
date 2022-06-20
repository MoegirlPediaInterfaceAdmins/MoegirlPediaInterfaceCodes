/* eslint-disable prefer-spread */
/* eslint-disable no-redeclare */
/* eslint-disable no-unused-vars */
/* eslint-disable no-fallthrough */
/* eslint-disable no-cond-assign */
/* eslint dot-notation: ["error", { "allowPattern": "^(?:catch|default|continue)$" } ] */
/* eslint-disable eqeqeq */
/* eslint-disable prefer-rest-params */
/* eslint-disable no-param-reassign */
/* eslint-disable prefer-arrow-callback */
/* eslint-disable prefer-template */
/* eslint-disable comma-dangle */
/* eslint-disable no-var */
/* global wgULS, log, errlog, wikEdUseWikEd, WikEdUpdateFrame */
/*
 * 全部内容引自 https://en.wikipedia.org/wiki/MediaWiki:Gadget-popups.js
 * 当前版本修改自 https://en.wikipedia.org/w/index.php?title=MediaWiki:Gadget-popups.js&oldid=1052364474
 * 当前版本含有自定义tags，参见 https://zh.moegirl.org.cn/index.php?diff=5472811&oldid=5469608 https://zh.moegirl.org.cn/_?diff=5608805
 */
// <pre>
"use strict";
$(function () {
    var popupStrings = {
        /////////////////////////////////////
        // summary data, searching etc.
        /////////////////////////////////////
        article: wgULS("条目", "條目"),
        category: wgULS("个分类", "個分類"),
        categories: wgULS("个分类", "個分類"),
        image: wgULS("个文件", "個檔案"),
        images: wgULS("个文件", "個檔案"),
        stub: wgULS("小作品", "小作品"),
        "section stub": wgULS("小章节", "小章節"),
        "Empty page": wgULS("空页面", "空頁面"),
        kB: wgULS("千字节<sub>（以1000为一进）</sub>", "千位元組<sub>（以1000為一進）</sub>"),
        bytes: wgULS("字节", "位元組"),
        day: wgULS("天", "天"),
        days: wgULS("天", "天"),
        hour: wgULS("小时", "小時"),
        hours: wgULS("小时", "小時"),
        minute: wgULS("分", "分"),
        minutes: wgULS("分", "分"),
        second: wgULS("秒", "秒"),
        seconds: wgULS("秒", "秒"),
        week: wgULS("周", "周"),
        weeks: wgULS("周", "周"),
        month: wgULS("月", "月"),
        months: wgULS("月", "月"),
        year: wgULS("年", "年"),
        years: wgULS("年", "年"),
        search: wgULS("搜索", "搜尋"),
        SearchHint: wgULS("搜索包含 %s 的页面", "搜尋包含 %s 的頁面"),
        web: "Google",
        global: wgULS("全域", "全域"),
        "more...": wgULS("更多……", "更多……"),
        /////////////////////////////////////
        // article-related actions and info
        // (some actions also apply to user pages)
        /////////////////////////////////////
        actions: wgULS("操作", "動作"),
        ///// view articles and view talk
        popupsMenu: wgULS("Popups", "Popups"),
        "disable previews": wgULS("禁用预览", "禁用預覽"),
        togglePreviewsHint: wgULS("切换本页 Popups 的预览开关", "切換本頁 Popups 的預覽開關"),
        "toggle previews": wgULS("切换预览开关", "切換預覽開關"),
        reset: wgULS("复位", "複位"),
        disable: wgULS("禁用 Popups", "禁用 Popups"),
        disablePopupsHint: wgULS("在本页禁用 Popups，刷新页面以重新启用。", "在本頁禁用 Popups，重新整理頁面以重新啟用。"),
        purgePopupsHint: wgULS("复位 Popups，清除所有缓存数据。", "複位 Popups，清除所有快取資料。"),
        PopupsHint: wgULS("复位 Popups，清除所有缓存数据。", "複位 Popups，清除所有快取資料。"),
        spacebar: wgULS("空格", "空格"),
        view: wgULS("查看", "檢視"),
        "view article": wgULS("查看条目", "檢視條目"),
        viewHint: wgULS("前往 %s", "前往 %s"),
        talk: wgULS("讨论", "討論"),
        "talk page": wgULS("讨论页", "討論頁"),
        "this&nbsp;revision": wgULS("此修订版本", "此修訂版本"),
        "revision %s of %s": wgULS("页面 $2 的修订版本 $1", "頁面 $2 的修訂版本 $1"),
        "Revision %s of %s": wgULS("页面 $2 的修订版本 $1", "頁面 $2 的修訂版本 $1"),
        "the revision prior to revision %s of %s": wgULS("页面 $2 的修订版本 $1 之前的修订版本", "頁面 $2 的修訂版本 $1 之前的修訂版本"),
        "Toggle image size": wgULS("点击切换图片大小", "點擊切換圖片大小"),
        del: wgULS("删除", "删除"),
        ///// delete, protect, move
        "delete": wgULS("删除", "删除"),
        deleteHint: wgULS("删除 %s", "删除 %s"),
        undeleteShort: wgULS("恢复", "恢復"),
        UndeleteHint: wgULS("恢复 %s", "恢復 %s"),
        protect: wgULS("保护", "保護"),
        protectHint: wgULS("保护 %s", "保護 %s"),
        unprotectShort: wgULS("解除", "解除"),
        unprotectHint: wgULS("解除对 %s 的保护", "解除對 %s 的保護"),
        move: wgULS("移动", "移動"),
        "move page": wgULS("移动页面", "移動頁面"),
        MovepageHint: wgULS("修改 %s 的标题", "修改 %s 的標題"),
        edit: wgULS("编辑", "編輯"),
        ///// edit articles and talk
        "edit article": wgULS("编辑条目", "編輯條目"),
        editHint: wgULS("修改 %s 的内容", "修改 %s 的內容"),
        "edit talk": wgULS("编辑讨论页", "編輯對話頁", null, null, "編輯討論頁"),
        "new": wgULS("新", "新"),
        "new topic": wgULS("新话题", "新話題"),
        newSectionHint: wgULS("在 %s 增加新的讨论话题", "在 %s 增加新的討論話題"),
        "null edit": wgULS("空编辑", "空編輯"),
        nullEditHint: wgULS("进行一次对 %s 的空编辑", "製造一次對 %s 的空編輯"),
        hist: wgULS("历史", "歷史"),
        ///// history, diffs, editors, related
        history: wgULS("历史", "歷史"),
        historyHint: wgULS("%s 的修订历史", "%s 的修訂歷史"),
        last: wgULS("之前", "之前"), // [[MediaWiki:Last]]
        lastEdit: wgULS("最近更改", "最近更改"),
        "show last edit": wgULS("最近一次更改", "最新一次修訂"),
        "Show the last edit": wgULS("显示最近一次更改的差异", "顯示最新一次修訂的差異"),
        lastContrib: wgULS("最近编辑", "最近編輯"),
        "last set of edits": wgULS("最近编辑", "最近編輯"),
        lastContribHint: wgULS("显示由最后一位编辑者造成的差异", "顯示由最後一位編輯者製造的差異"),
        cur: wgULS("当前", "當前"),
        diffCur: wgULS("与当前版本的差异", "與目前版本的差異"),
        "Show changes since revision %s": wgULS("显示自修订版本 %s 的差异", "顯示自修訂版本 %s 的差異"),
        "%s old": wgULS("%s 前的最后版本", "%s 前的最后版本"),
        // as in 4 weeks old
        oldEdit: wgULS("旧编辑", "舊編輯"),
        purge: wgULS("清除缓存", "清除快取"),
        purgeHint: wgULS("清除服务器中 %s 的缓存", "清除伺服器中 %s 的快取"),
        raw: wgULS("源代码", "原始碼"),
        rawHint: wgULS("查看 %s 的源代码", "檢視 %s 的原始碼"),
        render: wgULS("仅正文", "僅正文"),
        renderHint: wgULS("显示 %s 的纯HTML解析（仅正文内容）", "顯示 %s 的純HTML解析（僅正文內容）"),
        "Show the edit made to get revision": wgULS("显示编辑以得到修订版本", "顯示編輯以得到修訂版本"),
        sinceMe: wgULS("自我", "自我"),
        "changes since mine": wgULS("自我修订的差异", "自我修訂的差異"),
        sinceMeHint: wgULS("显示自我上次修改以来的差异", "顯示自我上次修改以來的差異"),
        "Couldn't find an edit by %s\nin the last %s edits to\n%s": wgULS("在 $3 最近 $2 次编辑中找不到 $1 做出的修改", "在 $3 最近 $2 次編輯中找不到 $1 做出的修改"),
        eds: wgULS("编辑", "編輯"),
        editors: wgULS("编辑者", "編輯者"),
        editorListHint: wgULS("列出编辑过 %s 的用户", "列出編輯過 %s 的使用者", null, null, "列出編輯過 %s 的用戶"),
        related: wgULS("相关", "相關"),
        relatedChanges: wgULS("相关更改", "相關更改"),
        "related changes": wgULS("相关更改", "相關更改"),
        RecentchangeslinkedHint: wgULS("显示相关 %s 的修改", "顯示相關 %s 的修改"),
        editOld: wgULS("编辑旧版", "編輯舊版"),
        ///// edit old version, or revert
        rv: wgULS("回退", "恢復"),
        revert: wgULS("回退", "恢復"),
        revertHint: wgULS("回退到 %s", "恢復到 %s"),
        undo: wgULS("撤销", "撤銷"),
        undoHint: wgULS("撤销这次编辑", "撤銷這次編輯"),
        defaultpopupRedlinkSummary: wgULS("移除到空页面[[%s]]的链接 ——[[Help:Popups小工具|Popups]]", "移除到空頁面[[%s]]的連結 ——[[Help:Popups小工具|Popups]]"),
        defaultpopupFixDabsSummary: wgULS("消歧义[[%s]]到[[%s]] ——[[Help:Popups小工具|Popups]]", "消歧義[[%s]]到[[%s]] ——[[Help:Popups小工具|Popups]]"),
        defaultpopupFixRedirsSummary: wgULS("忽略从[[%s]]到[[%s]]的重定向 ——[[Help:Popups小工具|Popups]]", "忽略從[[%s]]到[[%s]]的重新導向 ——[[Help:Popups小工具|Popups]]"),
        defaultpopupExtendedRevertSummary: wgULS("回退到$2在$1时编辑的修订版本$3 ——[[Help:Popups小工具|Popups]]", "還原到$2在$1時製作的修訂版本$3 ——[[Help:Popups小工具|Popups]]"),
        defaultpopupRevertToPreviousSummary: wgULS("回退到修订版本%s的上一个版本 ——[[Help:Popups小工具|Popups]]", "還原到修訂版本%s的上一個版本 ——[[Help:Popups小工具|Popups]]"),
        defaultpopupRevertSummary: wgULS("回退到修订版本%s ——[[Help:Popups小工具|Popups]]", "還原到修訂版本%s ——[[Help:Popups小工具|Popups]]"),
        defaultpopupQueriedRevertToPreviousSummary: wgULS("回退到修订版本$1的上一个版本，由$3在$2时编辑 ——[[Help:Popups小工具|Popups]]", "還原到修訂版本$1的上一個版本，由$3在$2時製作 ——[[Help:Popups小工具|Popups]]"),
        defaultpopupQueriedRevertSummary: wgULS("回退到$3在$2时编辑的修订版本$1 ——[[Help:Popups小工具|Popups]]", "還原到$3在$2時製作的修訂版本$1 ——[[Help:Popups小工具|Popups]]"),
        defaultpopupRmDabLinkSummary: wgULS("移除到消歧义页[[%s]]的链接 ——[[Help:Popups小工具|Popups]]", "移除到消歧義頁[[%s]]的連結 ——[[Help:Popups小工具|Popups]]"),
        Redirects: wgULS("重定向", "重定向"),
        // as in Redirects to ...
        // " to ": wgULS("到", "到"),
        // as in Redirects to ...
        "Bypass redirect": wgULS("忽略重定向", "忽略重新導向"),
        "Fix this redirect": wgULS("修复重定向", "修復重新導向"),
        disambig: wgULS("消歧义", "消歧義"),
        ///// add or remove dab etc.
        disambigHint: wgULS("消歧义这个链接到 [[%s]]", "消歧義這個連結到 [[%s]]"),
        "Click to disambiguate this link to:": wgULS("点击以消歧义这个链接到：", "點擊以消歧義這個連結到："),
        "remove this link": wgULS("移除链接", "移除連結"),
        "remove all links to this page from this article": wgULS("移除此条目到这页的所有链接", "移除此條目到這頁的所有連結"),
        "remove all links to this disambig page from this article": wgULS("移除此条目到这消歧义的所有链接", "移除此條目到這消歧義的所有連結"),
        mainlink: wgULS("主链接", "主連結"),
        ///// links, watch, unwatch
        wikiLink: wgULS("个内部链接", "個內部連結"),
        wikiLinks: wgULS("个内部链接", "個內部連結"),
        "links here": wgULS("链入", "鏈入"),
        whatLinksHere: wgULS("链入页面", "鏈入頁面"),
        "what links here": wgULS("链入页面", "鏈入頁面"),
        WhatlinkshereHint: wgULS("显示链接到 %s 的页面", "顯示連結到 %s 的頁面"),
        unwatchShort: wgULS("取消", "取消"),
        watchThingy: wgULS("监视", "監視"),
        // called watchThingy because {}.watch is a function
        watchHint: wgULS("加入 %s 到我的监视列表", "加入 %s 到我的監視列表"),
        unwatchHint: wgULS("从我的监视列表移除 %s", "從我的監視列表移除 %s"),
        "Only found one editor: %s made %s edits": wgULS("仅找到一位编者：%s 制造了 %s 次编辑", "僅找到一位編者：%s 製造了 %s 次編輯"),
        "%s seems to be the last editor to the page %s": wgULS("%s 看上去是 %s 这页的最后一位编者", "%s 看上去是 %s 這頁的最後一位編者"),
        rss: wgULS("RSS", "RSS"),
        /////////////////////////////////////
        // diff previews
        /////////////////////////////////////
        "Diff truncated for performance reasons": wgULS("出于性能考虑，差异已被截断", "出於效能考慮，差異已被截斷"),
        "Old revision": wgULS("旧版本", "舊版本"),
        "New revision": wgULS("新版本", "新版本"),
        "Something went wrong :-(": wgULS("出问题了 :-(", "出問題了 :-("),
        "Empty revision, maybe non-existent": wgULS("空的修订，可能并不存在", "空的修訂，可能並不存在"),
        "Unknown date": wgULS("未知日期", "未知日期"),
        /////////////////////////////////////
        // other special previews
        /////////////////////////////////////
        "Empty category": wgULS("空的分类", "空的分類"),
        "Category members (%s shown)": wgULS("分类成员（%s 显示）", "分類成員（%s 顯示）"),
        "No image links found": wgULS("未找到文件链接", "未找到檔案連結"),
        "File links": wgULS("文件链接", "檔案連結"),
        "not commons": wgULS("维基共享中无此名称的文件。", "維基共享中無此名稱的檔案。"),
        "commons only": wgULS("此文件来自维基共享。", "此檔案來自維基共享。"),
        "No image found": wgULS("找不到文件", "找不到檔案"),
        "commons dupe": wgULS("维基共享中存在此文件的副本。", "維基共享中存在此檔案的副本。"),
        "commons conflict": wgULS("维基共享中存在此文件名称不同的副本。", "維基共享中存在此檔名稱不同的副本。"),
        /////////////////////////////////////
        // user-related actions and info
        /////////////////////////////////////
        user: wgULS("用户", "使用者", null, null, "用戶"),
        ///// user page, talk, email, space
        "user&nbsp;page": wgULS("用户页", "使用者頁", null, null, "用戶頁"),
        "user talk": wgULS("用户讨论", "使用者對話", null, null, "用戶討論"),
        "edit user talk": wgULS("编辑用户讨论", "編輯使用者對話", null, null, "編輯用戶討論"),
        "leave comment": wgULS("留言", "留言"),
        email: wgULS("电邮", "電郵"),
        "email user": wgULS("电邮用户", "電郵使用者"),
        EmailuserHint: wgULS("给 %s 发送电子邮件", "給 %s 發送電子郵件"),
        space: wgULS("子页面", "子頁面"),
        // short form for userSpace link
        PrefixindexHint: wgULS("显示 %s 的用户页子页面", "顯示 %s 的使用者頁子頁面", null, null, "顯示 %s 的用戶頁子頁面"),
        count: wgULS("统计", "統計"),
        ///// contributions, tree, log
        "edit counter": wgULS("编辑次数", "編輯次數"),
        katelinkHint: wgULS("%s 的编辑次数", "%s 的編輯次數"),
        contribs: wgULS("贡献", "貢獻"),
        contributions: wgULS("贡献", "貢獻"),
        deletedContribs: wgULS("已删除的贡献", "已刪除的貢獻"),
        ContributionsHint: wgULS("%s 的用户贡献", "%s 的使用者貢獻", null, null, "%s 的用戶貢獻"),
        tree: wgULS("树", "樹"),
        contribsTreeHint: wgULS("根据名字空间查看 %s 的贡献", "根據命名空間檢視 %s 的貢獻"),
        log: wgULS("日志", "日誌"),
        "user log": wgULS("用户日志", "使用者日誌", null, null, "用戶日誌"),
        userLogHint: wgULS("显示 %s 的用户日志", "顯示 %s 的使用者日誌", null, null, "顯示 %s 的用戶日誌"),
        arin: wgULS("ARIN 查询", "ARIN 查詢"),
        ///// ARIN lookup, block user or IP
        "Look up %s in ARIN whois database": wgULS("在 ARIN Whois 数据库中查询 %s", "在 ARIN Whois 數據庫中查詢 %s"),
        unblockShort: wgULS("解除", "解除"),
        block: wgULS("封禁", "封鎖"),
        "block user": wgULS("封禁用户", "封鎖使用者", null, null, "封鎖用戶"),
        IpblocklistHint: wgULS("解封 %s", "解封 %s"),
        BlockipHint: wgULS("封禁 %s", "封鎖 %s"),
        "block log": wgULS("封禁日志", "封鎖日誌"),
        blockLogHint: wgULS("显示 %s 的封禁日志", "顯示 %s 的封鎖日誌"),
        protectLogHint: wgULS("显示 %s 的保护日志", "顯示 %s 的保護日誌"),
        pageLogHint: wgULS("显示 %s 的日志", "顯示 %s 的日誌"),
        deleteLogHint: wgULS("显示 %s 的删除日志", "顯示 %s 的刪除日誌"),
        "Invalid %s %s": wgULS("选项 %s 不可用：%s", "選項 %s 不可用：%s"),
        m: wgULS("小", "小"),
        /////////////////////////////////////
        // Autoediting
        /////////////////////////////////////
        "Enter a non-empty edit summary or press cancel to abort": wgULS("输入编辑摘要，或按取消中止操作", "輸入編輯摘要，或按取消中止操作"),
        "Failed to get revision information, please edit manually.\n\n": wgULS("获取修订版本信息失败，请手动修改。\n\n", "獲取修訂版本資訊失敗，請手動修改。\n\n"),
        "The %s button has been automatically clicked. Please wait for the next page to load.": wgULS("按钮 %s 已被自动点击，请等待下一个页面加载。", "按鈕 %s 已被自動點擊，請等待下一個頁面載入。"),
        "Could not find button %s. Please check the settings in your javascript file.": wgULS("找不到按钮 %s，请检查您 JavaScript 文件中的设置。", "找不到按鈕 %s，請檢查您 JavaScript 檔案中的設定。"),
        /////////////////////////////////////
        // Popups setup
        /////////////////////////////////////
        "Open full-size image": wgULS("查看全尺寸图像", "檢視全尺寸影像"),
        zxy: wgULS("zxy", "zxy"),
        /////////////////////////////////////
        // 以下内容由 [[User:AnnAngela]] 补正
        /////////////////////////////////////
        globalSearchHint: wgULS("在维基百科其他语言搜索“%s”", "在維基百科其他語言搜尋「%s」"),
        googleSearchHint: wgULS("在 Google 上搜索“%s”", "在 Google 上搜尋「%s」"),
        "enable previews": wgULS("启用预览", "啟用預覽"),
        "show preview": wgULS("禁用预览", "禁用預覽"),
        historyfeedHint: wgULS("该页面的近期更改 RSS feed", "該頁面的近期更改 RSS feed"),
        "send thanks": wgULS("发送感谢", "傳送感謝"),
        ThanksHint: wgULS("向该用户发送一封感谢消息", "向該使用者傳送一封感謝訊息"),
        "mark patrolled": wgULS("标记为已巡查", "標記為已巡查"),
        markpatrolledHint: wgULS("标记该编辑为已巡查", "標記該編輯為已巡查"),
        "Could not marked this edit as patrolled": wgULS("无法标记该编辑为已巡查", "無法標記該編輯為已巡查"),
        defaultpopupReviewedSummary: wgULS("标记从版本%s到%s间的编辑为已巡查", "標記從版本%s到%s間的編輯為已巡查"),
        "Image from Commons": wgULS("来自维基共享的图片", "來自維基共用的圖片"),
        "Description page": wgULS("图片描述页", "圖片描述頁"),
        "Alt text:": wgULS("替换文本（Alt）：", "替換文字（Alt）："),
        revdel: wgULS("历史版本被隐藏", "歷史版本被隱藏"),
        editCounterLinkHint: wgULS("用户%s的编辑次数", "使用者%s的編輯次數"),
        DeletedcontributionsHint: wgULS("用户%s的被删除编辑次数", "使用者%s的被刪除編輯次數"),
        "No backlinks found": wgULS("找不到链入页面", "找不到鏈入頁面"),
        " and more": wgULS("以及其他页面", "以及其他頁面"),
        "Download preview data": wgULS("下载预览数据", "下載預覽資料"),
        "Invalid or IP user": wgULS("错误的用户名或IP用户", "錯誤的使用者名稱或IP使用者"),
        "Not a registered username": wgULS("非已注册的用户", "非已註冊的使用者"),
        BLOCKED: wgULS("被封禁", "被封鎖"),
        "Has blocks": wgULS("被部分封禁", "被部分封鎖"),
        " edits since: ": wgULS("次编辑，注册日期为", "次編輯，註冊日期為"),
        "last edit on ": wgULS("最后一次编辑于", "最後一次編輯於"),
        EmailUserHint: wgULS("给 %s 发送电子邮件", "給 %s 發送電子郵件"),
        RANGEBLOCKED: wgULS("IP段被封禁", "IP段被封鎖"),
        "IP user": wgULS("IP用户", "IP使用者"),
        "♀": "♀",
        "♂": "♂",
        HIDDEN: wgULS("全域隐藏", "全域隱藏"),
        LOCKED: wgULS("全域锁定", "全域鎖定"),
        "Invalid user": wgULS("非法用户名", "非法使用者名稱"),
        diff: wgULS("差异", "差異"),
        " to ": wgULS("至", "至"),
        autoedit_version: "np20140416",
        PrefixIndexHint: wgULS("显示用户%s的子页面", "顯示使用者%s的子頁面", null, null, "顯示用戶%s的子頁面"),
        nullEditSummary: wgULS("进行一次零编辑", "進行一次零編輯"),
        // 用户组名称从系统消息获取
        "group-no-autoconfirmed": wgULS("非自动确认用户", "非自動確認使用者", null, null, "非自動確認用戶"),
        separator: "、",
        comma: "，"
    };
    var pg = {
        api: {},
        re: {},
        ns: {},
        string: {},
        wiki: {},
        user: {},
        misc: {},
        option: {},
        optionDefault: {},
        flag: {},
        cache: {},
        structures: {},
        timer: {},
        counter: {},
        current: {},
        fn: {},
        endoflist: null
    };
    if (window.pg && !(window.pg instanceof HTMLElement)) {
        return;
    }
    window.pg = pg;
    if (!mw.util.escapeRegExp) {
        mw.util.escapeRegExp = mw.RegExp.escape;
    }
    function setupTooltips(container, remove, force, popData) {
        log("setupTooltips, container=" + container + ", remove=" + remove);
        if (!container) {
            if (getValueOf("popupOnEditSelection") && document && document.editform && document.editform.wpTextbox1) {
                document.editform.wpTextbox1.onmouseup = doSelectionPopup;
            }
            container = defaultPopupsContainer();
        }
        if (!remove && !force && container.ranSetupTooltipsAlready) {
            return;
        }
        container.ranSetupTooltipsAlready = !remove;
        var anchors;
        anchors = container.getElementsByTagName("A");
        setupTooltipsLoop(anchors, 0, 250, 100, remove, popData);
    }
    function defaultPopupsContainer() {
        if (getValueOf("popupOnlyArticleLinks")) {
            return document.getElementById("mw_content") || document.getElementById("content") || document.getElementById("article") || document;
        }
        return document;
    }
    function setupTooltipsLoop(anchors, begin, howmany, sleep, remove, popData) {
        log(simplePrintf("setupTooltipsLoop(%s,%s,%s,%s,%s)", arguments));
        var finish = begin + howmany;
        var loopend = Math.min(finish, anchors.length);
        var j = loopend - begin;
        log("setupTooltips: anchors.length=" + anchors.length + ", begin=" + begin + ", howmany=" + howmany + ", loopend=" + loopend + ", remove=" + remove);
        var doTooltip = remove ? removeTooltip : addTooltip;
        if (j > 0) {
            do {
                var a = anchors[loopend - j];
                if (typeof a === "undefined" || !a || !a.href) {
                    log("got null anchor at index " + loopend - j);
                    continue;
                }
                doTooltip(a, popData);
            } while (--j);
        }
        if (finish < anchors.length) {
            setTimeout(function () {
                setupTooltipsLoop(anchors, finish, howmany, sleep, remove, popData);
            }, sleep);
        } else {
            if (!remove && !getValueOf("popupTocLinks")) {
                rmTocTooltips();
            }
            pg.flag.finishedLoading = true;
        }
    }
    function rmTocTooltips() {
        var toc = document.getElementById("toc");
        if (toc) {
            var tocLinks = toc.getElementsByTagName("A");
            var tocLen = tocLinks.length;
            for (var j = 0; j < tocLen; ++j) {
                removeTooltip(tocLinks[j], true);
            }
        }
    }
    function addTooltip(a, popData) {
        if (!isPopupLink(a)) {
            return;
        }
        a.onmouseover = mouseOverWikiLink;
        a.onmouseout = mouseOutWikiLink;
        a.onmousedown = killPopup;
        a.hasPopup = true;
        a.popData = popData;
    }
    function removeTooltip(a) {
        if (!a.hasPopup) {
            return;
        }
        a.onmouseover = null;
        a.onmouseout = null;
        if (a.originalTitle) {
            a.title = a.originalTitle;
        }
        a.hasPopup = false;
    }
    function removeTitle(a) {
        if (!a.originalTitle) {
            a.originalTitle = a.title;
        }
        a.title = "";
    }
    function restoreTitle(a) {
        if (a.title || !a.originalTitle) {
            return;
        }
        a.title = a.originalTitle;
    }
    function registerHooks(np) {
        var popupMaxWidth = getValueOf("popupMaxWidth");
        if (typeof popupMaxWidth === "number") {
            var setMaxWidth = function () {
                np.mainDiv.style.maxWidth = popupMaxWidth + "px";
                np.maxWidth = popupMaxWidth;
            };
            np.addHook(setMaxWidth, "unhide", "before");
        }
        np.addHook(addPopupShortcuts, "unhide", "after");
        np.addHook(rmPopupShortcuts, "hide", "before");
    }
    function removeModifierKeyHandler(a) {
        document.removeEventListener("keydown", a.modifierKeyHandler, false);
        document.removeEventListener("keyup", a.modifierKeyHandler, false);
    }
    function mouseOverWikiLink(evt) {
        if (!evt && window.event) {
            evt = window.event;
        }
        if (getValueOf("popupModifier")) {
            var action = getValueOf("popupModifierAction");
            var key = action == "disable" ? "keyup" : "keydown";
            var a = this;
            a.modifierKeyHandler = function (evt) {
                mouseOverWikiLink2(a, evt);
            };
            document.addEventListener(key, a.modifierKeyHandler, false);
        }
        return mouseOverWikiLink2(this, evt);
    }
    function footnoteTarget(a) {
        var aTitle = Title.fromAnchor(a);
        var anch = aTitle.anchor;
        if (!/^(cite_note-|_note-|endnote)/.test(anch)) {
            return false;
        }
        var lTitle = Title.fromURL(location.href);
        if (lTitle.toString(true) !== aTitle.toString(true)) {
            return false;
        }
        var el = document.getElementById(anch);
        while (el && typeof el.nodeName === "string") {
            var nt = el.nodeName.toLowerCase();
            if (nt === "li") {
                return el;
            } else if (nt === "body") {
                return false;
            } else if (el.parentNode) {
                el = el.parentNode;
            } else {
                return false;
            }
        }
        return false;
    }
    function footnotePreview(x, navpop) {
        setPopupHTML("<hr />" + x.innerHTML, "popupPreview", navpop.idNumber);
    }
    function modifierPressed(evt) {
        var mod = getValueOf("popupModifier");
        if (!mod) {
            return false;
        }
        if (!evt && window.event) {
            evt = window.event;
        }
        return evt && mod && evt[mod.toLowerCase() + "Key"];
    }
    function isCorrectModifier(a, evt) {
        if (!getValueOf("popupModifier")) {
            return true;
        }
        var action = getValueOf("popupModifierAction");
        return action == "enable" && modifierPressed(evt) || action == "disable" && !modifierPressed(evt);
    }
    function mouseOverWikiLink2(a, evt) {
        if (!isCorrectModifier(a, evt)) {
            return;
        }
        if (getValueOf("removeTitles")) {
            removeTitle(a);
        }
        if (a == pg.current.link && a.navpopup && a.navpopup.isVisible()) {
            return;
        }
        pg.current.link = a;
        if (getValueOf("simplePopups") && !pg.option.popupStructure) {
            setDefault("popupStructure", "original");
        }
        var article = new Title().fromAnchor(a);
        pg.current.article = article;
        if (!a.navpopup) {
            a.navpopup = newNavpopup(a, article);
            pg.current.linksHash[a.href] = a.navpopup;
            pg.current.links.push(a);
        }
        if (a.navpopup.pending === null || a.navpopup.pending !== 0) {
            simplePopupContent(a, article);
        }
        a.navpopup.showSoonIfStable(a.navpopup.delay);
        clearInterval(pg.timer.checkPopupPosition);
        pg.timer.checkPopupPosition = setInterval(checkPopupPosition, 600);
        if (getValueOf("simplePopups")) {
            if (getValueOf("popupPreviewButton") && !a.simpleNoMore) {
                var d = document.createElement("div");
                d.className = "popupPreviewButtonDiv";
                var s = document.createElement("span");
                d.appendChild(s);
                s.className = "popupPreviewButton";
                s["on" + getValueOf("popupPreviewButtonEvent")] = function () {
                    a.simpleNoMore = true;
                    d.style.display = "none";
                    nonsimplePopupContent(a, article);
                };
                s.innerHTML = popupString("show preview");
                setPopupHTML(d, "popupPreview", a.navpopup.idNumber);
            }
        }
        if (a.navpopup.pending !== 0) {
            nonsimplePopupContent(a, article);
        }
    }
    function simplePopupContent(a, article) {
        a.navpopup.hasPopupMenu = false;
        a.navpopup.setInnerHTML(popupHTML(a));
        fillEmptySpans({
            navpopup: a.navpopup
        });
        if (getValueOf("popupDraggable")) {
            var dragHandle = getValueOf("popupDragHandle") || null;
            if (dragHandle && dragHandle != "all") {
                dragHandle += a.navpopup.idNumber;
            }
            setTimeout(function () {
                a.navpopup.makeDraggable(dragHandle);
            }, 150);
        }
        if (getValueOf("popupRedlinkRemoval") && a.className == "new") {
            setPopupHTML("<br>" + popupRedlinkHTML(article), "popupRedlink", a.navpopup.idNumber);
        }
    }
    function debugData(navpopup) {
        if (getValueOf("popupDebugging") && navpopup.idNumber) {
            setPopupHTML("idNumber=" + navpopup.idNumber + ", pending=" + navpopup.pending, "popupError", navpopup.idNumber);
        }
    }
    function newNavpopup(a, article) {
        var navpopup = new Navpopup();
        navpopup.fuzz = 5;
        navpopup.delay = getValueOf("popupDelay") * 1e3;
        navpopup.idNumber = ++pg.idNumber;
        navpopup.parentAnchor = a;
        navpopup.parentPopup = a.popData && a.popData.owner;
        navpopup.article = article;
        registerHooks(navpopup);
        return navpopup;
    }
    function shouldShowNonSimple(a) {
        return !getValueOf("simplePopups") || a.simpleNoMore;
    }
    function shouldShow(a, option) {
        if (shouldShowNonSimple(a)) {
            return getValueOf(option);
        }
        return typeof window[option] != "undefined" && window[option];
    }
    function nonsimplePopupContent(a, article) {
        var diff = null,
            history = null;
        var params = parseParams(a.href);
        var oldid = typeof params.oldid == "undefined" ? null : params.oldid;
        if (shouldShow(a, "popupPreviewDiffs")) {
            diff = params.diff;
        }
        if (shouldShow(a, "popupPreviewHistory")) {
            history = params.action == "history";
        }
        a.navpopup.pending = 0;
        var referenceElement = footnoteTarget(a);
        if (referenceElement) {
            footnotePreview(referenceElement, a.navpopup);
        } else if (diff || diff === 0) {
            loadDiff(article, oldid, diff, a.navpopup);
        } else if (history) {
            loadAPIPreview("history", article, a.navpopup);
        } else if (shouldShowNonSimple(a) && pg.re.contribs.test(a.href)) {
            loadAPIPreview("contribs", article, a.navpopup);
        } else if (shouldShowNonSimple(a) && pg.re.backlinks.test(a.href)) {
            loadAPIPreview("backlinks", article, a.navpopup);
        } else if (article.namespaceId() == pg.nsImageId && (shouldShow(a, "imagePopupsForImages") || !anchorContainsImage(a))) {
            loadAPIPreview("imagepagepreview", article, a.navpopup);
            loadImage(article, a.navpopup);
        } else {
            if (article.namespaceId() == pg.nsCategoryId && shouldShow(a, "popupCategoryMembers")) {
                loadAPIPreview("category", article, a.navpopup);
            } else if ((article.namespaceId() == pg.nsUserId || article.namespaceId() == pg.nsUsertalkId) && shouldShow(a, "popupUserInfo")) {
                loadAPIPreview("userinfo", article, a.navpopup);
            }
            if (shouldShowNonSimple(a)) {
                startArticlePreview(article, oldid, a.navpopup);
            }
        }
    }
    function pendingNavpopTask(navpop) {
        if (navpop && navpop.pending === null) {
            navpop.pending = 0;
        }
        ++navpop.pending;
        debugData(navpop);
    }
    function completedNavpopTask(navpop) {
        if (navpop && navpop.pending) {
            --navpop.pending;
        }
        debugData(navpop);
    }
    function startArticlePreview(article, oldid, navpop) {
        navpop.redir = 0;
        loadPreview(article, oldid, navpop);
    }
    function loadPreview(article, oldid, navpop) {
        if (!navpop.redir) {
            navpop.originalArticle = article;
        }
        article.oldid = oldid;
        loadAPIPreview("revision", article, navpop);
    }
    function loadPreviewFromRedir(redirMatch, navpop) {
        var target = new Title().fromWikiText(redirMatch[2]);
        if (navpop.article.anchor) {
            target.anchor = navpop.article.anchor;
        }
        navpop.redir++;
        navpop.redirTarget = target;
        var warnRedir = redirLink(target, navpop.article);
        setPopupHTML(warnRedir, "popupWarnRedir", navpop.idNumber);
        navpop.article = target;
        fillEmptySpans({
            redir: true,
            redirTarget: target,
            navpopup: navpop
        });
        return loadPreview(target, null, navpop);
    }
    function insertPreview(download) {
        if (!download.owner) {
            return;
        }
        var redirMatch = pg.re.redirect.exec(download.data);
        if (download.owner.redir === 0 && redirMatch) {
            loadPreviewFromRedir(redirMatch, download.owner);
            return;
        }
        if (download.owner.visible || !getValueOf("popupLazyPreviews")) {
            insertPreviewNow(download);
        } else {
            var id = download.owner.redir ? "PREVIEW_REDIR_HOOK" : "PREVIEW_HOOK";
            download.owner.addHook(function () {
                insertPreviewNow(download);
                return true;
            }, "unhide", "after", id);
        }
    }
    function insertPreviewNow(download) {
        if (!download.owner) {
            return;
        }
        var wikiText = download.data;
        var navpop = download.owner;
        var art = navpop.redirTarget || navpop.originalArticle;
        makeFixDabs(wikiText, navpop);
        if (getValueOf("popupSummaryData")) {
            getPageInfo(wikiText, download);
            setPopupTrailer(getPageInfo(wikiText, download), navpop.idNumber);
        }
        var imagePage = "";
        if (art.namespaceId() == pg.nsImageId) {
            imagePage = art.toString();
        } else {
            imagePage = getValidImageFromWikiText(wikiText);
        }
        if (imagePage) {
            loadImage(Title.fromWikiText(imagePage), navpop);
        }
        if (getValueOf("popupPreviews")) {
            insertArticlePreview(download, art, navpop);
        }
    }
    function insertArticlePreview(download, art, navpop) {
        if (download && typeof download.data == typeof "") {
            if (art.namespaceId() == pg.nsTemplateId && getValueOf("popupPreviewRawTemplates")) {
                var h = '<hr /><span style="font-family: monospace;">' + download.data.entify().split("\\n").join("<br />\\n") + "</span>";
                setPopupHTML(h, "popupPreview", navpop.idNumber);
            } else {
                var p = prepPreviewmaker(download.data, art, navpop);
                p.showPreview();
            }
        }
    }
    function prepPreviewmaker(data, article, navpop) {
        var d = anchorize(data, article.anchorString());
        var urlBase = joinPath([pg.wiki.articlebase, article.urlString()]);
        var p = new Previewmaker(d, urlBase, navpop);
        return p;
    }
    function anchorize(d, anch) {
        if (!anch) {
            return d;
        }
        var anchRe = RegExp("(?:=+\\s*" + literalizeRegex(anch).replace(/[_ ]/g, "[_ ]") + "\\s*=+|\\{\\{\\s*" + getValueOf("popupAnchorRegexp") + "\\s*(?:\\|[^|}]*)*?\\s*" + literalizeRegex(anch) + "\\s*(?:\\|[^}]*)?}})");
        var match = d.match(anchRe);
        if (match && match.length > 0 && match[0]) {
            return d.substring(d.indexOf(match[0]));
        }
        var lines = d.split("\n");
        for (var i = 0; i < lines.length; ++i) {
            lines[i] = lines[i].replace(RegExp("[[]{2}([^|\\]]*?[|])?(.*?)[\\]]{2}", "g"), "$2").replace(/'''([^'])/g, "$1").replace(RegExp("''([^'])", "g"), "$1");
            if (lines[i].match(anchRe)) {
                return d.split("\n").slice(i).join("\n").replace(RegExp("^[^=]*"), "");
            }
        }
        return d;
    }
    function killPopup() {
        removeModifierKeyHandler(this);
        if (getValueOf("popupShortcutKeys")) {
            rmPopupShortcuts();
        }
        if (!pg) {
            return;
        }
        if (pg.current.link && pg.current.link.navpopup) {
            pg.current.link.navpopup.banish();
        }
        pg.current.link = null;
        abortAllDownloads();
        if (pg.timer.checkPopupPosition) {
            clearInterval(pg.timer.checkPopupPosition);
            pg.timer.checkPopupPosition = null;
        }
        return true;
    }
    function Drag() {
        this.startCondition = null;
        this.endHook = null;
    }
    Drag.prototype.fixE = function (e) {
        if (typeof e == "undefined") {
            e = window.event;
        }
        if (typeof e.layerX == "undefined") {
            e.layerX = e.offsetX;
        }
        if (typeof e.layerY == "undefined") {
            e.layerY = e.offsetY;
        }
        return e;
    };
    Drag.prototype.init = function (o, oRoot) {
        var dragObj = this;
        this.obj = o;
        o.onmousedown = function (e) {
            dragObj.start.apply(dragObj, [e]);
        };
        o.dragging = false;
        o.popups_draggable = true;
        o.hmode = true;
        o.vmode = true;
        o.root = oRoot ? oRoot : o;
        if (isNaN(parseInt(o.root.style.left, 10))) {
            o.root.style.left = "0px";
        }
        if (isNaN(parseInt(o.root.style.top, 10))) {
            o.root.style.top = "0px";
        }
        o.root.onthisStart = function () {
        };
        o.root.onthisEnd = function () {
        };
        o.root.onthis = function () {
        };
    };
    Drag.prototype.start = function (e) {
        var o = this.obj;
        e = this.fixE(e);
        if (this.startCondition && !this.startCondition(e)) {
            return;
        }
        var y = parseInt(o.vmode ? o.root.style.top : o.root.style.bottom, 10);
        var x = parseInt(o.hmode ? o.root.style.left : o.root.style.right, 10);
        o.root.onthisStart(x, y);
        o.lastMouseX = e.clientX;
        o.lastMouseY = e.clientY;
        var dragObj = this;
        o.onmousemoveDefault = document.onmousemove;
        o.dragging = true;
        document.onmousemove = function (e) {
            dragObj.drag.apply(dragObj, [e]);
        };
        document.onmouseup = function (e) {
            dragObj.end.apply(dragObj, [e]);
        };
        return false;
    };
    Drag.prototype.drag = function (e) {
        e = this.fixE(e);
        var o = this.obj;
        var ey = e.clientY;
        var ex = e.clientX;
        var y = parseInt(o.vmode ? o.root.style.top : o.root.style.bottom, 10);
        var x = parseInt(o.hmode ? o.root.style.left : o.root.style.right, 10);
        var nx, ny;
        nx = x + (ex - o.lastMouseX) * (o.hmode ? 1 : -1);
        ny = y + (ey - o.lastMouseY) * (o.vmode ? 1 : -1);
        this.obj.root.style[o.hmode ? "left" : "right"] = nx + "px";
        this.obj.root.style[o.vmode ? "top" : "bottom"] = ny + "px";
        this.obj.lastMouseX = ex;
        this.obj.lastMouseY = ey;
        this.obj.root.onthis(nx, ny);
        return false;
    };
    Drag.prototype.end = function () {
        document.onmousemove = this.obj.onmousemoveDefault;
        document.onmouseup = null;
        this.obj.dragging = false;
        if (this.endHook) {
            this.endHook(parseInt(this.obj.root.style[this.obj.hmode ? "left" : "right"], 10), parseInt(this.obj.root.style[this.obj.vmode ? "top" : "bottom"], 10));
        }
    };
    pg.structures.original = {};
    pg.structures.original.popupLayout = function () {
        return ["popupError", "popupImage", "popupTopLinks", "popupTitle", "popupUserData", "popupData", "popupOtherLinks", "popupRedir", ["popupWarnRedir", "popupRedirTopLinks", "popupRedirTitle", "popupRedirData", "popupRedirOtherLinks"], "popupMiscTools", ["popupRedlink"], "popupPrePreviewSep", "popupPreview", "popupSecondPreview", "popupPreviewMore", "popupPostPreview", "popupFixDab"];
    };
    pg.structures.original.popupRedirSpans = function () {
        return ["popupRedir", "popupWarnRedir", "popupRedirTopLinks", "popupRedirTitle", "popupRedirData", "popupRedirOtherLinks"];
    };
    pg.structures.original.popupTitle = function (x) {
        log("defaultstructure.popupTitle");
        if (!getValueOf("popupNavLinks")) {
            return navlinkStringToHTML("<b><<mainlink>></b>", x.article, x.params);
        }
        return "";
    };
    pg.structures.original.popupTopLinks = function (x) {
        log("defaultstructure.popupTopLinks");
        if (getValueOf("popupNavLinks")) {
            return navLinksHTML(x.article, x.hint, x.params);
        }
        return "";
    };
    pg.structures.original.popupImage = function (x) {
        log("original.popupImage, x.article=" + x.article + ", x.navpop.idNumber=" + x.navpop.idNumber);
        return imageHTML(x.article, x.navpop.idNumber);
    };
    pg.structures.original.popupRedirTitle = pg.structures.original.popupTitle;
    pg.structures.original.popupRedirTopLinks = pg.structures.original.popupTopLinks;
    function copyStructure(oldStructure, newStructure) {
        pg.structures[newStructure] = {};
        for (var prop in pg.structures[oldStructure]) {
            pg.structures[newStructure][prop] = pg.structures[oldStructure][prop];
        }
    }
    copyStructure("original", "nostalgia");
    pg.structures.nostalgia.popupTopLinks = function (x) {
        var str = "";
        str += "<b><<mainlink|shortcut= >></b>";
        str += "if(user){<br><<contribs|shortcut=c>>";
        str += "if(wikimedia){*<<count|shortcut=#>>}";
        str += "if(ipuser){}else{*<<email|shortcut=E>>}if(admin){*<<block|shortcut=b>>}}";
        var editstr = "<<edit|shortcut=e>>";
        var editOldidStr = "if(oldid){<<editOld|shortcut=e>>|<<revert|shortcut=v|rv>>|<<edit|cur>>}else{" + editstr + "}";
        var historystr = "<<history|shortcut=h>>";
        var watchstr = "<<unwatch|unwatchShort>>|<<watch|shortcut=w|watchThingy>>";
        str += "<br>if(talk){" + editOldidStr + "|<<new|shortcut=+>>" + "*" + historystr + "*" + watchstr + "*" + "<b><<article|shortcut=a>></b>|<<editArticle|edit>>" + "}else{" + editOldidStr + "*" + historystr + "*" + watchstr + "*" + "<b><<talk|shortcut=t>></b>|<<editTalk|edit>>|<<newTalk|shortcut=+|new>>}";
        str += "<br><<whatLinksHere|shortcut=l>>*<<relatedChanges|shortcut=r>>";
        str += "if(admin){<br>}else{*}<<move|shortcut=m>>";
        str += "if(admin){*<<unprotect|unprotectShort>>|<<protect|shortcut=p>>*" + "<<undelete|undeleteShort>>|<<delete|shortcut=d>>}";
        return navlinkStringToHTML(str, x.article, x.params);
    };
    pg.structures.nostalgia.popupRedirTopLinks = pg.structures.nostalgia.popupTopLinks;
    copyStructure("original", "fancy");
    pg.structures.fancy.popupTitle = function (x) {
        return navlinkStringToHTML("<font size=+0><<mainlink>></font>", x.article, x.params);
    };
    pg.structures.fancy.popupTopLinks = function (x) {
        var hist = "<<history|shortcut=h|hist>>|<<lastEdit|shortcut=/|last>>|<<editors|shortcut=E|eds>>";
        var watch = "<<unwatch|unwatchShort>>|<<watch|shortcut=w|watchThingy>>";
        var move = "<<move|shortcut=m|move>>";
        return navlinkStringToHTML("if(talk){" + "<<edit|shortcut=e>>|<<new|shortcut=+|+>>*" + hist + "*" + "<<article|shortcut=a>>|<<editArticle|edit>>" + "*" + watch + "*" + move + "}else{<<edit|shortcut=e>>*" + hist + "*<<talk|shortcut=t|>>|<<editTalk|edit>>|<<newTalk|shortcut=+|new>>" + "*" + watch + "*" + move + "}<br>", x.article, x.params);
    };
    pg.structures.fancy.popupOtherLinks = function (x) {
        var admin = "<<unprotect|unprotectShort>>|<<protect|shortcut=p>>*<<undelete|undeleteShort>>|<<delete|shortcut=d|del>>";
        var user = "<<contribs|shortcut=c>>if(wikimedia){|<<count|shortcut=#|#>>}";
        user += "if(ipuser){|<<arin>>}else{*<<email|shortcut=E|" + popupString("email") + ">>}if(admin){*<<block|shortcut=b>>}";
        var normal = "<<whatLinksHere|shortcut=l|links here>>*<<relatedChanges|shortcut=r|related>>";
        return navlinkStringToHTML("<br>if(user){" + user + "*}if(admin){" + admin + "if(user){<br>}else{*}}" + normal, x.article, x.params);
    };
    pg.structures.fancy.popupRedirTitle = pg.structures.fancy.popupTitle;
    pg.structures.fancy.popupRedirTopLinks = pg.structures.fancy.popupTopLinks;
    pg.structures.fancy.popupRedirOtherLinks = pg.structures.fancy.popupOtherLinks;
    copyStructure("fancy", "fancy2");
    pg.structures.fancy2.popupTopLinks = function (x) {
        return "<br>" + pg.structures.fancy.popupTopLinks(x).replace(RegExp("<br>$", "i"), "");
    };
    pg.structures.fancy2.popupLayout = function () {
        return ["popupError", "popupImage", "popupTitle", "popupUserData", "popupData", "popupTopLinks", "popupOtherLinks", "popupRedir", ["popupWarnRedir", "popupRedirTopLinks", "popupRedirTitle", "popupRedirData", "popupRedirOtherLinks"], "popupMiscTools", ["popupRedlink"], "popupPrePreviewSep", "popupPreview", "popupSecondPreview", "popupPreviewMore", "popupPostPreview", "popupFixDab"];
    };
    copyStructure("original", "menus");
    pg.structures.menus.popupLayout = function () {
        return ["popupError", "popupImage", "popupTopLinks", "popupTitle", "popupOtherLinks", "popupRedir", ["popupWarnRedir", "popupRedirTopLinks", "popupRedirTitle", "popupRedirData", "popupRedirOtherLinks"], "popupUserData", "popupData", "popupMiscTools", ["popupRedlink"], "popupPrePreviewSep", "popupPreview", "popupSecondPreview", "popupPreviewMore", "popupPostPreview", "popupFixDab"];
    };
    pg.structures.menus.popupTopLinks = function (x, shorter) {
        var s = [];
        var dropdiv = '<div class="popup_drop">';
        var enddiv = "</div>";
        var hist = "<<history|shortcut=h>>";
        if (!shorter) {
            hist = "<menurow>" + hist + "|<<historyfeed|rss>>|<<editors|shortcut=E>></menurow>";
        }
        var lastedit = "<<lastEdit|shortcut=/|show last edit>>";
        var thank = "if(diff){<<thank|send thanks>>}";
        var jsHistory = "<<lastContrib|last set of edits>><<sinceMe|changes since mine>>";
        var linkshere = "<<whatLinksHere|shortcut=l|what links here>>";
        var related = "<<relatedChanges|shortcut=r|related changes>>";
        var search = "<menurow><<search|shortcut=s>>if(wikimedia){|<<globalsearch|shortcut=g|global>>}" + "|<<google|shortcut=G|web>></menurow>";
        var watch = "<menurow><<unwatch|unwatchShort>>|<<watch|shortcut=w|watchThingy>></menurow>";
        var protect = "<menurow><<unprotect|unprotectShort>>|" + "<<protect|shortcut=p>>|<<protectlog|log>></menurow>";
        var del = "<menurow><<undelete|undeleteShort>>|<<delete|shortcut=d>>|" + "<<deletelog|log>></menurow>";
        var move = "<<move|shortcut=m|move page>>";
        var nullPurge = "<menurow><<nullEdit|shortcut=n|null edit>>|<<purge|shortcut=P>></menurow>";
        var viewOptions = "<menurow><<view|shortcut=v>>|<<render|shortcut=S>>|<<raw>></menurow>";
        var editRow = "if(oldid){" + "<menurow><<edit|shortcut=e>>|<<editOld|shortcut=e|this&nbsp;revision>></menurow>" + "<menurow><<revert|shortcut=v>>|<<undo>></menurow>" + "}else{<<edit|shortcut=e>>}";
        var markPatrolled = "if(rcid){<<markpatrolled|mark patrolled>>}";
        var newTopic = "if(talk){<<new|shortcut=+|new topic>>}";
        var protectDelete = "if(admin){" + protect + del + "}";
        if (getValueOf("popupActionsMenu")) {
            s.push("<<mainlink>>*" + dropdiv + menuTitle("actions"));
        } else {
            s.push(dropdiv + "<<mainlink>>");
        }
        s.push("<menu>");
        s.push(editRow + markPatrolled + newTopic + hist + lastedit + thank);
        if (!shorter) {
            s.push(jsHistory);
        }
        s.push(move + linkshere + related);
        if (!shorter) {
            s.push(nullPurge + search);
        }
        if (!shorter) {
            s.push(viewOptions);
        }
        s.push("<hr />" + watch + protectDelete);
        s.push("<hr />" + "if(talk){<<article|shortcut=a|view article>><<editArticle|edit article>>}" + "else{<<talk|shortcut=t|talk page>><<editTalk|edit talk>>" + "<<newTalk|shortcut=+|new topic>>}</menu>" + enddiv);
        var email = "<<email|shortcut=E|email user>>";
        var contribs = "if(wikimedia){<menurow>}<<contribs|shortcut=c|contributions>>if(wikimedia){</menurow>}" + "if(admin){<menurow><<deletedContribs>></menurow>}";
        s.push("if(user){*" + dropdiv + menuTitle("user"));
        s.push("<menu>");
        s.push("<menurow><<userPage|shortcut=u|user&nbsp;page>>|<<userSpace|space>></menurow>");
        s.push("<<userTalk|shortcut=t|user talk>><<editUserTalk|edit user talk>>" + "<<newUserTalk|shortcut=+|leave comment>>");
        if (!shorter) {
            s.push("if(ipuser){<<arin>>}else{" + email + "}");
        } else {
            s.push("if(ipuser){}else{" + email + "}");
        }
        s.push("<hr />" + contribs + "<<userlog|shortcut=L|user log>>");
        s.push("if(wikimedia){<<count|shortcut=#|edit counter>>}");
        s.push("if(admin){<menurow><<unblock|unblockShort>>|<<block|shortcut=b|block user>></menurow>}");
        s.push("<<blocklog|shortcut=B|block log>>");
        s.push("</menu>" + enddiv + "}");
        if (getValueOf("popupSetupMenu") && !x.navpop.hasPopupMenu) {
            x.navpop.hasPopupMenu = true;
            s.push("*" + dropdiv + menuTitle("popupsMenu") + "<menu>");
            s.push("<<togglePreviews|toggle previews>>");
            s.push("<<purgePopups|reset>>");
            s.push("<<disablePopups|disable>>");
            s.push("</menu>" + enddiv);
        }
        return navlinkStringToHTML(s.join(""), x.article, x.params);
    };
    function menuTitle(s) {
        return '<a href="#" noPopup=1>' + popupString(s) + "</a>";
    }
    pg.structures.menus.popupRedirTitle = pg.structures.menus.popupTitle;
    pg.structures.menus.popupRedirTopLinks = pg.structures.menus.popupTopLinks;
    copyStructure("menus", "shortmenus");
    pg.structures.shortmenus.popupTopLinks = function (x) {
        return pg.structures.menus.popupTopLinks(x, true);
    };
    pg.structures.shortmenus.popupRedirTopLinks = pg.structures.shortmenus.popupTopLinks;
    pg.structures.lite = {};
    pg.structures.lite.popupLayout = function () {
        return ["popupTitle", "popupPreview"];
    };
    pg.structures.lite.popupTitle = function (x) {
        log(x.article + ": structures.lite.popupTitle");
        return '<div><span class="popup_mainlink"><b>' + x.article.toString() + "</b></span></div>";
    };
    function substitute(data, cmdBody) {
        var fromRe = RegExp(cmdBody.from, cmdBody.flags);
        return data.replace(fromRe, cmdBody.to);
    }
    function execCmds(data, cmdList) {
        for (var i = 0; i < cmdList.length; ++i) {
            data = cmdList[i].action(data, cmdList[i]);
        }
        return data;
    }
    function parseCmd(str) {
        if (!str.length) {
            return [];
        }
        var p = false;
        switch (str.charAt(0)) {
            case "s":
                p = parseSubstitute(str);
                break;
            default:
                return false;
        }
        if (p) {
            return [p].concat(parseCmd(p.remainder));
        }
        return false;
    }
    function unEscape(str, sep) {
        return str.split("\\\\").join("\\").split("\\" + sep).join(sep).split("\\n").join("\n");
    }
    function parseSubstitute(str) {
        var from, to, flags, tmp;
        if (str.length < 4) {
            return false;
        }
        var sep = str.charAt(1);
        str = str.substring(2);
        tmp = skipOver(str, sep);
        if (tmp) {
            from = tmp.segment;
            str = tmp.remainder;
        } else {
            return false;
        }
        tmp = skipOver(str, sep);
        if (tmp) {
            to = tmp.segment;
            str = tmp.remainder;
        } else {
            return false;
        }
        flags = "";
        if (str.length) {
            tmp = skipOver(str, ";") || skipToEnd(str, ";");
            if (tmp) {
                flags = tmp.segment;
                str = tmp.remainder;
            }
        }
        return {
            action: substitute,
            from: from,
            to: to,
            flags: flags,
            remainder: str
        };
    }
    function skipOver(str, sep) {
        var endSegment = findNext(str, sep);
        if (endSegment < 0) {
            return false;
        }
        var segment = unEscape(str.substring(0, endSegment), sep);
        return {
            segment: segment,
            remainder: str.substring(endSegment + 1)
        };
    }
    function skipToEnd(str, sep) {
        return {
            segment: str,
            remainder: ""
        };
    }
    function findNext(str, ch) {
        for (var i = 0; i < str.length; ++i) {
            if (str.charAt(i) == "\\") {
                i += 2;
            }
            if (str.charAt(i) == ch) {
                return i;
            }
        }
        return -1;
    }
    function setCheckbox(param, box) {
        var val = mw.util.getParamValue(param);
        if (val) {
            switch (val) {
                case "1":
                case "yes":
                case "true":
                    box.checked = true;
                    break;
                case "0":
                case "no":
                case "false":
                    box.checked = false;
            }
        }
    }
    function autoEdit() {
        if (!document.editform) {
            return false;
        }
        if (/Popups/.test(mw.util.getParamValue("wpChangeTags"))) {
            var wpChangeTags = document.createElement("input");
            wpChangeTags.type = "hidden";
            wpChangeTags.name = "wpChangeTags";
            wpChangeTags.value = "Popups";
            document.editform.append(wpChangeTags);
            document.editform.action += "&wpChangeTags=Popups";
            if (mw.util.getParamValue("autoclick") === "wpSave") {
                wpChangeTags.value += ",Automation tool";
                document.editform.action += "%2CAutomation%20tool";
            }
        }
        setupPopups(function () {
            if (mw.util.getParamValue("autoimpl") !== popupString("autoedit_version")) {
                return false;
            }
            if (mw.util.getParamValue("autowatchlist") && mw.util.getParamValue("actoken") === autoClickToken()) {
                pg.fn.modifyWatchlist(mw.util.getParamValue("title"), mw.util.getParamValue("action"));
            }
            if (autoEdit.alreadyRan) {
                return false;
            }
            autoEdit.alreadyRan = true;
            var cmdString = mw.util.getParamValue("autoedit");
            if (cmdString) {
                try {
                    var editbox = document.editform.wpTextbox1;
                    var cmdList = parseCmd(cmdString);
                    var input = editbox.value;
                    var output = execCmds(input, cmdList);
                    editbox.value = output;
                } catch (dang) {
                    return;
                }
                if (typeof wikEdUseWikEd != "undefined") {
                    if (wikEdUseWikEd === true) {
                        WikEdUpdateFrame();
                    }
                }
            }
            setCheckbox("autominor", document.editform.wpMinoredit);
            setCheckbox("autowatch", document.editform.wpWatchthis);
            var rvid = mw.util.getParamValue("autorv");
            if (rvid) {
                var url = pg.wiki.apiwikibase + "?action=query&format=json&formatversion=2&prop=revisions&revids=" + rvid;
                startDownload(url, null, autoEdit2);
            } else {
                autoEdit2();
            }
        });
    }
    function autoEdit2(d) {
        var summary = mw.util.getParamValue("autosummary");
        var summaryprompt = mw.util.getParamValue("autosummaryprompt");
        var summarynotice = "";
        if (d && d.data && mw.util.getParamValue("autorv")) {
            var s = getRvSummary(summary, d.data);
            if (s === false) {
                summaryprompt = true;
                summarynotice = popupString("Failed to get revision information, please edit manually.\n\n");
                summary = simplePrintf(summary, [mw.util.getParamValue("autorv"), "(unknown)", "(unknown)"]);
            } else {
                summary = s;
            }
        }
        if (summaryprompt) {
            var txt = summarynotice + popupString("Enter a non-empty edit summary or press cancel to abort");
            var response = prompt(txt, summary);
            if (response) {
                summary = response;
            } else {
                return;
            }
        }
        if (summary) {
            document.editform.wpSummary.value = summary;
        }
        setTimeout(autoEdit3, 100);
    }
    function autoClickToken() {
        return mw.user.sessionId();
    }
    function autoEdit3() {
        if (mw.util.getParamValue("actoken") != autoClickToken()) {
            return;
        }
        var btn = mw.util.getParamValue("autoclick");
        if (btn) {
            if (document.editform && document.editform[btn]) {
                var button = document.editform[btn];
                var msg = tprintf("The %s button has been automatically clicked. Please wait for the next page to load.", [button.value]);
                bannerMessage(msg);
                document.title = "(" + document.title + ")";
                button.click();
            } else {
                alert(tprintf("Could not find button %s. Please check the settings in your javascript file.", [btn]));
            }
        }
    }
    function bannerMessage(s) {
        var headings = document.getElementsByTagName("h1");
        if (headings) {
            var div = document.createElement("div");
            div.innerHTML = "<font size=+1><b>" + s + "</b></font>";
            headings[0].parentNode.insertBefore(div, headings[0]);
        }
    }
    function getRvSummary(template, json) {
        try {
            var o = getJsObj(json);
            var edit = anyChild(o.query.pages).revisions[0];
            var timestamp = edit.timestamp.split(/[A-Z]/g).join(" ").replace(/^ *| *$/g, "");
            return simplePrintf(template, [edit.revid, timestamp, edit.userhidden ? "(hidden)" : edit.user]);
        } catch (badness) {
            return false;
        }
    }
    function Downloader(url) {
        if (typeof XMLHttpRequest != "undefined") {
            this.http = new XMLHttpRequest();
        }
        this.url = url;
        this.id = null;
        this.lastModified = null;
        this.callbackFunction = null;
        this.onFailure = null;
        this.aborted = false;
        this.method = "GET";
        this.async = true;
    }
    new Downloader();
    Downloader.prototype.send = function (x) {
        if (!this.http) {
            return null;
        }
        return this.http.send(x);
    };
    Downloader.prototype.abort = function () {
        if (!this.http) {
            return null;
        }
        this.aborted = true;
        return this.http.abort();
    };
    Downloader.prototype.getData = function () {
        if (!this.http) {
            return null;
        }
        return this.http.responseText;
    };
    Downloader.prototype.setTarget = function () {
        if (!this.http) {
            return null;
        }
        this.http.open(this.method, this.url, this.async);
        this.http.setRequestHeader("Api-User-Agent", pg.api.userAgent);
    };
    Downloader.prototype.getReadyState = function () {
        if (!this.http) {
            return null;
        }
        return this.http.readyState;
    };
    pg.misc.downloadsInProgress = {};
    Downloader.prototype.start = function () {
        if (!this.http) {
            return;
        }
        pg.misc.downloadsInProgress[this.id] = this;
        this.http.send(null);
    };
    Downloader.prototype.getLastModifiedDate = function () {
        if (!this.http) {
            return null;
        }
        var lastmod = null;
        try {
            lastmod = this.http.getResponseHeader("Last-Modified");
        } catch (err) {
        }
        if (lastmod) {
            return new Date(lastmod);
        }
        return null;
    };
    Downloader.prototype.setCallback = function (f) {
        if (!this.http) {
            return;
        }
        this.http.onreadystatechange = f;
    };
    Downloader.prototype.getStatus = function () {
        if (!this.http) {
            return null;
        }
        return this.http.status;
    };
    function newDownload(url, id, callback, onfailure) {
        var d = new Downloader(url);
        if (!d.http) {
            return "ohdear";
        }
        d.id = id;
        d.setTarget();
        if (!onfailure) {
            onfailure = 2;
        }
        var f = function () {
            if (d.getReadyState() == 4) {
                delete pg.misc.downloadsInProgress[this.id];
                try {
                    if (d.getStatus() == 200) {
                        d.data = d.getData();
                        d.lastModified = d.getLastModifiedDate();
                        callback(d);
                    } else if (typeof onfailure == typeof 1) {
                        if (onfailure > 0) {
                            newDownload(url, id, callback, onfailure - 1);
                        }
                    } else if (typeof onfailure === "function") {
                        onfailure(d, url, id, callback);
                    }
                } catch (somerr) {
                }
            }
        };
        d.setCallback(f);
        return d;
    }
    function fakeDownload(url, id, callback, data, lastModified, owner) {
        var d = newDownload(url, callback);
        d.owner = owner;
        d.id = id;
        d.data = data;
        d.lastModified = lastModified;
        return callback(d);
    }
    function startDownload(url, id, callback) {
        var d = newDownload(url, id, callback);
        if (typeof d == typeof "") {
            return d;
        }
        d.start();
        return d;
    }
    function abortAllDownloads() {
        for (var x in pg.misc.downloadsInProgress) {
            try {
                pg.misc.downloadsInProgress[x].aborted = true;
                pg.misc.downloadsInProgress[x].abort();
                delete pg.misc.downloadsInProgress[x];
            } catch (e) {
            }
        }
    }
    var Insta = {};
    function setupLivePreview() {
        Insta.conf = {
            baseUrl: "",
            user: {},
            wiki: {
                lang: pg.wiki.lang,
                interwiki: pg.wiki.interwiki,
                default_thumb_width: 180
            },
            paths: {
                articles: pg.wiki.articlePath + "/",
                math: "/math/",
                images: "//upload.wikimedia.org/wikipedia/en/",
                images_fallback: "//upload.wikimedia.org/wikipedia/commons/"
            },
            locale: {
                user: mw.config.get("wgFormattedNamespaces")[pg.nsUserId],
                image: mw.config.get("wgFormattedNamespaces")[pg.nsImageId],
                category: mw.config.get("wgFormattedNamespaces")[pg.nsCategoryId],
                months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            }
        };
        Insta.conf.user.name = Insta.conf.user.name || "Wikipedian";
        Insta.conf.user.signature = "[[" + Insta.conf.locale.user + ":" + Insta.conf.user.name + "|" + Insta.conf.user.name + "]]";
        Insta.BLOCK_IMAGE = new RegExp("^\\[\\[(?:File|Image|" + Insta.conf.locale.image + "):.*?\\|.*?(?:frame|thumbnail|thumb|none|right|left|center)", "i");
    }
    Insta.dump = function (from, to) {
        if (typeof from == "string") {
            from = document.getElementById(from);
        }
        if (typeof to == "string") {
            to = document.getElementById(to);
        }
        to.innerHTML = this.convert(from.value);
    };
    Insta.convert = function (wiki) {
        var ll = typeof wiki == "string" ? wiki.replace(/\r/g, "").split(/\n/) : wiki,
            o = "",
            p = 0,
            r;
        function remain() {
            return ll.length;
        }
        function sh() {
            return ll.shift();
        }
        function ps(s) {
            o += s;
        }
        function f() {
            var i = 1,
                a = arguments,
                f = a[0],
                o = "",
                c, p;
            for (; i < a.length; i++) {
                if ((p = f.indexOf("?")) + 1) {
                    i -= c = f.charAt(p + 1) == "?" ? 1 : 0;
                    o += f.substring(0, p) + (c ? "?" : a[i]);
                    f = f.substr(p + 1 + c);
                } else {
                    break;
                }
            }
            return o + f;
        }
        function html_entities(s) {
            return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
        function htmlescape_text(s) {
            return s.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/:/g, "&#58;").replace(/\[/g, "&#91;").replace(/]/g, "&#93;");
        }
        function htmlescape_attr(s) {
            return htmlescape_text(s).replace(/'/g, "&#39;").replace(/"/g, "&quot;");
        }
        function str_imatch(a, b) {
            for (var i = 0, l = Math.min(a.length, b.length); i < l; i++) {
                if (a.charAt(i) != b.charAt(i)) {
                    break;
                }
            }
            return i;
        }
        function compareLineStringOrReg(c) {
            return typeof c == "string" ? ll[0] && ll[0].substr(0, c.length) == c : r = ll[0] && ll[0].match(c);
        }
        function compareLineString(c) {
            return ll[0] == c;
        }
        function charAtPoint(p) {
            return ll[0].charAt(p);
        }
        function endl(s) {
            ps(s);
            sh();
        }
        function parse_list() {
            var prev = "";
            while (remain() && compareLineStringOrReg(/^([*#:;]+)(.*)$/)) {
                var l_match = r;
                sh();
                var ipos = str_imatch(prev, l_match[1]);
                for (var prevPos = prev.length - 1; prevPos >= ipos; prevPos--) {
                    var pi = prev.charAt(prevPos);
                    if (pi == "*") {
                        ps("</ul>");
                    } else if (pi == "#") {
                        ps("</ol>");
                    } else if (compareLineStringOrReg.inArray(l_match[1].charAt(prevPos), ["", "*", "#"])) {
                        ps("</dl>");
                    }
                }
                for (var matchPos = ipos; matchPos < l_match[1].length; matchPos++) {
                    var li = l_match[1].charAt(matchPos);
                    if (li == "*") {
                        ps("<ul>");
                    } else if (li == "#") {
                        ps("<ol>");
                    } else if (compareLineStringOrReg.inArray(prev.charAt(matchPos), ["", "*", "#"])) {
                        ps("<dl>");
                    }
                }
                switch (l_match[1].charAt(l_match[1].length - 1)) {
                    case "*":
                    case "#":
                        ps("<li>" + parse_inline_nowiki(l_match[2]));
                        break;
                    case ";":
                        ps("<dt>");
                        var dt_match = l_match[2].match(/(.*?)(:.*?)$/);
                        if (dt_match) {
                            ps(parse_inline_nowiki(dt_match[1]));
                            ll.unshift(dt_match[2]);
                        } else {
                            ps(parse_inline_nowiki(l_match[2]));
                        }
                        break;
                    case ":":
                        ps("<dd>" + parse_inline_nowiki(l_match[2]));
                }
                prev = l_match[1];
            }
            for (var i = prev.length - 1; i >= 0; i--) {
                ps(f("</?>", prev.charAt(i) == "*" ? "ul" : prev.charAt(i) == "#" ? "ol" : "dl"));
            }
        }
        function parse_table() {
            endl(f("<table>", compareLineStringOrReg(/^\{\|( .*)$/) ? r[1] : ""));
            for (; remain();) {
                if (compareLineStringOrReg("|")) {
                    switch (charAtPoint(1)) {
                        case "}":
                            endl("</table>");
                            return;
                        case "-":
                            endl(f("<tr>", compareLineStringOrReg(/\|-*(.*)/)[1]));
                            break;
                        default:
                            parse_table_data();
                    }
                } else if (compareLineStringOrReg("!")) {
                    parse_table_data();
                } else {
                    sh();
                }
            }
        }
        function parse_table_data() {
            var td_line, match_i;
            var td_match = sh().match(/^(\|\+|\||!)((?:([^[|]*?)\|(?!\|))?(.*))$/);
            if (td_match[1] == "|+") {
                ps("<caption");
            } else {
                ps("<t" + (td_match[1] == "|" ? "d" : "h"));
            }
            if (typeof td_match[3] != "undefined") {
                match_i = 4;
            } else {
                match_i = 2;
            }
            ps(">");
            if (td_match[1] != "|+") {
                td_line = td_match[match_i].split(td_match[1] == "|" ? "||" : /(?:\|\||!!)/);
                ps(parse_inline_nowiki(td_line.shift()));
                while (td_line.length) {
                    ll.unshift(td_match[1] + td_line.pop());
                }
            } else {
                ps(td_match[match_i]);
            }
            var tc = 0,
                td = [];
            while (remain()) {
                td.push(sh());
                if (compareLineStringOrReg("|")) {
                    if (!tc) {
                        break;
                    } else if (charAtPoint(1) == "}") {
                        tc--;
                    }
                } else if (!tc && compareLineStringOrReg("!")) {
                    break;
                } else if (compareLineStringOrReg("{|")) {
                    tc++;
                }
            }
            if (td.length) {
                ps(Insta.convert(td));
            }
        }
        function parse_pre() {
            ps("<pre>");
            do {
                endl(parse_inline_nowiki(ll[0].substring(1)) + "\n");
            } while (remain() && compareLineStringOrReg(" "));
            ps("</pre>");
        }
        function parse_block_image() {
            ps(parse_image(sh()));
        }
        function parse_image(str) {
            var tag = str.substring(str.indexOf(":") + 1, str.length - 2);
            var width;
            var attr = [],
                filename, caption = "";
            var thumb = 0,
                frame = 0,
                center = 0;
            var align = "";
            if (tag.match(/\|/)) {
                var nesting = 0;
                var last_attr;
                for (var i = tag.length - 1; i > 0; i--) {
                    if (tag.charAt(i) == "|" && !nesting) {
                        last_attr = tag.substr(i + 1);
                        tag = tag.substring(0, i);
                        break;
                    } else {
                        switch (tag.substr(i - 1, 2)) {
                            case "]]":
                                nesting++;
                                i--;
                                break;
                            case "[[":
                                nesting--;
                                i--;
                        }
                    }
                }
                attr = tag.split(/\s*\|\s*/);
                attr.push(last_attr);
                filename = attr.shift();
                var w_match;
                for (; attr.length; attr.shift()) {
                    w_match = attr[0].match(/^(\d*)(?:[px]*\d*)?px$/);
                    if (w_match) {
                        width = w_match[1];
                    } else {
                        switch (attr[0]) {
                            case "thumb":
                            case "thumbnail":
                                thumb = true;
                                frame = true;
                                break;
                            case "frame":
                                frame = true;
                                break;
                            case "none":
                            case "right":
                            case "left":
                                center = false;
                                align = attr[0];
                                break;
                            case "center":
                                center = true;
                                align = "none";
                                break;
                            default:
                                if (attr.length == 1) {
                                    caption = attr[0];
                                }
                        }
                    }
                }
            } else {
                filename = tag;
            }
            return "";
        }
        function parse_inline_nowiki(str) {
            var start, lastend = 0;
            var substart = 0,
                nestlev = 0,
                open, close, subloop;
            var html = "";
            while (-1 != (start = str.indexOf("<nowiki>", substart))) {
                html += parse_inline_wiki(str.substring(lastend, start));
                start += 8;
                substart = start;
                subloop = true;
                do {
                    open = str.indexOf("<nowiki>", substart);
                    close = str.indexOf("</nowiki>", substart);
                    if (close <= open || open == -1) {
                        if (close == -1) {
                            return html + html_entities(str.substr(start));
                        }
                        substart = close + 9;
                        if (nestlev) {
                            nestlev--;
                        } else {
                            lastend = substart;
                            html += html_entities(str.substring(start, lastend - 9));
                            subloop = false;
                        }
                    } else {
                        substart = open + 8;
                        nestlev++;
                    }
                } while (subloop);
            }
            return html + parse_inline_wiki(str.substr(lastend));
        }
        function parse_inline_images(str) {
            var start, substart = 0,
                nestlev = 0;
            var loop, close, open, wiki, html;
            while (-1 != (start = str.indexOf("[[", substart))) {
                if (str.substr(start + 2).match(RegExp("^(Image|File|" + Insta.conf.locale.image + "):", "i"))) {
                    loop = true;
                    substart = start;
                    do {
                        substart += 2;
                        close = str.indexOf("]]", substart);
                        open = str.indexOf("[[", substart);
                        if (close <= open || open == -1) {
                            if (close == -1) {
                                return str;
                            }
                            substart = close;
                            if (nestlev) {
                                nestlev--;
                            } else {
                                wiki = str.substring(start, close + 2);
                                html = parse_image(wiki);
                                str = str.replace(wiki, html);
                                substart = start + html.length;
                                loop = false;
                            }
                        } else {
                            substart = open;
                            nestlev++;
                        }
                    } while (loop);
                } else {
                    break;
                }
            }
            return str;
        }
        function parse_inline_formatting(str) {
            var em, st, i, li, o = "";
            while ((i = str.indexOf("''", li)) + 1) {
                o += str.substring(li, i);
                li = i + 2;
                if (str.charAt(i + 2) == "'") {
                    li++;
                    st = !st;
                    o += st ? "<strong>" : "</strong>";
                } else {
                    em = !em;
                    o += em ? "<em>" : "</em>";
                }
            }
            return o + str.substr(li);
        }
        function parse_inline_wiki(str) {
            str = parse_inline_images(str);
            str = parse_inline_formatting(str);
            str = str.replace(/<(?:)math>(.*?)<\/math>/gi, "");
            var date = new Date();
            var minutes = date.getUTCMinutes();
            if (minutes < 10) {
                minutes = "0" + minutes;
            }
            date = f("?:?, ? ? ? (UTC)", date.getUTCHours(), minutes, date.getUTCDate(), Insta.conf.locale.months[date.getUTCMonth()], date.getUTCFullYear());
            return str.replace(/~{5}(?!~)/g, date).replace(/~{4}(?!~)/g, Insta.conf.user.name + " " + date).replace(/~{3}(?!~)/g, Insta.conf.user.name).replace(RegExp("\\[\\[:((?:" + Insta.conf.locale.category + "|Image|File|" + Insta.conf.locale.image + "|" + Insta.conf.wiki.interwiki + "):[^|]*?)\\]\\](\\w*)", "gi"), function ($0, $1, $2) {
                return f("<a href='?'>?</a>", Insta.conf.paths.articles + htmlescape_attr($1), htmlescape_text($1) + htmlescape_text($2));
            }).replace(RegExp("\\[\\[(?:" + Insta.conf.locale.category + "|" + Insta.conf.wiki.interwiki + "):.*?\\]\\]", "gi"), "").replace(RegExp("\\[\\[:((?:" + Insta.conf.locale.category + "|Image|File|" + Insta.conf.locale.image + "|" + Insta.conf.wiki.interwiki + "):.*?)\\|([^\\]]+?)\\]\\](\\w*)", "gi"), function ($0, $1, $2, $3) {
                return f("<a href='?'>?</a>", Insta.conf.paths.articles + htmlescape_attr($1), htmlescape_text($2) + htmlescape_text($3));
            }).replace(/\[\[(\/[^|]*?)\]\]/g, function ($0, $1) {
                return f("<a href='?'>?</a>", Insta.conf.baseUrl + htmlescape_attr($1), htmlescape_text($1));
            }).replace(/\[\[(\/.*?)\|(.+?)\]\]/g, function ($0, $1, $2) {
                return f("<a href='?'>?</a>", Insta.conf.baseUrl + htmlescape_attr($1), htmlescape_text($2));
            }).replace(/\[\[([^[|]*?)\]\](\w*)/g, function ($0, $1, $2) {
                return f("<a href='?'>?</a>", Insta.conf.paths.articles + htmlescape_attr($1), htmlescape_text($1) + htmlescape_text($2));
            }).replace(/\[\[([^[]*?)\|([^\]]+?)\]\](\w*)/g, function ($0, $1, $2, $3) {
                return f("<a href='?'>?</a>", Insta.conf.paths.articles + htmlescape_attr($1), htmlescape_text($2) + htmlescape_text($3));
            }).replace(/\[\[([^\]]*?:)?(.*?)( *\(.*?\))?\|\]\]/g, function ($0, $1, $2, $3) {
                return f("<a href='?'>?</a>", Insta.conf.paths.articles + htmlescape_attr($1) + htmlescape_attr($2) + htmlescape_attr($3), htmlescape_text($2));
            }).replace(/\[(https?|news|ftp|mailto|gopher|irc):(\/*)([^\]]*?) (.*?)\]/g, function ($0, $1, $2, $3, $4) {
                return f("<a class='external' href='?:?'>?</a>", htmlescape_attr($1), htmlescape_attr($2) + htmlescape_attr($3), htmlescape_text($4));
            }).replace(/\[http:\/\/(.*?)\]/g, function ($0, $1) {
                return f("<a class='external' href='http://?'>[#]</a>", htmlescape_attr($1));
            }).replace(/\[(news|ftp|mailto|gopher|irc):(\/*)(.*?)\]/g, function ($0, $1, $2, $3) {
                return f("<a class='external' href='?:?'>?:?</a>", htmlescape_attr($1), htmlescape_attr($2) + htmlescape_attr($3), htmlescape_text($1), htmlescape_text($2) + htmlescape_text($3));
            }).replace(/(^| )(https?|news|ftp|mailto|gopher|irc):(\/*)([^ $]*[^.,!?;: $])/g, function ($0, $1, $2, $3, $4) {
                return f("?<a class='external' href='?:?'>?:?</a>", htmlescape_text($1), htmlescape_attr($2), htmlescape_attr($3) + htmlescape_attr($4), htmlescape_text($2), htmlescape_text($3) + htmlescape_text($4));
            }).replace("__NOTOC__", "").replace("__NOINDEX__", "").replace("__INDEX__", "").replace("__NOEDITSECTION__", "");
        }
        for (; remain();) {
            if (compareLineStringOrReg(/^(={1,6})(.*)\1(.*)$/)) {
                p = 0;
                endl(f("<h?>?</h?>?", r[1].length, parse_inline_nowiki(r[2]), r[1].length, r[3]));
            } else if (compareLineStringOrReg(/^[*#:;]/)) {
                p = 0;
                parse_list();
            } else if (compareLineStringOrReg(" ")) {
                p = 0;
                parse_pre();
            } else if (compareLineStringOrReg("{|")) {
                p = 0;
                parse_table();
            } else if (compareLineStringOrReg(/^----+$/)) {
                p = 0;
                endl("<hr />");
            } else if (compareLineStringOrReg(Insta.BLOCK_IMAGE)) {
                p = 0;
                parse_block_image();
            } else {
                if (compareLineString("")) {
                    p = remain() > 1 && ll[1] === "";
                    if (p) {
                        endl("<p><br>");
                    }
                } else {
                    if (!p) {
                        ps("<p>");
                        p = 1;
                    }
                    ps(parse_inline_nowiki(ll[0]) + " ");
                }
                sh();
            }
        }
        return o;
    };
    function wiki2html(txt, baseurl) {
        Insta.conf.baseUrl = baseurl;
        return Insta.convert(txt);
    }
    function popupFilterPageSize(data) {
        return formatBytes(data.length);
    }
    function popupFilterCountLinks(data) {
        var num = countLinks(data);
        return String(num) + "&nbsp;" + (num != 1 ? popupString("wikiLinks") : popupString("wikiLink"));
    }
    function popupFilterCountImages(data) {
        var num = countImages(data);
        return String(num) + "&nbsp;" + (num != 1 ? popupString("images") : popupString("image"));
    }
    function popupFilterCountCategories(data) {
        var num = countCategories(data);
        return String(num) + "&nbsp;" + (num != 1 ? popupString("categories") : popupString("category"));
    }
    function popupFilterLastModified(data, download) {
        var lastmod = download.lastModified;
        //var now = new Date();
        var age = moment(lastmod);// now - lastmod;
        if (lastmod && getValueOf("popupLastModified")) {
            return tprintf("%s old", [formatAge(age)]).replace(RegExp(" ", "g"), "&nbsp;");
        }
        return "";
    }
    function formatAge(age) {
        var now = moment();
        var isBefore = age.isBefore(now);
        var monthsHave31Days = [0, 2, 4, 6, 7, 9, 11]; // 月份从0开始
        var year = isBefore ? now.year() - age.year() : age.year() - now.year(),
            month = isBefore ? now.month() - age.month() : age.month() - now.month(),
            day = isBefore ? now.date() - age.date() : age.date() - now.date(),
            hour = isBefore ? now.hour() - age.hour() : age.hour() - now.hour(),
            minute = isBefore ? now.minute() - age.minute() : age.minute() - now.minute(),
            second = isBefore ? now.second() - age.second() : age.second() - now.second();
        if (second < 0) {
            minute--;
            second += 60;
        }
        if (minute < 0) {
            hour--;
            minute += 60;
        }
        if (hour < 0) {
            day--;
            hour += 24;
        }
        if (day < 0) {
            month--;
            if (monthsHave31Days.includes((isBefore ? age : now).month())) {
                day += 31;
            } else if ((isBefore ? age : now).month() === 1) {
                if ((isBefore ? age : now).year() % 4 === 0) {
                    day += 29;
                } else {
                    day += 28;
                }
            } else {
                day += 30;
            }
        }
        if (month < 0) {
            year--;
            month += 12;
        }
        var result = "";
        if (year > 0) {
            result += addunit(year, "year");
        }
        if (month > 0) {
            result += addunit(month, "month");
        } else if (result !== "") {
            result += addunit(0, "month");
        }
        if (day > 0) {
            result += addunit(day, "day");
        } else if (result !== "") {
            result += addunit(0, "day");
        }
        if (hour > 0) {
            result += addunit(hour, "hour");
        } else if (result !== "") {
            result += addunit(0, "hour");
        }
        if (minute > 0) {
            result += addunit(minute, "minute");
        } else if (result !== "") {
            result += addunit(0, "minute");
        }
        if (second > 0) {
            result += addunit(second, "second");
        } else if (result !== "") {
            result += addunit(0, "second");
        }
        return result.replace(/(\d) /g, "$1");
    }
    function addunit(num, str) {
        return "" + num + " " + (num != 1 ? popupString(str + "s") : popupString(str));
    }
    function runPopupFilters(list, data, download) {
        var ret = [];
        for (var i = 0; i < list.length; ++i) {
            if (list[i] && typeof list[i] == "function") {
                var s = list[i](data, download, download.owner.article);
                if (s) {
                    ret.push(s);
                }
            }
        }
        return ret;
    }
    function getPageInfo(data, download) {
        if (!data || data.length === 0) {
            return popupString("Empty page");
        }
        var popupFilters = getValueOf("popupFilters") || [];
        var extraPopupFilters = getValueOf("extraPopupFilters") || [];
        var pageInfoArray = runPopupFilters(popupFilters.concat(extraPopupFilters), data, download);
        var pageInfo = pageInfoArray.join(popupString("comma"));
        if (pageInfo !== "") {
            pageInfo = upcaseFirst(pageInfo);
        }
        return pageInfo;
    }
    function countLinks(wikiText) {
        return wikiText.split("[[").length - 1;
    }
    function countImages(wikiText) {
        return (wikiText.parenSplit(pg.re.image).length - 1) / (pg.re.imageBracketCount + 1);
    }
    function countCategories(wikiText) {
        return (wikiText.parenSplit(pg.re.category).length - 1) / (pg.re.categoryBracketCount + 1);
    }
    function popupFilterStubDetect(data, download, article) {
        var counts = stubCount(data, article);
        if (counts.real) {
            return popupString("stub");
        }
        if (counts.sect) {
            return popupString("section stub");
        }
        return "";
    }
    function popupFilterDisambigDetect(data, download, article) {
        if (!getValueOf("popupAllDabsStubs") && article.namespace()) {
            return "";
        }
        return isDisambig(data, article) ? popupString("disambig") : "";
    }
    function formatBytes(num) {
        return num > 949 ? Math.round(num / 100) / 10 + popupString("kB") : num + "&nbsp;" + popupString("bytes");
    }
    function Stringwrapper() {
        this.indexOf = function (x) {
            return this.toString().indexOf(x);
        };
        this.toString = function () {
            return this.value;
        };
        this.parenSplit = function (x) {
            return this.toString().parenSplit(x);
        };
        this.substring = function (x, y) {
            if (typeof y == "undefined") {
                return this.toString().substring(x);
            }
            return this.toString().substring(x, y);
        };
        this.split = function (x) {
            return this.toString().split(x);
        };
        this.replace = function (x, y) {
            return this.toString().replace(x, y);
        };
    }
    function Title(val) {
        this.value = null;
        this.anchor = "";
        this.setUtf(val);
    }
    Title.prototype = new Stringwrapper();
    Title.prototype.toString = function (omitAnchor) {
        return this.value + (!omitAnchor && this.anchor ? "#" + this.anchorString() : "");
    };
    Title.prototype.anchorString = function () {
        if (!this.anchor) {
            return "";
        }
        var split = this.anchor.parenSplit(/((?:[.][0-9A-F]{2})+)/);
        var len = split.length;
        var value;
        for (var j = 1; j < len; j += 2) {
            value = split[j].split(".").join("%");
            try {
                value = decodeURIComponent(value);
            } catch (e) {
                // cannot decode
            }
            split[j] = value.split("_").join(" ");
        }
        return split.join("");
    };
    Title.prototype.urlAnchor = function () {
        var split = this.anchor.parenSplit("/((?:[%][0-9A-F]{2})+)/");
        var len = split.length;
        for (var j = 1; j < len; j += 2) {
            split[j] = split[j].split("%").join(".");
        }
        return split.join("");
    };
    Title.prototype.anchorFromUtf = function (str) {
        this.anchor = encodeURIComponent(str.split(" ").join("_")).split("%3A").join(":").split("'").join("%27").split("%").join(".");
    };
    Title.fromURL = function (h) {
        return new Title().fromURL(h);
    };
    Title.prototype.fromURL = function (h) {
        if (typeof h != "string") {
            this.value = null;
            return this;
        }
        var splitted = h.split("?");
        splitted[0] = splitted[0].split("&").join("%26");
        h = splitted.join("?");
        var contribs = pg.re.contribs.exec(h);
        if (contribs) {
            if (contribs[1] == "title=") {
                contribs[3] = contribs[3].split("+").join(" ");
            }
            var u = new Title(contribs[3]);
            this.setUtf(this.decodeNasties(mw.config.get("wgFormattedNamespaces")[pg.nsUserId] + ":" + u.stripNamespace()));
            return this;
        }
        var email = pg.re.email.exec(h);
        if (email) {
            this.setUtf(this.decodeNasties(mw.config.get("wgFormattedNamespaces")[pg.nsUserId] + ":" + new Title(email[3]).stripNamespace()));
            return this;
        }
        var backlinks = pg.re.backlinks.exec(h);
        if (backlinks) {
            this.setUtf(this.decodeNasties(new Title(backlinks[3])));
            return this;
        }
        var specialdiff = pg.re.specialdiff.exec(h);
        if (specialdiff) {
            this.setUtf(this.decodeNasties(new Title(mw.config.get("wgFormattedNamespaces")[pg.nsSpecialId] + ":Diff")));
            return this;
        }
        var m = pg.re.main.exec(h);
        if (m === null) {
            this.value = null;
        } else {
            var fromBotInterface = /[?](.+[&])?title=/.test(h);
            if (fromBotInterface) {
                m[2] = m[2].split("+").join("_");
            }
            var extracted = m[2] + (m[3] ? "#" + m[3] : "");
            if (pg.flag.isSafari && /%25[0-9A-Fa-f]{2}/.test(extracted)) {
                this.setUtf(decodeURIComponent(unescape(extracted)));
            } else {
                this.setUtf(this.decodeNasties(extracted));
            }
        }
        return this;
    };
    Title.prototype.decodeNasties = function (txt) {
        try {
            var ret = decodeURI(this.decodeEscapes(txt));
            ret = ret.replace(/[_ ]*$/, "");
            return ret;
        } catch (e) {
            return txt; // cannot decode
        }
    };
    Title.prototype.decodeEscapes = function (txt) {
        var split = txt.parenSplit(/((?:[%][0-9A-Fa-f]{2})+)/);
        var len = split.length;
        for (var i = 1; i < len; i = i + 2) {
            split[i] = decodeURIComponent(split[i]);
        }
        return split.join("");
    };
    Title.fromAnchor = function (a) {
        return new Title().fromAnchor(a);
    };
    Title.prototype.fromAnchor = function (a) {
        if (!a) {
            this.value = null;
            return this;
        }
        return this.fromURL(a.href);
    };
    Title.fromWikiText = function (txt) {
        return new Title().fromWikiText(txt);
    };
    Title.prototype.fromWikiText = function (txt) {
        txt = myDecodeURI(txt);
        this.setUtf(txt);
        return this;
    };
    Title.prototype.hintValue = function () {
        if (!this.value) {
            return "";
        }
        return safeDecodeURI(this.value);
    };
    Title.prototype.toUserName = function (withNs) {
        if (this.namespaceId() != pg.nsUserId && this.namespaceId() != pg.nsUsertalkId) {
            this.value = null;
            return;
        }
        this.value = (withNs ? mw.config.get("wgFormattedNamespaces")[pg.nsUserId] + ":" : "") + this.stripNamespace().split("/")[0];
    };
    Title.prototype.userName = function (withNs) {
        var t = new Title(this.value);
        t.toUserName(withNs);
        if (t.value) {
            return t;
        }
        return null;
    };
    Title.prototype.toTalkPage = function () {
        if (this.value === null) {
            return null;
        }
        var namespaceId = this.namespaceId();
        if (namespaceId >= 0 && namespaceId % 2 === 0) {
            var localizedNamespace = mw.config.get("wgFormattedNamespaces")[namespaceId + 1];
            if (typeof localizedNamespace !== "undefined") {
                if (localizedNamespace === "") {
                    this.value = this.stripNamespace();
                } else {
                    this.value = localizedNamespace.split(" ").join("_") + ":" + this.stripNamespace();
                }
                return this.value;
            }
        }
        this.value = null;
        return null;
    };
    Title.prototype.namespace = function () {
        return mw.config.get("wgFormattedNamespaces")[this.namespaceId()];
    };
    Title.prototype.namespaceId = function () {
        var n = this.value.indexOf(":");
        if (n < 0) {
            return 0;
        }
        var namespaceId = mw.config.get("wgNamespaceIds")[this.value.substring(0, n).split(" ").join("_").toLowerCase()];
        if (typeof namespaceId == "undefined") {
            return 0;
        }
        return namespaceId;
    };
    Title.prototype.talkPage = function () {
        var t = new Title(this.value);
        t.toTalkPage();
        if (t.value) {
            return t;
        }
        return null;
    };
    Title.prototype.isTalkPage = function () {
        if (this.talkPage() === null) {
            return true;
        }
        return false;
    };
    Title.prototype.toArticleFromTalkPage = function () {
        if (this.value === null) {
            return null;
        }
        var namespaceId = this.namespaceId();
        if (namespaceId >= 0 && namespaceId % 2 == 1) {
            var localizedNamespace = mw.config.get("wgFormattedNamespaces")[namespaceId - 1];
            if (typeof localizedNamespace !== "undefined") {
                if (localizedNamespace === "") {
                    this.value = this.stripNamespace();
                } else {
                    this.value = localizedNamespace.split(" ").join("_") + ":" + this.stripNamespace();
                }
                return this.value;
            }
        }
        this.value = null;
        return null;
    };
    Title.prototype.articleFromTalkPage = function () {
        var t = new Title(this.value);
        t.toArticleFromTalkPage();
        if (t.value) {
            return t;
        }
        return null;
    };
    Title.prototype.articleFromTalkOrArticle = function () {
        var t = new Title(this.value);
        if (t.toArticleFromTalkPage()) {
            return t;
        }
        return this;
    };
    Title.prototype.isIpUser = function () {
        return pg.re.ipUser.test(this.userName());
    };
    Title.prototype.stripNamespace = function () {
        var n = this.value.indexOf(":");
        if (n < 0) {
            return this.value;
        }
        var namespaceId = this.namespaceId();
        if (namespaceId === pg.nsMainspaceId) {
            return this.value;
        }
        return this.value.substring(n + 1);
    };
    Title.prototype.setUtf = function (value) {
        if (!value) {
            this.value = "";
            return;
        }
        var anch = value.indexOf("#");
        if (anch < 0) {
            this.value = value.split("_").join(" ");
            this.anchor = "";
            return;
        }
        this.value = value.substring(0, anch).split("_").join(" ");
        this.anchor = value.substring(anch + 1);
        this.ns = null;
    };
    Title.prototype.setUrl = function (urlfrag) {
        var anch = urlfrag.indexOf("#");
        this.value = safeDecodeURI(urlfrag.substring(0, anch));
        this.anchor = this.value.substring(anch + 1);
    };
    Title.prototype.append = function (x) {
        this.setUtf(this.value + x);
    };
    Title.prototype.urlString = function (x) {
        if (!x) {
            x = {};
        }
        var v = this.toString(true);
        if (!x.omitAnchor && this.anchor) {
            v += "#" + this.urlAnchor();
        }
        if (!x.keepSpaces) {
            v = v.split(" ").join("_");
        }
        return encodeURI(v).split("&").join("%26").split("?").join("%3F").split("+").join("%2B");
    };
    Title.prototype.removeAnchor = function () {
        return new Title(this.toString(true));
    };
    Title.prototype.toUrl = function () {
        return pg.wiki.titlebase + this.urlString();
    };
    function parseParams(url) {
        var specialDiff = pg.re.specialdiff.exec(url);
        if (specialDiff) {
            var split = specialDiff[1].split("/");
            if (split.length == 1) {
                return {
                    oldid: split[0],
                    diff: "prev"
                };
            } else if (split.length == 2) {
                return {
                    oldid: split[0],
                    diff: split[1]
                };
            }
        }
        var ret = {};
        if (url.indexOf("?") == -1) {
            return ret;
        }
        url = url.split("#")[0];
        var s = url.split("?").slice(1).join();
        var t = s.split("&");
        for (var i = 0; i < t.length; ++i) {
            var z = t[i].split("=");
            z.push(null);
            ret[z[0]] = z[1];
        }
        if (ret.diff && typeof ret.oldid === "undefined") {
            ret.oldid = "prev";
        }
        if (ret.oldid && (ret.oldid === "prev" || ret.oldid === "next" || ret.oldid === "cur")) {
            var helper = ret.diff;
            ret.diff = ret.oldid;
            ret.oldid = helper;
        }
        return ret;
    }
    function myDecodeURI(str) {
        var ret;
        try {
            ret = decodeURI(str.toString());
        } catch (summat) {
            return str;
        }
        for (var i = 0; i < pg.misc.decodeExtras.length; ++i) {
            var from = pg.misc.decodeExtras[i].from;
            var to = pg.misc.decodeExtras[i].to;
            ret = ret.split(from).join(to);
        }
        return ret;
    }
    function safeDecodeURI(str) {
        var ret = myDecodeURI(str);
        return ret || str;
    }
    function isDisambig(data, article) {
        if (!getValueOf("popupAllDabsStubs") && article.namespace()) {
            return false;
        }
        return !article.isTalkPage() && pg.re.disambig.test(data);
    }
    function stubCount(data, article) {
        if (!getValueOf("popupAllDabsStubs") && article.namespace()) {
            return false;
        }
        var sectStub = 0;
        var realStub = 0;
        if (pg.re.stub.test(data)) {
            var s = data.parenSplit(pg.re.stub);
            for (var i = 1; i < s.length; i = i + 2) {
                if (s[i]) {
                    ++sectStub;
                } else {
                    ++realStub;
                }
            }
        }
        return {
            real: realStub,
            sect: sectStub
        };
    }
    function isValidImageName(str) {
        return str.indexOf("{") == -1;
    }
    function isInStrippableNamespace(article) {
        return article.namespaceId() !== 0;
    }
    function isInMainNamespace(article) {
        return article.namespaceId() === 0;
    }
    function anchorContainsImage(a) {
        if (a === null) {
            return false;
        }
        var kids = a.childNodes;
        for (var i = 0; i < kids.length; ++i) {
            if (kids[i].nodeName == "IMG") {
                return true;
            }
        }
        return false;
    }
    function isPopupLink(a) {
        if (!markNopopupSpanLinks.done) {
            markNopopupSpanLinks();
        }
        if (a.inNopopupSpan) {
            return false;
        }
        if (a.onmousedown || a.getAttribute("nopopup")) {
            return false;
        }
        var h = a.href;
        if (h === document.location.href + "#") {
            return false;
        }
        if (!pg.re.basenames.test(h)) {
            return false;
        }
        if (!pg.re.urlNoPopup.test(h)) {
            return true;
        }
        return (pg.re.email.test(h) || pg.re.contribs.test(h) || pg.re.backlinks.test(h) || pg.re.specialdiff.test(h)) && h.indexOf("&limit=") == -1;
    }
    function markNopopupSpanLinks() {
        if (!getValueOf("popupOnlyArticleLinks")) {
            fixVectorMenuPopups();
        }
        var s = $(".nopopups").toArray();
        for (var i = 0; i < s.length; ++i) {
            var as = s[i].getElementsByTagName("a");
            for (var j = 0; j < as.length; ++j) {
                as[j].inNopopupSpan = true;
            }
        }
        markNopopupSpanLinks.done = true;
    }
    function fixVectorMenuPopups() {
        $("div.vectorMenu h3:first a:first, div.vector-menu h3:first a:first, nav.vector-menu h3:first a:first").prop("inNopopupSpan", true);
    }
    function getPageWithCaching(url, onComplete, owner) {
        log("getPageWithCaching, url=" + url);
        var i = findInPageCache(url);
        var d;
        if (i > -1) {
            d = fakeDownload(url, owner.idNumber, onComplete, pg.cache.pages[i].data, pg.cache.pages[i].lastModified, owner);
        } else {
            d = getPage(url, onComplete, owner);
            if (d && owner && owner.addDownload) {
                owner.addDownload(d);
                d.owner = owner;
            }
        }
    }
    function getPage(url, onComplete, owner) {
        log("getPage");
        var callback = function (d) {
            if (!d.aborted) {
                addPageToCache(d);
                onComplete(d);
            }
        };
        return startDownload(url, owner.idNumber, callback);
    }
    function findInPageCache(url) {
        for (var i = 0; i < pg.cache.pages.length; ++i) {
            if (url == pg.cache.pages[i].url) {
                return i;
            }
        }
        return -1;
    }
    function addPageToCache(download) {
        log("addPageToCache " + download.url);
        var page = {
            url: download.url,
            data: download.data,
            lastModified: download.lastModified
        };
        return pg.cache.pages.push(page);
    }
    if (String("abc".split(/(b)/)) != "a,b,c") {
        String.prototype.parenSplit = function (re) {
            re = nonGlobalRegex(re);
            var s = this;
            var m = re.exec(s);
            var ret = [];
            while (m && s) {
                for (var i = 0; i < m.length; ++i) {
                    if (typeof m[i] == "undefined") {
                        m[i] = "";
                    }
                }
                ret.push(s.substring(0, m.index));
                ret = ret.concat(m.slice(1));
                s = s.substring(m.index + m[0].length);
                m = re.exec(s);
            }
            ret.push(s);
            return ret;
        };
    } else {
        String.prototype.parenSplit = function (re) {
            return this.split(re);
        };
        String.prototype.parenSplit.isNative = true;
    }
    function nonGlobalRegex(re) {
        var s = re.toString();
        var flags = "";
        for (var j = s.length; s.charAt(j) != "/"; --j) {
            if (s.charAt(j) != "g") {
                flags += s.charAt(j);
            }
        }
        var t = s.substring(1, j);
        return RegExp(t, flags);
    }
    function getJsObj(json) {
        try {
            var json_ret = JSON.parse(json);
            if (json_ret.warnings) {
                for (var w = 0; w < json_ret.warnings.length; w++) {
                    if (json_ret.warnings[w]["*"]) {
                        log(json_ret.warnings[w]["*"]);
                    } else {
                        log(json_ret.warnings[w].warnings);
                    }
                }
            } else if (json_ret.error) {
                errlog(json_ret.error.code + ": " + json_ret.error.info);
            }
            return json_ret;
        } catch (someError) {
            errlog("Something went wrong with getJsObj, json=" + json);
            return 1;
        }
    }
    function anyChild(obj) {
        for (var p in obj) {
            return obj[p];
        }
        return null;
    }
    function upcaseFirst(str) {
        if (typeof str != typeof "" || str === "") {
            return "";
        }
        return str.charAt(0).toUpperCase() + str.substring(1);
    }
    function findInArray(arr, foo) {
        if (!arr || !arr.length) {
            return -1;
        }
        var len = arr.length;
        for (var i = 0; i < len; ++i) {
            if (arr[i] == foo) {
                return i;
            }
        }
        return -1;
    }
    function nextOne(array, value) {
        var i = findInArray(array, value);
        if (i < 0) {
            return null;
        }
        return array[i + 1];
    }
    function literalizeRegex(str) {
        return mw.util.escapeRegExp(str);
    }
    String.prototype.entify = function () {
        return this.split("&").join("&amp;").split("<").join("&lt;").split(">").join("&gt;").split('"').join("&quot;");
    };
    function removeNulls(val) {
        return val !== null;
    }
    function joinPath(list) {
        return list.filter(removeNulls).join("/");
    }
    function simplePrintf(str, subs) {
        if (!str || !subs) {
            return str;
        }
        var ret = [];
        var s = str.parenSplit(/(%s|\$[0-9]+)/);
        var i = 0;
        do {
            ret.push(s.shift());
            if (!s.length) {
                break;
            }
            var cmd = s.shift();
            if (cmd == "%s") {
                if (i < subs.length) {
                    ret.push(subs[i]);
                } else {
                    ret.push(cmd);
                }
                ++i;
            } else {
                var j = parseInt(cmd.replace("$", ""), 10) - 1;
                if (j > -1 && j < subs.length) {
                    ret.push(subs[j]);
                } else {
                    ret.push(cmd);
                }
            }
        } while (s.length > 0);
        return ret.join("");
    }
    function isString(x) {
        return typeof x === "string" || x instanceof String;
    }
    function isNumber(x) {
        return typeof x === "number" || x instanceof Number;
    }
    function isRegExp(x) {
        return x instanceof RegExp;
    }
    function isArray(x) {
        return x instanceof Array;
    }
    function isObject(x) {
        return x instanceof Object;
    }
    function isFunction(x) {
        return !isRegExp(x) && (typeof x === "function" || x instanceof Function);
    }
    function repeatString(s, mult) {
        var ret = "";
        for (var i = 0; i < mult; ++i) {
            ret += s;
        }
        return ret;
    }
    function zeroFill(s, min) {
        min = min || 2;
        var t = s.toString();
        return repeatString("0", min - t.length) + t;
    }
    function map(f, o) {
        if (isArray(o)) {
            return map_array(f, o);
        }
        return map_object(f, o);
    }
    function map_array(f, o) {
        var ret = [];
        for (var i = 0; i < o.length; ++i) {
            ret.push(f(o[i]));
        }
        return ret;
    }
    function map_object(f, o) {
        var ret = {};
        for (var i in o) {
            ret[o] = f(o[i]);
        }
        return ret;
    }
    pg.escapeQuotesHTML = function (text) {
        return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    };
    function retargetDab(newTarget, oldTarget, friendlyCurrentArticleName, titleToEdit) {
        log("retargetDab: newTarget=" + newTarget + " oldTarget=" + oldTarget);
        return changeLinkTargetLink({
            newTarget: newTarget,
            text: newTarget.split(" ").join("&nbsp;"),
            hint: tprintf("disambigHint", [newTarget]),
            summary: simplePrintf(getValueOf("popupFixDabsSummary"), [friendlyCurrentArticleName, newTarget]),
            clickButton: getValueOf("popupDabsAutoClick"),
            minor: true,
            oldTarget: oldTarget,
            watch: getValueOf("popupWatchDisambiggedPages"),
            title: titleToEdit
        });
    }
    function listLinks(wikitext, oldTarget, titleToEdit) {
        var reg = RegExp("\\[\\[([^|]*?) *(\\||\\]\\])", "gi");
        var ret = [];
        var splitted = wikitext.parenSplit(reg);
        var omitRegex = RegExp("^[a-z]*:|^[Ss]pecial:|^[Ii]mage|^[Cc]ategory");
        var friendlyCurrentArticleName = oldTarget.toString();
        var wikPos = getValueOf("popupDabWiktionary");
        for (var i = 1; i < splitted.length; i = i + 3) {
            if (typeof splitted[i] == typeof "string" && splitted[i].length > 0 && !omitRegex.test(splitted[i])) {
                ret.push(retargetDab(splitted[i], oldTarget, friendlyCurrentArticleName, titleToEdit));
            }
        }
        ret = rmDupesFromSortedList(ret.sort());
        if (wikPos) {
            var wikTarget = "wiktionary:" + friendlyCurrentArticleName.replace(RegExp("^(.+)\\s+[(][^)]+[)]\\s*$"), "$1");
            var meth;
            if (wikPos.toLowerCase() == "first") {
                meth = "unshift";
            } else {
                meth = "push";
            }
            ret[meth](retargetDab(wikTarget, oldTarget, friendlyCurrentArticleName, titleToEdit));
        }
        ret.push(changeLinkTargetLink({
            newTarget: null,
            text: popupString("remove this link").split(" ").join("&nbsp;"),
            hint: popupString("remove all links to this disambig page from this article"),
            clickButton: getValueOf("popupDabsAutoClick"),
            oldTarget: oldTarget,
            summary: simplePrintf(getValueOf("popupRmDabLinkSummary"), [friendlyCurrentArticleName]),
            watch: getValueOf("popupWatchDisambiggedPages"),
            title: titleToEdit
        }));
        return ret;
    }
    function rmDupesFromSortedList(list) {
        var ret = [];
        for (var i = 0; i < list.length; ++i) {
            if (ret.length === 0 || list[i] != ret[ret.length - 1]) {
                ret.push(list[i]);
            }
        }
        return ret;
    }
    function makeFixDab(data, navpop) {
        var titleToEdit = navpop.parentPopup && navpop.parentPopup.article.toString();
        var list = listLinks(data, navpop.originalArticle, titleToEdit);
        if (list.length === 0) {
            log("listLinks returned empty list");
            return null;
        }
        var html = "<hr />" + popupString("Click to disambiguate this link to:") + "<br>";
        html += list.join(popupString("separator"));
        return html;
    }
    function makeFixDabs(wikiText, navpop) {
        if (getValueOf("popupFixDabs") && isDisambig(wikiText, navpop.article) && Title.fromURL(location.href).namespaceId() != pg.nsSpecialId && navpop.article.talkPage()) {
            setPopupHTML(makeFixDab(wikiText, navpop), "popupFixDab", navpop.idNumber);
        }
    }
    function popupRedlinkHTML(article) {
        return changeLinkTargetLink({
            newTarget: null,
            text: popupString("remove this link").split(" ").join("&nbsp;"),
            hint: popupString("remove all links to this page from this article"),
            clickButton: getValueOf("popupRedlinkAutoClick"),
            oldTarget: article.toString(),
            summary: simplePrintf(getValueOf("popupRedlinkSummary"), [article.toString()])
        });
    }
    function setPopupHTML(str, elementId, popupId, onSuccess, append) {
        if (typeof popupId === "undefined") {
            popupId = pg.idNumber;
        }
        var popupElement = document.getElementById(elementId + popupId);
        if (popupElement) {
            if (!append) {
                popupElement.innerHTML = "";
            }
            if (isString(str)) {
                popupElement.innerHTML += str;
            } else {
                popupElement.appendChild(str);
            }
            if (onSuccess) {
                onSuccess();
            }
            setTimeout(checkPopupPosition, 100);
            return true;
        }
        setTimeout(function () {
            setPopupHTML(str, elementId, popupId, onSuccess);
        }, 600);
        return null;
    }
    function setPopupTrailer(str, id) {
        return setPopupHTML(str, "popupData", id);
    }
    function fillEmptySpans(args) {
        var redir = true;
        var rcid;
        if (typeof args != "object" || typeof args.redir == "undefined" || !args.redir) {
            redir = false;
        }
        var a = args.navpopup.parentAnchor;
        var article, hint = null,
            oldid = null,
            params = {};
        if (redir && typeof args.redirTarget == typeof {}) {
            article = args.redirTarget;
        } else {
            article = new Title().fromAnchor(a);
            hint = a.originalTitle || article.hintValue();
            params = parseParams(a.href);
            oldid = getValueOf("popupHistoricalLinks") ? params.oldid : null;
            rcid = params.rcid;
        }
        var x = {
            article: article,
            hint: hint,
            oldid: oldid,
            rcid: rcid,
            navpop: args.navpopup,
            params: params
        };
        var structure = pg.structures[getValueOf("popupStructure")];
        if (typeof structure != "object") {
            setPopupHTML("popupError", "Unknown structure (this should never happen): " + pg.option.popupStructure, args.navpopup.idNumber);
            return;
        }
        var spans = flatten(pg.misc.layout);
        var numspans = spans.length;
        var redirs = pg.misc.redirSpans;
        for (var i = 0; i < numspans; ++i) {
            var found = redirs && redirs.indexOf(spans[i]) !== -1;
            if (found && !redir || !found && redir) {
                continue;
            }
            var structurefn = structure[spans[i]];
            if (structurefn === undefined) {
                continue;
            }
            var setfn = setPopupHTML;
            if (getValueOf("popupActiveNavlinks") && (spans[i].indexOf("popupTopLinks") === 0 || spans[i].indexOf("popupRedirTopLinks") === 0)) {
                setfn = setPopupTipsAndHTML;
            }
            switch (typeof structurefn) {
                case "function":
                    log("running " + spans[i] + "({article:" + x.article + ", hint:" + x.hint + ", oldid: " + x.oldid + "})");
                    setfn(structurefn(x), spans[i], args.navpopup.idNumber);
                    break;
                case "string":
                    setfn(structurefn, spans[i], args.navpopup.idNumber);
                    break;
                default:
                    errlog("unknown thing with label " + spans[i] + " (span index was " + i + ")");
                    break;
            }
        }
    }
    function flatten(list, start) {
        var ret = [];
        if (typeof start == "undefined") {
            start = 0;
        }
        for (var i = start; i < list.length; ++i) {
            if (typeof list[i] == typeof []) {
                return ret.concat(flatten(list[i])).concat(flatten(list, i + 1));
            }
            ret.push(list[i]);
        }
        return ret;
    }
    function popupHTML(a) {
        getValueOf("popupStructure");
        var structure = pg.structures[pg.option.popupStructure];
        if (typeof structure != "object") {
            pg.option.popupStructure = pg.optionDefault.popupStructure;
            return popupHTML(a);
        }
        if (typeof structure.popupLayout != "function") {
            return "Bad layout";
        }
        pg.misc.layout = structure.popupLayout();
        if (typeof structure.popupRedirSpans === "function") {
            pg.misc.redirSpans = structure.popupRedirSpans();
        } else {
            pg.misc.redirSpans = [];
        }
        return makeEmptySpans(pg.misc.layout, a.navpopup);
    }
    function makeEmptySpans(list, navpop) {
        var ret = "";
        for (var i = 0; i < list.length; ++i) {
            if (typeof list[i] == typeof "") {
                ret += emptySpanHTML(list[i], navpop.idNumber, "div");
            } else if (typeof list[i] == typeof [] && list[i].length > 0) {
                ret = ret.parenSplit(RegExp("(</[^>]*?>$)")).join(makeEmptySpans(list[i], navpop));
            } else if (typeof list[i] == typeof {} && list[i].nodeType) {
                ret += emptySpanHTML(list[i].name, navpop.idNumber, list[i].nodeType);
            }
        }
        return ret;
    }
    function emptySpanHTML(name, id, tag, classname) {
        tag = tag || "span";
        if (!classname) {
            classname = emptySpanHTML.classAliases[name];
        }
        classname = classname || name;
        if (name == getValueOf("popupDragHandle")) {
            classname += " popupDragHandle";
        }
        return simplePrintf('<%s id="%s" class="%s"></%s>', [tag, name + id, classname, tag]);
    }
    emptySpanHTML.classAliases = {
        popupSecondPreview: "popupPreview"
    };
    function imageHTML(article, idNumber) {
        return simplePrintf('<a id="popupImageLink$1">' + '<img align="right" valign="top" id="popupImg$1" style="display: none;"></img>' + "</a>", [idNumber]);
    }
    function popTipsSoonFn(id, when, popData) {
        if (!when) {
            when = 250;
        }
        var popTips = function () {
            setupTooltips(document.getElementById(id), false, true, popData);
        };
        return function () {
            setTimeout(popTips, when, popData);
        };
    }
    function setPopupTipsAndHTML(html, divname, idnumber, popData) {
        setPopupHTML(html, divname, idnumber, getValueOf("popupSubpopups") ? popTipsSoonFn(divname + idnumber, null, popData) : null);
    }
    function fuzzyCursorOffMenus(x, y, fuzz, parent) {
        if (!parent) {
            return null;
        }
        var uls = parent.getElementsByTagName("ul");
        for (var i = 0; i < uls.length; ++i) {
            if (uls[i].className == "popup_menu") {
                if (uls[i].offsetWidth > 0) {
                    return false;
                }
            }
        }
        return true;
    }
    function checkPopupPosition() {
        if (pg.current.link && pg.current.link.navpopup) {
            pg.current.link.navpopup.limitHorizontalPosition();
        }
    }
    function mouseOutWikiLink() {
        var a = this;
        removeModifierKeyHandler(a);
        if (a.navpopup === null || typeof a.navpopup === "undefined") {
            return;
        }
        if (!a.navpopup.isVisible()) {
            a.navpopup.banish();
            return;
        }
        restoreTitle(a);
        Navpopup.tracker.addHook(posCheckerHook(a.navpopup));
    }
    function posCheckerHook(navpop) {
        return function () {
            if (!navpop.isVisible()) {
                return true;
            }
            if (Navpopup.tracker.dirty) {
                return false;
            }
            var x = Navpopup.tracker.x,
                y = Navpopup.tracker.y;
            var mouseOverNavpop = navpop.isWithin(x, y, navpop.fuzz, navpop.mainDiv) || !fuzzyCursorOffMenus(x, y, navpop.fuzz, navpop.mainDiv);
            var t = getValueOf("popupHideDelay");
            if (t) {
                t = t * 1e3;
            }
            if (!t) {
                if (!mouseOverNavpop) {
                    if (navpop.parentAnchor) {
                        restoreTitle(navpop.parentAnchor);
                    }
                    navpop.banish();
                    return true;
                }
                return false;
            }
            var d = +new Date();
            if (!navpop.mouseLeavingTime) {
                navpop.mouseLeavingTime = d;
                return false;
            }
            if (mouseOverNavpop) {
                navpop.mouseLeavingTime = null;
                return false;
            }
            if (d - navpop.mouseLeavingTime > t) {
                navpop.mouseLeavingTime = null;
                navpop.banish();
                return true;
            }
            return false;
        };
    }
    function runStopPopupTimer(navpop) {
        if (!navpop.stopPopupTimer) {
            navpop.stopPopupTimer = setInterval(posCheckerHook(navpop), 500);
            navpop.addHook(function () {
                clearInterval(navpop.stopPopupTimer);
            }, "hide", "before");
        }
    }
    function Previewmaker(wikiText, baseUrl, owner) {
        this.originalData = wikiText;
        this.baseUrl = baseUrl;
        this.owner = owner;
        this.maxCharacters = getValueOf("popupMaxPreviewCharacters");
        this.maxSentences = getValueOf("popupMaxPreviewSentences");
        this.setData();
    }
    Previewmaker.prototype.setData = function () {
        var maxSize = Math.max(1e4, 2 * this.maxCharacters);
        this.data = this.originalData.substring(0, maxSize);
    };
    Previewmaker.prototype.killComments = function () {
        this.data = this.data.replace(RegExp("^<!--[^$]*?-->\\n|\\n<!--[^$]*?-->(?=\\n)|<!--[^$]*?-->", "g"), "");
    };
    Previewmaker.prototype.killDivs = function () {
        this.data = this.data.replace(RegExp("< *div[^>]* *>[\\s\\S]*?< */ *div *>", "gi"), "");
    };
    Previewmaker.prototype.killGalleries = function () {
        this.data = this.data.replace(RegExp("< *gallery[^>]* *>[\\s\\S]*?< */ *gallery *>", "gi"), "");
    };
    Previewmaker.prototype.kill = function (opening, closing, subopening, subclosing, repl) {
        var oldk = this.data;
        var k = this.killStuff(this.data, opening, closing, subopening, subclosing, repl);
        while (k.length < oldk.length) {
            oldk = k;
            k = this.killStuff(k, opening, closing, subopening, subclosing, repl);
        }
        this.data = k;
    };
    Previewmaker.prototype.killStuff = function (txt, opening, closing, subopening, subclosing, repl) {
        var op = this.makeRegexp(opening);
        var cl = this.makeRegexp(closing, "^");
        var sb = subopening ? this.makeRegexp(subopening, "^") : null;
        var sc = subclosing ? this.makeRegexp(subclosing, "^") : cl;
        if (!op || !cl) {
            alert("Navigation Popups error: op or cl is null! something is wrong.");
            return;
        }
        if (!op.test(txt)) {
            return txt;
        }
        var ret = "";
        var opResult = op.exec(txt);
        ret = txt.substring(0, opResult.index);
        txt = txt.substring(opResult.index + opResult[0].length);
        var depth = 1;
        while (txt.length > 0) {
            var removal = 0;
            if (depth == 1 && cl.test(txt)) {
                depth--;
                removal = cl.exec(txt)[0].length;
            } else if (depth > 1 && sc.test(txt)) {
                depth--;
                removal = sc.exec(txt)[0].length;
            } else if (sb && sb.test(txt)) {
                depth++;
                removal = sb.exec(txt)[0].length;
            }
            if (!removal) {
                removal = 1;
            }
            txt = txt.substring(removal);
            if (depth === 0) {
                break;
            }
        }
        return ret + (repl || "") + txt;
    };
    Previewmaker.prototype.makeRegexp = function (x, prefix, suffix) {
        prefix = prefix || "";
        suffix = suffix || "";
        var reStr = "";
        var flags = "";
        if (isString(x)) {
            reStr = prefix + literalizeRegex(x) + suffix;
        } else if (isRegExp(x)) {
            var s = x.toString().substring(1);
            var sp = s.split("/");
            flags = sp[sp.length - 1];
            sp[sp.length - 1] = "";
            s = sp.join("/");
            s = s.substring(0, s.length - 1);
            reStr = prefix + s + suffix;
        } else {
            log("makeRegexp failed");
        }
        log("makeRegexp: got reStr=" + reStr + ", flags=" + flags);
        return RegExp(reStr, flags);
    };
    Previewmaker.prototype.killBoxTemplates = function () {
        this.kill(RegExp("[{][{][^{}\\s|]*?(float|box)[_ ](begin|start)", "i"), /[}][}]\s*/, "{{");
        this.kill(RegExp("[{][{][^{}\\s|]*?(infobox|elementbox|frame)[_ ]", "i"), /[}][}]\s*/, "{{");
    };
    Previewmaker.prototype.killTemplates = function () {
        this.kill("{{", "}}", "{", "}", " ");
    };
    Previewmaker.prototype.killTables = function () {
        this.kill("{|", /[|]}\s*/, "{|");
        this.kill(/<table.*?>/i, /<\/table.*?>/i, /<table.*?>/i);
        this.data = this.data.replace(RegExp("^[|].*$", "mg"), "");
    };
    Previewmaker.prototype.killImages = function () {
        var forbiddenNamespaceAliases = [];
        jQuery.each(mw.config.get("wgNamespaceIds"), function (_localizedNamespaceLc, _namespaceId) {
            if (_namespaceId != pg.nsImageId && _namespaceId != pg.nsCategoryId) {
                return;
            }
            forbiddenNamespaceAliases.push(_localizedNamespaceLc.split(" ").join("[ _]"));
        });
        this.kill(RegExp("[[][[]\\s*(" + forbiddenNamespaceAliases.join("|") + ")\\s*:", "i"), /\]\]\s*/, "[", "]");
    };
    Previewmaker.prototype.killHTML = function () {
        this.kill(/<ref\b[^/>]*?>/i, /<\/ref>/i);
        this.data = this.data.replace(RegExp("(^|\\n) *<.*", "g"), "\n");
        var splitted = this.data.parenSplit(/(<[\w\W]*?(?:>|$|(?=<)))/);
        var len = splitted.length;
        for (var i = 1; i < len; i = i + 2) {
            switch (splitted[i]) {
                case "<nowiki>":
                case "</nowiki>":
                case "<blockquote>":
                case "</blockquote>":
                    break;
                default:
                    splitted[i] = "";
            }
        }
        this.data = splitted.join("");
    };
    Previewmaker.prototype.killChunks = function () {
        var italicChunkRegex = new RegExp("((^|\\n)\\s*:*\\s*''[^']([^']|'''|'[^']){20}(.|\\n[^\\n])*''[.!?\\s]*\\n)+", "g");
        this.data = this.data.replace(italicChunkRegex, "\n");
    };
    Previewmaker.prototype.mopup = function () {
        this.data = this.data.replace(RegExp("^-{4,}", "mg"), "");
        this.data = this.data.replace(RegExp("(^|\\n) *:[^\\n]*", "g"), "");
        this.data = this.data.replace(RegExp("^__[A-Z_]*__ *$", "gmi"), "");
    };
    Previewmaker.prototype.firstBit = function () {
        var d = this.data;
        if (getValueOf("popupPreviewCutHeadings")) {
            this.data = this.data.replace(RegExp("\\s*(==+[^=]*==+)\\s*", "g"), "\n\n$1 ");
            this.data = this.data.replace(RegExp("([:;]) *\\n{2,}", "g"), "$1\n");
            this.data = this.data.replace(RegExp("^[\\s\\n]*"), "");
            var stuff = RegExp("^([^\\n]|\\n[^\\n\\s])*").exec(this.data);
            if (stuff) {
                d = stuff[0];
            }
            if (!getValueOf("popupPreviewFirstParOnly")) {
                d = this.data;
            }
            d = d.replace(RegExp("(==+[^=]*==+)\\s*", "g"), "$1\n\n");
        }
        d = d.parenSplit(RegExp('([!?.]+["' + "'" + "]*\\s)", "g"));
        d[0] = d[0].replace(RegExp("^\\s*"), "");
        var notSentenceEnds = RegExp("([^.][a-z][.] *[a-z]|etc|sic|Dr|Mr|Mrs|Ms|St|no|op|cit|\\[[^\\]]*|\\s[A-Zvclm])$", "i");
        d = this.fixSentenceEnds(d, notSentenceEnds);
        this.fullLength = d.join("").length;
        var n = this.maxSentences;
        var dd = this.firstSentences(d, n);
        do {
            dd = this.firstSentences(d, n);
            --n;
        } while (dd.length > this.maxCharacters && n !== 0);
        this.data = dd;
    };
    Previewmaker.prototype.fixSentenceEnds = function (strs, reg) {
        for (var i = 0; i < strs.length - 2; ++i) {
            if (reg.test(strs[i])) {
                var a = [];
                for (var j = 0; j < strs.length; ++j) {
                    if (j < i) {
                        a[j] = strs[j];
                    }
                    if (j == i) {
                        a[i] = strs[i] + strs[i + 1] + strs[i + 2];
                    }
                    if (j > i + 2) {
                        a[j - 2] = strs[j];
                    }
                }
                return this.fixSentenceEnds(a, reg);
            }
        }
        return strs;
    };
    Previewmaker.prototype.firstSentences = function (strs, howmany) {
        var t = strs.slice(0, 2 * howmany);
        return t.join("");
    };
    Previewmaker.prototype.killBadWhitespace = function () {
        this.data = this.data.replace(RegExp("^ *'+ *$", "gm"), "");
    };
    Previewmaker.prototype.makePreview = function () {
        if (this.owner.article.namespaceId() != pg.nsTemplateId && this.owner.article.namespaceId() != pg.nsImageId) {
            this.killComments();
            this.killDivs();
            this.killGalleries();
            this.killBoxTemplates();
            if (getValueOf("popupPreviewKillTemplates")) {
                this.killTemplates();
            } else {
                this.killMultilineTemplates();
            }
            this.killTables();
            this.killImages();
            this.killHTML();
            this.killChunks();
            this.mopup();
            this.firstBit();
            this.killBadWhitespace();
        } else {
            this.killHTML();
        }
        this.html = wiki2html(this.data, this.baseUrl);
        this.fixHTML();
        this.stripLongTemplates();
    };
    Previewmaker.prototype.esWiki2HtmlPart = function (data) {
        var reLinks = /(?:\[\[([^|\]]*)(?:\|([^|\]]*))*]]([a-z]*))/gi;
        reLinks.lastIndex = 0;
        var match;
        var result = "";
        var postfixIndex = 0;
        while (match = reLinks.exec(data)) {
            result += pg.escapeQuotesHTML(data.substring(postfixIndex, match.index)) + '<a href="' + Insta.conf.paths.articles + pg.escapeQuotesHTML(match[1]) + '">' + pg.escapeQuotesHTML((match[2] ? match[2] : match[1]) + match[3]) + "</a>";
            postfixIndex = reLinks.lastIndex;
        }
        result += pg.escapeQuotesHTML(data.substring(postfixIndex));
        return result;
    };
    Previewmaker.prototype.editSummaryPreview = function () {
        var reAes = /\/\* *(.*?) *\*\//g;
        reAes.lastIndex = 0;
        var match;
        match = reAes.exec(this.data);
        if (match) {
            var prefix = this.data.substring(0, match.index - 1);
            var section = match[1];
            var postfix = this.data.substring(reAes.lastIndex);
            var start = "<span class='autocomment'>";
            var end = "</span>";
            if (prefix.length > 0) {
                start = this.esWiki2HtmlPart(prefix) + " " + start + "- ";
            }
            if (postfix.length > 0) {
                end = ": " + end + this.esWiki2HtmlPart(postfix);
            }
            var t = new Title().fromURL(this.baseUrl);
            t.anchorFromUtf(section);
            var sectionLink = Insta.conf.paths.articles + pg.escapeQuotesHTML(t.toString(true)) + "#" + pg.escapeQuotesHTML(t.anchor);
            return start + '<a href="' + sectionLink + '">&rarr;</a> ' + pg.escapeQuotesHTML(section) + end;
        }
        return this.esWiki2HtmlPart(this.data);
    };
    function previewSteps(txt) {
        try {
            txt = txt || document.editform.wpTextbox1.value;
        } catch (err) {
            if (pg.cache.pages.length > 0) {
                txt = pg.cache.pages[pg.cache.pages.length - 1].data;
            } else {
                alert("provide text or use an edit page");
            }
        }
        txt = txt.substring(0, 1e4);
        var base = pg.wiki.articlebase + Title.fromURL(document.location.href).urlString();
        var p = new Previewmaker(txt, base, pg.current.link.navpopup);
        if (this.owner.article.namespaceId() != pg.nsTemplateId) {
            p.killComments();
            if (!confirm("done killComments(). Continue?\n---\n" + p.data)) {
                return;
            }
            p.killDivs();
            if (!confirm("done killDivs(). Continue?\n---\n" + p.data)) {
                return;
            }
            p.killGalleries();
            if (!confirm("done killGalleries(). Continue?\n---\n" + p.data)) {
                return;
            }
            p.killBoxTemplates();
            if (!confirm("done killBoxTemplates(). Continue?\n---\n" + p.data)) {
                return;
            }
            if (getValueOf("popupPreviewKillTemplates")) {
                p.killTemplates();
                if (!confirm("done killTemplates(). Continue?\n---\n" + p.data)) {
                    return;
                }
            } else {
                p.killMultilineTemplates();
                if (!confirm("done killMultilineTemplates(). Continue?\n---\n" + p.data)) {
                    return;
                }
            }
            p.killTables();
            if (!confirm("done killTables(). Continue?\n---\n" + p.data)) {
                return;
            }
            p.killImages();
            if (!confirm("done killImages(). Continue?\n---\n" + p.data)) {
                return;
            }
            p.killHTML();
            if (!confirm("done killHTML(). Continue?\n---\n" + p.data)) {
                return;
            }
            p.killChunks();
            if (!confirm("done killChunks(). Continue?\n---\n" + p.data)) {
                return;
            }
            p.mopup();
            if (!confirm("done mopup(). Continue?\n---\n" + p.data)) {
                return;
            }
            p.firstBit();
            if (!confirm("done firstBit(). Continue?\n---\n" + p.data)) {
                return;
            }
            p.killBadWhitespace();
            if (!confirm("done killBadWhitespace(). Continue?\n---\n" + p.data)) {
                return;
            }
        }
        p.html = wiki2html(p.data, base);
        p.fixHTML();
        if (!confirm("done fixHTML(). Continue?\n---\n" + p.html)) {
            return;
        }
        p.stripLongTemplates();
        if (!confirm("done stripLongTemplates(). Continue?\n---\n" + p.html)) {
            return;
        }
        alert("finished preview - end result follows.\n---\n" + p.html);
    }
    Previewmaker.prototype.fixHTML = function () {
        if (!this.html) {
            return;
        }
        var ret = this.html;
        ret = ret.replace(RegExp('(<a href="' + pg.wiki.articlePath + '/[^"]*)[?](.*?")', "g"), "$1%3F$2");
        ret = ret.replace(RegExp("(<a href='" + pg.wiki.articlePath + "/[^']*)[?](.*?')", "g"), "$1%3F$2");
        this.html = ret;
    };
    Previewmaker.prototype.showPreview = function () {
        this.makePreview();
        if (typeof this.html != typeof "") {
            return;
        }
        if (RegExp("^\\s*$").test(this.html)) {
            return;
        }
        setPopupHTML("<hr />", "popupPrePreviewSep", this.owner.idNumber);
        setPopupTipsAndHTML(this.html, "popupPreview", this.owner.idNumber, {
            owner: this.owner
        });
        var more = this.fullLength > this.data.length ? this.moreLink() : "";
        setPopupHTML(more, "popupPreviewMore", this.owner.idNumber);
    };
    Previewmaker.prototype.moreLink = function () {
        var a = document.createElement("a");
        a.className = "popupMoreLink";
        a.innerHTML = popupString("more...");
        var savedThis = this;
        a.onclick = function () {
            savedThis.maxCharacters += 2e3;
            savedThis.maxSentences += 20;
            savedThis.setData();
            savedThis.showPreview();
        };
        return a;
    };
    Previewmaker.prototype.stripLongTemplates = function () {
        this.html = this.html.replace(RegExp("^.{0,1000}[{][{][^}]*?(<(p|br)( /)?>\\s*){2,}([^{}]*?[}][}])?", "gi"), "");
        this.html = this.html.split("\n").join(" ");
        this.html = this.html.replace(RegExp("[{][{][^}]*<pre>[^}]*[}][}]", "gi"), "");
    };
    Previewmaker.prototype.killMultilineTemplates = function () {
        this.kill("{{{", "}}}");
        this.kill(RegExp("\\s*[{][{][^{}]*\\n"), "}}", "{{");
    };
    function loadAPIPreview(queryType, article, navpop) {
        var art = new Title(article).urlString();
        var url = pg.wiki.apiwikibase + "?format=json&formatversion=2&action=query&";
        var htmlGenerator = function () {
            alert("invalid html generator");
        };
        var usernameart = "";
        switch (queryType) {
            case "history":
                url += "titles=" + art + "&prop=revisions&rvlimit=" + getValueOf("popupHistoryPreviewLimit");
                htmlGenerator = APIhistoryPreviewHTML;
                break;
            case "category":
                url += "list=categorymembers&cmtitle=" + art;
                htmlGenerator = APIcategoryPreviewHTML;
                break;
            case "userinfo":
                var username = new Title(article).userName();
                usernameart = encodeURIComponent(username);
                if (pg.re.ipUser.test(username)) {
                    url += "list=blocks&bkprop=range|restrictions&bkip=" + usernameart;
                } else {
                    url += "list=users|usercontribs&usprop=blockinfo|groups|editcount|registration|gender&ususers=" + usernameart + "&meta=globaluserinfo&guiprop=groups|unattached&guiuser=" + usernameart + "&uclimit=1&ucprop=timestamp&ucuser=" + usernameart;
                }
                htmlGenerator = APIuserInfoPreviewHTML;
                break;
            case "contribs":
                usernameart = encodeURIComponent(new Title(article).userName());
                url += "list=usercontribs&ucuser=" + usernameart + "&uclimit=" + getValueOf("popupContribsPreviewLimit");
                htmlGenerator = APIcontribsPreviewHTML;
                break;
            case "imagepagepreview":
                var trail = "";
                if (getValueOf("popupImageLinks")) {
                    trail = "&list=imageusage&iutitle=" + art;
                }
                url += "titles=" + art + "&prop=revisions|imageinfo&rvprop=content" + trail;
                htmlGenerator = APIimagepagePreviewHTML;
                break;
            case "backlinks":
                url += "list=backlinks&bltitle=" + art;
                htmlGenerator = APIbacklinksPreviewHTML;
                break;
            case "revision":
                if (article.oldid) {
                    url += "revids=" + article.oldid;
                } else {
                    url += "titles=" + article.removeAnchor().urlString();
                }
                url += "&prop=revisions|pageprops|info|images|categories&rvprop=ids|timestamp|flags|comment|user|content&cllimit=max&imlimit=max";
                htmlGenerator = APIrevisionPreviewHTML;
                break;
        }
        pendingNavpopTask(navpop);
        var callback = function (d) {
            log("callback of API functions was hit");
            if (queryType === "userinfo") {
                fetchUserGroupNames(d.data).then(function () {
                    showAPIPreview(queryType, htmlGenerator(article, d, navpop), navpop.idNumber, navpop, d);
                });
                return;
            }
            showAPIPreview(queryType, htmlGenerator(article, d, navpop), navpop.idNumber, navpop, d);
        };
        var go = function () {
            getPageWithCaching(url, callback, navpop);
            return true;
        };
        if (navpop.visible || !getValueOf("popupLazyDownloads")) {
            go();
        } else {
            navpop.addHook(go, "unhide", "before", "DOWNLOAD_" + queryType + "_QUERY_DATA");
        }
    }
    function linkList(list) {
        list.sort(function (x, y) {
            return x == y ? 0 : x < y ? -1 : 1;
        });
        var buf = [];
        for (var i = 0; i < list.length; ++i) {
            buf.push(wikiLink({
                article: new Title(list[i]),
                text: list[i].split(" ").join("&nbsp;"),
                action: "view"
            }));
        }
        return buf.join(popupString("separator"));
    }
    function getTimeOffset() {
        var tz = mw.user.options.get("timecorrection");
        if (tz) {
            if (tz.indexOf("|") > -1) {
                return parseInt(tz.split("|")[1], 10);
            }
        }
        return 0;
    } function getTimeZone() {
        if (!pg.user.timeZone) {
            var tz = mw.user.options.get("timecorrection");
            pg.user.timeZone = "UTC";
            if (tz) {
                var tzComponents = tz.split("|");
                if (tzComponents.length === 3 && tzComponents[0] === "ZoneInfo") {
                    pg.user.timeZone = tzComponents[2];
                } else {
                    errlog("Unexpected timezone information: " + tz);
                }
            }
        }
        return pg.user.timeZone;
    }
    function useTimeOffset() {
        if (typeof Intl.DateTimeFormat.prototype.formatToParts === "undefined") {
            // IE 11
            return true;
        }
        var tz = mw.user.options.get("timecorrection");
        if (tz && tz.indexOf("ZoneInfo|") === -1) {
            return true;
        }
        return false;
    }
    function getLocales() {
        if (!pg.user.locales) {
            var userLanguage = document.querySelector("html").getAttribute("lang");
            if (getValueOf("popupLocale")) {
                userLanguage = getValueOf("popupLocale");
            } else if (userLanguage === "en") {
                if (getMWDateFormat() === "mdy") {
                    userLanguage = "en-US";
                } else {
                    userLanguage = "en-GB";
                }
            }
            pg.user.locales = Intl.DateTimeFormat.supportedLocalesOf([userLanguage, navigator.language]);
        }
        return pg.user.locales;
    }
    function getMWDateFormat() {
        return mw.user.options.get("date");
    }
    function editPreviewTable(article, h, reallyContribs) {
        var html = ["<table>"];
        var day = null;
        var curart = article;
        var page = null;
        var makeFirstColumnLinks;
        if (reallyContribs) {
            makeFirstColumnLinks = function (currentRevision) {
                var result = "(";
                result += '<a href="' + pg.wiki.titlebase + new Title(currentRevision.title).urlString() + "&diff=prev" + "&oldid=" + currentRevision.revid + '">' + popupString("diff") + "</a>";
                result += "&nbsp;|&nbsp;";
                result += '<a href="' + pg.wiki.titlebase + new Title(currentRevision.title).urlString() + '&action=history">' + popupString("hist") + "</a>";
                result += ")";
                return result;
            };
        } else {
            var firstRevid = h[0].revid;
            makeFirstColumnLinks = function (currentRevision) {
                var result = "(";
                result += '<a href="' + pg.wiki.titlebase + new Title(curart).urlString() + "&diff=" + firstRevid + "&oldid=" + currentRevision.revid + '">' + popupString("cur") + "</a>";
                result += "&nbsp;|&nbsp;";
                result += '<a href="' + pg.wiki.titlebase + new Title(curart).urlString() + "&diff=prev&oldid=" + currentRevision.revid + '">' + popupString("last") + "</a>";
                result += ")";
                return result;
            };
        }
        for (var i = 0; i < h.length; ++i) {
            if (reallyContribs) {
                page = h[i].title;
                curart = new Title(page);
            }
            var minor = h[i].minor ? "<b>m </b>" : "";
            var editDate = new Date(h[i].timestamp);
            var thisDay = formattedDate(editDate);
            var thisTime = formattedTime(editDate);
            if (thisDay == day) {
                thisDay = "";
            } else {
                day = thisDay;
            }
            if (thisDay) {
                html.push('<tr><td colspan=3><span class="popup_history_date">' + thisDay + "</span></td></tr>");
            }
            html.push('<tr class="popup_history_row_' + (i % 2 ? "odd" : "even") + '">');
            html.push("<td>" + makeFirstColumnLinks(h[i]) + "</td>");
            html.push("<td>" + '<a href="' + pg.wiki.titlebase + new Title(curart).urlString() + "&oldid=" + h[i].revid + '">' + thisTime + "</a></td>");
            var col3url = "",
                col3txt = "";
            if (!reallyContribs) {
                var user = h[i].user;
                if (!h[i].userhidden) {
                    if (pg.re.ipUser.test(user)) {
                        col3url = pg.wiki.titlebase + mw.config.get("wgFormattedNamespaces")[pg.nsSpecialId] + ":Contributions&target=" + new Title(user).urlString();
                    } else {
                        col3url = pg.wiki.titlebase + mw.config.get("wgFormattedNamespaces")[pg.nsUserId] + ":" + new Title(user).urlString();
                    }
                    col3txt = pg.escapeQuotesHTML(user);
                } else {
                    col3url = getValueOf("popupRevDelUrl");
                    col3txt = pg.escapeQuotesHTML(popupString("revdel"));
                }
            } else {
                col3url = pg.wiki.titlebase + curart.urlString();
                col3txt = pg.escapeQuotesHTML(page);
            }
            html.push("<td>" + (reallyContribs ? minor : "") + '<a href="' + col3url + '">' + col3txt + "</a></td>");
            var comment = "";
            var c = h[i].comment || h[i].content;
            if (c) {
                comment = new Previewmaker(c, new Title(curart).toUrl()).editSummaryPreview();
            } else if (h[i].commenthidden) {
                comment = popupString("revdel");
            }
            html.push("<td>" + (!reallyContribs ? minor : "") + comment + "</td>");
            html.push("</tr>");
            html = [html.join("")];
        }
        html.push("</table>");
        return html.join("");
    }
    function adjustDate(d, offset) {
        var o = offset * 60 * 1e3;
        return new Date(+d + o);
    }
    function convertTimeZone(date, timeZone) {
        return new Date(date.toLocaleString("en-US", {
            timeZone: timeZone
        }));
    }
    function formattedDateTime(date) {
        if (useTimeOffset()) {
            return formattedDate(date) + " " + formattedTime(date);
        }
        if (getMWDateFormat() === "ISO 8601") {
            var d2 = convertTimeZone(date, getTimeZone());
            return map(zeroFill, [d2.getFullYear(), d2.getMonth() + 1, d2.getDate()]).join("-") + "T" + map(zeroFill, [d2.getHours(), d2.getMinutes(), d2.getSeconds()]).join(":");
        }
        var options = getValueOf("popupDateTimeFormatterOptions");
        options.timeZone = getTimeZone();
        return date.toLocaleString(getLocales(), options);
    }
    function formattedDate(date) {
        if (useTimeOffset()) {
            var d2 = adjustDate(date, getTimeOffset());
            return map(zeroFill, [d2.getUTCFullYear(), d2.getUTCMonth() + 1, d2.getUTCDate()]).join("-");
        }
        if (getMWDateFormat() === "ISO 8601") {
            var d2 = convertTimeZone(date, getTimeZone());
            return map(zeroFill, [d2.getFullYear(), d2.getMonth() + 1, d2.getDate()]).join("-");
        }
        var options = getValueOf("popupDateFormatterOptions");
        options.timeZone = getTimeZone();
        return date.toLocaleDateString(getLocales(), options);
    }
    function formattedTime(date) {
        if (useTimeOffset()) {
            var d2 = adjustDate(date, getTimeOffset());
            return map(zeroFill, [d2.getUTCHours(), d2.getUTCMinutes(), d2.getUTCSeconds()]).join(":");
        }
        if (getMWDateFormat() === "ISO 8601") {
            var d2 = convertTimeZone(date, getTimeZone());
            return map(zeroFill, [d2.getHours(), d2.getMinutes(), d2.getSeconds()]).join(":");
        }
        var options = getValueOf("popupTimeFormatterOptions");
        options.timeZone = getTimeZone();
        return date.toLocaleTimeString(getLocales(), options);
    }
    function fetchUserGroupNames(userinfoResponse) {
        var queryObj = getJsObj(userinfoResponse).query;
        var user = anyChild(queryObj.users);
        var messages = [];
        if (user.groups) {
            user.groups.forEach(function (groupName) {
                messages.push("group-" + groupName + "-member");
            });
        }
        if (queryObj.globaluserinfo && queryObj.globaluserinfo.groups) {
            queryObj.globaluserinfo.groups.forEach(function (groupName) {
                messages.push("group-" + groupName + "-member");
            });
        }
        return getMwApi().loadMessagesIfMissing(messages);
    }
    function showAPIPreview(queryType, html, id, navpop, download) {
        var target = "popupPreview";
        completedNavpopTask(navpop);
        switch (queryType) {
            case "imagelinks":
            case "category":
                target = "popupPostPreview";
                break;
            case "userinfo":
                target = "popupUserData";
                break;
            case "revision":
                insertPreview(download);
                return;
        }
        setPopupTipsAndHTML(html, target, id);
    }
    function APIrevisionPreviewHTML(article, download) {
        try {
            var jsObj = getJsObj(download.data);
            var page = anyChild(jsObj.query.pages);
            if (page.missing) {
                download.owner = null;
                return;
            }
            var content = page && page.revisions && page.revisions[0].contentmodel === "wikitext" ? page.revisions[0].content : null;
            if (typeof content === "string") {
                download.data = content;
                download.lastModified = new Date(page.revisions[0].timestamp);
            }
        } catch (someError) {
            return "Revision preview failed :(";
        }
    }
    function APIbacklinksPreviewHTML(article, download) {
        try {
            var jsObj = getJsObj(download.data);
            var list = jsObj.query.backlinks;
            var html = [];
            if (!list) {
                return popupString("No backlinks found");
            }
            for (var i = 0; i < list.length; i++) {
                var t = new Title(list[i].title);
                html.push('<a href="' + pg.wiki.titlebase + t.urlString() + '">' + t + "</a>");
            }
            html = html.join(popupString("separator"));
            if (jsObj["continue"] && jsObj["continue"].blcontinue) {
                html += popupString(" and more");
            }
            return html;
        } catch (someError) {
            return "backlinksPreviewHTML went wonky";
        }
    }
    pg.fn.APIsharedImagePagePreviewHTML = function APIsharedImagePagePreviewHTML(obj) {
        log("APIsharedImagePagePreviewHTML");
        var popupid = obj.requestid;
        if (obj.query && obj.query.pages) {
            var page = anyChild(obj.query.pages);
            var content = page && page.revisions && page.revisions[0].contentmodel === "wikitext" ? page.revisions[0].content : null;
            if (typeof content === "string" && pg && pg.current && pg.current.link && pg.current.link.navpopup) {
                var p = new Previewmaker(content, pg.current.link.navpopup.article, pg.current.link.navpopup);
                p.makePreview();
                setPopupHTML(p.html, "popupSecondPreview", popupid);
            }
        }
    };
    function APIimagepagePreviewHTML(article, download, navpop) {
        try {
            var jsObj = getJsObj(download.data);
            var page = anyChild(jsObj.query.pages);
            var content = page && page.revisions && page.revisions[0].contentmodel === "wikitext" ? page.revisions[0].content : null;
            var ret = "";
            var alt = "";
            try {
                alt = navpop.parentAnchor.childNodes[0].alt;
            } catch (e) {
            }
            if (alt) {
                ret = ret + "<hr /><b>" + popupString("Alt text:") + "</b> " + pg.escapeQuotesHTML(alt);
            }
            if (typeof content === "string") {
                var p = prepPreviewmaker(content, article, navpop);
                p.makePreview();
                if (p.html) {
                    ret += "<hr />" + p.html;
                }
                if (getValueOf("popupSummaryData")) {
                    var info = getPageInfo(content, download);
                    log(info);
                    setPopupTrailer(info, navpop.idNumber);
                }
            }
            if (page && page.imagerepository == "shared") {
                var art = new Title(article);
                var encart = encodeURIComponent("File:" + art.stripNamespace());
                var shared_url = pg.wiki.apicommonsbase + "?format=json&formatversion=2" + "&callback=pg.fn.APIsharedImagePagePreviewHTML" + "&requestid=" + navpop.idNumber + "&action=query&prop=revisions&rvprop=content&titles=" + encart;
                ret = ret + "<hr />" + popupString("Image from Commons") + ': <a href="' + pg.wiki.commonsbase + "?title=" + encart + '">' + popupString("Description page") + "</a>";
                mw.loader.load(shared_url);
            }
            showAPIPreview("imagelinks", APIimagelinksPreviewHTML(article, download), navpop.idNumber, download);
            return ret;
        } catch (someError) {
            return "API imagepage preview failed :(";
        }
    }
    function APIimagelinksPreviewHTML(article, download) {
        try {
            var jsobj = getJsObj(download.data);
            var list = jsobj.query.imageusage;
            if (list) {
                var ret = [];
                for (var i = 0; i < list.length; i++) {
                    ret.push(list[i].title);
                }
                if (ret.length === 0) {
                    return popupString("No image links found");
                }
                return "<h2>" + popupString("File links") + "</h2>" + linkList(ret);
            }
            return popupString("No image links found");
        } catch (someError) {
            return "Image links preview generation failed :(";
        }
    }
    function APIcategoryPreviewHTML(article, download) {
        try {
            var jsobj = getJsObj(download.data);
            var list = jsobj.query.categorymembers;
            var ret = [];
            for (var p = 0; p < list.length; p++) {
                ret.push(list[p].title);
            }
            if (ret.length === 0) {
                return popupString("Empty category");
            }
            ret = "<h2>" + tprintf("Category members (%s shown)", [ret.length]) + "</h2>" + linkList(ret);
            if (jsobj["continue"] && jsobj["continue"].cmcontinue) {
                ret += popupString(" and more");
            }
            return ret;
        } catch (someError) {
            return "Category preview failed :(";
        }
    }
    function APIuserInfoPreviewHTML(article, download) {
        var ret = [];
        var queryobj = {};
        try {
            queryobj = getJsObj(download.data).query;
        } catch (someError) {
            return "Userinfo preview failed :(";
        }
        var user = anyChild(queryobj.users);
        if (user) {
            var globaluserinfo = queryobj.globaluserinfo;
            if (user.invalid === "") {
                ret.push(popupString("Invalid user"));
            } else if (user.missing === "") {
                ret.push(popupString("Not a registered username"));
            }
            if (user.blockedby) {
                if (user.blockpartial) {
                    ret.push("<b>" + popupString("Has blocks") + "</b>");
                } else {
                    ret.push("<b>" + popupString("BLOCKED") + "</b>");
                }
            }
            if (globaluserinfo && ("locked" in globaluserinfo || "hidden" in globaluserinfo)) {
                var lockedSulAccountIsAttachedToThis = true;
                for (var i = 0; globaluserinfo.unattached && i < globaluserinfo.unattached.length; i++) {
                    if (globaluserinfo.unattached[i].wiki === mw.config.get("wgDBname")) {
                        lockedSulAccountIsAttachedToThis = false;
                        break;
                    }
                }
                if (lockedSulAccountIsAttachedToThis) {
                    if ("locked" in globaluserinfo) {
                        ret.push("<b><i>" + popupString("LOCKED") + "</i></b>");
                    }
                    if ("hidden" in globaluserinfo) {
                        ret.push("<b><i>" + popupString("HIDDEN") + "</i></b>");
                    }
                }
            }
            if (getValueOf("popupShowGender") && user.gender) {
                // https://en.wikipedia.org/w/index.php?diff=1028542485&oldid=1018830293
                // really boring
                switch (user.gender) {
                    case "male":
                        ret.push(popupString("♂"));
                        break;
                    case "female":
                        ret.push(popupString("♀"));
                        break;
                }
            }
            if (user.groups) {
                // 自定义
                var ug = [];
                user.groups.forEach(function (groupName) {
                    if (["*", "user", "autoconfirmed", "extendedconfirmed"].indexOf(groupName) === -1) {
                        ug.push(pg.escapeQuotesHTML(mw.message("group-" + groupName + "-member", user.gender).text()));
                    }
                });
                if (user.groups.indexOf("autoconfirmed") === -1) {
                    ug.push("<b>" + pg.escapeQuotesHTML(popupString("group-no-autoconfirmed")) + "</b>");
                }
                if (ug.length === 0) {
                    ug.push(pg.escapeQuotesHTML(mw.message("group-user-member", user.gender).text()));
                }
                ret.push(ug.join(popupString("separator")));
            }
            if (globaluserinfo && globaluserinfo.groups) {
                var gug = [];
                globaluserinfo.groups.forEach(function (groupName) {
                    gug.push("<i>" + pg.escapeQuotesHTML(mw.message("group-" + groupName + "-member", user.gender).text()) + "</i>");
                });
                ret.push(gug.join(popupString("separator")));
            }
            if (user.registration) {
                ret.push(pg.escapeQuotesHTML((user.editcount ? user.editcount : "0") + popupString(" edits since: ") + (user.registration ? formattedDate(new Date(user.registration)) : "")));
            }
        }
        if (queryobj.usercontribs && queryobj.usercontribs.length) {
            ret.push(popupString("last edit on ") + formattedDate(new Date(queryobj.usercontribs[0].timestamp)));
        }
        if (queryobj.blocks) {
            ret.push(popupString("IP user"));
            for (var l = 0; l < queryobj.blocks.length; l++) {
                var rbstr = queryobj.blocks[l].rangestart === queryobj.blocks[l].rangeend ? "BLOCK" : "RANGEBLOCK";
                rbstr = !Array.isArray(queryobj.blocks[l].restrictions) ? "Has " + rbstr.toLowerCase() + "s" : rbstr + "ED";
                ret.push("<b>" + popupString(rbstr) + "</b>");
            }
        }
        ret = "<hr />" + ret.join(popupString("comma"));
        return ret;
    }
    function APIcontribsPreviewHTML(article, download, navpop) {
        return APIhistoryPreviewHTML(article, download, navpop, true);
    }
    function APIhistoryPreviewHTML(article, download, navpop, reallyContribs) {
        try {
            var jsobj = getJsObj(download.data);
            var edits = [];
            if (reallyContribs) {
                edits = jsobj.query.usercontribs;
            } else {
                edits = anyChild(jsobj.query.pages).revisions;
            }
            var ret = editPreviewTable(article, edits, reallyContribs);
            return ret;
        } catch (someError) {
            return "History preview failed :-(";
        }
    }
    function setupDebugging() {
        if (window.popupDebug) {
            window.log = function (x) {
                window.console.log(x);
            };
            window.errlog = function (x) {
                window.console.error(x);
            };
            log("Initializing logger");
        } else {
            window.log = function () {
            };
            window.errlog = function () {
            };
        }
    }
    function loadImage(image, navpop) {
        if (typeof image.stripNamespace != "function") {
            alert("loadImages bad");
        }
        if (!getValueOf("popupImages")) {
            return;
        }
        if (!isValidImageName(image)) {
            return false;
        }
        var art = image.urlString();
        var url = pg.wiki.apiwikibase + "?format=json&formatversion=2&action=query";
        url += "&prop=imageinfo&iiprop=url|mime&iiurlwidth=" + getValueOf("popupImageSizeLarge");
        url += "&titles=" + art;
        pendingNavpopTask(navpop);
        var callback = function (d) {
            popupsInsertImage(navpop.idNumber, navpop, d);
        };
        var go = function () {
            getPageWithCaching(url, callback, navpop);
            return true;
        };
        if (navpop.visible || !getValueOf("popupLazyDownloads")) {
            go();
        } else {
            navpop.addHook(go, "unhide", "after", "DOWNLOAD_IMAGE_QUERY_DATA");
        }
    }
    function popupsInsertImage(id, navpop, download) {
        log("popupsInsertImage");
        var imageinfo;
        try {
            var jsObj = getJsObj(download.data);
            var imagepage = anyChild(jsObj.query.pages);
            if (typeof imagepage.imageinfo === "undefined") {
                return;
            }
            imageinfo = imagepage.imageinfo[0];
        } catch (someError) {
            log("popupsInsertImage failed :(");
            return;
        }
        var popupImage = document.getElementById("popupImg" + id);
        if (!popupImage) {
            log("could not find insertion point for image");
            return;
        }
        popupImage.width = getValueOf("popupImageSize");
        popupImage.style.display = "inline";
        if (imageinfo.thumburl) {
            popupImage.src = imageinfo.thumburl;
        } else if (imageinfo.mime.indexOf("image") === 0) {
            popupImage.src = imageinfo.url;
            log("a thumb could not be found, using original image");
        } else {
            log("fullsize imagethumb, but not sure if it's an image");
        }
        var a = document.getElementById("popupImageLink" + id);
        if (a === null) {
            return null;
        }
        switch (getValueOf("popupThumbAction")) {
            case "imagepage":
                if (pg.current.article.namespaceId() != pg.nsImageId) {
                    a.href = imageinfo.descriptionurl;
                    popTipsSoonFn("popupImage" + id)();
                    break;
                }
            case "sizetoggle":
                a.onclick = toggleSize;
                a.title = popupString("Toggle image size");
                return;
            case "linkfull":
                a.href = imageinfo.url;
                a.title = popupString("Open full-size image");
                return;
        }
    }
    function toggleSize() {
        var imgContainer = this;
        if (!imgContainer) {
            alert("imgContainer is null :/");
            return;
        }
        var img = imgContainer.firstChild;
        if (!img) {
            alert("img is null :/");
            return;
        }
        if (!img.style.width || img.style.width === "") {
            img.style.width = "100%";
        } else {
            img.style.width = "";
        }
    }
    function getValidImageFromWikiText(wikiText) {
        var matched = null;
        var match;
        var t = removeMatchesUnless(wikiText, RegExp("(<!--[\\s\\S]*?-->)"), 1, RegExp("^<!--[^[]*popup", "i"));
        while (match = pg.re.image.exec(t)) {
            var m = match[2] || match[6];
            if (isValidImageName(m)) {
                matched = m;
                break;
            }
        }
        pg.re.image.lastIndex = 0;
        if (!matched) {
            return null;
        }
        return mw.config.get("wgFormattedNamespaces")[pg.nsImageId] + ":" + upcaseFirst(matched);
    }
    function removeMatchesUnless(str, re1, parencount, re2) {
        var split = str.parenSplit(re1);
        var c = parencount + 1;
        for (var i = 0; i < split.length; ++i) {
            if (i % c === 0 || re2.test(split[i])) {
                continue;
            }
            split[i] = "";
        }
        return split.join("");
    }
    function setNamespaces() {
        pg.nsSpecialId = -1;
        pg.nsMainspaceId = 0;
        pg.nsImageId = 6;
        pg.nsUserId = 2;
        pg.nsUsertalkId = 3;
        pg.nsCategoryId = 14;
        pg.nsTemplateId = 10;
    }
    function setRedirs() {
        var r = "redirect";
        var R = "REDIRECT";
        var redirLists = {
            ar: [R, "تحويل"],
            be: [r, "перанакіраваньне"],
            bg: [r, "пренасочване", "виж"],
            bs: [r, "Preusmjeri", "preusmjeri", "PREUSMJERI"],
            cs: [R, "PŘESMĚRUJ"],
            cy: [r, "ail-cyfeirio"],
            de: [R, "WEITERLEITUNG"],
            el: [R, "ΑΝΑΚΑΤΕΥΘΥΝΣΗ"],
            eo: [R, "ALIDIREKTU", "ALIDIREKTI"],
            es: [R, "REDIRECCIÓN"],
            et: [r, "suuna"],
            ga: [r, "athsheoladh"],
            gl: [r, "REDIRECCIÓN", "REDIRECIONAMENTO"],
            he: [R, "הפניה"],
            hu: [R, "ÁTIRÁNYÍTÁS"],
            is: [r, "tilvísun", "TILVÍSUN"],
            it: [R, "RINVIA", "Rinvia"],
            ja: [R, "転送"],
            mk: [r, "пренасочување", "види"],
            nds: [r, "wiederleiden"],
            nl: [R, "DOORVERWIJZING"],
            nn: [r, "omdiriger"],
            pl: [R, "PATRZ", "PRZEKIERUJ", "TAM"],
            pt: [R, "redir"],
            ru: [R, "ПЕРЕНАПРАВЛЕНИЕ", "ПЕРЕНАПР"],
            sk: [r, "presmeruj"],
            sr: [r, "Преусмери", "преусмери", "ПРЕУСМЕРИ", "Preusmeri", "preusmeri", "PREUSMERI"],
            tt: [R, "yünältü", "перенаправление", "перенапр"],
            uk: [R, "ПЕРЕНАПРАВЛЕННЯ", "ПЕРЕНАПР"],
            vi: [r, "đổi"],
            zh: [R, "重定向"]
        };
        var redirList = redirLists[pg.wiki.lang] || [r, R];
        pg.re.redirect = RegExp("^\\s*[#](" + redirList.join("|") + ").*?\\[{2}([^\\|\\]]*)(|[^\\]]*)?\\]{2}\\s*(.*)", "i");
    }
    function setInterwiki() {
        if (pg.wiki.wikimedia) {
            pg.wiki.interwiki = "aa|ab|ace|af|ak|als|am|an|ang|ar|arc|arz|as|ast|av|ay|az|ba|bar|bat-smg|bcl|be|be-x-old|bg|bh|bi|bjn|bm|bn|bo|bpy|br|bs|bug|bxr|ca|cbk-zam|cdo|ce|ceb|ch|cho|chr|chy|ckb|co|cr|crh|cs|csb|cu|cv|cy|da|de|diq|dsb|dv|dz|ee|el|eml|en|eo|es|et|eu|ext|fa|ff|fi|fiu-vro|fj|fo|fr|frp|frr|fur|fy|ga|gag|gan|gd|gl|glk|gn|got|gu|gv|ha|hak|haw|he|hi|hif|ho|hr|hsb|ht|hu|hy|hz|ia|id|ie|ig|ii|ik|ilo|io|is|it|iu|ja|jbo|jv|ka|kaa|kab|kbd|kg|ki|kj|kk|kl|km|kn|ko|koi|kr|krc|ks|ksh|ku|kv|kw|ky|la|lad|lb|lbe|lg|li|lij|lmo|ln|lo|lt|ltg|lv|map-bms|mdf|mg|mh|mhr|mi|mk|ml|mn|mo|mr|mrj|ms|mt|mus|mwl|my|myv|mzn|na|nah|nap|nds|nds-nl|ne|new|ng|nl|nn|no|nov|nrm|nv|ny|oc|om|or|os|pa|pag|pam|pap|pcd|pdc|pfl|pi|pih|pl|pms|pnb|pnt|ps|pt|qu|rm|rmy|rn|ro|roa-rup|roa-tara|ru|rue|rw|sa|sah|sc|scn|sco|sd|se|sg|sh|si|simple|sk|sl|sm|sn|so|sq|sr|srn|ss|st|stq|su|sv|sw|szl|ta|te|tet|tg|th|ti|tk|tl|tn|to|tpi|tr|ts|tt|tum|tw|ty|udm|ug|uk|ur|uz|ve|vec|vi|vls|vo|wa|war|wo|wuu|xal|xh|yi|yo|za|zea|zh|zh-classical|zh-min-nan|zh-yue|zu";
            pg.re.interwiki = RegExp("^" + pg.wiki.interwiki + ":");
        } else {
            pg.wiki.interwiki = null;
            pg.re.interwiki = RegExp("^$");
        }
    }
    function nsRe(namespaceId) {
        var imageNamespaceVariants = [];
        jQuery.each(mw.config.get("wgNamespaceIds"), function (_localizedNamespaceLc, _namespaceId) {
            if (_namespaceId != namespaceId) {
                return;
            }
            _localizedNamespaceLc = upcaseFirst(_localizedNamespaceLc);
            imageNamespaceVariants.push(mw.util.escapeRegExp(_localizedNamespaceLc).split(" ").join("[ _]"));
            imageNamespaceVariants.push(mw.util.escapeRegExp(encodeURI(_localizedNamespaceLc)));
        });
        return "(?:" + imageNamespaceVariants.join("|") + ")";
    }
    function nsReImage() {
        return nsRe(pg.nsImageId);
    }
    function getEditboxSelection() {
        var editbox;
        try {
            editbox = document.editform.wpTextbox1;
        } catch (dang) {
            return;
        }
        if (document.selection) {
            return document.selection.createRange().text;
        }
        var selStart = editbox.selectionStart;
        var selEnd = editbox.selectionEnd;
        return editbox.value.substring(selStart, selEnd);
    }
    function doSelectionPopup() {
        var sel = getEditboxSelection();
        var open = sel.indexOf("[[");
        var pipe = sel.indexOf("|");
        var close = sel.indexOf("]]");
        if (open == -1 || pipe == -1 && close == -1) {
            return;
        }
        if (pipe != -1 && open > pipe || close != -1 && open > close) {
            return;
        }
        if (getValueOf("popupOnEditSelection") == "boxpreview") {
            return doSeparateSelectionPopup(sel);
        }
        var article = new Title(sel.substring(open + 2, pipe < 0 ? close : pipe)).urlString();
        if (close > 0 && sel.substring(close + 2).indexOf("[[") >= 0) {
            return;
        }
        var a = document.createElement("a");
        a.href = pg.wiki.titlebase + article;
        mouseOverWikiLink2(a);
        if (a.navpopup) {
            a.navpopup.addHook(function () {
                runStopPopupTimer(a.navpopup);
            }, "unhide", "after");
        }
    }
    function doSeparateSelectionPopup(str) {
        var div = document.getElementById("selectionPreview");
        if (!div) {
            div = document.createElement("div");
            div.id = "selectionPreview";
            try {
                var box = document.editform.wpTextbox1;
                box.parentNode.insertBefore(div, box);
            } catch (error) {
                return;
            }
        }
        div.innerHTML = wiki2html(str);
        div.ranSetupTooltipsAlready = false;
        popTipsSoonFn("selectionPreview")();
    }
    function Mousetracker() {
        this.loopDelay = 400;
        this.timer = null;
        this.active = false;
        this.dirty = true;
        this.hooks = [];
    }
    Mousetracker.prototype.addHook = function (f) {
        this.hooks.push(f);
    };
    Mousetracker.prototype.runHooks = function () {
        if (!this.hooks || !this.hooks.length) {
            return;
        }
        var remove = false;
        var removeObj = {};
        var x = this.x,
            y = this.y,
            len = this.hooks.length;
        for (var i = 0; i < len; ++i) {
            if (this.hooks[i](x, y) === true) {
                remove = true;
                removeObj[i] = true;
            }
        }
        if (remove) {
            this.removeHooks(removeObj);
        }
    };
    Mousetracker.prototype.removeHooks = function (removeObj) {
        var newHooks = [];
        var len = this.hooks.length;
        for (var i = 0; i < len; ++i) {
            if (!removeObj[i]) {
                newHooks.push(this.hooks[i]);
            }
        }
        this.hooks = newHooks;
    };
    Mousetracker.prototype.track = function (e) {
        e = e || window.event;
        var x, y;
        if (e) {
            if (e.pageX) {
                x = e.pageX;
                y = e.pageY;
            } else if (typeof e.clientX != "undefined") {
                var left, top, docElt = document.documentElement;
                if (docElt) {
                    left = docElt.scrollLeft;
                }
                left = left || document.body.scrollLeft || document.scrollLeft || 0;
                if (docElt) {
                    top = docElt.scrollTop;
                }
                top = top || document.body.scrollTop || document.scrollTop || 0;
                x = e.clientX + left;
                y = e.clientY + top;
            } else {
                return;
            }
            this.setPosition(x, y);
        }
    };
    Mousetracker.prototype.setPosition = function (x, y) {
        this.x = x;
        this.y = y;
        if (this.dirty || this.hooks.length === 0) {
            this.dirty = false;
            return;
        }
        if (typeof this.lastHook_x != "number") {
            this.lastHook_x = -100;
            this.lastHook_y = -100;
        }
        var diff = (this.lastHook_x - x) * (this.lastHook_y - y);
        diff = diff >= 0 ? diff : -diff;
        if (diff > 1) {
            this.lastHook_x = x;
            this.lastHook_y = y;
            if (this.dirty) {
                this.dirty = false;
            } else {
                this.runHooks();
            }
        }
    };
    Mousetracker.prototype.enable = function () {
        if (this.active) {
            return;
        }
        this.active = true;
        this.savedHandler = document.onmousemove;
        var savedThis = this;
        document.onmousemove = function (e) {
            savedThis.track.apply(savedThis, [e]);
        };
        if (this.loopDelay) {
            this.timer = setInterval(function () {
                savedThis.runHooks();
            }, this.loopDelay);
        }
    };
    Mousetracker.prototype.disable = function () {
        if (!this.active) {
            return;
        }
        if (typeof this.savedHandler === "function") {
            document.onmousemove = this.savedHandler;
        } else {
            delete document.onmousemove;
        }
        if (this.timer) {
            clearInterval(this.timer);
        }
        this.active = false;
    };
    function Navpopup() {
        this.uid = Navpopup.uid++;
        this.visible = false;
        this.noshow = false;
        this.hooks = {
            create: [],
            unhide: [],
            hide: []
        };
        this.hookIds = {};
        this.downloads = [];
        this.pending = null;
        this.fuzz = 5;
        this.constrained = true;
        this.width = 0;
        this.height = 0;
        this.mainDiv = null;
        this.createMainDiv();
    }
    Navpopup.uid = 0;
    Navpopup.prototype.isVisible = function () {
        return this.visible;
    };
    Navpopup.prototype.reposition = function (x, y, noLimitHor) {
        log("reposition(" + x + "," + y + "," + noLimitHor + ")");
        if (typeof x != "undefined" && x !== null) {
            this.left = x;
        }
        if (typeof y != "undefined" && y !== null) {
            this.top = y;
        }
        if (typeof this.left != "undefined" && typeof this.top != "undefined") {
            this.mainDiv.style.left = this.left + "px";
            this.mainDiv.style.top = this.top + "px";
        }
        if (!noLimitHor) {
            this.limitHorizontalPosition();
        }
    };
    Navpopup.prototype.limitHorizontalPosition = function () {
        if (!this.constrained || this.tooWide) {
            return;
        }
        this.updateDimensions();
        var x = this.left;
        var w = this.width;
        var cWidth = document.body.clientWidth;
        if (x + w >= cWidth || x > 0 && this.maxWidth && this.width < this.maxWidth && this.height > this.width && x > cWidth - this.maxWidth) {
            this.mainDiv.style.left = "-10000px";
            this.mainDiv.style.width = this.maxWidth + "px";
            var naturalWidth = parseInt(this.mainDiv.offsetWidth, 10);
            var newLeft = cWidth - naturalWidth - 1;
            if (newLeft < 0) {
                newLeft = 0;
                this.tooWide = true;
            }
            log("limitHorizontalPosition: moving to (" + newLeft + "," + this.top + ");" + " naturalWidth=" + naturalWidth + ", clientWidth=" + cWidth);
            this.reposition(newLeft, null, true);
        }
    };
    Navpopup.highest = 1e3;
    Navpopup.prototype.raise = function () {
        this.mainDiv.style.zIndex = Navpopup.highest + 1;
        ++Navpopup.highest;
    };
    Navpopup.prototype.show = function () {
        if (this.noshow) {
            return;
        }
        this.reposition();
        this.raise();
        this.unhide();
    };
    Navpopup.prototype.showSoonIfStable = function (time) {
        log("showSoonIfStable, time=" + time);
        if (this.visible) {
            return;
        }
        this.noshow = false;
        this.stable_x = -1e4;
        this.stable_y = -1e4;
        var stableShow = function () {
            log("stableShow called");
            var new_x = Navpopup.tracker.x,
                new_y = Navpopup.tracker.y;
            var dx = savedThis.stable_x - new_x,
                dy = savedThis.stable_y - new_y;
            var fuzz2 = 0;
            if (dx * dx <= fuzz2 && dy * dy <= fuzz2) {
                log("mouse is stable");
                clearInterval(savedThis.showSoonStableTimer);
                savedThis.reposition.apply(savedThis, [new_x + 2, new_y + 2]);
                savedThis.show.apply(savedThis, []);
                savedThis.limitHorizontalPosition.apply(savedThis, []);
                return;
            }
            savedThis.stable_x = new_x;
            savedThis.stable_y = new_y;
        };
        var savedThis = this;
        this.showSoonStableTimer = setInterval(stableShow, time / 2);
    };
    Navpopup.prototype.banish = function () {
        log("banish called");
        this.noshow = true;
        if (this.showSoonStableTimer) {
            log("clearing showSoonStableTimer");
            clearInterval(this.showSoonStableTimer);
        }
        this.hide();
    };
    Navpopup.prototype.runHooks = function (key, when) {
        if (!this.hooks[key]) {
            return;
        }
        var keyHooks = this.hooks[key];
        var len = keyHooks.length;
        for (var i = 0; i < len; ++i) {
            if (keyHooks[i] && keyHooks[i].when == when) {
                if (keyHooks[i].hook.apply(this, [])) {
                    if (keyHooks[i].hookId) {
                        delete this.hookIds[keyHooks[i].hookId];
                    }
                    keyHooks[i] = null;
                }
            }
        }
    };
    Navpopup.prototype.addHook = function (hook, key, when, uid) {
        when = when || "after";
        if (!this.hooks[key]) {
            return;
        }
        var hookId = null;
        if (uid) {
            hookId = [key, when, uid].join("|");
            if (this.hookIds[hookId]) {
                return;
            }
            this.hookIds[hookId] = true;
        }
        this.hooks[key].push({
            hook: hook,
            when: when,
            hookId: hookId
        });
    };
    Navpopup.prototype.createMainDiv = function () {
        if (this.mainDiv) {
            return;
        }
        this.runHooks("create", "before");
        var mainDiv = document.createElement("div");
        var savedThis = this;
        mainDiv.onclick = function (e) {
            savedThis.onclickHandler(e);
        };
        mainDiv.className = this.className ? this.className : "navpopup_maindiv";
        mainDiv.id = mainDiv.className + this.uid;
        mainDiv.style.position = "absolute";
        mainDiv.style.minWidth = "350px";
        mainDiv.style.display = "none";
        mainDiv.className = "navpopup";
        mainDiv.navpopup = this;
        this.mainDiv = mainDiv;
        document.body.appendChild(mainDiv);
        this.runHooks("create", "after");
    };
    Navpopup.prototype.onclickHandler = function () {
        this.raise();
    };
    Navpopup.prototype.makeDraggable = function (handleName) {
        if (!this.mainDiv) {
            this.createMainDiv();
        }
        var drag = new Drag();
        if (!handleName) {
            drag.startCondition = function (e) {
                try {
                    if (!e.shiftKey) {
                        return false;
                    }
                } catch (err) {
                    return false;
                }
                return true;
            };
        }
        var dragHandle;
        if (handleName) {
            dragHandle = document.getElementById(handleName);
        }
        if (!dragHandle) {
            dragHandle = this.mainDiv;
        }
        var np = this;
        drag.endHook = function (x, y) {
            Navpopup.tracker.dirty = true;
            np.reposition(x, y);
        };
        drag.init(dragHandle, this.mainDiv);
    };
    Navpopup.prototype.hide = function () {
        this.runHooks("hide", "before");
        this.abortDownloads();
        if (typeof this.visible != "undefined" && this.visible) {
            this.mainDiv.style.display = "none";
            this.visible = false;
        }
        this.runHooks("hide", "after");
    };
    Navpopup.prototype.unhide = function () {
        this.runHooks("unhide", "before");
        if (typeof this.visible != "undefined" && !this.visible) {
            this.mainDiv.style.display = "inline";
            this.visible = true;
        }
        this.runHooks("unhide", "after");
    };
    Navpopup.prototype.setInnerHTML = function (html) {
        this.mainDiv.innerHTML = html;
    };
    Navpopup.prototype.updateDimensions = function () {
        this.width = parseInt(this.mainDiv.offsetWidth, 10);
        this.height = parseInt(this.mainDiv.offsetHeight, 10);
    };
    Navpopup.prototype.isWithin = function (x, y) {
        if (!this.visible) {
            return false;
        }
        this.updateDimensions();
        var fuzz = this.fuzz || 0;
        return x + fuzz >= this.left && x - fuzz <= this.left + this.width && y + fuzz >= this.top && y - fuzz <= this.top + this.height;
    };
    Navpopup.prototype.addDownload = function (download) {
        if (!download) {
            return;
        }
        this.downloads.push(download);
    };
    Navpopup.prototype.abortDownloads = function () {
        for (var i = 0; i < this.downloads.length; ++i) {
            var d = this.downloads[i];
            if (d && d.abort) {
                d.abort();
            }
        }
        this.downloads = [];
    };
    Navpopup.tracker = new Mousetracker();
    function delFmt(x) {
        if (!x.length) {
            return "";
        }
        return "<del class='popupDiff'>" + x.join("") + "</del>";
    }
    function insFmt(x) {
        if (!x.length) {
            return "";
        }
        return "<ins class='popupDiff'>" + x.join("") + "</ins>";
    }
    function countCrossings(a, b, i, eject) {
        if (!b[i].row && b[i].row !== 0) {
            return -1;
        }
        var count = 0;
        for (var j = 0; j < a.length; ++j) {
            if (!a[j].row && a[j].row !== 0) {
                continue;
            }
            if ((j - b[i].row) * (i - a[j].row) > 0) {
                if (eject) {
                    return true;
                }
                count++;
            }
        }
        return count;
    }
    function shortenDiffString(str, context) {
        var re = RegExp("(<del[\\s\\S]*?</del>|<ins[\\s\\S]*?</ins>)");
        var splitted = str.parenSplit(re);
        var ret = [""];
        for (var i = 0; i < splitted.length; i += 2) {
            if (splitted[i].length < 2 * context) {
                ret[ret.length - 1] += splitted[i];
                if (i + 1 < splitted.length) {
                    ret[ret.length - 1] += splitted[i + 1];
                }
                continue;
            } else {
                if (i > 0) {
                    ret[ret.length - 1] += splitted[i].substring(0, context);
                }
                if (i + 1 < splitted.length) {
                    ret.push(splitted[i].substring(splitted[i].length - context) + splitted[i + 1]);
                }
            }
        }
        while (ret.length > 0 && !ret[0]) {
            ret = ret.slice(1);
        }
        return ret;
    }
    function diffString(o, n, simpleSplit) {
        var splitRe = RegExp("([[]{2}|[\\]]{2}|[{]{2,3}|[}]{2,3}|[|]|=|<|>|[*:]+|\\s|\\b)");
        var out, i, oSplitted, nSplitted;
        if (simpleSplit) {
            oSplitted = o.split(/\b/);
            nSplitted = n.split(/\b/);
        } else {
            oSplitted = o.parenSplit(splitRe);
            nSplitted = n.parenSplit(splitRe);
        }
        for (i = 0; i < oSplitted.length; ++i) {
            oSplitted[i] = oSplitted[i].entify();
        }
        for (i = 0; i < nSplitted.length; ++i) {
            nSplitted[i] = nSplitted[i].entify();
        }
        out = diff(oSplitted, nSplitted);
        var str = "";
        var acc = [];
        var maxOutputPair = 0;
        for (i = 0; i < out.n.length; ++i) {
            if (out.n[i].paired) {
                if (maxOutputPair > out.n[i].row) {
                    out.o[out.n[i].row] = out.o[out.n[i].row].text;
                    out.n[i] = out.n[i].text;
                }
                if (maxOutputPair < out.n[i].row) {
                    maxOutputPair = out.n[i].row;
                }
            }
        }
        for (i = 0; i < out.o.length && !out.o[i].paired; ++i) {
            acc.push(out.o[i]);
        }
        str += delFmt(acc);
        acc = [];
        for (i = 0; i < out.n.length; ++i) {
            while (i < out.n.length && !out.n[i].paired) {
                acc.push(out.n[i++]);
            }
            str += insFmt(acc);
            acc = [];
            if (i < out.n.length) {
                str += out.n[i].text;
                var m = out.n[i].row + 1;
                while (m < out.o.length && !out.o[m].paired) {
                    acc.push(out.o[m++]);
                }
                str += delFmt(acc);
                acc = [];
            }
        }
        return str;
    }
    var jsReservedProperties = RegExp("^(constructor|prototype|__((define|lookup)[GS]etter)__" + "|eval|hasOwnProperty|propertyIsEnumerable" + "|to(Source|String|LocaleString)|(un)?watch|valueOf)$");
    function diffBugAlert(word) {
        if (!diffBugAlert.list[word]) {
            diffBugAlert.list[word] = 1;
            alert("Bad word: " + word + "\n\nPlease report this bug.");
        }
    }
    diffBugAlert.list = {};
    function makeDiffHashtable(src) {
        var ret = {};
        for (var i = 0; i < src.length; i++) {
            if (jsReservedProperties.test(src[i])) {
                src[i] += "<!-- -->";
            }
            if (!ret[src[i]]) {
                ret[src[i]] = [];
            }
            try {
                ret[src[i]].push(i);
            } catch (err) {
                diffBugAlert(src[i]);
            }
        }
        return ret;
    }
    function diff(o, n) {
        var ns = makeDiffHashtable(n);
        var os = makeDiffHashtable(o);
        var i;
        for (i in ns) {
            if (ns[i].length == 1 && os[i] && os[i].length == 1) {
                n[ns[i][0]] = {
                    text: n[ns[i][0]],
                    row: os[i][0],
                    paired: true
                };
                o[os[i][0]] = {
                    text: o[os[i][0]],
                    row: ns[i][0],
                    paired: true
                };
            }
        }
        for (i = 0; i < n.length - 1; i++) {
            if (n[i].paired && !n[i + 1].paired && n[i].row + 1 < o.length && !o[n[i].row + 1].paired && n[i + 1] == o[n[i].row + 1]) {
                n[i + 1] = {
                    text: n[i + 1],
                    row: n[i].row + 1,
                    paired: true
                };
                o[n[i].row + 1] = {
                    text: o[n[i].row + 1],
                    row: i + 1,
                    paired: true
                };
            }
        }
        for (i = n.length - 1; i > 0; i--) {
            if (n[i].paired && !n[i - 1].paired && n[i].row > 0 && !o[n[i].row - 1].paired && n[i - 1] == o[n[i].row - 1]) {
                n[i - 1] = {
                    text: n[i - 1],
                    row: n[i].row - 1,
                    paired: true
                };
                o[n[i].row - 1] = {
                    text: o[n[i].row - 1],
                    row: i - 1,
                    paired: true
                };
            }
        }
        return {
            o: o,
            n: n
        };
    }
    function setSiteInfo() {
        if (window.popupLocalDebug) {
            pg.wiki.hostname = "en.wikipedia.org";
        } else {
            pg.wiki.hostname = location.hostname;
        }
        pg.wiki.wikimedia = RegExp("(wiki([pm]edia|source|books|news|quote|versity|species|voyage|data)|metawiki|wiktionary|mediawiki)[.]org").test(pg.wiki.hostname);
        pg.wiki.wikia = RegExp("[.]wikia[.]com$", "i").test(pg.wiki.hostname);
        pg.wiki.isLocal = RegExp("^localhost").test(pg.wiki.hostname);
        pg.wiki.commons = pg.wiki.wikimedia && pg.wiki.hostname != "commons.wikimedia.org" ? "commons.wikimedia.org" : null;
        pg.wiki.lang = mw.config.get("wgContentLanguage");
        var port = location.port ? ":" + location.port : "";
        pg.wiki.sitebase = pg.wiki.hostname + port;
    }
    function setUserInfo() {
        var params = {
            action: "query",
            list: "users",
            ususers: mw.config.get("wgUserName"),
            usprop: "rights"
        };
        pg.user.canReview = false;
        if (getValueOf("popupReview")) {
            getMwApi().get(params).done(function (data) {
                var rights = data.query.users[0].rights;
                pg.user.canReview = rights.indexOf("review") !== -1;
            });
        }
    }
    function fetchSpecialPageNames() {
        var params = {
            action: "query",
            meta: "siteinfo",
            siprop: "specialpagealiases",
            formatversion: 2,
            uselang: "content",
            maxage: 3600
        };
        return getMwApi().get(params).then(function (data) {
            pg.wiki.specialpagealiases = data.query.specialpagealiases;
        });
    }
    function setTitleBase() {
        var protocol = window.popupLocalDebug ? "http:" : location.protocol;
        pg.wiki.articlePath = mw.config.get("wgArticlePath").replace(/\/\$1/, "");
        pg.wiki.botInterfacePath = mw.config.get("wgScript");
        pg.wiki.APIPath = mw.config.get("wgScriptPath") + "/api.php";
        var titletail = pg.wiki.botInterfacePath + "?title=";
        pg.wiki.titlebase = protocol + "//" + pg.wiki.sitebase + titletail;
        pg.wiki.wikibase = protocol + "//" + pg.wiki.sitebase + pg.wiki.botInterfacePath;
        pg.wiki.apiwikibase = protocol + "//" + pg.wiki.sitebase + pg.wiki.APIPath;
        pg.wiki.articlebase = protocol + "//" + pg.wiki.sitebase + pg.wiki.articlePath;
        pg.wiki.commonsbase = protocol + "//" + pg.wiki.commons + pg.wiki.botInterfacePath;
        pg.wiki.apicommonsbase = protocol + "//" + pg.wiki.commons + pg.wiki.APIPath;
        pg.re.basenames = RegExp("^(" + map(literalizeRegex, [pg.wiki.titlebase, pg.wiki.articlebase]).join("|") + ")");
    }
    function setMainRegex() {
        var reStart = "[^:]*://";
        var preTitles = literalizeRegex(mw.config.get("wgScriptPath")) + "/(?:index[.]php|wiki[.]phtml)[?]title=";
        preTitles += "|" + literalizeRegex(pg.wiki.articlePath + "/");
        var reEnd = "(" + preTitles + ")([^&?#]*)[^#]*(?:#(.+))?";
        pg.re.main = RegExp(reStart + literalizeRegex(pg.wiki.sitebase) + reEnd);
    }
    function buildSpecialPageGroup(specialPageObj) {
        var variants = [];
        variants.push(mw.util.escapeRegExp(specialPageObj.realname));
        variants.push(mw.util.escapeRegExp(encodeURI(specialPageObj.realname)));
        specialPageObj.aliases.forEach(function (alias) {
            variants.push(mw.util.escapeRegExp(alias));
            variants.push(mw.util.escapeRegExp(encodeURI(alias)));
        });
        return variants.join("|");
    }
    function setRegexps() {
        setMainRegex();
        var sp = nsRe(pg.nsSpecialId);
        pg.re.urlNoPopup = RegExp("((title=|/)" + sp + "(?:%3A|:)|section=[0-9]|^#$)");
        pg.wiki.specialpagealiases.forEach(function (specialpage) {
            if (specialpage.realname === "Contributions") {
                pg.re.contribs = RegExp("(title=|/)" + sp +
                    "(?:%3A|:)(?:" + buildSpecialPageGroup(specialpage) + ")" +
                    "(&target=|/|/" + nsRe(pg.nsUserId) + ":)(.*)", "i");
            } else if (specialpage.realname === "Diff") {
                pg.re.specialdiff = RegExp("/" + sp +
                    "(?:%3A|:)(?:" + buildSpecialPageGroup(specialpage) + ")" +
                    "/([^?#]*)", "i");
            } else if (specialpage.realname === "Emailuser") {
                pg.re.email = RegExp("(title=|/)" + sp +
                    "(?:%3A|:)(?:" + buildSpecialPageGroup(specialpage) +
                    ")" + "(&target=|/|/(?:" + nsRe(pg.nsUserId) + ":)?)(.*)", "i");
            } else if (specialpage.realname === "Whatlinkshere") {
                pg.re.backlinks = RegExp("(title=|/)" + sp +
                    "(?:%3A|:)(?:" + buildSpecialPageGroup(specialpage) +
                    ")" + "(&target=|/)([^&]*)", "i");
            }
        });
        var im = nsReImage();
        pg.re.image = RegExp("(^|\\[\\[)" + im + ": *([^|\\]]*[^|\\] ])" + "([^0-9\\]]*([0-9]+) *px)?|(?:\\n *[|]?|[|]) *" + "(" + getValueOf("popupImageVarsRegexp") + ")" + " *= *(?:\\[\\[ *)?(?:" + im + ":)?" + "([^|]*?)(?:\\]\\])? *[|]? *\\n", "img");
        pg.re.imageBracketCount = 6;
        pg.re.category = RegExp("\\[\\[" + nsRe(pg.nsCategoryId) + ": *([^|\\]]*[^|\\] ]) *", "i");
        pg.re.categoryBracketCount = 1;
        pg.re.ipUser = RegExp("^" + "(?::(?::|(?::[0-9A-Fa-f]{1,4}){1,7})|[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){0,6}::|[0-9A-Fa-f]{1,4}(?::[0-9A-Fa-f]{1,4}){7})" + "|(((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\.){3}" + "(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9]))$");
        pg.re.stub = RegExp(getValueOf("popupStubRegexp"), "im");
        pg.re.disambig = RegExp(getValueOf("popupDabRegexp"), "im");
        pg.re.oldid = RegExp("[?&]oldid=([^&]*)");
        pg.re.diff = RegExp("[?&]diff=([^&]*)");
    }
    function setupCache() {
        pg.cache.pages = [];
    }
    function setMisc() {
        pg.current.link = null;
        pg.current.links = [];
        pg.current.linksHash = {};
        setupCache();
        pg.timer.checkPopupPosition = null;
        pg.counter.loop = 0;
        pg.idNumber = 0;
        pg.misc.decodeExtras = [{
            from: "%2C",
            to: ","
        }, {
            from: "_",
            to: " "
        }, {
            from: "%24",
            to: "$"
        }, {
            from: "%26",
            to: "&"
        }];
    }
    function getMwApi() {
        if (!pg.api.client) {
            pg.api.userAgent = "Navigation popups/1.0 (" + mw.config.get("wgServerName") + ")";
            pg.api.client = new mw.Api({
                ajax: {
                    headers: {
                        "Api-User-Agent": pg.api.userAgent
                    }
                }
            });
        }
        return pg.api.client;
    }
    function setupPopups(callback) {
        if (setupPopups.completed) {
            if (typeof callback === "function") {
                callback();
            }
            return;
        }
        mw.loader.using([
            "mediawiki.util",
            "mediawiki.api",
            "mediawiki.user",
            "user.options",
            "mediawiki.jqueryMsg"
        ].concat(mw.config.get("wgVersion").startsWith("1.31") ? ["mediawiki.api.messages"] : [])).then(fetchSpecialPageNames).then(function () {
            setupDebugging();
            setSiteInfo();
            setTitleBase();
            setOptions();
            setUserInfo();
            setNamespaces();
            setInterwiki();
            setRegexps();
            setRedirs();
            setMisc();
            setupLivePreview();
            setupTooltips();
            log("In setupPopups(), just called setupTooltips()");
            Navpopup.tracker.enable();
            setupPopups.completed = true;
            if (typeof callback === "function") {
                callback();
            }
        });
    }
    function defaultNavlinkSpec() {
        var str = "";
        str += "<b><<mainlink|shortcut= >></b>";
        if (getValueOf("popupLastEditLink")) {
            str += "*<<lastEdit|shortcut=/>>|<<lastContrib>>|<<sinceMe>>if(oldid){|<<oldEdit>>|<<diffCur>>}";
        }
        str += "if(user){<br><<contribs|shortcut=c>>*<<userlog|shortcut=L|log>>";
        str += "if(ipuser){*<<arin>>}if(wikimedia){*<<count|shortcut=#>>}";
        str += "if(ipuser){}else{*<<email|shortcut=E>>}if(admin){*<<block|shortcut=b>>|<<blocklog|log>>}}";
        var editstr = "<<edit|shortcut=e>>";
        var editOldidStr = "if(oldid){<<editOld|shortcut=e>>|<<revert|shortcut=v|rv>>|<<edit|cur>>}else{" + editstr + "}";
        var historystr = "<<history|shortcut=h>>|<<editors|shortcut=E|>>";
        var watchstr = "<<unwatch|unwatchShort>>|<<watch|shortcut=w|watchThingy>>";
        str += "<br>if(talk){" + editOldidStr + "|<<new|shortcut=+>>" + "*" + historystr + "*" + watchstr + "*" + "<b><<article|shortcut=a>></b>|<<editArticle|edit>>" + "}else{" + editOldidStr + "*" + historystr + "*" + watchstr + "*" + "<b><<talk|shortcut=t>></b>|<<editTalk|edit>>|<<newTalk|shortcut=+|new>>}";
        str += "<br><<whatLinksHere|shortcut=l>>*<<relatedChanges|shortcut=r>>*<<move|shortcut=m>>";
        str += "if(admin){<br><<unprotect|unprotectShort>>|<<protect|shortcut=p>>|<<protectlog|log>>*" + "<<undelete|undeleteShort>>|<<delete|shortcut=d>>|<<deletelog|log>>}";
        return str;
    }
    function navLinksHTML(article, hint, params) {
        var str = '<span class="popupNavLinks">' + defaultNavlinkSpec() + "</span>";
        return navlinkStringToHTML(str, article, params);
    }
    function expandConditionalNavlinkString(s, article, z, recursionCount) {
        var oldid = z.oldid,
            rcid = z.rcid,
            diff = z.diff;
        if (typeof recursionCount != typeof 0) {
            recursionCount = 0;
        }
        var conditionalSplitRegex = RegExp("(;?\\s*if\\s*\\(\\s*([\\w]*)\\s*\\)\\s*\\{([^{}]*)\\}(\\s*else\\s*\\{([^{}]*?)\\}|))", "i");
        var splitted = s.parenSplit(conditionalSplitRegex);
        var numParens = 5;
        var ret = splitted[0];
        for (var i = 1; i < splitted.length; i = i + numParens + 1) {
            var testString = splitted[i + 2 - 1];
            var trueString = splitted[i + 3 - 1];
            var falseString = splitted[i + 5 - 1];
            if (typeof falseString == "undefined" || !falseString) {
                falseString = "";
            }
            var testResult = null;
            switch (testString) {
                case "user":
                    testResult = article.userName() ? true : false;
                    break;
                case "talk":
                    testResult = article.talkPage() ? false : true;
                    break;
                case "admin":
                    testResult = getValueOf("popupAdminLinks") ? true : false;
                    break;
                case "oldid":
                    testResult = typeof oldid != "undefined" && oldid ? true : false;
                    break;
                case "rcid":
                    testResult = typeof rcid != "undefined" && rcid ? true : false;
                    break;
                case "ipuser":
                    testResult = article.isIpUser() ? true : false;
                    break;
                case "mainspace_en":
                    testResult = isInMainNamespace(article) && pg.wiki.hostname == "en.wikipedia.org";
                    break;
                case "wikimedia":
                    testResult = pg.wiki.wikimedia ? true : false;
                    break;
                case "diff":
                    testResult = typeof diff != "undefined" && diff ? true : false;
                    break;
            }
            switch (testResult) {
                case null:
                    ret += splitted[i];
                    break;
                case true:
                    ret += trueString;
                    break;
                case false:
                    ret += falseString;
                    break;
            }
            ret += splitted[i + numParens];
        }
        if (conditionalSplitRegex.test(ret) && recursionCount < 10) {
            return expandConditionalNavlinkString(ret, article, z, recursionCount + 1);
        }
        return ret;
    }
    function navlinkStringToArray(s, article, params) {
        s = expandConditionalNavlinkString(s, article, params);
        var splitted = s.parenSplit(RegExp("<<(.*?)>>"));
        var ret = [];
        for (var i = 0; i < splitted.length; ++i) {
            if (i % 2) {
                var t = new navlinkTag();
                var ss = splitted[i].split("|");
                t.id = ss[0];
                for (var j = 1; j < ss.length; ++j) {
                    var sss = ss[j].split("=");
                    if (sss.length > 1) {
                        t[sss[0]] = sss[1];
                    } else {
                        t.text = popupString(sss[0]);
                    }
                }
                t.article = article;
                var oldid = params.oldid,
                    rcid = params.rcid,
                    diff = params.diff;
                if (typeof oldid !== "undefined" && oldid !== null) {
                    t.oldid = oldid;
                }
                if (typeof rcid !== "undefined" && rcid !== null) {
                    t.rcid = rcid;
                }
                if (typeof diff !== "undefined" && diff !== null) {
                    t.diff = diff;
                }
                if (!t.text && t.id !== "mainlink") {
                    t.text = popupString(t.id);
                }
                ret.push(t);
            } else {
                ret.push(splitted[i]);
            }
        }
        return ret;
    }
    function navlinkSubstituteHTML(s) {
        return s.split("*").join(getValueOf("popupNavLinkSeparator")).split("<menurow>").join('<li class="popup_menu_row">').split("</menurow>").join("</li>").split("<menu>").join('<ul class="popup_menu">').split("</menu>").join("</ul>");
    }
    function navlinkDepth(magic, s) {
        return s.split("<" + magic + ">").length - s.split("</" + magic + ">").length;
    }
    function navlinkStringToHTML(s, article, params) {
        var p = navlinkStringToArray(s, article, params);
        var html = "";
        var menudepth = 0;
        var menurowdepth = 0;
        for (var i = 0; i < p.length; ++i) {
            if (typeof p[i] == typeof "") {
                html += navlinkSubstituteHTML(p[i]);
                menudepth += navlinkDepth("menu", p[i]);
                menurowdepth += navlinkDepth("menurow", p[i]);
            } else if (typeof p[i].type != "undefined" && p[i].type == "navlinkTag") {
                if (menudepth > 0 && menurowdepth === 0) {
                    html += '<li class="popup_menu_item">' + p[i].html() + "</li>";
                } else {
                    html += p[i].html();
                }
            }
        }
        return html;
    }
    function navlinkTag() {
        this.type = "navlinkTag";
    }
    navlinkTag.prototype.html = function () {
        this.getNewWin();
        this.getPrintFunction();
        var html = "";
        var opening, closing;
        var tagType = "span";
        if (!tagType) {
            opening = "";
            closing = "";
        } else {
            opening = "<" + tagType + ' class="popup_' + this.id + '">';
            closing = "</" + tagType + ">";
        }
        if (typeof this.print != "function") {
            errlog("Oh dear - invalid print function for a navlinkTag, id=" + this.id);
        } else {
            html = this.print(this);
            if (typeof html != typeof "") {
                html = "";
            } else if (typeof this.shortcut != "undefined") {
                html = addPopupShortcut(html, this.shortcut);
            }
        }
        return opening + html + closing;
    };
    navlinkTag.prototype.getNewWin = function () {
        getValueOf("popupLinksNewWindow");
        if (typeof pg.option.popupLinksNewWindow[this.id] === "undefined") {
            this.newWin = null;
        }
        this.newWin = pg.option.popupLinksNewWindow[this.id];
    };
    navlinkTag.prototype.getPrintFunction = function () {
        if (typeof this.id != typeof "" || typeof this.article != typeof {}) {
            return;
        }
        this.noPopup = 1;
        switch (this.id) {
            case "contribs":
            case "history":
            case "whatLinksHere":
            case "userPage":
            case "monobook":
            case "userTalk":
            case "talk":
            case "article":
            case "lastEdit":
                this.noPopup = null;
        }
        switch (this.id) {
            case "email":
            case "contribs":
            case "block":
            case "unblock":
            case "userlog":
            case "userSpace":
            case "deletedContribs":
                this.article = this.article.userName();
        }
        switch (this.id) {
            case "userTalk":
            case "newUserTalk":
            case "editUserTalk":
            case "userPage":
            case "monobook":
            case "editMonobook":
            case "blocklog":
                this.article = this.article.userName(true);
            case "pagelog":
            case "deletelog":
            case "protectlog":
                delete this.oldid;
        }
        if (this.id == "editMonobook" || this.id == "monobook") {
            this.article.append("/monobook.js");
        }
        if (this.id != "mainlink") {
            this.article = this.article.removeAnchor();
        }
        switch (this.id) {
            case "undelete":
                this.print = specialLink;
                this.specialpage = "Undelete";
                this.sep = "/";
                break;
            case "whatLinksHere":
                this.print = specialLink;
                this.specialpage = "Whatlinkshere";
                break;
            case "relatedChanges":
                this.print = specialLink;
                this.specialpage = "Recentchangeslinked";
                break;
            case "move":
                this.print = specialLink;
                this.specialpage = "Movepage";
                break;
            case "contribs":
                this.print = specialLink;
                this.specialpage = "Contributions";
                break;
            case "deletedContribs":
                this.print = specialLink;
                this.specialpage = "Deletedcontributions";
                break;
            case "email":
                this.print = specialLink;
                this.specialpage = "EmailUser";
                this.sep = "/";
                break;
            case "block":
                this.print = specialLink;
                this.specialpage = "Blockip";
                this.sep = "&ip=";
                break;
            case "unblock":
                this.print = specialLink;
                this.specialpage = "Ipblocklist";
                this.sep = "&action=unblock&ip=";
                break;
            case "userlog":
                this.print = specialLink;
                this.specialpage = "Log";
                this.sep = "&user=";
                break;
            case "blocklog":
                this.print = specialLink;
                this.specialpage = "Log";
                this.sep = "&type=block&page=";
                break;
            case "pagelog":
                this.print = specialLink;
                this.specialpage = "Log";
                this.sep = "&page=";
                break;
            case "protectlog":
                this.print = specialLink;
                this.specialpage = "Log";
                this.sep = "&type=protect&page=";
                break;
            case "deletelog":
                this.print = specialLink;
                this.specialpage = "Log";
                this.sep = "&type=delete&page=";
                break;
            case "userSpace":
                this.print = specialLink;
                this.specialpage = "PrefixIndex";
                this.sep = "&namespace=2&prefix=";
                break;
            case "search":
                this.print = specialLink;
                this.specialpage = "Search";
                this.sep = "&fulltext=Search&search=";
                break;
            case "thank":
                this.print = specialLink;
                this.specialpage = "Thanks";
                this.sep = "/";
                this.article.value = this.diff !== "prev" ? this.diff : this.oldid;
                break;
            case "unwatch":
            case "watch":
                this.print = magicWatchLink;
                this.action = this.id + "&autowatchlist=1&autoimpl=" + popupString("autoedit_version") + "&actoken=" + autoClickToken();
                break;
            case "history":
            case "historyfeed":
            case "unprotect":
            case "protect":
                this.print = wikiLink;
                this.action = this.id;
                break;
            case "delete":
                this.print = wikiLink;
                this.action = "delete";
                if (this.article.namespaceId() == pg.nsImageId) {
                    var img = this.article.stripNamespace();
                    this.action += "&image=" + img;
                }
                break;
            case "markpatrolled":
            case "edit":
                delete this.oldid;
            case "view":
            case "purge":
            case "render":
                this.print = wikiLink;
                this.action = this.id;
                break;
            case "raw":
                this.print = wikiLink;
                this.action = "raw";
                break;
            case "new":
                this.print = wikiLink;
                this.action = "edit&section=new";
                break;
            case "mainlink":
                if (typeof this.text == "undefined") {
                    this.text = this.article.toString().entify();
                }
                if (getValueOf("popupSimplifyMainLink") && isInStrippableNamespace(this.article)) {
                    var s = this.text.split("/");
                    this.text = s[s.length - 1];
                    if (this.text === "" && s.length > 1) {
                        this.text = s[s.length - 2];
                    }
                }
                this.print = titledWikiLink;
                if (typeof this.title === "undefined" && pg.current.link && typeof pg.current.link.href !== "undefined") {
                    this.title = safeDecodeURI(pg.current.link.originalTitle ? pg.current.link.originalTitle : this.article);
                    if (typeof this.oldid !== "undefined" && this.oldid) {
                        this.title = tprintf("Revision %s of %s", [this.oldid, this.title]);
                    }
                }
                this.action = "view";
                break;
            case "userPage":
            case "article":
            case "monobook":
            case "editMonobook":
            case "editArticle":
                delete this.oldid;
                this.article = this.article.articleFromTalkOrArticle();
                this.print = wikiLink;
                if (this.id.indexOf("edit") === 0) {
                    this.action = "edit";
                } else {
                    this.action = "view";
                }
                break;
            case "userTalk":
            case "talk":
                this.article = this.article.talkPage();
                delete this.oldid;
                this.print = wikiLink;
                this.action = "view";
                break;
            case "arin":
                this.print = arinLink;
                break;
            case "count":
                this.print = editCounterLink;
                break;
            case "google":
                this.print = googleLink;
                break;
            case "editors":
                this.print = editorListLink;
                break;
            case "globalsearch":
                this.print = globalSearchLink;
                break;
            case "lastEdit":
                this.print = titledDiffLink;
                this.title = popupString("Show the last edit");
                this.from = "prev";
                this.to = "cur";
                break;
            case "oldEdit":
                this.print = titledDiffLink;
                this.title = popupString("Show the edit made to get revision") + " " + this.oldid;
                this.from = "prev";
                this.to = this.oldid;
                break;
            case "editOld":
                this.print = wikiLink;
                this.action = "edit";
                break;
            case "undo":
                this.print = wikiLink;
                this.action = "edit&undo=";
                break;
            case "revert":
                this.print = wikiLink;
                this.action = "revert";
                break;
            case "nullEdit":
                this.print = wikiLink;
                this.action = "nullEdit";
                break;
            case "diffCur":
                this.print = titledDiffLink;
                this.title = tprintf("Show changes since revision %s", [this.oldid]);
                this.from = this.oldid;
                this.to = "cur";
                break;
            case "editUserTalk":
            case "editTalk":
                delete this.oldid;
                this.article = this.article.talkPage();
                this.action = "edit";
                this.print = wikiLink;
                break;
            case "newUserTalk":
            case "newTalk":
                this.article = this.article.talkPage();
                this.action = "edit&section=new";
                this.print = wikiLink;
                break;
            case "lastContrib":
            case "sinceMe":
                this.print = magicHistoryLink;
                break;
            case "togglePreviews":
                this.text = popupString(pg.option.simplePopups ? "enable previews" : "disable previews");
            case "disablePopups":
            case "purgePopups":
                this.print = popupMenuLink;
                break;
            default:
                this.print = function () {
                    return "Unknown navlink type: " + this.id + "";
                };
        }
    };
    function popupHandleKeypress(evt) {
        var keyCode = window.event ? window.event.keyCode : evt.keyCode ? evt.keyCode : evt.which;
        if (!keyCode || !pg.current.link || !pg.current.link.navpopup) {
            return;
        }
        if (keyCode == 27) {
            killPopup();
            return false;
        }
        var letter = String.fromCharCode(keyCode);
        var links = pg.current.link.navpopup.mainDiv.getElementsByTagName("A");
        var startLink = 0;
        var i, j;
        if (popupHandleKeypress.lastPopupLinkSelected) {
            for (i = 0; i < links.length; ++i) {
                if (links[i] == popupHandleKeypress.lastPopupLinkSelected) {
                    startLink = i;
                }
            }
        }
        for (j = 0; j < links.length; ++j) {
            i = (startLink + j + 1) % links.length;
            if (links[i].getAttribute("popupkey") == letter) {
                if (evt && evt.preventDefault) {
                    evt.preventDefault();
                }
                links[i].focus();
                popupHandleKeypress.lastPopupLinkSelected = links[i];
                return false;
            }
        }
        if (document.oldPopupOnkeypress) {
            return document.oldPopupOnkeypress(evt);
        }
        return true;
    }
    function addPopupShortcuts() {
        if (document.onkeypress != popupHandleKeypress) {
            document.oldPopupOnkeypress = document.onkeypress;
        }
        document.onkeypress = popupHandleKeypress;
    }
    function rmPopupShortcuts() {
        popupHandleKeypress.lastPopupLinkSelected = null;
        try {
            if (document.oldPopupOnkeypress && document.oldPopupOnkeypress == popupHandleKeypress) {
                document.onkeypress = null;
                return;
            }
            document.onkeypress = document.oldPopupOnkeypress;
        } catch (nasties) {
        }
    }
    function addLinkProperty(html, property) {
        var i = html.indexOf(">");
        if (i < 0) {
            return html;
        }
        return html.substring(0, i) + " " + property + html.substring(i);
    }
    function addPopupShortcut(html, key) {
        if (!getValueOf("popupShortcutKeys")) {
            return html;
        }
        var ret = addLinkProperty(html, 'popupkey="' + key + '"');
        if (key == " ") {
            key = popupString("spacebar");
        }
        return ret.replace(RegExp('^(.*?)(title=")(.*?)(".*)$', "i"), "$1$2$3 [" + key + "]$4");
    }
    function loadDiff(article, oldid, diff, navpop) {
        navpop.diffData = {
            oldRev: {},
            newRev: {}
        };
        mw.loader.using("mediawiki.api").then(function () {
            var api = getMwApi();
            var params = {
                action: "compare",
                prop: "ids|title"
            };
            if (article.title) {
                params.fromtitle = article.title;
            }
            switch (diff) {
                case "cur":
                    switch (oldid) {
                        case null:
                        case "":
                        case "prev":
                            params.torelative = "prev";
                            break;
                        default:
                            params.fromrev = oldid;
                            params.torelative = "cur";
                            break;
                    }
                    break;
                case "prev":
                    if (oldid) {
                        params.fromrev = oldid;
                    } else {
                        params.fromtitle;
                    }
                    params.torelative = "prev";
                    break;
                case "next":
                    params.fromrev = oldid || 0;
                    params.torelative = "next";
                    break;
                default:
                    params.fromrev = oldid || 0;
                    params.torev = diff || 0;
                    break;
            }
            api.get(params).then(function (data) {
                navpop.diffData.oldRev.revid = data.compare.fromrevid;
                navpop.diffData.newRev.revid = data.compare.torevid;
                addReviewLink(navpop, "popupMiscTools");
                var go = function () {
                    pendingNavpopTask(navpop);
                    var url = pg.wiki.apiwikibase + "?format=json&formatversion=2&action=query&";
                    url += "revids=" + navpop.diffData.oldRev.revid + "|" + navpop.diffData.newRev.revid;
                    url += "&prop=revisions&rvprop=ids|timestamp|content";
                    getPageWithCaching(url, doneDiff, navpop);
                    return true;
                };
                if (navpop.visible || !getValueOf("popupLazyDownloads")) {
                    go();
                } else {
                    navpop.addHook(go, "unhide", "before", "DOWNLOAD_DIFFS");
                }
            });
        });
    }
    function addReviewLink(navpop, target) {
        if (!pg.user.canReview) {
            return;
        }
        if (navpop.diffData.newRev.revid <= navpop.diffData.oldRev.revid) {
            return;
        }
        var params = {
            action: "query",
            prop: "info|flagged",
            revids: navpop.diffData.oldRev.revid,
            formatversion: 2
        };
        getMwApi().get(params).then(function (data) {
            var stable_revid = data.query.pages[0].flagged && data.query.pages[0].flagged.stable_revid || 0;
            if (stable_revid == navpop.diffData.oldRev.revid) {
                var a = document.createElement("a");
                a.innerHTML = popupString("mark patrolled");
                a.title = popupString("markpatrolledHint");
                a.onclick = function () {
                    var params = {
                        action: "review",
                        revid: navpop.diffData.newRev.revid,
                        comment: tprintf("defaultpopupReviewedSummary", [navpop.diffData.oldRev.revid, navpop.diffData.newRev.revid])
                    };
                    getMwApi().postWithToken("csrf", params).done(function () {
                        a.style.display = "none";
                    }).fail(function () {
                        alert(popupString("Could not marked this edit as patrolled"));
                    });
                };
                setPopupHTML(a, target, navpop.idNumber, null, true);
            }
        });
    }
    function doneDiff(download) {
        if (!download.owner || !download.owner.diffData) {
            return;
        }
        var navpop = download.owner;
        completedNavpopTask(navpop);
        var pages, revisions = [];
        try {
            pages = getJsObj(download.data).query.pages;
            for (var i = 0; i < pages.length; i++) {
                revisions = revisions.concat(pages[i].revisions);
            }
            for (i = 0; i < revisions.length; i++) {
                if (revisions[i].revid == navpop.diffData.oldRev.revid) {
                    navpop.diffData.oldRev.revision = revisions[i];
                } else if (revisions[i].revid == navpop.diffData.newRev.revid) {
                    navpop.diffData.newRev.revision = revisions[i];
                }
            }
        } catch (someError) {
            errlog("Could not get diff");
        }
        insertDiff(navpop);
    }
    function rmBoringLines(a, b, context) {
        if (typeof context == "undefined") {
            context = 2;
        }
        var aa = [],
            aaa = [];
        var bb = [],
            bbb = [];
        var i, j;
        for (i = 0; i < a.length; ++i) {
            if (!a[i].paired) {
                aa[i] = 1;
            } else if (countCrossings(b, a, i, true)) {
                aa[i] = 1;
                bb[a[i].row] = 1;
            }
        }
        for (i = 0; i < b.length; ++i) {
            if (bb[i] == 1) {
                continue;
            }
            if (!b[i].paired) {
                bb[i] = 1;
            }
        }
        for (i = 0; i < b.length; ++i) {
            if (bb[i] == 1) {
                for (j = Math.max(0, i - context); j < Math.min(b.length, i + context); ++j) {
                    if (!bb[j]) {
                        bb[j] = 1;
                        aa[b[j].row] = 0.5;
                    }
                }
            }
        }
        for (i = 0; i < a.length; ++i) {
            if (aa[i] == 1) {
                for (j = Math.max(0, i - context); j < Math.min(a.length, i + context); ++j) {
                    if (!aa[j]) {
                        aa[j] = 1;
                        bb[a[j].row] = 0.5;
                    }
                }
            }
        }
        for (i = 0; i < bb.length; ++i) {
            if (bb[i] > 0) {
                if (b[i].paired) {
                    bbb.push(b[i].text);
                } else {
                    bbb.push(b[i]);
                }
            }
        }
        for (i = 0; i < aa.length; ++i) {
            if (aa[i] > 0) {
                if (a[i].paired) {
                    aaa.push(a[i].text);
                } else {
                    aaa.push(a[i]);
                }
            }
        }
        return {
            a: aaa,
            b: bbb
        };
    }
    function stripOuterCommonLines(a, b, context) {
        var i = 0;
        while (i < a.length && i < b.length && a[i] == b[i]) {
            ++i;
        }
        var j = a.length - 1;
        var k = b.length - 1;
        while (j >= 0 && k >= 0 && a[j] == b[k]) {
            --j;
            --k;
        }
        return {
            a: a.slice(Math.max(0, i - 1 - context), Math.min(a.length + 1, j + context + 1)),
            b: b.slice(Math.max(0, i - 1 - context), Math.min(b.length + 1, k + context + 1))
        };
    }
    function insertDiff(navpop) {
        var oldlines = navpop.diffData.oldRev.revision.content.split("\n");
        var newlines = navpop.diffData.newRev.revision.content.split("\n");
        var inner = stripOuterCommonLines(oldlines, newlines, getValueOf("popupDiffContextLines"));
        oldlines = inner.a;
        newlines = inner.b;
        var truncated = false;
        getValueOf("popupDiffMaxLines");
        if (oldlines.length > pg.option.popupDiffMaxLines || newlines.length > pg.option.popupDiffMaxLines) {
            truncated = true;
            inner = stripOuterCommonLines(oldlines.slice(0, pg.option.popupDiffMaxLines), newlines.slice(0, pg.option.popupDiffMaxLines), pg.option.popupDiffContextLines);
            oldlines = inner.a;
            newlines = inner.b;
        }
        var lineDiff = diff(oldlines, newlines);
        var lines2 = rmBoringLines(lineDiff.o, lineDiff.n);
        var oldlines2 = lines2.a;
        var newlines2 = lines2.b;
        var simpleSplit = !String.prototype.parenSplit.isNative;
        var html = "<hr />";
        if (getValueOf("popupDiffDates")) {
            html += diffDatesTable(navpop);
            html += "<hr />";
        }
        html += shortenDiffString(diffString(oldlines2.join("\n"), newlines2.join("\n"), simpleSplit), getValueOf("popupDiffContextCharacters")).join("<hr />");
        setPopupTipsAndHTML(html.split("\n").join("<br>") + (truncated ? "<hr /><b>" + popupString("Diff truncated for performance reasons") + "</b>" : ""), "popupPreview", navpop.idNumber);
    }
    function diffDatesTable(navpop) {
        var html = '<table class="popup_diff_dates">';
        html += diffDatesTableRow(navpop.diffData.newRev.revision, tprintf("New revision"));
        html += diffDatesTableRow(navpop.diffData.oldRev.revision, tprintf("Old revision"));
        html += "</table>";
        return html;
    }
    function diffDatesTableRow(revision, label) {
        var txt = "";
        var lastModifiedDate = new Date(revision.timestamp);
        var datePrint = getValueOf("popupDiffDatePrinter");
        txt = formattedDateTime(lastModifiedDate);
        var revlink = generalLink({
            url: mw.config.get("wgScript") + "?oldid=" + revision.revid,
            text: label,
            title: label
        });
        return simplePrintf("<tr><td>%s</td><td>%s</td></tr>", [revlink, txt]);
    }
    function titledDiffLink(l) {
        return titledWikiLink({
            article: l.article,
            action: l.to + "&oldid=" + l.from,
            newWin: l.newWin,
            noPopup: l.noPopup,
            text: l.text,
            title: l.title,
            actionName: "diff"
        });
    }
    function wikiLink(l) {
        if (!(typeof l.article == typeof {} && typeof l.action == typeof "" && typeof l.text == typeof "")) {
            return null;
        }
        if (typeof l.oldid == "undefined") {
            l.oldid = null;
        }
        var savedOldid = l.oldid;
        if (!/^(edit|view|revert|render)$|^raw/.test(l.action)) {
            l.oldid = null;
        }
        var hint = popupString(l.action + "Hint");
        var oldidData = [l.oldid, safeDecodeURI(l.article)];
        var revisionString = tprintf("revision %s of %s", oldidData);
        log("revisionString=" + revisionString);
        switch (l.action) {
            case "edit&section=new":
                hint = popupString("newSectionHint");
                break;
            case "edit&undo=":
                if (l.diff && l.diff != "prev" && savedOldid) {
                    l.action += l.diff + "&undoafter=" + savedOldid;
                } else if (savedOldid) {
                    l.action += savedOldid;
                }
                hint = popupString("undoHint");
                break;
            case "raw&ctype=text/css":
                hint = popupString("rawHint");
                break;
            case "revert":
                var p = parseParams(pg.current.link.href);
                l.action = "edit&autoclick=wpSave&actoken=" + autoClickToken() + "&autoimpl=" + popupString("autoedit_version") + "&autosummary=" + revertSummary(l.oldid, p.diff);
                if (p.diff == "prev") {
                    l.action += "&direction=prev";
                    revisionString = tprintf("the revision prior to revision %s of %s", oldidData);
                }
                if (getValueOf("popupRevertSummaryPrompt")) {
                    l.action += "&autosummaryprompt=true";
                }
                if (getValueOf("popupMinorReverts")) {
                    l.action += "&autominor=true";
                }
                log("revisionString is now " + revisionString);
                break;
            case "nullEdit":
                l.action = "edit&autoclick=wpSave&actoken=" + autoClickToken() + "&autoimpl=" + popupString("autoedit_version") + "&autosummary=" + popupString("nullEditSummary");
                break;
            case "historyfeed":
                l.action = "history&feed=rss";
                break;
            case "markpatrolled":
                l.action = "markpatrolled&rcid=" + l.rcid;
        }
        if (hint) {
            if (l.oldid) {
                hint = simplePrintf(hint, [revisionString]);
            } else {
                hint = simplePrintf(hint, [safeDecodeURI(l.article)]);
            }
        } else {
            hint = safeDecodeURI(l.article + "&action=" + l.action) + l.oldid ? "&oldid=" + l.oldid : "";
        }
        return titledWikiLink({
            article: l.article,
            action: l.action,
            text: l.text,
            newWin: l.newWin,
            title: hint,
            oldid: l.oldid,
            noPopup: l.noPopup,
            onclick: l.onclick
        });
    }
    function revertSummary(oldid, diff) {
        var ret = "";
        if (diff == "prev") {
            ret = getValueOf("popupQueriedRevertToPreviousSummary");
        } else {
            ret = getValueOf("popupQueriedRevertSummary");
        }
        return ret + "&autorv=" + oldid;
    }
    function titledWikiLink(l) {
        if (typeof l.article == "undefined" || typeof l.action == "undefined") {
            errlog("got undefined article or action in titledWikiLink");
            return null;
        }
        var base = pg.wiki.titlebase + l.article.urlString();
        var url = base;
        if (typeof l.actionName == "undefined" || !l.actionName) {
            l.actionName = "action";
        }
        if (l.action != "view") {
            url = base + "&" + l.actionName + "=" + l.action;
        }
        if (l.action === "edit") {
            url += "&wpChangeTags=Popups%2CAutomation%20tool";
        }
        if (typeof l.oldid != "undefined" && l.oldid) {
            url += "&oldid=" + l.oldid;
        }
        var cssClass = pg.misc.defaultNavlinkClassname;
        if (typeof l.className != "undefined" && l.className) {
            cssClass = l.className;
        }
        return generalNavLink({
            url: url,
            newWin: l.newWin,
            title: typeof l.title != "undefined" ? l.title : null,
            text: typeof l.text != "undefined" ? l.text : null,
            className: cssClass,
            noPopup: l.noPopup,
            onclick: l.onclick
        });
    }
    pg.fn.getLastContrib = function getLastContrib(wikipage, newWin) {
        getHistoryInfo(wikipage, function (x) {
            processLastContribInfo(x, {
                page: wikipage,
                newWin: newWin
            });
        });
    };
    function processLastContribInfo(info, stuff) {
        if (!info.edits || !info.edits.length) {
            alert("Popups: an odd thing happened. Please retry.");
            return;
        }
        if (!info.firstNewEditor) {
            alert(tprintf("Only found one editor: %s made %s edits", [info.edits[0].editor, info.edits.length]));
            return;
        }
        var newUrl = pg.wiki.titlebase + new Title(stuff.page).urlString() + "&diff=cur&oldid=" + info.firstNewEditor.oldid;
        displayUrl(newUrl, stuff.newWin);
    }
    pg.fn.getDiffSinceMyEdit = function getDiffSinceMyEdit(wikipage, newWin) {
        getHistoryInfo(wikipage, function (x) {
            processDiffSinceMyEdit(x, {
                page: wikipage,
                newWin: newWin
            });
        });
    };
    function processDiffSinceMyEdit(info, stuff) {
        if (!info.edits || !info.edits.length) {
            alert("Popups: something fishy happened. Please try again.");
            return;
        }
        var friendlyName = stuff.page.split("_").join(" ");
        if (!info.myLastEdit) {
            alert(tprintf("Couldn't find an edit by %s\nin the last %s edits to\n%s", [info.userName, getValueOf("popupHistoryLimit"), friendlyName]));
            return;
        }
        if (info.myLastEdit.index === 0) {
            alert(tprintf("%s seems to be the last editor to the page %s", [info.userName, friendlyName]));
            return;
        }
        var newUrl = pg.wiki.titlebase + new Title(stuff.page).urlString() + "&diff=cur&oldid=" + info.myLastEdit.oldid;
        displayUrl(newUrl, stuff.newWin);
    }
    function displayUrl(url, newWin) {
        if (newWin) {
            window.open(url);
        } else {
            document.location = url;
        }
    }
    pg.fn.purgePopups = function purgePopups() {
        processAllPopups(true);
        setupCache();
        pg.option = {};
        abortAllDownloads();
    };
    function processAllPopups(nullify, banish) {
        for (var i = 0; pg.current.links && i < pg.current.links.length; ++i) {
            if (!pg.current.links[i].navpopup) {
                continue;
            }
            if (nullify || banish) {
                pg.current.links[i].navpopup.banish();
            }
            pg.current.links[i].simpleNoMore = false;
            if (nullify) {
                pg.current.links[i].navpopup = null;
            }
        }
    }
    pg.fn.disablePopups = function disablePopups() {
        processAllPopups(false, true);
        setupTooltips(null, true);
    };
    pg.fn.togglePreviews = function togglePreviews() {
        processAllPopups(true, true);
        pg.option.simplePopups = !pg.option.simplePopups;
        abortAllDownloads();
    };
    function magicWatchLink(l) {
        l.onclick = simplePrintf("pg.fn.modifyWatchlist('%s','%s');return false;", [l.article.toString(true).split("\\").join("\\\\").split("'").join("\\'"), this.id]);
        return wikiLink(l);
    }
    pg.fn.modifyWatchlist = function modifyWatchlist(title, action) {
        var reqData = {
            action: "watch",
            formatversion: 2,
            titles: title,
            uselang: mw.config.get("wgUserLanguage")
        };
        if (action === "unwatch") {
            reqData.unwatch = true;
        }
        var mwTitle = mw.Title.newFromText(title);
        var messageName;
        if (mwTitle && mwTitle.getNamespaceId() > 0 && mwTitle.getNamespaceId() % 2 === 1) {
            messageName = action === "watch" ? "addedwatchtext-talk" : "removedwatchtext-talk";
        } else {
            messageName = action === "watch" ? "addedwatchtext" : "removedwatchtext";
        }
        $.when(getMwApi().postWithToken("watch", reqData), mw.loader.using(["mediawiki.api", "mediawiki.jqueryMsg"]).then(function () {
            return getMwApi().loadMessagesIfMissing([messageName]);
        })).done(function () {
            mw.notify(mw.message(messageName, title).parseDom());
        });
    };
    function magicHistoryLink(l) {
        var jsUrl = "",
            title = "",
            onClick = "";
        switch (l.id) {
            case "lastContrib":
                onClick = simplePrintf("pg.fn.getLastContrib('%s',%s)", [l.article.toString(true).split("\\").join("\\\\").split("'").join("\\'"), l.newWin]);
                title = popupString("lastContribHint");
                break;
            case "sinceMe":
                onClick = simplePrintf("pg.fn.getDiffSinceMyEdit('%s',%s)", [l.article.toString(true).split("\\").join("\\\\").split("'").join("\\'"), l.newWin]);
                title = popupString("sinceMeHint");
                break;
        }
        jsUrl = "javascript:" + onClick;
        onClick += ";return false;";
        return generalNavLink({
            url: jsUrl,
            newWin: false,
            title: title,
            text: l.text,
            noPopup: l.noPopup,
            onclick: onClick
        });
    }
    function popupMenuLink(l) {
        var jsUrl = simplePrintf("javascript:pg.fn.%s()", [l.id]);
        var title = popupString(simplePrintf("%sHint", [l.id]));
        var onClick = simplePrintf("pg.fn.%s();return false;", [l.id]);
        return generalNavLink({
            url: jsUrl,
            newWin: false,
            title: title,
            text: l.text,
            noPopup: l.noPopup,
            onclick: onClick
        });
    }
    function specialLink(l) {
        if (typeof l.specialpage == "undefined" || !l.specialpage) {
            return null;
        }
        var base = pg.wiki.titlebase + mw.config.get("wgFormattedNamespaces")[pg.nsSpecialId] + ":" + l.specialpage;
        if (typeof l.sep == "undefined" || l.sep === null) {
            l.sep = "&target=";
        }
        var article = l.article.urlString({
            keepSpaces: l.specialpage == "Search"
        });
        var hint = popupString(l.specialpage + "Hint");
        switch (l.specialpage) {
            case "Log":
                switch (l.sep) {
                    case "&user=":
                        hint = popupString("userLogHint");
                        break;
                    case "&type=block&page=":
                        hint = popupString("blockLogHint");
                        break;
                    case "&page=":
                        hint = popupString("pageLogHint");
                        break;
                    case "&type=protect&page=":
                        hint = popupString("protectLogHint");
                        break;
                    case "&type=delete&page=":
                        hint = popupString("deleteLogHint");
                        break;
                    default:
                        log("Unknown log type, sep=" + l.sep);
                        hint = "Missing hint (FIXME)";
                }
                break;
            case "PrefixIndex":
                article += "/";
                break;
        }
        if (hint) {
            hint = simplePrintf(hint, [safeDecodeURI(l.article)]);
        } else {
            hint = safeDecodeURI(l.specialpage + ":" + l.article);
        }
        var url = base + l.sep + article;
        return generalNavLink({
            url: url,
            title: hint,
            text: l.text,
            newWin: l.newWin,
            noPopup: l.noPopup
        });
    }
    function generalLink(l) {
        if (typeof l.url == "undefined") {
            return null;
        }
        var url = l.url.split('"').join("%22");
        var ret = '<a href="' + url + '"';
        if (typeof l.title != "undefined" && l.title) {
            ret += ' title="' + pg.escapeQuotesHTML(l.title) + '"';
        }
        if (typeof l.onclick != "undefined" && l.onclick) {
            ret += ' onclick="' + pg.escapeQuotesHTML(l.onclick) + '"';
        }
        if (l.noPopup) {
            ret += " noPopup=1";
        }
        var newWin;
        if (typeof l.newWin == "undefined" || l.newWin === null) {
            newWin = getValueOf("popupNewWindows");
        } else {
            newWin = l.newWin;
        }
        if (newWin) {
            ret += ' target="_blank"';
        }
        if (typeof l.className != "undefined" && l.className) {
            ret += ' class="' + l.className + '"';
        }
        ret += ">";
        if (typeof l.text == typeof "") {
            ret += l.text;
        }
        ret += "</a>";
        return ret;
    }
    function appendParamsToLink(linkstr, params) {
        var sp = linkstr.parenSplit(RegExp('(href="[^"]+?)"', "i"));
        if (sp.length < 2) {
            return null;
        }
        var ret = sp.shift() + sp.shift();
        ret += "&" + params + '"';
        ret += sp.join("");
        return ret;
    }
    function changeLinkTargetLink(x) {
        if (x.newTarget) {
            log("changeLinkTargetLink: newTarget=" + x.newTarget);
        }
        if (x.oldTarget !== decodeURIComponent(x.oldTarget)) {
            log("This might be an input problem: " + x.oldTarget);
        }
        var cA = mw.util.escapeRegExp(x.oldTarget);
        var chs = cA.charAt(0).toUpperCase();
        chs = "[" + chs + chs.toLowerCase() + "]";
        var currentArticleRegexBit = chs + cA.substring(1);
        currentArticleRegexBit = currentArticleRegexBit.split(RegExp("(?:[_ ]+|%20)", "g")).join("(?:[_ ]+|%20)").split("\\(").join("(?:%28|\\()").split("\\)").join("(?:%29|\\))");
        currentArticleRegexBit = "\\s*(" + currentArticleRegexBit + "(?:#[^\\[\\|]*)?)\\s*";
        var title = x.title || mw.config.get("wgPageName").split("_").join(" ");
        var lk = titledWikiLink({
            article: new Title(title),
            newWin: x.newWin,
            action: "edit",
            text: x.text,
            title: x.hint,
            className: "popup_change_title_link"
        });
        var cmd = "";
        if (x.newTarget) {
            var t = x.newTarget;
            var s = mw.util.escapeRegExp(x.newTarget);
            if (x.alsoChangeLabel) {
                cmd += "s~\\[\\[" + currentArticleRegexBit + "\\]\\]~[[" + t + "]]~g;";
                cmd += "s~\\[\\[" + currentArticleRegexBit + "[|]~[[" + t + "|~g;";
                cmd += "s~\\[\\[" + s + "\\|" + s + "\\]\\]~[[" + t + "]]~g";
            } else {
                cmd += "s~\\[\\[" + currentArticleRegexBit + "\\]\\]~[[" + t + "|$1]]~g;";
                cmd += "s~\\[\\[" + currentArticleRegexBit + "[|]~[[" + t + "|~g;";
                cmd += "s~\\[\\[" + s + "\\|" + s + "\\]\\]~[[" + t + "]]~g";
            }
        } else {
            cmd += "s~\\[\\[" + currentArticleRegexBit + "\\]\\]~$1~g;";
            cmd += "s~\\[\\[" + currentArticleRegexBit + "[|](.*?)\\]\\]~$2~g";
        }
        cmd = "autoedit=" + encodeURIComponent(cmd);
        cmd += "&autoclick=" + encodeURIComponent(x.clickButton) + "&actoken=" + encodeURIComponent(autoClickToken());
        cmd += x.minor === null ? "" : "&autominor=" + encodeURIComponent(x.minor);
        cmd += x.watch === null ? "" : "&autowatch=" + encodeURIComponent(x.watch);
        cmd += "&autosummary=" + encodeURIComponent(x.summary);
        cmd += "&autoimpl=" + encodeURIComponent(popupString("autoedit_version"));
        return appendParamsToLink(lk, cmd);
    }
    function redirLink(redirMatch, article) {
        var ret = "";
        if (getValueOf("popupAppendRedirNavLinks") && getValueOf("popupNavLinks")) {
            ret += "<hr />";
            if (getValueOf("popupFixRedirs") && typeof autoEdit != "undefined" && autoEdit) {
                ret += popupString("Redirects to: (Fix ");
                log("redirLink: newTarget=" + redirMatch);
                ret += addPopupShortcut(changeLinkTargetLink({
                    newTarget: redirMatch,
                    text: popupString("target"),
                    hint: popupString("Fix this redirect, changing just the link target"),
                    summary: simplePrintf(getValueOf("popupFixRedirsSummary"), [article.toString(), redirMatch]),
                    oldTarget: article.toString(),
                    clickButton: getValueOf("popupRedirAutoClick"),
                    minor: true,
                    watch: getValueOf("popupWatchRedirredPages")
                }), "R");
                ret += popupString(" or ");
                ret += addPopupShortcut(changeLinkTargetLink({
                    newTarget: redirMatch,
                    text: popupString("target & label"),
                    hint: popupString("Fix this redirect, changing the link target and label"),
                    summary: simplePrintf(getValueOf("popupFixRedirsSummary"), [article.toString(), redirMatch]),
                    oldTarget: article.toString(),
                    clickButton: getValueOf("popupRedirAutoClick"),
                    minor: true,
                    watch: getValueOf("popupWatchRedirredPages"),
                    alsoChangeLabel: true
                }), "R");
                ret += popupString(")");
            } else {
                ret += popupString("Redirects") + popupString(" to ");
            }
            return ret;
        } return "<br> " + popupString("Redirects") + popupString(" to ") + titledWikiLink({
            article: new Title().fromWikiText(redirMatch),
            action: "view",
            text: safeDecodeURI(redirMatch),
            title: popupString("Bypass redirect")
        });
    }
    function arinLink(l) {
        if (!saneLinkCheck(l)) {
            return null;
        }
        if (!l.article.isIpUser() || !pg.wiki.wikimedia) {
            return null;
        }
        var uN = l.article.userName();
        return generalNavLink({
            url: "http://ws.arin.net/cgi-bin/whois.pl?queryinput=" + encodeURIComponent(uN),
            newWin: l.newWin,
            title: tprintf("Look up %s in ARIN whois database", [uN]),
            text: l.text,
            noPopup: 1
        });
    }
    function toolDbName(cookieStyle) {
        var ret = mw.config.get("wgDBname");
        if (!cookieStyle) {
            ret += "_p";
        }
        return ret;
    }
    function saneLinkCheck(l) {
        if (typeof l.article != typeof {} || typeof l.text != typeof "") {
            return false;
        }
        return true;
    }
    function editCounterLink(l) {
        if (!saneLinkCheck(l)) {
            return null;
        }
        if (!pg.wiki.wikimedia) {
            return null;
        }
        var uN = l.article.userName();
        var tool = getValueOf("popupEditCounterTool");
        var url;
        var defaultToolUrl = "//tools.wmflabs.org/supercount/index.php?user=$1&project=$2.$3";
        switch (tool) {
            case "custom":
                url = simplePrintf(getValueOf("popupEditCounterUrl"), [encodeURIComponent(uN), toolDbName()]);
                break;
            case "soxred":
            case "kate":
            case "interiot":
            case "supercount":
            default:
                var theWiki = pg.wiki.hostname.split(".");
                url = simplePrintf(defaultToolUrl, [encodeURIComponent(uN), theWiki[0], theWiki[1]]);
        }
        return generalNavLink({
            url: url,
            title: tprintf("editCounterLinkHint", [uN]),
            newWin: l.newWin,
            text: l.text,
            noPopup: 1
        });
    }
    function globalSearchLink(l) {
        if (!saneLinkCheck(l)) {
            return null;
        }
        var base = "http://vs.aka-online.de/cgi-bin/globalwpsearch.pl?timeout=120&search=";
        var article = l.article.urlString({
            keepSpaces: true
        });
        return generalNavLink({
            url: base + article,
            newWin: l.newWin,
            title: tprintf("globalSearchHint", [safeDecodeURI(l.article)]),
            text: l.text,
            noPopup: 1
        });
    }
    function googleLink(l) {
        if (!saneLinkCheck(l)) {
            return null;
        }
        var base = "https://www.google.com/search?q=";
        var article = l.article.urlString({
            keepSpaces: true
        });
        return generalNavLink({
            url: base + "%22" + article + "%22",
            newWin: l.newWin,
            title: tprintf("googleSearchHint", [safeDecodeURI(l.article)]),
            text: l.text,
            noPopup: 1
        });
    }
    function editorListLink(l) {
        if (!saneLinkCheck(l)) {
            return null;
        }
        var article = l.article.articleFromTalkPage() || l.article;
        var url = "https://xtools.wmflabs.org/articleinfo/" + encodeURI(pg.wiki.hostname) + "/" + article.urlString() + "?uselang=" + mw.config.get("wgUserLanguage");
        return generalNavLink({
            url: url,
            title: tprintf("editorListHint", [article]),
            newWin: l.newWin,
            text: l.text,
            noPopup: 1
        });
    }
    function generalNavLink(l) {
        l.className = l.className === null ? "popupNavLink" : l.className;
        return generalLink(l);
    }
    function getHistoryInfo(wikipage, whatNext) {
        log("getHistoryInfo");
        getHistory(wikipage, whatNext ? function (d) {
            whatNext(processHistory(d));
        } : processHistory);
    }
    function getHistory(wikipage, onComplete) {
        log("getHistory");
        var url = pg.wiki.apiwikibase + "?format=json&formatversion=2&action=query&prop=revisions&titles=" + new Title(wikipage).urlString() + "&rvlimit=" + getValueOf("popupHistoryLimit");
        log("getHistory: url=" + url);
        return startDownload(url, pg.idNumber + "history", onComplete);
    }
    function processHistory(download) {
        var jsobj = getJsObj(download.data);
        try {
            var revisions = anyChild(jsobj.query.pages).revisions;
            var edits = [];
            for (var i = 0; i < revisions.length; ++i) {
                edits.push({
                    oldid: revisions[i].revid,
                    editor: revisions[i].user
                });
            }
            log("processed " + edits.length + " edits");
            return finishProcessHistory(edits, mw.config.get("wgUserName"));
        } catch (someError) {
            log("Something went wrong with JSON business");
            return finishProcessHistory([]);
        }
    }
    function finishProcessHistory(edits, userName) {
        var histInfo = {};
        histInfo.edits = edits;
        histInfo.userName = userName;
        for (var i = 0; i < edits.length; ++i) {
            if (typeof histInfo.myLastEdit === "undefined" && userName && edits[i].editor == userName) {
                histInfo.myLastEdit = {
                    index: i,
                    oldid: edits[i].oldid,
                    previd: i === 0 ? null : edits[i - 1].oldid
                };
            }
            if (typeof histInfo.firstNewEditor === "undefined" && edits[i].editor != edits[0].editor) {
                histInfo.firstNewEditor = {
                    index: i,
                    oldid: edits[i].oldid,
                    previd: i === 0 ? null : edits[i - 1].oldid
                };
            }
        }
        return histInfo;
    }
    function defaultize(x) {
        if (pg.option[x] === null || typeof pg.option[x] == "undefined") {
            if (typeof window[x] != "undefined") {
                pg.option[x] = window[x];
            } else {
                pg.option[x] = pg.optionDefault[x];
            }
        }
    }
    function newOption(x, def) {
        pg.optionDefault[x] = def;
    }
    function setDefault(x, def) {
        return newOption(x, def);
    }
    function getValueOf(varName) {
        defaultize(varName);
        return pg.option[varName];
    }
    function useDefaultOptions() {
        for (var p in pg.optionDefault) {
            pg.option[p] = pg.optionDefault[p];
            if (typeof window[p] != "undefined") {
                delete window[p];
            }
        }
    }
    function setOptions() {
        var userIsSysop = false;
        if (mw.config.get("wgUserGroups")) {
            for (var g = 0; g < mw.config.get("wgUserGroups").length; ++g) {
                if (mw.config.get("wgUserGroups")[g] == "sysop") {
                    userIsSysop = true;
                }
            }
        }
        newOption("popupDelay", 0.5);
        newOption("popupHideDelay", 0.5);
        newOption("simplePopups", false);
        newOption("popupStructure", "shortmenus");
        newOption("popupActionsMenu", true);
        newOption("popupSetupMenu", true);
        newOption("popupAdminLinks", userIsSysop);
        newOption("popupShortcutKeys", false);
        newOption("popupHistoricalLinks", true);
        newOption("popupOnlyArticleLinks", true);
        newOption("removeTitles", true);
        newOption("popupMaxWidth", 350);
        newOption("popupSimplifyMainLink", true);
        newOption("popupAppendRedirNavLinks", true);
        newOption("popupTocLinks", false);
        newOption("popupSubpopups", true);
        newOption("popupDragHandle", false);
        newOption("popupLazyPreviews", true);
        newOption("popupLazyDownloads", true);
        newOption("popupAllDabsStubs", false);
        newOption("popupDebugging", false);
        newOption("popupActiveNavlinks", true);
        newOption("popupModifier", false);
        newOption("popupModifierAction", "enable");
        newOption("popupDraggable", true);
        newOption("popupReview", false);
        newOption("popupLocale", false);
        newOption("popupDateTimeFormatterOptions", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
        newOption("popupDateFormatterOptions", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
        });
        newOption("popupTimeFormatterOptions", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        });
        newOption("popupImages", true);
        newOption("imagePopupsForImages", true);
        newOption("popupNeverGetThumbs", false);
        newOption("popupThumbAction", "imagepage");
        newOption("popupImageSize", 60);
        newOption("popupImageSizeLarge", 200);
        newOption("popupFixRedirs", false);
        newOption("popupRedirAutoClick", "wpDiff");
        newOption("popupFixDabs", false);
        newOption("popupDabsAutoClick", "wpDiff");
        newOption("popupRevertSummaryPrompt", false);
        newOption("popupMinorReverts", false);
        newOption("popupRedlinkRemoval", false);
        newOption("popupRedlinkAutoClick", "wpDiff");
        newOption("popupWatchDisambiggedPages", null);
        newOption("popupWatchRedirredPages", null);
        newOption("popupDabWiktionary", "last");
        newOption("popupNavLinks", true);
        newOption("popupNavLinkSeparator", " &sdot; ");
        newOption("popupLastEditLink", true);
        newOption("popupEditCounterTool", "supercount");
        newOption("popupEditCounterUrl", "");
        newOption("popupPreviews", true);
        newOption("popupSummaryData", true);
        newOption("popupMaxPreviewSentences", 5);
        newOption("popupMaxPreviewCharacters", 600);
        newOption("popupLastModified", true);
        newOption("popupPreviewKillTemplates", true);
        newOption("popupPreviewRawTemplates", true);
        newOption("popupPreviewFirstParOnly", true);
        newOption("popupPreviewCutHeadings", true);
        newOption("popupPreviewButton", false);
        newOption("popupPreviewButtonEvent", "click");
        newOption("popupPreviewDiffs", true);
        newOption("popupDiffMaxLines", 100);
        newOption("popupDiffContextLines", 2);
        newOption("popupDiffContextCharacters", 40);
        newOption("popupDiffDates", true);
        newOption("popupDiffDatePrinter", "toLocaleString");
        newOption("popupReviewedSummary", popupString("defaultpopupReviewedSummary"));
        newOption("popupFixDabsSummary", popupString("defaultpopupFixDabsSummary"));
        newOption("popupExtendedRevertSummary", popupString("defaultpopupExtendedRevertSummary"));
        newOption("popupRevertSummary", popupString("defaultpopupRevertSummary"));
        newOption("popupRevertToPreviousSummary", popupString("defaultpopupRevertToPreviousSummary"));
        newOption("popupQueriedRevertSummary", popupString("defaultpopupQueriedRevertSummary"));
        newOption("popupQueriedRevertToPreviousSummary", popupString("defaultpopupQueriedRevertToPreviousSummary"));
        newOption("popupFixRedirsSummary", popupString("defaultpopupFixRedirsSummary"));
        newOption("popupRedlinkSummary", popupString("defaultpopupRedlinkSummary"));
        newOption("popupRmDabLinkSummary", popupString("defaultpopupRmDabLinkSummary"));
        newOption("popupHistoryLimit", 50);
        newOption("popupFilters", [popupFilterStubDetect, popupFilterDisambigDetect, popupFilterPageSize, popupFilterCountLinks, popupFilterCountImages, popupFilterCountCategories, popupFilterLastModified]);
        newOption("extraPopupFilters", []);
        newOption("popupOnEditSelection", "cursor");
        newOption("popupPreviewHistory", true);
        newOption("popupImageLinks", true);
        newOption("popupCategoryMembers", true);
        newOption("popupUserInfo", true);
        newOption("popupHistoryPreviewLimit", 25);
        newOption("popupContribsPreviewLimit", 25);
        newOption("popupRevDelUrl", "//en.wikipedia.org/wiki/Wikipedia:Revision_deletion");
        newOption("popupShowGender", true);
        newOption("popupNewWindows", false);
        newOption("popupLinksNewWindow", {
            lastContrib: true,
            sinceMe: true
        });
        newOption("popupDabRegexp", "(\\{\\{\\s*disambig(?!uation needed)|disambig(uation|)\\s*\\}\\}|disamb\\s*\\}\\}|dab\\s*\\}\\})|\\{\\{\\s*(((geo|hn|road?|school|number)dis)|[234][lc][acw]|(road|ship)index)(\\s*[|][^}]*)?\\s*[}][}]|is a .*disambiguation.*page");
        newOption("popupAnchorRegexp", "anchors?");
        newOption("popupStubRegexp", "(sect)?stub[}][}]|This .*-related article is a .*stub");
        newOption("popupImageVarsRegexp", "image|image_(?:file|skyline|name|flag|seal)|cover|badge|logo");
    }
    pg.string = {
        article: "article",
        category: "category",
        categories: "categories",
        image: "image",
        images: "images",
        stub: "stub",
        "section stub": "section stub",
        "Empty page": "Empty page",
        kB: "kB",
        bytes: "bytes",
        day: "day",
        days: "days",
        hour: "hour",
        hours: "hours",
        minute: "minute",
        minutes: "minutes",
        second: "second",
        seconds: "seconds",
        week: "week",
        weeks: "weeks",
        search: "search",
        SearchHint: "Find English Wikipedia articles containing %s",
        web: "web",
        global: "global",
        globalSearchHint: "Search across Wikipedias in different languages for %s",
        googleSearchHint: "Google for %s",
        actions: "actions",
        popupsMenu: "popups",
        togglePreviewsHint: "Toggle preview generation in popups on this page",
        "enable previews": "enable previews",
        "disable previews": "disable previews",
        "toggle previews": "toggle previews",
        "show preview": "show preview",
        reset: "reset",
        "more...": "more...",
        disable: "disable popups",
        disablePopupsHint: "Disable popups on this page. Reload page to re-enable.",
        historyfeedHint: "RSS feed of recent changes to this page",
        purgePopupsHint: "Reset popups, clearing all cached popup data.",
        PopupsHint: "Reset popups, clearing all cached popup data.",
        spacebar: "space",
        view: "view",
        "view article": "view article",
        viewHint: "Go to %s",
        talk: "talk",
        "talk page": "talk page",
        "this&nbsp;revision": "this&nbsp;revision",
        "revision %s of %s": "revision %s of %s",
        "Revision %s of %s": "Revision %s of %s",
        "the revision prior to revision %s of %s": "the revision prior to revision %s of %s",
        "Toggle image size": "Click to toggle image size",
        del: "del",
        "delete": "delete",
        deleteHint: "Delete %s",
        undeleteShort: "un",
        UndeleteHint: "Show the deletion history for %s",
        protect: "protect",
        protectHint: "Restrict editing rights to %s",
        unprotectShort: "un",
        unprotectHint: "Allow %s to be edited by anyone again",
        "send thanks": "send thanks",
        ThanksHint: "Send a thank you notification to this user",
        move: "move",
        "move page": "move page",
        MovepageHint: "Change the title of %s",
        edit: "edit",
        "edit article": "edit article",
        editHint: "Change the content of %s",
        "edit talk": "edit talk",
        "new": "new",
        "new topic": "new topic",
        newSectionHint: "Start a new section on %s",
        "null edit": "null edit",
        nullEditHint: "Submit an edit to %s, making no changes ",
        hist: "hist",
        history: "history",
        historyHint: "List the changes made to %s",
        last: "prev",
        lastEdit: "lastEdit",
        "mark patrolled": "mark patrolled",
        markpatrolledHint: "Mark this edit as patrolled",
        "Could not marked this edit as patrolled": "Could not marked this edit as patrolled",
        "show last edit": "most recent edit",
        "Show the last edit": "Show the effects of the most recent change",
        lastContrib: "lastContrib",
        "last set of edits": "latest edits",
        lastContribHint: "Show the net effect of changes made by the last editor",
        cur: "cur",
        diffCur: "diffCur",
        "Show changes since revision %s": "Show changes since revision %s",
        "%s old": "%s old",
        oldEdit: "oldEdit",
        purge: "purge",
        purgeHint: "Demand a fresh copy of %s",
        raw: "source",
        rawHint: "Download the source of %s",
        render: "simple",
        renderHint: "Show a plain HTML version of %s",
        "Show the edit made to get revision": "Show the edit made to get revision",
        sinceMe: "sinceMe",
        "changes since mine": "diff my edit",
        sinceMeHint: "Show changes since my last edit",
        "Couldn't find an edit by %s\nin the last %s edits to\n%s": "Couldn't find an edit by %s\nin the last %s edits to\n%s",
        eds: "eds",
        editors: "editors",
        editorListHint: "List the users who have edited %s",
        related: "related",
        relatedChanges: "relatedChanges",
        "related changes": "related changes",
        RecentchangeslinkedHint: "Show changes in articles related to %s",
        editOld: "editOld",
        rv: "rv",
        revert: "revert",
        revertHint: "Revert to %s",
        defaultpopupReviewedSummary: "Accepted by reviewing the [[Special:diff/%s/%s|difference]] between this version and previously accepted version using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
        defaultpopupRedlinkSummary: "Removing link to empty page [[%s]] using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
        defaultpopupFixDabsSummary: "Disambiguate [[%s]] to [[%s]] using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
        defaultpopupFixRedirsSummary: "Redirect bypass from [[%s]] to [[%s]] using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
        defaultpopupExtendedRevertSummary: "Revert to revision dated %s by %s, oldid %s using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
        defaultpopupRevertToPreviousSummary: "Revert to the revision prior to revision %s using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
        defaultpopupRevertSummary: "Revert to revision %s using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
        defaultpopupQueriedRevertToPreviousSummary: "Revert to the revision prior to revision $1 dated $2 by $3 using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
        defaultpopupQueriedRevertSummary: "Revert to revision $1 dated $2 by $3 using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
        defaultpopupRmDabLinkSummary: "Remove link to dab page [[%s]] using [[:en:Wikipedia:Tools/Navigation_popups|popups]]",
        Redirects: "Redirects",
        " to ": " to ",
        "Bypass redirect": "Bypass redirect",
        "Fix this redirect": "Fix this redirect",
        disambig: "disambig",
        disambigHint: "Disambiguate this link to [[%s]]",
        "Click to disambiguate this link to:": "Click to disambiguate this link to:",
        "remove this link": "remove this link",
        "remove all links to this page from this article": "remove all links to this page from this article",
        "remove all links to this disambig page from this article": "remove all links to this disambig page from this article",
        mainlink: "mainlink",
        wikiLink: "wikiLink",
        wikiLinks: "wikiLinks",
        "links here": "links here",
        whatLinksHere: "whatLinksHere",
        "what links here": "what links here",
        WhatlinkshereHint: "List the pages that are hyperlinked to %s",
        unwatchShort: "un",
        watchThingy: "watch",
        watchHint: "Add %s to my watchlist",
        unwatchHint: "Remove %s from my watchlist",
        "Only found one editor: %s made %s edits": "Only found one editor: %s made %s edits",
        "%s seems to be the last editor to the page %s": "%s seems to be the last editor to the page %s",
        rss: "rss",
        "Diff truncated for performance reasons": "Diff truncated for performance reasons",
        "Old revision": "Old revision",
        "New revision": "New revision",
        "Something went wrong :-(": "Something went wrong :-(",
        "Empty revision, maybe non-existent": "Empty revision, maybe non-existent",
        "Unknown date": "Unknown date",
        "Empty category": "Empty category",
        "Category members (%s shown)": "Category members (%s shown)",
        "No image links found": "No image links found",
        "File links": "File links",
        "No image found": "No image found",
        "Image from Commons": "Image from Commons",
        "Description page": "Description page",
        "Alt text:": "Alt text:",
        revdel: "Hidden revision",
        user: "user",
        "user&nbsp;page": "user&nbsp;page",
        "user talk": "user talk",
        "edit user talk": "edit user talk",
        "leave comment": "leave comment",
        email: "email",
        "email user": "email user",
        EmailuserHint: "Send an email to %s",
        space: "space",
        PrefixIndexHint: "Show pages in the userspace of %s",
        count: "count",
        "edit counter": "edit counter",
        editCounterLinkHint: "Count the contributions made by %s",
        contribs: "contribs",
        contributions: "contributions",
        deletedContribs: "deleted contributions",
        DeletedcontributionsHint: "List deleted edits made by %s",
        ContributionsHint: "List the contributions made by %s",
        log: "log",
        "user log": "user log",
        userLogHint: "Show %s's user log",
        arin: "ARIN lookup",
        "Look up %s in ARIN whois database": "Look up %s in the ARIN whois database",
        unblockShort: "un",
        block: "block",
        "block user": "block user",
        IpblocklistHint: "Unblock %s",
        BlockipHint: "Prevent %s from editing",
        "block log": "block log",
        blockLogHint: "Show the block log for %s",
        protectLogHint: "Show the protection log for %s",
        pageLogHint: "Show the page log for %s",
        deleteLogHint: "Show the deletion log for %s",
        "Invalid %s %s": "The option %s is invalid: %s",
        "No backlinks found": "No backlinks found",
        " and more": " and more",
        undo: "undo",
        undoHint: "undo this edit",
        "Download preview data": "Download preview data",
        "Invalid or IP user": "Invalid or IP user",
        "Not a registered username": "Not a registered username",
        BLOCKED: "BLOCKED",
        " edits since: ": " edits since: ",
        "last edit on ": "last edit on ",
        "Enter a non-empty edit summary or press cancel to abort": "Enter a non-empty edit summary or press cancel to abort",
        "Failed to get revision information, please edit manually.\n\n": "Failed to get revision information, please edit manually.\n\n",
        "The %s button has been automatically clicked. Please wait for the next page to load.": "The %s button has been automatically clicked. Please wait for the next page to load.",
        "Could not find button %s. Please check the settings in your javascript file.": "Could not find button %s. Please check the settings in your javascript file.",
        "Open full-size image": "Open full-size image",
        zxy: "zxy",
        autoedit_version: "np20140416"
    };
    var willBeReplaces = [];
    var __extends = (function () {
        var extendStatics = function (d, b) {
            extendStatics = Object.setPrototypeOf ||
                {
                    __proto__: []
                } instanceof Array && function (d, b) {
                    d.__proto__ = b;
                } ||
                function (d, b) {
                    for (var p in b) {
                        if (Object.prototype.hasOwnProperty.call(b, p)) {
                            d[p] = b[p];
                        }
                    }
                };
            return extendStatics(d, b);
        };
        return function (d, b) {
            if (typeof b !== "function" && b !== null) {
                throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
            }
            extendStatics(d, b);
            function __() {
                this.constructor = d;
            }
            d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
        };
    })();
    var PopupNoTranslation = /** @class */ (function (_super) {
        __extends(PopupNoTranslation, _super);
        function PopupNoTranslation() {
            var _this = this;
            var s;
            try {
                s = JSON.parse(localStorage.getItem("popupNoTranslation"));
                if (!Array.isArray(s)) {
                    s = [];
                }
            }
            catch (_) {
                s = [];
            }
            _this._push.apply(_this, s);
            return _this;
        }
        PopupNoTranslation.prototype._push = function () {
            var a = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                a[_i] = arguments[_i];
            }
            var returnValue = Array.prototype.push.bind(this).apply(void 0, a.filter(function (n) {
                return !n.includes("&autoimpl=np20140416&actoken=") && !n.endsWith("Hint") && !willBeReplaces.includes(n);
            }));
            localStorage.setItem("popupNoTranslation", JSON.stringify(this));
            return returnValue;
        };
        PopupNoTranslation.prototype.push = function (str) {
            var hasDefault = !!pg.string[str];
            if (this.includes(str)) {
                return hasDefault ? pg.string[str] : str;
            }
            this._push(str);
            if (mw.util.getParamValue("debug") === "1") {
                console.groupCollapsed("Gadget Popups", "can't find the translation of", str, hasDefault ? ", use the default text [" + pg.string[str] + "]." : ", and no default text found.");
                console.info(new Error().stack);
                console.groupEnd();
            }
            return hasDefault ? pg.string[str] : str;
        };
        return PopupNoTranslation;
    }(Array));
    function popupString(str) {
        if (!window.popupNoTranslation) {
            window.popupNoTranslation = new PopupNoTranslation();
        }
        if (typeof popupStrings != "undefined" && popupStrings && popupStrings[str]) {
            return popupStrings[str];
        }
        return window.popupNoTranslation.push(str);
    }
    function tprintf(str, subs) {
        if (typeof subs != typeof []) {
            subs = [subs];
        }
        return simplePrintf(popupString(str), subs);
    }
    function run() {
        autoEdit();
        setupPopups();
    }
    if (document.readyState == "complete") {
        run();
    } else {
        $(window).on("load", run);
    }
    (function () {
        function dynamicContentHandler($content) {
            if ($content.attr("id") == "mw-content-text") {
                if ($content.data("once")) {
                    return;
                }
                $content.data("once", true);
            }
            function registerHooksForVisibleNavpops() {
                for (var i = 0; pg.current.links && i < pg.current.links.length; ++i) {
                    var navpop = pg.current.links[i].navpopup;
                    if (!navpop || !navpop.isVisible()) {
                        continue;
                    }
                    Navpopup.tracker.addHook(posCheckerHook(navpop));
                }
            }
            function doIt() {
                registerHooksForVisibleNavpops();
                $content.each(function () {
                    this.ranSetupTooltipsAlready = false;
                    setupTooltips(this);
                });
            }
            setupPopups(doIt);
        }
        mw.hook("wikipage.content").add(dynamicContentHandler);
        mw.hook("ext.echo.overlay.beforeShowingOverlay").add(function ($overlay) {
            dynamicContentHandler($overlay.find(".mw-echo-state"));
        });
    })();
});
// </pre>