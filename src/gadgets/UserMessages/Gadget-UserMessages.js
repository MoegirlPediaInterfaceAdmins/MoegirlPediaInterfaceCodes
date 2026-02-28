/* eslint-disable camelcase */
/**
 * @source https://commons.wikimedia.org/wiki/_?oldid=494706072
 * 更新后请同步更新上面链接到最新版本
 */
/**
 * https://commons.wikimedia.org/wiki/MediaWiki:Gadget-UserMessages.js
 */
"use strict";
(async () => {
    if (window.AxUserMsg || !mw.config.get("wgUserGroups").includes("patroller") && !mw.config.get("wgUserGroups").includes("sysop")) {
        return;
    }
    // alternative for jQuery UI autocomplete: jquery.suggestions
    // http://jqueryui.com/demos/autocomplete/ http://svn.wikimedia.org/viewvc/mediawiki/trunk/phase3/resources/jquery/jquery.suggestions.js?view=markup
    /* await mw.loader.using([
        "ext.gadget.jquery.ui",
        "mediawiki.util",
        "mediawiki.user",
        "user.options", // for sig
        "ext.gadget.libUtil",
        "ext.gadget.libJQuery",
    ]); */ // load by gadget's dependencies
    // 内置模板请在页中查找（搜索 `builtinTemplate`）
    class ClsUPC {
        pendingCalls = 0;
        pendingSetTimeouts = 0;
        oldValue = "";
        userNameExists = 2;
        constructor($userInputField, $outputField, stCallBack, callingObject, CBValidChange) {
            this.$userInputField = $userInputField;
            this.$outputField = $outputField;
            this.callingObject = callingObject;
            this.stCallBack = stCallBack;
            this.CBValidChange = CBValidChange;
            $userInputField.on("keyup", (/* e */) => {
                const tmpUNE = this.userNameExists;
                if (this.isValidIP($userInputField.val())) {
                    this.setToIP(tmpUNE);
                } else {
                    this.execApiCall(false, $userInputField.val());
                }
            });
            $userInputField.on("input", () => {
                $userInputField.trigger("keyup");
            });
            $userInputField.on("selected", () => {
                $userInputField.trigger("keyup");
            });
        }
        isValidIP = (username) => {
            if (mw.util.isIPv4Address(username)) {
                return true;
            } // IP v.4
            return mw.util.isIPv6Address(username); // IP v.6
        };
        setToIP(tmpUNE) {
            const o = this;
            o.userNameExists = -1;
            if ("function" === typeof o.CBValidChange && tmpUNE !== o.userNameExists) {
                o.$outputField.attr("src", o.callingObject.umImgUserIsIP);
                o.$outputField.attr("alt", "IP");
                o.$outputField.attr("width", "20");
                o.oldValue = o.callingObject.umCleanFileAndUser(o.$userInputField.val());
                o.CBValidChange(o, o.callingObject);
            }
        }
        execApiCall(isTimeout, val) {
            if (isTimeout) {
                this.pendingSetTimeouts--;
            }
            if (this.oldValue !== this.callingObject.umCleanFileAndUser(val)) {
                if (this.pendingCalls > 0) {
                    if (!this.pendingSetTimeouts) {
                        this.pendingSetTimeouts++;
                        const o = this;
                        setTimeout(() => {
                            o.execApiCall(true, o.$userInputField.val());
                        }, 1000); // do not use the old value, use the current instead
                    }
                    return;
                }
                const User = this.oldValue = this.callingObject.umCleanFileAndUser(val);
                const query = {
                    action: "query",
                    assertuser: mw.config.get("wgUserName"),
                    list: "allusers",
                    aufrom: User,
                    auto: User,
                };
                this.callingObject.umCurrentUserQuery = this;
                this.pendingCalls++;
                this.callingObject.doAPICall(query, this.stCallBack);
            }
        }
        evalAPICall(result) {
            this.pendingCalls--;
            const uifval = this.$userInputField.val();
            if (this.oldValue !== this.callingObject.umCleanFileAndUser(uifval)) {
                // Don't do anything if user updated the field in-between
                return;
            }
            if (this.isValidIP(uifval)) {
                return;
            }
            if ("object" === typeof result.query && "object" === typeof result.query.allusers) {
                const tmpUNE = this.userNameExists;
                if (!result.query.allusers.length) {
                    this.$outputField.attr("src", this.callingObject.umImgUserNotExists);
                    this.$outputField.attr("alt", "!! invalid !!");
                    this.$outputField.attr("width", "20");
                    this.userNameExists = false;
                } else {
                    if (this.callingObject.umCleanFileAndUser(this.$userInputField.val()) === result.query.allusers[0].name) {
                        this.$outputField.attr("src", this.callingObject.umImgUserExists);
                        this.$outputField.attr("alt", "OK");
                        this.$outputField.attr("width", "20");
                        this.userNameExists = true;
                    } else {
                        if (!this.pendingSetTimeouts) {
                            // Only overwrite if there is nothing pending
                            this.$outputField.attr("src", this.callingObject.umImgUserUndefined);
                            this.$outputField.attr("alt", "?");
                            this.$outputField.attr("width", "20");
                            this.userNameExists = 2;
                        }
                    }
                }
                if ("function" === typeof this.CBValidChange && tmpUNE !== this.userNameExists) {
                    this.CBValidChange(this, this.callingObject);
                }
            }
        }
    }
    const umsg = window.AxUserMsg = {
        umInstall: () => {
            if ($("#t-AjaxUserMessage").length === 0) {
                const $LODLinkNode = $("#t-AjaxUserMessageLOD");
                const $Href = $LODLinkNode.length ? $LODLinkNode.eq(0) : $(mw.util.addPortletLink("p-tb", "#", wgULS("向该用户发出提醒", "對此使用者發送提醒", null, null, "對此用戶發送提醒"), "t-AjaxUserMessage", "加载 UserMessages 小工具"));
                $Href.on("click", (e) => {
                    e.preventDefault();
                    umsg.fireImmediately = false;
                    umsg.umNotifyUser();
                });
            }
        },
        umInstallOldLinks: () => {
            // written for Herby, who needs this for working on Commons
            umsg.umTemplate.forEach((ti, id) => {
                // Create portlet link
                const portletLink = mw.util.addPortletLink("p-tb", `#${id}`, ti[1], `t-gadgetUserMessage${id}`, ti[2]);
                // Bind click handler
                $(portletLink).on("click", (e) => {
                    e.preventDefault();
                    window.AxUserMsgPreSelect = $(portletLink).find("a").attr("href").split("#")[1];
                    if (window.AxUserMsgFireAsYouClick) {
                        const umType = umsg.umTemplate[umsg.umSelect][3];
                        if (!(umType & umsg.umFlagUQ) && !(umType & umsg.umFlagRq)) {
                            umsg.fireImmediately = true;
                        } else {
                            umsg.fireImmediately = false;
                        }
                    }
                    umsg.umNotifyUser();
                });
            });
        },
        umNotifyUser: () => {
            // mw.util.addCSS('a.new{color:#B00 !important;}'); ??
            umsg.umUser = "";
            umsg.editToken = "";
            umsg.umDlgPresent = false;
            umsg.umExecuting = false;
            umsg.umPendingParser = 0;
            umsg.umPendingParserTimeouts = 0;
            umsg.umParserTimerID = 0;
            umsg.umDelay = window.AxUserMsgDelay || 100;
            umsg.umUserCache = {};
            umsg.umFileCache = {};
            umsg.umParserCache = {};
            umsg.focusOwner = "";
            umsg.umObtainEditToken();
            umsg.umUser = mw.libs.commons.guessUser();
            umsg.umDlg();
        },
        umFillSelect: (caller, o) => {
            const userstate = caller.userNameExists;
            o.umTemplate.forEach((currentTag, id) => {
                if ($(`#umOpt${id}`, o.$tagSelect).length === 0) {
                    // check wether to add
                    if (-1 === userstate && !(currentTag[3] & o.umFlagUM) || true === userstate && !(currentTag[3] & o.umFlagIP)) {
                        o.$tagSelect.append(`<option id="umOpt${id}" value="${id}">${mw.html.escape(`${currentTag[1]} - ${currentTag[2]}`)}</option>`);
                        return;
                    }
                } else {
                    // check wether to remove
                    if (-1 === userstate && currentTag[3] & o.umFlagUM || true === userstate && currentTag[3] & o.umFlagIP) {
                        $(`#umOpt${id}`, o.$tagSelect).remove();
                        return;
                    }
                }
            });
            if (-1 === userstate) {
                if (window.AxUserMsgPreSelectIP) {
                    o.$tagSelect.val(window.AxUserMsgPreSelectIP);
                }
            } else {
                o.$tagSelect.val(umsg.umSelect);
            }
            o.umValidateInput(o);
            o.$tagSelect.change();
        },
        umDlg: () => {
            const $win = $(window);
            umsg.dlg = $("<div>").html('<div id="AjaxUmContainer"></div>').dialog({
                modal: true,
                closeOnEscape: true,
                position: [Math.round(($win.width() - Math.min($win.width(), 850)) / 2), Math.round(($win.height() - Math.min($win.height(), 800)) / 2)],
                title: '用户讨论页留言小工具 - <span class="mw-parser-output"><a href="//commons.wikimedia.org/wiki/MediaWiki_talk:Gadget-UserMessages.js" target="_blank" rel="nofollow noreferrer noopener" class="external text">在维基共享报告错误和建议</a> | <a href="/Help:UserMessages%E5%B0%8F%E5%B7%A5%E5%85%B7" target="_blank" class="external text">点此查看帮助</a></span>',
                height: Math.min($win.height(), 800),
                width: Math.min($win.width(), 850),
                buttons: {
                    [umsg.i18n.submitButtonLabel]: () => {
                        try {
                            if (umsg.umIsValid) {
                                umsg.umNotifyUserExecute();
                            }
                        } catch (ex) {
                            umsg.fail(ex);
                        }
                    },
                    [umsg.i18n.cancelButtonLabel]: function () {
                        $(this).dialog("close");
                        console.info("[this.i18n.cancelButtonLabel]", this, umsg.dlg);
                    },
                },
                close: function () {
                    console.info("close", this, umsg.dlg);
                    $(this).dialog("destroy");
                    $(this).remove();
                    umsg.umDlgPresent = false;
                },
                open: function () {
                    const $dlg = $(this); // 不可去除
                    $dlg.parents(".ui-dialog").css({
                        position: "fixed", top: `${Math.round(($win.height() - Math.min($win.height(), 800)) / 2)}px`,
                    });
                },
            });
            umsg.umDlgPresent = true;
            if (umsg.dlg) {
                const $AjaxUmContainer = $("#AjaxUmContainer");
                $AjaxUmContainer.append(`<label for="umUser">${mw.html.escape(umsg.i18n.umFillInUser)}</label><br><input type="text" id="umUser" style="width: 95%;" value="${mw.html.escape(umsg.umUser)}"/>${umsg.umInitImgUserExists.replace("%ID%", "umUserExists")}<br><br>`);
                umsg.$tagSelect = $("<select>", {
                    size: "1",
                    id: "umTagToInsert",
                    style: "width: 99%;",
                });
                $AjaxUmContainer.append([
                    `<label for="umTagToInsert">${mw.html.escape(umsg.i18n.umSelectTag)}</label><br>`,
                    umsg.$tagSelect, "<br><br>",
                    `<span id="umMediaWrapper"><label for="umMedia">${mw.html.escape(umsg.i18n.umFillInMedia)}</label><br><input type="text" id="umMedia" style="width: 95%;" value="File:"/><br><br></span>`,
                    `<span id="umP2Wrapper"><label for="umP2">${mw.html.escape(umsg.i18n.umFillInAdditional)}</label><br><input type="text" id="umP2" style="width: 95%;"/><br><br></span>`,
                    `<span id="umP3Wrapper"><label for="umP3">${mw.html.escape(umsg.i18n.umFillInAdditional)}</label><br><input type="text" id="umP3" style="width: 95%;"/><br><br></span>`,
                    `<span id="umRelatedUserWrapper"><label for="umRelatedUser">${mw.html.escape(umsg.i18n.umFillInRelUser)}</label><br><input type="text" id="umRelatedUser" style="width: 95%;" value="User:"/>${umsg.umInitImgUserExists.replace("%ID%", "umRelatedUserExists")}<br><br></span>`,
                    `<span id="umSummaryWrapper"><label for="umSummary">${mw.html.escape(umsg.i18n.umFillInSummary)}</label><br><input type="text" id="umSummary" style="width: 95%;" value="摘要"/><br><br></span>`,
                    `<label for="umAddText">${mw.html.escape(umsg.i18n.umAddText)}</label><br><textarea id="umAddText" style="width: 95%; height: 5em;">${mw.html.escape(window.AxUserMsgCustomText || "")}</textarea><br><br>`,
                ]);
                umsg.talkTag = "";
                const $umMedia = $("#umMedia"),
                    $umP2 = $("#umP2"),
                    $umP3 = $("#umP3"),
                    $umUser = $("#umUser"),
                    $umRelatedUser = $("#umRelatedUser"),
                    $umSummary = $("#umSummary"),
                    $umAddText = $("#umAddText");
                umsg.uUPC = new ClsUPC($umUser, $("#umUserExists"), "umUserExistsCB", umsg, umsg.umFillSelect);
                umsg.ouUPC = new ClsUPC($umRelatedUser, $("#umRelatedUserExists"), "umUserExistsCB", umsg, umsg.umUserValidChange);
                const submitButton = $(".ui-dialog-buttonpane button:first");
                // guessing the related file thanks User:Platonides
                const guessFile = () => {
                    let f = mw.util.getParamValue("title", document.referrer);
                    if (f && /File:/.test(f)) {
                        return f;
                    }
                    f = mw.util.getParamValue("page", document.referrer);
                    if (f && /File:/.test(f)) {
                        return f;
                    }
                    f = mw.util.getParamValue("target", document.referrer);
                    if (f && /File:/.test(f)) {
                        return f;
                    }
                    const m = document.referrer.match(/File:(.+)/);
                    try {
                        if (m) {
                            if (/&.+=/.test(m[1])) {
                                return `File:${decodeURI(m[1]).match(/^(.+)&/)[1]}`;
                            }
                            return `File:${m[1]}`;
                        }
                    } catch {
                    }
                };
                const umFile = guessFile();
                if (umFile) {
                    $umMedia.val(decodeURIComponent(umFile).replace(/_/g, " "));
                }
                $umUser.on("keyup", () => {
                    $umUser.val($umUser.val().replace(/<|>|\^/g, ""));
                });
                $umUser.autocomplete({
                    minLength: 1,
                    source: (request, callback) => {
                        umsg.umSeekUsers(request, callback);
                    },
                    close: () => {
                        $umUser.triggerHandler("selected");
                    },
                });
                $umMedia.on("change", () => {
                    umsg.umValidateInput(umsg);
                });
                $umMedia.on("input", () => {
                    $umMedia.val($umMedia.val().replace(/<|>|\^/g, ""));
                    umsg.umValidateInput(umsg);
                });
                $umMedia.on("keyup", () => {
                    $umMedia.val($umMedia.val().replace(/<|>|\^/g, ""));
                });
                $umMedia.autocomplete({
                    minLength: 1,
                    source: (request, callback) => {
                        umsg.umSeekFiles(request, callback);
                    },
                    close: () => {
                        $umMedia.triggerHandler("input");
                    },
                });
                $umRelatedUser.on("keyup", () => {
                    $umRelatedUser.val($umRelatedUser.val().replace(/<|>|\^/g, ""));
                    umsg.umValidateInput(umsg);
                });
                $umRelatedUser.autocomplete({
                    minLength: 1,
                    source: (request, callback) => {
                        umsg.umSeekUsers(request, callback);
                    },
                    close: () => {
                        $umRelatedUser.triggerHandler("selected");
                    },
                });
                $umP2.on("change", () => {
                    umsg.umValidateInput(umsg);
                });
                $umP2.on("input", () => {
                    umsg.umValidateInput(umsg);
                });
                $umP3.on("change", () => {
                    umsg.umValidateInput(umsg);
                });
                $umP3.on("input", () => {
                    umsg.umValidateInput(umsg);
                });
                $umAddText.on("change", () => {
                    umsg.umValidateInput(umsg);
                });
                $umAddText.on("input", () => {
                    umsg.umValidateInput(umsg);
                });
                submitButton.trigger("focus");
                $AjaxUmContainer.append(umsg.umInstPrevContainer.clone().text("即时预览为空"));
                umsg.$tagSelect.on("change", () => {
                    const umType = umsg.umTemplate[$(umsg.$tagSelect).val()][3];
                    $umSummary.val(umsg.umTemplate[$("#umTagToInsert").val()][4] ? umsg.umTemplate[$("#umTagToInsert").val()][4] : `${umsg.umTemplate[$("#umTagToInsert").val()][2]}.`);
                    umsg.umValidateInput(umsg);
                    umsg.$tagSelect.combobox({
                        displaytext: umsg.$tagSelect.val() ? umsg.$tagSelect.children(":selected").text() : "",
                    });
                    if (umType & umsg.umFlagP2) {
                        $("#umP2Wrapper").show();
                        if (document.activeElement && $umUser.attr("id") !== document.activeElement.id) {
                            $("#umP2").trigger("select");
                        }
                    } else {
                        $("#umP2Wrapper").hide();
                    }
                    if (umType & umsg.umFlagP3) {
                        $("#umP3Wrapper").show();
                        if (document.activeElement && $umUser.attr("id") !== document.activeElement.id) {
                            $("#umP3").trigger("select");
                        }
                    } else {
                        $("#umP3Wrapper").hide();
                    }
                    if (umType & umsg.umFlagMQ) {
                        $("#umMediaWrapper").show();
                        if (document.activeElement && $umUser.attr("id") !== document.activeElement.id) {
                            $("#umMedia").trigger("select");
                        }
                    } else {
                        $("#umMediaWrapper").hide();
                    }
                    if (umType & umsg.umFlagUQ) {
                        $("#umRelatedUserWrapper").show();
                        if (document.activeElement && $umUser.attr("id") !== document.activeElement.id) {
                            $("#umMedia").trigger("select");
                        }
                    } else {
                        $("#umRelatedUserWrapper").hide();
                    }
                });
                umsg.$tagSelect.val(umsg.umSelect);
                $("#umUser").trigger("keyup");
                $("#umTagToInsert").combobox();
            }
        },
        umSeekUsers: (request, pCallback) => {
            const query = {
                action: "query",
                assertuser: mw.config.get("wgUserName"),
                list: "allusers",
                auprefix: request.term.replace(/^(?:User):/, ""),
            };
            umsg.doGetApiCall(query, "umSeekUsersCB", pCallback);
        },
        umSeekUsersCB: (result, pCallback) => {
            const searchTerms = [];
            result.forEach((usi) => {
                searchTerms.push({
                    id: usi.userid,
                    value: usi.name,
                });
            });
            if ("function" === typeof pCallback) {
                pCallback(searchTerms);
            }
        },
        umSeekFiles: (request, pCallback) => {
            const query = {
                action: "query",
                assertuser: mw.config.get("wgUserName"),
                list: "allimages",
                aiprefix: request.term.replace(/^(?:File|Image):/, ""),
            };
            umsg.doGetApiCall(query, "umSeekFilesCB", pCallback);
        },
        umSeekFilesCB: (result, pCallback) => {
            const searchTerms = [];
            result.forEach((fii) => {
                searchTerms.push({
                    id: fii.timestamp, value: `File:${fii.name}`,
                });
            });
            if ("function" === typeof pCallback) {
                pCallback(searchTerms);
            }
        },
        umUserExistsCB: (result) => {
            umsg.umCurrentUserQuery.evalAPICall(result);
        },
        umShowInfo: (info, o) => {
            $("#umInstantPreviewContainer").empty().html(`<p class="center"><img src="${o.umImgInfo}" width="64" height="64"/><br>${info}</p>`);
        },
        umValidateInput: (o) => {
            umsg.umIsValid = true;
            const umType = umsg.umTemplate[$("#umTagToInsert").val()][3];
            const submitButton = $(".ui-dialog-buttonpane button:first");
            const validRelatedUser = () => {
                if (umType & o.umFlagUQ) {
                    if (o.umCleanFileAndUser($("#umRelatedUser").val()).length < 1) {
                        o.umShowInfo("未指定相关用户", o);
                        return false;
                    }
                    if (!o.ouUPC.userNameExists) {
                        o.umShowInfo("所指定的相关用户不存在", o);
                        return false;
                    }
                }
                return true;
            };
            const validMedia = () => {
                if (umType & o.umFlagMQ) {
                    if (o.umCleanFileAndUser($("#umMedia").val()).length < 5 && umType & o.umFlagRq) {
                        o.umShowInfo("未指定文件，且强制检查已开启", o);
                        return false;
                    }
                }
                return true;
            };
            const validUser = () => {
                if (o.umCleanFileAndUser($("#umUser").val()).length < 1) {
                    o.umShowInfo("未指定用户", o);
                    return false;
                }
                if (!o.uUPC.userNameExists) {
                    o.umShowInfo("所指定的用户不存在", o);
                    return false;
                }
                return true;
            };
            umsg.umIsValid &&= validRelatedUser() && validMedia() && validUser();
            if (umsg.umIsValid) {
                submitButton.removeClass("ui-state-disabled");
                if (umType & umsg.umFlagMQ) {
                    umsg.talkTag = `\n{{subst:${umsg.umTemplate[$("#umTagToInsert").val()][0]}${umsg.umCleanFileAndUser($("#umMedia").val()) ? `|1=${umType & umsg.umFlagNS ? `File:${umsg.umCleanFileAndUser($("#umMedia").val())}` : $("#umMedia").val()}` : ""}`;
                } else if (umType & umsg.umFlagUQ) {
                    umsg.talkTag = `\n{{subst:${umsg.umTemplate[$("#umTagToInsert").val()][0]}|1=${umsg.umCleanFileAndUser($("#umRelatedUser").val())}`;
                } else {
                    umsg.talkTag = `\n{{subst:${umsg.umTemplate[$("#umTagToInsert").val()][0]}`;
                }
                let paramCount = (umType & umsg.umFlagUQ ? 1 : 0) + (umType & umsg.umFlagMQ ? 1 : 0);
                // cut of extra white space
                const sigText = "——~~~~";
                if (umType & umsg.umFlagP2) {
                    paramCount++;
                    umsg.talkTag += `|${paramCount}=${$("#umP2").val()}`;
                }
                if (umType & umsg.umFlagP3) {
                    paramCount++;
                    umsg.talkTag += `|${paramCount}=${$("#umP3").val()}`;
                }
                umsg.talkTag += "}}";
                if ("\n{{subst:}}" === umsg.talkTag) {
                    umsg.talkTag = "\n";
                }
                umsg.talkTag += `\n${$("#umAddText").val().replace(/~{3,5}$/, "")}${sigText}\n`;
                umsg.umParseTemplate(false);
                // If the user wants the old behaviour back, we fire immediately
                if (umsg.fireImmediately) {
                    umsg.umNotifyUserExecute();
                }
            } else {
                submitButton.addClass("ui-state-disabled");
            }
        },
        umUserValidChange: (_, o) => {
            o.umValidateInput(o);
        },
        umCleanFileAndUser: (input) => {
            let output = "";
            if (input) {
                output = input.replace(/_/g, " ").replace(/File:/g, "").replace(/Image:/g, "").replace(/User:/g, "").replace(/^\s+|\s+$/g, "");
                output = output.substring(0, 1).toUpperCase() + output.substring(1);
            }
            return output;
        },
        umParseTemplate: (viaSetTimeout) => {
            if (window.AxUserMsgNoParse) {
                return;
            }
            if (viaSetTimeout) {
                umsg.umPendingParserTimeouts--;
            }
            if (umsg.umPendingParser > 0) {
                if (!umsg.umPendingParserTimeouts) {
                    // call me later
                    const o = umsg;
                    umsg.umPendingParserTimeouts++;
                    setTimeout(() => {
                        o.umParseTemplate(true);
                    }, 300);
                }
                return;
            }
            const maybeParse = () => {
                umsg.umPendingParser++;
                const action = {
                    action: "parse",
                    assertuser: mw.config.get("wgUserName"),
                    uselang: mw.config.get("wgUserLanguage"),
                    prop: "text",
                    pst: true,
                    title: umsg.umUserTalkPrefix + $("#umUser").val(),
                    text: umsg.talkTag,
                };
                umsg.umDelay = Math.min(umsg.umDelay + 30, 1500); // Save server resources.
                umsg.doAPICall(action, "umParsedTemplate");
            };
            if (umsg.umParserTimerID) {
                clearTimeout(umsg.umParserTimerID);
            }
            umsg.umParserTimerID = setTimeout(maybeParse, umsg.umDelay);
        },
        umParsedTemplate: (result) => {
            umsg.umPendingParser--;
            if ("object" === typeof result.parse && "object" === typeof result.parse.text && umsg.umDlgPresent && !umsg.umExecuting && umsg.umIsValid) {
                let $containerText = result.parse.text["*"].replace(" API", ` ${umsg.umCleanFileAndUser($("#umUser").val())}`).replace(">API", `>${umsg.umCleanFileAndUser($("#umUser").val())}`);
                $containerText = $($containerText);
                $(".editsection", $containerText).remove();
                $("a", $containerText).attr("target", "_blank");
                $("#umInstantPreviewContainer").empty().append($containerText).resizable({
                    alsoResize: "#AjaxUmContainer",
                });
            }
        },
        umObtainEditToken: () => {
            if (mw.user && mw.user.tokens) {
                umsg.editToken = mw.user.tokens.get("csrfToken");
            }
            umsg.editToken ||= mw.user.isAnon() ? "+\\" : "";
            if (umsg.editToken) {
                return;
            }
            const query = {
                action: "query",
                assertuser: mw.config.get("wgUserName"),
                prop: "info",
                intoken: "edit",
                titles: "FAQ", // Random title
            };
            umsg.doAPICall(query, "umObtainEditTokenCB");
        },
        umObtainEditTokenCB: (result) => {
            const pages = result.query.pages;
            for (const id in pages) {
                // there should be only one, but we don't know its ID
                if (Object.hasOwnProperty.bind(pages)(id)) {
                    umsg.editToken = pages[id].edittoken;
                }
            }
        },
        umNotifyUserExecute: () => {
            if (umsg.umExecuting) {
                return;
            }
            umsg.pageName = umsg.umUserTalkPrefix + $("#umUser").val();
            umsg.talkSummary = $("#umSummary").val();
            umsg.appendTemplate();
        },
        appendTemplate: () => {
            const page = [];
            page.title = umsg.pageName;
            page.text = umsg.talkTag;
            page.editType = "appendtext";
            if (window.AjaxDeleteWatchFile) {
                page.watchlist = "watch";
            }
            umsg.umExecuting = true;
            $("#umInstantPreviewContainer").empty().html('<p class="center"><img src="https://storage.moegirl.org.cn/moegirl/commons/d/d1/Windows_10_loading.gif"/></p>');
            umsg.savePage(page, umsg.talkSummary, "umNotifyUserExecuteCB");
        },
        savePage: (page, summary, callback) => {
            const edit = {
                action: "edit",
                assertuser: mw.config.get("wgUserName"),
                summary: summary,
                tags: "UserMessages",
                watchlist: page.watchlist || "preferences",
                title: page.title,
            };
            edit[page.editType] = page.text;
            edit.token = umsg.editToken;
            umsg.doAPICall(edit, callback);
        },
        umNotifyUserExecuteCB: (/* result */) => {
            let encTitle = umsg.umUserTalkPrefix + $("#umUser").val();
            encTitle = encodeURIComponent(encTitle.replace(/ /g, "_")).replace(/%2F/ig, "/").replace(/%3A/ig, ":");
            const newLoc = `${mw.config.get("wgServer")}${mw.config.get("wgArticlePath").replace("$1", encTitle)}`;
            if (window.location.pathname === mw.config.get("wgArticlePath").replace("$1", encTitle)) {
                window.location.hash = "#footer";
                window.location.reload();
            } else {
                window.location.href = `${newLoc}#footer`;
            }
            umsg.umExecuting = false;
        },
        doGetApiCall: (params, callback, pCallback) => {
            // Local Cache
            if (params.list) {
                if ("allusers" === params.list) {
                    if (Reflect.has(umsg.umUserCache, params.auprefix)) {
                        umsg[callback](umsg.umUserCache[params.auprefix], pCallback);
                        return;
                    }
                } else if ("allimages" === params.list) {
                    if (Reflect.has(umsg.umFileCache, params.aiprefix)) {
                        umsg[callback](umsg.umFileCache[params.aiprefix], pCallback);
                        return;
                    }
                }
            }
            params.format = "json";
            $.ajax({
                url: umsg.apiURL,
                cache: true,
                dataType: "json",
                data: params,
                type: "GET",
                async: true,
                success: (result) => {
                    if (!result) {
                        if ("function" === typeof pCallback) {
                            pCallback();
                        }
                        return;
                    }
                    try {
                        if (params.list) {
                            if ("allusers" === params.list) {
                                // cache the result
                                umsg.umUserCache[params.auprefix] = result.query.allusers;
                                umsg[callback](result.query.allusers, pCallback);
                                return;
                            }
                        }
                        if (params.list) {
                            if ("allimages" === params.list) {
                                // cache the result
                                umsg.umFileCache[params.aiprefix] = result.query.allimages;
                                umsg[callback](result.query.allimages, pCallback);
                                return;
                            }
                        }
                        // This is a "must", the doc sais
                        if ("function" === typeof pCallback) {
                            pCallback();
                        }
                        umsg[callback](result);
                    } catch (e) {
                        return umsg.fail(e);
                    }
                },
                error: () => {
                    // This is a "must", the doc sais
                    if ("function" === typeof pCallback) {
                        pCallback();
                    }
                },
            });
        },
        doAPICall: (params, callback) => {
            if (params.action) {
                if ("parse" === params.action) {
                    if (Reflect.has(umsg.umParserCache, params.text)) {
                        umsg[callback](umsg.umParserCache[params.text]);
                        return;
                    }
                }
            }
            params.format = "json";
            $.ajax({
                url: umsg.apiURL,
                cache: false,
                dataType: "json",
                data: params,
                type: "POST",
                success: (result, _, x) => {
                    if (!result) {
                        return umsg.fail(`API 响应为空：\n${x.responseText}`);
                    }
                    // In case we get the mysterious 231 unknown error, just try again
                    if (result.error && result.error.info.includes("231")) {
                        return setTimeout(() => {
                            umsg.doAPICall(params, callback);
                        }, 500);
                    }
                    if (result.error) {
                        return umsg.fail(`API 请求返回失败结果 (${result.error.code})：${result.error.info}`);
                    }
                    if (result.edit && result.edit.spamblacklist) {
                        return umsg.fail(`此次编辑因 ${result.edit.spamblacklist} 被列入黑名单而失败`);
                    }
                    if (params.action) {
                        if ("parse" === params.action) {
                            umsg.umParserCache[params.text] = result;
                        }
                    }
                    try {
                        umsg[callback](result);
                    } catch (e) {
                        return umsg.fail(e);
                    }
                },
                error: (x, status, error) => umsg.fail(`API 请求遭遇网络错误：状态码为 【${x.status}】，状态文本为 【${status}】，错误信息为 【${error}】`),
            });
        },
        fail: (_err) => {
            let err;
            if ("object" === typeof _err) {
                let stErr = `${mw.html.escape(_err.message)}<br>${_err.name}`;
                if (_err.lineNumber) {
                    stErr += ` @line${_err.lineNumber}`;
                }
                if (_err.line) {
                    stErr += ` @line${_err.line}`;
                }
                err = stErr;
            } else {
                err = mw.html.escape(_err.toString());
            }
            if (umsg.umDlgPresent) {
                $("#umInstantPreviewContainer").empty().html(`<p class="center"><img src="${umsg.umImgErr}" width="64" height="64"/></p><br>小工具发生错误：<br>${mw.html.escape(err)}`);
            } else {
                mw.notify(`小工具发生错误：${err}`);
            }
        },
        i18n: {
            umFillInUser: "请填写需要留言的用户名：",
            umSelectTag: "请选择需要使用的模板，可填入文本来搜索模板：",
            umFillInMedia: "请选择与本留言有关的文件（命名空间会自动处理）：",
            umFillInAdditional: "所选模板需要额外参数，请在此填写。",
            umFillInRelUser: "请填写相关用户的用户名",
            umFillInSummary: "编辑摘要",
            umAddText: "请填写额外信息：",
            submitButtonLabel: "留言",
            cancelButtonLabel: "取消",
        },
        umInstPrevContainer: $("<div>", {
            id: "umInstantPreviewContainer", style: "background-color:#EFD;height:380px;overflow:scroll;vertical-align:middle;",
        }),
        umInitImgUserExists: '<img id="%ID%" src="https://storage.moegirl.org.cn/moegirl/commons/4/42/P_no.svg" width="20" alt="?"/>',
        umImgUserUndefined: "https://storage.moegirl.org.cn/moegirl/commons/4/42/P_no.svg",
        umImgUserNotExists: "https://storage.moegirl.org.cn/moegirl/commons/4/42/P_no.svg",
        umImgUserExists: "https://storage.moegirl.org.cn/moegirl/commons/b/be/P_yes.svg",
        umImgUserIsIP: "https://storage.moegirl.org.cn/moegirl/commons/7/7e/OOjs_UI_icon_userAnonymous.svg",
        umImgErr: "https://storage.moegirl.org.cn/moegirl/commons/7/7f/Dialog-error.svg",
        umImgWarn: "https://storage.moegirl.org.cn/moegirl/commons/b/bc/Commons-emblem-issue.svg",
        umImgInfo: "https://storage.moegirl.org.cn/moegirl/commons/2/28/Commons-emblem-notice.svg",
        umFlagMQ: 0b00000001, // Media Query
        umFlagUQ: 0b00000010, // Username Query
        umFlagRq: 0b00000100, // Required - must filled in
        umFlagNS: 0b00001000, // Add Namespace
        umFlagP2: 0b00010000, // add a universal parameter
        umFlagP3: 0b00100000, // add a universal parameter
        umFlagIP: 0b01000000, // Message for IP only
        umFlagUM: 0b10000000, // User message only
        umFlagRqMqNs: 0b00001101, // Combination of (umFlagRq | umFlagMQ | umFlagNS)
        umUserTalkPrefix: `${mw.config.get("wgFormattedNamespaces")[3]}:`,
        apiURL: mw.util.wikiScript("api"),
    };
    const builtinTemplate = [
        /*! !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
         * Append new messages at the bottom. Otherwise pre-selection for users will break.
         !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! */
        //  ['Template name',             "Name in Sidebar", "Detailed text",                                                                          Type/Prompt statement,           'Talk summary'];
        ["UserMessages/Welcome", "Welcome", "欢迎新用户～", umsg.umFlagUM, "Welcome to Moegirlpedia~"],
        ["UserMessages/GoodEditor", "GoodEditor", "优质编辑者（1=选填原因）", umsg.umFlagP2, "恭喜您成为萌娘百科优质编辑者！"],
        ["UserMessages/MovedToUserSubpage", "MovedToUserSubpage", "可收录的页面打回至用户子页面（1=页面名，2=原因）", umsg.umFlagP2 + umsg.umFlagP3, "页面打回通知"],
        ["UserMessages/MovedToUserSubpage2", "MovedToUserSubpage", "不在收录范围内的页面打回至用户子页面（1=页面名，2=原因）", umsg.umFlagP2 + umsg.umFlagP3, "页面打回通知"],
        ["UserMessages/ArticleCopyright", "ArticleCopyrightInfringement", "著作权侵犯（1=页面名，2=选填站点）", umsg.umFlagP2 + umsg.umFlagP3, "请勿侵犯著作权"],
        ["UserMessages/FalseInformation", "AddFalseInformation", "添加不实信息（1=页面名）", umsg.umFlagP2, "请勿添加不实信息"],
        ["UserMessages/WikiMarkupLanguage", "WikiMarkupLanguage", "需要学习Wiki语法", umsg.umFlagUM, "关于Wiki语法"],
        ["UserMessages/CutAndPasteMoving", "C&Pmoving", "剪贴移动提醒（1=页面名）", umsg.umFlagP2, "请勿剪切移动页面"],
        ["UserMessages/EditUserPage", "EditUserPage", "编辑他人用户页面（1=页面名）", umsg.umFlagP2, "请勿编辑他人用户页面"],
        ["UserMessages/HumorTemplate", "HumorTemplate", "滥用幽默模板（1=选填页面名，2=选填行为）", umsg.umFlagP2 + umsg.umFlagP3, "关于幽默模板的使用"],
        ["UserMessages/ConversionViolation", "ConversionViolation", "违规字词转换（1=选填页面名，2=选填行为）", umsg.umFlagP2 + umsg.umFlagP3, "关于您近期的编辑"],
        ["UserMessages/FileLicense", "IncorrrectFileLicense", "文件授权协议错误（1=文件名）", umsg.umFlagMQ, "关于您近期上传的文件"],
        ["UserMessages/FileLicense2", "IncorrrectFileLicense2", "截图文件授权协议错误（1=文件名）", umsg.umFlagMQ, "关于您近期上传的截图文件"],
        ["UserMessages/UserFile", "UserFile", "用户文件（请在额外信息处填写文件列表）", umsg.umFlagUM, "关于您上传的文件"],
        ["UserMessages/DiscussionViolation", "DiscussionViolation", "修改历史发言（1=选填页面名或差异）", umsg.umFlagP2, "关于您在讨论区的发言"],
        ["UserMessages/DiscussionViolation2", "DiscussionViolation2", "违反讨论区管理方针（1=页面名或差异，2=原因）", umsg.umFlagP2 + umsg.umFlagP3, "关于您在讨论区的发言"],
        ["UserMessages/DiscussionViolation3", "DiscussionViolation3", "删除历史发言（1=选填页面名或差异）", umsg.umFlagP2, "关于您在讨论区的行为"],
        ["UserMessages/PersonalAttacks", "PersonalAttacks", "人身攻击提醒（1=页面名，2=选填用户）", umsg.umFlagP2 + umsg.umFlagP3, "请勿人身攻击"],
        ["UserMessages/PersonalAttacks2", "PersonalAttacks", "人身攻击警告（仅适用于讨论区人身攻击）", umsg.umFlagUM, "人身攻击警告"],
        ["UserMessages/Signature", "NoSignature", "讨论时未签名（1=页面名）", umsg.umFlagP2, "关于您的签名"],
        ["UserMessages/Signature2", "WrongSignature", "签名违反讨论区管理方针", umsg.umFlagP2, "关于您的签名"],
        ["UserMessages/EditWar", "EditWar", "通知编辑战参与者（1=页面名）", umsg.umFlagP2, "提醒您参与讨论"],
        ["UserMessages/EditWar2", "EditWar", "提醒即将构成编辑战（1=页面名）", umsg.umFlagP2, "编辑战提醒"],
        ["UserMessages/EditWar3", "EditWar", "警告编辑战用户（1=页面名，2=选填原因）", umsg.umFlagP2 + umsg.umFlagP3, "编辑战警告"],
        ["UserMessages/FinalWarning", "FinalWarning", "忍耐是有限的（1/2=选填原因，推荐在额外信息填写）", umsg.umFlagP2 + umsg.umFlagP3, "警告：忍耐是有限的"],
        ["UserMessages/NavSort", "NavSort", "大家族模板排序错误（1=页面名）", umsg.umFlagP2, "关于大家族模板的排序"],
        ["UserMessages/ReplyNoIndentation", "ReplyNoIndentation", "回复他人发言未缩进（1=页面名，2=被回复人）", umsg.umFlagP2 + umsg.umFlagP3, "关于您在讨论区的发言"],
        ["UserMessages/OverSpeedEdit", "OverSpeedEdit", "超速编辑", umsg.umFlagUM, "关于您近期的编辑"],
    ];
    const placeholderTemplate = ["", "请选择一个模板（本选项不可使用）", "给你的新留言~", 0];
    Object.defineProperties(umsg, {
        umTemplate: {
            get: () => {
                if (!Array.isArray(window.AxUserMsgCustomTemplate)) {
                    window.AxUserMsgCustomTemplate = [];
                }
                const result = [
                    ...window.AxUserMsgUseBuiltinTemplate !== false ? builtinTemplate : [],
                    ...window.AxUserMsgCustomTemplate,
                    placeholderTemplate,
                ];
                result.push = (...args) => window.AxUserMsgCustomTemplate.push(...args);
                return result;
            },
            configurable: false,
            enumerable: true,
        },
        umSelect: {
            get: () => {
                if (Number.isSafeInteger(window.AxUserMsgPreSelect) && window.AxUserMsgPreSelect >= 0 && window.AxUserMsgPreSelect < umsg.umTemplate.length) {
                    return window.AxUserMsgPreSelect;
                }
                return umsg.umTemplate.indexOf(placeholderTemplate);
            },
            configurable: false,
            enumerable: true,
        },
    });
    /**
     * A custom widget built by composition of Autocomplete and Button.
     * You can either type something into the field to get filtered suggestions based on your input,
     * or use the button to get the full list of selections.
     *
     * The input is read from an existing select-element for progressive enhancement,
     * passed to Autocomplete with a customized source-option.
     *
     * Author: someone from the jQuery UI-Team?
     * slightly altered
    **/
    const initCombobox = ($) => {
        $.widget("ui.combobox", {
            // These options will be used as defaults
            options: {
                displaytext: "",
                emptyMessage: 42,
                passEnter: true,
                shutOff: window.AxUserMsgUseSelect,
            },
            // Use the _setOption method to respond to changes to options
            _setOption: function (key, value, ...args) {
                if (this.options.shutOff) {
                    return;
                }
                switch (key) {
                    case "displaytext":
                        this.input.val(value);
                        break;
                    case "passEnter":
                        this.options.passEnter = value;
                        break;
                }
                // In jQuery UI 1.8, you have to manually invoke the _setOption method from the base widget
                $.Widget.prototype._setOption.bind(this)(key, value, ...args);
            },
            _create: function () {
                if (this.options.shutOff) {
                    return;
                }
                const self = this,
                    select = this.element.hide(),
                    selectWidth = select.width(),
                    selectId = select.attr("id"),
                    selected = select.children(":selected"),
                    value = selected.val() ? selected.text() : "",
                    ownId = `j${Math.floor(Math.random() * 10000000000)}`;
                let selectLabels,
                    isOpen = false,
                    valid = true;
                if (selectId) {
                    selectLabels = $(`label[for="${selectId}"]`);
                }
                const portMessure = this.portMessure = $("<div>", {
                    id: `${ownId}vp`,
                }).css({
                    position: "fixed", top: "0", height: "0",
                });
                $("body").append(portMessure);
                const input = this.input = $("<input>", {
                    id: ownId,
                }).insertAfter(select).val(value).autocomplete({
                    delay: 0,
                    minLength: 0,
                    source: (request, response) => {
                        let i = 0;
                        const matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), "i");
                        response(select.children("option").map((_, ele) => {
                            if (i > (window.AxUserMsgMaxSelect || 20) && request.term) {
                                return;
                            }
                            const text = $(ele).text();
                            if (ele.value && (!request.term || matcher.test(text))) {
                                i++;
                                return {
                                    label: text.replace(
                                        new RegExp(
                                            `(?![^&;]+;)(?!<[^<>]*)(${$.ui.autocomplete.escapeRegex(request.term)
                                            })(?![^<>]*>)(?![^&;]+;)`, "gi",
                                        ), "<b>$1</b>"),
                                    value: text,
                                    option: ele,
                                };
                            }
                        }));
                    },
                    select: (event, ui) => {
                        ui.item.option.selected = true;
                        self._trigger("selected", event, {
                            item: ui.item.option,
                        });
                        select.triggerHandler("change");
                    },
                    change: function (_, ui) {
                        setTimeout(() => {
                            console.info("change", input, this, ui);
                        }, 16);
                        if (!ui.item) {
                            const matcher = new RegExp(`^${$.ui.autocomplete.escapeRegex($(this).val())}$`, "i");
                            valid = false;
                            select.children("option").each((_, ele) => {
                                if ($(ele).text().match(matcher)) {
                                    ele.selected = valid = true;
                                    return false;
                                }
                            });
                            if (!valid) {
                                // remove invalid value, as it didn't match anything
                                $(this).val("");
                                input.data("autocomplete").term = "";
                                select.val(self.options.emptyMessage);
                                select.triggerHandler("change");
                                return false;
                            }
                            select.triggerHandler("change");
                        }
                    },
                    create: function () {
                        const $this = $(this); // 不可去除
                        const t_top = $this.offset().top - portMessure.offset().top;
                        $(".ui-autocomplete.ui-menu").css({
                            position: "fixed",
                            overflow: "auto",
                            "max-height": `${Math.round($(window).height() - t_top - $this.height() - 20)}px`,
                        });
                    },
                    close: () => {
                        setTimeout(() => {
                            isOpen = false;
                        }, 1);
                    },
                    open: function () {
                        setTimeout(() => {
                            console.info("open", input, this);
                        }, 16);
                        isOpen = true;
                        const _t = $(this),
                            t_top = _t.offset().top - portMessure.offset().top;
                        $(".ui-autocomplete.ui-menu").css({
                            position: "fixed",
                            "max-height": `${Math.round($(window).height() - t_top - _t.height() - 20)}px`,
                        });
                    },
                }).addClass("ui-widget ui-widget-content ui-corner-left").css("width", `${selectWidth - 70}px`).on("click", () => {
                    $(input).trigger("select");
                }).on("keydown", (e) => {
                    if (self.options.passEnter && 13 === e.which && !isOpen && valid) {
                        const kup = $.Event("keyup");
                        kup.ctrlKey = false;
                        kup.keyCode = kup.which = 13;
                        select.triggerHandler(kup);
                    }
                });
                if (selectLabels) {
                    selectLabels.attr("for", ownId);
                }
                input.data("autocomplete")._renderItem = (ul, item) => $("<li>").data("item.autocomplete", item).append(`<a>${item.label}</a>`).appendTo(ul);
                this.button = $("<button>", {
                    tabIndex: -1,
                    type: "button",
                    text: "&nbsp;",
                    title: "Show All Items",
                    style: "height:1.5em;padding:0!important;width:20px;margin:0!important;position:relative;top:-2px;",
                }).insertAfter(input).button({
                    icons: {
                        primary: "ui-icon-triangle-1-s",
                    },
                    text: false,
                }).removeClass("ui-corner-all").addClass("ui-corner-right ui-button-icon").on("click", () => {
                    // close if already visible
                    if (input.autocomplete("widget").is(":visible")) {
                        input.autocomplete("close");
                        return;
                    }
                    // work around a bug (likely same cause as #5265)
                    this.button.blur();
                    // pass empty string as value to search for, displaying all results
                    input.autocomplete("search", "");
                    input.focus();
                });
            },
            destroy: function () {
                if (this.options.shutOff) {
                    return;
                }
                this.input.remove();
                this.portMessure.remove();
                this.button.remove();
                this.element.show();
                $.Widget.prototype.destroy.bind(this)();
            },
        });
    };
    const linktext = wgULS("向该用户发出提醒", "對此使用者發送提醒", null, null, "對此用戶發送提醒"), nsNr = mw.config.get("wgNamespaceNumber");
    if (nsNr === 3 || nsNr === 2
        || nsNr === -1
        && ["Contributions", "DeletedContributions", "Block", "CentralAuth", "Userrights", "Listfiles", "Log"].includes(mw.config.get("wgCanonicalSpecialPageName"))) {
        const loadFullScript = () => {
            initCombobox($);
            umsg.umInstall();
            if (window.installOldLinks) {
                umsg.umInstallOldLinks();
            }
            $(document).triggerHandler("scriptLoaded", ["AxUserMsg", umsg]);
        };
        if (window.installOldLinks || window.AxUserMsgFireAsYouClick) {
            if (window.AxUserMsgFireAsYouClick) {
                window.installOldLinks = true;
            }
            // User wants old links - therefore we have to load the whole script each time
            loadFullScript();
            return;
        }
        await $.ready;
        if (window.installOldLinks || window.AxUserMsgFireAsYouClick) {
            if (window.AxUserMsgFireAsYouClick) {
                window.installOldLinks = true;
            }
            // User js was loaded later, so do it now!
            loadFullScript();
            return;
        }
        if ($("#t-AjaxUserMessage").length === 0 && $("#t-AjaxUserMessageLOD").length === 0) {
            const pHref = mw.util.addPortletLink("p-tb", "#", linktext, "t-AjaxUserMessageLOD", "加载 UserMessages 小工具");
            if (!pHref) {
                mw.notify("UserMessages 小工具：无法添加小工具链接入口!");
            }
            const $pHref = $(pHref);
            $pHref.on("click.umBootStrap", (e) => {
                let $linknode = $pHref.find("a");
                if ($linknode.length === 0) {
                    $linknode = $pHref;
                }
                e.preventDefault();
                $linknode.text("加载中……");
                $(document).on("scriptLoaded", (_, st, o) => {
                    if (st) {
                        if (st === "AxUserMsg" && o) {
                            $linknode.text(linktext);
                            o.umNotifyUser();
                        }
                    }
                });
                $pHref.off("click.umBootStrap");
                loadFullScript();
            });
        }
    } // Namespace Guard
})();
