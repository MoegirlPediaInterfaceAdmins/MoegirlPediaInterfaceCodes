/**
 * @source https://commons.wikimedia.org/wiki/_?oldid=718550874
 * 更新后请同步更新上面链接到最新版本
 */
"use strict";
(function ($, mw) {
    $.extend({
        createIcon(iconClass) {
            return $("<span>", {
                "class": `ui-icon ${iconClass} jquery-inline-icon`,
                text: " ",
            });
        },
        createNotifyArea(textNode, icon, state) {
            return $("<div>", {
                "class": "ui-widget",
            }).append($("<div>", {
                "class": `${state} ui-corner-all`,
                style: "margin-top:20px; padding:0.7em;",
            }).append($("<p>").append($.createIcon(icon).css("margin-right", ".3em"), textNode)));
        },
        /* @deprecated since 1.26 */
        ucFirst(str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        },
    });
    mw.messages.set({
        "libjq-cancel-title": "关闭该对话框 [Esc]",
        "libjq-proceed-title": "在单行输入框内按下回车键",
        "libjq-report-title": "报告错误以改进本工具",
    });
    const buttonConfig = {
        proceed: {
            icon: "ui-icon-circle-check",
            "class": "ui-button-green",
            title: "libjq-proceed-title",
        },
        cancel: {
            icon: "ui-icon-circle-close",
            "class": "ui-button-red",
            title: "libjq-cancel-title",
        },
        report: {
            icon: "ui-icon-circle-check",
            "class": "",
            title: "libjq-report-title",
        },
    };
    $.extend($.fn, {
        /**
         * @this {JQuery<HTMLElement>}
         * @param {keyof buttonConfig} which 
         * @returns 
         */
        specialButton(which) {
            return this.button({
                icons: {
                    primary: buttonConfig[which].icon,
                },
            }).addClass(buttonConfig[which].class).attr("title", mw.msg(buttonConfig[which].title));
        },
        /**
         * Add event/state classes to a node if they are in that state
         *
         * @example
         *      $('#MyButton')._jqInteraction().show();
         *
         * @context {Object} jQuery instance (jQuery DOM node list)
         * @this {JQuery<HTMLElement>}
         * @return {Object} jQuery instance (jQuery DOM node list)
         */
        _jqInteraction() {
            return this.on({
                mouseenter: () => {
                    this.addClass("ui-state-hover");
                },
                mouseleave: () => {
                    this.removeClass("ui-state-hover").removeClass("ui-state-active");
                },
            }).on("focusin", () => {
                this.addClass("ui-state-focus");
            }).on("focusout", () => {
                this.removeClass("ui-state-focus");
            }).on("mousedown", (e) => {
                if (0 === e.originalEvent.button) {
                    this.addClass("ui-state-active");
                }
            }).on("mouseup", () => {
                this.removeClass("ui-state-active");
            });
        },
    });
}(jQuery, mediaWiki));
