/* Any JavaScript here will be loaded for all users on edit page load. */
/* eslint-disable prefer-arrow-callback */
/* eslint-disable prefer-template */
/* eslint-disable comma-dangle */
/* eslint-disable no-var */
/* eslint dot-notation: ["error", { "allowPattern": "^(?:catch|default)$" } ] */
/* eslint-disable no-unused-vars */
/* eslint-disable no-redeclare */
/* global mw, $, OO, moment, Cron, prettyPrint, LocalObjectStorage, lazyload, wgULS */
/* eslint-enable no-unused-vars */
/* eslint-enable no-redeclare */
"use strict";
// <pre>
$(function () {
    if (mw.config.get("wgPageName").startsWith("萌娘百科_talk:讨论版/")) {
        $(".mw-editnotice + .mw-warning-with-logexcerpt").hide();
    }

    var wpSummary = $('[name="wpSummary"]');
    // $(".mw-summary-preset-item a").closest('.oo-ui-fieldLayout-header').width($('#wpSummary').width());
    $(".mw-summary-preset-item a").on("click", function () {
        wpSummary.val((wpSummary.val() + " " + $(this).text()).trim());
        wpSummary.focus();
        return false;
    });

    // .wikiEditor-ui-controls 颜色修正
    $(".wikiEditor-ui-controls").css("background-color", $("#content").css("background-color"));

    //编辑提示检查
    if ($(".mw-summary-preset")[0]) {
        $(".CheckNewSectionOn").hide();
    } else {
        $(".CheckNewSectionOff").hide();
        $('.headerInputbox a[href*="preload=Template%3A权限申请%2F"], .headerInputbox a[href*="preload=Template%3A%E6%9D%83%E9%99%90%E7%94%B3%E8%AF%B7%2F"]').attr("target", "_self");
    }

    if ($(".AbusefilterWarningNoHttp")[0]) {
        $("#wpTextbox1").val($("#wpTextbox1").val().replace(/http:\/\/([a-z\d]+\.bilibili\.[a-z\d]+)/ig, "https://$1"));
    }
    //编辑请求
    var prefixNumber = function (num) {
        var result = "" + num;
        if (result.length === 1) {
            result = "0" + result;
        }
        return result;
    };
    if (["edit", "submit"].indexOf(mw.config.get("wgAction")) !== -1 && !!$(".permissions-errors, #wpTextbox1[readonly]")[1] && mw.config.get("wgUserName") && !$(".newComment")[0]) {
        var wgNamespaceIds = Object.entries(mw.config.get("wgNamespaceIds")),
            wgNamespaceNumber = mw.config.get("wgNamespaceNumber"),
            ns = [];
        if (wgNamespaceNumber < 0 || wgNamespaceNumber % 2 === 1) {
            return;
        }
        var talkNamespaceNumber = wgNamespaceNumber + 1;
        var talkns = -1;
        wgNamespaceIds.sort(function (_a, _b) {
            var a = _a[0],
                b = _b[0];
            if (a === "") {
                if (b === "") {
                    return 0;
                }
                return -1;
            }
            if (b === "") {
                return 1;
            }
            return a[0].codePointAt() - b[0].codePointAt();
        });
        wgNamespaceIds.forEach(function (_ns) {
            var i = _ns[0],
                n = _ns[1];
            if (n === wgNamespaceNumber) { ns.push(i); }
            if (talkns === -1 && n === talkNamespaceNumber) { talkns = i; }
        });
        if (!ns[0]) { return; }
        var wgPageName = mw.config.get("wgPageName");
        var page = mw.config.get("wgPageName");
        var pageToLowerCase = page.toLowerCase();
        for (var j = 0, l = ns.length; j < l; j++) {
            if (pageToLowerCase.startsWith(ns[j])) {
                page = page.replace(new RegExp("^" + ns[j] + ":", "i"), "");
                break;
            }
        }
        var talkpage = talkns + ":" + page;
        var container = $("<div/>", {
            "class": "editRequest",
        });
        var now = new Date();
        container.append("您虽然无权编辑本页面，但您可以点击右侧按钮在本页的讨论页提出编辑请求，让可以编辑的人代为编辑：");
        $("<span/>").addClass("newComment").text("提出编辑请求").on("click", function () {
            window.open(mw.config.get("wgServer") + mw.config.get("wgScriptPath") + "/index.php?action=edit&preload=Template:编辑请求/" + (/^MediaWiki:Conversiontable\/zh-[a-z]+$/.test(wgPageName) ? page : "comment") + "&preloadtitle=编辑请求 - " + encodeURIComponent(mw.config.get("wgUserName") + " - " + now.getFullYear() + "." + prefixNumber(now.getMonth() + 1) + "." + prefixNumber(now.getDate())) + "&section=new&title=" + encodeURIComponent(talkpage), "_blank");
        }).appendTo(container);
        $("#mw-content-text").children(".wikiEditor-ui:first, textarea[readonly]:first").before("<hr>").before(container);
    }

    var explainconflict = $("#mw-content-text > .mw-explainconflict #explainconflict-info");
    if (explainconflict[0]) {
        $("html, body").animate({
            scrollTop: explainconflict.closest(".infoBox").offset().top - 2,
        }, 137);
    }

    // Customized File Insertion dialog
    // Copyright 2017 The Little Moe New LLC. All rights reserved.
    mw.loader.using(["oojs", "oojs-ui"]).then(function () {
        return; // disable
        // eslint-disable-next-line no-unreachable
        $("#wpTextbox1").on("wikiEditor-toolbar-doneInitialSections", function () {
            function FileInsertionDialog(config) {
                FileInsertionDialog.super.call(this, config);
            }
            OO.inheritClass(FileInsertionDialog, OO.ui.ProcessDialog);
            // Name
            FileInsertionDialog.static.name = "fileInsertionDialog";
            FileInsertionDialog.static.title = mw.msg("wikieditor-toolbar-tool-file-title");
            FileInsertionDialog.static.actions = [{
                flags: "primary",
                label: mw.msg("wikieditor-toolbar-tool-file-insert"),
                action: "insert"
            }, {
                flags: "safe",
                label: mw.msg("wikieditor-toolbar-tool-file-cancel")
            }];
            // Initialization
            FileInsertionDialog.prototype.initialize = function () {
                FileInsertionDialog.super.prototype.initialize.call(this);
                this.panel = new OO.ui.PanelLayout({
                    padded: true,
                    expanded: false
                });
                this.fileMetaContent = new OO.ui.FieldsetLayout();
                this.alignmentContent = new OO.ui.FieldsetLayout();
                this.formatContent = new OO.ui.FieldsetLayout();
                this.fileNameInput = new OO.ui.TextInputWidget({
                    indicator: "required"
                });
                this.fileNameField = new OO.ui.FieldLayout(this.fileNameInput, {
                    label: mw.msg("wikieditor-toolbar-file-target"),
                    align: "top"
                });
                this.fileTitleInput = new OO.ui.TextInputWidget();
                this.fileTitleField = new OO.ui.FieldLayout(this.fileTitleInput, {
                    label: mw.msg("wikieditor-toolbar-file-caption"),
                    align: "top"
                });
                this.sizeInput = new OO.ui.TextInputWidget();
                this.sizeField = new OO.ui.FieldLayout(this.sizeInput, {
                    label: mw.msg("wikieditor-toolbar-file-size"),
                    align: "top"
                });
                this.fileMetaContent.addItems([this.fileNameField, this.fileTitleField, this.sizeField]);
                var alignOptionDefault = new OO.ui.ButtonOptionWidget({
                    data: "default",
                    label: mw.msg("wikieditor-toolbar-file-default"),
                    title: mw.msg("wikieditor-toolbar-file-default")
                });
                var alignOptionNone = new OO.ui.ButtonOptionWidget({
                    data: "none",
                    label: mw.msg("wikieditor-toolbar-file-format-none"),
                    title: mw.msg("wikieditor-toolbar-file-format-none")
                });
                var magicWords = mw.config.get("wgWikiEditorMagicWords");
                var alignOptionMid = new OO.ui.ButtonOptionWidget({
                    data: "center",
                    label: magicWords.img_center,
                    title: magicWords.img_center
                });
                var alignOptionLeft = new OO.ui.ButtonOptionWidget({
                    data: "left",
                    label: magicWords.img_left,
                    title: magicWords.img_left
                });
                var alignOptionRight = new OO.ui.ButtonOptionWidget({
                    data: "right",
                    label: magicWords.img_right,
                    title: magicWords.img_right
                });
                this.alignmentSelect = new OO.ui.ButtonSelectWidget({
                    items: [alignOptionNone, alignOptionDefault, alignOptionMid, alignOptionLeft, alignOptionRight]
                });
                this.alignmentField = new OO.ui.FieldLayout(this.alignmentSelect, {
                    label: mw.msg("wikieditor-toolbar-file-float"),
                    align: "top"
                });
                this.alignmentContent.addItems([this.alignmentField]);
                var formatOptionThumbnail = new OO.ui.ButtonOptionWidget({
                    data: "thumbnail",
                    label: magicWords.img_thumbnail,
                    title: magicWords.img_thumbnail
                });
                var formatOptionFramed = new OO.ui.ButtonOptionWidget({
                    data: "framed",
                    label: magicWords.img_framed,
                    title: magicWords.img_framed
                });
                var formatOptionFrameless = new OO.ui.ButtonOptionWidget({
                    data: "frameless",
                    label: magicWords.img_frameless,
                    title: magicWords.img_frameless
                });
                var formatOptionNone = new OO.ui.ButtonOptionWidget({
                    data: "default",
                    label: magicWords.img_none,
                    title: magicWords.img_none
                });
                this.formatSelect = new OO.ui.ButtonSelectWidget({
                    items: [formatOptionThumbnail, formatOptionFramed, formatOptionFrameless, formatOptionNone]
                });
                this.formatField = new OO.ui.FieldLayout(this.formatSelect, {
                    label: mw.msg("wikieditor-toolbar-file-format"),
                    align: "top"
                });
                this.formatContent.addItems([this.formatField]);
                this.panel.$element.append(this.fileMetaContent.$element);
                this.panel.$element.append(this.alignmentContent.$element);
                this.panel.$element.append(this.formatContent.$element);
                this.$body.append(this.panel.$element);
                this.fileNameInput.connect(this, {
                    change: "onFileNameChange"
                });
            };
            // Specify the dialog height (or don"t to use the automatically generated height).
            FileInsertionDialog.prototype.getBodyHeight = function () {
                return this.panel.$element.outerHeight(true);
            };
            // Name validation
            FileInsertionDialog.prototype.onFileNameChange = function (value) {
                this.actions.setAbilities({
                    insert: !!value.length
                });
            };
            // Default state initialization
            FileInsertionDialog.prototype.getSetupProcess = function (data) {
                // eslint-disable-next-line no-param-reassign
                data = data || {};
                return FileInsertionDialog.super.prototype.getSetupProcess.call(this, data).next(function () {
                    this.actions.setAbilities({
                        insert: false
                    });
                    this.fileNameInput.setValue("");
                    this.fileTitleInput.setValue("");
                    this.sizeInput.setValue("");
                    this.alignmentSelect.selectItemByData("default");
                    this.formatSelect.selectItemByData("thumbnail");
                }, this);
            };
            // Context setup
            FileInsertionDialog.prototype.setContext = function (context) {
                this.editorContext = context;
            };
            // Specify processes to handle the actions.
            FileInsertionDialog.prototype.getActionProcess = function (action) {
                if (action === "insert") {
                    return new OO.ui.Process(function () {
                        this.insertImage();
                    }, this);
                }
                // Fallback to parent handler
                return FileInsertionDialog.super.prototype.getActionProcess.call(this, action);
            };
            // Handles image insertion.
            FileInsertionDialog.prototype.insertImage = function () {
                if (!this.editorContext) { return; }
                var fileName, caption, fileFloat, fileFormat, fileSize, fileTitle, options, fileUse, hasPxRgx = /.+px$/;
                fileName = this.fileNameInput.getValue();
                caption = this.fileTitleInput.getValue();
                fileSize = this.sizeInput.getValue();
                fileFloat = this.alignmentSelect.getSelectedItem().data;
                fileFormat = this.formatSelect.getSelectedItem().data;
                // Append px to end to size if not already contains it
                if (fileSize !== "" && !hasPxRgx.test(fileSize)) {
                    fileSize += "px";
                }
                if (fileName !== "") {
                    fileTitle = new mw.Title(fileName);
                    // Append file namespace prefix to filename if not already contains it
                    if (fileTitle.getNamespaceId() !== 6) {
                        fileTitle = new mw.Title(fileName, 6);
                    }
                    fileName = fileTitle.toText();
                }
                options = [fileSize, fileFormat, fileFloat];
                // Filter empty values
                options = $.grep(options, function (val) {
                    return val.length && val !== "default";
                });
                if (caption.length) {
                    options.push(caption);
                }
                fileUse = options.length === 0 ? fileName : fileName + "|" + options.join("|");
                $.wikiEditor.modules.toolbar.fn.doAction(this.editorContext, {
                    type: "replace",
                    options: {
                        pre: "[[",
                        peri: fileUse,
                        post: "]]",
                        ownline: true
                    }
                });
                this.close();
            };
            // Remove legacy file insertion
            $("#wpTextbox1").wikiEditor("removeFromToolbar", {
                section: "main",
                group: "insert",
                tool: "file"
            });
            $("#wpTextbox1").wikiEditor("addToToolbar", {
                section: "main",
                group: "insert",
                tools: {
                    "file-alt": {
                        label: mw.msg("wikieditor-toolbar-tool-file-title"),
                        type: "button",
                        icon: "https://img.moegirl.org.cn/common/3/3e/Insert-file.svg",
                        offset: [2, -1438],
                        action: {
                            type: "callback",
                            execute: function (context) {
                                var windowManager = new OO.ui.WindowManager();
                                $("body").append(windowManager.$element);
                                var fileInsertionDialog = new FileInsertionDialog();
                                fileInsertionDialog.setContext(context);
                                windowManager.addWindows([fileInsertionDialog]);
                                windowManager.openWindow(fileInsertionDialog);
                            }
                        }
                    }
                }
            });
        });
    });
});
// </pre>