// <pre>
/* eslint-disable require-atomic-updates */
"use strict";
$(() => {
    // await mw.loader.using(["mediawiki.api", "mediawiki.notification", "mediawiki.notify"]);
    const $window = $(window);
    const $body = $("body");
    const api = new mw.Api();
    const wgUserId = mw.config.get("wgUserId");
    const wgCurRevisionId = mw.config.get("wgCurRevisionId");
    const wgArticleId = mw.config.get("wgArticleId");
    const wgPageName = mw.config.get("wgPageName");
    const wgUserName = mw.config.get("wgUserName");
    const UNDEFINED = Symbol("UNDEFINED");
    const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
    let unloading = false;
    let running = false;
    let failed = false;
    const successFunction = new Map();
    let IPESubmitting = 0;
    let lastIPE;
    class Notify {
        _random = Math.random().toString(36).substring(2);
        _count = 0;
        _process(text, isJQueryHTML = false) {
            const result = text.replace(/\$count\b/g, this._count);
            return isJQueryHTML ? $(result) : result;
        }
        async _notify(type, text, isJQueryHTML = false, isFinal = false) {
            return await mw.notify(this._process(text, isJQueryHTML), {
                autoHide: !!isFinal,
                title: "检测编辑是否完成工具",
                tag: `AnnTools-tempEditCheck-${this.random}-${type}`,
            });
        }
        async start(text, isJQueryHTML = false) {
            this.end();
            this._startNotification = await this._notify("start", text, isJQueryHTML);
        }
        async notify(text, isJQueryHTML = false) {
            if (typeof this._notifyNotification?.close === "function") {
                this._notifyNotification.close();
            }
            this._count++;
            await this.update(text, isJQueryHTML);
        }
        async update(text, isJQueryHTML = false, isFinal = false) {
            this._notifyNotification = await this._notify(`notify-${this._count}`, text, isJQueryHTML, isFinal);
        }
        end() {
            if (typeof this._startNotification?.close === "function") {
                this._startNotification.close();
            }
        }
    }
    const runOnceGenerator = (fn) => {
        let ran = false;
        return (...a) => {
            if (ran === false) {
                ran = true;
                fn(...a);
            }
        };
    };
    mw.hook("InPageEdit.quickEdit").add((IPE) => {
        lastIPE = IPE;
    });
    document.body.addEventListener("click", ({ path, target }) => {
        const $path = $((Array.isArray(path) ? path : []).concat([target]));
        if ($path.is("#ssi-leftButtons > .save-btn")) {
            IPESubmitting = 1;
            return;
        }
        if ($path.is("#ssi-rightButtons > .btn-primary") && IPESubmitting === 1) {
            IPESubmitting = 2;
            return;
        }
        IPESubmitting = 0;
    }, {
        capture: true,
    });
    const run = async () => {
        if (running || unloading) {
            return;
        }
        running = true;
        const notify = new Notify();
        await sleep(2000);
        $("#mw-notification-area").appendTo($body);
        notify.start("开始检测是否已经编辑完成");
        while (running && unloading === false) {
            if (failed) {
                running = false;
                failed = false;
                unloading = false;
                notify.end();
                notify.update("编辑本身出现异常，已停止检测……", false, true);
            }
            notify.notify("第$count次检测：开始");
            let _apiResult;
            let error = UNDEFINED;
            try {
                _apiResult = await api.post({
                    action: "query",
                    assertuser: wgUserName,
                    format: "json",
                    prop: "revisions",
                    titles: wgPageName,
                    rvprop: "timestamp|ids|userid|contentmodel",
                    rvlimit: "1",
                });
            } catch (e) {
                error = e;
            }
            if (_apiResult && Reflect.has(_apiResult, "error")) {
                notify.update(`<div>第$count次检测：服务器返回数据有误……<pre>${JSON.stringify(_apiResult, null, 4)}</pre></div>`, true);
                await sleep(1000);
                continue;
            }
            if (error !== UNDEFINED) {
                notify.update(`<div>第$count次检测：${error instanceof Error ? "网络出错" : "服务器返回数据有误"}……<pre>${error instanceof Error ? error : JSON.stringify(_apiResult || error, null, 4)}</pre></div>`, true);
                await sleep(1000);
                continue;
            }
            const apiResult = Object.values(_apiResult.query.pages)[0];
            if (wgArticleId === 0 ? Array.isArray(apiResult.revisions) : apiResult.revisions[0].revid > wgCurRevisionId) {
                notify.end();
                if ((wgArticleId !== 0 ? apiResult.revisions[0].parentid === wgCurRevisionId : true) && apiResult.revisions[0].userid === wgUserId) {
                    unloading = true;
                    await notify.update("<span>第$count次检测：<b>编辑生效，已令编辑工具跳过等待！</b></span>", true, true);
                    Array.from(successFunction.values()).filter((fn) => typeof fn === "function").forEach((fn) => {
                        fn({
                            edit: {
                                result: "Success",
                                pageid: apiResult.pageid,
                                title: apiResult.title,
                                contentmodel: apiResult.revisions[0].contentmodel,
                                oldrevid: apiResult.revisions[0].parentid,
                                newrevid: apiResult.revisions[0].revid,
                                newtimestamp: apiResult.revisions[0].timestamp,
                            },
                        });
                    });
                } else {
                    notify.update("<span>第$count次检测：<b>疑似出现编辑冲突，停止检测，请等待编辑工具处理</b>……</span>", true);
                    running = false;
                    unloading = false;
                }
                break;
            }
            notify.update("第$count次检测：编辑尚未生效");
            await sleep(1000);
        }
    };
    const ajax = $.ajax;
    const getAjaxParameter = (data, property) => {
        try {
            if (typeof data === "string") {
                return new URLSearchParams(data).get(property);
            }
        } catch { }
        if (data instanceof FormData) {
            return data.get(property);
        }
        return data?.[property];
    };
    $.ajax = async function (option, ...args) {
        if (running || unloading || typeof option === "string") {
            return ajax.bind($)(option, ...args);
        }
        let needFailWatcher = false;
        try {
            if (
                (IPESubmitting > 0
                    ? IPESubmitting === 2 && lastIPE?.$optionsLabel?.find?.(".reloadPage")?.is?.(":visible:checked")
                    : true
                ) && getAjaxParameter(option.data, "action") === "edit" && wgPageName === getAjaxParameter(option.data, "title")) {
                const success = option.success || (() => { });
                option.success = runOnceGenerator(success.bind(this));
                successFunction.set(success, option.success);
                run();
                needFailWatcher = true;
            }
        } catch (e) {
            console.error(e);
        }
        const jqXHR = ajax.bind($)(option, ...args);
        if (needFailWatcher) {
            try {
                const data = await jqXHR;
                if (data?.edit?.result !== "Success") {
                    failed = true;
                }
            } catch {
                failed = true;
            }
        }
        return jqXHR;
    };
    const postWithToken = mw.Api.prototype.postWithToken;
    mw.Api.prototype.postWithToken = function (...args) {
        const self = postWithToken.bind(this)(...args);
        if (args[1]?.action === "edit" && args[1]?.title === wgPageName) {
            const done = self.done;
            self.done = (...args) => {
                args.forEach((arg) => {
                    successFunction.set(arg, runOnceGenerator(arg.bind(self)));
                });
                return done.bind(self)(...args);
            };
            self.fail(() => {
                failed = true;
            });
        }
        return self;
    };
    $window.on("beforeunload", () => {
        unloading = true;
    });
});
// </pre>
