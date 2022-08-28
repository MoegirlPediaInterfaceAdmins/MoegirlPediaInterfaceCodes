"use strict";
//通过选中文字快速找到编辑者和日期 by User:Bbrabbit
//注意：此工具会绝赞产生大量API请求，非维护组谨慎使用。维护组：需要WAF豁免。
(function(mw) {
    mw.loader.implement("mediawiki.diff.styles@na4y2", null, {
        css: [
            ".diff{border:0;border-spacing:4px;margin:0;width:100%; table-layout:fixed}.diff td{padding:0.33em 0.5em}.diff td.diff-marker{ padding:0.25em;text-align:right;font-weight:bold;font-size:1.25em;line-height:1.2}.diff td.diff-marker:before{content:attr(data-marker)}.diff td div{ word-wrap:break-word}.diff col.diff-marker{width:2%}.diff .diff-content{width:48%}.diff-title{vertical-align:top}.diff-notice,.diff-multi,.diff-otitle,.diff-ntitle{text-align:center}.diff-lineno{font-weight:bold;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.mw-diff-inline-added ins,.mw-diff-inline-changed ins,.mw-diff-inline-deleted ins,.mw-diff-inline-added del,.mw-diff-inline-changed del,.mw-diff-inline-deleted del{display:inline-block;text-decoration:none}.mw-diff-inline-added ins,.mw-diff-inline-changed ins{background:#a3d3ff}.mw-diff-inline-deleted del,.mw-diff-inline-changed del{background:#ffe49c}.diff-addedline,.diff-deletedline,.diff-context{  font-size:13px;line-height:1.6;vertical-align:top;white-space:pre-wrap;white-space:break-spaces;border-style:solid;border-width:1px 1px 1px 4px;border-radius:0.33em}.diff-editfont-monospace .diff-addedline,.diff-editfont-monospace .diff-deletedline,.diff-editfont-monospace .diff-context{font-family:monospace,monospace}.diff-editfont-sans-serif .diff-addedline,.diff-editfont-sans-serif .diff-deletedline,.diff-editfont-sans-serif .diff-context{font-family:sans-serif}.diff-editfont-serif .diff-addedline,.diff-editfont-serif .diff-deletedline,.diff-editfont-serif .diff-context{font-family:serif}.diff-context{background:#f8f9fa;border-color:#eaecf0;color:#202122}.diff-addedline{border-color:#a3d3ff}.diff-deletedline{border-color:#ffe49c}.diffchange{font-weight:bold;text-decoration:none}.diff-addedline .diffchange,.diff-deletedline .diffchange{border-radius:0.33em;padding:0.25em 0}.diff-addedline .diffchange{background:#d8ecff}.diff-deletedline .diffchange{background:#feeec8} .diff-currentversion-title,.diff{direction:ltr;unicode-bidi:embed}.diff-contentalign-right td{ direction:rtl;unicode-bidi:embed}.diff-contentalign-left td{ direction:ltr;unicode-bidi:embed}.diff-multi,.diff-otitle,.diff-ntitle,.diff-lineno{direction:ltr !important; unicode-bidi:embed}.mw-diff-slot-header{text-align:center} .mw-diff-movedpara-left,.mw-diff-movedpara-right,.mw-diff-movedpara-left:visited,.mw-diff-movedpara-right:visited,.mw-diff-movedpara-left:active,.mw-diff-movedpara-right:active{display:block;color:transparent;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.mw-diff-movedpara-left:hover,.mw-diff-movedpara-right:hover{text-decoration:none;color:transparent}.mw-diff-movedpara-left:after,.mw-diff-movedpara-right:after{display:block;color:#202122;margin-top:-1.25em}.mw-diff-movedpara-left:after,.rtl .mw-diff-movedpara-right:after{content:'↪'}.mw-diff-movedpara-right:after,.rtl .mw-diff-movedpara-left:after{content:'↩'}#mw-inlinediff-header #mw-diff-otitle1,#mw-inlinediff-header #mw-diff-otitle2,#mw-inlinediff-header #mw-diff-otitle3,#mw-inlinediff-header #mw-diff-otitle5{display:none} .diff[data-selected-side='deleted'] .diff-side-added,.diff[data-selected-side='added'] .diff-side-deleted{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;cursor:text}", "@media print {\n\ttd.diff-context,td.diff-addedline .diffchange,td.diff-deletedline .diffchange{background-color:transparent}td.diff-addedline .diffchange{text-decoration:underline}td.diff-deletedline .diffchange{text-decoration:line-through}}",
        ],
    });
    mw.loader.implement("BB2WikiBlame", () => {
        //helper functions
        const queryRevisionApi = function(start_date, end_date, limit, selection) {
            const api = new mw.Api();
            const pagename = mw.config.get("wgPageName");
            api.get({
                action: "query",
                prop: "revisions",
                rvprop: "ids|flags|timestamp|user|parsedcomment|tags",
                titles: pagename,
                rvlimit: limit,
                rvstart: start_date,
                rvend: end_date,
                rvdir: "newer",
            }).done((data) => {
                const page_id = Object.keys(data.query.pages)[0];
                if (page_id) {
                    const revisions = data.query.pages[page_id].revisions;
                    console.log(revisions);
                    const revisions_list = [];
                    const processed = [];
                    const parser = new DOMParser();
                    $("#wiki-blame-progress").html(`<p>0/${limit}`);
                    setInterval(() => $("#wiki-blame-progress").html(`<p>${processed.length}/${limit}</p>`), 1000);
                    revisions.forEach((r) => {
                        api.get({
                            action: "compare",
                            fromrev: r.revid,
                            torelative: "prev",
                        }).done((rdata) => {
                            rdata.compare.user = r.user;
                            rdata.compare.revid = rdata.torevid;
                            const edit_date = new Date(r.timestamp);
                            rdata.compare.timestamp = edit_date.toLocaleDateString();
                            const dom = parser.parseFromString(rdata.compare["*"], "text/html");
                            const diffs = dom.getElementsByClassName("diffchange");
                            for (const d of diffs) {
                                if (d.textContent.includes(selection)) {
                                    revisions_list.push(rdata.compare);
                                    break;
                                }
                            }
                        }).always(() => {
                            processed.push(1);
                            if (processed.length === revisions.length) {
                                createDiffDiaglog(revisions_list);
                            }
                        });
                    });                 
                }
            }).fail((err) => console.log(err));
        };

        const getSelected = function() {
            let text = "";
            text = window.getSelection().toString();
            return text;
        };
        const createDialog = function(selection) {
            function WikiBlameDialog(config) {
                WikiBlameDialog.super.call(this, config);
            }
            OO.inheritClass(WikiBlameDialog, OO.ui.Dialog);
            WikiBlameDialog.static.name = "wikiBlameDialog";
            WikiBlameDialog.prototype.initialize = function() {
                const current_date = new Date();
                const current_year = current_date.getFullYear();
                const current_month = current_date.getMonth() + 1;
                const current_day = current_date.getUTCDate();
                const start_year_list = [],
                    start_month_list = [],
                    start_day_list = [],
                    end_year_list = [],
                    end_month_list = [],
                    end_day_list = [];
                for (let i = 2010; i <= current_year; i++) {
                    start_year_list.push(new OO.ui.MenuOptionWidget({
                        data: String(i),
                        label: String(i),
                    }));
                    end_year_list.push(new OO.ui.MenuOptionWidget({
                        data: String(i),
                        label: String(i),
                    }));
                }
                Array(12)
                    .fill(1)
                    .map((x, y) => x + y)
                    .forEach((i) => {start_month_list.push(new OO.ui.MenuOptionWidget({
                        data: String(i),
                        label: String(i),
                    }));end_month_list.push(new OO.ui.MenuOptionWidget({
                        data: String(i),
                        label: String(i),
                    }));
                    });
                Array(31)
                    .fill(1)
                    .map((x, y) => x + y)
                    .forEach((i) => {start_day_list.push(new OO.ui.MenuOptionWidget({
                        data: String(i),
                        label: String(i),
                    }));end_day_list.push(new OO.ui.MenuOptionWidget({
                        data: String(i),
                        label: String(i),
                    }));
                    });
                WikiBlameDialog.super.prototype.initialize.call(this);
                const current_selection = new OO.ui.TextInputWidget({
                    value: selection,
                });
                const revision_check = new OO.ui.TextInputWidget({
                    value: "50",
                });
                const start_date_label = new OO.ui.LabelWidget({
                    label: "开始日期",
                });
                const start_year = new OO.ui.DropdownWidget({
                    menu: {
                        items: start_year_list,
                    },
                });
                const start_month = new OO.ui.DropdownWidget({
                    menu: {
                        items: start_month_list,
                    },
                });
                const start_day = new OO.ui.DropdownWidget({
                    menu: {
                        items: start_day_list,
                    },
                });
                const end_date_label = new OO.ui.LabelWidget({
                    label: "结束日期",
                });
                const end_year = new OO.ui.DropdownWidget({
                    menu: {
                        items: end_year_list,
                    },
                });
                const end_month = new OO.ui.DropdownWidget({
                    menu: {
                        items: end_month_list,
                    },
                });
                const end_day = new OO.ui.DropdownWidget({
                    menu: {
                        items: end_day_list,
                    },
                });
                const submit = new OO.ui.ButtonWidget({
                    label: "提交",
                    flags: ["progressive", "primary"],
                });
                const progress = new OO.ui.LabelWidget({
                    id: "wiki-blame-progress",
                    label: "",
                });
                const fieldSet = new OO.ui.FieldsetLayout({
                    label: "拷打编辑小工具",
                });
                fieldSet.addItems([
                    new OO.ui.FieldLayout(current_selection, {
                        label: "选中文字",
                        align: "top",
                    }),
                    new OO.ui.FieldLayout(revision_check, {
                        label: "搜索数量",
                        align: "top",
                    }),
                    new OO.ui.FieldLayout(start_date_label, {
                        align: "inline",
                    }),
                    new OO.ui.FieldLayout(start_year, {
                        id: "start-year",
                        align: "inline",
                    }),
                    new OO.ui.FieldLayout(start_month, {
                        id: "start-month",
                        align: "inline",
                    }),
                    new OO.ui.FieldLayout(start_day, {
                        id: "start-day",
                        align: "inline",
                    }),
                    new OO.ui.FieldLayout(end_date_label, {
                        align: "inline",
                    }),
                    new OO.ui.FieldLayout(end_year, {
                        id: "end-year",
                        align: "inline",
                    }),
                    new OO.ui.FieldLayout(end_month, {
                        id: "end-month",
                        align: "inline",
                    }),
                    new OO.ui.FieldLayout(end_day, {
                        id: "end-day",
                        align: "inline",
                    }),
                    new OO.ui.FieldLayout(submit, {
                        align: "right",
                    }),
                    new OO.ui.FieldLayout(progress, {
                    }),
                ]);
                this.content = new OO.ui.PanelLayout({
                    padded: true,
                    expanded: false,
                });
                this.content.$element.append(fieldSet.$element);
                this.$body.append(this.content.$element);
                start_year.getMenu().selectItemByData(String(current_year));
                start_month.getMenu().selectItemByData(String(current_month));
                start_day.getMenu().selectItemByData(String(current_day));
                end_year.getMenu().selectItemByData(String(current_year));
                end_month.getMenu().selectItemByData(String(current_month));
                end_day.getMenu().selectItemByData(String(current_day));
                submit.on("click", () => {
                    const start_date = `${start_year.getMenu().findSelectedItem().getData() }-${ 
                        `0${ start_month.getMenu().findSelectedItem().getData()}`.slice(-2) }-${ 
                        `0${ start_day.getMenu().findSelectedItem().getData()}`.slice(-2) }T00:00:00Z`;
                    const end_date = `${end_year.getMenu().findSelectedItem().getData() }-${ 
                        `0${ end_month.getMenu().findSelectedItem().getData()}`.slice(-2) }-${ 
                        `0${ end_day.getMenu().findSelectedItem().getData()}`.slice(-2) }T23:59:59Z`;
                    const limit = revision_check.getValue();
                    queryRevisionApi(start_date, end_date, limit, selection);
                });
                $("#start-year, #start-month, #start-day, #end-year, #end-month, #end-day").css({
                    display: "inline-block",
                    width: "33%",
                });
                $(".oo-ui-fieldsetLayout-group .oo-ui-fieldLayout-align-right").css({
                    "float": "right",
                });
            };
            WikiBlameDialog.prototype.getBodyHeight = function() {
                return this.content.$element.outerHeight(true) + 10;
            };
            const myDialog = new WikiBlameDialog({
                id: "wiki-blame-dialog-popup",
                size: "medium",
            });
            if (!window.wikiBlameWindowManager) {
                window.wikiBlameWindowManager = new OO.ui.WindowManager();
            }
            const windowManager = window.wikiBlameWindowManager;
            $(document.body).append(window.wikiBlameWindowManager.$element);
            windowManager.addWindows([myDialog]);
            windowManager.openWindow(myDialog);
        };
        const createDiffDiaglog = function(revisions_list) {
            const windowManager = window.wikiBlameWindowManager;
            if (windowManager.currentWindow &&
                window.wikiBlameWindowManager.currentWindow.getElementId() === "wiki-blame-dialog-popup")
            {windowManager.currentWindow.close();}

            function WikiDiffBlameDialog(config) {
                WikiDiffBlameDialog.super.call(this, config);
            }
            OO.inheritClass(WikiDiffBlameDialog, OO.ui.Dialog);
            WikiDiffBlameDialog.static.name = "wikiDiffBlameDialog";
            WikiDiffBlameDialog.prototype.initialize = function() {
                WikiDiffBlameDialog.super.prototype.initialize.call(this);
                const page_list = [];
                for (const r of revisions_list) {
                    const diff_table = `<table class="diff">
                    <colgroup>
                        <col class="diff-marker">
                        <col class="diff-content">
                        <col class="diff-marker">
                        <col class="diff-content">
                    </colgroup>
                    <tbody>
                        ${r["*"]}
                    </tbody>
                    </table>`;
                    page_list.push(new (bookletLayoutFactory(`${r.user } ${ r.timestamp}`))(r.user+r.revid, undefined, diff_table));
                }
                this.content = new OO.ui.BookletLayout({
                    outlined: true,
                });
                this.content.addPages(page_list);
                this.$body.append(this.content.$element);
            };
            WikiDiffBlameDialog.prototype.getBodyHeight = function() {
                return 500;
            };
            const diffDialog = new WikiDiffBlameDialog({
                size: "larger",
            });
            windowManager.addWindows([diffDialog]);
            windowManager.openWindow(diffDialog);
        };
        const bookletLayoutFactory = function(label) {
            const PageLayout = new Function("name", "config", "diff_table", `
            OO.ui.PageLayout.call(this, name, config);
            this.$element.append($(diff_table));`);
            OO.inheritClass(PageLayout, OO.ui.PageLayout);
            PageLayout.prototype.setupOutlineItem = new Function(`this.outlineItem.setLabel("${label}");`);
            return PageLayout;
        };

        //处理mouseup事件
        $("#bodyContent").mouseup((e) => {
            let selection = getSelected();
            if (selection) {
                if ($(".wiki-blame-popup").length === 0) {
                    const button = new OO.ui.ButtonWidget({
                        label: "拷打编辑",
                        icon: "help",
                        title: "blame",
                    });
                    button.on("click", () => {
                        createDialog(selection);
                    });
                    const popup = new OO.ui.PopupWidget({
                        $content: button.$element,
                        padded: true,
                        width: 130,
                        height: 50,
                        autoFlip: false,
                    });
                    popup.$element.addClass("wiki-blame-popup");
                    $(e.target).append(popup.$element);
                    popup.toggle(true);
                    const margin_top = $("#bodyContent .oo-ui-popupWidget-body-padded").css("marginTop");
                    if (parseInt(margin_top) > 20) {
                        $("#bodyContent .oo-ui-popupWidget-body-padded").css("margin", "5px");
                    }
                    $("#bodyContent .oo-ui-buttonElement-button").css({
                        width: "107px",
                        height: "32px",
                        padding: "8px 12px 7px 37px",
                    });
                    $("#bodyContent .oo-ui-buttonElement-button .oo-ui-iconElement-icon").css({
                        "font-size": "14px",
                        color: "#222",
                    });
                    $("#bodyContent .oo-ui-buttonElement-button .oo-ui-labelElement-label").css({
                        "font-size": "14px",
                        color: "#222",
                        "vertical-align": "inherit",
                    });

                }
            } else {
                $(".wiki-blame-popup").remove();
            }
            selection = getSelected();
            if (!selection) {
                $(".wiki-blame-popup").remove();
            }
        });
    });
})(mediaWiki);