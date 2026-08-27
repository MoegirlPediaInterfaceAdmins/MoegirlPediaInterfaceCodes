"use strict";
$(() => {
    if (mw.config.get("wgPageName") === "Mainpage" && !location.hash.startsWith("#/post") && !location.hash.startsWith("#/create")) {
        location.hash = "/legacy";
    }
});
