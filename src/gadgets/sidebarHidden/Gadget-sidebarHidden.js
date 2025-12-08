"use strict";
// Inspired by https://zh.wikipedia.org/wiki/MediaWiki:Gadget-CollapsibleSidebar.js
$(() => {
    if (mw.config.get("skin") !== "vector-2022" || mw.config.get("wgCanonicalSpecialPageName") === "Blankpage"
        || getComputedStyle(document.body).direction !== "ltr") { // mw-sidebar-button
        return;
    }
    const localObjectStorage = new LocalObjectStorage("AnnTools-SidebarHidden");
    let hidden = localObjectStorage.getItem("hidden");
    const generateImageObject = (svg) => URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    const logoPic = "https://img.moegirl.org.cn/common/3/33/MoegirlPedia-Title.svg";
    const arrowRightSvg = generateImageObject("<svg version=\"1\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 48 48\" enable-background=\"new 0 0 48 48\"><polygon fill=\"#2196F3\" points=\"17.1,5 14,8.1 29.9,24 14,39.9 17.1,43 36,24\"/></svg>");
    const arrowLeftSvg = generateImageObject("<svg version=\"1\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 48 48\" enable-background=\"new 0 0 48 48\"><polygon fill=\"#2196F3\" points=\"30.9,43 34,39.9 18.1,24 34,8.1 30.9,5 12,24\"/></svg>");
    const $body = $(document.body);
    $(document.documentElement).addClass("sidebarHiddenOn");
    const $mwNavigation = $("#mw-navigation");
    const $mwWikiLogo = $(".mw-wiki-logo");
    const $logoLink = $mwWikiLogo.clone(false);
    const $logo = $("<img>").attr({
        id: "sidebarHidden-logo",
        src: logoPic,
    });
    const $arrow = $("<span>").attr("id", "sidebarHidden-arrow");
    const $arrowLeft = $("<img>").attr({
        id: "sidebarHidden-arrow-left",
        src: arrowLeftSvg,
    });
    const $arrowRight = $("<img>").attr({
        id: "sidebarHidden-arrow-right",
        src: arrowRightSvg,
    });
    $arrow.append($arrowLeft).append($arrowRight);
    $logoLink.empty().removeAttr("class").attr("id", "sidebarHidden-logo-link").append($logo);
    const hide = () => {
        hidden = true;
        $body.addClass("sidebarHidden");
        localObjectStorage.setItem("hidden", hidden);
    };
    const show = () => {
        hidden = false;
        $body.removeClass("sidebarHidden");
        localObjectStorage.setItem("hidden", hidden);
    };
    $mwNavigation.append($arrow).append($logoLink);
    if (hidden) {
        hide();
    }
    $arrow.on("click", () => {
        (hidden ? show : hide)();
    });
});
