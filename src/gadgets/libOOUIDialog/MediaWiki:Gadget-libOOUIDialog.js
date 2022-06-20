// <pre>
"use strict";
(() => {
    let running = false;
    const resArray = [];
    const sizes = ["small", "medium", "large", "larger"];
    window.oouiDialog = Object.fromEntries(["alert", "confirm", "prompt"].map((method) => {
        return [method, (text_jQuery, _option) => {
            const option = $.isPlainObject(_option) ? _option : {};
            const textInput = $.extend({
                autocomplete: false,
            }, $.isPlainObject(option.textInput) ? option.textInput : {});
            if (textInput.required || option.required) {
                textInput.required = true;
                if (!("indicator" in textInput)) {
                    textInput.indicator = "required";
                }
                if (!("validate" in textInput)) {
                    textInput.validate = "not-empty";
                }
            }
            let size;
            if (option.allowFullscreen !== true) {
                const { rect } = OO.ui.Element.static.getDimensions(window);
                const windowWidth = rect.right - rect.left;
                const acceptableSize = sizes.filter((s) => OO.ui.WindowManager.static.sizes[s].width < windowWidth);
                size = sizes.includes(option.size) ? acceptableSize.length > 0 ? acceptableSize.includes(option.size) ? option.size : acceptableSize[acceptableSize.length - 1] : "small" : "small";
            } else {
                size = [...sizes, "full"].includes(option.size) ? option.size : "small";
            }
            return new Promise((res) => {
                if (running) {
                    resArray.push(res);
                } else {
                    running = true;
                    res();
                }
            }).then(() => {
                return OO.ui[method](text_jQuery instanceof $ ? text_jQuery : $("<p>").html(text_jQuery), $.extend({
                    title: "萌娘百科提醒您",
                }, option, {
                    size,
                    textInput: textInput,
                }));
            }).catch((e) => {
                if (resArray.length > 0) {
                    resArray.shift()();
                } else {
                    running = false;
                }
                throw e;
            }).then((result) => {
                if (resArray.length > 0) {
                    resArray.shift()();
                } else {
                    running = false;
                }
                return result;
            });
        }];
    }));
    const sanity = $("<span>");
    window.oouiDialog.sanitize = function (text) {
        return sanity.text(text).html();
    };
})();
// </pre>