"use strict";
$(() => {
    if (mw.config.get("wgPageName") === "Mainpage") {
        location.hash = "/legacy";
    }
});
