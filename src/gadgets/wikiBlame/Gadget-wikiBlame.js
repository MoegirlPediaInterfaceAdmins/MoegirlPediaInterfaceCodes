// 通过选中文字快速找到编辑者和日期 by User:Bbrabbit
// 注意：此工具会绝赞产生大量API请求，非维护组谨慎使用。维护组：需要WAF豁免。
/* eslint-disable no-use-before-define */
"use strict";
$(() => {
    if (!mw.config.get("wgIsArticle") || !mw.config.get("wgArticleId")) {
        return;
    }

    // dialog classes
    class WikiBlameDialog extends OO.ui.Dialog {
        static static = { ...super.static, name: "wikiBlameDialog" };
        constructor(config) {
            super(config);
        }

        initialize() {
            super.initialize();
            const selection = getSelected();
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            const currentMonth = currentDate.getMonth() + 1;
            const currentDay = currentDate.getUTCDate();
            const startYearList = [],
                startMonthList = [],
                startDayList = [],
                endYearList = [],
                endMonthList = [],
                endDayList = [];
            for (let i = 2010; i <= currentYear; i++) {
                startYearList.push(new OO.ui.MenuOptionWidget({
                    data: String(i),
                    label: String(i),
                }));
                endYearList.push(new OO.ui.MenuOptionWidget({
                    data: String(i),
                    label: String(i),
                }));
            }
            Array(12)
                .fill(1)
                .map((x, y) => x + y)
                .forEach((i) => {
                    startMonthList.push(new OO.ui.MenuOptionWidget({
                        data: String(i),
                        label: String(i),
                    }));
                    endMonthList.push(new OO.ui.MenuOptionWidget({
                        data: String(i),
                        label: String(i),
                    }));
                });
            Array(31)
                .fill(1)
                .map((x, y) => x + y)
                .forEach((i) => {
                    startDayList.push(new OO.ui.MenuOptionWidget({
                        data: String(i),
                        label: String(i),
                    }));
                    endDayList.push(new OO.ui.MenuOptionWidget({
                        data: String(i),
                        label: String(i),
                    }));
                });

            const currentSelection = new OO.ui.TextInputWidget({
                value: selection,
            });
            const revisionCheck = new OO.ui.TextInputWidget({
                value: "50",
            });
            const startDateLabel = new OO.ui.LabelWidget({
                label: "开始日期",
            });
            const startYear = new OO.ui.DropdownWidget({
                menu: {
                    items: startYearList,
                },
            });
            const startMonth = new OO.ui.DropdownWidget({
                menu: {
                    items: startMonthList,
                },
            });
            const startDay = new OO.ui.DropdownWidget({
                menu: {
                    items: startDayList,
                },
            });
            const endDateLabel = new OO.ui.LabelWidget({
                label: "结束日期",
            });
            const endYear = new OO.ui.DropdownWidget({
                menu: {
                    items: endYearList,
                },
            });
            const endMonth = new OO.ui.DropdownWidget({
                menu: {
                    items: endMonthList,
                },
            });
            const endDay = new OO.ui.DropdownWidget({
                menu: {
                    items: endDayList,
                },
            });
            const submit = new OO.ui.ButtonWidget({
                label: "提交",
                flags: ["progressive", "primary"],
            });
            const close = new OO.ui.ButtonWidget({
                id: "wiki-blame-close",
                label: "✖",
            });
            const progress = new OO.ui.LabelWidget({
                id: "wiki-blame-progress",
                label: "",
            });
            const fieldSet = new OO.ui.FieldsetLayout({
                label: "拷打编辑小工具",
            });
            fieldSet.$header.append(close.$element);
            fieldSet.addItems([
                new OO.ui.FieldLayout(currentSelection, {
                    label: "选中文字",
                    align: "top",
                }),
                new OO.ui.FieldLayout(revisionCheck, {
                    label: "搜索数量",
                    align: "top",
                }),
                new OO.ui.FieldLayout(startDateLabel, {
                    align: "inline",
                }),
                new OO.ui.FieldLayout(startYear, {
                    id: "start-year",
                    align: "inline",
                }),
                new OO.ui.FieldLayout(startMonth, {
                    id: "start-month",
                    align: "inline",
                }),
                new OO.ui.FieldLayout(startDay, {
                    id: "start-day",
                    align: "inline",
                }),
                new OO.ui.FieldLayout(endDateLabel, {
                    align: "inline",
                }),
                new OO.ui.FieldLayout(endYear, {
                    id: "end-year",
                    align: "inline",
                }),
                new OO.ui.FieldLayout(endMonth, {
                    id: "end-month",
                    align: "inline",
                }),
                new OO.ui.FieldLayout(endDay, {
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
            startYear.getMenu().selectItemByData(String(currentYear));
            startMonth.getMenu().selectItemByData(String(currentMonth));
            startDay.getMenu().selectItemByData(String(currentDay));
            endYear.getMenu().selectItemByData(String(currentYear));
            endMonth.getMenu().selectItemByData(String(currentMonth));
            endDay.getMenu().selectItemByData(String(currentDay));
            submit.on("click", () => {
                const startDate = `${startYear.getMenu().findSelectedItem().getData()}-${`0${startMonth.getMenu().findSelectedItem().getData()}`.slice(-2)}-${`0${startDay.getMenu().findSelectedItem().getData()}`.slice(-2)}T00:00:00Z`;
                const endDate = `${endYear.getMenu().findSelectedItem().getData()}-${`0${endMonth.getMenu().findSelectedItem().getData()}`.slice(-2)}-${`0${endDay.getMenu().findSelectedItem().getData()}`.slice(-2)}T23:59:59Z`;
                const limit = revisionCheck.getValue();
                queryRevisionApi(startDate, endDate, limit, selection);
            });
            close.on("click", () => {
                const windowManager = window.wikiBlameWindowManager;
                windowManager.currentWindow.close();
            });
            $("#start-year, #start-month, #start-day, #end-year, #end-month, #end-day").css({
                display: "inline-block",
                width: "33%",
            });
            $(".oo-ui-fieldsetLayout-group .oo-ui-fieldLayout-align-right").css({
                "float": "right",
            });
            $("#wiki-blame-close > a").removeClass("oo-ui-buttonElement-button");
            $("#wiki-blame-close > a").css({ "text-decoration": "none" });
            $("#wiki-blame-close").css({ "float": "right" });
        }
        getBodyHeight() {
            return this.content.$element.outerHeight(true) + 10;
        }
    }

    class PageLayout extends OO.ui.PageLayout {
        #label;
        constructor(name, config, diffTable, label) {
            super(name, config);
            this.#label = label;
            this.$element.append($(diffTable));
        }
        setupOutlineItem() {
            this.outlineItem.setLabel(this.#label);
        }
    }

    class WikiBlameDiffDialog extends OO.ui.Dialog {
        static static = { ...super.static, name: "wikiBlameDiffDialog" };
        revisionList = undefined;
        constructor(config, revisionList) {
            super(config);
            this.revisionList = revisionList;
        }

        initialize() {
            super.initialize();
            const pageList = [];
            const server = mw.config.get("wgServer");
            const script = mw.config.get("wgScript");
            console.log(this.revisionList);
            for (const r of this.revisionList) {
                const diffTable = `<a href=${server}${script}?curid=${r.fromid}&oldid=${r.torevid} target="_blank">永久链接</a>
                <table class="diff">
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
                pageList.push(new PageLayout(r.user + r.fromrevid, undefined, diffTable, `${r.user} ${r.timestamp}`));
            }
            const close = new OO.ui.ButtonWidget({
                id: "wiki-blame-close",
                label: "✖",
            });
            this.content = new OO.ui.BookletLayout({
                id: "wiki-blame-booklet",
                outlined: true,
            });
            close.on("click", () => {
                const windowManager = window.wikiBlameWindowManager;
                windowManager.currentWindow.close();
            });
            this.content.addPages(pageList);
            this.$body.append(close.$element, this.content.$element);
            $("#wiki-blame-close > a").removeClass("oo-ui-buttonElement-button");
            $("#wiki-blame-close > a").css({ "text-decoration": "none" });
            $("#wiki-blame-booklet").css({ "margin-top": "20px" });
            $("#wiki-blame-close").css({ "float": "right" });
        }

        getBodyHeight = () => 500;
    }

    // helper functions
    const queryRevisionApi = async (startDate, endDate, limit, selection) => {
        const api = new mw.Api();
        const pagename = mw.config.get("wgPageName");
        const username = mw.config.get("wgUserName");
        try {
            let remaining = limit;
            let cont = undefined;
            const BATCH_SIZE = 50;
            let revisions = [];
            const progress = document.createElement("span");
            progress.innerText = "0";
            $("#wiki-blame-progress").html(`<p>/${limit}</p>`).find("p").prepend(progress);
            // 使用循环持续获取版本，直到没有新版本或者达到用户指定的上限
            while (remaining > 0) {
                const params = {
                    action: "query",
                    assertuser: username,
                    prop: "revisions",
                    rvprop: "ids|timestamp|user|parsedcomment|tags|content",
                    titles: pagename,
                    rvlimit: BATCH_SIZE,
                    rvstart: startDate,
                    rvend: endDate,
                    rvdir: "newer",
                };
                // 如需要rvcontinue参数，则添加。该参数不能为空，否则会报错
                if (cont !== undefined) {
                    params.rvcontinue = cont;
                }
                const data = await api.get(params);
                const pageId = Object.keys(data.query.pages)[0];
                const revisionsResult = data.query.pages[pageId].revisions;
                if (revisionsResult === undefined) {
                    $("#wiki-blame-progress").html("<p style=\"color: red\">指定区间内无编辑或API错误</p>");
                    return;
                }
                revisions.push(...revisionsResult);
                remaining -= BATCH_SIZE;
                progress.innerText = `${Math.min(+progress.innerText + BATCH_SIZE, limit)}`;
                // 如果还有更多版本，修改rvcontinue参数，否则退出循环
                if (Reflect.has(data, "continue")) {
                    cont = data.continue.rvcontinue;
                } else {
                    break;
                }
            }
            // 去除被版本删除的版本
            revisions = revisions.filter((r) => Reflect.has(r, "*"));
            const revisionsList = [];
            const targetRevisions = [];
            for (let i = 0; i < revisions.length; i++) {
                const current = revisions[i];
                // 特殊处理第一个版本
                if (i === 0) {
                    if (current["*"].includes(selection)) {
                        targetRevisions.push(current);
                    }
                    continue;
                }
                // 和前一个版本对比，如果多出了选择的文本，则加入列表
                const previous = revisions[i - 1];
                if (current["*"].includes(selection) && !previous["*"].includes(selection)) {
                    targetRevisions.push(current);
                }
            }
            // 重置进度
            progress.innerText = "0";
            $("#wiki-blame-progress").html(`<p>/${targetRevisions.length}</p>`).find("p").prepend(progress);

            await Promise.allSettled(targetRevisions.map(async (r) => {
                try {
                    const rdata = await api.post({
                        action: "compare",
                        assertuser: username,
                        fromrev: r.revid,
                        torelative: "prev",
                    });
                    rdata.compare.user = r.user;
                    rdata.compare.revid = rdata.torevid;
                    const editDate = new Date(r.timestamp);
                    rdata.compare.timestamp = editDate.toLocaleDateString();
                    revisionsList.push(rdata.compare);
                } catch { }
                progress.innerText = `${+progress.innerText + 1}`;
            }));
            createDiffDialog(revisionsList);
        } catch (err) {
            console.log(err);
        }
    };

    const getSelected = () => {
        let text = "";
        text = window.getSelection().toString();
        return text;
    };
    const createDialog = () => {
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

    const createDiffDialog = (revisionsList) => {
        const windowManager = window.wikiBlameWindowManager;
        if (windowManager.currentWindow
            && window.wikiBlameWindowManager.currentWindow.getElementId() === "wiki-blame-dialog-popup") { windowManager.currentWindow.close(); }
        const diffDialog = new WikiBlameDiffDialog({
            size: "larger",
        }, revisionsList);
        windowManager.addWindows([diffDialog]);
        windowManager.openWindow(diffDialog);
    };

    // 在侧边栏添加按钮
    mw.util.addPortletLink(
        "p-cactions",
        "#",
        "拷打编辑",
        "t-wikiblame",
        "查找选中文字的编辑来源",
    );
    $("#t-wikiblame").on("click", (e) => {
        e.preventDefault();
        const selection = getSelected();
        if (!selection) {
            mw.notify("请先选中文字");
            return;
        }
        createDialog();
    });
});
