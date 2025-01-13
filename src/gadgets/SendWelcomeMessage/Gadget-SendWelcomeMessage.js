"use strict";
// <pre>
$(() => {
    const message = "{{Welcome}} ——~~~~{{clear}}";
    if (mw.config.get("wgNamespaceIds").user_talk === mw.config.get("wgNamespaceNumber") && !mw.config.get("wgPageName").includes("/") && mw.config.get("wgEditMessage") === "creating") {
        /**
         * @type { HTMLTextAreaElement | null }
         */
        const wpTextbox = document.querySelector("#wpTextbox1");
        if (wpTextbox && wpTextbox.value.length === 0) {
            wpTextbox.value = message;
        }
    }
    const contentText = document.querySelector("#mw-content-text");
    /**
     * @return { HTMLAnchorElement[] }
     */
    const getLinks = () => document.querySelectorAll("#mw-content-text a.new[href]");
    /**
     * @param { HTMLAnchorElement | any } target
     */
    const verifyLink = (target) => {
        if (!(target instanceof HTMLAnchorElement)) {
            return false;
        }
        if (!target.classList.contains("new")) {
            return false;
        }
        const url = new URL(target.href);
        if (!url.searchParams.has("title") || url.searchParams.get("action") !== "edit") {
            return false;
        }
        const userName = url.searchParams.get("title");
        if (!/^User[_ ]talk/i.test(userName) || userName.includes("/")) {
            return false;
        }
        return target;
    };
    /**
     * @param { MouseEvent } event
     */
    const verifyEvent = (event) => {
        const target = verifyLink(event.target);
        if (!target) {
            return false;
        }
        /**
         * @type { HTMLElement[] }
         */
        const path = event.composedPath();
        if (!path.includes(contentText)) {
            return false;
        }
        return target;
    };
    const successCleanup = (userName) => {
        /**
         * @type { HTMLAnchorElement[] }
         */
        const newLinks = getLinks();
        for (const newLink of newLinks) {
            try {
                const link = new URL(newLink.href);
                if (link.searchParams.get("title") === userName && link.searchParams.get("action") === "edit") {
                    newLink.classList.remove("new", "sendWelcomeMessageLink", "redlink", "unsend");
                    link.searchParams.delete("action");
                    newLink.href = link;
                }
            } catch { }
        }
    };
    const api = new mw.Api();
    document.addEventListener("click", (event) => {
        try {
            const target = verifyEvent(event);
            if (!target) {
                return;
            }
            event.preventDefault();
            event.stopImmediatePropagation();
            event.stopPropagation();
            target.classList.add("sendWelcomeMessageLink");
            const url = new URL(target.href);
            const userName = url.searchParams.get("title");
            if (document.querySelector("#welcomeAskFinished")) {
                document.querySelector("#welcomeCancel").click();
            }
            if (document.querySelector("#welcomeAsk")) {
                target.classList.add("unsend");
                oouiDialog.alert(wgULS("一次只能发送一份欢迎辞哦，不要太贪心了~"), {
                    title: wgULS("一键发送欢迎辞小工具"),
                });
                return;
            }
            const welcomeAsk = document.createElement("span");
            welcomeAsk.id = "welcomeAsk";
            welcomeAsk.innerText = wgULS("你想直接发送欢迎辞还是访问该未创建页面？");
            target.after(welcomeAsk);

            const welcomeYes = document.createElement("span");
            welcomeYes.id = "welcomeYes";
            welcomeYes.innerText = wgULS("发送欢迎辞");
            welcomeAsk.append(welcomeYes);
            welcomeAsk.append(" · ");

            const welcomeNo = document.createElement("span");
            welcomeNo.id = "welcomeNo";
            welcomeNo.innerText = wgULS("访问该页面");
            welcomeAsk.append(welcomeNo);
            welcomeAsk.append(" · ");

            const welcomeCancel = document.createElement("span");
            welcomeCancel.id = "welcomeCancel";
            welcomeCancel.innerText = wgULS("取消");
            welcomeAsk.append(welcomeCancel);

            welcomeNo.addEventListener("click", () => {
                window.open(target.href, "_blank");
                welcomeCancel.click();
            });
            welcomeCancel.addEventListener("click", () => {
                welcomeAsk.remove();
            });
            welcomeYes.addEventListener("click", async () => {
                try {
                    welcomeAsk.innerText = wgULS("正在通信中……");
                    const response = await api.postWithToken("csrf", {
                        action: "edit",
                        assertuser: mw.config.get("wgUserName"),
                        format: "json",
                        title: userName,
                        summary: "欢迎来到萌娘百科",
                        text: message,
                        tags: "Welcome to MoegirlPedia|Automation tool",
                        createonly: true,
                        watchlist: "unwatch",
                    });
                    /*
                        $("#welcomeAsk").empty().append('<span id="welcomeAskFinished">通信成功！继续努力哦~</span>');
                        console.debug(`和萌百服务器通信成功，编辑成功！ \n编辑详情：${JSON.stringify(data).replace(/[{}\"]/g, "").replace(/\:\,/, ",")}。`);
                        unbindFun();
                        $(`#mw-content-text a.new[href="${href}"]`).removeClass("new sendWelcomeMessageLink unsend").attr("href", `/User_talk:${userName}`).off("click.sendWelcomeMessage"); //js<a>对象的href是绝对url…… */
                    console.info("Gadget-SendWelcomeMessage", "[api]", { userName, target, response });
                    welcomeAsk.innerText = wgULS("通信成功！继续努力哦~");
                    successCleanup(userName);
                } catch (e) {
                    console.error("Gadget-SendWelcomeMessage", "[api]", { userName, target }, e);
                    if (e instanceof Error) {
                        welcomeAsk.innerText = wgULS("通信失败，请稍候重试_(:з」∠)_");
                        target.classList.add("unsend");
                    }
                    if (typeof e === "string") {
                        if (e === "articleexists") {
                            welcomeAsk.innerText = wgULS("通信成功！该讨论页已经存在，请注意哦~");
                            successCleanup(userName);
                        } else {
                            welcomeAsk.innerText = wgULS("通信失败，请稍候重试_(:з」∠)_【错误代码: ");
                            const code = document.createElement("code");
                            code.innerText = e;
                            welcomeAsk.append(code);
                            welcomeAsk.append("】");
                            target.classList.add("unsend");
                        }
                    }
                }
                welcomeAsk.id = "welcomeAskFinished";
                welcomeAsk.append(welcomeCancel);
                welcomeCancel.innerText = wgULS("收到");
            });
        } catch (e) {
            console.error("[Gadget-SendWelcomeMessage]", "[document#click]", e);
        }
    });
    for (const link of getLinks()) {
        const target = verifyLink(link);
        if (target) {
            target.classList.add("sendWelcomeMessageLink", "unsend");
        }
    }
});
// </pre>
