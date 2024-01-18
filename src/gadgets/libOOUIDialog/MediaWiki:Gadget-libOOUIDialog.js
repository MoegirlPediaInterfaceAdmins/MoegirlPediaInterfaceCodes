// <pre>
"use strict";
(() => {
    let running = false;
    const resArray = [];
    const sizes = ["small", "medium", "large", "larger"];
    window.oouiDialog = Object.fromEntries(["alert", "confirm", "prompt"].map((method) => [method, async (textORjQuery, _option) => {
        const option = $.isPlainObject(_option) ? _option : {};
        const base = {
            size: "medium",
        };
        if (option.allowFullscreen !== true) {
            const { rect } = OO.ui.Element.static.getDimensions(window);
            const windowWidth = rect.right - rect.left;
            const acceptableSize = sizes.filter((s) => OO.ui.WindowManager.static.sizes[s].width < windowWidth);
            base.size = sizes.includes(option.size) ? acceptableSize.length > 0 ? acceptableSize.includes(option.size) ? option.size : acceptableSize[acceptableSize.length - 1] : "small" : "small";
        } else {
            base.size = [...sizes, "full"].includes(option.size) ? option.size : "small";
        }
        if (method === "prompt") {
            const config = $.extend({
                autocomplete: false,
            }, $.isPlainObject(option.textInput) ? option.textInput : {});
            base.textInput = new OO.ui.TextInputWidget(config);
            if (option.required) {
                base.textInput.setIndicator(config.indicator || "required");
                base.textInput.setValidation(config.validate || "non-empty");
            }
        }
        await new Promise((res) => {
            if (running) {
                resArray.push(res);
            } else {
                running = true;
                res();
            }
        });
        try {
            let result;
            while (Number.MAX_SAFE_INTEGER > Number.MIN_SAFE_INTEGER) {
                result = await OO.ui[method](textORjQuery instanceof $ ? textORjQuery : $("<p>").html(textORjQuery), $.extend({
                    title: "萌娘百科提醒您",
                }, option, base));
                try {
                    if (base.textInput && result !== null) {
                        await base.textInput.getValidity();
                    }
                    break;
                } catch {
                    await OO.ui.alert($("<p>").html("您没有在刚才的输入框内填写符合要求的信息，请重新填写！"), $.extend({}, option, base, {
                        title: "未填写符合要求的信息",
                        textInput: null,
                    }));
                    continue;
                }
            }
            return result;
        } finally {
            if (resArray.length > 0) {
                resArray.shift()();
            } else {
                running = false;
            }
        }
    }]));
    const sanity = $("<span>");
    window.oouiDialog.sanitize = (text) => sanity.text(text).html();
})();
// </pre>
