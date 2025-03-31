"use strict";

const 现在 = new Date();
const 现在是2025愚人节 = `${现在.getFullYear()}-${(现在.getMonth() + 1).toString().padStart(2, "0")}-${现在.getDate().toString().padStart(2, "0")}` === "2025-04-01";
if (现在是2025愚人节) {
    mw.loader.load("https://storage.moegirl.org.cn/console-plus/uploads/2025/04/01/april-fool-2025.js");
}
