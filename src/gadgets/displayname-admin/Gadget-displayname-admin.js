// <pre>
"use strict";
$(() => (() => {
    // for 外显昵称日志
    if (mw.config.get("wgCanonicalSpecialPageName") === "Log"
        && $(".mw-logevent-loglines .mw-logline-moedisplayname").length > 0) {
        // 查找所有mw-userlink元素并更新其文本内容
        $(".mw-userlink").each(function () {
            const $this = $(this);
            const dataUserName = $this.attr("data-user-name");
            const children = $this.contents().filter(function () {
                // 保留不是文本节点的元素（如moe-badges等）
                return this.nodeType !== 3;
            });
            $this.text(dataUserName);
            $this.append(children);
        });
    }
})());
// </pre>
