"use strict";
$(() => {
    const requestParams = new URLSearchParams(location.search);
    const isEditRequest = requestParams.get("preloadtitle")?.startsWith("编辑请求");
    const isDiscussionToolsRequest = mw.config.get("wgAction") === "view" && requestParams.get("dtpreload") === "1";
    const isRegularEditRequest = mw.config.get("wgAction") === "edit";
    const isPrivilegedUser = mw.config.get("wgUserGroups").some((value) => ["patroller", "sysop", "techeditor", "interface-admin", "staff"].includes(value));
    if (!isEditRequest || !isRegularEditRequest && !isDiscussionToolsRequest || isPrivilegedUser) {
        return;
    }
    const warning = $("<div>").append(
        $("<p>").append(
            wgULS("进行", "進行"),
            $("<strong>").text(wgULS("实质性", "實質性")),
            wgULS("修改时，需要通过", "修改時，需要通過"),
            $("<a>", {
                href: "/萌娘百科:提案",
                text: wgULS("提案", "提案"),
            }).css("font-weight", "bold"),
            wgULS("或", "或"),
            $("<a>", {
                href: "/萌娘百科:快速提案",
                text: wgULS("快速提案", "快速提案"),
            }).css("font-weight", "bold"),
            wgULS("流程才可对方针和指引进行改动。", "流程才可對方針和指引進行改動。"),
        ),
        $("<p>").append(
            wgULS("在讨论页发起的编辑请求仅可用于修正错别字等", "在討論頁發起的編輯請求僅可用於修正錯別字等"),
            $("<strong>").text(wgULS("非实质性", "非實質性")),
            wgULS("修改。", "修改。"),
        ),
    );
    oouiDialog.alert(
        warning,
        {
            title: wgULS("提醒", "提醒"),
            size: "small",
            actions: [
                {
                    action: "Confirm",
                    label: wgULS("我知道了", "我知道了"),
                },
            ],
        },
    );
});
