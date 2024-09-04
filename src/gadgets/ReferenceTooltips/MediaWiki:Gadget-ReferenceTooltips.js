/* eslint-disable no-use-before-define, promise/catch-or-return */
/**
 * @source https://en.wikipedia.org/wiki/_?oldid=1006234032
 * 更新后请同步更新上面链接到最新版本
 */
"use strict";
// See [[mw:Reference Tooltips]]

(() => {
    // enwiki settings
    const REF_LINK_SELECTOR = '.reference, a[href^="#CITEREF"]',
        COMMENTED_TEXT_CLASS = "rt-commentedText",
        COMMENTED_TEXT_SELECTOR = `${COMMENTED_TEXT_CLASS ? `.${COMMENTED_TEXT_CLASS}, ` : ""}abbr[title]`;

    mw.messages.set(wgULS({
        "rt-settings": "参考文献提示工具设置",
        "rt-enable-footer": "启用参考文献提示工具",
        "rt-settings-title": "参考文献提示工具",
        "rt-save": "保存",
        "rt-cancel": "取消",
        "rt-enable": "启用",
        "rt-disable": "禁用",
        "rt-activationMethod": "提示工具显示方式",
        "rt-hovering": "鼠标悬浮",
        "rt-clicking": "点击",
        "rt-delay": "工具提示显示延迟（毫秒）",
        "rt-tooltipsForComments": `在参考文献提示工具样式中用<span title="提示工具的例子" class="${COMMENTED_TEXT_CLASS || "rt-commentedText"}" style="border-bottom: 1px dotted; cursor: help;">虚下划线</span>的方式在文字上显示提示工具（可以在不支持鼠标的设备上显示提示工具）`,
        "rt-disabledNote": "你可以通过页脚中的链接重新启用参考文献提示工具",
        "rt-done": "完成",
        "rt-enabled": "参考文献提示工具已启用",
    }, {
        "rt-settings": "參考文獻提示工具設定",
        "rt-enable-footer": "啟用參考文獻提示工具",
        "rt-settings-title": "參考文獻提示工具",
        "rt-save": "儲存",
        "rt-cancel": "取消",
        "rt-enable": "啟用",
        "rt-disable": "停用",
        "rt-activationMethod": "提示工具顯示方式",
        "rt-hovering": "滑鼠懸浮",
        "rt-clicking": "點擊",
        "rt-delay": "工具提示顯示延遲（毫秒）",
        "rt-tooltipsForComments": `在參考文獻提示工具樣式中用<span title="提示工具的例子" class="${COMMENTED_TEXT_CLASS || "rt-commentedText"}" style="border-bottom: 1px dotted; cursor: help;">虛底線</span>的方式在文字上顯示提示工具（可以在不支持滑鼠的裝置上顯示提示工具）`,
        "rt-disabledNote": "你可以通過頁尾中的連結重新啟用參考文獻提示工具",
        "rt-done": "完成",
        "rt-enabled": "參考文獻提示工具已啟用",
    }));

    // "Global" variables
    const SECONDS_IN_A_DAY = 60 * 60 * 24,
        CLASSES = {
            FADE_IN_DOWN: "rt-fade-in-down",
            FADE_IN_UP: "rt-fade-in-up",
            FADE_OUT_DOWN: "rt-fade-out-down",
            FADE_OUT_UP: "rt-fade-out-up",
        },
        IS_TOUCHSCREEN = Reflect.has(document.documentElement, "ontouchstart"),
        // Quite a rough check for mobile browsers, a mix of what is advised at
        // https://stackoverflow.com/a/24600597 (sends to
        // https://developer.mozilla.org/en-US/docs/Browser_detection_using_the_user_agent)
        // and https://stackoverflow.com/a/14301832
        IS_MOBILE = /Mobi|Android/i.test(navigator.userAgent) || typeof window.orientation !== "undefined",
        CLIENT_NAME = $.client.profile().name,
        $body = $(document.body),
        $window = $(window);
    // let settings, enabled, delay, activatedByClick, tooltipsForComments, cursorWaitCss, windowManager;
    let settings, enabled, delay, activatedByClick, tooltipsForComments, windowManager;

    const rt = ($content) => {
        // Popups gadget & Reference Previews
        if (window.pg || mw.config.get("wgPopupsReferencePreviews")) {
            return;
        }

        let teSelector,
            settingsDialogOpening = false;

        const setSettingsCookie = () => mw.cookie.set(
            "RTsettings",
            `${+enabled}|${delay}|${+activatedByClick}|${+tooltipsForComments}`,
            { path: "/", expires: 90 * SECONDS_IN_A_DAY, prefix: "" },
        );

        const enableRt = () => {
            enabled = true;
            setSettingsCookie();
            $(".rt-enableItem").remove();
            rt($content);
            mw.notify(mw.msg("rt-enabled"));
        };

        const disableRt = () => {
            $content.find(teSelector).removeClass("rt-commentedText").off(".rt");
            $body.off(".rt");
            $window.off(".rt");
        };

        const addEnableLink = () => {
            // #footer-places – Vector
            // #f-list – Timeless, Monobook, Modern
            // parent of #footer li – Cologne Blue
            let $footer = $("#footer-places, #f-list");
            if (!$footer.length) {
                $footer = $("#footer li").parent();
            }
            $footer.append(
                $("<li>")
                    .addClass("rt-enableItem")
                    .append(
                        $("<a>")
                            .text(mw.msg("rt-enable-footer"))
                            .attr("href", "javascript:")
                            .on("click", (e) => {
                                e.preventDefault();
                                enableRt();
                            }),
                    ),
            );
        };

        class TooltippedElement {
            constructor($element) {
                let events;
                if (!$element) {
                    return;
                }
                const onStartEvent = (e) => {
                    let showRefArgs;

                    if (activatedByClick && this.type !== "commentedText" && e.type !== "contextmenu") {
                        e.preventDefault();
                    }
                    if (!this.noRef) {
                        showRefArgs = [this.$element];
                        if (this.type !== "supRef") {
                            showRefArgs.push(e.pageX, e.pageY);
                        }
                        this.showRef(...showRefArgs);
                    }
                };

                const onEndEvent = () => {
                    if (!this.noRef) {
                        this.hideRef();
                    }
                };

                // TooltippedElement.$element and TooltippedElement.$originalElement will be different when
                // the first is changed after its cloned version is hovered in a tooltip
                this.$element = $element;
                this.$originalElement = $element;
                if (this.$element.is(REF_LINK_SELECTOR)) {
                    if (this.$element.prop("tagName") === "SUP") {
                        this.type = "supRef";
                    } else {
                        this.type = "harvardRef";
                    }
                } else {
                    this.type = "commentedText";
                    this.comment = this.$element.attr("title");
                    if (!this.comment) {
                        return;
                    }
                    this.$element.addClass("rt-commentedText");
                }

                if (activatedByClick) {
                    events = {
                        "click.rt": onStartEvent,
                    };
                    // Adds an ability to see tooltips for links
                    if (this.type === "commentedText"
                        && (this.$element.closest("a").length || this.$element.has("a").length
                        )) {
                        events["contextmenu.rt"] = onStartEvent;
                    }
                } else {
                    events = {
                        "mouseenter.rt": onStartEvent,
                        "mouseleave.rt": onEndEvent,
                    };
                }

                this.$element.on(events);
            }
            hideRef(immediately) {
                clearTimeout(this.showTimer);

                if (this.type === "commentedText") {
                    this.$element.attr("title", this.comment);
                }

                if (this.tooltip && this.tooltip.isPresent) {
                    if (activatedByClick || immediately) {
                        this.tooltip.hide();
                    } else {
                        this.hideTimer = setTimeout(() => {
                            this.tooltip.hide();
                        }, 200);
                    }
                } else if (this.$ref && this.$ref.hasClass("rt-target")) {
                    this.$ref.removeClass("rt-target");
                    if (activatedByClick) {
                        $body.off("click.rt touchstart.rt", this.onBodyClick);
                    }
                }
            }
            showRef($element, ePageX, ePageY) {
                // Popups gadget
                if (window.pg) {
                    disableRt();
                    return;
                }

                if (this.tooltip && !this.tooltip.$content.length) {
                    return;
                }

                const tooltipInitiallyPresent = this.tooltip && this.tooltip.isPresent;

                const reallyShow = () => {
                    let viewportTop, refOffsetTop, teHref;
                    if (!this.$ref && !this.comment) {
                        teHref = this.type === "supRef"
                            ? this.$element.find("a").attr("href")
                            : this.$element.attr("href"); // harvardRef
                        this.$ref = teHref && $(`#${$.escapeSelector(teHref.slice(1))}`);
                        if (!this.$ref || !this.$ref.length || !this.$ref.text()) {
                            this.noRef = true;
                            return;
                        }
                    }

                    if (!tooltipInitiallyPresent && !this.comment) {
                        viewportTop = $window.scrollTop();
                        refOffsetTop = this.$ref.offset().top;
                        if (!activatedByClick
                            && viewportTop < refOffsetTop
                            && viewportTop + $window.height() > refOffsetTop + this.$ref.height()
                            // There can be gadgets/scripts that make references horizontally scrollable.
                            && $window.width() > this.$ref.offset().left + this.$ref.width()) {
                            // Highlight the reference itself
                            this.$ref.addClass("rt-target");
                            return;
                        }
                    }

                    if (!this.tooltip) {
                        this.tooltip = new Tooltip(this);
                        if (!this.tooltip.$content.length) {
                            return;
                        }
                    }

                    // If this tooltip is called from inside another tooltip. We can't define it
                    // in the constructor since a ref can be cloned but have the same Tooltip object;
                    // so, Tooltip.parent is a floating value.
                    this.tooltip.parent = this.$element.closest(".rt-tooltip").data("tooltip");
                    if (this.tooltip.parent && this.tooltip.parent.disappearing) {
                        return;
                    }

                    this.tooltip.show();

                    if (tooltipInitiallyPresent) {
                        if (this.tooltip.$element.hasClass("rt-tooltip-above")) {
                            this.tooltip.$element.addClass(CLASSES.FADE_IN_DOWN);
                        } else {
                            this.tooltip.$element.addClass(CLASSES.FADE_IN_UP);
                        }
                        return;
                    }

                    this.tooltip.calculatePosition(ePageX, ePageY);

                    $window.on("resize.rt", this.onWindowResize);
                };

                // We redefine this.$element here because e.target can be a reference link inside
                // a reference tooltip, not a link that was initially assigned to this.$element
                this.$element = $element;

                if (this.type === "commentedText") {
                    this.$element.attr("title", "");
                }

                if (activatedByClick) {
                    if (tooltipInitiallyPresent
                        || this.$ref && this.$ref.hasClass("rt-target")) {
                        return;
                    }
                    setTimeout(() => {
                        $body.on("click.rt touchstart.rt", this.onBodyClick);
                    }, 0);
                }

                if (activatedByClick || tooltipInitiallyPresent) {
                    reallyShow();
                } else {
                    this.showTimer = setTimeout(reallyShow, delay);
                }
            }
            onBodyClick = (e) => {
                if (!this.tooltip && !this.$ref?.hasClass("rt-target")) {
                    return;
                }

                let $current = $(e.target);

                const contextMatchesParameter = function (parameter) {
                    return this === parameter;
                };

                // The last condition is used to determine cases when a clicked tooltip is the current
                // element's tooltip or one of its descendants
                while ($current.length
                    && (!$current.hasClass("rt-tooltip") || !$current.data("tooltip") || !$current.data("tooltip").upToTopParent(
                        contextMatchesParameter, [this.tooltip],
                        true,
                    ))) {
                    $current = $current.parent();
                }
                if (!$current.length) {
                    this.hideRef();
                }
            };
            onWindowResize() {
                this.tooltip.calculatePosition();
            }
        }

        class SettingsDialog extends OO.ui.ProcessDialog {
            static static = {
                ...super.static,
                tagName: "div",
                name: "settingsDialog",
                title: "参考文献提示工具",
                actions: [
                    {
                        modes: "basic",
                        action: "save",
                        label: "保存",
                        flags: [
                            "primary",
                            "progressive",
                        ],
                    },
                    {
                        modes: "basic",
                        label: "取消",
                        flags: "safe",
                    },
                    {
                        modes: "disabled",
                        action: "deactivated",
                        label: "完成",
                        flags: [
                            "primary",
                            "progressive",
                        ],
                    },
                ],
            };
            initialize(...args) {
                super.initialize(...args);

                this.enableOption = new OO.ui.RadioOptionWidget({
                    label: mw.msg("rt-enable"),
                });
                this.disableOption = new OO.ui.RadioOptionWidget({
                    label: mw.msg("rt-disable"),
                });
                this.enableSelect = new OO.ui.RadioSelectWidget({
                    items: [this.enableOption, this.disableOption],
                    classes: ["rt-enableSelect"],
                });
                this.enableSelect.selectItem(this.enableOption);
                this.enableSelect.on("choose", (item) => {
                    if (item === this.disableOption) {
                        this.activationMethodSelect.setDisabled(true);
                        this.delayInput.setDisabled(true);
                        this.tooltipsForCommentsCheckbox.setDisabled(true);
                    } else {
                        this.activationMethodSelect.setDisabled(false);
                        this.delayInput.setDisabled(this.clickOption.isSelected());
                        this.tooltipsForCommentsCheckbox.setDisabled(false);
                    }
                });

                this.hoverOption = new OO.ui.RadioOptionWidget({
                    label: mw.msg("rt-hovering"),
                });
                this.clickOption = new OO.ui.RadioOptionWidget({
                    label: mw.msg("rt-clicking"),
                });
                this.activationMethodSelect = new OO.ui.RadioSelectWidget({
                    items: [this.hoverOption, this.clickOption],
                });
                this.activationMethodSelect.selectItem(activatedByClick
                    ? this.clickOption
                    : this.hoverOption,
                );
                this.activationMethodSelect.on("choose", (item) => {
                    if (item === this.clickOption) {
                        this.delayInput.setDisabled(true);
                    } else {
                        this.delayInput.setDisabled(this.clickOption.isSelected());
                    }
                });
                this.activationMethodField = new OO.ui.FieldLayout(this.activationMethodSelect, {
                    label: mw.msg("rt-activationMethod"),
                    align: "top",
                });

                this.delayInput = new OO.ui.NumberInputWidget({
                    input: { value: delay },
                    step: 50,
                    min: 0,
                    max: 5000,
                    disabled: activatedByClick,
                    classes: ["rt-numberInput"],
                });
                this.delayField = new OO.ui.FieldLayout(this.delayInput, {
                    label: mw.msg("rt-delay"),
                    align: "top",
                });

                this.tooltipsForCommentsCheckbox = new OO.ui.CheckboxInputWidget({
                    selected: tooltipsForComments,
                });
                this.tooltipsForCommentsField = new OO.ui.FieldLayout(
                    this.tooltipsForCommentsCheckbox,
                    {
                        label: new OO.ui.HtmlSnippet(mw.msg("rt-tooltipsForComments")),
                        align: "inline",
                        classes: ["rt-tooltipsForCommentsField"],
                    },
                );
                new TooltippedElement(
                    this.tooltipsForCommentsField.$element.find(
                        `.${COMMENTED_TEXT_CLASS || "rt-commentedText"}`,
                    ),
                );

                this.fieldset = new OO.ui.FieldsetLayout();
                this.fieldset.addItems([
                    this.activationMethodField,
                    this.delayField,
                    this.tooltipsForCommentsField,
                ]);

                this.panelSettings = new OO.ui.PanelLayout({
                    padded: true,
                    expanded: false,
                });
                this.panelSettings.$element.append(
                    this.enableSelect.$element,
                    $("<hr>").addClass("rt-settingsFormSeparator"),
                    this.fieldset.$element,
                );

                this.panelDisabled = new OO.ui.PanelLayout({
                    padded: true,
                    expanded: false,
                });
                this.panelDisabled.$element.append(
                    $("<table>")
                        .addClass("rt-disabledHelp")
                        .append(
                            $("<tr>").append(
                                $("<td>").append(
                                    $("<img>").attr("src", "https://en.wikipedia.org/w/load.php?modules=ext.popups.images&image=footer&format=rasterized&lang=ru&skin=vector&version=0uotisb"),
                                ),
                                $("<td>")
                                    .addClass("rt-disabledNote")
                                    .text(mw.msg("rt-disabledNote")),
                            ),
                        ),
                );

                this.stackLayout = new OO.ui.StackLayout({
                    items: [this.panelSettings, this.panelDisabled],
                });

                this.$body.append(this.stackLayout.$element);
            }
            getSetupProcess(data) {
                return SettingsDialog.super.prototype.getSetupProcess.bind(this)(data)
                    .next(() => {
                        this.stackLayout.setItem(this.panelSettings);
                        this.actions.setMode("basic");
                    }, this);
            }
            getActionProcess(action) {
                if (action === "save") {
                    return new OO.ui.Process(() => {
                        const newDelay = +this.delayInput.getValue();

                        enabled = this.enableOption.isSelected();
                        if (newDelay >= 0 && newDelay <= 5000) {
                            delay = newDelay;
                        }
                        activatedByClick = this.clickOption.isSelected();
                        tooltipsForComments = this.tooltipsForCommentsCheckbox.isSelected();

                        setSettingsCookie();

                        if (enabled) {
                            this.close();
                            disableRt();
                            rt($content);
                        } else {
                            this.actions.setMode("disabled");
                            this.stackLayout.setItem(this.panelDisabled);
                            disableRt();
                            addEnableLink();
                        }
                    });
                } else if (action === "deactivated") {
                    this.close();
                }
                return SettingsDialog.super.prototype.getActionProcess.bind(this)(action);
            }
            getBodyHeight() {
                return this.stackLayout.getCurrentItem().$element.outerHeight(true);
            }
        }

        class Tooltip {
            constructor(te) {
                // This variable can change: one tooltip can be called from a harvard-style reference link
                // that is put into different tooltips
                this.te = te;

                switch (this.te.type) {
                    case "supRef":
                        this.id = `rt-${this.te.$originalElement.attr("id")}`;
                        this.$content = this.te.$ref
                            .contents()
                            .filter((i, ele) => {
                                const $this = $(ele);
                                return ele.nodeType === Node.TEXT_NODE
                                    || !($this.is(".mw-cite-backlink") || i === 0 && (/* Template:Cnote, Template:Note */$this.is("b") || /* Template:Note_label */$this.is("a") && $this.attr("href").indexOf("#ref") === 0
                                    ));
                            })
                            .clone(true);
                        break;
                    case "harvardRef":
                        this.id = `rt-${this.te.$originalElement.closest("li").attr("id")}`;
                        this.$content = this.te.$ref
                            .clone(true)
                            .removeAttr("id");
                        break;
                    case "commentedText":
                        this.id = `rt-${`${Math.random()}`.slice(2)}`;
                        this.$content = $(document.createTextNode(this.te.comment));
                        break;
                }
                if (!this.$content.length) {
                    return;
                }

                this.insideWindow = !!this.te.$element.closest(".oo-ui-window").length;

                this.$element = $("<div>")
                    .addClass("rt-tooltip")
                    .attr("id", this.id)
                    .attr("role", "tooltip")
                    .data("tooltip", this);
                if (this.insideWindow) {
                    this.$element.addClass("rt-tooltip-insideWindow");
                }

                // We need the $content interlayer here in order for the settings icon to have correct
                // margins
                this.$content = this.$content
                    .wrapAll("<div>")
                    .parent()
                    .addClass("rt-tooltipContent")
                    .addClass("mw-parser-output")
                    .appendTo(this.$element);

                if (!activatedByClick) {
                    this.$element
                        .on("mouseenter", () => {
                            if (!this.disappearing) {
                                this.upToTopParent((tt) => {
                                    tt.show();
                                });
                            }
                        })
                        .on("mouseleave", (e) => {
                            // https://stackoverflow.com/q/47649442 workaround. Relying on relatedTarget
                            // alone has pitfalls: when alt-tabbing, relatedTarget is empty too
                            if (CLIENT_NAME !== "chrome"
                                || (!e.originalEvent || e.originalEvent.relatedTarget !== null || !this.clickedTime || Date.now() - this.clickedTime > 50
                                )) {
                                this.upToTopParent((tt) => {
                                    tt.te.hideRef();
                                });
                            }
                        })
                        .on("click", () => {
                            this.clickedTime = Date.now();
                        });
                }

                if (!this.insideWindow) {
                    $("<div>")
                        .addClass("rt-settingsLink")
                        .attr("title", mw.msg("rt-settings"))
                        .on("click", () => {
                            if (settingsDialogOpening) {
                                return;
                            }
                            settingsDialogOpening = true;

                            // if (mw.loader.getState("oojs-ui") !== "ready") {
                            //     if (cursorWaitCss) {
                            //         cursorWaitCss.disabled = false;
                            //     } else {
                            //         cursorWaitCss = mw.util.addCSS("body { cursor: wait; }");
                            //     }
                            // }

                            // if (cursorWaitCss) {
                            //     cursorWaitCss.disabled = true;
                            // }

                            this.upToTopParent((tt) => {
                                if (tt.isPresent) {
                                    if (tt.$element[0].style.right) {
                                        tt.$element.css(
                                            "right",
                                            `+=${window.innerWidth - $window.width()}`,
                                        );
                                    }
                                    tt.te.hideRef(true);
                                }
                            });

                            if (!windowManager) {
                                windowManager = new OO.ui.WindowManager();
                                $body.append(windowManager.$element);
                            }

                            const settingsDialog = new SettingsDialog();
                            windowManager.addWindows([settingsDialog]);
                            const settingsWindow = windowManager.openWindow(settingsDialog);
                            settingsWindow.opened.then(() => {
                                settingsDialogOpening = false;
                            });
                            settingsWindow.closed.then(() => {
                                windowManager.clearWindows();
                            });
                        })
                        .prependTo(this.$content);
                }

                // Tooltip tail element is inside tooltip content element in order for the tooltip
                // not to disappear when the mouse is above the tail
                this.$tail = $("<div>")
                    .addClass("rt-tooltipTail")
                    .prependTo(this.$element);

                this.disappearing = false;
            }
            show() {
                this.disappearing = false;
                clearTimeout(this.te.hideTimer);
                clearTimeout(this.te.removeTimer);

                this.$element
                    .removeClass(CLASSES.FADE_OUT_DOWN)
                    .removeClass(CLASSES.FADE_OUT_UP);

                if (!this.isPresent) {
                    $body.append(this.$element);
                }

                this.isPresent = true;
            }
            hide() {
                this.disappearing = true;

                if (this.$element.hasClass("rt-tooltip-above")) {
                    this.$element
                        .removeClass(CLASSES.FADE_IN_DOWN)
                        .addClass(CLASSES.FADE_OUT_UP);
                } else {
                    this.$element
                        .removeClass(CLASSES.FADE_IN_UP)
                        .addClass(CLASSES.FADE_OUT_DOWN);
                }

                this.te.removeTimer = setTimeout(() => {
                    if (this.isPresent) {
                        this.$element.detach();

                        this.$tail.css("left", "");

                        if (activatedByClick) {
                            $body.off("click.rt touchstart.rt", this.te.onBodyClick);
                        }
                        $window.off("resize.rt", this.te.onWindowResize);

                        this.isPresent = false;
                    }
                }, 200);
            }
            calculatePosition(ePageX, ePageY) {
                let teOffsets, teOffset, tooltipTailOffsetX, tooltipTailLeft, offsetYCorrection = 0;

                this.$tail.css("left", "");

                const teElement = this.te.$element.get(0);
                if (ePageX !== undefined) {
                    tooltipTailOffsetX = ePageX;
                    teOffsets = teElement.getClientRects && teElement.getClientRects() || teElement.getBoundingClientRect();
                    if (teOffsets.length > 1) {
                        for (let i = teOffsets.length - 1; i >= 0; i--) {
                            if (ePageY >= Math.round($window.scrollTop() + teOffsets[i].top)
                                && ePageY <= Math.round(
                                    $window.scrollTop() + teOffsets[i].top + teOffsets[i].height,
                                )) {
                                teOffset = teOffsets[i];
                            }
                        }
                    }
                }

                if (!teOffset) {
                    teOffset = teElement.getClientRects && teElement.getClientRects()[0] || teElement.getBoundingClientRect();
                }
                teOffset = {
                    top: $window.scrollTop() + teOffset.top,
                    left: $window.scrollLeft() + teOffset.left,
                    width: teOffset.width,
                    height: teOffset.height,
                };
                if (!tooltipTailOffsetX) {
                    tooltipTailOffsetX = (teOffset.left * 2 + teOffset.width) / 2;
                }
                if (CLIENT_NAME === "msie" && this.te.type === "supRef") {
                    offsetYCorrection = -+this.te.$element.parent().css("font-size").replace("px", "") / 2;
                }
                this.$element.css({
                    top: teOffset.top - this.$element.outerHeight() - 7 + offsetYCorrection,
                    left: tooltipTailOffsetX - 20,
                    right: "",
                });

                // Is it squished against the right side of the page?
                if (this.$element.offset().left + this.$element.outerWidth() > $window.width() - 1) {
                    this.$element.css({
                        left: "",
                        right: 0,
                    });
                    tooltipTailLeft = tooltipTailOffsetX - this.$element.offset().left - 5;
                }

                // Is a part of it above the top of the screen?
                if (teOffset.top < this.$element.outerHeight() + $window.scrollTop() + 6) {
                    this.$element
                        .removeClass("rt-tooltip-above")
                        .addClass("rt-tooltip-below")
                        .addClass(CLASSES.FADE_IN_UP)
                        .css({
                            top: teOffset.top + teOffset.height + 9 + offsetYCorrection,
                        });
                    if (tooltipTailLeft) {
                        this.$tail.css("left", `${tooltipTailLeft + 12}px`);
                    }
                } else {
                    this.$element
                        .removeClass("rt-tooltip-below")
                        .addClass("rt-tooltip-above")
                        .addClass(CLASSES.FADE_IN_DOWN)
                        // A fix for cases when a tooltip shown once is then wrongly positioned when it
                        // is shown again after a window resize. We just repeat what is above.
                        .css({
                            top: teOffset.top - this.$element.outerHeight() - 7 + offsetYCorrection,
                        });
                    if (tooltipTailLeft) {
                        // 12 is the tail element width/height
                        this.$tail.css("left", `${tooltipTailLeft}px`);
                    }
                }
            }

            // Run some function for all the tooltips up to the top one in a tree. Its context will be
            // the tooltip, while its parameters may be passed to Tooltip.upToTopParent as an array
            // in the second parameter. If the third parameter passed to ToolTip.upToTopParent is true,
            // the execution stops when the function in question returns true for the first time,
            // and ToolTip.upToTopParent returns true as well.
            upToTopParent(func, parameters, stopAtTrue) {
                let returnValue, currentTooltip = this;

                do {
                    returnValue = func.bind(currentTooltip)(currentTooltip, ...parameters ?? []);
                    if (stopAtTrue && returnValue) {
                        break;
                    }
                    currentTooltip = currentTooltip.parent;
                } while (currentTooltip);

                if (stopAtTrue) {
                    return returnValue;
                }
            }
        }

        if (!enabled) {
            addEnableLink();
            return;
        }

        teSelector = REF_LINK_SELECTOR;
        if (tooltipsForComments) {
            teSelector += `, ${COMMENTED_TEXT_SELECTOR}`;
        }
        $content.find(teSelector).each((_, ele) => {
            new TooltippedElement($(ele));
        });
    };

    const settingsString = mw.cookie.get("RTsettings", "");
    if (settingsString) {
        settings = settingsString.split("|");
        enabled = !!+settings[0];
        delay = +settings[1];
        activatedByClick = !!+settings[2];
        // The forth value was added later, so we provide for a default value. See comments below
        // for why we use "IS_TOUCHSCREEN && IS_MOBILE".
        tooltipsForComments = settings[3] === undefined
            ? IS_TOUCHSCREEN && IS_MOBILE
            : !!+settings[3];
    } else {
        enabled = true;
        delay = 200;
        // Since the mobile browser check is error-prone, adding IS_MOBILE condition here would probably
        // leave cases where a user interacting with the browser using touches doesn't know how to call
        // a tooltip in order to switch to activation by click. Some touch-supporting laptop users
        // interacting by touch (though probably not the most popular use case) would not be happy too.
        activatedByClick = IS_TOUCHSCREEN;
        // Arguably we shouldn't convert native tooltips into gadget tooltips for devices that have
        // mouse support, even if they have touchscreens (there are laptops with touchscreens).
        // IS_TOUCHSCREEN check here is for reliability, since the mobile check is prone to false
        // positives.
        tooltipsForComments = IS_TOUCHSCREEN && IS_MOBILE;
    }

    mw.hook("wikipage.content").add(rt);
})();
