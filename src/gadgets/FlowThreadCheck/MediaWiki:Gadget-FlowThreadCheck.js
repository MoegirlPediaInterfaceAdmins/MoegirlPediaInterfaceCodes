/* eslint-disable prefer-arrow-callback */
/* eslint-disable prefer-template */
/* eslint-disable comma-dangle */
/* eslint-disable no-var */
/* eslint dot-notation: ["error", { "allowPattern": "^(?:catch|default)$" } ] */
/* eslint-disable no-unused-vars */
/* eslint-disable no-redeclare */
/* global mw, $, OO, moment, Cron, prettyPrint, LocalObjectStorage, lazyload */
/* eslint-enable no-unused-vars */
/* eslint-enable no-redeclare */
"use strict";
// <pre>
$(function () {
    var rules = [],
        checkBox = {
            node: $('<div id="flowthreadCheckBox"><div id="flowthreadCheckBoxTitle"><div id="flowthreadCheckBoxTitleContent">评论预览</div><span id="flowthreadCheckBoxCloseButton">×</span></div><div id="flowthreadCheckBoxContent"><div id="flowthreadCheckBoxContentBox"></div></div></div>'),
            closeButton: $("#flowthreadCheckBoxCloseButton").on("click", checkBoxFadeOut),
            content: $("#flowthreadCheckBoxContentBox")
        };
    checkBox.node.appendTo("body");

    function addCheckButton() {
        $(".comment-submit").each(function () {
            var submitButton = $(this);
            if (submitButton.data("addCheckButton") === true) {
                return;
            }
            var checkButton = $("<button/>").text("评论检查").addClass("comment-check").css("right", submitButton.width());
            checkButton.on("click", showCheckBox);
            submitButton.before(checkButton).data("addCheckButton", true);
        });
        var container = $(".comment-container, .comment-container-top").map(function () {
            return (($(this).find('[href^="/"]')[0] || {}).onmouseover || {}).name !== "mouseOverWikiLink" ? this : undefined;
        }).filter((_, e) => e);
        if (container.length > 0) {
            mw.hook("wikipage.content").fire(container);
        }
    }

    function checkBoxFadeIn() {
        return checkBox.node.fadeIn(370).delay(370);
    }

    function checkBoxFadeOut() {
        return checkBox.node.fadeOut(370).delay(370);
    }

    function showCheckBox() {
        var self = this,
            text = $(self).closest(".comment-replybox").find("textarea").val();
        if (/\s{1307,}/.test(text)) {
            return oouiDialog.alert("输入内容有误，请不要输入那么多空格", {
                title: "评论检查工具"
            });
        }
        if (!text) {
            return oouiDialog.alert("请输入评论内容后检查", {
                title: "评论检查工具"
            });
        }
        if (checkBox.content.text()) {
            checkBox.content.empty();
        }
        if (!rules[0]) {
            $.ajax({
                url: mw.config.get("wgServer") + mw.config.get("wgScriptPath") + "/MediaWiki:Flowthread-blacklist?action=raw",
                type: "GET",
                success: function (data) {
                    rules = data.split("\n");
                    rules.splice(0, 5);
                    rules.forEach(function (v, i) {
                        var length = v.indexOf("#") === -1 ? i.length : v.indexOf("#"),
                            regexp = v.slice(0, length).trim();
                        if (!/^\s*#/.test(v) && regexp) {
                            rules[i] = [rules[i], RegExp(regexp, "ig")];
                        }
                        else {
                            rules[i] = ["Unexpected Rule", /\s{1307,}/];
                        }
                    });
                    checkText(text);
                },
                error: function () {
                    showCheckBox.call(self);
                }
            });
        }
        else {
            checkText(text);
        }
    }

    function checkText(text) {
        var errorText = [];
        rules.forEach(function (v) {
            if (v[1].test(text)) {
                errorText.push([v[0], text.match(v[1])]);
            }
        });
        checkBoxFadeIn();
        if (!errorText[0]) {
            checkBox.content.append("您的评论没有触发黑名单机制。");
        }
        else {
            var table = checkBox.content.append('您的评论触发以下黑名单（使用正则表达式<sup><a rel="nofollow" target="_blank" class="external text" href="http://baike' + '.baidu.com/view/94238.htm">解释</a></sup>）：').append($("<table/>")).find("table");
            table.append("<tr><th>No.</th>" /* + '<th>黑名单</th>' */ + "<th>命中字符串</th></tr>");
            errorText.forEach(function (n) {
                table.append($("<tr/>").append($("<td/>").addClass("first").text(table.find("tr").length))/* .append($('<td/>').text(n[0])) */.append($("<td/>").append(n[1].map(function (t) {
                    return "<code>" + $("<span/>").text(t).html() + "</code>";
                }).join("<br/>"))));
            });
        }
    }
    addCheckButton();
    $(".comment-container").on("click", function (e) {
        if ($(e.target).hasClass("comment-reply")) {
            window.setTimeout(function () {
                addCheckButton();
            }, 0);
        }
    });
});
// </pre>