// <pre>
"use strict";
$(() => {
    if (mw.config.get("wgCanonicalSpecialPageName") !== "Contributions") {
        return;
    }

    const $targetInputWidget = $("#mw-target-user-or-ip");
    if (!$targetInputWidget.length) {
        return;
    }

    const api = new mw.Api();
    const targetWidget = OO.ui.infuse($targetInputWidget[0]);
    const userCache = new Map();
    const REQUEST_TIMEOUT_MS = 15000;

    // 全局操作令牌，防止旧的异步填入请求覆盖新的查询或选择
    let operationToken = 0;

    // 构造 OOUI 表单控件
    const displaynameInput = new OO.ui.TextInputWidget({
        placeholder: wgULS(
            "请输入用户昵称（可附带 #1234 精确匹配，省略后缀则按昵称广泛搜索）",
            "請輸入使用者暱稱（可附帶 #1234 精確匹配，省略後綴則按暱稱廣泛搜尋）",
            "請輸入用戶暱稱（可附帶 #1234 精確匹配，省略後綴則按暱稱廣泛搜索）",
        ),
        minLength: 1,
        maxLength: 37,
    });

    const queryButton = new OO.ui.ButtonWidget({
        label: wgULS("查询", "查詢"),
        flags: ["progressive"],
    });

    const statusLabel = new OO.ui.LabelWidget({
        label: "",
        classes: ["gadget-displayname-query-status"],
    });

    const actionLayout = new OO.ui.ActionFieldLayout(
        displaynameInput,
        queryButton,
        {
            label: wgULS(
                "按昵称查询用户名：",
                "按暱稱查詢使用者名稱：",
                "按暱稱查詢用戶名：",
            ),
            align: "top",
            classes: ["gadget-displayname-query-action"],
        },
    );

    const panelLayout = new OO.ui.PanelLayout({
        expanded: false,
        classes: ["gadget-displayname-query-panel"],
    });

    panelLayout.$element.append(
        actionLayout.$element,
        statusLabel.$element,
    );

    $targetInputWidget.after(panelLayout.$element);

    /**
     * 更新状态提示文本及样式
     * @param {string} text
     * @param {boolean} [isError=false]
     */
    const setStatus = (text, isError = false) => {
        statusLabel.setLabel(text);
        statusLabel.$element.toggleClass("is-error", isError);
    };

    /**
     * 格式化错误对象为可读文本
     * @param {unknown} error
     * @returns {string}
     */
    const formatError = (error) => {
        if (typeof error === "string") {
            return error;
        }
        return error?.error?.info || error?.message || `${error}`;
    };

    /**
     * 带有限超时的 api.post 封装，避免网络挂起导致按钮或弹窗卡死
     * @param {Record<string, unknown>} params
     * @param {number} [timeoutMs=REQUEST_TIMEOUT_MS]
     * @returns {Promise<any>}
     */
    const postWithTimeout = async (params, timeoutMs = REQUEST_TIMEOUT_MS) => {
        const request = api.post(params);
        let timerId = null;
        const timeoutPromise = new Promise((resolve, reject) => {
            void resolve;
            timerId = setTimeout(() => {
                if (typeof request.abort === "function") {
                    request.abort();
                }
                reject(
                    new Error(
                        wgULS(
                            "请求超时，请检查网络后重试",
                            "請求逾時，請檢查網路後重試",
                            "請求超時，請檢查網絡後重試",
                        ),
                    ),
                );
            }, timeoutMs);
        });

        try {
            return await Promise.race([request, timeoutPromise]);
        } finally {
            if (timerId !== null) {
                clearTimeout(timerId);
            }
        }
    };

    /**
     * 解析用户输入的昵称与可选的 4 位数字编号（仅支持半角 #）
     * @param {string} rawInput
     * @returns {{ valid: boolean, displayname?: string, displaytag?: string|null, errorMessage?: string }}
     */
    const parseDisplayNameInput = (rawInput) => {
        const normalized = rawInput.trim();
        const hashIndex = normalized.indexOf("#");

        if (hashIndex === -1) {
            return {
                valid: true,
                displayname: normalized,
                displaytag: null,
            };
        }

        const namePart = normalized.slice(0, hashIndex).trim();
        const tagPart = normalized.slice(hashIndex + 1).trim();

        if (!namePart) {
            return {
                valid: false,
                errorMessage: wgULS(
                    "请输入 # 前面的用户昵称",
                    "請輸入 # 前面的使用者暱稱",
                    "請輸入 # 前面的用戶暱稱",
                ),
            };
        }

        if (!/^\d{4}$/.test(tagPart)) {
            return {
                valid: false,
                errorMessage: wgULS(
                    "# 后面必须为 4 位数字编号（例如：昵称#1234），或省略 # 按昵称广泛搜索",
                    "# 後面必須為 4 位數字編號（例如：暱稱#1234），或省略 # 按暱稱廣泛搜尋",
                    "# 後面必須為 4 位數字編號（例如：暱稱#1234），或省略 # 按暱稱廣泛搜索",
                ),
            };
        }

        return {
            valid: true,
            displayname: namePart,
            displaytag: tagPart,
        };
    };

    /**
     * 判断是否为禁止查询的“已注销#0000”
     * @param {string} displayname
     * @param {string|null} displaytag
     * @returns {boolean}
     */
    const isDeactivatedUser = (displayname, displaytag) => displayname === "已注销" && (displaytag === null || displaytag === "0000");

    /**
     * 根据昵称及可选编号查询匹配的用户 ID 列表（使用 api.post）
     * @param {string} displayname
     * @param {string|null} targetTag
     * @returns {Promise<Array<{userid: number, displayname: string, displaytag: string}>>}
     */
    const fetchUserRecordsByDisplayName = async (displayname, targetTag) => {
        const data = await postWithTimeout({
            action: "moedisplayname",
            op: "get",
            displayname,
            format: "json",
        });
        const list = data?.displaynames || [];
        return list.filter((item) => {
            const name = `${item.displayname ?? ""}`.trim();
            const tag = `${item.displaytag ?? ""}`.trim();
            if (isDeactivatedUser(name, tag)) {
                return false;
            }
            return targetTag === null || tag === targetTag;
        });
    };

    /**
     * 批量查询并缓存用户名（使用 api.post，自动按 50 个一组切片）
     * @param {number[]} userids
     * @returns {Promise>}
     */
    const fetchUserNamesByIds = async (userids) => {
        const uncachedIds = [...new Set(userids)].filter((id) => !userCache.has(id));
        if (uncachedIds.length > 0) {
            const chunkSize = 50;
            for (let i = 0; i < uncachedIds.length; i += chunkSize) {
                const chunk = uncachedIds.slice(i, i + chunkSize);
                const data = await postWithTimeout({
                    action: "query",
                    list: "users",
                    usprop: "name",
                    ususerids: chunk.join("|"),
                    format: "json",
                });
                const users = data?.query?.users || [];
                for (const user of users) {
                    if (user.name) {
                        userCache.set(user.userid, user.name);
                    }
                }
            }
        }
        return userCache;
    };

    /**
     * 获取选中记录的用户名并填入目标输入框（绑定操作令牌防止旧请求覆盖）
     * @param {{userid: number, displayname: string, displaytag: string}} record
     * @param {number} [expectedOpToken]
     */
    const applySelectedUser = async (record, expectedOpToken) => {
        const currentOpToken = expectedOpToken ?? ++operationToken;
        setStatus(
            wgULS(
                "正在获取用户名…",
                "正在取得使用者名稱…",
                "正在取得用戶名…",
            ),
        );
        try {
            await fetchUserNamesByIds([record.userid]);
            if (currentOpToken !== operationToken) {
                return;
            }
            const username = userCache.get(record.userid);
            if (username) {
                targetWidget.setValue(username);
                setStatus(
                    `${wgULS("已填入：", "已填入：")}${username}${wgULS("（昵称：", "（暱稱：")}${record.displayname}#${record.displaytag}）`,
                );
            } else {
                setStatus(
                    wgULS(
                        "未找到该用户 ID 对应的用户名",
                        "未找到該使用者 ID 對應的使用者名稱",
                        "未找到該用戶 ID 對應的用戶名",
                    ),
                    true,
                );
            }
        } catch (error) {
            if (currentOpToken !== operationToken) {
                return;
            }
            setStatus(
                wgULS(
                    "获取用户名失败：",
                    "取得使用者名稱失敗：",
                    "取得用戶名失敗：",
                ) + formatError(error),
                true,
            );
        }
    };

    // 单例对话框管理
    const windowManager = new OO.ui.WindowManager();
    $(document.body).append(windowManager.$element);

    const PAGE_SIZE = 10;
    let selectionDialog = null;

    const getSelectionDialog = () => {
        if (selectionDialog) {
            return selectionDialog;
        }

        let allItems = [];
        let currentPage = 0;
        let totalPages = 1;
        let selectedData = null;
        let loadToken = 0;

        const menu = new OO.ui.SelectWidget({
            classes: ["gadget-displayname-select-menu"],
        });

        const prevButton = new OO.ui.ButtonWidget({
            label: wgULS("上一页", "上一頁"),
            icon: "previous",
            disabled: true,
        });

        const pageInfoLabel = new OO.ui.LabelWidget({
            label: "1 / 1",
        });

        const nextButton = new OO.ui.ButtonWidget({
            label: wgULS("下一页", "下一頁"),
            icon: "next",
            disabled: true,
        });

        const paginationLayout = new OO.ui.HorizontalLayout({
            items: [prevButton, pageInfoLabel, nextButton],
            classes: ["gadget-displayname-select-pagination"],
        });

        const titleLabel = new OO.ui.LabelWidget({
            label: wgULS(
                "请在下方选择一个用户（支持双击或按回车直接确认）：",
                "請在下方選擇一個使用者（支援雙擊或按 Enter 直接確認）：",
                "請在下方選擇一個用戶（支援雙擊或按 Enter 直接確認）：",
            ),
        });

        const loadingLabel = new OO.ui.LabelWidget({
            label: "",
            classes: ["gadget-displayname-select-loading"],
        });

        const contentPanel = new OO.ui.PanelLayout({
            padded: true,
            expanded: false,
        });

        contentPanel.$element.append(
            titleLabel.$element,
            loadingLabel.$element,
            menu.$element,
            paginationLayout.$element,
        );

        const setConfirmDisabled = (disabled) => {
            const selectAction = selectionDialog?.actions?.get({ actions: "select" })?.[0];
            if (selectAction) {
                selectAction.setDisabled(disabled);
            }
        };

        const renderPage = async () => {
            const currentToken = ++loadToken;
            selectedData = null;
            setConfirmDisabled(true);
            prevButton.setDisabled(true);
            nextButton.setDisabled(true);
            menu.clearItems();
            menu.$element.scrollTop(0);
            loadingLabel.setLabel(
                wgULS(
                    "正在加载当前页用户信息…",
                    "正在載入當前頁使用者資訊…",
                    "正在載入當前頁用戶資訊…",
                ),
            );

            const start = currentPage * PAGE_SIZE;
            const pageItems = allItems.slice(start, start + PAGE_SIZE);

            try {
                await fetchUserNamesByIds(pageItems.map((item) => item.userid));
                if (currentToken !== loadToken) {
                    return;
                }

                const optionWidgets = pageItems.map((item) => {
                    const username
                        = userCache.get(item.userid)
                            || `${wgULS("未知用户（ID：", "未知使用者（ID：", "未知用戶（ID：")}${item.userid}）`;
                    const option = new OO.ui.MenuOptionWidget({
                        data: item,
                        label: `${username}${wgULS("（昵称：", "（暱稱：")}${item.displayname}#${item.displaytag}）`,
                        description: `${wgULS("用户 ID：", "使用者 ID：", "用戶 ID：")}${item.userid}`,
                    });

                    option.$element.on("dblclick", () => {
                        selectedData = item;
                        selectionDialog?.executeAction("select");
                    });

                    return option;
                });

                menu.addItems(optionWidgets);
                loadingLabel.setLabel("");
            } catch (error) {
                if (currentToken !== loadToken) {
                    return;
                }
                loadingLabel.setLabel(
                    wgULS(
                        "加载用户信息失败：",
                        "載入使用者資訊失敗：",
                        "載入用戶資訊失敗：",
                    ) + formatError(error),
                );
            } finally {
                if (currentToken === loadToken) {
                    pageInfoLabel.setLabel(
                        `${wgULS("第", "第")} ${currentPage + 1} / ${totalPages} ${wgULS("页", "頁")}`,
                    );
                    prevButton.setDisabled(currentPage === 0);
                    nextButton.setDisabled(currentPage >= totalPages - 1);
                }
            }
        };

        menu.on("select", (item) => {
            selectedData = item ? item.getData() : null;
            setConfirmDisabled(!selectedData);
        });

        prevButton.on("click", () => {
            if (currentPage > 0) {
                currentPage--;
                void renderPage();
            }
        });

        nextButton.on("click", () => {
            if (currentPage < totalPages - 1) {
                currentPage++;
                void renderPage();
            }
        });

        function DisplayNameSelectionDialog(config) {
            Reflect.apply(DisplayNameSelectionDialog.super, this, [config]);
        }
        OO.inheritClass(DisplayNameSelectionDialog, OO.ui.ProcessDialog);

        DisplayNameSelectionDialog.static.name = "gadgetDisplayNameSelectionDialog";
        DisplayNameSelectionDialog.static.actions = [
            {
                action: "select",
                label: wgULS("确认", "確認"),
                flags: ["primary", "progressive"],
                disabled: true,
            },
            {
                action: "cancel",
                label: wgULS("取消", "取消"),
                flags: ["safe", "close"],
            },
        ];

        DisplayNameSelectionDialog.prototype.initialize = function () {
            Reflect.apply(DisplayNameSelectionDialog.super.prototype.initialize, this, []);
            this.$body.append(contentPanel.$element);
            this.$element.on("keydown", (event) => {
                if (event.key === "Enter" && selectedData) {
                    event.preventDefault();
                    this.executeAction("select");
                }
            });
        };

        DisplayNameSelectionDialog.prototype.getSetupProcess = function (data) {
            return Reflect.apply(DisplayNameSelectionDialog.super.prototype.getSetupProcess, this, [data])
                .next(() => {
                    allItems = data?.items || [];
                    currentPage = 0;
                    totalPages = Math.max(1, Math.ceil(allItems.length / PAGE_SIZE));
                    this.title.setLabel(
                        wgULS("选择用户（共找到 ", "選擇使用者（共找到 ", "選擇用戶（共找到 ")
                        + allItems.length
                        + wgULS(" 个匹配结果）", " 個匹配結果）", " 個匹配結果）"),
                    );
                    void renderPage();
                });
        };

        DisplayNameSelectionDialog.prototype.getActionProcess = function (action) {
            if (action === "select" && selectedData) {
                const chosen = selectedData;
                const opToken = ++operationToken;
                return new OO.ui.Process(async () => {
                    await this.close().closed;
                    if (opToken !== operationToken) {
                        return;
                    }
                    await applySelectedUser(chosen, opToken);
                });
            }

            if (action === "cancel") {
                const opToken = ++operationToken;
                return new OO.ui.Process(async () => {
                    await this.close().closed;
                    if (opToken === operationToken) {
                        setStatus(wgULS("已取消选择", "已取消選擇"));
                    }
                });
            }

            return Reflect.apply(DisplayNameSelectionDialog.super.prototype.getActionProcess, this, [action]);
        };

        selectionDialog = new DisplayNameSelectionDialog({
            size: "large",
        });

        windowManager.addWindows([selectionDialog]);
        return selectionDialog;
    };

    // 执行查询主逻辑
    const handleQuery = async (event) => {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }

        const rawInput = displaynameInput.getValue().trim();
        if (!rawInput) {
            setStatus(wgULS("请输入要查询的昵称", "請輸入要查詢的暱稱"), true);
            displaynameInput.focus();
            return;
        }

        const parsed = parseDisplayNameInput(rawInput);
        if (!parsed.valid) {
            setStatus(parsed.errorMessage, true);
            displaynameInput.focus();
            return;
        }

        const { displayname, displaytag } = parsed;

        // 禁止查询“已注销#0000”
        if (isDeactivatedUser(displayname, displaytag)) {
            setStatus(
                wgULS(
                    "禁止查询“已注销#0000”",
                    "禁止查詢「已注销#0000」",
                    "禁止查詢「已注销#0000」",
                ),
                true,
            );
            displaynameInput.focus();
            return;
        }

        if (queryButton.isDisabled()) {
            return;
        }

        const currentOpToken = ++operationToken;
        setStatus(wgULS("正在查询…", "正在查詢…"));
        queryButton.setDisabled(true);

        try {
            const records = await fetchUserRecordsByDisplayName(displayname, displaytag);
            if (currentOpToken !== operationToken) {
                return;
            }

            if (!records.length) {
                setStatus(
                    displaytag !== null
                        ? wgULS(
                            `未找到昵称为“${displayname}#${displaytag}”的用户，请检查昵称或编号`,
                            `未找到暱稱為「${displayname}#${displaytag}」的使用者，請檢查暱稱或編號`,
                            `未找到暱稱為「${displayname}#${displaytag}」的用戶，請檢查暱稱或編號`,
                        )
                        : wgULS(
                            "未找到匹配的昵称，请检查输入",
                            "未找到匹配的暱稱，請檢查輸入",
                        ),
                    true,
                );
                return;
            }

            if (records.length === 1) {
                await applySelectedUser(records[0], currentOpToken);
            } else {
                setStatus(
                    wgULS(
                        `找到 ${records.length} 个匹配用户，请在弹出的对话框中选择`,
                        `找到 ${records.length} 個匹配使用者，請在彈出的對話框中選擇`,
                        `找到 ${records.length} 個匹配用戶，請在彈出的對話框中選擇`,
                    ),
                );
                windowManager.openWindow(getSelectionDialog(), { items: records });
            }
        } catch (error) {
            if (currentOpToken === operationToken) {
                setStatus(
                    wgULS("查询出错：", "查詢出錯：") + formatError(error),
                    true,
                );
            }
        } finally {
            if (currentOpToken === operationToken) {
                queryButton.setDisabled(false);
            }
        }
    };

    queryButton.on("click", () => {
        void handleQuery();
    });

    // 仅在昵称输入框聚焦按回车时拦截表单提交并触发查询
    displaynameInput.$element.find("input").on("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            event.stopPropagation();
            void handleQuery(event);
        }
    });
});
// </pre>
