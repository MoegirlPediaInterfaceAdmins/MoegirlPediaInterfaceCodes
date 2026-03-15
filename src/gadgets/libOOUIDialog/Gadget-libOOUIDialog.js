// <pre>
"use strict";
(() => {
    let running = false;
    const resArray = [];
    window.oouiDialog = Object.fromEntries(["alert", "confirm", "prompt"].map((method) => [method, async (textORjQuery, _option) => {
        // 在函数运行时再获取 OOUI.WindowManager.static.sizes 的值，以确保获取到最新的值（可能会被其他脚本修改）
        const { sizes } = OO.ui.WindowManager.static;
        const sizeNames = Object.keys(sizes).filter((s) => typeof sizes[s].width === "number").sort((a, b) => sizes[a].width - sizes[b].width); // ["small", "medium", "large", "larger"]
        const defaultSize = sizeNames[0];

        const option = $.isPlainObject(_option) ? _option : {};
        const setup = {
            size: defaultSize,
        };
        if (option.allowFullscreen !== true) {
            const { rect } = OO.ui.Element.static.getDimensions(window);
            const windowWidth = rect.right - rect.left;
            const acceptableSize = sizeNames.filter((s) => sizes[s].width < windowWidth);
            setup.size = acceptableSize.length > 0 ? acceptableSize.includes(option.size) ? option.size : acceptableSize[acceptableSize.length - 1] : defaultSize;
        } else {
            setup.size = Reflect.has(sizes, option.size) ? option.size : defaultSize;
        }
        if (method === "prompt") {
            const config = {
                autocomplete: false,
                ...$.isPlainObject(option.textInput) ? option.textInput : {},
            };
            setup.textInput = new OO.ui.TextInputWidget(config);
            if (option.required) {
                setup.textInput.setIndicator(config.indicator || "required");
                setup.textInput.setValidation(config.validate || "non-empty");
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
                result = await OO.ui[method](textORjQuery instanceof $ ? textORjQuery : $("<p>").html(textORjQuery), {
                    title: "萌娘百科提醒您",
                    ...option,
                    ...setup,
                });
                try {
                    if (setup.textInput && result !== null) {
                        await setup.textInput.getValidity();
                    }
                    break;
                } catch {
                    await OO.ui.alert($("<p>").html("您没有在刚才的输入框内填写符合要求的信息，请重新填写！"), {
                        ...option,
                        ...setup,
                        title: "未填写符合要求的信息",
                        textInput: null,
                    });
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
