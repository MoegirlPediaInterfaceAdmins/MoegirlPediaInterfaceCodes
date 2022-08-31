"use strict";
const console = require("./console.js");
console.info("Start initialization...");
const axios = require("./axios.js");
const prefetchTargets = require("./prefetchTargets.js");
const fsPromises = require("fs/promises");
(async () => {
    console.info("prefetchTargets:", prefetchTargets);
    for (const { name, url, file } of prefetchTargets) {
        console.info("target:", { name, url, file });
        console.info(`[${name}]`, "Start fetching...");
        const { data } = await axios.get(url);
        console.info(`[${name}]`, "Successfully fetched.");
        await fsPromises.writeFile(file, data);
    }
    console.info("Done.");
    process.exit(0);
})();