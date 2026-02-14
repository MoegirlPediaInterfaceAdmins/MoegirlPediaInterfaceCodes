// <nowiki>
/* 这里的任何JavaScript将在全站加载
 * 请尊重萌娘百科版权，以下代码复制需要注明原自萌娘百科，并且附上URL地址 http://zh.moegirl.org.cn/MediaWiki:Gadget-site-js.js
 * 版权协定：知识共享 署名-非商业性使用-相同方式共享 3.0
 */
"use strict";
(async () => {
    /* 检查是否为维护组成员 */
    const wgUserGroups = mw.config.get("wgUserGroups");
    const isMGPMGUser = wgUserGroups.includes("patroller") || wgUserGroups.includes("sysop");

    const wgNamespaceNumber = mw.config.get("wgNamespaceNumber");
    const wgAction = mw.config.get("wgAction");

    const body = document.body;
    const html = document.documentElement;
    const $body = $(body);
    const $window = $(window);
    const sleep = (ms = 1000) => new Promise((res) => setTimeout(res, ms));

    /* 共享站相关 */
    if (["ViewAvatar", "Listfiles", "ListDuplicatedFiles", "Unusedimages", "Uncategorizedimages", "MediaStatistics", "TimedMediaHandler"].includes(mw.config.get("wgCanonicalSpecialPageName"))) {
        const url = new URL(location.href);
        url.hostname = url.hostname.replace(/^[^.]+/g, "commons");
        url.pathname = mw.config.get("wgScript");
        url.searchParams.set("title", `${mw.config.get("wgCanonicalNamespace")}:${mw.config.get("wgCanonicalSpecialPageName")}`);
        location.replace(url);
    }
    /* 浮动滚动条 */
    const forbiddenScroll = ["hidden", "clip"];
    $window.on("resize", () => {
        const innerWidth = window.innerWidth;
        let scrollbarWidth;
        if (!forbiddenScroll.includes(getComputedStyle(body).overflowY)) {
            scrollbarWidth = innerWidth - body.clientWidth;
        } else if (!forbiddenScroll.includes(getComputedStyle(html).overflowY)) {
            scrollbarWidth = innerWidth - html.clientWidth;
        } else {
            const backup = body.style.overflowY;
            body.style.overflowY = "scroll";
            scrollbarWidth = innerWidth - body.clientWidth;
            body.style.overflowY = backup;
        }
        $body[scrollbarWidth <= 0 ? "addClass" : "removeClass"]("overlay-scrollbars");
    }).trigger("resize");
    /* Tabs */
    const tabs = () => {
        const defaultStyle = {
            purple: {
                labelColor: " ", // anti check
                labelBackgroundColor: "#9070c0",
                labelBorderColor: "#b090e0 #7050a0 #9070c0 #b090e0",
                labelPadding: ".2em .3em .2em .3em",
                textBorderColor: "#9070c0",
                textBackgroundColor: "#f0edf5",
                textPadding: "1em",
            },
            green: {
                labelColor: " ",
                labelBackgroundColor: "#75c045",
                labelBorderColor: "#90d060 #60b030 #75c045 #90d060",
                labelPadding: ".2em .3em .2em .3em",
                textBorderColor: "#75c045 #60b030 #60b030 #75c045",
                textBackgroundColor: "#f5fffa",
                textPadding: "1em",
            },
            red: {
                labelColor: " ",
                labelBackgroundColor: "#FF0000",
                labelBorderColor: "#FF8888 #CC0000 #FF0000 #FF8888",
                labelPadding: ".2em .3em .2em .3em",
                textBorderColor: "#FF0000 #CC0000 #CC0000 #FF0000",
                textBackgroundColor: "#fffafa",
                textPadding: "1em",
            },
            blue: {
                labelColor: " ",
                labelBackgroundColor: "#5b8dd6",
                labelBorderColor: "#88abde #3379de #5b8dd6 #88abde",
                labelPadding: ".2em .3em .2em .3em",
                textBackgroundColor: "#f0f8ff",
                textBorderColor: "#5b8dd6 #3379de #3379de #5b8dd6",
                textPadding: "1em",
            },
            yellow: {
                labelColor: " ",
                labelBackgroundColor: "#ffe147",
                labelBorderColor: "#ffe977 #ffd813 #ffe147 #ffe977",
                labelPadding: ".2em .3em .2em .3em",
                textBackgroundColor: "#fffce8",
                textBorderColor: "#ffe147 #ffd813 #ffd813 #ffe147",
                textPadding: "1em",
            },
            orange: {
                labelColor: " ",
                labelBackgroundColor: "#ff9d42",
                labelBorderColor: "#ffac5d #ff820e #ff9d42 #ffac5d",
                labelPadding: ".2em .3em .2em .3em",
                textBackgroundColor: "#ffeedd",
                textBorderColor: "#ff9d42 #ff820e #ff820e #ff9d42",
                textPadding: "1em",
            },
            black: {
                labelColor: " ",
                labelBackgroundColor: "#7f7f7f",
                labelBorderColor: "#999999 #4c4c4c #7f7f7f #999999",
                labelPadding: ".2em .3em .2em .3em",
                textBackgroundColor: "#e5e5e5",
                textBorderColor: "#7f7f7f #4c4c4c #4c4c4c #7f7f7f",
                textPadding: "1em",
            },
        };
        const sides = {
            top: {
                className: "tabLabelTop",
                labelColorSide: "top",
                labelBorderSide: ["left", "right"],
                labelColorSideReverse: "bottom",
                dividerSizeType: "height",
            },
            bottom: {
                className: "tabLabelBottom",
                labelColorSide: "bottom",
                labelBorderSide: ["left", "right"],
                labelColorSideReverse: "top",
                dividerSizeType: "height",
            },
            left: {
                className: "tabLabelLeft",
                labelColorSide: "left",
                labelBorderSide: ["top", "bottom"],
                labelColorSideReverse: "right",
                dividerSizeType: "width",
            },
            right: {
                className: "tabLabelRight",
                labelColorSide: "right",
                labelBorderSide: ["top", "bottom"],
                labelColorSideReverse: "left",
                dividerSizeType: "width",
            },
        };
        const truthy = ["1", "on", "true", "yes"];
        $body.addClass("tab");
        const getOwnPropertyNamesLength = (obj) => Reflect.ownKeys(obj).length;
        const toLowerFirstCase = (str) => str.substring(0, 1).toLowerCase() + str.substring(1);
        const toUpperFirstCase = (str) => str.substring(0, 1).toUpperCase() + str.substring(1);
        mw.hook("wikipage.content").add((content) => {
            content.find(".Tabs").each(function () {
                const self = $(this);
                if (self.children(".TabLabel")[0]) {
                    return true;
                }
                const classList = Array.from(this.classList).filter((n) => Reflect.has(defaultStyle, n));
                const data = $.extend({
                    labelPadding: "2px",
                    labelBorderColor: "#aaa",
                    labelColor: "green",
                    labelBackgroundColor: $("#content").css("background-color") || "rgba(247,251,255,0.8)",
                    textPadding: "20px 30px",
                    textBorderColor: "#aaa",
                    textBackgroundColor: "white",
                    defaultTab: 1,
                }, classList[0] ? defaultStyle[classList[0]] || {} : {}, this.dataset || {});
                const styleSheet = {
                    label: {},
                    text: {},
                };
                const tabLabel = self.append('<div class="TabLabel"></div>').children(".TabLabel"),
                    tabDivider = self.append('<div class="TabDivider"></div>').children(".TabDivider"),
                    tabContent = self.append('<div class="TabContent"></div>').children(".TabContent"),
                    labelPadding = data.labelPadding,
                    labelColor = data.labelColor,
                    labelSide = Reflect.has(sides, data.labelSide) ? data.labelSide : "top",
                    side = sides[labelSide],
                    labelColorSideReverse = truthy.includes(data.labelColorSideReverse),
                    dividerSize = parseInt(data.dividerSize);
                let defaultTab = parseInt(data.defaultTab);
                if (labelSide === "top") {
                    tabLabel.after(tabDivider);
                    tabDivider.after(tabContent);
                } else if (labelSide === "bottom") {
                    tabContent.after(tabDivider);
                    tabDivider.after(tabLabel);
                }
                if (!isNaN(dividerSize) && dividerSize > 0) {
                    self.find(".TabDivider")[side.dividerSizeType](dividerSize);
                }
                const labelColorName = toUpperFirstCase(labelColorSideReverse ? side.labelColorSideReverse : side.labelColorSide);
                self.addClass(side.className);
                if (labelColorSideReverse) {
                    self.addClass("reverse");
                }
                self.children(".Tab").each(function () {
                    if ($(this).children(".TabLabelText").text().replace(/\s/g, "").length || $(this).children(".TabLabelText").children().length) {
                        $(this).children(".TabLabelText").appendTo(tabLabel);
                        $(this).children(".TabContentText").appendTo(self.children(".TabContent"));
                    }
                    $(this).remove();
                });
                if (isNaN(defaultTab) || defaultTab <= 0 || defaultTab > tabLabel.children(".TabLabelText").length) {
                    defaultTab = 1;
                }
                tabLabel.children(".TabLabelText").on("click", function () {
                    const label = $(this);
                    label.addClass("selected").siblings().removeClass("selected").css({
                        "border-color": "transparent",
                        "background-color": "inherit",
                    });
                    tabContent.children(".TabContentText").eq(tabLabel.children(".TabLabelText").index(label)).addClass("selected").siblings().removeClass("selected").removeAttr("style");
                    if (getOwnPropertyNamesLength(styleSheet.label) > 0) {
                        label.css(styleSheet.label);
                    }
                    setTimeout(() => {
                        $window.triggerHandler("scroll");
                    }, 1);
                }).eq(defaultTab - 1).trigger("click");
                if (labelPadding) {
                    tabLabel.children(".TabLabelText").css("padding", labelPadding);
                }
                ["labelBorderColor", "labelBackgroundColor", "textPadding", "textBorderColor", "textBackgroundColor"].forEach((n) => {
                    const target = /^label/.test(n) ? "label" : "text",
                        key = toLowerFirstCase(n.replace(target, ""));
                    styleSheet[target][key] = data[n];
                });
                if (labelColor) {
                    styleSheet.label[`border${labelColorName}Color`] = labelColor;
                } else if (styleSheet.label.borderColor) {
                    styleSheet.label[`border${labelColorName}Color`] = "green";
                }
                tabLabel.find(".selected").trigger("click");
                if (getOwnPropertyNamesLength(styleSheet.text) > 0) {
                    tabContent.css(styleSheet.text);
                }
                if (data.autoWidth === "yes") {
                    self.addClass("AutoWidth");
                }
                if (data.float === "left") {
                    self.addClass("FloatLeft");
                }
                if (data.float === "right") {
                    self.addClass("FloatRight");
                }
            });
        });
    };
    /* T:注解 */
    $(".annotation").each((_, ele) => {
        const popup = new OO.ui.PopupWidget({
            $content: $(ele).children(".annotation-content"),
            padded: true,
            autoFlip: false,
        });
        $(ele)
            .append(popup.$element)
            .on("mouseover", () => {
                popup.toggle(true);
            })
            .on("mouseout", () => {
                popup.toggle(false);
            });
    });
    /* 修正嵌套使用删除线、黑幕、彩色幕和胡话模板 */
    const templateTags = ["s", "del"];
    const templateClasses = [".heimu", ".colormu", ".just-kidding-text"];
    const templateStr = [...templateTags, ...templateClasses].join(", ");
    /**
     * @param {JQuery<HTMLDivElement>} $content
     */
    const templateFix = ($content) => {
        const target = $();
        $content.find(templateStr).each((_, ele) => {
            if (ele.isTemplateFixed === "true") {
                return;
            }
            ele.isTemplateFixed = true;
            const subElements = Array.from(ele.querySelectorAll(templateStr));
            if (subElements.length > 0) {
                target.push(ele);
                subElements.forEach((subElement) => {
                    subElement.isTemplateFixed = true;
                    templateClasses.forEach((cls) => {
                        if (!isMGPMGUser) {
                            subElement.classList.remove(cls.substring(1));
                        }
                    });
                });
                console.info("TemplateFix", ele, subElements);
            }
        });
        if (wgNamespaceNumber >= 0 && wgNamespaceNumber % 2 === 0 && target.length > 0) {
            if (+mw.user.options.get("gadget-enable-nest-highlight", 0) === 1 || isMGPMGUser && !wgUserGroups.includes("staff")) {
                target.css("border", "3px dashed red");
            }
            if (isMGPMGUser && !wgUserGroups.includes("staff") && +mw.user.options.get("gadget-disable-nest-alert", 0) !== 1) {
                oouiDialog.alert(`本页面含有嵌套使用（混用）以下标签或模板的内容（已用红色虚线边框标识），请检查源码并修改之：<ul><li>删除线：<code>${oouiDialog.sanitize("<s>")}</code>、<code>${oouiDialog.sanitize("<del>")}</code>；</li><li>黑幕：<code>{{黑幕}}</code>、<code>{{Block}}</code>、<code>{{Heimu}}</code>；</li><li>彩色幕：<code>{{彩色幕}}</code>；</li><li>胡话：<code>{{胡话}}</code>、<code>{{jk}}</code>，大小写不限。</li></ul>`, {
                    title: "萌娘百科提醒您",
                    size: "medium",
                });
            }
        }
    };
    /* 修正验证码 */
    const tcc = async () => {
        const tcBtn = document.getElementById("TencentCaptchaBtn");
        if (tcBtn && !tcBtn.disabled) {
            const originText = tcBtn.innerText;
            tcBtn.innerText = "正在加载验证码，请稍候……";
            const wpCaptchaWord = document.getElementById("wpCaptchaWord");
            const wpCaptchaId = document.getElementById("wpCaptchaId");
            while (typeof window.TencentCaptcha !== "function") {
                await sleep(100);
            }
            if (!tcBtn.disabled) {
                new window.TencentCaptcha(tcBtn);
                tcBtn.innerText = originText;
            }
            document.getElementById("wpSave").addEventListener("click", (e) => {
                if (!tcBtn.disabled && (!wpCaptchaWord.value || !wpCaptchaId.value)) {
                    oouiDialog.alert("请点击验证按钮，完成验证后再提交");
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    e.stopPropagation();
                }
            }, {
                capture: true,
            });
        }
    };
    /* 域名跳转提示 */
    const domainChangedAlert = () => {
        $body.before('<div style="background: #3366CC; color: white; text-align: center; padding: .5rem; position: static;" id="domainChangedAlert"><p>萌娘百科已将域名替换为 <code>*.moegirl.org<b><u>.cn</u></b></code>，原有域名可能访问困难，请更换您的书签等的页面地址。</p></div>');
        $body.css({
            "background-position-y": $("#domainChangedAlert").outerHeight(),
            position: "relative",
        });
    };
    /* 水印 */
    // https://github.com/zloirock/core-js/blob/v3.29.1/packages/core-js/modules/es.unescape.js
    const hex2 = /^[\da-f]{2}$/i;
    const hex4 = /^[\da-f]{4}$/i;
    const unescapeString = (string) => {
        const str = `${string}`;
        let result = "";
        const length = str.length;
        let index = 0;
        let chr, part;
        while (index < length) {
            chr = str.charAt(index++);
            if (chr === "%") {
                if (str.charAt(index) === "u") {
                    part = str.slice(index + 1, index + 5);
                    if (hex4.exec(part)) {
                        result += String.fromCharCode(parseInt(part, 16));
                        index += 5;
                        continue;
                    }
                } else {
                    part = str.slice(index, index + 2);
                    if (hex2.exec(part)) {
                        result += String.fromCharCode(parseInt(part, 16));
                        index += 2;
                        continue;
                    }
                }
            }
            result += chr;
        }
        return result;
    };
    const createElement = Document.prototype.createElement.bind(document);
    const getAttribute = Element.prototype.getAttribute;
    const setAttribute = Element.prototype.setAttribute;
    const cloneNode = Node.prototype.cloneNode;
    const appendChild = Node.prototype.appendChild.bind(document.body);
    const contains = Node.prototype.contains.bind(document.body);
    const watermark = (txt, size) => {
        const styleString = `position: fixed !important; z-index: 99999 !important; inset: 0px !important; background-image: url("data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><foreignObject width="${size}" height="${size}"><html xmlns="http://www.w3.org/1999/xhtml" style="width: ${size}px; height: ${size}px;"><head></head><body style="width: ${size}px; height: ${size}px; margin: 0px;"><div style="width: 100% !important; height: 100% !important; opacity: .17 !important; font-size: 24px !important; position: relative !important; color: black !important;"><div style="transform: rotate(-15deg) translateX(-50%) translateY(-50%) !important; word-break: break-all !important; top: 36% !important; left: 50% !important; position: absolute !important; width: 100% !important; text-align: center !important;">${unescapeString(encodeURIComponent(txt))}</div></div></body></html></foreignObject></svg>`)}") !important; background-repeat: repeat !important; pointer-events: none !important; display: block !important; visibility: visible !important; width: unset !important; height: unset !important; opacity: unset !important; background-color: unset !important;`;
        const template = createElement("div");
        setAttribute.bind(template)("style", styleString);
        /**
         * @type { typeof template }
         */
        let ele = appendChild(cloneNode.bind(template)(true));
        setInterval(() => {
            const reasons = [];
            if (!contains(ele)) {
                reasons.push("not in body");
            }
            if (getAttribute.bind(ele)("style") !== styleString) {
                reasons.push("styleString not match");
            }
            if (reasons.length > 0) {
                console.info("[watermark] Recreate watermark:", reasons);
                try {
                    ele.remove();
                } catch { }
                ele = appendChild(cloneNode.bind(template)(true));
            }
        }, 1000);
    };
    /* 获取特定命名空间前缀正则表达式 */
    const getNamespacePrefixRegex = (namespaceNumber) => RegExp(`^(?:${Object.entries(mw.config.get("wgNamespaceIds")).filter((config) => config[1] === namespaceNumber).map((config) => config[0].toLowerCase()).join("|")}):`, "i");
    // 列表侧边距
    const listMarginLeft = () => {
        $(".mw-parser-output ul:not(.margin-left-set), .mw-parser-output ol:not(.margin-left-set), #mw-content-text > pre.prettyprint ul:not(.margin-left-set), #mw-content-text > pre.prettyprint ol:not(.margin-left-set)").each((_, ele) => {
            const $ele = $(ele);
            if (/none.+none/i.test($ele.css("list-style")) || $ele.is(".gallery")) {
                if ($ele.parent().is("li") && $ele.parent().parent().is("ul, ol")) {
                    $ele.css("margin-left", "1.2em");
                } else {
                    $ele.css("margin-left", "0.2em");
                }
            } else if ($ele.is("ol")) {
                const li = $ele.children("li");
                const start = $ele.attr("start");
                let max = /^\d+$/.test(start) ? +start : 0;
                li.each((_, e) => {
                    const value = $(e).attr("value");
                    if (/^\d+$/.test(value)) {
                        max = Math.max(max, +value);
                    } else {
                        max++;
                    }
                });
                $ele.attr("data-last-margin-left-max-length", max).css("margin-left", `${`${max}`.length * 0.5 + 1.2}em`);
            } else {
                $ele.css("margin-left", "1.2em");
            }
            $ele.addClass("margin-left-set");
        });
    };
    // 页面历史表单、日志部分按钮改为 post
    const historyForm = () => {
        const form = $("#mw-history-compare, #mw-log-deleterevision-submit");
        // form.find('[name="editchangetags"], [name="revisiondelete"]').attr("formmethod", "post"); // 不知为何，该方式不生效
        form.find('[name="editchangetags"], [name="revisiondelete"]').on("click", () => {
            form.attr("method", "post");
            setTimeout(() => {
                form.removeAttr("method");
            }, 16);
        });
    };
    // 小工具使用统计移除默认启用的小工具
    const gadgetUsageRemoveDefaultGadgets = () => {
        const defaultStrings = ["默认", "預設", "默認"];
        const defaultGadgets = [];
        const usageTable = document.querySelector(".mw-spcontent > table");
        for (const ele of usageTable.querySelectorAll("tr")) {
            const [{ innerText: gadgetName }, { innerText: usercount }, { innerText: activeusers }] = ele.children;
            if (defaultStrings.includes(usercount.trim()) && defaultStrings.includes(activeusers.trim())) {
                ele.style.display = "none";
                defaultGadgets.push(gadgetName);
            }
        }
        if (defaultGadgets.length > 0) {
            const div = document.createElement("div");
            const table = document.createElement("table");
            table.classList.add("wikitable");
            const caption = document.createElement("caption");
            caption.innerText = wgULS("默认小工具", "預設小工具");
            table.append(caption);
            const thead = document.createElement("thead");
            const headTr = document.createElement("tr");
            const th = document.createElement("th");
            th.innerText = "小工具";
            table.append(thead);
            thead.append(headTr);
            headTr.append(th);
            const tbody = document.createElement("tbody");
            table.append(tbody);
            for (const gadget of defaultGadgets) {
                const tr = document.createElement("tr");
                const td = document.createElement("td");
                td.innerText = gadget;
                tbody.append(tr);
                tr.append(td);
            }
            usageTable.before(div);
            div.append(usageTable);
            const usageCaption = document.createElement("caption");
            usageCaption.innerText = document.querySelector("#firstHeading").innerText;
            usageTable.append(usageCaption);
            div.append(table);
            div.style.display = "flex";
            div.style.flexWrap = "wrap";
            div.style.alignContent = "flex-start";
            div.style.justifyContent = "space-evenly";
            div.style.alignItems = "flex-start";
        }
    };

    await $.ready;

    /* 反嵌入反反代 */
    try {
        let substHost;
        try {
            substHost = top.location.host;
        } catch {
            substHost = "";
        }
        const currentHostFlag = !/\.moegirl\.org(?:\.cn)?$/i.test(location.host);
        if (top !== window || currentHostFlag) {
            /* let reverseProxyhostAlerted = [];
            if (localStorage.getItem("reverse proxy alerted") !== null) {
                try {
                    reverseProxyhostAlerted = JSON.parse(localStorage.getItem("reverse proxy alerted"));
                    if (!$.isPlainObject(reverseProxyhostAlerted)) {
                        reverseProxyhostAlerted = {};
                    }
                } catch (e) {
                    reverseProxyhostAlerted = {};
                }
            } */
            const detectedHost = currentHostFlag ? location.host : substHost;
            /* const now = new Date().getTime();
            if (!Reflect.has(reverseProxyhostAlerted, detectedHost) || typeof reverseProxyhostAlerted[detectedHost] !== "number" || reverseProxyhostAlerted[detectedHost] < now - 24 * 60 * 60 * 1000) {
                reverseProxyhostAlerted[detectedHost] = now; */
            oouiDialog.alert(`<p>您当前是在${currentHostFlag ? "非萌百域名" : "嵌套窗口"}访问，请注意不要在此域名下输入您的用户名或密码，以策安全！</p><p>${detectedHost ? `${currentHostFlag ? "当前" : "顶层窗口"}域名为 <code>${detectedHost}</code>，` : ""}萌百域名是以 <code>.moegirl.org.cn</code> 结尾的。</p>`, {
                title: "萌娘百科提醒您",
                size: "medium",
            });
            /* }
            localStorage.setItem("reverse proxy alerted", JSON.stringify(reverseProxyhostAlerted)); */
        } else if (!location.hostname.endsWith(".moegirl.org.cn")) {
            $(domainChangedAlert);
        }
    } catch (e) {
        console.debug(e);
    }
    tabs();
    // 图片地址
    setInterval(() => {
        $(document.querySelectorAll('img[src*="//img.moegirl.org/"]:not(.org-changed), img[src*="//commons.moegirl.org/"]:not(.org-changed)')).each((_, ele) => {
            try {
                const url = new URL(ele.src);
                if (["img.moegirl.org", "commons.moegirl.org"].includes(url.hostname)) {
                    url.hostname += ".cn";
                    ele.src = url;
                }
                ele.classList.add("org-changed");
            } catch { }
        });
    }, 200);
    // 修复错误嵌套模板
    mw.hook("wikipage.content").add(templateFix);
    // 仅在编辑界面修复验证码
    if (["edit", "submit"].includes(wgAction)) {
        tcc();
    }
    // 页面历史表单部分按钮改为 post
    if (wgAction === "history") {
        historyForm();
    }
    const needHashChange = /[)]$/.test(location.pathname + location.search);
    if (needHashChange) {
        const originHash = location.hash;
        location.hash = "%";
        location.hash = originHash;
    }
    $window.on("hashchange.hashchange", () => {
        const hash = decodeURIComponent(location.hash.replace(/^#/, ""));
        if (hash.length > 0) {
            const target = document.getElementById(hash);
            if (target) {
                const $target = $(target);
                const needScroll = true;
                const mwCollapsible = $target.closest(".mw-collapsible.mw-collapsed");
                if (mwCollapsible.length > 0) {
                    mwCollapsible.find(".mw-collapsible-toggle").first().triggerHandler("click");
                    // needScroll = false;
                }
                const tabContentTextUnselected = $target.closest(".TabContentText:not(.selected)");
                if (tabContentTextUnselected.length > 0) {
                    tabContentTextUnselected.closest(".Tabs").children(".TabLabel").children().eq(tabContentTextUnselected.index()).trigger("click");
                    // needScroll = false;
                }
                if (needScroll) {
                    setTimeout(() => {
                        $("html, body").scrollTop($target.offset().top - window.innerHeight / 8);
                    }, 50);
                }
            }
        }
    });
    $window.triggerHandler("hashchange.hashchange");
    // 列表侧边距
    setInterval(listMarginLeft, 200);
    ["copy", "keydown", "scroll", "mousemove"].forEach((type) => {
        document.addEventListener(type, () => {
            $(".mailSymbol").replaceWith('<span title="Template:Mail@">@</span>');
        }, {
            capture: true,
            passive: true,
        });
    });
    // 小工具使用统计移除默认启用的小工具
    if (mw.config.get("wgCanonicalSpecialPageName") === "GadgetUsage") {
        gadgetUsageRemoveDefaultGadgets();
    }
    // 水印
    const wgCurRevisionId = mw.config.get("wgCurRevisionId") || -1;
    const wgRevisionId = mw.config.get("wgRevisionId") || -1;
    if (!wgUserGroups.includes("autoconfirmed")) {
        if (wgCurRevisionId > 0 && wgRevisionId > 0 && wgCurRevisionId !== wgRevisionId) {
            watermark("历史版本，非最新内容<br/>不代表萌娘百科立场", 300);
        } else if ([2, 3].includes(wgNamespaceNumber)) {
            const wgPageName = mw.config.get("wgPageName");
            const namespacePrefixRegex = getNamespacePrefixRegex(wgNamespaceNumber);
            const displayedTitle = $("#firstHeading, #section_0").first().text().replace(/ /g, "_").replace(namespacePrefixRegex, "").trim();
            if (mw.config.get("wgAction") === "view" && mw.config.get("wgArticleId") > 0 && displayedTitle !== wgPageName.replace(/ /g, "_").replace(namespacePrefixRegex, "").trim()) {
                // await mw.loader.using(["mediawiki.api"]);
                const result = await new mw.Api().post({
                    action: "query",
                    prop: "info",
                    inprop: "varianttitles",
                    titles: wgPageName,
                });
                const matchTitles = Object.values(result.query.pages[mw.config.get("wgArticleId")].varianttitles).filter((title) => displayedTitle === title.replace(/ /g, "_").replace(namespacePrefixRegex, "").trim());
                if (matchTitles.length === 0) {
                    watermark("用户页面，非正式条目<br/>不代表萌娘百科立场", 300);
                }
            }
        }
    }
    // 可视化编辑器需要的脚本
    mw.hook("ve.activationComplete").add(() => {
        mw.loader.load("ext.gadget.edit");
    });
    $window.triggerHandler("resize");
    $window.on("load", () => {
        $window.triggerHandler("resize");
    });
})();
