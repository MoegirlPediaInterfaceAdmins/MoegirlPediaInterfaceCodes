// <pre>
/**
 * -------------------------------------------------------------------------
 * !!! DON'T MODIFY THIS PAGE MANUALLY, YOUR CHANGES WILL BE OVERWRITTEN !!!
 * -------------------------------------------------------------------------
 */
var _addText = '{{GHIACode|page=GHIA:MoegirlPediaInterfaceCodes/blob/master/src/gadgets/UserMessages/MediaWiki:Gadget-AxUserMsg.js|user=[[U:Leranjun]]|longId=e7e8f056bbb71b49e56fbc5448c84003bfcb3f40|shortId=e7e8f05|message=fix: fix OOUI focus error}}';
"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
(function () {
    if (window.AxUserMsg || !mw.config.get("wgUserGroups").includes("patroller") && !mw.config.get("wgUserGroups").includes("sysop")) {
        return;
    }
    var ClsUPC = (function () {
        function ClsUPC($userInputField, $outputField, stCallBack, callingObject, CBValidChange) {
            var _this = this;
            this.pendingCalls = 0;
            this.pendingSetTimeouts = 0;
            this.oldValue = "";
            this.userNameExists = 2;
            this.$userInputField = $userInputField;
            this.$outputField = $outputField;
            this.callingObject = callingObject;
            this.stCallBack = stCallBack;
            this.CBValidChange = CBValidChange;
            $userInputField.on("keyup", function () {
                var tmpUNE = _this.userNameExists;
                if (_this.isValidIP($userInputField.val())) {
                    _this.setToIP(tmpUNE);
                }
                else {
                    _this.execApiCall(false, $userInputField.val());
                }
            });
            $userInputField.on("input", function () {
                $userInputField.trigger("keyup");
            });
            $userInputField.on("selected", function () {
                $userInputField.trigger("keyup");
            });
        }
        ClsUPC.prototype.isValidIP = function (username) {
            if (mw.util.isIPv4Address(username)) {
                return true;
            }
            return mw.util.isIPv6Address(username);
        };
        ClsUPC.prototype.setToIP = function (tmpUNE) {
            var o = this;
            o.userNameExists = -1;
            if ("function" === typeof o.CBValidChange && tmpUNE !== o.userNameExists) {
                o.$outputField.attr("src", o.callingObject.umImgUserIsIP);
                o.$outputField.attr("alt", "IP");
                o.oldValue = o.callingObject.umCleanFileAndUser(o.$userInputField.val());
                o.CBValidChange(o, o.callingObject);
            }
        };
        ClsUPC.prototype.execApiCall = function (isTimeout, val) {
            if (isTimeout) {
                this.pendingSetTimeouts--;
            }
            if (this.oldValue !== this.callingObject.umCleanFileAndUser(val)) {
                if (this.pendingCalls > 0) {
                    if (!this.pendingSetTimeouts) {
                        this.pendingSetTimeouts++;
                        var o_1 = this;
                        setTimeout(function () {
                            o_1.execApiCall(true, o_1.$userInputField.val());
                        }, 1000);
                    }
                    return;
                }
                var User = this.oldValue = this.callingObject.umCleanFileAndUser(val);
                var query = {
                    action: "query",
                    list: "allusers",
                    aufrom: User,
                    auto: User
                };
                this.callingObject.umCurrentUserQuery = this;
                this.pendingCalls++;
                this.callingObject.doAPICall(query, this.stCallBack);
            }
        };
        ClsUPC.prototype.evalAPICall = function (result) {
            this.pendingCalls--;
            var uifval = this.$userInputField.val();
            if (this.oldValue !== this.callingObject.umCleanFileAndUser(uifval)) {
                return;
            }
            if (this.isValidIP(uifval)) {
                return;
            }
            if ("object" === typeof result.query && "object" === typeof result.query.allusers) {
                var tmpUNE = this.userNameExists;
                if (!result.query.allusers.length) {
                    this.$outputField.attr("src", this.callingObject.umImgUserNotExists);
                    this.$outputField.attr("alt", "!! invalid !!");
                    this.userNameExists = false;
                }
                else {
                    if (this.callingObject.umCleanFileAndUser(this.$userInputField.val()) === result.query.allusers[0].name) {
                        this.$outputField.attr("src", this.callingObject.umImgUserExists);
                        this.$outputField.attr("alt", "OK");
                        this.userNameExists = true;
                    }
                    else {
                        if (!this.pendingSetTimeouts) {
                            this.$outputField.attr("src", this.callingObject.umImgUserUndefined);
                            this.$outputField.attr("alt", "?");
                            this.userNameExists = 2;
                        }
                    }
                }
                if ("function" === typeof this.CBValidChange && tmpUNE !== this.userNameExists) {
                    this.CBValidChange(this, this.callingObject);
                }
            }
        };
        return ClsUPC;
    }());
    var umsg = window.AxUserMsg = {
        umInstall: function () {
            if ($("#t-AjaxUserMessage").length === 0) {
                var $LODLinkNode = $("#t-AjaxUserMessageLOD");
                var $Href = $LODLinkNode.length ? $LODLinkNode.eq(0) : $(mw.util.addPortletLink("p-tb", "#", wgULS("向该用户发出提醒", "對此使用者發送提醒", null, null, "對此用戶發送提醒"), "t-AjaxUserMessage", "加载 UserMessages 小工具"));
                $Href.on("click", function (e) {
                    e.preventDefault();
                    umsg.fireImmediately = false;
                    umsg.umNotifyUser();
                });
            }
        },
        umInstallOldLinks: function () {
            umsg.umTemplate.forEach(function (ti, id) {
                var portletLink = mw.util.addPortletLink("p-tb", "#".concat(id), ti[1], "t-gadgetUserMessage".concat(id), ti[2]);
                $(portletLink).on("click", function (e) {
                    e.preventDefault();
                    window.AxUserMsgPreSelect = $(portletLink).find("a").attr("href").split("#")[1];
                    if (window.AxUserMsgFireAsYouClick) {
                        var umType = umsg.umTemplate[umsg.umSelect][3];
                        if (!(umType & umsg.umFlagUQ) && !(umType & umsg.umFlagRq)) {
                            umsg.fireImmediately = true;
                        }
                        else {
                            umsg.fireImmediately = false;
                        }
                    }
                    umsg.umNotifyUser();
                });
            });
        },
        umNotifyUser: function () {
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
        umFillSelect: function (caller, o) {
            var userstate = caller.userNameExists;
            o.umTemplate.forEach(function (currentTag, id) {
                if ($("#umOpt".concat(id), o.$tagSelect).length === 0) {
                    if (-1 === userstate && !(currentTag[3] & o.umFlagUM) || true === userstate && !(currentTag[3] & o.umFlagIP)) {
                        o.$tagSelect.append("<option id=\"umOpt".concat(id, "\" value=\"").concat(id, "\">").concat(mw.html.escape("".concat(currentTag[1], " - ").concat(currentTag[2])), "</option>"));
                        return;
                    }
                }
                else {
                    if (-1 === userstate && currentTag[3] & o.umFlagUM || true === userstate && currentTag[3] & o.umFlagIP) {
                        $("#umOpt".concat(id), o.$tagSelect).remove();
                        return;
                    }
                }
            });
            if (-1 === userstate) {
                if (window.AxUserMsgPreSelectIP) {
                    o.$tagSelect.val(window.AxUserMsgPreSelectIP);
                }
            }
            else {
                o.$tagSelect.val(umsg.umSelect);
            }
            o.umValidateInput(o);
            o.$tagSelect.change();
        },
        umDlg: function () {
            var _a;
            var $win = $(window);
            umsg.dlg = $("<div>").html('<div id="AjaxUmContainer"></div>').dialog({
                modal: true,
                closeOnEscape: true,
                position: [Math.round(($win.width() - Math.min($win.width(), 850)) / 2), Math.round(($win.height() - Math.min($win.height(), 800)) / 2)],
                title: '用户讨论页留言小工具 - <span class="mw-parser-output"><a href="//commons.wikimedia.org/wiki/MediaWiki_talk:Gadget-UserMessages.js" target="_blank" rel="nofollow noreferrer noopener" class="external text">在维基共享报告错误和建议</a> | <a href="https://zh.moegirl.org.cn/Help:UserMessages%E5%B0%8F%E5%B7%A5%E5%85%B7" target="_blank" class="external text">点此查看帮助</a></span>',
                height: Math.min($win.height(), 800),
                width: Math.min($win.width(), 850),
                buttons: (_a = {},
                    _a[umsg.i18n.submitButtonLabel] = function () {
                        try {
                            if (umsg.umIsValid) {
                                umsg.umNotifyUserExecute();
                            }
                        }
                        catch (ex) {
                            umsg.fail(ex);
                        }
                    },
                    _a[umsg.i18n.cancelButtonLabel] = function () {
                        $(this).dialog("close");
                        console.info("[this.i18n.cancelButtonLabel]", this, umsg.dlg);
                    },
                    _a),
                close: function () {
                    console.info("close", this, umsg.dlg);
                    $(this).dialog("destroy");
                    $(this).remove();
                    umsg.umDlgPresent = false;
                },
                open: function () {
                    var $dlg = $(this);
                    $dlg.parents(".ui-dialog").css({
                        position: "fixed", top: "".concat(Math.round(($win.height() - Math.min($win.height(), 800)) / 2), "px")
                    });
                }
            });
            umsg.umDlgPresent = true;
            if (umsg.dlg) {
                var $AjaxUmContainer = $("#AjaxUmContainer");
                $AjaxUmContainer.append("<label for=\"umUser\">".concat(mw.html.escape(umsg.i18n.umFillInUser), "</label><br><input type=\"text\" id=\"umUser\" style=\"width: 95%;\" value=\"").concat(mw.html.escape(umsg.umUser), "\"/>").concat(umsg.umInitImgUserExists.replace("%ID%", "umUserExists"), "<br><br>"));
                umsg.$tagSelect = $("<select>", {
                    size: "1",
                    id: "umTagToInsert",
                    style: "width: 99%;"
                });
                $AjaxUmContainer.append([
                    "<label for=\"umTagToInsert\">".concat(mw.html.escape(umsg.i18n.umSelectTag), "</label><br>"),
                    umsg.$tagSelect, "<br><br>",
                    "<span id=\"umMediaWrapper\"><label for=\"umMedia\">".concat(mw.html.escape(umsg.i18n.umFillInMedia), "</label><br><input type=\"text\" id=\"umMedia\" style=\"width: 95%;\" value=\"File:\"/><br><br></span>"),
                    "<span id=\"umP2Wrapper\"><label for=\"umP2\">".concat(mw.html.escape(umsg.i18n.umFillInAdditional), "</label><br><input type=\"text\" id=\"umP2\" style=\"width: 95%;\"/><br><br></span>"),
                    "<span id=\"umP3Wrapper\"><label for=\"umP3\">".concat(mw.html.escape(umsg.i18n.umFillInAdditional), "</label><br><input type=\"text\" id=\"umP3\" style=\"width: 95%;\"/><br><br></span>"),
                    "<span id=\"umRelatedUserWrapper\"><label for=\"umRelatedUser\">".concat(mw.html.escape(umsg.i18n.umFillInRelUser), "</label><br><input type=\"text\" id=\"umRelatedUser\" style=\"width: 95%;\" value=\"User:\"/>").concat(umsg.umInitImgUserExists.replace("%ID%", "umRelatedUserExists"), "<br><br></span>"),
                    "<span id=\"umSummaryWrapper\"><label for=\"umSummary\">".concat(mw.html.escape(umsg.i18n.umFillInSummary), "</label><br><input type=\"text\" id=\"umSummary\" style=\"width: 95%;\" value=\"\u6458\u8981\"/><br><br></span>"),
                    "<label for=\"umAddText\">".concat(mw.html.escape(umsg.i18n.umAddText), "</label><br><textarea id=\"umAddText\" style=\"width: 95%; height: 5em;\">").concat(mw.html.escape(window.AxUserMsgCustomText || ""), "</textarea><br><br>"),
                ]);
                umsg.talkTag = "";
                var $umMedia_1 = $("#umMedia"), $umP2 = $("#umP2"), $umP3 = $("#umP3"), $umUser_1 = $("#umUser"), $umRelatedUser_1 = $("#umRelatedUser"), $umSummary_1 = $("#umSummary"), $umAddText = $("#umAddText");
                umsg.uUPC = new ClsUPC($umUser_1, $("#umUserExists"), "umUserExistsCB", umsg, umsg.umFillSelect);
                umsg.ouUPC = new ClsUPC($umRelatedUser_1, $("#umRelatedUserExists"), "umUserExistsCB", umsg, umsg.umUserValidChange);
                var submitButton = $(".ui-dialog-buttonpane button:first");
                var guessFile = function () {
                    var f = mw.util.getParamValue("title", document.referrer);
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
                    var m = document.referrer.match(/File:(.+)/);
                    try {
                        if (m) {
                            if (/&.+=/.test(m[1])) {
                                return "File:".concat(decodeURI(m[1]).match(/^(.+)&/)[1]);
                            }
                            return "File:".concat(m[1]);
                        }
                    }
                    catch (_a) {
                    }
                };
                var umFile = guessFile();
                if (umFile) {
                    $umMedia_1.val(decodeURIComponent(umFile).replace(/_/g, " "));
                }
                $umUser_1.on("keyup", function () {
                    $umUser_1.val($umUser_1.val().replace(/<|>|\^/g, ""));
                });
                $umUser_1.autocomplete({
                    minLength: 1,
                    source: function (request, callback) {
                        umsg.umSeekUsers(request, callback);
                    },
                    close: function () {
                        $umUser_1.triggerHandler("selected");
                    }
                });
                $umMedia_1.on("change", function () {
                    umsg.umValidateInput(umsg);
                });
                $umMedia_1.on("input", function () {
                    $umMedia_1.val($umMedia_1.val().replace(/<|>|\^/g, ""));
                    umsg.umValidateInput(umsg);
                });
                $umMedia_1.on("keyup", function () {
                    $umMedia_1.val($umMedia_1.val().replace(/<|>|\^/g, ""));
                });
                $umMedia_1.autocomplete({
                    minLength: 1,
                    source: function (request, callback) {
                        umsg.umSeekFiles(request, callback);
                    },
                    close: function () {
                        $umMedia_1.triggerHandler("input");
                    }
                });
                $umRelatedUser_1.on("keyup", function () {
                    $umRelatedUser_1.val($umRelatedUser_1.val().replace(/<|>|\^/g, ""));
                    umsg.umValidateInput(umsg);
                });
                $umRelatedUser_1.autocomplete({
                    minLength: 1,
                    source: function (request, callback) {
                        umsg.umSeekUsers(request, callback);
                    },
                    close: function () {
                        $umRelatedUser_1.triggerHandler("selected");
                    }
                });
                $umP2.on("change", function () {
                    umsg.umValidateInput(umsg);
                });
                $umP2.on("input", function () {
                    umsg.umValidateInput(umsg);
                });
                $umP3.on("change", function () {
                    umsg.umValidateInput(umsg);
                });
                $umP3.on("input", function () {
                    umsg.umValidateInput(umsg);
                });
                $umAddText.on("change", function () {
                    umsg.umValidateInput(umsg);
                });
                $umAddText.on("input", function () {
                    umsg.umValidateInput(umsg);
                });
                submitButton.trigger("focus");
                $AjaxUmContainer.append(umsg.umInstPrevContainer.clone().text("即时预览为空"));
                umsg.$tagSelect.on("change", function () {
                    var umType = umsg.umTemplate[$(umsg.$tagSelect).val()][3];
                    $umSummary_1.val(umsg.umTemplate[$("#umTagToInsert").val()][4] ? umsg.umTemplate[$("#umTagToInsert").val()][4] : "".concat(umsg.umTemplate[$("#umTagToInsert").val()][2], "."));
                    umsg.umValidateInput(umsg);
                    umsg.$tagSelect.combobox({
                        displaytext: umsg.$tagSelect.val() ? umsg.$tagSelect.children(":selected").text() : ""
                    });
                    if (umType & umsg.umFlagP2) {
                        $("#umP2Wrapper").show();
                        if (document.activeElement && $umUser_1.attr("id") !== document.activeElement.id) {
                            $("#umP2").trigger("select");
                        }
                    }
                    else {
                        $("#umP2Wrapper").hide();
                    }
                    if (umType & umsg.umFlagP3) {
                        $("#umP3Wrapper").show();
                        if (document.activeElement && $umUser_1.attr("id") !== document.activeElement.id) {
                            $("#umP3").trigger("select");
                        }
                    }
                    else {
                        $("#umP3Wrapper").hide();
                    }
                    if (umType & umsg.umFlagMQ) {
                        $("#umMediaWrapper").show();
                        if (document.activeElement && $umUser_1.attr("id") !== document.activeElement.id) {
                            $("#umMedia").trigger("select");
                        }
                    }
                    else {
                        $("#umMediaWrapper").hide();
                    }
                    if (umType & umsg.umFlagUQ) {
                        $("#umRelatedUserWrapper").show();
                        if (document.activeElement && $umUser_1.attr("id") !== document.activeElement.id) {
                            $("#umMedia").trigger("select");
                        }
                    }
                    else {
                        $("#umRelatedUserWrapper").hide();
                    }
                });
                umsg.$tagSelect.val(umsg.umSelect);
                $("#umUser").trigger("keyup");
                $("#umTagToInsert").combobox();
            }
        },
        umSeekUsers: function (request, pCallback) {
            var query = {
                action: "query",
                list: "allusers",
                auprefix: request.term.replace(/^(?:User):/, "")
            };
            umsg.doGetApiCall(query, "umSeekUsersCB", pCallback);
        },
        umSeekUsersCB: function (result, pCallback) {
            var searchTerms = [];
            result.forEach(function (usi) {
                searchTerms.push({
                    id: usi.userid,
                    value: usi.name
                });
            });
            if ("function" === typeof pCallback) {
                pCallback(searchTerms);
            }
        },
        umSeekFiles: function (request, pCallback) {
            var query = {
                action: "query",
                list: "allimages",
                aiprefix: request.term.replace(/^(?:File|Image):/, "")
            };
            umsg.doGetApiCall(query, "umSeekFilesCB", pCallback);
        },
        umSeekFilesCB: function (result, pCallback) {
            var searchTerms = [];
            result.forEach(function (fii) {
                searchTerms.push({
                    id: fii.timestamp, value: "File:".concat(fii.name)
                });
            });
            if ("function" === typeof pCallback) {
                pCallback(searchTerms);
            }
        },
        umUserExistsCB: function (result) {
            umsg.umCurrentUserQuery.evalAPICall(result);
        },
        umShowInfo: function (info, o) {
            $("#umInstantPreviewContainer").empty().html("<p class=\"center\"><img src=\"".concat(o.umImgInfo, "\" width=\"64\" height=\"64\"/><br>").concat(info, "</p>"));
        },
        umValidateInput: function (o) {
            umsg.umIsValid = true;
            var umType = umsg.umTemplate[$("#umTagToInsert").val()][3];
            var submitButton = $(".ui-dialog-buttonpane button:first");
            var validRelatedUser = function () {
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
            var validMedia = function () {
                if (umType & o.umFlagMQ) {
                    if (o.umCleanFileAndUser($("#umMedia").val()).length < 5 && umType & o.umFlagRq) {
                        o.umShowInfo("未指定文件，且强制检查已开启", o);
                        return false;
                    }
                }
                return true;
            };
            var validUser = function () {
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
            umsg.umIsValid = umsg.umIsValid && validRelatedUser() && validMedia() && validUser();
            if (umsg.umIsValid) {
                submitButton.removeClass("ui-state-disabled");
                if (umType & umsg.umFlagMQ) {
                    umsg.talkTag = "\n{{subst:".concat(umsg.umTemplate[$("#umTagToInsert").val()][0]).concat(umsg.umCleanFileAndUser($("#umMedia").val()) ? "|1=".concat(umType & umsg.umFlagNS ? "File:".concat(umsg.umCleanFileAndUser($("#umMedia").val())) : $("#umMedia").val()) : "");
                }
                else if (umType & umsg.umFlagUQ) {
                    umsg.talkTag = "\n{{subst:".concat(umsg.umTemplate[$("#umTagToInsert").val()][0], "|1=").concat(umsg.umCleanFileAndUser($("#umRelatedUser").val()));
                }
                else {
                    umsg.talkTag = "\n{{subst:".concat(umsg.umTemplate[$("#umTagToInsert").val()][0]);
                }
                var paramCount = (umType & umsg.umFlagUQ ? 1 : 0) + (umType & umsg.umFlagMQ ? 1 : 0);
                var sigText = "——~~~~";
                if (umType & umsg.umFlagP2) {
                    paramCount++;
                    umsg.talkTag += "|".concat(paramCount, "=").concat($("#umP2").val());
                }
                if (umType & umsg.umFlagP3) {
                    paramCount++;
                    umsg.talkTag += "|".concat(paramCount, "=").concat($("#umP3").val());
                }
                umsg.talkTag += "}}";
                if ("\n{{subst:}}" === umsg.talkTag) {
                    umsg.talkTag = "\n";
                }
                umsg.talkTag += "\n".concat($("#umAddText").val().replace(/~{3,5}$/, "")).concat(sigText, "\n");
                umsg.umParseTemplate(false);
                if (umsg.fireImmediately) {
                    umsg.umNotifyUserExecute();
                }
            }
            else {
                submitButton.addClass("ui-state-disabled");
            }
        },
        umUserValidChange: function (_, o) {
            o.umValidateInput(o);
        },
        umCleanFileAndUser: function (input) {
            var output = "";
            if (input) {
                output = input.replace(/_/g, " ").replace(/File:/g, "").replace(/Image:/g, "").replace(/User:/g, "").replace(/^\s+|\s+$/g, "");
                output = output.substring(0, 1).toUpperCase() + output.substring(1);
            }
            return output;
        },
        umParseTemplate: function (viaSetTimeout) {
            if (window.AxUserMsgNoParse) {
                return;
            }
            if (viaSetTimeout) {
                umsg.umPendingParserTimeouts--;
            }
            if (umsg.umPendingParser > 0) {
                if (!umsg.umPendingParserTimeouts) {
                    var o_2 = umsg;
                    umsg.umPendingParserTimeouts++;
                    setTimeout(function () {
                        o_2.umParseTemplate(true);
                    }, 300);
                }
                return;
            }
            var maybeParse = function () {
                umsg.umPendingParser++;
                var action = {
                    action: "parse",
                    uselang: mw.config.get("wgUserLanguage"),
                    redirects: true,
                    prop: "text",
                    pst: true,
                    title: umsg.umUserTalkPrefix + $("#umUser").val(),
                    text: umsg.talkTag
                };
                umsg.umDelay = Math.min(umsg.umDelay + 30, 1500);
                umsg.doAPICall(action, "umParsedTemplate");
            };
            if (umsg.umParserTimerID) {
                clearTimeout(umsg.umParserTimerID);
            }
            umsg.umParserTimerID = setTimeout(maybeParse, umsg.umDelay);
        },
        umParsedTemplate: function (result) {
            umsg.umPendingParser--;
            if ("object" === typeof result.parse && "object" === typeof result.parse.text && umsg.umDlgPresent && !umsg.umExecuting && umsg.umIsValid) {
                var $containerText = result.parse.text["*"].replace(" API", " ".concat(umsg.umCleanFileAndUser($("#umUser").val()))).replace(">API", ">".concat(umsg.umCleanFileAndUser($("#umUser").val())));
                $containerText = $($containerText);
                $(".editsection", $containerText).remove();
                $("a", $containerText).attr("target", "_blank");
                $("#umInstantPreviewContainer").empty().append($containerText).resizable({
                    alsoResize: "#AjaxUmContainer"
                });
            }
        },
        umObtainEditToken: function () {
            if (mw.user && mw.user.tokens) {
                umsg.editToken = mw.user.tokens.get("csrfToken");
            }
            umsg.editToken = umsg.editToken || (mw.user.isAnon() ? "+\\" : "");
            if (umsg.editToken) {
                return;
            }
            var query = {
                action: "query",
                prop: "info",
                intoken: "edit",
                titles: "FAQ"
            };
            umsg.doAPICall(query, "umObtainEditTokenCB");
        },
        umObtainEditTokenCB: function (result) {
            var pages = result.query.pages;
            for (var id in pages) {
                if (Object.hasOwnProperty.bind(pages)(id)) {
                    umsg.editToken = pages[id].edittoken;
                }
            }
        },
        umNotifyUserExecute: function () {
            if (umsg.umExecuting) {
                return;
            }
            umsg.pageName = umsg.umUserTalkPrefix + $("#umUser").val();
            umsg.talkSummary = $("#umSummary").val();
            umsg.appendTemplate();
        },
        appendTemplate: function () {
            var page = [];
            page.title = umsg.pageName;
            page.text = umsg.talkTag;
            page.editType = "appendtext";
            page.redirect = true;
            if (window.AjaxDeleteWatchFile) {
                page.watchlist = "watch";
            }
            umsg.umExecuting = true;
            $("#umInstantPreviewContainer").empty().html('<p class="center"><img src="https://img.moegirl.org.cn/common/d/d1/Windows_10_loading.gif"/></p>');
            umsg.savePage(page, umsg.talkSummary, "umNotifyUserExecuteCB");
        },
        savePage: function (page, summary, callback) {
            var edit = {
                action: "edit",
                summary: summary,
                tags: "UserMessages",
                watchlist: page.watchlist || "preferences",
                title: page.title
            };
            if (page.redirect) {
                edit.redirect = "";
            }
            edit[page.editType] = page.text;
            edit.token = umsg.editToken;
            umsg.doAPICall(edit, callback);
        },
        umNotifyUserExecuteCB: function () {
            var encTitle = umsg.umUserTalkPrefix + $("#umUser").val();
            encTitle = encodeURIComponent(encTitle.replace(/ /g, "_")).replace(/%2F/ig, "/").replace(/%3A/ig, ":");
            var newLoc = "".concat(mw.config.get("wgServer")).concat(mw.config.get("wgArticlePath").replace("$1", encTitle));
            if (window.location.pathname === mw.config.get("wgArticlePath").replace("$1", encTitle)) {
                window.location.hash = "#footer";
                window.location.reload();
            }
            else {
                window.location.href = "".concat(newLoc, "#footer");
            }
            umsg.umExecuting = false;
        },
        doGetApiCall: function (params, callback, pCallback) {
            if (params.list) {
                if ("allusers" === params.list) {
                    if (params.auprefix in umsg.umUserCache) {
                        umsg[callback](umsg.umUserCache[params.auprefix], pCallback);
                        return;
                    }
                }
                else if ("allimages" === params.list) {
                    if (params.aiprefix in umsg.umFileCache) {
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
                success: function (result) {
                    if (!result) {
                        if ("function" === typeof pCallback) {
                            pCallback();
                        }
                        return;
                    }
                    try {
                        if (params.list) {
                            if ("allusers" === params.list) {
                                umsg.umUserCache[params.auprefix] = result.query.allusers;
                                umsg[callback](result.query.allusers, pCallback);
                                return;
                            }
                        }
                        if (params.list) {
                            if ("allimages" === params.list) {
                                umsg.umFileCache[params.aiprefix] = result.query.allimages;
                                umsg[callback](result.query.allimages, pCallback);
                                return;
                            }
                        }
                        if ("function" === typeof pCallback) {
                            pCallback();
                        }
                        umsg[callback](result);
                    }
                    catch (e) {
                        return umsg.fail(e);
                    }
                },
                error: function () {
                    if ("function" === typeof pCallback) {
                        pCallback();
                    }
                }
            });
        },
        doAPICall: function (params, callback) {
            if (params.action) {
                if ("parse" === params.action) {
                    if (params.text in umsg.umParserCache) {
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
                success: function (result, _, x) {
                    if (!result) {
                        return umsg.fail("API \u54CD\u5E94\u4E3A\u7A7A\uFF1A\n".concat(x.responseText));
                    }
                    if (result.error && result.error.info.includes("231")) {
                        return setTimeout(function () {
                            umsg.doAPICall(params, callback);
                        }, 500);
                    }
                    if (result.error) {
                        return umsg.fail("API \u8BF7\u6C42\u8FD4\u56DE\u5931\u8D25\u7ED3\u679C (".concat(result.error.code, ")\uFF1A").concat(result.error.info));
                    }
                    if (result.edit && result.edit.spamblacklist) {
                        return umsg.fail("\u6B64\u6B21\u7F16\u8F91\u56E0 ".concat(result.edit.spamblacklist, " \u88AB\u5217\u5165\u9ED1\u540D\u5355\u800C\u5931\u8D25"));
                    }
                    if (params.action) {
                        if ("parse" === params.action) {
                            umsg.umParserCache[params.text] = result;
                        }
                    }
                    try {
                        umsg[callback](result);
                    }
                    catch (e) {
                        return umsg.fail(e);
                    }
                },
                error: function (x, status, error) {
                    return umsg.fail("API \u8BF7\u6C42\u906D\u9047\u7F51\u7EDC\u9519\u8BEF\uFF1A\u72B6\u6001\u7801\u4E3A \u3010".concat(x.status, "\u3011\uFF0C\u72B6\u6001\u6587\u672C\u4E3A \u3010").concat(status, "\u3011\uFF0C\u9519\u8BEF\u4FE1\u606F\u4E3A \u3010").concat(error, "\u3011"));
                }
            });
        },
        fail: function (_err) {
            var err;
            if ("object" === typeof _err) {
                var stErr = "".concat(mw.html.escape(_err.message), "<br>").concat(_err.name);
                if (_err.lineNumber) {
                    stErr += " @line".concat(_err.lineNumber);
                }
                if (_err.line) {
                    stErr += " @line".concat(_err.line);
                }
                err = stErr;
            }
            else {
                err = mw.html.escape(_err.toString());
            }
            if (umsg.umDlgPresent) {
                $("#umInstantPreviewContainer").empty().html("<p class=\"center\"><img src=\"".concat(umsg.umImgErr, "\" width=\"64\" height=\"64\"/></p><br>\u5C0F\u5DE5\u5177\u53D1\u751F\u9519\u8BEF\uFF1A<br>").concat(mw.html.escape(err)));
            }
            else {
                mw.notify("\u5C0F\u5DE5\u5177\u53D1\u751F\u9519\u8BEF\uFF1A".concat(err));
            }
        },
        i18n: {
            umFillInUser: "请填写需要留言的用户名：",
            umSelectTag: "请选择需要使用的模板，可填入文本来搜索模板：",
            umFillInMedia: "请选择与本留言有关的文件（名字空间会自动处理）：",
            umFillInAdditional: "所选模板需要额外参数，请在此填写。",
            umFillInRelUser: "请填写相关用户的用户名",
            umFillInSummary: "编辑摘要",
            umAddText: "请填写额外信息：",
            submitButtonLabel: "留言",
            cancelButtonLabel: "取消"
        },
        umInstPrevContainer: $("<div>", {
            id: "umInstantPreviewContainer", style: "background-color:#EFD;height:380px;overflow:scroll;vertical-align:middle;"
        }),
        umInitImgUserExists: '<img id="%ID%" src="https://img.moegirl.org.cn/common/thumb/4/42/P_no.svg/20px-P_no.svg.png" alt="?"/>',
        umImgUserUndefined: "https://img.moegirl.org.cn/common/thumb/4/42/P_no.svg/20px-P_no.svg.png",
        umImgUserNotExists: "https://img.moegirl.org.cn/common/thumb/4/42/P_no.svg/20px-P_no.svg.png",
        umImgUserExists: "https://img.moegirl.org.cn/common/thumb/b/be/P_yes.svg/20px-P_yes.svg.png",
        umImgUserIsIP: "https://img.moegirl.org.cn/common/thumb/7/7e/OOjs_UI_icon_userAnonymous.svg/20px-OOjs_UI_icon_userAnonymous.svg.png",
        umImgErr: "https://img.moegirl.org.cn/common/7/7f/Dialog-error.svg",
        umImgWarn: "https://img.moegirl.org.cn/common/b/bc/Commons-emblem-issue.svg",
        umImgInfo: "https://img.moegirl.org.cn/common/2/28/Commons-emblem-notice.svg",
        umFlagMQ: 1,
        umFlagUQ: 2,
        umFlagRq: 4,
        umFlagNS: 8,
        umFlagP2: 16,
        umFlagP3: 32,
        umFlagIP: 64,
        umFlagUM: 128,
        umFlagRqMqNs: 13,
        umUserTalkPrefix: "".concat(mw.config.get("wgFormattedNamespaces")[3], ":"),
        apiURL: mw.util.wikiScript("api")
    };
    var initCombobox = function ($) {
        $.widget("ui.combobox", {
            options: {
                displaytext: "",
                emptyMessage: 42,
                passEnter: true,
                shutOff: window.AxUserMsgUseSelect
            },
            _setOption: function (key, value) {
                var args = [];
                for (var _i = 2; _i < arguments.length; _i++) {
                    args[_i - 2] = arguments[_i];
                }
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
                $.Widget.prototype._setOption.apply(this, __spreadArray([key, value], __read(args), false));
            },
            _create: function () {
                var _this = this;
                if (this.options.shutOff) {
                    return;
                }
                var self = this, select = this.element.hide(), selectWidth = select.width(), selectId = select.attr("id"), selected = select.children(":selected"), value = selected.val() ? selected.text() : "", ownId = "j".concat(Math.floor(Math.random() * 10000000000));
                var selectLabels, isOpen = false, valid = true;
                if (selectId) {
                    selectLabels = $("label[for=\"".concat(selectId, "\"]"));
                }
                var portMessure = this.portMessure = $("<div>", {
                    id: "".concat(ownId, "vp")
                }).css({
                    position: "fixed", top: "0", height: "0"
                });
                $("body").append(portMessure);
                var input = this.input = $("<input>", {
                    id: ownId
                }).insertAfter(select).val(value).autocomplete({
                    delay: 0,
                    minLength: 0,
                    source: function (request, response) {
                        var i = 0;
                        var matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), "i");
                        response(select.children("option").map(function (_, ele) {
                            if (i > (window.AxUserMsgMaxSelect || 20) && request.term) {
                                return;
                            }
                            var text = $(ele).text();
                            if (ele.value && (!request.term || matcher.test(text))) {
                                i++;
                                return {
                                    label: text.replace(new RegExp("(?![^&;]+;)(?!<[^<>]*)(".concat($.ui.autocomplete.escapeRegex(request.term), ")(?![^<>]*>)(?![^&;]+;)"), "gi"), "<b>$1</b>"),
                                    value: text,
                                    option: ele
                                };
                            }
                        }));
                    },
                    select: function (event, ui) {
                        ui.item.option.selected = true;
                        self._trigger("selected", event, {
                            item: ui.item.option
                        });
                        select.triggerHandler("change");
                    },
                    change: function (_, ui) {
                        var _this = this;
                        setTimeout(function () {
                            console.info("change", input, _this, ui);
                        }, 16);
                        if (!ui.item) {
                            var matcher_1 = new RegExp("^".concat($.ui.autocomplete.escapeRegex($(this).val()), "$"), "i");
                            valid = false;
                            select.children("option").each(function (_, ele) {
                                if ($(ele).text().match(matcher_1)) {
                                    ele.selected = valid = true;
                                    return false;
                                }
                            });
                            if (!valid) {
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
                        var $this = $(this);
                        var t_top = $this.offset().top - portMessure.offset().top;
                        $(".ui-autocomplete.ui-menu").css({
                            position: "fixed",
                            overflow: "auto",
                            "max-height": "".concat(Math.round($(window).height() - t_top - $this.height() - 20), "px")
                        });
                    },
                    close: function () {
                        setTimeout(function () {
                            isOpen = false;
                        }, 1);
                    },
                    open: function () {
                        var _this = this;
                        setTimeout(function () {
                            console.info("open", input, _this);
                        }, 16);
                        isOpen = true;
                        var _t = $(this), t_top = _t.offset().top - portMessure.offset().top;
                        $(".ui-autocomplete.ui-menu").css({
                            position: "fixed",
                            "max-height": "".concat(Math.round($(window).height() - t_top - _t.height() - 20), "px")
                        });
                    }
                }).addClass("ui-widget ui-widget-content ui-corner-left").css("width", "".concat(selectWidth - 70, "px")).on("click", function () {
                    $(input).trigger("select");
                }).on("keydown", function (e) {
                    if (self.options.passEnter && 13 === e.which && !isOpen && valid) {
                        var kup = $.Event("keyup");
                        kup.ctrlKey = false;
                        kup.keyCode = kup.which = 13;
                        select.triggerHandler(kup);
                    }
                });
                if (selectLabels) {
                    selectLabels.attr("for", ownId);
                }
                input.data("autocomplete")._renderItem = function (ul, item) {
                    return $("<li>").data("item.autocomplete", item).append("<a>".concat(item.label, "</a>")).appendTo(ul);
                };
                this.button = $("<button>", {
                    tabIndex: -1,
                    type: "button",
                    text: "&nbsp;",
                    title: "Show All Items",
                    style: "height:1.5em;padding:0!important;width:20px;margin:0!important;position:relative;top:-2px;"
                }).insertAfter(input).button({
                    icons: {
                        primary: "ui-icon-triangle-1-s"
                    },
                    text: false
                }).removeClass("ui-corner-all").addClass("ui-corner-right ui-button-icon").on("click", function () {
                    if (input.autocomplete("widget").is(":visible")) {
                        input.autocomplete("close");
                        return;
                    }
                    _this.button.blur();
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
                $.Widget.prototype.destroy.call(this);
            }
        });
    };
    if ([-1, 2, 3].includes(mw.config.get("wgNamespaceNumber"))) {
        var builtinTemplate_1 = [
            ["UserMessages/Welcome", "Welcome", "欢迎新用户～", umsg.umFlagUM, "Welcome to Moegirlpedia~"],
            ["UserMessages/MovedToUserSubpage", "MovedToUserSubpage", "可收录的页面打回至用户子页面（1=页面名，2=原因）", umsg.umFlagP2 + umsg.umFlagP3, "页面打回通知"],
            ["UserMessages/MovedToUserSubpage2", "MovedToUserSubpage", "不在收录范围内的页面打回至用户子页面（1=页面名，2=原因）", umsg.umFlagP2 + umsg.umFlagP3, "页面打回通知"],
            ["UserMessages/ArticleCopyright", "ArticleCopyrightInfringement", "著作权侵犯（1=页面名，2=选填站点）", umsg.umFlagP2 + umsg.umFlagP3, "请勿侵犯著作权"],
            ["UserMessages/FalseInformation", "AddFalseInformation", "添加不实信息（1=页面名）", umsg.umFlagP2, "请勿添加不实信息"],
            ["UserMessages/CutAndPasteMoving", "C&Pmoving", "剪贴移动提醒（1=页面名）", umsg.umFlagP2, "请勿剪切移动页面"],
            ["UserMessages/EditUserPage", "EditUserPage", "编辑他人用户页面（1=页面名）", umsg.umFlagP2, "请勿编辑他人用户页面"],
            ["UserMessages/HumorTemplate", "HumorTemplate", "违规字词转换（1=选填页面名，2=选填行为）", umsg.umFlagP2 + umsg.umFlagP3, "关于幽默模板的使用"],
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
            ["UserMessages/CommentViolation", "CommentViolation", "发布违规评论（1=页面名，2=选填原因）", umsg.umFlagP2 + umsg.umFlagP3, "请勿发布违规评论"],
            ["UserMessages/EditWar", "EditWar", "通知编辑战参与者（1=页面名）", umsg.umFlagP2, "提醒您参与讨论"],
            ["UserMessages/EditWar2", "EditWar", "提醒即将构成编辑战（1=页面名）", umsg.umFlagP2, "编辑战提醒"],
            ["UserMessages/EditWar3", "EditWar", "警告编辑战用户（1=页面名，2=选填原因）", umsg.umFlagP2 + umsg.umFlagP3, "编辑战警告"],
            ["UserMessages/FinalWarning", "FinalWarning", "忍耐是有限的（1/2=选填原因，推荐在额外信息填写）", umsg.umFlagP2 + umsg.umFlagP3, "警告：忍耐是有限的"],
        ];
        var placeholderTemplate_1 = ["", "请选择一个模板（本选项不可使用）", "给你的新留言~", 0];
        Object.defineProperties(umsg, {
            umTemplate: {
                get: function () {
                    if (!Array.isArray(window.AxUserMsgCustomTemplate)) {
                        window.AxUserMsgCustomTemplate = [];
                    }
                    var result = __spreadArray(__spreadArray(__spreadArray([], __read(window.AxUserMsgUseBuiltinTemplate !== false ? builtinTemplate_1 : []), false), __read(window.AxUserMsgCustomTemplate), false), [
                        placeholderTemplate_1,
                    ], false);
                    result.push = function () {
                        var _a;
                        var args = [];
                        for (var _i = 0; _i < arguments.length; _i++) {
                            args[_i] = arguments[_i];
                        }
                        return (_a = window.AxUserMsgCustomTemplate).push.apply(_a, __spreadArray([], __read(args), false));
                    };
                    return result;
                },
                configurable: false,
                enumerable: true
            },
            umSelect: {
                get: function () {
                    if (Number.isSafeInteger(window.AxUserMsgPreSelect) && window.AxUserMsgPreSelect >= 0 && window.AxUserMsgPreSelect < umsg.umTemplate.length) {
                        return window.AxUserMsgPreSelect;
                    }
                    return umsg.umTemplate.indexOf(placeholderTemplate_1);
                },
                configurable: false,
                enumerable: true
            }
        });
        $(function () {
            initCombobox($);
            umsg.umInstall();
            if (window.installOldLinks) {
                umsg.umInstallOldLinks();
            }
            $(document).triggerHandler("scriptLoaded", ["AxUserMsg", umsg]);
        });
    }
})();
// </pre>