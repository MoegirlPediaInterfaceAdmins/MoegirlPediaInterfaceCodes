"use strict";
$(() => {
    const permittedGroups = ["autoconfirmed", "staff"]; // 默认只允许自动确认用户、STAFF绕过强制预览。
    // 检测两个数组是否有重复元素
    const intersects = (arr1, arr2) => Array.isArray(arr1) && Array.isArray(arr2) && arr1.some((item) => arr2.includes(item));
    // eslint-disable-next-line @stylistic/no-extra-parens
    if (mw.config.get("wgAction") !== "edit" || (intersects(mw.config.get("wgUserGroups"), permittedGroups) && +mw.user.options.get("gadget-ForcePreviewUponUserRequest", 0) !== 1)) {
        return;
    }
    const saveButton = $("#wpSave");
    const previewButton = $("#wpPreview");
    const previewContainer = $("#wikiPreview");
    const isUserChosenPreviewLive = [true, 1, "1"].includes(mw.user.options.get("uselivepreview"));
    let isPreviewedLive = false;
    if (!saveButton[0]) {
        return;
    }
    const oldSaveButtonValue = saveButton.val();
    const tcb = $("#TencentCaptchaBtn");
    if (tcb.length > 0) {
        tcb.attr("disabled", "disabled").hide().after('<button type="button" class="mw-ui-button mw-ui-progressive mw-ui-primary" style="display: block;" disabled="disabled">请先预览</button>');
    }
    saveButton.attr("disabled", "disabled").val("预览一次后才可保存内容").css("font-weight", "normal").parent().removeClass("oo-ui-widget-enabled oo-ui-flaggedElement-primary oo-ui-flaggedElement-progressive").addClass("oo-ui-widget-disabled");
    const hook = mw.hook("wikipage.editform");
    const hookFunc = () => {
        const previewArea = previewContainer.children(".mw-content-ltr, .mw-content-rtl");
        if (previewArea[0] && previewArea.is(":not(:empty)")) {
            if (!isPreviewedLive) {
                isPreviewedLive = true;
                saveButton.removeAttr("disabled").val(oldSaveButtonValue).css("font-weight", "700").parent().addClass("oo-ui-widget-enabled oo-ui-flaggedElement-primary oo-ui-flaggedElement-progressive").removeClass("oo-ui-widget-disabled");
                previewButton.closest(".oo-ui-buttonElement-framed").removeClass("oo-ui-flaggedElement-primary oo-ui-flaggedElement-progressive");
                if (tcb.length > 0) {
                    tcb.removeAttr("disabled").show().next().remove();
                }
            }
            hook.remove(hookFunc);
        }
    };
    previewButton.closest(".oo-ui-buttonElement-framed").addClass("oo-ui-flaggedElement-primary oo-ui-flaggedElement-progressive").on("click", () => {
        if (isUserChosenPreviewLive && !isPreviewedLive) {
            hook.add(hookFunc);
        }
    });
    let captureSupported = false;
    try {
        const options = Reflect.defineProperty({}, "capture", {
            get: () => {
                captureSupported = true;
                return undefined;
            },
        });
        window.addEventListener("test", null, options);
    } catch { }
    saveButton[0].addEventListener("click", (e) => {
        if (!isPreviewedLive) {
            e.preventDefault();
            e.stopImmediatePropagation();
            e.stopPropagation();
            return false;
        }
    }, captureSupported
        ? {
            capture: true,
        }
        : true);
    if (Reflect.has(window, "MutationObserver")) {
        const observer = new MutationObserver(() => {
            if (!isPreviewedLive) {
                if (saveButton.is(":enabled")) {
                    saveButton.attr("disabled", "disabled");
                }
            } else {
                if (saveButton.is(":disabled")) {
                    saveButton.removeAttr("disabled");
                }
            }
        });
        observer.observe(saveButton[0], {
            attributes: true,
            childList: true,
            subtree: true,
        });
    }
});
