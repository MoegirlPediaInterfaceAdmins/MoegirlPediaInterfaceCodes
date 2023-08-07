"use strict";
// <pre>
$(() => {
    if (!["edit", "submit"].includes(mw.config.get("wgAction"))) {
        return;
    }
    if (mw.config.get("wgPageName").startsWith("萌娘百科_talk:讨论版/")) {
        $(".mw-editnotice + .mw-warning-with-logexcerpt").hide();
    }
    const sanity = $(document.createElement("span"));
    const sanityClean = (h) => {
        sanity.text(h);
        return sanity.html();
    };
    const wpSummary = $('[name="wpSummary"]');
    // $(".mw-summary-preset-item a").closest('.oo-ui-fieldLayout-header').width($('#wpSummary').width());
    $(".mw-summary-preset-item a").on("click", ({ target }) => {
        wpSummary.val(`${wpSummary.val().trim()} ${$(target).text()}`.trim());
        wpSummary.trigger("focus");
        return false;
    });

    // .wikiEditor-ui-controls 颜色修正
    $(".wikiEditor-ui-controls").css("background-color", $("#content").css("background-color"));

    // 编辑提示检查
    if ($(".mw-summary-preset")[0]) {
        $(".CheckNewSectionOn").hide();
    } else {
        $(".CheckNewSectionOff").hide();
        $('.headerInputbox a[href*="preload=Template%3A权限申请%2F"], .headerInputbox a[href*="preload=Template%3A%E6%9D%83%E9%99%90%E7%94%B3%E8%AF%B7%2F"]').attr("target", "_self");
    }

    if ($(".AbusefilterWarningNoHttp")[0]) {
        const replaces = [];
        $("#wpTextbox1").val($("#wpTextbox1").val().replace(/http:\/\/([a-z\d]+\.bilibili\.[a-z\d]+)/ig, (raw, $1) => {
            const result = `https://${$1}`;
            replaces.push(raw, result);
        }));
        oouiDialog.alert(`您的编辑内容含有以下 http 链接，已自动替换为对应的 https 链接：<ul><li>${replaces.map((raw, result) => `<code>${sanityClean(raw)}</code> → <code>${sanityClean(result)}</code>`)}</li></ul>`, {
            title: "萌娘百科提醒您",
            size: "medium",
        });
    }
    // 编辑请求
    const prefixNumber = (num) => {
        let result = `${num}`;
        if (result.length === 1) {
            result = `0${result}`;
        }
        return result;
    };
    if (!$("ul.permissions-errors").find('a[href*="MoeAuth"]').length && !!$(".permissions-errors, #wpTextbox1[readonly]")[1] && mw.config.get("wgUserName") && !$(".newComment")[0]) {
        const wgNamespaceNumber = mw.config.get("wgNamespaceNumber"),
            ns = [];
        if (wgNamespaceNumber < 0 || wgNamespaceNumber % 2 === 1) {
            return;
        }
        const talkNamespaceNumber = wgNamespaceNumber + 1;
        let talkns = -1;
        for (const [k, v] of Object.entries(mw.config.get("wgNamespaceIds"))) {
            if (v === wgNamespaceNumber) {
                ns.push(k);
            }
            if (talkns === -1 && v === talkNamespaceNumber) {
                talkns = k;
            }
        }
        if (!ns[0]) {
            return;
        }
        const wgPageName = mw.config.get("wgPageName");
        let page = mw.config.get("wgPageName");
        const pageToLowerCase = page.toLowerCase();
        for (const n of ns) {
            if (pageToLowerCase.startsWith(n)) {
                page = page.replace(new RegExp(`^${n}:`, "i"), "");
                break;
            }
        }
        const talkpage = `${talkns}:${page}`;
        const container = $("<div/>", {
            "class": "editRequest",
        });
        const now = new Date();
        container.append("虽然您无权编辑本页面，但您可以点击右侧按钮在本页的讨论页提出编辑请求，让可以编辑的人代为编辑：");
        $("<span/>").addClass("newComment").text("提出编辑请求").on("click", () => {
            window.open(`${mw.config.get("wgServer")}${mw.config.get("wgScriptPath")}/index.php?action=edit&preload=Template:编辑请求/${/^MediaWiki:Conversiontable\/zh-[a-z]+$/.test(wgPageName) ? page : "comment"}&preloadtitle=编辑请求 - ${encodeURIComponent(`${mw.config.get("wgUserName")} - ${now.getFullYear()}.${prefixNumber(now.getMonth() + 1)}.${prefixNumber(now.getDate())}`)}&section=new&title=${encodeURIComponent(talkpage)}`, "_blank");
        }).appendTo(container);
        $("#mw-content-text").children(".wikiEditor-ui:first, textarea[readonly]:first").before("<hr>").before(container);
    }

    const explainconflict = $("#mw-content-text > .mw-explainconflict #explainconflict-info");
    if (explainconflict[0]) {
        $("html, body").animate({
            scrollTop: explainconflict.closest(".infoBox").offset().top - 2,
        }, 137);
    }

    // 非维护组、技术组成员提出方针编辑请求时提醒需要走提案
    if (
        new URLSearchParams(location.search).get("preloadtitle").startsWith("编辑请求") &&
        mw.config.get("wgNamespaceNumber") === 5 &&
        mw.config.get("wgAction") === "edit" &&
        !mw.config.get("wgUserGroups").some((value) => ["patroller", "sysop", "techeditor", "scripteditor", "interface-admin", "staff"].includes(value))
    ) {
        OO.ui.alert(
            $('<p>进行<b>实质性</b>修改时，需要通过<a href="/萌娘百科:提案" style="font-weight:bold">提案</a>或<a href="/萌娘百科:快速提案" style="font-weight:bold">快速提案</a>流程才可对方针和指引进行改动。</p><p>在讨论页发起的编辑请求仅可用于修正错别字等<b>非实质性</b>修改。</p>'),
            {
                title: "提醒",
                size: "small",
                actions: [
                    {
                        action: "Confirm",
                        label: "我知道了",
                    },
                ],
            });
    }

    // Customized File Insertion dialog
    // Copyright 2017 The Little Moe New LLC. All rights reserved.
    /*
    mw.loader.using(["oojs", "oojs-ui"]).then(() => {
        if (Number.MAX_SAFE_INTEGER > Number.MIN_SAFE_INTEGER) {
            return; // disable
        }
        $("#wpTextbox1").on("wikiEditor-toolbar-doneInitialSections", () => {
            class FileInsertionDialog extends OO.ui.ProcessDialog {
                static static = ({
                    ...super.static,
                    name: "fileInsertionDialog",
                    title: mw.msg("wikieditor-toolbar-tool-file-title"),
                    actions: [{
                        flags: "primary",
                        label: mw.msg("wikieditor-toolbar-tool-file-insert"),
                        action: "insert",
                    }, {
                        flags: "safe",
                        label: mw.msg("wikieditor-toolbar-tool-file-cancel"),
                    }],
                });
                constructor(config) {
                    super(config);
                }
                // Initialization
                initialize() {
                    super.initialize();
                    this.panel = new OO.ui.PanelLayout({
                        padded: true,
                        expanded: false,
                    });
                    this.fileMetaContent = new OO.ui.FieldsetLayout();
                    this.alignmentContent = new OO.ui.FieldsetLayout();
                    this.formatContent = new OO.ui.FieldsetLayout();
                    this.fileNameInput = new OO.ui.TextInputWidget({
                        indicator: "required",
                    });
                    this.fileNameField = new OO.ui.FieldLayout(this.fileNameInput, {
                        label: mw.msg("wikieditor-toolbar-file-target"),
                        align: "top",
                    });
                    this.fileTitleInput = new OO.ui.TextInputWidget();
                    this.fileTitleField = new OO.ui.FieldLayout(this.fileTitleInput, {
                        label: mw.msg("wikieditor-toolbar-file-caption"),
                        align: "top",
                    });
                    this.sizeInput = new OO.ui.TextInputWidget();
                    this.sizeField = new OO.ui.FieldLayout(this.sizeInput, {
                        label: mw.msg("wikieditor-toolbar-file-size"),
                        align: "top",
                    });
                    this.fileMetaContent.addItems([this.fileNameField, this.fileTitleField, this.sizeField]);
                    const alignOptionDefault = new OO.ui.ButtonOptionWidget({
                        data: "default",
                        label: mw.msg("wikieditor-toolbar-file-default"),
                        title: mw.msg("wikieditor-toolbar-file-default"),
                    });
                    const alignOptionNone = new OO.ui.ButtonOptionWidget({
                        data: "none",
                        label: mw.msg("wikieditor-toolbar-file-format-none"),
                        title: mw.msg("wikieditor-toolbar-file-format-none"),
                    });
                    const magicWords = mw.config.get("wgWikiEditorMagicWords");
                    const alignOptionMid = new OO.ui.ButtonOptionWidget({
                        data: "center",
                        label: magicWords.img_center,
                        title: magicWords.img_center,
                    });
                    const alignOptionLeft = new OO.ui.ButtonOptionWidget({
                        data: "left",
                        label: magicWords.img_left,
                        title: magicWords.img_left,
                    });
                    const alignOptionRight = new OO.ui.ButtonOptionWidget({
                        data: "right",
                        label: magicWords.img_right,
                        title: magicWords.img_right,
                    });
                    this.alignmentSelect = new OO.ui.ButtonSelectWidget({
                        items: [alignOptionNone, alignOptionDefault, alignOptionMid, alignOptionLeft, alignOptionRight],
                    });
                    this.alignmentField = new OO.ui.FieldLayout(this.alignmentSelect, {
                        label: mw.msg("wikieditor-toolbar-file-float"),
                        align: "top",
                    });
                    this.alignmentContent.addItems([this.alignmentField]);
                    const formatOptionThumbnail = new OO.ui.ButtonOptionWidget({
                        data: "thumbnail",
                        label: magicWords.img_thumbnail,
                        title: magicWords.img_thumbnail,
                    });
                    const formatOptionFramed = new OO.ui.ButtonOptionWidget({
                        data: "framed",
                        label: magicWords.img_framed,
                        title: magicWords.img_framed,
                    });
                    const formatOptionFrameless = new OO.ui.ButtonOptionWidget({
                        data: "frameless",
                        label: magicWords.img_frameless,
                        title: magicWords.img_frameless,
                    });
                    const formatOptionNone = new OO.ui.ButtonOptionWidget({
                        data: "default",
                        label: magicWords.img_none,
                        title: magicWords.img_none,
                    });
                    this.formatSelect = new OO.ui.ButtonSelectWidget({
                        items: [formatOptionThumbnail, formatOptionFramed, formatOptionFrameless, formatOptionNone],
                    });
                    this.formatField = new OO.ui.FieldLayout(this.formatSelect, {
                        label: mw.msg("wikieditor-toolbar-file-format"),
                        align: "top",
                    });
                    this.formatContent.addItems([this.formatField]);
                    this.panel.$element.append(this.fileMetaContent.$element);
                    this.panel.$element.append(this.alignmentContent.$element);
                    this.panel.$element.append(this.formatContent.$element);
                    this.$body.append(this.panel.$element);
                    this.fileNameInput.connect(this, {
                        change: "onFileNameChange",
                    });
                }
                // Specify the dialog height (or don"t to use the automatically generated height).
                getBodyHeight() {
                    return this.panel.$element.outerHeight(true);
                }
                // Name validation
                onFileNameChange(value) {
                    this.actions.setAbilities({
                        insert: !!value.length,
                    });
                }
                // Default state initialization
                getSetupProcess(_data) {
                    const data = _data || {};
                    return FileInsertionDialog.super.prototype.getSetupProcess.call(this, data).next(function () {
                        this.actions.setAbilities({
                            insert: false,
                        });
                        this.fileNameInput.setValue("");
                        this.fileTitleInput.setValue("");
                        this.sizeInput.setValue("");
                        this.alignmentSelect.selectItemByData("default");
                        this.formatSelect.selectItemByData("thumbnail");
                    }, this);
                }
                // Context setup
                setContext(context) {
                    this.editorContext = context;
                }
                // Specify processes to handle the actions.
                getActionProcess(action) {
                    if (action === "insert") {
                        return new OO.ui.Process(function () {
                            this.insertImage();
                        }, this);
                    }
                    // Fallback to parent handler
                    return FileInsertionDialog.super.prototype.getActionProcess.call(this, action);
                }
                // Handles image insertion.
                insertImage() {
                    if (!this.editorContext) {
                        return;
                    }
                    const hasPxRgx = /.+px$/;
                    const caption = this.fileTitleInput.getValue();
                    const fileFloat = this.alignmentSelect.getSelectedItem().data;
                    const fileFormat = this.formatSelect.getSelectedItem().data;
                    let fileName = this.fileNameInput.getValue(), fileSize = this.sizeInput.getValue(),
                        fileTitle, options;
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
                    options = $.grep(options, (val) => val.length && val !== "default");
                    if (caption.length) {
                        options.push(caption);
                    }
                    $.wikiEditor.modules.toolbar.fn.doAction(this.editorContext, {
                        type: "replace",
                        options: {
                            pre: "[[",
                            peri: options.length === 0 ? fileName : `${fileName}|${options.join("|")}`,
                            post: "]]",
                            ownline: true,
                        },
                    });
                    this.close();
                }
            }
            // Remove legacy file insertion
            $("#wpTextbox1").wikiEditor("removeFromToolbar", {
                section: "main",
                group: "insert",
                tool: "file",
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
                                const windowManager = new OO.ui.WindowManager();
                                $("body").append(windowManager.$element);
                                const fileInsertionDialog = new FileInsertionDialog();
                                fileInsertionDialog.setContext(context);
                                windowManager.addWindows([fileInsertionDialog]);
                                windowManager.openWindow(fileInsertionDialog);
                            },
                        },
                    },
                },
            });
        });
    });
    */
});
// </pre>
