// <pre>
"use strict";
(async () => {
    const sleep = (ms = 1000) => new Promise((res) => setTimeout(res, ms));

    await $.ready;

    const sidebarSelector = mw.config.get("skin") === "moeskin" ? "html > body > #app #moe-full-container > #moe-main-container > main" : "html > body";

    let $sidebar = $(sidebarSelector);
    while ($sidebar.length === 0) {
        await sleep(100);
        // eslint-disable-next-line require-atomic-updates
        $sidebar = $(sidebarSelector);
    }
    console.info("Widget:SideBarPic pre-init-check", $sidebar);

    if ($("body").hasClass("sideBarPic-executed")) {
        return;
    }

    /** @type {JQuery<HTMLDivElement>} */
    const $sidebarCharacter = $(".sidebar-character:not(.executed)").slice(0, 3);
    if ($sidebarCharacter.length === 0) {
        return;
    }

    $("body").addClass("sideBarPic-executed");
    $sidebarCharacter.addClass("executed");

    await Promise.all($sidebarCharacter.find("img").toArray().map((img) => new Promise((res) => {
        let retryCount = 0;
        try {
            const lazyload = new Image();
            const url = new URL(img.dataset.src || img.src, location.origin);
            if (url.hostname.endsWith(".moegirl.org")) {
                url.hostname += ".cn";
            }
            lazyload.addEventListener("load", () => {
                img.src = url;
                res();
            });
            lazyload.addEventListener("error", () => {
                if (retryCount++ < 3) {
                    const url = new URL(lazyload.src, location.origin);
                    url.searchParams.set("_", Math.random());
                    lazyload.src = url;
                } else {
                    console.info("Widget:SideBarPic img-load-failed\n", img.dataset.src);
                    img.remove();
                    res();
                }
            });
            lazyload.src = url;
        } catch (e) {
            console.info("Widget:SideBarPic img-load-failed\n", e);
            img.remove();
            res();
        }
    })));
    $("body").addClass("sideBarPic");

    $sidebarCharacter.each((_, ele) => {
        const $this = $(ele);
        if (!$this.find("img")[0]) {
            return;
        }
        if (mw.config.get("skin") === "vector-2022") {
            $this.css("position", "absolute");
        }
        console.info("Widget:SideBarPic append-check\n", $sidebar);
        $this.appendTo($sidebar);
        $this.fadeIn().addClass(ele.dataset.align === "top" ? "top" : "bottom").css("user-select", "none");
        $this.addClass("active").find("img").removeAttr("width").removeAttr("height");
    });
    $(window).on("resize", () => {
        $sidebarCharacter.each((_, ele) => {
            const self = $(ele);
            self.find("img").width(self.width());
        });
    }).trigger("resize");
    if ($sidebarCharacter.data("displaylogo") === "yes") {
        $("body").addClass("show-logo");
    }
})();
// </pre>
