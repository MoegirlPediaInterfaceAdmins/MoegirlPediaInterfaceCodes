"use strict";
$(() => {
    try {
        const { wgArticleId, wgPageName, wgUserName, wgUserGroups, wgNamespaceNumber, wgNamespaceIds, wgIsRedirect } = mw.config.get([
            "wgArticleId",
            "wgPageName",
            "wgUserName",
            "wgUserGroups",
            "wgNamespaceNumber",
            "wgNamespaceIds",
            "wgIsRedirect",
        ]);

        if (
            wgArticleId === 0
            || wgNamespaceNumber < 0
            || wgPageName.startsWith("萌娘百科_talk:讨论版")
            || $(".will2Be2Deleted")[0]
            || (wgUserGroups.includes("patroller") || wgUserGroups.includes("sysop")) && !(new URL(location.href).searchParams.get("AnnTools-debug") || "").split("|").includes("requestDeletion")
        ) {
            return;
        }

        const isZh = /^m?zh\.moegirl\.org\.cn$/.test(location.hostname);
        const api = new mw.Api();
        const zhAPI = isZh ? api : new mw.ForeignApi("https://mzh.moegirl.org.cn/api.php");
        const cmAPI = isZh ? new mw.ForeignApi("https://commons.moegirl.org.cn/api.php") : api;

        const BOARD_PAGE = "萌娘百科_talk:讨论版/操作申请";
        const boardUrl = `${isZh ? "" : "https://mzh.moegirl.org.cn"}${mw.util.getUrl(BOARD_PAGE)}`;
        const linkedPageName = isZh ? wgPageName : `cm:${wgPageName}`;
        const chunkify = (arr, size = 50) => Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

        const $body = $("body");
        $("#mw-notification-area").appendTo($body);

        const getRequestTitleSuffix = (userName, now) => ` - ${userName} - ${now.getFullYear()}.${libPrefixNumber(now.getMonth() + 1)}.${libPrefixNumber(now.getDate())}`;

        const buildSectionTitle = () => `请求删除页面：[[${linkedPageName}]]${getRequestTitleSuffix(wgUserName, new Date())}`;

        const buildBatchSectionTitle = () => `批量删除请求${getRequestTitleSuffix(wgUserName, new Date())}`;

        /**
         * 新讨论串的正文
         *
         * @param {string} reason 理由
         * @param {string} detail 详情；为空时整行不输出
         * @returns {string} 正文 wikitext
         */
        const buildWikitext = (reason, detail) => {
            const lines = [
                `* '''页面标题'''：${wgIsRedirect ? `{{NoRedirectLink|${linkedPageName}}}` : `[[:${linkedPageName}]]`}`,
                `* '''申请理由'''：${reason}`,
            ];
            if (detail) {
                lines.push(`* '''详细原因'''：${detail}`);
            }
            lines.push("~~~~");
            return lines.join("\n");
        };

        /**
         * 批量提删的正文
         *
         * @param {Array<{ title: string, isRedirect: boolean }>} pages 已解析并检测过重定向的页面清单
         * @param {string} reason 理由
         * @param {string} detail 详情；为空时整行不输出
         * @returns {string} 正文 wikitext
         */
        const buildBatchWikitext = (pages, reason, detail) => {
            const lines = [
                "* '''页面标题'''：",
                ...pages.map(({ title, isRedirect }) => `** ${isRedirect ? `{{NoRedirectLink|${title}}}` : `[[:${title}]]`}`),
                `* '''申请理由'''：${reason}`,
            ];
            if (detail) {
                lines.push(`* '''详细原因'''：${detail}`);
            }
            lines.push("~~~~");
            return lines.join("\n");
        };

        /**
         * 解析批量提删的页面清单，一行一个页面，忽略空行并去重
         *
         * @param {string} text 多行文本框的内容
         * @throws {OO.ui.Error} 存在仅有前缀或含非法字符的行时
         * @returns {Array<{ title: string, queryTitle: string, site: "zh" | "commons" }>} 待提交的页面清单
         */
        const parseBatchPages = (text) => {
            const lines = text.split("\n").map((line) => line.trim()).filter((line) => line !== "");
            const invalidLines = lines.filter((line) => {
                const stripped = line.replace(/^(?:cm:|zhmoe:)/i, "");
                return stripped === "" || /[|[\]{}<>]/.test(stripped);
            });
            if (invalidLines.length > 0) {
                throw new OO.ui.Error(`${wgULS("以下页面标题无效（仅有前缀，或含 | [ ] { } < > 等字符）", "以下頁面標題無效（僅有前綴，或含 | [ ] { } < > 等字元）")}：${invalidLines.join("、")}`);
            }
            const toBatchPage = (line) => {
                if (/^zhmoe:/i.test(line)) {
                    const title = line.substring(6);
                    return { title, queryTitle: title, site: "zh" };
                }
                if (/^cm:/i.test(line)) {
                    return { title: line, queryTitle: line.substring(3), site: "commons" };
                }
                if (isZh) {
                    return { title: line, queryTitle: line, site: "zh" };
                }
                return { title: `cm:${line}`, queryTitle: line, site: "commons" };
            };
            const result = [];
            const seen = new Set();
            lines.forEach((line) => {
                const page = toBatchPage(line);
                if (!seen.has(page.title)) {
                    seen.add(page.title);
                    result.push(page);
                }
            });
            return result;
        };

        /**
         * 批量查询页面清单中各页面是否为重定向页。
         *
         * @param {Array<{ title: string, queryTitle: string, site: "zh" | "commons" }>} pages 已解析的页面清单
         * @throws {OO.ui.Error} 查询页面重定向状态失败时
         * @returns {Promise<Array<{ title: string, isRedirect: boolean }>>} 与入参顺序一致
         */
        const resolveBatchPages = async (pages) => {
            const normalizeTitle = (title) => title.replace(/_/g, " ").replace(/\s+/g, " ").trim().replace(/^[a-z]/, (char) => char.toUpperCase());
            const redirectFlags = new Map();
            const normalizedTitles = new Map();
            const titlesBySite = new Map();
            let queryFailed = false;
            pages.forEach(({ queryTitle, site }) => {
                if (!titlesBySite.has(site)) {
                    titlesBySite.set(site, []);
                }
                titlesBySite.get(site).push(queryTitle);
            });
            await Promise.all([...titlesBySite].map(async ([site, titles]) => {
                const siteAPI = site === "commons" ? cmAPI : zhAPI;
                await Promise.all(chunkify([...new Set(titles)]).map(async (batch) => {
                    try {
                        const { query } = await siteAPI.get({
                            action: "query",
                            titles: batch.join("|"),
                            prop: "info",
                            formatversion: 2,
                        });
                        (query?.normalized ?? []).forEach(({ from, to }) => normalizedTitles.set(normalizeTitle(from), normalizeTitle(to)));
                        (query?.pages ?? []).forEach(({ title, redirect }) => redirectFlags.set(normalizeTitle(title), redirect === true));
                    } catch (e) {
                        queryFailed = true;
                        console.warn("[RequestDeletion] 批量查询重定向失败", e);
                    }
                }));
            }));
            if (queryFailed) {
                throw new OO.ui.Error(wgULS("批量查询页面重定向状态失败，请稍后重试", "批量查詢頁面重新導向狀態失敗，請稍後重試"));
            }
            return pages.map(({ title, queryTitle }) => {
                const queryNormalizedTitle = normalizeTitle(queryTitle);
                return { title, isRedirect: redirectFlags.get(normalizedTitles.get(queryNormalizedTitle) ?? queryNormalizedTitle) ?? false };
            });
        };

        const fetchNewSectionAnchor = async (oldid) => {
            try {
                const res = await zhAPI.get({
                    action: "parse",
                    oldid,
                    prop: "sections",
                    formatversion: 2,
                });
                return res?.parse?.sections?.at(-1)?.anchor ?? "";
            } catch (e) {
                console.warn("[RequestDeletion] 读取新讨论串锚点失败", e);
                return "";
            }
        };

        class RDWindow extends OO.ui.ProcessDialog {
            static static = {
                ...super.static,
                tagName: "div",
                name: "lr-rd",
                title: wgULS("请求删除", "請求刪除"),
                actions: [
                    {
                        action: "cancel",
                        label: "取消",
                        flags: ["safe", "close", "destructive"],
                    },
                    {
                        action: "submit",
                        label: wgULS("确认", "確認"),
                        flags: ["primary", "progressive"],
                    },
                ],
            };
            constructor(config) {
                // Parent constructor
                super(config);

                this.storage = config.data.storage;
                this.hasAutopatrol = false;
            }
            initialize() {
                // Parent method
                super.initialize();

                this.panelLayout = new OO.ui.PanelLayout({
                    scrollable: false,
                    expanded: false,
                    padded: true,
                });
                this.reasonsDropdown = new OO.ui.DropdownInputWidget({
                    options: [{
                        data: "",
                        label: wgULS("其他（请自行说明理由）", "其他（請自行說明理由）"),
                    }, {
                        data: "",
                        disabled: true,
                        label: wgULS("加载中……", "載入中……"),
                    }],
                });
                this.detailsText = new OO.ui.TextInputWidget();
                this.enterCheckbox = new OO.ui.CheckboxInputWidget({
                    selected: this.storage.getItem("enterToSubmit"),
                });
                this.batchCheckbox = new OO.ui.CheckboxInputWidget();
                this.pagesText = new OO.ui.MultilineTextInputWidget({
                    rows: 5,
                    autosize: true,
                    maxRows: 15,
                    placeholder: isZh
                        ? wgULS("一行一个主站页面，不需要添加[[ ]]，不自动包含当前页面；\n共享站页面请加 cm: 前缀", "一行一個主站頁面，不需要添加[[ ]]，不自動包含當前頁面；\n共享站頁面請加 cm: 前綴")
                        : wgULS("一行一个共享站页面，不需要添加[[ ]]，不自动包含当前页面；\n主站页面请加 zhmoe: 前缀", "一行一個共享站頁面，不需要添加[[ ]]，不自動包含當前頁面；\n主站頁面請加 zhmoe: 前綴"),
                });

                this.reasonsDropdownMenu = this.reasonsDropdown.dropdownWidget.getMenu();

                const reasonsField = new OO.ui.FieldLayout(this.reasonsDropdown, {
                    label: wgULS("删除理由", "刪除理由"),
                    align: "top",
                });
                const detailsField = new OO.ui.FieldLayout(this.detailsText, {
                    label: wgULS("详情", "詳情"),
                    align: "top",
                });
                const enterField = new OO.ui.FieldLayout(this.enterCheckbox, {
                    label: wgULS("理由详情按回车提交（浏览器级设置）", "理由詳情按確認鍵提交（瀏覽器級設置）"),
                    align: "inline",
                });
                this.batchField = new OO.ui.FieldLayout(this.batchCheckbox, {
                    label: wgULS("批量提删", "批次提刪"),
                    align: "inline",
                });
                this.pagesField = new OO.ui.FieldLayout(this.pagesText, {
                    label: wgULS("待删除页面", "待刪除頁面"),
                    align: "top",
                });

                this.pagesField.$element.hide();
                this.batchField.$element.toggle(this.hasAutopatrol);

                this.panelLayout.$element.append(
                    reasonsField.$element,
                    detailsField.$element,
                    this.batchField.$element,
                    this.pagesField.$element,
                    enterField.$element,
                );

                this.reasonsDropdownMenu.connect(this, { toggle: "dropdownToggle" });
                this.detailsText.connect(this, { enter: "onEnter" });
                this.enterCheckbox.connect(this, { change: "setStorage" });
                this.batchCheckbox.connect(this, { change: "onBatchToggle" });
                this.pagesText.connect(this, { resize: "updateSize" });

                this.$body.append(this.panelLayout.$element);
            }
            updateReasons(reasons) {
                this.reasonsDropdown.setOptions([{
                    data: "",
                    label: wgULS("其他（请自行说明理由）", "其他（請自行說明理由）"),
                }, ...reasons]);
            }
            setHasAutopatrol(has) {
                this.hasAutopatrol = has;
                if (this.panelLayout) {
                    this.batchField.$element.toggle(has);
                    if (!has) {
                        this.pagesField.$element.hide();
                    }
                    if (this.isOpened()) {
                        this.updateSize();
                    }
                }
            }
            onBatchToggle(selected) {
                if (selected) {
                    this.pagesField.$element.slideDown("fast", () => this.updateSize());
                    this.pagesText.focus();
                } else {
                    this.pagesField.$element.slideUp("fast", () => this.updateSize());
                }
            }
            setStorage(selected) {
                this.storage.setItem("enterToSubmit", selected);
            }
            onEnter() {
                if (this.enterCheckbox.isSelected()) {
                    this.executeAction("submit");
                }
            }
            dropdownToggle(visible) {
                if (visible) {
                    // Manually resize
                    const newHeight = parseFloat(this.$frame.css("height")) + 300;
                    this.withoutSizeTransitions(() => {
                        this.$frame.css("height", newHeight);
                        this.reasonsDropdownMenu.clip();
                        $(this.$frame).animate({
                            height: newHeight,
                        }, 700);
                    });
                } else {
                    this.updateSize();
                }
            }
            getBodyHeight() {
                return this.panelLayout.$element.outerHeight(true);
            }
            getSetupProcess(data) {
                return super.getSetupProcess(data).next(() => {
                    this.pagesField.$element.hide();
                    this.batchCheckbox.setSelected(false);
                }, this);
            }
            getReadyProcess(data) {
                return super.getReadyProcess(data).next(() => {
                    this.reasonsDropdown.focus();
                }, this);
            }
            getActionProcess(action) {
                if (action === "cancel") {
                    return new OO.ui.Process(() => {
                        this.close({ action });
                    }, this);
                } else if (action === "submit") {
                    return new OO.ui.Process($.when((async () => {
                        const reason = this.reasonsDropdown.getValue();
                        const detail = this.detailsText.getValue();
                        const isBatch = this.batchCheckbox.isSelected();
                        const pages = isBatch ? parseBatchPages(this.pagesText.getValue()) : [];
                        if (isBatch && pages.length === 0) {
                            throw new OO.ui.Error(wgULS("请至少填写一个页面", "請至少填寫一個頁面"));
                        }
                        if (!reason && !detail) {
                            throw new OO.ui.Error(wgULS("请填写理由或详情", "請填寫理由或詳情"));
                        }
                        try {
                            const requestReason = reason || detail, requestDetail = reason ? detail : "";
                            let wikitext, sectionTitle;
                            if (isBatch) {
                                wikitext = buildBatchWikitext(await resolveBatchPages(pages), requestReason, requestDetail);
                                sectionTitle = buildBatchSectionTitle();
                            } else {
                                wikitext = buildWikitext(requestReason, requestDetail);
                            }
                            const anchor = await this.postRequest(wikitext, sectionTitle);
                            this.close({ action });
                            mw.notify(wgULS("删除请求已发出，3 秒后跳转到讨论串", "刪除請求已發出，3 秒後跳轉到討論串"), {
                                title: wgULS("提删成功", "提刪成功"),
                                type: "success",
                                tag: "lr-rd",
                            });
                            setTimeout(() => {
                                location.assign(anchor === "" ? boardUrl : `${boardUrl}#${encodeURIComponent(anchor)}`);
                            }, 3000);
                        } catch (e) {
                            console.error("[RequestDeletion] Error:", e);
                            throw new OO.ui.Error(e);
                        }
                    })()).promise(), this);
                }
                // Fallback to parent handler
                return super.getActionProcess(action);
            }

            /**
             * 往讨论版发一个新话题，并返回该讨论串的锚点。
             *
             * @param {string} wikitext 正文 wikitext
             * @param {string} [sectionTitle] 讨论串标题；默认为当前页面的单页提删标题
             * @returns {Promise<string>} 讨论串锚点（不含 `#`）；取不到时为空串
             */
            postRequest = async (wikitext, sectionTitle = buildSectionTitle()) => {
                const res = await zhAPI.postWithToken("csrf", {
                    action: "discussiontoolsedit",
                    paction: "addtopic",
                    page: BOARD_PAGE,
                    sectiontitle: sectionTitle,
                    wikitext,
                    assertuser: wgUserName,
                    nocontent: "",
                    watchlist: "nochange",
                    tags: "Automation tool",
                });
                if (res.error) {
                    throw res.error.code;
                }
                return fetchNewSectionAnchor(res?.discussiontoolsedit?.newrevid);
            };
        }

        const storage = new LocalObjectStorage("AnnTools-requestDeletion");

        const windowManager = new OO.ui.WindowManager();
        $body.append(windowManager.$element);
        const rdDialog = new RDWindow({
            size: "medium",
            data: { storage },
        });
        windowManager.addWindows([rdDialog]);

        let loadReason = false;
        /** @type {Promise<boolean> | null} 当前用户是否持有 autopatrol 权限；同一会话只请求一次 */
        let autopatrolPromise = null;

        $(mw.util.addPortletLink("p-cactions", "#", wgULS("提出删除请求", "提出刪除請求"), "ca-lr-rd", wgULS("向讨论版提出删除请求", "向討論版提出刪除請求"))).on("click", async (e) => {
            e.preventDefault();
            windowManager.openWindow(rdDialog);
            $body.css("overflow", "auto");
            // 批量提删入口仅对持有 autopatrol 权限的用户可见
            if (autopatrolPromise === null) {
                autopatrolPromise = (async () => {
                    try {
                        return (await mw.user.getRights()).includes("autopatrol");
                    } catch (e) {
                        console.warn("[RequestDeletion] 获取用户权限失败，按无 autopatrol 权限处理", e);
                        return false;
                    }
                })();
            }
            rdDialog.setHasAutopatrol(await autopatrolPromise);
            if (loadReason === false) {
                loadReason = true;
                const { parse: { text: { "*": html } } } = await api.post({
                    action: "parse",
                    assertuser: wgUserName,
                    page: wgNamespaceNumber === wgNamespaceIds.file ? "MediaWiki:Filedelete-reason-dropdown" : "MediaWiki:Deletereason-dropdown",
                    prop: "text",
                });
                const container = $("<div>");
                container.html(html);
                const result = [];
                const getReason = (ele) => {
                    result.push({
                        data: ele.innerText.trim(),
                        label: ele.innerText.trim(),
                    });
                };
                container.children(".mw-parser-output").children("ul").children("li").each((_, ele) => {
                    const $ele = $(ele);
                    if ($ele.children("ul").length > 0) {
                        result.push({
                            optgroup: $ele.clone().find("*").remove().end().text().trim(),
                        });
                        $ele.children("ul").children("li").each((_, e) => getReason(e));
                    } else {
                        getReason(ele);
                    }
                });
                rdDialog.updateReasons(result);
            }
        });
    } catch (e) {
        const parseError = (errLike, _space) => {
            let space = _space;
            if (_space === void 0) {
                space = 4;
            }
            return JSON.stringify(errLike, (_, v) => {
                if (v instanceof Error) {
                    const stack = [];
                    if (v.stack) {
                        Reflect.apply(stack.push, stack, v.stack.split("\n").map((n) => n.trim()).filter((n) => {
                            let _a;
                            return ((_a = n === null || n === void 0 ? void 0 : n.length) !== null && _a !== void 0 ? _a : -1) > 0;
                        }));
                    }
                    const keys = Object.keys(v).filter((key) => !Reflect.has(Error.prototype, key));
                    if (keys.length) {
                        stack.push(JSON.stringify(Object.fromEntries(keys.map((key) => [key, v[key]])), null, space));
                    }
                    return stack.join("\n").trim() || "";
                }
                return v;
            }, space).replace(/^"(.*)"$/, "$1");
        };
        oouiDialog.alert(`错误信息：<br>${oouiDialog.sanitize(parseError(e))}`, {
            title: "提删工具发生错误",
        });
        console.error("[RequestDeletion] Setup error:", e);
    }
});
