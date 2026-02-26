"use strict";
(() => {
    const mgHostName = ".moegirl.org.cn";
    /* 反嵌入反反代 */
    try {
        let substHost;
        try {
            substHost = top.location.host;
        } catch {
            substHost = "";
        }
        const currentHostFlag = !location.hostname.endsWith(mgHostName);
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
            oouiDialog.alert(`<p>您当前是在${currentHostFlag ? "非萌百域名" : "嵌套窗口"}访问，请注意不要在此域名下输入您的用户名或密码，以策安全！</p><p>${detectedHost ? `${currentHostFlag ? "当前" : "顶层窗口"}域名为 <code>${detectedHost}</code>，` : ""}萌百域名是以 <code>${mgHostName}</code> 结尾的。</p>`, {
                title: "萌娘百科提醒您",
                size: "medium",
            });
            /* }
            localStorage.setItem("reverse proxy alerted", JSON.stringify(reverseProxyhostAlerted)); */
        }
    } catch (e) {
        console.debug(e);
    }
})();
