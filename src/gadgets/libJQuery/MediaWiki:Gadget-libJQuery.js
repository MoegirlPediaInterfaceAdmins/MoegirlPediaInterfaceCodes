/**
 * https://commons.wikimedia.org/w/index.php?oldid=574492095
 */
"use strict";
(function ($, mw) {
    $.extend({
        createIcon: function (iconClass) {
            return $("<span>", {
                "class": `ui-icon ${iconClass} jquery-inline-icon`,
                text: " ",
            });
        },
        createNotifyArea: function (textNode, icon, state) {
            return $("<div>", {
                "class": "ui-widget",
            }).append($("<div>", {
                "class": `${state} ui-corner-all`,
                style: "margin-top:20px; padding:0.7em;",
            }).append($("<p>").append($.createIcon(icon).css("margin-right", ".3em"), textNode)));
        },
        /* @deprecated since 1.26 */
        ucFirst: function (str) {
            return str.charAt(0).toUpperCase() + str.slice(1);
        },
    });
    mw.messages.set({
        "libjq-cancel-title": "关闭该对话框 [Esc]",
        "libjq-proceed-title": "Proceed [Enter] in single-line text fields",
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
        specialButton: function (which) {
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
         * @return {Object} jQuery instance (jQuery DOM node list)
         */
        _jqInteraction: function () {
            const _this = this;
            return this.on({
                mouseenter: () => {
                    _this.addClass("ui-state-hover");
                },
                mouseleave: () => {
                    _this.removeClass("ui-state-hover").removeClass("ui-state-active");
                },
            }).on("focusin", () => {
                _this.addClass("ui-state-focus");
            }).on("focusout", () => {
                _this.removeClass("ui-state-focus");
            }).on("mousedown", (e) => {
                if (1 === e.which) {
                    _this.addClass("ui-state-active");
                }
            }).on("mouseup", () => {
                _this.removeClass("ui-state-active");
            });
        },
    });
}(jQuery, mediaWiki));