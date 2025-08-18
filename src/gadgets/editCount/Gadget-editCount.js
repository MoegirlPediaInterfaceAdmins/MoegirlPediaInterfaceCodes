"use strict";
$(() => {
    mw.loader.addStyleTag(`#pt-mycontris > a::after {
        content: "(${mw.config.get("wgUserEditCount")})";
        margin-left: .1em;
    }`);
});
