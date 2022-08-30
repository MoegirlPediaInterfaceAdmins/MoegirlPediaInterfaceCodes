//通过选中文字快速找到编辑者和日期 by User:Bbrabbit
//注意：此工具会绝赞产生大量API请求，非维护组谨慎使用。维护组：需要WAF豁免。
"use strict";
$(() => {
    //dialog classes
    class WikiBlameDialog extends OO.ui.Dialog {
        static static = { ...super.static, name: "wikiBlameDialog" };
        constructor(config) {
            super(config);
        }

        initialize() {
            super.initialize();
            const selection = getSelection();
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
                .forEach((i) => {
                    start_month_list.push(new OO.ui.MenuOptionWidget({
                        data: String(i),
                        label: String(i),
                    })); end_month_list.push(new OO.ui.MenuOptionWidget({
                        data: String(i),
                        label: String(i),
                    }));
                });
            Array(31)
                .fill(1)
                .map((x, y) => x + y)
                .forEach((i) => {
                    start_day_list.push(new OO.ui.MenuOptionWidget({
                        data: String(i),
                        label: String(i),
                    })); end_day_list.push(new OO.ui.MenuOptionWidget({
                        data: String(i),
                        label: String(i),
                    }));
                });
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
                const start_date = `${start_year.getMenu().findSelectedItem().getData()}-${`0${start_month.getMenu().findSelectedItem().getData()}`.slice(-2)}-${`0${start_day.getMenu().findSelectedItem().getData()}`.slice(-2)}T00:00:00Z`;
                const end_date = `${end_year.getMenu().findSelectedItem().getData()}-${`0${end_month.getMenu().findSelectedItem().getData()}`.slice(-2)}-${`0${end_day.getMenu().findSelectedItem().getData()}`.slice(-2)}T23:59:59Z`;
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
        }
        getBodyHeight() {
            return this.content.$element.outerHeight(true) + 10;
        }

    }

    class PageLayout extends OO.ui.PageLayout {
        #label;
        constructor(name, config, diff_table, label) {
            super(name, config);
            this.#label = label;
            this.$element.append($(diff_table));
        }
        setupOutlineItem() {
            this.outlineItem.setLabel(this.#label);
        }
    }

    class WikiBlameDiffDialog extends OO.ui.Dialog {
        static static = { ...super.static, name: "wikiBlameDiffDialog" };
        revision_list = undefined;
        constructor(config, revision_list) {
            super(config);
            this.revision_list = revision_list;
        }

        initialize() {
            super.initialize();
            const page_list = [];
            for (const r of this.revision_list) {
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
                page_list.push(new PageLayout(r.user + r.revid, undefined, diff_table, `${r.user} ${r.timestamp}`));
            }
            this.content = new OO.ui.BookletLayout({
                outlined: true,
            });
            this.content.addPages(page_list);
            this.$body.append(this.content.$element);
        }

        getBodyHeight() {
            return 500;
        }
    }

    //helper functions
    const queryRevisionApi = function (start_date, end_date, limit, selection) {
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
                if (revisions === undefined) {
                    $("#wiki-blame-progress").html("<p style=\"color: red\">指定区间内无编辑或API错误</p>");
                    return;
                }
                const revisions_list = [];
                const processed = [];
                const parser = new DOMParser();
                $("#wiki-blame-progress").html(`<p>0/${revisions.length}`);
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
                            createDiffDialog(revisions_list);
                        }
                    });
                });
            }
        }).fail((err) => console.log(err));
    };

    const getSelected = function () {
        let text = "";
        text = window.getSelection().toString();
        return text;
    };
    const createDialog = function () {
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

    const createDiffDialog = function (revisions_list) {
        const windowManager = window.wikiBlameWindowManager;
        if (windowManager.currentWindow &&
            window.wikiBlameWindowManager.currentWindow.getElementId() === "wiki-blame-dialog-popup") { windowManager.currentWindow.close(); }
        const diffDialog = new WikiBlameDiffDialog({
            size: "larger",
        }, revisions_list);
        windowManager.addWindows([diffDialog]);
        windowManager.openWindow(diffDialog);
    };

    //处理mouseup事件
    $("#bodyContent").on("mouseup", (e) => {
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
