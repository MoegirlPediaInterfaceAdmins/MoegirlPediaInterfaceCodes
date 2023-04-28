/**
 * @source https://en.wikipedia.org/wiki/_?oldid=1084628333
 * 更新后请同步更新上面链接到最新版本
 */
/**
 * Enables or disables the dark-mode gadget.
 *
 * Authors: [[User:SD0001]], [[User:Nardog]]
 * 全部内容引自 https://en.wikipedia.org/wiki/MediaWiki:Gadget-dark-mode.js
 **/
// 'Dark mode' and 'Light mode' messages must match the ::before content in
// [[MediaWiki:Gadget-dark-mode-toggle-pagestyles.css]] and [[MediaWiki:Gadget-dark-mode.css]], respectively.
// Don't overwrite existing messages, if already set on a foreign wiki prior to loading this file
"use strict";
// mw.loader.using(["mediawiki.util", "mediawiki.api", "mediawiki.Uri", "mediawiki.storage", "ext.gadget.site-lib", "es6-polyfills"])
$(() => {
    if (!mw.messages.get("darkmode-turn-on-label")) {
        mw.messages.set({
            "darkmode-turn-on-label": "深色模式",
            "darkmode-turn-on-tooltip": wgULS("开启深色模式", "開啟深色模式"),
            "darkmode-turn-off-label": wgULS("浅色模式", "淺色模式"),
            "darkmode-turn-off-tooltip": wgULS("关闭深色模式", "關閉深色模式"),
        });
    }

    const isOn = +mw.user.options.get("gadget-dark-mode");

    if (isOn) {
        // CSS class for externally styling elements in dark mode via TemplateStyles (or CSS from other gadgets or common.css)
        // A brief flash of the original styles will occur, so this is only suitable for style changes for which flashes are tolerable.
        // For others, update Gadget-dark-mode.css directly which is loaded without FOUCs
        document.documentElement.classList.add("client-dark-mode");

        // Update the initial mobile theme-color
        $('meta[name="theme-color"]').attr("content", "#000000");
    }

    const onOrOff = isOn ? "off" : "on";
    const label = mw.msg(`darkmode-turn-${onOrOff}-label`);
    const tooltip = mw.msg(`darkmode-turn-${onOrOff}-tooltip`);
    const nextnode = mw.config.get("skin") !== "minerva" && "#pt-watchlist";
    const portletLink = mw.util.addPortletLink("p-personal", "#", label, "pt-darkmode", tooltip, "", nextnode);

    function toggleMode() {
        const newState = +!mw.user.options.get("gadget-dark-mode");
        new mw.Api().saveOption("gadget-dark-mode", newState);
        mw.user.options.set("gadget-dark-mode", newState);
        $(document.documentElement).toggleClass("client-dark-mode", !!newState);

        // In case the user navigates to another page too quickly
        mw.storage.session.set("dark-mode-toggled", newState);

        const onOrOff = ["on", "off"][newState];

        // Toggle portlet link label and tooltip
        /* var labelSelector = ["vector", "minerva"].includes(mw.config.get("skin"))? "#pt-darkmode span:not(.mw-ui-icon)": "#pt-darkmode a"; */
        $("#pt-darkmode a").text(mw.msg(`darkmode-turn-${onOrOff}-label`));
        $("#pt-darkmode a").attr("title", mw.msg(`darkmode-turn-${onOrOff}-tooltip`));
        // Update the mobile theme-color
        $('meta[name="theme-color"]').attr("content", newState ? "#000000" : "#eaecf0");

        // Modify the <link> element on the page to include/exclude dark-mode styles
        // We can't use mw.loader as it doesn't work both ways (see talk page)
        const $gadgetsLink = $(
            'link[rel="stylesheet"][href^="/load.php?"][href*="ext.gadget."]',
        );
        if ($gadgetsLink.length) {
            const uri = new mw.Uri($gadgetsLink.prop("href"));
            if (newState) {
                uri.query.modules += ",dark-mode";
            } else {
                if (uri.query.modules === "ext.gadget.dark-mode") {
                    // dark-mode is the only module in this link
                    $gadgetsLink.remove();
                    return;
                }
                uri.query.modules = uri.query.modules
                    .replace("ext.gadget.dark-mode,", "ext.gadget.") // dark-mode is first in the gadget list
                    .replace(/,dark-mode(,|$)/, "$1"); // dark-mode is in middle or end of the list
            }
            $gadgetsLink.prop("href", uri.getRelativePath());
        } else {
            // No gadget-containing styles are enabled
            $("<link>").attr({
                rel: "stylesheet",
                href:
                    `/load.php?lang=${mw.config.get("wgUserLanguage")
                    }&modules=ext.gadget.dark-mode&only=styles&skin=${mw.config.get("skin")}`,
            }).appendTo(document.head);
        }
    }

    $(portletLink).on("click", (e) => {
        e.preventDefault();
        toggleMode();
    });

    // Recover state if the navigation was too quick
    const storageState = +mw.storage.session.get("dark-mode-toggled");
    if (storageState && storageState !== isOn) {
        toggleMode();
    }

    if (window.wpDarkModeAutoToggle) {
        const toggleBasedOnSystemColourScheme = function () {
            const systemSchemeNow = matchMedia("(prefers-color-scheme: dark)").matches;
            const systemSchemeLast = mw.storage.get("dark-mode-system-scheme") === "1";

            const wpSchemeNow = !!mw.user.options.get("gadget-dark-mode");

            if (systemSchemeNow !== systemSchemeLast) {
                if (systemSchemeNow !== wpSchemeNow) {
                    toggleMode();
                }
                mw.requestIdleCallback(() => {
                    mw.storage.set("dark-mode-system-scheme", +systemSchemeNow);
                });
            }
        };

        toggleBasedOnSystemColourScheme();

        // If system colour scheme changes while user is viewing, toggle immediately
        const mediaQuery = matchMedia("(prefers-color-scheme: dark)");
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener("change", toggleBasedOnSystemColourScheme);
        } else if (mediaQuery.addListener) { // Safari 13 and older
            mediaQuery.addListener(toggleBasedOnSystemColourScheme);
        }
    }
});
