"use strict";
const console = require("./console.js");
console.info("Start initialization...");
const axios = require("./axios.js");
const prefetchTargets = require("./prefetchTargets.js");
const fsPromises = require("fs/promises");
(async () => {
    console.info("prefetchTargets:", prefetchTargets);
    for (const prefetchTarget of prefetchTargets) {
        console.info("target:", prefetchTarget);
        const { name, url, file, appendCode } = prefetchTarget;
        console.info(`[${name}]`, "Start fetching...");
        const { data } = await axios.get(url);
        console.info(`[${name}]`, "Successfully fetched.");
        const code = [data];
        if (typeof appendCode === "string") {
            code.push(appendCode);
        }
        code.push("");
        await fsPromises.writeFile(file, code.join("\n"));
    }
    console.info("Done.");
    process.exit(0);
})();