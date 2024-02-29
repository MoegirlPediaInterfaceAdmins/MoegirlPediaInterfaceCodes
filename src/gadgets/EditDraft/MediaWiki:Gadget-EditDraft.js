"use strict";
(async () => {
    await $.ready;
    const userId = mw.config.get("wgUserId");
    if (typeof userId !== "number" || !/^\d+$/.test(`${userId}`) || userId <= 0) {
        return;
    }
    if (!["edit", "submit"].includes(mw.config.get("wgAction"))) {
        return;
    }
    /**
     * @type {Storage}
     */
    const localObjectStorage = new LocalObjectStorage("EditDraft");
    const data = localObjectStorage.getItem(userId, {});
    const setData = () => localObjectStorage.setItem(userId, data);
    const setTimerInterval = (interval) => {
        data.timerInterval = interval;
        setData();
    };
    if (typeof data.timerInterval !== "number" || !/^\d+$/.test(`${data.timerInterval}`) || data.timerInterval <= 0) {
        setTimerInterval(3);
    }
    if (!$.isPlainObject(data.drafts)) {
        data.drafts = {};
        setData();
    }
    Object.keys(data.drafts).forEach((pagename) => {
        if (!$.isPlainObject(data.drafts[pagename])) {
            Reflect.deleteProperty(data.drafts, pagename);
            setData();
        }
        Object.keys(data.drafts[pagename]).forEach((section) => {
            if (!$.isPlainObject(data.drafts[pagename][section])
                || typeof data.drafts[pagename][section].timestamp !== "number" || !/^\d+$/.test(`${data.drafts[pagename][section].timestamp}`) || data.drafts[pagename][section].timestamp <= 0
                || typeof data.drafts[pagename][section].draft !== "string") {
                Reflect.deleteProperty(data.drafts[pagename], section);
                setData();
            }
        });
    });
    const legalKeys = ["timerInterval", "drafts"];
    Object.keys(data).forEach((key) => {
        if (!legalKeys.includes(key)) {
            Reflect.deleteProperty(data, key);
            setData();
        }
    });
    const getDraft = (pagename, section) => $.isPlainObject(data.drafts[pagename]) && $.isPlainObject(data.drafts[pagename][section]) ? data.drafts[pagename][section].draft : null;
    const setDraft = (pagename, section, text) => {
        if (!$.isPlainObject(data.drafts[pagename])) {
            data.drafts[pagename] = {};
        }
        if (!$.isPlainObject(data.drafts[pagename][section])) {
            data.drafts[pagename][section] = {};
        }
        data.drafts[pagename][section].timestamp = Date.now();
        data.drafts[pagename][section].draft = text;
        this.setData();
    };
    const getTimestamp = (pagename, section) => $.isPlainObject(data.drafts[pagename]) && $.isPlainObject(data.drafts[pagename][section]) ? data.drafts[pagename][section].timestamp : null;
    /**
     * @param {JQuery<HTMLElement>} $eles 
     */
    const disable = ($eles) => $eles.each((_, ele) => {
        const $ele = $(ele);
        if (!$ele.is("input,button")) {
            return;
        }
        const $parent = $ele.parent();
        if ($parent.hasClass("oo-ui-widget-enabled")) {
            $parent.toggleClass("oo-ui-widget-enabled oo-ui-widget-disabled");
        }
        $ele.prop("disabled", true);
    });
    /**
     * @param {JQuery<HTMLElement>} $eles 
     */
    const enable = ($eles) => $eles.each((_, ele) => {
        const $ele = $(ele);
        if (!$ele.is("input,button")) {
            return;
        }
        const $parent = $ele.parent();
        if ($parent.hasClass("oo-ui-widget-disabled")) {
            $parent.toggleClass("oo-ui-widget-enabled oo-ui-widget-disabled");
        }
        $ele.prop("disabled", false);
    });
    function inputConstruct(opt) {
        const r = $("<span/>");
        const input = $("<input/>", opt);
        if (opt.attr && opt.attr.type === "button") {
            r.addClass("oo-ui-widget oo-ui-widget-enabled oo-ui-inputWidget oo-ui-buttonElement oo-ui-buttonElement-framed oo-ui-labelElement oo-ui-buttonInputWidget");
            input.addClass("oo-ui-inputWidget-input oo-ui-buttonElement-button");
        } else {
            r.addClass("oo-ui-widget oo-ui-widget-enabled oo-ui-inputWidget oo-ui-textInputWidget oo-ui-textInputWidget-type-text QuickSaveDraftTimer");
            input.addClass("oo-ui-inputWidget-input");
        }
        r.append(input);
        ["on", "val", "disable", "enable"].forEach((key) => {
            r[key] = input[key].bind(input);
        });
        return r;
    }
    const pagename = mw.config.get("wgPageName");
    const section = $('[name="wpSection"]').val() || "（-1）全文";
    const textarea = $("#wpTextbox1");
    const buttonArea = $("<div/>", {
        css: {
            "margin-top": ".5em",
        },
    }).appendTo("#editform .editButtons");
    const saveButton = inputConstruct({
        "class": "QuickSaveDraftSaveButton",
        val: "立即保存草稿",
        attr: {
            type: "button",
        },
    });
    const recoverButton = inputConstruct({
        "class": "QuickSaveDraftRecoverButton",
        val: "暂无草稿",
        attr: {
            type: "button",
        },
    });
    const rollbackButton = inputConstruct({
        "class": "QuickSaveDraftRollbackButton",
        val: "回退还原",
        attr: {
            type: "button",
        },
    });
    const timerInput = inputConstruct({
        "class": "QuickSaveDraftTimerInput",
        val: data.timerInterval, //默认值
        maxlength: 2,
    });
    const timerSave = $("<span/>", {
        id: "QuickSaveDraftTimerSave",
    });
    const lastRun = $("<div/>", {
        "class": "QuickSaveDraftLastRunDiv",
        text: "上次草稿保存于",
    }).append($("<span/>", {
        "class": "QuickSaveDraftLastRun",
    })).append($("<span/>", {
        "class": "QuickSaveDraftSame",
        text: "，草稿内容与当前编辑内容一致",
    }));
    const pasueButton = inputConstruct({
        "class": "QuickSaveDraftPauseButton",
        val: "点击暂停自动保存",
        attr: {
            type: "button",
        },
    });
    function complement(_n, l) {
        const n = `${_n}`;
        if (n.length >= l) {
            return n;
        }
        const b = '<span style="speak:none;visibility:hidden;color:transparent;">';
        let c = "";
        while (l > (n + c).length) {
            c += "0";
        }
        return `${b + c}</span>${n}`;
    }
    function check() {
        if (getDraft(pagename, section) === undefined) {
            return;
        }
        const draft = getDraft(pagename, section);
        if (draft === null) //检测是否同一章节
        {
            return disable(recoverButton).val("暂无草稿");
        }
        if (draft !== textarea.val()) {
            //检测草稿是否一致
            enable(recoverButton).val("立即还原草稿");
            lastRun.find(".QuickSaveDraftSame").fadeOut();
        } else {
            disable(recoverButton).val("草稿内容一致");
            lastRun.find(".QuickSaveDraftSame").fadeIn();
        }
    }
    function save() {
        const date = new Date(),
            value = textarea.val();
        setDraft(pagename, section, value);
        check();
        lastRun.fadeIn().find(".QuickSaveDraftLastRun").html(`今日${complement(date.getHours(), 2)}时${complement(date.getMinutes(), 2)}分，草稿长度为 ${getDraft(pagename, section).length || "-1（暂无）"} 字符`);
    }
    let originText = null;
    let pause = false;
    let pastTime = 0;
    let timerSaveCode;
    disable(recoverButton);
    disable(rollbackButton);
    buttonArea.append(saveButton).append(recoverButton).append(rollbackButton).append("每隔").append(timerInput).append("分钟保存一次").append(timerSave).append(pasueButton).append(lastRun);
    const timestamp = getTimestamp(pagename, section);
    const date = new Date(timestamp);
    if (timestamp) {
        lastRun.fadeIn().find(".QuickSaveDraftLastRun").html(`${date.getDate() === new Date().getDate() ? "今" : complement(date.getDate(), 2)}日${complement(date.getHours(), 2)}时${complement(date.getMinutes(), 2)}分，草稿长度为 ${getDraft(pagename, section).length || "-1（暂无）"} 字符`);
    }
    textarea.on("input change", () => {
        check();
    });
    timerInput.on("input", () => {
        let flag = false;
        const input = timerInput.val();
        if (/^\d+$/.test(input) && +input > 0) {
            flag = true;
            setTimerInterval(+input);
        }
        const result = flag ? "，保存成功！" : "，保存失败";
        timerSave.text(result);
        timerSave.removeClass("disapper");
        if (timerSaveCode) {
            window.clearTimeout(timerSaveCode);
        }
        timerSaveCode = window.setTimeout(() => {
            timerSave.addClass("disapper");
        }, 3000);
    });
    rollbackButton.on("click", () => {
        if (rollbackButton.is(":disabled") || originText === null) {
            return;
        }
        textarea.val(originText);
        originText = null;
        disable(rollbackButton);
        check();
        return false;
    });
    recoverButton.on("click", () => {
        if (recoverButton.is(":disabled")) {
            return;
        }
        const draft = getDraft(pagename, section);
        if (draft === null) {
            return;
        }
        originText = textarea.val();
        textarea.val(draft);
        enable(rollbackButton);
        check();
        return false;
    });
    saveButton.on("click", () => {
        if (saveButton.is(":disabled")) {
            return;
        }
        save(false);
        return false;
    });
    pasueButton.on("click", () => {
        if (pause) {
            pasueButton.val("点击暂停自动保存");
            pause = false;
        } else {
            pasueButton.val("点击继续自动保存");
            pause = true;
        }
    });

    new Cron.CronJob({
        cronTime: "0 * * * * *",
        start: true,
        onTick: () => {
            if (pause) {
                return;
            }
            const interval = data.timerInterval;
            if (pastTime >= interval) {
                save();
                pastTime = 0;
            } else {
                pastTime++;
            }
        },
    });
})().catch((e) => {
    $("#editButtons").append(`<p>草稿工具 3.0-alpha 出现问题：[${e.name}]${e.message}`);
});
