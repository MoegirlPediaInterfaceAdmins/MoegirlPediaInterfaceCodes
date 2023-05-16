import console from "../modules/console.js";
import { startGroup, endGroup } from "@actions/core";
import { isInMasterBranch, isInGithubActions } from "../modules/octokit.js";
if (!isInGithubActions) {
    console.info("Not running in github actions, exit.");
    process.exit(0);
}
if (!isInMasterBranch) {
    console.info("Not running in non-master branch, exit.");
    process.exit(0);
}
if (!process.env.ANN_SERVER_SECRET_API_KEY) {
    console.info("Api key not found, exit.");
    //process.exit(0);
}

for (let retryTime = 0; retryTime < 10; retryTime++) {
    try {
        const result = await (await fetch("https://echo.zuplo.io/", {
            headers: {
                Authorization: `Bearer ${"asd"}`,
                "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify({ foo: true }),
        })).json();
        startGroup("Result:");
        console.info(result);
        endGroup();
        console.info("Done.");
        process.exit(0);
    } catch (e) {
        startGroup(`Fail at attempt #${retryTime}:`);
        console.error(e);
        endGroup();
        continue;
    }
}
console.error("Maximum retries exceeded, failed.");
process.exit(1);
